import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getMeApi } from '@/features/auth/api/authApi';
import useAuthStore from '@/store/useAuthStore';
import useThemeStore from '@/store/useThemeStore';

import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';
import ForgotPassword from '@/pages/ForgotPassword';
import Dashboard from '@/pages/Dashboard';
import CompanyProfiles from '@/pages/CompanyProfiles';
import Customers from '@/pages/Customers';
import InvoiceCreate from '@/pages/InvoiceCreate';
import Invoices from '@/pages/Invoices';
import InvoiceDetails from '@/pages/InvoiceDetails';
import InvoiceEdit from '@/pages/InvoiceEdit';
import ProtectedRoute from '@/features/auth/components/ProtectedRoute';
import DashboardLayout from '@/layouts/DashboardLayout';

function App() {
  const { setUser, clearAuth, setCheckingAuth } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const response = await getMeApi();
        setUser(response.data.user);
      } catch (error) {
        clearAuth();
      } finally {
        setCheckingAuth(false);
      }
    };

    verifyUser();
  }, [setUser, clearAuth, setCheckingAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />  
        {/* PROTECTED ROUTES */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/company-profiles" element={<CompanyProfiles />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/:id" element={<InvoiceDetails />} />
            <Route path="/invoices/:id/edit" element={<InvoiceEdit />} />
            <Route path="/invoices/create" element={<InvoiceCreate />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
