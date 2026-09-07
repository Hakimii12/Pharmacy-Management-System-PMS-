import { useMemo, useState } from "react"
import {
  AlertTriangle,
  CloudOff,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react"

import { useGetGroupedSellableProductsQuery } from "@/api/productApi"
import { useCreateCreditSaleMutation, usePrepareSaleMutation } from "@/api/salesApi"
import { useGetCategoriesQuery } from "@/api/catalogApi"
import { useAppDispatch, useAppSelector } from "@/app/hooks"
import {
  addToCart,
  cartCount,
  cartTotal,
  clearCart,
  removeLine,
  setAmountPaid,
  setCustomerAddress,
  setCustomerPhone,
  setDueDate,
  setLastCompleted,
  setLineQuantity,
  setPatientName,
  setSaleType,
} from "@/features/sales/salesSlice"
import { useDebounced } from "@/hooks/useDebounced"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import { errorMessage, useToast } from "@/hooks/useToast"
import { daysUntil, formatDate, money, quantity as formatQuantity } from "@/lib/format"
import { cn } from "@/lib/cn"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input, Select } from "@/components/ui/Input"
import { LabelCard } from "@/components/ui/LabelCard"
import { Pagination } from "@/components/ui/Table"
import { ReceiptDialog } from "@/components/pos/ReceiptDialog"
import type { Product, ProductGroup } from "@/types"

/** Batches inside this window get an amber warning in the picker. */
const NEAR_EXPIRY_DAYS = 90

