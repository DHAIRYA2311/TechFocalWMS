import React, { useState } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { X, Settings, Shield, Key, Eye, EyeOff, Wand2, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import MfaSetupPromptModal from './MfaSetupPromptModal';

export default function PersonalSettingsModal({ user, onClose, onUserUpdated }) {
  const [activeTab, setActiveTab] = useState('password');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  
  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // MFA State
  const [isMfaActive, setIsMfaActive] = useState(user?.mfa_enabled);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [showDeactivatePrompt, setShowDeactivatePrompt] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState(null);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      await axios.post('/api/user/password', {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFeedback({ type: 'success', message: 'Password successfully changed.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to change password.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateMfa = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      await axios.post('/api/user/mfa/deactivate', {
        password: deactivatePassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFeedback({ type: 'success', message: 'MFA deactivated successfully.' });
      setIsMfaActive(false);
      setShowDeactivatePrompt(false);
      setDeactivatePassword('');
      if (onUserUpdated) onUserUpdated({...user, mfa_enabled: false});
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Incorrect password.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGetRecoveryCodes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('/api/user/mfa/recovery-codes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecoveryCodes(response.data.recovery_codes);
      setFeedback({ type: 'success', message: response.data.message });
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to get recovery codes.' });
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    let pass = '';
    // ensure at least one of each required type
    pass += 'A'; // uppercase
    pass += 'a'; // lowercase
    pass += '1'; // number
    pass += '!'; // symbol
    for (let i = pass.length; i < 16; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Shuffle the string
    pass = pass.split('').sort(() => 0.5 - Math.random()).join('');
    setNewPassword(pass);
    setConfirmPassword(pass);
    setShowPassword(true);
  };

  const downloadRecoveryCodes = () => {
    if (!recoveryCodes) return;
    const content = `TechFocal MFA Recovery Codes\nGenerated on: ${new Date().toLocaleString()}\n\n` + recoveryCodes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'techfocal_recovery_codes.txt';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div className="animate-fade-in" style={{ 
        width: '100%', maxWidth: '540px', backgroundColor: '#ffffff',
        borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh'
      }}>
        {/* Header */}
        <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={20} style={{ color: '#4f46e5' }} /> Personal Settings
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          <button 
            onClick={() => { setActiveTab('password'); setFeedback(null); }}
            style={{ flex: 1, padding: '12px', background: 'none', border: 'none', borderBottom: activeTab === 'password' ? '2px solid #2563eb' : '2px solid transparent', color: activeTab === 'password' ? '#2563eb' : '#64748b', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
          >
            <Key size={16} /> Password
          </button>
          <button 
            onClick={() => { setActiveTab('mfa'); setFeedback(null); }}
            style={{ flex: 1, padding: '12px', background: 'none', border: 'none', borderBottom: activeTab === 'mfa' ? '2px solid #2563eb' : '2px solid transparent', color: activeTab === 'mfa' ? '#2563eb' : '#64748b', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
          >
            <Shield size={16} /> Two-Factor Auth
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto' }}>
          {feedback && (
            <div style={{ padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
              backgroundColor: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: feedback.type === 'success' ? '#166534' : '#991b1b',
              border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`
            }}>
              {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {feedback.message}
            </div>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Current Password</label>
                <input 
                  type="password" 
                  value={currentPassword} 
                  onChange={e => setCurrentPassword(e.target.value)} 
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px dashed #cbd5e1', fontSize: '12px', color: '#64748b' }}>
                <strong style={{ color: '#0f172a' }}>Password Policy:</strong> Minimum 12 characters, including at least one uppercase letter, one lowercase letter, one number, and one symbol (!@#$%^&*). Cannot reuse the last 5 passwords.
              </div>

              <div style={{ position: 'relative' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  <span>New Password</span>
                  <button type="button" onClick={generatePassword} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600' }}>
                    <Wand2 size={12} /> Generate
                  </button>
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    required
                    style={{ width: '100%', padding: '10px 40px 10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Confirm New Password</label>
                <input 
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={{ width: '100%', padding: '12px', backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#ffffff', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Update Password'}
              </button>
            </form>
          )}

          {activeTab === 'mfa' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: isMfaActive ? '#f0fdf4' : '#f8fafc', border: `1px solid ${isMfaActive ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: isMfaActive ? '#dcfce7' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isMfaActive ? '#16a34a' : '#64748b' }}>
                    <Shield size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '15px' }}>Two-Factor Authentication</div>
                    <div style={{ fontSize: '13px', color: isMfaActive ? '#16a34a' : '#64748b', fontWeight: '500' }}>
                      {isMfaActive ? 'Currently Enabled' : 'Currently Disabled'}
                    </div>
                  </div>
                </div>
                {isMfaActive ? (
                  <button onClick={() => setShowDeactivatePrompt(true)} style={{ padding: '8px 16px', backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
                    Deactivate
                  </button>
                ) : (
                  <button onClick={() => setShowMfaSetup(true)} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
                    Enable MFA
                  </button>
                )}
              </div>

              {isMfaActive && !showDeactivatePrompt && (
                <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#ffffff' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>Recovery Codes</h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
                    Recovery codes can be used to access your account in the event you lose access to your device and cannot receive two-factor authentication codes.
                  </p>
                  
                  {recoveryCodes ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                        {recoveryCodes.map((code, i) => (
                          <div key={i} style={{ fontFamily: 'monospace', fontSize: '14px', color: '#0f172a', fontWeight: '600', textAlign: 'center' }}>{code}</div>
                        ))}
                      </div>
                      <button onClick={downloadRecoveryCodes} style={{ width: '100%', padding: '10px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#334155', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Download size={16} /> Download as TXT
                      </button>
                    </div>
                  ) : (
                    <button onClick={handleGetRecoveryCodes} disabled={loading} style={{ padding: '10px 16px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#334155', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      {loading ? <Loader2 size={16} className="animate-spin" /> : 'Generate New Recovery Codes'}
                    </button>
                  )}
                </div>
              )}

              {showDeactivatePrompt && (
                <form onSubmit={handleDeactivateMfa} style={{ padding: '16px', border: '1px solid #fecaca', borderRadius: '12px', backgroundColor: '#fff5f5' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>Confirm Deactivation</h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#7f1d1d' }}>
                    To deactivate Two-Factor Authentication, please enter your password. This will decrease the security of your account.
                  </p>
                  <input 
                    type="password" 
                    value={deactivatePassword} 
                    onChange={e => setDeactivatePassword(e.target.value)} 
                    placeholder="Enter your password"
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #fca5a5', fontSize: '14px', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={() => { setShowDeactivatePrompt(false); setDeactivatePassword(''); }} style={{ flex: 1, padding: '10px', backgroundColor: '#ffffff', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" disabled={loading} style={{ flex: 1, padding: '10px', backgroundColor: '#dc2626', border: 'none', borderRadius: '8px', color: '#ffffff', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Deactivate'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {showMfaSetup && (
        <MfaSetupPromptModal 
          onClose={() => {
            setShowMfaSetup(false);
            // Re-fetch user or assume MFA is active if they completed it
            // Ideally we check if they actually enabled it
            // Assuming the modal fires a trigger if successful, or we just rely on parent component reloading
            // But we can trigger a hard reload of the dashboard to be safe if they complete it
          }} 
        />
      )}
    </div>,
    document.body
  );
}
