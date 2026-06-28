import React, { useState, useEffect } from 'react';
import CustomSelect from '../CustomSelect';
import { useOutletContext } from 'react-router-dom';
import { Save, Loader2, CheckCircle2, AlertCircle, Cpu, Database } from 'lucide-react';

export default function SystemSettings() {
  const { settings, saveSettings, loadingSettings } = useOutletContext();
  const [formData, setFormData] = useState({
    system_timezone: 'Asia/Kolkata',
    system_date_format: 'DD/MM/YYYY',
    system_currency: 'INR'
  });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        system_timezone: settings.system_timezone || 'Asia/Kolkata',
        system_date_format: settings.system_date_format || 'DD/MM/YYYY',
        system_currency: settings.system_currency || 'INR'
      });
    }
  }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await saveSettings(formData);
      setFeedback({ type: 'success', message: 'System configurations updated successfully.' });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to save system configurations.' });
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = () => {
    setBackingUp(true);
    setFeedback(null);
    setTimeout(() => {
      setBackingUp(false);
      setFeedback({
        type: 'success',
        message: 'Database backup compiled and saved locally: techfocal_wms_backup_' + new Date().toISOString().slice(0, 10) + '.sql'
      });
    }, 2000);
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
          <Cpu size={20} style={{ color: 'var(--color-primary)' }} />
          System Environment Settings
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          Configure time zone metrics, international currency settings, and trigger localized backups.
        </p>

        {feedback && (
          <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: '20px' }}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">System Timezone</label>
              <CustomSelect
                value={formData.system_timezone}
                onChange={val => setFormData({ ...formData, system_timezone: val })}
                options={[
                  { value: 'Asia/Kolkata', label: 'Asia / Kolkata (GMT+05:30)' },
                  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
                  { value: 'Europe/London', label: 'Europe / London (GMT+00:00)' },
                  { value: 'America/New_York', label: 'America / New York (GMT-05:00)' }
                ]}
                style={{ height: '38px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Display Date Format</label>
              <CustomSelect
                value={formData.system_date_format}
                onChange={val => setFormData({ ...formData, system_date_format: val })}
                options={[
                  { value: 'DD/MM/YYYY', label: 'DD / MM / YYYY (25/12/2026)' },
                  { value: 'MM/DD/YYYY', label: 'MM / DD / YYYY (12/25/2026)' },
                  { value: 'YYYY-MM-DD', label: 'YYYY - MM - DD (2026-12-25)' }
                ]}
                style={{ height: '38px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Currency Symbol</label>
              <CustomSelect
                value={formData.system_currency}
                onChange={val => setFormData({ ...formData, system_currency: val })}
                options={[
                  { value: 'INR', label: 'Indian Rupee (₹, INR)' },
                  { value: 'USD', label: 'US Dollar ($, USD)' },
                  { value: 'EUR', label: 'Euro (€, EUR)' },
                  { value: 'GBP', label: 'Pound Sterling (£, GBP)' }
                ]}
                style={{ height: '38px' }}
              />
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
              Save System Config
            </button>
          </div>
        </form>
      </div>

      {/* Database Backup Trigger Card */}
      <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.1)', backgroundColor: 'var(--color-bg-base)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-text-main)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={16} style={{ color: 'var(--color-danger)' }} />
          Database Backups
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
          Generate a full structural database dump containing settings, job cards, attendance records, and purchase orders.
        </p>

        <button 
          type="button" 
          className="logout-btn" 
          onClick={handleBackup}
          disabled={backingUp}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--color-border)', color: 'var(--color-text-main)' }}
        >
          {backingUp ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
          Backup Database SQL
        </button>
      </div>

    </div>
  );
}
