import React, { useState, useEffect, Suspense, lazy } from 'react';
import axios from 'axios';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import './App.css';
import TechFocalLoader from './components/TechFocalLoader';
import { initEcho } from './utils/echo';
import useIdleTimeout from './hooks/useIdleTimeout';

// Lazy load layout components
const DashboardPlaceholder = lazy(() => import('./components/DashboardPlaceholder'));

const Login = lazy(() => import('./components/Login'));
const ForgotPassword = lazy(() => import('./components/ForgotPassword'));
const ResetPassword = lazy(() => import('./components/ResetPassword'));

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

const SecurityCenter = lazy(() => import('./components/security/SecurityCenter'));
const SecurityDashboard = lazy(() => import('./components/security/SecurityDashboard'));
const SecurityAuditLogs = lazy(() => import('./components/security/SecurityAuditLogs'));
const IpWhitelistManagement = lazy(() => import('./components/security/IpWhitelistManagement'));
const Inventory = lazy(() => import('./components/Inventory'));
const StaffsManagement = lazy(() => import('./components/StaffsManagement'));
const Reports = lazy(() => import('./components/Reports'));
const Customers = lazy(() => import('./components/Customers'));
const CustomerDetails = lazy(() => import('./components/CustomerDetails'));

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
import SecuritySettings from './components/settings/SecuritySettings';
import MaintenanceSettings from './components/settings/MaintenanceSettings';
import SettingsSchedulers from './components/settings/SettingsSchedulers';
import DevicePairingSettings from './components/settings/DevicePairingSettings';
import ArchivedRecordsSettings from './components/settings/ArchivedRecordsSettings';
import ErrorBoundary from './components/ErrorBoundary';
import MfaSetupPromptModal from './components/MfaSetupPromptModal';
import SessionTimeoutModal from './components/SessionTimeoutModal';


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
    <TechFocalLoader />
  </div>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [showMfaPrompt, setShowMfaPrompt] = useState(false);
  const [showSessionTimeout, setShowSessionTimeout] = useState(false);
  const navigate = useNavigate();

  // Determine Idle Timeout based on user role
  const getTimeoutDuration = (role) => {
    switch (role) {
      case 'admin':
      case 'partner':
        return 60;
      case 'manager':
        return 45;
      case 'worker':
      case 'helper':
        return 30;
      default:
        return 0;
    }
  };

  const handleIdleTimeout = async () => {
    try {
      await axios.post('/api/logout');
    } catch (e) {
      console.error("Logout failed on timeout", e);
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_profile');
    setShowSessionTimeout(true); // Show custom modal instead of alert
    handleLogoutSuccess();
  };

  const { resetTimer } = useIdleTimeout(handleIdleTimeout, user ? getTimeoutDuration(user.role) : 0);

  const setupEcho = (userId) => {
    const echo = initEcho();
    echo.private(`App.Models.User.${userId}`)
      .listen('SessionTerminated', (e) => {
        const currentTokenId = localStorage.getItem('auth_token')?.split('|')[0];
        if (e.token_id == currentTokenId) {
          setShowSessionTimeout(true); // Re-use timeout modal for admin termination
          handleLogoutSuccess();
        }
      });
  };

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
        const response = await axios.get('/api/me');
        setUser(response.data.user);

        // Also if they hit refresh and still need MFA setup
        if (response.data.needs_mfa_setup) {
          setShowMfaPrompt(true);
        }

        Sentry.setUser({ id: response.data.user.id, email: response.data.user.email });
        localStorage.setItem('user_profile', JSON.stringify(response.data.user));
        setupEcho(response.data.user.id);

        // Fetch settings and prefetched dashboard data concurrently to speed up app load
        const [settingsResponse, attResponse, jobsResponse, machineResponse] = await Promise.all([
          axios.get('/api/settings').catch(() => ({ data: [] })),
          axios.get('/api/attendance/stats').catch(() => ({ data: { today: null } })),
          axios.get('/api/jobs').catch(() => ({ data: [] })),
          axios.get('/api/machines/stats').catch(() => ({ data: null }))
        ]);

        localStorage.setItem('portal_settings', JSON.stringify(settingsResponse.data));
        window.dispatchEvent(new Event('portal-settings-updated'));

        window.__PREFETCHED_DASHBOARD = {
          attStats: attResponse.data?.today || null,
          jobs: jobsResponse.data || [],
          machineStats: machineResponse.data || null
        };
      } catch (err) {
        console.error('Session validation failed:', err);
        // Clean up invalid session
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_profile');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        Sentry.setUser(null);
      } finally {
        setInitializing(false);
      }
    };

    checkSession();
  }, []);

  useEffect(() => {
    const handleTriggerMfa = () => setShowMfaPrompt(true);
    window.addEventListener('trigger-mfa-setup', handleTriggerMfa);
    return () => window.removeEventListener('trigger-mfa-setup', handleTriggerMfa);
  }, []);

  const handleLoginSuccess = (userProfile, needsMfaSetup = false) => {
    const token = localStorage.getItem('auth_token');
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userProfile);
    if (needsMfaSetup) {
      setShowMfaPrompt(true);
    }
    Sentry.setUser({ id: userProfile.id, email: userProfile.email });
    setupEcho(userProfile.id);
    navigate('/dashboard');
  };

  const handleLogoutSuccess = () => {
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    Sentry.setUser(null);
    if (initEcho()) {
      initEcho().leaveAllChannels();
    }
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
        <TechFocalLoader />
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--color-bg-base)' }}>
        <LoadingSpinner />
      </div>
    }>
      {showMfaPrompt && <MfaSetupPromptModal onClose={() => setShowMfaPrompt(false)} />}
      {showSessionTimeout && <SessionTimeoutModal onClose={() => setShowSessionTimeout(false)} />}
      <Routes>
        <Route path="/" element={
          user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        } />

        {/* Login Page */}
        <Route path="/login" element={
          user ? <Navigate to="/dashboard" replace /> : <Login onLoginSuccess={handleLoginSuccess} />
        } />

        <Route path="/forgot-password" element={
          user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />
        } />

        <Route path="/reset-password" element={
          user ? <Navigate to="/dashboard" replace /> : <ResetPassword />
        } />

        {/* Protected administrative paths */}
        <Route path="/" element={<ProtectedRoute user={user}><DashboardPlaceholder user={user} onLogout={handleLogoutSuccess} onUserUpdated={setUser} /></ProtectedRoute>}>
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
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerDetails />} />
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

          {/* Security Center Routes */}
          <Route path="security" element={
            user?.role === 'admin' ? (
              <ErrorBoundary><SecurityCenter /></ErrorBoundary>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<SecurityDashboard />} />
            <Route path="logs" element={<SecurityAuditLogs />} />
            <Route path="network" element={<IpWhitelistManagement />} />
          </Route>

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
            <Route path="security" element={<SecuritySettings />} />
            <Route path="system" element={<SystemSettings />} />
            <Route path="maintenance" element={<MaintenanceSettings />} />
            <Route path="schedulers" element={<SettingsSchedulers />} />
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
