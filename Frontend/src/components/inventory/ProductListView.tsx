import { useState, type ReactNode } from "react"
import { CloudOff, Search } from "lucide-react"

import { useGetCategoriesQuery } from "@/api/catalogApi"
import { useDebounced } from "@/hooks/useDebounced"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import { formatDate, money, quantity as formatQuantity } from "@/lib/format"
import { daysUntil } from "@/lib/format"
import { Badge, StockBadge } from "@/components/ui/Badge"
import { Input, Select } from "@/components/ui/Input"
import { LabelCard } from "@/components/ui/LabelCard"
import { Pagination, Table, type Column } from "@/components/ui/Table"
import type { Paginated, Product, StockStatus } from "@/types"

export interface ProductQueryArgs {
  page: number
  limit: number
  search?: string
  category?: string
  status?: StockStatus | ""
}

const STATUSES: StockStatus[] = ["In Stock", "Low Stock", "Sold Out", "Expired"]

/**
 * Shared shell for the three stock screens.
 *
 * They differ only in which location's numbers they surface and which actions
 * they offer, so filtering, pagination and the batch/expiry columns live here.
 */
export function ProductListView({
  eyebrow,
  title,
  /** Which location column set to show. `both` is the all-stock view. */
  location,
  useQuery,
  extraColumns,
  toolbar,
  emptyTitle = "No stock matches these filters",
}: {
  eyebrow: string
  title: string
  location: "both" | "store" | "dispensary"
  useQuery: (args: ProductQueryArgs) => { data?: Paginated<Product>; isFetching: boolean }
  extraColumns?: Column<Product>[]
  toolbar?: ReactNode
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

  const locationColumns: Column<Product>[] =
    location === "both"
      ? [
          {
            key: "store",
            header: "Store",
            numeric: true,
            render: (row) => (
              <span className={row.inventory.store === 0 ? "text-ink-muted" : undefined}>
                {formatQuantity(row.inventory.store)}
              </span>
            ),
          },
          {
            key: "dispensary",
            header: "Dispensary",
            numeric: true,
            render: (row) => (
              <span className={row.inventory.dispensary === 0 ? "text-ink-muted" : undefined}>
                {formatQuantity(row.inventory.dispensary)}
              </span>
            ),
          },
        ]
      : [
          {
            key: "quantity",
            header: "On hand",
            numeric: true,
            render: (row) =>
              formatQuantity(location === "store" ? row.inventory.store : row.inventory.dispensary),
          },
          {
            key: "threshold",
            header: "Threshold",
            numeric: true,
            secondary: true,
            render: (row) => (
              <span className="text-ink-muted">
                {formatQuantity(
                  location === "store"
                    ? row.inventory.storeThreshold
                    : row.inventory.dispensaryThreshold,
                )}
              </span>
            ),
          },
        ]

  const columns: Column<Product>[] = [
    {
      key: "product",
      header: "Batch",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.name}</p>
          <p className="truncate font-mono text-micro uppercase tracking-wider text-ink-muted">
            {row.brand || "—"} · {row.batchNo}
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
      key: "expiry",
      header: "Expires",
      secondary: true,
      render: (row) => <ExpiryCell value={row.expiryDate} />,
    },
    ...locationColumns,
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
              ? row.inventory.storeStatus
              : location === "dispensary"
                ? row.inventory.dispensaryStatus
                : worstStatus(row)
          }
        />
      ),
    },
    ...(extraColumns ?? []),
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

        {toolbar}
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
          rowKey={(row) => row._id}
          loading={isFetching}
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

/** Worst of the two location statuses — the all-stock view should not look healthier than it is. */
function worstStatus(product: Product): StockStatus {
  const order: StockStatus[] = ["Expired", "Sold Out", "Low Stock", "In Stock"]
  const store = order.indexOf(product.inventory.storeStatus)
  const dispensary = order.indexOf(product.inventory.dispensaryStatus)
  return order[Math.min(store === -1 ? 3 : store, dispensary === -1 ? 3 : dispensary)]!
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
