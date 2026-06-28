import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Save, Loader2, CheckCircle2, AlertCircle, Palette } from 'lucide-react';

export default function BrandingSettings() {
  const { settings, saveSettings, loadingSettings } = useOutletContext();
  const [formData, setFormData] = useState({
    branding_primary_color: '#2563eb',
    branding_secondary_color: '#1e293b',
    branding_favicon: '',
    branding_pdf_logo: ''
  });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        branding_primary_color: settings.branding_primary_color || '#2563eb',
        branding_secondary_color: settings.branding_secondary_color || '#1e293b',
        branding_favicon: settings.branding_favicon || '',
        branding_pdf_logo: settings.branding_pdf_logo || ''
      });
    }
  }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await saveSettings(formData);
      setFeedback({ type: 'success', message: 'Branding settings updated successfully.' });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to save branding settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result }));
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
          <Palette size={20} style={{ color: 'var(--color-primary)' }} />
          Branding & Aesthetics
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          Adjust dashboard themes, email headers, favicon visual identifiers, and document print templates.
        </p>

        {feedback && (
          <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: '20px' }}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Colors section */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-main)', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px' }}>Theme Colors</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Primary Color (Main Accents)
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input 
                    type="color" 
                    value={formData.branding_primary_color}
                    onChange={e => setFormData({ ...formData, branding_primary_color: e.target.value })}
                    style={{ width: '44px', height: '40px', padding: 0, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                  />
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.branding_primary_color}
                    onChange={e => setFormData({ ...formData, branding_primary_color: e.target.value })}
                    style={{ flexGrow: 1, paddingLeft: '12px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Secondary Color (Sidebar/Cards)
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input 
                    type="color" 
                    value={formData.branding_secondary_color}
                    onChange={e => setFormData({ ...formData, branding_secondary_color: e.target.value })}
                    style={{ width: '44px', height: '40px', padding: 0, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                  />
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.branding_secondary_color}
                    onChange={e => setFormData({ ...formData, branding_secondary_color: e.target.value })}
                    style={{ flexGrow: 1, paddingLeft: '12px' }}
                  />
                </div>
              </div>
            </div>

            {/* Preview Box */}
            <div style={{ marginTop: '16px', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)' }}>Live Preview Accent:</span>
              <div style={{ padding: '6px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', color: '#ffffff', backgroundColor: formData.branding_primary_color }}>
                Primary Button
              </div>
              <div style={{ padding: '6px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', color: '#ffffff', backgroundColor: formData.branding_secondary_color }}>
                Secondary Tag
              </div>
            </div>
          </div>

          {/* Graphics Section */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-main)', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px' }}>Branding Assets</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* PDF Logo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-main)' }}>PDF Invoice / Challan Logo</span>
                <div style={{
                  height: '80px',
                  border: '1px dashed var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--color-bg-base)',
                  overflow: 'hidden'
                }}>
                  {formData.branding_pdf_logo ? (
                    <img src={formData.branding_pdf_logo} alt="PDF Logo Preview" style={{ maxHeight: '90%', maxWidth: '90%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>No PDF logo uploaded</span>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => handleImageUpload(e, 'branding_pdf_logo')}
                  style={{ fontSize: '12px' }}
                />
              </div>

              {/* Favicon */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-main)' }}>Browser Favicon</span>
                <div style={{
                  height: '80px',
                  border: '1px dashed var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--color-bg-base)',
                  overflow: 'hidden'
                }}>
                  {formData.branding_favicon ? (
                    <img src={formData.branding_favicon} alt="Favicon Preview" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>No Favicon uploaded</span>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/x-icon, image/png"
                  onChange={e => handleImageUpload(e, 'branding_favicon')}
                  style={{ fontSize: '12px' }}
                />
              </div>
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
              Save Branding
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
