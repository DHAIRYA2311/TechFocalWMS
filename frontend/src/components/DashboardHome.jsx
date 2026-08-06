import React, { Suspense, lazy, useState, useEffect } from 'react';
import axios from 'axios';
import { AlertCircle } from 'lucide-react';
import { useRealTime } from '../hooks/useRealTime';

// Lazy load the role-specific dashboards
const AdminDashboard = lazy(() => import('./dashboards/AdminDashboard'));
const ManagerDashboard = lazy(() => import('./dashboards/ManagerDashboard'));
const WorkerDashboard = lazy(() => import('./dashboards/WorkerDashboard'));
const PartnerDashboard = lazy(() => import('./dashboards/PartnerDashboard'));

export default function DashboardHome({ user }) {
  const role = user?.role || 'worker'; // Default fallback
  const [dashboardData, setDashboardData] = useState(null);
  const [jobsData, setJobsData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async (isBackgroundSync = false) => {
    if (!isBackgroundSync) setLoading(true);
    const token = localStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [dashRes, jobsRes] = await Promise.all([
        axios.get('/api/dashboard', { headers }),
        axios.get('/api/jobs', { headers })
      ]);
      setDashboardData(dashRes.data);
      setJobsData(jobsRes.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useRealTime('dashboard', () => {
    fetchDashboardData(true);
  });

  const DashboardSkeleton = () => (
    <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', padding: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div>
          <div style={{ height: '28px', width: '200px', backgroundColor: 'var(--color-border)', borderRadius: '4px', marginBottom: '8px' }}></div>
          <div style={{ height: '16px', width: '150px', backgroundColor: 'var(--color-border)', borderRadius: '4px' }}></div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ height: '120px', backgroundColor: 'var(--color-border)', borderRadius: '12px' }}></div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
        <div style={{ height: '300px', backgroundColor: 'var(--color-border)', borderRadius: '12px' }}></div>
        <div style={{ height: '300px', backgroundColor: 'var(--color-border)', borderRadius: '12px' }}></div>
        <div style={{ height: '300px', backgroundColor: 'var(--color-border)', borderRadius: '12px' }}></div>
      </div>
    </div>
  );

  const renderDashboard = () => {
    if (loading && !dashboardData) {
      return <DashboardSkeleton />;
    }

    switch (role) {
      case 'admin':
        return <AdminDashboard user={user} data={dashboardData} jobs={jobsData} />;
      case 'partner':
        return <PartnerDashboard user={user} data={dashboardData} jobs={jobsData} />;
      case 'manager':
      case 'supervisor':
        return <ManagerDashboard user={user} data={dashboardData} jobs={jobsData} />;
      case 'worker':
      case 'helper':
        return <WorkerDashboard user={user} data={dashboardData} jobs={jobsData} />;
      default:
        // Generic fallback if a new role is added
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '16px', color: 'var(--color-text-muted)' }}>
            <AlertCircle size={48} color="var(--color-warning)" />
            <h2>Dashboard not configured for role: {role}</h2>
          </div>
        );
    }
  };

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      {renderDashboard()}
    </Suspense>
  );
}
