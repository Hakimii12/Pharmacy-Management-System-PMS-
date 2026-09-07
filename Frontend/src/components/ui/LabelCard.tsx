import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

export interface LabelCardProps {
  /** Small-caps eyebrow above the title, e.g. "DISPENSARY". */
  eyebrow?: string
  title?: ReactNode
  action?: ReactNode
  footer?: ReactNode
  /** Draws the punched perforation strip along the top edge. */
  perforated?: boolean
  className?: string
  bodyClassName?: string
  children?: ReactNode
}

/**
 * The core surface of the app: a dispensing-label motif.
 *
 * Squared corners, a hairline rule under the header, mono eyebrow text, and an
 * optional perforated top edge. Everything that would be a generic "card"
 * elsewhere is one of these.
 */
export function LabelCard({
  eyebrow,
  title,
  action,
  footer,
  perforated = false,
  className,
  bodyClassName,
  children,
}: LabelCardProps) {
  return (
    <section
      className={cn(
        "relative rounded-label border border-mist bg-paper-raised shadow-card",
        className,
      )}
    >
      {perforated && (
        // `text-paper` sets `currentColor`, which the gradient punches holes out of.
        <div
          aria-hidden
          className="label-perforation pointer-events-none absolute inset-x-0 -top-[5px] h-[6px] text-paper"
        />
      )}

      {(eyebrow || title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-mist px-5 py-4">
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && (
              <h2 className="truncate font-display text-lg font-semibold text-ink">{title}</h2>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}

      <div className={cn("px-5 py-4", bodyClassName)}>{children}</div>

      {footer && (
        <footer className="border-t border-dashed border-mist-deep px-5 py-3 text-sm text-ink-muted">
          {footer}
        </footer>
      )}
    </section>
  )
}
