import React, { useState, useEffect, Suspense, lazy } from 'react';
import axios from 'axios';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';

// Lazy load layout components
const DashboardPlaceholder = lazy(() => import('./components/DashboardPlaceholder'));
const WebsiteLayout = lazy(() => import('./website/WebsiteLayout'));
const HomePage = lazy(() => import('./website/pages/HomePage'));
const ServicesPage = lazy(() => import('./website/pages/ServicesPage'));
const GalleryPage = lazy(() => import('./website/pages/GalleryPage'));
const AboutPage = lazy(() => import('./website/pages/AboutPage'));
const ContactPage = lazy(() => import('./website/pages/ContactPage'));
const QuotePage = lazy(() => import('./website/pages/QuotePage'));

const Login = lazy(() => import('./components/Login'));

// Lazy load view components
const DashboardHome = lazy(() => import('./components/DashboardHome'));
const PurchaseOrders = lazy(() => import('./components/PurchaseOrders'));
const JobOperations = lazy(() => import('./components/JobOperations'));
const IncomingChallans = lazy(() => import('./components/IncomingChallans'));
const DeliveryChallans = lazy(() => import('./components/DeliveryChallans'));
const InvoicesBilling = lazy(() => import('./components/InvoicesBilling'));
const UsersManagement = lazy(() => import('./components/UsersManagement'));
const StaffAttendance = lazy(() => import('./components/StaffAttendance'));
const MachinesManagement = lazy(() => import('./components/MachinesManagement'));
const PayrollManagement = lazy(() => import('./components/PayrollManagement'));
const ExpenseManagement = lazy(() => import('./components/ExpenseManagement'));
const Inventory = lazy(() => import('./components/Inventory'));
const StaffsManagement = lazy(() => import('./components/StaffsManagement'));
const Reports = lazy(() => import('./components/Reports'));

import SettingsCenter from './components/settings/SettingsCenter';
import CompanySettings from './components/settings/CompanySettings';
import BrandingSettings from './components/settings/BrandingSettings';
import DomainSettings from './components/settings/DomainSettings';
import DocumentSettings from './components/settings/DocumentSettings';
import AttendanceSettings from './components/settings/AttendanceSettings';
import NotificationSettings from './components/settings/NotificationSettings';
import EmailSettings from './components/settings/EmailSettings';
import UsersRolesSettings from './components/settings/UsersRolesSettings';
import SystemSettings from './components/settings/SystemSettings';
import DevicePairingSettings from './components/settings/DevicePairingSettings';
import ArchivedRecordsSettings from './components/settings/ArchivedRecordsSettings';
import ErrorBoundary from './components/ErrorBoundary';


// Auth Guard Component
function ProtectedRoute({ user, children }) {
  if (!user) {
    const savedToken = localStorage.getItem('auth_token');
    // If no token exists at all, redirect to landing page
    if (!savedToken) {
      return <Navigate to="/" replace />;
    }
  }
  return children;
}

// Administrative Guard Component (Admin & Partners only)
function AdminPartnerRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/" replace />;
  }
  if (!['admin', 'partner'].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// Fallback Spinner for Lazy Loaded Routes
const LoadingSpinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', width: '100%' }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '3px solid var(--color-border)',
      borderTopColor: 'var(--color-primary)',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }}></div>
  </div>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('auth_token');

      if (!token) {
        setInitializing(false);
        return;
      }

      // Configure axios default auth headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      try {
        // Confirm user session is still valid with backend
        const response = await axios.get('http://127.0.0.1:8000/api/me');
        setUser(response.data.user);
        localStorage.setItem('user_profile', JSON.stringify(response.data.user));

        // Fetch settings globally on mount for branding and preferences
        const settingsResponse = await axios.get('http://127.0.0.1:8000/api/settings');
        localStorage.setItem('portal_settings', JSON.stringify(settingsResponse.data));
        window.dispatchEvent(new Event('portal-settings-updated'));
      } catch (err) {
        console.error('Session validation failed:', err);
        // Clean up invalid session
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_profile');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
      } finally {
        setInitializing(false);
      }
    };

    checkSession();
  }, []);

  const handleLoginSuccess = (userProfile) => {
    const token = localStorage.getItem('auth_token');
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userProfile);
    navigate('/dashboard');
  };

  const handleLogoutSuccess = () => {
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    navigate('/login');
  };

  if (initializing) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: 'var(--color-bg-base)',
        fontFamily: 'var(--font-sans)',
        gap: '12px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--color-border)',
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <span style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: '500' }}>
          Loading TechFocal WMS...
        </span>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--color-bg-base)' }}>
        <LoadingSpinner />
      </div>
    }>
      <Routes>
        <Route path="/" element={
          user ? <Navigate to="/dashboard" replace /> : <WebsiteLayout user={user} onLoginClick={() => navigate('/login')} onDashboardClick={() => navigate('/dashboard')} />
        }>
          <Route index element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="gallery" element={<GalleryPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="quote" element={<QuotePage />} />
        </Route>
        
        {/* Login Page */}
        <Route path="/login" element={
          user ? <Navigate to="/dashboard" replace /> : <Login onLoginSuccess={handleLoginSuccess} onBackToWebsite={() => navigate('/login')} />
        } />

        {/* Protected administrative paths */}
        <Route path="/" element={<ProtectedRoute user={user}><DashboardPlaceholder user={user} onLogout={handleLogoutSuccess} /></ProtectedRoute>}>
          <Route path="dashboard" element={<DashboardHome user={user} />} />
          <Route path="purchase-orders" element={<PurchaseOrders />} />
          <Route path="jobs" element={<JobOperations user={user} />} />
          <Route path="incoming-challans" element={<IncomingChallans />} />
          <Route path="delivery-challans" element={<DeliveryChallans />} />
          <Route path="invoices" element={<ErrorBoundary><InvoicesBilling /></ErrorBoundary>} />
          <Route path="attendance" element={<StaffAttendance user={user} />} />
          <Route path="machines" element={<MachinesManagement user={user} />} />
          <Route path="payroll" element={<PayrollManagement user={user} />} />
          <Route path="expenses" element={<ExpenseManagement user={user} />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="reports" element={<Reports />} />
          
          <Route path="staffs" element={
            ['admin', 'partner', 'manager', 'supervisor'].includes(user?.role) ? (
              <StaffsManagement user={user} />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          } />

          <Route path="users" element={
            <AdminPartnerRoute user={user}>
              <UsersManagement />
            </AdminPartnerRoute>
          } />

          {/* Settings Sub-routes */}
          <Route path="settings" element={<ErrorBoundary><SettingsCenter /></ErrorBoundary>}>
            <Route index element={<Navigate to="company" replace />} />
            <Route path="company" element={<CompanySettings />} />
            <Route path="branding" element={<BrandingSettings />} />
            <Route path="domains" element={<DomainSettings />} />
            <Route path="documents" element={<DocumentSettings />} />
            <Route path="attendance" element={<AttendanceSettings />} />
            <Route path="notifications" element={<NotificationSettings />} />
            <Route path="email" element={<EmailSettings />} />
            <Route path="users-roles" element={<UsersRolesSettings />} />
            <Route path="system" element={<SystemSettings />} />
            <Route path="archived" element={<ArchivedRecordsSettings />} />
            <Route path="devices" element={<DevicePairingSettings />} />
          </Route>
        </Route>

        {/* Catch-all fallback path */}
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
      </Routes>
    </Suspense>
  );
}
