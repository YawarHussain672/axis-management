import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/export?type=projects|dispatch  — returns JSON data for client-side PDF generation
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "projects"
    const projectFilter = session.user.role === "POC" ? { pocId: session.user.id } : {}

    if (type === "projects") {
      const projects = await prisma.project.findMany({
        where: projectFilter,
        include: { poc: { select: { name: true, email: true } }, collaterals: true },
        orderBy: { createdAt: "desc" },
      })
      return NextResponse.json({ type: "projects", data: projects })
    }

    if (type === "dispatch") {
      if (session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Only admins can export dispatch data" }, { status: 403 })
      }

      const dispatches = await prisma.dispatch.findMany({
        include: { project: { select: { projectId: true, name: true, location: true, status: true } } },
        orderBy: { createdAt: "desc" },
      })
      return NextResponse.json({ type: "dispatch", data: dispatches })
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
