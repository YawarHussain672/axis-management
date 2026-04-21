import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProjectStatus, UserRole, Prisma } from "@prisma/client"
import { z } from "zod"
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher"
import { logActivity } from "@/lib/audit"
import { notifyAdminsNewApproval } from "@/lib/notifications"

const GST_RATE = 0.18

const createProjectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters").max(200),
  pocId: z.string().min(1, "POC is required"),
  location: z.string().min(1, "Location is required"),
  branch: z.string().optional(),
  state: z.string().optional(),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  instructions: z.string().max(1000).optional(),
  totalCost: z.number().min(0),
  leadsGenerated: z.number().int().min(0).nullable().optional(),
  leadsConverted: z.number().int().min(0).nullable().optional(),
  collaterals: z.array(z.object({
    itemName: z.string().min(1),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
    unitPrice: z.number().min(0),
    totalPrice: z.number().min(0),
  })).min(1, "At least one collateral is required"),
})

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

    // Validate POC exists
    const poc = await prisma.user.findUnique({ where: { id: pocId } })
    if (!poc || !poc.active) {
      return NextResponse.json({ error: "Invalid POC selected" }, { status: 400 })
    }

    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 900) + 100
    const projectId = `PRJ-${year}-${random}`
    const piNumber = Math.floor(Math.random() * 9000 + 1000).toString()
    const totalCostWithGST = totalCost * (1 + GST_RATE)

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
          create: collaterals.map((c) => ({
            itemName: c.itemName,
            quantity: c.quantity,
            unitPrice: c.unitPrice,
            totalPrice: c.totalPrice,
          })),
        },
        statusHistory: {
          create: { status: ProjectStatus.REQUESTED, note: "Project created", changedById: session.user.id },
        },
      },
      include: {
        poc: { select: { id: true, name: true, email: true } },
        collaterals: true,
      },
    })

    await prisma.approval.create({
      data: { projectId: project.id, requestedById: session.user.id, status: "PENDING" },
    })

    // Notify all clients
    await pusherServer.trigger(CHANNELS.PROJECTS, EVENTS.PROJECT_CREATED, { id: project.id })
    await pusherServer.trigger(CHANNELS.DASHBOARD, EVENTS.STATS_UPDATED, {})
    await pusherServer.trigger(CHANNELS.APPROVALS, EVENTS.APPROVAL_UPDATED, {})

    await logActivity({
      userId: session.user.id,
      action: "PROJECT_CREATED",
      entityType: "project",
      entityId: project.id,
      details: { projectId: project.projectId, name: project.name, location, totalCost: project.totalCost },
    })

    // Notify all admins of new approval request
    await notifyAdminsNewApproval(project.id, project.name, project.projectId, session.user.name || "A POC")

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error("POST /api/projects error:", error)
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}
