import { Link } from "react-router-dom"
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  CircleDollarSign,
  Package,
  Receipt,
  TrendingUp,
  Warehouse,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  useGetDispensaryCountsQuery,
  useGetProductCountsQuery,
  useGetStoreCountsQuery,
} from "@/api/productApi"
import { useGetRecentSalesQuery, useGetTotalSalesQuery } from "@/api/salesApi"
import { useGetLowStockQuery, useGetNearExpiryQuery } from "@/api/notificationApi"
import { useAuth } from "@/hooks/useAuth"
import { compactMoney, formatDate, money, quantity } from "@/lib/format"
import { MANAGER_ROLES } from "@/features/auth/authSlice"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { LabelCard } from "@/components/ui/LabelCard"
import { PageHeader } from "@/components/ui/PageHeader"
import { StatCard } from "@/components/ui/StatCard"
import { Table } from "@/components/ui/Table"

export default function DashboardPage() {
  const { user, can } = useAuth()
  const isManager = can(...MANAGER_ROLES)

  const { data: counts, isLoading: countsLoading } = useGetProductCountsQuery()
  const { data: store } = useGetStoreCountsQuery()
  const { data: dispensary } = useGetDispensaryCountsQuery()
  const { data: totals, isLoading: totalsLoading } = useGetTotalSalesQuery({}, { skip: !isManager })
  const { data: recent, isLoading: recentLoading } = useGetRecentSalesQuery({ limit: 7 })
  const { data: lowStock } = useGetLowStockQuery({ limit: 5 })
  const { data: nearExpiry } = useGetNearExpiryQuery({ limit: 5 })

  const categoryData = (counts?.byCategory ?? [])
    .slice(0, 8)
    .map((entry) => ({ name: entry.category || "Uncategorised", count: entry.count }))

  return (
    <>
      <PageHeader
        eyebrow={`Signed in as ${user?.role ?? ""}`}
        title={`Good day, ${user?.name?.split(" ")[0] ?? "there"}`}
        description="Stock position, expiry exposure and today's trading at a glance."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Batches on hand"
          value={quantity(counts?.totalProducts)}
          hint={`${quantity(counts?.totalQuantity)} units total`}
          icon={Boxes}
          loading={countsLoading}
        />
        <StatCard
          label="Stock value at cost"
          value={compactMoney(counts?.totalValue)}
          hint={`Retail ${compactMoney(counts?.totalSellingValue)}`}
          icon={CircleDollarSign}
          loading={countsLoading}
        />
        <StatCard
          label="Expiring within 3 months"
          value={quantity(counts?.nearExpiry)}
          hint={counts?.expiredCount ? `${counts.expiredCount} already expired` : "No expired batches"}
          icon={CalendarClock}
          tone={counts?.nearExpiry ? "warn" : "neutral"}
          loading={countsLoading}
        />
        {isManager ? (
          <StatCard
            label="Completed sales"
            value={compactMoney(totals?.totalSales)}
            hint={`${quantity(totals?.transactionCount)} transactions`}
            icon={TrendingUp}
            tone="good"
            loading={totalsLoading}
          />
        ) : (
          <StatCard
            label="Expired batches"
            value={quantity(counts?.expiredCount)}
            hint="Remove from the shelf"
            icon={AlertTriangle}
            tone={counts?.expiredCount ? "bad" : "good"}
            loading={countsLoading}
          />
        )}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <LabelCard
          className="xl:col-span-2"
          eyebrow="Catalog"
          title="Batches by category"
          action={
            <Link to="/inventory">
              <Button variant="ghost" size="sm">
                View stock
              </Button>
            </Link>
          }
        >
          {categoryData.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink-muted">No categorised stock yet.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DCE4E2" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#5A6B80" }}
                    tickLine={false}
                    axisLine={{ stroke: "#DCE4E2" }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={56}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#5A6B80" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#EEF2EF" }}
                    contentStyle={{
                      borderRadius: 4,
                      border: "1px solid #DCE4E2",
                      fontSize: 12,
                      fontFamily: "IBM Plex Mono, monospace",
                    }}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={44}>
                    {categoryData.map((entry, index) => (
                      <Cell key={entry.name} fill={index % 2 === 0 ? "#0B1F3A" : "#B5651D"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </LabelCard>

        <div className="space-y-5">
          <LabelCard eyebrow="Locations" title="Where stock sits">
            <dl className="space-y-3">
              <LocationRow
                icon={Warehouse}
                label="Back store"
                total={store?.totalInStore}
                low={store?.lowInStore}
                expired={store?.expiredInStore}
                value={store?.totalInventoryValue}
              />
              <LocationRow
                icon={Package}
                label="Dispensary"
                total={dispensary?.totalInDispensary}
                low={dispensary?.lowInDispensary}
                expired={dispensary?.expiredInDispensary}
                value={dispensary?.totalInventoryValue}
              />
            </dl>
          </LabelCard>

          <LabelCard
            eyebrow="Attention"
            title="Running low"
            action={
              <Link to="/notifications">
                <Button variant="ghost" size="sm">
                  All alerts
                </Button>
              </Link>
            }
          >
            {lowStock?.data.length ? (
              <ul className="space-y-2">
                {lowStock.data.map((row) => (
                  <li key={row.productId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-ink">{row.name}</span>
                    <Badge tone="warn">
                      {row.quantity} / {row.threshold}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-ink-muted">Nothing below threshold.</p>
            )}
          </LabelCard>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <LabelCard eyebrow="Trading" title="Recent sales" perforated>
          <Table
            rows={recent?.sales ?? []}
            rowKey={(row, index) => `${row.productName}-${index}`}
            loading={recentLoading}
            skeletonRows={5}
            empty={{ title: "No completed sales yet" }}
            columns={[
              {
                key: "product",
                header: "Product",
                render: (row) => (
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{row.productName}</p>
                    <p className="font-mono text-micro uppercase tracking-wider text-ink-muted">
                      {row.brand || "—"}
                    </p>
                  </div>
                ),
              },
              {
                key: "date",
                header: "Sold",
                secondary: true,
                render: (row) => <span className="text-ink-muted">{formatDate(row.dateSold)}</span>,
              },
              {
                key: "amount",
                header: "Amount",
                numeric: true,
                render: (row) => money(row.saleAmount),
              },
            ]}
          />
        </LabelCard>

        <LabelCard
          eyebrow="Attention"
          title="Nearing expiry"
          perforated
          action={
            <Link to="/notifications">
              <Button variant="ghost" size="sm">
                Full list
              </Button>
            </Link>
          }
        >
          <Table
            rows={nearExpiry?.data ?? []}
            rowKey={(row) => row.productId}
            empty={{ title: "No batches expiring soon" }}
            columns={[
              {
                key: "product",
                header: "Batch",
                render: (row) => (
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{row.name}</p>
                    <p className="font-mono text-micro uppercase tracking-wider text-ink-muted">
                      {row.batchNo}
                    </p>
                  </div>
                ),
              },
              {
                key: "expiry",
                header: "Expires",
                secondary: true,
                render: (row) => (
                  <span className="text-ink-muted">{formatDate(row.expiryDate)}</span>
                ),
              },
              {
                key: "days",
                header: "Days",
                numeric: true,
                render: (row) => (
                  <Badge tone={row.daysLeft <= 30 ? "bad" : "warn"}>{row.daysLeft}d</Badge>
                ),
              },
            ]}
          />
        </LabelCard>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link to="/pos">
          <Button size="lg">
            <Receipt className="h-4 w-4" aria-hidden />
            Start a sale
          </Button>
        </Link>
        <Link to="/inventory">
          <Button size="lg" variant="ghost">
            <Boxes className="h-4 w-4" aria-hidden />
            Manage stock
          </Button>
        </Link>
      </div>
    </>
  )
}

function LocationRow({
  icon: Icon,
  label,
  total,
  low,
  expired,
  value,
}: {
  icon: typeof Warehouse
  label: string
  total?: number
  low?: number
  expired?: number
  value?: number
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-dashed border-mist pb-3 last:border-0 last:pb-0">
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-mist-deep" aria-hidden />
        <div>
          <dt className="text-sm font-medium text-ink">{label}</dt>
          <dd className="mt-0.5 flex flex-wrap gap-1.5">
            {low ? <Badge tone="warn">{low} low</Badge> : null}
            {expired ? <Badge tone="bad">{expired} expired</Badge> : null}
            {!low && !expired && <Badge tone="good">Healthy</Badge>}
          </dd>
        </div>
      </div>

      <div className="text-right">
        <p className="tabular font-mono text-sm font-semibold text-ink">{quantity(total)}</p>
        <p className="tabular font-mono text-micro uppercase tracking-wider text-ink-muted">
          {compactMoney(value)}
        </p>
      </div>
    </div>
  )
}
