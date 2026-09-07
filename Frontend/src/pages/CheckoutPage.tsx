import { useState } from "react"
import { Check, CloudOff, Search, X } from "lucide-react"

import { useAbortSaleMutation, useConfirmSaleMutation, useGetPendingSalesQuery } from "@/api/salesApi"
import { useAuth } from "@/hooks/useAuth"
import { useDebounced } from "@/hooks/useDebounced"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import { errorMessage, useToast } from "@/hooks/useToast"
import { CASHIER_ROLES } from "@/features/auth/authSlice"
import { money, relativeTime } from "@/lib/format"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { LabelCard } from "@/components/ui/LabelCard"
import { PageHeader } from "@/components/ui/PageHeader"
import { Pagination } from "@/components/ui/Table"
import type { Transaction } from "@/types"

export default function CheckoutPage() {
  const toast = useToast()
  const online = useOnlineStatus()
  const { can } = useAuth()
  const isCashier = can(...CASHIER_ROLES)

  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pendingAbort, setPendingAbort] = useState<Transaction | null>(null)

  const debouncedSearch = useDebounced(search)

  const { data, isFetching } = useGetPendingSalesQuery(
    { page, limit: 25, search: debouncedSearch || undefined },
    // The queue is shared between two people; stale data here means a double sale.
    { pollingInterval: online ? 20_000 : 0 },
  )

  const [confirmSale, { isLoading: confirming }] = useConfirmSaleMutation()
  const [abortSale, { isLoading: aborting }] = useAbortSaleMutation()

  const handleConfirm = async (transaction: Transaction) => {
    try {
      const result = await confirmSale(transaction.transactionId).unwrap()
      toast("success", "Payment confirmed", result.message)
    } catch (error) {
      toast("error", "Could not confirm", errorMessage(error))
    }
  }

  const handleAbort = async () => {
    if (!pendingAbort) return
    try {
      await abortSale(pendingAbort.transactionId).unwrap()
      toast("info", "Sale aborted", "Stock was returned to the dispensary.")
      setPendingAbort(null)
    } catch (error) {
      toast("error", "Could not abort", errorMessage(error))
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Cashier"
        title="Checkout queue"
        description="Orders prepared by a pharmacist, waiting for payment. Confirming releases the stock."
        action={
          <Input
            wrapperClassName="w-full sm:w-64"
            placeholder="Search patient…"
            prefix={<Search className="h-4 w-4" aria-hidden />}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            aria-label="Search pending sales"
          />
        }
      />

      {!online && (
        <div className="mb-4 flex items-center gap-2 rounded-label border border-rx-amber/30 bg-rx-amber-soft px-3 py-2 text-sm text-rx-amber-deep">
          <CloudOff className="h-4 w-4 shrink-0" aria-hidden />
          Offline. Sales prepared on another device will not appear until the connection returns.
        </div>
      )}

      {isFetching && !data ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-48 animate-pulse-soft rounded-label border border-mist bg-paper-sunken" />
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <LabelCard perforated>
          <p className="py-16 text-center text-sm text-ink-muted">
            Nothing waiting. Prepared sales appear here the moment a pharmacist sends them.
          </p>
        </LabelCard>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data?.data.map((transaction) => (
            <LabelCard
              key={transaction.transactionId}
              perforated
              eyebrow={`Prepared ${relativeTime(transaction.timestamp)}`}
              title={transaction.patientName || "Walk-in customer"}
              action={
                transaction.pendingSync ? (
                  <Badge tone="warn" dot>
                    Not synced
                  </Badge>
                ) : (
                  <Badge tone="neutral">{transaction.itemCount} items</Badge>
                )
              }
              footer={
                <div className="flex items-center justify-between gap-3">
                  <span className="eyebrow">
                    {transaction.pharmacist?.name ? `by ${transaction.pharmacist.name}` : "—"}
                  </span>
                  <span className="tabular font-mono text-base font-semibold text-ink">
                    {money(transaction.totalAmount)}
                  </span>
                </div>
              }
            >
              <ul className="mb-4 space-y-1.5">
                {transaction.items.map((item) => (
                  <li key={item.saleId} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="tabular font-mono text-ink-muted">{item.quantity}×</span>{" "}
                      <span className="text-ink">{item.name}</span>
                    </span>
                    <span className="tabular shrink-0 font-mono text-ink-muted">
                      {money(item.saleAmount)}
                    </span>
                  </li>
                ))}
              </ul>

              {isCashier ? (
                <div className="flex gap-2">
                  <Button
                    fullWidth
                    onClick={() => handleConfirm(transaction)}
                    loading={confirming}
                    disabled={aborting}
                  >
                    <Check className="h-4 w-4" aria-hidden />
                    Take payment
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setPendingAbort(transaction)}
                    disabled={confirming || aborting}
                    aria-label="Abort sale"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              ) : (
                <p className="rounded-label bg-paper-sunken px-3 py-2 text-xs text-ink-muted">
                  A cashier has to take payment on this order.
                </p>
              )}
            </LabelCard>
          ))}
        </div>
      )}

      {data && data.total > 0 && (
        <div className="mt-4">
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            limit={data.limit}
            onPageChange={setPage}
          />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingAbort)}
        onClose={() => setPendingAbort(null)}
        onConfirm={handleAbort}
        loading={aborting}
        tone="danger"
        confirmLabel="Abort sale"
        title="Abort this sale?"
        description={
          pendingAbort
            ? `${pendingAbort.patientName || "Walk-in"} · ${money(pendingAbort.totalAmount)}. The reserved stock returns to the dispensary.`
            : undefined
        }
      />
    </>
  )
}
