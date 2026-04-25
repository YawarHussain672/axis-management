import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProjectStatus } from "@prisma/client"
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher"
import { logActivity } from "@/lib/audit"

// PUT /api/dispatch/[id]  - update dispatch info
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can update dispatch details" }, { status: 403 })
    }

    const { id } = await params
    const { courier, trackingId, trackingUrl, dispatchDate, expectedDelivery, actualDelivery, status, notes } = await request.json()

    // Fetch BEFORE update to get projectId
    const existing = await prisma.dispatch.findUnique({ where: { id }, select: { projectId: true, podUrl: true } })
    if (!existing) return NextResponse.json({ error: "Dispatch not found" }, { status: 404 })

    if (actualDelivery) {
      const [challanExists, invoiceExists] = await Promise.all([
        prisma.fileUpload.findFirst({ where: { projectId: existing.projectId, type: "CHALLAN" } }),
        prisma.fileUpload.findFirst({ where: { projectId: existing.projectId, type: "INVOICE" } }),
      ])

      if (!challanExists || !invoiceExists || !existing.podUrl) {
        return NextResponse.json({
          error: "Challan, Invoice and POD are required before marking delivery complete",
        }, { status: 400 })
      }
    }

    const dispatch = await prisma.dispatch.update({
      where: { id },
      data: {
        courier,
        trackingId,
        trackingUrl,
        dispatchDate: dispatchDate ? new Date(dispatchDate) : undefined,
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : undefined,
        actualDelivery: actualDelivery ? new Date(actualDelivery) : undefined,
        status,
        notes,
      },
    })

    // If delivered, update project status
    if (actualDelivery) {
      await prisma.project.update({
        where: { id: existing.projectId },
        data: {
          status: ProjectStatus.DELIVERED,
          statusHistory: {
            create: {
              status: ProjectStatus.DELIVERED,
              note: "Delivered — POD confirmed",
              changedById: session.user.id,
            },
          },
        },
      })
    }

    await pusherServer.trigger(CHANNELS.DISPATCH, EVENTS.DISPATCH_UPDATED, { id })
    await pusherServer.trigger(CHANNELS.PROJECTS, EVENTS.PROJECT_UPDATED, { projectId: existing.projectId })
    await pusherServer.trigger(CHANNELS.DASHBOARD, EVENTS.STATS_UPDATED, {})

    return NextResponse.json(dispatch)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update dispatch" }, { status: 500 })
  }
}

// PATCH /api/dispatch/[id] - update dispatch by project ID (for edit dialog)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can update dispatch details" }, { status: 403 })
    }

    const { id: projectId } = await params
    const { courier, trackingId, dispatchDate, expectedDelivery } = await request.json()

    // Find dispatch by project ID
    const dispatch = await prisma.dispatch.findUnique({
      where: { projectId },
    })

    if (!dispatch) {
      return NextResponse.json({ error: "Dispatch not found for this project" }, { status: 404 })
    }

    const updated = await prisma.dispatch.update({
      where: { projectId },
      data: {
        courier: courier || dispatch.courier,
        trackingId: trackingId || dispatch.trackingId,
        dispatchDate: dispatchDate ? new Date(dispatchDate) : dispatch.dispatchDate,
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : dispatch.expectedDelivery,
      },
    })

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: "DISPATCH_UPDATED",
      entityType: "dispatch",
      entityId: dispatch.id,
      details: { projectId, courier, trackingId },
    })

    // Trigger real-time updates
    await pusherServer.trigger(CHANNELS.DISPATCH, EVENTS.DISPATCH_UPDATED, { id: dispatch.id })
    await pusherServer.trigger(CHANNELS.PROJECTS, EVENTS.PROJECT_UPDATED, { projectId })

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update dispatch" }, { status: 500 })
  }
}
