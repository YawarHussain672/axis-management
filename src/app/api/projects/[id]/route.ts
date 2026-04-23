import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProjectStatus, Prisma } from "@prisma/client"
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher"
import { createNotification } from "@/lib/notifications"
import { getUnitPrice } from "@/lib/ratecard"

const GST_RATE = 0.18

async function priceCollaterals(collaterals: Array<{ itemName: string; quantity: number }>) {
  const priced = await Promise.all(collaterals.map(async (c) => {
    const unitPrice = await getUnitPrice(c.itemName, c.quantity)
    if (unitPrice === null) {
      throw new Error(`No active rate card price found for ${c.itemName} at quantity ${c.quantity}`)
    }

    return {
      itemName: c.itemName,
      quantity: c.quantity,
      unitPrice,
      totalPrice: unitPrice * c.quantity,
    }
  }))

  return {
    collaterals: priced,
    subtotal: priced.reduce((sum, c) => sum + c.totalPrice, 0),
  }
}

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
    if (session.user.role !== "ADMIN" && project.pocId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 })
  }
}

// PUT /api/projects/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  console.log("[PROJECT UPDATE API] PUT request received")
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log("[PROJECT UPDATE API] Unauthorized - no session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user exists in database
    console.log("[PROJECT UPDATE API] Checking user:", session.user.id)
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true }
    })
    if (!userExists) {
      console.error("[PROJECT UPDATE API] User not found in database:", session.user.id)
      return NextResponse.json({ error: "User session invalid", details: "Please log out and log in again" }, { status: 401 })
    }
    console.log("[PROJECT UPDATE API] User verified")

    const { id } = await params
    const body = await request.json()
    const { name, pocId, location, state, deliveryDate, instructions, collaterals, status, note } = body

    // Fetch existing project to check ownership and status
    const existing = await prisma.project.findUnique({ where: { id }, select: { pocId: true, status: true } })
    if (!existing) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const isAdmin = session.user.role === "ADMIN"
    const isOwner = existing.pocId === session.user.id

    // POC can only edit their own projects
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "You can only edit your own projects" }, { status: 403 })
    }

    // POC can only edit when status is REQUESTED (not yet approved)
    if (!isAdmin && existing.status !== "REQUESTED") {
      return NextResponse.json({ error: "Project cannot be edited once it has been submitted for approval" }, { status: 403 })
    }

    // Only admin can change status
    if (status && !isAdmin) {
      return NextResponse.json({ error: "Only admins can update project status" }, { status: 403 })
    }

    // POC cannot modify collaterals after submission
    if (!isAdmin && collaterals !== undefined && existing.status !== "REQUESTED") {
      return NextResponse.json({ error: "Cannot modify collaterals after submission" }, { status: 403 })
    }

    const updateData: Prisma.ProjectUpdateInput = {}
    if (name !== undefined) updateData.name = name
    if (pocId !== undefined) {
      if (!isAdmin && pocId !== session.user.id) {
        return NextResponse.json({ error: "POCs cannot reassign project ownership" }, { status: 403 })
      }
      updateData.poc = { connect: { id: pocId } }
    }
    if (location !== undefined) updateData.location = location
    if (state !== undefined) updateData.state = state
    if (deliveryDate !== undefined) updateData.deliveryDate = new Date(deliveryDate)
    if (instructions !== undefined) updateData.instructions = instructions
    if (status !== undefined) {
      const newStatus = status as ProjectStatus

      // Document requirements for status transitions
      if (newStatus === "PRINTING" && existing.status === "APPROVED") {
        // Check if PO is uploaded
        const poExists = await prisma.fileUpload.findFirst({
          where: { projectId: id, type: "PO" }
        })
        if (!poExists) {
          return NextResponse.json({ error: "PO document required before moving to PRINTING status" }, { status: 400 })
        }
      }

      if (newStatus === "DISPATCHED" && existing.status === "PRINTING") {
        // Check if dispatch record exists
        const dispatchExists = await prisma.dispatch.findFirst({
          where: { projectId: id }
        })
        if (!dispatchExists) {
          return NextResponse.json({ error: "Dispatch details required before moving to DISPATCHED status" }, { status: 400 })
        }
      }

      if (newStatus === "DELIVERED" && existing.status === "DISPATCHED") {
        const [challanExists, invoiceExists, dispatch] = await Promise.all([
          prisma.fileUpload.findFirst({ where: { projectId: id, type: "CHALLAN" } }),
          prisma.fileUpload.findFirst({ where: { projectId: id, type: "INVOICE" } }),
          prisma.dispatch.findUnique({ where: { projectId: id }, select: { id: true, podUrl: true } }),
        ])

        if (!challanExists || !invoiceExists || !dispatch?.podUrl) {
          return NextResponse.json({
            error: "Challan, Invoice and POD are required before moving to DELIVERED status",
          }, { status: 400 })
        }

        await prisma.dispatch.update({
          where: { id: dispatch.id },
          data: { actualDelivery: new Date(), status: "delivered" },
        })
      }

      updateData.status = newStatus
      updateData.statusHistory = {
        create: { status: newStatus, note: note || `Status updated to ${newStatus}`, changedById: session.user.id },
      }
    }

    // Update collaterals if provided
    if (collaterals !== undefined) {
      let priced: Awaited<ReturnType<typeof priceCollaterals>>
      try {
        priced = await priceCollaterals(collaterals)
      } catch (error) {
        return NextResponse.json({
          error: error instanceof Error ? error.message : "Invalid collateral pricing",
        }, { status: 400 })
      }
      await prisma.collateral.deleteMany({ where: { projectId: id } })
      updateData.collaterals = {
        create: priced.collaterals.map((c) => ({
          itemName: c.itemName,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          totalPrice: c.totalPrice,
        })),
      }
      updateData.totalCost = priced.subtotal * (1 + GST_RATE)
    }

    const project = await prisma.project.update({ where: { id }, data: updateData })
    await pusherServer.trigger(CHANNELS.PROJECTS, EVENTS.PROJECT_UPDATED, { id })
    await pusherServer.trigger(CHANNELS.DASHBOARD, EVENTS.STATS_UPDATED, {})
    return NextResponse.json(project)
  } catch (error) {
    console.error("[PROJECT UPDATE API] Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to update project"
    return NextResponse.json({ error: "Failed to update project", details: errorMessage }, { status: 500 })
  }
}

