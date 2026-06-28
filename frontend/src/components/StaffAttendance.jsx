import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CustomSelect from './CustomSelect';
import { useRealTime } from '../hooks/useRealTime';
import { 
  Users, 
  Calendar, 
  Clock, 
  Check, 
  X, 
  UserCheck, 
  UserX, 
  Save, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle,
  Play,
  Square
} from 'lucide-react';

export default function StaffAttendance({ user }) {
  const isManager = user && ['admin', 'partner', 'manager'].includes(user.role);

  useRealTime('attendance', () => {
    if (isManager) {
      fetchManagerData();
    } else {
      fetchWorkerData();
    }
  });

  // Manager state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedShift, setSelectedShift] = useState('day');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [matrixData, setMatrixData] = useState({});
  const [activeTab, setActiveTab] = useState('register'); // 'register' or 'matrix'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Date controls for manager matrix
  const [matrixMonth, setMatrixMonth] = useState(new Date().getMonth() + 1);
  const [matrixYear, setMatrixYear] = useState(new Date().getFullYear());

  // Worker state
  const [todayLog, setTodayLog] = useState(null);
  const [monthlyLogs, setMonthlyLogs] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // 1. Fetch manager daily register & matrix data
  const fetchManagerData = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('http://127.0.0.1:8000/api/attendance', {
        headers: { Authorization: `Bearer ${token}` },
        params: { 
          date: selectedDate,
          shift: selectedShift,
          include_matrix: activeTab === 'matrix' ? 1 : 0,
          month: matrixMonth,
          year: matrixYear
        }
      });
      
      const records = response.data.records.map(rec => {
        // Ensure format compatibility
        return {
          user_id: rec.id,
          name: rec.name,
          email: rec.email,
          role: rec.role,
          phone: rec.phone,
          status: rec.attendance ? rec.attendance.status : 'present',
          clock_in: rec.attendance && rec.attendance.clock_in ? rec.attendance.clock_in : '',
          clock_out: rec.attendance && rec.attendance.clock_out ? rec.attendance.clock_out : '',
          notes: rec.attendance && rec.attendance.notes ? rec.attendance.notes : '',
          is_dirty: false // tracks local edits
        };
      });

      setAttendanceRecords(records);
      if (response.data.matrix) {
        setMatrixData(response.data.matrix);
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to load daily attendance records.' });
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch worker personal logs
  const fetchWorkerData = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('http://127.0.0.1:8000/api/attendance', {
        headers: { Authorization: `Bearer ${token}` },
        params: { 
          month: matrixMonth,
          year: matrixYear
        }
      });
      setMonthlyLogs(response.data.logs);
      setTodayLog(response.data.today);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to load your attendance history.' });
    } finally {
      setLoading(false);
    }
  };

  // Trigger loads based on context
  useEffect(() => {
    if (isManager) {
      fetchManagerData();
    } else {
      fetchWorkerData();
    }
  }, [selectedDate, selectedShift, isManager, activeTab, matrixMonth, matrixYear]);

  // 3. Manager Daily Save
  const handleSaveAttendance = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      // Format payload
      const payload = {
        date: selectedDate,
        shift: selectedShift,
        records: attendanceRecords.map(rec => ({
          user_id: rec.user_id,
          status: rec.status,
          clock_in: rec.clock_in || null,
          clock_out: rec.clock_out || null,
          notes: rec.notes || null
        }))
      };

      await axios.post('http://127.0.0.1:8000/api/attendance', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFeedback({ type: 'success', message: 'Attendance sheet saved successfully!' });
      // Reset dirty trackers
      setAttendanceRecords(prev => prev.map(rec => ({ ...rec, is_dirty: false })));
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to save attendance records.' });
    } finally {
      setSaving(false);
    }
  };

  // Helper to handle manager inline changes
  const handleRecordChange = (userId, field, val) => {
    setAttendanceRecords(prev => 
      prev.map(rec => {
        if (rec.user_id === userId) {
          return {
            ...rec,
            [field]: val,
            is_dirty: true
          };
        }
        return rec;
      })
    );
  };

  // 4. Worker Self-Clock Actions
  const handleClockIn = async () => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post('http://127.0.0.1:8000/api/attendance/clock-in', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTodayLog(response.data.attendance);
      setFeedback({ type: 'success', message: response.data.message });
      fetchWorkerData(); // reload calendar logs
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Clock-in failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post('http://127.0.0.1:8000/api/attendance/clock-out', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTodayLog(response.data.attendance);
      setFeedback({ type: 'success', message: response.data.message });
      fetchWorkerData(); // reload calendar logs
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Clock-out failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    setMatrixMonth(prev => {
      if (prev === 1) {
        setMatrixYear(y => y - 1);
        return 12;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setMatrixMonth(prev => {
      if (prev === 12) {
        setMatrixYear(y => y + 1);
        return 1;
      }
      return prev + 1;
    });
  };

  const getMonthName = (m) => {
    const date = new Date(2000, m - 1, 1);
    return date.toLocaleString('default', { month: 'long' });
  };

  // UI Status Badges
  const getStatusBadgeStyle = (statusVal) => {
    switch (statusVal) {
      case 'present':
        return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', label: 'Present' };
      case 'late':
        return { bg: '#fffbeb', text: '#d97706', border: '#fde68a', label: 'Late Arrival' };
      case 'half_day':
        return { bg: '#ffedd5', text: '#ea580c', border: '#ffedd5', label: 'Half Day' };
      case 'leave':
        return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', label: 'On Leave' };
      case 'absent':
        return { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5', label: 'Absent' };
      default:
        return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', label: statusVal };
    }
  };

  // Role labels
  const getRoleLabel = (role) => {
    switch(role) {
      case 'partner': return 'Partner';
      case 'admin': return 'Admin';
      case 'manager': return 'Manager';
      case 'supervisor': return 'Supervisor';
      case 'helper': return 'Helper';
      case 'worker': return 'Worker';
      default: return role;
    }
  };

  // Summary counts for daily sheet
  const summary = attendanceRecords.reduce((acc, rec) => {
    acc[rec.status] = (acc[rec.status] || 0) + 1;
    return acc;
  }, { present: 0, late: 0, absent: 0, leave: 0, half_day: 0 });

  // List of days in selected month for matrix view
  const daysInMonthCount = new Date(matrixYear, matrixMonth, 0).getDate();
  const daysArray = Array.from({ length: daysInMonthCount }, (_, i) => i + 1);

  // Check if any record has unsaved local edits
  const isDirty = attendanceRecords.some(r => r.is_dirty);

  // =============================================================
  // RENDERING PANEL: MANAGER ATTENDANCE BOARD
  // =============================================================
  if (isManager) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Controls Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Staff Attendance Register</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Mark floor staff arrivals, track late-comers, approve leave logs, and review monthly attendance matrices.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* View tab switcher */}
            <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', backgroundColor: 'var(--color-card-bg)' }}>
              <button 
                onClick={() => setActiveTab('register')}
                style={{
                  border: 'none', padding: '8px 16px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                  backgroundColor: activeTab === 'register' ? 'var(--color-primary-light)' : 'transparent',
                  color: activeTab === 'register' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                Daily Register
              </button>
              <button 
                onClick={() => setActiveTab('matrix')}
                style={{
                  border: 'none', padding: '8px 16px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                  backgroundColor: activeTab === 'matrix' ? 'var(--color-primary-light)' : 'transparent',
                  color: activeTab === 'matrix' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                Monthly Grid
              </button>
            </div>

            {/* Shift Switcher */}
            <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', backgroundColor: 'var(--color-card-bg)', height: '36px', padding: '2px' }}>
              <button 
                onClick={() => setSelectedShift('day')}
                style={{
                  border: 'none', padding: '0 12px', height: '30px', fontSize: '11px', fontWeight: '600', borderRadius: '3px', cursor: 'pointer',
                  backgroundColor: selectedShift === 'day' ? '#eab308' : 'transparent',
                  color: selectedShift === 'day' ? '#ffffff' : 'var(--color-text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                Day Shift
              </button>
              <button 
                onClick={() => setSelectedShift('night')}
                style={{
                  border: 'none', padding: '0 12px', height: '30px', fontSize: '11px', fontWeight: '600', borderRadius: '3px', cursor: 'pointer',
                  backgroundColor: selectedShift === 'night' ? '#6366f1' : 'transparent',
                  color: selectedShift === 'night' ? '#ffffff' : 'var(--color-text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                Night Shift
              </button>
            </div>

            {activeTab === 'register' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="date" 
                  className="form-input" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ width: '150px', height: '36px', padding: '0 8px', fontSize: '12px' }}
                />
                <button 
                  onClick={handleSaveAttendance}
                  disabled={saving || !isDirty}
                  className="form-button"
                  style={{ width: 'auto', marginTop: 0, height: '36px', padding: '0 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-primary)' }}
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Save Changes
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '2px 8px', height: '36px', backgroundColor: 'var(--color-card-bg)' }}>
                <button onClick={handlePrevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><ChevronLeft size={16} /></button>
                <span style={{ fontSize: '12px', fontWeight: '600', minWidth: '110px', textAlign: 'center' }}>
                  {getMonthName(matrixMonth)} {matrixYear}
                </span>
                <button onClick={handleNextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><ChevronRight size={16} /></button>
              </div>
            )}
          </div>
        </div>

        {feedback && (
          <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: 0 }}>
            {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* TAB 1: DAILY ATTENDANCE REGISTER */}
        {activeTab === 'register' && (
          <>
            {/* Daily Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', fontWeight: '500' }}>PRESENT</span>
                  <strong style={{ fontSize: '20px', color: 'var(--color-success)' }}>{summary.present}</strong>
                </div>
                <div style={{ padding: '6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)' }}><UserCheck size={16} /></div>
              </div>
              <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', fontWeight: '500' }}>LATE ARRIVALS</span>
                  <strong style={{ fontSize: '20px', color: 'var(--color-warning)' }}>{summary.late}</strong>
                </div>
                <div style={{ padding: '6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning)' }}><Clock size={16} /></div>
              </div>
              <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', fontWeight: '500' }}>ABSENT</span>
                  <strong style={{ fontSize: '20px', color: 'var(--color-danger)' }}>{summary.absent}</strong>
                </div>
                <div style={{ padding: '6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}><UserX size={16} /></div>
              </div>
              <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', fontWeight: '500' }}>ON LEAVE</span>
                  <strong style={{ fontSize: '20px', color: 'var(--color-primary)' }}>{summary.leave}</strong>
                </div>
                <div style={{ padding: '6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}><Calendar size={16} /></div>
              </div>
            </div>

            {/* Daily Register Table */}
            {attendanceRecords.length === 0 && !loading ? (
              <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No active staff users available to log attendance.
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                      <th style={{ padding: '12px 16px', width: '220px' }}>Employee Name</th>
                      <th style={{ padding: '12px 16px', width: '110px' }}>Role</th>
                      <th style={{ padding: '12px 16px', width: '150px' }}>Attendance Status</th>
                      <th style={{ padding: '12px 16px', width: '100px' }}>Clock In</th>
                      <th style={{ padding: '12px 16px', width: '100px' }}>Clock Out</th>
                      <th style={{ padding: '12px 16px' }}>Notes / Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && attendanceRecords.length === 0 ? (
                      Array.from({ length: 5 }).map((_, rIdx) => (
                        <tr key={rIdx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '120px' }} /></td>
                          <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '85px' }} /></td>
                          <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '24px', width: '110px', borderRadius: '4px' }} /></td>
                          <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '24px', width: '70px', borderRadius: '4px' }} /></td>
                          <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '24px', width: '70px', borderRadius: '4px' }} /></td>
                          <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '24px', width: '140px', borderRadius: '4px' }} /></td>
                        </tr>
                      ))
                    ) :
                      attendanceRecords.map(rec => (
                      <tr key={rec.user_id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: rec.is_dirty ? '#f8fafc' : 'transparent' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '600' }}>
                          {rec.name}
                          {rec.is_dirty && <span style={{ fontSize: '9px', color: 'var(--color-primary)', fontWeight: 'bold', marginLeft: '6px', textTransform: 'uppercase' }}>(unsaved)</span>}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                          {getRoleLabel(rec.role)}
                        </td>
                        <td style={{ padding: '8px 16px' }}>
                          <CustomSelect
                            value={rec.status}
                            onChange={(val) => handleRecordChange(rec.user_id, 'status', val)}
                            options={[
                              { value: 'present', label: 'Present' },
                              { value: 'absent', label: 'Absent' },
                              { value: 'late', label: 'Late' },
                              { value: 'half_day', label: 'Half Day' },
                              { value: 'leave', label: 'Leave' },
                            ]}
                            style={{ width: '130px' }}
                          />
                        </td>
                        <td style={{ padding: '8px 16px' }}>
                          <input 
                            type="time" 
                            className="form-input"
                            value={rec.clock_in}
                            onChange={(e) => handleRecordChange(rec.user_id, 'clock_in', e.target.value)}
                            disabled={['absent', 'leave'].includes(rec.status)}
                            style={{ height: '34px', padding: '0 8px', fontSize: '12px' }}
                          />
                        </td>
                        <td style={{ padding: '8px 16px' }}>
                          <input 
                            type="time" 
                            className="form-input"
                            value={rec.clock_out}
                            onChange={(e) => handleRecordChange(rec.user_id, 'clock_out', e.target.value)}
                            disabled={['absent', 'leave'].includes(rec.status)}
                            style={{ height: '34px', padding: '0 8px', fontSize: '12px' }}
                          />
                        </td>
                        <td style={{ padding: '8px 16px' }}>
                          <input 
                            type="text" 
                            className="form-input"
                            placeholder="e.g. Sick leave, late transport"
                            value={rec.notes}
                            onChange={(e) => handleRecordChange(rec.user_id, 'notes', e.target.value)}
                            style={{ height: '34px', padding: '0 8px', fontSize: '12px' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* TAB 2: MONTHLY GRID MATRIX SPREADSHEET */}
        {activeTab === 'matrix' && (
          <div className="card" style={{ padding: '20px', overflowX: 'auto' }}>
            {loading && attendanceRecords.length === 0 ? (
              <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="skeleton-line" style={{ height: '30px', width: '100%' }} />
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="skeleton-line" style={{ height: '24px', width: '100%' }} />
                ))}
              </div>
            ) :
              <div style={{ minWidth: '800px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '2px solid var(--color-border)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', minWidth: '150px', backgroundColor: 'var(--color-card-bg)', position: 'sticky', left: 0, zIndex: 2 }}>Staff Name</th>
                      {daysArray.map(day => (
                        <th key={day} style={{ padding: '8px 4px', width: '25px', fontWeight: 'bold' }}>{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map(userItem => {
                      const userLogs = matrixData[userItem.user_id] || {};
                      return (
                        <tr key={userItem.user_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: '600', textAlign: 'left', backgroundColor: 'var(--color-card-bg)', position: 'sticky', left: 0, zIndex: 2, borderRight: '1px solid var(--color-border)' }}>
                            {userItem.name}
                          </td>
                          {daysArray.map(day => {
                            const dateStr = `${matrixYear}-${matrixMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                            const statusVal = userLogs[dateStr];
                            
                            let symbol = '-';
                            let col = '#94a3b8';
                            let bg = 'transparent';
                            
                            if (statusVal === 'present') { symbol = 'P'; col = '#059669'; bg = '#ecfdf5'; }
                            else if (statusVal === 'absent') { symbol = 'A'; col = '#dc2626'; bg = '#fef2f2'; }
                            else if (statusVal === 'late') { symbol = 'L'; col = '#d97706'; bg = '#fffbeb'; }
                            else if (statusVal === 'half_day') { symbol = 'H'; col = '#ea580c'; bg = '#ffedd5'; }
                            else if (statusVal === 'leave') { symbol = 'V'; col = '#2563eb'; bg = '#eff6ff'; }

                            // Render weekend highlight
                            const dayOfWeek = new Date(matrixYear, matrixMonth - 1, day).getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sat or Sun
                            if (isWeekend && symbol === '-') {
                              bg = '#f1f5f9';
                            }

                            return (
                              <td 
                                key={day} 
                                title={`${userItem.name} - ${getMonthName(matrixMonth)} ${day}: ${statusVal || 'Not logged'}`}
                                style={{ 
                                  padding: '8px 2px', 
                                  backgroundColor: bg,
                                  color: col,
                                  fontWeight: symbol !== '-' ? 'bold' : 'normal',
                                  borderRight: '1px solid #f1f5f9'
                                }}
                              >
                                {symbol}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '16px', fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                  <span><strong style={{ color: '#059669' }}>P</strong>: Present</span>
                  <span><strong style={{ color: '#dc2626' }}>A</strong>: Absent</span>
                  <span><strong style={{ color: '#d97706' }}>L</strong>: Late Arrival</span>
                  <span><strong style={{ color: '#ea580c' }}>H</strong>: Half Day</span>
                  <span><strong style={{ color: '#2563eb' }}>V</strong>: Leave / Vacation</span>
                  <span><strong style={{ color: '#94a3b8' }}>-</strong>: Weekend / Not Logged</span>
                </div>
              </div>
            }
          </div>
        )}

      </div>
    );
  }

  // =============================================================
  // RENDERING PANEL: WORKER/STAFF SELF-CLOCK SHEET
  // =============================================================
  const todayDateFormatted = new Date().toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const isClockedIn = todayLog && todayLog.clock_in;
  const isClockedOut = todayLog && todayLog.clock_out;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>
      
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Daily Attendance Clock</h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          Check-in when you arrive on the shop floor to log your shift, and check-out when leaving.
        </p>
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: 0 }}>
          {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Clock-in check card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px', gap: '24px', textAlign: 'center' }}>
        
        <div>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Today</span>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px' }}>{todayDateFormatted}</h3>
        </div>

        {/* Big Clock Button Trigger */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={!isClockedIn ? handleClockIn : (!isClockedOut ? handleClockOut : null)}
            disabled={actionLoading || isClockedOut}
            style={{
              width: '130px',
              height: '130px',
              borderRadius: '50%',
              border: 'none',
              cursor: isClockedOut ? 'not-allowed' : 'pointer',
              color: '#ffffff',
              backgroundColor: isClockedOut 
                ? 'var(--color-text-light)' 
                : (isClockedIn ? 'var(--color-danger)' : 'var(--color-success)'),
              boxShadow: isClockedOut 
                ? 'none' 
                : `0 8px 16px ${isClockedIn ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontWeight: '700',
              fontSize: '14px',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              if (!isClockedOut && !actionLoading) {
                e.currentTarget.style.transform = 'scale(1.04)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isClockedOut) {
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
          >
            {actionLoading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : isClockedOut ? (
              <>
                <CheckCircle size={28} />
                <span>Shift Done</span>
              </>
            ) : isClockedIn ? (
              <>
                <Clock size={28} />
                <span>Clock Out</span>
              </>
            ) : (
              <>
                <Play size={28} style={{ marginLeft: '4px' }} />
                <span>Clock In</span>
              </>
            )}
          </button>
        </div>

        {/* Clock details display */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', width: '100%', maxWidth: '360px', marginTop: '8px' }}>
          <div style={{ backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>CLOCK IN</span>
            {isClockedIn ? (
              <div>
                <strong style={{ fontSize: '16px', color: 'var(--color-text-main)' }}>{todayLog.clock_in}</strong>
                <span style={{ 
                  display: 'block', fontSize: '10px', fontWeight: 'bold', margin: '4px auto 0 auto', width: 'fit-content', padding: '1px 6px', borderRadius: '10px',
                  backgroundColor: todayLog.status === 'late' ? 'var(--color-warning-light)' : 'var(--color-success-light)',
                  color: todayLog.status === 'late' ? 'var(--color-warning)' : 'var(--color-success)'
                }}>
                  {todayLog.status === 'late' ? 'Late' : 'On Time'}
                </span>
              </div>
            ) : (
              <span style={{ color: 'var(--color-text-light)', fontSize: '13px' }}>--:--</span>
            )}
          </div>

          <div style={{ backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>CLOCK OUT</span>
            {isClockedOut ? (
              <div>
                <strong style={{ fontSize: '16px', color: 'var(--color-text-main)' }}>{todayLog.clock_out}</strong>
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>Logged out</span>
              </div>
            ) : (
              <span style={{ color: 'var(--color-text-light)', fontSize: '13px' }}>--:--</span>
            )}
          </div>
        </div>

      </div>

      {/* Reusable Visual Attendance map for current worker */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>
          My Attendance Calendar (Current Month)
        </h3>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : monthlyLogs.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center' }}>No logs registered for this month.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Visual Grid */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {monthlyLogs.map(log => {
                const cMeta = getStatusBadgeStyle(log.status);
                const dayNum = new Date(log.date).getDate();
                return (
                  <div 
                    key={log.id}
                    title={`Date: ${log.date} | Status: ${cMeta.label}${log.clock_in ? ` | In: ${log.clock_in}` : ''}${log.clock_out ? ` | Out: ${log.clock_out}` : ''}`}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: cMeta.bg,
                      border: `1px solid ${cMeta.border}`,
                      color: cMeta.text,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'help'
                    }}
                  >
                    {dayNum}
                  </div>
                );
              })}
            </div>

            {/* Map Legend */}
            <div style={{ display: 'flex', gap: '12px', fontSize: '10px', color: 'var(--color-text-muted)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }}></span> Present
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}></span> Late
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5' }}></span> Absent
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}></span> Leave
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
