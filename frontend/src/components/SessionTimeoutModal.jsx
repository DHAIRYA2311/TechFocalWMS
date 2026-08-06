import React from 'react';
import { Clock } from 'lucide-react';

export default function SessionTimeoutModal({ onClose }) {
  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content animate-fade-in" style={{ maxWidth: '400px', textAlign: 'center', padding: '32px' }}>
        <div style={{ 
          backgroundColor: 'var(--color-danger-light)', 
          color: 'var(--color-danger)', 
          width: '64px', 
          height: '64px', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 20px' 
        }}>
          <Clock size={32} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px', color: 'var(--color-text)' }}>
          Session Expired
        </h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
          For your security, your session has timed out due to inactivity. Please log in again to continue working.
        </p>
        <button 
          className="form-button" 
          onClick={onClose}
          style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
        >
          Go to Login
        </button>
      </div>
    </div>
  );
}
