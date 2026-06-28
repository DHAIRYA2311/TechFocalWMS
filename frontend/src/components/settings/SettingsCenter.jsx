import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import axios from 'axios';
import { 
  Building, 
  Palette, 
  Globe, 
  FileText, 
  Clock, 
  Bell, 
  Mail, 
  Shield, 
  Cpu, 
  Loader2,
  Tablet,
  Archive
} from 'lucide-react';

export default function SettingsCenter() {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('portal_settings');
      return saved ? JSON.parse(saved) : null;
    } catch (err) {
      console.error('Failed to parse portal_settings from localStorage:', err);
      localStorage.removeItem('portal_settings');
      return null;
    }
  });
  const [loadingSettings, setLoadingSettings] = useState(!settings);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('http://127.0.0.1:8000/api/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data);
      localStorage.setItem('portal_settings', JSON.stringify(response.data));
      window.dispatchEvent(new Event('portal-settings-updated'));
    } catch (err) {
      console.error('Failed to load portal settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const saveSettings = async (updatedValues) => {
    const token = localStorage.getItem('auth_token');
    await axios.post('http://127.0.0.1:8000/api/settings', updatedValues, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setSettings(prev => {
      const next = { ...prev, ...updatedValues };
      localStorage.setItem('portal_settings', JSON.stringify(next));
      window.dispatchEvent(new Event('portal-settings-updated'));
      return next;
    });
  };

  const navItems = [
    { path: '/settings/company', label: 'Company Information', icon: <Building size={16} /> },
    { path: '/settings/branding', label: 'Branding', icon: <Palette size={16} /> },
    { path: '/settings/domains', label: 'Domains & DNS', icon: <Globe size={16} /> },
    { path: '/settings/email', label: 'Email Settings', icon: <Mail size={16} /> },
    { path: '/settings/devices', label: 'Mobile Device Pairing', icon: <Tablet size={16} /> },
    { path: '/settings/users-roles', label: 'Users & Roles', icon: <Shield size={16} /> },
    { path: '/settings/notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { path: '/settings/attendance', label: 'Attendance Settings', icon: <Clock size={16} /> },
    { path: '/settings/documents', label: 'Document Settings', icon: <FileText size={16} /> },
    { path: '/settings/system', label: 'System Settings', icon: <Cpu size={16} /> },
    { path: '/settings/archived', label: 'Archived Records', icon: <Archive size={16} /> },
  ];



  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Settings Module Header */}
      <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-text-main)' }}>System Settings</h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          Configure company preferences, branding, domains, email hosts, and worker permissions.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '30px', alignItems: 'flex-start', width: '100%' }}>
        
        {/* Left Settings Sidebar Navigation */}
        <div className="card" style={{ padding: '16px', position: 'sticky', top: '100px', zIndex: 10 }}>
          <h3 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px', paddingLeft: '14px' }}>
            Settings Navigation
          </h3>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '13px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-main)',
                  backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
                  fontWeight: isActive ? '600' : '500',
                  transition: 'all 0.15s ease',
                  borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                  paddingLeft: isActive ? '11px' : '14px'
                })}
              >
                {({ isActive }) => (
                  <>
                    <span style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right Settings Dynamic Outlet Content Panel */}
        <div style={{ minWidth: 0, width: '100%' }}>
          <Outlet context={{ settings, saveSettings, loadingSettings }} />
        </div>

      </div>
    </div>
  );
}
