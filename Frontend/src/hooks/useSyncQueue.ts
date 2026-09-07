import { useEffect, useState } from "react"
import type { QueuedMutation } from "@/offline/db"
import { listQueue, subscribeToQueue } from "@/offline/syncQueue"

/** Live view of the offline write queue, for the pending-sync tray and badges. */
export function useSyncQueue() {
  const [items, setItems] = useState<QueuedMutation[]>([])

  useEffect(() => {
    let active = true

    const refresh = async () => {
      const queue = await listQueue()
      if (active) setItems(queue)
    }

    void refresh()
    const unsubscribe = subscribeToQueue(() => void refresh())

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return {
    items,
    pending: items.filter((item) => item.status !== "failed").length,
    failed: items.filter((item) => item.status === "failed").length,
  }
}
