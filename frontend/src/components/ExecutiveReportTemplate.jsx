import React from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Briefcase, 
  User, Cpu, Users, Package, Clock, AlertTriangle 
} from 'lucide-react';

export default function ExecutiveReportTemplate({ data, timeframe, customStart, customEnd }) {
  if (!data) return null;

  const {
    production_summary = {},
    po_analytics = {},
    customer_analytics = [],
    revenue_analytics = {},
    expense_analytics = {},
    machine_analytics = [],
    attendance_analytics = {},
    inventory_analytics = {}
  } = data;

  const expenseBreakdown = expense_analytics.breakdown || {};

  // Formatter for Currency
  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  // Auto-Generate Observations
  const generateObservations = () => {
    const obs = [];
    if (production_summary.completion_rate > 80) obs.push(`High production completion rate at ${production_summary.completion_rate}%.`);
    if (production_summary.delayed_jobs > 0) obs.push(`${production_summary.delayed_jobs} jobs are currently delayed and require attention.`);
    if (po_analytics.po_pending > 0) obs.push(`${po_analytics.po_pending} Purchase Orders are pending conversion.`);
    
    if (customer_analytics.length > 0) {
      obs.push(`Customer '${customer_analytics[0].customer_name}' generated the highest revenue.`);
    }
    
    const lowStock = inventory_analytics.low_stock_items || 0;
    if (lowStock > 0) obs.push(`Inventory for ${lowStock} items is below the minimum threshold.`);
    
    let highestUtil = null;
    machine_analytics.forEach(m => {
      if (!highestUtil || (m.efficiency > highestUtil.efficiency)) highestUtil = m;
      if (m.maintenance_due) obs.push(`Machine ${m.machine_name} requires immediate maintenance.`);
    });
    
    if (highestUtil) obs.push(`Machine ${highestUtil.machine_name} had the highest utilization.`);
    
    return obs;
  };

  // Auto-Generate Recommendations
  const generateRecommendations = () => {
    const recs = [];
    if (machine_analytics.some(m => m.maintenance_due)) recs.push('Schedule maintenance for machines with due status immediately.');
    if (revenue_analytics.pending_payments > 0) recs.push('Follow up on overdue/pending invoices to improve cash flow.');
    if (inventory_analytics.low_stock_items > 0) recs.push('Reorder low stock materials to avoid production delays.');
    if (production_summary.delayed_jobs > 0) recs.push('Assign additional operators or overtime for delayed jobs.');
    if (attendance_analytics.attendance_percentage < 85) recs.push('Review attendance issues to ensure adequate staffing levels.');
    
    if (recs.length === 0) recs.push('Operations are running smoothly. Continue monitoring key metrics.');
    return recs;
  };

  return (
    <div id="executive-pdf-template" style={{ 
      width: '900px', 
      padding: '40px', 
      background: 'white', 
      color: '#1e293b', 
      fontFamily: 'Inter, sans-serif',
      position: 'absolute',
      left: '-9999px',
      top: 0
    }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #0f172a', paddingBottom: '20px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '60px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>TechFocal Enterprises LLP</h1>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '600', color: '#64748b' }}>Operational & Financial Report</h2>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '12px', color: '#475569', lineHeight: '1.6' }}>
          <div><strong>Period:</strong> {timeframe.replace('_', ' ').toUpperCase()} {customStart && `(${customStart} to ${customEnd})`}</div>
          <div><strong>Generated:</strong> {new Date().toLocaleString()}</div>
          <div><strong>Prepared By:</strong> TechFocal WMS</div>
        </div>
      </div>

      {/* EXECUTIVE SUMMARY (KPIs) */}
      <h3 style={{ fontSize: '20px', fontWeight: '700', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '20px', color: '#0f172a' }}>Executive Summary</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Total Revenue', value: formatCurrency(revenue_analytics.total_revenue), icon: <DollarSign size={20}/> },
          { label: 'Gross Profit', value: formatCurrency(revenue_analytics.total_revenue - expense_analytics.total_expenses), icon: <TrendingUp size={20}/> },
          { label: 'Total Expenses', value: formatCurrency(expense_analytics.total_expenses), icon: <TrendingDown size={20}/> },
          { label: 'Completed Jobs', value: production_summary.completed_jobs, icon: <Briefcase size={20}/> },
          { label: 'Purchase Orders', value: po_analytics.total_received, icon: <Package size={20}/> },
          { label: 'Pending Jobs', value: production_summary.in_progress_jobs + production_summary.delayed_jobs, icon: <Clock size={20}/> },
          { label: 'Workers Present', value: `${attendance_analytics.present || 0} / ${attendance_analytics.total_staff || 0}`, icon: <Users size={20}/> },
          { label: 'Avg Machine Util.', value: `${(machine_analytics.reduce((acc, m) => acc + (m.efficiency || 0), 0) / (machine_analytics.length || 1)).toFixed(1)}%`, icon: <Cpu size={20}/> },
        ].map((kpi, i) => (
          <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>{kpi.label}</span>
              {kpi.icon}
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* TWO COLUMN LAYOUT FOR PRODUCTION & PO */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        
        {/* Production Analytics */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px', color: '#0f172a' }}>Production Analytics</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#64748b' }}>Total Jobs</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600' }}>{production_summary.total_jobs}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#64748b' }}>Completed</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>{production_summary.completed_jobs}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#64748b' }}>In Progress</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: '#3b82f6' }}>{production_summary.in_progress_jobs}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#64748b' }}>Delayed</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: '#ef4444' }}>{production_summary.delayed_jobs}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: '#64748b' }}>Completion Rate</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600' }}>{production_summary.completion_rate}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* PO Analytics */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px', color: '#0f172a' }}>Purchase Order Analytics</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#64748b' }}>PO Received</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600' }}>{po_analytics.total_received || 0}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#64748b' }}>PO Converted</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>{po_analytics.po_converted || 0}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#64748b' }}>PO Pending</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: '#eab308' }}>{po_analytics.po_pending || 0}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#64748b' }}>PO Completed</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600' }}>{po_analytics.po_completed || 0}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: '#64748b' }}>Avg. Processing Time</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600' }}>{po_analytics.avg_processing_days || 0} Days</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FINANCIAL SUMMARY & CUSTOMERS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        
        {/* Financial Summary */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px', color: '#0f172a' }}>Financial Summary</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#64748b' }}>Revenue</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(revenue_analytics.total_revenue)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#64748b' }}>Received Payments</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>{formatCurrency(revenue_analytics.received_payments)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#64748b' }}>Pending Payments</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: '#ef4444' }}>{formatCurrency(revenue_analytics.pending_payments)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#64748b' }}>Total Expenses</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(expense_analytics.total_expenses)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: '#64748b', fontWeight: '700' }}>Net Profit</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '800' }}>{formatCurrency((revenue_analytics.total_revenue || 0) - (expense_analytics.total_expenses || 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Expenses Breakdown */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px', color: '#0f172a' }}>Expense Analytics</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              {['Electricity', 'Salary', 'Maintenance', 'Consumables', 'Transport', 'Miscellaneous'].map((cat, i) => (
                <tr key={cat} style={{ borderBottom: i < 5 ? '1px solid #e2e8f0' : 'none' }}>
                  <td style={{ padding: '8px 0', color: '#64748b' }}>{cat}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(expenseBreakdown[cat] || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MACHINE ANALYTICS */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px', color: '#0f172a' }}>Machine Analytics</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#64748b' }}>
              <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0' }}>Machine Name</th>
              <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0' }}>Run Hours</th>
              <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0' }}>Idle Hours</th>
              <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0' }}>Jobs Completed</th>
              <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0' }}>Efficiency %</th>
              <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {machine_analytics.length > 0 ? machine_analytics.map((m, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 8px', fontWeight: '600' }}>{m.machine_name}</td>
                <td style={{ padding: '10px 8px' }}>{m.running_hours || 0}</td>
                <td style={{ padding: '10px 8px' }}>{m.idle_hours || 0}</td>
                <td style={{ padding: '10px 8px' }}>{m.jobs_completed || 0}</td>
                <td style={{ padding: '10px 8px' }}>{m.efficiency || 0}%</td>
                <td style={{ padding: '10px 8px', color: m.maintenance_due ? '#ef4444' : '#16a34a', fontWeight: '600' }}>
                  {m.maintenance_due ? 'Maint. Due' : 'Operational'}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>No machine data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CUSTOMER ANALYTICS */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px', color: '#0f172a' }}>Top Customers</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#64748b' }}>
              <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0' }}>Rank</th>
              <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0' }}>Customer Name</th>
              <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Jobs</th>
              <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>POs</th>
              <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Revenue</th>
              <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {customer_analytics.length > 0 ? customer_analytics.slice(0, 5).map((c, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 8px', color: '#64748b' }}>#{i + 1}</td>
                <td style={{ padding: '10px 8px', fontWeight: '600' }}>{c.customer_name}</td>
                <td style={{ padding: '10px 8px', textAlign: 'right' }}>{c.total_jobs || 0}</td>
                <td style={{ padding: '10px 8px', textAlign: 'right' }}>{c.total_pos || 0}</td>
                <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(c.revenue)}</td>
                <td style={{ padding: '10px 8px', textAlign: 'right', color: c.outstanding > 0 ? '#ef4444' : '#16a34a' }}>{formatCurrency(c.outstanding)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>No customer data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ATTENDANCE & INVENTORY */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        
        {/* Attendance */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px', color: '#0f172a' }}>Attendance Analytics</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#64748b' }}>Total Staff</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600' }}>{attendance_analytics.total_staff || 0}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#64748b' }}>Present</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>{attendance_analytics.present || 0}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#64748b' }}>Absent</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: '#ef4444' }}>{attendance_analytics.absent || 0}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#64748b' }}>Late Entries</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: '#eab308' }}>{attendance_analytics.late_entries || 0}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: '#64748b' }}>Attendance Rate</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600' }}>{attendance_analytics.attendance_percentage || 0}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Inventory */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px', color: '#0f172a' }}>Inventory Analytics</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#64748b' }}>Material Consumed</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600' }}>{inventory_analytics.material_consumed || 0} Items</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#64748b' }}>Current Stock Value</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(inventory_analytics.stock_value)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#64748b' }}>Purchase Cost</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: '#ef4444' }}>{formatCurrency(inventory_analytics.purchase_cost)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: '#64748b' }}>Low Stock Items</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: inventory_analytics.low_stock_items > 0 ? '#ef4444' : '#16a34a' }}>
                  {inventory_analytics.low_stock_items || 0} Alerts
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* OBSERVATIONS AND RECOMMENDATIONS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', background: '#f8fafc', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} style={{ color: '#3b82f6' }}/> Observations
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '13px', lineHeight: '1.6' }}>
            {generateObservations().map((obs, i) => <li key={i} style={{ marginBottom: '8px' }}>{obs}</li>)}
          </ul>
        </div>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} style={{ color: '#f59e0b' }}/> Recommendations
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '13px', lineHeight: '1.6' }}>
            {generateRecommendations().map((rec, i) => <li key={i} style={{ marginBottom: '8px' }}>{rec}</li>)}
          </ul>
        </div>
      </div>

    </div>
  );
}
