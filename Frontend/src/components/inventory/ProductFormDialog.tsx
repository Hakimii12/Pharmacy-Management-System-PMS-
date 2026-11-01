import { useEffect, useMemo, useState } from "react"
import { z } from "zod"
import { AlertTriangle } from "lucide-react"

import {
  useCheckDuplicateMutation,
  useCreateProductInDispensaryMutation,
  useCreateProductMutation,
  useUpdateProductMutation,
  type DuplicateCheckResult,
  type ProductInput,
} from "@/api/productApi"
import { useGetCategoriesQuery, useGetDosageFormsQuery } from "@/api/catalogApi"
import { errorMessage, useToast } from "@/hooks/useToast"
import { formatDate, money, toDateInput } from "@/lib/format"
import { Badge } from "@/components/ui/Badge"
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
  unitPrice: z.coerce.number().min(0.01, "Unit cost is required"),
  sellingPrice: z.coerce.number().min(0.01, "Selling price is required"),
  markup: z.coerce.number().min(0, "Markup cannot be negative (selling price must be at least unit cost)"),
  storeThreshold: z.coerce.number().int().min(0),
  dispensaryThreshold: z.coerce.number().int().min(0),
  distributorName: z.string().optional(),
  distributorContact: z.string().optional(),
})

type FormState = Record<string, string>
type PriceCalcMode = "unitPrice" | "sellingPrice" | "markup"

const round2 = (num: number) => Math.round((Number(num) + Number.EPSILON) * 100) / 100

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
  sellingPrice: "",
  markup: "25",
  storeThreshold: "10",
  dispensaryThreshold: "10",
  distributorName: "",
  distributorContact: "",
}

