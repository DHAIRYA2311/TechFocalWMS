import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, Users, LogIn, AlertTriangle, Activity } from 'lucide-react';
import ActiveSessions from './ActiveSessions';

export default function SecurityDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('/api/security/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching security stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>Loading dashboard...</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>Security Overview</h1>
        <p style={{ color: '#64748b' }}>Monitor daily security metrics and recent critical alerts.</p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px',
        marginBottom: '40px'
      }}>
        {/* Metric Cards */}
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '16px', backgroundColor: '#e0e7ff', color: '#4f46e5', borderRadius: '12px' }}>
            <Activity size={24} />
          </div>
          <div>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '4px', fontWeight: '600' }}>Active Users Today</p>
            <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{stats?.active_users_today || 0}</h3>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '16px', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '12px' }}>
            <LogIn size={24} />
          </div>
          <div>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '4px', fontWeight: '600' }}>Logins Today</p>
            <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{stats?.logins_today || 0}</h3>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '16px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '12px' }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '4px', fontWeight: '600' }}>Failed Logins</p>
            <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{stats?.failed_logins_today || 0}</h3>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle color="#f59e0b" size={20} />
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: 0 }}>Recent Security Alerts</h2>
        </div>
        
        {stats?.recent_alerts?.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No recent alerts found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {stats?.recent_alerts?.map((alert) => (
              <div key={alert.id} style={{ 
                padding: '16px 24px', 
                borderBottom: '1px solid #f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <p style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                    {alert.action === 'login_failed' ? 'Failed Login Attempt' : alert.action.replace(/_/g, ' ')}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', color: '#64748b', fontSize: '14px' }}>
                    <span>User: {alert.user ? alert.user.name : 'Unknown'}</span>
                    <span>•</span>
                    <span>IP: {alert.ip_address}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                    {new Date(alert.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ActiveSessions />
    </div>
  );
}
