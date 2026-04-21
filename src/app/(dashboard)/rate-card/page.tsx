import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Prisma } from "@prisma/client"
import { RateCardClient } from "@/components/rate-card/rate-card-client"

type RateCardItem = Prisma.RateCardGetPayload<Record<string, never>>

async function getRateCards() {
  return prisma.rateCard.findMany({ where: { active: true }, orderBy: { itemName: "asc" } })
}

export default async function RateCardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  const rateCards = await getRateCards()
  return <RateCardClient initialItems={rateCards as RateCardItem[]} />
}
