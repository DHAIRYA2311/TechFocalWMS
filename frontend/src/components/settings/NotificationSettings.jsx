import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Save, Loader2, CheckCircle2, AlertCircle, Bell, Info, Mail, Clock, ShoppingBag } from 'lucide-react';

export default function NotificationSettings() {
  const { settings, saveSettings, loadingSettings } = useOutletContext();
  const [formData, setFormData] = useState({
    notify_email: '1',
    notify_inventory: '1',
    notify_job_completion: '1',
    notif_po_enabled: 'true',
    notif_attendance_enabled: 'true',
    notif_attendance_day_time: '10:00',
    notif_attendance_night_time: '22:00'
  });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        notify_email: settings.notify_email || '1',
        notify_inventory: settings.notify_inventory || '1',
        notify_job_completion: settings.notify_job_completion || '1',
        notif_po_enabled: settings.notif_po_enabled !== undefined ? settings.notif_po_enabled : 'true',
        notif_attendance_enabled: settings.notif_attendance_enabled !== undefined ? settings.notif_attendance_enabled : 'true',
        notif_attendance_day_time: settings.notif_attendance_day_time || '10:00',
        notif_attendance_night_time: settings.notif_attendance_night_time || '22:00'
      });
    }
  }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await saveSettings(formData);
      setFeedback({ type: 'success', message: 'Notification audit preferences and time schedules updated successfully.' });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to save notification configurations.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key) => {
    setFormData(prev => ({
      ...prev,
      [key]: prev[key] === 'true' ? 'false' : 'true'
    }));
  };

  const handleToggleLegacy = (key) => {
    setFormData(prev => ({
      ...prev,
      [key]: prev[key] === '1' ? '0' : '1'
    }));
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
          <Bell size={20} style={{ color: 'var(--color-primary)' }} />
          System Alerts & Notifications
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          Configure automated email, desktop push, and shift scheduler reminder timings for active operations.
        </p>

        {feedback && (
          <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: '20px' }}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* 1. Purchase Orders Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShoppingBag size={14} />
                Purchase Order Alerts
              </h3>
              <div style={toggleRowStyle}>
                <div>
                  <h4 style={toggleTitleStyle}>PO Receive & Revision Alerts</h4>
                  <p style={toggleDescStyle}>Send notifications when new PO files, revision changes, or duplicate PO warnings are detected from email parse scans.</p>
                </div>
                <label style={switchContainerStyle}>
                  <input 
                    type="checkbox" 
                    checked={formData.notif_po_enabled === 'true'} 
                    onChange={() => handleToggle('notif_po_enabled')} 
                    style={{ display: 'none' }}
                  />
                  <div style={{ ...switchTrackStyle, backgroundColor: formData.notif_po_enabled === 'true' ? 'var(--color-primary)' : '#cbd5e1' }}>
                    <div style={{ ...switchThumbStyle, transform: formData.notif_po_enabled === 'true' ? 'translateX(20px)' : 'translateX(0)' }}></div>
                  </div>
                </label>
              </div>
            </div>

            {/* 2. Attendance Auditing & Reminders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} />
                Attendance Shift Reminders
              </h3>
              <div style={toggleRowStyle}>
                <div>
                  <h4 style={toggleTitleStyle}>Daily Attendance Audit Reminders</h4>
                  <p style={toggleDescStyle}>Check attendance sheets at target times and dispatch alert reminders to supervisors if no workers checked in.</p>
                </div>
                <label style={switchContainerStyle}>
                  <input 
                    type="checkbox" 
                    checked={formData.notif_attendance_enabled === 'true'} 
                    onChange={() => handleToggle('notif_attendance_enabled')} 
                    style={{ display: 'none' }}
                  />
                  <div style={{ ...switchTrackStyle, backgroundColor: formData.notif_attendance_enabled === 'true' ? 'var(--color-primary)' : '#cbd5e1' }}>
                    <div style={{ ...switchThumbStyle, transform: formData.notif_attendance_enabled === 'true' ? 'translateX(20px)' : 'translateX(0)' }}></div>
                  </div>
                </label>
              </div>

              {formData.notif_attendance_enabled === 'true' && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                  padding: '16px 20px',
                  backgroundColor: 'var(--color-bg-base)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  marginTop: '4px'
                }} className="animate-fade-in">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>Day Shift Audit Time</label>
                    <input 
                      type="time" 
                      className="form-input"
                      value={formData.notif_attendance_day_time}
                      onChange={e => setFormData({ ...formData, notif_attendance_day_time: e.target.value })}
                      style={{ paddingLeft: '12px', height: '38px' }}
                      required
                    />
                    <span style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '4px' }}>
                      Sends checklist alert daily at this time.
                    </span>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>Night Shift Audit Time</label>
                    <input 
                      type="time" 
                      className="form-input"
                      value={formData.notif_attendance_night_time}
                      onChange={e => setFormData({ ...formData, notif_attendance_night_time: e.target.value })}
                      style={{ paddingLeft: '12px', height: '38px' }}
                      required
                    />
                    <span style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '4px' }}>
                      Sends checklist alert daily at this time.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. General Operations Alerts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} />
                General System Alerts
              </h3>
              
              <div style={toggleRowStyle}>
                <div>
                  <h4 style={toggleTitleStyle}>Global Email Notifications</h4>
                  <p style={toggleDescStyle}>Send summary notifications and account triggers to company mailbox addresses.</p>
                </div>
                <label style={switchContainerStyle}>
                  <input 
                    type="checkbox" 
                    checked={formData.notify_email === '1'} 
                    onChange={() => handleToggleLegacy('notify_email')} 
                    style={{ display: 'none' }}
                  />
                  <div style={{ ...switchTrackStyle, backgroundColor: formData.notify_email === '1' ? 'var(--color-primary)' : '#cbd5e1' }}>
                    <div style={{ ...switchThumbStyle, transform: formData.notify_email === '1' ? 'translateX(20px)' : 'translateX(0)' }}></div>
                  </div>
                </label>
              </div>

              <div style={toggleRowStyle}>
                <div>
                  <h4 style={toggleTitleStyle}>Low Material Stock Alerts</h4>
                  <p style={toggleDescStyle}>Notify when raw sheets, lathe tools, or machine lubricants fall below buffers.</p>
                </div>
                <label style={switchContainerStyle}>
                  <input 
                    type="checkbox" 
                    checked={formData.notify_inventory === '1'} 
                    onChange={() => handleToggleLegacy('notify_inventory')} 
                    style={{ display: 'none' }}
                  />
                  <div style={{ ...switchTrackStyle, backgroundColor: formData.notify_inventory === '1' ? 'var(--color-primary)' : '#cbd5e1' }}>
                    <div style={{ ...switchThumbStyle, transform: formData.notify_inventory === '1' ? 'translateX(20px)' : 'translateX(0)' }}></div>
                  </div>
                </label>
              </div>

              <div style={toggleRowStyle}>
                <div>
                  <h4 style={toggleTitleStyle}>Machining Completion Alerts</h4>
                  <p style={toggleDescStyle}>Notify supervisors when machine runs are complete and job cards require inspection.</p>
                </div>
                <label style={switchContainerStyle}>
                  <input 
                    type="checkbox" 
                    checked={formData.notify_job_completion === '1'} 
                    onChange={() => handleToggleLegacy('notify_job_completion')} 
                    style={{ display: 'none' }}
                  />
                  <div style={{ ...switchTrackStyle, backgroundColor: formData.notify_job_completion === '1' ? 'var(--color-primary)' : '#cbd5e1' }}>
                    <div style={{ ...switchThumbStyle, transform: formData.notify_job_completion === '1' ? 'translateX(20px)' : 'translateX(0)' }}></div>
                  </div>
                </label>
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
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Styling Constants
const toggleRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-bg-base)',
  gap: '20px'
};

const toggleTitleStyle = {
  fontSize: '14px',
  fontWeight: '600',
  color: 'var(--color-text-main)',
  marginBottom: '2px'
};

const toggleDescStyle = {
  fontSize: '12px',
  color: 'var(--color-text-muted)',
  lineHeight: '1.4'
};

const switchContainerStyle = {
  position: 'relative',
  display: 'inline-block',
  width: '44px',
  height: '24px',
  cursor: 'pointer',
  flexShrink: 0
};

const switchTrackStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '34px',
  transition: 'background-color 0.2s',
  padding: '2px'
};

const switchThumbStyle = {
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  backgroundColor: '#ffffff',
  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  transition: 'transform 0.2s'
};
