import type { ReactNode } from "react"
import { cn } from "@/lib/cn"
import type { PaymentStatus, SaleStatus, StockStatus, UserStatus } from "@/types"

export type BadgeTone = "neutral" | "good" | "warn" | "bad" | "info"

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-paper-sunken text-ink-muted border-mist-deep",
  good: "bg-mint-soft text-mint border-mint/30",
  warn: "bg-rx-amber-soft text-rx-amber-deep border-rx-amber/30",
  bad: "bg-alert-soft text-alert border-alert/30",
  info: "bg-paper-sunken text-ink border-ink/15",
}

export interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  className?: string
  /** Adds a leading dot — useful for live/queued states. */
  dot?: boolean
}

export function Badge({ tone = "neutral", children, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-label border px-2 py-0.5",
        "font-mono text-micro uppercase tracking-wider",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  )
}

const STOCK_TONES: Record<StockStatus, BadgeTone> = {
  "In Stock": "good",
  "Low Stock": "warn",
  "Sold Out": "neutral",
  Expired: "bad",
}

export function StockBadge({ status }: { status: StockStatus }) {
  return <Badge tone={STOCK_TONES[status] ?? "neutral"}>{status}</Badge>
}

const SALE_TONES: Record<SaleStatus, BadgeTone> = {
  pending: "warn",
  completed: "good",
  aborted: "neutral",
  credit: "info",
  partial: "warn",
  refunded: "bad",
}

export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  return <Badge tone={SALE_TONES[status] ?? "neutral"}>{status}</Badge>
}

const PAYMENT_TONES: Record<PaymentStatus, BadgeTone> = {
  paid: "good",
  partial: "warn",
  credit: "info",
  pending: "neutral",
  overdue: "bad",
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={PAYMENT_TONES[status] ?? "neutral"}>{status}</Badge>
}

const USER_TONES: Record<UserStatus, BadgeTone> = {
  approved: "good",
  pending: "warn",
  rejected: "bad",
  suspended: "bad",
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <Badge tone={USER_TONES[status] ?? "neutral"}>{status}</Badge>
}
