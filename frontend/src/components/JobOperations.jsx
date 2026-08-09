import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import CustomSelect from './CustomSelect';
import {
  Wrench,
  User,
  Cpu,
  Play,
  CheckCircle,
  AlertCircle,
  Clock,
  Plus,
  Filter,
  Check,
  Info,
  Calendar,
  MessageSquare,
  ArrowLeft,
  ExternalLink,
  Loader2,
  FileText,
  Upload,
  Eye,
  List,
  ChevronRight,
  X,
  Package,
  Layers
} from 'lucide-react';
import { useRealTime } from '../hooks/useRealTime';

function formatDuration(totalSeconds) {
  if (!totalSeconds) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const LiveTimer = ({ startTime, accumulated = 0 }) => {
  const [seconds, setSeconds] = useState(accumulated);

  useEffect(() => {
    let interval;
    if (startTime) {
      const start = new Date(startTime).getTime();
      interval = setInterval(() => {
        const now = new Date().getTime();
        const diff = Math.floor((now - start) / 1000);
        setSeconds(accumulated + diff);
      }, 1000);
    } else {
      setSeconds(accumulated);
    }
    return () => clearInterval(interval);
  }, [startTime, accumulated]);

  return <span>{formatDuration(seconds)}</span>;
};

export default function JobOperations({ user }) {
  const location = useLocation();
  useRealTime('jobs', () => {
    fetchJobs(true);
  });
  const [jobs, setJobs] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [machines, setMachines] = useState([]);
  const [machinesLoading, setMachinesLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // View states
  const [viewMode, setViewMode] = useState(() => {
    return user && ['worker', 'supervisor', 'helper'].includes(user.role) ? 'list' : 'kanban';
  });
  const [viewingJob, setViewingJob] = useState(null); // Selected Job Card object for Drawer view
  const [editingJob, setEditingJob] = useState(null); // Full edit mode

  // Assignment & Status Form State (used inside details page)
  const [workerId, setWorkerId] = useState('');
  const [machineId, setMachineId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [savingAssign, setSavingAssign] = useState(false);

  // File Upload State
  const [uploadingDrawing, setUploadingDrawing] = useState(false);
  const [selectedPreviewPath, setSelectedPreviewPath] = useState(null);
  const [renamingPath, setRenamingPath] = useState(null);
  const [newName, setNewName] = useState('');

  // Filters
  const [filterWorker, setFilterWorker] = useState('');
  const [filterMachine, setFilterMachine] = useState('');

  // Inventory Consumption States
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [consumptions, setConsumptions] = useState([]);
  const [consumeData, setConsumeData] = useState({ inventory_item_id: '', quantity: '' });
  const [consuming, setConsuming] = useState(false);

  // Drag & Drop State
  const [dragOverCol, setDragOverCol] = useState(null);

  // Hover popover state for Kanban cards
  const [hoveredJob, setHoveredJob] = useState(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, side: 'right' });

  const isManagerOrAbove = user && ['admin', 'partner', 'manager'].includes(user.role);
  const isWorker = user && ['worker', 'supervisor', 'helper'].includes(user.role);

  // Fetch job cards from backend
  const fetchJobs = async (shouldUpdateViewing = true) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const params = {};
      if (filterWorker) params.worker_id = filterWorker;
      if (filterMachine) params.machine_id = filterMachine;
      if (viewMode === 'archive') {
        params.archived = 1;
      }

      const response = await axios.get('/api/jobs', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setJobs(response.data);

      // If we are currently viewing a job, update its local state from the fresh fetch
      if (shouldUpdateViewing && viewingJob) {
        const updated = response.data.find(j => j.id === viewingJob.id);
        if (updated) {
          setViewingJob(updated);
        }
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to load Job Cards.' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch active workers for dropdown
  const fetchWorkers = async () => {
    setWorkersLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('/api/workers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorkers(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setWorkersLoading(false);
    }
  };

  // Fetch active machines for dropdown
  const fetchMachines = async () => {
    setMachinesLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('/api/machines', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMachines(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setMachinesLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    if (isManagerOrAbove) {
      fetchWorkers();
      fetchMachines();
    }
  }, [filterWorker, filterMachine, viewMode]);

  useEffect(() => {
    if (location.state && location.state.viewJobId && jobs.length > 0) {
      const job = jobs.find(j => j.id === location.state.viewJobId);
      if (job) {
        handleViewJobDetails(job);
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, jobs]);

  // Open splitscreen detailed view
  const handleViewJobDetails = (job) => {
    setViewingJob(job);
    setWorkerId(job.assigned_worker_id || '');
    setMachineId(job.machine_id || '');
    setRemarks(job.remarks || '');
    setSelectedPreviewPath(job.drawing_path && job.drawing_path.length > 0 ? job.drawing_path[0].path : null);
    setFeedback(null);
    fetchConsumptions(job.id);
  };

  const handleEditJob = (job) => {
    setEditingJob(job);
    setViewingJob(job);
    setWorkerId(job.assigned_worker_id || '');
    setMachineId(job.machine_id || '');
    setRemarks(job.remarks || '');
    setSelectedPreviewPath(job.drawing_path && job.drawing_path.length > 0 ? job.drawing_path[0].path : null);
    setFeedback(null);
    fetchConsumptions(job.id);
  };

  // Close splitscreen view
  const handleBack = () => {
    setViewingJob(null);
    setEditingJob(null);
    setFeedback(null);
    fetchJobs(false);
  };

  // Save worker/machine assignment (advanced status to in_progress if pending)
  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!viewingJob) return;

    setSavingAssign(true);
    setFeedback(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.put(`/api/jobs/${viewingJob.id}/assign`, {
        assigned_worker_id: workerId,
        machine_id: machineId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFeedback({ type: 'success', message: response.data.message });

      // Refresh current job details
      fetchJobs();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to allocate job.' });
    } finally {
      setSavingAssign(false);
    }
  };

  // Update status (Start, Submit for QC, Pass, Rework)
  const handleStatusUpdate = async (status, remarksText = '') => {
    if (!viewingJob) return;
    setFeedback(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.put(`/api/jobs/${viewingJob.id}/status`, {
        status,
        remarks: remarksText || remarks
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFeedback({ type: 'success', message: response.data.message });
      fetchJobs();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to update job status.' });
    }
  };

  // Quick action from Kanban board (QC Approve/Rework)
  const handleQuickStatusUpdate = async (e, jobId, status, remarksText) => {
    e.stopPropagation();
    setFeedback(null);

    try {
      const token = localStorage.getItem('auth_token');
      await axios.put(`/api/jobs/${jobId}/status`, {
        status,
        remarks: remarksText
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFeedback({ type: 'success', message: `Job updated to '${status}' successfully.` });
      fetchJobs();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to update status.' });
    }
  };

  // Upload Drawing File
  const handleDrawingUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !viewingJob) return;

    setUploadingDrawing(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post(`/api/jobs/${viewingJob.id}/drawing`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      setFeedback({ type: 'success', message: 'Technical drawing uploaded successfully.' });

      const updatedJob = response.data.job;
      setViewingJob(updatedJob);

      // Select the newly uploaded file
      if (updatedJob.drawing_path && updatedJob.drawing_path.length > 0) {
        setSelectedPreviewPath(updatedJob.drawing_path[updatedJob.drawing_path.length - 1].path);
      }
      fetchJobs();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to upload technical drawing.' });
    } finally {
      setUploadingDrawing(false);
    }
  };

  // Delete Drawing
  const handleDeleteDrawing = async (pathToDelete) => {
    if (!window.confirm('Are you sure you want to delete this drawing?')) return;
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.delete(`/api/jobs/${viewingJob.id}/drawing`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { path: pathToDelete }
      });

      setFeedback({ type: 'success', message: 'Drawing deleted successfully.' });

      const updatedJob = response.data.job;
      setViewingJob(updatedJob);

      // Reset selected preview path if we deleted the active one
      if (selectedPreviewPath === pathToDelete) {
        setSelectedPreviewPath(updatedJob.drawing_path && updatedJob.drawing_path.length > 0 ? updatedJob.drawing_path[0].path : null);
      }
      fetchJobs();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to delete drawing.' });
    }
  };

  // Rename Drawing
  const handleRenameDrawing = async (path, newName) => {
    if (!newName.trim()) return;
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.put(`/api/jobs/${viewingJob.id}/drawing/rename`, {
        path,
        name: newName
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFeedback({ type: 'success', message: 'Drawing renamed successfully.' });
      setViewingJob(response.data.job);
      setRenamingPath(null);
      fetchJobs();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to rename drawing.' });
    }
  };

  // HTML5 Drag & Drop handlers for Kanban Board
  const handleDragStart = (e, job) => {
    e.dataTransfer.setData('text/plain', job.id.toString());
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const jobIdStr = e.dataTransfer.getData('text/plain');
    if (!jobIdStr) return;
    const jobId = parseInt(jobIdStr, 10);
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    // If already in target status, do nothing
    if (job.status === targetStatus) return;

    // If moving to 'in_progress' and not allocated, open details for assignment
    if (targetStatus === 'in_progress' && (!job.assigned_worker_id || !job.machine_id)) {
      handleViewJobDetails(job);
      setFeedback({
        type: 'danger',
        message: 'Please allocate an operator and machine first to start Machining.'
      });
      return;
    }

    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.put(`/api/jobs/${job.id}/status`, {
        status: targetStatus,
        remarks: job.remarks || `Moved status to ${targetStatus} via Kanban board drag-and-drop.`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFeedback({ type: 'success', message: response.data.message });
      fetchJobs();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to update job status.' });
    }
  };

  // Helper styles for statuses
  const getStatusBadgeStyles = (status, hasChallan = false) => {
    switch (status) {
      case 'pending':
        return { bg: '#fefbeb', text: '#d97706', border: '#fde68a', label: 'Pending Allocation' };
      case 'in_progress':
        return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', label: 'Machining' };
      case 'inspection':
        return { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff', label: 'QC Inspection' };
      case 'completed':
        return { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', label: hasChallan ? 'Delivered' : 'Completed' };
      default:
        return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', label: status };
    }
  };

  // Group jobs by columns for the Kanban Board (Manager view)
  const columns = {
    pending: jobs.filter(j => j.status === 'pending'),
    in_progress: jobs.filter(j => j.status === 'in_progress'),
    inspection: jobs.filter(j => j.status === 'inspection'),
    completed: jobs.filter(j => j.status === 'completed' && !j.archive) // We probably don't see archived in Kanban anyway
  };

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.get('/api/inventory', { headers: { Authorization: `Bearer ${token}` } });
      setInventoryItems(res.data);
    } catch (err) {
      console.error('Failed to load inventory', err);
    }
  };

  const fetchConsumptions = async (jobId) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.get(`/api/jobs/${jobId}/consumptions`, { headers: { Authorization: `Bearer ${token}` } });
      setConsumptions(res.data);
    } catch (err) {
      console.error('Failed to load consumptions', err);
    }
  };

  const handleOpenConsumeModal = () => {
    setShowConsumeModal(true);
    setConsumeData({ inventory_item_id: '', quantity: '' });
    fetchInventory();
    fetchConsumptions(viewingJob.id);
  };

  const handleConsumeMaterial = async (e) => {
    e.preventDefault();
    setConsuming(true);
    try {
      const token = localStorage.getItem('auth_token');
      await axios.post(`/api/jobs/${viewingJob.id}/consume-inventory`, consumeData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeedback({ type: 'success', message: 'Material consumed successfully' });
      fetchConsumptions(viewingJob.id);
      fetchInventory();
      setConsumeData({ inventory_item_id: '', quantity: '' });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to consume material.' });
    } finally {
      setConsuming(false);
    }
  };

  const isPdf = (path) => path && path.toLowerCase().endsWith('.pdf');

  const getGroupedArchivedJobs = () => {
    const groups = {};
    jobs.forEach(job => {
      const dateStr = job.end_date || (job.created_at ? job.created_at.split('T')[0] : 'No Date');
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(job);
    });
    return Object.keys(groups)
      .sort((a, b) => new Date(b) - new Date(a))
      .reduce((acc, date) => {
        acc[date] = groups[date];
        return acc;
      }, {});
  };

  const renderArchiveGallery = () => {
    const grouped = getGroupedArchivedJobs();
    const dates = Object.keys(grouped);

    if (dates.length === 0) {
      return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: '12px' }}>
          <Calendar size={40} style={{ color: 'var(--color-text-light)' }} />
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>No archived or completed jobs found.</p>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {dates.map(date => {
          let formattedDate = date;
          try {
            if (date !== 'No Date') {
              formattedDate = new Date(date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
            }
          } catch (e) {
            console.error('Failed to parse date:', e);
          }

          return (
            <div key={date} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                <Calendar size={18} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text-main)', margin: 0 }}>
                  {formattedDate}
                </h3>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  backgroundColor: 'var(--color-bg-base)',
                  color: 'var(--color-text-muted)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border)'
                }}>
                  {grouped[date].length} Job{grouped[date].length > 1 ? 's' : ''}
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px'
              }}>
                {grouped[date].map(job => {
                  const hasDrawings = job.drawing_path && job.drawing_path.length > 0;
                  const isDelivered = !!job.delivery_challan_item;

                  return (
                    <div
                      key={job.id}
                      className="card table-row-hover"
                      onClick={() => handleEditJob(job)}
                      style={{
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        cursor: 'pointer',
                        borderColor: isDelivered ? '#bbf7d0' : 'var(--color-border)',
                        boxShadow: 'var(--shadow-sm)',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                      }}
                    >
                      {/* Stamp overlay if delivered */}
                      {isDelivered && (
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          border: '2px double #16a34a',
                          color: '#16a34a',
                          fontSize: '8px',
                          fontWeight: '850',
                          textTransform: 'uppercase',
                          padding: '1px 3px',
                          borderRadius: '3px',
                          transform: 'rotate(5deg)',
                          backgroundColor: '#ffffff',
                          zIndex: 5,
                          fontFamily: 'monospace'
                        }}>
                          DELIVERED
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-main)' }}>
                          {job.job_card_number}
                        </span>
                        {!isDelivered && (
                          <span style={{
                            fontSize: '9px',
                            fontWeight: '600',
                            backgroundColor: 'var(--color-success-light)',
                            color: 'var(--color-success)',
                            padding: '2px 6px',
                            borderRadius: '8px',
                            border: '1px solid rgba(34,197,94,0.1)'
                          }}>
                            COMPLETED
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div><strong>PO Ref:</strong> #{job.po_item?.purchase_order?.po_number}</div>
                        <div><strong>Item Code:</strong> {job.po_item?.item_code || '-'}</div>
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--color-text-main)', minHeight: '36px', lineBreak: 'anywhere' }}>
                        {(job.po_item?.description || '').split('\n')[0].substring(0, 80)}{(job.po_item?.description || '').length > 80 ? '...' : ''}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                        <span style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={12} /> {job.worker ? job.worker.name.split(' ')[0] : 'Unassigned'}
                        </span>
                        <span style={{ fontWeight: '700', color: 'var(--color-primary)' }}>
                          {job.quantity} {job.po_item?.unit || 'PC'}
                        </span>
                      </div>

                      {/* Drawings Mini-Gallery inside the card */}
                      {hasDrawings && (
                        <div style={{ marginTop: '8px' }}>
                          <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-light)', marginBottom: '6px' }}>
                            ATTACHED DRAWINGS:
                          </div>
                          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }} onClick={e => e.stopPropagation()}>
                            {job.drawing_path.map((dwg, dIdx) => {
                              const isImg = !dwg.path.toLowerCase().endsWith('.pdf');
                              return (
                                <a
                                  key={dIdx}
                                  href={`${import.meta.env.VITE_API_URL}/${dwg.path}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--color-border)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#f8fafc',
                                    flexShrink: 0
                                  }}
                                  title={dwg.name}
                                >
                                  {isImg ? (
                                    <img
                                      src={`${import.meta.env.VITE_API_URL}/${dwg.path}`}
                                      alt={dwg.name}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <FileText size={16} style={{ color: '#ef4444' }} />
                                  )}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ==========================================
  // VIEW 1: DETAILED SPLITSCREEN VIEW (FULL EDIT)
  // ==========================================
  if (editingJob) {
    const jobToUse = editingJob;
    const statusMeta = getStatusBadgeStyles(jobToUse.status, !!jobToUse.delivery_challan_item);
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Title bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', gap: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
          <button className="logout-btn" onClick={handleBack} style={{ padding: '6px 12px' }}>
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Job Card: {jobToUse.job_card_number}</h2>
              <span style={{
                fontSize: '11px',
                padding: '2px 8px',
                backgroundColor: statusMeta.bg,
                color: statusMeta.text,
                border: `1px solid ${statusMeta.border}`,
                borderRadius: '12px',
                fontWeight: '600'
              }}>
                {statusMeta.label}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Linked to Purchase Order #{jobToUse.po_item?.purchase_order?.po_number} ({jobToUse.po_item?.purchase_order?.customer_name})
            </p>
          </div>
        </div>

        {feedback && (
          <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: 0 }}>
            {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          {/* LEFT PANEL: Job Configuration / Info */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>

            {/* 1. Job Basic Details */}
            <div>
              <h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)', fontWeight: '600', marginBottom: '12px' }}>
                Job Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px' }}>Customer</span>
                  <strong>{viewingJob.po_item?.purchase_order?.customer_name}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px' }}>Arrived Quantity</span>
                  <strong style={{ color: 'var(--color-primary)' }}>{viewingJob.quantity} {viewingJob.po_item?.unit || 'PC'}</strong>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px' }}>Item Description</span>
                  <div style={{ whiteSpace: 'pre-line', backgroundColor: 'var(--color-bg-base)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '12px' }}>
                    {viewingJob.po_item?.description}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px' }}>Challan Reference</span>
                  <strong>{viewingJob.challan_item?.challan?.challan_number || 'Direct Logged'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px' }}>Receipt Date</span>
                  <strong>{viewingJob.challan_item?.challan?.challan_date ? new Date(viewingJob.challan_item.challan.challan_date).toLocaleDateString() : 'N/A'}</strong>
                </div>
              </div>
            </div>

            {/* 2. Worker/Machine Allocation (Manager Editable, Worker Read-Only) */}
            <div>
              <h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)', fontWeight: '600', marginBottom: '12px' }}>
                Operator & Machine Assignment
              </h3>

              {isManagerOrAbove ? (
                <form onSubmit={handleSaveAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11px' }}><User size={12} /> Assigned Operator</label>
                    <CustomSelect
                      value={workerId}
                      onChange={(val) => setWorkerId(val)}
                      options={[
                        { value: '', label: '-- Choose Operator --' },
                        ...workers.map(w => ({
                          value: w.id,
                          label: `${w.name} ${w.active_jobs_count > 0 ? `(${w.active_jobs_count} Active)` : ''}`
                        }))
                      ]}
                      style={{ height: '36px' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11px' }}><Cpu size={12} /> Assigned Machine</label>
                    <CustomSelect
                      value={machineId}
                      onChange={(val) => setMachineId(val)}
                      options={machines.map(m => {
                        const isBusy = m.active_jobs && m.active_jobs.length > 0 && !m.active_jobs.some(j => j.id === jobToUse.id);
                        const busyLabel = isBusy ? ` (BUSY: Job #${m.active_jobs[0].job_card_number})` : '';
                        const statusLabel = m.status === 'maintenance' ? ' (MAINTENANCE)' : m.status === 'inactive' ? ' (INACTIVE)' : busyLabel;

                        return {
                          value: m.id,
                          label: `${m.machine_code} - ${m.name}${statusLabel}`,
                          disabled: m.status === 'maintenance' || m.status === 'inactive' || isBusy
                        };
                      })}
                      placeholder="Select machine..."
                      style={{ height: '36px' }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="form-button"
                    disabled={savingAssign}
                    style={{ width: 'auto', alignSelf: 'flex-start', marginTop: '4px', height: '34px', padding: '0 16px', fontSize: '12px', backgroundColor: 'var(--color-primary)' }}
                  >
                    {savingAssign ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save Allocation
                  </button>
                </form>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px' }}>Assigned Worker</span>
                    <strong>{viewingJob.worker?.name || 'Not Allocated'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px' }}>Assigned Machine</span>
                    <strong>{viewingJob.machine?.machine_code || 'Not Allocated'}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Drawing Attachment Uploader (Visible to Managers) */}
            {isManagerOrAbove && (
              <div>
                <h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)', fontWeight: '600', marginBottom: '12px' }}>
                  Attach Blueprints / Drawings
                </h3>
                <div style={{ border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '12px', textAlign: 'center', backgroundColor: 'var(--color-bg-base)' }}>
                  <input
                    type="file"
                    id="job-drawing"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleDrawingUpload}
                    style={{ display: 'none' }}
                    disabled={uploadingDrawing}
                  />
                  <label htmlFor="job-drawing" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    {uploadingDrawing ? (
                      <>
                        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                        <span style={{ fontSize: '12px', fontWeight: '600' }}>Uploading Drawing file...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={20} style={{ color: 'var(--color-primary)' }} />
                        <span style={{ fontSize: '12px', fontWeight: '600' }}>Upload Drawing (PDF or Image)</span>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Add drawing or blueprint file to this Job Card (Multiple supported)</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            )}

            {/* 4. Execution / Status Progress Panel */}
            <div>
              <h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)', fontWeight: '600', marginBottom: '12px' }}>
                Progress Controls
              </h3>

              {/* Status dates */}
              {/* Status dates and Timer */}
              <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '14px', alignItems: 'center' }}>
                {viewingJob.start_date && (
                  <span>Start Date: <strong>{new Date(viewingJob.start_date).toLocaleDateString()}</strong></span>
                )}
                {viewingJob.end_date && (
                  <span>Completion Date: <strong>{new Date(viewingJob.end_date).toLocaleDateString()}</strong></span>
                )}

                {viewingJob.status === 'in_progress' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '18px', fontWeight: '800', color: '#2563eb', padding: '4px 12px', backgroundColor: '#dbeafe', borderRadius: '8px', border: '1px solid #bfdbfe', fontFamily: 'monospace' }}>
                    <Clock size={18} /> <LiveTimer startTime={viewingJob.machining_started_at} accumulated={viewingJob.machining_duration_seconds} />
                  </div>
                )}

                {(viewingJob.status === 'completed' || viewingJob.status === 'inspection') && viewingJob.machining_duration_seconds > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', fontWeight: '700', color: 'var(--color-text-muted)', padding: '4px 12px', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px solid var(--color-border)', fontFamily: 'monospace' }}>
                    <Check size={16} /> {formatDuration(viewingJob.machining_duration_seconds)}
                  </div>
                )}
              </div>

              {/* Status transition triggers */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {isWorker && (
                  <>
                    {viewingJob.status === 'pending' && (
                      <button
                        onClick={() => handleStatusUpdate('in_progress', 'Started machining by worker')}
                        className="form-button"
                        style={{ width: 'auto', marginTop: 0, height: '36px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-primary)' }}
                      >
                        <Play size={14} fill="white" /> Start Job
                      </button>
                    )}
                    {viewingJob.status === 'in_progress' && (
                      <button
                        onClick={() => handleStatusUpdate('inspection', 'Submitted for inspection by worker')}
                        className="form-button"
                        style={{ width: 'auto', marginTop: 0, height: '36px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#7c3aed' }}
                      >
                        <CheckCircle size={14} /> Submit for Inspection
                      </button>
                    )}
                    {viewingJob.status === 'inspection' && (
                      <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', padding: '6px 12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <Clock size={14} className="animate-spin" /> Sent for Quality Inspection. Awaiting manager approval.
                      </div>
                    )}
                  </>
                )}

                {(viewingJob.status === 'in_progress') && (
                  <button
                    onClick={handleOpenConsumeModal}
                    className="form-button"
                    style={{ width: 'auto', marginTop: 0, height: '36px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fb923c' }}
                  >
                    <Layers size={14} /> Consume Material
                  </button>
                )}

                {isManagerOrAbove && (
                  <>
                    {viewingJob.status === 'pending' && (
                      <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                        <Info size={14} style={{ marginRight: '6px' }} /> Allocate an operator and machine above to automatically advance this job.
                      </div>
                    )}
                    {viewingJob.status === 'in_progress' && (
                      <button
                        onClick={() => handleStatusUpdate('inspection', 'Status changed to inspection by manager')}
                        className="form-button"
                        style={{ width: 'auto', marginTop: 0, height: '36px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#7c3aed' }}
                      >
                        <Clock size={14} /> Move to Quality Inspection
                      </button>
                    )}
                    {viewingJob.status === 'inspection' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate('completed', 'Inspection Passed')}
                          className="form-button"
                          style={{ width: 'auto', marginTop: 0, height: '36px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-success)' }}
                        >
                          <Check size={14} /> Pass Inspection & Complete
                        </button>
                        <button
                          onClick={() => handleStatusUpdate('in_progress', 'QC Failed, returned for rework')}
                          className="form-button"
                          style={{ width: 'auto', marginTop: 0, height: '36px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-danger)' }}
                        >
                          <AlertCircle size={14} /> Fail QC & Trigger Rework
                        </button>
                      </>
                    )}
                  </>
                )}

                {viewingJob.status === 'completed' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-success)', backgroundColor: 'var(--color-success-light)', border: '1px solid rgba(34, 197, 94, 0.15)', padding: '8px 16px', borderRadius: 'var(--radius-sm)', fontWeight: '600' }}>
                    <CheckCircle size={16} /> Job card signed off and delivered.
                  </div>
                )}
              </div>

              {/* Remarks Box */}
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Notes / Remarks</label>
                <textarea
                  className="form-input"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Dimensions checked, surface tolerance calibrated..."
                  style={{ height: '70px', padding: '8px 10px', fontSize: '12px', resize: 'none' }}
                  onBlur={() => handleStatusUpdate(viewingJob.status, remarks)}
                />
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Focus out of the text area to automatically save remarks.</span>
              </div>

              {/* Consumption History */}
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Consumption History ({consumptions.length})</label>
                {consumptions.length === 0 ? (
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                    No material consumed for this job yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    {consumptions.map((cons) => (
                      <div key={cons.id} style={{ padding: '8px 12px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text)' }}>{cons.inventory_item?.name}</span>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-primary)' }}>{cons.quantity} {cons.inventory_item?.unit}</span>
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                          Logged by {cons.user?.name || 'System'} at {new Date(cons.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT PANEL: Drawings & Blueprint Viewer */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', height: 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-bg-base)' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Technical Drawings & Blueprints</span>
              {selectedPreviewPath && (
                <a href={`${import.meta.env.VITE_API_URL}/${selectedPreviewPath}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-primary)' }}>
                  Open Selected Blueprint <ExternalLink size={12} />
                </a>
              )}
            </div>

            <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
              {/* File List Sidebar */}
              <div style={{ width: '250px', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg-base)', overflowY: 'auto' }}>
                <div style={{ padding: '10px', fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>
                  ATTACHED FILES ({viewingJob.drawing_path ? viewingJob.drawing_path.length : 0})
                </div>
                {viewingJob.drawing_path && viewingJob.drawing_path.length > 0 ? (
                  viewingJob.drawing_path.map((item, index) => {
                    const isSelected = selectedPreviewPath === item.path;
                    const isRenaming = renamingPath === item.path;

                    return (
                      <div
                        key={index}
                        onClick={() => setSelectedPreviewPath(item.path)}
                        style={{
                          padding: '10px',
                          borderBottom: '1px solid var(--color-border)',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#ffffff' : 'transparent',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        {isRenaming ? (
                          <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              className="form-input"
                              value={newName}
                              onChange={e => setNewName(e.target.value)}
                              style={{ height: '24px', fontSize: '11px', padding: '0 4px', flexGrow: 1 }}
                            />
                            <button
                              onClick={() => handleRenameDrawing(item.path, newName)}
                              className="form-button"
                              style={{ width: 'auto', padding: '2px 6px', fontSize: '10px', height: '24px', marginTop: 0, backgroundColor: 'var(--color-success)' }}
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', fontWeight: isSelected ? '700' : '500', color: isSelected ? 'var(--color-primary)' : 'var(--color-text-main)', wordBreak: 'break-all', marginRight: '6px' }}>
                              {item.name}
                            </span>
                            {isManagerOrAbove && (
                              <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => { setRenamingPath(item.path); setNewName(item.name); }}
                                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px', color: 'var(--color-text-muted)', fontSize: '12px' }}
                                  title="Rename file"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleDeleteDrawing(item.path)}
                                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px', color: 'var(--color-danger)', fontSize: '12px' }}
                                  title="Delete file"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '20px 10px', fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                    No drawings uploaded.
                  </div>
                )}
              </div>

              {/* File Preview Area */}
              <div style={{ flexGrow: 1, backgroundColor: '#525659', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', position: 'relative' }}>
                {selectedPreviewPath ? (
                  isPdf(selectedPreviewPath) ? (
                    <iframe src={`${import.meta.env.VITE_API_URL}/${selectedPreviewPath}`} width="100%" height="100%" style={{ border: 'none' }} title="Drawing Blueprint" />
                  ) : (
                    <img
                      src={`${import.meta.env.VITE_API_URL}/${selectedPreviewPath}`}
                      alt="Job Drawing"
                      style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.15)' }}
                    />
                  )
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: '#cbd5e1', fontSize: '13px' }}>
                    <FileText size={48} style={{ color: '#94a3b8' }} />
                    <span>Select a drawing file from the list to preview it here.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Consume Material Modal */}
          {showConsumeModal && createPortal(
            <div className="modal-overlay" onClick={() => setShowConsumeModal(false)}>
              <div className="modal-content animate-scale-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                  <h2>Log Inventory Consumption</h2>
                  <button 
                    onClick={() => setShowConsumeModal(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="modal-body">

                  <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Job Card:</span>
                      <strong>{viewingJob.job_card_number}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Required Quantity:</span>
                      <strong>{viewingJob.quantity} {viewingJob.po_item?.unit}</strong>
                    </div>
                  </div>

                  <form onSubmit={handleConsumeMaterial} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                    <div className="form-group">
                      <label className="form-label">Select Inventory Material</label>
                      <CustomSelect
                        value={consumeData.inventory_item_id}
                        onChange={val => setConsumeData({ ...consumeData, inventory_item_id: val })}
                        options={[
                          { value: '', label: '-- Choose Item --' },
                          ...inventoryItems.map(item => ({
                            value: item.id,
                            label: `${item.sku} - ${item.name} (${item.stock} ${item.unit} available)`,
                            disabled: item.stock <= 0
                          }))
                        ]}
                        style={{ height: '36px' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Quantity to Consume</label>
                      <input required type="number" step="1" min="0" className="form-input" value={consumeData.quantity} onChange={e => setConsumeData({ ...consumeData, quantity: e.target.value })} />
                    </div>

                    <button type="submit" className="form-button" disabled={consuming || !consumeData.inventory_item_id || !consumeData.quantity} style={{ marginTop: '8px' }}>
                      {consuming ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Consumption'}
                    </button>
                  </form>

                  <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>Consumption History</h3>

                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {consumptions.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                        No material consumed for this job yet.
                      </div>
                    ) : (
                      <table style={{ width: '100%', fontSize: '12px', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                            <th style={{ padding: '8px' }}>Date</th>
                            <th style={{ padding: '8px' }}>Item</th>
                            <th style={{ padding: '8px' }}>Qty</th>
                            <th style={{ padding: '8px' }}>Logged By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {consumptions.map(c => (
                            <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                              <td style={{ padding: '8px', color: 'var(--color-text-muted)' }}>{new Date(c.created_at).toLocaleString()}</td>
                              <td style={{ padding: '8px', fontWeight: '500' }}>{c.inventory_item?.name || 'Unknown'}</td>
                              <td style={{ padding: '8px', fontWeight: '700', color: 'var(--color-primary)' }}>{c.quantity} {c.inventory_item?.unit}</td>
                              <td style={{ padding: '8px' }}>{c.consumer?.name || 'System'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

        </div>
      </div>
    );
  }

  // ==========================================
  // DEFAULT DASHBOARD VIEW
  // ==========================================
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '80vh' }}>

      {/* Header bar with toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>
            {isWorker ? 'My Assigned Machining Tasks' : 'Job Operations Dashboard'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {isWorker
              ? 'Start work on pending items, log progress, and submit to Quality Inspection when complete.'
              : 'Allocate incoming materials to floor technicians, specify lathes/CNC machines, and sign-off quality inspections.'}
          </p>
        </div>

        {/* View Toggle and Filter container */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>

          {/* Kanban / List / Archive Toggle buttons */}
          <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', backgroundColor: 'var(--color-card-bg)' }}>
            {!isWorker && (
              <button
                onClick={() => setViewMode('kanban')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: 'none',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'kanban' ? 'var(--color-primary-light)' : 'transparent',
                  color: viewMode === 'kanban' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Wrench size={14} /> Kanban
              </button>
            )}
            <button
              onClick={() => setViewMode('list')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                backgroundColor: viewMode === 'list' ? 'var(--color-primary-light)' : 'transparent',
                color: viewMode === 'list' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                transition: 'all 0.15s ease'
              }}
            >
              <List size={14} /> List View
            </button>
            <button
              onClick={() => setViewMode('archive')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                backgroundColor: viewMode === 'archive' ? 'var(--color-primary-light)' : 'transparent',
                color: viewMode === 'archive' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                transition: 'all 0.15s ease'
              }}
            >
              <Calendar size={14} /> Archived Jobs
            </button>
          </div>

          {isManagerOrAbove && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                <Filter size={13} />
              </div>
              <CustomSelect
                value={filterWorker}
                onChange={(val) => setFilterWorker(val)}
                options={[
                  { value: '', label: '-- Workers --' },
                  ...workers.map(w => ({ value: w.id, label: w.name.split(' ')[0] }))
                ]}
                style={{ width: '130px', height: '34px' }}
              />
              <input
                type="text"
                placeholder="Machine"
                className="form-input"
                value={filterMachine}
                onChange={(e) => setFilterMachine(e.target.value)}
                style={{ width: '100px', height: '34px', padding: '0 8px', fontSize: '12px' }}
              />
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

      {/* ==========================================
          LOADING & GRID CONDITIONAL RENDER
          ========================================== */}
      {loading && jobs.length === 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px 16px' }}>Job Card #</th>
                <th style={{ padding: '12px 16px' }}>PO Reference</th>
                <th style={{ padding: '12px 16px' }}>Item Code</th>
                <th style={{ padding: '12px 16px' }}>Description</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Qty</th>
                <th style={{ padding: '12px 16px' }}>Machine</th>
                <th style={{ padding: '12px 16px' }}>Operator</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '90px' }} /></td>
                  <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '80px' }} /></td>
                  <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '80px' }} /></td>
                  <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '150px' }} /></td>
                  <td style={{ padding: '16px', textAlign: 'right' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '40px', marginLeft: 'auto' }} /></td>
                  <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '60px' }} /></td>
                  <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '80px' }} /></td>
                  <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '18px', width: '70px', borderRadius: '12px' }} /></td>
                  <td style={{ padding: '16px', textAlign: 'right' }}><div className="skeleton-line animate-pulse" style={{ height: '28px', width: '80px', marginLeft: 'auto' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : jobs.length === 0 ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: '12px' }}>
          <Calendar size={40} style={{ color: 'var(--color-text-light)' }} />
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            {viewMode === 'archive' ? 'No archived or completed jobs found.' : 'No Job Cards match your filters.'}
          </p>
        </div>
      ) : viewMode === 'archive' ? (
        renderArchiveGallery()
      ) : viewMode === 'list' || isWorker ? (

        /* ==========================================
            VIEW Mode: LIST VIEW (Default for Workers)
           ========================================== */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px 16px' }}>Job Card #</th>
                <th style={{ padding: '12px 16px' }}>PO Reference</th>
                <th style={{ padding: '12px 16px' }}>Item Code</th>
                <th style={{ padding: '12px 16px' }}>Description</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Qty</th>
                <th style={{ padding: '12px 16px' }}>Machine</th>
                <th style={{ padding: '12px 16px' }}>Operator</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => {
                const statusStyles = getStatusBadgeStyles(job.status, !!job.delivery_challan_item);
                return (
                  <tr key={job.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }} className="table-row-hover">
                    <td style={{ padding: '12px 16px', fontWeight: '700' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {job.job_card_number}
                        {job.status === 'completed' && job.delivery_challan_item && (
                          <span style={{
                            border: '1.5px solid #16a34a',
                            color: '#16a34a',
                            fontSize: '9px',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            letterSpacing: '0.5px',
                            fontFamily: 'monospace',
                            display: 'inline-block',
                            transform: 'rotate(-3deg)',
                            backgroundColor: '#ffffff'
                          }}>
                            DELIVERED
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>PO #{job.po_item?.purchase_order?.po_number}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '500' }}>{job.po_item?.item_code}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {(job.po_item?.description || '').split('\n')[0].substring(0, 40)}{(job.po_item?.description || '').length > 40 ? '...' : ''}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600' }}>{job.quantity} {job.po_item?.unit || 'PC'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '500' }}>{job.machine?.machine_code || <em style={{ color: 'var(--color-text-light)' }}>-</em>}</td>
                    <td style={{ padding: '12px 16px' }}>{job.worker ? job.worker.name : <em style={{ color: 'var(--color-danger)' }}>Unassigned</em>}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        backgroundColor: statusStyles.bg,
                        color: statusStyles.text,
                        border: `1px solid ${statusStyles.border}`,
                        borderRadius: '12px',
                        fontWeight: '600'
                      }}>
                        {statusStyles.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleEditJob(job)}
                        className="logout-btn"
                        style={{ padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', height: '28px' }}
                      >
                        <Eye size={12} />
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (

        /* ==========================================
            VIEW Mode: KANBAN BOARD (Admins/Managers)
           ========================================== */
        <div style={{
          display: 'flex',
          gap: '20px',
          overflowX: 'auto',
          paddingBottom: '10px',
          alignItems: 'stretch',
          height: 'calc(100vh - 240px)',
          minHeight: '500px'
        }}>
          {Object.keys(columns).map(colKey => {
            const columnJobs = columns[colKey];
            let colTitle = '';
            let headerColor = '';
            let headerBg = '';

            if (colKey === 'pending') {
              colTitle = 'Pending Allocation';
              headerColor = '#b45309';
              headerBg = '#fef3c7';
            } else if (colKey === 'in_progress') {
              colTitle = 'Machining';
              headerColor = '#1d4ed8';
              headerBg = '#dbeafe';
            } else if (colKey === 'inspection') {
              colTitle = 'Quality Inspection';
              headerColor = '#6d28d9';
              headerBg = '#f3e8ff';
            } else if (colKey === 'completed') {
              colTitle = 'Completed / Delivered';
              headerColor = '#15803d';
              headerBg = '#dcfce7';
            }

            return (
              <div
                key={colKey}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverCol !== colKey) setDragOverCol(colKey);
                }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => {
                  setDragOverCol(null);
                  handleDrop(e, colKey);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0',
                  width: '320px',
                  minWidth: '320px',
                  backgroundColor: dragOverCol === colKey ? 'var(--color-primary-light)' : 'var(--color-bg-base)',
                  border: dragOverCol === colKey ? '2px dashed var(--color-primary)' : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  height: '100%',
                  transition: 'all 0.15s ease'
                }}
              >

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '10px 14px',
                  backgroundColor: headerBg,
                  borderBottom: `1px solid rgba(0,0,0,0.05)`,
                  flexShrink: 0,
                  gap: '4px'
                }}>
                  <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: headerColor }}>{colTitle}</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#ffffff', color: headerColor, border: `1px solid rgba(0,0,0,0.08)` }}>
                      {columnJobs.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', fontSize: '10px', color: headerColor, opacity: 0.8 }}>
                    <span>Jobs: {columnJobs.length}</span>
                    <span>Qty: {columnJobs.reduce((sum, j) => sum + Number(j.quantity || 0), 0)}</span>
                  </div>
                </div>

                {/* Column Cards Container — scrollable */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  flexGrow: 1,
                  overflowY: 'auto',
                  padding: '12px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'var(--color-border) transparent'
                }}>
                  {columnJobs.map(job => (
                    <div
                      key={job.id}
                      className="card"
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, job)}
                      onClick={() => handleEditJob(job)}
                      style={{
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        height: '140px',
                        flexShrink: 0,
                        cursor: 'pointer',
                        borderColor: job.status === 'inspection' ? '#d8b4fe' : 'var(--color-border)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        userSelect: 'none',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
                        borderLeftWidth: '4px',
                        borderLeftColor: job.status === 'pending' ? '#f59e0b'
                          : job.status === 'in_progress' ? '#3b82f6'
                            : job.status === 'inspection' ? '#a855f7'
                              : '#22c55e',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      {job.status === 'completed' && job.delivery_challan_item && (
                        <div style={{
                          position: 'absolute',
                          top: '10px', right: '10px',
                          border: '2px double #16a34a',
                          color: '#16a34a', fontSize: '9px', fontWeight: '900',
                          textTransform: 'uppercase', padding: '1px 5px', borderRadius: '3px',
                          opacity: 0.7, letterSpacing: '1px', pointerEvents: 'none',
                          fontFamily: 'monospace', backgroundColor: 'rgba(255,255,255,0.9)', zIndex: 10
                        }}>
                          DELIVERED
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text-main)', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                            {job.job_card_number}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                            PO: {job.po_item?.purchase_order?.po_number || 'N/A'}
                          </div>
                        </div>
                        <div style={{ fontWeight: '700', color: 'var(--color-primary)', fontSize: '12px' }}>
                          {job.quantity} {job.po_item?.unit || 'PC'}
                        </div>
                      </div>

                      <div style={{ flexGrow: 1, fontSize: '11px', color: 'var(--color-text-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {job.po_item?.description || 'No Description'}
                      </div>

                      {/* Timer Display */}
                      {job.status === 'in_progress' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: '#2563eb', marginBottom: '6px' }}>
                          <Clock size={12} /> <LiveTimer startTime={job.machining_started_at} accumulated={job.machining_duration_seconds} />
                        </div>
                      )}
                      {(job.status === 'completed' || job.status === 'inspection') && job.machining_duration_seconds > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                          <Check size={12} /> {formatDuration(job.machining_duration_seconds)}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--color-border)', fontSize: '11px' }}>
                        <span style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>
                          <User size={12} />
                          {job.worker ? job.worker.name.split(' ')[0] : <em style={{ color: 'var(--color-danger)' }}>Unassigned</em>}
                        </span>
                        <span style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>
                          <Cpu size={12} />
                          {job.machine ? job.machine.machine_code : <em style={{ color: 'var(--color-danger)' }}>Unassigned</em>}
                        </span>
                      </div>
                    </div>
                  ))}
                  {columnJobs.length === 0 && (
                    <div style={{
                      flexGrow: 1,
                      border: '2px dashed var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-text-light)',
                      fontSize: '11px',
                      padding: '40px 20px',
                      textAlign: 'center',
                      minHeight: '100px'
                    }}>
                      No Job Cards
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── Job Details Drawer ── */}
      {viewingJob && (
        <>
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 }}
            onClick={() => setViewingJob(null)}
          />
          <div
            className="animate-slide-in-right"
            style={{
              position: 'fixed', top: 0, right: 0, width: '450px', height: '100vh',
              backgroundColor: '#ffffff', zIndex: 1000, boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
              display: 'flex', flexDirection: 'column', overflowY: 'auto'
            }}
          >
            <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '4px' }}>{viewingJob.job_card_number}</h2>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>PO: {viewingJob.po_item?.purchase_order?.po_number}</div>
              </div>
              <button onClick={() => setViewingJob(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} color="var(--color-text-muted)" />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              <div style={{ backgroundColor: 'var(--color-bg-base)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Part Details</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-main)', marginBottom: '4px' }}>{viewingJob.po_item?.description || 'N/A'}</div>
                <div style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: '700' }}>Target Qty: {viewingJob.quantity} {viewingJob.po_item?.unit || 'PC'}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#166534', textTransform: 'uppercase', marginBottom: '4px' }}>Operator</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#14532d' }}>{viewingJob.worker?.name || 'Unassigned'}</div>
                </div>
                <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#1e40af', textTransform: 'uppercase', marginBottom: '4px' }}>Machine</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e3a8a' }}>{viewingJob.machine?.machine_code || 'Unassigned'}</div>
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Production Timer</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: viewingJob.status === 'in_progress' ? '#2563eb' : 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace' }}>
                    <Clock size={20} />
                    <LiveTimer startTime={viewingJob.status === 'in_progress' ? viewingJob.machining_started_at : null} accumulated={viewingJob.machining_duration_seconds} />
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '20px', backgroundColor: viewingJob.status === 'in_progress' ? '#dbeafe' : '#f1f5f9', color: viewingJob.status === 'in_progress' ? '#1e40af' : '#475569' }}>
                    {viewingJob.status === 'in_progress' ? 'Running' : 'Stopped'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleEditJob(viewingJob)}
                className="form-button"
                style={{ width: '100%', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: 'var(--color-primary)', fontSize: '14px' }}
              >
                <Plus size={16} /> Open Full Execution View
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
