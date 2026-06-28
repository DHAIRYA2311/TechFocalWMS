import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import CustomSelect from './CustomSelect';
import { 
  ClipboardList, 
  FileText, 
  Printer, 
  Calendar, 
  User, 
  Check, 
  ArrowLeft, 
  CheckCircle2, 
  Loader2, 
  Eye, 
  AlertTriangle,
  Pencil,
  XCircle,
  Download,
  Save,
  X
} from 'lucide-react';
import { useRealTime } from '../hooks/useRealTime';

export default function DeliveryChallans() {
  const navigate = useNavigate();
  const location = useLocation();

  useRealTime('challans', () => {
    fetchChallans();
  });
  const [challans, setChallans] = useState([]);
  const [poList, setPoList] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState(null);
  
  // Form State
  const [selectedPoId, setSelectedPoId] = useState('');
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedJobIds, setSelectedJobIds] = useState([]);
  const [remarks, setRemarks] = useState('');
  
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState('');

  const [viewingChallan, setViewingChallan] = useState(null);

  const [user, setUser] = useState(() => {
    const profile = localStorage.getItem('user_profile');
    return profile ? JSON.parse(profile) : null;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editingChallan, setEditingChallan] = useState(null);
  const [generateInvoice, setGenerateInvoice] = useState(false);

  const hasFinancePermission = user?.permissions?.finance === true || ['admin', 'partner'].includes(user?.role);

  useEffect(() => {
    if (location.state) {
      if (location.state.viewDcId) {
        handleViewDetails(location.state.viewDcId);
        window.history.replaceState({}, document.title);
      } else if (location.state.prefilledPoId && location.state.prefilledInvoiceId) {
        const { prefilledPoId, prefilledInvoiceId } = location.state;
        window.history.replaceState({}, document.title);
        
        setCreating(true);
        fetchApprovedPOs();
        setSelectedPoId(prefilledPoId.toString());
        setSelectedInvoiceId(prefilledInvoiceId);
        setRemarks(`Generated from Invoice`);
        
        setJobsLoading(true);
        const token = localStorage.getItem('auth_token');
        axios.get(`http://127.0.0.1:8000/api/invoices/${prefilledInvoiceId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
          setSelectedInvoiceNumber(res.data.invoice_number);
          const jobs = (res.data.items || [])
            .filter(item => (item.job_card || item.jobCard) !== undefined && (item.job_card || item.jobCard) !== null)
            .map(item => {
              const jc = item.job_card || item.jobCard;
              const po = item.po_item || item.poItem;
              return {
                ...jc,
                job_card_number: jc?.job_card_number || jc?.jobCardNumber || '',
                quantity: jc?.quantity || item.quantity || 0,
                po_item: po ? {
                  ...po,
                  item_code: po.item_code || po.itemCode || '',
                  description: po.description || '',
                  unit: po.unit || 'PC'
                } : null
              };
            });
          setCompletedJobs(jobs);
          setSelectedJobIds(jobs.map(j => j.id));
        }).catch(err => {
          console.error(err);
          setFeedback({ type: 'danger', message: 'Failed to load linked Invoice details.' });
        }).finally(() => {
          setJobsLoading(false);
        });
      }
    }
  }, [location.state]);

  // Fetch logged delivery challans
  const fetchChallans = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('http://127.0.0.1:8000/api/delivery-challans', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChallans(response.data);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to load delivery challans.' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch approved POs
  const fetchApprovedPOs = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('http://127.0.0.1:8000/api/purchase-orders?status=approved', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPoList(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchChallans();
  }, []);

  const handleStartCreate = () => {
    setCreating(true);
    fetchApprovedPOs();
    setSelectedPoId('');
    setSelectedInvoiceId(null);
    setSelectedInvoiceNumber('');
    setCompletedJobs([]);
    setSelectedJobIds([]);
    setRemarks('');
    setChallanDate(new Date().toISOString().split('T')[0]);
    setGenerateInvoice(false);
    setFeedback(null);
  };

  const handleCancelCreate = () => {
    setCreating(false);
    setSelectedInvoiceId(null);
    setSelectedInvoiceNumber('');
    setGenerateInvoice(false);
    setFeedback(null);
  };

  // When PO changes, fetch completed and undelivered job cards
  const handlePoChange = async (poId) => {
    setSelectedPoId(poId);
    setSelectedJobIds([]);
    if (!poId) {
      setCompletedJobs([]);
      return;
    }

    setJobsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      // Fetch completed, undelivered jobs
      const response = await axios.get('http://127.0.0.1:8000/api/jobs', {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: 'completed', undelivered: 1 }
      });
      
      // Filter jobs belonging to this Purchase Order
      const filtered = response.data.filter(j => j.po_item?.purchase_order_id === parseInt(poId, 10));
      setCompletedJobs(filtered);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to retrieve completed job cards.' });
    } finally {
      setJobsLoading(false);
    }
  };

  const handleCheckboxChange = (jobId) => {
    setSelectedJobIds(prev => {
      if (prev.includes(jobId)) {
        return prev.filter(id => id !== jobId);
      } else {
        return [...prev, jobId];
      }
    });
  };

  const handleSaveChallan = async (e) => {
    e.preventDefault();
    if (!selectedPoId) {
      alert('Please select a Purchase Order.');
      return;
    }
    if (selectedJobIds.length === 0) {
      alert('Please select at least one completed Job Card to deliver.');
      return;
    }

    setSaving(true);
    setFeedback(null);

    const payload = {
      challan_date: challanDate,
      purchase_order_id: selectedPoId,
      job_card_ids: selectedJobIds,
      remarks,
      generate_invoice: generateInvoice
    };

    if (selectedInvoiceId) {
      payload.invoice_id = selectedInvoiceId;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post('http://127.0.0.1:8000/api/delivery-challans', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFeedback({ type: 'success', message: response.data.message });
      setTimeout(() => {
        setCreating(false);
        fetchChallans();
      }, 1500);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to generate Delivery Challan.' });
      setSaving(false);
    }
  };

  const handleViewDetails = async (id) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(`http://127.0.0.1:8000/api/delivery-challans/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setViewingChallan(response.data);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to retrieve challan details.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleStartEdit = async (challan) => {
    setIsEditing(true);
    setEditingChallan(challan);
    setChallanDate(challan.challan_date);
    setRemarks(challan.remarks || '');
    
    // The job cards currently linked to this delivery challan
    const linkedJobs = (challan.items || []).map(item => {
      const jc = item.job_card || item.jobCard;
      const po = item.po_item || item.poItem;
      return {
        ...jc,
        job_card_number: jc?.job_card_number || jc?.jobCardNumber || '',
        quantity: jc?.quantity || item.quantity_delivered || 0,
        po_item: po ? {
          ...po,
          item_code: po.item_code || po.itemCode || '',
          description: po.description || '',
          unit: po.unit || 'PC'
        } : null
      };
    });
    
    const currentJobIds = linkedJobs.map(j => j.id);
    setSelectedJobIds(currentJobIds);
    
    setJobsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('http://127.0.0.1:8000/api/jobs', {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: 'completed', undelivered: 1 }
      });
      
      const otherJobs = response.data.filter(j => j.po_item?.purchase_order_id === challan.purchase_order_id);
      
      const mergedJobs = [...linkedJobs];
      otherJobs.forEach(job => {
        if (!currentJobIds.includes(job.id)) {
          mergedJobs.push(job);
        }
      });
      
      setCompletedJobs(mergedJobs);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to retrieve completed job cards.' });
    } finally {
      setJobsLoading(false);
    }
  };

  const handleUpdateChallan = async (e) => {
    e.preventDefault();
    if (!challanDate) {
      alert('Please select a challan date.');
      return;
    }
    if (selectedJobIds.length === 0) {
      alert('Please select at least one Job Card to deliver.');
      return;
    }

    setSaving(true);
    setFeedback(null);

    const payload = {
      challan_date: challanDate,
      remarks,
      job_card_ids: selectedJobIds,
    };

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.put(`http://127.0.0.1:8000/api/delivery-challans/${editingChallan.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFeedback({ type: 'success', message: response.data.message });
      const updatedChallan = response.data.challan;
      
      setTimeout(() => {
        setIsEditing(false);
        setEditingChallan(null);
        fetchChallans();
        if (viewingChallan && viewingChallan.id === updatedChallan.id) {
          setViewingChallan(updatedChallan);
        }
      }, 1500);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to update Delivery Challan.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelChallan = async (challanId) => {
    const reason = window.prompt('Enter cancellation reason:');
    if (reason === null) return;
    if (!reason.trim()) {
      alert('A cancellation reason is required.');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post(`http://127.0.0.1:8000/api/delivery-challans/${challanId}/cancel`, 
        { cancellation_reason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setFeedback({ type: 'success', message: response.data.message });
      fetchChallans();
      if (viewingChallan && viewingChallan.id === challanId) {
        handleViewDetails(challanId);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to cancel Delivery Challan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async (challanNumber) => {
    const element = document.getElementById('print-area');
    if (!element) return;
    
    setLoading(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`${challanNumber || 'Delivery_Challan'}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Printable CSS styles injected on mount
  const printStyle = `
    @media print {
      html, body {
        background: #ffffff !important;
        background-color: #ffffff !important;
      }

      /* Hide all non-printable layout elements */
      .dashboard-sidebar, 
      .dashboard-header, 
      .no-print, 
      button, 
      select, 
      input, 
      .alert, 
      .form-group, 
      .card:not(#print-area) {
        display: none !important;
      }
      
      /* Reset layout wrappers to full page block structures */
      .dashboard-layout, 
      .dashboard-main, 
      .dashboard-content, 
      .animate-fade-in, 
      .print-grid-wrapper {
        display: block !important;
        position: static !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        background: transparent !important;
      }
      
      /* Ensure print area spans full page height and width dynamically using viewport units */
      #print-area {
        display: flex !important;
        flex-direction: column !important;
        min-height: calc(100vh - 20mm) !important;
        position: static !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        background: #ffffff !important;
        color: #000000 !important;
      }

      .print-footer {
        margin-top: auto !important;
        padding-top: 20px !important;
      }

      @page {
        size: auto;
        margin: 10mm 15mm;
      }
    }
  `;

  const selectedPo = poList.find(p => p.id === parseInt(selectedPoId, 10));

  // ==========================================
  // VIEW 1: DETAILED VIEW WITH PRINT PREVIEW
  // ==========================================
  if (viewingChallan) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <style>{printStyle}</style>
        
        {/* Title bar */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="logout-btn" onClick={() => setViewingChallan(null)} style={{ padding: '6px 12px' }}>
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>
                Delivery Challan: {viewingChallan.challan_number}
                {viewingChallan.cancelled_at && (
                  <span style={{ marginLeft: '10px', padding: '2px 8px', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>
                    CANCELLED
                  </span>
                )}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Generated on {new Date(viewingChallan.challan_date).toLocaleDateString()} for PO #{viewingChallan.purchase_order?.po_number}.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => handleStartEdit(viewingChallan)}
              className="logout-btn"
              style={{ 
                height: '38px', 
                padding: '0 16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                opacity: viewingChallan.cancelled_at ? 0.5 : 1,
                cursor: viewingChallan.cancelled_at ? 'not-allowed' : 'pointer'
              }}
              disabled={!!viewingChallan.cancelled_at}
            >
              <Pencil size={14} /> Edit
            </button>
            
            <button 
              onClick={() => handleCancelChallan(viewingChallan.id)}
              className="logout-btn"
              style={{ 
                height: '38px', 
                padding: '0 16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                color: '#ef4444', 
                borderColor: '#ef4444',
                opacity: (viewingChallan.cancelled_at || (viewingChallan.invoice && !viewingChallan.invoice.cancelled_at)) ? 0.5 : 1,
                cursor: (viewingChallan.cancelled_at || (viewingChallan.invoice && !viewingChallan.invoice.cancelled_at)) ? 'not-allowed' : 'pointer'
              }}
              disabled={!!viewingChallan.cancelled_at || (viewingChallan.invoice && !viewingChallan.invoice.cancelled_at)}
            >
              <XCircle size={14} /> Cancel
            </button>

            <button 
              onClick={handlePrint}
              className="logout-btn"
              style={{ height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Printer size={14} /> Print
            </button>

            <button 
              onClick={() => handleDownloadPdf(viewingChallan.challan_number)}
              className="form-button"
              style={{ width: 'auto', marginTop: 0, height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--color-primary)' }}
            >
              <Download size={14} /> Download PDF
            </button>
          </div>
        </div>

        <div className="print-grid-wrapper" style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: '20px' }}>
          
          {/* Left panel: Info */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)', fontWeight: '600' }}>
              Challan Information
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px' }}>Customer</span>
                <strong>{viewingChallan.purchase_order?.customer_name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px' }}>Challan Date</span>
                <strong>{new Date(viewingChallan.challan_date).toLocaleDateString()}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px' }}>PO Reference</span>
                <strong>PO #{viewingChallan.purchase_order?.po_number}</strong>
              </div>
              {viewingChallan.invoice ? (
                <div>
                  <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px' }}>Linked Invoice</span>
                  <button 
                    onClick={() => navigate('/invoices', { state: { viewInvoiceId: viewingChallan.invoice.id } })}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-primary)', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline', fontSize: '13px', textAlign: 'left' }}
                  >
                    {viewingChallan.invoice.invoice_number}
                  </button>
                </div>
              ) : (
                <div className="no-print">
                  <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px' }}>Linked Invoice</span>
                  <button 
                    onClick={() => navigate('/invoices', { state: { prefilledPoId: viewingChallan.purchase_order_id, prefilledDcId: viewingChallan.id } })}
                    style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', marginTop: '4px' }}
                  >
                    Generate Invoice
                  </button>
                </div>
              )}
              {viewingChallan.remarks && (
                <div>
                  <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px' }}>Remarks</span>
                  <span>{viewingChallan.remarks}</span>
                </div>
              )}
              {viewingChallan.cancelled_at && (
                <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '4px', padding: '12px', fontSize: '12px', color: '#991b1b', marginTop: '10px' }}>
                  <strong>Cancellation Details:</strong><br />
                  Cancelled on: {new Date(viewingChallan.cancelled_at).toLocaleString()}<br />
                  Reason: {viewingChallan.cancellation_reason || 'N/A'}
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Printable Preview Paper */}
          <div className="card" id="print-area" style={{ 
            backgroundColor: '#ffffff', 
            color: '#0f172a',
            border: '1px solid #e2e8f0', 
            borderRadius: 'var(--radius-sm)', 
            padding: '40px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            {/* Document Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '20px', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#1e3a8a', margin: 0, letterSpacing: '0.5px' }}>TECHFOCAL ENTERPRISES LLP</h1>
                <p style={{ fontSize: '11px', color: '#475569', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                  Workshop Plot 12, Industrial Area Phase-1, GIDC,<br />
                  Ahmedabad, Gujarat, India - 380001<br />
                  GSTIN: 24AAHFT8902M1Z8
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#475569' }}>DELIVERY CHALLAN</h2>
                <p style={{ fontSize: '11px', margin: '6px 0 0 0', color: '#0f172a' }}>
                  Challan No: <strong>{viewingChallan.challan_number}</strong><br />
                  Challan Date: <strong>{new Date(viewingChallan.challan_date).toLocaleDateString()}</strong>
                </p>
              </div>
            </div>

            {/* Address Blocks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '11px', marginBottom: '24px', lineHeight: '1.5' }}>
              <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '4px' }}>
                <span style={{ fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px', fontSize: '9px', textTransform: 'uppercase' }}>Consignee (Ship-To)</span>
                <strong>{viewingChallan.purchase_order?.customer_name}</strong>
                <p style={{ margin: '4px 0', whiteSpace: 'pre-wrap', color: '#334155' }}>{viewingChallan.purchase_order?.customer_address}</p>
                <strong>GSTIN: {viewingChallan.purchase_order?.customer_gstin || 'N/A'}</strong>
              </div>
              <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '4px' }}>
                <span style={{ fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px', fontSize: '9px', textTransform: 'uppercase' }}>Order References</span>
                <strong>Customer PO No:</strong> #{viewingChallan.purchase_order?.po_number}<br />
                <strong>PO Date:</strong> {viewingChallan.purchase_order?.po_date ? new Date(viewingChallan.purchase_order.po_date).toLocaleDateString() : 'N/A'}<br />
                <strong>Mode of Dispatch:</strong> Road / Hand Delivery
              </div>
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '40px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #0f172a', borderTop: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', width: '50px' }}>Sr. No.</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', width: '100px' }}>Item Code</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Item Description</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: '80px' }}>HSN Code</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: '80px' }}>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {viewingChallan.items?.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 10px', textAlign: 'left' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 10px', fontWeight: '600' }}>{item.po_item?.item_code}</td>
                    <td style={{ padding: '8px 10px', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                      {(item.po_item?.description || '').split('\n')[0]}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{item.po_item?.hsn_sac || '-'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700' }}>
                      {parseFloat(item.quantity_delivered).toFixed(0)} {item.po_item?.unit || 'PC'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Signatures and declaration */}
            <div className="print-footer" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', fontSize: '10px', marginTop: '60px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
              <div>
                <strong>Terms & Declarations:</strong>
                <p style={{ margin: '4px 0', color: '#475569' }}>
                  1. The goods described above are delivered under subcontracting process.<br />
                  2. Received items in good condition and as per drawings specifications.
                </p>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyItems: 'flex-end', height: '100px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700' }}>For TECHFOCAL ENTERPRISES LLP</span>
                <span style={{ marginTop: 'auto', display: 'block', borderTop: '1px solid #94a3b8', paddingTop: '6px', fontSize: '10px', color: '#475569', width: '160px', alignSelf: 'flex-end', textAlign: 'center' }}>
                  Authorized Signatory
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: LOG NEW OUTGOING CHALLAN PANEL
  // ==========================================
  // ==========================================
  // VIEW 1.5: EDIT DELIVERY CHALLAN PANEL
  // ==========================================
  if (isEditing && editingChallan) {
    const challanPo = poList.find(p => p.id === editingChallan.purchase_order_id) || editingChallan.purchase_order;

    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Title bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="logout-btn" onClick={() => { setIsEditing(false); setEditingChallan(null); }} style={{ padding: '6px 12px' }}>
              <ArrowLeft size={16} /> Cancel Edit
            </button>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Edit Delivery Challan: {editingChallan.challan_number}</h2>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Modify challan date, remarks, and linked Job Cards for {challanPo?.customer_name}.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="form-button" 
            onClick={handleUpdateChallan}
            disabled={saving}
            style={{ width: 'auto', marginTop: 0, padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px', height: '38px', backgroundColor: 'var(--color-primary)' }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>

        {feedback && (
          <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: 0 }}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* Left panel: Edit Form */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
            
            {editingChallan.invoice && !editingChallan.invoice.cancelled_at && (
              <div className="alert alert-danger" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} />
                <span>Job Card selection is disabled because this challan is linked to an active Invoice ({editingChallan.invoice.invoice_number}).</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label"><User size={12} /> Purchase Order</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={challanPo ? `PO #${challanPo.po_number} (${challanPo.customer_name})` : ''}
                  disabled
                  style={{ paddingLeft: '12px', backgroundColor: 'var(--color-bg-base)', cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label"><Calendar size={12} /> Challan Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={challanDate}
                  onChange={(e) => setChallanDate(e.target.value)}
                  style={{ paddingLeft: '12px' }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Remarks / Dispatch Notes</label>
              <input 
                type="text" 
                className="form-input" 
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Sent via Tempos, driver contact..."
                style={{ paddingLeft: '12px' }}
              />
            </div>

            {/* Completed job cards list */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px' }}>Select Job Cards for Delivery</h4>
              
              {jobsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                  <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                </div>
              ) : completedJobs.length === 0 ? (
                <div style={{ padding: '20px', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                  No completed Job Cards available.
                </div>
              ) : (
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                        <th style={{ padding: '10px', width: '40px', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedJobIds.length === completedJobs.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedJobIds(completedJobs.map(j => j.id));
                              } else {
                                setSelectedJobIds([]);
                              }
                            }}
                            disabled={editingChallan.invoice && !editingChallan.invoice.cancelled_at}
                          />
                        </th>
                        <th style={{ padding: '10px' }}>Job Card #</th>
                        <th style={{ padding: '10px' }}>Item Code</th>
                        <th style={{ padding: '10px' }}>Description</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Qty to Deliver</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedJobs.map((job) => (
                        <tr key={job.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedJobIds.includes(job.id)}
                              onChange={() => handleCheckboxChange(job.id)}
                              disabled={editingChallan.invoice && !editingChallan.invoice.cancelled_at}
                            />
                          </td>
                          <td style={{ padding: '10px', fontWeight: '600' }}>{job.job_card_number}</td>
                          <td style={{ padding: '10px', fontWeight: '500' }}>{job.po_item?.item_code}</td>
                          <td style={{ padding: '10px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            {(job.po_item?.description || '').split('\n')[0].substring(0, 30)}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700', color: 'var(--color-primary)' }}>
                            {job.quantity} {job.po_item?.unit || 'PC'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Proposed Preview */}
          <div className="card" style={{ 
            backgroundColor: '#ffffff', 
            color: '#0f172a',
            border: '1px solid #cbd5e1', 
            borderRadius: 'var(--radius-sm)', 
            padding: '30px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            maxHeight: 'calc(100vh - 220px)',
            overflowY: 'auto'
          }}>
            <div style={{ textAlign: 'center', padding: '10px', border: '2px dashed #3b82f6', borderRadius: '4px', marginBottom: '20px', color: '#1d4ed8', fontSize: '11px', fontWeight: '600' }}>
              PROPOSED EDITED CHALLAN PREVIEW
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h1 style={{ fontSize: '16px', fontWeight: '800', color: '#1e3a8a', margin: 0 }}>TECHFOCAL ENTERPRISES LLP</h1>
                <span style={{ fontSize: '10px', color: '#475569' }}>Ahmedabad, Gujarat</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '13px', fontWeight: '800', margin: 0, color: '#475569' }}>DELIVERY CHALLAN</h2>
                <span style={{ fontSize: '10px', color: '#475569' }}>Challan No: <strong>{editingChallan.challan_number}</strong></span>
              </div>
            </div>

            {challanPo ? (
              <div style={{ border: '1px solid #cbd5e1', padding: '10px', borderRadius: '4px', fontSize: '11px', marginBottom: '20px', lineHeight: '1.5' }}>
                <strong>Consignee (Ship-To):</strong><br />
                {challanPo.customer_name}<br />
                {challanPo.customer_address}<br />
                <strong>GSTIN:</strong> {challanPo.customer_gstin || 'N/A'}
              </div>
            ) : null}

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #0f172a', borderTop: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Item Code</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', width: '80px' }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {selectedJobIds.map((id, index) => {
                  const job = completedJobs.find(j => j.id === id);
                  if (!job) return null;
                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 8px', fontWeight: '600' }}>{job.po_item?.item_code}</td>
                      <td style={{ padding: '6px 8px', color: '#475569' }}>
                        {(job.po_item?.description || '').split('\n')[0].substring(0, 35)}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '700' }}>
                        {job.quantity} {job.po_item?.unit || 'PC'}
                      </td>
                    </tr>
                  );
                })}
                {selectedJobIds.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                      No items selected.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Title bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="logout-btn" onClick={handleCancelCreate} style={{ padding: '6px 12px' }}>
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Generate Outgoing Delivery Challan</h2>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Select Purchase Order and select the completed Job Cards to dispatch.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="form-button" 
            onClick={handleSaveChallan}
            disabled={saving}
            style={{ width: 'auto', marginTop: 0, padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px', height: '38px', backgroundColor: 'var(--color-primary)' }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Generate Challan
          </button>
        </div>

        {feedback && (
          <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: 0 }}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* Left panel: Form */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
            {selectedInvoiceId && (
              <div className="alert alert-success" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} />
                <span>Generating Delivery Challan from Invoice <strong>{selectedInvoiceNumber}</strong>. Items from this invoice are preloaded and selected.</span>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label"><User size={12} /> Select Purchase Order</label>
                <CustomSelect
                  value={selectedPoId}
                  onChange={(val) => handlePoChange(val)}
                  placeholder="-- Choose Approved PO --"
                  options={poList.map(po => ({
                    value: po.id.toString(), // ensuring match since selectedPoId is string
                    label: `PO #${po.po_number} (${po.customer_name})`
                  }))}
                  icon={<User size={14} style={{ color: 'var(--color-text-light)' }} />}
                  disabled={selectedInvoiceId !== null}
                />
              </div>

              <div className="form-group">
                <label className="form-label"><Calendar size={12} /> Challan Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={challanDate}
                  onChange={(e) => setChallanDate(e.target.value)}
                  style={{ paddingLeft: '12px' }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Remarks / Dispatch Notes</label>
              <input 
                type="text" 
                className="form-input" 
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Sent via Tempos, driver contact..."
                style={{ paddingLeft: '12px' }}
              />
            </div>

            {!selectedInvoiceId && hasFinancePermission && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
                <input 
                  type="checkbox" 
                  id="generateInvoice" 
                  checked={generateInvoice} 
                  onChange={(e) => setGenerateInvoice(e.target.checked)} 
                  style={{ cursor: 'pointer', width: 'auto', margin: 0 }}
                />
                <label htmlFor="generateInvoice" style={{ fontSize: '13px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Generate Invoice immediately for this Delivery Challan
                </label>
              </div>
            )}

            {/* Completed undelivered items list */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px' }}>Select Completed Job Cards</h4>
              
              {jobsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                  <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                </div>
              ) : !selectedPoId ? (
                <div style={{ padding: '20px', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                  Please select a Purchase Order above first to view completed Job Cards.
                </div>
              ) : completedJobs.length === 0 ? (
                <div style={{ padding: '20px', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                  No completed and undelivered Job Cards found for this Purchase Order.
                </div>
              ) : (
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                        <th style={{ padding: '10px', width: '40px', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedJobIds.length === completedJobs.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedJobIds(completedJobs.map(j => j.id));
                              } else {
                                setSelectedJobIds([]);
                              }
                            }}
                            disabled={selectedInvoiceId !== null}
                          />
                        </th>
                        <th style={{ padding: '10px' }}>Job Card #</th>
                        <th style={{ padding: '10px' }}>Item Code</th>
                        <th style={{ padding: '10px' }}>Description</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Qty to Deliver</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedJobs.map((job) => (
                        <tr key={job.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedJobIds.includes(job.id)}
                              onChange={() => handleCheckboxChange(job.id)}
                              disabled={selectedInvoiceId !== null}
                            />
                          </td>
                          <td style={{ padding: '10px', fontWeight: '600' }}>{job.job_card_number}</td>
                          <td style={{ padding: '10px', fontWeight: '500' }}>{job.po_item?.item_code}</td>
                          <td style={{ padding: '10px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            {(job.po_item?.description || '').split('\n')[0].substring(0, 30)}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700', color: 'var(--color-primary)' }}>
                            {job.quantity} {job.po_item?.unit || 'PC'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Draft Preview */}
          <div className="card" style={{ 
            backgroundColor: '#ffffff', 
            color: '#0f172a',
            border: '1px solid #cbd5e1', 
            borderRadius: 'var(--radius-sm)', 
            padding: '30px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            maxHeight: 'calc(100vh - 220px)',
            overflowY: 'auto'
          }}>
            <div style={{ textAlign: 'center', padding: '10px', border: '2px dashed #94a3b8', borderRadius: '4px', marginBottom: '20px', color: '#475569', fontSize: '11px', fontWeight: '600' }}>
              DRAFT CHALLAN PREVIEW (PROPOSED)
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h1 style={{ fontSize: '16px', fontWeight: '800', color: '#1e3a8a', margin: 0 }}>TECHFOCAL ENTERPRISES LLP</h1>
                <span style={{ fontSize: '10px', color: '#475569' }}>Ahmedabad, Gujarat</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '13px', fontWeight: '800', margin: 0, color: '#475569' }}>DELIVERY CHALLAN</h2>
                <span style={{ fontSize: '10px', color: '#475569' }}>Challan No: <strong>DC-DRAFT</strong></span>
              </div>
            </div>

            {selectedPo ? (
              <div style={{ border: '1px solid #cbd5e1', padding: '10px', borderRadius: '4px', fontSize: '11px', marginBottom: '20px', lineHeight: '1.5' }}>
                <strong>Consignee (Ship-To):</strong><br />
                {selectedPo.customer_name}<br />
                {selectedPo.customer_address}<br />
                <strong>GSTIN:</strong> {selectedPo.customer_gstin || 'N/A'}
              </div>
            ) : (
              <div style={{ padding: '20px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#94a3b8', fontSize: '11px', marginBottom: '20px' }}>
                Select a PO to see buyer context.
              </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #0f172a', borderTop: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Item Code</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', width: '80px' }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {selectedJobIds.map((id, index) => {
                  const job = completedJobs.find(j => j.id === id);
                  if (!job) return null;
                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 8px', fontWeight: '600' }}>{job.po_item?.item_code}</td>
                      <td style={{ padding: '6px 8px', color: '#475569' }}>
                        {(job.po_item?.description || '').split('\n')[0].substring(0, 35)}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '700' }}>
                        {job.quantity} {job.po_item?.unit || 'PC'}
                      </td>
                    </tr>
                  );
                })}
                {selectedJobIds.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                      No items selected.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // DEFAULT VIEW: LIST CHALLANS TABLE
  // ==========================================
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Outgoing Delivery Challans</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Generate, view, and print delivery notes for completed shop floor parts to send to customers.
          </p>
        </div>

        <button 
          onClick={handleStartCreate}
          className="form-button"
          style={{ width: 'auto', marginTop: 0, height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ClipboardList size={14} />
          Log Outgoing Challan
        </button>
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: 0 }}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Challans Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {challans.length === 0 && !loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyItems: 'center', padding: '60px 20px', gap: '12px' }}>
            <FileText size={40} style={{ color: 'var(--color-text-light)' }} />
            <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>No Outgoing Delivery Challans generated yet.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '16px' }}>Challan Number</th>
                <th style={{ padding: '16px' }}>Date</th>
                <th style={{ padding: '16px' }}>Purchase Order</th>
                <th style={{ padding: '16px' }}>Client</th>
                <th style={{ padding: '16px' }}>Items Logged</th>
                <th style={{ padding: '16px' }}>Linked Invoice</th>
                <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && challans.length === 0 ? (
                Array.from({ length: 5 }).map((_, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '90px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '70px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '95px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '140px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '80px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '80px' }} /></td>
                    <td style={{ padding: '16px', textAlign: 'right' }}><div className="skeleton-line animate-pulse" style={{ height: '28px', width: '70px', marginLeft: 'auto' }} /></td>
                  </tr>
                ))
              ) :
                challans.map(ch => (
                <tr key={ch.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }} className="table-row-hover">
                  <td style={{ padding: '16px', fontWeight: '600' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {ch.challan_number}
                      {ch.cancelled_at && (
                        <span style={{ padding: '2px 6px', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '12px', fontSize: '10px', fontWeight: '600' }}>
                          Cancelled
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>{new Date(ch.challan_date).toLocaleDateString()}</td>
                  <td style={{ padding: '16px', fontWeight: '500' }}>PO #{ch.purchase_order?.po_number}</td>
                  <td style={{ padding: '16px' }}>{ch.purchase_order?.customer_name}</td>
                  <td style={{ padding: '16px' }}>{ch.items_count} items</td>
                  <td style={{ padding: '16px' }}>
                    {ch.invoice ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/invoices', { state: { viewInvoiceId: ch.invoice.id } });
                        }}
                        style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-primary)', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {ch.invoice.invoice_number}
                      </button>
                    ) : (
                      <span style={{ color: 'var(--color-text-light)', fontStyle: 'italic', fontSize: '12px' }}>Not Billed</span>
                    )}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleViewDetails(ch.id)}
                        className="logout-btn"
                        style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                      >
                        <Eye size={12} />
                        View & Print
                      </button>
                      
                      <button 
                        onClick={() => handleStartEdit(ch)}
                        className="logout-btn"
                        style={{ 
                          padding: '6px 12px', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          fontSize: '12px',
                          opacity: ch.cancelled_at ? 0.5 : 1,
                          cursor: ch.cancelled_at ? 'not-allowed' : 'pointer'
                        }}
                        disabled={!!ch.cancelled_at}
                      >
                        <Pencil size={12} />
                        Edit
                      </button>

                      <button 
                        onClick={() => handleCancelChallan(ch.id)}
                        className="logout-btn"
                        style={{ 
                          padding: '6px 12px', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          fontSize: '12px',
                          color: 'var(--color-danger, #ef4444)',
                          borderColor: 'var(--color-danger, #ef4444)',
                          opacity: (ch.cancelled_at || (ch.invoice && !ch.invoice.cancelled_at)) ? 0.5 : 1,
                          cursor: (ch.cancelled_at || (ch.invoice && !ch.invoice.cancelled_at)) ? 'not-allowed' : 'pointer'
                        }}
                        disabled={!!ch.cancelled_at || (ch.invoice && !ch.invoice.cancelled_at)}
                      >
                        <XCircle size={12} />
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
