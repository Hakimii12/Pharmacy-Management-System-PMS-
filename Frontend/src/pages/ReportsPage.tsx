import { useState } from "react"
import { CircleDollarSign, Percent, Receipt, TrendingUp } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { useGetDailyBalanceHistoryQuery, useGetTotalSalesQuery } from "@/api/salesApi"
import {
  useGetDispensaryLedgerQuery,
  useGetDispensarySummaryQuery,
  useGetInventoryHistoryQuery,
  useGetProfitQuery,
  useSubmitPhysicalReconciliationMutation,
  type DispensaryLedgerRow,
} from "@/api/inventoryApi"
import type { DispensarySummaryRow } from "@/types"
import { useGetProductCountsQuery } from "@/api/productApi"
import { compactMoney, formatDate, money, quantity } from "@/lib/format"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { LabelCard } from "@/components/ui/LabelCard"
import { PageHeader } from "@/components/ui/PageHeader"
import { Pagination, Table } from "@/components/ui/Table"
import { StatCard } from "@/components/ui/StatCard"

function getPresetDates(preset: "today" | "yesterday" | "last7" | "thisMonth" | "lastMonth" | "all") {
  const today = new Date()
  const formatDateStr = (d: Date) => d.toISOString().split("T")[0]

  if (preset === "today") {
    const s = formatDateStr(today)
    return { start: s, end: s }
  }
  if (preset === "yesterday") {
    const y = new Date(today)
    y.setDate(y.getDate() - 1)
    const s = formatDateStr(y)
    return { start: s, end: s }
  }
  if (preset === "last7") {
    const s = new Date(today)
    s.setDate(s.getDate() - 6)
    return { start: formatDateStr(s), end: formatDateStr(today) }
  }
  if (preset === "thisMonth") {
    const s = new Date(today.getFullYear(), today.getMonth(), 1)
    return { start: formatDateStr(s), end: formatDateStr(today) }
  }
  if (preset === "lastMonth") {
    const s = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const e = new Date(today.getFullYear(), today.getMonth(), 0)
    return { start: formatDateStr(s), end: formatDateStr(e) }
  }
  return { start: "", end: "" }
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [summaryPage, setSummaryPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)

  const applyPreset = (preset: "today" | "yesterday" | "last7" | "thisMonth" | "lastMonth" | "all") => {
    const dates = getPresetDates(preset)
    setStartDate(dates.start)
    setEndDate(dates.end)
  }

  const { data: totals, isLoading: totalsLoading } = useGetTotalSalesQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })
  const { data: profit } = useGetProfitQuery()
  const { data: counts } = useGetProductCountsQuery()
  const { data: summary, isFetching: summaryFetching } = useGetDispensarySummaryQuery({
    page: summaryPage,
    limit: 25,
  })
  const { data: balanceHistory, isFetching: historyFetching } = useGetDailyBalanceHistoryQuery({
    page: historyPage,
    limit: 10,
  })

  const margin =
    totals?.totalSales && totals.totalSales > 0
      ? ((totals.totalProfit / totals.totalSales) * 100).toFixed(1)
      : "0.0"

  const profitSeries = [
    { period: "Today", value: profit?.current.daily ?? 0 },
    { period: "This month", value: profit?.current.monthly ?? 0 },
    { period: "This year", value: profit?.current.yearly ?? 0 },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Records"
        title="Reports"
        description="Trading performance, interval stock ledger and physical inventory count settlement."
        action={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex flex-wrap items-center gap-1 rounded-card border border-mist bg-paper-sunken p-1 text-xs font-mono">
              <button
                type="button"
                onClick={() => applyPreset("today")}
                className="px-2 py-0.5 rounded hover:bg-paper-raised text-ink-muted hover:text-ink transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => applyPreset("yesterday")}
                className="px-2 py-0.5 rounded hover:bg-paper-raised text-ink-muted hover:text-ink transition-colors"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => applyPreset("last7")}
                className="px-2 py-0.5 rounded hover:bg-paper-raised text-ink-muted hover:text-ink transition-colors"
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => applyPreset("thisMonth")}
                className="px-2 py-0.5 rounded hover:bg-paper-raised text-ink-muted hover:text-ink transition-colors"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => applyPreset("all")}
                className="px-2 py-0.5 rounded hover:bg-paper-raised text-ink-muted hover:text-ink transition-colors"
              >
                All Time
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Input
                wrapperClassName="w-36"
                label="From"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
              <Input
                wrapperClassName="w-36"
                label="To"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          value={compactMoney(totals?.totalSales)}
          hint={startDate || endDate ? "Filtered period" : "All time"}
          icon={CircleDollarSign}
          loading={totalsLoading}
        />
        <StatCard
          label="Gross profit"
          value={compactMoney(totals?.totalProfit)}
          icon={TrendingUp}
          tone="good"
          loading={totalsLoading}
        />
        <StatCard
          label="Margin"
          value={`${margin}%`}
          icon={Percent}
          loading={totalsLoading}
        />
        <StatCard
          label="Transactions"
          value={quantity(totals?.transactionCount)}
          icon={Receipt}
          loading={totalsLoading}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <LabelCard className="xl:col-span-2" eyebrow="Profit" title="Running totals">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitSeries} margin={{ top: 4, right: 8, bottom: 4, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DCE4E2" vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11, fill: "#5A6B80" }}
                  tickLine={false}
                  axisLine={{ stroke: "#DCE4E2" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#5A6B80" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => compactMoney(value)}
                  width={72}
                />
                <Tooltip
                  cursor={{ fill: "#EEF2EF" }}
                  formatter={(value) => money(Number(value))}
                  contentStyle={{
                    borderRadius: 4,
                    border: "1px solid #DCE4E2",
                    fontSize: 12,
                    fontFamily: "IBM Plex Mono, monospace",
                  }}
                />
                <Bar dataKey="value" fill="#2F9E82" radius={[3, 3, 0, 0]} maxBarSize={64} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </LabelCard>

        <LabelCard eyebrow="Shelf" title="Dispensary valuation">
          <dl className="space-y-3">
            <Row label="At cost" value={money(summary?.totals.totalUnitPrice ?? 0)} />
            <Row label="At retail" value={money(summary?.totals.totalSellingPrice ?? 0)} />
            <Row
              label="Margin if sold"
              value={money(summary?.totals.potentialProfit ?? 0)}
              emphasis
            />
            <Row label="Batches in catalog" value={quantity(counts?.totalProducts)} />
            <Row label="Expiring within 3 months" value={quantity(counts?.nearExpiry)} />
          </dl>
        </LabelCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <LabelCard
          perforated
          eyebrow="Valuation"
          title="Shelf line items"
          bodyClassName="px-0 py-0"
        >
          <Table<DispensarySummaryRow>
            rows={summary?.data ?? []}
            rowKey={(row) => row.productId}
            loading={summaryFetching}
            empty={{ title: "Nothing on the shelf" }}
            columns={[
              {
                key: "name",
                header: "Batch",
                render: (row) => (
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{row.name}</p>
                    <p className="truncate font-mono text-micro uppercase tracking-wider text-ink-muted">
                      {row.brand || "—"} · {formatDate(row.expiryDate)}
                    </p>
                  </div>
                ),
              },
              {
                key: "qty",
                header: "Qty",
                numeric: true,
                render: (row) => quantity(row.quantity),
              },
              {
                key: "cost",
                header: "At cost",
                numeric: true,
                secondary: true,
                render: (row) => money(row.unitPrice),
              },
              {
                key: "retail",
                header: "At retail",
                numeric: true,
                render: (row) => money(row.sellingPrice),
              },
            ]}
          />

          {summary && (
            <div className="px-4 pb-4">
              <Pagination
                page={summary.page}
                totalPages={summary.totalPages}
                total={summary.total}
                limit={summary.limit}
                onPageChange={setSummaryPage}
              />
            </div>
          )}
        </LabelCard>

        <LabelCard perforated eyebrow="Till" title="Daily balance history" bodyClassName="px-0 py-0">
          <Table
            rows={balanceHistory?.data ?? []}
            rowKey={(row, index) => String(row._id ?? index)}
            loading={historyFetching}
            empty={{
              title: "No balances closed yet",
              description: "Closing a cashier's till records the expected and actual amounts here.",
            }}
            columns={[
              {
                key: "date",
                header: "Date",
                render: (row) => (
                  <span className="tabular font-mono text-ink-muted">
                    {formatDate(String(row.date ?? row.createdAt ?? ""))}
                  </span>
                ),
              },
              {
                key: "expected",
                header: "Expected",
                numeric: true,
                render: (row) => money(Number(row.totalExpected ?? 0)),
              },
              {
                key: "actual",
                header: "Counted",
                numeric: true,
                render: (row) => money(Number(row.actualAmount ?? 0)),
              },
              {
                key: "variance",
                header: "Variance",
                numeric: true,
                render: (row) => {
                  const variance = Number(row.actualAmount ?? 0) - Number(row.totalExpected ?? 0)
                  return (
                    <span
                      className={
                        Math.abs(variance) < 0.01
                          ? "text-mint"
                          : variance < 0
                            ? "text-alert"
                            : "text-rx-amber-deep"
                      }
                    >
                      {money(variance)}
                    </span>
                  )
                },
              },
            ]}
          />

          {balanceHistory && (
            <div className="px-4 pb-4">
              <Pagination
                page={balanceHistory.page}
                totalPages={balanceHistory.totalPages}
                total={balanceHistory.total}
                limit={balanceHistory.limit}
                onPageChange={setHistoryPage}
              />
            </div>
          )}
        </LabelCard>
      </div>

      <DispensaryLedgerSection startDate={startDate} endDate={endDate} />
    </>
  )
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-mist pb-2.5 last:border-0 last:pb-0">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd
        className={
          emphasis
            ? "tabular font-mono text-sm font-semibold text-mint"
            : "tabular font-mono text-sm text-ink"
        }
      >
        {value}
      </dd>
    </div>
  )
}

function DispensaryLedgerSection({
  startDate,
  endDate,
}: {
  startDate: string
  endDate: string
}) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [viewMode, setViewMode] = useState<"quantity" | "cost" | "retail" | "total" | "physical">("quantity")
  const [selectedProduct, setSelectedProduct] = useState<DispensaryLedgerRow | null>(null)

  // Physical Audit state
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>({})
  const [onlyDiscrepancies, setOnlyDiscrepancies] = useState(false)
  const [isSettlementOpen, setIsSettlementOpen] = useState(false)
  const [reconciliationNotes, setReconciliationNotes] = useState("")
  const [adjustSystemStock, setAdjustSystemStock] = useState(true)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)

  const { data: ledger, isFetching } = useGetDispensaryLedgerQuery({
    page,
    limit: 15,
    search: search || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })

  const [submitPhysicalReconciliation, { isLoading: isSubmitting }] = useSubmitPhysicalReconciliationMutation()

  const summary = ledger?.summary

  const handleAutoFill = () => {
    if (!ledger?.data) return
    const next: Record<string, number> = {}
    for (const row of ledger.data) {
      const key = row.groupId || String(row.productId)
      next[key] = row.calculatedExpected
    }
    setPhysicalCounts((prev) => ({ ...prev, ...next }))
  }

  const displayRows = ledger?.data
    ? viewMode === "physical" && onlyDiscrepancies
      ? ledger.data.filter((row) => {
          const key = row.groupId || String(row.productId)
          const expected = row.calculatedExpected
          const physical = physicalCounts[key] !== undefined ? physicalCounts[key] : expected
          return physical !== expected
        })
      : ledger.data
    : []

  const auditStats = ledger?.data
    ? (() => {
        let balanced = 0, shortage = 0, overage = 0, netQtyVar = 0, costVar = 0, retailVar = 0
        for (const row of ledger.data) {
          const key = row.groupId || String(row.productId)
          const expected = row.calculatedExpected
          const physical = physicalCounts[key] !== undefined ? physicalCounts[key] : expected
          const v = physical - expected
          if (v === 0) balanced++
          else if (v < 0) shortage++
          else overage++
          netQtyVar += v
          costVar += v * row.unitPrice
          retailVar += v * row.sellingPrice
        }
        return {
          total: ledger.data.length,
          balanced,
          shortage,
          overage,
          netQtyVar,
          costVar: Math.round(costVar * 100) / 100,
          retailVar: Math.round(retailVar * 100) / 100,
        }
      })()
    : { total: 0, balanced: 0, shortage: 0, overage: 0, netQtyVar: 0, costVar: 0, retailVar: 0 }

  const handleSubmitSettlement = async () => {
    if (!ledger?.data) return
    const items = ledger.data.map((row) => {
      const key = row.groupId || String(row.productId)
      const expected = row.calculatedExpected
      const physical = physicalCounts[key] !== undefined ? physicalCounts[key] : expected
      return {
        productId: row.productId,
        productIds: row.productIds || [row.productId],
        expectedQty: expected,
        physicalCount: physical,
        unitPrice: row.unitPrice,
        sellingPrice: row.sellingPrice,
        reason: physical < expected ? "Shortage Discrepancy" : physical > expected ? "Overage Discrepancy" : "Balanced",
        notes: reconciliationNotes,
      }
    })

    try {
      const res = await submitPhysicalReconciliation({
        location: "dispensary",
        reconciliationNotes,
        adjustSystemStock,
        items,
      }).unwrap()

      setSubmitMessage(res.message)
      setIsSettlementOpen(false)
    } catch (err: any) {
      alert(err?.data?.message || err?.message || "Failed to submit physical count reconciliation")
    }
  }

  return (
    <div className="mt-8 space-y-4">
      {submitMessage && (
        <div className="flex items-center justify-between rounded-card border border-mint/30 bg-mint/10 p-3 text-xs text-mint">
          <span>{submitMessage}</span>
          <button type="button" onClick={() => setSubmitMessage(null)} className="font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-micro uppercase tracking-wider text-ink-muted">
            Advanced Movement & Physical Count Verification
          </p>
          <h2 className="font-heading text-lg font-bold text-ink">
            Dispensary Stock Ledger & Interval Reconciliation
          </h2>
          <p className="text-xs text-ink-muted">
            Select date interval above, verify physical counts against system calculated stock, and settle inventory adjustments.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Selector */}
          <div className="flex items-center rounded-card border border-mist bg-paper-sunken p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setViewMode("quantity")}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewMode === "quantity"
                  ? "bg-paper-raised text-ink font-bold shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              📦 Quantity
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cost")}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewMode === "cost"
                  ? "bg-paper-raised text-ink font-bold shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              💵 Cost ($)
            </button>
            <button
              type="button"
              onClick={() => setViewMode("retail")}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewMode === "retail"
                  ? "bg-paper-raised text-ink font-bold shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              🏷️ Retail ($)
            </button>
            <button
              type="button"
              onClick={() => setViewMode("total")}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewMode === "total"
                  ? "bg-paper-raised text-ink font-bold shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              💰 Profit & Total
            </button>
            <button
              type="button"
              onClick={() => setViewMode("physical")}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewMode === "physical"
                  ? "bg-mint text-paper-white font-bold shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              📋 Physical Audit
            </button>
          </div>

          <Input
            wrapperClassName="w-full sm:w-56"
            placeholder="Search product name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      {/* Physical Audit Mode Action Bar */}
      {viewMode === "physical" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-mist bg-paper-sunken p-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-ink">Physical Audit Mode:</span>
            <span className="text-ink-muted">
              {auditStats.balanced} Balanced ·{" "}
              <span className={auditStats.shortage > 0 ? "font-bold text-alert" : ""}>
                {auditStats.shortage} Shortage
              </span>{" "}
              ·{" "}
              <span className={auditStats.overage > 0 ? "font-bold text-rx-amber-deep" : ""}>
                {auditStats.overage} Overage
              </span>{" "}
              · Net Cost Variance:{" "}
              <strong className={auditStats.costVar < 0 ? "text-alert" : auditStats.costVar > 0 ? "text-rx-amber-deep" : "text-mint"}>
                {money(auditStats.costVar)}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleAutoFill}>
              Pre-fill System Counts
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setOnlyDiscrepancies(!onlyDiscrepancies)}
              className={onlyDiscrepancies ? "bg-paper-raised font-bold text-ink" : ""}
            >
              {onlyDiscrepancies ? "Showing Discrepancies" : "Show All Products"}
            </Button>
            <Button size="sm" onClick={() => setIsSettlementOpen(true)}>
              Submit & Settle Stock
            </Button>
          </div>
        </div>
      )}

      {/* Movement Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard
          label="Opening Stock"
          value={quantity(summary?.openingStockQty)}
          hint={money(summary?.openingCostValuation ?? 0)}
          loading={isFetching}
        />
        <StatCard
          label="Issued (+)"
          value={quantity(summary?.totalIssuedQty)}
          tone="good"
          loading={isFetching}
        />
        <StatCard
          label="Returned (-)"
          value={quantity(summary?.totalReturnedQty)}
          tone="warn"
          loading={isFetching}
        />
        <StatCard
          label="Gross Sales (-)"
          value={quantity(summary?.totalSoldQty)}
          loading={isFetching}
        />
        <StatCard
          label="Refunds (+)"
          value={quantity(summary?.totalRefundedQty)}
          tone="good"
          loading={isFetching}
        />
        <StatCard
          label="Manual Adj (+/-)"
          value={quantity((summary?.totalAddedQty ?? 0) - (summary?.totalDeductedQty ?? 0))}
          loading={isFetching}
        />
        <StatCard
          label="Closing Stock"
          value={quantity(summary?.closingStockQty)}
          hint={`Retail ${money(summary?.closingRetailValuation ?? 0)}`}
          tone="good"
          loading={isFetching}
        />
      </div>

      <LabelCard
        perforated
        eyebrow="Grouped Product Ledger"
        title={`Movement Breakdown (${viewMode.toUpperCase()} MODE)`}
        bodyClassName="px-0 py-0"
      >
        <Table
          rows={displayRows}
          rowKey={(row) => row.groupId || String(row.productId)}
          loading={isFetching}
          onRowClick={(row) => setSelectedProduct(row)}
          empty={{ title: viewMode === "physical" ? "No discrepancy entries found" : "No ledger entries found" }}
          columns={
            viewMode === "physical"
              ? [
                  {
                    key: "product",
                    header: "Product Identity",
                    render: (row) => (
                      <div className="min-w-0 cursor-pointer">
                        <p className="truncate font-medium text-ink hover:underline">
                          {row.name}
                        </p>
                        <p className="truncate font-mono text-micro uppercase tracking-wider text-ink-muted">
                          {row.brand || "Generic"} · {row.batchCount} batch(es)
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: "expected",
                    header: "System Expected Qty",
                    numeric: true,
                    render: (row) => (
                      <span className="font-mono font-semibold text-ink">
                        {quantity(row.calculatedExpected)}
                      </span>
                    ),
                  },
                  {
                    key: "physical",
                    header: "Physical Count",
                    numeric: true,
                    render: (row) => {
                      const key = row.groupId || String(row.productId)
                      const val = physicalCounts[key] !== undefined ? physicalCounts[key] : row.calculatedExpected
                      return (
                        <div onClick={(e) => e.stopPropagation()}>
                          <Input
                            type="number"
                            min="0"
                            wrapperClassName="w-24 ml-auto text-right"
                            className="text-right font-mono font-bold"
                            value={String(val)}
                            onChange={(e) => {
                              const num = parseFloat(e.target.value) || 0
                              setPhysicalCounts((prev) => ({ ...prev, [key]: num }))
                            }}
                          />
                        </div>
                      )
                    },
                  },
                  {
                    key: "variance",
                    header: "Variance",
                    numeric: true,
                    render: (row) => {
                      const key = row.groupId || String(row.productId)
                      const expected = row.calculatedExpected
                      const physical = physicalCounts[key] !== undefined ? physicalCounts[key] : expected
                      const v = physical - expected
                      return (
                        <span
                          className={
                            v === 0
                              ? "font-mono text-mint"
                              : v < 0
                              ? "font-mono font-bold text-alert"
                              : "font-mono font-bold text-rx-amber-deep"
                          }
                        >
                          {v === 0 ? "0 (Matched)" : v > 0 ? `+${v}` : String(v)}
                        </span>
                      )
                    },
                  },
                  {
                    key: "costVariance",
                    header: "Cost Variance ($)",
                    numeric: true,
                    render: (row) => {
                      const key = row.groupId || String(row.productId)
                      const expected = row.calculatedExpected
                      const physical = physicalCounts[key] !== undefined ? physicalCounts[key] : expected
                      const v = physical - expected
                      const costV = v * row.unitPrice
                      return (
                        <span className={costV < 0 ? "font-mono text-alert" : costV > 0 ? "font-mono text-rx-amber-deep" : "font-mono text-ink-muted"}>
                          {money(costV)}
                        </span>
                      )
                    },
                  },
                  {
                    key: "retailVariance",
                    header: "Retail Variance ($)",
                    numeric: true,
                    render: (row) => {
                      const key = row.groupId || String(row.productId)
                      const expected = row.calculatedExpected
                      const physical = physicalCounts[key] !== undefined ? physicalCounts[key] : expected
                      const v = physical - expected
                      const retV = v * row.sellingPrice
                      return (
                        <span className={retV < 0 ? "font-mono text-alert font-semibold" : retV > 0 ? "font-mono text-rx-amber-deep font-semibold" : "font-mono text-ink-muted"}>
                          {money(retV)}
                        </span>
                      )
                    },
                  },
                ]
              : viewMode === "quantity"
              ? [
                  {
                    key: "product",
                    header: "Product Identity",
                    render: (row) => (
                      <div className="min-w-0 cursor-pointer">
                        <p className="truncate font-medium text-ink hover:underline">
                          {row.name}
                        </p>
                        <p className="truncate font-mono text-micro uppercase tracking-wider text-ink-muted">
                          {row.brand || "Generic"} ·{" "}
                          <span className="text-mint font-semibold">
                            {row.batchCount} batch(es)
                          </span>
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: "opening",
                    header: "Opening Qty",
                    numeric: true,
                    secondary: true,
                    render: (row) => quantity(row.openingStock),
                  },
                  {
                    key: "issued",
                    header: "Issued (+)",
                    numeric: true,
                    render: (row) => (
                      <span
                        className={
                          row.issuedToDispensary > 0
                            ? "font-semibold text-mint"
                            : "text-ink-muted"
                        }
                      >
                        {quantity(row.issuedToDispensary)}
                      </span>
                    ),
                  },
                  {
                    key: "returned",
                    header: "Returned (-)",
                    numeric: true,
                    render: (row) => (
                      <span
                        className={
                          row.returnedToStore > 0
                            ? "font-semibold text-rx-amber-deep"
                            : "text-ink-muted"
                        }
                      >
                        {quantity(row.returnedToStore)}
                      </span>
                    ),
                  },
                  {
                    key: "sold",
                    header: "Sold (-)",
                    numeric: true,
                    render: (row) => (
                      <span
                        className={
                          row.sold > 0 ? "font-medium text-ink" : "text-ink-muted"
                        }
                      >
                        {quantity(row.sold)}
                      </span>
                    ),
                  },
                  {
                    key: "refunded",
                    header: "Refunded (+)",
                    numeric: true,
                    render: (row) => (
                      <span
                        className={
                          row.refunded > 0
                            ? "font-semibold text-mint"
                            : "text-ink-muted"
                        }
                      >
                        {quantity(row.refunded)}
                      </span>
                    ),
                  },
                  {
                    key: "adjusted",
                    header: "Net Adj (+/-)",
                    numeric: true,
                    secondary: true,
                    render: (row) => {
                      const netAdj =
                        row.manualAdded - row.manualDeducted + row.adjusted
                      return (
                        <span
                          className={
                            netAdj !== 0 ? "font-semibold text-ink" : "text-ink-muted"
                          }
                        >
                          {netAdj > 0 ? `+${netAdj}` : netAdj}
                        </span>
                      )
                    },
                  },
                  {
                    key: "closing",
                    header: "Closing Qty",
                    numeric: true,
                    render: (row) => (
                      <span className="font-bold text-ink">
                        {quantity(row.closingStock)}
                      </span>
                    ),
                  },
                  {
                    key: "current",
                    header: "Live Stock",
                    numeric: true,
                    render: (row) => (
                      <span className="font-mono text-ink">
                        {quantity(row.currentStock)}
                      </span>
                    ),
                  },
                  {
                    key: "variance",
                    header: "Variance",
                    numeric: true,
                    render: (row) => {
                      const varVal = row.variance
                      return (
                        <span
                          className={
                            Math.abs(varVal) < 0.01
                              ? "font-mono text-mint"
                              : varVal < 0
                              ? "font-mono font-semibold text-alert"
                              : "font-mono font-semibold text-rx-amber-deep"
                          }
                        >
                          {varVal === 0
                            ? "0"
                            : varVal > 0
                            ? `+${varVal}`
                            : String(varVal)}
                        </span>
                      )
                    },
                  },
                ]
              : viewMode === "cost"
              ? [
                  {
                    key: "product",
                    header: "Product Identity",
                    render: (row) => (
                      <div className="min-w-0 cursor-pointer">
                        <p className="truncate font-medium text-ink hover:underline">
                          {row.name}
                        </p>
                        <p className="truncate font-mono text-micro uppercase tracking-wider text-ink-muted">
                          {row.brand || "Generic"} · Unit Cost {money(row.unitPrice)}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: "openingCost",
                    header: "Opening Cost",
                    numeric: true,
                    render: (row) => money(row.openingCostValue),
                  },
                  {
                    key: "issuedCost",
                    header: "Issued Cost (+)",
                    numeric: true,
                    render: (row) => (
                      <span className="text-mint font-medium">
                        {money(row.issuedToDispensary * row.unitPrice)}
                      </span>
                    ),
                  },
                  {
                    key: "returnedCost",
                    header: "Returned Cost (-)",
                    numeric: true,
                    render: (row) => (
                      <span className="text-rx-amber-deep font-medium">
                        {money(row.returnedToStore * row.unitPrice)}
                      </span>
                    ),
                  },
                  {
                    key: "soldCost",
                    header: "Sold Cost (-)",
                    numeric: true,
                    render: (row) => money(row.sold * row.unitPrice),
                  },
                  {
                    key: "refundedCost",
                    header: "Refunded Cost (+)",
                    numeric: true,
                    render: (row) => (
                      <span className="text-mint font-medium">
                        {money(row.refunded * row.unitPrice)}
                      </span>
                    ),
                  },
                  {
                    key: "closingCost",
                    header: "Closing Cost Value",
                    numeric: true,
                    render: (row) => (
                      <span className="font-bold text-ink">
                        {money(row.closingCostValue)}
                      </span>
                    ),
                  },
                ]
              : viewMode === "retail"
              ? [
                  {
                    key: "product",
                    header: "Product Identity",
                    render: (row) => (
                      <div className="min-w-0 cursor-pointer">
                        <p className="truncate font-medium text-ink hover:underline">
                          {row.name}
                        </p>
                        <p className="truncate font-mono text-micro uppercase tracking-wider text-ink-muted">
                          {row.brand || "Generic"} · Retail Price {money(row.sellingPrice)}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: "openingRetail",
                    header: "Opening Retail",
                    numeric: true,
                    render: (row) => money(row.openingRetailValue),
                  },
                  {
                    key: "issuedRetail",
                    header: "Issued Retail (+)",
                    numeric: true,
                    render: (row) => (
                      <span className="text-mint font-medium">
                        {money(row.issuedToDispensary * row.sellingPrice)}
                      </span>
                    ),
                  },
                  {
                    key: "returnedRetail",
                    header: "Returned Retail (-)",
                    numeric: true,
                    render: (row) => (
                      <span className="text-rx-amber-deep font-medium">
                        {money(row.returnedToStore * row.sellingPrice)}
                      </span>
                    ),
                  },
                  {
                    key: "soldRetail",
                    header: "Sold Sales Revenue",
                    numeric: true,
                    render: (row) => (
                      <span className="font-bold text-ink">
                        {money(row.sold * row.sellingPrice)}
                      </span>
                    ),
                  },
                  {
                    key: "closingRetail",
                    header: "Closing Retail Value",
                    numeric: true,
                    render: (row) => (
                      <span className="font-bold text-ink">
                        {money(row.closingRetailValue)}
                      </span>
                    ),
                  },
                ]
              : [
                  {
                    key: "product",
                    header: "Product Identity",
                    render: (row) => (
                      <div className="min-w-0 cursor-pointer">
                        <p className="truncate font-medium text-ink hover:underline">
                          {row.name}
                        </p>
                        <p className="truncate font-mono text-micro uppercase tracking-wider text-ink-muted">
                          {row.brand || "Generic"} · {row.batchCount} batch(es)
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: "costVal",
                    header: "Cost Valuation",
                    numeric: true,
                    secondary: true,
                    render: (row) => money(row.closingCostValue),
                  },
                  {
                    key: "retailVal",
                    header: "Retail Valuation",
                    numeric: true,
                    render: (row) => money(row.closingRetailValue),
                  },
                  {
                    key: "salesRev",
                    header: "Period Sales Rev",
                    numeric: true,
                    render: (row) => (
                      <span className="font-mono text-ink">
                        {money(row.sold * row.sellingPrice)}
                      </span>
                    ),
                  },
                  {
                    key: "profit",
                    header: "Potential Profit",
                    numeric: true,
                    render: (row) => (
                      <span className="font-bold text-mint">
                        {money(row.potentialProfit)}
                      </span>
                    ),
                  },
                  {
                    key: "margin",
                    header: "Margin %",
                    numeric: true,
                    render: (row) => {
                      const m =
                        row.closingRetailValue > 0
                          ? ((row.potentialProfit / row.closingRetailValue) * 100).toFixed(1)
                          : "0.0"
                      return <span className="font-mono font-semibold text-ink">{m}%</span>
                    },
                  },
                ]
          }
        />

        {ledger && (
          <div className="px-4 pb-4">
            <Pagination
              page={ledger.page}
              totalPages={ledger.totalPages}
              total={ledger.total}
              limit={ledger.limit}
              onPageChange={setPage}
            />
          </div>
        )}
      </LabelCard>

      <ProductAuditDialog
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      {/* Physical Settlement Dialog */}
      <Dialog
        open={isSettlementOpen}
        onClose={() => setIsSettlementOpen(false)}
        eyebrow="Physical Stock Count Settlement"
        title="Submit Physical Audit & Reconcile"
        description="Review physical count verification summary and submit inventory adjustments to the system database."
        width="max-w-xl"
      >
        <div className="space-y-4 text-xs">
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 rounded-card border border-mist bg-paper-sunken p-3">
            <div>
              <p className="text-micro text-ink-muted">Inspected Items</p>
              <p className="font-mono text-sm font-bold text-ink">{auditStats.total}</p>
            </div>
            <div>
              <p className="text-micro text-mint font-semibold">Matched</p>
              <p className="font-mono text-sm font-bold text-mint">{auditStats.balanced}</p>
            </div>
            <div>
              <p className="text-micro text-alert font-semibold">Shortages</p>
              <p className="font-mono text-sm font-bold text-alert">{auditStats.shortage}</p>
            </div>
            <div>
              <p className="text-micro text-rx-amber-deep font-semibold">Overages</p>
              <p className="font-mono text-sm font-bold text-rx-amber-deep">{auditStats.overage}</p>
            </div>
          </div>

          <div className="rounded-card border border-mist bg-paper p-3 font-mono space-y-1">
            <div className="flex justify-between">
              <span className="text-ink-muted">Net Quantity Discrepancy:</span>
              <strong className={auditStats.netQtyVar < 0 ? "text-alert" : auditStats.netQtyVar > 0 ? "text-rx-amber-deep" : "text-mint"}>
                {auditStats.netQtyVar > 0 ? `+${auditStats.netQtyVar}` : auditStats.netQtyVar} units
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Net Cost Valuation Variance:</span>
              <strong className={auditStats.costVar < 0 ? "text-alert" : auditStats.costVar > 0 ? "text-rx-amber-deep" : "text-mint"}>
                {money(auditStats.costVar)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Net Retail Valuation Variance:</span>
              <strong className={auditStats.retailVar < 0 ? "text-alert" : auditStats.retailVar > 0 ? "text-rx-amber-deep" : "text-mint"}>
                {money(auditStats.retailVar)}
              </strong>
            </div>
          </div>

          <div>
            <label className="block mb-1 text-ink-muted font-medium">Reconciliation Notes & Discrepancy Reason:</label>
            <textarea
              className="w-full rounded-card border border-mist bg-paper p-2.5 text-xs text-ink focus:border-mint focus:outline-none"
              rows={3}
              placeholder="E.g. Monthly Physical Count Audit by Inventory Manager. 3 damaged bottles found..."
              value={reconciliationNotes}
              onChange={(e) => setReconciliationNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="adjustStockChk"
              checked={adjustSystemStock}
              onChange={(e) => setAdjustSystemStock(e.target.checked)}
              className="rounded border-mist text-mint focus:ring-mint"
            />
            <label htmlFor="adjustStockChk" className="text-ink cursor-pointer">
              Automatically adjust live database stock quantities to match physical counts
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsSettlementOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitSettlement} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Confirm & Settle Stock"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

function ProductAuditDialog({
  product,
  onClose,
}: {
  product: DispensaryLedgerRow | null
  onClose: () => void
}) {
  const productId = product?.productId
  const productIds = product?.productIds?.join(",")

  const { data: historyData, isFetching } = useGetInventoryHistoryQuery(
    { id: productId!, productIds, limit: 100 },
    { skip: !product || !productId }
  )

  if (!product) return null

  return (
    <Dialog
      open={Boolean(product)}
      onClose={onClose}
      eyebrow="Product Movement Audit"
      title={product.name}
      description={`${product.brand || "Generic"} · ${product.batchCount} batch(es) aggregated`}
      width="max-w-3xl"
    >
      <div className="space-y-5">
        {/* Batches Overview */}
        <div>
          <h3 className="mb-2 font-mono text-micro uppercase tracking-wider text-ink-muted">
            Aggregated Batches ({product.batches.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {product.batches.map((b) => (
              <div
                key={b.id}
                className="flex flex-col rounded-card border border-mist bg-paper-sunken p-3 text-xs"
              >
                <div className="flex items-center justify-between font-mono font-semibold text-ink">
                  <span>Batch: {b.batchNo}</span>
                  <span className="text-mint">{quantity(b.quantity)} units</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-ink-muted">
                  <span>Exp: {formatDate(b.expiryDate)}</span>
                  <span>Cost {money(b.unitPrice)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Movement Summary Cards */}
        <div>
          <h3 className="mb-2 font-mono text-micro uppercase tracking-wider text-ink-muted">
            Interval Movement Breakdown
          </h3>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
            <div className="rounded-card border border-mist bg-paper-sunken p-2.5">
              <p className="text-micro text-ink-muted">Opening Stock</p>
              <p className="font-mono text-sm font-bold text-ink">{quantity(product.openingStock)}</p>
              <p className="text-micro text-ink-muted">{money(product.openingCostValue)}</p>
            </div>
            <div className="rounded-card border border-mist bg-paper-sunken p-2.5">
              <p className="text-micro text-mint font-semibold">Total Inflows (+)</p>
              <p className="font-mono text-sm font-bold text-mint">
                +{quantity(product.issuedToDispensary + product.refunded + product.manualAdded)}
              </p>
              <p className="text-micro text-ink-muted">Issues, Refunds & Adds</p>
            </div>
            <div className="rounded-card border border-mist bg-paper-sunken p-2.5">
              <p className="text-micro text-alert font-semibold">Total Outflows (-)</p>
              <p className="font-mono text-sm font-bold text-alert">
                -{quantity(product.returnedToStore + product.sold + product.manualDeducted)}
              </p>
              <p className="text-micro text-ink-muted">Sales, Returns & Writes</p>
            </div>
            <div className="rounded-card border border-mist bg-paper-sunken p-2.5">
              <p className="text-micro text-ink font-semibold">Closing Stock</p>
              <p className="font-mono text-sm font-bold text-ink">{quantity(product.closingStock)}</p>
              <p className="text-micro text-ink-muted">{money(product.closingRetailValue)}</p>
            </div>
          </div>
        </div>

        {/* Event History Timeline */}
        <div>
          <h3 className="mb-2 font-mono text-micro uppercase tracking-wider text-ink-muted">
            Chronological Audit History
          </h3>

          {isFetching ? (
            <div className="py-6 text-center text-xs text-ink-muted">Loading audit events...</div>
          ) : !historyData?.history.length ? (
            <div className="py-6 text-center text-xs text-ink-muted">No movement events logged for this product identity.</div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {historyData.history.map((ev, idx) => {
                const isPositive =
                  ev.action === "ISSUE_TO_DISPENSARY" ||
                  ev.action === "REFUND" ||
                  ev.action === "QUANTITY_ADDED"
                const isNegative =
                  ev.action === "RETURN_TO_STORE" ||
                  ev.action === "SALE" ||
                  ev.action === "QUANTITY_DEDUCTED"

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-card border border-mist bg-paper p-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-micro uppercase font-bold px-1.5 py-0.5 rounded ${
                            isPositive
                              ? "bg-mint/10 text-mint"
                              : isNegative
                              ? "bg-alert/10 text-alert"
                              : "bg-mist text-ink-muted"
                          }`}
                        >
                          {ev.action}
                        </span>
                        <span className="font-mono text-ink-muted">Batch {ev.batchNo || "N/A"}</span>
                      </div>
                      <p className="mt-1 text-micro text-ink-muted">
                        {formatDate(ev.date)} · Performed by <strong className="text-ink">{ev.user || "System"}</strong>
                      </p>
                    </div>

                    <div className="text-right">
                      <p
                        className={`font-mono font-bold text-sm ${
                          isPositive
                            ? "text-mint"
                            : isNegative
                            ? "text-alert"
                            : "text-ink"
                        }`}
                      >
                        {isPositive ? `+${ev.quantity}` : isNegative ? `-${ev.quantity}` : ev.quantity}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  )
}
