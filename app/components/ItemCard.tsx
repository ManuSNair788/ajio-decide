"use client"

import { useState } from "react"
import type { Product, WishlistItem } from "@/lib/data"
import type { DecideResponse } from "@/lib/doubtResolution"
import DecisionCard from "./DecisionCard"
import styles from "./ItemCard.module.css"

type Props = {
  item: WishlistItem
  product: Product
}

type RequestState = { status: "idle" } | { status: "loading" } | { status: "done"; response: DecideResponse }

const NOT_WIRED_YET: DecideResponse = {
  status: "decided",
  card: {
    verdict: "park_it",
    headline: "Not wired up yet",
    reasoning: "This doubt type is coming in a later phase.",
    confidence: "low",
  },
}

const REQUEST_FAILED: DecideResponse = {
  status: "decided",
  card: {
    verdict: "park_it",
    headline: "Couldn't reach a verdict right now",
    reasoning: "The decision service is temporarily unavailable — please try again.",
    confidence: "low",
  },
}

export default function ItemCard({ item, product }: Props) {
  const [state, setState] = useState<RequestState>({ status: "idle" })
  const wired = item.doubt_type === "fit"

  async function handleHelpMeDecide() {
    if (!wired) {
      setState({ status: "done", response: NOT_WIRED_YET })
      return
    }

    setState({ status: "loading" })
    try {
      const res = await fetch("/api/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wishlistItemId: item.id }),
      })
      const data = (await res.json()) as DecideResponse
      setState({ status: "done", response: data })
    } catch {
      setState({ status: "done", response: REQUEST_FAILED })
    }
  }

  return (
    <article className={styles.card}>
      <div className={styles.info}>
        <p className={styles.name}>{product.name}</p>
        <p className={styles.brand}>{product.brand}</p>
        <p className={styles.price}>₹{product.price.toLocaleString("en-IN")}</p>
      </div>
      <button
        type="button"
        className={styles.button}
        onClick={handleHelpMeDecide}
        disabled={state.status === "loading"}
      >
        {state.status === "loading" ? "Thinking…" : "Help me decide"}
      </button>
      {state.status === "done" && state.response.status === "decided" && (
        <DecisionCard card={state.response.card} />
      )}
      {state.status === "done" && state.response.status === "needs_input" && (
        <p className={styles.stubNote}>{state.response.question}</p>
      )}
    </article>
  )
}
