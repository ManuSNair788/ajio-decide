import Groq, { RateLimitError } from "groq-sdk"

// ARCHITECTURE.md §4.4 — confirmed on the Groq dashboard for GROQ_MODEL_SYNTHESIS
// (openai/gpt-oss-120b), the only model this app calls (ARCHITECTURE.md §3.8).
const RPM_LIMIT = 30
const TPM_LIMIT = 8_000

// ARCHITECTURE.md §4.4 point 1 — four retries beyond the original attempt, same schedule as
// discovery-engine/llm.py.
const BACKOFF_SCHEDULE_MS = [1_000, 2_000, 4_000, 8_000]

// discovery-engine/llm.py bug, carried forward as a lesson here: a 429's Retry-After header
// honored uncapped once stalled that pipeline for ~2 hours on a single sleep. Our own RPM/TPM
// windows already handle legitimate per-minute pacing proactively, so a 429 that gets through
// anyway should only ever need a short wait to clear — Retry-After is capped, not trusted
// unconditionally.
const MAX_RETRY_AFTER_S = 30

const DEFAULT_EXPECTED_OUTPUT_TOKENS = 500

export type LLMResult = { ok: true; text: string } | { ok: false; error: string; rateLimited: boolean }

let clientInstance: Groq | null = null

function getClient(): Groq {
  if (!clientInstance) {
    // maxRetries: 0 — discovery-engine/llm.py lesson: the SDK's own default retry-on-429
    // behavior (default is 2 retries) fires extra HTTP requests invisibly to our RPM/TPM
    // windows below, which silently blew past the real rate limit in that pipeline. All retry
    // logic must go through the backoff loop in callSynthesis(), or the accounting is wrong.
    clientInstance = new Groq({ apiKey: process.env.GROQ_API_KEY, maxRetries: 0 })
  }
  return clientInstance
}

function estimateTokens(prompt: string, expectedOutputTokens: number): number {
  return Math.ceil(prompt.length / 4) + expectedOutputTokens
}

// Per-model rolling one-minute windows, module-scoped. Best-effort: a Vercel serverless
// function instance can be recycled between requests (cold start resets this to empty), so this
// is a courtesy against bursts within a warm instance, not a guaranteed global limiter — the
// 429 backoff below is what actually keeps every request within Groq's real limit regardless.
let usageWindow: { ts: number; tokens: number }[] = []
let requestWindow: number[] = []

function pruneUsageWindow(now: number): void {
  const cutoff = now - 60_000
  usageWindow = usageWindow.filter((w) => w.ts >= cutoff)
}

function pruneRequestWindow(now: number): void {
  const cutoff = now - 60_000
  requestWindow = requestWindow.filter((ts) => ts >= cutoff)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForTpmHeadroom(prompt: string, expectedOutputTokens: number): Promise<void> {
  const estimate = estimateTokens(prompt, expectedOutputTokens)
  if (estimate > TPM_LIMIT) return // bigger than the whole budget — let 429 handling take over

  for (;;) {
    const now = Date.now()
    pruneUsageWindow(now)
    const used = usageWindow.reduce((sum, w) => sum + w.tokens, 0)
    if (used + estimate <= TPM_LIMIT) return
    const waitMs = Math.max(usageWindow[0].ts + 60_000 - now, 100)
    await sleep(waitMs)
  }
}

function recordUsage(tokens: number): void {
  usageWindow.push({ ts: Date.now(), tokens })
}

async function waitForRpmHeadroom(): Promise<void> {
  for (;;) {
    const now = Date.now()
    pruneRequestWindow(now)
    if (requestWindow.length < RPM_LIMIT) return
    const waitMs = Math.max(requestWindow[0] + 60_000 - now, 100)
    await sleep(waitMs)
  }
}

function recordRequest(): void {
  requestWindow.push(Date.now())
}

function retryAfterSeconds(err: RateLimitError): number | null {
  // err.headers' concrete type comes from the SDK's own generics and isn't worth depending on
  // precisely here — routed through `unknown` so this works whether it's a Fetch API Headers
  // instance or a plain object, without a brittle cast onto an assumed shape.
  const headers = err.headers as unknown as { get?: (name: string) => string | null } | Record<string, string> | null | undefined
  if (!headers) return null
  const raw = typeof headers.get === "function" ? headers.get("retry-after") : (headers as Record<string, string>)["retry-after"]
  if (!raw) return null
  const parsed = Number.parseFloat(raw)
  if (Number.isNaN(parsed)) return null
  return Math.min(parsed, MAX_RETRY_AFTER_S)
}

export async function callSynthesis(
  prompt: string,
  opts: { timeoutMs?: number; expectedOutputTokens?: number } = {},
): Promise<LLMResult> {
  const timeoutMs = opts.timeoutMs ?? 20_000
  const expectedOutputTokens = opts.expectedOutputTokens ?? DEFAULT_EXPECTED_OUTPUT_TOKENS
  const model = process.env.GROQ_MODEL_SYNTHESIS

  if (!model) {
    return { ok: false, error: "GROQ_MODEL_SYNTHESIS is not set", rateLimited: false }
  }
  if (!process.env.GROQ_API_KEY) {
    return { ok: false, error: "GROQ_API_KEY is not set", rateLimited: false }
  }

  let lastError: unknown = null

  for (let attempt = 0; attempt <= BACKOFF_SCHEDULE_MS.length; attempt++) {
    // Checked before every attempt, not just the first — each retry is its own API call
    // subject to both limits again (discovery-engine/llm.py, same reasoning).
    await waitForTpmHeadroom(prompt, expectedOutputTokens)
    await waitForRpmHeadroom()

    try {
      const response = await getClient().chat.completions.create(
        { model, messages: [{ role: "user", content: prompt }] },
        { timeout: timeoutMs },
      )
      recordRequest()

      const content = response.choices[0]?.message?.content
      if (!content) {
        return { ok: false, error: "Empty response content from model", rateLimited: false }
      }

      const actualTokens = response.usage?.total_tokens
      const tokensUsed = actualTokens ?? estimateTokens(prompt, expectedOutputTokens)
      recordUsage(tokensUsed)

      return { ok: true, text: content }
    } catch (err) {
      if (err instanceof RateLimitError) {
        // The 429 itself was still a request against the RPM budget, even though it consumed
        // no token quota.
        recordRequest()
        lastError = err
        if (attempt < BACKOFF_SCHEDULE_MS.length) {
          const waitMs = (retryAfterSeconds(err) ?? BACKOFF_SCHEDULE_MS[attempt] / 1000) * 1000
          await sleep(waitMs)
        }
        continue
      }
      // Timeout, connection error, malformed response, etc. — no retry.
      return { ok: false, error: err instanceof Error ? err.message : String(err), rateLimited: false }
    }
  }

  return {
    ok: false,
    error: lastError instanceof Error ? lastError.message : String(lastError),
    rateLimited: true,
  }
}
