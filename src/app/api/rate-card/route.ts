import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST /api/rate-card
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { itemName, specification, volumeSlabs } = await request.json()
    if (!itemName || !specification) {
      return NextResponse.json({ error: "itemName and specification are required" }, { status: 400 })
    }

    const item = await prisma.rateCard.create({
      data: { itemName, specification, volumeSlabs: volumeSlabs || [], active: true },
    })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to create rate card item" }, { status: 500 })
  }
}
