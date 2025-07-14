// Updated App.js
import {Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import LoginSignup from './security/LoginSignup';
import { ContextProvider } from "./contexts/AppContext"
import { useContext } from 'react';
import { ToastContainer } from "react-toastify"

// New pages
import BackstoreList from './InventoryManagament/BackstoreList';
import Dispensary from './InventoryManagament/Dispensary';
import PurchaseOrder from './components/SalesList.jsx/PurchaseOrder';
import ReceiveOrder from './components/SalesList.jsx/ReceiveOrder';
import SalesHistory from './components/SalesList.jsx/SalesHistory';
import StoreHistory from './InventoryManagament/StoreHistory/StoreHistory';
import DispensaryHistory from "./InventoryManagament/DispensaryHistory/DispensaryHistory"
import CloseDailyBalance from './components/SalesList.jsx/CloseDailyBalance/CloseDailyBalance';
import UserAdminstration from './pages/userAdminstration/UserAdminstration';
import Logout from "./security/Logout"
function App() {
  const {isAuth} = useContext(ContextProvider)
  return isAuth ? (
      <Layout>
        <ToastContainer/>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          
          {/* Inventory Management Routes */}
          <Route path="/products" element={<Products />} />
          <Route path="/backstore" element={<BackstoreList />} />
          <Route path="/dispensary" element={<Dispensary />} />
          <Route path="/store-history" element={<StoreHistory />} />
          <Route path="/dispensary-history" element={<DispensaryHistory />} />
          {/* Sales Routes */}
          <Route path="/purchase-order" element={<PurchaseOrder />} />
          <Route path="/receive-order" element={<ReceiveOrder />} />
          <Route path="/sales-history" element={<SalesHistory />} />
          <Route path='/close-daily-balance' element={<CloseDailyBalance/>}/>
          {/* Notifications */}
          <Route path="/notifications" element={<Notifications />} />
          {/* Reports */}
          <Route path="/reports" element={<Reports />} />
          {/* Logout */}
          <Route path="/logout" element={<Logout />} />
          <Route path="/user-managment" element={<UserAdminstration />} />
        </Routes>
      </Layout>)
    :(<>
    <ToastContainer/>
    <Routes>
        <Route path="/login" element={<LoginSignup />} />
        <Route path="/signup" element={<LoginSignup />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes></> 
  );
}

export default App;