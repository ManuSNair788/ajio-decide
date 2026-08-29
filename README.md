# AJIO Decide

**Live app:** [https://ajio-decide.vercel.app/](https://ajio-decide.vercel.app/)

A decision agent inside an AJIO-style wishlist that resolves the specific doubt blocking each saved
item — fit, quality, or return risk — instead of leaving the user to defer indefinitely. It offers no
money, ever: no price, discount, or sale language anywhere in the product or its copy.

## What it does

1. **Wishlist screen** — Demo User 1's 15 seeded items are auto-sorted into three buckets (`Ready to
   buy`, `Needs a decision`, `Let it go`) by `lib/bucketSort.ts`, a pure function with no LLM involved.
2. **"Help me decide"** — per item, calls a server-side route (`app/api/decide`) that builds a
   doubt-type-specific prompt grounded only in the seeded mock data (past order history, brand-level
   fit signal, public reviews, catalog facts) and calls a real Groq model.
3. **Three doubt types**, each with its own grounded prompt (`lib/doubtResolution.ts`):
   - **Fit** — cross-references the user's past order history for the same brand with the brand's
     fit signal.
   - **Quality** — compares the user's stated fabric expectation against the catalog fabric and
     reviews; if that expectation hasn't been supplied, the agent asks one short clarifying question
     first (the `needs_input` state), then decides once answered.
   - **Returns risk** — weighs review mentions of exchanges/returns against the user's own
     kept-vs-returned history for that brand.
4. **Decision Card** — every response is exactly one of *Buy*, *Not for you*, or *Park it*, with a
   confidence level and a reasoning string that must cite the specific facts it was grounded in.

Every failure path — a timeout, an exhausted rate-limit backoff, a malformed model response — returns
the same fixed graceful-failure card rather than a blank screen or a stack trace.

## Local development

Node.js is not available in this project's build environment, so this app has never been run locally —
`npm install` / `next build` / `next dev` only ever execute on Vercel. If you have Node.js available:

```
npm install
npm run dev
```

## Environment variables

`GROQ_API_KEY` (secret, read only inside `app/api/decide/route.ts` via `lib/llm.ts` — never imported by
any client component) plus `GROQ_MODEL_SYNTHESIS` (not secret — the current model identifier). See
`.env.local.example`.
