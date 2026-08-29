"use client"

import { useState } from "react"
import type { Product, WishlistItem } from "@/lib/data"
import styles from "./ItemCard.module.css"

type Props = {
  item: WishlistItem
  product: Product
}

export default function ItemCard({ product }: Props) {
  const [helpRequested, setHelpRequested] = useState(false)

  return (
    <article className={styles.card}>
      <div className={styles.info}>
        <p className={styles.name}>{product.name}</p>
        <p className={styles.brand}>{product.brand}</p>
        <p className={styles.price}>₹{product.price.toLocaleString("en-IN")}</p>
      </div>
      <button type="button" className={styles.button} onClick={() => setHelpRequested(true)}>
        Help me decide
      </button>
      {helpRequested && (
        <p className={styles.stubNote}>Decision agent isn&apos;t wired up yet — coming in Phase 8.</p>
      )}
    </article>
  )
}
