import type { DecisionCard as DecisionCardType } from "@/lib/doubtResolution"
import styles from "./DecisionCard.module.css"

const VERDICT_LABEL: Record<DecisionCardType["verdict"], string> = {
  buy: "Buy",
  not_for_you: "Not for you",
  park_it: "Park it",
}

// Distinct shapes, not just colour, so the verdict reads the same for colour-blind viewers.
const VERDICT_ICON: Record<DecisionCardType["verdict"], string> = {
  buy: "✓",
  not_for_you: "✕",
  park_it: "⏸",
}

export default function DecisionCard({ card }: { card: DecisionCardType }) {
  return (
    <div className={styles.card} data-verdict={card.verdict}>
      <span className={styles.verdictTag}>
        <span className={styles.verdictIcon} aria-hidden="true">
          {VERDICT_ICON[card.verdict]}
        </span>
        {VERDICT_LABEL[card.verdict]}
      </span>
      <p className={styles.headline}>{card.headline}</p>
      <p className={styles.reasoning}>{card.reasoning}</p>
      <p className={styles.confidence}>Confidence: {card.confidence}</p>
      {card.supporting_ref && <p className={styles.supportingRef}>{card.supporting_ref.reason}</p>}
    </div>
  )
}
