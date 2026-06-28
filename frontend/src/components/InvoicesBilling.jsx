import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import CustomSelect from './CustomSelect';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Receipt, 
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
  XCircle,
  Pencil,
  Download,
  CreditCard,
  Save,
  X,
  Building,
  Smartphone,
  Banknote,
  Link
} from 'lucide-react';
import { useRealTime } from '../hooks/useRealTime';

export default function InvoicesBilling() {
  const navigate = useNavigate();
  const location = useLocation();

  useRealTime('invoices', () => {
    fetchInvoices();
  });
  const [invoices, setInvoices] = useState([]);
  const [poList, setPoList] = useState([]);
  const [dcList, setDcList] = useState([]);
  const [uninvoicedJobs, setUninvoicedJobs] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState(null);
  
  // Form State
  const [selectedPoId, setSelectedPoId] = useState('');
  const [selectedDcId, setSelectedDcId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedJobIds, setSelectedJobIds] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [ewayBillNo, setEwayBillNo] = useState('');
  
  const [viewingInvoice, setViewingInvoice] = useState(null);

  const [user, setUser] = useState(() => {
    const profile = localStorage.getItem('user_profile');
    return profile ? JSON.parse(profile) : null;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  
  // Payment recording states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTargetInvoice, setPaymentTargetInvoice] = useState(null); // invoice opened from list view (no full view)
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [transactionReference, setTransactionReference] = useState('');
  const [paymentAccountDetail, setPaymentAccountDetail] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentRemarks, setPaymentRemarks] = useState('');

  const hasFinancePermission = user?.permissions?.finance === true || ['admin', 'partner'].includes(user?.role);
  const [isDcPrefilled, setIsDcPrefilled] = useState(false);

  useEffect(() => {
    if (location.state) {
      if (location.state.viewInvoiceId) {
        handleViewDetails(location.state.viewInvoiceId);
        window.history.replaceState({}, document.title);
      } else if (location.state.prefilledPoId && location.state.prefilledDcId) {
        const { prefilledPoId, prefilledDcId } = location.state;
        window.history.replaceState({}, document.title);

        setCreating(true);
        fetchApprovedPOs();
        setIsDcPrefilled(true);
        
        const initializePrefilled = async () => {
          setSelectedPoId(prefilledPoId.toString());
          
          setJobsLoading(true);
          try {
            const token = localStorage.getItem('auth_token');
            
            // 1. Fetch completed, uninvoiced jobs
            const jobsRes = await axios.get('http://127.0.0.1:8000/api/jobs', {
              headers: { Authorization: `Bearer ${token}` },
              params: { status: 'completed', uninvoiced: 1 }
            });
            const filteredJobs = jobsRes.data.filter(j => j.po_item?.purchase_order_id === parseInt(prefilledPoId, 10));
            setUninvoicedJobs(filteredJobs);

            // 2. Fetch delivery challans for this PO
            const challansRes = await axios.get('http://127.0.0.1:8000/api/delivery-challans', {
              headers: { Authorization: `Bearer ${token}` }
            });
            const filteredChallans = challansRes.data.filter(c => c.purchase_order_id === parseInt(prefilledPoId, 10));
            setDcList(filteredChallans);

            // Set DC and load its jobs
            setSelectedDcId(prefilledDcId.toString());
            
            const dcDetailsRes = await axios.get(`http://127.0.0.1:8000/api/delivery-challans/${prefilledDcId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const jobIds = dcDetailsRes.data.items.map(i => i.job_card_id);
            setSelectedJobIds(jobIds);
            
            const dcJobs = (dcDetailsRes.data.items || []).map(i => {
              const jc = i.job_card || i.jobCard;
              const po = i.po_item || i.poItem;
              return {
                ...jc,
                job_card_number: jc?.job_card_number || jc?.jobCardNumber || '',
                quantity: jc?.quantity || i.quantity || i.quantity_delivered || 0,
                po_item: po ? {
                  ...po,
                  item_code: po.item_code || po.itemCode || '',
                  description: po.description || '',
                  unit: po.unit || 'PC'
                } : null
              };
            });
            setUninvoicedJobs(prev => {
              const existingIds = prev.map(p => p.id);
              const newJobs = dcJobs.filter(dj => dj && !existingIds.includes(dj.id));
              return [...prev, ...newJobs];
            });

          } catch (err) {
            console.error(err);
            setFeedback({ type: 'danger', message: 'Failed to preload Delivery Challan details.' });
          } finally {
            setJobsLoading(false);
          }
        };

        initializePrefilled();
      }
    }
  }, [location.state]);

  // Fetch logged invoices
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('http://127.0.0.1:8000/api/invoices', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvoices(response.data);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to load invoices.' });
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
    fetchInvoices();
  }, []);

  const handleStartCreate = () => {
    setCreating(true);
    fetchApprovedPOs();
    setSelectedPoId('');
    setSelectedDcId('');
    setIsDcPrefilled(false);
    setUninvoicedJobs([]);
    setSelectedJobIds([]);
    setRemarks('');
    setEwayBillNo('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setFeedback(null);
  };

  const handleCancelCreate = () => {
    setCreating(false);
    setIsDcPrefilled(false);
    setEwayBillNo('');
    setFeedback(null);
  };

  // When PO changes, fetch completed and uninvoiced Job Cards, and Delivery Challans
  const handlePoChange = async (poId) => {
    setSelectedPoId(poId);
    setSelectedDcId('');
    setSelectedJobIds([]);
    if (!poId) {
      setUninvoicedJobs([]);
      setDcList([]);
      return;
    }

    setJobsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      // 1. Fetch completed, uninvoiced jobs
      const jobsRes = await axios.get('http://127.0.0.1:8000/api/jobs', {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: 'completed', uninvoiced: 1 }
      });
      const filteredJobs = jobsRes.data.filter(j => j.po_item?.purchase_order_id === parseInt(poId, 10));
      setUninvoicedJobs(filteredJobs);

      // 2. Fetch delivery challans for this PO
      const challansRes = await axios.get('http://127.0.0.1:8000/api/delivery-challans', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const filteredChallans = challansRes.data.filter(c => c.purchase_order_id === parseInt(poId, 10));
      setDcList(filteredChallans);

    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to retrieve billing objects.' });
    } finally {
      setJobsLoading(false);
    }
  };

  // When Delivery Challan is selected
  const handleDcChange = async (dcId) => {
    setSelectedDcId(dcId);
    setSelectedJobIds([]);
    if (!dcId) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(`http://127.0.0.1:8000/api/delivery-challans/${dcId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const jobIds = response.data.items.map(i => i.job_card_id);
      setSelectedJobIds(jobIds);

      // Merge jobs into uninvoicedJobs so they are rendered in the draft preview
      const dcJobs = (response.data.items || []).map(i => {
        const jc = i.job_card || i.jobCard;
        const po = i.po_item || i.poItem;
        return {
          ...jc,
          job_card_number: jc?.job_card_number || jc?.jobCardNumber || '',
          quantity: jc?.quantity || i.quantity || i.quantity_delivered || 0,
          po_item: po ? {
            ...po,
            item_code: po.item_code || po.itemCode || '',
            description: po.description || '',
            unit: po.unit || 'PC'
          } : null
        };
      });
      setUninvoicedJobs(prev => {
        const existingIds = prev.map(p => p.id);
        const newJobs = dcJobs.filter(dj => dj && !existingIds.includes(dj.id));
        return [...prev, ...newJobs];
      });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to load Delivery Challan items.' });
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

  const handleSaveInvoice = async (e, status = 'unpaid') => {
    if (e) e.preventDefault();
    if (!selectedPoId) {
      alert('Please select a Purchase Order.');
      return;
    }
    if (selectedJobIds.length === 0) {
      alert('Please select at least one completed Job Card to invoice.');
      return;
    }

    setSaving(true);
    setFeedback(null);

    const payload = {
      invoice_date: invoiceDate,
      purchase_order_id: selectedPoId,
      remarks,
      eway_bill_no: ewayBillNo,
      status: status
    };

    if (selectedDcId) {
      payload.delivery_challan_id = selectedDcId;
    } else {
      payload.job_card_ids = selectedJobIds;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post('http://127.0.0.1:8000/api/invoices', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFeedback({ type: 'success', message: response.data.message });
      setTimeout(() => {
        setCreating(false);
        fetchInvoices();
      }, 1500);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to generate Invoice.' });
      setSaving(false);
    }
  };

  const handleViewDetails = async (id) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(`http://127.0.0.1:8000/api/invoices/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setViewingInvoice(response.data);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to retrieve invoice details.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleStartEdit = async (invoice) => {
    setIsEditing(true);
    setEditingInvoice(invoice);
    setInvoiceDate(invoice.invoice_date);
    setRemarks(invoice.remarks || '');
    setEwayBillNo(invoice.eway_bill_no || '');
    setSelectedPoId(invoice.purchase_order_id.toString());
    setSelectedDcId(invoice.delivery_challan_id ? invoice.delivery_challan_id.toString() : '');
    
    const linkedJobIds = (invoice.items || []).map(i => i.job_card_id).filter(id => id !== null);
    setSelectedJobIds(linkedJobIds);

    setJobsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const jobsRes = await axios.get('http://127.0.0.1:8000/api/jobs', {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: 'completed', uninvoiced: 1 }
      });
      const filteredJobs = jobsRes.data.filter(j => j.po_item?.purchase_order_id === parseInt(invoice.purchase_order_id, 10));
      
      const invoiceJobs = (invoice.items || []).map(item => {
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
            unit: po.unit || 'PC',
            rate: item.rate,
            cgst: item.cgst_rate,
            sgst: item.sgst_rate,
            igst: item.igst_rate
          } : null
        };
      });

      const mergedJobs = [...invoiceJobs];
      filteredJobs.forEach(job => {
        if (!linkedJobIds.includes(job.id)) {
          mergedJobs.push(job);
        }
      });
      setUninvoicedJobs(mergedJobs);

      const challansRes = await axios.get('http://127.0.0.1:8000/api/delivery-challans', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const filteredChallans = challansRes.data.filter(c => c.purchase_order_id === parseInt(invoice.purchase_order_id, 10));
      setDcList(filteredChallans);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to retrieve invoice items.' });
    } finally {
      setJobsLoading(false);
    }
  };

  const handleUpdateInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceDate) {
      alert('Please select an invoice date.');
      return;
    }
    if (selectedJobIds.length === 0) {
      alert('Please select at least one Job Card to invoice.');
      return;
    }

    setSaving(true);
    setFeedback(null);

    const payload = {
      invoice_date: invoiceDate,
      remarks,
      eway_bill_no: ewayBillNo,
      job_card_ids: selectedJobIds,
    };

    if (selectedDcId) {
      payload.delivery_challan_id = selectedDcId;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.put(`http://127.0.0.1:8000/api/invoices/${editingInvoice.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFeedback({ type: 'success', message: response.data.message });
      const updatedInvoice = response.data.invoice;
      
      setTimeout(() => {
        setIsEditing(false);
        setEditingInvoice(null);
        fetchInvoices();
        if (viewingInvoice && viewingInvoice.id === updatedInvoice.id) {
          setViewingInvoice(updatedInvoice);
        }
      }, 1500);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to update Invoice.' });
    } finally {
      setSaving(false);
    }
  };

  const handleFinalizeInvoice = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to finalize this draft invoice? You won\'t be able to edit it anymore.')) {
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post(`http://127.0.0.1:8000/api/invoices/${invoiceId}/finalize`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFeedback({ type: 'success', message: response.data.message });
      fetchInvoices();
      if (viewingInvoice && viewingInvoice.id === invoiceId) {
        handleViewDetails(invoiceId);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to finalize Invoice.');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const targetInvoice = paymentTargetInvoice ?? viewingInvoice;
    if (!targetInvoice) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post(`http://127.0.0.1:8000/api/invoices/${targetInvoice.id}/record-payment`, {
        payment_method: paymentMethod,
        transaction_reference: transactionReference,
        payment_date: paymentDate,
        payment_remarks: [paymentAccountDetail, paymentRemarks].filter(Boolean).join(' | '),
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFeedback({ type: 'success', message: response.data.message });
      setShowPaymentModal(false);
      setPaymentTargetInvoice(null);
      fetchInvoices();
      // If a full invoice detail view is open, refresh it
      if (viewingInvoice && viewingInvoice.id === targetInvoice.id) {
        handleViewDetails(targetInvoice.id);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async (invoiceNumber) => {
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
      
      pdf.save(`${invoiceNumber || 'Invoice'}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvoice = async () => {
    const reason = prompt('Please enter the reason for cancelling this invoice:');
    if (reason === null) return;
    if (!reason.trim()) {
      alert('A cancellation reason is required.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post(`http://127.0.0.1:8000/api/invoices/${viewingInvoice.id}/cancel`, 
        { cancellation_reason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert(response.data.message);
      handleViewDetails(viewingInvoice.id);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to cancel invoice.');
    } finally {
      setLoading(false);
    }
  };

  // Indian Rupee number to words helper
  const numberToWords = (num) => {
    if (num === 0) return 'Zero';
    const a = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const g = ['', 'Thousand', 'Lakh', 'Crore'];
    
    let n = Math.floor(num);
    
    const formatChunk = (val) => {
      let str = '';
      if (val > 99) {
        str += a[Math.floor(val / 100)] + ' Hundred ';
        val %= 100;
      }
      if (val > 19) {
        str += b[Math.floor(val / 10)] + ' ';
        val %= 10;
      }
      if (val > 0) {
        str += a[val] + ' ';
      }
      return str.trim();
    };

    let chunks = [];
    chunks.push(n % 1000);
    n = Math.floor(n / 1000);
    if (n > 0) {
      chunks.push(n % 100);
      n = Math.floor(n / 100);
    } else {
      chunks.push(0);
    }
    if (n > 0) {
      chunks.push(n % 100);
      n = Math.floor(n / 100);
    } else {
      chunks.push(0);
    }
    if (n > 0) {
      chunks.push(n % 100);
    }

    let parts = [];
    for (let i = 0; i < chunks.length; i++) {
      if (chunks[i] > 0) {
        let chunkText = formatChunk(chunks[i]);
        if (i > 0) {
          chunkText += ' ' + g[i];
        }
        parts.unshift(chunkText);
      }
    }

    let result = parts.join(', ').trim();
    
    let paise = Math.round((num - Math.floor(num)) * 100);
    if (paise > 0) {
      result += ' and ' + formatChunk(paise) + ' Paise';
    }
    
    return result + ' Only';
  };

  const calculateInvoiceTotals = () => {
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    selectedJobIds.forEach(id => {
      const job = uninvoicedJobs.find(j => j.id === id);
      if (!job) return;
      const rate = job.po_item?.rate || 0;
      const qty = job.quantity || 0;
      const itemTaxable = qty * rate;
      subtotal += itemTaxable;
      cgst += itemTaxable * ((job.po_item?.cgst || 0) / 100);
      sgst += itemTaxable * ((job.po_item?.sgst || 0) / 100);
      igst += itemTaxable * ((job.po_item?.igst || 0) / 100);
    });

    return {
      subtotal,
      cgst,
      sgst,
      igst,
      grandTotal: subtotal + cgst + sgst + igst
    };
  };

  const totals = calculateInvoiceTotals();
  const selectedPo = poList.find(p => p.id === parseInt(selectedPoId, 10));

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

  const renderPaymentModal = () => {
    if (!showPaymentModal) return null;
    const modalInvoice = paymentTargetInvoice ?? viewingInvoice;
    return createPortal(
      <>
        <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          backgroundColor: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="no-scrollbar" style={{
            background: 'var(--color-surface, #fff)',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '480px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={20} style={{ color: 'var(--color-primary)' }} />
                Record Payment
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {modalInvoice && (
              <div style={{ backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Invoice Number</span>
                  <strong style={{ fontSize: '13px', color: 'var(--color-text-main)' }}>{modalInvoice.invoice_number}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Customer</span>
                  <strong style={{ fontSize: '13px', color: 'var(--color-text-main)' }}>{modalInvoice.purchase_order?.customer_name || '—'}</strong>
                </div>
                <div style={{ height: '1px', backgroundColor: 'var(--color-border)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-main)' }}>Total Amount Due</span>
                  <strong style={{ fontSize: '18px', color: 'var(--color-primary)' }}>₹{parseFloat(modalInvoice.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
            )}

            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Section: Payment Method */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Payment Method</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { value: 'bank_transfer', label: 'Bank / NEFT', icon: <Building size={18} /> },
                    { value: 'upi', label: 'UPI', icon: <Smartphone size={18} /> },
                    { value: 'cheque', label: 'Cheque', icon: <FileText size={18} /> },
                    { value: 'cash', label: 'Cash', icon: <Banknote size={18} /> },
                    { value: 'credit_card', label: 'Card', icon: <CreditCard size={18} /> },
                    { value: 'other', label: 'Other', icon: <Link size={18} /> },
                  ].map(m => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setPaymentMethod(m.value)}
                      style={{
                        padding: '12px 8px',
                        borderRadius: '10px',
                        border: paymentMethod === m.value ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                        backgroundColor: paymentMethod === m.value ? 'var(--color-primary-light)' : 'var(--color-surface)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        fontWeight: paymentMethod === m.value ? '700' : '600',
                        color: paymentMethod === m.value ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={e => { if (paymentMethod !== m.value) e.currentTarget.style.borderColor = 'var(--color-text-light)'; }}
                      onMouseLeave={e => { if (paymentMethod !== m.value) e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                    >
                      {m.icon}
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section: Transaction Details */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Transaction Details</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Reference / UTR No. <span style={{ color: 'red' }}>*</span></label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={paymentMethod === 'upi' ? 'UPI Ref ID' : paymentMethod === 'cheque' ? 'Cheque No.' : 'UTR / Ref No.'}
                        value={transactionReference}
                        onChange={e => setTransactionReference(e.target.value)}
                        required
                        style={{ fontSize: '13px', height: '38px', paddingLeft: '12px' }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Payment Date <span style={{ color: 'red' }}>*</span></label>
                      <input
                        type="date"
                        className="form-input"
                        value={paymentDate}
                        onChange={e => setPaymentDate(e.target.value)}
                        required
                        style={{ fontSize: '13px', height: '38px', paddingLeft: '12px' }}
                      />
                    </div>
                  </div>

                  {(paymentMethod === 'bank_transfer' || paymentMethod === 'upi' || paymentMethod === 'cheque') && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>
                        {paymentMethod === 'upi' ? 'UPI ID / VPA' : paymentMethod === 'cheque' ? 'Bank & Branch' : 'Bank Account / IFSC'}
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={paymentMethod === 'upi' ? 'e.g. name@okaxis' : paymentMethod === 'cheque' ? 'e.g. SBI, Andheri Branch' : 'e.g. SBI SBIN0001234'}
                        value={paymentAccountDetail}
                        onChange={e => setPaymentAccountDetail(e.target.value)}
                        style={{ fontSize: '13px', height: '38px', paddingLeft: '12px' }}
                      />
                    </div>
                  )}

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>Remarks / Notes</label>
                    <textarea
                      className="form-input"
                      rows={2}
                      placeholder="Optional: add any payment notes, bank details, or reference..."
                      value={paymentRemarks}
                      onChange={e => setPaymentRemarks(e.target.value)}
                      style={{ resize: 'none', fontSize: '13px', padding: '12px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                <button
                  type="button"
                  className="logout-btn"
                  onClick={() => { setShowPaymentModal(false); setPaymentTargetInvoice(null); }}
                  style={{ padding: '10px 20px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="form-button"
                  disabled={saving}
                  style={{ width: 'auto', marginTop: 0, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background: 'linear-gradient(135deg, #4f46e5, #3b82f6)' }}
                >
                  {saving ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
                  {saving ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </>,
      document.body
    );
  };

  // ==========================================
  // VIEW 1: INVOICE DETAILS & PRINT PREVIEW

  // ==========================================
  if (viewingInvoice) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <style>{printStyle}</style>
        
        {/* Title bar */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="logout-btn" onClick={() => setViewingInvoice(null)} style={{ padding: '6px 12px' }}>
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                Commercial Invoice: {viewingInvoice.invoice_number}
                {viewingInvoice.cancelled_at ? (
                  <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '12px', fontWeight: '600' }}>CANCELLED</span>
                ) : viewingInvoice.status === 'draft' ? (
                  <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '12px', fontWeight: '600' }}>DRAFT</span>
                ) : viewingInvoice.status === 'paid' ? (
                  <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '12px', fontWeight: '600' }}>PAID</span>
                ) : (
                  <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#ffedd5', color: '#ea580c', borderRadius: '12px', fontWeight: '600' }}>UNPAID</span>
                )}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Generated on {new Date(viewingInvoice.invoice_date).toLocaleDateString()} for PO #{viewingInvoice.purchase_order?.po_number}.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {!viewingInvoice.cancelled_at && viewingInvoice.status === 'draft' && (
              <>
                <button 
                  onClick={() => handleStartEdit(viewingInvoice)}
                  className="logout-btn"
                  style={{ height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Pencil size={14} /> Edit Draft
                </button>
                <button 
                  onClick={() => handleFinalizeInvoice(viewingInvoice.id)}
                  className="logout-btn"
                  style={{ height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Check size={14} /> Finalize
                </button>
              </>
            )}

            {!viewingInvoice.cancelled_at && viewingInvoice.status === 'unpaid' && (
              <button 
                onClick={() => {
                  setPaymentDate(new Date().toISOString().split('T')[0]);
                  setPaymentMethod('bank_transfer');
                  setTransactionReference('');
                  setPaymentRemarks('');
                  setShowPaymentModal(true);
                }}
                className="logout-btn"
                style={{ height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
              >
                <CreditCard size={14} /> Record Payment
              </button>
            )}

            <button 
              onClick={handlePrint}
              className="logout-btn"
              style={{ height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Printer size={14} /> Print
            </button>

            <button 
              onClick={() => handleDownloadPdf(viewingInvoice.invoice_number)}
              className="form-button"
              style={{ width: 'auto', marginTop: 0, height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--color-primary)' }}
            >
              <Download size={14} /> Download PDF
            </button>
          </div>
        </div>

        <div className="print-grid-wrapper" style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: '20px' }}>
          
          {/* Left Panel: Details */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)', fontWeight: '600' }}>
              Billing Summary
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px' }}>Customer</span>
                <strong>{viewingInvoice.purchase_order?.customer_name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px' }}>Taxable Value</span>
                <strong>₹{parseFloat(viewingInvoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', backgroundColor: 'var(--color-bg-base)', padding: '10px', borderRadius: '4px' }}>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '10px' }}>CGST</span>
                  <strong>₹{parseFloat(viewingInvoice.cgst_total).toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '10px' }}>SGST</span>
                  <strong>₹{parseFloat(viewingInvoice.sgst_total).toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '10px' }}>IGST</span>
                  <strong>₹{parseFloat(viewingInvoice.igst_total).toFixed(2)}</strong>
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px' }}>Invoice Total</span>
                <strong style={{ fontSize: '16px', color: 'var(--color-primary)' }}>₹{parseFloat(viewingInvoice.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
              {viewingInvoice.delivery_challan ? (
                <div>
                  <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px' }}>Linked Delivery Challan</span>
                  <button 
                    onClick={() => navigate('/delivery-challans', { state: { viewDcId: viewingInvoice.delivery_challan.id } })}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-primary)', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline', fontSize: '13px', textAlign: 'left' }}
                  >
                    {viewingInvoice.delivery_challan.challan_number}
                  </button>
                </div>
              ) : (
                <div className="no-print">
                  <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px' }}>Linked Delivery Challan</span>
                  <button 
                    onClick={() => navigate('/delivery-challans', { state: { prefilledPoId: viewingInvoice.purchase_order_id, prefilledInvoiceId: viewingInvoice.id } })}
                    style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', marginTop: '4px' }}
                  >
                    Generate Delivery Challan
                  </button>
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', marginTop: '12px' }}>
                <span style={{ fontWeight: '600', fontSize: '12px', color: 'var(--color-primary)', display: 'block', marginBottom: '8px' }}>Additional Information</span>
                {viewingInvoice.eway_bill_no && (
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px' }}>E-way Bill No.</span>
                    <strong style={{ fontSize: '13px' }}>{viewingInvoice.eway_bill_no}</strong>
                  </div>
                )}
                {viewingInvoice.remarks && (
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px' }}>Remarks</span>
                    <span>{viewingInvoice.remarks}</span>
                  </div>
                )}
              </div>

              {viewingInvoice.status === 'paid' && (
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', marginTop: '12px' }}>
                  <span style={{ fontWeight: '600', fontSize: '12px', color: 'var(--color-primary)', display: 'block', marginBottom: '8px' }}>Payment & Transaction Details</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '10px' }}>Payment Date</span>
                      <strong>{new Date(viewingInvoice.payment_date).toLocaleDateString()}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '10px' }}>Payment Method</span>
                      <strong>{viewingInvoice.payment_method?.replace('_', ' ')?.toUpperCase()}</strong>
                    </div>
                    {viewingInvoice.transaction_reference && (
                      <div>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '10px' }}>Reference/Txn ID</span>
                        <strong>{viewingInvoice.transaction_reference}</strong>
                      </div>
                    )}
                    {viewingInvoice.payment_remarks && (
                      <div>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '10px' }}>Payment Remarks</span>
                        <span>{viewingInvoice.payment_remarks}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!viewingInvoice.cancelled_at ? (
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '16px', display: 'flex', flexDirection: 'column' }} className="no-print">
                  <button 
                    onClick={handleCancelInvoice}
                    className="logout-btn"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '8px', 
                      color: 'var(--color-danger)', 
                      borderColor: 'var(--color-danger)',
                      backgroundColor: 'rgba(239, 68, 68, 0.05)',
                      padding: '10px 16px',
                      width: '100%',
                      fontWeight: '600'
                    }}
                  >
                    <XCircle size={14} /> Cancel / Void Invoice
                  </button>
                </div>
              ) : (
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '16px' }}>
                  <span style={{ color: 'var(--color-danger)', fontWeight: '700', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Cancellation Details</span>
                  <div style={{ backgroundColor: 'var(--color-danger-light)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px', borderRadius: '4px', marginTop: '6px', fontSize: '12px' }}>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Cancelled By:</strong> User #{viewingInvoice.cancelled_by}
                    </div>
                    {viewingInvoice.cancelled_at && (
                      <div style={{ marginBottom: '4px' }}>
                        <strong>Date:</strong> {new Date(viewingInvoice.cancelled_at).toLocaleString()}
                      </div>
                    )}
                    <div>
                      <strong>Reason:</strong> {viewingInvoice.cancellation_reason}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Invoice Paper Sheet */}
          <div className="card" id="print-area" style={{ 
            position: 'relative',
            backgroundColor: '#ffffff', 
            color: '#0f172a',
            border: '1px solid #cbd5e1', 
            borderRadius: 'var(--radius-sm)', 
            padding: '40px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            overflow: 'hidden'
          }}>
            {viewingInvoice.cancelled_at && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-45deg)',
                color: 'rgba(239, 68, 68, 0.15)',
                fontSize: '100px',
                fontWeight: '900',
                letterSpacing: '10px',
                pointerEvents: 'none',
                zIndex: 99,
                userSelect: 'none',
                whiteSpace: 'nowrap',
                border: '15px solid rgba(239, 68, 68, 0.15)',
                padding: '20px 40px',
                borderRadius: '20px',
                textTransform: 'uppercase'
              }}>
                Cancelled
              </div>
            )}
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '20px', marginBottom: '24px' }}>
              <div>
                <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginBottom: '6px', letterSpacing: '0.5px' }}>TAX INVOICE</span>
                <h1 style={{ fontSize: '18px', fontWeight: '800', color: '#1e3a8a', margin: 0 }}>TECHFOCAL ENTERPRISES LLP</h1>
                <p style={{ fontSize: '10px', color: '#475569', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                  Plot 12, Industrial Area Phase-1, GIDC,<br />
                  Ahmedabad, Gujarat, India - 380001<br />
                  <strong>GSTIN: 24AAHFT8902M1Z8</strong>
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: '#475569' }}>ORIGINAL FOR RECIPIENT</h2>
                <p style={{ fontSize: '10px', margin: '6px 0 0 0', lineHeight: '1.4' }}>
                  Invoice No: <strong>{viewingInvoice.invoice_number}</strong><br />
                  Invoice Date: <strong>{new Date(viewingInvoice.invoice_date).toLocaleDateString()}</strong><br />
                  State Code: <strong>24 (Gujarat)</strong>
                </p>
              </div>
            </div>

            {/* Address Blocks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '11px', marginBottom: '24px', lineHeight: '1.5' }}>
              <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '4px' }}>
                <span style={{ fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px', fontSize: '9px', textTransform: 'uppercase' }}>Billed To (Buyer)</span>
                <strong>{viewingInvoice.purchase_order?.customer_name}</strong>
                <p style={{ margin: '4px 0', whiteSpace: 'pre-wrap', color: '#334155' }}>{viewingInvoice.purchase_order?.customer_address}</p>
                <strong>GSTIN: {viewingInvoice.purchase_order?.customer_gstin || 'N/A'}</strong>
              </div>
              <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '4px' }}>
                <span style={{ fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px', fontSize: '9px', textTransform: 'uppercase' }}>Purchase Details</span>
                <strong>Customer PO Ref:</strong> #{viewingInvoice.purchase_order?.po_number}<br />
                <strong>PO Date:</strong> {viewingInvoice.purchase_order?.po_date ? new Date(viewingInvoice.purchase_order.po_date).toLocaleDateString() : 'N/A'}<br />
                {viewingInvoice.delivery_challan && (
                  <>
                    <strong>Delivery Challan:</strong> {viewingInvoice.delivery_challan.challan_number}<br />
                    <strong>Challan Date:</strong> {new Date(viewingInvoice.delivery_challan.challan_date).toLocaleDateString()}<br />
                  </>
                )}
                {viewingInvoice.eway_bill_no && (
                  <>
                    <strong>E-way Bill No:</strong> {viewingInvoice.eway_bill_no}<br />
                  </>
                )}
              </div>
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '24px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #0f172a', borderTop: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '700' }}>
                  <th style={{ padding: '8px 6px', textAlign: 'left', width: '30px' }}>Sr.</th>
                  <th style={{ padding: '8px 6px', textAlign: 'left', width: '90px' }}>Item Code</th>
                  <th style={{ padding: '8px 6px', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', width: '55px' }}>HSN</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', width: '45px' }}>Qty</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', width: '65px' }}>Rate</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', width: '50px' }}>Tax %</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', width: '80px' }}>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {viewingInvoice.items?.map((item, idx) => {
                  const taxRate = parseFloat(item.cgst_rate) + parseFloat(item.sgst_rate) + parseFloat(item.igst_rate);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px 6px', textAlign: 'left' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 6px', fontWeight: '600' }}>{item.po_item?.item_code}</td>
                      <td style={{ padding: '8px 6px', whiteSpace: 'pre-wrap', lineHeight: '1.3' }}>
                        {(item.po_item?.description || '').split('\n')[0]}
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'center' }}>{item.po_item?.hsn_sac || '-'}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>{parseFloat(item.quantity).toFixed(0)}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>₹{parseFloat(item.rate).toFixed(2)}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>{taxRate.toFixed(1)}%</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '700' }}>
                        ₹{parseFloat(item.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Calculations and Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '20px', fontSize: '11px', marginBottom: '30px' }}>
              <div>
                <strong>Amount Chargeable in Words:</strong>
                <p style={{ margin: '6px 0', fontWeight: '600', color: '#1e3a8a', fontStyle: 'italic', fontSize: '11px' }}>
                  {numberToWords(viewingInvoice.grand_total)}
                </p>
              </div>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '12px', lineHeight: '1.6', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Taxable Value:</span>
                  <strong>₹{parseFloat(viewingInvoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
                {parseFloat(viewingInvoice.cgst_total) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Central Tax (CGST):</span>
                    <span>₹{parseFloat(viewingInvoice.cgst_total).toFixed(2)}</span>
                  </div>
                )}
                {parseFloat(viewingInvoice.sgst_total) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>State Tax (SGST):</span>
                    <span>₹{parseFloat(viewingInvoice.sgst_total).toFixed(2)}</span>
                  </div>
                )}
                {parseFloat(viewingInvoice.igst_total) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Integrated Tax (IGST):</span>
                    <span>₹{parseFloat(viewingInvoice.igst_total).toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', marginTop: '6px', paddingTop: '6px', fontSize: '13px' }}>
                  <strong>Invoice Value (Grand Total):</strong>
                  <strong style={{ color: '#1e3a8a' }}>₹{parseFloat(viewingInvoice.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
            </div>

            {/* Signature Area */}
            <div className="print-footer" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', fontSize: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: '40px' }}>
              <div>
                <strong>Declarations:</strong>
                <p style={{ margin: '4px 0', color: '#475569' }}>
                  1. We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                </p>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyItems: 'flex-end', height: '90px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700' }}>For TECHFOCAL ENTERPRISES LLP</span>
                <span style={{ marginTop: 'auto', display: 'block', borderTop: '1px solid #94a3b8', paddingTop: '6px', fontSize: '10px', color: '#475569', width: '160px', alignSelf: 'flex-end', textAlign: 'center' }}>
                  Authorized Signatory
                </span>
              </div>
            </div>
          </div>

        </div>
        
        {renderPaymentModal()}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: LOG NEW INVOICE PANEL
  // ==========================================
  // ==========================================
  // VIEW 1.5: EDIT DRAFT INVOICE PANEL
  // ==========================================
  if (isEditing && editingInvoice) {
    const selectedPo = poList.find(p => p.id === parseInt(selectedPoId, 10)) || editingInvoice.purchase_order;

    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Title bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="logout-btn" onClick={() => { setIsEditing(false); setEditingInvoice(null); }} style={{ padding: '6px 12px' }}>
              <ArrowLeft size={16} /> Cancel Edit
            </button>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Edit Draft Invoice: {editingInvoice.invoice_number}</h2>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Modify invoice date, remarks, eway bill number, and Job Card linkages.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              type="button" 
              className="logout-btn" 
              onClick={(e) => {
                handleUpdateInvoice(e);
              }}
              disabled={saving}
              style={{ padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px', height: '38px' }}
            >
              Save Draft
            </button>
            <button 
              type="button" 
              className="form-button" 
              onClick={async (e) => {
                e.preventDefault();
                setSaving(true);
                try {
                  const token = localStorage.getItem('auth_token');
                  const payload = {
                    invoice_date: invoiceDate,
                    remarks,
                    eway_bill_no: ewayBillNo,
                    job_card_ids: selectedJobIds,
                    status: 'unpaid'
                  };
                  if (selectedDcId) {
                    payload.delivery_challan_id = selectedDcId;
                  }
                  
                  const response = await axios.put(`http://127.0.0.1:8000/api/invoices/${editingInvoice.id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                  });

                  setFeedback({ type: 'success', message: 'Invoice generated and finalized successfully!' });
                  setTimeout(() => {
                    setIsEditing(false);
                    setEditingInvoice(null);
                    fetchInvoices();
                    setViewingInvoice(response.data.invoice);
                  }, 1500);
                } catch (err) {
                  console.error(err);
                  setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to finalize Invoice.' });
                  setSaving(false);
                }
              }}
              disabled={saving}
              style={{ width: 'auto', marginTop: 0, padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px', height: '38px', backgroundColor: 'var(--color-primary)' }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Finalize & Publish
            </button>
          </div>
        </div>

        {feedback && (
          <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: 0 }}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* Left panel: Edit Form */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label"><User size={12} /> Purchase Order</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={selectedPo ? `PO #${selectedPo.po_number} (${selectedPo.customer_name})` : ''}
                  disabled
                  style={{ paddingLeft: '12px', backgroundColor: 'var(--color-bg-base)', cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label"><Calendar size={12} /> Invoice Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  style={{ paddingLeft: '12px' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Link Delivery Challan (Optional)</label>
                <CustomSelect
                  value={selectedDcId}
                  onChange={(val) => handleDcChange(val)}
                  options={[
                    { value: '', label: '-- Select Outgoing Challan --' },
                    ...dcList.map(dc => ({ value: dc.id.toString(), label: `${dc.challan_number} (${new Date(dc.challan_date).toLocaleDateString()})` }))
                  ]}
                  style={{ height: '38px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Invoice Remarks</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Terms Net 30"
                  style={{ paddingLeft: '12px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">E-way Bill No.</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={ewayBillNo}
                  onChange={(e) => setEwayBillNo(e.target.value)}
                  placeholder="e.g. 121314151617"
                  style={{ paddingLeft: '12px' }}
                />
              </div>
              <div className="form-group">
              </div>
            </div>

            {/* List of completed job cards ready to be billed (only if no DC selected) */}
            {!selectedDcId && (
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Select Job Cards for Billing</h4>
                
                {jobsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                    <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                  </div>
                ) : uninvoicedJobs.length === 0 ? (
                  <div style={{ padding: '20px', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                    No completed Job Cards found.
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                          <th style={{ padding: '10px', width: '40px', textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedJobIds.length === uninvoicedJobs.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedJobIds(uninvoicedJobs.map(j => j.id));
                                } else {
                                  setSelectedJobIds([]);
                                }
                              }}
                            />
                          </th>
                          <th style={{ padding: '10px' }}>Job Card #</th>
                          <th style={{ padding: '10px' }}>Item Code</th>
                          <th style={{ padding: '10px', textAlign: 'right' }}>Qty</th>
                          <th style={{ padding: '10px', textAlign: 'right' }}>Rate (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uninvoicedJobs.map((job) => (
                          <tr key={job.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '10px', textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={selectedJobIds.includes(job.id)}
                                onChange={() => handleCheckboxChange(job.id)}
                              />
                            </td>
                            <td style={{ padding: '10px', fontWeight: '600' }}>{job.job_card_number}</td>
                            <td style={{ padding: '10px', fontWeight: '500' }}>{job.po_item?.item_code}</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>{job.quantity} {job.po_item?.unit || 'PC'}</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>₹{parseFloat(job.po_item?.rate || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
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
              PROPOSED EDITED INVOICE PREVIEW
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h1 style={{ fontSize: '16px', fontWeight: '800', color: '#1e3a8a', margin: 0 }}>TECHFOCAL ENTERPRISES LLP</h1>
                <span style={{ fontSize: '10px', color: '#475569' }}>Ahmedabad, Gujarat</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '13px', fontWeight: '800', margin: 0, color: '#475569' }}>TAX INVOICE</h2>
                <span style={{ fontSize: '10px', color: '#475569' }}>Invoice No: <strong>{editingInvoice.invoice_number}</strong></span>
              </div>
            </div>

            {selectedPo ? (
              <div style={{ border: '1px solid #cbd5e1', padding: '10px', borderRadius: '4px', fontSize: '11px', marginBottom: '20px', lineHeight: '1.5' }}>
                <strong>Billed To:</strong><br />
                {selectedPo.customer_name}<br />
                <strong>GSTIN:</strong> {selectedPo.customer_gstin || 'N/A'}
              </div>
            ) : null}

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '20px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #0f172a', borderTop: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Item Code</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Qty</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Rate</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedJobIds.map((id, index) => {
                  const job = uninvoicedJobs.find(j => j.id === id);
                  if (!job) return null;
                  const rate = job.po_item?.rate || 0;
                  const qty = job.quantity || 0;
                  const amount = rate * qty;
                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 8px', fontWeight: '600' }}>{job.po_item?.item_code}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{qty}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>₹{parseFloat(rate).toFixed(2)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '700' }}>
                        ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
                {selectedJobIds.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                      No items selected.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {selectedJobIds.length > 0 && (
              <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '10px', fontSize: '11px', lineHeight: '1.6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <strong>₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
                {totals.cgst > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>CGST:</span>
                    <span>₹{totals.cgst.toFixed(2)}</span>
                  </div>
                )}
                {totals.sgst > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>SGST:</span>
                    <span>₹{totals.sgst.toFixed(2)}</span>
                  </div>
                )}
                {totals.igst > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>IGST:</span>
                    <span>₹{totals.igst.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', marginTop: '6px', paddingTop: '6px', fontSize: '13px' }}>
                  <strong>Grand Total:</strong>
                  <strong style={{ color: '#1e3a8a' }}>₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
            )}
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
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Generate Commercial Invoice</h2>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Select Purchase Order, and optionally select a Delivery Challan to bill.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              type="button" 
              className="logout-btn" 
              onClick={(e) => handleSaveInvoice(e, 'draft')}
              disabled={saving}
              style={{ padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px', height: '38px' }}
            >
              Save as Draft
            </button>
            <button 
              type="button" 
              className="form-button" 
              onClick={(e) => handleSaveInvoice(e, 'unpaid')}
              disabled={saving}
              style={{ width: 'auto', marginTop: 0, padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px', height: '38px', backgroundColor: 'var(--color-primary)' }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Generate Invoice
            </button>
          </div>
        </div>

        {feedback && (
          <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: 0 }}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* Left panel: Form */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
            {isDcPrefilled && (
              <div className="alert alert-success" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} />
                <span>Generating Invoice from Delivery Challan. Items from the challan are automatically preloaded.</span>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label"><User size={12} /> Select Purchase Order</label>
                <CustomSelect
                  value={selectedPoId}
                  onChange={(val) => handlePoChange(val)}
                  options={[
                    { value: '', label: '-- Choose Approved PO --' },
                    ...poList.map(po => ({ value: po.id.toString(), label: `PO #${po.po_number} (${po.customer_name})` }))
                  ]}
                  disabled={isDcPrefilled}
                  style={{ height: '38px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label"><Calendar size={12} /> Invoice Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  style={{ paddingLeft: '12px' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Link Delivery Challan (Optional)</label>
                <CustomSelect
                  value={selectedDcId}
                  onChange={(val) => handleDcChange(val)}
                  options={[
                    { value: '', label: '-- Select Outgoing Challan --' },
                    ...dcList.map(dc => ({ value: dc.id.toString(), label: `${dc.challan_number} (${new Date(dc.challan_date).toLocaleDateString()})` }))
                  ]}
                  disabled={isDcPrefilled || !selectedPoId}
                  style={{ height: '38px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Invoice Remarks</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Terms Net 30"
                  style={{ paddingLeft: '12px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">E-way Bill No.</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={ewayBillNo}
                  onChange={(e) => setEwayBillNo(e.target.value)}
                  placeholder="e.g. 121314151617"
                  style={{ paddingLeft: '12px' }}
                />
              </div>
              <div className="form-group">
              </div>
            </div>

            {/* List of completed job cards ready to be billed (only if no DC selected) */}
            {!selectedDcId && (
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Or Select Completed Job Cards Directly</h4>
                
                {jobsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                    <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                  </div>
                ) : !selectedPoId ? (
                  <div style={{ padding: '20px', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                    Please select a Purchase Order above first to view completed Job Cards.
                  </div>
                ) : uninvoicedJobs.length === 0 ? (
                  <div style={{ padding: '20px', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                    No completed and uninvoiced Job Cards found for this Purchase Order.
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                          <th style={{ padding: '10px', width: '40px', textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedJobIds.length === uninvoicedJobs.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedJobIds(uninvoicedJobs.map(j => j.id));
                                } else {
                                  setSelectedJobIds([]);
                                }
                              }}
                            />
                          </th>
                          <th style={{ padding: '10px' }}>Job Card #</th>
                          <th style={{ padding: '10px' }}>Item Code</th>
                          <th style={{ padding: '10px', textAlign: 'right' }}>Qty</th>
                          <th style={{ padding: '10px', textAlign: 'right' }}>Rate (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uninvoicedJobs.map((job) => (
                          <tr key={job.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '10px', textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={selectedJobIds.includes(job.id)}
                                onChange={() => handleCheckboxChange(job.id)}
                              />
                            </td>
                            <td style={{ padding: '10px', fontWeight: '600' }}>{job.job_card_number}</td>
                            <td style={{ padding: '10px', fontWeight: '500' }}>{job.po_item?.item_code}</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>{job.quantity} {job.po_item?.unit || 'PC'}</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>₹{parseFloat(job.po_item?.rate || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
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
              DRAFT TAX INVOICE PREVIEW
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h1 style={{ fontSize: '16px', fontWeight: '800', color: '#1e3a8a', margin: 0 }}>TECHFOCAL ENTERPRISES LLP</h1>
                <span style={{ fontSize: '10px', color: '#475569' }}>Ahmedabad, Gujarat</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '13px', fontWeight: '800', margin: 0, color: '#475569' }}>TAX INVOICE</h2>
                <span style={{ fontSize: '10px', color: '#475569' }}>Invoice No: <strong>INV-DRAFT</strong></span>
              </div>
            </div>

            {selectedPo ? (
              <div style={{ border: '1px solid #cbd5e1', padding: '10px', borderRadius: '4px', fontSize: '11px', marginBottom: '20px', lineHeight: '1.5' }}>
                <strong>Billed To:</strong><br />
                {selectedPo.customer_name}<br />
                <strong>GSTIN:</strong> {selectedPo.customer_gstin || 'N/A'}
              </div>
            ) : (
              <div style={{ padding: '20px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#94a3b8', fontSize: '11px', marginBottom: '20px' }}>
                Select a PO to see billing context.
              </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '20px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #0f172a', borderTop: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Item Code</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Qty</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Rate</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedJobIds.map((id, index) => {
                  const job = uninvoicedJobs.find(j => j.id === id);
                  if (!job) return null;
                  const rate = job.po_item?.rate || 0;
                  const qty = job.quantity || 0;
                  const amount = rate * qty;
                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 8px', fontWeight: '600' }}>{job.po_item?.item_code}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{qty}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>₹{parseFloat(rate).toFixed(2)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '700' }}>
                        ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
                {selectedJobIds.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                      No items selected.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {selectedJobIds.length > 0 && (
              <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '10px', fontSize: '11px', lineHeight: '1.6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <strong>₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
                {totals.cgst > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>CGST:</span>
                    <span>₹{totals.cgst.toFixed(2)}</span>
                  </div>
                )}
                {totals.sgst > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>SGST:</span>
                    <span>₹{totals.sgst.toFixed(2)}</span>
                  </div>
                )}
                {totals.igst > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>IGST:</span>
                    <span>₹{totals.igst.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', marginTop: '6px', paddingTop: '6px', fontSize: '13px' }}>
                  <strong>Grand Total:</strong>
                  <strong style={{ color: '#1e3a8a' }}>₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // DEFAULT VIEW: LIST INVOICES TABLE
  // ==========================================
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Invoices & Commercial Billing</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Log commercial tax invoices for delivered shop floor batches with automatic GST calculation.
          </p>
        </div>

        <button 
          onClick={handleStartCreate}
          className="form-button"
          style={{ width: 'auto', marginTop: 0, height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Receipt size={14} />
          Create Invoice
        </button>
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: 0 }}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

{/* Invoices Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {invoices.length === 0 && !loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyItems: 'center', padding: '60px 20px', gap: '12px' }}>
            <Receipt size={40} style={{ color: 'var(--color-text-light)' }} />
            <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>No Commercial Invoices logged yet.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '16px' }}>Invoice Number</th>
                <th style={{ padding: '16px' }}>Date</th>
                <th style={{ padding: '16px' }}>Purchase Order</th>
                <th style={{ padding: '16px' }}>Client</th>
                <th style={{ padding: '16px', textAlign: 'right' }}>Total Amount</th>
                <th style={{ padding: '16px' }}>Status</th>
                <th style={{ padding: '16px' }}>Linked DC</th>
                <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && invoices.length === 0 ? (
                Array.from({ length: 5 }).map((_, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '90px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '70px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '95px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '140px' }} /></td>
                    <td style={{ padding: '16px', textAlign: 'right' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '100px', marginLeft: 'auto' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '60px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '80px' }} /></td>
                    <td style={{ padding: '16px', textAlign: 'right' }}><div className="skeleton-line animate-pulse" style={{ height: '28px', width: '80px', marginLeft: 'auto' }} /></td>
                  </tr>
                ))
              ) :
                invoices.map(inv => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }} className="table-row-hover">
                  <td style={{ padding: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {inv.invoice_number}
                    {inv.cancelled_at && (
                      <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', fontWeight: '600' }}>
                        CANCELLED
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '16px' }}>{new Date(inv.invoice_date).toLocaleDateString()}</td>
                  <td style={{ padding: '16px', fontWeight: '500' }}>PO #{inv.purchase_order?.po_number}</td>
                  <td style={{ padding: '16px' }}>{inv.purchase_order?.customer_name}</td>
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: '700', color: 'var(--color-primary)' }}>
                    ₹{parseFloat(inv.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {inv.cancelled_at ? (
                      <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '12px', fontWeight: '600' }}>Cancelled</span>
                    ) : inv.status === 'draft' ? (
                      <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '12px', fontWeight: '600' }}>Draft</span>
                    ) : inv.status === 'paid' ? (
                      <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '12px', fontWeight: '600' }}>Paid</span>
                    ) : (
                      <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#ffedd5', color: '#ea580c', borderRadius: '12px', fontWeight: '600' }}>Unpaid</span>
                    )}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {inv.delivery_challan ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/delivery-challans', { state: { viewDcId: inv.delivery_challan.id } });
                        }}
                        style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-primary)', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {inv.delivery_challan.challan_number}
                      </button>
                    ) : (
                      <span style={{ color: 'var(--color-text-light)', fontStyle: 'italic', fontSize: '12px' }}>No DC Linked</span>
                    )}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleViewDetails(inv.id)}
                        className="logout-btn"
                        style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                      >
                        <Eye size={12} />
                        View & Print
                      </button>

                      {inv.status === 'draft' && !inv.cancelled_at && (
                        <button 
                          onClick={() => handleStartEdit(inv)}
                          className="logout-btn"
                          style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                        >
                          <Pencil size={12} />
                          Edit
                        </button>
                      )}

                      {inv.status === 'unpaid' && !inv.cancelled_at && (
                        <button 
                          onClick={() => {
                            setPaymentTargetInvoice(inv);
                            setPaymentDate(new Date().toISOString().split('T')[0]);
                            setPaymentMethod('bank_transfer');
                            setTransactionReference('');
                            setPaymentAccountDetail('');
                            setPaymentRemarks('');
                            setShowPaymentModal(true);
                          }}
                          className="logout-btn"
                          style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                        >
                          <CreditCard size={12} />
                          Record Payment
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Record Payment Modal ── */}
      {renderPaymentModal()}
    </div>
  );
}
