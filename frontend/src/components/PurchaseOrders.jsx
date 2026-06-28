import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FileText, 
  RefreshCw, 
  Wrench, 
  Calendar, 
  User, 
  Mail, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Check, 
  Eye, 
  ArrowLeft, 
  CheckCircle2, 
  Loader2, 
  ExternalLink,
  Pencil,
  Printer,
  Download,
  Copy,
  Zap,
  X,
  Save,
  ClipboardList,
  MessageSquare,
  Maximize2
} from 'lucide-react';
import { useRealTime } from '../hooks/useRealTime';

function renderWorkProgress(po) {
  const total = parseFloat(po.total_qty) || 0;
  if (total === 0) return <span style={{ color: 'var(--color-text-light)', fontSize: '12px' }}>Not Started</span>;

  const completed = parseFloat(po.completed_qty) || 0;
  const inspection = parseFloat(po.jobs_status_breakdown?.inspection) || 0;
  const inProgress = parseFloat(po.jobs_status_breakdown?.in_progress) || 0;
  const pending = parseFloat(po.jobs_status_breakdown?.pending) || 0;
  
  const totalInJobs = completed + inspection + inProgress + pending;
  const unassigned = Math.max(0, total - totalInJobs);

  const compPct = (completed / total) * 100;
  const inspPct = (inspection / total) * 100;
  const progPct = (inProgress / total) * 100;
  const pendPct = (pending / total) * 100;
  const unasPct = (unassigned / total) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', maxWidth: '200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '500' }}>
        <span style={{ color: 'var(--color-success)', fontWeight: '600' }}>
          {Math.round((completed / total) * 100)}% Complete
        </span>
        <span style={{ color: 'var(--color-text-muted)' }}>
          {completed}/{total} Pcs
        </span>
      </div>
      
      <div style={{
        display: 'flex',
        height: '8px',
        width: '100%',
        backgroundColor: '#e2e8f0',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        {compPct > 0 && <div title={`Completed: ${completed} pcs`} style={{ width: `${compPct}%`, backgroundColor: 'var(--color-success)', height: '100%' }} />}
        {inspPct > 0 && <div title={`Inspection: ${inspection} pcs`} style={{ width: `${inspPct}%`, backgroundColor: '#8b5cf6', height: '100%' }} />}
        {progPct > 0 && <div title={`In Progress: ${inProgress} pcs`} style={{ width: `${progPct}%`, backgroundColor: 'var(--color-primary)', height: '100%' }} />}
        {pendPct > 0 && <div title={`Pending: ${pending} pcs`} style={{ width: `${pendPct}%`, backgroundColor: 'var(--color-warning)', height: '100%' }} />}
        {unasPct > 0 && <div title={`Not Received: ${unassigned.toFixed(2)} pcs`} style={{ width: `${unasPct}%`, backgroundColor: '#cbd5e1', height: '100%' }} />}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '9px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
        {completed > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />{completed} done</span>}
        {inspection > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#8b5cf6' }} />{inspection} QC</span>}
        {inProgress > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />{inProgress} run</span>}
        {pending > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--color-warning)' }} />{pending} wait</span>}
      </div>
    </div>
  );
}

function renderDeliveryProgress(po) {
  const total = parseFloat(po.total_qty) || 0;
  if (total === 0) return <span style={{ color: 'var(--color-text-light)', fontSize: '12px' }}>Not Started</span>;

  const delivered = parseFloat(po.delivered_qty) || 0;
  const delPct = Math.min(100, (delivered / total) * 100);

  let badgeColor = 'var(--color-text-muted)';
  let badgeBg = '#f1f5f9';
  let borderStyle = '1px solid var(--color-border)';

  if (delivered === total) {
    badgeColor = 'var(--color-success)';
    badgeBg = 'var(--color-success-light)';
    borderStyle = '1px solid rgba(34,197,94,0.15)';
  } else if (delivered > 0) {
    badgeColor = 'var(--color-primary)';
    badgeBg = 'var(--color-primary-light)';
    borderStyle = '1px solid rgba(37,99,235,0.15)';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', maxWidth: '200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '500' }}>
        <span style={{ 
          padding: '2px 6px', 
          fontSize: '9px', 
          borderRadius: '8px', 
          backgroundColor: badgeBg, 
          color: badgeColor, 
          fontWeight: '600',
          border: borderStyle
        }}>
          {delivered === total ? 'Fully Shipped' : delivered > 0 ? 'Partially Shipped' : 'Not Shipped'}
        </span>
        <span style={{ color: 'var(--color-text-muted)' }}>
          {delivered}/{total} Pcs
        </span>
      </div>

      <div style={{
        height: '8px',
        width: '100%',
        backgroundColor: '#e2e8f0',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${delPct}%`,
          backgroundColor: delivered === total ? 'var(--color-success)' : 'var(--color-primary)',
          height: '100%',
          transition: 'width 0.3s'
        }} />
      </div>
    </div>
  );
}

function renderItemWorkProgress(item) {
  const total = parseFloat(item.quantity) || 0;
  if (total === 0) return <span style={{ color: 'var(--color-text-light)' }}>-</span>;

  const completed = parseFloat(item.completed_qty) || 0;
  const inspection = parseFloat(item.jobs_status_breakdown?.inspection) || 0;
  const inProgress = parseFloat(item.jobs_status_breakdown?.in_progress) || 0;
  const pending = parseFloat(item.jobs_status_breakdown?.pending) || 0;
  
  const totalInJobs = completed + inspection + inProgress + pending;
  const unassigned = Math.max(0, total - totalInJobs);

  const compPct = (completed / total) * 100;
  const inspPct = (inspection / total) * 100;
  const progPct = (inProgress / total) * 100;
  const pendPct = (pending / total) * 100;
  const unasPct = (unassigned / total) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%', minWidth: '120px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
        <span style={{ color: 'var(--color-success)', fontWeight: '600' }}>
          {Math.round((completed / total) * 100)}%
        </span>
        <span style={{ color: 'var(--color-text-muted)' }}>
          {completed}/{total} {item.unit || 'Pcs'}
        </span>
      </div>
      
      <div style={{
        display: 'flex',
        height: '6px',
        width: '100%',
        backgroundColor: '#e2e8f0',
        borderRadius: '3px',
        overflow: 'hidden'
      }}>
        {compPct > 0 && <div title={`Completed: ${completed}`} style={{ width: `${compPct}%`, backgroundColor: 'var(--color-success)' }} />}
        {inspPct > 0 && <div title={`Inspection: ${inspection}`} style={{ width: `${inspPct}%`, backgroundColor: '#8b5cf6' }} />}
        {progPct > 0 && <div title={`In Progress: ${inProgress}`} style={{ width: `${progPct}%`, backgroundColor: 'var(--color-primary)' }} />}
        {pendPct > 0 && <div title={`Pending: ${pending}`} style={{ width: `${pendPct}%`, backgroundColor: 'var(--color-warning)' }} />}
        {unasPct > 0 && <div title={`Not Received: ${unassigned.toFixed(2)}`} style={{ width: `${unasPct}%`, backgroundColor: '#cbd5e1' }} />}
      </div>
      
      <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', display: 'flex', gap: '4px', flexWrap: 'wrap', lineHeight: 1.1 }}>
        {completed > 0 && <span style={{ color: 'var(--color-success)' }}>{completed} done</span>}
        {inspection > 0 && <span style={{ color: '#8b5cf6' }}>{inspection} QC</span>}
        {inProgress > 0 && <span style={{ color: 'var(--color-primary)' }}>{inProgress} run</span>}
        {pending > 0 && <span style={{ color: 'var(--color-warning)' }}>{pending} wait</span>}
      </div>
    </div>
  );
}

function renderItemDeliveryProgress(item) {
  const total = parseFloat(item.quantity) || 0;
  if (total === 0) return <span style={{ color: 'var(--color-text-light)' }}>-</span>;

  const delivered = parseFloat(item.delivered_qty) || 0;
  const delPct = Math.min(100, (delivered / total) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%', minWidth: '120px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
        <span style={{ 
          color: delivered === total ? 'var(--color-success)' : delivered > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)', 
          fontWeight: '600' 
        }}>
          {delivered === total ? 'Shipped' : delivered > 0 ? 'Partial' : 'Pending'}
        </span>
        <span style={{ color: 'var(--color-text-muted)' }}>
          {delivered}/{total} {item.unit || 'Pcs'}
        </span>
      </div>
      
      <div style={{
        height: '6px',
        width: '100%',
        backgroundColor: '#e2e8f0',
        borderRadius: '3px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${delPct}%`,
          backgroundColor: delivered === total ? 'var(--color-success)' : 'var(--color-primary)',
          height: '100%'
        }} />
      </div>
    </div>
  );
}

