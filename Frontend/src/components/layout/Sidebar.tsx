import { NavLink } from "react-router-dom"
import {
  Boxes,
  ChartNoAxesColumn,
  CreditCard,
  LayoutDashboard,
  Package,
  Receipt,
  ScrollText,
  Settings2,
  ShoppingBag,
  ShoppingCart,
  Users,
  Warehouse,
  X,
  LogOut,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/cn"
import { useAuth } from "@/hooks/useAuth"
import { useAppDispatch, useAppSelector } from "@/app/hooks"
import { toggleSidebar } from "@/features/ui/uiSlice"
import { CASHIER_ROLES, MANAGER_ROLES, SELLER_ROLES } from "@/features/auth/authSlice"
import { initials } from "@/lib/format"
import type { Role } from "@/types"

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  roles?: Role[]
  end?: boolean
}

interface NavGroup {
  heading: string
  items: NavItem[]
}

const ALL: Role[] = ["superAdmin", "admin", "pharmacist", "cashier"]

const NAV: NavGroup[] = [
  {
    heading: "Counter",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ALL, end: true },
      { to: "/pos", label: "New sale", icon: ShoppingCart, roles: SELLER_ROLES },
      { to: "/checkout", label: "Checkout queue", icon: Receipt, roles: [...CASHIER_ROLES, "pharmacist"] },
    ],
  },
  {
    heading: "Inventory",
    items: [
      { to: "/inventory", label: "All stock", icon: Boxes, roles: ALL, end: true },
      { to: "/inventory/store", label: "Back store", icon: Warehouse, roles: ALL },
      { to: "/inventory/dispensary", label: "Dispensary", icon: Package, roles: ALL },
      { to: "/inventory/transfers", label: "Transfers", icon: ScrollText, roles: ALL },
      { to: "/inventory/purchasing", label: "Purchasing", icon: ShoppingBag, roles: MANAGER_ROLES },
    ],
  },
  {
    heading: "Records",
    items: [
      { to: "/sales", label: "Sales history", icon: ChartNoAxesColumn, roles: ALL },
      { to: "/credit", label: "Credit ledger", icon: CreditCard, roles: MANAGER_ROLES },
      { to: "/reports", label: "Reports", icon: ChartNoAxesColumn, roles: MANAGER_ROLES },
    ],
  },
  {
    heading: "Admin",
    items: [
      { to: "/users", label: "Staff", icon: Users, roles: MANAGER_ROLES },
      { to: "/settings", label: "Catalog", icon: Settings2, roles: MANAGER_ROLES },
    ],
  },
]

export function Sidebar() {
  const { can, user, logout } = useAuth()
  const open = useAppSelector((state) => state.ui.sidebarOpen)
  const dispatch = useAppDispatch()

  const close = () => dispatch(toggleSidebar(false))

  const groups = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || can(...item.roles)),
  })).filter((group) => group.items.length > 0)

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
          onClick={close}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-mist bg-paper-raised",
          "transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-mist px-5">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-label bg-ink font-display text-sm font-bold text-paper"
              aria-hidden
            >
              Rx
            </span>
            <div className="leading-tight">
              <p className="font-display text-sm font-semibold text-ink">Hamza Masjid</p>
              <p className="eyebrow">Pharmacy</p>
            </div>
          </div>

          <button
            type="button"
            onClick={close}
            className="rounded-label p-1 text-ink-muted hover:bg-paper-sunken lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.heading} className="mb-5">
              <p className="eyebrow px-2 pb-1.5">{group.heading}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={close}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-label px-2.5 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-ink text-paper"
                            : "text-ink-muted hover:bg-paper-sunken hover:text-ink",
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {user && (
          <div className="shrink-0 border-t border-mist p-3">
            <div className="flex items-center justify-between gap-2 rounded-label bg-paper-sunken p-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint-soft font-mono text-xs font-semibold text-mint"
                  aria-hidden
                >
                  {initials(user.name)}
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-xs font-medium text-ink">{user.name}</p>
                  <p className="truncate eyebrow text-[10px]">{user.role}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  close()
                  void logout()
                }}
                className="rounded-label p-1.5 text-ink-muted hover:bg-alert-soft hover:text-alert transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
