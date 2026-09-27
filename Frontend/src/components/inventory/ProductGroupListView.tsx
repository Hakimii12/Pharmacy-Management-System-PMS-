import { useState } from "react"
import { ChevronRight, CloudOff, Search } from "lucide-react"

import { useGetCategoriesQuery } from "@/api/catalogApi"
import { useDebounced } from "@/hooks/useDebounced"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import { daysUntil, formatDate, money, quantity as formatQuantity } from "@/lib/format"
import { Badge, StockBadge } from "@/components/ui/Badge"
import { Input, Select } from "@/components/ui/Input"
import { LabelCard } from "@/components/ui/LabelCard"
import { Pagination, Table, type Column } from "@/components/ui/Table"
import type { Paginated, ProductGroup, StockStatus } from "@/types"

/** Local alias so callers can pass any grouped RTK Query hook. */
export type GroupedProductQuery = (args: {
  page: number
  limit: number
  search?: string
  category?: string
  status?: StockStatus | ""
}) => { data?: Paginated<ProductGroup>; isFetching: boolean }

const STATUSES: StockStatus[] = ["In Stock", "Low Stock", "Sold Out", "Expired"]

/**
 * Catalogue list: one row per product identity with summed stock.
 * Click a row to open its batches.
 */
export function ProductGroupListView({
  eyebrow,
  title,
  location = "both",
  useQuery,
  onOpenGroup,
  emptyTitle = "No products match these filters",
}: {
  eyebrow: string
  title: string
  location?: "both" | "store" | "dispensary"
  useQuery: GroupedProductQuery
  onOpenGroup: (group: ProductGroup) => void
  emptyTitle?: string
}) {
  const online = useOnlineStatus()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [status, setStatus] = useState<StockStatus | "">("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)

  const debouncedSearch = useDebounced(search)
  const { data: categories } = useGetCategoriesQuery({ limit: 200 })
  const { data, isFetching } = useQuery({
    page,
    limit,
    search: debouncedSearch || undefined,
    category: category || undefined,
    status: status || undefined,
  })

  const resetPage = () => setPage(1)

  const quantityColumns: Column<ProductGroup>[] =
    location === "both"
      ? [
          {
            key: "store",
            header: "Store",
            numeric: true,
            render: (row) => (
              <span className={(row.inventory?.store ?? 0) === 0 ? "text-ink-muted" : undefined}>
                {formatQuantity(row.inventory?.store ?? 0)}
              </span>
            ),
          },
          {
            key: "dispensary",
            header: "Dispensary",
            numeric: true,
            render: (row) => (
              <span className={(row.inventory?.dispensary ?? 0) === 0 ? "text-ink-muted" : undefined}>
                {formatQuantity(row.inventory?.dispensary ?? 0)}
              </span>
            ),
          },
          {
            key: "total",
            header: "Total qty",
            numeric: true,
            render: (row) => <span className="font-medium">{formatQuantity(row.totalQuantity)}</span>,
          },
        ]
      : [
          {
            key: "onHand",
            header: "On hand",
            numeric: true,
            render: (row) => (
              <span className="font-medium">
                {formatQuantity(
                  location === "store" ? (row.inventory?.store ?? 0) : (row.inventory?.dispensary ?? 0),
                )}
              </span>
            ),
          },
        ]

  const columns: Column<ProductGroup>[] = [
    {
      key: "product",
      header: "Product",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.name}</p>
          <p className="truncate font-mono text-micro uppercase tracking-wider text-ink-muted">
            {[row.brand, row.DosageForms].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      secondary: true,
      render: (row) => <span className="text-ink-muted">{row.category || "—"}</span>,
    },
    {
      key: "batches",
      header: "Batches",
      numeric: true,
      render: (row) => formatQuantity(row.batchCount),
    },
    ...quantityColumns,
    {
      key: "expiry",
      header: "Nearest expiry",
      secondary: true,
      render: (row) => <ExpiryCell value={row.nearestExpiry} />,
    },
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
                : worstStatus(row)
          }
        />
      ),
    },
    {
      key: "open",
      header: "",
      width: "40px",
      render: () => <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden />,
    },
  ]

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input
          wrapperClassName="min-w-[220px] flex-1"
          placeholder="Search name, brand or batch…"
          prefix={<Search className="h-4 w-4" aria-hidden />}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            resetPage()
          }}
          aria-label="Search stock"
        />

        <Select
          wrapperClassName="w-full sm:w-48"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value)
            resetPage()
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

        <Select
          wrapperClassName="w-full sm:w-40"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as StockStatus | "")
            resetPage()
          }}
          aria-label="Filter by status"
        >
          <option value="">Any status</option>
          {STATUSES.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </Select>
      </div>

      {!online && (
        <div className="mb-4 flex items-center gap-2 rounded-label border border-rx-amber/30 bg-rx-amber-soft px-3 py-2 text-sm text-rx-amber-deep">
          <CloudOff className="h-4 w-4 shrink-0" aria-hidden />
          Offline — showing the last synced copy of the catalogue.
        </div>
      )}

      <LabelCard eyebrow={eyebrow} title={title} perforated bodyClassName="px-0 py-0">
        <Table
          columns={columns}
          rows={data?.data ?? []}
          rowKey={(row) => row.id}
          loading={isFetching}
          onRowClick={onOpenGroup}
          empty={{
            title: emptyTitle,
            description: "Try clearing the search or status filter.",
          }}
        />

        {data && (
          <div className="px-4 pb-4">
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              limit={data.limit}
              onPageChange={setPage}
              onLimitChange={(next) => {
                setLimit(next)
                resetPage()
              }}
            />
          </div>
        )}
      </LabelCard>
    </>
  )
}

function worstStatus(group: ProductGroup): StockStatus {
  const order: StockStatus[] = ["Expired", "Sold Out", "Low Stock", "In Stock"]
  const store = order.indexOf(group.inventory.storeStatus)
  const dispensary = order.indexOf(group.inventory.dispensaryStatus)
  return order[Math.min(store === -1 ? 3 : store, dispensary === -1 ? 3 : dispensary)]!
}

function ExpiryCell({ value }: { value?: string }) {
  if (!value) return <span className="text-ink-muted">—</span>
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
