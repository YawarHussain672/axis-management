export interface VolumeSlab {
  slab: string
  price: number
}

interface ParsedVolumeSlab extends VolumeSlab {
  minQty: number
  maxQty: number | null
}

function parseSlabRange(label: string): Pick<ParsedVolumeSlab, "minQty" | "maxQty"> {
  const lower = label.toLowerCase()
  const numbers = label.match(/\d+/g)?.map(Number) ?? []

  if (lower.includes("less") && numbers.length >= 1) {
    return { minQty: 1, maxQty: numbers[0] - 1 }
  }

  if (lower.includes("upto") && numbers.length >= 1) {
    return { minQty: 1, maxQty: numbers[0] }
  }

  if (numbers.length >= 2) {
    return { minQty: numbers[0], maxQty: numbers[1] }
  }

  if (numbers.length === 1) {
    return { minQty: numbers[0], maxQty: null }
  }

  return { minQty: 1, maxQty: null }
}

export function parseVolumeSlabs(value: unknown): ParsedVolumeSlab[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return []
    }

    const slab = "slab" in entry ? entry.slab : null
    const price = "price" in entry ? entry.price : null
    if (typeof slab !== "string" || typeof price !== "number") {
      return []
    }

    return [{ slab, price, ...parseSlabRange(slab) }]
  })
}

export function getUnitPriceFromSlabs(value: unknown, quantity: number): number | null {
  const slabs = parseVolumeSlabs(value).sort((a, b) => a.minQty - b.minQty)
  if (slabs.length === 0) return null

  const matchingRange = slabs.find(
    (slab) => quantity >= slab.minQty && (slab.maxQty === null || quantity <= slab.maxQty)
  )
  if (matchingRange) return matchingRange.price

  const thresholdMatch = [...slabs]
    .filter((slab) => slab.maxQty === null && quantity >= slab.minQty)
    .sort((a, b) => b.minQty - a.minQty)[0]

  return thresholdMatch?.price ?? slabs[0].price
}
