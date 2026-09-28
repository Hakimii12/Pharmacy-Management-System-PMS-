import Dexie, { type EntityTable } from "dexie"
import type { AppNotification, Product, ReferenceEntry, Transaction } from "@/types"

/**
 * Offline source of truth.
 *
 * Reference data (products, catalog) is mirrored here whenever a fetch succeeds,
 * so a terminal that loses connectivity can still browse inventory and ring up a
 * sale. Writes made offline go to `syncQueue` and are replayed on reconnect.
 */

export type SyncStatus = "pending" | "syncing" | "failed"

/** A mutation that was made while offline and still has to reach the server. */
export interface QueuedMutation {
  /** Client-generated UUID. Also used as the optimistic transaction id. */
  id: string
  kind:
    | "sale"
    | "credit-sale"
    | "confirm-sale"
    | "abort-sale"
    | "credit-payment"
    | "create-product"
    | "update-product"
    | "delete-product"
    | "inventory-transfer"
  url: string
  method: "POST" | "PUT" | "DELETE"
  body: unknown
  createdAt: number
  status: SyncStatus
  attempts: number
  lastError?: string
  /**
   * Human-readable summary shown in the pending-sync tray so the operator knows
   * what is still outstanding without decoding a request body.
   */
  label: string
}

/** Stock deltas applied locally while offline, so the UI stays truthful. */
export interface LocalStockDelta {
  productId: string
  delta: number
  mutationId: string
}

export interface CachedMeta {
  key: string
  value: unknown
  updatedAt: number
}

const db = new Dexie("pharmacy-offline") as Dexie & {
  products: EntityTable<Product, "_id">
  transactions: EntityTable<Transaction, "id">
  notifications: EntityTable<AppNotification, "_id">
  categories: EntityTable<ReferenceEntry, "_id">
  dosageForms: EntityTable<ReferenceEntry, "_id">
  syncQueue: EntityTable<QueuedMutation, "id">
  stockDeltas: EntityTable<LocalStockDelta, "mutationId">
  meta: EntityTable<CachedMeta, "key">
}

db.version(1).stores({
  products: "_id, name, brand, category, batchNo, expiryDate",
  transactions: "id, timestamp, status, saleType, pendingSync",
  notifications: "_id, type, read, createdAt",
  categories: "_id, name",
  dosageForms: "_id, name",
  syncQueue: "id, status, createdAt, kind",
  stockDeltas: "mutationId, productId",
  meta: "key",
})

export { db }

export async function cacheProducts(products: Product[]) {
  if (products.length === 0) return
  await db.products.bulkPut(products)
  await setMeta("products:syncedAt", Date.now())
}

export async function cacheTransactions(transactions: Transaction[]) {
  if (transactions.length === 0) return
  await db.transactions.bulkPut(transactions)
}

export async function setMeta(key: string, value: unknown) {
  await db.meta.put({ key, value, updatedAt: Date.now() })
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key)
  return row?.value as T | undefined
}

/**
 * Reads cached products with any offline stock deltas already applied, so a
 * second offline sale sees the stock the first one consumed.
 */
export async function readCachedProducts(filter?: {
  search?: string
  category?: string
  inDispensaryOnly?: boolean
}): Promise<Product[]> {
  const [products, deltas] = await Promise.all([db.products.toArray(), db.stockDeltas.toArray()])

  const deltaByProduct = new Map<string, number>()
  for (const delta of deltas) {
    deltaByProduct.set(delta.productId, (deltaByProduct.get(delta.productId) || 0) + delta.delta)
  }

  let rows = products.map((product) => {
    const delta = deltaByProduct.get(product._id)
    if (!delta) return product
    return {
      ...product,
      quantity: Math.max(0, product.quantity + delta),
      inventory: {
        ...product.inventory,
        dispensary: Math.max(0, product.inventory.dispensary + delta),
      },
    }
  })

  if (filter?.inDispensaryOnly) rows = rows.filter((p) => p.inventory.dispensary > 0)
  if (filter?.category) rows = rows.filter((p) => p.category === filter.category)
  if (filter?.search) {
    const term = filter.search.toLowerCase()
    rows = rows.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.brand || "").toLowerCase().includes(term) ||
        p.batchNo.toLowerCase().includes(term),
    )
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

/** Paginates an already-materialised offline list into the server's envelope. */
export function paginateLocal<T>(rows: T[], page = 1, limit = 25) {
  const start = (page - 1) * limit
  return {
    data: rows.slice(start, start + limit),
    page,
    limit,
    total: rows.length,
    totalPages: rows.length > 0 ? Math.ceil(rows.length / limit) : 0,
  }
}

export async function clearOfflineData() {
  await Promise.all([
    db.products.clear(),
    db.transactions.clear(),
    db.notifications.clear(),
    db.categories.clear(),
    db.dosageForms.clear(),
    db.stockDeltas.clear(),
    db.meta.clear(),
  ])
}
