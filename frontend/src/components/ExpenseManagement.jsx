import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  TrendingUp, 
  CreditCard, 
  DollarSign, 
  PlusCircle, 
  Search, 
  Filter, 
  Trash2, 
  Eye, 
  FileText, 
  Calendar, 
  X, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Tag,
  Edit2,
  Printer,
  Download,
  AlertTriangle
} from 'lucide-react';
import CustomSelect from './CustomSelect';
import CustomFileUpload from './CustomFileUpload';
import { useRealTime } from '../hooks/useRealTime';

const CATEGORIES = {
  raw_materials: { label: 'Raw Materials', color: '#863bff' },
  machinery: { label: 'Machinery & Equipment', color: '#ec4899' },
  consumables: { label: 'Consumables (Oils, Inserts, etc.)', color: '#f59e0b' },
  tools: { label: 'Tools & Hardware', color: '#10b981' },
  utility: { label: 'Utility Bills', color: '#3b82f6' },
  transport: { label: 'Transport & Courier', color: '#6366f1' },
  refreshments: { label: 'Staff Tea & Refreshments', color: '#14b8a6' },
  office: { label: 'Office Supplies', color: '#64748b' },
  other: { label: 'Other Miscellaneous', color: '#a855f7' }
};

const PAYMENT_MODES = {
  cash: 'Cash',
  upi_bank: 'UPI / Bank Transfer',
  cheque: 'Cheque',
  card: 'Card'
};

