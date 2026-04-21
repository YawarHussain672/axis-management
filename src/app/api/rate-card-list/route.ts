import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const rateCards = await prisma.rateCard.findMany({
      where: { active: true },
      select: { id: true, itemName: true, volumeSlabs: true },
      orderBy: { itemName: "asc" },
    })

    return NextResponse.json(
      rateCards.map((r) => ({
        id: r.id,
        name: r.itemName,
        defaultPrice: (() => {
          const slabs = r.volumeSlabs as { slab: string; price: number }[]
          return slabs?.[0]?.price || 0
        })(),
      }))
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
