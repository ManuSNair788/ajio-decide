import { NextResponse } from "next/server"
import { getProduct, getUser, getWishlistItem } from "@/lib/data"
import { buildPrompt, parseDecideResponse, type DecideResponse } from "@/lib/doubtResolution"
import { callSynthesis } from "@/lib/llm"

// lib/llm.ts's backoff loop (ARCHITECTURE.md §4.4) can take longer than Vercel's default
// serverless function duration if it genuinely has to wait out several 429s — this gives it
// room to actually reach its own graceful-failure return instead of Vercel cutting the function
// off first with a platform-level timeout the browser would see as a raw error.
export const maxDuration = 60

// The fixed graceful-failure card (ARCHITECTURE.md §3.5) — returned for every failure path
// (bad request, missing data, LLM timeout/429-exhausted, malformed/unparseable response) so the
// browser only ever sees a normal 200 JSON response, never an unhandled error or blank screen.
const GRACEFUL_FAILURE: DecideResponse = {
  status: "decided",
  card: {
    verdict: "park_it",
    headline: "Couldn't reach a verdict right now",
    reasoning: "The decision service is temporarily unavailable — please try again.",
    confidence: "low",
  },
}

export async function POST(request: Request): Promise<Response> {
  try {
    let body: { wishlistItemId?: unknown; answer?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(GRACEFUL_FAILURE)
    }

    const wishlistItemId = body?.wishlistItemId
    if (typeof wishlistItemId !== "string") {
      return NextResponse.json(GRACEFUL_FAILURE)
    }
    const answer = typeof body?.answer === "string" ? body.answer : undefined

    const item = getWishlistItem(wishlistItemId)
    if (!item) {
      return NextResponse.json(GRACEFUL_FAILURE)
    }

    const product = getProduct(item.product_id)
    const user = getUser(item.user_id)
    if (!product || !user) {
      return NextResponse.json(GRACEFUL_FAILURE)
    }

    const prompt = buildPrompt(item, product, user, answer)
    const result = await callSynthesis(prompt)
    if (!result.ok) {
      return NextResponse.json(GRACEFUL_FAILURE)
    }

    const parsed = parseDecideResponse(result.text)
    if (!parsed) {
      return NextResponse.json(GRACEFUL_FAILURE)
    }

    return NextResponse.json(parsed)
  } catch {
    // Final safety net — any unexpected exception anywhere above still returns a structured
    // card, never a 500 page or a stack trace, per the live-demo requirement.
    return NextResponse.json(GRACEFUL_FAILURE)
  }
}
