import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, AlertTriangle, ArrowRight, Eye, EyeOff, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import Logo from './Logo';
import loginBg from '../assets/LOGIN.png';

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [isEmailOtp, setIsEmailOtp] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  // Flip State
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Animation State
  const [isSuccessZoom, setIsSuccessZoom] = useState(false);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState(null);

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;

    setForgotLoading(true);
    setForgotError(null);
    try {
      await axios.post('/api/forgot-password', { email: forgotEmail });
      setForgotSuccess(true);
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

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

      // Store in localStorage
      localStorage.setItem('auth_token', access_token);
      localStorage.setItem('user_profile', JSON.stringify(user));

      // Trigger app state change with smooth transition animation
      setIsSuccessZoom(true);
      setTimeout(() => {
        onLoginSuccess(user, needs_mfa_setup);
      }, 800);
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
      
      // Trigger app state change with smooth transition animation
      setIsSuccessZoom(true);
      setTimeout(() => {
        onLoginSuccess(user, needs_mfa_setup);
      }, 800);
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
      manager: { email: 'manager@techfocal.in', password: 'manager@123' }, //For Local Manager@1234 and Production (DEMO) manager@123s
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
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', padding: '1rem', boxSizing: 'border-box', overflow: 'hidden' }}>
      
      {/* Dynamic CSS injection for Dark Glass Card text colors without touching index.css */}
      <style>
        {`
          .dark-glass-card .login-header h2,
          .dark-glass-card .login-header .login-subtitle,
          .dark-glass-card .form-label,
          .dark-glass-card .role-helper-text p {
            color: #f8fafc !important;
          }
          .dark-glass-card .form-input {
            background-color: rgba(15, 23, 42, 0.4) !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
            color: #ffffff !important;
          }
          .dark-glass-card .form-input:focus {
            border-color: #3b82f6 !important;
            background-color: rgba(15, 23, 42, 0.6) !important;
          }
          .dark-glass-card .form-input::placeholder {
            color: rgba(255,255,255,0.4) !important;
          }
          .dark-glass-card .input-icon, 
          .dark-glass-card .password-toggle-btn {
            color: rgba(255,255,255,0.5) !important;
          }
          .dark-glass-card .role-helper-badge {
            background-color: rgba(255,255,255,0.05) !important;
            border: 1px solid rgba(255,255,255,0.15) !important;
            color: #e2e8f0 !important;
            padding: 0.6rem 0.5rem !important;
            font-size: 0.85rem !important;
            font-weight: 500 !important;
            border-radius: 0.5rem !important;
            transition: all 0.2s ease;
          }
          .dark-glass-card .role-helper-badge:hover {
            background-color: rgba(37, 99, 235, 0.2) !important;
            border-color: rgba(59, 130, 246, 0.6) !important;
            color: #ffffff !important;
          }
          .dark-glass-card .premium-btn {
            background-color: #2563eb !important;
            color: #ffffff !important;
            border: none !important;
          }
          .dark-glass-card .premium-btn:hover {
            background-color: #1d4ed8 !important;
          }
          .dark-glass-card .btn-link {
            color: #93c5fd !important;
          }
          .dark-glass-card .btn-link:hover {
            color: #60a5fa !important;
          }
          
          /* Mobile padding adjustment */
          @media (max-width: 640px) {
            .dark-glass-card {
              padding: 1.5rem 1.25rem !important;
            }
          }
        `}
      </style>

      {/* Full-screen Background with smooth zoom animation upon successful login */}
      <div style={{ 
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
        transform: isSuccessZoom ? 'scale(1.2)' : 'scale(1)',
        transition: 'transform 0.9s cubic-bezier(0.25, 0.1, 0.25, 1)'
      }}>
        <img 
          src={loginBg} 
          alt="TechFocal Workshop Background" 
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(1.15) brightness(0.85)' }}
        />
        <div style={{ 
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(5, 10, 20, 0.45)', 
          opacity: isSuccessZoom ? 0.1 : 1,
          transition: 'opacity 0.8s ease-out'
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '380px', margin: '0 auto' }}>
        {/* Clean premium login card */}
        <div className="dark-glass-card" style={{ 
          borderRadius: '1rem', 
          border: '1px solid rgba(255, 255, 255, 0.12)', 
          borderTop: '1px solid rgba(255, 255, 255, 0.25)',
          backgroundColor: 'rgba(15, 23, 42, 0.55)', 
          backdropFilter: 'blur(20px)', 
          WebkitBackdropFilter: 'blur(20px)',
          padding: '2.25rem 1.75rem', 
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          position: 'relative',
          opacity: isSuccessZoom ? 0 : 1,
          transform: isSuccessZoom ? 'scale(0.9) translateY(-10px)' : 'scale(1) translateY(0)',
          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.75rem' }}>
            <Logo variant="stacked" height={75} textColor="#ffffff" />
          </div>

          <div className={`login-flipper ${isFlipped ? 'flipped' : ''}`}>
            
            {/* FRONT SIDE (Login & MFA) */}
            <div className="login-front">
              <div className="login-header">
                <h2>Welcome Back</h2>
                <p className="login-subtitle">Sign in to your account to continue</p>
              </div>

              {error && (
                <div className="alert alert-danger" style={{ marginBottom: '24px' }}>
                  <AlertTriangle size={18} className="alert-icon-shrink" style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {requiresMfa ? (
                <form onSubmit={handleMfaSubmit} className="premium-form">
                  <div className="form-group" style={{ marginBottom: '24px' }}>
                    <label className="form-label" htmlFor="mfa-input">
                      {isEmailOtp ? '6-Digit Email Verification Code' : 'Authenticator or Recovery Code'}
                    </label>
                    <div className="input-wrapper">
                      <span className="input-icon">
                        <Lock size={18} />
                      </span>
                      <input
                        id="mfa-input"
                        type="text"
                        className="form-input"
                        placeholder={isEmailOtp ? "123456" : "000000 or Recovery Code"}
                        maxLength={16}
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value)}
                        disabled={loading}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <button type="submit" className="form-button premium-btn" disabled={loading}>
                    {loading ? (
                      <><Loader2 size={18} className="animate-spin" /> Verifying...</>
                    ) : (
                      <><Lock size={18} /> Verify Code</>
                    )}
                  </button>
                  <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button
                      type="button"
                      onClick={() => { setRequiresMfa(false); setMfaCode(''); }}
                      className="btn-link"
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <form onSubmit={handleSubmit} className="premium-form">
                    {/* Email field */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="email-input">
                        Email Address
                      </label>
                      <div className="input-wrapper">
                        <span className="input-icon">
                          <Mail size={18} />
                        </span>
                        <input
                          id="email-input"
                          type="email"
                          className="form-input"
                          placeholder="name@techfocal.in"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={loading}
                          autoComplete="email"
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
                          <Lock size={18} />
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
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="password-toggle-btn"
                          disabled={loading}
                          aria-label="Toggle password visibility"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <button
                          type="button"
                          className="btn-link"
                          onClick={(e) => {
                            e.preventDefault();
                            setIsFlipped(true);
                          }}
                        >
                          Forgot Password?
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="form-button premium-btn"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          Sign In
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Demo helpers */}
                  <div className="role-helper-text premium-helpers">
                    <p>Quick Demo Sign-ins</p>
                    <div className="role-badge-list">
                      <button onClick={() => handleQuickLogin('partner')} className="role-helper-badge" type="button">Partner</button>
                      <button onClick={() => handleQuickLogin('admin')} className="role-helper-badge" type="button">Admin</button>
                      <button onClick={() => handleQuickLogin('manager')} className="role-helper-badge" type="button">Manager</button>
                      <button onClick={() => handleQuickLogin('worker')} className="role-helper-badge" type="button">Worker</button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* BACK SIDE (Forgot Password) */}
            <div className="login-back">
              <div className="login-header">
                <h2>Reset Password</h2>
                <p className="login-subtitle">Enter your email and we'll send a reset link.</p>
              </div>

              {forgotSuccess ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#10b981', marginBottom: '24px' }}>
                    <CheckCircle size={32} />
                  </div>
                  <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', margin: '0 0 12px' }}>Check Your Email</h2>
                  <p style={{ fontSize: '14px', color: '#475569', marginBottom: '32px', lineHeight: '1.6' }}>
                    If an account exists for <strong>{forgotEmail}</strong>, you will receive a password reset link shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFlipped(false);
                      setForgotSuccess(false);
                      setForgotEmail('');
                    }}
                    className="form-button"
                    style={{ backgroundColor: '#f1f5f9', color: '#475569' }}
                  >
                    <ArrowLeft size={18} style={{ marginRight: '8px' }} />
                    Return to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="premium-form">
                  {forgotError && (
                    <div className="alert alert-danger" style={{ marginBottom: '24px' }}>
                      <AlertTriangle size={18} className="alert-icon-shrink" style={{ flexShrink: 0 }} />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: '24px' }}>
                    <label className="form-label">
                      Email Address
                    </label>
                    <div className="input-wrapper">
                      <span className="input-icon">
                        <Mail size={18} />
                      </span>
                      <input
                        type="email"
                        required
                        className="form-input"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        disabled={forgotLoading}
                        placeholder="name@techfocal.in"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="form-button premium-btn"
                    disabled={forgotLoading || !forgotEmail}
                  >
                    {forgotLoading ? (
                      <><Loader2 size={18} className="animate-spin" /> Sending...</>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>

                  <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button
                      type="button"
                      onClick={() => setIsFlipped(false)}
                      className="btn-link"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <ArrowLeft size={16} /> Back to Login
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
