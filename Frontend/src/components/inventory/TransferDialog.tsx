import { useEffect, useState } from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { useIssueToDispensaryMutation, useReturnToStoreMutation } from "@/api/productApi"
import { errorMessage, useToast } from "@/hooks/useToast"
import { quantity as formatQuantity } from "@/lib/format"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import type { Product } from "@/types"

/**
 * Moves stock between the back store and the dispensary shelf.
 *
 * The available figure comes from whichever side the stock is leaving, and the
 * input is hard-capped to it — the server rejects an overdraw, but the operator
 * should not be able to type one in the first place.
 */
export function TransferDialog({
  direction,
  product,
  onClose,
}: {
  direction: "issue" | "return"
  product: Product | null
  onClose: () => void
}) {
  const toast = useToast()
  const [amount, setAmount] = useState("1")
  const [error, setError] = useState<string | null>(null)

  const [issue, { isLoading: issuing }] = useIssueToDispensaryMutation()
  const [returnToStore, { isLoading: returning }] = useReturnToStoreMutation()

  const saving = issuing || returning
  const available = product
    ? direction === "issue"
      ? product.inventory.store
      : product.inventory.dispensary
    : 0

  useEffect(() => {
    if (product) {
      setAmount("1")
      setError(null)
    }
  }, [product])

  if (!product) return null

  const handleSubmit = async () => {
    const value = Number(amount)

    if (!Number.isInteger(value) || value < 1) {
      setError("Enter a whole number of units")
      return
    }
    if (value > available) {
      setError(`Only ${available} available`)
      return
    }

    setError(null)

    try {
      if (direction === "issue") {
        await issue({ productId: product._id, quantity: value }).unwrap()
        toast("success", "Issued to dispensary", `${value} × ${product.name}`)
      } else {
        await returnToStore({ productId: product._id, quantity: value }).unwrap()
        toast("success", "Returned to store", `${value} × ${product.name}`)
      }
      onClose()
    } catch (requestError) {
      toast("error", "Transfer failed", errorMessage(requestError))
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      eyebrow={direction === "issue" ? "Store → Dispensary" : "Dispensary → Store"}
      title={product.name}
      description={`Batch ${product.batchNo}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            {direction === "issue" ? (
              <>
                Issue
                <ArrowRight className="h-4 w-4" aria-hidden />
              </>
            ) : (
              <>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Return
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-label border border-mist bg-paper px-3 py-2.5">
            <p className="eyebrow">Back store</p>
            <p className="tabular font-mono text-lg font-semibold">
              {formatQuantity(product.inventory.store)}
            </p>
          </div>
          <div className="rounded-label border border-mist bg-paper px-3 py-2.5">
            <p className="eyebrow">Dispensary</p>
            <p className="tabular font-mono text-lg font-semibold">
              {formatQuantity(product.inventory.dispensary)}
            </p>
          </div>
        </div>

        <Input
          label="Units to move"
          type="number"
          numeric
          min={1}
          max={available}
          autoFocus
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          error={error ?? undefined}
          hint={`${available} available to move`}
        />
      </div>
    </Dialog>
  )
}