export default function ExpenseManagement({ user }) {
  useRealTime('expenses', () => {
    fetchExpenses();
  });
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState({
    total_overall: 0,
    total_this_month: 0,
    category_breakdown: {},
    payment_mode_breakdown: {}
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPaymentMode, setFilterPaymentMode] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // States
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete confirm modal state
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteTargetLabel, setDeleteTargetLabel] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    category: 'raw_materials',
    amount: '',
    payment_mode: 'cash',
    description: '',
    reference_number: '',
    receipt: null
  });

  const canManage = user && ['admin', 'partner', 'manager'].includes(user.role);

  // Load expenses and stats
  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterCategory) params.category = filterCategory;
      if (filterPaymentMode) params.payment_mode = filterPaymentMode;
      if (filterStartDate) params.start_date = filterStartDate;
      if (filterEndDate) params.end_date = filterEndDate;

      const response = await axios.get('http://127.0.0.1:8000/api/expenses', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      setExpenses(response.data.expenses);
      setStats(response.data.stats);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
      setFeedback({
        type: 'danger',
        message: 'Could not load expense logs. Please check connection.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [searchTerm, filterCategory, filterPaymentMode, filterStartDate, filterEndDate]);

  // Form submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) {
      setFeedback({ type: 'danger', message: 'You do not have permission to log expenses.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const token = localStorage.getItem('auth_token');
    const data = new FormData();
    data.append('expense_date', formData.expense_date);
    data.append('category', formData.category);
    data.append('amount', formData.amount);
    data.append('payment_mode', formData.payment_mode);
    if (formData.description) data.append('description', formData.description);
    if (formData.reference_number) data.append('reference_number', formData.reference_number);
    if (formData.receipt) data.append('receipt', formData.receipt);

    try {
      await axios.post('http://127.0.0.1:8000/api/expenses', data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setFeedback({
        type: 'success',
        message: 'Expense logged successfully!'
      });

      // Reset Form
      setFormData({
        expense_date: new Date().toISOString().split('T')[0],
        category: 'raw_materials',
        amount: '',
        payment_mode: 'cash',
        description: '',
        reference_number: '',
        receipt: null
      });

      setIsModalOpen(false);
      fetchExpenses();
    } catch (err) {
      console.error('Failed to submit expense:', err);
      const errMsg = err.response?.data?.message || 'Failed to submit expense. Check parameters.';
      setFeedback({
        type: 'danger',
        message: errMsg
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete confirmation open
  const openDeleteModal = (expense) => {
    setDeleteTargetId(expense.id);
    const info = CATEGORIES[expense.category] || { label: expense.category };
    setDeleteTargetLabel(`${info.label} — ₹${Number(expense.amount).toLocaleString('en-IN')}`);
    setDeleteReason('');
    setIsDeleteModalOpen(true);
  };

  // Delete handler (confirmed)
  const handleDelete = async () => {
    if (!deleteTargetId) return;
    const token = localStorage.getItem('auth_token');
    try {
      await axios.delete(`http://127.0.0.1:8000/api/expenses/${deleteTargetId}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { delete_reason: deleteReason || 'Deleted by manager' }
      });
      setFeedback({ type: 'success', message: 'Expense record deleted successfully.' });
      fetchExpenses();
    } catch (err) {
      console.error('Delete failed:', err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to delete expense record.' });
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
      setDeleteTargetLabel('');
      setDeleteReason('');
    }
  };

  // Open edit modal
  const openEditModal = (expense) => {
    setEditingExpense(expense);
    setEditFormData({
      expense_date: expense.expense_date ? expense.expense_date.split('T')[0] : '',
      category: expense.category || 'raw_materials',
      amount: expense.amount || '',
      payment_mode: expense.payment_mode || 'cash',
      description: expense.description || '',
      reference_number: expense.reference_number || '',
      receipt: null
    });
    setIsEditModalOpen(true);
  };

  // Edit submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingExpense) return;
    setEditSubmitting(true);
    const token = localStorage.getItem('auth_token');
    const data = new FormData();
    data.append('_method', 'PUT');
    data.append('expense_date', editFormData.expense_date);
    data.append('category', editFormData.category);
    data.append('amount', editFormData.amount);
    data.append('payment_mode', editFormData.payment_mode);
    if (editFormData.description) data.append('description', editFormData.description);
    if (editFormData.reference_number) data.append('reference_number', editFormData.reference_number);
    if (editFormData.receipt) data.append('receipt', editFormData.receipt);
    try {
      await axios.post(`http://127.0.0.1:8000/api/expenses/${editingExpense.id}`, data, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setFeedback({ type: 'success', message: 'Expense updated successfully!' });
      setIsEditModalOpen(false);
      setEditingExpense(null);
      fetchExpenses();
    } catch (err) {
      console.error('Edit failed:', err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to update expense.' });
    } finally {
      setEditSubmitting(false);
    }
  };

  // Print single expense
  const handlePrintExpense = (expense) => {
    const info = CATEGORIES[expense.category] || { label: expense.category };
    const printWindow = window.open('', '_blank', 'width=700,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Expense Record</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1e293b; }
          h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
          .subtitle { color: #64748b; font-size: 13px; margin-bottom: 30px; }
          .divider { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
          .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
          .label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
          .value { font-size: 14px; font-weight: 600; color: #0f172a; }
          .amount { font-size: 28px; font-weight: 800; color: #7c3aed; margin: 16px 0; }
          .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; background: #f3e8ff; color: #7c3aed; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>Expense Record</h1>
        <p class="subtitle">TechFocal Workshop Management System</p>
        <hr class="divider" />
        <div class="amount">₹${Number(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div class="row"><span class="label">Date</span><span class="value">${new Date(expense.expense_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
        <div class="row"><span class="label">Category</span><span class="value"><span class="badge">${info.label}</span></span></div>
        <div class="row"><span class="label">Payment Mode</span><span class="value">${PAYMENT_MODES[expense.payment_mode] || expense.payment_mode}</span></div>
        <div class="row"><span class="label">Reference / Bill No.</span><span class="value">${expense.reference_number || '—'}</span></div>
        <div class="row"><span class="label">Description</span><span class="value">${expense.description || '—'}</span></div>
        <div class="row"><span class="label">Logged By</span><span class="value">${expense.logged_by_user?.name || expense.logged_by?.name || 'System'}</span></div>
        <hr class="divider" />
        <p style="font-size:11px; color:#94a3b8;">Printed on ${new Date().toLocaleString('en-IN')}</p>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Download single expense as CSV
  const handleDownloadExpense = (expense) => {
    const info = CATEGORIES[expense.category] || { label: expense.category };
    const rows = [
      ['Field', 'Value'],
      ['Date', new Date(expense.expense_date).toLocaleDateString('en-IN')],
      ['Category', info.label],
      ['Amount (INR)', Number(expense.amount).toFixed(2)],
      ['Payment Mode', PAYMENT_MODES[expense.payment_mode] || expense.payment_mode],
      ['Reference / Bill No.', expense.reference_number || ''],
      ['Description', expense.description || ''],
      ['Logged By', expense.logged_by_user?.name || expense.logged_by?.name || 'System'],
    ];
    const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expense_${expense.id}_${expense.expense_date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCategory('');
    setFilterPaymentMode('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  // Get category breakdown totals with percentages
  const totalCategoryAmounts = Object.values(stats.category_breakdown).reduce((a, b) => a + Number(b), 0);
  const sortedCategoryBreakdown = Object.entries(stats.category_breakdown)
    .map(([cat, total]) => ({
      cat,
      total: Number(total),
      percentage: totalCategoryAmounts > 0 ? (Number(total) / totalCategoryAmounts) * 100 : 0
    }))
    .sort((a, b) => b.total - a.total);

  // Find top spending category label
  const topCategoryItem = sortedCategoryBreakdown[0];
  const topCategoryLabel = topCategoryItem ? (CATEGORIES[topCategoryItem.cat]?.label || topCategoryItem.cat) : 'N/A';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Upper Control Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Track, review, and analyze workshop expenditures.
          </p>
        </div>
        {canManage && (
          <button 
            className="form-button" 
            onClick={() => setIsModalOpen(true)}
            style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}
          >
            <PlusCircle size={18} />
            Log New Expense
          </button>
        )}
      </div>

      {/* Alert Banner */}
      {feedback && (
        <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Analytics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(134, 59, 255, 0.1)', color: '#863bff' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '500' }}>Overall Expenditures</p>
            <h3 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-main)', marginTop: '4px' }}>
              ₹{stats.total_overall.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Calendar size={24} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '500' }}>Spent This Month</p>
            <h3 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-main)', marginTop: '4px' }}>
              ₹{stats.total_this_month.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '500' }}>Top Spending Area</p>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-text-main)', marginTop: '6px' }}>
              {topCategoryLabel}
            </h3>
          </div>
        </div>
      </div>

      {/* Analytics Chart & Category Breakdown Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        
        {/* Category Breakdown (Horizontal Bars) */}
        <div className="card">
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag size={16} style={{ color: 'var(--color-primary)' }} />
            Expenditures by Category
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {sortedCategoryBreakdown.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                No expense data available for analysis.
              </p>
            ) : (
              sortedCategoryBreakdown.map(({ cat, total, percentage }) => {
                const info = CATEGORIES[cat] || { label: cat, color: '#a855f7' };
                return (
                  <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ fontWeight: '500', color: 'var(--color-text-main)' }}>{info.label}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        ₹{total.toLocaleString('en-IN')} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-bg-base)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: info.color, borderRadius: '4px' }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Payment Methods Allocation */}
        <div className="card">
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={16} style={{ color: 'var(--color-primary)' }} />
            Payment Mode Distribution
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.keys(stats.payment_mode_breakdown).length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                No transaction details logged.
              </p>
            ) : (
              Object.entries(stats.payment_mode_breakdown).map(([mode, total]) => {
                const amount = Number(total);
                const overallSum = Object.values(stats.payment_mode_breakdown).reduce((a, b) => a + Number(b), 0);
                const percent = overallSum > 0 ? (amount / overallSum) * 100 : 0;
                
                return (
                  <div key={mode} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'var(--color-bg-base)', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-main)' }}>
                        {PAYMENT_MODES[mode] || mode}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {percent.toFixed(1)}% of total
                      </span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-main)' }}>
                      ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Filter / Search Bar */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} style={{ color: 'var(--color-text-muted)' }} />
          <h4 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>Filter Expense Ledger</h4>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div className="input-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search notes / bill #..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '32px' }}
              />
              <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--color-text-light)' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <CustomSelect
              value={filterCategory}
              onChange={(val) => setFilterCategory(val)}
              placeholder="All Categories"
              options={[
                { value: '', label: 'All Categories' },
                ...Object.entries(CATEGORIES).map(([key, info]) => ({
                  value: key,
                  label: info.label
                }))
              ]}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <CustomSelect
              value={filterPaymentMode}
              onChange={(val) => setFilterPaymentMode(val)}
              placeholder="All Payments"
              options={[
                { value: '', label: 'All Payments' },
                ...Object.entries(PAYMENT_MODES).map(([key, label]) => ({
                  value: key,
                  label: label
                }))
              ]}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <input 
              type="date" 
              className="form-input" 
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              style={{ paddingLeft: '8px' }}
              placeholder="From Date"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <input 
              type="date" 
              className="form-input" 
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              style={{ paddingLeft: '8px' }}
              placeholder="To Date"
            />
          </div>
        </div>

        {(searchTerm || filterCategory || filterPaymentMode || filterStartDate || filterEndDate) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              className="logout-btn" 
              onClick={clearFilters}
              style={{ padding: '6px 12px', fontSize: '12px', height: 'auto' }}
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--color-text-main)' }}>Date</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--color-text-main)' }}>Category</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--color-text-main)' }}>Description</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--color-text-main)' }}>Ref / Bill No</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--color-text-main)' }}>Payment Mode</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--color-text-main)' }}>Amount</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--color-text-main)' }}>Logged By</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--color-text-main)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '70px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '18px', width: '100px', borderRadius: '12px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '180px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '60px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '80px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '70px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '80px' }} /></td>
                    <td style={{ padding: '16px', textAlign: 'right' }}><div className="skeleton-line animate-pulse" style={{ height: '24px', width: '50px', marginLeft: 'auto' }} /></td>
                  </tr>
                ))
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                    No matching expenses found in ledger.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => {
                  const info = CATEGORIES[expense.category] || { label: expense.category, color: '#64748b' };
                  return (
                    <tr 
                      key={expense.id} 
                      style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.015)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: '500', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                        {new Date(expense.expense_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          fontSize: '11px', 
                          fontWeight: '600', 
                          color: info.color, 
                          backgroundColor: `${info.color}15`, 
                          padding: '4px 8px', 
                          borderRadius: '12px' 
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: info.color }}></span>
                          {info.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={expense.description}>
                        {expense.description || <span style={{ color: 'var(--color-text-light)' }}>No notes</span>}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: '500', verticalAlign: 'middle' }}>
                        {expense.reference_number || <span style={{ color: 'var(--color-text-light)' }}>-</span>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', verticalAlign: 'middle' }}>
                        {PAYMENT_MODES[expense.payment_mode] || expense.payment_mode}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--color-text-main)', verticalAlign: 'middle' }}>
                        ₹{Number(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: '12px', verticalAlign: 'middle' }}>
                        {expense.logged_by_user?.name || expense.logged_by?.name || 'System'}
                      </td>
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {/* View Receipt */}
                          {expense.receipt_path && (
                            <a 
                              href={`http://127.0.0.1:8000/${expense.receipt_path}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ 
                                padding: '5px 7px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                height: '30px',
                                borderRadius: '6px',
                                color: '#6366f1', 
                                border: '1px solid rgba(99,102,241,0.2)',
                                backgroundColor: 'rgba(99,102,241,0.08)',
                                textDecoration: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              title="View Receipt"
                              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.18)'; }}
                              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.08)'; }}
                            >
                              {expense.receipt_path.endsWith('.pdf') ? <FileText size={13} /> : <Eye size={13} />}
                            </a>
                          )}

                          {/* Print */}
                          <button 
                            onClick={() => handlePrintExpense(expense)}
                            style={{ 
                              padding: '5px 7px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              height: '30px',
                              borderRadius: '6px',
                              color: '#0ea5e9', 
                              border: '1px solid rgba(14,165,233,0.2)',
                              backgroundColor: 'rgba(14,165,233,0.08)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              background: 'rgba(14,165,233,0.08)'
                            }}
                            title="Print Expense"
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(14,165,233,0.18)'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(14,165,233,0.08)'; }}
                          >
                            <Printer size={13} />
                          </button>

                          {/* Download CSV */}
                          <button 
                            onClick={() => handleDownloadExpense(expense)}
                            style={{ 
                              padding: '5px 7px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              height: '30px',
                              borderRadius: '6px',
                              color: '#10b981', 
                              border: '1px solid rgba(16,185,129,0.2)',
                              backgroundColor: 'rgba(16,185,129,0.08)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            title="Download as CSV"
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.18)'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.08)'; }}
                          >
                            <Download size={13} />
                          </button>

                          {/* Edit */}
                          {canManage && (
                            <button 
                              onClick={() => openEditModal(expense)}
                              style={{ 
                                padding: '5px 7px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                height: '30px',
                                borderRadius: '6px',
                                color: '#f59e0b', 
                                border: '1px solid rgba(245,158,11,0.2)',
                                backgroundColor: 'rgba(245,158,11,0.08)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              title="Edit Expense"
                              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.18)'; }}
                              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.08)'; }}
                            >
                              <Edit2 size={13} />
                            </button>
                          )}

                          {/* Delete */}
                          {canManage && (
                            <button 
                              onClick={() => openDeleteModal(expense)}
                              style={{ 
                                padding: '5px 7px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                height: '30px',
                                borderRadius: '6px',
                                color: '#ef4444', 
                                border: '1px solid rgba(239,68,68,0.2)',
                                backgroundColor: 'rgba(239,68,68,0.08)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              title="Delete Record"
                              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.18)'; }}
                              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'; }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Expense Overlay Modal */}
      {isModalOpen && (
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
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="animate-fade-in" style={{ 
            width: '100%', 
            maxWidth: '560px', 
            backgroundColor: 'var(--color-card-bg)',
            border: '1px solid var(--color-border)',
            padding: '24px 30px', 
            boxShadow: 'var(--shadow-lg)',
            borderRadius: 'var(--radius-lg)',
            position: 'relative',
            marginBottom: '40px'
          }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--color-text-main)' }}>Log Workshop Expenditure</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Expense Date</label>
                  <input 
                    type="date" 
                    className="form-input"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    style={{ paddingLeft: '12px', height: '38px', fontSize: '13px' }}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Spending Category</label>
                  <CustomSelect
                    value={formData.category}
                    onChange={(val) => setFormData({ ...formData, category: val })}
                    options={Object.entries(CATEGORIES).map(([key, info]) => ({
                      value: key,
                      label: info.label
                    }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Amount (INR)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    placeholder="e.g. 1500.00"
                    className="form-input"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    style={{ paddingLeft: '12px', height: '38px', fontSize: '13px' }}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Mode</label>
                  <CustomSelect
                    value={formData.payment_mode}
                    onChange={(val) => setFormData({ ...formData, payment_mode: val })}
                    options={Object.entries(PAYMENT_MODES).map(([key, label]) => ({
                      value: key,
                      label: label
                    }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Bill / Transaction Ref Number</label>
                <input 
                  type="text" 
                  placeholder="e.g. Txn-90184 or Bill #112"
                  className="form-input"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  style={{ paddingLeft: '12px', height: '38px', fontSize: '13px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description / Notes</label>
                <textarea 
                  rows="3"
                  placeholder="Provide brief details on what was purchased..."
                  className="form-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ height: '70px', padding: '10px 12px', fontSize: '13px', resize: 'none' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Attach Bill / Receipt (PDF, PNG, JPG)</label>
                <CustomFileUpload
                  file={formData.receipt}
                  onChange={(file) => setFormData({ ...formData, receipt: file })}
                />
              </div>

              {/* Submit / Cancel Footer */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  className="logout-btn" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  style={{ height: '38px', padding: '0 16px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="form-button"
                  disabled={submitting}
                  style={{ width: 'auto', marginTop: 0, height: '38px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--color-primary)' }}
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Submit Record
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── Edit Expense Modal ── */}
      {isEditModalOpen && editingExpense && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '40px 20px', overflowY: 'auto', zIndex: 1050,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            width: '100%', maxWidth: '560px',
            backgroundColor: 'var(--color-card-bg)',
            border: '1px solid var(--color-border)',
            padding: '24px 30px',
            boxShadow: 'var(--shadow-lg)',
            borderRadius: 'var(--radius-lg)',
            position: 'relative', marginBottom: '40px'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                  <Edit2 size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--color-text-main)' }}>Edit Expense Record</h3>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>Update the details below and save.</p>
                </div>
              </div>
              <button onClick={() => { setIsEditModalOpen(false); setEditingExpense(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Expense Date</label>
                  <input type="date" className="form-input"
                    value={editFormData.expense_date}
                    onChange={(e) => setEditFormData({ ...editFormData, expense_date: e.target.value })}
                    style={{ paddingLeft: '12px', height: '38px', fontSize: '13px' }}
                    required />
                </div>
                <div className="form-group">
                  <label className="form-label">Spending Category</label>
                  <CustomSelect
                    value={editFormData.category}
                    onChange={(val) => setEditFormData({ ...editFormData, category: val })}
                    options={Object.entries(CATEGORIES).map(([key, info]) => ({ value: key, label: info.label }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Amount (INR)</label>
                  <input type="number" step="0.01" min="0.01" placeholder="e.g. 1500.00" className="form-input"
                    value={editFormData.amount}
                    onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                    style={{ paddingLeft: '12px', height: '38px', fontSize: '13px' }}
                    required />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Mode</label>
                  <CustomSelect
                    value={editFormData.payment_mode}
                    onChange={(val) => setEditFormData({ ...editFormData, payment_mode: val })}
                    options={Object.entries(PAYMENT_MODES).map(([key, label]) => ({ value: key, label: label }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Bill / Transaction Ref Number</label>
                <input type="text" placeholder="e.g. Txn-90184 or Bill #112" className="form-input"
                  value={editFormData.reference_number}
                  onChange={(e) => setEditFormData({ ...editFormData, reference_number: e.target.value })}
                  style={{ paddingLeft: '12px', height: '38px', fontSize: '13px' }} />
              </div>

              <div className="form-group">
                <label className="form-label">Description / Notes</label>
                <textarea rows="3" placeholder="Provide brief details on what was purchased..." className="form-input"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  style={{ height: '70px', padding: '10px 12px', fontSize: '13px', resize: 'none' }} />
              </div>

              <div className="form-group">
                <label className="form-label">Replace Receipt (PDF, PNG, JPG — optional)</label>
                <CustomFileUpload
                  file={editFormData.receipt}
                  onChange={(file) => setEditFormData({ ...editFormData, receipt: file })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '4px' }}>
                <button type="button" className="logout-btn"
                  onClick={() => { setIsEditModalOpen(false); setEditingExpense(null); }}
                  disabled={editSubmitting}
                  style={{ height: '38px', padding: '0 16px' }}>
                  Cancel
                </button>
                <button type="submit" className="form-button" disabled={editSubmitting}
                  style={{ width: 'auto', marginTop: 0, height: '38px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}>
                  {editSubmitting && <Loader2 size={14} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {isDeleteModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100, padding: '20px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            width: '100%', maxWidth: '420px',
            backgroundColor: 'var(--color-card-bg)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px 28px 24px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ padding: '16px', borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                <AlertTriangle size={28} />
              </div>
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: '700', margin: '0 0 8px', color: 'var(--color-text-main)' }}>Delete Expense Record?</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 6px', lineHeight: '1.5' }}>
              You are about to permanently delete:
            </p>
            <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-main)', margin: '0 0 16px', padding: '8px 12px', backgroundColor: 'var(--color-bg-base)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
              {deleteTargetLabel}
            </p>
            <div style={{ textAlign: 'left', marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Reason for Deletion <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                className="form-input"
                rows="2"
                placeholder="e.g. Duplicate entry, incorrect amount..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '13px', resize: 'none', height: '60px', width: '100%', boxSizing: 'border-box' }}
                required
              />
            </div>
            <p style={{ fontSize: '12px', color: '#ef4444', margin: '0 0 20px' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => { setIsDeleteModalOpen(false); setDeleteTargetId(null); }}
                className="logout-btn"
                style={{ height: '38px', padding: '0 20px', fontSize: '13px' }}>
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!deleteReason.trim()}
                style={{
                  height: '38px', padding: '0 20px', fontSize: '13px', fontWeight: '600',
                  backgroundColor: deleteReason.trim() ? '#ef4444' : '#94a3b8', color: '#fff',
                  border: 'none', borderRadius: '6px', cursor: deleteReason.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={e => { if (deleteReason.trim()) e.currentTarget.style.backgroundColor = '#dc2626'; }}
                onMouseLeave={e => { if (deleteReason.trim()) e.currentTarget.style.backgroundColor = '#ef4444'; }}
              >
                <Trash2 size={14} />
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
