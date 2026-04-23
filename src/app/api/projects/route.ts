import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProjectStatus, UserRole, Prisma } from "@prisma/client"
import { z } from "zod"
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher"
import { logActivity } from "@/lib/audit"
import { notifyAdminsNewApproval } from "@/lib/notifications"
import { getUnitPrice } from "@/lib/ratecard"

const GST_RATE = 0.18

const createProjectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters").max(200),
  pocId: z.string().min(1, "POC is required"),
  location: z.string().min(1, "Location is required"),
  branch: z.string().optional(),
  state: z.string().optional(),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  instructions: z.string().max(1000).optional(),
  totalCost: z.number().min(0).optional(),
  leadsGenerated: z.number().int().min(0).nullable().optional(),
  leadsConverted: z.number().int().min(0).nullable().optional(),
  collaterals: z.array(z.object({
    itemName: z.string().min(1),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
    unitPrice: z.number().min(0).optional(),
    totalPrice: z.number().min(0).optional(),
  })).min(1, "At least one collateral is required"),
})

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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const pocId = searchParams.get("pocId")
    const location = searchParams.get("location")
    const search = searchParams.get("search")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "50"))

    const where: Prisma.ProjectWhereInput = {}
    if (status && status !== "all") where.status = status as ProjectStatus
    if (pocId && pocId !== "all") where.pocId = pocId
    if (location && location !== "all") where.location = location
    if (session.user.role === "POC") where.pocId = session.user.id
    if (search) {
      where.OR = [
        { projectId: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ]
    }

    const [projects, total, pocsList, locationGroups] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          poc: { select: { id: true, name: true, email: true } },
          collaterals: true,
          _count: { select: { collaterals: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.project.count({ where }),
      prisma.user.findMany({ where: { role: UserRole.POC, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.project.groupBy({ by: ["location"], orderBy: { location: "asc" } }),
    ])

    return NextResponse.json({
      projects,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      pocs: pocsList,
      locations: locationGroups.map((l) => l.location),
    })
  } catch (error) {
    console.error("GET /api/projects error:", error)
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const parsed = createProjectSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
    }

    const { name, pocId, location, branch, state, deliveryDate, instructions, collaterals, totalCost, leadsGenerated, leadsConverted } = parsed.data

    // Validate delivery date is in the future
    const delivery = new Date(deliveryDate)
    if (delivery <= new Date()) {
      return NextResponse.json({ error: "Delivery date must be in the future" }, { status: 400 })
    }

    if (session.user.role === "POC" && pocId !== session.user.id) {
      return NextResponse.json({ error: "POCs can only create projects for themselves" }, { status: 403 })
    }

    // Validate POC exists
    const poc = await prisma.user.findUnique({ where: { id: pocId } })
    if (!poc || !poc.active || poc.role !== UserRole.POC) {
      return NextResponse.json({ error: "Invalid POC selected" }, { status: 400 })
    }

    let priced: Awaited<ReturnType<typeof priceCollaterals>>
    try {
      priced = await priceCollaterals(collaterals)
    } catch (error) {
      const pricingError = error instanceof Error ? error.message : "Invalid collateral pricing"
      console.error("[API] Pricing error:", pricingError)
      return NextResponse.json({
        error: pricingError,
      }, { status: 400 })
    }

    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 900) + 100
    const projectId = `PRJ-${year}-${random}`
    const piNumber = Math.floor(Math.random() * 9000 + 1000).toString()
    const totalCostWithGST = priced.subtotal * (1 + GST_RATE)

    const project = await prisma.project.create({
      data: {
        projectId,
        name: name.trim(),
        piNumber,
        location,
        branch,
        state,
        deliveryDate: delivery,
        instructions: instructions?.trim(),
        totalCost: totalCostWithGST,
        leadsGenerated: leadsGenerated ?? null,
        leadsConverted: leadsConverted ?? null,
        status: ProjectStatus.REQUESTED,
        pocId,
        collaterals: {
          create: priced.collaterals.map((c) => ({
            itemName: c.itemName,
            quantity: c.quantity,
            unitPrice: c.unitPrice,
            totalPrice: c.totalPrice,
          })),
        },
        statusHistory: {
          create: { status: ProjectStatus.REQUESTED, note: "Project created", changedById: pocId },
        },
      },
      include: {
        poc: { select: { id: true, name: true, email: true } },
        collaterals: true,
      },
    })

    await prisma.approval.create({
      data: { projectId: project.id, requestedById: pocId, status: "PENDING" },
    })

    // Post-creation notifications (non-critical - don't fail if they error)
    try {
      // Notify all clients via Pusher
      await pusherServer.trigger(CHANNELS.PROJECTS, EVENTS.PROJECT_CREATED, { id: project.id })
      await pusherServer.trigger(CHANNELS.DASHBOARD, EVENTS.STATS_UPDATED, {})
      await pusherServer.trigger(CHANNELS.APPROVALS, EVENTS.APPROVAL_UPDATED, {})

      // Log activity (use pocId as the actor since they're the one requesting)
      await logActivity({
        userId: pocId,
        action: "PROJECT_CREATED",
        entityType: "project",
        entityId: project.id,
        details: { projectId: project.projectId, name: project.name, location, clientSubtotal: totalCost, totalCost: project.totalCost },
      })

      // Notify all admins of new approval request
      console.log("[API] Calling notifyAdminsNewApproval for project:", project.id)
      await notifyAdminsNewApproval(project.id, project.name, project.projectId, poc.name || "A POC")
      console.log("[API] notifyAdminsNewApproval completed")
    } catch (notifyError) {
      // Log but don't fail - project is already created
      console.error("[API] Post-creation notifications failed:", notifyError)
    }

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : ""
    console.error("[API] POST /api/projects CRITICAL ERROR:", errorMessage)
    console.error("[API] Error stack:", errorStack)
    return NextResponse.json({
      error: "Failed to create project",
      debug: process.env.NODE_ENV === "development" ? errorMessage : undefined
    }, { status: 500 })
  }
}
