import { useEffect } from "react"
import { CheckCircle2, CloudOff, Printer, X } from "lucide-react"

import { Button } from "@/components/ui/Button"
import { formatDateTime } from "@/lib/format"

/**
 * Confirmation shown the moment a sale is committed.
 *
 * The receipt-print animation is the single deliberate motion in the app; it
 * gives the operator an unambiguous "that went through" signal at a busy counter.
 */
export function ReceiptDialog({
  transactionId,
  queued,
  onClose,
}: {
  transactionId: string
  queued: boolean
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sale recorded"
        className="w-full max-w-sm animate-receipt-print rounded-label border border-mist bg-paper-raised shadow-raised"
      >
        <div className="flex items-start justify-between border-b border-dashed border-mist-deep px-5 py-4">
          <div className="flex items-start gap-3">
            {queued ? (
              <CloudOff className="mt-0.5 h-5 w-5 text-rx-amber" aria-hidden />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-mint" aria-hidden />
            )}
            <div>
              <p className="eyebrow">{queued ? "Queued offline" : "Recorded"}</p>
              <h2 className="font-display text-lg font-semibold text-ink">
                {queued ? "Saved on this device" : "Sale sent"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-label p-1 text-ink-muted hover:bg-paper-sunken no-print"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div>
            <p className="eyebrow">Transaction</p>
            <p className="tabular break-all font-mono text-sm text-ink">{transactionId}</p>
          </div>

          <div>
            <p className="eyebrow">Time</p>
            <p className="tabular font-mono text-sm text-ink">{formatDateTime(new Date())}</p>
          </div>

          {queued && (
            <p className="rounded-label border border-rx-amber/30 bg-rx-amber-soft px-3 py-2 text-xs text-rx-amber-deep">
              This sale has not reached the server yet. It will send automatically when the
              connection returns, and a cashier will only see it after that.
            </p>
          )}
        </div>

        <div className="flex gap-2 border-t border-dashed border-mist-deep px-5 py-3 no-print">
          <Button variant="ghost" fullWidth onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden />
            Print
          </Button>
          <Button fullWidth onClick={onClose}>
            Next sale
          </Button>
        </div>
      </div>
    </div>
  )
}
