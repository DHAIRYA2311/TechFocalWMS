import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Shield, List, BarChart2, Network } from 'lucide-react';

export default function SecurityCenter() {
  return (
    <div className="security-center-layout" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      backgroundColor: '#f8fafc'
    }}>
      <div className="security-nav" style={{ 
        display: 'flex', 
        gap: '20px', 
        padding: '20px 30px', 
        backgroundColor: '#fff',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <NavLink 
          to="dashboard"
          className={({ isActive }) => `security-nav-item ${isActive ? 'active' : ''}`}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: isActive ? 'var(--color-primary)' : '#64748b',
            fontWeight: isActive ? '600' : '500',
            borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
            paddingBottom: '10px',
            marginBottom: '-21px'
          })}
        >
          <BarChart2 size={18} />
          <span>Overview</span>
        </NavLink>

        <NavLink 
          to="logs"
          className={({ isActive }) => `security-nav-item ${isActive ? 'active' : ''}`}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: isActive ? 'var(--color-primary)' : '#64748b',
            fontWeight: isActive ? '600' : '500',
            borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
            paddingBottom: '10px',
            marginBottom: '-21px'
          })}
        >
          <List size={18} />
          <span>Audit Logs</span>
        </NavLink>

        <NavLink 
          to="network"
          className={({ isActive }) => `security-nav-item ${isActive ? 'active' : ''}`}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: isActive ? 'var(--color-primary)' : '#64748b',
            fontWeight: isActive ? '600' : '500',
            borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
            paddingBottom: '10px',
            marginBottom: '-21px'
          })}
        >
          <Network size={18} />
          <span>Network Access</span>
        </NavLink>
      </div>

      <div className="security-content" style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
        <Outlet />
      </div>
    </div>
  );
}