const trimText = (str) => (str || '').trim();

const getItemDiffClass = (val1, val2) => {
  return trimText(val1) !== trimText(val2) ? { backgroundColor: '#fef3c7', padding: '2px 4px', borderRadius: '4px', border: '1px solid #f59e0b' } : {};
};

function getAuditLogDiff(log) {
  const diffs = [];
  const orig = log.original_version;
  const rev = log.revised_version;
  if (!orig || !rev) return diffs;

  if (trimText(orig.po_date) !== trimText(rev.po_date)) {
    diffs.push(`PO Date changed from ${orig.po_date || 'N/A'} to ${rev.po_date || 'N/A'}`);
  }
  if (trimText(orig.customer_name) !== trimText(rev.customer_name)) {
    diffs.push(`Customer Name changed from "${orig.customer_name}" to "${rev.customer_name}"`);
  }
  if (trimText(orig.customer_email) !== trimText(rev.customer_email)) {
    diffs.push(`Customer Email changed from "${orig.customer_email || 'N/A'}" to "${rev.customer_email || 'N/A'}"`);
  }
  if (trimText(orig.customer_gstin) !== trimText(rev.customer_gstin)) {
    diffs.push(`Customer GSTIN changed from "${orig.customer_gstin || 'N/A'}" to "${rev.customer_gstin || 'N/A'}"`);
  }

  const origItems = orig.items || [];
  const revItems = rev.items || [];

  if (origItems.length !== revItems.length) {
    diffs.push(`Items count changed from ${origItems.length} to ${revItems.length}`);
  } else {
    origItems.forEach((oItem, idx) => {
      const rItem = revItems[idx];
      if (!rItem) return;

      const itemDesc = rItem.description || `Item #${idx + 1}`;
      if (trimText(oItem.description) !== trimText(rItem.description)) {
        diffs.push(`[Item #${idx + 1}] Description changed`);
      }
      if (parseFloat(oItem.quantity) !== parseFloat(rItem.quantity)) {
        diffs.push(`[${itemDesc}] Qty changed from ${oItem.quantity} to ${rItem.quantity}`);
      }
      if (parseFloat(oItem.rate) !== parseFloat(rItem.rate)) {
        diffs.push(`[${itemDesc}] Rate changed from ₹${oItem.rate} to ₹${rItem.rate}`);
      }
    });
  }

  return diffs;
}

