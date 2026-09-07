import { useState } from "react"
import { AlertTriangle, CalendarClock, CheckCheck, PackageX, Trash2, TrendingDown } from "lucide-react"

import {
  useDeleteNotificationMutation,
  useGetLowStockQuery,
  useGetNearExpiryQuery,
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@/api/notificationApi"
import { useAuth } from "@/hooks/useAuth"
import { errorMessage, useToast } from "@/hooks/useToast"
import { MANAGER_ROLES } from "@/features/auth/authSlice"
import { formatDate, quantity, relativeTime } from "@/lib/format"
import { cn } from "@/lib/cn"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { LabelCard } from "@/components/ui/LabelCard"
import { PageHeader } from "@/components/ui/PageHeader"
import { Pagination, Table } from "@/components/ui/Table"
import type { NotificationType } from "@/types"

const TYPE_META: Record<NotificationType, { icon: typeof AlertTriangle; tone: "warn" | "bad" | "neutral" }> = {
  Expired: { icon: AlertTriangle, tone: "bad" },
  OutOfStock: { icon: PackageX, tone: "bad" },
  NearExpiry: { icon: CalendarClock, tone: "warn" },
  LowStock: { icon: TrendingDown, tone: "warn" },
}

export default function NotificationsPage() {
  const toast = useToast()
  const { can } = useAuth()
  const isManager = can(...MANAGER_ROLES)

  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)

  const { data, isFetching } = useGetNotificationsQuery({
    page,
    limit: 25,
    read: unreadOnly ? "false" : undefined,
  })
  const { data: lowStock } = useGetLowStockQuery({ limit: 10 })
  const { data: nearExpiry } = useGetNearExpiryQuery({ limit: 10 })

  const [markRead] = useMarkNotificationReadMutation()
  const [markAllRead, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation()
  const [deleteNotification] = useDeleteNotificationMutation()

  const handleMarkAll = async () => {
    try {
      await markAllRead().unwrap()
      toast("success", "All caught up")
    } catch (error) {
      toast("error", "Could not update", errorMessage(error))
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Alerts"
        title="Notifications"
        description="Expiry and stock-level warnings raised automatically as inventory changes."
        action={
          <>
            <label className="flex h-11 cursor-pointer items-center gap-2 rounded-label border border-mist-deep bg-paper-raised px-3 text-sm">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(event) => {
                  setUnreadOnly(event.target.checked)
                  setPage(1)
                }}
                className="h-4 w-4 accent-ink"
              />
              Unread only
            </label>
            <Button variant="ghost" onClick={handleMarkAll} loading={markingAll}>
              <CheckCheck className="h-4 w-4" aria-hidden />
              Mark all read
            </Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <LabelCard
          perforated
          eyebrow={data?.unreadCount ? `${data.unreadCount} unread` : "All read"}
          title="Alert feed"
          bodyClassName="px-0 py-0"
        >
          {isFetching && !data ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse-soft rounded-label bg-paper-sunken" />
              ))}
            </div>
          ) : data?.data.length === 0 ? (
            <p className="py-16 text-center text-sm text-ink-muted">
              {unreadOnly ? "No unread alerts." : "No alerts have been raised."}
            </p>
          ) : (
            <ul className="divide-y divide-mist">
              {data?.data.map((notification) => {
                const meta = TYPE_META[notification.type] ?? TYPE_META.LowStock
                const Icon = meta.icon

                return (
                  <li
                    key={notification._id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 transition-colors",
                      !notification.read && "bg-rx-amber-soft/30",
                    )}
                  >
                    <Icon
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        meta.tone === "bad" ? "text-alert" : "text-rx-amber",
                      )}
                      aria-hidden
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">{notification.message}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-micro uppercase tracking-wider text-ink-muted">
                        <span>{relativeTime(notification.createdAt)}</span>
                        <Badge tone={meta.tone}>{notification.location}</Badge>
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {!notification.read && (
                        <button
                          type="button"
                          onClick={() => void markRead(notification._id)}
                          className="rounded-label p-1.5 text-ink-muted hover:bg-paper-sunken hover:text-ink"
                          aria-label="Mark as read"
                        >
                          <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      )}
                      {isManager && (
                        <button
                          type="button"
                          onClick={() => void deleteNotification(notification._id)}
                          className="rounded-label p-1.5 text-ink-muted hover:bg-alert-soft hover:text-alert"
                          aria-label="Delete notification"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      )}
                    </div>
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
              />
            </div>
          )}
        </LabelCard>

        <div className="space-y-5">
          <LabelCard eyebrow="Threshold" title="Running low" bodyClassName="px-0 py-0">
            <Table
              rows={lowStock?.data ?? []}
              rowKey={(row) => row.productId}
              empty={{ title: "Nothing below threshold" }}
              columns={[
                {
                  key: "name",
                  header: "Product",
                  render: (row) => (
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{row.name}</p>
                      <p className="truncate font-mono text-micro uppercase tracking-wider text-ink-muted">
                        {row.brand || "—"}
                      </p>
                    </div>
                  ),
                },
                {
                  key: "qty",
                  header: "On hand",
                  numeric: true,
                  render: (row) => (
                    <Badge tone="warn">
                      {quantity(row.quantity)} / {quantity(row.threshold)}
                    </Badge>
                  ),
                },
              ]}
            />
          </LabelCard>

          <LabelCard eyebrow="Expiry" title="Nearing expiry" bodyClassName="px-0 py-0">
            <Table
              rows={nearExpiry?.data ?? []}
              rowKey={(row) => row.productId}
              empty={{ title: "No batches expiring soon" }}
              columns={[
                {
                  key: "name",
                  header: "Batch",
                  render: (row) => (
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{row.name}</p>
                      <p className="truncate font-mono text-micro uppercase tracking-wider text-ink-muted">
                        {row.batchNo} · {formatDate(row.expiryDate)}
                      </p>
                    </div>
                  ),
                },
                {
                  key: "days",
                  header: "Left",
                  numeric: true,
                  render: (row) => (
                    <Badge tone={row.daysLeft <= 30 ? "bad" : "warn"}>{row.daysLeft}d</Badge>
                  ),
                },
              ]}
            />
          </LabelCard>
        </div>
      </div>
    </>
  )
}
