import type { Bucket } from "@/lib/bucketSort"
import type { Product, WishlistItem } from "@/lib/data"
import ItemCard from "./ItemCard"
import styles from "./WishlistBucket.module.css"

type Props = {
  title: Bucket
  entries: { item: WishlistItem; product: Product }[]
}

export default function WishlistBucket({ title, entries }: Props) {
  return (
    <section className={styles.bucket}>
      <h2 className={styles.title}>
        {title}
        <span className={styles.count}>({entries.length})</span>
      </h2>
      {entries.length === 0 ? (
        <p className={styles.empty}>Nothing here right now.</p>
      ) : (
        <div className={styles.list}>
          {entries.map(({ item, product }) => (
            <ItemCard key={item.id} item={item} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}
