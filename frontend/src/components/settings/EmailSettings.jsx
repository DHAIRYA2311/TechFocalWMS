import React, { useState, useEffect } from 'react';
import CustomSelect from '../CustomSelect';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { Mail, Shield, Server, FolderInput, Lock, Eye, EyeOff, Loader2, CheckCircle2, XCircle, Save } from 'lucide-react';

export default function EmailSettings() {
  const { settings, saveSettings, loadingSettings } = useOutletContext();
  
  // IMAP State (Uses separate endpoints for secure password test/save)
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState('993');
  const [imapEncryption, setImapEncryption] = useState('ssl');
  const [imapUsername, setImapUsername] = useState('');
  const [imapPassword, setImapPassword] = useState('');
  const [imapSourceFolder, setImapSourceFolder] = useState('INBOX');
  const [imapProcessedFolder, setImapProcessedFolder] = useState('Processed');
  const [imapSubjectFilter, setImapSubjectFilter] = useState('Purchase Order');
  const [isImapPasswordSet, setIsImapPasswordSet] = useState(false);
  const [showImapPassword, setShowImapPassword] = useState(false);

  // SMTP State (Uses standard settings endpoints)
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpSenderName, setSmtpSenderName] = useState('');
  const [smtpSenderEmail, setSmtpSenderEmail] = useState('');
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  const [loadingImap, setLoadingImap] = useState(false);
  const [savingSMTP, setSavingSMTP] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Load IMAP specific settings on mount
  useEffect(() => {
    const fetchImapSettings = async () => {
      setLoadingImap(true);
      try {
        const response = await axios.get('http://127.0.0.1:8000/api/settings/email');
        const data = response.data;
        setImapHost(data.imap_host || '');
        setImapPort(data.imap_port || '993');
        setImapEncryption(data.imap_encryption || 'ssl');
        setImapUsername(data.imap_username || '');
        setImapSourceFolder(data.imap_source_folder || 'INBOX');
        setImapProcessedFolder(data.imap_processed_folder || 'Processed');
        setImapSubjectFilter(data.imap_subject_filter || 'Purchase Order');
        setIsImapPasswordSet(data.is_password_set || false);
      } catch (err) {
        console.error('Failed to load IMAP settings:', err);
      } finally {
        setLoadingImap(false);
      }
    };
    fetchImapSettings();
  }, []);

  // Sync SMTP settings from bulk settings context
  useEffect(() => {
    if (settings) {
      setSmtpHost(settings.email_smtp_host || '');
      setSmtpPort(settings.email_smtp_port || '587');
      setSmtpUsername(settings.email_smtp_username || '');
      setSmtpPassword(settings.email_smtp_password || '');
      setSmtpSenderName(settings.email_smtp_sender_name || 'TechFocal Floor');
      setSmtpSenderEmail(settings.email_smtp_sender_email || 'notifications@techfocal.in');
    }
  }, [settings]);

  const handleTestConnection = async (e) => {
    e.preventDefault();
    setTesting(true);
    setFeedback(null);

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/settings/email/test', {
        imap_host: imapHost,
        imap_port: imapPort,
        imap_encryption: imapEncryption,
        imap_username: imapUsername,
        imap_password: imapPassword, // sends new password if typed, backend falls back if empty
        imap_source_folder: imapSourceFolder
      });

      setFeedback({
        type: 'success',
        message: response.data.message || 'IMAP Connection test successful!'
      });
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Failed to establish IMAP connection. Check details.';
      setFeedback({
        type: 'danger',
        message: errMsg
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveIMAP = async (e) => {
    e.preventDefault();
    setLoadingImap(true);
    setFeedback(null);

    try {
      await axios.post('http://127.0.0.1:8000/api/settings/email', {
        imap_host: imapHost,
        imap_port: imapPort,
        imap_encryption: imapEncryption,
        imap_username: imapUsername,
        imap_password: imapPassword,
        imap_source_folder: imapSourceFolder,
        imap_processed_folder: imapProcessedFolder,
        imap_subject_filter: imapSubjectFilter
      });

      setFeedback({
        type: 'success',
        message: 'IMAP server configurations saved successfully.'
      });
      if (imapPassword) {
        setIsImapPasswordSet(true);
        setImapPassword(''); // clear input state
      }
    } catch (err) {
      console.error(err);
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to save IMAP configurations.'
      });
    } finally {
      setLoadingImap(false);
    }
  };

  const handleSaveSMTP = async (e) => {
    e.preventDefault();
    setSavingSMTP(true);
    setFeedback(null);
    try {
      await saveSettings({
        email_smtp_host: smtpHost,
        email_smtp_port: smtpPort,
        email_smtp_username: smtpUsername,
        email_smtp_password: smtpPassword,
        email_smtp_sender_name: smtpSenderName,
        email_smtp_sender_email: smtpSenderEmail
      });
      setFeedback({ type: 'success', message: 'SMTP configurations saved successfully.' });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to save SMTP configurations.' });
    } finally {
      setSavingSMTP(false);
    }
  };

  if ((loadingImap && !imapHost) || loadingSettings) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Feedback Alert */}
      {feedback && (
        <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 1. IMAP Settings (PO Attachment Fetcher) */}
      <div className="card">
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Mail size={18} style={{ color: 'var(--color-primary)' }} />
          IMAP Incoming PO Fetcher
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
          Configure mailbox check-in detail to fetch incoming Purchase Order (PO) PDFs dynamically.
        </p>

        <form onSubmit={handleSaveIMAP} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">IMAP Host</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="imap.secureserver.net" 
                value={imapHost}
                onChange={e => setImapHost(e.target.value)}
                style={{ paddingLeft: '12px' }}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Port</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="993" 
                value={imapPort}
                onChange={e => setImapPort(e.target.value)}
                style={{ paddingLeft: '12px' }}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Encryption</label>
              <CustomSelect
                value={imapEncryption}
                onChange={val => setImapEncryption(val)}
                options={[
                  { value: 'ssl', label: 'SSL / TLS' },
                  { value: 'tls', label: 'STARTTLS' },
                  { value: 'none', label: 'None' }
                ]}
                style={{ height: '38px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">IMAP Email/Username</label>
              <input 
                type="email" 
                className="form-input" 
                value={imapUsername}
                onChange={e => setImapUsername(e.target.value)}
                style={{ paddingLeft: '12px' }}
                placeholder="po@techfocal.in"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">IMAP Password</label>
              <div className="input-wrapper">
                <input 
                  type={showImapPassword ? 'text' : 'password'} 
                  className="form-input" 
                  placeholder={isImapPasswordSet ? '•••••••••••• (Saved)' : 'Mailbox password'} 
                  value={imapPassword}
                  onChange={e => setImapPassword(e.target.value)}
                  style={{ paddingLeft: '12px', paddingRight: '40px' }}
                  required={!isImapPasswordSet}
                />
                <button
                  type="button"
                  onClick={() => setShowImapPassword(!showImapPassword)}
                  style={eyeButtonStyle}
                >
                  {showImapPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
            <div className="form-group">
              <label className="form-label">Source Folder</label>
              <input 
                type="text" 
                className="form-input" 
                value={imapSourceFolder}
                onChange={e => setImapSourceFolder(e.target.value)}
                style={{ paddingLeft: '12px' }}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Processed Archive Folder</label>
              <input 
                type="text" 
                className="form-input" 
                value={imapProcessedFolder}
                onChange={e => setImapProcessedFolder(e.target.value)}
                style={{ paddingLeft: '12px' }}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Subject Keywords</label>
              <input 
                type="text" 
                className="form-input" 
                value={imapSubjectFilter}
                onChange={e => setImapSubjectFilter(e.target.value)}
                style={{ paddingLeft: '12px' }}
                placeholder="Purchase Order"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button 
              type="button" 
              className="logout-btn" 
              onClick={handleTestConnection}
              disabled={testing || loadingImap}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '42px', padding: '0 20px' }}
            >
              {testing ? <Loader2 size={16} className="animate-spin" /> : null}
              Test IMAP Connection
            </button>
            <button 
              type="submit" 
              className="form-button"
              disabled={testing || loadingImap}
              style={{ width: 'auto', marginTop: 0, padding: '0 24px', height: '42px' }}
            >
              Save IMAP Settings
            </button>
          </div>
        </form>
      </div>

      {/* 2. SMTP Settings (Outgoing transactional mail dispatcher) */}
      <div className="card">
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={18} style={{ color: 'var(--color-primary)' }} />
          SMTP Transactional Mail dispatcher
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
          Configure SMTP parameters to dispatch automated notifications, attendance alerts, and payroll pay-slips.
        </p>

        <form onSubmit={handleSaveSMTP} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">SMTP Server Host</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="smtp.mailgun.org" 
                value={smtpHost}
                onChange={e => setSmtpHost(e.target.value)}
                style={{ paddingLeft: '12px' }}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">SMTP Port</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="587" 
                value={smtpPort}
                onChange={e => setSmtpPort(e.target.value)}
                style={{ paddingLeft: '12px' }}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">SMTP Account Username</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="postmaster@techfocal.in" 
                value={smtpUsername}
                onChange={e => setSmtpUsername(e.target.value)}
                style={{ paddingLeft: '12px' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">SMTP Password</label>
              <div className="input-wrapper">
                <input 
                  type={showSmtpPassword ? 'text' : 'password'} 
                  className="form-input" 
                  placeholder="SMTP server password" 
                  value={smtpPassword}
                  onChange={e => setSmtpPassword(e.target.value)}
                  style={{ paddingLeft: '12px', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                  style={eyeButtonStyle}
                >
                  {showSmtpPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Sender Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                value={smtpSenderEmail}
                onChange={e => setSmtpSenderEmail(e.target.value)}
                style={{ paddingLeft: '12px' }}
                placeholder="notifications@techfocal.in"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Sender Display Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={smtpSenderName}
              onChange={e => setSmtpSenderName(e.target.value)}
              style={{ paddingLeft: '12px' }}
              placeholder="TechFocal Enterprises"
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
            <button 
              type="submit" 
              className="form-button"
              disabled={savingSMTP}
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 24px', height: '42px', marginTop: 0 }}
            >
              {savingSMTP ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save SMTP Settings
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}

const eyeButtonStyle = {
  position: 'absolute',
  right: '12px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-text-light)',
  display: 'flex',
  alignItems: 'center',
};
