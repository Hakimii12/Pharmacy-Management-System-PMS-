import { useEffect, useState } from "react"
import { ClipboardList, PackagePlus, Plus, Search, Trash2, Truck } from "lucide-react"

import {
  useCancelPurchaseOrderMutation,
  useCreatePurchaseOrderMutation,
  useCreateSupplierMutation,
  useDeleteSupplierMutation,
  useGetPurchaseOrderQuery,
  useGetPurchaseOrdersQuery,
  useGetReorderSuggestionsQuery,
  useGetSuppliersQuery,
  usePlacePurchaseOrderMutation,
  useReceivePurchaseOrderMutation,
  useUpdateSupplierMutation,
  type PurchaseLineInput,
  type ReceiveLineInput,
  type SupplierInput,
} from "@/api/purchaseApi"
import { useGetCategoriesQuery, useGetDosageFormsQuery } from "@/api/catalogApi"
import { errorMessage, useToast } from "@/hooks/useToast"
import { useDebounced } from "@/hooks/useDebounced"
import { formatDate, money, quantity } from "@/lib/format"
import { cn } from "@/lib/cn"
import { Badge, type BadgeTone } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input, Select, Textarea } from "@/components/ui/Input"
import { LabelCard } from "@/components/ui/LabelCard"
import { PageHeader } from "@/components/ui/PageHeader"
import { Pagination, Table, type Column } from "@/components/ui/Table"
import type {
  PurchaseOrder,
  PurchaseOrderStatus,
  ReorderSuggestion,
  Supplier,
} from "@/types"

type Tab = "orders" | "suggestions" | "suppliers"

const TABS: { value: Tab; label: string }[] = [
  { value: "orders", label: "Purchase orders" },
  { value: "suggestions", label: "Suggested reorders" },
  { value: "suppliers", label: "Suppliers" },
]

const STATUS_TONE: Record<PurchaseOrderStatus, BadgeTone> = {
  draft: "neutral",
  ordered: "info",
  partial: "warn",
  received: "good",
  cancelled: "bad",
}

const emptyLine = (): PurchaseLineInput => ({
  name: "",
  brand: "no_brand",
  category: "",
  DosageForms: "",
  quantityOrdered: 1,
  unitCost: 0,
  markup: 20,
})

function supplierLabel(value: Supplier | string | undefined): string {
  if (!value) return "—"
  return typeof value === "string" ? value : value.name
}

function emptySupplier(): SupplierInput {
  return { name: "", contact: "", email: "", address: "", notes: "" }
}

