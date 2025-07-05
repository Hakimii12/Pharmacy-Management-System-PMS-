import {Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Inventory from './pages/Inventory';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import LoginSignup from './security/LoginSignup';
import  { ContextProvider } from "./contexts/AppContext"
import { useContext } from 'react';
import  {ToastContainer} from "react-toastify"
function App() {
  const {isAuth} = useContext(ContextProvider)
  console.log(isAuth)
  return (
    isAuth ? 
      <Layout>
         <ToastContainer/>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Layout>
    :
      <Routes>
        <Route path="/login" element={<LoginSignup />} />
        <Route path="/signup" element={<LoginSignup />} /> {/* Add this line */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
  );
}

export default App;