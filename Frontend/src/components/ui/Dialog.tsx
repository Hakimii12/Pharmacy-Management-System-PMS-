import { useEffect, type ReactNode } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/cn"
import { Button } from "./Button"

export function Dialog({
  open,
  onClose,
  eyebrow,
  title,
  description,
  footer,
  width = "max-w-md",
  children,
}: {
  open: boolean
  onClose: () => void
  eyebrow?: string
  title: string
  description?: string
  footer?: ReactNode
  width?: string
  children?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 p-2 sm:p-4 flex min-h-full items-start sm:items-center justify-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "w-full my-auto flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2.5rem)] animate-fade-in rounded-label border border-mist bg-paper-raised shadow-raised overflow-hidden",
          width,
        )}
      >
        <header className="shrink-0 flex items-start justify-between gap-3 border-b border-mist px-4 sm:px-5 py-3.5 sm:py-4 bg-paper-raised">
          <div className="min-w-0 pr-2">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 className="font-display text-base sm:text-lg font-semibold text-ink truncate">{title}</h2>
            {description && (
              <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-ink-muted leading-relaxed line-clamp-2 sm:line-clamp-none">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-label p-1 text-ink-muted hover:bg-paper-sunken hover:text-ink transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        {children && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 overscroll-contain">
            {children}
          </div>
        )}

        {footer && (
          <footer className="shrink-0 flex flex-wrap justify-end gap-2 border-t border-mist px-4 sm:px-5 py-3 bg-paper-raised">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "primary",
  loading,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmLabel?: string
  tone?: "primary" | "danger"
  loading?: boolean
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  )
}
