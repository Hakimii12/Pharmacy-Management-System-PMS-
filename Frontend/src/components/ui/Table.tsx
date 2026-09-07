import type { ReactNode } from "react"
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react"
import { cn } from "@/lib/cn"
import { Button } from "./Button"

export interface Column<T> {
  key: string
  header: ReactNode
  /** Right-align and use mono digits — for money and quantities. */
  numeric?: boolean
  /** Hidden below `md`. Use for secondary detail on narrow counter screens. */
  secondary?: boolean
  width?: string
  render: (row: T, index: number) => ReactNode
}

export interface TableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string
  loading?: boolean
  /** Number of skeleton rows to draw on first load. */
  skeletonRows?: number
  empty?: { title: string; description?: string; action?: ReactNode }
  onRowClick?: (row: T) => void
  rowClassName?: (row: T) => string | undefined
  className?: string
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  loading,
  skeletonRows = 6,
  empty,
  onRowClick,
  rowClassName,
  className,
}: TableProps<T>) {
  const showSkeleton = loading && rows.length === 0

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-mist-deep">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={column.width ? { width: column.width } : undefined}
                className={cn(
                  "eyebrow px-3 py-2.5 text-left font-normal",
                  column.numeric && "text-right",
                  column.secondary && "hidden md:table-cell",
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {showSkeleton &&
            Array.from({ length: skeletonRows }).map((_, rowIndex) => (
              <tr key={`skeleton-${rowIndex}`} className="border-b border-mist">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn("px-3 py-3", column.secondary && "hidden md:table-cell")}
                  >
                    <div className="h-3.5 w-full max-w-[140px] animate-pulse-soft rounded bg-paper-sunken" />
                  </td>
                ))}
              </tr>
            ))}

          {!showSkeleton &&
            rows.map((row, index) => (
              <tr
                key={rowKey(row, index)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-mist transition-colors",
                  onRowClick && "cursor-pointer hover:bg-paper-sunken",
                  rowClassName?.(row),
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-3 py-3 align-middle",
                      column.numeric && "tabular text-right font-mono",
                      column.secondary && "hidden md:table-cell",
                    )}
                  >
                    {column.render(row, index)}
                  </td>
                ))}
              </tr>
            ))}

          {!showSkeleton && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-16">
                <div className="flex flex-col items-center gap-2 text-center">
                  <Inbox className="h-7 w-7 text-mist-deep" aria-hidden />
                  <p className="font-medium text-ink">{empty?.title ?? "Nothing here yet"}</p>
                  {empty?.description && (
                    <p className="max-w-sm text-sm text-ink-muted">{empty.description}</p>
                  )}
                  {empty?.action && <div className="mt-2">{empty.action}</div>}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export interface PaginationProps {
  page: number
  totalPages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
  onLimitChange?: (limit: number) => void
}

/** Footer control for every paginated list; mirrors the backend envelope exactly. */
export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  if (total === 0) return null

  const first = (page - 1) * limit + 1
  const last = Math.min(page * limit, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-mist px-1 pt-3">
      <p className="font-mono text-micro uppercase tracking-wider text-ink-muted">
        {first}–{last} of {total}
      </p>

      <div className="flex items-center gap-2">
        {onLimitChange && (
          <select
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            aria-label="Rows per page"
            className="h-9 rounded-label border border-mist-deep bg-paper-raised px-2 text-sm outline-none focus:border-rx-amber"
          >
            {[25, 50, 100].map((option) => (
              <option key={option} value={option}>
                {option} / page
              </option>
            ))}
          </select>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>

        <span className="tabular font-mono text-sm text-ink-muted">
          {page} / {Math.max(totalPages, 1)}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
