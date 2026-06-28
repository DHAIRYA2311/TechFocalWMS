import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import axios from 'axios';
import CustomSelect from './CustomSelect';
import Logo from './Logo';
import { 
  Users, 
  Search, 
  Eye, 
  ArrowLeft, 
  Mail, 
  Phone, 
  Shield, 
  Calendar, 
  DollarSign, 
  Briefcase, 
  Clock, 
  TrendingUp, 
  FileText, 
  Printer, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Lock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Camera
} from 'lucide-react';

export default function StaffsManagement({ user }) {
  const location = useLocation();
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // Selected staff and navigation inside profile
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'progress' | 'attendance' | 'salary' | 'idcard'

  // Progress Tab State
  const [progressStats, setProgressStats] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(false);

  // Attendance Tab State
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceMonth, setAttendanceMonth] = useState(new Date().getMonth() + 1);
  const [attendanceYear, setAttendanceYear] = useState(new Date().getFullYear());

  // Salary Tab State
  const [salaryInfo, setSalaryInfo] = useState(null);
  const [loadingSalary, setLoadingSalary] = useState(false);

  // ID Card State
  const [isFlipped, setIsFlipped] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [pdfExportType, setPdfExportType] = useState('combined');

  const fetchStaffs = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('http://127.0.0.1:8000/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // We list all users, but filter out admin/partner if we want pure shop staff.
      // However, it is better to display all users since admin and partner are also staff.
      // Let's filter out non-active users by default or display them with statuses.
      setStaffs(response.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to fetch staff members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffs();
  }, []);

  useEffect(() => {
    if (location.state && location.state.viewStaffId && staffs.length > 0) {
      const staff = staffs.find(s => s.id === location.state.viewStaffId);
      if (staff) {
        setSelectedStaff(staff);
        setActiveTab('profile');
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, staffs]);

  // Fetch individual sub-tab data when activeTab changes
  useEffect(() => {
    if (!selectedStaff) return;

    if (activeTab === 'progress') {
      fetchProgressStats(selectedStaff.id);
    } else if (activeTab === 'attendance') {
      fetchAttendance(selectedStaff.id, attendanceMonth, attendanceYear);
    } else if (activeTab === 'salary') {
      fetchSalaryHistory(selectedStaff.id);
    }
  }, [selectedStaff, activeTab, attendanceMonth, attendanceYear]);

  const fetchProgressStats = async (staffId) => {
    setLoadingProgress(true);
    setProgressStats(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(`http://127.0.0.1:8000/api/users/${staffId}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProgressStats(response.data);
    } catch (err) {
      console.error('Failed to load progress stats:', err);
    } finally {
      setLoadingProgress(false);
    }
  };

  const fetchAttendance = async (staffId, month, year) => {
    setLoadingAttendance(true);
    setAttendanceLogs([]);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(`http://127.0.0.1:8000/api/users/${staffId}/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { month, year }
      });
      setAttendanceLogs(response.data);
    } catch (err) {
      console.error('Failed to load attendance logs:', err);
    } finally {
      setLoadingAttendance(true); // wait, should be false!
      setLoadingAttendance(false);
    }
  };

  const fetchSalaryHistory = async (staffId) => {
    // Only admins, partners, and managers can view salary history
    if (!['admin', 'partner', 'manager'].includes(user?.role)) {
      return;
    }
    setLoadingSalary(true);
    setSalaryInfo(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(`http://127.0.0.1:8000/api/users/${staffId}/salary-history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSalaryInfo(response.data);
    } catch (err) {
      console.error('Failed to load salary history:', err);
    } finally {
      setLoadingSalary(false);
    }
  };

  // Date controls
  const handlePrevMonth = () => {
    setAttendanceMonth(prev => {
      if (prev === 1) {
        setAttendanceYear(y => y - 1);
        return 12;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setAttendanceMonth(prev => {
      if (prev === 12) {
        setAttendanceYear(y => y + 1);
        return 1;
      }
      return prev + 1;
    });
  };

  const getMonthName = (m) => {
    const d = new Date(2000, m - 1, 1);
    return d.toLocaleString('default', { month: 'long' });
  };

  // Role style mapping
  const getRoleTheme = (roleVal) => {
    switch (roleVal) {
      case 'admin':
        return { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff', label: 'Admin', color: '#7c3aed' };
      case 'partner':
        return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', label: 'Partner', color: '#059669' };
      case 'manager':
        return { bg: '#fffbeb', text: '#d97706', border: '#fde68a', label: 'Manager', color: '#d97706' };
      case 'supervisor':
        return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', label: 'Supervisor', color: '#2563eb' };
      case 'helper':
        return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', label: 'Helper', color: '#475569' };
      case 'worker':
        return { bg: '#f0fdfa', text: '#0d9488', border: '#99f6e4', label: 'Worker', color: '#0d9488' };
      default:
        return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', label: roleVal, color: '#64748b' };
    }
  };

  const filteredStaffs = staffs.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone && s.phone.includes(searchTerm));
    
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Print function
  const handlePrintIDCard = () => {
    window.print();
  };

  const handlePhotoUpload = async (e, staffId) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('photo', file);
    
    const token = localStorage.getItem('auth_token');
    try {
      setLoading(true);
      const response = await axios.post(`http://127.0.0.1:8000/api/users/${staffId}/upload-photo`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const updatedPath = response.data.photo_path;
      setStaffs(prev => prev.map(s => s.id === staffId ? { ...s, photo_path: updatedPath } : s));
      setSelectedStaff(prev => ({ ...prev, photo_path: updatedPath }));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to upload photo.');
    } finally {
      setLoading(false);
    }
  };

  const handlePDFGeneration = async () => {
    setShowDownloadModal(false);
    try {
      setLoading(true);
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [54, 86]
      });

      const options = {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null
      };

      const downloadFront = async (addPage = false) => {
        const frontEl = document.getElementById('capture-card-front');
        if (!frontEl) return;
        const canvas = await html2canvas(frontEl, options);
        const imgData = canvas.toDataURL('image/png');
        if (addPage) doc.addPage();
        doc.addImage(imgData, 'PNG', 0, 0, 54, 86);
      };

      const downloadBack = async (addPage = false) => {
        const backEl = document.getElementById('capture-card-back');
        if (!backEl) return;
        const canvas = await html2canvas(backEl, options);
        const imgData = canvas.toDataURL('image/png');
        if (addPage) doc.addPage();
        doc.addImage(imgData, 'PNG', 0, 0, 54, 86);
      };

      if (pdfExportType === 'front') {
        await downloadFront(false);
      } else if (pdfExportType === 'back') {
        await downloadBack(false);
      } else if (pdfExportType === 'combined') {
        await downloadFront(false);
        await downloadBack(true);
      }

      doc.save(`ID_Card_${selectedStaff.name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF Generation failed:', err);
      alert('Failed to generate PDF ID card. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate matrix for Calendar
  const getDaysInMonth = (m, y) => new Date(y, m, 0).getDate();
  const getFirstDayOfMonth = (m, y) => new Date(y, m - 1, 1).getDay(); // 0 is Sunday, 1 is Monday

  const renderAttendanceCalendar = () => {
    const totalDays = getDaysInMonth(attendanceMonth, attendanceYear);
    const startDay = getFirstDayOfMonth(attendanceMonth, attendanceYear);
    
    const calendarCells = [];
    
    // Empty cells for alignment before day 1
    for (let i = 0; i < startDay; i++) {
      calendarCells.push(<div key={`empty-${i}`} style={{ height: '55px', backgroundColor: 'transparent' }} />);
    }

    // Days list
    const logMap = attendanceLogs.reduce((acc, log) => {
      acc[log.date] = log;
      return acc;
    }, {});

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${attendanceYear}-${attendanceMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const log = logMap[dateStr];
      
      let bg = 'var(--color-bg-base)';
      let text = 'var(--color-text-main)';
      let border = 'var(--color-border)';
      let statusLabel = '';
      
      if (log) {
        if (log.status === 'present') { bg = '#ecfdf5'; text = '#059669'; border = '#a7f3d0'; statusLabel = 'P'; }
        else if (log.status === 'absent') { bg = '#fef2f2'; text = '#dc2626'; border = '#fca5a5'; statusLabel = 'A'; }
        else if (log.status === 'late') { bg = '#fffbeb'; text = '#d97706'; border = '#fde68a'; statusLabel = 'L'; }
        else if (log.status === 'half_day') { bg = '#ffedd5'; text = '#ea580c'; border = '#ffedd5'; statusLabel = 'H'; }
        else if (log.status === 'leave') { bg = '#eff6ff'; text = '#2563eb'; border = '#bfdbfe'; statusLabel = 'V'; }
      } else {
        // Highlight weekends
        const dayOfWeek = new Date(attendanceYear, attendanceMonth - 1, day).getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          bg = '#f1f5f9';
          text = '#94a3b8';
        }
      }

      calendarCells.push(
        <div 
          key={day}
          title={log ? `Status: ${log.status.toUpperCase()}${log.clock_in ? ` | In: ${log.clock_in}` : ''}${log.clock_out ? ` | Out: ${log.clock_out}` : ''}${log.notes ? ` | Notes: ${log.notes}` : ''}` : `No log recorded`}
          style={{
            height: '55px',
            borderRadius: 'var(--radius-sm)',
            border: `1px solid ${border}`,
            backgroundColor: bg,
            color: text,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '6px',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'help',
            transition: 'transform 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span style={{ fontSize: '12px' }}>{day}</span>
          {statusLabel && (
            <span style={{ 
              alignSelf: 'flex-end', 
              fontSize: '10px', 
              fontWeight: '800', 
              padding: '1px 5px', 
              borderRadius: '3px',
              backgroundColor: 'rgba(255,255,255,0.7)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              {statusLabel}
            </span>
          )}
        </div>
      );
    }

    return calendarCells;
  };

  // Render front of ID Card
  const renderIDCardFront = (staff, isStatic = false) => {
    const theme = getRoleTheme(staff.role);
    const idCode = `TF-2026-${staff.id.toString().padStart(4, '0')}`;
    const initials = staff.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
    const joinDate = staff.created_at ? new Date(staff.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' }) : 'June 2026';

    return (
      <div className={isStatic ? "" : "card-front"} style={{
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        height: '510px',
        position: isStatic ? 'relative' : 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
        borderRadius: '16px',
        border: '1px solid var(--color-border)',
        boxShadow: isStatic ? 'none' : 'var(--shadow-lg)'
      }}>
        {/* Curved Deep Blue Header */}
        <div style={{
          height: '110px',
          backgroundColor: '#0f172a',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '10px',
          boxSizing: 'border-box'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '100%', 
            padding: '0 20px', 
            boxSizing: 'border-box', 
            zIndex: 10 
          }}>
            <Logo variant="full" height={35} style={{ maxWidth: '100%' }} />
          </div>
          {/* Decorative curve overlay */}
          <div style={{
            position: 'absolute',
            bottom: '-20px',
            left: '-10%',
            width: '120%',
            height: '40px',
            backgroundColor: '#ffffff',
            borderRadius: '50% 50% 0 0'
          }} />
        </div>

        {/* Profile Circle */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginTop: '-30px', 
          zIndex: 5,
          position: 'relative' 
        }}>
          {staff.photo_path ? (
            <img 
              src={`http://127.0.0.1:8000/${staff.photo_path}`}
              alt={staff.name}
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                border: '4px solid #ffffff',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                objectFit: 'cover'
              }}
            />
          ) : (
            <div style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${theme.color} 0%, #cbd5e1 100%)`,
              border: '4px solid #ffffff',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: '800',
              color: '#ffffff'
            }}>
              {initials}
            </div>
          )}
        </div>

        {/* Name and Designation */}
        <div style={{ textAlign: 'center', marginTop: '12px', padding: '0 20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>{staff.name}</h3>
          <span style={{
            display: 'inline-block',
            marginTop: '6px',
            fontSize: '10px',
            fontWeight: '700',
            color: theme.text,
            backgroundColor: theme.bg,
            border: `1px solid ${theme.border}`,
            padding: '2px 10px',
            borderRadius: '12px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            {theme.label}
          </span>
        </div>

        {/* Details Grid */}
        <div style={{ 
          marginTop: '20px', 
          padding: '0 24px', 
          fontSize: '11px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px',
          color: '#475569' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
            <span style={{ fontWeight: '500' }}>EMPLOYEE ID</span>
            <strong style={{ color: '#0f172a' }}>{idCode}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
            <span style={{ fontWeight: '500' }}>DATE JOINED</span>
            <strong style={{ color: '#0f172a' }}>{joinDate}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
            <span style={{ fontWeight: '500' }}>CONTACT PHONE</span>
            <strong style={{ color: '#0f172a' }}>{staff.phone || 'N/A'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
            <span style={{ fontWeight: '500' }}>EMAIL ADDRESS</span>
            <strong style={{ color: '#0f172a', fontSize: '10px' }}>{staff.email}</strong>
          </div>
        </div>

        {/* Barcode Footer */}
        <div style={{ 
          marginTop: 'auto', 
          padding: '16px 20px', 
          textAlign: 'center', 
          backgroundColor: '#f8fafc', 
          borderTop: '1px solid #e2e8f0' 
        }}>
          <svg viewBox="0 0 100 28" width="160" height="30" style={{ display: 'block', margin: '0 auto' }}>
            <rect x="0" y="0" width="2" height="28" fill="black" />
            <rect x="3" y="0" width="1" height="28" fill="black" />
            <rect x="5" y="0" width="3" height="28" fill="black" />
            <rect x="9" y="0" width="1" height="28" fill="black" />
            <rect x="11" y="0" width="2" height="28" fill="black" />
            <rect x="15" y="0" width="4" height="28" fill="black" />
            <rect x="20" y="0" width="1" height="28" fill="black" />
            <rect x="22" y="0" width="2" height="28" fill="black" />
            <rect x="26" y="0" width="3" height="28" fill="black" />
            <rect x="30" y="0" width="1" height="28" fill="black" />
            <rect x="32" y="0" width="2" height="28" fill="black" />
            <rect x="36" y="0" width="4" height="28" fill="black" />
            <rect x="42" y="0" width="1" height="28" fill="black" />
            <rect x="44" y="0" width="3" height="28" fill="black" />
            <rect x="49" y="0" width="1" height="28" fill="black" />
            <rect x="51" y="0" width="2" height="28" fill="black" />
            <rect x="55" y="0" width="4" height="28" fill="black" />
            <rect x="61" y="0" width="1" height="28" fill="black" />
            <rect x="63" y="0" width="2" height="28" fill="black" />
            <rect x="67" y="0" width="3" height="28" fill="black" />
            <rect x="71" y="0" width="1" height="28" fill="black" />
            <rect x="73" y="0" width="2" height="28" fill="black" />
            <rect x="77" y="0" width="4" height="28" fill="black" />
            <rect x="83" y="0" width="1" height="28" fill="black" />
            <rect x="85" y="0" width="3" height="28" fill="black" />
            <rect x="90" y="0" width="2" height="28" fill="black" />
          </svg>
          <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', display: 'block', marginTop: '4px', letterSpacing: '2px' }}>
            {idCode}
          </span>
        </div>
      </div>
    );
  };

  // Render back of ID Card
  const renderIDCardBack = (staff, isStatic = false) => {
    return (
      <div className={isStatic ? "" : "card-back"} style={{
        backgroundColor: '#0f172a', // Deep Dark Blue background
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        height: '510px',
        position: isStatic ? 'relative' : 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
        borderRadius: '16px',
        border: '1px solid #1e293b',
        boxShadow: isStatic ? 'none' : 'var(--shadow-lg)'
      }}>
        {/* Header Logo */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          width: '100%', 
          padding: '0 20px', 
          boxSizing: 'border-box', 
          marginTop: '40px' 
        }}>
          <Logo variant="full" height={32} style={{ maxWidth: '100%' }} />
        </div>

        {/* Terms Box */}
        <div style={{ 
          marginTop: '30px', 
          padding: '0 24px', 
          fontSize: '10px', 
          lineHeight: '1.5', 
          color: '#94a3b8',
          textAlign: 'center' 
        }}>
          <p style={{ margin: 0 }}>
            This card remains the property of <strong>TechFocal Enterprises LLP</strong>. 
            It is strictly non-transferable and must be presented on demand.
          </p>
          <p style={{ marginTop: '10px' }}>
            In case of loss, report immediately to Human Resources. 
            If found, please return to the address below.
          </p>
        </div>

        {/* Address & Emergency Info */}
        <div style={{ 
          marginTop: 'auto', 
          padding: '0 24px 20px 24px', 
          fontSize: '10px',
          color: '#e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ borderTop: '1px solid #334155', paddingTop: '15px' }}>
            <span style={{ display: 'block', color: '#94a3b8', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }}>Office Address</span>
            <strong>Plot No 1 Survey No. 97/1, Canal Road, Village : Lamdapura, Ta : Savali, Dist: Vadodara - 391775</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '5px' }}>
            <div>
              <span style={{ display: 'block', color: '#94a3b8', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }}>Emergency Call</span>
              <strong>+91 98765 43210</strong>
            </div>

            {/* Signature Area */}
            <div style={{ textAlign: 'center', width: '110px' }}>
              <div style={{ 
                fontFamily: 'Georgia, serif', 
                fontStyle: 'italic', 
                fontSize: '15px', 
                color: '#38bdf8', 
                lineHeight: '1',
                marginBottom: '4px' 
              }}>
                TechFocal
              </div>
              <div style={{ 
                borderTop: '1px solid #475569', 
                paddingTop: '3px', 
                fontSize: '8px', 
                color: '#94a3b8', 
                fontWeight: 'bold', 
                textTransform: 'uppercase' 
              }}>
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>

        {/* Color Bar footer */}
        <div style={{ height: '8px', background: 'linear-gradient(90deg, #2ba454 0%, #31369d 100%)', width: '100%' }} />
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Dynamic Style Tag for Flipper and Media Print Support */}
      <style dangerouslySetInnerHTML={{__html: `
        .idcard-viewport {
          perspective: 1000px;
          width: 320px;
          height: 510px;
          margin: 0 auto;
        }
        .idcard-flipper {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
        }
        .idcard-flipper.is-flipped {
          transform: rotateY(180deg);
        }
        .card-front, .card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
        }
        .card-back {
          transform: rotateY(180deg);
        }
        
        /* PRINT STYLES */
        @media print {
          /* Hide all screen elements */
          body * {
            visibility: hidden;
            background-color: transparent !important;
            box-shadow: none !important;
          }
          /* Show print area specifically */
          #printable-card-badge, #printable-card-badge * {
            visibility: visible;
          }
          #printable-card-badge {
            position: absolute;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) scale(1.2) !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: 1px solid #475569 !important;
            background-color: #ffffff !important;
            z-index: 99999 !important;
          }
          /* Avoid headers/footers in page printing */
          @page {
            size: portrait;
            margin: 0;
          }
        }
      `}} />

      {/* Main Container */}
      {!selectedStaff ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Staff Directory & Workspace</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Monitor profiles, evaluate productivity workloads, review monthly calendar attendance sheets, and check employee ID badges.
            </p>
          </div>

          {error && (
            <div className="alert alert-danger">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Directory Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--color-text-light)' }} />
              <input 
                type="text" 
                placeholder="Search staff by name, email, phone..." 
                className="form-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '38px', height: '36px', fontSize: '13px' }}
              />
            </div>

            {/* Role Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--color-bg-base)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              {[
                { key: 'all', label: 'All Staffs' },
                { key: 'manager', label: 'Managers' },
                { key: 'supervisor', label: 'Supervisors' },
                { key: 'helper', label: 'Helpers' },
                { key: 'worker', label: 'Workers' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setRoleFilter(tab.key)}
                  style={{
                    border: 'none',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    backgroundColor: roleFilter === tab.key ? 'var(--color-card-bg)' : 'transparent',
                    color: roleFilter === tab.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    boxShadow: roleFilter === tab.key ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Directory Grid */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="card animate-pulse" style={{ height: '140px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="skeleton-line" style={{ width: '45px', height: '45px', borderRadius: '50%' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1 }}>
                      <div className="skeleton-line" style={{ height: '14px', width: '80%' }} />
                      <div className="skeleton-line" style={{ height: '10px', width: '50%' }} />
                    </div>
                  </div>
                  <div className="skeleton-line" style={{ height: '12px', width: '90%', marginTop: '10px' }} />
                  <div className="skeleton-line" style={{ height: '12px', width: '60%' }} />
                </div>
              ))}
            </div>
          ) : filteredStaffs.length === 0 ? (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: '12px', textAlign: 'center' }}>
              <Users size={40} style={{ color: 'var(--color-text-light)' }} />
              <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>No staff members found matching the filters.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
              {filteredStaffs.map(staff => {
                const theme = getRoleTheme(staff.role);
                const initials = staff.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
                return (
                  <div 
                    key={staff.id} 
                    className="card table-row-hover"
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between',
                      padding: '20px', 
                      gap: '12px',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease-out'
                    }}
                    onClick={() => { setSelectedStaff(staff); setActiveTab('profile'); }}
                  >
                    {/* Left Accent strip */}
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: theme.color }} />

                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      <div style={{ 
                        width: '46px', 
                        height: '46px', 
                        borderRadius: '50%', 
                        backgroundColor: theme.bg, 
                        color: theme.text,
                        border: `1px solid ${theme.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '15px',
                        overflow: 'hidden'
                      }}>
                        {staff.photo_path ? (
                          <img 
                            src={`http://127.0.0.1:8000/${staff.photo_path}`} 
                            alt={staff.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : (
                          initials
                        )}
                      </div>

                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-main)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {staff.name}
                        </h4>
                        <span style={{ 
                          fontSize: '10px', 
                          fontWeight: '700', 
                          padding: '1px 8px', 
                          borderRadius: '10px',
                          color: theme.text, 
                          backgroundColor: theme.bg, 
                          border: `1px solid ${theme.border}`,
                          textTransform: 'uppercase',
                          marginTop: '4px',
                          display: 'inline-block'
                        }}>
                          {theme.label}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={12} style={{ color: 'var(--color-text-light)' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{staff.email}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={12} style={{ color: 'var(--color-text-light)' }} />
                        <span>{staff.phone || <em style={{ color: 'var(--color-text-light)' }}>Not provided</em>}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        fontWeight: '600',
                        borderRadius: '12px',
                        backgroundColor: staff.status === 'active' ? 'var(--color-success-light)' : 'var(--color-danger-light)',
                        color: staff.status === 'active' ? 'var(--color-success)' : 'var(--color-danger)',
                        border: `1px solid ${staff.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}`,
                        textTransform: 'capitalize'
                      }}>
                        {staff.status}
                      </span>

                      <button 
                        className="logout-btn" 
                        style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--color-primary)', borderColor: 'rgba(37,99,235,0.15)' }}
                      >
                        <Eye size={12} /> View Profile
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // Detailed Profile View Workspace
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Header Action bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
            <button className="logout-btn" onClick={() => setSelectedStaff(null)} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowLeft size={16} /> Back to Directory
            </button>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Staff Profile Workspace: {selectedStaff.name}</h2>
          </div>

          {/* Profile Overview Card */}
          <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', padding: '24px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: getRoleTheme(selectedStaff.role).bg,
                color: getRoleTheme(selectedStaff.role).text,
                border: `2px solid ${getRoleTheme(selectedStaff.role).border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: '700',
                overflow: 'hidden'
              }}>
                {selectedStaff.photo_path ? (
                  <img 
                    src={`http://127.0.0.1:8000/${selectedStaff.photo_path}`} 
                    alt={selectedStaff.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  selectedStaff.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()
                )}
              </div>
              {['admin', 'partner', 'manager'].includes(user?.role) && (
                <>
                  <label 
                    htmlFor="staff-photo-upload" 
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      backgroundColor: 'var(--color-primary)',
                      color: '#ffffff',
                      width: '22px',
                      height: '22px',
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
                    <Camera size={10} />
                  </label>
                  <input 
                    type="file" 
                    id="staff-photo-upload" 
                    accept="image/*" 
                    onChange={(e) => handlePhotoUpload(e, selectedStaff.id)} 
                    style={{ display: 'none' }} 
                  />
                </>
              )}
            </div>

            <div style={{ flexGrow: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>{selectedStaff.name}</h3>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  color: getRoleTheme(selectedStaff.role).text,
                  backgroundColor: getRoleTheme(selectedStaff.role).bg,
                  border: `1px solid ${getRoleTheme(selectedStaff.role).border}`,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {getRoleTheme(selectedStaff.role).label}
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '600',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: selectedStaff.status === 'active' ? 'var(--color-success-light)' : 'var(--color-danger-light)',
                  color: selectedStaff.status === 'active' ? 'var(--color-success)' : 'var(--color-danger)',
                  border: `1px solid ${selectedStaff.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}`,
                  textTransform: 'capitalize'
                }}>
                  {selectedStaff.status}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                Employee ID: <strong>TF-2026-{selectedStaff.id.toString().padStart(4, '0')}</strong> &bull; {selectedStaff.email}
              </p>
            </div>
          </div>

          {/* Profile Details Workspace Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px', alignItems: 'flex-start' }}>
            
            {/* Sidebar Tabs */}
            <div className="card" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[
                { key: 'profile', label: 'Personal Details', icon: Shield },
                { key: 'progress', label: 'Job Progress', icon: Briefcase },
                { key: 'attendance', label: 'Attendance logs', icon: Calendar },
                { key: 'salary', label: 'Salary Ledger', icon: DollarSign, restricted: !['admin', 'partner', 'manager'].includes(user?.role) },
                { key: 'idcard', label: 'Staff ID Card', icon: Sparkles }
              ].map(tab => {
                const TabIcon = tab.icon;
                if (tab.restricted) return null;
                
                return (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setIsFlipped(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '12px',
                      fontWeight: '600',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      backgroundColor: activeTab === tab.key ? 'var(--color-primary-light)' : 'transparent',
                      color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== tab.key) {
                        e.currentTarget.style.backgroundColor = 'var(--color-bg-base)';
                        e.currentTarget.style.color = 'var(--color-text-main)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== tab.key) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--color-text-muted)';
                      }
                    }}
                  >
                    <TabIcon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sub-tab viewport panels */}
            <div style={{ minWidth: 0 }}>
              
              {/* TAB 1: PERSONAL DETAILS */}
              {activeTab === 'profile' && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>
                    Core Info & Communications
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Email Address</span>
                      <strong style={{ fontSize: '14px' }}>{selectedStaff.email}</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Phone Number</span>
                      <strong style={{ fontSize: '14px' }}>{selectedStaff.phone || 'Not Provided'}</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Role Assignment</span>
                      <strong style={{ fontSize: '14px', textTransform: 'capitalize' }}>{selectedStaff.role}</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Date Joined</span>
                      <strong style={{ fontSize: '14px' }}>
                        {selectedStaff.created_at ? new Date(selectedStaff.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                      </strong>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Administrative/Bio Notes</span>
                    <p style={{ 
                      fontSize: '13px', 
                      backgroundColor: 'var(--color-bg-base)', 
                      padding: '12px', 
                      borderRadius: 'var(--radius-sm)', 
                      margin: 0,
                      color: selectedStaff.extra_notes ? 'var(--color-text-main)' : 'var(--color-text-light)',
                      fontStyle: selectedStaff.extra_notes ? 'normal' : 'italic',
                      lineHeight: '1.5'
                    }}>
                      {selectedStaff.extra_notes || 'No administrative notes configured for this employee.'}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: JOB PROGRESS */}
              {activeTab === 'progress' && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>
                    Work Allocation & Progress Load
                  </h3>

                  {loadingProgress ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                      <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                    </div>
                  ) : !progressStats ? (
                    <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', fontSize: '13px' }}>Could not load worker job statistics.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      
                      {/* Metric Badges */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', textAlign: 'center' }}>
                        <div style={{ backgroundColor: 'var(--color-success-light)', border: '1px solid rgba(34,197,94,0.1)', padding: '16px 8px', borderRadius: 'var(--radius-md)' }}>
                          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', display: 'block', fontWeight: '600', textTransform: 'uppercase' }}>Completed (Last 30 Days)</span>
                          <strong style={{ fontSize: '24px', color: 'var(--color-success)' }}>{progressStats.completed_jobs_last_month}</strong>
                        </div>
                        <div style={{ backgroundColor: 'var(--color-primary-light)', border: '1px solid rgba(37,99,235,0.1)', padding: '16px 8px', borderRadius: 'var(--radius-md)' }}>
                          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', display: 'block', fontWeight: '600', textTransform: 'uppercase' }}>Active Jobs</span>
                          <strong style={{ fontSize: '24px', color: 'var(--color-primary)' }}>{progressStats.active_jobs}</strong>
                        </div>
                        <div style={{ backgroundColor: 'var(--color-warning-light)', border: '1px solid rgba(245,158,11,0.1)', padding: '16px 8px', borderRadius: 'var(--radius-md)' }}>
                          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', display: 'block', fontWeight: '600', textTransform: 'uppercase' }}>Pending Allocation</span>
                          <strong style={{ fontSize: '24px', color: 'var(--color-warning)' }}>{progressStats.pending_jobs}</strong>
                        </div>
                      </div>

                      {/* Recent Allocated Jobs */}
                      <div>
                        <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: 'var(--color-text-main)' }}>Recent Assigned Jobs</h4>
                        {progressStats.recent_jobs.length === 0 ? (
                          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '10px 0' }}>No jobs assigned to this employee yet.</p>
                        ) : (
                          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                              <thead>
                                <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                                  <th style={{ padding: '10px 14px' }}>Job Card #</th>
                                  <th style={{ padding: '10px 14px' }}>PO Reference</th>
                                  <th style={{ padding: '10px 14px' }}>Allocated Qty</th>
                                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {progressStats.recent_jobs.map(job => (
                                  <tr key={job.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '10px 14px', fontWeight: '700', color: 'var(--color-primary)' }}>{job.job_card_number}</td>
                                    <td style={{ padding: '10px 14px' }}>PO #{job.po_number} ({job.item_code})</td>
                                    <td style={{ padding: '10px 14px' }}>{job.quantity} units</td>
                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', textTransform: 'capitalize', color: job.status === 'completed' ? 'var(--color-success)' : 'var(--color-primary)' }}>
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
              )}

              {/* TAB 3: ATTENDANCE CALENDAR */}
              {activeTab === 'attendance' && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Calendar controls */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-primary)' }}>
                      Monthly Attendance Log
                    </h3>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '2px 8px', height: '34px', backgroundColor: 'var(--color-card-bg)' }}>
                      <button onClick={handlePrevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><ChevronLeft size={16} /></button>
                      <span style={{ fontSize: '12px', fontWeight: '600', minWidth: '110px', textAlign: 'center' }}>
                        {getMonthName(attendanceMonth)} {attendanceYear}
                      </span>
                      <button onClick={handleNextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><ChevronRight size={16} /></button>
                    </div>
                  </div>

                  {/* Calendar Grid View */}
                  {loadingAttendance ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '45px 0' }}>
                      <Loader2 size={24} className="animate-spin" />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      
                      {/* Days of Week Header */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)' }}>
                        <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div>
                      </div>

                      {/* Main Calendar Body */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                        {renderAttendanceCalendar()}
                      </div>

                      {/* Map legend */}
                      <div style={{ display: 'flex', gap: '16px', fontSize: '10px', color: 'var(--color-text-muted)', justifyContent: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', paddingTop: '12px', marginTop: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }}></span> Present
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}></span> Late Arrival
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#ffedd5', border: '1px solid #ffedd5' }}></span> Half Day
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}></span> On Leave
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5' }}></span> Absent
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#f1f5f9' }}></span> Weekend
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              )}

              {/* TAB 4: SALARY HISTORY */}
              {activeTab === 'salary' && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-primary)' }}>
                      Wages & Payroll Ledger
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Assigned Base Salary:</span>
                      <strong style={{ color: 'var(--color-primary)', fontSize: '15px' }}>
                        {selectedStaff.salary ? `₹${parseFloat(selectedStaff.salary).toLocaleString('en-IN')}` : 'Not assigned'}
                      </strong>
                    </div>
                  </div>

                  {loadingSalary ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                      <Loader2 size={24} className="animate-spin" />
                    </div>
                  ) : !salaryInfo ? (
                    <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', fontSize: '13px' }}>Could not load salary history records.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      
                      {/* Cash Advances Sub-ledger */}
                      <div>
                        <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: 'var(--color-text-main)' }}>Outstanding & Historical Cash Advances</h4>
                        {salaryInfo.advances.length === 0 ? (
                          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '10px' }}>No cash advances granted to this employee.</p>
                        ) : (
                          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                              <thead>
                                <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                                  <th style={{ padding: '8px 12px' }}>Date</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Advance Amount</th>
                                  <th style={{ padding: '8px 12px' }}>Status</th>
                                  <th style={{ padding: '8px 12px' }}>Remarks</th>
                                </tr>
                              </thead>
                              <tbody>
                                {salaryInfo.advances.map(adv => (
                                  <tr key={adv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '8px 12px' }}>{new Date(adv.date).toLocaleDateString('en-IN')}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>₹{adv.amount}</td>
                                    <td style={{ padding: '8px 12px' }}>
                                      <span style={{ 
                                        fontSize: '9px', fontWeight: 'bold', padding: '1px 6px', borderRadius: '8px',
                                        backgroundColor: adv.status === 'pending' ? '#fef2f2' : (adv.status === 'deducted' ? '#eff6ff' : '#ecfdf5'),
                                        color: adv.status === 'pending' ? '#dc2626' : (adv.status === 'deducted' ? '#2563eb' : '#059669'),
                                        border: `1px solid ${adv.status === 'pending' ? '#fca5a5' : (adv.status === 'deducted' ? '#bfdbfe' : '#a7f3d0')}`
                                      }}>
                                        {adv.status}
                                      </span>
                                    </td>
                                    <td style={{ padding: '8px 12px', color: 'var(--color-text-muted)' }}>{adv.notes || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Processed Payroll Runs */}
                      <div>
                        <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: 'var(--color-text-main)' }}>Historical Payslips</h4>
                        {salaryInfo.payroll_history.length === 0 ? (
                          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '10px' }}>No payroll runs processed for this employee.</p>
                        ) : (
                          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                              <thead>
                                <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                                  <th style={{ padding: '8px 12px' }}>Period</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Gross Salary</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Deductions</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Bonus</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Net Payout</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {salaryInfo.payroll_history.map(item => {
                                  const deductions = parseFloat(item.attendance_deductions) + parseFloat(item.pf_deductions) + parseFloat(item.pt_deductions) + parseFloat(item.advance_deductions);
                                  return (
                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                      <td style={{ padding: '8px 12px', fontWeight: '700' }}>
                                        {getMonthName(item.month)} {item.year}
                                      </td>
                                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{item.gross_salary}</td>
                                      <td style={{ padding: '8px 12px', textAlign: 'right', color: '#dc2626' }}>-₹{deductions.toFixed(2)}</td>
                                      <td style={{ padding: '8px 12px', textAlign: 'right', color: '#059669' }}>+₹{item.bonus}</td>
                                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--color-primary)' }}>₹{item.net_salary}</td>
                                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                        <span style={{ 
                                          fontSize: '9px', fontWeight: 'bold', padding: '1px 6px', borderRadius: '8px',
                                          backgroundColor: item.payment_status === 'paid' ? '#ecfdf5' : '#fef2f2',
                                          color: item.payment_status === 'paid' ? '#059669' : '#dc2626',
                                          border: `1px solid ${item.payment_status === 'paid' ? '#a7f3d0' : '#fca5a5'}`
                                        }}>
                                          {item.payment_status}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                </div>
              )}

              {/* TAB 5: ID CARD GENERATOR */}
              {activeTab === 'idcard' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                  
                  {/* Card Badge Print viewport */}
                  <div className="card idcard-viewport" id="printable-card-badge">
                    <div className={`idcard-flipper ${isFlipped ? 'is-flipped' : ''}`}>
                      {renderIDCardFront(selectedStaff)}
                      {renderIDCardBack(selectedStaff)}
                    </div>
                  </div>

                  {/* Off-screen Capture Targets (Flat rendering for PDF generation) */}
                  <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                    <div id="capture-card-front" style={{ width: '320px', height: '510px', position: 'relative' }}>
                      {renderIDCardFront(selectedStaff, true)}
                    </div>
                    <div id="capture-card-back" style={{ width: '320px', height: '510px', position: 'relative' }}>
                      {renderIDCardBack(selectedStaff, true)}
                    </div>
                  </div>

                  {/* ID Control Actions */}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '10px' }}>
                    <button 
                      onClick={() => setIsFlipped(!isFlipped)} 
                      className="logout-btn" 
                      style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                    >
                      <RefreshCw size={14} className={isFlipped ? 'animate-spin' : ''} />
                      Flip Card (3D Rotate)
                    </button>
                    <button 
                      onClick={handlePrintIDCard} 
                      className="logout-btn" 
                      style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-main)', borderColor: 'var(--color-border)' }}
                    >
                      <Printer size={14} />
                      Print ID Card
                    </button>
                    <button 
                      onClick={() => setShowDownloadModal(true)} 
                      className="form-button" 
                      style={{ width: 'auto', marginTop: 0, height: '36px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-primary)', fontSize: '13px' }}
                    >
                      <FileText size={14} />
                      Download PDF
                    </button>
                  </div>

                  {/* Sizing Warning & PDF Preview Modal */}
                  {showDownloadModal && createPortal(
                    <div style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      backdropFilter: 'blur(4px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px',
                      zIndex: 9999,
                    }}>
                      <div style={{
                        width: '100%',
                        maxWidth: '440px',
                        backgroundColor: 'var(--color-card-bg)',
                        border: '1px solid var(--color-border)',
                        padding: '24px',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-xl)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                      }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-main)' }}>
                          <FileText size={18} style={{ color: 'var(--color-primary)' }} />
                          Download Staff ID Card PDF
                        </h3>
                        
                        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
                          The ID card will be downloaded in standard physical dimensions for card printers.
                        </p>

                        {/* Dimension Warning Banner */}
                        <div style={{
                          backgroundColor: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          <strong style={{ fontSize: '12px', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Physical Scale Alert
                          </strong>
                          <p style={{ fontSize: '12px', color: '#1e3a8a', margin: 0, lineHeight: '1.4' }}>
                            This is the size of an ID Card (<strong>54mm x 86mm</strong>) so we can attach the Card accordingly.
                          </p>
                        </div>

                        {/* Visual Dimension Diagram */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          padding: '20px 0',
                          backgroundColor: 'var(--color-bg-base)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px dashed var(--color-border)'
                        }}>
                          <div style={{
                            width: '110px',
                            height: '175px',
                            border: '2px solid var(--color-primary)',
                            borderRadius: '8px',
                            backgroundColor: '#ffffff',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            color: 'var(--color-text-muted)',
                            fontSize: '11px',
                            fontWeight: '600',
                            boxShadow: 'var(--shadow-md)'
                          }}>
                            <div style={{ position: 'absolute', top: '-18px', width: '100%', borderBottom: '1px dashed #94a3b8', textAlign: 'center', fontSize: '9px' }}>
                              54 mm
                            </div>
                            <div style={{ position: 'absolute', left: '-36px', height: '100%', display: 'flex', alignItems: 'center', fontSize: '9px' }}>
                              <span style={{ transform: 'rotate(-90deg)', whiteSpace: 'nowrap' }}>86 mm</span>
                            </div>
                            <span style={{ color: 'var(--color-primary)' }}>ID Card Layout</span>
                            <span style={{ fontSize: '9px', opacity: 0.8, marginTop: '4px' }}>Standard CR80 Scale</span>
                          </div>
                        </div>

                        {/* Selection Options */}
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label className="form-label" style={{ fontSize: '12px', fontWeight: '600' }}>Select Layout for Export:</label>
                          <CustomSelect 
                            value={pdfExportType} 
                            onChange={(val) => setPdfExportType(val)}
                            options={[
                              { value: 'combined', label: 'Combined (2-Page PDF)' },
                              { value: 'front', label: 'Front Profile Only' },
                              { value: 'back', label: 'Back Details Only' }
                            ]}
                          />
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '4px' }}>
                          <button 
                            className="logout-btn" 
                            onClick={() => setShowDownloadModal(false)}
                            style={{ height: '36px', padding: '0 16px' }}
                          >
                            Cancel
                          </button>
                          <button 
                            className="form-button"
                            onClick={handlePDFGeneration}
                            style={{ width: 'auto', marginTop: 0, height: '36px', padding: '0 20px', backgroundColor: 'var(--color-primary)' }}
                          >
                            Confirm Download
                          </button>
                        </div>
                      </div>
                    </div>,
                    document.body
                  )}

                </div>
              )}

            </div>
          </div>

        </div>
      )}

    </div>
  );
}
