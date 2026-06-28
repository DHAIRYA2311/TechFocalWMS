import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Archive,
  RotateCcw,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShoppingCart,
  Briefcase,
  Cpu,
  Users,
  RefreshCw,
  Info,
  Lock,
  ShieldAlert,
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api';

const TABS = [
  { key: 'purchase_orders', label: 'Purchase Orders', icon: <ShoppingCart size={14} /> },
  { key: 'jobs',            label: 'Jobs',            icon: <Briefcase size={14} /> },
  { key: 'machines',        label: 'Machines',         icon: <Cpu size={14} /> },
  { key: 'users',           label: 'Users',            icon: <Users size={14} /> },
];

function daysAgo(dateStr) {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function daysRemaining(dateStr, windowDays = 30) {
  const elapsed = daysAgo(dateStr);
  return Math.max(0, windowDays - elapsed);
}

function RecordRow({ record, type, onRestore, onPurge, isAdmin, restoring, purging }) {
  const archivedDate = record.archived_at || record.deleted_at || null;
  const days = daysAgo(archivedDate);
  const remaining = daysRemaining(archivedDate);
  const isLocked = remaining === 0;

  const label = record.po_number
    || record.job_number
    || record.serial_number
    || record.name
    || `#${record.id}`;

  const rowStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 140px 120px 100px 140px',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 18px',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '13px',
    background: isLocked ? 'rgba(239,68,68,0.03)' : 'transparent',
  };

  return (
    <div style={rowStyle}>
      {/* Name/Identifier */}
      <div>
        <div style={{ fontWeight: '600', color: 'var(--color-text-main)', marginBottom: '2px' }}>
          {label}
        </div>
        {record.delete_reason && (
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            Reason: {record.delete_reason}
          </div>
        )}
      </div>

      {/* Archived Date */}
      <div style={{ color: 'var(--color-text-muted)' }}>
        {archivedDate ? new Date(archivedDate).toLocaleDateString('en-IN') : '—'}
      </div>

      {/* Days in Archive */}
      <div style={{ color: days > 25 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
        {days} day{days !== 1 ? 's' : ''}
      </div>

      {/* Recovery Window */}
      <div>
        {isLocked ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            fontSize: '11px', color: 'var(--color-danger)', fontWeight: '600'
          }}>
            <Lock size={11} /> Locked
          </span>
        ) : (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            fontSize: '11px',
            color: remaining <= 7 ? 'var(--color-warning, #f59e0b)' : 'var(--color-success, #10b981)',
            fontWeight: '600'
          }}>
            <Clock size={11} /> {remaining}d left
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        {/* Restore — blocked for non-admin after 30 days */}
        {(!isLocked || isAdmin) ? (
          <button
            onClick={() => onRestore(record, type)}
            disabled={restoring === record.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
              cursor: 'pointer', border: '1px solid var(--color-primary)',
              color: 'var(--color-primary)', background: 'transparent',
              opacity: restoring === record.id ? 0.6 : 1,
            }}
          >
            {restoring === record.id
              ? <Loader2 size={12} className="animate-spin" />
              : <RotateCcw size={12} />}
            Restore
          </button>
        ) : (
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Lock size={10} /> Admin only
          </span>
        )}

        {/* Purge — admin only, locked records only */}
        {isAdmin && (
          <button
            onClick={() => onPurge(record, type)}
            disabled={purging === record.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
              cursor: 'pointer', border: '1px solid rgba(239,68,68,0.4)',
              color: 'var(--color-danger)', background: 'rgba(239,68,68,0.05)',
              opacity: purging === record.id ? 0.6 : 1,
            }}
          >
            {purging === record.id
              ? <Loader2 size={12} className="animate-spin" />
              : <Trash2 size={12} />}
            Purge
          </button>
        )}
      </div>
    </div>
  );
}

