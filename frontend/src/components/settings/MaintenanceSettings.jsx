import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Loader2, CheckCircle2, AlertCircle, Globe, Key, Copy, RefreshCw } from 'lucide-react';

export default function MaintenanceSettings() {
  const [formData, setFormData] = useState({
    maintenance_enabled: false,
    maintenance_title: 'Website Under Maintenance',
    maintenance_description: "We're currently improving our website. Please check back later.",
    maintenance_launch_date: '',
    maintenance_bg_image: '',
    maintenance_show_socials: true,
    maintenance_show_contact: true,
    maintenance_show_timer: false,
    maintenance_access_code: '',
    maintenance_code_expires_at: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('/api/settings/maintenance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormData({
        maintenance_enabled: response.data.maintenance_enabled || false,
        maintenance_title: response.data.maintenance_title || '',
        maintenance_description: response.data.maintenance_description || '',
        maintenance_launch_date: response.data.maintenance_launch_date || '',
        maintenance_bg_image: response.data.maintenance_bg_image || '',
        maintenance_show_socials: response.data.maintenance_show_socials ?? true,
        maintenance_show_contact: response.data.maintenance_show_contact ?? true,
        maintenance_show_timer: response.data.maintenance_show_timer ?? false,
        maintenance_access_code: response.data.maintenance_access_code || '',
        maintenance_code_expires_at: response.data.maintenance_code_expires_at || ''
      });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to load maintenance settings.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      await axios.post('/api/settings/maintenance', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeedback({ type: 'success', message: 'Maintenance settings updated successfully.' });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to save maintenance settings.' });
    } finally {
      setSaving(false);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'TF-PREVIEW-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, maintenance_access_code: code }));
  };

  const copyCode = () => {
    navigator.clipboard.writeText(formData.maintenance_access_code);
    alert('Access code copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
        <Loader2 className="spin" size={24} style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
        <div style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '10px', borderRadius: '10px' }}>
          <Globe size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-text-main)', margin: 0 }}>Website Maintenance Mode</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0, marginTop: '4px' }}>
            Control public access to the TechFocal website. Use private access codes to preview the site during maintenance.
          </p>
        </div>
      </div>

      {feedback && (
        <div style={{ 
          padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '13px',
          display: 'flex', alignItems: 'center', gap: '8px',
          backgroundColor: feedback.type === 'success' ? 'var(--color-success-light)' : 'var(--color-danger-light)',
          color: feedback.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
          border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`
        }}>
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Master Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: formData.maintenance_enabled ? '#fff1f2' : '#f8fafc', border: `1px solid ${formData.maintenance_enabled ? '#fecdd3' : '#e2e8f0'}`, borderRadius: '8px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: formData.maintenance_enabled ? '#e11d48' : 'var(--color-text-main)' }}>
              Enable Maintenance Mode
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              When enabled, public visitors will see the maintenance page instead of the actual website.
            </div>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px' }}>
            <input 
              type="checkbox" 
              checked={formData.maintenance_enabled}
              onChange={(e) => setFormData({...formData, maintenance_enabled: e.target.checked})}
              style={{ opacity: 0, width: 0, height: 0 }} 
            />
            <span style={{
              position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: formData.maintenance_enabled ? '#e11d48' : '#cbd5e1', borderRadius: '34px',
              transition: '.2s'
            }}>
              <span style={{
                position: 'absolute', content: '""', height: '18px', width: '18px',
                left: formData.maintenance_enabled ? '28px' : '4px', bottom: '4px',
                backgroundColor: 'white', borderRadius: '50%', transition: '.2s'
              }}/>
            </span>
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Maintenance Title</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Website Under Maintenance"
              value={formData.maintenance_title}
              onChange={(e) => setFormData({...formData, maintenance_title: e.target.value})}
              style={{ paddingLeft: '12px' }}
            />
          </div>
          
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Description</label>
            <textarea 
              className="form-input" 
              rows={3}
              placeholder="Message to display to visitors..."
              value={formData.maintenance_description}
              onChange={(e) => setFormData({...formData, maintenance_description: e.target.value})}
              style={{ paddingLeft: '12px' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Estimated Launch Date (Optional)</label>
            <input 
              type="datetime-local" 
              className="form-input" 
              value={formData.maintenance_launch_date}
              onChange={(e) => setFormData({...formData, maintenance_launch_date: e.target.value})}
              style={{ paddingLeft: '12px' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Background Image URL (Optional)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="https://example.com/bg.jpg"
              value={formData.maintenance_bg_image}
              onChange={(e) => setFormData({...formData, maintenance_bg_image: e.target.value})}
              style={{ paddingLeft: '12px' }}
            />
          </div>
        </div>

        {/* Display Toggles */}
        <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-main)', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={formData.maintenance_show_socials}
              onChange={(e) => setFormData({...formData, maintenance_show_socials: e.target.checked})}
            />
            Show Social Links
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-main)', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={formData.maintenance_show_contact}
              onChange={(e) => setFormData({...formData, maintenance_show_contact: e.target.checked})}
            />
            Show Contact Info
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-main)', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={formData.maintenance_show_timer}
              onChange={(e) => setFormData({...formData, maintenance_show_timer: e.target.checked})}
            />
            Show Countdown Timer
          </label>
        </div>

        {/* Private Access Code Section */}
        <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={18} style={{ color: 'var(--color-primary)' }}/> Private Preview Access
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'end' }}>
            <div className="form-group">
              <label className="form-label">Access Code</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. DEMO-2026"
                  value={formData.maintenance_access_code}
                  onChange={(e) => setFormData({...formData, maintenance_access_code: e.target.value})}
                  style={{ fontFamily: 'monospace', fontSize: '14px', letterSpacing: '1px', paddingLeft: '12px' }}
                />
                <button type="button" onClick={copyCode} className="logout-btn" style={{ padding: '0 12px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Copy Code">
                  <Copy size={16} />
                </button>
                <button type="button" onClick={generateCode} className="logout-btn" style={{ padding: '0 12px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Generate New">
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Code Expiry (Optional)</label>
              <input 
                type="datetime-local" 
                className="form-input" 
                value={formData.maintenance_code_expires_at}
                onChange={(e) => setFormData({...formData, maintenance_code_expires_at: e.target.value})}
                style={{ paddingLeft: '12px' }}
              />
            </div>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
            Share this code with stakeholders to allow them to preview the website while maintenance mode is active.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
          <button 
            type="submit" 
            className="form-button" 
            disabled={saving}
            style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 24px', height: '42px', marginTop: 0 }}
          >
            {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
            {saving ? 'Saving Settings...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