export default function PosPage() {
  const dispatch = useAppDispatch()
  const toast = useToast()
  const online = useOnlineStatus()

  const cart = useAppSelector((state) => state.sales.cart)
  const patientName = useAppSelector((state) => state.sales.patientName)
  const saleType = useAppSelector((state) => state.sales.saleType)
  const amountPaid = useAppSelector((state) => state.sales.amountPaid)
  const customerPhone = useAppSelector((state) => state.sales.customerPhone)
  const customerAddress = useAppSelector((state) => state.sales.customerAddress)
  const dueDate = useAppSelector((state) => state.sales.dueDate)

  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [page, setPage] = useState(1)
  const [picking, setPicking] = useState<ProductGroup | null>(null)
  const [receipt, setReceipt] = useState<{ transactionId: string; queued: boolean } | null>(null)

  const debouncedSearch = useDebounced(search)

  const { data: categories } = useGetCategoriesQuery({ limit: 200 })
  const { data, isFetching } = useGetGroupedSellableProductsQuery({
    page,
    limit: 24,
    search: debouncedSearch || undefined,
    category: category || undefined,
  })

  const [prepareSale, { isLoading: preparing }] = usePrepareSaleMutation()
  const [createCreditSale, { isLoading: creatingCredit }] = useCreateCreditSaleMutation()

  const total = useMemo(() => cartTotal(cart), [cart])
  const count = useMemo(() => cartCount(cart), [cart])
  const submitting = preparing || creatingCredit

  const balance = saleType === "credit" ? Math.max(0, total - (amountPaid || 0)) : 0

  const cartQtyByProduct = useMemo(() => {
    const map = new Map<string, number>()
    for (const line of cart) {
      map.set(line.productId, (map.get(line.productId) ?? 0) + line.quantity)
    }
    return map
  }, [cart])

  const groupCartQty = (group: ProductGroup) =>
    group.batches.reduce((sum, batch) => sum + (cartQtyByProduct.get(batch._id) ?? 0), 0)

  const handleOpenGroup = (group: ProductGroup) => {
    const sellable = group.batches.filter((batch) => {
      const days = daysUntil(batch.expiryDate)
      const expired = days !== null && days <= 0
      return batch.inventory.dispensary >= 1 && !expired
    })

    if (sellable.length === 1) {
      dispatch(addToCart(sellable[0]!))
      return
    }

    setPicking(group)
  }

  const handlePickBatch = (batch: Product) => {
    dispatch(addToCart(batch))
    setPicking(null)
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return

    const items = cart.map((line) => ({ productId: line.productId, quantity: line.quantity }))

    try {
      if (saleType === "credit") {
        if (!customerPhone.trim()) {
          toast("error", "Customer phone is required for a credit sale")
          return
        }

        const result = await createCreditSale({
          items,
          lines: cart,
          patientName: patientName.trim() || undefined,
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim() || undefined,
          dueDate,
          amountPaid: amountPaid || 0,
        }).unwrap()

        setReceipt({ transactionId: result.transactionId, queued: Boolean(result.queued) })
        dispatch(setLastCompleted(result.transactionId))
      } else {
        const result = await prepareSale({
          items,
          lines: cart,
          patientName: patientName.trim() || undefined,
        }).unwrap()

        setReceipt({ transactionId: result.transactionId, queued: Boolean(result.queued) })
        dispatch(setLastCompleted(result.transactionId))
      }

      dispatch(clearCart())
    } catch (error) {
      toast("error", "Sale failed", errorMessage(error))
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-4">
        <div>
          <p className="eyebrow">Point of sale</p>
          <h1 className="font-display text-2xl font-semibold text-ink">Dispensary shelf</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Products are grouped. Open one to pick the batch to sell.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Input
            wrapperClassName="min-w-[240px] flex-1"
            placeholder="Search by name, brand or batch…"
            prefix={<Search className="h-4 w-4" aria-hidden />}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            aria-label="Search products"
          />

          <Select
            wrapperClassName="w-full sm:w-56"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value)
              setPage(1)
            }}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories?.data.map((entry) => (
              <option key={entry._id} value={entry.name}>
                {entry.name}
              </option>
            ))}
          </Select>
        </div>

        {!online && (
          <div className="flex items-center gap-2 rounded-label border border-rx-amber/30 bg-rx-amber-soft px-3 py-2 text-sm text-rx-amber-deep">
            <CloudOff className="h-4 w-4 shrink-0" aria-hidden />
            Showing the last synced shelf. Sales made now are queued and sent when you reconnect.
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {isFetching && !data
            ? Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse-soft rounded-label border border-mist bg-paper-sunken"
                />
              ))
            : data?.data.map((group) => (
                <ProductGroupTile
                  key={group.id}
                  group={group}
                  inCart={groupCartQty(group)}
                  onOpen={() => handleOpenGroup(group)}
                />
              ))}
        </div>

        {data && data.data.length === 0 && (
          <LabelCard>
            <p className="py-10 text-center text-sm text-ink-muted">
              No dispensary stock matches that search.
            </p>
          </LabelCard>
        )}

        {data && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            limit={data.limit}
            onPageChange={setPage}
          />
        )}
      </div>

      <div className="xl:sticky xl:top-20 xl:self-start">
        <LabelCard
          perforated
          eyebrow="Current basket"
          title={
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" aria-hidden />
              {count} {count === 1 ? "unit" : "units"}
            </span>
          }
          action={
            cart.length > 0 && (
              <Button variant="quiet" size="sm" onClick={() => dispatch(clearCart())}>
                Clear
              </Button>
            )
          }
          bodyClassName="space-y-4"
        >
          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">
              Tap a product, then choose a batch to start a sale.
            </p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {cart.map((line) => (
                <li key={line.productId} className="rounded-label border border-mist bg-paper px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{line.name}</p>
                      <p className="font-mono text-micro uppercase tracking-wider text-ink-muted">
                        {line.brand || "—"} · {line.batchNo}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => dispatch(removeLine(line.productId))}
                      className="rounded p-1 text-ink-muted hover:text-alert"
                      aria-label={`Remove ${line.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center rounded-label border border-mist-deep">
                      <button
                        type="button"
                        onClick={() =>
                          dispatch(setLineQuantity({ productId: line.productId, quantity: line.quantity - 1 }))
                        }
                        disabled={line.quantity <= 1}
                        className="px-2 py-1.5 text-ink-muted hover:text-ink disabled:opacity-40"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden />
                      </button>

                      <input
                        type="number"
                        value={line.quantity}
                        min={1}
                        max={line.available}
                        onChange={(event) =>
                          dispatch(
                            setLineQuantity({
                              productId: line.productId,
                              quantity: Number(event.target.value) || 1,
                            }),
                          )
                        }
                        className="tabular w-12 border-x border-mist-deep bg-transparent py-1.5 text-center font-mono text-sm outline-none"
                        aria-label={`Quantity for ${line.name}`}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          dispatch(setLineQuantity({ productId: line.productId, quantity: line.quantity + 1 }))
                        }
                        disabled={line.quantity >= line.available}
                        className="px-2 py-1.5 text-ink-muted hover:text-ink disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>

                    <p className="tabular font-mono text-sm font-medium">
                      {money(line.sellingPrice * line.quantity)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-3 border-t border-dashed border-mist-deep pt-4">
            <Input
              label="Patient / customer"
              placeholder="Walk-in"
              value={patientName}
              onChange={(event) => dispatch(setPatientName(event.target.value))}
            />

            <div>
              <p className="eyebrow mb-1.5">Payment</p>
              <div className="grid grid-cols-2 gap-2">
                {(["cash", "credit"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => dispatch(setSaleType(type))}
                    className={cn(
                      "rounded-label border px-3 py-2.5 text-sm font-medium capitalize transition-colors",
                      saleType === type
                        ? "border-ink bg-ink text-paper"
                        : "border-mist-deep bg-paper-raised text-ink-muted hover:border-ink-muted",
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {saleType === "credit" && (
              <div className="space-y-3 rounded-label border border-rx-amber/30 bg-rx-amber-soft/50 p-3">
                <Input
                  label="Customer phone"
                  value={customerPhone}
                  onChange={(event) => dispatch(setCustomerPhone(event.target.value))}
                  placeholder="09…"
                  required
                />
                <Input
                  label="Address"
                  value={customerAddress}
                  onChange={(event) => dispatch(setCustomerAddress(event.target.value))}
                />
                <Input
                  label="Due date"
                  type="date"
                  value={dueDate}
                  onChange={(event) => dispatch(setDueDate(event.target.value))}
                />
                <Input
                  label="Paid up front"
                  type="number"
                  numeric
                  min={0}
                  max={total}
                  value={amountPaid ?? ""}
                  onChange={(event) =>
                    dispatch(setAmountPaid(event.target.value === "" ? null : Number(event.target.value)))
                  }
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5 border-t border-dashed border-mist-deep pt-4">
            <div className="flex items-baseline justify-between">
              <span className="eyebrow">Total</span>
              <span className="tabular font-mono text-xl font-semibold text-ink">{money(total)}</span>
            </div>

            {saleType === "credit" && (
              <div className="flex items-baseline justify-between">
                <span className="eyebrow">Balance owing</span>
                <span className="tabular font-mono text-sm font-medium text-rx-amber-deep">
                  {money(balance)}
                </span>
              </div>
            )}
          </div>

          <Button
            size="lg"
            fullWidth
            loading={submitting}
            disabled={cart.length === 0}
            onClick={handleCheckout}
            variant={saleType === "credit" ? "secondary" : "primary"}
          >
            {saleType === "credit" ? "Record credit sale" : "Send to cashier"}
          </Button>

          {saleType === "cash" && cart.length > 0 && (
            <p className="text-center text-xs text-ink-muted">
              A cashier confirms payment before stock leaves the shelf.
            </p>
          )}
        </LabelCard>
      </div>

      <SellBatchPicker
        group={picking}
        cartQtyByProduct={cartQtyByProduct}
        onClose={() => setPicking(null)}
        onPick={handlePickBatch}
      />

      {receipt && (
        <ReceiptDialog
          transactionId={receipt.transactionId}
          queued={receipt.queued}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  )
}

function ProductGroupTile({
  group,
  inCart,
  onOpen,
}: {
  group: ProductGroup
  inCart: number
  onOpen: () => void
}) {
  const available = group.inventory.dispensary
  const remaining = Math.max(0, available - inCart)
  const days = daysUntil(group.nearestExpiry)
  const nearExpiry = days !== null && days > 0 && days <= NEAR_EXPIRY_DAYS
  const expired = days !== null && days <= 0

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={remaining < 1 || expired}
      className={cn(
        "group relative flex flex-col justify-between rounded-label border bg-paper-raised p-3 text-left transition-all",
        "hover:border-ink hover:shadow-card disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-mist",
        inCart > 0 ? "border-ink shadow-card" : "border-mist",
      )}
    >
      {inCart > 0 && (
        <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 font-mono text-[10px] font-semibold text-paper">
          {inCart}
        </span>
      )}

      <div className="min-w-0 pr-6">
        <p className="truncate text-sm font-medium text-ink">{group.name}</p>
        <p className="truncate font-mono text-micro uppercase tracking-wider text-ink-muted">
          {[group.brand, group.DosageForms].filter(Boolean).join(" · ") || "—"}
          {" · "}
          {group.batchCount} batch{group.batchCount === 1 ? "" : "es"}
        </p>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <p className="tabular font-mono text-base font-semibold text-ink">
            {money(group.sellingPrice)}
          </p>
          <p className="tabular font-mono text-micro uppercase tracking-wider text-ink-muted">
            {formatQuantity(remaining)} left
          </p>
        </div>

        {expired ? (
          <Badge tone="bad">
            <X className="h-3 w-3" aria-hidden />
            Expired
          </Badge>
        ) : nearExpiry ? (
          <Badge tone="warn">
            <AlertTriangle className="h-3 w-3" aria-hidden />
            {days}d
          </Badge>
        ) : null}
      </div>
    </button>
  )
}

function SellBatchPicker({
  group,
  cartQtyByProduct,
  onClose,
  onPick,
}: {
  group: ProductGroup | null
  cartQtyByProduct: Map<string, number>
  onClose: () => void
  onPick: (batch: Product) => void
}) {
  if (!group) return null

  const batches = group.batches.filter((batch) => batch.inventory.dispensary >= 1)
  const identity = [group.brand, group.category, group.DosageForms].filter(Boolean).join(" · ")

  return (
    <Dialog
      open={Boolean(group)}
      onClose={onClose}
      width="max-w-lg"
      eyebrow="Choose batch"
      title={group.name}
      description={
        identity
          ? `${identity} · pick the lot to sell (earliest expiry first)`
          : "Pick the lot to sell (earliest expiry first)"
      }
      footer={
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      <ul className="space-y-2">
        {batches.map((batch) => {
          const inCart = cartQtyByProduct.get(batch._id) ?? 0
          const remaining = batch.inventory.dispensary - inCart
          const days = daysUntil(batch.expiryDate)
          const nearExpiry = days !== null && days > 0 && days <= NEAR_EXPIRY_DAYS
          const expired = days !== null && days <= 0

          return (
            <li key={batch._id}>
              <button
                type="button"
                onClick={() => onPick(batch)}
                disabled={remaining < 1 || expired}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-label border px-3 py-3 text-left transition-colors",
                  "hover:border-ink hover:bg-paper-sunken disabled:cursor-not-allowed disabled:opacity-50",
                  inCart > 0 ? "border-ink bg-paper-sunken" : "border-mist bg-paper-raised",
                )}
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium text-ink">{batch.batchNo}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Exp {formatDate(batch.expiryDate)}
                    {nearExpiry && !expired ? ` · ${days}d left` : null}
                    {expired ? " · expired" : null}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular font-mono text-sm font-semibold">{money(batch.sellingPrice)}</p>
                  <p className="tabular font-mono text-micro uppercase tracking-wider text-ink-muted">
                    {formatQuantity(remaining)} left
                    {inCart > 0 ? ` · ${inCart} in cart` : ""}
                  </p>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </Dialog>
  )
}
