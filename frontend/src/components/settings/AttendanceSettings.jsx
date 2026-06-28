import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Save, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export default function AttendanceSettings() {
  const { settings, saveSettings, loadingSettings } = useOutletContext();
  const [formData, setFormData] = useState({
    att_day_shift_start: '09:00',
    att_day_shift_end: '18:00',
    att_day_grace_period: '15',
    att_day_working_hours: '8',
    att_night_shift_start: '21:00',
    att_night_shift_end: '06:00',
    att_night_grace_period: '15',
    att_night_working_hours: '8'
  });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        att_day_shift_start: settings.att_day_shift_start || settings.att_shift_start || '09:00',
        att_day_shift_end: settings.att_day_shift_end || settings.att_shift_end || '18:00',
        att_day_grace_period: settings.att_day_grace_period || settings.att_grace_period || '15',
        att_day_working_hours: settings.att_day_working_hours || settings.att_working_hours || '8',
        att_night_shift_start: settings.att_night_shift_start || '21:00',
        att_night_shift_end: settings.att_night_shift_end || '06:00',
        att_night_grace_period: settings.att_night_grace_period || '15',
        att_night_working_hours: settings.att_night_working_hours || '8'
      });
    }
  }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await saveSettings(formData);
      setFeedback({ type: 'success', message: 'Attendance shift scheduler configurations updated successfully.' });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to save attendance configurations.' });
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
          <Clock size={20} style={{ color: 'var(--color-primary)' }} />
          Shift Schedule & Timings
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          Define standard check-in hours, grace margins, and daily target working shifts for Day and Night shifts.
        </p>

        {feedback && (
          <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: '20px' }}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Day Shift Section */}
          <div style={{ borderBottom: '1px dashed var(--color-border)', paddingBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#eab308' }}></span>
              Day Shift Settings
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Shift Start Time</label>
                <input 
                  type="time"
                  className="form-input"
                  value={formData.att_day_shift_start}
                  onChange={e => setFormData({ ...formData, att_day_shift_start: e.target.value })}
                  style={{ paddingLeft: '12px' }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Shift End Time</label>
                <input 
                  type="time"
                  className="form-input"
                  value={formData.att_day_shift_end}
                  onChange={e => setFormData({ ...formData, att_day_shift_end: e.target.value })}
                  style={{ paddingLeft: '12px' }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Grace Period (Minutes)</label>
                <input 
                  type="number"
                  min="0"
                  max="120"
                  className="form-input"
                  value={formData.att_day_grace_period}
                  onChange={e => setFormData({ ...formData, att_day_grace_period: e.target.value })}
                  style={{ paddingLeft: '12px' }}
                  placeholder="15"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Required Hours</label>
                <input 
                  type="number"
                  min="1"
                  max="24"
                  className="form-input"
                  value={formData.att_day_working_hours}
                  onChange={e => setFormData({ ...formData, att_day_working_hours: e.target.value })}
                  style={{ paddingLeft: '12px' }}
                  placeholder="8"
                  required
                />
              </div>
            </div>
          </div>

          {/* Night Shift Section */}
          <div style={{ paddingBottom: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6366f1' }}></span>
              Night Shift Settings
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Shift Start Time</label>
                <input 
                  type="time"
                  className="form-input"
                  value={formData.att_night_shift_start}
                  onChange={e => setFormData({ ...formData, att_night_shift_start: e.target.value })}
                  style={{ paddingLeft: '12px' }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Shift End Time</label>
                <input 
                  type="time"
                  className="form-input"
                  value={formData.att_night_shift_end}
                  onChange={e => setFormData({ ...formData, att_night_shift_end: e.target.value })}
                  style={{ paddingLeft: '12px' }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Grace Period (Minutes)</label>
                <input 
                  type="number"
                  min="0"
                  max="120"
                  className="form-input"
                  value={formData.att_night_grace_period}
                  onChange={e => setFormData({ ...formData, att_night_grace_period: e.target.value })}
                  style={{ paddingLeft: '12px' }}
                  placeholder="15"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Required Hours</label>
                <input 
                  type="number"
                  min="1"
                  max="24"
                  className="form-input"
                  value={formData.att_night_working_hours}
                  onChange={e => setFormData({ ...formData, att_night_working_hours: e.target.value })}
                  style={{ paddingLeft: '12px' }}
                  placeholder="8"
                  required
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '20px', marginTop: '10px' }}>
            <button 
              type="submit" 
              className="form-button"
              disabled={saving}
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 24px', height: '42px', marginTop: 0 }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
