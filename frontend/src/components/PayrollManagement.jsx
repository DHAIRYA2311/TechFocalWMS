import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import CustomSelect from './CustomSelect';
import {
  CreditCard,
  Plus,
  Trash2,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  Printer,
  Calendar,
  User,
  Users,
  Search,
  Eye,
  X,
  TrendingUp,
  FileText,
  Loader2,
  AlertTriangle
} from 'lucide-react';

export default function PayrollManagement({ user }) {
  const [activeTab, setActiveTab] = useState('runs'); // 'runs' | 'advances'
  const [users, setUsers] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [stats, setStats] = useState(null);
  
  // Processing States
  const [isProcessing, setIsProcessing] = useState(false); // calculations view
  const [processMonth, setProcessMonth] = useState(new Date().getMonth() + 1);
  const [processYear, setProcessYear] = useState(new Date().getFullYear());
  const [draftItems, setDraftItems] = useState([]);
  const [loadingDraft, setLoadingDraft] = useState(false);

  // Active Selected Run details
  const [selectedRun, setSelectedRun] = useState(null);
  const [runItems, setRunItems] = useState([]);
  const [loadingRunDetails, setLoadingRunDetails] = useState(false);

  // Forms
  const [advanceUser, setAdvanceUser] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [submittingAdvance, setSubmittingAdvance] = useState(false);
  const [savingPayroll, setSavingPayroll] = useState(false);
  const [payingItemId, setPayingItemId] = useState(null);

  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  // Payslip Modal State
  const [activePayslip, setActivePayslip] = useState(null); // payroll_item_id or null
  const [payslipData, setPayslipData] = useState(null);
  const [loadingPayslip, setLoadingPayslip] = useState(false);

  const isManagerOrAbove = user && ['admin', 'partner', 'manager'].includes(user.role);

  // 1. Fetch overall payroll statistics
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.get('http://127.0.0.1:8000/api/payroll/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  // 2. Fetch all salary advances
  const fetchAdvances = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.get('http://127.0.0.1:8000/api/payroll-advances', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdvances(res.data);
    } catch (err) {
      console.error('Failed to load advances:', err);
    }
  };

  // 3. Fetch all processed runs
  const fetchRuns = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.get('http://127.0.0.1:8000/api/payroll', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayrollRuns(res.data);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to load historical payroll runs.' });
    } finally {
      setLoading(false);
    }
  };

  // 4. Fetch users for dropdowns
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.get('http://127.0.0.1:8000/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter out admins and partners
      const eligible = res.data.filter(u => !['admin', 'partner'].includes(u.role) && u.status === 'active');
      setUsers(eligible.map(u => ({ value: u.id, label: `${u.name} (${u.role.toUpperCase()})` })));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
    if (activeTab === 'runs') {
      fetchRuns();
    } else {
      fetchAdvances();
    }
    if (isManagerOrAbove) {
      fetchUsers();
    }
  }, [activeTab]);

  // Handle Calculate Draft
  const handleCalculateDraft = async (e) => {
    e.preventDefault();
    setLoadingDraft(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.post('http://127.0.0.1:8000/api/payroll/calculate', {
        month: processMonth,
        year: processYear
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDraftItems(res.data.items);
      setIsProcessing(true);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to calculate draft payroll.' });
    } finally {
      setLoadingDraft(false);
    }
  };

  // Handle Draft Local Change (bonus and notes)
  const handleDraftItemChange = (userId, field, val) => {
    setDraftItems(prev =>
      prev.map(item => {
        if (item.user_id === userId) {
          const updated = { ...item, [field]: val };
          if (field === 'bonus' || field === 'advance_deductions') {
            const bonusVal = parseFloat(field === 'bonus' ? val : item.bonus) || 0;
            const advVal = parseFloat(field === 'advance_deductions' ? val : item.advance_deductions) || 0;
            
            // Recalculate net salary locally
            const balanceBeforeAdvance = item.base_salary - item.attendance_deductions + item.overtime_pay - item.pf_deductions - item.pt_deductions;
            updated.net_salary = Math.max(0, parseFloat((balanceBeforeAdvance - advVal + bonusVal).toFixed(2)));
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Submit and lock Payroll Run
  const handleSavePayroll = async () => {
    setSavingPayroll(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.post('http://127.0.0.1:8000/api/payroll/save', {
        month: processMonth,
        year: processYear,
        items: draftItems
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFeedback({ type: 'success', message: res.data.message });
      setIsProcessing(false);
      setDraftItems([]);
      fetchStats();
      fetchRuns();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to save payroll run.' });
    } finally {
      setSavingPayroll(false);
    }
  };

  // Grant Salary Advance
  const handleGrantAdvance = async (e) => {
    e.preventDefault();
    if (!advanceUser) {
      setFeedback({ type: 'danger', message: 'Please select an employee.' });
      return;
    }
    setSubmittingAdvance(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.post('http://127.0.0.1:8000/api/payroll-advances', {
        user_id: advanceUser,
        amount: advanceAmount,
        date: advanceDate,
        notes: advanceNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFeedback({ type: 'success', message: res.data.message });
      setAdvanceAmount('');
      setAdvanceNotes('');
      fetchStats();
      fetchAdvances();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to grant salary advance.' });
    } finally {
      setSubmittingAdvance(false);
    }
  };

  // Cancel Salary Advance
  const handleDeleteAdvance = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this pending advance?')) return;
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.delete(`http://127.0.0.1:8000/api/payroll-advances/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeedback({ type: 'success', message: res.data.message });
      fetchStats();
      fetchAdvances();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to cancel advance.' });
    }
  };

  // Open Payroll Run Details
  const handleOpenRunDetails = async (run) => {
    setSelectedRun(run);
    setLoadingRunDetails(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.get(`http://127.0.0.1:8000/api/payroll/${run.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRunItems(res.data.items);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to load payroll details.' });
    } finally {
      setLoadingRunDetails(false);
    }
  };

  // Mark an item as Paid
  const handlePayItem = async (itemId) => {
    setPayingItemId(itemId);
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.put(`http://127.0.0.1:8000/api/payroll/items/${itemId}/pay`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFeedback({ type: 'success', message: res.data.message });
      // Update local item status
      setRunItems(prev =>
        prev.map(item => {
          if (item.id === itemId) {
            return { ...item, payment_status: 'paid', paid_at: res.data.paid_at };
          }
          return item;
        })
      );
      fetchStats();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to process payment status.' });
    } finally {
      setPayingItemId(null);
    }
  };

  // Load Payslip Data
  const handleOpenPayslip = async (itemId) => {
    setActivePayslip(itemId);
    setLoadingPayslip(true);
    setPayslipData(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.get(`http://127.0.0.1:8000/api/payroll/items/${itemId}/slip`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayslipData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPayslip(false);
    }
  };

  // Helper date months
  const getMonthName = (m) => {
    const d = new Date(2000, m - 1, 1);
    return d.toLocaleString('default', { month: 'long' });
  };

  // Number to Words converter (Simple standard implementation for payslip formatting)
  const numberToWords = (num) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if ((num = num.toString()).length > 9) return 'overflow';
    let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return ''; 
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Rupees Only' : 'Rupees Only';
    return str;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Title bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Payroll & Wages Workspace</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Process monthly wages, calculate attendance deductions and overtime multipliers, and manage cash advances.
          </p>
        </div>

        {/* Tab selector */}
        <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', backgroundColor: 'var(--color-card-bg)' }}>
          <button 
            onClick={() => { setSelectedRun(null); setIsProcessing(false); setActiveTab('runs'); }}
            style={{
              border: 'none', padding: '8px 16px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
              backgroundColor: activeTab === 'runs' ? 'var(--color-primary-light)' : 'transparent',
              color: activeTab === 'runs' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            Payroll Runs
          </button>
          <button 
            onClick={() => { setSelectedRun(null); setIsProcessing(false); setActiveTab('advances'); }}
            style={{
              border: 'none', padding: '8px 16px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
              backgroundColor: activeTab === 'advances' ? 'var(--color-primary-light)' : 'transparent',
              color: activeTab === 'advances' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            Cash Advances
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: 0 }}>
          {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Stats Summary Bar */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', fontWeight: '500' }}>OUTSTANDING ADVANCES</span>
              <strong style={{ fontSize: '22px', color: '#dc2626' }}>₹{stats.total_pending_advances}</strong>
            </div>
            <div style={{ padding: '8px', borderRadius: 'var(--radius-sm)', backgroundColor: '#fef2f2', color: '#dc2626' }}><TrendingUp size={18} /></div>
          </div>
          
          <div className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', fontWeight: '500' }}>PAID THIS MONTH</span>
              <strong style={{ fontSize: '22px', color: 'var(--color-success)' }}>₹{stats.total_paid_this_month}</strong>
            </div>
            <div style={{ padding: '8px', borderRadius: 'var(--radius-sm)', backgroundColor: '#ecfdf5', color: 'var(--color-success)' }}><DollarSign size={18} /></div>
          </div>

          <div className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', fontWeight: '500' }}>LAST RUN PERIOD</span>
              <strong style={{ fontSize: '18px', color: 'var(--color-text-main)' }}>
                {stats.last_run_month ? `${getMonthName(stats.last_run_month)} ${stats.last_run_year}` : 'None processed'}
              </strong>
            </div>
            <div style={{ padding: '8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-primary)' }}><Calendar size={18} /></div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW A: PROCESS RUNS WORKSPACE */}
      {/* ========================================================================= */}
      {activeTab === 'runs' && !selectedRun && !isProcessing && (
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          
          {/* History of runs table */}
          <div className="card" style={{ flexGrow: 1, padding: 0, overflow: 'hidden', minWidth: '60%', boxSizing: 'border-box' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Historical Monthly Runs</h3>
            </div>
            
            {payrollRuns.length === 0 && !loading ? (
              <p style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '13px' }}>
                No processed payroll records. Setup a new run on the right.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '12px 20px' }}>Period</th>
                    <th style={{ padding: '12px 20px' }}>Processed By</th>
                    <th style={{ padding: '12px 20px' }}>Staff Count</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right' }}>Net Payout Sum</th>
                    <th style={{ padding: '12px 20px' }}>Outstanding Payments</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && payrollRuns.length === 0 ? (
                    Array.from({ length: 4 }).map((_, rIdx) => (
                      <tr key={rIdx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '16px 20px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '100px' }} /></td>
                        <td style={{ padding: '16px 20px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '80px' }} /></td>
                        <td style={{ padding: '16px 20px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '90px' }} /></td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '70px', marginLeft: 'auto' }} /></td>
                        <td style={{ padding: '16px 20px' }}><div className="skeleton-line animate-pulse" style={{ height: '18px', width: '90px', borderRadius: '12px' }} /></td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}><div className="skeleton-line animate-pulse" style={{ height: '28px', width: '80px', marginLeft: 'auto' }} /></td>
                      </tr>
                    ))
                  ) :
                    payrollRuns.map(run => (
                    <tr key={run.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 20px', fontWeight: '700' }}>{getMonthName(run.month)} {run.year}</td>
                      <td style={{ padding: '12px 20px', color: 'var(--color-text-muted)' }}>{run.processor ? run.processor.name : 'System'}</td>
                      <td style={{ padding: '12px 20px' }}>{run.total_staff} employees</td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: '600' }}>₹{run.total_net_payout}</td>
                      <td style={{ padding: '12px 20px' }}>
                        {run.total_unpaid > 0 ? (
                          <span style={{ color: 'var(--color-warning)', fontWeight: 'bold' }}>{run.total_unpaid} Unpaid</span>
                        ) : (
                          <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>Fully Settled</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleOpenRunDetails(run)}
                          className="logout-btn"
                          style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={12} /> View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Process trigger configuration */}
          {isManagerOrAbove && (
            <div className="card" style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>Process Salary Run</h3>
              <form onSubmit={handleCalculateDraft} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                <div className="form-group">
                  <label className="form-label">Select Month</label>
                  <CustomSelect
                    value={processMonth}
                    onChange={(val) => setProcessMonth(val)}
                    style={{ height: '36px' }}
                    options={[...Array(12)].map((_, i) => ({
                      value: i + 1,
                      label: getMonthName(i + 1)
                    }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Select Year</label>
                  <CustomSelect
                    value={processYear}
                    onChange={(val) => setProcessYear(val)}
                    style={{ height: '36px' }}
                    options={[2025, 2026, 2027, 2028].map(y => ({
                      value: y,
                      label: y.toString()
                    }))}
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loadingDraft}
                  className="form-button"
                  style={{ width: '100%', height: '38px', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: 'var(--color-primary)' }}
                >
                  {loadingDraft ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                  Calculate Draft Salary
                </button>
              </form>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW B: DRAFT PREVIEW & CALCULATOR TABLE */}
      {/* ========================================================================= */}
      {isProcessing && (
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Draft Payroll: {getMonthName(processMonth)} {processYear}</h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Review automatically calculated attendance deductions, overtime payments, PF/PT splits, and adjust custom bonuses/advance cuts.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => { setIsProcessing(false); setDraftItems([]); }}
                className="logout-btn"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Discard
              </button>
              <button 
                onClick={handleSavePayroll}
                disabled={savingPayroll}
                className="form-button"
                style={{ width: 'auto', marginTop: 0, height: '36px', padding: '0 20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-success)' }}
              >
                {savingPayroll ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Confirm & Settle Payroll
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', minWidth: '950px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '8px 12px' }}>Employee</th>
                  <th style={{ padding: '8px 12px' }}>Role</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Base Salary</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Present/Leave</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Unpaid Days</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Attendance Cuts</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>OT Pay</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>PF Deduct</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>PT Deduct</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', width: '100px' }}>Advance Cut</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', width: '100px' }}>Bonus</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Net Salary</th>
                  <th style={{ padding: '8px 12px' }}>Remarks / Notes</th>
                </tr>
              </thead>
              <tbody>
                {draftItems.map(item => (
                  <tr key={item.user_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: '600' }}>{item.name}</td>
                    <td style={{ padding: '8px 12px', textTransform: 'capitalize', color: 'var(--color-text-muted)' }}>{item.role}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{item.base_salary}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{item.days_present + item.days_leave} days</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{item.days_absent + (0.5 * item.days_half_day)} days</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#dc2626' }}>-₹{item.attendance_deductions}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#059669', fontWeight: '500' }}>
                      +₹{item.overtime_pay} <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', display: 'block' }}>({item.overtime_hours} hrs)</span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#dc2626' }}>-₹{item.pf_deductions}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#dc2626' }}>-₹{item.pt_deductions}</td>
                    <td style={{ padding: '4px 12px', textAlign: 'right' }}>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={item.advance_deductions}
                        onChange={(e) => handleDraftItemChange(item.user_id, 'advance_deductions', e.target.value)}
                        max={item.outstanding_advances}
                        style={{ height: '30px', padding: '0 6px', fontSize: '11px', textAlign: 'right', width: '90px' }}
                      />
                      <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', display: 'block' }}>Due: ₹{item.outstanding_advances}</span>
                    </td>
                    <td style={{ padding: '4px 12px', textAlign: 'right' }}>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={item.bonus}
                        onChange={(e) => handleDraftItemChange(item.user_id, 'bonus', e.target.value)}
                        placeholder="0.00"
                        style={{ height: '30px', padding: '0 6px', fontSize: '11px', textAlign: 'right', width: '90px' }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--color-primary)', fontSize: '13px' }}>
                      ₹{item.net_salary}
                    </td>
                    <td style={{ padding: '4px 12px' }}>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Remarks..."
                        value={item.notes}
                        onChange={(e) => handleDraftItemChange(item.user_id, 'notes', e.target.value)}
                        style={{ height: '30px', padding: '0 8px', fontSize: '11px', width: '130px' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW C: RUN DETAILS / PAYMENTS & SLIPS */}
      {/* ========================================================================= */}
      {selectedRun && (
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '14px' }}>
            <div>
              <button className="logout-btn" onClick={() => setSelectedRun(null)} style={{ padding: '4px 10px', fontSize: '11px', marginBottom: '8px' }}>
                &larr; Back to History
              </button>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Payroll Run: {getMonthName(selectedRun.month)} {selectedRun.year}</h3>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Processed on: {new Date(selectedRun.processed_at).toLocaleString()} by {selectedRun.processor ? selectedRun.processor.name : 'System'}
              </span>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>TOTAL RUN VALUE</span>
              <strong style={{ fontSize: '20px', color: 'var(--color-primary)' }}>₹{selectedRun.total_net_payout}</strong>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', minWidth: '850px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '10px 14px' }}>Employee</th>
                  <th style={{ padding: '10px 14px' }}>Role</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Base Salary</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>OT Pay</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Statutory Cuts</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Advances Cuts</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Bonus</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Net Salary</th>
                  <th style={{ padding: '10px 14px' }}>Payment Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Payslip / Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingRunDetails ? (
                  Array.from({ length: 4 }).map((_, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '10px 14px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '100px' }} /></td>
                      <td style={{ padding: '10px 14px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '80px' }} /></td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '70px', marginLeft: 'auto' }} /></td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '70px', marginLeft: 'auto' }} /></td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '80px', marginLeft: 'auto' }} /></td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '80px', marginLeft: 'auto' }} /></td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '60px', marginLeft: 'auto' }} /></td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '80px', marginLeft: 'auto' }} /></td>
                      <td style={{ padding: '10px 14px' }}><div className="skeleton-line animate-pulse" style={{ height: '18px', width: '60px', borderRadius: '12px' }} /></td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}><div className="skeleton-line animate-pulse" style={{ height: '24px', width: '80px', marginLeft: 'auto' }} /></td>
                    </tr>
                  ))
                ) :
                  runItems.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: '600' }}>{item.user ? item.user.name : 'Unknown User'}</td>
                      <td style={{ padding: '10px 14px', textTransform: 'capitalize', color: 'var(--color-text-muted)' }}>{item.user ? item.user.role : ''}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>₹{item.base_salary}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#059669' }}>+₹{item.overtime_pay}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#dc2626' }}>-₹{parseFloat(item.pf_deductions) + parseFloat(item.pt_deductions)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#dc2626' }}>-₹{item.advance_deductions}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#059669' }}>+₹{item.bonus}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700' }}>₹{item.net_salary}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ 
                          fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px',
                          backgroundColor: item.payment_status === 'paid' ? '#ecfdf5' : '#fef2f2',
                          color: item.payment_status === 'paid' ? '#059669' : '#dc2626',
                          border: `1px solid ${item.payment_status === 'paid' ? '#a7f3d0' : '#fca5a5'}`
                        }}>
                          {item.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                        </span>
                        {item.payment_status === 'paid' && item.paid_at && (
                          <span style={{ display: 'block', fontSize: '9px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            {new Date(item.paid_at).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {isManagerOrAbove && item.payment_status === 'unpaid' && (
                          <button 
                            onClick={() => handlePayItem(item.id)}
                            disabled={payingItemId === item.id}
                            className="form-button"
                            style={{ width: 'auto', marginTop: 0, padding: '4px 10px', fontSize: '11px', height: '26px', backgroundColor: 'var(--color-success)' }}
                          >
                            {payingItemId === item.id ? <Loader2 size={10} className="animate-spin" /> : 'Settle'}
                          </button>
                        )}
                        <button 
                          onClick={() => handleOpenPayslip(item.id)}
                          className="logout-btn"
                          style={{ padding: '4px 8px', fontSize: '11px', height: '26px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          <Printer size={11} /> Slip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW D: SALARY ADVANCES LEDGER TRACKER */}
      {/* ========================================================================= */}
      {activeTab === 'advances' && (
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          
          {/* List of advances table */}
          <div className="card" style={{ flexGrow: 1, padding: 0, overflow: 'hidden', minWidth: '60%' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Wages Cash Advances Ledger</h3>
            </div>
            
            {advances.length === 0 ? (
              <p style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '13px' }}>
                No registered cash advances. Grant one on the right form.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '12px 20px' }}>Employee</th>
                    <th style={{ padding: '12px 20px' }}>Grant Date</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '12px 20px' }}>Status</th>
                    <th style={{ padding: '12px 20px' }}>Remarks / Notes</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {advances.map(adv => (
                    <tr key={adv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 20px', fontWeight: '600' }}>{adv.user ? adv.user.name : 'Unknown User'}</td>
                      <td style={{ padding: '12px 20px' }}>{new Date(adv.date).toLocaleDateString()}</td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: '700', color: 'var(--color-text-main)' }}>₹{adv.amount}</td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ 
                          fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px',
                          backgroundColor: adv.status === 'pending' ? '#fef2f2' : (adv.status === 'deducted' ? '#eff6ff' : '#ecfdf5'),
                          color: adv.status === 'pending' ? '#dc2626' : (adv.status === 'deducted' ? '#2563eb' : '#059669'),
                          border: `1px solid ${adv.status === 'pending' ? '#fca5a5' : (adv.status === 'deducted' ? '#bfdbfe' : '#a7f3d0')}`
                        }}>
                          {adv.status === 'pending' ? 'Pending Deduction' : (adv.status === 'deducted' ? 'Deducted in Payroll' : 'Repaid')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px', color: 'var(--color-text-muted)', fontSize: '12px' }}>{adv.notes || '-'}</td>
                      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                        {isManagerOrAbove && adv.status === 'pending' ? (
                          <button 
                            onClick={() => handleDeleteAdvance(adv.id)}
                            className="logout-btn"
                            style={{ padding: '5px', color: 'var(--color-danger)', border: 'none', background: 'none', cursor: 'pointer' }}
                            title="Cancel Advance"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Grant Advance Form */}
          {isManagerOrAbove && (
            <div className="card" style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>Grant Cash Advance</h3>
              
              <form onSubmit={handleGrantAdvance} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Select Employee *</label>
                  <CustomSelect
                    value={advanceUser}
                    onChange={(val) => setAdvanceUser(val)}
                    options={users}
                    placeholder="Choose employee..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Advance Amount (₹) *</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    required
                    min="100"
                    style={{ height: '36px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Date Granted *</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={advanceDate}
                    onChange={(e) => setAdvanceDate(e.target.value)}
                    required
                    style={{ height: '36px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Remarks / Reason</label>
                  <textarea 
                    className="form-input" 
                    rows="3"
                    value={advanceNotes}
                    onChange={(e) => setAdvanceNotes(e.target.value)}
                    placeholder="Medical, family emergency, transport cost..."
                    style={{ height: '70px', padding: '10px', fontSize: '13px', resize: 'none' }}
                  />
                </div>

                <button 
                  type="submit"
                  disabled={submittingAdvance}
                  className="form-button"
                  style={{ width: '100%', height: '38px', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: 'var(--color-primary)' }}
                >
                  {submittingAdvance ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Grant Cash Advance
                </button>
              </form>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. INTERACTIVE PRINT-READY PAYSLIP MODAL (React Portal) */}
      {/* ========================================================================= */}
      {activePayslip && createPortal(
        <div 
          onClick={() => setActivePayslip(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999, padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{
              width: '100%', maxWidth: '650px', padding: '24px', 
              boxShadow: 'var(--shadow-xl)', display: 'flex', flexDirection: 'column', gap: '20px',
              animation: 'modal-appear 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              backgroundColor: '#ffffff', color: '#0f172a'
            }}
          >
            
            {/* Modal Controls (Not Printed) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '600' }}>Payslip Document Preview</span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => window.print()}
                  disabled={loadingPayslip || !payslipData}
                  className="form-button"
                  style={{ width: 'auto', marginTop: 0, height: '30px', padding: '0 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--color-primary)' }}
                >
                  <Printer size={12} /> Print Slip
                </button>
                <button 
                  onClick={() => setActivePayslip(null)} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {loadingPayslip ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
              </div>
            ) : !payslipData ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Failed to load payslip data.</p>
            ) : (
              <div id="printable-payslip" style={{ fontFamily: 'var(--font-sans)', border: '1px solid #e2e8f0', padding: '24px', borderRadius: '4px', backgroundColor: '#ffffff' }}>
                
                {/* Print layout styles */}
                <style dangerouslySetInnerHTML={{__html: `
                  @media print {
                    body * {
                      visibility: hidden !important;
                    }
                    #printable-payslip, #printable-payslip * {
                      visibility: visible !important;
                    }
                    #printable-payslip {
                      position: absolute !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      border: none !important;
                      padding: 0 !important;
                      margin: 0 !important;
                    }
                    .no-print {
                      display: none !important;
                    }
                  }
                `}} />

                {/* Company Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '16px' }}>
                  <div>
                    <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#0f172a' }}>{payslipData.company.name}</h1>
                    <p style={{ fontSize: '11px', color: '#475569', margin: '4px 0 0 0', maxWidth: '300px', lineHeight: '1.4' }}>{payslipData.company.address}</p>
                    <span style={{ fontSize: '10px', color: '#475569', display: 'block', marginTop: '4px' }}>GSTIN: <strong>{payslipData.company.gstin}</strong></span>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '0.5px' }}>SALARY PAY SLIP</h2>
                    <span style={{ fontSize: '11px', color: '#475569', fontWeight: '700' }}>
                      PERIOD: {getMonthName(payslipData.item.payroll.month).toUpperCase()} {payslipData.item.payroll.year}
                    </span>
                  </div>
                </div>

                {/* Employee Details Meta */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '16px 0', fontSize: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span>Employee Name: <strong>{payslipData.item.user?.name}</strong></span>
                    <span>Employee Role: <strong style={{ textTransform: 'capitalize' }}>{payslipData.item.user?.role}</strong></span>
                    <span>Mobile: <strong>{payslipData.item.user?.phone || 'N/A'}</strong></span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'right' }}>
                    <span>Employee ID: <strong>#EMP-{payslipData.item.user?.id}</strong></span>
                    <span>Email: <strong>{payslipData.item.user?.email}</strong></span>
                    <span>Payment Status: <strong>{payslipData.item.payment_status.toUpperCase()}</strong></span>
                  </div>
                </div>

                {/* Earnings & Deductions splits grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', fontSize: '12px' }}>
                  
                  {/* Left Column: Earnings */}
                  <div style={{ borderRight: '1px solid #cbd5e1' }}>
                    <div style={{ backgroundColor: '#f8fafc', padding: '6px 12px', borderBottom: '1px solid #cbd5e1', fontWeight: 'bold' }}>EARNINGS DETAILS</div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Base Monthly Salary</span>
                        <span>₹{payslipData.item.base_salary}</span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                        <span>Overtime Pay ({payslipData.item.overtime_hours} hrs)</span>
                        <span>+₹{payslipData.item.overtime_pay}</span>
                      </div>

                      {parseFloat(payslipData.item.bonus) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                          <span>Incentives / Bonus</span>
                          <span>+₹{payslipData.item.bonus}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Deductions */}
                  <div>
                    <div style={{ backgroundColor: '#f8fafc', padding: '6px 12px', borderBottom: '1px solid #cbd5e1', fontWeight: 'bold' }}>DEDUCTIONS DETAILS</div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                        <span>Unpaid Absences Cuts</span>
                        <span>-₹{payslipData.item.attendance_deductions}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                        <span>Provident Fund (PF)</span>
                        <span>-₹{payslipData.item.pf_deductions}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                        <span>Professional Tax (PT)</span>
                        <span>-₹{payslipData.item.pt_deductions}</span>
                      </div>

                      {parseFloat(payslipData.item.advance_deductions) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                          <span>Salary Advance Deduction</span>
                          <span>-₹{payslipData.item.advance_deductions}</span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Net Salary Summary */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderTop: 'none', padding: '12px', fontSize: '13px', borderRadius: '0 0 4px 4px' }}>
                  <strong style={{ color: '#0f172a' }}>NET TAKE-HOME WAGES</strong>
                  <strong style={{ fontSize: '16px', color: 'var(--color-primary)' }}>₹{payslipData.item.net_salary}</strong>
                </div>

                {/* Amount in words */}
                <p style={{ fontSize: '11px', color: '#475569', margin: '14px 0 0 0', fontStyle: 'italic' }}>
                  Net Payout Amount in words: <strong>{numberToWords(Math.round(payslipData.item.net_salary))}</strong>
                </p>

                {/* Signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px', fontSize: '11px' }}>
                  <div style={{ textAlign: 'center', width: '150px', borderTop: '1px solid #cbd5e1', paddingTop: '6px' }}>
                    <span>Employee Signature</span>
                  </div>
                  <div style={{ textAlign: 'center', width: '180px', borderTop: '1px solid #cbd5e1', paddingTop: '6px' }}>
                    <span>Authorized Signatory</span>
                    <span style={{ fontSize: '9px', color: '#475569', display: 'block', marginTop: '2px' }}>{payslipData.item.payroll.processor?.name}</span>
                  </div>
                </div>

              </div>
            )}
            
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
