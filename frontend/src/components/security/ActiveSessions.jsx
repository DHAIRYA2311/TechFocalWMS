import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LogOut, Monitor, Clock, User, ShieldAlert, Loader2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export default function ActiveSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [terminating, setTerminating] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('/api/security/sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(response.data);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminate = async (sessionId) => {
    if (!window.confirm("Are you sure you want to terminate this user's session? They will be logged out immediately.")) {
      return;
    }
    
    setTerminating(sessionId);
    try {
      const token = localStorage.getItem('auth_token');
      await axios.delete(`/api/security/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove from list
      setSessions(sessions.filter(s => s.token_id !== sessionId));
    } catch (err) {
      console.error('Failed to terminate session:', err);
      alert('Failed to terminate session. It may have already expired.');
    } finally {
      setTerminating(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Loader2 className="animate-spin" size={24} color="#64748b" />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', marginTop: '40px' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Monitor color="#3b82f6" size={20} />
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: 0 }}>Active User Sessions</h2>
      </div>

      {sessions.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          No other active sessions found on the network.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '16px 24px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>User</th>
                <th style={{ padding: '16px 24px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Role</th>
                <th style={{ padding: '16px 24px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Login Time</th>
                <th style={{ padding: '16px 24px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Last Active</th>
                <th style={{ padding: '16px 24px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.token_id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                        <User size={18} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: '600', color: '#1e293b' }}>{session.user_name}</p>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{session.user_email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', color: '#475569', textTransform: 'capitalize' }}>
                    <span style={{ 
                        backgroundColor: session.user_role === 'admin' ? '#fee2e2' : session.user_role === 'manager' ? '#e0e7ff' : '#f1f5f9',
                        color: session.user_role === 'admin' ? '#991b1b' : session.user_role === 'manager' ? '#3730a3' : '#475569',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: '600'
                    }}>
                        {session.user_role}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', color: '#475569', fontSize: '14px' }}>
                    {format(new Date(session.created_at), 'MMM d, yyyy h:mm a')}
                  </td>
                  <td style={{ padding: '16px 24px', color: '#475569', fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} color="#94a3b8" />
                      {formatDistanceToNow(new Date(session.last_used_at || session.created_at), { addSuffix: true })}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleTerminate(session.token_id)}
                      disabled={terminating === session.token_id}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#ef4444',
                        border: '1px solid #ef4444',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: terminating === session.token_id ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        opacity: terminating === session.token_id ? 0.6 : 1,
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => { if (terminating !== session.token_id) { e.currentTarget.style.backgroundColor = '#fef2f2'; } }}
                      onMouseOut={(e) => { if (terminating !== session.token_id) { e.currentTarget.style.backgroundColor = 'transparent'; } }}
                    >
                      {terminating === session.token_id ? (
                        <><Loader2 size={14} className="animate-spin" /> Terminating...</>
                      ) : (
                        <><LogOut size={14} /> Terminate</>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
