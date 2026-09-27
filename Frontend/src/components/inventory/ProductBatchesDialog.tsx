import { ArrowLeft, ArrowRight, Layers, Pencil, Trash2 } from "lucide-react"

import { daysUntil, formatDate, money, quantity as formatQuantity } from "@/lib/format"
import { Badge, StockBadge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Table, type Column } from "@/components/ui/Table"
import type { Product, ProductGroup, StockStatus } from "@/types"

/**
 * Detail panel for one product identity — lists every batch so operators can
 * act on a specific lot without cluttering the main catalogue.
 */
export function ProductBatchesDialog({
  open,
  group,
  location = "both",
  canManage,
  onClose,
  onAddBatch,
  onEdit,
  onDelete,
  onTransfer,
}: {
  open: boolean
  group: ProductGroup | null
  location?: "both" | "store" | "dispensary"
  canManage: boolean
  onClose: () => void
  onAddBatch?: (source: Product) => void
  onEdit?: (batch: Product) => void
  onDelete?: (batch: Product) => void
  onTransfer?: (batch: Product, direction: "issue" | "return") => void
}) {
  if (!group) return null

  const identity = [group.brand, group.category, group.DosageForms].filter(Boolean).join(" · ")
  const source = group.batches[0]
  const onHand =
    location === "store"
      ? group.inventory.store
      : location === "dispensary"
        ? group.inventory.dispensary
        : group.totalQuantity

  const columns: Column<Product>[] = [
    {
      key: "batch",
      header: "Batch",
      render: (row) => <span className="font-mono text-sm">{row.batchNo}</span>,
    },
    {
      key: "expiry",
      header: "Expires",
      render: (row) => <ExpiryCell value={row.expiryDate} />,
    },
  ]

  if (location === "both") {
    columns.push(
      {
        key: "store",
        header: "Store",
        numeric: true,
        render: (row) => formatQuantity(row.inventory?.store ?? (row as any).stQty ?? 0),
      },
      {
        key: "dispensary",
        header: "Dispensary",
        numeric: true,
        render: (row) => formatQuantity(row.inventory?.dispensary ?? (row as any).dispQty ?? 0),
      },
    )
  } else {
    columns.push({
      key: "onHand",
      header: "On hand",
      numeric: true,
      render: (row) =>
        formatQuantity(
          location === "store"
            ? (row.inventory?.store ?? (row as any).stQty ?? row.quantity ?? 0)
            : (row.inventory?.dispensary ?? (row as any).dispQty ?? row.quantity ?? 0),
        ),
    })
  }

  columns.push(
    {
      key: "price",
      header: "Selling",
      numeric: true,
      secondary: true,
      render: (row) => money(row.sellingPrice),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StockBadge
          status={
            location === "store"
              ? (row.inventory?.storeStatus ?? "In Stock")
              : location === "dispensary"
                ? (row.inventory?.dispensaryStatus ?? "In Stock")
                : worstOf(row.inventory?.storeStatus ?? "In Stock", row.inventory?.dispensaryStatus ?? "In Stock")
          }
        />
      ),
    },
  )

  if (canManage && (onTransfer || onEdit || onDelete)) {
    columns.push({
      key: "actions",
      header: "",
      width: location === "both" ? "180px" : "120px",
      render: (row) => (
        <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
          {onTransfer && (location === "store" || location === "both") && (
            <Button
              size="sm"
              variant="ghost"
              disabled={(row.inventory?.store ?? (row as any).stQty ?? row.quantity ?? 0) < 1}
              onClick={() => onTransfer(row, "issue")}
            >
              Issue
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          )}
          {onTransfer && (location === "dispensary" || location === "both") && (
            <Button
              size="sm"
              variant="ghost"
              disabled={(row.inventory?.dispensary ?? (row as any).dispQty ?? row.quantity ?? 0) < 1}
              onClick={() => onTransfer(row, "return")}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Return
            </Button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(row)}
              className="rounded-label p-1.5 text-ink-muted hover:bg-paper-sunken hover:text-ink"
              aria-label={`Edit batch ${row.batchNo}`}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(row)}
              className="rounded-label p-1.5 text-ink-muted hover:bg-alert-soft hover:text-alert"
              aria-label={`Delete batch ${row.batchNo}`}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>
      ),
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      width="max-w-3xl"
      eyebrow="Product batches"
      title={group.name}
      description={
        identity
          ? `${identity} · ${group.batchCount} batch${group.batchCount === 1 ? "" : "es"} · ${formatQuantity(onHand)} on hand`
          : `${group.batchCount} batch${group.batchCount === 1 ? "" : "es"} · ${formatQuantity(onHand)} on hand`
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {canManage && onAddBatch && source && (
            <Button onClick={() => onAddBatch(source)}>
              <Layers className="h-4 w-4" aria-hidden />
              Add batch
            </Button>
          )}
        </>
      }
    >
      <div className="-mx-1 overflow-hidden rounded-label border border-mist">
        <Table
          columns={columns}
          rows={group.batches}
          rowKey={(row) => row._id}
          empty={{ title: "No batches", description: "Add a batch to stock this product." }}
        />
      </div>
    </Dialog>
  )
}

function worstOf(a: StockStatus, b: StockStatus) {
  const order: StockStatus[] = ["Expired", "Sold Out", "Low Stock", "In Stock"]
  const ai = order.indexOf(a)
  const bi = order.indexOf(b)
  return order[Math.min(ai === -1 ? 3 : ai, bi === -1 ? 3 : bi)]!
}

function ExpiryCell({ value }: { value: string }) {
  const days = daysUntil(value)
  if (days === null) return <span className="text-ink-muted">—</span>

  if (days <= 0) {
    return (
      <div className="flex flex-col items-start gap-1">
        <span className="text-ink-muted">{formatDate(value)}</span>
        <Badge tone="bad">Expired</Badge>
      </div>
    )
  }

  if (days <= 90) {
    return (
      <div className="flex flex-col items-start gap-1">
        <span className="text-ink-muted">{formatDate(value)}</span>
        <Badge tone="warn">{days}d left</Badge>
      </div>
    )
  }

  return <span className="text-ink-muted">{formatDate(value)}</span>
}