export default function PurchaseOrders() {
  const location = useLocation();
  const navigate = useNavigate();
  const printRef = useRef(null);
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [filter, setFilter] = useState('draft_review');
  const [feedback, setFeedback] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState('');

  // Splitscreen Editor State
  const [selectedPo, setSelectedPo] = useState(null);
  const [editingPo, setEditingPo] = useState(null);
  const [approving, setApproving] = useState(false);
  const [isLineItemsMaximized, setIsLineItemsMaximized] = useState(false);

  // Edit mode for approved POs
  const [isEditing, setIsEditing] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // Create Jobs workflow
  const [jobsDialogOpen, setJobsDialogOpen] = useState(false);
  const [jobsCreating, setJobsCreating] = useState(false);
  const [challanInfo, setChallanInfo] = useState(null);
  const [challanChecking, setChallanChecking] = useState(false);
  const [jobItemIds, setJobItemIds] = useState([]);
  const [challanOption, setChallanOption] = useState('none');
  const [challanNumber, setChallanNumber] = useState('');
  const [challanDate, setChallanDate] = useState('');
  const [existingChallanId, setExistingChallanId] = useState('');
  const [allChallans, setAllChallans] = useState([]);

  // Duplicate
  const [duplicating, setDuplicating] = useState(false);

  // Revision & Audit Log States
  const [revisions, setRevisions] = useState([]);
  const [selectedRevision, setSelectedRevision] = useState(null);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activePoTab, setActivePoTab] = useState('details');


  const fetchPos = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/purchase-orders');
      setPos(response.data);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to load purchase orders.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchRevisions = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/purchase-orders/revisions');
      setRevisions(response.data);
    } catch (err) {
      console.error('Failed to load purchase order revisions:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/settings');
      if (response.data && response.data.po_last_fetch_at) {
        setLastFetchTime(response.data.po_last_fetch_at);
      }
    } catch (err) {
      console.error('Failed to load last fetch time:', err);
    }
  };

  useEffect(() => {
    fetchPos();
    fetchRevisions();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (location.state && location.state.viewPoId) {
      handleOpenReview(location.state.viewPoId);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useRealTime('purchase_orders', () => {
    fetchPos();
    fetchRevisions();
  });

  const handleFetchEmails = async () => {
    setFetching(true);
    setFeedback(null);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/purchase-orders/fetch');
      setFeedback({ type: 'success', message: response.data.message });
      if (response.data && response.data.last_fetch_at) {
        setLastFetchTime(response.data.last_fetch_at);
      }
      fetchPos(); // reload
      fetchRevisions(); // reload revisions
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to check emails.' });
    } finally {
      setFetching(false);
    }
  };

  const handleOpenReview = async (poId) => {
    setLoading(true);
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/purchase-orders/${poId}`);
      setSelectedPo(response.data);
      setEditingPo({
        ...response.data,
        po_date: response.data.po_date || new Date().toISOString().split('T')[0],
      });

      // Fetch Audit Logs
      const logsResponse = await axios.get(`http://127.0.0.1:8000/api/purchase-orders/${poId}/audit-logs`);
      setAuditLogs(logsResponse.data);
      setActivePoTab('details');
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to retrieve PO details.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseReview = () => {
    setSelectedPo(null);
    setEditingPo(null);
    setFeedback(null);
    setAuditLogs([]);
    setActivePoTab('details');
    setIsEditing(false);
    setChallanInfo(null);
    setJobsDialogOpen(false);
    setJobItemIds([]);
    setChallanOption('none');
    setChallanNumber('');
    setChallanDate('');
    setExistingChallanId('');
    setAllChallans([]);
  };

  const handleEditSave = async () => {
    if (!editingPo.po_number?.trim()) {
      setFeedback({ type: 'danger', message: 'PO Number is required.' });
      return;
    }
    if (!editingPo.customer_name?.trim()) {
      setFeedback({ type: 'danger', message: 'Customer Name is required.' });
      return;
    }
    setEditSaving(true);
    setFeedback(null);
    try {
      const response = await axios.put(`http://127.0.0.1:8000/api/purchase-orders/${editingPo.id}`, editingPo);
      setFeedback({ type: 'success', message: response.data.message });
      const refreshed = response.data.po;
      setSelectedPo(refreshed);
      setEditingPo(refreshed);
      setIsEditing(false);
      // Refresh audit logs
      const logsRes = await axios.get(`http://127.0.0.1:8000/api/purchase-orders/${editingPo.id}/audit-logs`);
      setAuditLogs(logsRes.data);
      fetchPos();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to save changes.' });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!window.confirm(`Duplicate Purchase Order "${selectedPo.po_number}"? A new draft copy will be created.`)) return;
    setDuplicating(true);
    setFeedback(null);
    try {
      const response = await axios.post(`http://127.0.0.1:8000/api/purchase-orders/${selectedPo.id}/duplicate`);
      setFeedback({ type: 'success', message: response.data.message });
      fetchPos();
      setTimeout(() => {
        handleCloseReview();
        setFilter('draft_review');
      }, 1500);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to duplicate PO.' });
    } finally {
      setDuplicating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    // Scenario A: original PDF from email exists
    if (editingPo?.pdf_path) {
      const url = `http://127.0.0.1:8000/${editingPo.pdf_path}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = editingPo.pdf_path.split('/').pop();
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    // Scenario B: generate PDF from system data via print dialog
    window.print();
  };

  const handleCreateJobsClick = async () => {
    setChallanChecking(true);
    setChallanInfo(null);
    setFeedback(null);
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/purchase-orders/${selectedPo.id}/incoming-challan`);
      setChallanInfo(response.data);
      if (response.data.jobs_info.all_done) {
        setFeedback({ type: 'danger', message: 'All items in this Purchase Order already have Job Cards. No new jobs to create.' });
        return;
      }

      // Initialize selected items (only items that don't have job cards yet)
      const initialSelected = [];
      selectedPo.items.forEach(item => {
        const hasJob = (item.job_cards && item.job_cards.length > 0) || 
                       (item.jobCards && item.jobCards.length > 0) ||
                       (item.jobs_status_breakdown && 
                        (item.jobs_status_breakdown.pending > 0 || 
                         item.jobs_status_breakdown.in_progress > 0 || 
                         item.jobs_status_breakdown.inspection > 0 || 
                         item.jobs_status_breakdown.completed > 0));
        if (!hasJob) {
          initialSelected.push(item.id);
        }
      });
      setJobItemIds(initialSelected);

      // Pre-fill challan options
      if (response.data.has_incoming_challan && response.data.challan) {
        setChallanOption('existing');
        setExistingChallanId(response.data.challan.id);
      } else {
        setChallanOption('none');
        setExistingChallanId('');
      }

      setChallanNumber('');
      setChallanDate(new Date().toISOString().split('T')[0]);

      // Fetch all incoming challans to populate the "existing" dropdown
      try {
        const challanListRes = await axios.get('http://127.0.0.1:8000/api/incoming-challans');
        setAllChallans(challanListRes.data || []);
      } catch (err) {
        console.error('Failed to load all challans', err);
        setAllChallans([]);
      }

      setJobsDialogOpen(true);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to check challan linkage.' });
    } finally {
      setChallanChecking(false);
    }
  };

  const doConvertJobs = async () => {
    if (jobItemIds.length === 0) {
      alert("Please select at least one item to convert.");
      return;
    }
    if (challanOption === 'new' && !challanNumber.trim()) {
      alert("Please enter a Challan Number.");
      return;
    }
    if (challanOption === 'existing' && !existingChallanId) {
      alert("Please select an existing Challan.");
      return;
    }

    setJobsCreating(true);
    setFeedback(null);
    try {
      const response = await axios.post(`http://127.0.0.1:8000/api/purchase-orders/${selectedPo.id}/convert-jobs`, {
        po_item_ids: jobItemIds,
        challan_option: challanOption,
        challan_number: challanNumber,
        challan_date: challanDate,
        incoming_challan_id: existingChallanId
      });
      setFeedback({ type: 'success', message: response.data.message });
      setJobsDialogOpen(false);

      // Reset dialog states
      setJobItemIds([]);
      setChallanOption('none');
      setChallanNumber('');
      setChallanDate('');
      setExistingChallanId('');
      setAllChallans([]);

      // Refresh PO data
      const poRes = await axios.get(`http://127.0.0.1:8000/api/purchase-orders/${selectedPo.id}`);
      setSelectedPo(poRes.data);
      setEditingPo(poRes.data);
      fetchPos();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to create jobs.' });
    } finally {
      setJobsCreating(false);
    }
  };

  const handleOpenCompare = async (revisionId) => {
    setLoading(true);
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/purchase-orders/revisions/${revisionId}`);
      setSelectedRevision(response.data);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to load revision comparison.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRevisionAction = async (action) => {
    if (!selectedRevision) return;
    setSubmittingAction(true);
    setFeedback(null);
    try {
      const response = await axios.post(
        `http://127.0.0.1:8000/api/purchase-orders/revisions/${selectedRevision.revision.id}/action`,
        { action }
      );
      setFeedback({ type: 'success', message: response.data.message });
      setSelectedRevision(null);
      fetchPos();
      fetchRevisions();
    } catch (err) {
      console.error(err);
      setFeedback({ 
        type: 'danger', 
        message: err.response?.data?.message || 'Failed to process revision action.' 
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  // Editor Actions
  const handlePoFieldChange = (field, value) => {
    setEditingPo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemFieldChange = (index, field, value) => {
    setEditingPo(prev => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        [field]: value
      };
      
      // Auto calculate total (inclusive of CGST, SGST, IGST)
      if (['quantity', 'rate', 'cgst', 'sgst', 'igst'].includes(field)) {
        const qty = parseFloat(newItems[index].quantity) || 0;
        const rate = parseFloat(newItems[index].rate) || 0;
        const cgst = parseFloat(newItems[index].cgst) || 0;
        const sgst = parseFloat(newItems[index].sgst) || 0;
        const igst = parseFloat(newItems[index].igst) || 0;
        
        const taxable = qty * rate;
        const taxRate = (cgst + sgst + igst) / 100;
        newItems[index].total_amount = (taxable * (1 + taxRate)).toFixed(2);
      }
      
      return {
        ...prev,
        items: newItems
      };
    });
  };

  const handleAddItemRow = () => {
    setEditingPo(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { 
          item_code: '', 
          description: '', 
          delivery_date: prev.po_date || new Date().toISOString().split('T')[0], 
          hsn_sac: '', 
          uqc: 'PC', 
          quantity: 1, 
          unit: 'PC', 
          rate: 0, 
          cgst: 0, 
          sgst: 0, 
          igst: 0, 
          total_amount: 0 
        }
      ]
    }));
  };

  const handleDeleteItemRow = (index) => {
    if (editingPo.items.length <= 1) {
      alert('POs must contain at least one item line.');
      return;
    }
    setEditingPo(prev => {
      const newItems = prev.items.filter((_, i) => i !== index);
      return {
        ...prev,
        items: newItems
      };
    });
  };

  const handleApprovePo = async (e) => {
    e.preventDefault();
    setApproving(true);
    setFeedback(null);

    try {
      const response = await axios.post(`http://127.0.0.1:8000/api/purchase-orders/${editingPo.id}/approve`, editingPo);
      setFeedback({ type: 'success', message: response.data.message });
      
      // Close editor and refresh list
      setTimeout(() => {
        handleCloseReview();
        fetchPos();
      }, 1000);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Verification failed. Please review inputs.';
      setFeedback({ type: 'danger', message: msg });
      setApproving(false);
    }
  };

  const handleCreateManualPo = () => {
    const newPo = {
      id: 'new',
      status: 'draft_review',
      po_number: '',
      po_date: new Date().toISOString().split('T')[0],
      customer_name: '',
      customer_email: '',
      customer_address: '',
      customer_gstin: '',
      items: [
        {
          item_code: '',
          description: '',
          delivery_date: new Date().toISOString().split('T')[0],
          hsn_sac: '',
          uqc: 'PC',
          quantity: 1,
          unit: 'Pcs',
          rate: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          total_amount: 0
        }
      ]
    };
    setSelectedPo(newPo);
    setEditingPo(newPo);
    setAuditLogs([]);
    setActivePoTab('details');
  };

  const handleSaveManualPo = async (e, status) => {
    e.preventDefault();
    if (!editingPo.po_number.trim()) {
      alert('PO Number is required.');
      return;
    }
    if (!editingPo.customer_name.trim()) {
      alert('Customer Name is required.');
      return;
    }
    if (!editingPo.items || editingPo.items.length === 0) {
      alert('PO must contain at least one item.');
      return;
    }
    
    for (let i = 0; i < editingPo.items.length; i++) {
      const it = editingPo.items[i];
      if (!it.description.trim()) {
        alert(`Item #${i + 1} description is required.`);
        return;
      }
      if (parseFloat(it.quantity) <= 0) {
        alert(`Item #${i + 1} quantity must be greater than 0.`);
        return;
      }
    }

    setApproving(true);
    setFeedback(null);

    try {
      const payload = {
        ...editingPo,
        status: status
      };
      const response = await axios.post(`http://127.0.0.1:8000/api/purchase-orders`, payload);
      setFeedback({ type: 'success', message: response.data.message });
      
      setTimeout(() => {
        handleCloseReview();
        fetchPos();
      }, 1000);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to create Purchase Order. Please check duplicate PO Number or inputs.';
      setFeedback({ type: 'danger', message: msg });
      setApproving(false);
    }
  };

  // Get status label styling
  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft_review':
        return <span style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '12px', backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning)', fontWeight: '600', border: '1px solid rgba(245,158,11,0.15)' }}>Pending Review</span>;
      case 'approved':
        return <span style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '12px', backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)', fontWeight: '600', border: '1px solid rgba(34,197,94,0.15)' }}>Approved</span>;
      default:
        return <span style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '12px', backgroundColor: '#e2e8f0', color: 'var(--color-text-muted)', fontWeight: '600' }}>{status}</span>;
    }
  };

  // Calculated PO total
  const getEditingPoTotal = () => {
    if (!editingPo?.items) return 0;
    return editingPo.items.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0).toFixed(2);
  };

  // Layout revision comparison render
  if (selectedRevision) {
    const revision = selectedRevision.revision;
    const existingPo = selectedRevision.existing_po;
    const stats = selectedRevision.existing_stats;
    const existingItems = existingPo?.items || [];
    const revisedItems = revision.extracted_data?.items || [];
    const maxItems = Math.max(existingItems.length, revisedItems.length);

    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 'calc(100vh - 120px)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="logout-btn" onClick={() => setSelectedRevision(null)} style={{ padding: '6px 12px' }}>
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#d97706' }}>Resolve Purchase Order Revision</h2>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Compare the existing PO in the database against the newly fetched email revision.
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => handleRevisionAction('ignore')}
              disabled={submittingAction}
              className="logout-btn"
              style={{
                backgroundColor: '#f1f5f9',
                color: 'var(--color-text-main)',
                border: '1px solid var(--color-border)',
                padding: '0 16px',
                height: '38px',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Ignore / Archive Revision
            </button>
            <button
              onClick={() => handleRevisionAction('save_as_revision')}
              disabled={submittingAction}
              className="form-button"
              style={{
                width: 'auto',
                marginTop: 0,
                backgroundColor: 'var(--color-primary)',
                color: '#ffffff',
                border: 'none',
                padding: '0 16px',
                height: '38px',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Save As Revision PO
            </button>
            <button
              onClick={() => handleRevisionAction('update_existing')}
              disabled={submittingAction}
              className="form-button"
              style={{
                width: 'auto',
                marginTop: 0,
                backgroundColor: 'var(--color-success)',
                color: '#ffffff',
                border: 'none',
                padding: '0 16px',
                height: '38px',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Update Existing PO
            </button>
          </div>
        </div>

        {/* Existing PO Execution Info */}
        {stats && (
          <div style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fef3c7',
            borderRadius: '8px',
            padding: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr) repeat(3, 1fr)',
            gap: '12px',
            fontSize: '13px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div><span style={{ color: '#92400e', fontWeight: '500' }}>Current Status:</span> <strong style={{ color: 'var(--color-primary)' }}>{stats.status}</strong></div>
            <div><span style={{ color: '#92400e', fontWeight: '500' }}>Created Date:</span> <strong>{new Date(stats.created_at).toLocaleDateString()}</strong></div>
            <div><span style={{ color: '#92400e', fontWeight: '500' }}>Customer:</span> <strong>{stats.customer_name}</strong></div>
            <div><span style={{ color: '#92400e', fontWeight: '500' }}>Jobs Created:</span> <strong>{stats.jobs_count}</strong></div>
            <div><span style={{ color: '#92400e', fontWeight: '500' }}>Delivery Status:</span> <strong>{stats.delivery_status}</strong></div>
            <div><span style={{ color: '#92400e', fontWeight: '500' }}>Invoice Status:</span> <strong>{stats.invoice_status}</strong></div>
          </div>
        )}

        {/* Side by side viewer */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', flexGrow: 1 }}>
          <div className="card" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Metadata Comparison */}
            <div>
              <h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)', marginBottom: '12px' }}>
                Header Metadata Differences
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '2px solid var(--color-border)' }}>
                    <th style={{ padding: '8px', textAlign: 'left', width: '30%' }}>Field</th>
                    <th style={{ padding: '8px', textAlign: 'left', width: '35%' }}>Existing PO</th>
                    <th style={{ padding: '8px', textAlign: 'left', width: '35%' }}>Incoming Revision</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px', fontWeight: '500' }}>PO Number</td>
                    <td style={{ padding: '8px' }}>{existingPo?.po_number}</td>
                    <td style={{ padding: '8px', ...getItemDiffClass(existingPo?.po_number, revision?.po_number) }}>{revision?.po_number}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px', fontWeight: '500' }}>PO Date</td>
                    <td style={{ padding: '8px' }}>{existingPo?.po_date}</td>
                    <td style={{ padding: '8px', ...getItemDiffClass(existingPo?.po_date, revision?.po_date) }}>{revision?.po_date}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px', fontWeight: '500' }}>Customer Name</td>
                    <td style={{ padding: '8px' }}>{existingPo?.customer_name}</td>
                    <td style={{ padding: '8px', ...getItemDiffClass(existingPo?.customer_name, revision?.customer_name) }}>{revision?.customer_name}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px', fontWeight: '500' }}>Customer Email</td>
                    <td style={{ padding: '8px' }}>{existingPo?.customer_email || 'N/A'}</td>
                    <td style={{ padding: '8px', ...getItemDiffClass(existingPo?.customer_email, revision?.customer_email) }}>{revision?.customer_email || 'N/A'}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px', fontWeight: '500' }}>Customer GSTIN</td>
                    <td style={{ padding: '8px' }}>{existingPo?.customer_gstin || 'N/A'}</td>
                    <td style={{ padding: '8px', ...getItemDiffClass(existingPo?.customer_gstin, revision?.extracted_data?.customer_gstin) }}>{revision?.extracted_data?.customer_gstin || 'N/A'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Line Items Comparison */}
            <div>
              <h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)', marginBottom: '12px' }}>
                PO Line Items Comparison
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Array.from({ length: maxItems }).map((_, idx) => {
                  const eItem = existingItems[idx];
                  const rItem = revisedItems[idx];

                  // Determine state
                  let statusText = 'Identical';
                  let cardBorder = '1px solid var(--color-border)';
                  let headerBg = 'var(--color-bg-base)';
                  let headerColor = 'var(--color-text-main)';

                  if (!eItem) {
                    statusText = 'Added';
                    cardBorder = '1px solid #c2e7cc';
                    headerBg = '#e6f4ea';
                    headerColor = '#137333';
                  } else if (!rItem) {
                    statusText = 'Removed';
                    cardBorder = '1px solid #fad2cf';
                    headerBg = '#fce8e6';
                    headerColor = '#c5221f';
                  } else {
                    const descDiff = trimText(eItem.description) !== trimText(rItem.description);
                    const qtyDiff = parseFloat(eItem.quantity) !== parseFloat(rItem.quantity);
                    const rateDiff = parseFloat(eItem.rate) !== parseFloat(rItem.rate);
                    const totalDiff = parseFloat(eItem.total_amount) !== parseFloat(rItem.total_amount);

                    if (descDiff || qtyDiff || rateDiff || totalDiff) {
                      statusText = 'Modified';
                      cardBorder = '1px solid #ffe8cc';
                      headerBg = '#fff8eb';
                      headerColor = '#b45309';
                    }
                  }

                  return (
                    <div key={idx} style={{ border: cardBorder, borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: headerBg, color: headerColor, fontWeight: '600', fontSize: '12px' }}>
                        <span>Item Line #{idx + 1}</span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          backgroundColor: '#ffffff',
                          border: '1px solid currentColor',
                          textTransform: 'uppercase'
                        }}>{statusText}</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', backgroundColor: 'var(--color-border)' }}>
                        {/* Existing Item details */}
                        <div style={{ backgroundColor: '#ffffff', padding: '12px', fontSize: '12px', opacity: eItem ? 1 : 0.5 }}>
                          <strong style={{ color: 'var(--color-text-muted)', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Existing Details</strong>
                          {eItem ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div><strong>Code:</strong> {eItem.item_code || 'N/A'}</div>
                              <div><strong>Desc:</strong> {eItem.description}</div>
                              <div><strong>Qty:</strong> {eItem.quantity} {eItem.unit}</div>
                              <div><strong>Rate:</strong> ₹{eItem.rate}</div>
                              <div><strong>Total:</strong> ₹{eItem.total_amount}</div>
                            </div>
                          ) : (
                            <span style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>Row did not exist.</span>
                          )}
                        </div>

                        {/* Revised Item details */}
                        <div style={{ backgroundColor: '#ffffff', padding: '12px', fontSize: '12px', opacity: rItem ? 1 : 0.5 }}>
                          <strong style={{ color: 'var(--color-text-muted)', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Revised Details</strong>
                          {rItem ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div>
                                <strong>Code:</strong>{' '}
                                <span style={eItem && eItem.item_code !== rItem.item_code ? { backgroundColor: '#fef3c7', padding: '1px 3px', borderRadius: '3px' } : {}}>
                                  {rItem.item_code || 'N/A'}
                                </span>
                              </div>
                              <div>
                                <strong>Desc:</strong>{' '}
                                <span style={eItem && trimText(eItem.description) !== trimText(rItem.description) ? { backgroundColor: '#fef3c7', padding: '1px 3px', borderRadius: '3px' } : {}}>
                                  {rItem.description}
                                </span>
                              </div>
                              <div>
                                <strong>Qty:</strong>{' '}
                                <span style={eItem && parseFloat(eItem.quantity) !== parseFloat(rItem.quantity) ? { backgroundColor: '#fef3c7', padding: '1px 3px', borderRadius: '3px' } : {}}>
                                  {rItem.quantity} {rItem.unit}
                                </span>
                              </div>
                              <div>
                                <strong>Rate:</strong>{' '}
                                <span style={eItem && parseFloat(eItem.rate) !== parseFloat(rItem.rate) ? { backgroundColor: '#fef3c7', padding: '1px 3px', borderRadius: '3px' } : {}}>
                                  ₹{rItem.rate}
                                </span>
                              </div>
                              <div>
                                <strong>Total:</strong>{' '}
                                <span style={eItem && parseFloat(eItem.total_amount) !== parseFloat(rItem.total_amount) ? { backgroundColor: '#fef3c7', padding: '1px 3px', borderRadius: '3px' } : {}}>
                                  ₹{rItem.total_amount}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>Row deleted in revision.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Panel: Revision PDF Viewer */}
          <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: 'calc(100vh - 220px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} style={{ color: 'var(--color-danger)' }} />
                <span style={{ fontSize: '13px', fontWeight: '600', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {revision?.pdf_path ? revision.pdf_path.split('/').pop() : 'Revised PO Document'}
                </span>
              </div>
              {revision?.pdf_path && (
                <a 
                  href={`http://127.0.0.1:8000/${revision.pdf_path}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-primary)' }}
                >
                  Open in New Tab <ExternalLink size={12} />
                </a>
              )}
            </div>
            
            <div style={{ flexGrow: 1, backgroundColor: '#525659' }}>
              {revision?.pdf_path ? (
                <iframe 
                  src={`http://127.0.0.1:8000/${revision.pdf_path}`} 
                  width="100%" 
                  height="100%" 
                  style={{ border: 'none' }}
                  title="PDF PO Revision Viewer"
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ffffff', fontSize: '14px' }}>
                  No PDF attachment found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Layout splitscreen editor render
  if (selectedPo && editingPo) {
    const isNew = selectedPo.id === 'new';
    const canEdit = selectedPo.id === 'new' || isEditing || selectedPo.status === 'draft_review';
    
    const renderLineItemsGrid = (isModal = false) => (
      <div style={{ marginTop: isModal ? '0' : '10px', height: isModal ? '100%' : 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexShrink: 0 }}>
          <h4 style={{ fontSize: isModal ? '16px' : '13px', fontWeight: '700' }}>{isModal ? 'Fullscreen PO Line Items Grid' : 'PO Line Items Grid'}</h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            {canEdit && (
              <button 
                type="button" 
                className="logout-btn" 
                onClick={handleAddItemRow}
                style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
              >
                <Plus size={14} /> Add Item Row
              </button>
            )}
            {!isModal && (
              <button 
                type="button" 
                onClick={() => setIsLineItemsMaximized(true)}
                className="form-button" 
                style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', marginTop: 0, height: 'auto', backgroundColor: '#e2e8f0', color: '#0f172a' }}
              >
                <Maximize2 size={14} /> Maximize
              </button>
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto', flexGrow: 1, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-bg-base)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', minWidth: '1600px' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--color-bg-base)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '8px', minWidth: '120px' }}>Code / Drawing</th>
                <th style={{ padding: '8px', minWidth: '90px' }}>HSN/SAC</th>
                <th style={{ padding: '8px', minWidth: '220px' }}>Description</th>
                {selectedPo.status === 'approved' && (
                  <>
                    <th style={{ padding: '8px', minWidth: '130px' }}>Work Progress</th>
                    <th style={{ padding: '8px', minWidth: '130px' }}>Delivery Progress</th>
                  </>
                )}
                <th style={{ padding: '8px', minWidth: '80px' }}>Qty</th>
                <th style={{ padding: '8px', minWidth: '80px' }}>Unit</th>
                <th style={{ padding: '8px', minWidth: '80px' }}>UQC</th>
                <th style={{ padding: '8px', minWidth: '100px' }}>Rate (₹)</th>
                <th style={{ padding: '8px', minWidth: '70px' }}>CGST %</th>
                <th style={{ padding: '8px', minWidth: '70px' }}>SGST %</th>
                <th style={{ padding: '8px', minWidth: '70px' }}>IGST %</th>
                <th style={{ padding: '8px', minWidth: '100px', textAlign: 'right' }}>Total (₹)</th>
                <th style={{ padding: '8px', minWidth: '130px' }}>Delivery Date</th>
                <th style={{ padding: '8px', minWidth: '180px' }}>Item Remarks</th>
                <th style={{ padding: '8px', minWidth: '180px' }}>Mfg Notes</th>
                {canEdit && <th style={{ padding: '8px', width: '50px', textAlign: 'center' }}></th>}
              </tr>
            </thead>
            <tbody>
              {editingPo.items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: '#ffffff', transition: 'background-color 0.15s' }}>
                  <td style={{ padding: '6px' }}>
                    <input type="text" className="form-input" value={item.item_code || ''} onChange={(e) => handleItemFieldChange(idx, 'item_code', e.target.value)} disabled={!canEdit} style={{ width: '100%', padding: '6px', fontSize: '12px', fontFamily: 'monospace' }} />
                  </td>
                  <td style={{ padding: '6px' }}>
                    <input type="text" className="form-input" value={item.hsn_sac || ''} onChange={(e) => handleItemFieldChange(idx, 'hsn_sac', e.target.value)} disabled={!canEdit} style={{ width: '100%', padding: '6px', fontSize: '12px', fontFamily: 'monospace' }} />
                  </td>
                  <td style={{ padding: '6px' }}>
                    <textarea className="form-input" value={item.description || ''} onChange={(e) => handleItemFieldChange(idx, 'description', e.target.value)} disabled={!canEdit} style={{ width: '100%', padding: '6px', fontSize: '12px', resize: 'vertical', minHeight: '32px' }} rows={1} />
                  </td>
                  {selectedPo.status === 'approved' && (
                    <>
                      <td style={{ padding: '6px' }}>{renderItemWorkProgress(item)}</td>
                      <td style={{ padding: '6px' }}>{renderItemDeliveryProgress(item)}</td>
                    </>
                  )}
                  <td style={{ padding: '6px' }}>
                    <input type="number" step="0.01" className="form-input" value={item.quantity || ''} onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value)} disabled={!canEdit} style={{ width: '100%', padding: '6px', fontSize: '12px', textAlign: 'right' }} />
                  </td>
                  <td style={{ padding: '6px' }}>
                    <input type="text" className="form-input" value={item.unit || ''} onChange={(e) => handleItemFieldChange(idx, 'unit', e.target.value)} disabled={!canEdit} style={{ width: '100%', padding: '6px', fontSize: '12px' }} />
                  </td>
                  <td style={{ padding: '6px' }}>
                    <input type="text" className="form-input" value={item.uqc || ''} onChange={(e) => handleItemFieldChange(idx, 'uqc', e.target.value)} disabled={!canEdit} style={{ width: '100%', padding: '6px', fontSize: '12px' }} />
                  </td>
                  <td style={{ padding: '6px' }}>
                    <input type="number" step="0.01" className="form-input" value={item.rate || ''} onChange={(e) => handleItemFieldChange(idx, 'rate', e.target.value)} disabled={!canEdit} style={{ width: '100%', padding: '6px', fontSize: '12px', textAlign: 'right' }} />
                  </td>
                  <td style={{ padding: '6px' }}>
                    <input type="number" step="0.01" className="form-input" value={item.cgst || ''} onChange={(e) => handleItemFieldChange(idx, 'cgst', e.target.value)} disabled={!canEdit} style={{ width: '100%', padding: '6px', fontSize: '12px', textAlign: 'right' }} />
                  </td>
                  <td style={{ padding: '6px' }}>
                    <input type="number" step="0.01" className="form-input" value={item.sgst || ''} onChange={(e) => handleItemFieldChange(idx, 'sgst', e.target.value)} disabled={!canEdit} style={{ width: '100%', padding: '6px', fontSize: '12px', textAlign: 'right' }} />
                  </td>
                  <td style={{ padding: '6px' }}>
                    <input type="number" step="0.01" className="form-input" value={item.igst || ''} onChange={(e) => handleItemFieldChange(idx, 'igst', e.target.value)} disabled={!canEdit} style={{ width: '100%', padding: '6px', fontSize: '12px', textAlign: 'right' }} />
                  </td>
                  <td style={{ padding: '6px', fontSize: '12px', textAlign: 'right', fontWeight: '700', color: 'var(--color-text-main)' }}>
                    ₹{item.total_amount || 0}
                  </td>
                  <td style={{ padding: '6px' }}>
                    <input type="date" className="form-input" value={item.delivery_date || ''} onChange={(e) => handleItemFieldChange(idx, 'delivery_date', e.target.value)} disabled={!canEdit} style={{ width: '100%', padding: '6px', fontSize: '12px' }} />
                  </td>
                  <td style={{ padding: '6px' }}>
                    <textarea className="form-input" value={item.item_remarks || ''} onChange={(e) => handleItemFieldChange(idx, 'item_remarks', e.target.value)} disabled={!canEdit} style={{ width: '100%', padding: '6px', fontSize: '12px', resize: 'vertical', minHeight: '32px' }} rows={1} />
                  </td>
                  <td style={{ padding: '6px' }}>
                    <textarea className="form-input" value={item.manufacturing_notes || ''} onChange={(e) => handleItemFieldChange(idx, 'manufacturing_notes', e.target.value)} disabled={!canEdit} style={{ width: '100%', padding: '6px', fontSize: '12px', resize: 'vertical', minHeight: '32px' }} rows={1} />
                  </td>
                  {canEdit && (
                    <td style={{ padding: '6px', textAlign: 'center' }}>
                      <button type="button" onClick={() => handleDeleteItemRow(idx)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total Calculation Display */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingRight: '12px', flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginRight: '16px' }}>Total PO Value:</span>
            <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-text-main)' }}>₹{getEditingPoTotal()}</span>
          </div>
        </div>
      </div>
    );

    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 'calc(100vh - 120px)' }}>
        
        {/* ============================================================ */}
        {/* Create Jobs Dialog Modal */}
        {/* ============================================================ */}
        {jobsDialogOpen && challanInfo && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }}>
            <div style={{
              backgroundColor: 'var(--color-card-bg)',
              borderRadius: '16px',
              padding: '24px 32px',
              maxWidth: '560px',
              width: '95%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ backgroundColor: '#ede9fe', borderRadius: '12px', padding: '12px', flexShrink: 0 }}>
                  <Zap size={24} style={{ color: '#7c3aed' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 6px 0' }}>Create Job Cards</h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
                    Generate floor Job Cards for Purchase Order #{selectedPo.po_number}.
                  </p>
                </div>
              </div>

              {/* Step 1: Select Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>1. Select PO Items to Convert</span>
                  <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--color-text-muted)' }}>
                    ({jobItemIds.length} selected)
                  </span>
                </h4>
                
                <div style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  backgroundColor: 'var(--color-bg-light)'
                }}>
                  {selectedPo.items && selectedPo.items.map((item) => {
                    const hasJob = (item.job_cards && item.job_cards.length > 0) || 
                                   (item.jobCards && item.jobCards.length > 0) ||
                                   (item.jobs_status_breakdown && 
                                    (item.jobs_status_breakdown.pending > 0 || 
                                     item.jobs_status_breakdown.in_progress > 0 || 
                                     item.jobs_status_breakdown.inspection > 0 || 
                                     item.jobs_status_breakdown.completed > 0));
                    
                    const isChecked = jobItemIds.includes(item.id);
                    
                    return (
                      <div 
                        key={item.id} 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 12px',
                          borderBottom: '1px solid var(--color-border)',
                          backgroundColor: hasJob ? 'rgba(0,0,0,0.02)' : 'transparent',
                          opacity: hasJob ? 0.6 : 1
                        }}
                      >
                        <input
                          type="checkbox"
                          id={`po-item-chk-${item.id}`}
                          disabled={hasJob}
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setJobItemIds([...jobItemIds, item.id]);
                            } else {
                              setJobItemIds(jobItemIds.filter(id => id !== item.id));
                            }
                          }}
                          style={{
                            width: '16px',
                            height: '16px',
                            cursor: hasJob ? 'not-allowed' : 'pointer',
                            accentColor: '#7c3aed'
                          }}
                        />
                        <label 
                          htmlFor={`po-item-chk-${item.id}`} 
                          style={{
                            flex: 1,
                            fontSize: '13px',
                            cursor: hasJob ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <strong>{item.item_code || 'No Code'}</strong> - {item.description}
                          </div>
                          <div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                            {hasJob ? 'Job Already Created' : `${item.quantity} ${item.unit || 'Pcs'}`}
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Challan Association */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0' }}>2. Incoming Challan Linkage</h4>
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  backgroundColor: 'var(--color-bg-light)',
                  padding: '14px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)'
                }}>
                  {/* Option selector */}
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="challanOption"
                        value="none"
                        checked={challanOption === 'none'}
                        onChange={() => setChallanOption('none')}
                        style={{ accentColor: '#7c3aed' }}
                      />
                      No Challan
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="challanOption"
                        value="new"
                        checked={challanOption === 'new'}
                        onChange={() => setChallanOption('new')}
                        style={{ accentColor: '#7c3aed' }}
                      />
                      Create New Challan
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="challanOption"
                        value="existing"
                        checked={challanOption === 'existing'}
                        onChange={() => setChallanOption('existing')}
                        style={{ accentColor: '#7c3aed' }}
                      />
                      Link Existing Challan
                    </label>
                  </div>

                  {/* Option rendering details */}
                  {challanOption === 'none' && (
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                      Jobs will be created directly without linking to an Incoming Challan. You can link or receive them later.
                    </p>
                  )}

                  {challanOption === 'new' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '4px' }}>
                      <div style={{ flex: 1, minWidth: '150px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Challan Number</label>
                        <input
                          type="text"
                          value={challanNumber}
                          onChange={(e) => setChallanNumber(e.target.value)}
                          placeholder="e.g. CH-2026-102"
                          className="form-input"
                          style={{ margin: 0, padding: '8px 12px', fontSize: '13px', height: '36px', width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: '150px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Challan Date</label>
                        <input
                          type="date"
                          value={challanDate}
                          onChange={(e) => setChallanDate(e.target.value)}
                          className="form-input"
                          style={{ margin: 0, padding: '8px 12px', fontSize: '13px', height: '36px', width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  )}

                  {challanOption === 'existing' && (
                    <div style={{ marginTop: '4px', width: '100%' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Select Incoming Challan</label>
                      <select
                        value={existingChallanId}
                        onChange={(e) => setExistingChallanId(e.target.value)}
                        className="form-input"
                        style={{ margin: 0, padding: '6px 12px', fontSize: '13px', height: '36px', width: '100%', boxSizing: 'border-box' }}
                      >
                        <option value="">-- Choose Challan --</option>
                        {allChallans && allChallans.map(ch => (
                          <option key={ch.id} value={ch.id}>
                            {ch.challan_number} (Date: {ch.challan_date}) {ch.purchase_order ? `[PO: ${ch.purchase_order.po_number}]` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '8px', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => { setJobsDialogOpen(false); navigate('/incoming-challans', { state: { fromPoId: selectedPo.id, fromPoNumber: selectedPo.po_number } }); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primary)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontSize: '11px',
                        padding: 0,
                        display: 'inline-block'
                      }}
                    >
                      Go to incoming challans upload page instead
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <button
                  onClick={doConvertJobs}
                  disabled={jobsCreating || jobItemIds.length === 0}
                  className="form-button"
                  style={{ 
                    width: '100%', 
                    marginTop: 0, 
                    height: '44px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    backgroundColor: '#7c3aed', 
                    fontSize: '14px',
                    opacity: jobItemIds.length === 0 ? 0.6 : 1,
                    cursor: jobItemIds.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {jobsCreating ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                  Generate Selected Jobs
                </button>
                
                <button
                  onClick={() => {
                    setJobsDialogOpen(false);
                    setJobItemIds([]);
                    setChallanOption('none');
                    setChallanNumber('');
                    setChallanDate('');
                    setExistingChallanId('');
                    setAllChallans([]);
                  }}
                  className="logout-btn"
                  style={{ width: '100%', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', marginTop: 0 }}
                >
                  <X size={16} /> Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header Action Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="logout-btn" onClick={handleCloseReview} style={{ padding: '6px 12px' }}>
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>
                {selectedPo.id === 'new' ? 'Create Purchase Order Manually' : `Purchase Order — ${editingPo.po_number}`}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {selectedPo.id === 'new' 
                  ? 'Fill out the metadata and line items to manually record a new customer order.' 
                  : `${editingPo.customer_name} • ${editingPo.po_date ? new Date(editingPo.po_date).toLocaleDateString('en-IN') : 'No date'}`}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {selectedPo.id === 'new' ? (
              <>
                <button 
                  type="button" 
                  className="logout-btn" 
                  onClick={(e) => handleSaveManualPo(e, 'draft_review')}
                  disabled={approving}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '38px', backgroundColor: '#f1f5f9', color: 'var(--color-text-main)', padding: '0 16px' }}
                >
                  {approving ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                  Save as Draft
                </button>
                <button 
                  type="button" 
                  className="form-button" 
                  onClick={(e) => handleSaveManualPo(e, 'approved')}
                  disabled={approving}
                  style={{ width: 'auto', marginTop: 0, padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px', height: '38px', backgroundColor: 'var(--color-success)' }}
                >
                  {approving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Approve & Create Jobs
                </button>
              </>
            ) : (
              <>
                {/* === EDIT MODE BUTTONS === */}
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { setIsEditing(false); setEditingPo(selectedPo); setFeedback(null); }}
                      className="logout-btn"
                      style={{ height: '36px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}
                    >
                      <X size={14} /> Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleEditSave}
                      disabled={editSaving}
                      className="form-button"
                      style={{ width: 'auto', marginTop: 0, height: '36px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', backgroundColor: 'var(--color-success)' }}
                    >
                      {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save Changes
                    </button>
                  </>
                ) : (
                  <>
                    {/* === DRAFT: Verify & Approve === */}
                    {selectedPo.status === 'draft_review' && (
                      <button 
                        type="button" 
                        className="form-button" 
                        onClick={handleApprovePo}
                        disabled={approving}
                        style={{ width: 'auto', marginTop: 0, padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px', height: '36px', fontSize: '13px', backgroundColor: 'var(--color-success)' }}
                      >
                        {approving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Verify & Approve
                      </button>
                    )}
                    {/* === EDIT PO === */}
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="logout-btn"
                      style={{ height: '36px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                    >
                      <Pencil size={14} /> Edit PO
                    </button>
                    {/* === PRINT === */}
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="logout-btn"
                      style={{ height: '36px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}
                    >
                      <Printer size={14} /> Print
                    </button>
                    {/* === DOWNLOAD PDF === */}
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      className="logout-btn"
                      style={{ height: '36px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}
                    >
                      <Download size={14} /> {editingPo?.pdf_path ? 'Download PDF' : 'Save as PDF'}
                    </button>
                    {/* === DUPLICATE === */}
                    <button
                      type="button"
                      onClick={handleDuplicate}
                      disabled={duplicating}
                      className="logout-btn"
                      style={{ height: '36px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}
                    >
                      {duplicating ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />} Duplicate
                    </button>
                    {/* === CREATE JOBS === */}
                    {selectedPo.status === 'approved' && (
                      <button
                        type="button"
                        onClick={handleCreateJobsClick}
                        disabled={challanChecking || jobsCreating}
                        className="form-button"
                        style={{ width: 'auto', marginTop: 0, height: '36px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', backgroundColor: '#7c3aed' }}
                      >
                        {challanChecking || jobsCreating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                        Create Jobs
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Summary Banner for Approved PO */}
        {selectedPo.status === 'approved' && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '16px', 
            backgroundColor: 'var(--color-card-bg)', 
            border: '1px solid var(--color-border)', 
            borderRadius: 'var(--radius-md)', 
            padding: '16px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '500' }}>Total Order Quantity</span>
              <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-text-main)' }}>
                {editingPo.items.reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0)} Pcs
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '1px solid var(--color-border)', paddingLeft: '16px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '500' }}>Total Material Received</span>
              <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-primary)' }}>
                {editingPo.items.reduce((sum, item) => sum + parseFloat(item.received_qty || 0), 0)} Pcs
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '1px solid var(--color-border)', paddingLeft: '16px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '500' }}>Total Shop Completed</span>
              <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-success)' }}>
                {editingPo.items.reduce((sum, item) => sum + parseFloat(item.completed_qty || 0), 0)} Pcs
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '1px solid var(--color-border)', paddingLeft: '16px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '500' }}>Total Delivered to Customer</span>
              <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-warning)' }}>
                {editingPo.items.reduce((sum, item) => sum + parseFloat(item.delivered_qty || 0), 0)} Pcs
              </span>
            </div>
          </div>
        )}

        {/* Feedback inside editor */}
        {feedback && (
          <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: 0 }}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Splitscreen Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '20px', flexGrow: 1 }}>
          
          {/* LEFT PANEL: Editable PO Details Form or Audit History */}
          <div className="card" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
              <button
                type="button"
                onClick={() => setActivePoTab('details')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activePoTab === 'details' ? '2px solid var(--color-primary)' : 'none',
                  color: activePoTab === 'details' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  fontWeight: '600',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                Extracted Fields
              </button>
              <button
                type="button"
                onClick={() => setActivePoTab('history')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activePoTab === 'history' ? '2px solid var(--color-primary)' : 'none',
                  color: activePoTab === 'history' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  fontWeight: '600',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                Audit History ({auditLogs.length})
              </button>
            </div>

            {activePoTab === 'details' ? (
              <>
                {/* PO Metadata inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label"><Wrench size={12} /> PO Number</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editingPo.po_number}
                      onChange={(e) => handlePoFieldChange('po_number', e.target.value)}
                      style={{ paddingLeft: '12px' }}
                      disabled={selectedPo.id !== 'new' && !isEditing && selectedPo.status !== 'draft_review'}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label"><Calendar size={12} /> PO Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={editingPo.po_date}
                      onChange={(e) => handlePoFieldChange('po_date', e.target.value)}
                      style={{ paddingLeft: '12px' }}
                      disabled={selectedPo.id !== 'new' && !isEditing && selectedPo.status !== 'draft_review'}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label"><User size={12} /> Customer Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editingPo.customer_name}
                      onChange={(e) => handlePoFieldChange('customer_name', e.target.value)}
                      style={{ paddingLeft: '12px' }}
                      disabled={selectedPo.id !== 'new' && !isEditing && selectedPo.status !== 'draft_review'}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label"><Mail size={12} /> Customer Email</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={editingPo.customer_email || ''}
                      onChange={(e) => handlePoFieldChange('customer_email', e.target.value)}
                      style={{ paddingLeft: '12px' }}
                      disabled={selectedPo.id !== 'new' && !isEditing && selectedPo.status !== 'draft_review'}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label"><FileText size={12} /> Customer Address</label>
                    <textarea 
                      className="form-input" 
                      value={editingPo.customer_address || ''}
                      onChange={(e) => handlePoFieldChange('customer_address', e.target.value)}
                      style={{ paddingLeft: '12px', minHeight: '55px', resize: 'vertical', fontSize: '12px' }}
                      rows={2}
                      disabled={selectedPo.id !== 'new' && !isEditing && selectedPo.status !== 'draft_review'}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label"><Wrench size={12} /> Customer GSTIN</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editingPo.customer_gstin || ''}
                      onChange={(e) => handlePoFieldChange('customer_gstin', e.target.value)}
                      style={{ paddingLeft: '12px' }}
                      disabled={selectedPo.id !== 'new' && !isEditing && selectedPo.status !== 'draft_review'}
                    />
                  </div>
                </div>

                {/* PO-Level Remarks */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageSquare size={12} /> Purchase Order Remarks
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: '400', marginLeft: '4px' }}>(Workshop-wide instructions — carried to Jobs)</span>
                  </label>
                  <textarea 
                    className="form-input" 
                    value={editingPo.remarks || ''}
                    onChange={(e) => handlePoFieldChange('remarks', e.target.value)}
                    style={{ paddingLeft: '12px', minHeight: '60px', resize: 'vertical', fontSize: '12px' }}
                    rows={2}
                    placeholder="e.g. Customer requested urgent delivery. Material supplied by customer. Heat treatment required."
                    disabled={selectedPo.id !== 'new' && !isEditing && selectedPo.status !== 'draft_review'}
                  />
                </div>

                {/* Line Items Table */}
                {renderLineItemsGrid(false)}
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {auditLogs.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 10px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                    No audit history logs recorded for this Purchase Order yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {auditLogs.map((log) => {
                      const diffs = getAuditLogDiff(log);
                      return (
                        <div key={log.id} style={{
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          padding: '12px',
                          backgroundColor: 'var(--color-bg-base)',
                          fontSize: '12px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              textTransform: 'uppercase',
                              fontSize: '10px',
                              backgroundColor: log.action === 'approved' ? 'var(--color-success-light)' :
                                               log.action === 'revised_update' ? 'var(--color-primary-light)' :
                                               log.action === 'ignored' ? '#f1f5f9' : '#e0f2fe',
                              color: log.action === 'approved' ? 'var(--color-success)' :
                                     log.action === 'revised_update' ? 'var(--color-primary)' :
                                     log.action === 'ignored' ? 'var(--color-text-muted)' : '#0369a1'
                            }}>
                              {log.action.replace(/_/g, ' ')}
                            </span>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>

                          <div style={{ marginBottom: '6px' }}>
                            {log.user_name ? (
                              <span>Performed by <strong>{log.user_name}</strong>.</span>
                            ) : (
                              <span>Performed by System process.</span>
                            )}
                          </div>

                          {diffs.length > 0 && (
                            <div style={{
                              marginTop: '8px',
                              borderTop: '1px solid var(--color-border)',
                              paddingTop: '8px'
                            }}>
                              <strong style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: 'var(--color-text-muted)' }}>Changes Made:</strong>
                              <ul style={{ paddingLeft: '16px', margin: 0, color: 'var(--color-text-main)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {diffs.map((d, dIdx) => (
                                  <li key={dIdx}>{d}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* RIGHT PANEL: Embedded Original PDF Drawing Viewer */}
          <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: 'calc(100vh - 220px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} style={{ color: 'var(--color-danger)' }} />
                <span style={{ fontSize: '13px', fontWeight: '600', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedPo.id === 'new' ? 'Manual PO Entry' : (editingPo.pdf_path ? editingPo.pdf_path.split('/').pop() : 'Original PO Document')}
                </span>
              </div>
              {editingPo.pdf_path && (
                <a 
                  href={`http://127.0.0.1:8000/${editingPo.pdf_path}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-primary)' }}
                >
                  Open in New Tab <ExternalLink size={12} />
                </a>
              )}
            </div>
            
            <div style={{ flexGrow: 1, backgroundColor: '#525659' }}>
              {editingPo.pdf_path ? (
                <iframe 
                  src={`http://127.0.0.1:8000/${editingPo.pdf_path}`} 
                  width="100%" 
                  height="100%" 
                  style={{ border: 'none' }}
                  title="PDF PO Viewer"
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ffffff', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                  {selectedPo.id === 'new' ? 'This is a manually created Purchase Order. No source PDF file is associated.' : 'No PDF attachment found.'}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // DEFAULT VIEW: PO Lists with table rows
  const displayedPos = pos.filter(po => po.status === filter);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Search and control Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Purchase Orders Dashboard</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Import and verify incoming engineering purchase orders to trigger workshop jobs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={handleCreateManualPo}
            disabled={loading}
            className="form-button"
            style={{ width: 'auto', marginTop: 0, height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--color-primary)' }}
          >
            <Plus size={14} />
            Create PO Manually
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
            <button 
              onClick={handleFetchEmails}
              disabled={fetching || loading}
              className="form-button"
              style={{ width: 'auto', marginTop: 0, height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <RefreshCw size={14} className={fetching ? 'animate-spin' : ''} />
              {fetching ? 'Fetching Mailbox...' : 'Fetch New PO Mails'}
            </button>
            {lastFetchTime && (
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '500' }}>
                Last Checked: {lastFetchTime}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Feedback alert */}
      {feedback && (
        <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: 0 }}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Revision Warnings Banner List */}
      {revisions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {revisions.map(rev => (
            <div key={rev.id} style={{
              backgroundColor: '#fff8eb',
              border: '1px solid #ffe8cc',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: 'var(--shadow-sm)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{
                    backgroundColor: '#ffe8cc',
                    color: '#d97706',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#af5b00', margin: 0 }}>
                      Revision Warning: Purchase Order {rev.po_number} already exists!
                    </h3>
                    <p style={{ fontSize: '12px', color: '#666', margin: '2px 0 0 0' }}>
                      A revised PO document for <strong>{rev.po_number}</strong> was received via email.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => handleOpenCompare(rev.id)}
                  className="form-button"
                  style={{
                    width: 'auto',
                    marginTop: 0,
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 16px',
                    height: '34px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  <Eye size={14} /> Review Differences & Resolve
                </button>
              </div>

              {rev.existing_stats && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '8px 16px',
                  backgroundColor: '#ffffff',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #f1f3f5',
                  fontSize: '12px'
                }}>
                  <div><span style={{ color: 'var(--color-text-muted)' }}>Current Status:</span> <strong style={{ color: 'var(--color-primary)' }}>{rev.existing_stats.status}</strong></div>
                  <div><span style={{ color: 'var(--color-text-muted)' }}>Created Date:</span> <strong>{new Date(rev.existing_stats.created_at).toLocaleDateString()}</strong></div>
                  <div><span style={{ color: 'var(--color-text-muted)' }}>Customer Name:</span> <strong>{rev.existing_stats.customer_name}</strong></div>
                  <div><span style={{ color: 'var(--color-text-muted)' }}>Jobs Created:</span> <strong>{rev.existing_stats.jobs_count}</strong></div>
                  <div><span style={{ color: 'var(--color-text-muted)' }}>Delivery Status:</span> <strong>{rev.existing_stats.delivery_status}</strong></div>
                  <div><span style={{ color: 'var(--color-text-muted)' }}>Invoice Status:</span> <strong>{rev.existing_stats.invoice_status}</strong></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Redesigned Tab Navigation */}
      <div style={{ 
        display: 'inline-flex', 
        backgroundColor: '#f1f5f9', 
        padding: '6px', 
        borderRadius: '10px', 
        gap: '4px',
        alignSelf: 'flex-start',
        border: '1px solid var(--color-border)',
        marginBottom: '10px',
        flexWrap: 'wrap'
      }}>
        {[
          { key: 'draft_review', label: 'Drafts' },
          { key: 'approved', label: 'Accepted' },
          { key: 'marked_review', label: 'Under Review' },
          { key: 'completed', label: 'Completed' },
          { key: 'rejected', label: 'Rejected' },
        ].map(tab => (
          <button 
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: filter === tab.key ? '#ffffff' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: filter === tab.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '13px',
              boxShadow: filter === tab.key ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.25s ease'
            }}
          >
            {tab.label}
            <span style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '20px',
              height: '20px',
              padding: '0 6px',
              borderRadius: '10px',
              backgroundColor: filter === tab.key ? 'var(--color-primary-light)' : '#cbd5e1',
              color: filter === tab.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontSize: '11px',
              fontWeight: '700'
            }}>
              {pos.filter(p => p.status === tab.key).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table grid */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {displayedPos.length === 0 && !loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyItems: 'center', padding: '60px 20px', gap: '12px' }}>
            <FileText size={40} style={{ color: 'var(--color-text-light)' }} />
            <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>No Purchase Orders found in this category.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '16px' }}>PO Number</th>
                <th style={{ padding: '16px' }}>PO Date</th>
                <th style={{ padding: '16px' }}>Customer Name</th>
                <th style={{ padding: '16px' }}>Line Items</th>
                {filter !== 'draft_review' && (
                  <>
                    <th style={{ padding: '16px', minWidth: '150px' }}>Work Progress</th>
                    <th style={{ padding: '16px', minWidth: '150px' }}>Delivery Progress</th>
                  </>
                )}
                <th style={{ padding: '16px' }}>Status</th>
                <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && displayedPos.length === 0 ? (
                Array.from({ length: 5 }).map((_, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '90px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '70px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '150px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '60px' }} /></td>
                    {filter !== 'draft_review' && (
                      <>
                        <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '120px' }} /></td>
                        <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '120px' }} /></td>
                      </>
                    )}
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '18px', width: '100px', borderRadius: '12px' }} /></td>
                    <td style={{ padding: '16px', textAlign: 'right' }}><div className="skeleton-line animate-pulse" style={{ height: '28px', width: '80px', marginLeft: 'auto' }} /></td>
                  </tr>
                ))
              ) :
                displayedPos.map(po => (
                <tr key={po.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }} className="table-row-hover">
                  <td style={{ padding: '16px', fontWeight: '600' }}>{po.po_number}</td>
                  <td style={{ padding: '16px' }}>{po.po_date ? new Date(po.po_date).toLocaleDateString() : 'Pending'}</td>
                  <td style={{ padding: '16px' }}>{po.customer_name}</td>
                  <td style={{ padding: '16px' }}>{po.items_count} items</td>
                  {filter !== 'draft_review' && (
                    <>
                      <td style={{ padding: '16px' }}>
                        {renderWorkProgress(po)}
                      </td>
                      <td style={{ padding: '16px' }}>
                        {renderDeliveryProgress(po)}
                      </td>
                    </>
                  )}
                  <td style={{ padding: '16px' }}>{getStatusBadge(po.status)}</td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button 
                      onClick={() => handleOpenReview(po.id)}
                      className="logout-btn"
                      style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                    >
                      {po.status === 'draft_review' ? (
                        <>
                          <Wrench size={12} />
                          Review & Verify
                        </>
                      ) : (
                        <>
                          <Eye size={12} />
                          View Details
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Line Item Expand Modal ── */}
      {/* Maximize Line Items Modal */}
      {isLineItemsMaximized && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          backgroundColor: 'var(--color-bg-body)',
          display: 'flex', flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-card-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Maximize2 size={18} style={{ color: 'var(--color-primary)' }} />
              Expanded Workspace: Line Items
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Changes sync live to table · Save PO to persist to database</span>
              <button
                onClick={() => setIsLineItemsMaximized(false)}
                style={{
                  background: 'var(--color-bg-base)', border: '1px solid var(--color-border)',
                  borderRadius: '8px', padding: '8px 12px', fontSize: '13px', fontWeight: '600',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                  color: 'var(--color-text-main)'
                }}
              >
                <X size={16} /> Close Fullscreen
              </button>
            </div>
          </div>
          <div style={{ padding: '24px', flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {renderLineItemsGrid(true)}
          </div>
        </div>
      )}

    </div>
  );
}
