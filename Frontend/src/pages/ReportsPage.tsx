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
import { useGetDispensarySummaryQuery, useGetProfitQuery } from "@/api/inventoryApi"
import { useGetProductCountsQuery } from "@/api/productApi"
import { compactMoney, formatDate, money, quantity } from "@/lib/format"
import { Input } from "@/components/ui/Input"
import { LabelCard } from "@/components/ui/LabelCard"
import { PageHeader } from "@/components/ui/PageHeader"
import { Pagination, Table } from "@/components/ui/Table"
import { StatCard } from "@/components/ui/StatCard"

export default function ReportsPage() {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [summaryPage, setSummaryPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)

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
        description="Trading performance and the current value sitting on the dispensary shelf."
        action={
          <>
            <Input
              wrapperClassName="w-40"
              label="From"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
            <Input
              wrapperClassName="w-40"
              label="To"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </>
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
          <Table
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
