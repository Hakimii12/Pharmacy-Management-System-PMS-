import { useEffect, useState } from "react"
import { z } from "zod"

import {
  useCreateProductInDispensaryMutation,
  useCreateProductMutation,
  type ProductInput,
} from "@/api/productApi"
import { errorMessage, useToast } from "@/hooks/useToast"
import { money } from "@/lib/format"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import type { Product } from "@/types"

const schema = z.object({
  batchNo: z.string().min(1, "Batch number is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  distributorName: z.string().optional(),
  distributorContact: z.string().optional(),
})

type FormState = {
  batchNo: string
  expiryDate: string
  quantity: string
  distributorName: string
  distributorContact: string
}

const EMPTY: FormState = {
  batchNo: "",
  expiryDate: "",
  quantity: "0",
  distributorName: "",
  distributorContact: "",
}

/**
 * Add another batch of an existing product.
 *
 * Identity (name, brand, category, dosage form) and pricing come from the source
 * batch the operator filtered to. Only batch number, expiry, quantity and
 * optional distributor details are collected here.
 */
export function AddBatchDialog({
  open,
  source,
  onClose,
}: {
  open: boolean
  source: Product | null
  onClose: () => void
}) {
  const toast = useToast()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [destination, setDestination] = useState<"store" | "dispensary">("store")

  const [createProduct, { isLoading: creating }] = useCreateProductMutation()
  const [createInDispensary, { isLoading: creatingDispensary }] = useCreateProductInDispensaryMutation()
  const saving = creating || creatingDispensary

  useEffect(() => {
    if (!open) return
    setForm({
      ...EMPTY,
      distributorName: source?.distributor?.name ?? "",
      distributorContact: String(source?.distributor?.contact ?? ""),
    })
    setErrors({})
    setDestination("store")
  }, [open, source])

  const update = (field: keyof FormState) => (event: { target: { value: string } }) =>
    setForm((previous) => ({ ...previous, [field]: event.target.value }))

  const handleSubmit = async () => {
    if (!source) return

    const parsed = schema.safeParse(form)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    const sameBatch =
      parsed.data.batchNo.trim().toLowerCase() === source.batchNo.trim().toLowerCase() &&
      parsed.data.expiryDate === source.expiryDate.slice(0, 10)

    if (sameBatch) {
      setErrors({
        batchNo: "Use a different batch number or expiry than the source batch",
      })
      return
    }

    setErrors({})

    const { distributorName, distributorContact, ...rest } = parsed.data
    const payload: ProductInput = {
      name: source.name,
      brand: source.brand,
      category: source.category,
      DosageForms: source.DosageForms,
      type: source.type,
      unitPrice: source.unitPrice,
      markup: source.markup,
      storeThreshold: source.inventory.storeThreshold,
      dispensaryThreshold: source.inventory.dispensaryThreshold,
      batchNo: rest.batchNo,
      expiryDate: rest.expiryDate,
      quantity: rest.quantity,
      distributor:
        distributorName || distributorContact
          ? {
              name: distributorName || "Unknown",
              contact: distributorContact || "0000000000",
            }
          : undefined,
    }

    try {
      if (destination === "dispensary") {
        await createInDispensary(payload).unwrap()
        toast("success", "New batch added to the dispensary")
      } else {
        await createProduct(payload).unwrap()
        toast("success", "New batch added to the back store")
      }
      onClose()
    } catch (error) {
      toast("error", "Could not add batch", errorMessage(error))
    }
  }

  if (!source) return null

  const identity = [source.brand, source.category, source.DosageForms].filter(Boolean).join(" · ")

  return (
    <Dialog
      open={open}
      onClose={onClose}
      width="max-w-lg"
      eyebrow="Existing product"
      title={`New batch · ${source.name}`}
      description="Same product identity and pricing as the batch you filtered to. Only enter the new batch details."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            Add batch
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-label border border-mist bg-paper-sunken px-3 py-2.5 text-sm">
          <p className="font-medium text-ink">{source.name}</p>
          {identity && <p className="mt-0.5 text-ink-muted">{identity}</p>}
          <p className="mt-1 tabular text-ink-muted">
            Cost {money(source.unitPrice)} · markup {source.markup}% · sells at {money(source.sellingPrice)}
          </p>
        </div>

        <div>
          <p className="eyebrow mb-1.5">Where did this stock arrive?</p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "store", label: "Back store" },
                { value: "dispensary", label: "Dispensary shelf" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDestination(option.value)}
                className={
                  destination === option.value
                    ? "rounded-label border border-ink bg-ink px-3 py-2.5 text-sm font-medium text-paper"
                    : "rounded-label border border-mist-deep bg-paper-raised px-3 py-2.5 text-sm font-medium text-ink-muted hover:border-ink-muted"
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Batch number"
            value={form.batchNo}
            onChange={update("batchNo")}
            error={errors.batchNo}
            required
          />
          <Input
            label="Expiry date"
            type="date"
            value={form.expiryDate}
            onChange={update("expiryDate")}
            error={errors.expiryDate}
            required
          />
          <Input
            label="Quantity"
            type="number"
            numeric
            min={1}
            value={form.quantity}
            onChange={update("quantity")}
            error={errors.quantity}
            required
          />
          <div className="hidden sm:block" aria-hidden />
          <Input
            label="Distributor"
            value={form.distributorName}
            onChange={update("distributorName")}
            hint="Optional"
          />
          <Input
            label="Distributor contact"
            value={form.distributorContact}
            onChange={update("distributorContact")}
            hint="Optional"
          />
        </div>
      </div>
    </Dialog>
  )
}
