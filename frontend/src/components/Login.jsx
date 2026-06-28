import React, { useState } from 'react';
import axios from 'axios';
import { Mail, Lock, AlertTriangle, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import Logo from './Logo';

export default function Login({ onLoginSuccess, onBackToWebsite }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Connect to Laravel API login endpoint
      const response = await axios.post('http://127.0.0.1:8000/api/login', {
        email,
        password,
      });

      const { access_token, user } = response.data;

      // Store in localStorage
      localStorage.setItem('auth_token', access_token);
      localStorage.setItem('user_profile', JSON.stringify(user));

      // Trigger app state change
      onLoginSuccess(user);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else if (err.response && err.response.data && err.response.data.errors) {
        // Validation errors
        const firstError = Object.values(err.response.data.errors)[0][0];
        setError(firstError);
      } else {
        setError('Connection failed. Please ensure the backend server is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (role) => {
    const credentials = {
      admin: { email: 'admin@techfocal.in', password: 'admin123' },
      partner: { email: 'partner@techfocal.in', password: 'partner123' },
      manager: { email: 'manager@techfocal.in', password: 'manager123' },
      worker: { email: 'worker@techfocal.in', password: 'worker123' },
    };

    const selected = credentials[role];
    if (selected) {
      setEmail(selected.email);
      setPassword(selected.password);
      setError('');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card animate-fade-in">
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <Logo variant="stacked" height={60} textColor="#31369d" />
        </div>
        <p className="login-subtitle" style={{ marginTop: '-12px', marginBottom: '24px' }}>Workshop Management System</p>

        {/* Error Feedback */}
        {error && (
          <div className="alert alert-danger">
            <AlertTriangle size={18} className="alert-icon-shrink" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          
          {/* Email field */}
          <div className="form-group">
            <label className="form-label" htmlFor="email-input">
              Email Address
            </label>
            <div className="input-wrapper">
              <span className="input-icon">
                <Mail size={16} />
              </span>
              <input
                id="email-input"
                type="email"
                className="form-input"
                placeholder="name@techfocal.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Password field */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" htmlFor="password-input">
              Password
            </label>
            <div className="input-wrapper">
              <span className="input-icon">
                <Lock size={16} />
              </span>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-light)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                disabled={loading}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="form-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Demo helpers */}
        <div className="role-helper-text">
          <p>Quick Demo Sign-ins</p>
          <div className="role-badge-list">
            <button
              onClick={() => handleQuickLogin('partner')}
              className="role-helper-badge"
              type="button"
            >
              Partner
            </button>
            <button
              onClick={() => handleQuickLogin('admin')}
              className="role-helper-badge"
              type="button"
            >
              Admin
            </button>
            <button
              onClick={() => handleQuickLogin('manager')}
              className="role-helper-badge"
              type="button"
            >
              Manager
            </button>
            <button
              onClick={() => handleQuickLogin('worker')}
              className="role-helper-badge"
              type="button"
            >
              Worker
            </button>
          </div>
        </div>

        {/* Back to Website Link */}
        {onBackToWebsite && (
          <div style={{ textAlign: 'center', marginTop: '20px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
            <button
              onClick={onBackToWebsite}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary)',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'opacity 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = 0.8}
              onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
            >
              ← Back to Main Website
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
