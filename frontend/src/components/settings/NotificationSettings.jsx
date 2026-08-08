import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Save, Loader2, CheckCircle2, AlertCircle, Bell, Clock, ShoppingBag, FileText, Wrench, Package, ServerCrash, Music, Play } from 'lucide-react';

export default function NotificationSettings() {
  const { settings, saveSettings, loadingSettings } = useOutletContext();
  const [formData, setFormData] = useState({
    notif_po_new: 'true',
    notif_po_review: 'true',
    notif_po_accepted: 'true',
    notif_po_rejected: 'true',
    notif_po_duplicate: 'true',
    notif_po_edited: 'true',
    notif_po_failed: 'true',
    
    notif_inv_generated: 'true',
    notif_inv_payment: 'true',
    notif_inv_overdue: 'true',
    notif_inv_cancelled: 'true',
    notif_inv_edited: 'true',

    notif_att_reminder: 'true',
    notif_att_late: 'true',
    notif_att_correction: 'true',
    notif_attendance_day_time: '10:00',
    notif_attendance_night_time: '22:00',

    notif_machine_maint: 'true',
    notif_machine_idle: 'true',
    notif_job_delayed: 'true',
    
    notify_inventory: 'true',
    notif_email_sync_failed: 'true',
    push_notification_sound: 'default'
  });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (settings) {
      setFormData(prev => ({
        notif_po_new: settings.notif_po_new ?? 'true',
        notif_po_review: settings.notif_po_review ?? 'true',
        notif_po_accepted: settings.notif_po_accepted ?? 'true',
        notif_po_rejected: settings.notif_po_rejected ?? 'true',
        notif_po_duplicate: settings.notif_po_duplicate ?? 'true',
        notif_po_edited: settings.notif_po_edited ?? 'true',
        notif_po_failed: settings.notif_po_failed ?? 'true',
        
        notif_inv_generated: settings.notif_inv_generated ?? 'true',
        notif_inv_payment: settings.notif_inv_payment ?? 'true',
        notif_inv_overdue: settings.notif_inv_overdue ?? 'true',
        notif_inv_cancelled: settings.notif_inv_cancelled ?? 'true',
        notif_inv_edited: settings.notif_inv_edited ?? 'true',

        notif_att_reminder: settings.notif_att_reminder ?? 'true',
        notif_att_late: settings.notif_att_late ?? 'true',
        notif_att_correction: settings.notif_att_correction ?? 'true',
        notif_attendance_day_time: settings.notif_attendance_day_time || '10:00',
        notif_attendance_night_time: settings.notif_attendance_night_time || '22:00',

        notif_machine_maint: settings.notif_machine_maint ?? 'true',
        notif_machine_idle: settings.notif_machine_idle ?? 'true',
        notif_job_delayed: settings.notif_job_delayed ?? 'true',
        
        notify_inventory: settings.notify_inventory === '1' ? 'true' : (settings.notify_inventory === '0' ? 'false' : (settings.notify_inventory ?? 'true')),
        notif_email_sync_failed: settings.notif_email_sync_failed ?? 'true',
        push_notification_sound: settings.push_notification_sound || 'default'
      }));
    }
  }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      // For legacy compatibility, save notify_inventory as '1' or '0'
      const payload = { ...formData };
      payload.notify_inventory = formData.notify_inventory === 'true' ? '1' : '0';

      await saveSettings(payload);
      setFeedback({ type: 'success', message: 'Granular notification preferences updated successfully.' });
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

  const playPreview = (soundName) => {
    if (soundName === 'default') {
      alert("System Default Sound will be played (Cannot preview browser default).");
      return;
    }
    const audio = new Audio(`/sounds/${soundName}`);
    audio.play().catch(e => console.error("Audio play failed", e));
  };

  const renderToggleRow = (key, title, desc, isLast = false) => (
    <div style={{ ...toggleRowStyle, borderBottom: isLast ? 'none' : '1px solid var(--color-border)' }}>
      <div style={{ flex: 1, paddingRight: '20px' }}>
        <h4 style={toggleTitleStyle}>{title}</h4>
        <p style={toggleDescStyle}>{desc}</p>
      </div>
      <label style={switchContainerStyle}>
        <input 
          type="checkbox" 
          checked={formData[key] === 'true'} 
          onChange={() => handleToggle(key)} 
          style={{ display: 'none' }}
        />
        <div style={{ ...switchTrackStyle, backgroundColor: formData[key] === 'true' ? 'var(--color-primary)' : '#cbd5e1' }}>
          <div style={{ ...switchThumbStyle, transform: formData[key] === 'true' ? 'translateX(20px)' : 'translateX(0)' }}></div>
        </div>
      </label>
    </div>
  );

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={20} style={{ color: 'var(--color-primary)' }} />
              Granular Notification Settings
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Enable or disable specific system alerts individually. These settings apply to both mobile push notifications and in-app alerts.
            </p>
          </div>
          <button 
            type="button" 
            onClick={handleSubmit}
            className="form-button"
            disabled={saving}
            style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px', height: '38px', margin: 0 }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save All
          </button>
        </div>

        {feedback && (
          <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: '24px' }}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* 1. Purchase Orders Section */}
          <div style={moduleCardStyle}>
            <div style={moduleHeaderStyle}>
              <ShoppingBag size={16} color="var(--color-primary)" />
              <h3 style={moduleTitleStyle}>Purchase Orders</h3>
            </div>
            <div style={moduleBodyStyle}>
              {renderToggleRow('notif_po_new', 'New PO Received', 'When a new PO is extracted from email.')}
              {renderToggleRow('notif_po_review', 'PO Requires Review', 'When a PO has ambiguous data and needs manual checking.')}
              {renderToggleRow('notif_po_accepted', 'PO Accepted', 'When a PO is approved and jobs are initialized.')}
              {renderToggleRow('notif_po_rejected', 'PO Rejected', 'When a PO is rejected.')}
              {renderToggleRow('notif_po_edited', 'PO Edited / Revised', 'When an existing PO receives an updated revision or manual edit.')}
              {renderToggleRow('notif_po_duplicate', 'Duplicate PO Detected', 'When an email scanner detects an already existing PO number.')}
              {renderToggleRow('notif_po_failed', 'PO Import Failed', 'When an email parser fails to read an attachment.', true)}
            </div>
          </div>

          {/* 2. Invoices Section */}
          <div style={moduleCardStyle}>
            <div style={moduleHeaderStyle}>
              <FileText size={16} color="var(--color-primary)" />
              <h3 style={moduleTitleStyle}>Invoices & Billing</h3>
            </div>
            <div style={moduleBodyStyle}>
              {renderToggleRow('notif_inv_generated', 'Invoice Generated', 'When a new invoice is created.')}
              {renderToggleRow('notif_inv_payment', 'Payment Received', 'When a payment is recorded against an invoice.')}
              {renderToggleRow('notif_inv_overdue', 'Payment Overdue', 'Daily reminder for overdue unpaid invoices.')}
              {renderToggleRow('notif_inv_cancelled', 'Invoice Cancelled', 'When an invoice is voided.')}
              {renderToggleRow('notif_inv_edited', 'Invoice Edited', 'When an invoice gets updated.', true)}
            </div>
          </div>

          {/* 3. Attendance Section */}
          <div style={moduleCardStyle}>
            <div style={moduleHeaderStyle}>
              <Clock size={16} color="var(--color-primary)" />
              <h3 style={moduleTitleStyle}>Attendance</h3>
            </div>
            <div style={moduleBodyStyle}>
              {renderToggleRow('notif_att_late', 'Late Arrival', 'When a worker checks in late.')}
              {renderToggleRow('notif_att_correction', 'Attendance Corrected', 'When a supervisor manually edits a timesheet.')}
              {renderToggleRow('notif_att_reminder', 'Missing Check-ins Reminder', 'Alert when workers haven\'t checked in for an active shift.', true)}
              
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderTop: '1px solid var(--color-border)', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
                <h5 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: 'var(--color-text-main)' }}>Shift Audit Timings</h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>Day Shift Reminder</label>
                    <input 
                      type="time" 
                      className="form-input"
                      value={formData.notif_attendance_day_time}
                      onChange={e => setFormData({ ...formData, notif_attendance_day_time: e.target.value })}
                      style={{ paddingLeft: '12px', height: '36px' }}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>Night Shift Reminder</label>
                    <input 
                      type="time" 
                      className="form-input"
                      value={formData.notif_attendance_night_time}
                      onChange={e => setFormData({ ...formData, notif_attendance_night_time: e.target.value })}
                      style={{ paddingLeft: '12px', height: '36px' }}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Manufacturing & Inventory */}
          <div style={moduleCardStyle}>
            <div style={moduleHeaderStyle}>
              <Wrench size={16} color="var(--color-primary)" />
              <h3 style={moduleTitleStyle}>Machines & Inventory</h3>
            </div>
            <div style={moduleBodyStyle}>
              {renderToggleRow('notif_machine_maint', 'Machine Maintenance', 'When a machine requires scheduled or ad-hoc maintenance.')}
              {renderToggleRow('notif_machine_idle', 'Machine Idle Warning', 'When a machine is idle for an extended period.')}
              {renderToggleRow('notif_job_delayed', 'Job Delay Warning', 'When a Job Card misses its target completion time.')}
              {renderToggleRow('notify_inventory', 'Low Inventory Alert', 'When stock items fall below minimum thresholds.', true)}
            </div>
          </div>

          {/* 5. System */}
          <div style={moduleCardStyle}>
            <div style={moduleHeaderStyle}>
              <ServerCrash size={16} color="var(--color-primary)" />
              <h3 style={moduleTitleStyle}>System Health</h3>
            </div>
            <div style={moduleBodyStyle}>
              {renderToggleRow('notif_email_sync_failed', 'Email Sync Failure', 'When the IMAP connection fails or credentials expire.', true)}
            </div>
          </div>

          {/* 6. Notification Sounds */}
          <div style={moduleCardStyle}>
            <div style={moduleHeaderStyle}>
              <Music size={16} color="var(--color-primary)" />
              <h3 style={moduleTitleStyle}>Push Notification Sound</h3>
            </div>
            <div style={moduleBodyStyle}>
              <div style={{ padding: '16px', backgroundColor: '#ffffff' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                  Select the default sound for mobile push notifications. Make sure the sound is bundled with the mobile app build.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <select 
                    className="form-input" 
                    style={{ flex: 1, maxWidth: '300px' }}
                    value={formData.push_notification_sound}
                    onChange={(e) => setFormData(prev => ({ ...prev, push_notification_sound: e.target.value }))}
                  >
                    <option value="default">System Default</option>
                    <option value="sound1.wav">Sound 1 (Standard)</option>
                    <option value="sound2.wav">Sound 2 (High)</option>
                    <option value="sound3.wav">Sound 3 (Alert)</option>
                    <option value="sound4.wav">Sound 4 (Chime)</option>
                    <option value="sound5.wav">Sound 5 (Urgent)</option>
                  </select>
                  
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => playPreview(formData.push_notification_sound)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
                  >
                    <Play size={14} /> Preview
                  </button>
                </div>
              </div>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}

// Styling Constants
const moduleCardStyle = {
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  backgroundColor: '#ffffff',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
  overflow: 'hidden'
};

const moduleHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '16px',
  backgroundColor: '#f8fafc',
  borderBottom: '1px solid var(--color-border)'
};

const moduleTitleStyle = {
  fontSize: '15px',
  fontWeight: '700',
  color: 'var(--color-text-main)',
  margin: 0
};

const moduleBodyStyle = {
  display: 'flex',
  flexDirection: 'column'
};

const toggleRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '14px 16px',
  backgroundColor: '#ffffff'
};

const toggleTitleStyle = {
  fontSize: '13.5px',
  fontWeight: '600',
  color: 'var(--color-text-main)',
  marginBottom: '3px'
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
  flexShrink: 0,
  marginLeft: '12px'
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
