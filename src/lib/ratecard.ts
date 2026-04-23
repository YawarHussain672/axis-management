import { prisma } from "./prisma"
import { getUnitPriceFromSlabs } from "./rate-card-pricing"

export async function getUnitPrice(itemName: string, quantity: number): Promise<number | null> {
  const rateCard = await prisma.rateCard.findFirst({
    where: { itemName, active: true },
    select: { volumeSlabs: true },
  })

  if (!rateCard) return null

  return getUnitPriceFromSlabs(rateCard.volumeSlabs, quantity)
}

export async function calculateTotal(itemName: string, quantity: number): Promise<{ unitPrice: number; subtotal: number; gst: number; total: number } | null> {
  const unitPrice = await getUnitPrice(itemName, quantity)
  if (!unitPrice) return null

  const subtotal = unitPrice * quantity
  const gst = subtotal * 0.18 // 18% GST
  const total = subtotal + gst

  return { unitPrice, subtotal, gst, total }
}
