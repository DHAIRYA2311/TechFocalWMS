import React, { useState, useEffect } from 'react';
import CustomSelect from '../CustomSelect';
import { useOutletContext } from 'react-router-dom';
import { Save, Loader2, CheckCircle2, AlertCircle, Shield } from 'lucide-react';

export default function SecuritySettings() {
  const { settings, saveSettings, loadingSettings } = useOutletContext();
  const [formData, setFormData] = useState({
    mfa_global_enabled: 'false'
  });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        mfa_global_enabled: settings.mfa_global_enabled || 'false'
      });
    }
  }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await saveSettings(formData);
      setFeedback({ type: 'success', message: 'Security configurations updated successfully.' });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to save security configurations.' });
    } finally {
      setSaving(false);
    }
  };

  if (loadingSettings) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="card">
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={20} style={{ color: 'var(--color-primary)' }} />
          Security Settings
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          Configure global security policies such as Multi-Factor Authentication (MFA), password complexity, and session timeouts.
        </p>

        {feedback && (
          <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: '20px' }}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Global Multi-Factor Authentication (MFA)</label>
              <CustomSelect
                value={formData.mfa_global_enabled}
                onChange={val => setFormData({ ...formData, mfa_global_enabled: val })}
                options={[
                  { value: 'false', label: 'Disabled (Standard Security)' },
                  { value: 'true', label: 'Enabled (Enforce 2FA/Authenticator)' }
                ]}
                style={{ height: '38px' }}
              />
              <p style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '4px' }}>
                If enabled, users will be prompted to set up an Authenticator App (like Google Authenticator) after logging in.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            <div className="form-group" style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <label className="form-label" style={{ color: '#0f172a', fontWeight: '600' }}>Global Password Policy</label>
              <div style={{ fontSize: '13px', color: 'var(--color-text-main)', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={14} color="#10b981" /> Minimum 12 characters required</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={14} color="#10b981" /> Must include uppercase & lowercase letters</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={14} color="#10b981" /> Must include numbers & symbols</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={14} color="#10b981" /> Cannot reuse previously used passwords</div>
              </div>
              <p style={{ fontSize: '11px', color: '#64748b', marginTop: '12px' }}>
                This is a strict system-level policy enforced by the backend and cannot be disabled.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
            <button 
              type="submit" 
              className="form-button"
              disabled={saving}
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 24px', height: '42px', marginTop: 0 }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Security Config
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
