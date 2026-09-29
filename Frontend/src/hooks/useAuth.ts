import { useNavigate } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "@/app/hooks"
import { clearUser } from "@/features/auth/authSlice"
import { useLogoutMutation } from "@/api/authApi"
import { baseApi } from "@/api/baseApi"
import { db } from "@/offline/db"
import type { Role } from "@/types"

export function useAuth() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [serverLogout] = useLogoutMutation()
  const user = useAppSelector((state) => state.auth.user)

  const logout = async () => {
    // 1. Fire-and-forget server logout so network or server cold-starts never block the user
    try {
      void serverLogout()
    } catch {
      // Ignore network errors during logout
    }

    // 2. Immediately clear user authentication credentials from Redux store & persistence
    dispatch(clearUser())

    // 3. Reset RTK Query cache so stale user-specific queries are purged
    dispatch(baseApi.util.resetApiState())

    // 4. Safely clear private notifications from offline storage without wiping the product catalog
    try {
      await db.notifications.clear()
    } catch {
      // Ignore local storage errors
    }

    // 5. Navigate immediately to login screen
    navigate("/login", { replace: true })
  }

  return {
    user,
    isAuthenticated: Boolean(user),
    role: user?.role,
    /** True when the current user holds any of the given roles. */
    can: (...roles: Role[]) => Boolean(user && roles.includes(user.role)),
    logout,
  }
}
