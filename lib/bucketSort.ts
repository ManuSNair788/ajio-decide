import { getProduct, type OrderHistoryEntry, type Product, type User, type WishlistItem } from "./data"

export type Bucket = "Ready to buy" | "Needs a decision" | "Let it go"

// A saved item older than this with no relevant brand history is treated as one the
// user has stopped actively considering (ARCHITECTURE.md §3.4).
const STALE_DAYS = 45

type SizeSignal = "confident" | "none"

function pastSizeSignal(brand: string, orderHistory: OrderHistoryEntry[]): SizeSignal {
  const hasBrandHistory = orderHistory.some((entry) => getProduct(entry.product_id)?.brand === brand)
  return hasBrandHistory ? "confident" : "none"
}

function isStale(savedAt: string): boolean {
  const ageMs = Date.now() - new Date(savedAt).getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  return ageDays > STALE_DAYS
}

export function bucketFor(item: WishlistItem, product: Product, user: User): Bucket {
  const sizeSignal = pastSizeSignal(product.brand, user.order_history)
  if (sizeSignal === "confident" && item.doubt_type === "fit") return "Ready to buy"
  if (sizeSignal === "none" && user.order_history.length === 0) return "Needs a decision"
  if (isStale(item.saved_at) && sizeSignal === "none") return "Let it go"
  return "Needs a decision"
}
