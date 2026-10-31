import { useEffect, useState } from "react"
import { Minus, Plus } from "lucide-react"

import {
  useUpdateDispensaryQuantityMutation,
  useUpdateStoreQuantityMutation,
} from "@/api/productApi"
import { errorMessage, useToast } from "@/hooks/useToast"
import { formatDate, quantity as formatQuantity } from "@/lib/format"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import type { Product } from "@/types"

export function EditQuantityDialog({
  open,
  product,
  location,
  onClose,
}: {
  open: boolean
  product: Product | null
  location: "store" | "dispensary"
  onClose: () => void
}) {
  const toast = useToast()
  const [qty, setQty] = useState("")
  const [error, setError] = useState<string | null>(null)

  const [updateStoreQty, { isLoading: updatingStore }] = useUpdateStoreQuantityMutation()
  const [updateDispQty, { isLoading: updatingDisp }] = useUpdateDispensaryQuantityMutation()
  const saving = updatingStore || updatingDisp

  const currentQty =
    location === "store"
      ? (product?.inventory?.store ?? (product as any)?.stQty ?? product?.quantity ?? 0)
      : (product?.inventory?.dispensary ?? (product as any)?.dispQty ?? product?.quantity ?? 0)

  useEffect(() => {
    if (!open || !product) return
    setQty(String(currentQty))
    setError(null)
  }, [open, product, currentQty])

  if (!product) return null

  const handleAdjust = (delta: number) => {
    const current = Math.max(0, parseInt(qty || "0", 10) || 0)
    const next = Math.max(0, current + delta)
    setQty(String(next))
    setError(null)
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const numericQty = parseInt(qty, 10)

    if (isNaN(numericQty) || numericQty < 0) {
      setError("Please enter a valid non-negative quantity")
      return
    }

    try {
      if (location === "store") {
        await updateStoreQty({ id: product._id, quantity: numericQty }).unwrap()
        toast("success", `Back store quantity updated to ${numericQty}`)
      } else {
        await updateDispQty({ id: product._id, quantity: numericQty }).unwrap()
        toast("success", `Dispensary shelf quantity updated to ${numericQty}`)
      }
      onClose()
    } catch (err) {
      toast("error", "Could not update quantity", errorMessage(err))
    }
  }

  const locationLabel = location === "store" ? "Back store" : "Dispensary shelf"

  return (
    <Dialog
      open={open}
      onClose={onClose}
      width="max-w-md"
      eyebrow={locationLabel}
      title="Edit stock quantity"
      description={`Update the physical stock count for ${product.name}.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => handleSubmit()} loading={saving}>
            Save quantity
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Batch summary card */}
        <div className="rounded-label border border-mist bg-paper-sunken px-3.5 py-3 text-sm">
          <p className="font-semibold text-ink">{product.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
            <span>
              Batch: <strong className="font-mono text-ink">{product.batchNo}</strong>
            </span>
            <span>·</span>
            <span>
              Expires: <strong className="text-ink">{formatDate(product.expiryDate)}</strong>
            </span>
            <span>·</span>
            <span>
              Current in {location === "store" ? "store" : "dispensary"}:{" "}
              <strong className="text-ink">{formatQuantity(currentQty)}</strong>
            </span>
          </div>
        </div>

        {/* Quantity input & steppers */}
        <div className="space-y-2">
          <Input
            label={`New ${locationLabel.toLowerCase()} quantity`}
            type="number"
            numeric
            min={0}
            step="1"
            value={qty}
            onChange={(e) => {
              setQty(e.target.value)
              setError(null)
            }}
            error={error || undefined}
            required
            autoFocus
          />

          {/* Quick adjustment buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-ink-muted mr-1">Quick adjust:</span>
            {[-10, -5, -1, 1, 5, 10].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => handleAdjust(step)}
                className="inline-flex items-center gap-0.5 rounded border border-mist bg-paper-raised px-2 py-1 font-mono text-xs text-ink hover:border-ink-muted transition-colors"
              >
                {step > 0 ? <Plus className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
                {Math.abs(step)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setQty("0")}
              className="rounded border border-alert/30 bg-alert-soft px-2 py-1 font-mono text-xs text-alert hover:bg-alert/20 transition-colors ml-auto"
            >
              Zero
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
