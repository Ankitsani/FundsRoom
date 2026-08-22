import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { CustomerDetail } from './pages/CustomerDetail';
import { Products } from './pages/Products';
import { Challans } from './pages/Challans';
import { ChallanDetail } from './pages/ChallanDetail';
import { ErpInventory } from './pages/ErpInventory';
import { WorkOrders } from './pages/WorkOrders';
import { InternalTransfers } from './pages/InternalTransfers';
import { CustomerOrders } from './pages/CustomerOrders';
import { Role } from './context/AuthContext';

export const App: React.FC = () => {
  return (
    <Router>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Guest Routes */}
            <Route path="/login" element={<Login />} />

            {/* Authenticated Dashboard Shell Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                {/* Dashboard (All roles) */}
                <Route path="/" element={<Dashboard />} />

                {/* Customers CRM (All roles can view, admin/sales/accounts can edit) */}
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/:id" element={<CustomerDetail />} />

                {/* Products & Inventory (All roles can view, admin/warehouse can edit) */}
                <Route path="/products" element={<Products />} />

                {/* Sales Challans (All roles can view, admin/sales/accounts can modify status) */}
                <Route path="/challans" element={<Challans />} />
                <Route path="/challans/:id" element={<ChallanDetail />} />

                {/* Mini Operations ERP Modules */}
                <Route path="/erp/inventory" element={<ErpInventory />} />
                <Route path="/erp/work-orders" element={<WorkOrders />} />
                <Route path="/erp/transfers" element={<InternalTransfers />} />
                <Route path="/erp/orders" element={<CustomerOrders />} />
              </Route>
            </Route>

            {/* Fallback redirection */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </Router>
  );
};
export default App;
