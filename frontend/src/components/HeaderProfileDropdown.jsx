import React, { useState, useRef, useEffect } from 'react';
import { Shield, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import MyProfileModal from './MyProfileModal';
import PersonalSettingsModal from './PersonalSettingsModal';

export default function HeaderProfileDropdown({ user, onLogout, onUserUpdated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleThemeColor = (role) => {
    switch (role) {
      case 'admin': return 'var(--color-primary)';
      case 'partner': return 'var(--color-primary)';
      default: return 'var(--color-text-muted)';
    }
  };

  const getRoleLabel = (role) => {
    switch(role) {
      case 'partner': return 'Partner (Founder)';
      case 'admin': return 'System Administrator';
      case 'manager': return 'Workshop Manager';
      case 'supervisor': return 'Workshop Supervisor';
      case 'helper': return 'Shop Floor Helper';
      case 'accountant': return 'Accountant';
      default: return role || 'Staff';
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
          padding: '4px 8px', borderRadius: '8px', transition: 'background 0.2s',
          backgroundColor: isOpen ? 'rgba(0,0,0,0.05)' : 'transparent'
        }}
        onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.03)'}
        onMouseOut={e => e.currentTarget.style.backgroundColor = isOpen ? 'rgba(0,0,0,0.05)' : 'transparent'}
      >
        <div className="user-info" style={{ textAlign: 'right' }}>
          <p className="user-name" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-main)', margin: 0 }}>{user?.name || 'User Profile'}</p>
          <p className="user-role" style={{ fontSize: '11px', color: getRoleThemeColor(user?.role), textTransform: 'capitalize', margin: 0 }}>
            {getRoleLabel(user?.role)}
          </p>
        </div>
        <div className="user-avatar" style={{ 
          width: '32px', height: '32px', fontSize: '12px', 
          backgroundColor: user?.role === 'admin' ? '#fee2e2' : user?.role === 'partner' ? '#fef3c7' : user?.role === 'manager' ? '#dcfce7' : '#e0e7ff', 
          color: user?.role === 'admin' ? '#dc2626' : user?.role === 'partner' ? '#d97706' : user?.role === 'manager' ? '#16a34a' : '#4f46e5', 
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600',
          overflow: 'hidden'
        }}>
          {user?.photo_path ? (
            <img src={`${import.meta.env.VITE_API_URL}/storage/${user.photo_path}`} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            user?.name ? user.name.split(' ').map(n=>n[0]).join('').substring(0,2) : 'U'
          )}
        </div>
        <ChevronDown size={14} style={{ color: 'var(--color-text-muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>

      {isOpen && (
        <div className="animate-fade-in" style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '8px',
          width: '240px', backgroundColor: '#ffffff', borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0', zIndex: 50, overflow: 'hidden'
        }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
            <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px', marginBottom: '4px' }}>{user?.name}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>{user?.email}</div>
          </div>
          
          <div style={{ padding: '8px' }}>
            <button 
              onClick={() => { setIsOpen(false); setShowProfile(true); }}
              style={{ width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', color: '#334155', fontSize: '13px', fontWeight: '500', transition: 'all 0.15s' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <User size={16} /> My Profile
            </button>
            <button 
              onClick={() => { setIsOpen(false); setShowSettings(true); }}
              style={{ width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', color: '#334155', fontSize: '13px', fontWeight: '500', transition: 'all 0.15s' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Settings size={16} /> Settings
            </button>
          </div>
          
          <div style={{ padding: '8px', borderTop: '1px solid #e2e8f0' }}>
            <button 
              onClick={() => { setIsOpen(false); onLogout(); }}
              style={{ width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', color: '#dc2626', fontSize: '13px', fontWeight: '500', transition: 'all 0.15s' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      )}

      {showProfile && (
        <MyProfileModal 
          user={user} 
          onClose={() => setShowProfile(false)} 
          onUserUpdated={onUserUpdated}
        />
      )}

      {showSettings && (
        <PersonalSettingsModal 
          user={user} 
          onClose={() => setShowSettings(false)} 
          onUserUpdated={onUserUpdated}
        />
      )}
    </div>
  );
}
