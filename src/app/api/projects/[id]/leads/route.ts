import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/audit"

// PATCH /api/projects/[id]/leads
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const { leadsGenerated, leadsConverted } = await request.json()

    // Validate
    if (leadsGenerated !== null && leadsGenerated < 0) {
      return NextResponse.json({ error: "Leads generated cannot be negative" }, { status: 400 })
    }
    if (leadsConverted !== null && leadsConverted < 0) {
      return NextResponse.json({ error: "Leads converted cannot be negative" }, { status: 400 })
    }
    if (leadsGenerated !== null && leadsConverted !== null && leadsConverted > leadsGenerated) {
      return NextResponse.json({ error: "Converted leads cannot exceed generated leads" }, { status: 400 })
    }

    // Check ownership
    const project = await prisma.project.findUnique({ where: { id }, select: { pocId: true } })
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const isAdmin = session.user.role === "ADMIN"
    const isOwner = project.pocId === session.user.id
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await prisma.project.update({
      where: { id },
      data: { leadsGenerated, leadsConverted },
    })

    await logActivity({
      userId: session.user.id,
      action: "LEADS_UPDATED",
      entityType: "project",
      entityId: id,
      details: { leadsGenerated, leadsConverted },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to update lead data" }, { status: 500 })
  }
}
