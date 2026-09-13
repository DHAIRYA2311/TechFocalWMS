import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react';
import Logo from './Logo';

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(location.state?.error || '');
  const [successMsg, setSuccessMsg] = useState(location.state?.message || '');
  const [loading, setLoading] = useState(false);
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [isEmailOtp, setIsEmailOtp] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const response = await axios.post('/api/login', {
        email,
        password,
      });

      if (response.data.requires_mfa) {
        setRequiresMfa(true);
        setIsEmailOtp(false);
        setMfaToken(response.data.mfa_token);
        setLoading(false);
        return;
      }

      if (response.data.requires_email_otp) {
        setRequiresMfa(true);
        setIsEmailOtp(true);
        setMfaToken(response.data.mfa_token);
        setError(response.data.message || 'Please check your email for the verification code.');
        setLoading(false);
        return;
      }

      const { access_token, user, needs_mfa_setup } = response.data;
      localStorage.setItem('auth_token', access_token);
      localStorage.setItem('user_profile', JSON.stringify(user));

      onLoginSuccess(user, needs_mfa_setup);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else if (err.response && err.response.data && err.response.data.errors) {
        const firstError = Object.values(err.response.data.errors)[0][0];
        setError(firstError);
      } else {
        setError('Connection failed. Please ensure the backend server is running.');
      }
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.length < 6) {
      setError('Please enter a valid authenticator or recovery code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/login/mfa', {
        mfa_token: mfaToken,
        code: mfaCode,
      });

      const { access_token, user, needs_mfa_setup } = response.data;
      localStorage.setItem('auth_token', access_token);
      localStorage.setItem('user_profile', JSON.stringify(user));
      
      onLoginSuccess(user, needs_mfa_setup);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Invalid authentication code.');
      }
      setLoading(false);
    }
  };

  const handleQuickLogin = (role) => {
    const credentials = {
      admin: { email: 'admin@techfocal.in', password: 'admin123' },
      partner: { email: 'partner@techfocal.in', password: 'partner123' },
      manager: { email: 'manager@techfocal.in', password: 'manager@123' },
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
    <div className="auth-container">
      <div className="auth-header">
        <Logo variant="stacked" height={60} textColor="#ffffff" />
        <h2 className="auth-title">
          {requiresMfa ? 'Two-factor verification' : 'Welcome back'}
        </h2>
        <p className="auth-subtitle">
          {requiresMfa 
            ? 'Enter the 6-digit verification code from your authenticator app, or use one of your Recovery Codes.' 
            : 'Sign in to continue to your account.'}
        </p>
      </div>

      {successMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', color: '#6ee7b7', fontSize: '13px', marginBottom: '20px' }}>
          {successMsg}
        </div>
      )}

      {error && (
        <div className="auth-alert-error">
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {requiresMfa ? (
        <form onSubmit={handleMfaSubmit}>
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="mfa-input">
              Verification / Recovery Code
            </label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon"><Lock size={18} /></span>
              <input
                id="mfa-input"
                type="text"
                className="auth-input"
                placeholder="000000"
                maxLength={16}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                disabled={loading}
                autoComplete="off"
              />
            </div>
          </div>
          
          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" style={{marginRight: '8px'}} /> : null}
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>
          
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button type="button" onClick={() => { setRequiresMfa(false); setMfaCode(''); }} className="auth-link">
              Back to Sign In
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="email-input">Email Address</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon"><Mail size={18} /></span>
              <input
                id="email-input"
                type="email"
                className="auth-input"
                placeholder="name@techfocal.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-form-group">
            <label className="auth-label" htmlFor="password-input">Password</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon"><Lock size={18} /></span>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: 0 }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '24px' }}>
            <Link to="/forgot-password" className="auth-link">
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" style={{marginRight: '8px'}} /> : null}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      )}

      {/* Demo Sign-ins */}
      {!requiresMfa && (
        <div style={{ marginTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
          <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Quick Demo Sign-ins
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {['admin', 'partner', 'manager', 'worker'].map(role => (
              <button 
                key={role}
                onClick={() => handleQuickLogin(role)} 
                type="button"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e2e8f0',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
