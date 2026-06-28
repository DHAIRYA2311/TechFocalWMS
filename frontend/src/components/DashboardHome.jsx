import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ClipboardList, 
  Wrench, 
  Cpu, 
  Users, 
  LayoutDashboard 
} from 'lucide-react';
import { useRealTime } from '../hooks/useRealTime';

export default function DashboardHome({ user }) {
  const [jobs, setJobs] = useState([]);
  const [machineStats, setMachineStats] = useState(null);
  const [attStats, setAttStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    const token = localStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const attResponse = await axios.get('http://127.0.0.1:8000/api/attendance/stats', { headers });
      setAttStats(attResponse.data.today);
    } catch (err) {
      console.error('Failed to fetch dashboard attendance stats:', err);
    }

    try {
      const jobsResponse = await axios.get('http://127.0.0.1:8000/api/jobs', { headers });
      setJobs(jobsResponse.data);
    } catch (err) {
      console.error('Failed to fetch dashboard jobs:', err);
    }

    try {
      const machineResponse = await axios.get('http://127.0.0.1:8000/api/machines/stats', { headers });
      setMachineStats(machineResponse.data);
    } catch (err) {
      console.error('Failed to fetch dashboard machine stats:', err);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useRealTime('dashboard', () => {
    fetchDashboardData();
  });

  const getRoleLabel = (role) => {
    switch(role) {
      case 'partner': return 'Partner (Founder)';
      case 'admin': return 'System Administrator';
      case 'manager': return 'Workshop Manager';
      case 'supervisor': return 'Workshop Supervisor';
      case 'helper': return 'Shop Floor Helper';
      case 'worker': return 'Shop Floor Worker';
      default: return role;
    }
  };

  const totalJobs = jobs.length;
  const pendingJobs = jobs.filter(j => j.status === 'pending').length;
  const activeJobs = jobs.filter(j => j.status === 'in_progress').length;
  const incompleteJobs = jobs.filter(j => j.status !== 'completed').length;
  const jobsToday = jobs.filter(j => {
    const today = new Date().toDateString();
    const jobDate = new Date(j.created_at).toDateString();
    return today === jobDate;
  }).length;

  const stats = [
    { 
      title: 'Total Jobs', 
      value: loading ? 'Loading...' : `${totalJobs}`, 
      icon: <ClipboardList size={20} />, 
      change: loading ? 'Calculating...' : `+${jobsToday} registered today` 
    },
    { 
      title: 'Active / Pending Jobs', 
      value: loading ? 'Loading...' : `${incompleteJobs}`, 
      icon: <Wrench size={20} />, 
      change: loading ? 'Calculating...' : `${activeJobs} in machining, ${pendingJobs} waiting` 
    },
    { 
      title: 'Machine Activity', 
      value: loading || !machineStats 
        ? 'Loading...' 
        : `${machineStats.busy} / ${machineStats.total - machineStats.inactive} Active`, 
      icon: <Cpu size={20} />, 
      change: loading || !machineStats 
        ? 'Calculating...' 
        : `${machineStats.utilization_rate}% shop utilization` 
    },
    { 
      title: 'Staff Present', 
      value: loading || !attStats 
        ? 'Loading...' 
        : `${attStats.present} / ${attStats.total_staff} Present`, 
      icon: <Users size={20} />, 
      change: loading || !attStats 
        ? 'Calculating...' 
        : attStats.late > 0 ? `${attStats.late} late arrivals today` : 'On-time sync complete' 
    }
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Welcome Card */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', gap: '20px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}>
        <div style={{ flexGrow: 1 }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>
            Welcome Back, {user?.name}!
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', maxWidth: '700px', lineHeight: '1.5' }}>
            You are logged in as a <strong>{getRoleLabel(user?.role)}</strong>. Phase 2 (Email fetching, PDF parsing, settings, and review panel) has been successfully implemented on the client and API backend!
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        {stats.map((stat, i) => (
          <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-muted)' }}>{stat.title}</span>
              <div style={{ padding: '6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-primary)' }}>
                {stat.icon}
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--color-text-main)' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      {/* Architecture Config */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div className="card">
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
            Phase 2 Core Capabilities
          </h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Email IMAP Connector</span>
              <strong style={{ color: 'var(--color-success)' }}>Completed</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>PDF Parser (smalot/pdfparser)</span>
              <strong style={{ color: 'var(--color-success)' }}>Completed</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Interactive Review Editor</span>
              <strong style={{ color: 'var(--color-success)' }}>Completed</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Credentials Settings Panel</span>
              <strong style={{ color: 'var(--color-success)' }}>Completed</strong>
            </li>
          </ul>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
            Active Environment Services
          </h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Vite Frontend Address</span>
              <strong>http://localhost:5173</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Laravel Backend API</span>
              <strong>http://127.0.0.1:8000</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>MySQL Server Database</span>
              <strong>techfocal_wms</strong>
            </li>
          </ul>
        </div>
      </div>

    </div>
  );
}
