import { useState } from "react"

import { useGetIssuedToDispensaryQuery, useGetReturnedToStoreQuery } from "@/api/productApi"
import { formatDateTime, money, quantity } from "@/lib/format"
import { cn } from "@/lib/cn"
import { LabelCard } from "@/components/ui/LabelCard"
import { PageHeader } from "@/components/ui/PageHeader"
import { Pagination, Table, type Column } from "@/components/ui/Table"
import type { TransferRecord } from "@/types"

type Direction = "issued" | "returned"

const TABS: { value: Direction; label: string }[] = [
  { value: "issued", label: "Issued to dispensary" },
  { value: "returned", label: "Returned to store" },
]

export default function TransfersPage() {
  const [direction, setDirection] = useState<Direction>("issued")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)

  // Both hooks stay mounted so switching tabs is instant off the RTK Query cache.
  const issued = useGetIssuedToDispensaryQuery(
    { page, limit },
    { skip: direction !== "issued" },
  )
  const returned = useGetReturnedToStoreQuery(
    { page, limit },
    { skip: direction !== "returned" },
  )

  const active = direction === "issued" ? issued : returned

  const columns: Column<TransferRecord>[] = [
    {
      key: "date",
      header: "When",
      render: (row) => (
        <span className="tabular font-mono text-ink-muted">{formatDateTime(row.date)}</span>
      ),
    },
    {
      key: "product",
      header: "Batch",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.product?.name ?? "Deleted batch"}</p>
          <p className="truncate font-mono text-micro uppercase tracking-wider text-ink-muted">
            {row.product?.brand || "—"} · {row.product?.batchNo || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "user",
      header: "By",
      secondary: true,
      render: (row) => <span className="text-ink-muted">{row.user?.name ?? "—"}</span>,
    },
    {
      key: "quantity",
      header: "Units",
      numeric: true,
      render: (row) => quantity(row.quantity),
    },
    {
      key: "left",
      header: "Left behind",
      numeric: true,
      secondary: true,
      render: (row) => (
        <span className="text-ink-muted">{quantity(row.quantityLeft ?? 0)}</span>
      ),
    },
    {
      key: "value",
      header: "Value moved",
      numeric: true,
      render: (row) => money(row.totalUnitPrice ?? 0),
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Transfer history"
        description="Every movement of stock between the back store and the dispensary shelf."
      />

      <div className="mb-4 inline-flex rounded-label border border-mist-deep bg-paper-raised p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setDirection(tab.value)
              setPage(1)
            }}
            className={cn(
              "rounded-label px-3.5 py-1.5 text-sm font-medium transition-colors",
              direction === tab.value ? "bg-ink text-paper" : "text-ink-muted hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <LabelCard
        perforated
        eyebrow="Ledger"
        title={direction === "issued" ? "Issued to dispensary" : "Returned to store"}
        bodyClassName="px-0 py-0"
      >
        <Table
          columns={columns}
          rows={active.data?.data ?? []}
          rowKey={(row) => row._id}
          loading={active.isFetching}
          empty={{ title: "No transfers recorded yet" }}
        />

        {active.data && (
          <div className="px-4 pb-4">
            <Pagination
              page={active.data.page}
              totalPages={active.data.totalPages}
              total={active.data.total}
              limit={active.data.limit}
              onPageChange={setPage}
              onLimitChange={(next) => {
                setLimit(next)
                setPage(1)
              }}
            />
          </div>
        )}
      </LabelCard>
    </>
  )
}