export function ProductFormDialog({
  open,
  product,
  defaultDestination,
  onClose,
  onSwitchToAddBatch,
}: {
  open: boolean
  product?: Product | null
  defaultDestination?: "store" | "dispensary"
  onClose: () => void
  /** Called when the user elects to add a batch of an existing product instead. */
  onSwitchToAddBatch?: (
    source: Product,
    initialValues?: {
      batchNo?: string
      expiryDate?: string
      quantity?: string
      distributorName?: string
      distributorContact?: string
      destination?: "store" | "dispensary"
    },
  ) => void
}) {
  const toast = useToast()
  const isEdit = Boolean(product)

  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [destination, setDestination] = useState<"store" | "dispensary">(defaultDestination ?? "store")
  const [priceCalcMode, setPriceCalcMode] = useState<PriceCalcMode>("unitPrice")

  // Duplicate detection state
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateCheckResult | null>(null)
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)
  const [forceCreate, setForceCreate] = useState(false)

  const { data: categories } = useGetCategoriesQuery({ limit: 200 })
  const { data: dosageForms } = useGetDosageFormsQuery({ limit: 200 })

  const [createProduct, { isLoading: creating }] = useCreateProductMutation()
  const [createInDispensary, { isLoading: creatingDispensary }] = useCreateProductInDispensaryMutation()
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation()
  const [checkDuplicate, { isLoading: checking }] = useCheckDuplicateMutation()

  const saving = creating || creatingDispensary || updating

  useEffect(() => {
    if (!open) return

    setDestination(defaultDestination ?? "store")

    if (product) {
      const up = product.unitPrice ?? 0
      const sp =
        product.sellingPrice ??
        (up && product.markup ? round2(up * (1 + product.markup / 100)) : 0)
      const mk =
        product.markup !== undefined && product.markup !== null && !Number.isNaN(Number(product.markup))
          ? Number(product.markup)
          : up && sp
          ? round2(((sp - up) / up) * 100)
          : 25

      const storeQty = product.inventory?.store ?? (product as any).stQty ?? 0
      const dispQty = product.inventory?.dispensary ?? (product as any).dispQty ?? 0
      const totalActualQty = storeQty + dispQty

      let initialQty = String(product.quantity ?? 0)
      if (defaultDestination === "dispensary") {
        initialQty = String(dispQty)
      } else if (defaultDestination === "store") {
        initialQty = String(storeQty)
      } else if (
        totalActualQty > 0 ||
        (product.inventory && (product.inventory.storeExists || product.inventory.dispensaryExists))
      ) {
        initialQty = String(totalActualQty)
      }

      setForm({
        name: product.name,
        brand: product.brand ?? "",
        category: product.category ?? "",
        DosageForms: product.DosageForms ?? "",
        type: product.type ?? "",
        batchNo: product.batchNo,
        expiryDate: toDateInput(product.expiryDate),
        quantity: initialQty,
        unitPrice: up ? String(up) : "",
        sellingPrice: sp ? String(parseFloat(sp.toFixed(2))) : "",
        markup: mk !== undefined && !Number.isNaN(mk) ? String(parseFloat(mk.toFixed(2))) : "25",
        storeThreshold: String(product.inventory?.storeThreshold ?? 10),
        dispensaryThreshold: String(product.inventory?.dispensaryThreshold ?? 10),
        distributorName: product.distributor?.name ?? "",
        distributorContact: String(product.distributor?.contact ?? ""),
      })
    } else {
      setForm(EMPTY)
    }

    setPriceCalcMode("unitPrice")
    setErrors({})
    setDuplicateInfo(null)
    setShowDuplicateWarning(false)
    setForceCreate(false)
  }, [open, product, defaultDestination])

  const setCalcModeAndRecalc = (mode: PriceCalcMode) => {
    setPriceCalcMode(mode)
    setForm((prev) => {
      const up = parseFloat(prev.unitPrice)
      const sp = parseFloat(prev.sellingPrice)
      const mk = parseFloat(prev.markup)

      if (mode === "unitPrice" && !Number.isNaN(sp) && sp > 0 && !Number.isNaN(mk) && mk >= 0) {
        const calculatedUp = round2(sp / (1 + mk / 100))
        return { ...prev, unitPrice: String(calculatedUp) }
      }
      if (mode === "sellingPrice" && !Number.isNaN(up) && up > 0 && !Number.isNaN(mk) && mk >= 0) {
        const calculatedSp = round2(up * (1 + mk / 100))
        return { ...prev, sellingPrice: String(calculatedSp) }
      }
      if (mode === "markup" && !Number.isNaN(up) && up > 0 && !Number.isNaN(sp) && sp > 0) {
        const calculatedMk = round2(((sp - up) / up) * 100)
        return { ...prev, markup: String(calculatedMk) }
      }
      return prev
    })
  }

  const update = (field: string) => (event: { target: { value: string } }) =>
    setForm((previous) => ({ ...previous, [field]: event.target.value }))

  const handleUnitPriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = event.target.value
    setForm((prev) => {
      const up = parseFloat(val)
      const sp = parseFloat(prev.sellingPrice)
      const mk = parseFloat(prev.markup)

      if (!Number.isNaN(up) && up > 0) {
        if (priceCalcMode === "sellingPrice" && !Number.isNaN(mk) && mk >= 0) {
          const calculatedSelling = round2(up * (1 + mk / 100))
          return {
            ...prev,
            unitPrice: val,
            sellingPrice: String(calculatedSelling),
          }
        }
        if (priceCalcMode === "markup" && !Number.isNaN(sp) && sp > 0) {
          const calculatedMarkup = round2(((sp - up) / up) * 100)
          return {
            ...prev,
            unitPrice: val,
            markup: String(calculatedMarkup),
          }
        }
        // When in unitPrice mode, if selling price is present, compute markup
        if (!Number.isNaN(sp) && sp > 0) {
          const calculatedMarkup = round2(((sp - up) / up) * 100)
          return {
            ...prev,
            unitPrice: val,
            markup: String(calculatedMarkup),
          }
        }
        // Otherwise if markup is present, calculate selling price
        if (!Number.isNaN(mk) && mk >= 0) {
          const calculatedSelling = round2(up * (1 + mk / 100))
          return {
            ...prev,
            unitPrice: val,
            sellingPrice: String(calculatedSelling),
          }
        }
      }

      return { ...prev, unitPrice: val }
    })
  }

  const handleSellingPriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = event.target.value
    setForm((prev) => {
      const sp = parseFloat(val)
      const up = parseFloat(prev.unitPrice)
      const mk = parseFloat(prev.markup)

      if (!Number.isNaN(sp) && sp >= 0) {
        if (priceCalcMode === "unitPrice" && !Number.isNaN(mk) && mk >= 0) {
          const calculatedUp = round2(sp / (1 + mk / 100))
          return {
            ...prev,
            sellingPrice: val,
            unitPrice: String(calculatedUp),
          }
        }
        if (priceCalcMode === "markup" && !Number.isNaN(up) && up > 0) {
          const calculatedMarkup = round2(((sp - up) / up) * 100)
          return {
            ...prev,
            sellingPrice: val,
            markup: String(calculatedMarkup),
          }
        }
        if (!Number.isNaN(up) && up > 0) {
          const calculatedMarkup = round2(((sp - up) / up) * 100)
          return {
            ...prev,
            sellingPrice: val,
            markup: String(calculatedMarkup),
          }
        }
        if (!Number.isNaN(mk) && mk >= 0) {
          const calculatedUp = round2(sp / (1 + mk / 100))
          return {
            ...prev,
            sellingPrice: val,
            unitPrice: String(calculatedUp),
          }
        }
      }

      return { ...prev, sellingPrice: val }
    })
  }

  const handleMarkupChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = event.target.value
    setForm((prev) => {
      const mk = parseFloat(val)
      const up = parseFloat(prev.unitPrice)
      const sp = parseFloat(prev.sellingPrice)

      if (!Number.isNaN(mk) && mk >= 0) {
        if (priceCalcMode === "unitPrice" && !Number.isNaN(sp) && sp > 0) {
          const calculatedUp = round2(sp / (1 + mk / 100))
          return {
            ...prev,
            markup: val,
            unitPrice: String(calculatedUp),
          }
        }
        if (priceCalcMode === "sellingPrice" && !Number.isNaN(up) && up > 0) {
          const calculatedSelling = round2(up * (1 + mk / 100))
          return {
            ...prev,
            markup: val,
            sellingPrice: String(calculatedSelling),
          }
        }
        if (!Number.isNaN(up) && up > 0) {
          const calculatedSelling = round2(up * (1 + mk / 100))
          return {
            ...prev,
            markup: val,
            sellingPrice: String(calculatedSelling),
          }
        }
        if (!Number.isNaN(sp) && sp > 0) {
          const calculatedUp = round2(sp / (1 + mk / 100))
          return {
            ...prev,
            markup: val,
            unitPrice: String(calculatedUp),
          }
        }
      }

      return { ...prev, markup: val }
    })
  }

  const pricingInsights = useMemo(() => {
    const up = parseFloat(form.unitPrice)
    const sp = parseFloat(form.sellingPrice)

    if (Number.isNaN(up) || up <= 0 || Number.isNaN(sp) || sp <= 0) return null

    const profit = round2(sp - up)
    const marginPct = round2((profit / sp) * 100)

    return {
      profit,
      marginPct,
      isLoss: profit < 0,
    }
  }, [form.unitPrice, form.sellingPrice])

  const prepareFormForSubmission = () => {
    const formToValidate = { ...form }
    const up = parseFloat(formToValidate.unitPrice)
    const sp = parseFloat(formToValidate.sellingPrice)
    const mk = parseFloat(formToValidate.markup)

    if (
      !Number.isNaN(sp) &&
      sp > 0 &&
      !Number.isNaN(mk) &&
      mk >= 0 &&
      (Number.isNaN(up) || formToValidate.unitPrice === "" || up <= 0)
    ) {
      formToValidate.unitPrice = String(round2(sp / (1 + mk / 100)))
    } else if (
      !Number.isNaN(up) &&
      up > 0 &&
      !Number.isNaN(mk) &&
      mk >= 0 &&
      (Number.isNaN(sp) || formToValidate.sellingPrice === "" || sp <= 0)
    ) {
      formToValidate.sellingPrice = String(round2(up * (1 + mk / 100)))
    } else if (
      !Number.isNaN(up) &&
      up > 0 &&
      !Number.isNaN(sp) &&
      sp > 0 &&
      (Number.isNaN(mk) || formToValidate.markup === "" || mk < 0)
    ) {
      formToValidate.markup = String(round2(((sp - up) / up) * 100))
    }

    return formToValidate
  }

  const doCreate = async (payload: ProductInput) => {
    try {
      if (destination === "dispensary") {
        await createInDispensary(payload).unwrap()
        toast("success", "Batch added to the dispensary")
      } else {
        await createProduct(payload).unwrap()
        toast("success", "Batch added to the back store")
      }
      // Keep the dialog open and reset the form for the next entry
      setForm(EMPTY)
      setErrors({})
      setDuplicateInfo(null)
      setShowDuplicateWarning(false)
      setForceCreate(false)
    } catch (error) {
      toast("error", "Could not save", errorMessage(error))
    }
  }

  const handleSubmit = async () => {
    const formToValidate = prepareFormForSubmission()
    const parsed = schema.safeParse(formToValidate)
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

    // For edits, skip duplicate check
    if (product) {
      try {
        await updateProduct({ id: product._id, destination, ...payload }).unwrap()
        toast("success", "Batch updated")
        onClose()
      } catch (error) {
        toast("error", "Could not save", errorMessage(error))
      }
      return
    }

    // If user already confirmed "Create anyway", proceed directly
    if (forceCreate) {
      await doCreate(payload)
      return
    }

    // Check for duplicates before creating
    try {
      const result = await checkDuplicate({
        name: parsed.data.name,
        brand: parsed.data.brand,
        category: parsed.data.category,
        DosageForms: parsed.data.DosageForms,
      }).unwrap()

      if (result.exists) {
        setDuplicateInfo(result)
        setShowDuplicateWarning(true)
        return
      }
    } catch {
      // If the duplicate check fails (e.g. offline), proceed with creation
    }

    await doCreate(payload)
  }

  const handleForceCreate = async () => {
    setForceCreate(true)
    setShowDuplicateWarning(false)

    const formToValidate = prepareFormForSubmission()
    const parsed = schema.safeParse(formToValidate)
    if (!parsed.success) return

    const { distributorName, distributorContact, ...rest } = parsed.data
    const payload: ProductInput = {
      ...rest,
      batchNo: rest.batchNo || "",
      distributor:
        distributorName || distributorContact
          ? { name: distributorName || "Unknown", contact: distributorContact || "0000000000" }
          : undefined,
    }
    await doCreate(payload)
  }

  const handleSwitchToAddBatch = () => {
    if (duplicateInfo?.sourceBatch && onSwitchToAddBatch) {
      setShowDuplicateWarning(false)
      setDuplicateInfo(null)
      onClose()
      onSwitchToAddBatch(duplicateInfo.sourceBatch as Product, {
        batchNo: form.batchNo,
        expiryDate: form.expiryDate,
        quantity: form.quantity,
        distributorName: form.distributorName,
        distributorContact: form.distributorContact,
        destination,
      })
    }
  }

  // ── Duplicate warning overlay ─────────────────────────────────────────
  if (showDuplicateWarning && duplicateInfo) {
    const totalStore = duplicateInfo.batches?.reduce((s, b) => s + b.storeQty, 0) ?? 0
    const totalDisp = duplicateInfo.batches?.reduce((s, b) => s + b.dispensaryQty, 0) ?? 0
    const nearestBatch = duplicateInfo.batches?.[0]

    return (
      <Dialog
        open={open}
        onClose={() => setShowDuplicateWarning(false)}
        width="max-w-xl"
        eyebrow="Duplicate Product Detected"
        title="This product already exists"
        description="All 4 specifications match: Category, Dosage Form, Product Name, and Brand."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDuplicateWarning(false)}>
              Cancel
            </Button>
            <Button variant="ghost" onClick={handleForceCreate} loading={saving}>
              Create repetitive product
            </Button>
            {onSwitchToAddBatch && duplicateInfo.sourceBatch && (
              <Button onClick={handleSwitchToAddBatch}>
                Add batch instead
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          {/* Question / Prompt Banner */}
          <div className="flex gap-3 rounded-label border border-rx-amber/30 bg-rx-amber-soft px-4 py-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rx-amber-deep" aria-hidden />
            <div className="text-sm text-rx-amber-deep">
              <p className="font-semibold text-ink">
                Would you like to add a new batch instead of creating a repetitive product?
              </p>
              <p className="mt-1">
                A product with the exact same <strong>Category</strong>, <strong>Dosage Form</strong>,{" "}
                <strong>Product Name</strong>, and <strong>Brand</strong> already exists with{" "}
                <strong>{duplicateInfo.batchCount}</strong> registered batch
                {duplicateInfo.batchCount === 1 ? "" : "es"} (Total stock: <strong>{totalStore + totalDisp}</strong> units).
                {nearestBatch && (
                  <> Nearest expiry is <strong>{formatDate(nearestBatch.expiryDate)}</strong> (Batch: {nearestBatch.batchNo}).</>
                )}
              </p>
            </div>
          </div>

          {/* Identity summary */}
          <div className="rounded-label border border-mist bg-paper-sunken px-3.5 py-2.5 text-sm">
            <p className="font-semibold text-ink">{duplicateInfo.productName}</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Brand: <strong>{duplicateInfo.brand || "None"}</strong> · Category:{" "}
              <strong>{duplicateInfo.category || "Uncategorised"}</strong> · Dosage Form:{" "}
              <strong>{duplicateInfo.DosageForms || "Not specified"}</strong>
            </p>
          </div>

          {/* Existing batches list */}
          <div>
            <p className="eyebrow mb-2">Existing Batches ({duplicateInfo.batches?.length ?? 0})</p>
            <div className="max-h-48 overflow-y-auto rounded-label border border-mist">
              <table className="w-full text-sm">
                <thead className="bg-paper-raised sticky top-0 border-b border-mist text-left text-xs uppercase tracking-wider text-ink-muted">
                  <tr>
                    <th className="py-2 px-3">Batch No</th>
                    <th className="py-2 px-3">Expiry Date</th>
                    <th className="py-2 px-3 text-right">Store</th>
                    <th className="py-2 px-3 text-right">Dispensary</th>
                    <th className="py-2 px-3 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist/60 bg-paper">
                  {duplicateInfo.batches?.map((batch) => (
                    <tr key={batch._id} className="hover:bg-paper-raised">
                      <td className="py-2 px-3 font-mono text-xs font-medium text-ink">{batch.batchNo}</td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          {formatDate(batch.expiryDate)}
                          {batch.isExpired && <Badge tone="bad">Expired</Badge>}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right tabular text-xs">{batch.storeQty}</td>
                      <td className="py-2 px-3 text-right tabular text-xs">{batch.dispensaryQty}</td>
                      <td className="py-2 px-3 text-right tabular text-xs font-medium">{money(batch.sellingPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Dialog>
    )
  }

  // ── Main product form ─────────────────────────────────────────────────
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
          <Button variant="ghost" onClick={onClose} disabled={saving || checking}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving || checking}>
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
            hint={isEdit ? "Update batch number if needed" : "Left blank, one is generated."}
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
            label={
              isEdit && defaultDestination === "dispensary"
                ? "Dispensary shelf quantity"
                : isEdit && defaultDestination === "store"
                ? "Back store quantity"
                : isEdit
                ? "Total quantity"
                : "Quantity"
            }
            type="number"
            numeric
            min={0}
            value={form.quantity}
            onChange={update("quantity")}
            error={errors.quantity}
            hint={
              isEdit && product?.inventory
                ? `Current on-hand: Store: ${product.inventory.store ?? 0} · Dispensary: ${product.inventory.dispensary ?? 0}`
                : undefined
            }
            required
          />

          <div className="sm:col-span-2 rounded-label border border-mist bg-paper-sunken/40 p-3 sm:p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="eyebrow">Pricing &amp; Markup</p>
                <p className="text-xs text-ink-muted">
                  {priceCalcMode === "unitPrice"
                    ? "Auto Unit Cost: Enter Selling Price & Markup % → Unit Cost is calculated"
                    : priceCalcMode === "sellingPrice"
                    ? "Auto Selling Price: Enter Unit Cost & Markup % → Selling Price is calculated"
                    : "Auto Markup %: Enter Unit Cost & Selling Price → Markup % is calculated"}
                </p>
              </div>

              {/* Mode Toggle Buttons */}
              <div className="inline-flex rounded-lg border border-mist bg-paper p-0.5 text-xs font-medium self-start sm:self-auto gap-0.5">
                <button
                  type="button"
                  onClick={() => setCalcModeAndRecalc("unitPrice")}
                  className={`px-2.5 py-1 rounded transition-all ${
                    priceCalcMode === "unitPrice"
                      ? "bg-brand text-white shadow-xs font-semibold"
                      : "text-ink-muted hover:text-ink hover:bg-paper-sunken"
                  }`}
                  title="Unit Cost = Selling Price ÷ (1 + Markup% / 100)"
                >
                  Auto Unit Cost
                </button>
                <button
                  type="button"
                  onClick={() => setCalcModeAndRecalc("sellingPrice")}
                  className={`px-2.5 py-1 rounded transition-all ${
                    priceCalcMode === "sellingPrice"
                      ? "bg-brand text-white shadow-xs font-semibold"
                      : "text-ink-muted hover:text-ink hover:bg-paper-sunken"
                  }`}
                  title="Selling Price = Unit Cost × (1 + Markup% / 100)"
                >
                  Auto Selling Price
                </button>
                <button
                  type="button"
                  onClick={() => setCalcModeAndRecalc("markup")}
                  className={`px-2.5 py-1 rounded transition-all ${
                    priceCalcMode === "markup"
                      ? "bg-brand text-white shadow-xs font-semibold"
                      : "text-ink-muted hover:text-ink hover:bg-paper-sunken"
                  }`}
                  title="Markup % = ((Selling Price − Unit Cost) ÷ Unit Cost) × 100"
                >
                  Auto Markup %
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                label={priceCalcMode === "unitPrice" ? "Unit cost (Auto)" : "Unit cost"}
                type="number"
                numeric
                step="0.01"
                min={0}
                value={form.unitPrice}
                onChange={handleUnitPriceChange}
                error={errors.unitPrice}
                placeholder="0.00"
                required
                hint={priceCalcMode === "unitPrice" ? "Formula: Selling ÷ (1 + Markup%)" : undefined}
              />

              <Input
                label={priceCalcMode === "sellingPrice" ? "Selling price (Auto)" : "Selling price"}
                type="number"
                numeric
                step="0.01"
                min={0}
                value={form.sellingPrice}
                onChange={handleSellingPriceChange}
                error={errors.sellingPrice}
                placeholder="0.00"
                required
                hint={priceCalcMode === "sellingPrice" ? "Formula: Unit Cost × (1 + Markup%)" : undefined}
              />

              <Input
                label={priceCalcMode === "markup" ? "Markup % (Auto)" : "Markup %"}
                type="number"
                numeric
                step="any"
                min={0}
                value={form.markup}
                onChange={handleMarkupChange}
                error={errors.markup}
                placeholder="25"
                required
                hint={priceCalcMode === "markup" ? "Formula: ((Selling − Cost) ÷ Cost) × 100" : undefined}
              />
            </div>

            {pricingInsights && (
              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs px-2.5 py-1.5 rounded ${
                  pricingInsights.isLoss
                    ? "bg-rx-amber-soft text-rx-amber-deep font-medium"
                    : "bg-paper-raised text-ink-muted border border-mist"
                }`}
              >
                {pricingInsights.isLoss ? (
                  <span>
                    Warning: Selling price is below unit cost (Loss of {money(Math.abs(pricingInsights.profit))} per unit)
                  </span>
                ) : (
                  <>
                    <span>
                      Profit per unit: <strong className="text-ink">{money(pricingInsights.profit)}</strong>
                    </span>
                    <span>
                      Margin: <strong className="text-ink">{pricingInsights.marginPct}%</strong>
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

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