export default function PurchasingPage() {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>("orders")

  const [orderSearch, setOrderSearch] = useState("")
  const [orderStatus, setOrderStatus] = useState<PurchaseOrderStatus | "">("")
  const [orderPage, setOrderPage] = useState(1)
  const [orderLimit, setOrderLimit] = useState(25)

  const [supplierSearch, setSupplierSearch] = useState("")
  const [supplierPage, setSupplierPage] = useState(1)

  const [creatingPo, setCreatingPo] = useState(false)
  const [seedLines, setSeedLines] = useState<PurchaseLineInput[] | null>(null)
  const [viewOrderId, setViewOrderId] = useState<string | null>(null)
  const [supplierDialog, setSupplierDialog] = useState<Supplier | null | "new">(null)

  const debouncedOrderSearch = useDebounced(orderSearch)
  const debouncedSupplierSearch = useDebounced(supplierSearch)

  const orders = useGetPurchaseOrdersQuery({
    page: orderPage,
    limit: orderLimit,
    search: debouncedOrderSearch || undefined,
    status: orderStatus || undefined,
  })

  const suggestions = useGetReorderSuggestionsQuery(
    { page: 1, limit: 100 },
    { skip: tab !== "suggestions" },
  )

  const suppliers = useGetSuppliersQuery({
    page: supplierPage,
    limit: 25,
    search: debouncedSupplierSearch || undefined,
  })

  const [placeOrder] = usePlacePurchaseOrderMutation()
  const [cancelOrder] = useCancelPurchaseOrderMutation()
  const [deleteSupplier] = useDeleteSupplierMutation()

  const orderColumns: Column<PurchaseOrder>[] = [
    {
      key: "orderNumber",
      header: "PO #",
      render: (row) => (
        <button
          type="button"
          className="font-mono text-sm font-medium text-ink underline-offset-2 hover:underline"
          onClick={() => setViewOrderId(row._id)}
        >
          {row.orderNumber}
        </button>
      ),
    },
    {
      key: "supplier",
      header: "Supplier",
      render: (row) => supplierLabel(row.supplier),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>,
    },
    {
      key: "lines",
      header: "Lines",
      numeric: true,
      secondary: true,
      render: (row) => quantity(row.lines?.length ?? 0),
    },
    {
      key: "createdAt",
      header: "Created",
      secondary: true,
      render: (row) => (
        <span className="tabular font-mono text-ink-muted">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          {row.status === "draft" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                try {
                  const result = await placeOrder(row._id).unwrap()
                  toast("success", result.message)
                } catch (error) {
                  toast("error", "Could not place order", errorMessage(error))
                }
              }}
            >
              Place
            </Button>
          )}
          {["draft", "ordered"].includes(row.status) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  const result = await cancelOrder(row._id).unwrap()
                  toast("success", result.message)
                } catch (error) {
                  toast("error", "Could not cancel", errorMessage(error))
                }
              }}
            >
              Cancel
            </Button>
          )}
          {["ordered", "partial"].includes(row.status) && (
            <Button size="sm" onClick={() => setViewOrderId(row._id)}>
              Receive
            </Button>
          )}
        </div>
      ),
    },
  ]

  const suggestionColumns: Column<ReorderSuggestion>[] = [
    {
      key: "name",
      header: "Product",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.name}</p>
          <p className="truncate font-mono text-micro uppercase tracking-wider text-ink-muted">
            {row.brand || "—"} · {row.category || "—"} · {row.DosageForms || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "onHand",
      header: "On hand",
      numeric: true,
      render: (row) => quantity(row.onHand),
    },
    {
      key: "threshold",
      header: "Threshold",
      numeric: true,
      secondary: true,
      render: (row) => quantity(row.threshold),
    },
    {
      key: "suggestedQty",
      header: "Suggest",
      numeric: true,
      render: (row) => quantity(row.suggestedQty),
    },
    {
      key: "reason",
      header: "Why",
      render: (row) => (
        <Badge tone={row.reason === "out_of_stock" ? "bad" : "warn"}>
          {row.reason === "out_of_stock" ? "Out of stock" : "Low stock"}
        </Badge>
      ),
    },
    {
      key: "order",
      header: "",
      render: (row) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setSeedLines([
              {
                name: row.name,
                brand: row.brand || "no_brand",
                category: row.category || "",
                DosageForms: row.DosageForms || "",
                quantityOrdered: row.suggestedQty,
                unitCost: row.unitCost || 0,
                markup: row.markup || 20,
              },
            ])
            setCreatingPo(true)
          }}
        >
          Order
        </Button>
      ),
    },
  ]

  const supplierColumns: Column<Supplier>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => <span className="font-medium text-ink">{row.name}</span>,
    },
    {
      key: "contact",
      header: "Contact",
      secondary: true,
      render: (row) => row.contact || "—",
    },
    {
      key: "email",
      header: "Email",
      secondary: true,
      render: (row) => row.email || "—",
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="secondary" onClick={() => setSupplierDialog(row)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              try {
                const result = await deleteSupplier(row._id).unwrap()
                toast("success", result.message)
              } catch (error) {
                toast("error", "Could not delete supplier", errorMessage(error))
              }
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Purchasing"
        description="Order from suppliers, receive goods into the back store, and reorder from low-stock signals."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setSupplierDialog("new")}>
              <Truck className="h-4 w-4" aria-hidden />
              Add supplier
            </Button>
            <Button
              onClick={() => {
                setSeedLines(null)
                setCreatingPo(true)
              }}
            >
              <PackagePlus className="h-4 w-4" aria-hidden />
              New purchase order
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1 border-b border-mist pb-1">
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setTab(item.value)}
            className={cn(
              "rounded-label px-3 py-1.5 text-sm transition-colors",
              tab === item.value
                ? "bg-ink text-paper"
                : "text-ink-muted hover:bg-paper-sunken hover:text-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <Input
              wrapperClassName="min-w-[200px] flex-1"
              placeholder="Search PO number…"
              prefix={<Search className="h-4 w-4" aria-hidden />}
              value={orderSearch}
              onChange={(event) => {
                setOrderSearch(event.target.value)
                setOrderPage(1)
              }}
              aria-label="Search purchase orders"
            />
            <Select
              wrapperClassName="w-full sm:w-44"
              value={orderStatus}
              onChange={(event) => {
                setOrderStatus(event.target.value as PurchaseOrderStatus | "")
                setOrderPage(1)
              }}
              aria-label="Filter by status"
            >
              <option value="">Any status</option>
              <option value="draft">Draft</option>
              <option value="ordered">Ordered</option>
              <option value="partial">Partial</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>

          <LabelCard perforated eyebrow="Orders" title="Purchase orders" bodyClassName="px-0 py-0">
            <Table
              columns={orderColumns}
              rows={orders.data?.data ?? []}
              rowKey={(row) => row._id}
              loading={orders.isFetching}
              empty={{ title: "No purchase orders yet." }}
            />
            <Pagination
              page={orderPage}
              limit={orderLimit}
              total={orders.data?.total ?? 0}
              totalPages={orders.data?.totalPages ?? 0}
              onPageChange={setOrderPage}
              onLimitChange={(limit) => {
                setOrderLimit(limit)
                setOrderPage(1)
              }}
            />
          </LabelCard>
        </>
      )}

      {tab === "suggestions" && (
        <LabelCard
          perforated
          eyebrow="Reorder"
          title="Suggested from store low stock"
          bodyClassName="px-0 py-0"
        >
          <Table
            columns={suggestionColumns}
            rows={suggestions.data?.data ?? []}
            rowKey={(row) =>
              `${row.name}|${row.brand}|${row.category}|${row.DosageForms}|${row.productId}`
            }
            loading={suggestions.isFetching}
            empty={{ title: "Nothing below threshold right now." }}
          />
        </LabelCard>
      )}

      {tab === "suppliers" && (
        <>
          <div className="mb-4">
            <Input
              wrapperClassName="max-w-md"
              placeholder="Search suppliers…"
              prefix={<Search className="h-4 w-4" aria-hidden />}
              value={supplierSearch}
              onChange={(event) => {
                setSupplierSearch(event.target.value)
                setSupplierPage(1)
              }}
              aria-label="Search suppliers"
            />
          </div>
          <LabelCard perforated eyebrow="Directory" title="Suppliers" bodyClassName="px-0 py-0">
            <Table
              columns={supplierColumns}
              rows={suppliers.data?.data ?? []}
              rowKey={(row) => row._id}
              loading={suppliers.isFetching}
              empty={{ title: "Add a supplier to start purchasing." }}
            />
            <Pagination
              page={supplierPage}
              limit={25}
              total={suppliers.data?.total ?? 0}
              totalPages={suppliers.data?.totalPages ?? 0}
              onPageChange={setSupplierPage}
            />
          </LabelCard>
        </>
      )}

      <CreatePurchaseOrderDialog
        open={creatingPo}
        seedLines={seedLines}
        onClose={() => {
          setCreatingPo(false)
          setSeedLines(null)
        }}
      />

      <OrderDetailDialog orderId={viewOrderId} onClose={() => setViewOrderId(null)} />

      <SupplierDialog
        target={supplierDialog}
        onClose={() => setSupplierDialog(null)}
      />
    </>
  )
}

