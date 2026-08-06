import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Filter, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

export default function SecurityAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [filters, setFilters] = useState({
    action: '',
    module: '',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchLogs(1);
  }, [filters]);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      const queryParams = new URLSearchParams({ page });
      if (filters.action) queryParams.append('action', filters.action);
      if (filters.module) queryParams.append('module', filters.module);
      if (filters.start_date) queryParams.append('start_date', filters.start_date);
      if (filters.end_date) queryParams.append('end_date', filters.end_date);

      const response = await axios.get(`/api/security/logs?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setLogs(response.data.data);
      setPagination({
        current_page: response.data.current_page,
        last_page: response.data.last_page,
        total: response.data.total
      });
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    const token = localStorage.getItem('auth_token');
    const queryParams = new URLSearchParams({ format });
    if (filters.action) queryParams.append('action', filters.action);
    if (filters.module) queryParams.append('module', filters.module);
    if (filters.start_date) queryParams.append('start_date', filters.start_date);
    if (filters.end_date) queryParams.append('end_date', filters.end_date);

    window.open(`/api/security/export?${queryParams.toString()}&token=${token}`, '_blank');
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>Security Audit Logs</h1>
          <p style={{ color: '#64748b' }}>Comprehensive tracking of system events for security and compliance.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => handleExport('csv')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', color: '#334155' }}
          >
            <Download size={16} />
            Export CSV
          </button>
          <button 
            onClick={() => handleExport('pdf')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: 'var(--color-primary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', color: '#fff' }}
          >
            <Download size={16} />
            Export PDF
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        
        {/* Filters */}
        <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '16px', flexWrap: 'wrap', backgroundColor: '#f8fafc' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Event Action</label>
            <input 
              type="text" 
              placeholder="Filter by action..." 
              value={filters.action}
              onChange={(e) => setFilters({...filters, action: e.target.value})}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Module</label>
            <input 
              type="text" 
              placeholder="Filter by module..." 
              value={filters.module}
              onChange={(e) => setFilters({...filters, module: e.target.value})}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Start Date</label>
            <input 
              type="date" 
              value={filters.start_date}
              onChange={(e) => setFilters({...filters, start_date: e.target.value})}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>End Date</label>
            <input 
              type="date" 
              value={filters.end_date}
              onChange={(e) => setFilters({...filters, end_date: e.target.value})}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Timestamp</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#475569' }}>User</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Module</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Action</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#475569' }}>IP Address</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No audit logs found for the given criteria.</td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#334155', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(',', '')}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#334155' }}>
                      {log.user ? (
                        <div>
                          <div style={{ fontWeight: '500' }}>{log.user.name}</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>{log.role}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>System</span>
                      )}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#334155' }}>
                      <span style={{ padding: '4px 8px', backgroundColor: '#f1f5f9', borderRadius: '4px', fontSize: '12px', fontWeight: '500' }}>
                        {log.module || 'System'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#334155', fontWeight: '500' }}>
                      {log.action}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#334155' }}>
                      {log.ip_address}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#334155' }}>
                      <div style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.remarks}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && logs.length > 0 && (
          <div style={{ padding: '20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '14px', color: '#64748b' }}>
              Showing page {pagination.current_page} of {pagination.last_page} ({pagination.total} total logs)
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                disabled={pagination.current_page === 1}
                onClick={() => fetchLogs(pagination.current_page - 1)}
                style={{ padding: '8px 12px', border: '1px solid #cbd5e1', backgroundColor: pagination.current_page === 1 ? '#f8fafc' : '#fff', borderRadius: '6px', cursor: pagination.current_page === 1 ? 'not-allowed' : 'pointer' }}
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                disabled={pagination.current_page === pagination.last_page}
                onClick={() => fetchLogs(pagination.current_page + 1)}
                style={{ padding: '8px 12px', border: '1px solid #cbd5e1', backgroundColor: pagination.current_page === pagination.last_page ? '#f8fafc' : '#fff', borderRadius: '6px', cursor: pagination.current_page === pagination.last_page ? 'not-allowed' : 'pointer' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
