import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import CustomSelect from './CustomSelect';
import { 
  Users, 
  UserPlus, 
  Edit2, 
  Shield, 
  Mail, 
  Phone, 
  Lock, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Search,
  Check,
  UserX,
  UserCheck,
  Eye,
  ArrowLeft,
  DollarSign,
  FileText,
  Clock,
  Briefcase,
  Calendar,
  AlertTriangle,
  Camera
} from 'lucide-react';

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [editingUserId, setEditingUserId] = useState(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('worker');
  const [shift, setShift] = useState('day');
  const [status, setStatus] = useState('active');
  const [phone, setPhone] = useState('');
  const [salary, setSalary] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  
  const [formSaving, setFormSaving] = useState(false);
  const [toggleStatusLoading, setToggleStatusLoading] = useState(null); // stores user ID when toggling

  // Details View states
  const [viewingUser, setViewingUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [updatingNotes, setUpdatingNotes] = useState(false);
  const [detailNotes, setDetailNotes] = useState('');

  // Fetch users list
  const fetchUsers = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('http://127.0.0.1:8000/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (err) {
      console.error(err);
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to load users from the server.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch stats when viewing details
  const fetchUserStats = async (userId) => {
    setStatsLoading(true);
    setStats(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(`http://127.0.0.1:8000/api/users/${userId}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load user stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (viewingUser) {
      setDetailNotes(viewingUser.extra_notes || '');
      if (['worker', 'supervisor', 'helper'].includes(viewingUser.role)) {
        fetchUserStats(viewingUser.id);
      }
    }
  }, [viewingUser]);

  const openCreateModal = () => {
    setModalMode('create');
    setEditingUserId(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('worker');
    setShift('day');
    setStatus('active');
    setPhone('');
    setSalary('');
    setExtraNotes('');
    setShowModal(true);
    setFeedback(null);
  };

  const openEditModal = (user) => {
    setModalMode('edit');
    setEditingUserId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword(''); // leave blank unless changing
    setRole(user.role);
    setShift(user.shift || 'day');
    setStatus(user.status);
    setPhone(user.phone || '');
    setSalary(user.salary ? user.salary.toString().split('.')[0] : '');
    setExtraNotes(user.extra_notes || '');
    setShowModal(true);
    setFeedback(null);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setFormSaving(true);
    setFeedback(null);
    
    const token = localStorage.getItem('auth_token');
    const userData = {
      name,
      email,
      role,
      shift,
      status,
      phone,
      salary: salary ? parseFloat(salary) : null,
      extra_notes: extraNotes
    };
    
    if (modalMode === 'create' || password) {
      userData.password = password;
    }

    try {
      if (modalMode === 'create') {
        const response = await axios.post('http://127.0.0.1:8000/api/users', userData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFeedback({ type: 'success', message: response.data.message });
      } else {
        const response = await axios.put(`http://127.0.0.1:8000/api/users/${editingUserId}`, userData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFeedback({ type: 'success', message: response.data.message });
        
        // If we were currently viewing this user, update its local object
        if (viewingUser && viewingUser.id === editingUserId) {
          setViewingUser(prev => ({
            ...prev,
            ...userData,
            salary: salary ? parseFloat(salary) : null
          }));
        }
      }
      
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to save user. Please check validation rules.'
      });
    } finally {
      setFormSaving(false);
    }
  };

  const handlePhotoUpload = async (e, userId) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('photo', file);
    
    const token = localStorage.getItem('auth_token');
    try {
      setLoading(true);
      const response = await axios.post(`http://127.0.0.1:8000/api/users/${userId}/upload-photo`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const updatedPath = response.data.photo_path;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, photo_path: updatedPath } : u));
      setViewingUser(prev => ({ ...prev, photo_path: updatedPath }));
      
      setFeedback({
        type: 'success',
        message: 'Employee photo updated successfully.'
      });
    } catch (err) {
      console.error(err);
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to upload photo.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    setToggleStatusLoading(user.id);
    setFeedback(null);
    const token = localStorage.getItem('auth_token');
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    
    try {
      const response = await axios.put(`http://127.0.0.1:8000/api/users/${user.id}`, {
        name: user.name,
        email: user.email,
        role: user.role,
        shift: user.shift,
        status: newStatus,
        phone: user.phone,
        salary: user.salary,
        extra_notes: user.extra_notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state directly
      setUsers(prevUsers => 
        prevUsers.map(u => u.id === user.id ? { ...u, status: newStatus } : u)
      );
      
      if (viewingUser && viewingUser.id === user.id) {
        setViewingUser(prev => ({ ...prev, status: newStatus }));
      }
      
      setFeedback({
        type: 'success',
        message: `Account for ${user.name} is now ${newStatus}.`
      });
    } catch (err) {
      console.error(err);
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to update user status.'
      });
    } finally {
      setToggleStatusLoading(null);
    }
  };

  const handleUpdateNotesFromDetails = async () => {
    setUpdatingNotes(true);
    setFeedback(null);
    const token = localStorage.getItem('auth_token');
    try {
      await axios.put(`http://127.0.0.1:8000/api/users/${viewingUser.id}`, {
        name: viewingUser.name,
        email: viewingUser.email,
        role: viewingUser.role,
        shift: viewingUser.shift,
        status: viewingUser.status,
        phone: viewingUser.phone,
        salary: viewingUser.salary,
        extra_notes: detailNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUsers(prev => prev.map(u => u.id === viewingUser.id ? { ...u, extra_notes: detailNotes } : u));
      setViewingUser(prev => ({ ...prev, extra_notes: detailNotes }));
      setFeedback({ type: 'success', message: 'User administrative notes updated successfully.' });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to save administrative notes.' });
    } finally {
      setUpdatingNotes(false);
    }
  };

  // UI styling helper mappings
  const getRoleBadgeStyle = (roleVal) => {
    switch (roleVal) {
      case 'admin':
        return { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff', label: 'Admin' };
      case 'partner':
        return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', label: 'Partner' };
      case 'manager':
        return { bg: '#fffbeb', text: '#d97706', border: '#fde68a', label: 'Manager' };
      case 'supervisor':
        return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', label: 'Supervisor' };
      case 'helper':
        return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', label: 'Helper' };
      case 'worker':
        return { bg: '#f0fdfa', text: '#0d9488', border: '#99f6e4', label: 'Worker' };
      default:
        return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', label: roleVal };
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.phone && user.phone.includes(searchTerm))
  );

  // Generate visual attendance log for details page
  const attendanceRecord = [
    { day: 1, type: 'P' }, { day: 2, type: 'P' }, { day: 3, type: 'P' }, { day: 4, type: 'P' }, { day: 5, type: 'P' }, { day: 6, type: 'W' }, { day: 7, type: 'W' },
    { day: 8, type: 'P' }, { day: 9, type: 'L' }, { day: 10, type: 'P' }, { day: 11, type: 'P' }, { day: 12, type: 'A' }, { day: 13, type: 'W' }, { day: 14, type: 'W' },
    { day: 15, type: 'P' }, { day: 16, type: 'P' }, { day: 17, type: 'P' }, { day: 18, type: 'P' }, { day: 19, type: 'P' }, { day: 20, type: 'W' }, { day: 21, type: 'W' },
    { day: 22, type: 'P' }, { day: 23, type: 'P' }, { day: 24, type: 'L' }, { day: 25, type: 'P' }, { day: 26, type: 'P' }, { day: 27, type: 'W' }, { day: 28, type: 'W' },
  ];

  const getAttendanceColor = (type) => {
    switch(type) {
      case 'P': return { bg: 'var(--color-success-light)', border: 'var(--color-success)', text: 'var(--color-success)', label: 'Present' };
      case 'A': return { bg: 'var(--color-danger-light)', border: 'var(--color-danger)', text: 'var(--color-danger)', label: 'Absent' };
      case 'L': return { bg: 'var(--color-warning-light)', border: 'var(--color-warning)', text: 'var(--color-warning)', label: 'Late Arrival' };
      default: return { bg: '#f1f5f9', border: '#cbd5e1', text: '#64748b', label: 'Weekend / Holiday' };
    }
  };

  // ==========================================
  // VIEW MODE: USER DETAILS PROFILE SCREEN
  // ==========================================
  if (viewingUser) {
    const rStyle = getRoleBadgeStyle(viewingUser.role);
    const isStaff = ['worker', 'supervisor', 'helper'].includes(viewingUser.role);

    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Back and Action Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="logout-btn" onClick={() => setViewingUser(null)} style={{ padding: '6px 12px' }}>
              <ArrowLeft size={16} /> Back to Users
            </button>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>User Profile: {viewingUser.name}</h2>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => handleToggleStatus(viewingUser)}
              disabled={toggleStatusLoading === viewingUser.id}
              className="logout-btn"
              style={{ 
                padding: '6px 12px', 
                color: viewingUser.status === 'active' ? 'var(--color-danger)' : 'var(--color-success)',
                borderColor: viewingUser.status === 'active' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                backgroundColor: viewingUser.status === 'active' ? 'var(--color-danger-light)' : 'var(--color-success-light)'
              }}
            >
              {toggleStatusLoading === viewingUser.id ? <Loader2 size={14} className="animate-spin" /> : viewingUser.status === 'active' ? <UserX size={14} /> : <UserCheck size={14} />}
              <span style={{ marginLeft: '6px' }}>{viewingUser.status === 'active' ? 'Deactivate Login' : 'Activate Login'}</span>
            </button>
            <button onClick={() => openEditModal(viewingUser)} className="form-button" style={{ width: 'auto', marginTop: 0, height: '36px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Edit2 size={14} /> Edit Profile
            </button>
          </div>
        </div>

        {feedback && (
          <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: 0 }}>
            {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: isStaff ? '1fr 1.2fr' : '1fr', gap: '20px' }}>
          
          {/* LEFT PANEL: Core Info & Administrative Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Profile Overview Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ 
                  width: '70px', 
                  height: '70px', 
                  borderRadius: '50%', 
                  backgroundColor: rStyle.bg, 
                  color: rStyle.text, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  border: `2px solid ${rStyle.border}`,
                  overflow: 'hidden'
                }}>
                  {viewingUser.photo_path ? (
                    <img 
                      src={`http://127.0.0.1:8000/${viewingUser.photo_path}`} 
                      alt={viewingUser.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    viewingUser.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()
                  )}
                </div>
                <label 
                  htmlFor="user-photo-upload" 
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    backgroundColor: 'var(--color-primary)',
                    color: '#ffffff',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                    border: '2px solid #ffffff'
                  }}
                  title="Upload Employee Photo"
                >
                  <Camera size={12} />
                </label>
                <input 
                  type="file" 
                  id="user-photo-upload" 
                  accept="image/*" 
                  onChange={(e) => handlePhotoUpload(e, viewingUser.id)} 
                  style={{ display: 'none' }} 
                />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-text-main)' }}>{viewingUser.name}</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>{viewingUser.email}</p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: rStyle.bg, color: rStyle.text, border: `1px solid ${rStyle.border}`, borderRadius: '12px', fontWeight: '600', textTransform: 'capitalize' }}>
                    {rStyle.label}
                  </span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: viewingUser.status === 'active' ? 'var(--color-success-light)' : 'var(--color-danger-light)', color: viewingUser.status === 'active' ? 'var(--color-success)' : 'var(--color-danger)', border: `1px solid ${viewingUser.status==='active'?'rgba(34,197,94,0.2)':'rgba(239,68,68,0.2)'}`, borderRadius: '12px', fontWeight: '600', textTransform: 'capitalize' }}>
                    {viewingUser.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Employment Details & Salary Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>
                Employment & Financial Info
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}><Mail size={13} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Email Address</span>
                  <strong>{viewingUser.email}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}><Phone size={13} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Phone Number</span>
                  <strong>{viewingUser.phone || 'Not Provided'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}><Clock size={13} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Default Shift</span>
                  <strong style={{ textTransform: 'capitalize' }}>{viewingUser.shift || 'day'} Shift</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}><DollarSign size={13} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Monthly Base Salary</span>
                  <strong style={{ color: 'var(--color-primary)', fontSize: '15px' }}>
                    {viewingUser.salary ? `₹${parseFloat(viewingUser.salary).toLocaleString('en-IN')}` : 'Not Assigned'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Admin Notes Section */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>
                Administrative Notes
              </h3>
              <textarea
                className="form-input"
                placeholder="Write specific notes on user skill levels, notes, machinery operations history..."
                value={detailNotes}
                onChange={(e) => setDetailNotes(e.target.value)}
                style={{ height: '110px', padding: '10px', fontSize: '13px', resize: 'none', backgroundColor: 'var(--color-bg-base)' }}
              />
              <button 
                onClick={handleUpdateNotesFromDetails}
                disabled={updatingNotes || detailNotes === (viewingUser.extra_notes || '')}
                className="form-button"
                style={{ width: 'auto', alignSelf: 'flex-end', marginTop: 0, height: '34px', padding: '0 16px', fontSize: '12px', backgroundColor: 'var(--color-primary)' }}
              >
                {updatingNotes ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save Notes
              </button>
            </div>

          </div>

          {/* RIGHT PANEL: Stats & Attendance Logs (Staff-Only) */}
          {isStaff && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Work Done Statistics */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>
                  Work Performance & Load
                </h3>

                {statsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                    <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                  </div>
                ) : !stats ? (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                    Could not load stats.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Count Badges */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
                      <div style={{ backgroundColor: 'var(--color-success-light)', border: '1px solid rgba(34,197,94,0.15)', padding: '12px 6px', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', display: 'block', fontWeight: '500', textTransform: 'uppercase' }}>Done (Last Month)</span>
                        <strong style={{ fontSize: '20px', color: 'var(--color-success)' }}>{stats.completed_jobs_last_month}</strong>
                      </div>
                      <div style={{ backgroundColor: 'var(--color-primary-light)', border: '1px solid rgba(37,99,235,0.15)', padding: '12px 6px', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', display: 'block', fontWeight: '500', textTransform: 'uppercase' }}>Machining Right Now</span>
                        <strong style={{ fontSize: '20px', color: 'var(--color-primary)' }}>{stats.active_jobs}</strong>
                      </div>
                      <div style={{ backgroundColor: 'var(--color-warning-light)', border: '1px solid rgba(245,158,11,0.15)', padding: '12px 6px', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', display: 'block', fontWeight: '500', textTransform: 'uppercase' }}>Pending Allocation</span>
                        <strong style={{ fontSize: '20px', color: 'var(--color-warning)' }}>{stats.pending_jobs}</strong>
                      </div>
                    </div>

                    {/* Recent Jobs Table */}
                    <div>
                      <h4 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-text-muted)' }}>Recent Job Assigns</h4>
                      {stats.recent_jobs.length === 0 ? (
                        <p style={{ fontSize: '12px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>No jobs assigned to this user yet.</p>
                      ) : (
                        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                                <th style={{ padding: '8px 12px' }}>Job Card</th>
                                <th style={{ padding: '8px 12px' }}>PO Reference</th>
                                <th style={{ padding: '8px 12px' }}>Qty</th>
                                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stats.recent_jobs.map(job => (
                                <tr key={job.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                  <td style={{ padding: '8px 12px', fontWeight: '600' }}>{job.job_card_number}</td>
                                  <td style={{ padding: '8px 12px' }}>PO #{job.po_number}</td>
                                  <td style={{ padding: '8px 12px' }}>{job.quantity}</td>
                                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', textTransform: 'capitalize', color: job.status === 'completed' ? 'var(--color-success)' : 'var(--color-primary)' }}>
                                    {job.status.replace('_', ' ')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>

              {/* Attendance logs Card */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-primary)' }}>
                    Attendance Record (May 2026)
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    Attendance Rate: <strong style={{ color: 'var(--color-success)' }}>92%</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  
                  {/* Attendance Stats Row */}
                  <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: 'var(--color-text-muted)', justifyContent: 'center' }}>
                    <span>Present: <strong style={{ color: 'var(--color-success)' }}>22 Days</strong></span>
                    <span>Absent: <strong style={{ color: 'var(--color-danger)' }}>2 Days</strong></span>
                    <span>Late: <strong style={{ color: 'var(--color-warning)' }}>2 Days</strong></span>
                    <span>Weekend: <strong>8 Days</strong></span>
                  </div>

                  {/* Dynamic Visual Attendance Matrix */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(7, 1fr)', 
                    gap: '8px', 
                    maxWidth: '320px', 
                    margin: '0 auto',
                    border: '1px solid var(--color-border)',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-bg-base)'
                  }}>
                    {attendanceRecord.map(rec => {
                      const colMeta = getAttendanceColor(rec.type);
                      return (
                        <div 
                          key={rec.day}
                          title={`Day ${rec.day}: ${colMeta.label}`}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '4px',
                            backgroundColor: colMeta.bg,
                            border: `1px solid ${colMeta.border}`,
                            color: colMeta.text,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: '700',
                            cursor: 'help',
                            userSelect: 'none'
                          }}
                        >
                          {rec.day}
                        </div>
                      );
                    })}
                  </div>

                  {/* Map Legend */}
                  <div style={{ display: 'flex', gap: '12px', fontSize: '10px', color: 'var(--color-text-muted)', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--color-success-light)', border: '1px solid var(--color-success)' }}></span> Present
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--color-danger-light)', border: '1px solid var(--color-danger)' }}></span> Absent
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--color-warning-light)', border: '1px solid var(--color-warning)' }}></span> Late
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#f1f5f9', border: '#cbd5e1' }}></span> Weekend
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW MODE: DEFAULT USERS LIST TABLE
  // ==========================================
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Search and Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--color-text-light)' }} />
          <input 
            type="text" 
            placeholder="Search users by name, email, or role..." 
            className="form-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '38px', height: '36px', fontSize: '13px' }}
          />
        </div>
        
        <button 
          onClick={openCreateModal}
          className="form-button"
          style={{ width: 'auto', marginTop: 0, height: '36px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', backgroundColor: 'var(--color-primary)' }}
        >
          <UserPlus size={16} /> Add User Account
        </button>
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: 0 }}>
          {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Users Table */}
      {filteredUsers.length === 0 && !loading ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: '12px' }}>
          <Users size={40} style={{ color: 'var(--color-text-light)' }} />
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>No users found.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px 16px' }}>User Details</th>
                <th style={{ padding: '12px 16px' }}>Role</th>
                <th style={{ padding: '12px 16px' }}>Phone</th>
                <th style={{ padding: '12px 16px' }}>Salary</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && filteredUsers.length === 0 ? (
                Array.from({ length: 5 }).map((_, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="skeleton-line animate-pulse" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div className="skeleton-line animate-pulse" style={{ height: '14px', width: '100px' }} />
                          <div className="skeleton-line animate-pulse" style={{ height: '10px', width: '140px' }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '18px', width: '70px', borderRadius: '12px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '90px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '80px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '18px', width: '70px', borderRadius: '12px' }} /></td>
                    <td style={{ padding: '16px', textAlign: 'right' }}><div className="skeleton-line animate-pulse" style={{ height: '28px', width: '180px', marginLeft: 'auto' }} /></td>
                  </tr>
                ))
              ) :
                filteredUsers.map(user => {
                const rStyle = getRoleBadgeStyle(user.role);
                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }} className="table-row-hover">
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          backgroundColor: rStyle.bg, 
                          color: rStyle.text,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '600',
                          fontSize: '12px',
                          border: `1px solid ${rStyle.border}`,
                          overflow: 'hidden'
                        }}>
                          {user.photo_path ? (
                            <img 
                              src={`http://127.0.0.1:8000/${user.photo_path}`} 
                              alt={user.name} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                          ) : (
                            user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--color-text-main)' }}>{user.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span style={{ 
                          fontSize: '11px', 
                          padding: '2px 8px', 
                          backgroundColor: rStyle.bg, 
                          color: rStyle.text, 
                          border: `1px solid ${rStyle.border}`,
                          borderRadius: '12px',
                          fontWeight: '600',
                          textTransform: 'capitalize'
                        }}>
                          {rStyle.label}
                        </span>
                        <span style={{ 
                          fontSize: '10px', 
                          color: user.shift === 'night' ? '#6366f1' : '#eab308', 
                          fontWeight: '600',
                          textTransform: 'capitalize',
                          marginLeft: '4px'
                        }}>
                          {(user.shift || 'day').toUpperCase()} SHIFT
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>
                      {user.phone || <em style={{ color: 'var(--color-text-light)' }}>-</em>}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: '500' }}>
                      {user.salary ? `₹${parseFloat(user.salary).toLocaleString('en-IN')}` : <em style={{ color: 'var(--color-text-light)' }}>-</em>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ 
                        fontSize: '11px', 
                        padding: '2px 8px', 
                        backgroundColor: user.status === 'active' ? 'var(--color-success-light)' : 'var(--color-danger-light)', 
                        color: user.status === 'active' ? 'var(--color-success)' : 'var(--color-danger)', 
                        border: `1px solid ${user.status === 'active' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                        borderRadius: '12px',
                        fontWeight: '600',
                        textTransform: 'capitalize',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{ 
                          width: '6px', 
                          height: '6px', 
                          borderRadius: '50%', 
                          backgroundColor: user.status === 'active' ? 'var(--color-success)' : 'var(--color-danger)'
                        }} />
                        {user.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        {/* Status Toggle Button */}
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={toggleStatusLoading === user.id}
                          className="logout-btn"
                          title={user.status === 'active' ? 'Deactivate User Login' : 'Activate User Login'}
                          style={{ 
                            padding: '4px 8px', 
                            height: '28px', 
                            fontSize: '11px',
                            color: user.status === 'active' ? 'var(--color-danger)' : 'var(--color-success)',
                            borderColor: user.status === 'active' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                            backgroundColor: user.status === 'active' ? 'var(--color-danger-light)' : 'var(--color-success-light)'
                          }}
                        >
                          {toggleStatusLoading === user.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : user.status === 'active' ? (
                            <UserX size={12} />
                          ) : (
                            <UserCheck size={12} />
                          )}
                          <span style={{ marginLeft: '4px' }}>
                            {user.status === 'active' ? 'Deactivate' : 'Activate'}
                          </span>
                        </button>

                        {/* View Button */}
                        <button 
                          onClick={() => setViewingUser(user)}
                          className="logout-btn"
                          style={{ padding: '4px 8px', height: '28px', fontSize: '11px', color: 'var(--color-primary)', borderColor: 'rgba(37,99,235,0.15)', backgroundColor: 'var(--color-primary-light)' }}
                        >
                          <Eye size={12} />
                          <span style={{ marginLeft: '4px' }}>View</span>
                        </button>

                        {/* Edit Button */}
                        <button 
                          onClick={() => openEditModal(user)}
                          className="logout-btn"
                          style={{ padding: '4px 8px', height: '28px', fontSize: '11px' }}
                        >
                          <Edit2 size={12} />
                          <span style={{ marginLeft: '4px' }}>Edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Create/Edit User */}
      {showModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '40px 20px',
          overflowY: 'auto',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="animate-fade-in" style={{ 
            width: '100%', 
            maxWidth: '500px', 
            backgroundColor: 'var(--color-card-bg)',
            border: '1px solid var(--color-border)',
            padding: '24px 30px', 
            boxShadow: 'var(--shadow-lg)',
            borderRadius: 'var(--radius-lg)',
            position: 'relative',
            marginBottom: '40px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text-main)' }}>
                {modalMode === 'create' ? 'Add New User Account' : 'Edit User Account'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label"><Shield size={13} /> Full Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ paddingLeft: '12px', height: '38px', fontSize: '13px' }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label"><Mail size={13} /> Email Address</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="name@techfocal.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '12px', height: '38px', fontSize: '13px' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <CustomSelect
                    value={role}
                    onChange={(val) => setRole(val)}
                    options={[
                      { value: 'admin', label: 'Admin' },
                      { value: 'partner', label: 'Partner' },
                      { value: 'manager', label: 'Manager' },
                      { value: 'supervisor', label: 'Supervisor' },
                      { value: 'helper', label: 'Helper' },
                      { value: 'worker', label: 'Worker' }
                    ]}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Default Shift</label>
                  <CustomSelect
                    value={shift}
                    onChange={(val) => setShift(val)}
                    options={[
                      { value: 'day', label: 'Day Shift' },
                      { value: 'night', label: 'Night Shift' }
                    ]}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <CustomSelect
                    value={status}
                    onChange={(val) => setStatus(val)}
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' }
                    ]}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label"><Phone size={13} /> Phone (Optional)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ paddingLeft: '12px', height: '38px', fontSize: '13px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label"><DollarSign size={13} /> Salary (Optional)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="e.g. 25000"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    style={{ paddingLeft: '12px', height: '38px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Lock size={13} /> Password 
                  {modalMode === 'edit' && <span style={{ fontWeight: 'normal', color: 'var(--color-text-muted)', fontSize: '11px', marginLeft: '4px' }}>(Leave blank to keep current)</span>}
                </label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder={modalMode === 'create' ? "Enter account password" : "Enter new password if changing"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '12px', height: '38px', fontSize: '13px' }}
                  required={modalMode === 'create'}
                />
              </div>

              <div className="form-group">
                <label className="form-label"><FileText size={13} /> Administrative Notes (Optional)</label>
                <textarea 
                  className="form-input" 
                  placeholder="Employee skills, performance reviews, notes..."
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                  style={{ padding: '10px 12px', height: '60px', fontSize: '13px', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  className="logout-btn" 
                  onClick={() => setShowModal(false)}
                  style={{ height: '38px', padding: '0 16px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="form-button"
                  disabled={formSaving}
                  style={{ width: 'auto', marginTop: 0, height: '38px', padding: '0 24px', backgroundColor: 'var(--color-primary)' }}
                >
                  {formSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save Account
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
