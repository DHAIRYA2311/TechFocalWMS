import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Tablet, 
  QrCode, 
  Key, 
  RefreshCw, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Activity,
  Smartphone
} from 'lucide-react';

export default function DevicePairingSettings() {
  const [session, setSession] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [revokingId, setRevokingId] = useState(null);

  const fetchSession = async (refresh = false) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(`http://127.0.0.1:8000/api/settings/device-pairing/session${refresh ? '?refresh=true' : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSession(response.data);
      setTimeLeft(response.data.expires_in);
    } catch (err) {
      console.error('Failed to load pairing session:', err);
      setFeedback({ type: 'danger', message: 'Failed to retrieve pairing codes.' });
    } finally {
      setLoadingSession(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('http://127.0.0.1:8000/api/settings/device-pairing/devices', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDevices(response.data);
    } catch (err) {
      console.error('Failed to load paired devices:', err);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Are you sure you want to revoke access for this device? It will be logged out immediately.')) {
      return;
    }
    setRevokingId(id);
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      await axios.delete(`http://127.0.0.1:8000/api/settings/device-pairing/devices/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeedback({ type: 'success', message: 'Device access revoked successfully.' });
      fetchDevices();
    } catch (err) {
      console.error('Failed to revoke device access:', err);
      setFeedback({ type: 'danger', message: 'Failed to revoke device access.' });
    } finally {
      setRevokingId(null);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchDevices();
  }, []);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          fetchSession(true); // Automatically refresh session when expired
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const handleManualRefresh = () => {
    setLoadingSession(true);
    fetchSession(true);
  };

  const formatLastActive = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const diffMs = new Date() - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Active now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const [customApiUrl, setCustomApiUrl] = useState(() => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//192.168.29.127:8000`; // Prefill with the user's active local IP
    }
    return `${protocol}//${hostname}:8000`;
  });

  // Compile QR Data
  const qrData = session ? JSON.stringify({
    api_url: customApiUrl,
    pairing_method: 'qr',
    token: session.qr_token
  }) : '';

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Configuration Card */}
      <div className="card">
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tablet size={20} style={{ color: 'var(--color-primary)' }} />
          Mobile Device Pairing
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          Connect and authorize mobile applications or tablets to use the TechFocal Workshop Management system without entering password credentials.
        </p>

        {feedback && (
          <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: '20px' }}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        {loadingSession ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Top timer status */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: 'var(--color-bg-base)',
              padding: '12px 18px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  backgroundColor: timeLeft > 10 ? 'var(--color-success)' : 'var(--color-danger)',
                  animation: 'pulse 1.5s infinite'
                }}></div>
                <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-main)' }}>
                  Pairing codes active. Expiring in: <strong style={{ color: timeLeft > 10 ? 'inherit' : 'var(--color-danger)' }}>{timeLeft}s</strong>
                </span>
              </div>
              <button 
                type="button" 
                onClick={handleManualRefresh}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                <RefreshCw size={14} />
                Regenerate Codes
              </button>
            </div>

            {/* Server API URL Override */}
            <div style={{
              backgroundColor: 'var(--color-primary-light)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-focus)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-main)' }}>
                Server API Host URL (For Mobile App Connection)
              </label>
              <input 
                type="text" 
                className="form-input" 
                value={customApiUrl} 
                onChange={e => setCustomApiUrl(e.target.value)} 
                style={{ 
                  backgroundColor: '#ffffff',
                  paddingLeft: '12px',
                  width: '100%'
                }}
                placeholder="http://192.168.29.127:8000"
              />
              <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                ⚠️ <strong>Important:</strong> Enter your PC's local network IP address (e.g. <code>http://192.168.29.127:8000</code>). Do not use <code>localhost</code> or <code>127.0.0.1</code> because the tablet cannot reach your PC using those loopback addresses.
              </span>
            </div>

            {/* Methods Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '24px',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: '24px'
            }}>
              
              {/* Method A: QR Code */}
              <div style={{ 
                border: '1px solid var(--color-border)', 
                borderRadius: 'var(--radius-md)', 
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                backgroundColor: '#ffffff'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <QrCode size={18} style={{ color: 'var(--color-primary)' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Option 1: Scan QR Code</h3>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '20px', maxWidth: '280px' }}>
                  Open the TechFocal Mobile App on your device and point the camera at this QR code to pair immediately.
                </p>
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#ffffff', 
                  border: '1px solid var(--color-border)', 
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {qrData && (
                    <QRCodeSVG 
                      value={qrData} 
                      size={180} 
                      bgColor="#ffffff"
                      fgColor="var(--color-text-main)"
                      level="L"
                      includeMargin={false}
                    />
                  )}
                </div>
              </div>

              {/* Method B: PIN Entry */}
              <div style={{ 
                border: '1px solid var(--color-border)', 
                borderRadius: 'var(--radius-md)', 
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'center',
                backgroundColor: '#ffffff'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', justifyContent: 'center' }}>
                    <Key size={18} style={{ color: 'var(--color-warning)' }} />
                    <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Option 2: Enter PIN Code</h3>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '20px', maxWidth: '280px' }}>
                    If the device camera is unavailable, choose the PIN method on the app and input this code manually.
                  </p>
                </div>

                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '30px 0'
                }}>
                  {session && session.pin_code.split('').map((char, index) => (
                    <React.Fragment key={index}>
                      <div style={{
                        width: '45px',
                        height: '55px',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        fontWeight: '700',
                        backgroundColor: 'var(--color-bg-base)',
                        color: 'var(--color-primary)',
                        boxShadow: 'var(--shadow-sm)'
                      }}>
                        {char}
                      </div>
                      {index === 2 && (
                        <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-text-light)', margin: '0 4px' }}>-</div>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>
                  This PIN code regenerates automatically when expired.
                </span>
              </div>

            </div>

          </div>
        )}
      </div>

      {/* Paired Devices List Card */}
      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Smartphone size={18} style={{ color: 'var(--color-success)' }} />
          Authorized Mobile Devices
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
          Below are the active devices currently paired with access tokens. You can revoke access for any device at any time.
        </p>

        {loadingDevices ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : devices.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '30px', 
            backgroundColor: 'var(--color-bg-base)', 
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--color-border)'
          }}>
            <Tablet size={32} style={{ color: 'var(--color-text-light)', marginBottom: '8px' }} />
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>No devices paired yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-muted)' }}>
                  <th style={{ padding: '12px 8px', fontWeight: '600' }}>Device Name</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600' }}>Fitted User Profile</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600' }}>First Paired</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600' }}>Last Active</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(device => (
                  <tr key={device.id} style={{ borderBottom: '1px solid var(--color-bg-base)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '12px 8px', fontWeight: '600', color: 'var(--color-text-main)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Tablet size={16} style={{ color: 'var(--color-text-light)' }} />
                        {device.device_name}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', color: 'var(--color-text-muted)' }}>
                      {device.user ? device.user.name : 'Unknown User'}
                    </td>
                    <td style={{ padding: '12px 8px', color: 'var(--color-text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={13} />
                        {formatDate(device.created_at)}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', color: 'var(--color-text-main)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Activity size={13} style={{ color: device.last_active_at ? 'var(--color-success)' : 'var(--color-text-light)' }} />
                        {formatLastActive(device.last_active_at)}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="logout-btn"
                        onClick={() => handleRevoke(device.id)}
                        disabled={revokingId === device.id}
                        style={{
                          display: 'inline-flex',
                          padding: '6px 10px',
                          backgroundColor: '#fef2f2',
                          color: 'var(--color-danger)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          fontSize: '11px',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        {revokingId === device.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Trash2 size={12} />
                        )}
                        <span style={{ marginLeft: '4px' }}>Revoke</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
