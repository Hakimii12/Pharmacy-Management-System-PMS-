import { useAppSelector } from "@/app/hooks"
import type { Role } from "@/types"

export function useAuth() {
  const user = useAppSelector((state) => state.auth.user)

  return {
    user,
    isAuthenticated: Boolean(user),
    role: user?.role,
    /** True when the current user holds any of the given roles. */
    can: (...roles: Role[]) => Boolean(user && roles.includes(user.role)),
  }
}
