import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [pocs, rateCards] = await Promise.all([
    prisma.user.findMany({
      where: { role: UserRole.POC, active: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.rateCard.findMany({
      where: { active: true },
      select: { id: true, itemName: true, volumeSlabs: true },
      orderBy: { itemName: "asc" },
    }),
  ])

  return NextResponse.json({
    pocs,
    rateCards: rateCards.map((r) => ({
      id: r.id,
      name: r.itemName,
      defaultPrice: (() => {
        const slabs = r.volumeSlabs as { slab: string; price: number }[]
        return slabs?.[0]?.price || 0
      })(),
    })),
  })
}
