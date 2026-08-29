"use client"

import { useState } from "react"
import type { Product, WishlistItem } from "@/lib/data"
import type { DecideResponse, DecisionCard as DecisionCardType } from "@/lib/doubtResolution"
import ClarifyingQuestion from "./ClarifyingQuestion"
import DecisionCard from "./DecisionCard"
import styles from "./ItemCard.module.css"

type Props = {
  item: WishlistItem
  product: Product
}

type RequestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "needs_input"; question: string }
  | { status: "answering"; question: string }
  | { status: "decided"; card: DecisionCardType }

const REQUEST_FAILED_CARD: DecisionCardType = {
  verdict: "park_it",
  headline: "Couldn't reach a verdict right now",
  reasoning: "The decision service is temporarily unavailable — please try again.",
  confidence: "low",
}

async function callDecide(wishlistItemId: string, answer?: string): Promise<DecideResponse> {
  const res = await fetch("/api/decide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(answer === undefined ? { wishlistItemId } : { wishlistItemId, answer }),
  })
  return (await res.json()) as DecideResponse
}

export default function ItemCard({ item, product }: Props) {
  const [state, setState] = useState<RequestState>({ status: "idle" })
  const [imageFailed, setImageFailed] = useState(false)

  async function handleHelpMeDecide() {
    setState({ status: "loading" })
    try {
      const data = await callDecide(item.id)
      setState(
        data.status === "needs_input"
          ? { status: "needs_input", question: data.question }
          : { status: "decided", card: data.card },
      )
    } catch {
      setState({ status: "decided", card: REQUEST_FAILED_CARD })
    }
  }

  async function handleAnswerSubmit(answer: string) {
    if (state.status !== "needs_input") return
    setState({ status: "answering", question: state.question })
    try {
      const data = await callDecide(item.id, answer)
      setState(
        data.status === "needs_input"
          ? { status: "needs_input", question: data.question }
          : { status: "decided", card: data.card },
      )
    } catch {
      setState({ status: "decided", card: REQUEST_FAILED_CARD })
    }
  }

  return (
    <article className={styles.card}>
      {imageFailed ? (
        <div className={styles.thumbFallback} aria-hidden="true" />
      ) : (
        <img
          src={product.image_url}
          alt={product.name}
          className={styles.thumb}
          onError={() => setImageFailed(true)}
        />
      )}
      <div className={styles.info}>
        <p className={styles.name}>{product.name}</p>
        <p className={styles.brand}>{product.brand}</p>
        <p className={styles.price}>₹{product.price.toLocaleString("en-IN")}</p>
      </div>

      {(state.status === "idle" || state.status === "loading") && (
        <button
          type="button"
          className={styles.button}
          onClick={handleHelpMeDecide}
          disabled={state.status === "loading"}
        >
          {state.status === "loading" ? "Thinking…" : "Help me decide"}
        </button>
      )}

      {(state.status === "needs_input" || state.status === "answering") && (
        <ClarifyingQuestion
          question={state.question}
          submitting={state.status === "answering"}
          onSubmit={handleAnswerSubmit}
        />
      )}

      {state.status === "decided" && <DecisionCard card={state.card} />}
    </article>
  )
}
