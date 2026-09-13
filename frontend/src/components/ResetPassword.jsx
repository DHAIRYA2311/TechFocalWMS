import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { Lock, Eye, EyeOff, Loader2, ArrowLeft, Wand2, AlertTriangle, CheckCircle } from 'lucide-react';
import Logo from './Logo';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generatePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
    const allChars = uppercase + lowercase + numbers + symbols;
    
    let generated = '';
    generated += uppercase[Math.floor(Math.random() * uppercase.length)];
    generated += lowercase[Math.floor(Math.random() * lowercase.length)];
    generated += numbers[Math.floor(Math.random() * numbers.length)];
    generated += symbols[Math.floor(Math.random() * symbols.length)];
    
    for (let i = 0; i < 12; i++) {
      generated += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the generated password
    generated = generated.split('').sort(() => 0.5 - Math.random()).join('');
    
    setPassword(generated);
    setPasswordConfirmation(generated);
    setShowPassword(true);
    setShowConfirmPassword(true);
  };

  useEffect(() => {
    // Parse query params for token and email
    const params = new URLSearchParams(location.search);
    const tokenParam = params.get('token');
    const emailParam = params.get('email');
    
    if (tokenParam && emailParam) {
      setToken(tokenParam);
      setEmail(emailParam);
    } else {
      setError('Invalid or missing password reset token.');
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !passwordConfirmation) return;

    if (password !== passwordConfirmation) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/reset-password', {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation
      });
      
      // Navigate directly to login with success message via state
      navigate('/login', { state: { message: response.data.message || 'Your password has been successfully changed.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. The link might be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <Logo variant="stacked" height={60} textColor="#ffffff" />
        <h2 className="auth-title">Create a new password</h2>
        <p className="auth-subtitle">
          Enter and confirm your new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="auth-alert-error">
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <div className="auth-form-group">
          <label className="auth-label">New Password</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button
              type="button"
              onClick={generatePassword}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', padding: '4px 10px',
                backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#cbd5e1',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
            >
              <Wand2 size={12} /> Generate Strong Password
            </button>
          </div>
          <div className="auth-input-wrapper">
            <span className="auth-input-icon"><Lock size={18} /></span>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || !token}
              placeholder="Enter new password"
              className="auth-input"
              style={{ paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: 0 }}
              disabled={loading || !token}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', lineHeight: '1.4' }}>
            Policy: Minimum 12 characters, including uppercase, lowercase, numbers, and symbols. Previous passwords cannot be reused.
          </p>
        </div>

        <div className="auth-form-group" style={{ marginBottom: '28px' }}>
          <label className="auth-label">Confirm Password</label>
          <div className="auth-input-wrapper">
            <span className="auth-input-icon"><Lock size={18} /></span>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              disabled={loading || !token}
              placeholder="Re-enter new password"
              className="auth-input"
              style={{ paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: 0 }}
              disabled={loading || !token}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="auth-btn-primary"
          disabled={loading || !password || !passwordConfirmation || !token}
        >
          {loading ? <Loader2 size={18} className="animate-spin" style={{marginRight: '8px'}} /> : null}
          {loading ? 'Resetting password...' : 'Reset Password'}
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
    </div>
  );
}
