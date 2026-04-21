import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProjectStatus } from "@prisma/client"
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher"

// PUT /api/dispatch/[id]  - update dispatch info
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const { courier, trackingId, trackingUrl, dispatchDate, expectedDelivery, actualDelivery, status, notes } = await request.json()

    // Fetch BEFORE update to get projectId
    const existing = await prisma.dispatch.findUnique({ where: { id }, select: { projectId: true } })
    if (!existing) return NextResponse.json({ error: "Dispatch not found" }, { status: 404 })

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
    console.error(error)
    return NextResponse.json({ error: "Failed to update dispatch" }, { status: 500 })
  }
}
