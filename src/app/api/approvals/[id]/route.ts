import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProjectStatus } from "@prisma/client"
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher"
import { sendProjectApprovedEmail, sendProjectRejectedEmail, sendApprovalReminderEmail } from "@/lib/email"
import { logActivity } from "@/lib/audit"
import { formatCurrency } from "@/utils/formatters"
import { notifyProjectApproved, notifyProjectRejected } from "@/lib/notifications"

const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  console.log("[APPROVALS API] POST request received")
  try {
    const session = await getServerSession(authOptions)
    console.log("[APPROVALS API] Session:", session?.user?.id ? `User ${session.user.id}` : "No session")

    if (!session?.user?.id) {
      console.log("[APPROVALS API] Unauthorized - no session")
      return NextResponse.json({ error: "Unauthorized", details: "Please log in again" }, { status: 401 })
    }

    const { id } = await params
    console.log("[APPROVALS API] Approval ID:", id)
    console.log("[APPROVALS API] User ID from session:", session.user.id)

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { action, notes } = body
    const notesText = typeof notes === "string" ? notes.trim() : ""

    if (!action || !["approve", "reject", "reminder"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Verify the user exists in database
    console.log("[APPROVALS API] Checking if user exists:", session.user.id)
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true }
    })

    console.log("[APPROVALS API] User exists check result:", userExists ? "FOUND" : "NOT FOUND")

    if (!userExists) {
      console.error("[APPROVALS API] User not found in database:", session.user.id)
      return NextResponse.json({ error: "User session invalid", details: "Please log out and log in again" }, { status: 401 })
    }

    console.log("[APPROVALS API] User verified, proceeding with action:", action)

    // Get approval with project details
    let approval
    try {
      approval = await prisma.approval.findUnique({
        where: { id },
        include: {
          project: { include: { poc: true } },
        },
      })
    } catch (dbError) {
      console.error("Database error fetching approval:", dbError)
      return NextResponse.json({ error: "Database error", details: dbError instanceof Error ? dbError.message : String(dbError) }, { status: 500 })
    }

    if (!approval) {
      return NextResponse.json({ error: "Approval not found" }, { status: 404 })
    }

    if (action === "approve" || action === "reject" || action === "reminder") {
      if (session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Only admins can manage approvals" }, { status: 403 })
      }
    }

    if (action === "approve") {
      try {
        await prisma.$transaction([
          prisma.approval.update({
            where: { id },
            data: { status: "APPROVED", approvedById: session.user.id, approvedAt: new Date(), notes: notesText || undefined },
          }),
          prisma.project.update({
            where: { id: approval.projectId },
            data: {
              status: ProjectStatus.APPROVED,
              statusHistory: {
                create: { status: ProjectStatus.APPROVED, note: notesText || "Approved", changedById: session.user.id },
              },
            },
          }),
        ])
      } catch (txError) {
        console.error("Transaction error during approve:", txError)
        return NextResponse.json({ error: "Database transaction failed", details: txError instanceof Error ? txError.message : String(txError) }, { status: 500 })
      }

      // Send approval email to POC
      await sendProjectApprovedEmail(approval.project.poc.email, {
        pocName: approval.project.poc.name,
        projectName: approval.project.name,
        projectId: approval.project.projectId,
        location: approval.project.location,
        totalCost: formatCurrency(approval.project.totalCost),
        appUrl: APP_URL,
      })

      // In-app notification
      await notifyProjectApproved(approval.projectId, approval.project.poc.id, approval.project.name, approval.project.projectId)

      // Audit log
      await logActivity({
        userId: session.user.id,
        action: "APPROVED",
        entityType: "approval",
        entityId: id,
        details: { projectId: approval.projectId, notes: notesText || undefined },
      })

    } else if (action === "reject") {
      if (!notesText) {
        return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 })
      }

      try {
        await prisma.$transaction([
          prisma.approval.update({
            where: { id },
            data: { status: "REJECTED", approvedById: session.user.id, rejectedAt: new Date(), notes: notesText },
          }),
          prisma.project.update({
            where: { id: approval.projectId },
            data: {
              status: ProjectStatus.CANCELLED,
              statusHistory: {
                create: { status: ProjectStatus.CANCELLED, note: notesText, changedById: session.user.id },
              },
            },
          }),
        ])
      } catch (txError) {
        console.error("Transaction error during reject:", txError)
        return NextResponse.json({ error: "Database transaction failed", details: txError instanceof Error ? txError.message : String(txError) }, { status: 500 })
      }

      // Send rejection email to POC
      await sendProjectRejectedEmail(approval.project.poc.email, {
        pocName: approval.project.poc.name,
        projectName: approval.project.name,
        projectId: approval.project.projectId,
        reason: notesText,
        appUrl: APP_URL,
      })

      // In-app notification
      await notifyProjectRejected(approval.projectId, approval.project.poc.id, approval.project.name, approval.project.projectId, notesText)

      // Audit log
      await logActivity({
        userId: session.user.id,
        action: "REJECTED",
        entityType: "approval",
        entityId: id,
        details: { projectId: approval.projectId, notes: notesText },
      })

    } else if (action === "reminder") {
      const updated = await prisma.approval.update({
        where: { id },
        data: { reminderCount: { increment: 1 } },
      })

      // Send reminder email to all admins
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN", active: true },
        select: { email: true, name: true },
      })

      await Promise.all(admins.map((admin) =>
        sendApprovalReminderEmail(admin.email, {
          adminName: admin.name,
          projectName: approval.project.name,
          projectId: approval.project.projectId,
          pocName: approval.project.poc.name,
          totalCost: formatCurrency(approval.project.totalCost),
          reminderCount: updated.reminderCount,
          appUrl: APP_URL,
        })
      ))

      // Audit log
      await logActivity({
        userId: session.user.id,
        action: "REMINDER_SENT",
        entityType: "approval",
        entityId: id,
        details: { projectId: approval.projectId, reminderCount: updated.reminderCount },
      })
    }

    await pusherServer.trigger(CHANNELS.APPROVALS, EVENTS.APPROVAL_UPDATED, { id })
    await pusherServer.trigger(CHANNELS.PROJECTS, EVENTS.PROJECT_UPDATED, { projectId: approval.projectId })
    await pusherServer.trigger(CHANNELS.DASHBOARD, EVENTS.STATS_UPDATED, {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Approval action error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: "Failed to process approval", details: errorMessage }, { status: 500 })
  }
}
