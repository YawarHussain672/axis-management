import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProjectStatus } from "@prisma/client"
import * as XLSX from "xlsx"
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher"
import { logActivity } from "@/lib/audit"
import { notifyProjectDispatched } from "@/lib/notifications"

/**
 * Expected Excel columns (case-insensitive):
 * Project ID | Courier | Tracking ID | Tracking URL | Dispatch Date | Expected Delivery | Notes
 *
 * POST /api/dispatch/upload
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can upload dispatch data" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const ext = file.name.split(".").pop()?.toLowerCase()
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      return NextResponse.json({ error: "Only Excel (.xlsx, .xls) or CSV files are supported" }, { status: 400 })
    }

    // Parse Excel
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })

    if (rows.length === 0) {
      return NextResponse.json({ error: "Excel file is empty" }, { status: 400 })
    }

    // Normalize column names
    const normalize = (key: string) => key.toLowerCase().replace(/[\s_-]/g, "")

    const results = { created: 0, updated: 0, skipped: 0, errors: [] as string[] }

    for (const row of rows) {
      const get = (keys: string[]) => {
        for (const k of Object.keys(row)) {
          if (keys.includes(normalize(k))) return String(row[k] || "").trim()
        }
        return ""
      }

      const projectId = get(["projectid", "project_id", "projectno"])
      const courier = get(["courier", "couriername", "carrier"])
      const trackingId = get(["trackingid", "tracking_id", "awb", "awbno", "docketno"])
      const trackingUrl = get(["trackingurl", "tracking_url", "trackinglink"])
      const dispatchDateRaw = get(["dispatchdate", "dispatch_date", "shippeddate"])
      const expectedDeliveryRaw = get(["expecteddelivery", "expected_delivery", "edd", "deliverydate"])
      const notes = get(["notes", "remarks", "comments"])

      if (!projectId || !courier || !trackingId) {
        results.skipped++
        if (projectId) results.errors.push(`Row skipped: ${projectId} — missing courier or tracking ID`)
        continue
      }

      // Find project
      const project = await prisma.project.findFirst({
        where: { projectId: { equals: projectId, mode: "insensitive" } },
      })

      if (!project) {
        results.skipped++
        results.errors.push(`Project not found: ${projectId}`)
        continue
      }

      if (project.status !== ProjectStatus.PRINTING && project.status !== ProjectStatus.DISPATCHED) {
        results.skipped++
        results.errors.push(`Project ${projectId} must be PRINTING before dispatch upload (current: ${project.status})`)
        continue
      }

      const parseDate = (val: string): Date | undefined => {
        if (!val) return undefined
        const d = new Date(val)
        return isNaN(d.getTime()) ? undefined : d
      }

      const dispatchDate = parseDate(dispatchDateRaw)
      const expectedDelivery = parseDate(expectedDeliveryRaw)

      // Upsert dispatch
      const existing = await prisma.dispatch.findUnique({ where: { projectId: project.id } })

      if (existing) {
        await prisma.dispatch.update({
          where: { projectId: project.id },
          data: { courier, trackingId, trackingUrl: trackingUrl || null, dispatchDate, expectedDelivery, notes: notes || null, status: "in_transit" },
        })
        results.updated++
      } else {
        await prisma.dispatch.create({
          data: { projectId: project.id, courier, trackingId, trackingUrl: trackingUrl || null, dispatchDate, expectedDelivery, notes: notes || null, status: "in_transit" },
        })
        // Update project status to DISPATCHED
        await prisma.project.update({
          where: { id: project.id },
          data: {
            status: ProjectStatus.DISPATCHED,
            statusHistory: { create: { status: ProjectStatus.DISPATCHED, note: `Dispatched via ${courier} — ${trackingId}`, changedById: session.user.id } },
          },
        })

        const fullProject = await prisma.project.findUnique({
          where: { id: project.id },
          include: { poc: { select: { id: true, email: true, name: true } } },
        })
        if (fullProject?.poc) {
          await notifyProjectDispatched(project.id, fullProject.poc.id, fullProject.name, fullProject.projectId, courier, trackingId)
        }

        // Audit log
        await logActivity({
          userId: session.user.id,
          action: "DISPATCHED",
          entityType: "project",
          entityId: project.id,
          details: { courier, trackingId },
        })

        results.created++
      }
    }

    // Notify all clients if anything changed
    if (results.created > 0 || results.updated > 0) {
      await pusherServer.trigger(CHANNELS.DISPATCH, EVENTS.DISPATCH_UPDATED, {})
      await pusherServer.trigger(CHANNELS.PROJECTS, EVENTS.PROJECT_UPDATED, {})
      await pusherServer.trigger(CHANNELS.DASHBOARD, EVENTS.STATS_UPDATED, {})
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${rows.length} rows: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`,
      ...results,
    })
  } catch (error) {
    console.error("Dispatch upload error:", error)
    return NextResponse.json({ error: "Failed to process file" }, { status: 500 })
  }
}
