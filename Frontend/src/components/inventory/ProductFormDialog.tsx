import { useEffect, useMemo, useState } from "react"
import { z } from "zod"

import {
  useCreateProductInDispensaryMutation,
  useCreateProductMutation,
  useUpdateProductMutation,
  type ProductInput,
} from "@/api/productApi"
import { useGetCategoriesQuery, useGetDosageFormsQuery } from "@/api/catalogApi"
import { errorMessage, useToast } from "@/hooks/useToast"
import { money, toDateInput } from "@/lib/format"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input, Select } from "@/components/ui/Input"
import type { Product } from "@/types"

const schema = z.object({
  name: z.string().min(2, "Product name is required"),
  brand: z.string().optional(),
  category: z.string().optional(),
  DosageForms: z.string().optional(),
  type: z.string().optional(),
  batchNo: z.string().optional(),
  expiryDate: z.string().min(1, "Expiry date is required"),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative"),
  unitPrice: z.coerce.number().min(0.01, "Unit price is required"),
  markup: z.coerce.number().min(0, "Markup cannot be negative"),
  storeThreshold: z.coerce.number().int().min(0),
  dispensaryThreshold: z.coerce.number().int().min(0),
  distributorName: z.string().optional(),
  distributorContact: z.string().optional(),
})

type FormState = Record<string, string>

const EMPTY: FormState = {
  name: "",
  brand: "",
  category: "",
  DosageForms: "",
  type: "",
  batchNo: "",
  expiryDate: "",
  quantity: "0",
  unitPrice: "",
  markup: "20",
  storeThreshold: "10",
  dispensaryThreshold: "10",
  distributorName: "",
  distributorContact: "",
}

/**
 * Create/edit form for a single batch.
 *
 * New batches can land in either location; the backend has separate endpoints for
 * "arrived in the back store" and "went straight to the dispensary shelf".
 */
export function ProductFormDialog({
  open,
  product,
  onClose,
}: {
  open: boolean
  product?: Product | null
  onClose: () => void
}) {
  const toast = useToast()
  const isEdit = Boolean(product)

  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [destination, setDestination] = useState<"store" | "dispensary">("store")

  const { data: categories } = useGetCategoriesQuery({ limit: 200 })
  const { data: dosageForms } = useGetDosageFormsQuery({ limit: 200 })

  const [createProduct, { isLoading: creating }] = useCreateProductMutation()
  const [createInDispensary, { isLoading: creatingDispensary }] = useCreateProductInDispensaryMutation()
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation()

  const saving = creating || creatingDispensary || updating

  useEffect(() => {
    if (!open) return

    if (product) {
      setForm({
        name: product.name,
        brand: product.brand ?? "",
        category: product.category ?? "",
        DosageForms: product.DosageForms ?? "",
        type: product.type ?? "",
        batchNo: product.batchNo,
        expiryDate: toDateInput(product.expiryDate),
        quantity: String(product.quantity),
        unitPrice: String(product.unitPrice),
        markup: String(product.markup ?? 0),
        storeThreshold: String(product.inventory.storeThreshold ?? 10),
        dispensaryThreshold: String(product.inventory.dispensaryThreshold ?? 10),
        distributorName: product.distributor?.name ?? "",
        distributorContact: String(product.distributor?.contact ?? ""),
      })
    } else {
      setForm(EMPTY)
    }

    setErrors({})
  }, [open, product])

  const update = (field: string) => (event: { target: { value: string } }) =>
    setForm((previous) => ({ ...previous, [field]: event.target.value }))

  // Selling price is derived, so show the operator what the markup produces.
  const derivedSellingPrice = useMemo(() => {
    const unitPrice = Number(form.unitPrice)
    const markup = Number(form.markup)
    if (!unitPrice || Number.isNaN(markup)) return null
    return unitPrice * (1 + markup / 100)
  }, [form.unitPrice, form.markup])

  const handleSubmit = async () => {
    const parsed = schema.safeParse(form)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setErrors({})

    const { distributorName, distributorContact, ...rest } = parsed.data
    const payload: ProductInput = {
      ...rest,
      batchNo: rest.batchNo || "",
      distributor:
        distributorName || distributorContact
          ? { name: distributorName || "Unknown", contact: distributorContact || "0000000000" }
          : undefined,
    }

    try {
      if (product) {
        await updateProduct({ id: product._id, ...payload }).unwrap()
        toast("success", "Batch updated")
      } else if (destination === "dispensary") {
        await createInDispensary(payload).unwrap()
        toast("success", "Batch added to the dispensary")
      } else {
        await createProduct(payload).unwrap()
        toast("success", "Batch added to the back store")
      }
      onClose()
    } catch (error) {
      toast("error", "Could not save", errorMessage(error))
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      width="max-w-2xl"
      eyebrow={isEdit ? "Edit" : "New product"}
      title={isEdit ? product!.name : "Add a new product"}
      description={
        isEdit
          ? "Price and threshold changes apply to this batch only."
          : "Use this only when the product has never been stocked before (new name, brand, category or dosage form). To add another batch of an existing product, filter to it and use Add batch on that row."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            {isEdit ? "Save changes" : "Add product"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!isEdit && (
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
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Product name"
            value={form.name}
            onChange={update("name")}
            error={errors.name}
            required
          />
          <Input label="Brand" value={form.brand} onChange={update("brand")} />

          <Select label="Category" value={form.category} onChange={update("category")}>
            <option value="">Uncategorised</option>
            {categories?.data.map((entry) => (
              <option key={entry._id} value={entry.name}>
                {entry.name}
              </option>
            ))}
          </Select>

          <Select label="Dosage form" value={form.DosageForms} onChange={update("DosageForms")}>
            <option value="">Not specified</option>
            {dosageForms?.data.map((entry) => (
              <option key={entry._id} value={entry.name}>
                {entry.name}
              </option>
            ))}
          </Select>

          <Input
            label="Batch number"
            value={form.batchNo}
            onChange={update("batchNo")}
            hint={isEdit ? undefined : "Left blank, one is generated."}
            disabled={isEdit}
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
            min={0}
            value={form.quantity}
            onChange={update("quantity")}
            error={errors.quantity}
            required
          />

          <Input
            label="Unit cost"
            type="number"
            numeric
            step="0.01"
            min={0}
            value={form.unitPrice}
            onChange={update("unitPrice")}
            error={errors.unitPrice}
            required
          />

          <Input
            label="Markup %"
            type="number"
            numeric
            min={0}
            value={form.markup}
            onChange={update("markup")}
            error={errors.markup}
            hint={derivedSellingPrice ? `Sells at ${money(derivedSellingPrice)}` : undefined}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Store alert at"
              type="number"
              numeric
              min={0}
              value={form.storeThreshold}
              onChange={update("storeThreshold")}
            />
            <Input
              label="Shelf alert at"
              type="number"
              numeric
              min={0}
              value={form.dispensaryThreshold}
              onChange={update("dispensaryThreshold")}
            />
          </div>

          <Input
            label="Distributor"
            value={form.distributorName}
            onChange={update("distributorName")}
          />
          <Input
            label="Distributor contact"
            value={form.distributorContact}
            onChange={update("distributorContact")}
          />
        </div>
      </div>
    </Dialog>
  )
}