function CreatePurchaseOrderDialog({
  open,
  seedLines,
  onClose,
}: {
  open: boolean
  seedLines: PurchaseLineInput[] | null
  onClose: () => void
}) {
  const toast = useToast()
  const { data: supplierData } = useGetSuppliersQuery({ page: 1, limit: 100 })
  const { data: categories } = useGetCategoriesQuery({ page: 1, limit: 100 })
  const { data: dosageForms } = useGetDosageFormsQuery({ page: 1, limit: 100 })
  const [createOrder, { isLoading }] = useCreatePurchaseOrderMutation()

  const [supplier, setSupplier] = useState("")
  const [notes, setNotes] = useState("")
  const [expectedDate, setExpectedDate] = useState("")
  const [lines, setLines] = useState<PurchaseLineInput[]>([emptyLine()])

  useEffect(() => {
    if (!open) return
    setSupplier("")
    setNotes("")
    setExpectedDate("")
    setLines(seedLines?.length ? seedLines.map((line) => ({ ...line })) : [emptyLine()])
  }, [open, seedLines])

  const updateLine = (index: number, patch: Partial<PurchaseLineInput>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  const submit = async (place: boolean) => {
    try {
      const result = await createOrder({
        supplier,
        notes: notes || undefined,
        expectedDate: expectedDate || undefined,
        place,
        lines: lines.map((line) => ({
          ...line,
          quantityOrdered: Number(line.quantityOrdered),
          unitCost: Number(line.unitCost),
          markup: Number(line.markup ?? 20),
        })),
      }).unwrap()
      toast("success", result.message)
      onClose()
    } catch (error) {
      toast("error", "Could not save purchase order", errorMessage(error))
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      eyebrow="Purchasing"
      title="New purchase order"
      description="Lines become store batches when you receive the goods."
      width="max-w-3xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" disabled={isLoading} onClick={() => submit(false)}>
            Save draft
          </Button>
          <Button disabled={isLoading} onClick={() => submit(true)}>
            Place order
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Supplier"
          required
          value={supplier}
          onChange={(event) => setSupplier(event.target.value)}
        >
          <option value="">Select supplier…</option>
          {(supplierData?.data ?? []).map((row) => (
            <option key={row._id} value={row._id}>
              {row.name}
            </option>
          ))}
        </Select>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Expected date"
            type="date"
            value={expectedDate}
            onChange={(event) => setExpectedDate(event.target.value)}
          />
          <Textarea
            label="Notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Line items</p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add line
            </Button>
          </div>

          {lines.map((line, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-label border border-mist bg-paper-sunken/40 p-3 sm:grid-cols-6"
            >
              <Input
                wrapperClassName="sm:col-span-2"
                label="Product"
                required
                value={line.name}
                onChange={(event) => updateLine(index, { name: event.target.value })}
              />
              <Input
                label="Brand"
                value={line.brand || ""}
                onChange={(event) => updateLine(index, { brand: event.target.value })}
              />
              <Select
                label="Category"
                value={line.category || ""}
                onChange={(event) => updateLine(index, { category: event.target.value })}
              >
                <option value="">—</option>
                {(categories?.data ?? []).map((row) => (
                  <option key={row._id} value={row.name}>
                    {row.name}
                  </option>
                ))}
              </Select>
              <Select
                label="Dosage"
                value={line.DosageForms || ""}
                onChange={(event) => updateLine(index, { DosageForms: event.target.value })}
              >
                <option value="">—</option>
                {(dosageForms?.data ?? []).map((row) => (
                  <option key={row._id} value={row.name}>
                    {row.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Qty"
                type="number"
                min={1}
                numeric
                value={line.quantityOrdered}
                onChange={(event) =>
                  updateLine(index, { quantityOrdered: Number(event.target.value) })
                }
              />
              <Input
                label="Unit cost"
                type="number"
                min={0}
                step="0.01"
                numeric
                value={line.unitCost}
                onChange={(event) => updateLine(index, { unitCost: Number(event.target.value) })}
              />
              <Input
                label="Markup %"
                type="number"
                min={0}
                numeric
                value={line.markup ?? 20}
                onChange={(event) => updateLine(index, { markup: Number(event.target.value) })}
              />
              <div className="flex items-end sm:col-span-4">
                {lines.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  )
}

function OrderDetailDialog({
  orderId,
  onClose,
}: {
  orderId: string | null
  onClose: () => void
}) {
  const toast = useToast()
  const { data, isFetching } = useGetPurchaseOrderQuery(orderId ?? "", { skip: !orderId })
  const [receive, { isLoading }] = useReceivePurchaseOrderMutation()
  const order = data?.order

  const [receiveRows, setReceiveRows] = useState<
    Record<string, { receiveQty: number; batchNo: string; expiryDate: string }>
  >({})

  useEffect(() => {
    if (!order) return
    const next: Record<string, { receiveQty: number; batchNo: string; expiryDate: string }> = {}
    for (const line of order.lines) {
      const remaining = line.quantityOrdered - (line.quantityReceived || 0)
      next[line._id] = {
        receiveQty: remaining > 0 ? remaining : 0,
        batchNo: line.batchNo || "",
        expiryDate: line.expiryDate ? String(line.expiryDate).slice(0, 10) : "",
      }
    }
    setReceiveRows(next)
  }, [order])

  const canReceive = order && ["ordered", "partial"].includes(order.status)

  const submitReceive = async () => {
    if (!order) return
    const lines: ReceiveLineInput[] = order.lines
      .map((line) => {
        const row = receiveRows[line._id]
        if (!row || row.receiveQty <= 0) return null
        return {
          lineId: line._id,
          receiveQty: Number(row.receiveQty),
          batchNo: row.batchNo || undefined,
          expiryDate: row.expiryDate,
        }
      })
      .filter(Boolean) as ReceiveLineInput[]

    if (!lines.length) {
      toast("error", "Enter a receive quantity for at least one line")
      return
    }

    try {
      const result = await receive({ id: order._id, lines }).unwrap()
      toast("success", result.message)
      onClose()
    } catch (error) {
      toast("error", "Receive failed", errorMessage(error))
    }
  }

  return (
    <Dialog
      open={Boolean(orderId)}
      onClose={onClose}
      eyebrow="Purchase order"
      title={order?.orderNumber ?? "Loading…"}
      description={
        order
          ? `${supplierLabel(order.supplier)} · ${order.status}`
          : isFetching
            ? "Loading order…"
            : undefined
      }
      width="max-w-3xl"
      footer={
        canReceive ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button disabled={isLoading} onClick={submitReceive}>
              <ClipboardList className="h-4 w-4" aria-hidden />
              Receive into store
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      {order && (
        <div className="space-y-4">
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <p>
              <span className="eyebrow block">Status</span>
              <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
            </p>
            <p>
              <span className="eyebrow block">Ordered</span>
              {formatDate(order.orderedAt || order.createdAt)}
            </p>
            <p>
              <span className="eyebrow block">Expected</span>
              {formatDate(order.expectedDate)}
            </p>
          </div>

          <div className="space-y-3">
            {order.lines.map((line) => {
              const remaining = line.quantityOrdered - (line.quantityReceived || 0)
              const row = receiveRows[line._id]
              return (
                <div
                  key={line._id}
                  className="rounded-label border border-mist bg-paper-sunken/30 p-3"
                >
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-ink">{line.name}</p>
                      <p className="font-mono text-micro uppercase tracking-wider text-ink-muted">
                        {line.brand || "—"} · ordered {quantity(line.quantityOrdered)} · received{" "}
                        {quantity(line.quantityReceived)} · {money(line.unitCost)} unit
                      </p>
                    </div>
                    {remaining <= 0 && <Badge tone="good">Complete</Badge>}
                  </div>

                  {canReceive && remaining > 0 && row && (
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Input
                        label="Receive qty"
                        type="number"
                        min={0}
                        max={remaining}
                        numeric
                        value={row.receiveQty}
                        onChange={(event) =>
                          setReceiveRows((prev) => ({
                            ...prev,
                            [line._id]: {
                              ...prev[line._id],
                              receiveQty: Number(event.target.value),
                            },
                          }))
                        }
                      />
                      <Input
                        label="Batch no"
                        value={row.batchNo}
                        onChange={(event) =>
                          setReceiveRows((prev) => ({
                            ...prev,
                            [line._id]: { ...prev[line._id], batchNo: event.target.value },
                          }))
                        }
                        hint="Auto-generated if blank"
                      />
                      <Input
                        label="Expiry"
                        type="date"
                        required
                        value={row.expiryDate}
                        onChange={(event) =>
                          setReceiveRows((prev) => ({
                            ...prev,
                            [line._id]: { ...prev[line._id], expiryDate: event.target.value },
                          }))
                        }
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Dialog>
  )
}

function SupplierDialog({
  target,
  onClose,
}: {
  target: Supplier | null | "new"
  onClose: () => void
}) {
  const toast = useToast()
  const [createSupplier, { isLoading: creating }] = useCreateSupplierMutation()
  const [updateSupplier, { isLoading: updating }] = useUpdateSupplierMutation()
  const isNew = target === "new"
  const open = target !== null

  const [form, setForm] = useState<SupplierInput>(emptySupplier())

  useEffect(() => {
    if (!open) return
    if (isNew || !target) {
      setForm(emptySupplier())
    } else {
      setForm({
        name: target.name,
        contact: target.contact || "",
        email: target.email || "",
        address: target.address || "",
        notes: target.notes || "",
      })
    }
  }, [open, isNew, target])

  const save = async () => {
    try {
      if (isNew) {
        const result = await createSupplier(form).unwrap()
        toast("success", result.message)
      } else if (target) {
        const result = await updateSupplier({ id: target._id, body: form }).unwrap()
        toast("success", result.message)
      }
      onClose()
    } catch (error) {
      toast("error", "Could not save supplier", errorMessage(error))
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      eyebrow="Suppliers"
      title={isNew ? "Add supplier" : "Edit supplier"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={creating || updating} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input
          label="Name"
          required
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
        />
        <Input
          label="Contact"
          value={form.contact || ""}
          onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))}
        />
        <Input
          label="Email"
          type="email"
          value={form.email || ""}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
        />
        <Input
          label="Address"
          value={form.address || ""}
          onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
        />
        <Textarea
          label="Notes"
          rows={2}
          value={form.notes || ""}
          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
        />
      </div>
    </Dialog>
  )
}
