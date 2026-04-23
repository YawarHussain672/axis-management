import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getUnitPriceFromSlabs } from "@/lib/rate-card-pricing"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [pocs, rateCards] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: UserRole.POC,
        active: true,
        ...(session.user.role === "POC" ? { id: session.user.id } : {}),
      },
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
      volumeSlabs: r.volumeSlabs,
      defaultPrice: getUnitPriceFromSlabs(r.volumeSlabs, 1) ?? 0,
    })),
  })
}
