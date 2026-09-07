import { useNavigate } from "react-router-dom"
import { Bell, CloudOff, LogOut, Menu, RefreshCw } from "lucide-react"

import { useAppDispatch } from "@/app/hooks"
import { toggleSidebar } from "@/features/ui/uiSlice"
import { clearUser } from "@/features/auth/authSlice"
import { useLogoutMutation } from "@/api/authApi"
import { useGetUnreadCountQuery } from "@/api/notificationApi"
import { useAuth } from "@/hooks/useAuth"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import { useSyncQueue } from "@/hooks/useSyncQueue"
import { clearOfflineData } from "@/offline/db"
import { initials } from "@/lib/format"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/cn"

export function Topbar({ onOpenSync }: { onOpenSync: () => void }) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user } = useAuth()
  const online = useOnlineStatus()
  const { pending, failed } = useSyncQueue()
  const [logout, { isLoading: loggingOut }] = useLogoutMutation()

  // Polling the count is cheap; polling the whole notification list is not.
  const { data: unread } = useGetUnreadCountQuery(undefined, {
    pollingInterval: online ? 60_000 : 0,
    skip: !user,
  })

  const handleLogout = async () => {
    try {
      await logout().unwrap()
    } catch {
      // Even if the server call fails, drop the local session.
    }
    dispatch(clearUser())
    await clearOfflineData()
    navigate("/login", { replace: true })
  }

  const unreadCount = unread?.unreadCount ?? 0
  const queueCount = pending + failed

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-mist bg-paper-raised/95 px-4 backdrop-blur lg:px-6">
      <button
        type="button"
        onClick={() => dispatch(toggleSidebar())}
        className="rounded-label p-2 text-ink-muted hover:bg-paper-sunken lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      <div className="flex-1" />

      {!online && (
        <Badge tone="warn" dot>
          <CloudOff className="h-3 w-3" aria-hidden />
          Offline
        </Badge>
      )}

      {queueCount > 0 && (
        <button
          type="button"
          onClick={onOpenSync}
          className={cn(
            "flex items-center gap-1.5 rounded-label border px-2 py-1 font-mono text-micro uppercase tracking-wider transition-colors",
            failed > 0
              ? "border-alert/30 bg-alert-soft text-alert"
              : "border-rx-amber/30 bg-rx-amber-soft text-rx-amber-deep",
          )}
        >
          <RefreshCw className={cn("h-3 w-3", online && failed === 0 && "animate-spin")} aria-hidden />
          {queueCount} queued
        </button>
      )}

      <button
        type="button"
        onClick={() => navigate("/notifications")}
        className="relative rounded-label p-2 text-ink-muted hover:bg-paper-sunken hover:text-ink"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-alert px-1 font-mono text-[10px] font-medium text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <div className="flex items-center gap-2.5 border-l border-mist pl-3">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full bg-mint-soft font-mono text-xs font-semibold text-mint"
          aria-hidden
        >
          {initials(user?.name)}
        </span>
        <div className="hidden leading-tight sm:block">
          <p className="text-sm font-medium text-ink">{user?.name}</p>
          <p className="eyebrow">{user?.role}</p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="rounded-label p-2 text-ink-muted hover:bg-alert-soft hover:text-alert disabled:opacity-50"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </header>
  )
}
