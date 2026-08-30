import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Loader2, CheckCircle2, AlertCircle, Hash } from 'lucide-react';
import CustomSelect from '../CustomSelect';

export default function InvoiceSettings() {
  const [config, setConfig] = useState({
    invoice_prefix: 'TE',
    invoice_separator: '/',
    invoice_fy_start_month: '4',
    invoice_fy_format: 'auto',
    invoice_padding: '3',
    invoice_starting_number: '1',
    invoice_numbering_active: '1',
  });
  const [sequenceData, setSequenceData] = useState({
    current_fy: '',
    next_number: 1,
    preview: ''
  });
  
  const [overrideNextNumber, setOverrideNextNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('/api/settings/invoice-numbering', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig({
        invoice_prefix: response.data.config.invoice_prefix,
        invoice_separator: response.data.config.invoice_separator,
        invoice_fy_start_month: String(response.data.config.invoice_fy_start_month),
        invoice_fy_format: response.data.config.invoice_fy_format,
        invoice_padding: String(response.data.config.invoice_padding),
        invoice_starting_number: String(response.data.config.invoice_starting_number),
        invoice_numbering_active: response.data.config.invoice_numbering_active ? '1' : '0'
      });
      setSequenceData({
        current_fy: response.data.current_fy,
        next_number: response.data.next_number,
        preview: response.data.preview
      });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to load invoice settings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (name, value) => {
    setConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      const payload = { 
        ...config, 
        invoice_numbering_active: config.invoice_numbering_active === '1',
        override_next_number: overrideNextNumber ? parseInt(overrideNextNumber) : null 
      };
      await axios.post('/api/settings/invoice-numbering', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeedback({ type: 'success', message: 'Invoice numbering updated successfully.' });
      setOverrideNextNumber('');
      fetchData();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to save invoice numbering settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
          <Hash size={20} style={{ color: 'var(--color-primary)' }} />
          Invoice Numbering Settings
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          Configure dynamic sequential invoice numbering safely controlled by the backend.
        </p>

        {feedback && (
          <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: '20px' }}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <div style={{ backgroundColor: 'var(--color-bg-alt)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '24px', border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-light)', fontWeight: '600', marginBottom: '12px' }}>Live Preview</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Current Financial Year: <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{sequenceData.current_fy || 'N/A'}</span></div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Next Number in Sequence: <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{sequenceData.next_number}</span></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Next Invoice Will Be</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-primary)', letterSpacing: '1px' }}>{sequenceData.preview}</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
            <div>
              <label className="form-label" style={{ marginBottom: '2px' }}>Enable Dynamic Invoice Numbering</label>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>If disabled, system will rely on manual or default inputs.</span>
            </div>
            <CustomSelect
              value={config.invoice_numbering_active}
              onChange={val => handleChange('invoice_numbering_active', val)}
              options={[
                { value: '1', label: 'Enabled (Auto)' },
                { value: '0', label: 'Disabled (Manual)' }
              ]}
              style={{ width: '180px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Invoice Prefix</label>
              <input 
                type="text" 
                className="form-input" 
                value={config.invoice_prefix}
                onChange={e => handleChange('invoice_prefix', e.target.value)}
                placeholder="e.g. TE"
                style={{ paddingLeft: '12px' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>The text before the year.</span>
            </div>
            
            <div className="form-group">
              <label className="form-label">Separator</label>
              <input 
                type="text" 
                className="form-input" 
                value={config.invoice_separator}
                onChange={e => handleChange('invoice_separator', e.target.value)}
                placeholder="e.g. / or -"
                style={{ paddingLeft: '12px' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Separates prefix, year, and number.</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Financial Year Format</label>
              <CustomSelect 
                value={config.invoice_fy_format}
                onChange={val => handleChange('invoice_fy_format', val)}
                options={[
                  { value: 'auto', label: 'Auto (e.g. 26-27)' },
                  { value: 'YYYY', label: '4-digit Year (e.g. 2026)' },
                  { value: 'hidden', label: 'Hidden (No year)' }
                ]}
              />
            </div>

            <div className="form-group">
              <label className="form-label">FY Start Month</label>
              <CustomSelect 
                value={config.invoice_fy_start_month}
                onChange={val => handleChange('invoice_fy_start_month', val)}
                options={[
                  { value: '1', label: 'January' },
                  { value: '4', label: 'April (India Standard)' },
                  { value: '7', label: 'July' },
                  { value: '10', label: 'October' }
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Number Padding</label>
              <input 
                type="number" 
                className="form-input" 
                value={config.invoice_padding}
                onChange={e => handleChange('invoice_padding', e.target.value)}
                min="0"
                max="10"
                style={{ paddingLeft: '12px' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>E.g. 3 turns "1" into "001". Set to 0 to disable.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Default Starting Number</label>
              <input 
                type="number" 
                className="form-input" 
                value={config.invoice_starting_number}
                onChange={e => handleChange('invoice_starting_number', e.target.value)}
                min="1"
                style={{ paddingLeft: '12px' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>First number when a new FY starts.</span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px', marginTop: '10px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--color-danger)' }}>Danger Zone: Override Sequence</h4>
            <div className="form-group">
              <label className="form-label">Override Next Number (Current FY)</label>
              <input 
                type="number" 
                className="form-input" 
                value={overrideNextNumber}
                onChange={(e) => setOverrideNextNumber(e.target.value)}
                min="1"
                placeholder={`Current is ${sequenceData.next_number}`}
                style={{ paddingLeft: '12px' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Only fill this if you want to explicitly skip numbers. Leave blank normally.</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button 
              type="submit" 
              className="form-button" 
              disabled={saving} 
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 24px', height: '42px', marginTop: 0 }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
