"use client"

import { useState } from "react"
import type { Bucket } from "@/lib/bucketSort"
import type { Product, WishlistItem } from "@/lib/data"
import ItemCard from "./ItemCard"
import styles from "./WishlistBucket.module.css"

type Props = {
  title: Bucket
  entries: { item: WishlistItem; product: Product }[]
  defaultExpanded: boolean
}

export default function WishlistBucket({ title, entries, defaultExpanded }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <section className={styles.bucket}>
      <button
        type="button"
        className={styles.titleButton}
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <h2 className={styles.title}>
          {title}
          <span className={styles.count}>({entries.length})</span>
        </h2>
        <span className={`${styles.chevron} ${expanded ? styles.chevronOpen : ""}`} aria-hidden="true">
          ▾
        </span>
      </button>
      {entries.length === 0 ? (
        <p className={`${styles.empty} ${expanded ? styles.expanded : ""}`}>Nothing here right now.</p>
      ) : (
        <div className={`${styles.list} ${expanded ? styles.expanded : ""}`}>
          {entries.map(({ item, product }) => (
            <ItemCard key={item.id} item={item} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}
