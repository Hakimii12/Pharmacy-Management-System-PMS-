import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react"
import { cn } from "@/lib/cn"

const FIELD_BASE =
  "w-full rounded-label border bg-paper-raised px-3 text-ink placeholder:text-ink-muted/60 " +
  "transition-colors disabled:cursor-not-allowed disabled:bg-paper-sunken disabled:text-ink-muted"

function fieldTone(invalid?: boolean) {
  return invalid
    ? "border-alert focus:border-alert"
    : "border-mist-deep hover:border-ink-muted/50 focus:border-rx-amber"
}

interface FieldShellProps {
  id: string
  label?: string
  hint?: string
  error?: string
  required?: boolean
  className?: string
  children: ReactNode
}

function FieldShell({ id, label, hint, error, required, className, children }: FieldShellProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={id} className="eyebrow block">
          {label}
          {required && <span className="ml-1 text-alert">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-alert" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-ink-muted">{hint}</p>
      )}
    </div>
  )
}

// `prefix` is a real (string) HTML attribute, so it has to be dropped before
// being redeclared as a node slot.
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> {
  label?: string
  hint?: string
  error?: string
  /** Rendered inside the field on the left, e.g. a search icon or currency mark. */
  prefix?: ReactNode
  suffix?: ReactNode
  wrapperClassName?: string
  /** Uses tabular mono digits — for prices, quantities and batch numbers. */
  numeric?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, prefix, suffix, wrapperClassName, numeric, className, id, required, ...props },
  ref,
) {
  const generatedId = useId()
  const fieldId = id || generatedId

  return (
    <FieldShell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      <div className="relative flex items-center">
        {prefix && (
          <span className="pointer-events-none absolute left-3 text-ink-muted" aria-hidden>
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          className={cn(
            FIELD_BASE,
            fieldTone(Boolean(error)),
            "h-11 text-sm outline-none",
            numeric && "tabular font-mono",
            prefix && "pl-9",
            suffix && "pr-10",
            className,
          )}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 text-sm text-ink-muted">{suffix}</span>
        )}
      </div>
    </FieldShell>
  )
})

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  wrapperClassName?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, wrapperClassName, className, id, required, children, ...props },
  ref,
) {
  const generatedId = useId()
  const fieldId = id || generatedId

  return (
    <FieldShell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      <select
        ref={ref}
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(FIELD_BASE, fieldTone(Boolean(error)), "h-11 text-sm outline-none", className)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  )
})

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
  wrapperClassName?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, wrapperClassName, className, id, required, ...props },
  ref,
) {
  const generatedId = useId()
  const fieldId = id || generatedId

  return (
    <FieldShell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      <textarea
        ref={ref}
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(FIELD_BASE, fieldTone(Boolean(error)), "min-h-[88px] py-2.5 text-sm outline-none", className)}
        {...props}
      />
    </FieldShell>
  )
})