export default function ArchivedRecordsSettings() {
  const [activeTab, setActiveTab] = useState('purchase_orders');
  const [data, setData]     = useState({});
  const [loading, setLoading]   = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [restoring, setRestoring] = useState(null);
  const [purging, setPurging]     = useState(null);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem('auth_user') || '{}'); } catch { return {}; }
  })();
  const isAdmin = user?.role === 'admin' || user?.role === 'partner';

  const token = localStorage.getItem('auth_token');
  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchArchived = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await axios.get(`${API_BASE}/archive`, { headers: authHeaders });
      setData(res.data || {});
    } catch (err) {
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to load archived records.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchArchived(); }, [fetchArchived]);

  const handleRestore = async (record, type) => {
    if (!window.confirm(`Restore this record? It will be moved back to its active list.`)) return;
    setRestoring(record.id);
    setFeedback(null);
    try {
      await axios.post(`${API_BASE}/archive/restore`, { type, id: record.id }, { headers: authHeaders });
      setFeedback({ type: 'success', message: 'Record successfully restored to active status.' });
      fetchArchived();
    } catch (err) {
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Restore failed.' });
    } finally {
      setRestoring(null);
    }
  };

  const handlePurge = async (record, type) => {
    if (!window.confirm(
      `⚠️ PERMANENT DELETION\n\nThis will permanently remove this record from the database. This action CANNOT be undone.\n\nAre you absolutely sure?`
    )) return;
    setPurging(record.id);
    setFeedback(null);
    try {
      await axios.delete(`${API_BASE}/archive/purge`, {
        headers: authHeaders,
        data: { type, id: record.id }
      });
      setFeedback({ type: 'success', message: 'Record permanently purged from the database.' });
      fetchArchived();
    } catch (err) {
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Purge failed.' });
    } finally {
      setPurging(null);
    }
  };

  const currentRecords = data[activeTab] || [];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header Card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Archive size={20} style={{ color: 'var(--color-primary)' }} />
              Archived Records
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Manage soft-deleted and archived records. Restore within 30 days or permanently purge (Super Admin only).
            </p>
          </div>
          <button
            onClick={fetchArchived}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
              cursor: 'pointer', border: '1px solid var(--color-border)',
              background: 'var(--color-bg-raised)', color: 'var(--color-text-main)',
            }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh
          </button>
        </div>

        {/* Policy Info Banner */}
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.15)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          lineHeight: '1.6',
        }}>
          <Info size={14} style={{ color: 'var(--color-primary)', marginTop: '1px', flexShrink: 0 }} />
          <span>
            Records are kept in the archive for <strong>30 days</strong> after deletion/archiving.
            Any user with restore permission can restore within this window.
            After 30 days, records are <strong>locked</strong> — only a <strong>Super Admin</strong> can restore or permanently purge them.
          </span>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Admin Warning */}
      {!isAdmin && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 16px', borderRadius: '8px',
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
          fontSize: '12px', color: 'var(--color-text-muted)',
        }}>
          <ShieldAlert size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <span>
            You can restore records within the 30-day recovery window.
            Records past the window require Super Admin access. Purge is unavailable for your role.
          </span>
        </div>
      )}

      {/* Main Panel */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* Tab Strip */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg-raised)',
          overflowX: 'auto',
        }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '13px 20px',
                fontSize: '13px', fontWeight: activeTab === tab.key ? '700' : '500',
                color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
                borderBottom: activeTab === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                background: 'none', border: 'none',
                cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'color 0.15s ease',
              }}
            >
              <span style={{ color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--color-text-light)' }}>
                {tab.icon}
              </span>
              {tab.label}
              {(data[tab.key]?.length > 0) && (
                <span style={{
                  background: activeTab === tab.key ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                  color: activeTab === tab.key ? '#fff' : 'var(--color-text-muted)',
                  borderRadius: '20px', padding: '0 7px', fontSize: '10px', fontWeight: '700',
                  minWidth: '18px', textAlign: 'center',
                }}>
                  {data[tab.key].length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 140px 120px 100px 140px',
          gap: '12px', padding: '10px 18px',
          fontSize: '10px', fontWeight: '700',
          color: 'var(--color-text-light)',
          textTransform: 'uppercase', letterSpacing: '0.7px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg-raised)',
        }}>
          <div>Record</div>
          <div>Archived On</div>
          <div>Days in Archive</div>
          <div>Window</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        {/* Body */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '48px', gap: '10px', color: 'var(--color-text-muted)' }}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontSize: '13px' }}>Loading archived records…</span>
          </div>
        ) : currentRecords.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '52px 24px', gap: '10px',
          }}>
            <Archive size={36} style={{ color: 'var(--color-border)' }} />
            <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-muted)' }}>No archived records</p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-light)', textAlign: 'center', maxWidth: '280px' }}>
              {TABS.find(t => t.key === activeTab)?.label} records that are archived or soft-deleted will appear here.
            </p>
          </div>
        ) : (
          <div>
            {currentRecords.map(record => (
              <RecordRow
                key={record.id}
                record={record}
                type={activeTab}
                onRestore={handleRestore}
                onPurge={handlePurge}
                isAdmin={isAdmin}
                restoring={restoring}
                purging={purging}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
