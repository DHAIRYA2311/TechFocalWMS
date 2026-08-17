import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, AlertTriangle, ArrowRight, Eye, EyeOff, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import Logo from './Logo';

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
        return;
      }

      if (response.data.requires_email_otp) {
        setRequiresMfa(true);
        setIsEmailOtp(true);
        setMfaToken(response.data.mfa_token);
        setError(response.data.message || 'Please check your email for the verification code.');
        return;
      }

      const { access_token, user, needs_mfa_setup } = response.data;

      // Store in localStorage
      localStorage.setItem('auth_token', access_token);
      localStorage.setItem('user_profile', JSON.stringify(user));

      // Trigger app state change
      onLoginSuccess(user, needs_mfa_setup);
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
    } finally {
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
    <div className="login-split-layout">
      {/* Left side: Premium Branding & Imagery */}
      <div className="login-left">
        <div className="login-left-overlay"></div>
        <div className="login-left-content animate-fade-in">
          <Logo variant="stacked" height={80} textColor="#ffffff" />
          <div className="login-left-text">
            <h2>Next-Gen Workshop Management</h2>
            <p>Streamline your production, empower your workforce, and elevate your manufacturing efficiency to new heights.</p>
          </div>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="login-right">
        <div className="login-form-container">
          <div className={`login-flipper ${isFlipped ? 'flipped' : ''}`}>
            
            {/* Front: Login Form */}
            <div className="login-front">
              <div className="login-header">
                <h2>Welcome Back</h2>
                <p className="login-subtitle">Sign in to your account to continue</p>
              </div>

          {/* Error Feedback */}
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

        {/* Back: Forgot Password Form */}
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
