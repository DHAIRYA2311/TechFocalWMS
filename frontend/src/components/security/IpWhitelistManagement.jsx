import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Network, Plus, Trash2, Power, PowerOff, AlertTriangle } from 'lucide-react';

export default function IpWhitelistManagement() {
  const [ips, setIps] = useState([]);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [newLabel, setNewLabel] = useState('');

  useEffect(() => {
    fetchIps();
  }, []);

  const fetchIps = async () => {
    try {
      const res = await axios.get('/api/security/ip-whitelist');
      setIps(res.data.ips || []);
      setIsEnabled(res.data.is_enabled || false);
    } catch (error) {
      console.error('Failed to fetch IP whitelist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGlobal = async () => {
    try {
      const newState = !isEnabled;
      await axios.post('/api/security/ip-whitelist/toggle', { is_enabled: newState });
      setIsEnabled(newState);
    } catch (error) {
      console.error('Failed to toggle IP whitelisting:', error);
      alert('Failed to toggle settings.');
    }
  };

  const addIp = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/security/ip-whitelist', {
        ip_address: newIp,
        label: newLabel,
        is_active: true
      });
      setIps([res.data.ip, ...ips]);
      setShowAddModal(false);
      setNewIp('');
      setNewLabel('');
    } catch (error) {
      console.error('Failed to add IP:', error);
      alert(error.response?.data?.message || 'Failed to add IP address');
    }
  };

  const toggleIp = async (id, currentStatus) => {
    try {
      const res = await axios.put(`/api/security/ip-whitelist/${id}`, { is_active: !currentStatus });
      setIps(ips.map(ip => ip.id === id ? res.data.ip : ip));
    } catch (error) {
      console.error('Failed to toggle IP:', error);
    }
  };

  const deleteIp = async (id) => {
    if (!window.confirm('Are you sure you want to remove this IP address?')) return;
    try {
      await axios.delete(`/api/security/ip-whitelist/${id}`);
      setIps(ips.filter(ip => ip.id !== id));
    } catch (error) {
      console.error('Failed to delete IP:', error);
    }
  };

  if (isLoading) return <div style={{ padding: '24px', color: '#64748b' }}>Loading Network Access policies...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header & Global Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Network size={20} color="#3b82f6" />
            IP Whitelisting & Network Access
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', maxWidth: '600px' }}>
            Restrict system access to approved IP addresses only. This prevents unauthorized logins from unknown networks. 
            <strong> Admins and Partners</strong> are exempt from strict blocking but will require Email OTP verification if logging in from a non-whitelisted IP.
          </p>
        </div>
        
        <button
          onClick={toggleGlobal}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', borderRadius: '8px', border: 'none',
            background: isEnabled ? '#10b981' : '#f1f5f9',
            color: isEnabled ? '#fff' : '#64748b',
            fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          {isEnabled ? <Power size={18} /> : <PowerOff size={18} />}
          {isEnabled ? 'Policy Active' : 'Policy Disabled'}
        </button>
      </div>

      {isEnabled && ips?.length === 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '16px', borderRadius: '8px', display: 'flex', gap: '12px', color: '#991b1b' }}>
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Warning:</strong> IP Whitelisting is enabled but no IP addresses are configured! All standard users will be locked out until you add their IP addresses.
          </div>
        </div>
      )}

      {/* IP List */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>Allowed IP Addresses</h3>
          <button 
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', background: '#3b82f6', color: '#fff',
              border: 'none', borderRadius: '6px', fontWeight: '500', cursor: 'pointer'
            }}
          >
            <Plus size={16} /> Add IP Address
          </button>
        </div>
        
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>IP Address</th>
              <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Label / Location</th>
              <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(!ips || ips.length === 0) ? (
              <tr>
                <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  No IP addresses have been added yet.
                </td>
              </tr>
            ) : (
              ips.map(ip => (
                <tr key={ip.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 24px', fontWeight: '500', color: '#334155', fontFamily: 'monospace' }}>
                    {ip.ip_address}
                  </td>
                  <td style={{ padding: '16px 24px', color: '#475569' }}>
                    {ip.label || '-'}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span 
                      style={{ 
                        padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                        background: ip.is_active ? '#dcfce7' : '#f1f5f9',
                        color: ip.is_active ? '#166534' : '#64748b'
                      }}
                    >
                      {ip.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                      <button 
                        onClick={() => toggleIp(ip.id, ip.is_active)}
                        style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', textDecoration: 'underline', fontSize: '13px' }}
                      >
                        {ip.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button 
                        onClick={() => deleteIp(ip.id)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add IP Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '32px', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#0f172a' }}>Add IP Address</h3>
            <form onSubmit={addIp}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>IP Address (IPv4 or IPv6)</label>
                <input 
                  type="text" 
                  value={newIp} 
                  onChange={(e) => setNewIp(e.target.value)}
                  placeholder="e.g. 192.168.1.100"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontFamily: 'monospace' }}
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>Label (Optional)</label>
                <input 
                  type="text" 
                  value={newLabel} 
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Factory Main Office"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Add IP</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
