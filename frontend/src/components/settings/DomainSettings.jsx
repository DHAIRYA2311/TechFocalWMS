import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Save, Loader2, CheckCircle2, AlertCircle, Globe } from 'lucide-react';

export default function DomainSettings() {
  const { settings, saveSettings, loadingSettings } = useOutletContext();
  const [formData, setFormData] = useState({
    domain_website: '',
    domain_portal: '',
    domain_api: ''
  });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        domain_website: settings.domain_website || '',
        domain_portal: settings.domain_portal || '',
        domain_api: settings.domain_api || ''
      });
    }
  }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await saveSettings(formData);
      setFeedback({ type: 'success', message: 'Domain configurations updated successfully.' });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to save domain configurations.' });
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
          <Globe size={20} style={{ color: 'var(--color-primary)' }} />
          Network & Domains
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          Configure base DNS domains for routing links, webhook callbacks, and SSL redirection rules.
        </p>

        {feedback && (
          <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: '20px' }}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group">
            <label className="form-label">Main Website Domain</label>
            <input 
              type="text"
              className="form-input"
              value={formData.domain_website}
              onChange={e => setFormData({ ...formData, domain_website: e.target.value })}
              style={{ paddingLeft: '12px' }}
              placeholder="techfocal.co.in"
              required
            />
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>The public marketing landing page host.</span>
          </div>

          <div className="form-group">
            <label className="form-label">WMS Staff Portal Domain</label>
            <input 
              type="text"
              className="form-input"
              value={formData.domain_portal}
              onChange={e => setFormData({ ...formData, domain_portal: e.target.value })}
              style={{ paddingLeft: '12px' }}
              placeholder="app.techfocal.co.in"
              required
            />
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>The domain where this administrative WMS is served.</span>
          </div>

          <div className="form-group">
            <label className="form-label">Backend REST API Domain</label>
            <input 
              type="text"
              className="form-input"
              value={formData.domain_api}
              onChange={e => setFormData({ ...formData, domain_api: e.target.value })}
              style={{ paddingLeft: '12px' }}
              placeholder="api.techfocal.co.in"
              required
            />
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>The secure domain of the Laravel REST backend API server.</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '20px', marginTop: '10px' }}>
            <button 
              type="submit" 
              className="form-button"
              disabled={saving}
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 24px', height: '42px', marginTop: 0 }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Domains
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
