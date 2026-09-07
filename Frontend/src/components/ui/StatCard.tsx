import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/cn"

export type StatTone = "neutral" | "good" | "warn" | "bad"

const TONES: Record<StatTone, string> = {
  neutral: "text-ink",
  good: "text-mint",
  warn: "text-rx-amber-deep",
  bad: "text-alert",
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  loading,
}: {
  label: string
  value: string | number
  hint?: string
  icon?: LucideIcon
  tone?: StatTone
  loading?: boolean
}) {
  return (
    <div className="rounded-label border border-mist bg-paper-raised px-4 py-3.5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="eyebrow">{label}</p>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-mist-deep" aria-hidden />}
      </div>

      {loading ? (
        <div className="mt-2 h-7 w-24 animate-pulse-soft rounded bg-paper-sunken" />
      ) : (
        <p className={cn("tabular mt-1.5 font-mono text-2xl font-semibold", TONES[tone])}>{value}</p>
      )}

      {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
    </div>
  )
}
