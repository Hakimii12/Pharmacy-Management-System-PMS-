import type { ReactNode } from "react"

/**
 * Split layout for the two unauthenticated screens.
 *
 * The left panel carries the label motif at poster scale; the right is the form.
 * On small screens the panel collapses to a slim header.
 */
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
      <aside className="relative hidden overflow-hidden bg-ink px-12 py-16 text-paper lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-label bg-paper font-display text-base font-bold text-ink"
            aria-hidden
          >
            Rx
          </span>
          <div className="leading-tight">
            <p className="font-display text-base font-semibold">Hamza Masjid</p>
            <p className="font-mono text-micro uppercase tracking-widest text-paper/60">Pharmacy</p>
          </div>
        </div>

        <div className="max-w-md">
          <p className="font-mono text-micro uppercase tracking-widest text-rx-amber-soft/70">
            Inventory · Dispensary · Point of sale
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight">
            Every batch accounted for, on or off the network.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-paper/70">
            Stock moves between the back store and the dispensary shelf, sales are prepared and
            confirmed, and the ledger stays correct even when the connection does not.
          </p>
        </div>

        {/* Perforated tear line, echoing the dispensing-label motif. */}
        <div className="flex items-center gap-4" aria-hidden>
          <div className="h-px flex-1 border-t border-dashed border-paper/25" />
          <span className="font-mono text-micro uppercase tracking-widest text-paper/40">
            Keep out of reach of children
          </span>
        </div>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-5 py-12 lg:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-label bg-ink font-display text-sm font-bold text-paper"
              aria-hidden
            >
              Rx
            </span>
            <p className="font-display text-base font-semibold">Hamza Masjid Pharmacy</p>
          </div>

          <p className="eyebrow">{eyebrow}</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-ink">{title}</h2>
          <p className="mb-8 mt-2 text-sm text-ink-muted">{subtitle}</p>

          {children}
        </div>
      </main>
    </div>
  )
}
