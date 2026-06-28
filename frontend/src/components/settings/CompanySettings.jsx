import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Save, Loader2, CheckCircle2, AlertCircle, Building } from 'lucide-react';

export default function CompanySettings() {
  const { settings, saveSettings, loadingSettings } = useOutletContext();
  const [formData, setFormData] = useState({
    company_name: '',
    company_logo: '',
    company_gst: '',
    company_pan: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    company_website: ''
  });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name || '',
        company_logo: settings.company_logo || '',
        company_gst: settings.company_gst || '',
        company_pan: settings.company_pan || '',
        company_address: settings.company_address || '',
        company_phone: settings.company_phone || '',
        company_email: settings.company_email || '',
        company_website: settings.company_website || ''
      });
    }
  }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await saveSettings(formData);
      setFeedback({ type: 'success', message: 'Company settings updated successfully.' });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to save company settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, company_logo: reader.result }));
      };
      reader.readAsDataURL(file);
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
          <Building size={20} style={{ color: 'var(--color-primary)' }} />
          Company Information
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          Configure public-facing company details used for headers, portal branding, and commercial invoicing.
        </p>

        {feedback && (
          <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: '20px' }}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Logo Upload */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '20px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              backgroundColor: 'var(--color-bg-base)',
              flexShrink: 0
            }}>
              {formData.company_logo ? (
                <img src={formData.company_logo} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <Building size={32} style={{ color: 'var(--color-text-light)' }} />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-main)' }}>Company Logo</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleLogoUpload}
                style={{ fontSize: '12px' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>PNG, JPG or SVG formats. Max 1MB.</span>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input 
                type="text"
                className="form-input"
                value={formData.company_name}
                onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                style={{ paddingLeft: '12px' }}
                placeholder="TechFocal Enterprises LLP"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">GST Number (GSTIN)</label>
              <input 
                type="text"
                className="form-input"
                value={formData.company_gst}
                onChange={e => setFormData({ ...formData, company_gst: e.target.value })}
                style={{ paddingLeft: '12px' }}
                placeholder="24AAAAA0000A1Z1"
              />
            </div>

            <div className="form-group">
              <label className="form-label">PAN Number</label>
              <input 
                type="text"
                className="form-input"
                value={formData.company_pan}
                onChange={e => setFormData({ ...formData, company_pan: e.target.value })}
                style={{ paddingLeft: '12px' }}
                placeholder="ABCDE1234F"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Company Phone</label>
              <input 
                type="text"
                className="form-input"
                value={formData.company_phone}
                onChange={e => setFormData({ ...formData, company_phone: e.target.value })}
                style={{ paddingLeft: '12px' }}
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Company Email</label>
              <input 
                type="email"
                className="form-input"
                value={formData.company_email}
                onChange={e => setFormData({ ...formData, company_email: e.target.value })}
                style={{ paddingLeft: '12px' }}
                placeholder="info@techfocal.in"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Website URL</label>
              <input 
                type="url"
                className="form-input"
                value={formData.company_website}
                onChange={e => setFormData({ ...formData, company_website: e.target.value })}
                style={{ paddingLeft: '12px' }}
                placeholder="https://techfocal.in"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Office Address</label>
            <textarea
              className="form-input"
              rows="3"
              value={formData.company_address}
              onChange={e => setFormData({ ...formData, company_address: e.target.value })}
              style={{ padding: '12px', resize: 'none', height: '80px' }}
              placeholder="Plot 144, GIDC Industrial Estate, Makarpura, Vadodara, Gujarat 390010"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
            <button 
              type="submit" 
              className="form-button"
              disabled={saving}
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 24px', height: '42px', marginTop: 0 }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
