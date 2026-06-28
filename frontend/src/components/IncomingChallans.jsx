import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import CustomSelect from './CustomSelect';
import { 
  ClipboardList, 
  FileText, 
  Upload, 
  Calendar, 
  User, 
  Wrench, 
  AlertTriangle, 
  Check, 
  ArrowLeft, 
  CheckCircle2, 
  Loader2, 
  ExternalLink,
  Eye,
  Pencil,
  Trash2,
  Printer,
  Download,
  Save,
  X
} from 'lucide-react';

export default function IncomingChallans() {
  const location = useLocation();
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Form State
  const [poList, setPoList] = useState([]);
  const [selectedPo, setSelectedPo] = useState(null);
  const [challanNo, setChallanNo] = useState('');
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [pdfPath, setPdfPath] = useState(null);
  const [items, setItems] = useState([]); // Array of { po_item_id, item_code, description, ordered_quantity, received_qty (already), quantity_received (current) }

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewingChallan, setViewingChallan] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingChallan, setEditingChallan] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  // Fetch logged challans
  const fetchChallans = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/incoming-challans');
      setChallans(response.data);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to load incoming challans.' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch approved POs for dropdown
  const fetchApprovedPOs = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/purchase-orders?status=approved');
      setPoList(response.data);
    } catch (err) {
      console.error('Failed to load approved POs', err);
    }
  };

  useEffect(() => {
    fetchChallans();
    if (location.state && location.state.fromPoId) {
      setCreating(true);
      fetchApprovedPOs();
      handlePoChange(location.state.fromPoId);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleStartCreate = () => {
    setCreating(true);
    fetchApprovedPOs();
    setChallanNo('');
    setChallanDate(new Date().toISOString().split('T')[0]);
    setRemarks('');
    setPdfPath(null);
    setItems([]);
    setSelectedPo(null);
    setFeedback(null);
  };

  const handleCancelCreate = () => {
    setCreating(false);
    setFeedback(null);
  };

  const handleStartEdit = async (challan) => {
    setLoading(true);
    setFeedback(null);
    try {
      const poRes = await axios.get(`http://127.0.0.1:8000/api/purchase-orders/${challan.purchase_order_id}`);
      const po = poRes.data;
      
      setSelectedPo(po);
      setChallanNo(challan.challan_number);
      setChallanDate(challan.challan_date);
      setRemarks(challan.remarks || '');
      setPdfPath(challan.pdf_path);
      setEditingChallan(challan);
      setViewingChallan(null);
      setCreating(false);
      
      const editItems = po.items.map(poItem => {
        const currentChallanItem = challan.items?.find(ci => ci.po_item_id === poItem.id);
        const currentQty = currentChallanItem ? parseFloat(currentChallanItem.quantity_received) : 0;
        const otherQty = Math.max(0, parseFloat(poItem.received_qty || 0) - currentQty);

        return {
          po_item_id: poItem.id,
          item_code: poItem.item_code,
          description: poItem.description,
          ordered_quantity: poItem.quantity,
          received_qty: otherQty,
          quantity_received: currentQty,
        };
      });
      setItems(editItems);
      setIsEditing(true);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to load challan edit information.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingChallan(null);
    setFeedback(null);
    setChallanNo('');
    setChallanDate(new Date().toISOString().split('T')[0]);
    setRemarks('');
    setPdfPath(null);
    setItems([]);
    setSelectedPo(null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!challanNo.trim()) {
      setFeedback({ type: 'danger', message: 'Challan Number is required.' });
      return;
    }

    const itemsToSubmit = items
      .filter(item => parseFloat(item.quantity_received) > 0)
      .map(item => ({
        po_item_id: item.po_item_id,
        quantity_received: parseFloat(item.quantity_received),
      }));

    if (itemsToSubmit.length === 0) {
      setFeedback({ type: 'danger', message: 'At least one item must have a received quantity greater than 0.' });
      return;
    }

    setEditSaving(true);
    setFeedback(null);

    try {
      const response = await axios.put(`http://127.0.0.1:8000/api/incoming-challans/${editingChallan.id}`, {
        challan_number: challanNo,
        challan_date: challanDate,
        remarks: remarks,
        items: itemsToSubmit,
      });

      setFeedback({ type: 'success', message: response.data.message });
      setIsEditing(false);
      setEditingChallan(null);
      fetchChallans();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to update Incoming Challan.' });
    } finally {
      setEditSaving(false);
    }
  };

  const handleArchiveChallan = async (challan) => {
    if (!window.confirm(`Are you sure you want to archive Incoming Challan "${challan.challan_number}"?`)) {
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const response = await axios.post(`http://127.0.0.1:8000/api/incoming-challans/${challan.id}/archive`);
      setFeedback({ type: 'success', message: response.data.message });
      setViewingChallan(null);
      fetchChallans();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to archive Incoming Challan.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintChallan = () => {
    window.print();
  };

  const handleDownloadChallan = () => {
    if (viewingChallan.pdf_path) {
      const link = document.createElement('a');
      const url = `http://127.0.0.1:8000/${viewingChallan.pdf_path}`;
      link.href = url;
      link.download = viewingChallan.pdf_path.split('/').pop();
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      window.print();
    }
  };

  // When manually selecting a PO from dropdown
  const handlePoChange = async (poId) => {
    if (!poId) {
      setSelectedPo(null);
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/purchase-orders/${poId}`);
      setSelectedPo(response.data);
      
      // Initialize items from PO
      const challanItems = response.data.items.map(item => ({
        po_item_id: item.id,
        item_code: item.item_code,
        description: item.description,
        ordered_quantity: item.quantity,
        received_qty: item.received_qty || 0,
        quantity_received: 0, // default to 0, user enters what arrived
      }));
      setItems(challanItems);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to load PO items.' });
    } finally {
      setLoading(false);
    }
  };

  // Upload and parse Challan PDF
  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // 1. Upload and run parse on backend
      const response = await axios.post('http://127.0.0.1:8000/api/incoming-challans/parse', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;
      setChallanNo(data.challan_number || '');
      if (data.challan_date) setChallanDate(data.challan_date);
      setPdfPath(data.pdf_path);

      // 2. If PO matched, load the PO details to calculate already received quantities
      if (data.purchase_order_id) {
        // Fetch approved list first to ensure dropdown values exist
        await fetchApprovedPOs();
        
        const poRes = await axios.get(`http://127.0.0.1:8000/api/purchase-orders/${data.purchase_order_id}`);
        setSelectedPo(poRes.data);

        // Map parsed quantities to PO items
        const mappedItems = poRes.data.items.map(poItem => {
          // Find if this item code was in the parsed challan items
          const parsedItem = data.items.find(pi => pi.item_code === poItem.item_code);
          const maxAllowed = poItem.quantity - (poItem.received_qty || 0);
          return {
            po_item_id: poItem.id,
            item_code: poItem.item_code,
            description: poItem.description,
            ordered_quantity: poItem.quantity,
            received_qty: poItem.received_qty || 0,
            quantity_received: parsedItem ? Math.min(parsedItem.quantity_received, Math.max(0, maxAllowed)) : 0,
          };
        });

        setItems(mappedItems);
        setFeedback({ type: 'success', message: `Matched with Purchase Order #${poRes.data.po_number} successfully.` });
      } else {
        setFeedback({ type: 'warning', message: 'Challan PDF parsed, but we could not find a matching PO number in the document. Please select the Purchase Order manually.' });
      }

    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to parse Challan PDF.' });
    } finally {
      setUploading(false);
    }
  };

  const handleQtyChange = (idx, value) => {
    const val = parseFloat(value) || 0;
    setItems(prev => {
      const copy = [...prev];
      copy[idx].quantity_received = val;
      return copy;
    });
  };

  const handleSaveChallan = async (e) => {
    e.preventDefault();

    if (!selectedPo) {
      alert('Please select a Purchase Order.');
      return;
    }

    const filteredItems = items.filter(item => item.quantity_received > 0);
    if (filteredItems.length === 0) {
      alert('You must log a quantity received of at least one item.');
      return;
    }

    setSaving(true);
    setFeedback(null);

    const payload = {
      challan_number: challanNo,
      challan_date: challanDate,
      purchase_order_id: selectedPo.id,
      pdf_path: pdfPath,
      remarks: remarks,
      items: filteredItems
    };

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/incoming-challans', payload);
      setFeedback({ type: 'success', message: response.data.message });
      
      setTimeout(() => {
        setCreating(false);
        fetchChallans();
      }, 1500);

    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to save incoming challan.' });
      setSaving(false);
    }
  };

  const handleViewChallanDetails = async (challanId) => {
    setLoading(true);
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/incoming-challans/${challanId}`);
      setViewingChallan(response.data);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to retrieve challan details.' });
    } finally {
      setLoading(false);
    }
  };

  // View details splitscreen render
  if (viewingChallan) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="logout-btn no-print" onClick={() => setViewingChallan(null)} style={{ padding: '6px 12px', marginTop: 0 }}>
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Material Receipt: {viewingChallan.challan_number}</h2>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                Logged on {new Date(viewingChallan.challan_date).toLocaleDateString()} for PO #{viewingChallan.purchase_order?.po_number}.
              </p>
            </div>
          </div>
          
          <div className="no-print" style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => handleStartEdit(viewingChallan)}
              className="logout-btn"
              style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-primary)', borderColor: 'rgba(37,99,235,0.2)', marginTop: 0 }}
            >
              <Pencil size={14} /> Edit
            </button>
            <button 
              onClick={() => handlePrintChallan()}
              className="logout-btn"
              style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', marginTop: 0 }}
            >
              <Printer size={14} /> Print
            </button>
            <button 
              onClick={() => handleDownloadChallan()}
              className="logout-btn"
              style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', marginTop: 0 }}
            >
              <Download size={14} /> Download PDF
            </button>
            <button 
              onClick={() => handleArchiveChallan(viewingChallan)}
              className="logout-btn"
              style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.2)', marginTop: 0 }}
            >
              <Trash2 size={14} /> Archive
            </button>
          </div>
        </div>

        <div className="print-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Details Table */}
          <div className="card print-full-width" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>
              Challan Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>Customer Name</span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>{viewingChallan.purchase_order?.customer_name}</span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>Challan Date</span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>{new Date(viewingChallan.challan_date).toLocaleDateString()}</span>
              </div>
            </div>

            {viewingChallan.remarks && (
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>Remarks</span>
                <span style={{ fontSize: '13px' }}>{viewingChallan.remarks}</span>
              </div>
            )}

            <div>
              <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px' }}>Received Items</h4>
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                      <th style={{ padding: '10px' }}>Item Code</th>
                      <th style={{ padding: '10px' }}>Description</th>
                      <th style={{ padding: '10px', width: '120px', textAlign: 'right' }}>Qty Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingChallan.items?.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '10px', fontWeight: '500' }}>{item.po_item?.item_code}</td>
                        <td style={{ padding: '10px', fontSize: '12px' }}>{(item.po_item?.description || '').split('\n')[0]}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600' }}>{item.quantity_received} {item.po_item?.unit || 'PC'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* IFrame PDF Viewer */}
          <div className="card no-print" style={{ padding: 0, overflow: 'hidden', height: 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-bg-base)' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Original Delivery Challan</span>
              {viewingChallan.pdf_path && (
                <a href={`http://127.0.0.1:8000/${viewingChallan.pdf_path}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-primary)' }}>
                  Open Full PDF <ExternalLink size={12} />
                </a>
              )}
            </div>
            <div style={{ flexGrow: 1, backgroundColor: '#525659' }}>
              {viewingChallan.pdf_path ? (
                <iframe src={`http://127.0.0.1:8000/${viewingChallan.pdf_path}`} width="100%" height="100%" style={{ border: 'none' }} title="Challan Viewer" />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ffffff' }}>No PDF document attached.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Edit Mode Splitscreen
  if (isEditing && editingChallan) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Title bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="logout-btn" onClick={handleCancelEdit} style={{ padding: '6px 12px', marginTop: 0 }}>
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Edit Material Receipt (Incoming Challan)</h2>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Modify the details and received quantities for this delivery challan.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="form-button" 
            onClick={handleSaveEdit}
            disabled={editSaving}
            style={{ width: 'auto', marginTop: 0, padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px', height: '38px', backgroundColor: 'var(--color-primary)' }}
          >
            {editSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>

        {/* Feedback messages */}
        {feedback && (
          <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: 0 }}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Splitscreen grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '20px' }}>
          
          {/* LEFT FORM PANEL */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>
              Receipt Details
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label">Challan Number</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={challanNo} 
                  onChange={(e) => setChallanNo(e.target.value)}
                  placeholder="Enter Challan No"
                  disabled={editSaving}
                />
              </div>

              <div>
                <label className="form-label">Challan Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={challanDate} 
                  onChange={(e) => setChallanDate(e.target.value)}
                  disabled={editSaving}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              <div>
                <label className="form-label">Purchase Order (Read-only)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={selectedPo ? `PO #${selectedPo.po_number} (${selectedPo.customer_name})` : ''} 
                  disabled={true}
                  style={{ backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-muted)' }}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Remarks</label>
              <textarea 
                className="form-input" 
                value={remarks} 
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Internal notes or remarks..."
                style={{ height: '70px', resize: 'vertical' }}
                disabled={editSaving}
              />
            </div>

            {/* Items Grid */}
            {items.length > 0 && (
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Log Arrived Quantities</h4>
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                        <th style={{ padding: '8px' }}>Item Code</th>
                        <th style={{ padding: '8px' }}>Description</th>
                        <th style={{ padding: '8px', width: '80px', textAlign: 'right' }}>Ordered</th>
                        <th style={{ padding: '8px', width: '80px', textAlign: 'right' }}>Other Recd</th>
                        <th style={{ padding: '8px', width: '90px', textAlign: 'right' }}>Received Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const maxAllowed = item.ordered_quantity - item.received_qty;
                        const isFullyReceivedByOthers = maxAllowed <= 0;
                        return (
                          <tr key={idx} style={{ 
                            borderBottom: '1px solid var(--color-border)',
                            backgroundColor: isFullyReceivedByOthers ? '#f1f5f9' : 'transparent',
                            opacity: isFullyReceivedByOthers ? 0.7 : 1
                          }}>
                            <td style={{ padding: '8px', fontWeight: '500' }}>{item.item_code}</td>
                            <td style={{ padding: '8px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                              {(item.description || '').split('\n')[0]}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{item.ordered_quantity}</td>
                            <td style={{ padding: '8px', textAlign: 'right', color: 'var(--color-primary)' }}>{item.received_qty}</td>
                            <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                              {isFullyReceivedByOthers ? (
                                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Fully Received (Others)</span>
                              ) : (
                                <input 
                                  type="number" 
                                  step="0.01"
                                  className="form-input" 
                                  value={item.quantity_received}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const updated = [...items];
                                    updated[idx].quantity_received = val === '' ? '' : Math.min(maxAllowed, Math.max(0, parseFloat(val) || 0));
                                    setItems(updated);
                                  }}
                                  style={{ padding: '4px 6px', fontSize: '11px', textAlign: 'right', width: '80px', display: 'inline-block' }}
                                  disabled={editSaving}
                                  max={maxAllowed}
                                  min="0"
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

          {/* RIGHT PDF VIEWER */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', height: 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Uploaded Challan Document Viewer</span>
            </div>
            <div style={{ flexGrow: 1, backgroundColor: '#525659', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {pdfPath ? (
                <iframe src={`http://127.0.0.1:8000/${pdfPath}`} width="100%" height="100%" style={{ border: 'none' }} title="Parsed Challan Viewer" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: '#cbd5e1', fontSize: '13px' }}>
                  <FileText size={48} style={{ color: '#94a3b8' }} />
                  <span>No attached PDF document to display.</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Create Mode Splitscreen
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
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Log Material Receipt (Incoming Challan)</h2>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Upload customer challan PDF to auto-fill, or manually log batch components.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="form-button" 
            onClick={handleSaveChallan}
            disabled={saving || uploading}
            style={{ width: 'auto', marginTop: 0, padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px', height: '38px', backgroundColor: 'var(--color-primary)' }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Confirm & Log Challan
          </button>
        </div>

        {/* Feedback messages */}
        {feedback && (
          <div className={`alert alert-${feedback.type === 'success' ? 'success' : feedback.type === 'warning' ? 'warning' : 'danger'}`} style={{ marginBottom: 0 }}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Splitscreen grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '20px' }}>
          
          {/* LEFT FORM PANEL */}
          <div className="card" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* PDF Uploader */}
            <div style={{ border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '16px', textAlign: 'center', backgroundColor: 'var(--color-bg-base)', transition: 'all 0.15s ease' }}>
              <input 
                type="file" 
                id="challan-pdf" 
                accept=".pdf" 
                onChange={handlePdfUpload} 
                style={{ display: 'none' }}
                disabled={uploading || saving}
              />
              <label htmlFor="challan-pdf" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                {uploading ? (
                  <>
                    <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>Extracting Challan Text...</span>
                  </>
                ) : (
                  <>
                    <Upload size={24} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>Upload Customer Challan PDF</span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Auto-populates items, PO references, and counts</span>
                  </>
                )}
              </label>
            </div>

            {/* Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label"><Wrench size={12} /> Purchase Order Ref</label>
                <CustomSelect
                  value={selectedPo?.id || ''}
                  onChange={(val) => handlePoChange(val)}
                  options={[
                    { value: '', label: '-- Choose Approved PO --' },
                    ...poList.map(po => ({ value: po.id, label: `PO #${po.po_number} (${po.customer_name})` }))
                  ]}
                  disabled={uploading || saving}
                  style={{ height: '38px' }}
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
                  disabled={uploading || saving}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label"><FileText size={12} /> Challan Number</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={challanNo}
                  onChange={(e) => setChallanNo(e.target.value)}
                  placeholder="e.g. DC-1092"
                  style={{ paddingLeft: '12px' }}
                  disabled={uploading || saving}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Remarks / Notes</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Pallet 2 arrived"
                  style={{ paddingLeft: '12px' }}
                  disabled={uploading || saving}
                />
              </div>
            </div>

            {/* Items Grid */}
            {items.length > 0 && (
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Log Arrived Quantities</h4>
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                        <th style={{ padding: '8px' }}>Item Code</th>
                        <th style={{ padding: '8px' }}>Description</th>
                        <th style={{ padding: '8px', width: '80px', textAlign: 'right' }}>Ordered</th>
                        <th style={{ padding: '8px', width: '80px', textAlign: 'right' }}>Prev Recd</th>
                        <th style={{ padding: '8px', width: '90px', textAlign: 'right' }}>Received Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const maxAllowed = item.ordered_quantity - item.received_qty;
                        const isFullyReceived = maxAllowed <= 0;
                        return (
                          <tr key={idx} style={{ 
                            borderBottom: '1px solid var(--color-border)', 
                            backgroundColor: isFullyReceived ? '#f0fdf4' : 'transparent',
                            opacity: isFullyReceived ? 0.65 : 1
                          }}>
                            <td style={{ padding: '8px', fontWeight: '500', color: isFullyReceived ? 'var(--color-success)' : 'inherit' }}>{item.item_code}</td>
                            <td style={{ padding: '8px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                              {(item.description || '').split('\n')[0]}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{item.ordered_quantity}</td>
                            <td style={{ padding: '8px', textAlign: 'right', color: 'var(--color-primary)', fontWeight: isFullyReceived ? '600' : 'normal' }}>{item.received_qty}</td>
                            <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                              {isFullyReceived ? (
                                <span style={{ 
                                  fontSize: '10px', 
                                  color: '#16a34a', 
                                  fontWeight: '700', 
                                  backgroundColor: '#f0fdf4', 
                                  padding: '2px 8px', 
                                  borderRadius: '12px',
                                  border: '1px solid rgba(34, 197, 94, 0.2)',
                                  display: 'inline-block'
                                }}>
                                  Fully Received
                                </span>
                              ) : (
                                <input 
                                  type="number" 
                                  step="0.01"
                                  className="form-input" 
                                  value={item.quantity_received}
                                  onChange={(e) => handleQtyChange(idx, e.target.value)}
                                  style={{ padding: '4px 6px', fontSize: '11px', textAlign: 'right', width: '80px', display: 'inline-block' }}
                                  disabled={saving || uploading}
                                  max={maxAllowed}
                                  min="0"
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

          {/* RIGHT PDF VIEWER */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', height: 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Uploaded Challan Document Viewer</span>
            </div>
            <div style={{ flexGrow: 1, backgroundColor: '#525659', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {pdfPath ? (
                <iframe src={`http://127.0.0.1:8000/${pdfPath}`} width="100%" height="100%" style={{ border: 'none' }} title="Parsed Challan Viewer" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: '#cbd5e1', fontSize: '13px' }}>
                  <FileText size={48} style={{ color: '#94a3b8' }} />
                  <span>Upload a Delivery Challan PDF to display it here.</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // DEFAULT DASHBOARD VIEW: Challans list
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Title bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Incoming Challans Log</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Log and review incoming raw materials from customer delivery challans to trigger workshop job cards.
          </p>
        </div>

        <button 
          onClick={handleStartCreate}
          className="form-button"
          style={{ width: 'auto', marginTop: 0, height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ClipboardList size={14} />
          Log Incoming Challan
        </button>
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type === 'success' ? 'success' : feedback.type === 'warning' ? 'warning' : 'danger'}`} style={{ marginBottom: 0 }}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Challans Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {challans.length === 0 && !loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyItems: 'center', padding: '60px 20px', gap: '12px' }}>
            <ClipboardList size={40} style={{ color: 'var(--color-text-light)' }} />
            <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>No Material Receipt Challans logged yet.</p>
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
                    <td style={{ padding: '16px', textAlign: 'right' }}><div className="skeleton-line animate-pulse" style={{ height: '28px', width: '70px', marginLeft: 'auto' }} /></td>
                  </tr>
                ))
              ) :
                challans.map(ch => (
                <tr key={ch.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }} className="table-row-hover">
                  <td style={{ padding: '16px', fontWeight: '600' }}>{ch.challan_number}</td>
                  <td style={{ padding: '16px' }}>{new Date(ch.challan_date).toLocaleDateString()}</td>
                  <td style={{ padding: '16px', fontWeight: '500' }}>PO #{ch.purchase_order?.po_number}</td>
                  <td style={{ padding: '16px' }}>{ch.purchase_order?.customer_name}</td>
                  <td style={{ padding: '16px' }}>{ch.items_count} items</td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => handleViewChallanDetails(ch.id)}
                        className="logout-btn"
                        style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', marginTop: 0 }}
                      >
                        <Eye size={12} />
                        View
                      </button>
                      <button 
                        onClick={() => handleStartEdit(ch)}
                        className="logout-btn"
                        style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-primary)', borderColor: 'rgba(37,99,235,0.2)', marginTop: 0 }}
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                      <button 
                        onClick={() => handleArchiveChallan(ch)}
                        className="logout-btn"
                        style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.2)', marginTop: 0 }}
                      >
                        <Trash2 size={12} />
                        Archive
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
