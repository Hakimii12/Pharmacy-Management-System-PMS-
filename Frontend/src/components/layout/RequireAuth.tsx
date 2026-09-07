import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { ShieldOff } from "lucide-react"

import { useAuth } from "@/hooks/useAuth"
import { LabelCard } from "@/components/ui/LabelCard"
import type { Role } from "@/types"

/**
 * Route guard.
 *
 * This is a usability measure, not a security boundary — the server enforces the
 * same role matrix on every endpoint. Hiding a route the API would reject just
 * avoids showing an operator a screen that can only fail.
 */
export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, can } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !can(...roles)) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <LabelCard eyebrow="403" title="Not available for your role" perforated>
          <div className="flex items-start gap-3 text-sm text-ink-muted">
            <ShieldOff className="mt-0.5 h-5 w-5 shrink-0 text-alert" aria-hidden />
            <p>
              You are signed in as <strong className="text-ink">{user.role}</strong>. This screen is
              restricted to {roles.join(", ")}.
            </p>
          </div>
        </LabelCard>
      </div>
    )
  }

  return <>{children}</>
}
