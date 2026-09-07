import { useEffect } from "react"
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react"

import { useAppDispatch, useAppSelector } from "@/app/hooks"
import { dismissToast, type Toast, type ToastTone } from "@/features/ui/uiSlice"
import { cn } from "@/lib/cn"

const TONE_STYLES: Record<ToastTone, string> = {
  success: "border-mint/30 bg-mint-soft text-ink",
  error: "border-alert/30 bg-alert-soft text-ink",
  warning: "border-rx-amber/30 bg-rx-amber-soft text-ink",
  info: "border-mist-deep bg-paper-raised text-ink",
}

const TONE_ICONS: Record<ToastTone, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const DURATION = 5000

function ToastRow({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch()
  const Icon = TONE_ICONS[toast.tone]

  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismissToast(toast.id)), DURATION)
    return () => clearTimeout(timer)
  }, [dispatch, toast.id])

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-label border px-4 py-3 shadow-raised",
        "animate-receipt-print",
        TONE_STYLES[toast.tone],
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-xs text-ink-muted">{toast.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => dispatch(dismissToast(toast.id))}
        className="rounded p-0.5 text-ink-muted hover:text-ink"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  )
}

export function ToastHost() {
  const toasts = useAppSelector((state) => state.ui.toasts)

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2 no-print">
      {toasts.map((toast) => (
        <ToastRow key={toast.id} toast={toast} />
      ))}
    </div>
  )
}
