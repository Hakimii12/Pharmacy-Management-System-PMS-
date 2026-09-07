import { AlertTriangle, CloudOff, RefreshCw, Trash2, X } from "lucide-react"

import { useSyncQueue } from "@/hooks/useSyncQueue"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import { discardMutation, flushQueue } from "@/offline/syncQueue"
import { relativeTime } from "@/lib/format"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/cn"

/**
 * Panel listing everything written offline that has not reached the server.
 *
 * Operators need this to be legible: a queued sale is money that has physically
 * left the shelf but does not yet exist in the ledger.
 */
export function SyncTray({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, failed } = useSyncQueue()
  const online = useOnlineStatus()

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/40" onClick={onClose} aria-hidden />

      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-mist bg-paper-raised shadow-raised"
        role="dialog"
        aria-label="Pending sync"
      >
        <header className="flex items-center justify-between border-b border-mist px-5 py-4">
          <div>
            <p className="eyebrow">Offline queue</p>
            <h2 className="font-display text-lg font-semibold">
              {items.length} pending {items.length === 1 ? "write" : "writes"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-label p-1.5 text-ink-muted hover:bg-paper-sunken"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        {!online && (
          <div className="flex items-center gap-2 border-b border-mist bg-rx-amber-soft px-5 py-2.5 text-sm text-rx-amber-deep">
            <CloudOff className="h-4 w-4" aria-hidden />
            No connection — these will send automatically when you are back online.
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink-muted">
              Everything is synced.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "rounded-label border px-3 py-2.5",
                    item.status === "failed" ? "border-alert/30 bg-alert-soft" : "border-mist bg-paper",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{item.label}</p>
                      <p className="mt-0.5 font-mono text-micro uppercase tracking-wider text-ink-muted">
                        {relativeTime(new Date(item.createdAt))}
                        {item.attempts > 0 && ` · ${item.attempts} attempts`}
                      </p>
                      {item.lastError && (
                        <p className="mt-1 flex items-start gap-1 text-xs text-alert">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                          {item.lastError}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge tone={item.status === "failed" ? "bad" : "warn"}>{item.status}</Badge>
                      {item.status === "failed" && (
                        <button
                          type="button"
                          onClick={() => void discardMutation(item.id)}
                          className="rounded p-1 text-ink-muted hover:text-alert"
                          aria-label="Discard"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className="border-t border-mist px-5 py-3">
            <Button
              fullWidth
              onClick={() => void flushQueue()}
              disabled={!online}
              variant={failed > 0 ? "danger" : "primary"}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              {online ? "Retry now" : "Waiting for connection"}
            </Button>
          </footer>
        )}
      </aside>
    </>
  )
}
