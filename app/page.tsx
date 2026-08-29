import { bucketFor, type Bucket } from "@/lib/bucketSort"
import { getProduct, getUser, getWishlistForUser, type Product, type WishlistItem } from "@/lib/data"
import WishlistBucket from "./components/WishlistBucket"
import styles from "./page.module.css"

const BUCKET_ORDER: Bucket[] = ["Ready to buy", "Needs a decision", "Let it go"]

const DEMO_USER_ID = "user_1"

export default function Home() {
  const user = getUser(DEMO_USER_ID)
  if (!user) {
    throw new Error(`Seeded demo user "${DEMO_USER_ID}" not found in users.json`)
  }

  const bucketed: Record<Bucket, { item: WishlistItem; product: Product }[]> = {
    "Ready to buy": [],
    "Needs a decision": [],
    "Let it go": [],
  }

  for (const item of getWishlistForUser(user.id)) {
    const product = getProduct(item.product_id)
    if (!product) continue
    bucketed[bucketFor(item, product, user)].push({ item, product })
  }

  return (
    <main>
      <header className={styles.header}>
        <h1 className={styles.heading}>{user.name}&apos;s Wishlist</h1>
        <p className={styles.subheading}>Every saved item, sorted by what it needs from you.</p>
      </header>
      <div className={styles.buckets}>
        {BUCKET_ORDER.map((bucket) => (
          <WishlistBucket key={bucket} title={bucket} entries={bucketed[bucket]} />
        ))}
      </div>
    </main>
  )
}
