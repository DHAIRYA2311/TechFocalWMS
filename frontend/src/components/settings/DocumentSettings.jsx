import React, { useState, useEffect } from 'react';
import CustomSelect from '../CustomSelect';
import { useOutletContext } from 'react-router-dom';
import { Save, Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

export default function DocumentSettings() {
  const { settings, saveSettings, loadingSettings } = useOutletContext();
  const [formData, setFormData] = useState({
    prefix_po: 'PO-',
    prefix_challan: 'DC-',
    prefix_invoice: 'INV-',
    prefix_job: 'JOB-',
    auto_numbering: '1'
  });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        prefix_po: settings.prefix_po || 'PO-',
        prefix_challan: settings.prefix_challan || 'DC-',
        prefix_invoice: settings.prefix_invoice || 'INV-',
        prefix_job: settings.prefix_job || 'JOB-',
        auto_numbering: settings.auto_numbering !== undefined ? settings.auto_numbering : '1'
      });
    }
  }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await saveSettings(formData);
      setFeedback({ type: 'success', message: 'Document prefix settings updated successfully.' });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to save document prefixes.' });
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
          <FileText size={20} style={{ color: 'var(--color-primary)' }} />
          Document Serialization
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          Define prefixes and numbering sequences for jobs, purchase orders, outgoing challans, and commercial invoice ledgers.
        </p>

        {feedback && (
          <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: '20px' }}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Purchase Order (PO) Prefix</label>
              <input 
                type="text"
                className="form-input"
                value={formData.prefix_po}
                onChange={e => setFormData({ ...formData, prefix_po: e.target.value })}
                style={{ paddingLeft: '12px' }}
                placeholder="PO-"
                required
              />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Example: {formData.prefix_po}0001</span>
            </div>

            <div className="form-group">
              <label className="form-label">Job Card Prefix</label>
              <input 
                type="text"
                className="form-input"
                value={formData.prefix_job}
                onChange={e => setFormData({ ...formData, prefix_job: e.target.value })}
                style={{ paddingLeft: '12px' }}
                placeholder="JOB-"
                required
              />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Example: {formData.prefix_job}0001</span>
            </div>

            <div className="form-group">
              <label className="form-label">Delivery Challan (DC) Prefix</label>
              <input 
                type="text"
                className="form-input"
                value={formData.prefix_challan}
                onChange={e => setFormData({ ...formData, prefix_challan: e.target.value })}
                style={{ paddingLeft: '12px' }}
                placeholder="DC-"
                required
              />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Example: {formData.prefix_challan}0001</span>
            </div>

            <div className="form-group">
              <label className="form-label">Commercial Invoice Prefix</label>
              <input 
                type="text"
                className="form-input"
                value={formData.prefix_invoice}
                onChange={e => setFormData({ ...formData, prefix_invoice: e.target.value })}
                style={{ paddingLeft: '12px' }}
                placeholder="INV-"
                required
              />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Example: {formData.prefix_invoice}0001</span>
            </div>
          </div>

          <div className="form-group" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
            <div>
              <label className="form-label" style={{ marginBottom: '2px' }}>Auto Document Numbering</label>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Automatically increment document serial numbers on creation.</span>
            </div>
            <CustomSelect
              value={formData.auto_numbering}
              onChange={val => setFormData({ ...formData, auto_numbering: val })}
              options={[
                { value: '1', label: 'Enabled (Auto)' },
                { value: '0', label: 'Disabled (Manual)' }
              ]}
              style={{ width: '150px' }}
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
              Save Prefixes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
