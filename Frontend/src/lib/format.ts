const CURRENCY = import.meta.env.VITE_CURRENCY || "ETB"

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

/** Money, always with the currency suffix so no screen invents its own symbol. */
export function money(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return `0.00 ${CURRENCY}`
  return `${numberFormatter.format(value)} ${CURRENCY}`
}

export function compactMoney(value: number | null | undefined): string {
  if (!value) return `0 ${CURRENCY}`
  return `${compactFormatter.format(value)} ${CURRENCY}`
}

export function quantity(value: number | null | undefined): string {
  if (value === null || value === undefined) return "0"
  return new Intl.NumberFormat("en-US").format(value)
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—"
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—"
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** ISO date string suitable for an <input type="date">. */
export function toDateInput(value: string | Date | null | undefined): string {
  if (!value) return ""
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

export function daysUntil(value: string | Date | null | undefined): number | null {
  if (!value) return null
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((date.getTime() - today.getTime()) / 86_400_000)
}

/** Short, human relative time for activity feeds. */
export function relativeTime(value: string | Date | null | undefined): string {
  if (!value) return "—"
  const date = typeof value === "string" ? new Date(value) : value
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000)
  const thresholds: [Intl.RelativeTimeFormatUnit, number][] = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 7],
    ["week", 4.34524],
    ["month", 12],
    ["year", Number.POSITIVE_INFINITY],
  ]

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
  let duration = diffSeconds
  for (const [unit, amount] of thresholds) {
    if (Math.abs(duration) < amount) return formatter.format(Math.round(duration), unit)
    duration /= amount
  }
  return formatter.format(Math.round(duration), "year")
}

export function initials(name: string | undefined): string {
  if (!name) return "?"
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("")
}
