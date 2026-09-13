import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import Logo from './Logo';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    try {
      await axios.post('/api/forgot-password', { email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <Logo variant="stacked" height={60} textColor="#ffffff" />
        <h2 className="auth-title">Forgot your password?</h2>
        <p className="auth-subtitle">
          Enter your registered email address and we'll send you a password reset link.
        </p>
      </div>

      {success ? (
        <div style={{ textAlign: 'left', padding: '16px 0', animation: 'authFadeIn 0.3s ease-out forwards' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', marginBottom: '20px' }}>
            <CheckCircle size={24} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', margin: '0 0 12px' }}>Check Your Email</h2>
          <p style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '32px', lineHeight: '1.6' }}>
            If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly. Please check your inbox and spam folder.
          </p>
          <Link
            to="/login"
            className="auth-btn-primary"
            style={{ textDecoration: 'none', backgroundColor: 'rgba(255,255,255,0.05)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <ArrowLeft size={18} style={{ marginRight: '8px' }} />
            Return to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="auth-alert-error">
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div className="auth-form-group">
            <label className="auth-label">Email Address</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon"><Mail size={18} /></span>
              <input
                type="email"
                required
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="name@techfocal.in"
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-btn-primary"
            disabled={loading || !email}
          >
            {loading ? <Loader2 size={18} className="animate-spin" style={{marginRight: '8px'}} /> : null}
            {loading ? 'Sending reset link...' : 'Send Reset Link'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Link
              to="/login"
              className="auth-link"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}
            >
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
