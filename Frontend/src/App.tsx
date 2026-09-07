import { Suspense, lazy } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { Loader2 } from "lucide-react"

import { AppLayout } from "@/components/layout/AppLayout"
import { RequireAuth } from "@/components/layout/RequireAuth"
import { ToastHost } from "@/components/layout/ToastHost"
import { CASHIER_ROLES, MANAGER_ROLES, SELLER_ROLES } from "@/features/auth/authSlice"

import LoginPage from "@/pages/LoginPage"
import RegisterPage from "@/pages/RegisterPage"
import DashboardPage from "@/pages/DashboardPage"
import PosPage from "@/pages/PosPage"

// Everything past the two hot paths (login, POS) is split out — the counter
// terminal should not pay to parse the admin screens on first load.
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"))
const InventoryPage = lazy(() => import("@/pages/InventoryPage"))
const StorePage = lazy(() => import("@/pages/StorePage"))
const DispensaryPage = lazy(() => import("@/pages/DispensaryPage"))
const TransfersPage = lazy(() => import("@/pages/TransfersPage"))
const PurchasingPage = lazy(() => import("@/pages/PurchasingPage"))
const SalesHistoryPage = lazy(() => import("@/pages/SalesHistoryPage"))
const CreditPage = lazy(() => import("@/pages/CreditPage"))
const ReportsPage = lazy(() => import("@/pages/ReportsPage"))
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"))
const UsersPage = lazy(() => import("@/pages/UsersPage"))
const SettingsPage = lazy(() => import("@/pages/SettingsPage"))
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"))

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24 text-ink-muted">
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
      <span className="sr-only">Loading</span>
    </div>
  )
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route
            index
            element={
              <Suspense fallback={<PageFallback />}>
                <DashboardPage />
              </Suspense>
            }
          />

          <Route
            path="pos"
            element={
              <RequireAuth roles={SELLER_ROLES}>
                <PosPage />
              </RequireAuth>
            }
          />

          <Route
            path="checkout"
            element={
              <RequireAuth roles={[...CASHIER_ROLES, "pharmacist"]}>
                <Suspense fallback={<PageFallback />}>
                  <CheckoutPage />
                </Suspense>
              </RequireAuth>
            }
          />

          <Route
            path="inventory"
            element={
              <Suspense fallback={<PageFallback />}>
                <InventoryPage />
              </Suspense>
            }
          />
          <Route
            path="inventory/store"
            element={
              <Suspense fallback={<PageFallback />}>
                <StorePage />
              </Suspense>
            }
          />
          <Route
            path="inventory/dispensary"
            element={
              <Suspense fallback={<PageFallback />}>
                <DispensaryPage />
              </Suspense>
            }
          />
          <Route
            path="inventory/transfers"
            element={
              <Suspense fallback={<PageFallback />}>
                <TransfersPage />
              </Suspense>
            }
          />
          <Route
            path="inventory/purchasing"
            element={
              <RequireAuth roles={MANAGER_ROLES}>
                <Suspense fallback={<PageFallback />}>
                  <PurchasingPage />
                </Suspense>
              </RequireAuth>
            }
          />

          <Route
            path="sales"
            element={
              <Suspense fallback={<PageFallback />}>
                <SalesHistoryPage />
              </Suspense>
            }
          />

          <Route
            path="credit"
            element={
              <RequireAuth roles={MANAGER_ROLES}>
                <Suspense fallback={<PageFallback />}>
                  <CreditPage />
                </Suspense>
              </RequireAuth>
            }
          />

          <Route
            path="reports"
            element={
              <RequireAuth roles={MANAGER_ROLES}>
                <Suspense fallback={<PageFallback />}>
                  <ReportsPage />
                </Suspense>
              </RequireAuth>
            }
          />

          <Route
            path="notifications"
            element={
              <Suspense fallback={<PageFallback />}>
                <NotificationsPage />
              </Suspense>
            }
          />

          <Route
            path="users"
            element={
              <RequireAuth roles={MANAGER_ROLES}>
                <Suspense fallback={<PageFallback />}>
                  <UsersPage />
                </Suspense>
              </RequireAuth>
            }
          />

          <Route
            path="settings"
            element={
              <RequireAuth roles={MANAGER_ROLES}>
                <Suspense fallback={<PageFallback />}>
                  <SettingsPage />
                </Suspense>
              </RequireAuth>
            }
          />

          <Route
            path="*"
            element={
              <Suspense fallback={<PageFallback />}>
                <NotFoundPage />
              </Suspense>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastHost />
    </>
  )
}
