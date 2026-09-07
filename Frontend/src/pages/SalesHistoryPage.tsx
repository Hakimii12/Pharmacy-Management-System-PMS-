import { useState } from "react"
import { ChevronDown, RotateCcw, Search } from "lucide-react"

import { useGetTransactionsQuery, useUndoSaleMutation } from "@/api/salesApi"
import { useAuth } from "@/hooks/useAuth"
import { useDebounced } from "@/hooks/useDebounced"
import { errorMessage, useToast } from "@/hooks/useToast"
import { MANAGER_ROLES } from "@/features/auth/authSlice"
import { formatDateTime, money } from "@/lib/format"
import { cn } from "@/lib/cn"
import { Badge, PaymentBadge, SaleStatusBadge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/Dialog"
import { Input, Select } from "@/components/ui/Input"
import { LabelCard } from "@/components/ui/LabelCard"
import { PageHeader } from "@/components/ui/PageHeader"
import { Pagination } from "@/components/ui/Table"
import type { Transaction } from "@/types"

export default function SalesHistoryPage() {
  const toast = useToast()
  const { can } = useAuth()
  const isManager = can(...MANAGER_ROLES)

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [saleType, setSaleType] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [undoing, setUndoing] = useState<Transaction | null>(null)

  const debouncedSearch = useDebounced(search)

  const { data, isFetching } = useGetTransactionsQuery({
    page,
    limit,
    search: debouncedSearch || undefined,
    status: status || undefined,
    saleType: saleType || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })

  const [undoSale, { isLoading: reverting }] = useUndoSaleMutation()

  const resetPage = () => setPage(1)

  const handleUndo = async () => {
    if (!undoing) return
    try {
      await undoSale({ transactionId: undoing.transactionId }).unwrap()
      toast("success", "Sale reversed", "Stock was returned and the ledger adjusted.")
      setUndoing(null)
    } catch (error) {
      toast("error", "Could not reverse", errorMessage(error))
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Records"
        title="Sales history"
        description="Completed, aborted and refunded transactions. Filters run on the server, so results stay fast as history grows."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input
          wrapperClassName="min-w-[200px] flex-1"
          placeholder="Search patient name…"
          prefix={<Search className="h-4 w-4" aria-hidden />}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            resetPage()
          }}
          aria-label="Search transactions"
        />

        <Select
          wrapperClassName="w-full sm:w-40"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            resetPage()
          }}
          aria-label="Filter by status"
        >
          <option value="">Any status</option>
          <option value="completed">Completed</option>
          <option value="aborted">Aborted</option>
          <option value="refunded">Refunded</option>
        </Select>

        <Select
          wrapperClassName="w-full sm:w-36"
          value={saleType}
          onChange={(event) => {
            setSaleType(event.target.value)
            resetPage()
          }}
          aria-label="Filter by sale type"
        >
          <option value="">Cash & credit</option>
          <option value="cash">Cash</option>
          <option value="credit">Credit</option>
        </Select>

        <Input
          wrapperClassName="w-full sm:w-40"
          label="From"
          type="date"
          value={startDate}
          onChange={(event) => {
            setStartDate(event.target.value)
            resetPage()
          }}
        />

        <Input
          wrapperClassName="w-full sm:w-40"
          label="To"
          type="date"
          value={endDate}
          onChange={(event) => {
            setEndDate(event.target.value)
            resetPage()
          }}
        />
      </div>

      <LabelCard perforated eyebrow="Ledger" title="Transactions" bodyClassName="px-0 py-0">
        {isFetching && !data ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse-soft rounded-label bg-paper-sunken" />
            ))}
          </div>
        ) : data?.data.length === 0 ? (
          <p className="py-16 text-center text-sm text-ink-muted">
            No transactions match these filters.
          </p>
        ) : (
          <ul className="divide-y divide-mist">
            {data?.data.map((transaction) => {
              const open = expanded === transaction.transactionId

              return (
                <li key={transaction.transactionId}>
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : transaction.transactionId)}
                    className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-paper-sunken"
                    aria-expanded={open}
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-ink-muted transition-transform",
                        open && "rotate-180",
                      )}
                      aria-hidden
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {transaction.patientName || "Walk-in customer"}
                      </p>
                      <p className="tabular font-mono text-micro uppercase tracking-wider text-ink-muted">
                        {formatDateTime(transaction.completedAt || transaction.timestamp)} ·{" "}
                        {transaction.itemCount} items
                      </p>
                    </div>

                    <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                      <SaleStatusBadge status={transaction.status} />
                      {transaction.saleType === "credit" && (
                        <PaymentBadge status={transaction.paymentStatus} />
                      )}
                      {transaction.pendingSync && (
                        <Badge tone="warn" dot>
                          Queued
                        </Badge>
                      )}
                    </div>

                    <p className="tabular shrink-0 font-mono text-sm font-semibold text-ink">
                      {money(transaction.totalAmount)}
                    </p>
                  </button>

                  {open && (
                    <div className="animate-fade-in border-t border-dashed border-mist bg-paper px-4 py-3 pl-12">
                      <ul className="space-y-1.5">
                        {transaction.items.map((item) => (
                          <li
                            key={item.saleId}
                            className="flex items-baseline justify-between gap-3 text-sm"
                          >
                            <span className="min-w-0 truncate">
                              <span className="tabular font-mono text-ink-muted">
                                {item.quantity}×
                              </span>{" "}
                              <span className="text-ink">{item.name}</span>
                              {item.brand && (
                                <span className="text-ink-muted"> · {item.brand}</span>
                              )}
                            </span>
                            <span className="tabular shrink-0 font-mono text-ink-muted">
                              {money(item.saleAmount)}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <dl className="mt-3 grid gap-x-6 gap-y-1 border-t border-dashed border-mist pt-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                        <Detail label="Transaction" value={transaction.transactionId} mono />
                        <Detail label="Pharmacist" value={transaction.pharmacist?.name ?? "—"} />
                        <Detail label="Cashier" value={transaction.cashier?.name ?? "—"} />
                        {transaction.saleType === "credit" && (
                          <Detail label="Balance" value={money(transaction.remainingBalance)} mono />
                        )}
                      </dl>

                      {isManager && transaction.status === "completed" && (
                        <div className="mt-3 flex justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setUndoing(transaction)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                            Reverse sale
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {data && (
          <div className="px-4 pb-4 pt-3">
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

      <ConfirmDialog
        open={Boolean(undoing)}
        onClose={() => setUndoing(null)}
        onConfirm={handleUndo}
        loading={reverting}
        tone="danger"
        confirmLabel="Reverse sale"
        title="Reverse this sale?"
        description={
          undoing
            ? `${undoing.patientName || "Walk-in"} · ${money(undoing.totalAmount)}. Stock returns to the dispensary and the transaction is marked refunded.`
            : undefined
        }
      />
    </>
  )
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="eyebrow">{label}</dt>
      <dd className={cn("truncate text-ink", mono && "tabular font-mono")}>{value}</dd>
    </div>
  )
}
