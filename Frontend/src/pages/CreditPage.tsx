import { useState } from "react"
import { HandCoins, Search } from "lucide-react"

import { useGetCreditSalesQuery, useProcessCreditPaymentMutation } from "@/api/salesApi"
import { useDebounced } from "@/hooks/useDebounced"
import { errorMessage, useToast } from "@/hooks/useToast"
import { formatDate, money } from "@/lib/format"
import { Badge, PaymentBadge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input, Select, Textarea } from "@/components/ui/Input"
import { LabelCard } from "@/components/ui/LabelCard"
import { PageHeader } from "@/components/ui/PageHeader"
import { Pagination, Table } from "@/components/ui/Table"
import type { PaymentMethod, Transaction } from "@/types"

export default function CreditPage() {
  const toast = useToast()

  const [search, setSearch] = useState("")
  const [paymentStatus, setPaymentStatus] = useState("")
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [settling, setSettling] = useState<Transaction | null>(null)

  const debouncedSearch = useDebounced(search)

  const { data, isFetching } = useGetCreditSalesQuery({
    page,
    limit,
    search: debouncedSearch || undefined,
    paymentStatus: paymentStatus || undefined,
    overdue: overdueOnly ? "true" : undefined,
  })

  const outstanding = (data?.data ?? []).reduce((sum, row) => sum + row.remainingBalance, 0)

  return (
    <>
      <PageHeader
        eyebrow="Records"
        title="Credit ledger"
        description="Customers who took stock on account. Record repayments here as they come in."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input
          wrapperClassName="min-w-[200px] flex-1"
          placeholder="Search customer name…"
          prefix={<Search className="h-4 w-4" aria-hidden />}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          aria-label="Search credit sales"
        />

        <Select
          wrapperClassName="w-full sm:w-44"
          value={paymentStatus}
          onChange={(event) => {
            setPaymentStatus(event.target.value)
            setPage(1)
          }}
          aria-label="Filter by payment status"
        >
          <option value="">Any balance</option>
          <option value="credit">Nothing paid</option>
          <option value="partial">Partly paid</option>
          <option value="paid">Settled</option>
        </Select>

        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-label border border-mist-deep bg-paper-raised px-3 text-sm">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(event) => {
              setOverdueOnly(event.target.checked)
              setPage(1)
            }}
            className="h-4 w-4 accent-alert"
          />
          Overdue only
        </label>
      </div>

      <LabelCard
        perforated
        eyebrow="Outstanding on this page"
        title={money(outstanding)}
        bodyClassName="px-0 py-0"
      >
        <Table
          rows={data?.data ?? []}
          rowKey={(row) => row.transactionId}
          loading={isFetching}
          empty={{
            title: "No credit sales",
            description: "Credit sales recorded at the counter appear here.",
          }}
          columns={[
            {
              key: "customer",
              header: "Customer",
              render: (row) => (
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">
                    {row.patientName || "Unnamed customer"}
                  </p>
                  <p className="tabular truncate font-mono text-micro uppercase tracking-wider text-ink-muted">
                    {row.customerPhone || "—"}
                  </p>
                </div>
              ),
            },
            {
              key: "date",
              header: "Sold",
              secondary: true,
              render: (row) => (
                <span className="text-ink-muted">{formatDate(row.timestamp)}</span>
              ),
            },
            {
              key: "due",
              header: "Due",
              secondary: true,
              render: (row) => (
                <div className="flex flex-col items-start gap-1">
                  <span className="text-ink-muted">{formatDate(row.dueDate)}</span>
                  {row.isOverdue && <Badge tone="bad">Overdue</Badge>}
                </div>
              ),
            },
            {
              key: "total",
              header: "Total",
              numeric: true,
              secondary: true,
              render: (row) => money(row.totalAmount),
            },
            {
              key: "paid",
              header: "Paid",
              numeric: true,
              render: (row) => money(row.amountPaid),
            },
            {
              key: "balance",
              header: "Owing",
              numeric: true,
              render: (row) => (
                <span className={row.remainingBalance > 0 ? "font-semibold text-alert" : "text-mint"}>
                  {money(row.remainingBalance)}
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <PaymentBadge status={row.paymentStatus} />,
            },
            {
              key: "action",
              header: "",
              width: "130px",
              render: (row) => (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={row.remainingBalance <= 0}
                    onClick={() => setSettling(row)}
                  >
                    <HandCoins className="h-3.5 w-3.5" aria-hidden />
                    Take payment
                  </Button>
                </div>
              ),
            },
          ]}
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
                setPage(1)
              }}
            />
          </div>
        )}
      </LabelCard>

      {settling && (
        <PaymentDialog
          transaction={settling}
          onClose={() => setSettling(null)}
          onSuccess={(message) => {
            toast("success", "Payment recorded", message)
            setSettling(null)
          }}
          onError={(message) => toast("error", "Could not record payment", message)}
        />
      )}
    </>
  )
}

function PaymentDialog({
  transaction,
  onClose,
  onSuccess,
  onError,
}: {
  transaction: Transaction
  onClose: () => void
  onSuccess: (message: string) => void
  onError: (message: string) => void
}) {
  const [amount, setAmount] = useState(String(transaction.remainingBalance.toFixed(2)))
  const [method, setMethod] = useState<PaymentMethod>("cash")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)

  const [processPayment, { isLoading }] = useProcessCreditPaymentMutation()

  const handleSubmit = async () => {
    const value = Number(amount)

    if (!value || value <= 0) {
      setError("Enter an amount greater than zero")
      return
    }
    if (value > transaction.remainingBalance + 0.01) {
      setError(`Cannot exceed the ${money(transaction.remainingBalance)} owing`)
      return
    }

    setError(null)

    try {
      const result = await processPayment({
        transactionId: transaction.transactionId,
        paymentAmount: value,
        paymentMethod: method,
        notes: notes.trim() || undefined,
      }).unwrap()
      onSuccess(`${money(result.newTotalBalance)} still outstanding.`)
    } catch (requestError) {
      onError(errorMessage(requestError))
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      eyebrow="Credit repayment"
      title={transaction.patientName || "Unnamed customer"}
      description={transaction.customerPhone}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={isLoading}>
            Record payment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Figure label="Total" value={money(transaction.totalAmount)} />
          <Figure label="Paid" value={money(transaction.amountPaid)} />
          <Figure label="Owing" value={money(transaction.remainingBalance)} tone="alert" />
        </div>

        <Input
          label="Amount received"
          type="number"
          numeric
          step="0.01"
          min={0}
          max={transaction.remainingBalance}
          autoFocus
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          error={error ?? undefined}
        />

        <Select
          label="Method"
          value={method}
          onChange={(event) => setMethod(event.target.value as PaymentMethod)}
        >
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="mobile_money">Mobile money</option>
        </Select>

        <Textarea
          label="Notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Reference number, who paid, anything worth recording…"
        />
      </div>
    </Dialog>
  )
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: "alert" }) {
  return (
    <div className="rounded-label border border-mist bg-paper px-3 py-2">
      <p className="eyebrow">{label}</p>
      <p
        className={
          tone === "alert"
            ? "tabular font-mono text-sm font-semibold text-alert"
            : "tabular font-mono text-sm font-semibold text-ink"
        }
      >
        {value}
      </p>
    </div>
  )
}
