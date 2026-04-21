import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProjectStatus, Prisma } from "@prisma/client"
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher"

// GET /api/projects/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        poc: { select: { id: true, name: true, email: true, phone: true } },
        collaterals: true,
        statusHistory: { orderBy: { timestamp: "desc" } },
        files: true,
        dispatch: true,
        approval: true,
      },
    })

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(project)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 })
  }
}

// PUT /api/projects/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { name, pocId, location, state, deliveryDate, instructions, collaterals, totalCost, status } = body

    // Fetch existing project to check ownership and status
    const existing = await prisma.project.findUnique({ where: { id }, select: { pocId: true, status: true } })
    if (!existing) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const isAdmin = session.user.role === "ADMIN"
    const isOwner = existing.pocId === session.user.id

    // POC can only edit their own projects
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "You can only edit your own projects" }, { status: 403 })
    }

    // Nobody can edit a project that is already in production or beyond
    const lockedStatuses = ["PRINTING", "DISPATCHED", "DELIVERED", "CANCELLED"]
    if (!isAdmin && lockedStatuses.includes(existing.status)) {
      return NextResponse.json({ error: "Project cannot be edited once it is in production" }, { status: 403 })
    }

    // Only admin can change status
    if (status && !isAdmin) {
      return NextResponse.json({ error: "Only admins can update project status" }, { status: 403 })
    }

    const GST_RATE = 0.18
    const totalCostWithGST = totalCost !== undefined ? totalCost * (1 + GST_RATE) : undefined

    const updateData: Prisma.ProjectUpdateInput = {}
    if (name !== undefined) updateData.name = name
    if (pocId !== undefined) updateData.poc = { connect: { id: pocId } }
    if (location !== undefined) updateData.location = location
    if (state !== undefined) updateData.state = state
    if (deliveryDate !== undefined) updateData.deliveryDate = new Date(deliveryDate)
    if (instructions !== undefined) updateData.instructions = instructions
    if (totalCostWithGST !== undefined) updateData.totalCost = totalCostWithGST
    if (status !== undefined) {
      updateData.status = status as ProjectStatus
      updateData.statusHistory = {
        create: { status: status as ProjectStatus, note: `Status updated to ${status}`, changedById: session.user.id },
      }
    }

    // Update collaterals if provided
    if (collaterals !== undefined) {
      await prisma.collateral.deleteMany({ where: { projectId: id } })
      updateData.collaterals = {
        create: collaterals.map((c: { itemName: string; quantity: number; unitPrice: number; totalPrice: number }) => ({
          itemName: c.itemName,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          totalPrice: c.totalPrice,
        })),
      }
    }

    const project = await prisma.project.update({ where: { id }, data: updateData })
    await pusherServer.trigger(CHANNELS.PROJECTS, EVENTS.PROJECT_UPDATED, { id })
    await pusherServer.trigger(CHANNELS.DASHBOARD, EVENTS.STATS_UPDATED, {})
    return NextResponse.json(project)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 })
  }
}

// DELETE /api/projects/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const existing = await prisma.project.findUnique({ where: { id }, select: { pocId: true, status: true } })
    if (!existing) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const isAdmin = session.user.role === "ADMIN"

    // Only admin can delete, or POC can delete their own REQUESTED projects only
    if (!isAdmin) {
      if (existing.pocId !== session.user.id) {
        return NextResponse.json({ error: "You can only delete your own projects" }, { status: 403 })
      }
      if (existing.status !== "REQUESTED") {
        return NextResponse.json({ error: "You can only delete projects that are still pending approval" }, { status: 403 })
      }
    }

    await prisma.project.delete({ where: { id } })
    await pusherServer.trigger(CHANNELS.PROJECTS, EVENTS.PROJECT_DELETED, { id })
    await pusherServer.trigger(CHANNELS.DASHBOARD, EVENTS.STATS_UPDATED, {})
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 })
  }
}
