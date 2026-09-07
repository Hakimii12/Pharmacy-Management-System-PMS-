import { forwardRef, type ButtonHTMLAttributes } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/cn"

type Variant = "primary" | "secondary" | "ghost" | "danger" | "quiet"
type Size = "sm" | "md" | "lg"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink-soft active:bg-ink shadow-card",
  secondary: "bg-rx-amber text-white hover:bg-rx-amber-deep active:bg-rx-amber-deep shadow-card",
  ghost: "bg-transparent text-ink border border-mist-deep hover:bg-paper-sunken",
  danger: "bg-alert text-white hover:brightness-95 active:brightness-90 shadow-card",
  quiet: "bg-transparent text-ink-muted hover:text-ink hover:bg-paper-sunken",
}

const SIZES: Record<Size, string> = {
  // Generous hit areas: this is used at a counter, often one-handed.
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-14 px-6 text-base gap-2.5",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, fullWidth, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-label font-medium",
        "transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})
