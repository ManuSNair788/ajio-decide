import { z } from "zod"
import { getProduct, type DoubtType, type Product, type User, type WishlistItem } from "./data"

const DecisionCardSchema = z.object({
  verdict: z.enum(["buy", "not_for_you", "park_it"]),
  headline: z.string(),
  reasoning: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  supporting_ref: z
    .object({
      product_id: z.string(),
      reason: z.string(),
    })
    .optional(),
})

export const DecideResponseSchema = z.union([
  z.object({
    status: z.literal("needs_input"),
    question: z.string(),
  }),
  z.object({
    status: z.literal("decided"),
    card: DecisionCardSchema,
  }),
])

export type DecisionCard = z.infer<typeof DecisionCardSchema>
export type DecideResponse = z.infer<typeof DecideResponseSchema>

// Shared verbatim across every doubt type (ARCHITECTURE.md §3.5) — the ground-truth-only rule,
// the needs_input escape hatch, the low-confidence escape hatch, and the exact response shape.
const RESPONSE_SHAPE_INSTRUCTION = `
You are given a fixed set of facts below. Do not invent, assume, or recall any product fact not
present in this block. If a fact required for this doubt type is missing and cannot be reasoned
about from what is given, respond with the needs_input state and ask one short, specific question
- do not guess. If the facts are sufficient but still leave real uncertainty (e.g. no matching order
history), set "confidence": "low" and say plainly what is missing in the reasoning - do not guess a
verdict either.

Respond with JSON only - no markdown code fences, no prose outside the JSON - matching exactly one
of these two shapes:
{"status": "needs_input", "question": "<one short, specific question>"}
{"status": "decided", "card": {"verdict": "buy" | "not_for_you" | "park_it", "headline": "<short headline>", "reasoning": "<grounded explanation>", "confidence": "high" | "medium" | "low", "supporting_ref": {"product_id": "<id>", "reason": "<reason>"}}}
supporting_ref is optional. Only include it for a "not_for_you" verdict that points to a specific
closer-matching product from the facts below; omit the field entirely otherwise.
`.trim()

function buildFitPrompt(item: WishlistItem, product: Product, user: User): string {
  const brandOrders = user.order_history.filter((entry) => getProduct(entry.product_id)?.brand === product.brand)

  const brandOrderLines = brandOrders.length
    ? brandOrders
        .map((entry) => {
          const orderedProduct = getProduct(entry.product_id)
          return `- "${orderedProduct?.name}" (${product.brand}), ordered in size ${entry.size_ordered}, outcome: ${entry.outcome}`
        })
        .join("\n")
    : "(none — this user has no past orders from this brand)"

  const facts = [
    `DOUBT TYPE: fit — the user is unsure whether this item will fit them.`,
    ``,
    `PRODUCT FACTS:`,
    `- Name: "${product.name}"`,
    `- Brand: ${product.brand}`,
    `- Available sizes: ${product.size_range.join(", ")}`,
    `- Brand-level fit signal, from aggregated review data (not this user's own experience): ${product.brand_fit_signal}`,
    ``,
    `THIS USER'S PAST ORDERS FROM ${product.brand}:`,
    brandOrderLines,
    ``,
    `INSTRUCTION FOR THIS DOUBT TYPE: base the verdict only on the brand-level fit signal and the`,
    `past orders listed above. In the "reasoning" field, explicitly name the specific past order`,
    `(product name and size ordered) and the brand fit signal you used — a generic answer that`,
    `doesn't cite them is not acceptable. If there are no past orders from this brand, say so`,
    `plainly, rely on the brand fit signal alone, and reflect the weaker evidence in "confidence".`,
  ].join("\n")

  return `${facts}\n\n${RESPONSE_SHAPE_INSTRUCTION}`
}

type PromptBuilder = (item: WishlistItem, product: Product, user: User) => string

// Phase 8 wires only "fit" end to end; ARCHITECTURE.md §3.5's quality/returns_risk rows are
// built in Phase 9.
const PROMPT_BUILDERS: Partial<Record<DoubtType, PromptBuilder>> = {
  fit: buildFitPrompt,
}

export function buildPrompt(item: WishlistItem, product: Product, user: User): string {
  const builder = PROMPT_BUILDERS[item.doubt_type]
  if (!builder) {
    throw new Error(`doubtResolution: no prompt builder registered yet for doubt_type "${item.doubt_type}"`)
  }
  return builder(item, product, user)
}

export function parseDecideResponse(rawText: string): DecideResponse | null {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim()

  let json: unknown
  try {
    json = JSON.parse(cleaned)
  } catch {
    return null
  }

  const result = DecideResponseSchema.safeParse(json)
  return result.success ? result.data : null
}
