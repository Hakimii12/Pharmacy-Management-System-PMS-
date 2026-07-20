import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext, Suspense, lazy } from 'react';
import { ToastContainer } from 'react-toastify';
import { ContextProvider } from './contexts/AppContext';
import Layout from './components/layout/Layout';

// ─── Lazy-loaded route components ────────────────────────────────────────────
// Each of these becomes its own JS chunk. The browser only downloads
// a route's chunk when the user first navigates to that route.
const Dashboard          = lazy(() => import('./pages/Dashboard'));
const Products           = lazy(() => import('./pages/Products'));
const Notifications      = lazy(() => import('./pages/Notifications'));
const Reports            = lazy(() => import('./pages/Reports'));
const LoginSignup        = lazy(() => import('./security/LoginSignup'));
const BackstoreList      = lazy(() => import('./InventoryManagament/BackstoreList'));
const Dispensary         = lazy(() => import('./InventoryManagament/Dispensary'));
const PurchaseOrder      = lazy(() => import('./components/SalesList.jsx/PurchaseOrder'));
const ReceiveOrder       = lazy(() => import('./components/SalesList.jsx/ReceiveOrder'));
const SalesHistory       = lazy(() => import('./components/SalesList.jsx/SalesHistory'));
const StoreHistory       = lazy(() => import('./InventoryManagament/StoreHistory/StoreHistory'));
const DispensaryHistory  = lazy(() => import('./InventoryManagament/DispensaryHistory/DispensaryHistory'));
const CreditManagement   = lazy(() => import('./components/SalesList.jsx/CloseDailyBalance/CloseDailyBalance'));
const UserAdminstration  = lazy(() => import('./pages/userAdminstration/UserAdminstration'));
const Logout             = lazy(() => import('./security/Logout'));
const DosageFormsAndCategory = lazy(() => import('./Setting/DosageFormsAndCategory'));

// ─── Inline loading fallback ─────────────────────────────────────────────────
// Shown while the route chunk is being fetched. Kept lightweight on purpose.
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
    <div style={{
      width: 40, height: 40,
      border: '3px solid #e2e8f0',
      borderTop: '3px solid #10b981',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

function App() {
  const { isAuth } = useContext(ContextProvider);

  return isAuth ? (
    <Layout>
      <ToastContainer />
      {/* Suspense catches lazy chunks while they load */}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"                          element={<Dashboard />} />

          {/* Inventory Management Routes */}
          <Route path="/products"                  element={<Products />} />
          <Route path="/backstore"                 element={<BackstoreList />} />
          <Route path="/dispensary"                element={<Dispensary />} />
          <Route path="/store-history"             element={<StoreHistory />} />
          <Route path="/dispensary-history"        element={<DispensaryHistory />} />

          {/* Sales Routes */}
          <Route path="/purchase-order"            element={<PurchaseOrder />} />
          <Route path="/receive-order"             element={<ReceiveOrder />} />
          <Route path="/sales-history"             element={<SalesHistory />} />
          <Route path="/credit-management"         element={<CreditManagement />} />

          {/* Other Routes */}
          <Route path="/notifications"             element={<Notifications />} />
          <Route path="/reports"                   element={<Reports />} />
          <Route path="/logout"                    element={<Logout />} />
          <Route path="/dosage-forms-and-categories" element={<DosageFormsAndCategory />} />
          <Route path="/user-managment"            element={<UserAdminstration />} />
        </Routes>
      </Suspense>
    </Layout>
  ) : (
    <>
      <ToastContainer />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login"  element={<LoginSignup />} />
          <Route path="/signup" element={<LoginSignup />} />
          <Route path="*"       element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;