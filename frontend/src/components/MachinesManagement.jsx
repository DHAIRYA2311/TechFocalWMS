import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import axios from 'axios';
import CustomSelect from './CustomSelect';
import { useRealTime } from '../hooks/useRealTime';
import {
  Cpu,
  Wrench,
  User,
  Plus,
  Play,
  CheckCircle,
  AlertCircle,
  Clock,
  History,
  DollarSign,
  ChevronRight,
  Loader2,
  X,
  FileText,
  AlertTriangle,
  Info,
  Edit3,
  Briefcase,
  Eye,
  StopCircle,
  PlayCircle,
  Trash2,
  MoreVertical,
  Activity,
  Settings,
  ZapOff,
  Zap,
  Power,
  Archive,
  ChevronDown,
  Search,
  LayoutGrid,
  List,
  Gauge,
  TrendingUp,
  UserCheck,
  BarChart2,
} from 'lucide-react';

const API = 'http://127.0.0.1:8000/api';
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('auth_token')}` });

export default function MachinesManagement({ user }) {
  const location = useLocation();
  useRealTime('machines', () => fetchData());

  const [machines, setMachines] = useState([]);
  const [stats, setStats] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Modal States
  const [activeModal, setActiveModal] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(null);

  // Drawer State
  const [viewingMachineDetails, setViewingMachineDetails] = useState(null);
  const [machineLogs, setMachineLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Dropdown action menu open state
  const [openMenuId, setOpenMenuId] = useState(null);

  // Form States (Add / Edit)
  const [machineCode, setMachineCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('Milling');
  const [defaultOperatorId, setDefaultOperatorId] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [status, setStatus] = useState('idle');
  const [submittingForm, setSubmittingForm] = useState(false);

  // Form States (Log Maintenance)
  const [logType, setLogType] = useState('maintenance');
  const [logDescription, setLogDescription] = useState('');
  const [logCost, setLogCost] = useState('');
  const [submittingLog, setSubmittingLog] = useState(false);

  // Form States (Assign Job)
  const [assignJobId, setAssignJobId] = useState('');
  const [assignWorkerId, setAssignWorkerId] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm, danger }

  const isManagerOrAbove = user && ['admin', 'partner', 'manager'].includes(user.role);

  const fetchData = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [machinesRes, statsRes] = await Promise.all([
        axios.get(`${API}/machines`, { headers: authHeader() }),
        axios.get(`${API}/machines/stats`, { headers: authHeader() }),
      ]);
      setMachines(machinesRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to load machines.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const res = await axios.get(`${API}/workers`, { headers: authHeader() });
      setWorkers(res.data.map(w => ({ value: w.id, label: w.name })));
    } catch (err) { console.error(err); }
  };

  const fetchJobs = async () => {
    try {
      const res = await axios.get(`${API}/jobs?status=pending,in_progress`, { headers: authHeader() });
      const jobList = Array.isArray(res.data) ? res.data : (res.data.data || []);
      setJobs(jobList.map(j => ({ value: j.id, label: `${j.job_card_number} — ${j.customer || 'N/A'}` })));
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchData();
    if (isManagerOrAbove) {
      fetchWorkers();
      fetchJobs();
    }
  }, []);

  useEffect(() => {
    if (location.state?.viewMachineId && machines.length > 0) {
      const machine = machines.find(m => m.id === location.state.viewMachineId);
      if (machine) {
        handleOpenDetails(machine);
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, machines]);

  // Close action menu on outside click
  useEffect(() => {
    const handle = () => setOpenMenuId(null);
    document.addEventListener('click', handle);
    return () => document.removeEventListener('click', handle);
  }, []);

  const fetchMachineLogs = async (id) => {
    setLoadingLogs(true);
    try {
      const res = await axios.get(`${API}/machines/${id}`, { headers: authHeader() });
      setMachineLogs(res.data.logs || []);
    } catch (err) { console.error(err); }
    finally { setLoadingLogs(false); }
  };

  const handleOpenDetails = (machine) => {
    setViewingMachineDetails(machine);
    fetchMachineLogs(machine.id);
  };

  // ──────────── MODAL OPENERS ────────────

  const openAddModal = () => {
    setMachineCode(''); setName(''); setType('Milling');
    setDefaultOperatorId(''); setHourlyRate(''); setSpecifications(''); setStatus('idle');
    setActiveModal('add');
  };

  const openEditModal = (machine, e) => {
    e?.stopPropagation();
    setSelectedMachine(machine);
    setMachineCode(machine.machine_code); setName(machine.name); setType(machine.type);
    setDefaultOperatorId(machine.default_operator_id || ''); setHourlyRate(machine.hourly_rate || '');
    setSpecifications(machine.specifications || ''); setStatus(machine.status);
    setActiveModal('edit');
  };

  const openMaintenanceModal = (machine, e) => {
    e?.stopPropagation();
    setSelectedMachine(machine);
    setLogType('maintenance'); setLogDescription(''); setLogCost('');
    setActiveModal('maintenance');
  };

  const openAssignJobModal = (machine, e) => {
    e?.stopPropagation();
    setSelectedMachine(machine);
    setAssignJobId(''); setAssignWorkerId(machine.default_operator_id || '');
    setActiveModal('assignJob');
  };

  const openViewRunningJobModal = (machine, e) => {
    e?.stopPropagation();
    setSelectedMachine(machine);
    setActiveModal('viewRunningJob');
  };

  // ──────────── STOP / START / RETIRE ────────────

  const handleStopOperations = (machine, e) => {
    e?.stopPropagation();
    setConfirmModal({
      title: '⛔ Stop Operations',
      message: `Stopping operations on "${machine.name}" will mark it as Under Maintenance and it will be unavailable for new job assignments. Any ongoing jobs should be reassigned manually. Proceed?`,
      danger: true,
      onConfirm: async () => {
        try {
          const payload = { log_type: 'breakdown', description: 'Operations stopped manually by manager.', cost: null };
          const res = await axios.post(`${API}/machines/${machine.id}/maintenance`, payload, { headers: authHeader() });
          setFeedback({ type: 'success', message: `${machine.name} has been stopped.` });
          fetchData();
          if (viewingMachineDetails?.id === machine.id) {
            setViewingMachineDetails(p => ({ ...p, status: res.data.machine_status }));
            fetchMachineLogs(machine.id);
          }
        } catch (err) {
          setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to stop machine.' });
        }
      }
    });
  };

  const handleStartOperations = (machine, e) => {
    e?.stopPropagation();
    setConfirmModal({
      title: '▶ Resume Operations',
      message: `This will set "${machine.name}" back to Idle / Available, resuming operations from where they were stopped. Proceed?`,
      danger: false,
      onConfirm: async () => {
        try {
          const payload = { log_type: 'status_override', description: 'Operations resumed by manager.', cost: null };
          const res = await axios.post(`${API}/machines/${machine.id}/maintenance`, payload, { headers: authHeader() });
          setFeedback({ type: 'success', message: `${machine.name} is now back online.` });
          fetchData();
          if (viewingMachineDetails?.id === machine.id) {
            setViewingMachineDetails(p => ({ ...p, status: res.data.machine_status }));
            fetchMachineLogs(machine.id);
          }
        } catch (err) {
          setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to resume machine.' });
        }
      }
    });
  };

  const handleRetire = (machine, e) => {
    e?.stopPropagation();
    setConfirmModal({
      title: '🗑 Retire / Delete Machine',
      message: `Are you sure you want to permanently retire and delete "${machine.name}" (${machine.machine_code}) from the registry? This action cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        try {
          await axios.delete(`${API}/machines/${machine.id}`, { headers: authHeader() });
          setFeedback({ type: 'success', message: `${machine.name} has been retired and removed.` });
          if (viewingMachineDetails?.id === machine.id) setViewingMachineDetails(null);
          fetchData();
        } catch (err) {
          setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to retire machine.' });
        }
      }
    });
  };

  // ──────────── FORM HANDLERS ────────────

  const handleSubmitMachineForm = async (e) => {
    e.preventDefault();
    setSubmittingForm(true); setFeedback(null);
    try {
      const payload = { machine_code: machineCode, name, type, default_operator_id: defaultOperatorId || null, hourly_rate: hourlyRate || null, specifications, status };
      let res;
      if (activeModal === 'add') {
        res = await axios.post(`${API}/machines`, payload, { headers: authHeader() });
      } else {
        res = await axios.put(`${API}/machines/${selectedMachine.id}`, payload, { headers: authHeader() });
      }
      setFeedback({ type: 'success', message: res.data.message });
      setActiveModal(null);
      fetchData();
      if (viewingMachineDetails?.id === selectedMachine?.id) {
        setViewingMachineDetails(prev => ({ ...prev, ...res.data.machine }));
      }
    } catch (err) {
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to save machine.' });
    } finally { setSubmittingForm(false); }
  };

  const handleSubmitMaintenance = async (e) => {
    e.preventDefault();
    setSubmittingLog(true); setFeedback(null);
    try {
      const payload = { log_type: logType, description: logDescription, cost: logCost || null };
      const res = await axios.post(`${API}/machines/${selectedMachine.id}/maintenance`, payload, { headers: authHeader() });
      setFeedback({ type: 'success', message: res.data.message });
      setActiveModal(null);
      fetchData();
      if (viewingMachineDetails?.id === selectedMachine.id) {
        setViewingMachineDetails(p => ({ ...p, status: res.data.machine_status }));
        fetchMachineLogs(selectedMachine.id);
      }
    } catch (err) {
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to save log.' });
    } finally { setSubmittingLog(false); }
  };

  const handleSubmitAssignJob = async (e) => {
    e.preventDefault();
    setSubmittingAssign(true); setFeedback(null);
    try {
      const payload = { machine_id: selectedMachine.id, worker_id: assignWorkerId || null };
      const res = await axios.put(`${API}/jobs/${assignJobId}/assign`, payload, { headers: authHeader() });
      setFeedback({ type: 'success', message: res.data.message || 'Job assigned to machine.' });
      setActiveModal(null);
      fetchData();
    } catch (err) {
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to assign job.' });
    } finally { setSubmittingAssign(false); }
  };

  // ──────────── HELPERS ────────────

  const getStatusConfig = (s) => {
    switch (s) {
      case 'idle': return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', label: 'Idle / Available', dot: '#059669', gradientFrom: '#ecfdf5', gradientTo: '#f0fdf4' };
      case 'busy': return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', label: 'Running (Busy)', dot: '#2563eb', gradientFrom: '#eff6ff', gradientTo: '#f0f9ff' };
      case 'maintenance': return { bg: '#fffbeb', text: '#d97706', border: '#fde68a', label: 'Under Maintenance', dot: '#d97706', gradientFrom: '#fffbeb', gradientTo: '#fefce8' };
      case 'inactive': return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', label: 'Inactive', dot: '#94a3b8', gradientFrom: '#f1f5f9', gradientTo: '#f8fafc' };
      default: return { bg: '#f8fafc', text: '#64748b', border: '#cbd5e1', label: s, dot: '#94a3b8', gradientFrom: '#f8fafc', gradientTo: '#f8fafc' };
    }
  };

  const getTypeIcon = (t) => {
    const icons = { Milling: '⚙️', Lathe: '🔩', Drilling: '🔧', Grinding: '⚡', Bending: '🔨', 'Laser Cutting': '⚡', Other: '🔌' };
    return icons[t] || '🔌';
  };

  const filteredMachines = machines.filter(m => {
    const matchesSearch = !searchTerm || m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.machine_code.toLowerCase().includes(searchTerm.toLowerCase()) || m.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // ──────────── RENDER ────────────

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Workshop Machine Registry
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
            Monitor, control, and manage all shop floor machines in real‑time.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', height: '36px' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{ padding: '0 12px', border: 'none', cursor: 'pointer', background: viewMode === 'grid' ? 'var(--color-primary)' : 'var(--color-card-bg)', color: viewMode === 'grid' ? '#fff' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' }}
            >
              <LayoutGrid size={14} /> Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{ padding: '0 12px', border: 'none', borderLeft: '1px solid var(--color-border)', cursor: 'pointer', background: viewMode === 'list' ? 'var(--color-primary)' : 'var(--color-card-bg)', color: viewMode === 'list' ? '#fff' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' }}
            >
              <List size={14} /> List
            </button>
          </div>

          {isManagerOrAbove && (
            <button
              onClick={openAddModal}
              className="form-button"
              style={{ width: 'auto', marginTop: 0, height: '36px', padding: '0 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-primary)', fontWeight: '600', borderRadius: '8px' }}
            >
              <Plus size={16} /> Register Machine
            </button>
          )}
        </div>
      </div>

      {/* ── Feedback ── */}
      {feedback && (
        <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: 0, borderRadius: '8px' }}>
          {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.7 }}><X size={14} /></button>
        </div>
      )}

      {/* ── Stats Cards ── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
          {[
            { label: 'TOTAL MACHINES', value: stats.total, icon: <Cpu size={16} /> },
            { label: 'IDLE / AVAILABLE', value: stats.idle, icon: <CheckCircle size={16} /> },
            { label: 'RUNNING (BUSY)', value: stats.busy, icon: <Play size={16} /> },
            { label: 'UNDER MAINTENANCE', value: stats.maintenance, icon: <Wrench size={16} /> },
            { label: 'SHOP UTILIZATION', value: `${stats.utilization_rate}%`, icon: <Gauge size={16} /> },
          ].map((stat, i) => (
            <div key={i} className="card" style={{ padding: '16px', backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-muted)' }}>{stat.label}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>{stat.icon}</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-main)' }}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Search / Filter Bar ── */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flexGrow: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            className="form-input"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search machines by name, code or type…"
            style={{ height: '36px', paddingLeft: '32px', fontSize: '13px', borderRadius: '8px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['all', 'idle', 'busy', 'maintenance', 'inactive'].map(s => {
            const sc = s === 'all' ? { text: 'var(--color-text-muted)', bg: 'var(--color-bg-base)', border: 'var(--color-border)' } : getStatusConfig(s);
            const active = filterStatus === s;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{ padding: '4px 12px', height: '32px', borderRadius: '20px', border: `1px solid ${active ? sc.border : 'var(--color-border)'}`, background: active ? sc.bg : 'var(--color-card-bg)', color: active ? sc.text : 'var(--color-text-muted)', fontSize: '11px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize' }}
              >
                {s === 'all' ? 'All' : getStatusConfig(s).label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

        {/* Machine Cards / List */}
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          {loading && machines.length === 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr', gap: '16px' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card animate-pulse" style={{ height: '220px', borderRadius: '14px', border: '1px solid var(--color-border)' }} />
              ))}
            </div>
          ) : filteredMachines.length === 0 ? (
            <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', borderRadius: '14px' }}>
              <Cpu size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ fontWeight: '600', marginBottom: '4px' }}>No machines found</p>
              <p style={{ fontSize: '13px' }}>Try adjusting your search or filter.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {filteredMachines.map(machine => <MachineCard key={machine.id} machine={machine} isManagerOrAbove={isManagerOrAbove} getStatusConfig={getStatusConfig} getTypeIcon={getTypeIcon} isSelected={viewingMachineDetails?.id === machine.id} onSelect={() => handleOpenDetails(machine)} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} onEdit={openEditModal} onMaintenance={openMaintenanceModal} onAssignJob={openAssignJobModal} onViewRunningJob={openViewRunningJobModal} onStop={handleStopOperations} onStart={handleStartOperations} onRetire={handleRetire} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredMachines.map(machine => <MachineRow key={machine.id} machine={machine} isManagerOrAbove={isManagerOrAbove} getStatusConfig={getStatusConfig} getTypeIcon={getTypeIcon} isSelected={viewingMachineDetails?.id === machine.id} onSelect={() => handleOpenDetails(machine)} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} onEdit={openEditModal} onMaintenance={openMaintenanceModal} onAssignJob={openAssignJobModal} onViewRunningJob={openViewRunningJobModal} onStop={handleStopOperations} onStart={handleStartOperations} onRetire={handleRetire} />)}
            </div>
          )}
        </div>

        {/* Detail Drawer */}
        {viewingMachineDetails && (
          <MachineDetailDrawer
            machine={viewingMachineDetails}
            machineLogs={machineLogs}
            loadingLogs={loadingLogs}
            isManagerOrAbove={isManagerOrAbove}
            getStatusConfig={getStatusConfig}
            onClose={() => setViewingMachineDetails(null)}
            onEdit={openEditModal}
            onMaintenance={openMaintenanceModal}
            onAssignJob={openAssignJobModal}
            onStop={handleStopOperations}
            onStart={handleStartOperations}
          />
        )}
      </div>

      {/* ══════════ MODALS ══════════ */}

      {/* Add / Edit Machine */}
      {['add', 'edit'].includes(activeModal) && createPortal(
        <ModalBackdrop onClose={() => setActiveModal(null)}>
          <div style={{ width: '100%', maxWidth: '520px' }}>
            <ModalHeader title={activeModal === 'add' ? 'Register New Machine' : `Edit — ${selectedMachine?.name}`} onClose={() => setActiveModal(null)} />
            <form onSubmit={handleSubmitMachineForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <FormField label="Machine Code *">
                  <input type="text" className="form-input" value={machineCode} onChange={e => setMachineCode(e.target.value)} placeholder="e.g. CNC-01" required style={inputSt} />
                </FormField>
                <FormField label="Machine Type *">
                  <CustomSelect value={type} onChange={setType} options={['Milling', 'Lathe', 'Drilling', 'Grinding', 'Bending', 'Laser Cutting', 'Other'].map(v => ({ value: v, label: v }))} style={{ height: '36px' }} />
                </FormField>
              </div>
              <FormField label="Machine Name *">
                <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. CNC Vertical Milling VMC-850" required style={inputSt} />
              </FormField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <FormField label="Default Operator">
                  <CustomSelect value={defaultOperatorId} onChange={setDefaultOperatorId} options={workers} placeholder="Select operator…" style={{ height: '36px' }} />
                </FormField>
                <FormField label="Hourly Rate (₹)">
                  <input type="number" className="form-input" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="e.g. 500" style={inputSt} />
                </FormField>
              </div>
              {activeModal === 'edit' && (
                <FormField label="Status">
                  <CustomSelect value={status} onChange={setStatus} options={[{ value: 'idle', label: 'Idle / Available' }, { value: 'busy', label: 'Running (Busy)' }, { value: 'maintenance', label: 'Under Maintenance' }, { value: 'inactive', label: 'Inactive' }]} style={{ height: '36px' }} />
                </FormField>
              )}
              <FormField label="Technical Specifications">
                <textarea className="form-input" rows="3" value={specifications} onChange={e => setSpecifications(e.target.value)} placeholder="Table size, spindle dimensions, power ratings…" style={{ ...inputSt, height: '80px', resize: 'vertical', padding: '10px' }} />
              </FormField>
              <ModalFooter onCancel={() => setActiveModal(null)} submitting={submittingForm} submitLabel={activeModal === 'add' ? 'Register Machine' : 'Save Changes'} />
            </form>
          </div>
        </ModalBackdrop>,
        document.body
      )}

      {/* Log Maintenance / Issue */}
      {activeModal === 'maintenance' && createPortal(
        <ModalBackdrop onClose={() => setActiveModal(null)}>
          <div style={{ width: '100%', maxWidth: '480px' }}>
            <ModalHeader title="Log Machine Event" subtitle={`${selectedMachine?.machine_code} — ${selectedMachine?.name}`} onClose={() => setActiveModal(null)} icon={<Wrench size={16} color="#d97706" />} iconBg="#fffbeb" />
            <form onSubmit={handleSubmitMaintenance} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
              <FormField label="Event Type *">
                <CustomSelect value={logType} onChange={setLogType} options={[
                  { value: 'maintenance', label: '🔧 Routine Maintenance / Service' },
                  { value: 'breakdown', label: '🚨 Machine Breakdown / Repair' },
                  { value: 'tooling_change', label: '⚙️ Tooling / Die Adjustments' },
                  { value: 'status_override', label: '✅ Release / Set Back to Idle' },
                ]} style={{ height: '36px' }} />
              </FormField>
              {logType !== 'status_override' && (
                <FormField label="Maintenance / Technician Cost (₹)">
                  <input type="number" className="form-input" value={logCost} onChange={e => setLogCost(e.target.value)} placeholder="Optional" style={inputSt} />
                </FormField>
              )}
              <FormField label="Description / Remarks *">
                <textarea className="form-input" rows="3" value={logDescription} onChange={e => setLogDescription(e.target.value)} placeholder="Describe the issue, replaced parts or reason…" required style={{ ...inputSt, height: '80px', resize: 'vertical', padding: '10px' }} />
              </FormField>
              {['maintenance', 'breakdown'].includes(logType) && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px', display: 'flex', gap: '8px', fontSize: '12px', color: '#92400e' }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>This will automatically set the machine to <strong>Under Maintenance</strong> and remove it from job allocation.</span>
                </div>
              )}
              <ModalFooter onCancel={() => setActiveModal(null)} submitting={submittingLog} submitLabel="Submit Log" submitColor="#d97706" />
            </form>
          </div>
        </ModalBackdrop>,
        document.body
      )}

      {/* Assign Job */}
      {activeModal === 'assignJob' && createPortal(
        <ModalBackdrop onClose={() => setActiveModal(null)}>
          <div style={{ width: '100%', maxWidth: '480px' }}>
            <ModalHeader title="Assign Job to Machine" subtitle={`${selectedMachine?.machine_code} — ${selectedMachine?.name}`} onClose={() => setActiveModal(null)} icon={<Briefcase size={16} color="#2563eb" />} iconBg="#eff6ff" />
            <form onSubmit={handleSubmitAssignJob} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
              <FormField label="Select Job Card *">
                <CustomSelect value={assignJobId} onChange={setAssignJobId} options={jobs} placeholder="Choose job to assign…" style={{ height: '36px' }} />
              </FormField>
              <FormField label="Operator / Worker">
                <CustomSelect value={assignWorkerId} onChange={setAssignWorkerId} options={workers} placeholder="Select worker…" style={{ height: '36px' }} />
              </FormField>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px', display: 'flex', gap: '8px', fontSize: '12px', color: '#1e40af' }}>
                <Info size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>Assigning a job will mark this machine as <strong>Running (Busy)</strong> until the job is completed or unassigned.</span>
              </div>
              <ModalFooter onCancel={() => setActiveModal(null)} submitting={submittingAssign} submitLabel="Assign Job" submitColor="#2563eb" />
            </form>
          </div>
        </ModalBackdrop>,
        document.body
      )}

      {/* View Running Job */}
      {activeModal === 'viewRunningJob' && createPortal(
        <ModalBackdrop onClose={() => setActiveModal(null)}>
          <div style={{ width: '100%', maxWidth: '500px' }}>
            <ModalHeader title="Running Job Details" subtitle={`${selectedMachine?.machine_code} — ${selectedMachine?.name}`} onClose={() => setActiveModal(null)} icon={<Activity size={16} color="#2563eb" />} iconBg="#eff6ff" />
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {selectedMachine?.active_jobs && selectedMachine.active_jobs.length > 0 ? (
                selectedMachine.active_jobs.map((job, i) => (
                  <div key={i} style={{ border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(135deg, #eff6ff, #f0f9ff)', padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', fontSize: '14px', color: '#2563eb' }}>{job.job_card_number}</span>
                      <span style={{ fontSize: '10px', fontWeight: '700', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '20px' }}>ACTIVE</span>
                    </div>
                    <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {[['CUSTOMER', job.customer || '—'], ['OPERATOR', job.worker_name || '—'], ['PART / PRODUCT', job.part_name || '—'], ['OPERATION', job.operation || '—'], ['START DATE', job.started_at ? new Date(job.started_at).toLocaleDateString() : '—'], ['DUE DATE', job.due_date ? new Date(job.due_date).toLocaleDateString() : '—']].map(([label, val]) => (
                        <div key={label}>
                          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>{label}</span>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-main)' }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                  <Activity size={36} style={{ opacity: 0.3, marginBottom: '10px' }} />
                  <p style={{ fontWeight: '600' }}>No running jobs</p>
                  <p style={{ fontSize: '13px', marginTop: '4px' }}>This machine currently has no active job assignments.</p>
                </div>
              )}
            </div>
            <div style={{ padding: '0 20px 20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setActiveModal(null)} className="logout-btn" style={{ padding: '8px 20px', fontSize: '13px' }}>Close</button>
            </div>
          </div>
        </ModalBackdrop>,
        document.body
      )}

      {/* Confirm Modal */}
      {confirmModal && createPortal(
        <ModalBackdrop onClose={() => setConfirmModal(null)}>
          <div style={{ width: '100%', maxWidth: '420px' }}>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: confirmModal.danger ? 'var(--color-danger)' : 'var(--color-text-main)' }}>{confirmModal.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>{confirmModal.message}</p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                <button onClick={() => setConfirmModal(null)} className="logout-btn" style={{ padding: '8px 18px', fontSize: '13px' }}>Cancel</button>
                <button
                  onClick={async () => { await confirmModal.onConfirm(); setConfirmModal(null); }}
                  className="form-button"
                  style={{ width: 'auto', marginTop: 0, height: '38px', padding: '0 20px', fontSize: '13px', backgroundColor: confirmModal.danger ? 'var(--color-danger)' : 'var(--color-primary)' }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </ModalBackdrop>,
        document.body
      )}

    </div>
  );
}

// ══════════════════════════════════════════════════
// Sub-Components
// ══════════════════════════════════════════════════

function MachineCard({ machine, isManagerOrAbove, getStatusConfig, getTypeIcon, isSelected, onSelect, openMenuId, setOpenMenuId, onEdit, onMaintenance, onAssignJob, onViewRunningJob, onStop, onStart, onRetire }) {
  const sc = getStatusConfig(machine.status);
  const isMenuOpen = openMenuId === machine.id;

  return (
    <div
      onClick={onSelect}
      style={{
        cursor: 'pointer',
        borderRadius: '8px',
        border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
        backgroundColor: 'var(--color-card-bg)',
        boxShadow: isSelected ? 'var(--shadow-md)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = 'var(--color-text-light)'; } }}
      onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = 'var(--color-border)'; } }}
    >
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', flexGrow: 1 }}>
        {/* Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: sc.bg, border: `1px solid ${sc.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
              {getTypeIcon(machine.type)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-main)' }}>{machine.machine_code}</span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{machine.type}</span>
              </div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginTop: '2px', color: 'var(--color-text-main)' }}>{machine.name}</h4>
            </div>
          </div>

          {/* Action menu button */}
          {isManagerOrAbove && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={e => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : machine.id); }}
                style={{ width: '30px', height: '30px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-base)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', flexShrink: 0 }}
              >
                <MoreVertical size={14} />
              </button>
              {isMenuOpen && (
                <ActionMenu machine={machine} onEdit={onEdit} onMaintenance={onMaintenance} onAssignJob={onAssignJob} onViewRunningJob={onViewRunningJob} onStop={onStop} onStart={onStart} onRetire={onRetire} />
              )}
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: sc.dot, display: 'inline-block', boxShadow: machine.status === 'busy' ? `0 0 0 3px ${sc.bg}` : 'none' }} />
          <span style={{ fontSize: '11px', fontWeight: '700', color: sc.text, background: sc.bg, border: `1px solid ${sc.border}`, padding: '2px 8px', borderRadius: '20px' }}>{sc.label}</span>
        </div>

        {/* Body info */}
        <div style={{ background: 'var(--color-bg-base)', borderRadius: '8px', padding: '12px', fontSize: '12px', flexGrow: 1 }}>
          {machine.status === 'busy' && machine.active_jobs?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <InfoRow label="RUNNING JOB" value={machine.active_jobs[0].job_card_number} valueColor="var(--color-primary)" bold />
              <InfoRow label="OPERATOR" value={machine.active_jobs[0].worker_name} />
              <InfoRow label="CUSTOMER" value={machine.active_jobs[0].customer} />
            </div>
          ) : machine.status === 'maintenance' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d97706', fontWeight: '600' }}>
              <AlertTriangle size={14} /> Currently down for maintenance
            </div>
          ) : machine.status === 'inactive' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontWeight: '500' }}>
              <Power size={14} /> Machine is retired / inactive
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <InfoRow label="DEFAULT OPERATOR" value={machine.default_operator?.name || 'Not assigned'} />
              {machine.hourly_rate && <InfoRow label="HOURLY RATE" value={`₹${machine.hourly_rate}/hr`} />}
            </div>
          )}
        </div>

        {/* Quick action buttons */}
        {isManagerOrAbove && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <QuickAction label="Edit" icon={<Edit3 size={11} />} onClick={e => onEdit(machine, e)} />
            {machine.status !== 'busy' && machine.status !== 'maintenance' && (
              <QuickAction label="Assign Job" icon={<Briefcase size={11} />} onClick={e => onAssignJob(machine, e)} color="#2563eb" />
            )}
            {machine.status === 'busy' && (
              <QuickAction label="View Job" icon={<Eye size={11} />} onClick={e => onViewRunningJob(machine, e)} color="#059669" />
            )}
            {(machine.status === 'idle' || machine.status === 'busy') && (
              <QuickAction label="Stop" icon={<StopCircle size={11} />} onClick={e => onStop(machine, e)} color="#dc2626" />
            )}
            {machine.status === 'maintenance' && (
              <QuickAction label="Resume" icon={<PlayCircle size={11} />} onClick={e => onStart(machine, e)} color="#059669" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MachineRow({ machine, isManagerOrAbove, getStatusConfig, getTypeIcon, isSelected, onSelect, openMenuId, setOpenMenuId, onEdit, onMaintenance, onAssignJob, onViewRunningJob, onStop, onStart, onRetire }) {
  const sc = getStatusConfig(machine.status);
  const isMenuOpen = openMenuId === `row-${machine.id}`;

  return (
    <div
      onClick={onSelect}
      style={{ cursor: 'pointer', borderRadius: '10px', border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', background: isSelected ? '#f0f7ff' : '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '16px', transition: 'all 0.15s ease' }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--color-bg-base)'; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '#fff'; }}
    >
      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: sc.bg, border: `1px solid ${sc.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{getTypeIcon(machine.type)}</div>
      <div style={{ minWidth: '80px', flexShrink: 0 }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', padding: '1px 6px', borderRadius: '4px', display: 'inline-block' }}>{machine.machine_code}</div>
        <div style={{ fontSize: '8px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{machine.type}</div>
      </div>
      <div style={{ flexGrow: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{machine.name}</div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          {machine.status === 'busy' && machine.active_jobs?.length > 0 ? `Job: ${machine.active_jobs[0].job_card_number} • ${machine.active_jobs[0].worker_name}` : machine.default_operator?.name || 'No operator assigned'}
        </div>
      </div>
      <span style={{ fontSize: '10px', fontWeight: '700', color: sc.text, background: sc.bg, border: `1px solid ${sc.border}`, padding: '3px 10px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 }}>{sc.label}</span>
      {machine.hourly_rate && <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>₹{machine.hourly_rate}/hr</span>}

      {isManagerOrAbove && (
        <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button onClick={e => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : `row-${machine.id}`); }} style={{ width: '30px', height: '30px', border: '1px solid var(--color-border)', borderRadius: '6px', background: 'var(--color-bg-base)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
            <MoreVertical size={13} />
          </button>
          {isMenuOpen && <ActionMenu machine={machine} onEdit={onEdit} onMaintenance={onMaintenance} onAssignJob={onAssignJob} onViewRunningJob={onViewRunningJob} onStop={onStop} onStart={onStart} onRetire={onRetire} />}
        </div>
      )}
    </div>
  );
}

function ActionMenu({ machine, onEdit, onMaintenance, onAssignJob, onViewRunningJob, onStop, onStart, onRetire }) {
  const menuStyle = { position: 'absolute', right: 0, top: '34px', zIndex: 9999, background: '#fff', border: '1px solid var(--color-border)', borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.12)', minWidth: '200px', overflow: 'hidden', animation: 'fadeIn 0.15s ease' };
  const itemSt = (color = 'var(--color-text-main)', disabled = false) => ({ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', fontSize: '12px', fontWeight: '600', color: disabled ? '#cbd5e1' : color, cursor: disabled ? 'not-allowed' : 'pointer', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', transition: 'background 0.15s' });

  return (
    <div style={menuStyle} onClick={e => e.stopPropagation()}>
      <div style={{ padding: '8px 14px 6px', fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', marginBottom: '4px' }}>ACTIONS — {machine.machine_code}</div>

      <ActionMenuItem icon={<Edit3 size={13} />} label="Edit Machine Details" onClick={e => onEdit(machine, e)} />
      <ActionMenuItem icon={<Briefcase size={13} />} label="Assign Job to Machine" onClick={e => onAssignJob(machine, e)} disabled={machine.status === 'maintenance'} disabledReason="Machine in maintenance" />
      <ActionMenuItem icon={<Eye size={13} />} label="View Running Job" onClick={e => onViewRunningJob(machine, e)} color={machine.status === 'busy' ? '#2563eb' : undefined} />
      <ActionMenuItem icon={<Wrench size={13} />} label="Log Maintenance Event" onClick={e => onMaintenance(machine, e)} color="#d97706" />

      <div style={{ height: '1px', background: 'var(--color-border)', margin: '4px 0' }} />

      <ActionMenuItem icon={<StopCircle size={13} />} label="Stop Operations" onClick={e => onStop(machine, e)} color="#dc2626" disabled={machine.status === 'maintenance' || machine.status === 'inactive'} disabledReason="Already stopped" />
      <ActionMenuItem icon={<PlayCircle size={13} />} label="Resume Operations" onClick={e => onStart(machine, e)} color="#059669" disabled={machine.status !== 'maintenance'} disabledReason="Machine is running" />

      <div style={{ height: '1px', background: 'var(--color-border)', margin: '4px 0' }} />

      <ActionMenuItem icon={<Trash2 size={13} />} label="Retire / Delete Machine" onClick={e => onRetire(machine, e)} color="#dc2626" />
    </div>
  );
}

function ActionMenuItem({ icon, label, onClick, color = 'var(--color-text-main)', disabled, disabledReason }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={disabled ? disabledReason : undefined}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: '600', color: disabled ? '#cbd5e1' : color, cursor: disabled ? 'not-allowed' : 'pointer', background: 'transparent', border: 'none', width: '100%', textAlign: 'left' }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = '#f8fafc'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {icon} {label}
    </button>
  );
}

function MachineDetailDrawer({ machine, machineLogs, loadingLogs, isManagerOrAbove, getStatusConfig, onClose, onEdit, onMaintenance, onAssignJob, onStop, onStart }) {
  const sc = getStatusConfig(machine.status);

  return (
    <div
      className="card"
      style={{ width: '360px', flexShrink: 0, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', position: 'sticky', top: '20px', border: '1px solid var(--color-border)', borderRadius: '8px', animation: 'slide-in 0.2s ease-out', backgroundColor: 'var(--color-card-bg)' }}
    >
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'var(--color-card-bg)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: '800', background: '#fff', border: `1px solid ${sc.border}`, padding: '1px 6px', borderRadius: '4px', color: 'var(--color-text-muted)' }}>{machine.machine_code}</span>
            <span style={{ fontSize: '10px', color: sc.text, fontWeight: '600' }}>{machine.type}</span>
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-text-main)' }}>{machine.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: sc.dot }} />
            <span style={{ fontSize: '11px', fontWeight: '700', color: sc.text }}>{sc.label}</span>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px', borderRadius: '6px' }}>
          <X size={16} />
        </button>
      </div>

      {/* Action Buttons */}
      {isManagerOrAbove && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          <DrawerActionBtn icon={<Edit3 size={12} />} label="Edit" onClick={e => onEdit(machine, e)} />
          <DrawerActionBtn icon={<Briefcase size={12} />} label="Assign Job" onClick={e => onAssignJob(machine, e)} color="#2563eb" disabled={machine.status === 'maintenance'} />
          {machine.status === 'maintenance' ? (
            <DrawerActionBtn icon={<PlayCircle size={12} />} label="Resume" onClick={e => onStart(machine, e)} color="#059669" />
          ) : (
            <DrawerActionBtn icon={<StopCircle size={12} />} label="Stop" onClick={e => onStop(machine, e)} color="#dc2626" />
          )}
          <DrawerActionBtn icon={<Wrench size={12} />} label="Maintenance" onClick={e => onMaintenance(machine, e)} color="#d97706" />
        </div>
      )}

      {/* Body */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', flexGrow: 1 }}>

        {/* Active Job */}
        {machine.status === 'busy' && machine.active_jobs?.length > 0 && (
          <div>
            <SectionLabel icon={<Activity size={11} />} label="ACTIVE JOB" />
            <div style={{ background: 'linear-gradient(135deg, #eff6ff, #f0f9ff)', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '800', color: '#2563eb', fontSize: '13px' }}>{machine.active_jobs[0].job_card_number}</span>
                <span style={{ fontSize: '10px', fontWeight: '700', background: '#dbeafe', color: '#2563eb', padding: '2px 8px', borderRadius: '20px' }}>RUNNING</span>
              </div>
              <InfoRow label="OPERATOR" value={machine.active_jobs[0].worker_name} />
              <InfoRow label="CUSTOMER" value={machine.active_jobs[0].customer} />
            </div>
          </div>
        )}

        {/* Machine Specs */}
        <div>
          <SectionLabel icon={<Settings size={11} />} label="SPECIFICATIONS" />
          <div style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '12px', fontSize: '12px', whiteSpace: 'pre-line', color: 'var(--color-text-muted)', lineHeight: '1.6', minHeight: '60px' }}>
            {machine.specifications || 'No specifications recorded.'}
          </div>
        </div>

        {/* Operator & Rate */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
          <div style={{ background: 'var(--color-bg-base)', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><User size={10} /> DEFAULT OPERATOR</div>
            <div style={{ fontWeight: '700', color: 'var(--color-text-main)', fontSize: '12px' }}>{machine.default_operator?.name || 'None'}</div>
          </div>
          <div style={{ background: 'var(--color-bg-base)', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><DollarSign size={10} /> HOURLY RATE</div>
            <div style={{ fontWeight: '700', color: 'var(--color-text-main)', fontSize: '12px' }}>{machine.hourly_rate ? `₹${machine.hourly_rate}/hr` : 'N/A'}</div>
          </div>
          {machine.last_maintenance_date && (
            <div style={{ background: 'var(--color-bg-base)', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={10} /> LAST SERVICED</div>
              <div style={{ fontWeight: '700', color: 'var(--color-text-main)', fontSize: '12px' }}>{new Date(machine.last_maintenance_date).toLocaleDateString()}</div>
            </div>
          )}
          {machine.next_maintenance_due && (
            <div style={{ background: new Date(machine.next_maintenance_due) < new Date() ? '#fef2f2' : 'var(--color-bg-base)', borderRadius: '8px', padding: '10px 12px', border: new Date(machine.next_maintenance_due) < new Date() ? '1px solid #fecaca' : '1px solid transparent' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={10} /> NEXT SERVICE</div>
              <div style={{ fontWeight: '700', color: new Date(machine.next_maintenance_due) < new Date() ? 'var(--color-danger)' : 'var(--color-text-main)', fontSize: '12px' }}>{new Date(machine.next_maintenance_due).toLocaleDateString()}</div>
            </div>
          )}
        </div>

        {/* Maintenance Log */}
        <div>
          <SectionLabel icon={<History size={11} />} label="MAINTENANCE TIMELINE" />
          {loadingLogs ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><Loader2 size={16} className="animate-spin" /></div>
          ) : machineLogs.length === 0 ? (
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>No maintenance history recorded.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
              {machineLogs.map(log => {
                const logColor = log.log_type === 'breakdown' ? '#dc2626' : log.log_type === 'maintenance' ? '#d97706' : log.log_type === 'status_override' ? '#059669' : 'var(--color-text-muted)';
                return (
                  <div key={log.id} style={{ background: 'var(--color-bg-base)', borderRadius: '8px', padding: '10px 12px', borderLeft: `3px solid ${logColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: logColor, textTransform: 'uppercase' }}>{log.log_type.replace('_', ' ')}</span>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{new Date(log.date).toLocaleDateString()}</span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-main)', lineHeight: '1.5', margin: 0 }}>{log.description}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: 'var(--color-text-muted)' }}>
                      <span>By: {log.logged_by}</span>
                      {log.cost && <strong style={{ color: 'var(--color-text-main)' }}>₹{log.cost}</strong>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Tiny Helpers ──

function InfoRow({ label, value, valueColor, bold }) {
  return (
    <div>
      <span style={{ fontSize: '9px', fontWeight: '700', color: 'var(--color-text-muted)', display: 'block', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: '12px', fontWeight: bold ? '700' : '500', color: valueColor || 'var(--color-text-main)' }}>{value || '—'}</span>
    </div>
  );
}

function SectionLabel({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{icon}</span>
      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>{label}</span>
    </div>
  );
}

function QuickAction({ label, icon, onClick, color = 'var(--color-text-muted)' }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 9px', border: '1px solid var(--color-border)', borderRadius: '6px', background: 'var(--color-bg-base)', color, fontSize: '10px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.background = color === 'var(--color-text-muted)' ? '#f1f5f9' : `${color}15`; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-bg-base)'; }}
    >
      {icon} {label}
    </button>
  );
}

function DrawerActionBtn({ icon, label, onClick, color = 'var(--color-text-muted)', disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 11px', border: `1px solid ${disabled ? 'var(--color-border)' : color}`, borderRadius: '7px', background: disabled ? 'transparent' : `${color}12`, color: disabled ? '#cbd5e1' : color, fontSize: '11px', fontWeight: '700', cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
    >
      {icon} {label}
    </button>
  );
}

function FormField({ label, children }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

function ModalBackdrop({ onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: '560px', borderRadius: '16px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', animation: 'modal-appear 0.25s cubic-bezier(0.16,1,0.3,1)', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose, icon, iconBg }) {
  return (
    <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-base)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {icon && <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>}
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-text-main)' }}>{title}</h3>
          {subtitle && <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{subtitle}</span>}
        </div>
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px', borderRadius: '6px' }}><X size={18} /></button>
    </div>
  );
}

function ModalFooter({ onCancel, submitting, submitLabel, submitColor = 'var(--color-primary)' }) {
  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '4px' }}>
      <button type="button" onClick={onCancel} className="logout-btn" style={{ padding: '8px 18px', fontSize: '13px' }}>Cancel</button>
      <button type="submit" disabled={submitting} className="form-button" style={{ width: 'auto', marginTop: 0, height: '38px', padding: '0 22px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '7px', backgroundColor: submitColor }}>
        {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
        {submitLabel}
      </button>
    </div>
  );
}

const inputSt = { height: '36px', fontSize: '13px' };