// DELETE /api/projects/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const existing = await prisma.project.findUnique({
      where: { id },
      select: { pocId: true, status: true, name: true, projectId: true }
    })
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

    // Delete related activities
    await prisma.activity.deleteMany({
      where: { entityId: id },
    })

    // Delete related notifications
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { message: { contains: id } },
          { title: { contains: id } },
          ...(existing.projectId ? [
            { message: { contains: existing.projectId } },
            { title: { contains: existing.projectId } },
          ] : []),
        ],
      },
    })

    // Also check for projectIdStr pattern (PROJ-XXX)
    const projectDisplayId = existing.projectId || "";
    console.log("[Delete Project] Deleting notifications for project:", id, "Display ID:", projectDisplayId);

    const deletedNotifications = await prisma.notification.deleteMany({
      where: {
        OR: [
          { message: { contains: id } },
          { title: { contains: id } },
          ...(projectDisplayId ? [
            { message: { contains: projectDisplayId } },
            { title: { contains: projectDisplayId } },
          ] : []),
        ],
      },
    });
    console.log("[Delete Project] Deleted", deletedNotifications.count, "notifications");

    await prisma.project.delete({ where: { id } })

    // Create deletion notification for the POC
    await createNotification({
      userId: existing.pocId,
      title: "Project Deleted",
      message: `Project "${existing.name}" (${existing.projectId || id}) has been deleted by ${session.user.name || (isAdmin ? "Admin" : "POC")}`,
      type: "PROJECT_DELETED",
    })

    await pusherServer.trigger(CHANNELS.PROJECTS, EVENTS.PROJECT_DELETED, { id })
    await pusherServer.trigger(CHANNELS.DASHBOARD, EVENTS.STATS_UPDATED, {})
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 })
  }
}
