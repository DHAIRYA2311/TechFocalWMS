import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, Play, Power, Loader2, AlertCircle, CheckCircle, X } from 'lucide-react';

export default function SettingsSchedulers() {
  const [schedulers, setSchedulers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // id of scheduler being processed
  const [feedback, setFeedback] = useState(null);

  const fetchSchedulers = async () => {
    try {
      const response = await axios.get('/api/schedulers');
      setSchedulers(response.data);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to load schedulers list.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedulers();
  }, []);

  const handleToggle = async (id, currentStatus) => {
    setActionLoading(id + '_toggle');
    setFeedback(null);
    try {
      await axios.post(`/api/schedulers/${id}/toggle`, {
        is_active: !currentStatus
      });
      setSchedulers(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s));
      setFeedback({ type: 'success', message: 'Scheduler status updated.' });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to update scheduler.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRun = async (id) => {
    if (!window.confirm('Are you sure you want to run this task immediately?')) return;
    
    setActionLoading(id + '_run');
    setFeedback(null);
    try {
      const response = await axios.post(`/api/schedulers/${id}/run`);
      setFeedback({ type: 'success', message: response.data.message || 'Executed successfully.', output: response.data.output });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to execute command.', output: err.response?.data?.error });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <Loader2 className="animate-spin" size={32} color="var(--color-primary)" />
        <span style={{ color: 'var(--color-text-muted)' }}>Loading schedulers...</span>
      </div>
    );
  }

  return (
    <div className="card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} /> System Schedulers & Cron Jobs
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          Monitor background tasks, enable/disable their execution, and trigger them manually.
        </p>
      </div>

      {feedback && (
        <div 
          style={{ 
            position: 'fixed', 
            bottom: '24px', 
            right: '24px', 
            zIndex: 9999,
            maxWidth: '450px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            borderRadius: '8px',
            backgroundColor: 'var(--color-bg-base)'
          }}
          className="animate-fade-in"
        >
          <div className={`alert alert-${feedback.type}`} style={{ marginBottom: 0, position: 'relative', paddingRight: '40px', border: '1px solid var(--color-border)', boxShadow: 'none' }}>
            <button 
              onClick={() => setFeedback(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X size={16} />
            </button>
            {feedback.type === 'success' ? <CheckCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} /> : <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
              <span style={{ fontWeight: 600 }}>{feedback.message}</span>
              {feedback.output && (
                <pre style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '8px', borderRadius: '4px', fontSize: '11px', marginTop: '6px', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto' }}>
                  {feedback.output}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="table-responsive" style={{ overflowX: 'auto', padding: '0 20px 20px 20px' }}>
        <table className="table" style={{ width: '100%', tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th style={{ width: '35%' }}>Task Details</th>
              <th style={{ width: '15%' }}>Schedule</th>
              <th style={{ width: '20%' }}>Next Run</th>
              <th style={{ width: '12%' }}>Status</th>
              <th style={{ textAlign: 'right', width: '18%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {schedulers.map((scheduler) => (
              <tr key={scheduler.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ whiteSpace: 'normal', wordWrap: 'break-word', padding: '12px 8px' }}>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--color-text-main)' }}>
                    {scheduler.description || scheduler.command || 'Unnamed Task'}
                  </div>
                  {scheduler.command && (
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace', marginTop: '4px' }}>
                      php artisan {scheduler.command}
                    </div>
                  )}
                </td>
                <td style={{ padding: '12px 8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', backgroundColor: 'var(--color-bg-base)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>
                    {scheduler.expression}
                  </span>
                </td>
                <td style={{ fontSize: '12px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', padding: '12px 8px' }}>
                  {scheduler.next_run}
                </td>
                <td style={{ padding: '12px 8px' }}>
                  <span style={{ 
                    fontSize: '10px', 
                    fontWeight: '700', 
                    color: scheduler.is_active ? 'var(--color-success)' : 'var(--color-text-muted)',
                    backgroundColor: scheduler.is_active ? 'var(--color-success-light)' : 'var(--color-bg-base)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: `1px solid ${scheduler.is_active ? 'rgba(34, 197, 94, 0.2)' : 'var(--color-border)'}`
                  }}>
                    {scheduler.is_active ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </td>
                <td style={{ textAlign: 'right', padding: '12px 8px' }}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    
                    <button 
                      className={`form-button ${scheduler.is_active ? 'btn-danger' : 'btn-success'}`}
                      style={{ 
                        margin: 0, 
                        padding: '4px 8px', 
                        height: '28px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        fontSize: '11px', 
                        backgroundColor: scheduler.is_active ? 'var(--color-danger)' : 'var(--color-success)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: actionLoading !== null ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                      onClick={() => handleToggle(scheduler.id, scheduler.is_active)}
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === scheduler.id + '_toggle' ? (
                        <Loader2 className="animate-spin" size={12} />
                      ) : (
                        <Power size={12} />
                      )}
                      {scheduler.is_active ? 'Disable' : 'Enable'}
                    </button>

                    <button 
                      className="form-button"
                      style={{ 
                        margin: 0, 
                        padding: '4px 8px', 
                        height: '28px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        fontSize: '11px', 
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        opacity: scheduler.is_closure ? 0.5 : 1,
                        cursor: (actionLoading !== null || scheduler.is_closure) ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                      onClick={() => handleRun(scheduler.id)}
                      disabled={actionLoading !== null || scheduler.is_closure}
                      title={scheduler.is_closure ? "Inline closures cannot be run manually." : "Run this task right now"}
                    >
                      {actionLoading === scheduler.id + '_run' ? (
                        <Loader2 className="animate-spin" size={12} />
                      ) : (
                        <Play size={12} />
                      )}
                      Run Now
                    </button>
                    
                  </div>
                </td>
              </tr>
            ))}
            {schedulers.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
                  No schedulers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
