import { db, type QueuedMutation } from "./db"

const MAX_ATTEMPTS = 5
const SYNC_TAG = "pharmacy-sync-queue"

type Listener = () => void
const listeners = new Set<Listener>()

/** Subscribe to queue changes so the UI can show an accurate pending count. */
export function subscribeToQueue(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify() {
  listeners.forEach((listener) => listener())
}

export function newMutationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function enqueue(
  mutation: Omit<QueuedMutation, "createdAt" | "status" | "attempts">,
): Promise<QueuedMutation> {
  const record: QueuedMutation = { ...mutation, createdAt: Date.now(), status: "pending", attempts: 0 }
  await db.syncQueue.put(record)
  notify()
  void requestBackgroundSync()
  return record
}

/** Records the local stock effect of a queued sale so offline reads stay honest. */
export async function recordStockDeltas(mutationId: string, lines: { productId: string; quantity: number }[]) {
  await db.stockDeltas.bulkPut(
    lines.map((line) => ({
      mutationId: `${mutationId}:${line.productId}`,
      productId: line.productId,
      delta: -line.quantity,
    })),
  )
}

async function clearStockDeltas(mutationId: string) {
  const rows = await db.stockDeltas.where("mutationId").startsWith(`${mutationId}:`).toArray()
  await db.stockDeltas.bulkDelete(rows.map((row) => row.mutationId))
}

export async function pendingCount(): Promise<number> {
  return db.syncQueue.where("status").anyOf("pending", "failed", "syncing").count()
}

export async function listQueue(): Promise<QueuedMutation[]> {
  return db.syncQueue.orderBy("createdAt").toArray()
}

export async function discardMutation(id: string) {
  await db.syncQueue.delete(id)
  await clearStockDeltas(id)
  await db.transactions.delete(id)
  notify()
}

/** Asks the service worker to replay the queue when the network returns. */
export async function requestBackgroundSync() {
  if (!("serviceWorker" in navigator)) return
  try {
    const registration = await navigator.serviceWorker.ready
    // `sync` is not in the base TS DOM lib; guard rather than assume support.
    const sync = (registration as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } }).sync
    if (sync) await sync.register(SYNC_TAG)
  } catch {
    // Background Sync unavailable or blocked — the online listener covers us.
  }
}

let flushing = false

export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  if (flushing || !navigator.onLine) return { synced: 0, failed: 0 }
  flushing = true

  let synced = 0
  let failed = 0

  try {
    const queue = await db.syncQueue.orderBy("createdAt").toArray()

    for (const mutation of queue) {
      if (mutation.status === "failed" && mutation.attempts >= MAX_ATTEMPTS) continue

      await db.syncQueue.update(mutation.id, { status: "syncing" })
      notify()

      try {
        const response = await fetch(mutation.url, {
          method: mutation.method,
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(mutation.body),
        })

        if (response.ok) {
          await db.syncQueue.delete(mutation.id)
          await clearStockDeltas(mutation.id)
          await db.transactions.delete(mutation.id)
          synced += 1
        } else if (response.status >= 400 && response.status < 500) {
          // The server rejected it on its merits — retrying will not help.
          const message = await safeErrorMessage(response)
          await db.syncQueue.update(mutation.id, {
            status: "failed",
            attempts: MAX_ATTEMPTS,
            lastError: message,
          })
          failed += 1
        } else {
          await db.syncQueue.update(mutation.id, {
            status: "pending",
            attempts: mutation.attempts + 1,
            lastError: `Server error ${response.status}`,
          })
          failed += 1
          break
        }
      } catch (error) {
        // Network dropped again mid-flush; leave the rest queued.
        await db.syncQueue.update(mutation.id, {
          status: "pending",
          attempts: mutation.attempts + 1,
          lastError: error instanceof Error ? error.message : "Network error",
        })
        failed += 1
        break
      }

      notify()
    }
  } finally {
    flushing = false
    notify()
  }

  return { synced, failed }
}

async function safeErrorMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json()
    return payload?.error || payload?.message || `Request failed (${response.status})`
  } catch {
    return `Request failed (${response.status})`
  }
}

/** Wires the fallback replay triggers. Called once at app start. */
export function installSyncListeners(onFlushed?: (result: { synced: number; failed: number }) => void) {
  const run = async () => {
    const result = await flushQueue()
    if ((result.synced || result.failed) && onFlushed) onFlushed(result)
  }

  window.addEventListener("online", run)
  // A tab that was backgrounded while offline may come back already connected.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && navigator.onLine) void run()
  })
  navigator.serviceWorker?.addEventListener("message", (event) => {
    if (event.data?.type === "SYNC_QUEUE") void run()
  })

  if (navigator.onLine) void run()

  return () => window.removeEventListener("online", run)
}
