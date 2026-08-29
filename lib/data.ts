import productsJson from "@/data/products.json"
import usersJson from "@/data/users.json"
import wishlistsJson from "@/data/wishlists.json"

export type Product = {
  id: string
  name: string
  brand: string
  category: string
  size_range: string[]
  fabric: string
  formality: "casual" | "workwear" | "festive" | "formal"
  price: number
  reviews: string[]
  brand_fit_signal: "runs_small" | "true_to_size" | "runs_large"
}

export type OrderHistoryEntry = {
  product_id: string
  size_ordered: string
  outcome: "kept" | "returned"
}

export type User = {
  id: "user_1" | "user_2"
  name: string
  order_history: OrderHistoryEntry[]
}

export type DoubtType = "fit" | "quality" | "returns_risk"

export type WishlistItem = {
  id: string
  user_id: string
  product_id: string
  doubt_type: DoubtType
  expected_fabric_feel?: string
  saved_at: string
}

const DOUBT_TYPES: DoubtType[] = ["fit", "quality", "returns_risk"]
const FORMALITIES = ["casual", "workwear", "festive", "formal"]
const OUTCOMES = ["kept", "returned"]

function assertProduct(p: unknown, index: number): asserts p is Product {
  const r = p as Record<string, unknown>
  if (typeof r?.id !== "string") throw new Error(`products.json[${index}]: missing id`)
  if (typeof r.name !== "string") throw new Error(`products.json[${index}]: missing name`)
  if (typeof r.brand !== "string") throw new Error(`products.json[${index}]: missing brand`)
  if (typeof r.category !== "string") throw new Error(`products.json[${index}]: missing category`)
  if (!Array.isArray(r.size_range)) throw new Error(`products.json[${index}]: missing size_range`)
  if (typeof r.fabric !== "string") throw new Error(`products.json[${index}]: missing fabric`)
  if (!FORMALITIES.includes(r.formality as string))
    throw new Error(`products.json[${index}]: invalid formality "${r.formality}"`)
  if (typeof r.price !== "number") throw new Error(`products.json[${index}]: missing price`)
  if (!Array.isArray(r.reviews)) throw new Error(`products.json[${index}]: missing reviews`)
  if (!["runs_small", "true_to_size", "runs_large"].includes(r.brand_fit_signal as string))
    throw new Error(`products.json[${index}]: invalid brand_fit_signal "${r.brand_fit_signal}"`)
}

function assertUser(u: unknown, index: number): asserts u is User {
  const r = u as Record<string, unknown>
  if (r?.id !== "user_1" && r?.id !== "user_2")
    throw new Error(`users.json[${index}]: invalid id "${r?.id}"`)
  if (typeof r.name !== "string") throw new Error(`users.json[${index}]: missing name`)
  if (!Array.isArray(r.order_history)) throw new Error(`users.json[${index}]: missing order_history`)
  r.order_history.forEach((o: Record<string, unknown>, oi: number) => {
    if (typeof o.product_id !== "string")
      throw new Error(`users.json[${index}].order_history[${oi}]: missing product_id`)
    if (typeof o.size_ordered !== "string")
      throw new Error(`users.json[${index}].order_history[${oi}]: missing size_ordered`)
    if (!OUTCOMES.includes(o.outcome as string))
      throw new Error(`users.json[${index}].order_history[${oi}]: invalid outcome "${o.outcome}"`)
  })
}

function assertWishlistItem(w: unknown, index: number): asserts w is WishlistItem {
  const r = w as Record<string, unknown>
  if (typeof r?.id !== "string") throw new Error(`wishlists.json[${index}]: missing id`)
  if (typeof r.user_id !== "string") throw new Error(`wishlists.json[${index}]: missing user_id`)
  if (typeof r.product_id !== "string") throw new Error(`wishlists.json[${index}]: missing product_id`)
  if (!DOUBT_TYPES.includes(r.doubt_type as DoubtType))
    throw new Error(`wishlists.json[${index}]: invalid doubt_type "${r.doubt_type}"`)
  if (r.expected_fabric_feel !== undefined && typeof r.expected_fabric_feel !== "string")
    throw new Error(`wishlists.json[${index}]: expected_fabric_feel must be a string when present`)
  if (typeof r.saved_at !== "string") throw new Error(`wishlists.json[${index}]: missing saved_at`)
}

function loadProducts(): Product[] {
  const raw = productsJson as unknown[]
  raw.forEach(assertProduct)
  return raw as Product[]
}

function loadUsers(): User[] {
  const raw = usersJson as unknown[]
  raw.forEach(assertUser)
  return raw as User[]
}

function loadWishlistItems(): WishlistItem[] {
  const raw = wishlistsJson as unknown[]
  raw.forEach(assertWishlistItem)
  return raw as WishlistItem[]
}

export const products: Product[] = loadProducts()
export const users: User[] = loadUsers()
export const wishlistItems: WishlistItem[] = loadWishlistItems()

export function getProduct(productId: string): Product | undefined {
  return products.find((p) => p.id === productId)
}

export function getUser(userId: string): User | undefined {
  return users.find((u) => u.id === userId)
}

export function getWishlistForUser(userId: string): WishlistItem[] {
  return wishlistItems.filter((w) => w.user_id === userId)
}

export function getWishlistItem(id: string): WishlistItem | undefined {
  return wishlistItems.find((w) => w.id === id)
}
