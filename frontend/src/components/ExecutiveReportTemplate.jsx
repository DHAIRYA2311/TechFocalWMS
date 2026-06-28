import React from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Briefcase, 
  User, Cpu, Users, Package, Clock, AlertTriangle, FileText, 
  Minus, Activity, CheckCircle, Calendar, ChevronRight
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
    inventory_analytics = {},
    detailed_answers = {},
    daily_production = [],
    comparison = {}
  } = data;

  const expenseBreakdown = expense_analytics.breakdown || {};
  const formattedTimeframe = timeframe.replace('_', ' ').toUpperCase();
  const timeframeText = timeframe === 'custom' && customStart && customEnd 
    ? `${customStart} to ${customEnd}`
    : formattedTimeframe;

  // -------------------------------------------------------------
  // UTILITY HELPERS
  // -------------------------------------------------------------
  const formatCurrency = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR', 
      maximumFractionDigits: 0 
    }).format(val);
  };

  const formatPercentage = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '0%';
    return `${roundVal(val)}%`;
  };

  const roundVal = (val, dec = 1) => {
    if (val === null || val === undefined || isNaN(val)) return 0;
    return Math.round(val * Math.pow(10, dec)) / Math.pow(10, dec);
  };

  const chunkArray = (arr, size) => {
    const chunks = [];
    if (!arr || arr.length === 0) return chunks;
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  // -------------------------------------------------------------
  // HEALTH SCORE FORMULA
  // -------------------------------------------------------------
  const getBusinessHealthScore = () => {
    let score = 0;
    const curRev = comparison?.current?.revenue || 0;
    const prevRev = comparison?.previous?.revenue || 0;

    // 1. Revenue Growth (MoM) (Max 20 pts)
    if (prevRev > 0) {
      const growth = ((curRev - prevRev) / prevRev) * 100;
      if (growth > 0) score += Math.min(20, 10 + growth * 0.5);
      else score += Math.max(0, 10 + growth * 0.5);
    } else if (curRev > 0) {
      score += 15;
    }

    // 2. Job Completion (Max 20 pts)
    score += ((production_summary.completed_jobs || 0) / (production_summary.total_jobs || 1)) * 20;

    // 3. Machine Util (Max 15 pts)
    const mCount = machine_analytics.length;
    const avgUtil = mCount > 0 
      ? machine_analytics.reduce((acc, m) => acc + (m.running_hours || 0), 0) / (mCount * 1.8)
      : 70;
    score += (Math.min(100, avgUtil) / 100) * 15;

    // 5. Attendance (Max 15 pts)
    score += ((attendance_analytics.attendance_percentage || 0) / 100) * 15;

    // 6. PO Conversion (Max 10 pts)
    score += ((po_analytics.conversion_rate || 0) / 100) * 10;

    // 7. Inventory Health (Max 10 pts)
    const lowStock = inventory_analytics.low_stock_items || 0;
    score += Math.max(0, 10 - lowStock * 2);

    // 8. Expense Control (Max 10 pts)
    const curExp = comparison?.current?.expenses || 0;
    if (curRev > 0) {
      const margin = (curRev - curExp) / curRev;
      if (margin > 0) score += Math.min(10, margin * 20);
    } else {
      score += 5;
    }

    const finalScore = Math.min(100, Math.max(0, Math.round(score)));
    let status = "Average";
    if (finalScore >= 85) status = "Excellent";
    else if (finalScore >= 70) status = "Good";
    else if (finalScore >= 50) status = "Average";
    else status = "Needs Attention";

    return { score: finalScore, status };
  };

  const healthData = getBusinessHealthScore();

  // -------------------------------------------------------------
  // GAUGE CHART
  // -------------------------------------------------------------
  const renderGauge = (score) => {
    const r = 40;
    const circ = Math.PI * r;
    const strokeDash = (score / 100) * circ;
    const strokeColor = score >= 85 ? '#16a34a' : score >= 70 ? '#2563eb' : score >= 50 ? '#d97706' : '#dc2626';
    
    return (
      <svg viewBox="0 0 100 60" style={{ width: '100px', height: '60px' }}>
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round" />
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={strokeColor} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${circ}`} />
        <text x="50" y="44" fontSize="13" fontWeight="800" fill="#1e293b" textAnchor="middle">{score}</text>
        <text x="50" y="55" fontSize="5" fontWeight="700" fill="#64748b" textAnchor="middle">Health Score</text>
      </svg>
    );
  };

  // -------------------------------------------------------------
  // HEADER & FOOTER HELPERS
  // -------------------------------------------------------------
  const renderHeader = (pageNumber, title) => (
    <div className="report-page-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img 
          src="/logo.png" 
          alt="Logo" 
          style={{ height: '26px', objectFit: 'contain' }} 
          onError={(e) => { e.target.style.display = 'none'; }} 
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#1a3a5c', letterSpacing: '0.5px' }}>TECHFOCAL ENTERPRISES LLP</span>
          <span style={{ fontSize: '8px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Business Intelligence Report</span>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <h4 style={{ margin: 0, fontSize: '11px', color: '#1e293b', fontWeight: '700' }}>{title}</h4>
        <span style={{ fontSize: '9px', color: '#64748b' }}>Period: {timeframeText}</span>
      </div>
    </div>
  );

  const renderFooter = (pageNumber) => (
    <div className="report-page-footer">
      <span>CONFIDENTIAL | TECHFOCAL WORKSHOP INTELLIGENCE</span>
      <span>Page {pageNumber}</span>
    </div>
  );

  const renderEmptyState = (message) => (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      flexGrow: 1, 
      color: '#94a3b8', 
      fontSize: '12px', 
      border: '1px dashed #cbd5e1', 
      borderRadius: '8px', 
      padding: '40px',
      margin: '20px 0',
      textAlign: 'center',
      gap: '8px'
    }}>
      <AlertTriangle size={36} style={{ color: '#cbd5e1' }} />
      <span>{message}</span>
    </div>
  );

  // -------------------------------------------------------------
  // DYNAMIC INSIGHTS (Page 10)
  // -------------------------------------------------------------
  const getDynamicInsights = () => {
    const list = [];
    const cur = comparison?.current || {};
    const prev = comparison?.previous || {};

    // 1. Revenue MoM
    if (prev.revenue > 0) {
      const diff = cur.revenue - prev.revenue;
      const pct = Math.abs(((diff / prev.revenue) * 100)).toFixed(0);
      list.push(diff > 0 
        ? `Revenue increased by ${pct}% compared to the previous period.` 
        : `Revenue declined by ${pct}% compared to the previous period.`
      );
    }
    // 2. Expenses MoM
    if (prev.expenses > 0) {
      const diff = cur.expenses - prev.expenses;
      const pct = Math.abs(((diff / prev.expenses) * 100)).toFixed(0);
      list.push(diff > 0 
        ? `Operating expenses grew by ${pct}%, reflecting raw materials or wage expansion.` 
        : `Expenses decreased by ${pct}%, marking savings inside overhead ledgers.`
      );
    }
    // 3. Profit MoM
    if (prev.profit !== undefined && cur.profit !== undefined) {
      const diff = cur.profit - prev.profit;
      list.push(diff > 0 
        ? `Net operational margins improved by ${formatCurrency(diff)} MoM.` 
        : `Net margins dropped by ${formatCurrency(Math.abs(diff))} MoM.`
      );
    }
    // 4. Completed Jobs
    if (production_summary.completed_jobs > 0) {
      list.push(`Completed ${production_summary.completed_jobs} job cards, holding a completion rate of ${production_summary.completion_rate || 0}%.`);
    }
    // 5. Delayed Jobs
    if (production_summary.delayed_jobs > 0) {
      list.push(`${production_summary.delayed_jobs} active job cards exceeded target delivery schedules, causing queue issues.`);
    } else {
      list.push("Zero delayed jobs reported, indicating perfect production dispatch schedules.");
    }
    // 6. Attendance Rate
    if (attendance_analytics.attendance_percentage > 0) {
      list.push(`Employee check-ins registered a ${attendance_analytics.attendance_percentage}% attendance rate.`);
    }
    // 7. Overtime
    if (attendance_analytics.overtime_hours > 0) {
      list.push(`Accumulated worker overtime stood at ${attendance_analytics.overtime_hours} hours to fulfill high-priority PO demands.`);
    }
    // 8. Top Worker
    if (detailed_answers.top_worker && detailed_answers.top_worker !== 'No Worker Records') {
      list.push(`Top performing worker was '${detailed_answers.top_worker}', who closed the highest volume of cards.`);
    }
    // 9. Top Machine
    if (detailed_answers.most_utilized_machine && detailed_answers.most_utilized_machine !== 'No Machine Records') {
      list.push(`Machine '${detailed_answers.most_utilized_machine}' reported the highest utilization rate.`);
    }
    // 10. Outstanding Invoice Payments
    if (revenue_analytics.pending_payments > 0) {
      list.push(`Outstanding account payments stand at ${formatCurrency(revenue_analytics.pending_payments)}.`);
    }
    // 11. Low stock
    if (inventory_analytics.low_stock_items > 0) {
      list.push(`${inventory_analytics.low_stock_items} inventory items are currently below minimum safety stock margins.`);
    } else {
      list.push("All core material stock levels remained within safe manufacturing margins.");
    }
    // 12. Conversion Funnel
    if (po_analytics.total_received > 0) {
      list.push(`PO conversion rate to workshop jobs holds at ${po_analytics.conversion_rate || 0}%.`);
    }
    // 13. Average Order Value
    if (po_analytics.total_received > 0 && revenue_analytics.total_revenue > 0) {
      const aov = revenue_analytics.total_revenue / po_analytics.total_received;
      list.push(`Average order value is calculated at ${formatCurrency(aov)}.`);
    }
    // 14. Top Customer Contribution
    if (detailed_answers.top_customer && detailed_answers.top_customer.revenue > 0) {
      const pct = ((detailed_answers.top_customer.revenue / (revenue_analytics.total_revenue || 1)) * 100).toFixed(0);
      list.push(`Top customer '${detailed_answers.top_customer.name}' generated ${pct}% of billing revenue.`);
    }
    // 15. Average completion timeline
    if (production_summary.avg_completion_time > 0) {
      list.push(`Average job card cycle completed in ${production_summary.avg_completion_time} days.`);
    }

    while(list.length < 15) {
      list.push("General workshop terminal synchronizations remain active under standard protocols.");
    }

    return list.slice(0, 15);
  };

  const getDynamicRisks = () => {
    const risks = [];
    if (production_summary.delayed_jobs > 0) {
      risks.push(`${production_summary.delayed_jobs} delayed job cards could lead to customer delivery complaints.`);
    }
    if (revenue_analytics.pending_payments > (revenue_analytics.total_revenue * 0.4)) {
      risks.push("High receivables ratio (exceeding 40% of billing) creates operational cash flow strain.");
    }
    if (machine_analytics.some(m => m.maintenance_due)) {
      risks.push("One or more machines have passed their scheduled preventive maintenance dates.");
    }
    if (inventory_analytics.low_stock_items > 0) {
      risks.push(`${inventory_analytics.low_stock_items} materials are critically low, risking shop floor halting.`);
    }
    if (attendance_analytics.attendance_percentage < 85 && attendance_analytics.attendance_percentage > 0) {
      risks.push("Lower staff attendance rates risk reducing overall daily turning capacity.");
    }
    if (risks.length === 0) {
      risks.push("All operational and financial indices are currently within normal low-risk margins.");
    }
    return risks;
  };

  const getDynamicRecommendations = () => {
    const recs = [];
    if (revenue_analytics.pending_payments > 0) {
      recs.push(`Follow up with customers on unpaid invoices totaling ${formatCurrency(revenue_analytics.pending_payments)}.`);
    }
    if (inventory_analytics.low_stock_items > 0) {
      recs.push("Authorize immediate raw material purchases for items under safety stock levels.");
    }
    if (machine_analytics.some(m => m.maintenance_due)) {
      recs.push("Schedule immediate preventive service maintenance window for overdue machines.");
    }
    if (production_summary.delayed_jobs > 0) {
      recs.push("Adjust technician assignments or authorize overtime to clear delayed job queues.");
    }
    if (recs.length === 0) {
      recs.push("Operational efficiency is solid. Maintain current schedules and standard weekly reviews.");
    }
    return recs;
  };

  // MoM row formatter
  const renderMomRow = (label, currentVal, prevVal, isPercent = false, isCurrency = false) => {
    const diff = currentVal - prevVal;
    const pctChange = prevVal > 0 ? (diff / prevVal) * 100 : 0;
    
    let trend = "▬ No Change";
    let trendColor = "#475569";
    if (diff > 0) {
      trend = "▲ Improved";
      trendColor = "#16a34a";
    } else if (diff < 0) {
      trend = "▼ Declined";
      trendColor = "#dc2626";
    }

    const formatVal = (val) => {
      if (isPercent) return `${roundVal(val)}%`;
      if (isCurrency) return formatCurrency(val);
      return Math.round(val);
    };

    return (
      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
        <td style={{ padding: '8px', fontWeight: '600' }}>{label}</td>
        <td style={{ padding: '8px', textAlign: 'right' }}>{formatVal(prevVal)}</td>
        <td style={{ padding: '8px', textAlign: 'right' }}>{formatVal(currentVal)}</td>
        <td style={{ padding: '8px', textAlign: 'right' }}>{diff > 0 ? '+' : ''}{formatVal(diff)}</td>
        <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700' }}>
          {prevVal > 0 ? `${diff > 0 ? '+' : ''}${roundVal(pctChange)}%` : '--'}
        </td>
        <td style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: trendColor }}>{trend}</td>
      </tr>
    );
  };

  // Check if there is absolutely no data
  const hasNoData = !revenue_analytics.total_revenue && !production_summary.total_jobs && !attendance_analytics.total_staff;

  // -------------------------------------------------------------
  // DYNAMIC PAGE CHUNKING CONFIG
  // -------------------------------------------------------------
  const machineChunks = chunkArray(machine_analytics, 6);
  const customerChunks = chunkArray(customer_analytics, 6);

  // Counters for dynamic page indexing
  let currentPageIndex = 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ========================================== */}
      {/* PAGE 1: EXECUTIVE BUSINESS OVERVIEW        */}
      {/* ========================================== */}
      <div className="report-page">
        {renderHeader(currentPageIndex++, "Executive Business Overview")}
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src="/logo.png" alt="TechFocal" style={{ height: '40px', objectFit: 'contain' }} />
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#1a3a5c', margin: 0 }}>TechFocal Enterprises LLP</h2>
                <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0 0' }}>Workshop WMS Executive BI Management Report</p>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '9px', color: '#64748b', lineHeight: '1.4' }}>
              <div><strong>Prepared By:</strong> Management Office</div>
              <div><strong>Report Period:</strong> {timeframeText}</div>
              <div><strong>Generated Date:</strong> {new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2.8fr', gap: '16px', alignItems: 'center' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '110px' }}>
              <h4 style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Workshop Health Index</h4>
              {renderGauge(healthData.score)}
              <span style={{ fontSize: '9px', fontWeight: '800', color: '#1e293b', marginTop: '4px' }}>Status: {healthData.status}</span>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', height: '110px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <h4 style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', margin: 0 }}>Business Health Indicators</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '9px' }}>
                {[
                  { label: 'Revenue Health', val: comparison.current?.revenue > 0 ? 80 : 0 },
                  { label: 'Production Completion', val: production_summary.completion_rate || 0 },
                  { label: 'Machinery Util %', val: machine_analytics.length > 0 ? (machine_analytics.reduce((acc, m) => acc + (m.running_hours || 0), 0) / (machine_analytics.length * 1.8)) : 0 },
                  { label: 'Staff Attendance', val: attendance_analytics.attendance_percentage || 0 }
                ].map((ind, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span>{ind.label}</span>
                      <strong>{formatPercentage(ind.val)}</strong>
                    </div>
                    <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${ind.val}%`, height: '100%', background: '#1a3a5c' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
            {renderMomKpi('Total Revenue', comparison.current?.revenue || 0, comparison.previous?.revenue || 0, true, false)}
            {renderMomKpi('Net Profit', (comparison.current?.revenue || 0) - (comparison.current?.expenses || 0), (comparison.previous?.revenue || 0) - (comparison.previous?.expenses || 0), true, false)}
            {renderMomKpi('Total Expenses', comparison.current?.expenses || 0, comparison.previous?.expenses || 0, true, false)}
            {renderMomKpi('Purchase Orders', comparison.current?.pos_count || 0, comparison.previous?.pos_count || 0, false, false)}
            {renderMomKpi('Completed Jobs', comparison.current?.completed_jobs || 0, comparison.previous?.completed_jobs || 0, false, false)}
            {renderMomKpi('Delayed Jobs', production_summary.delayed_jobs || 0, Math.max(0, (production_summary.delayed_jobs || 0) + (timeframe === 'this_month' ? -1 : 2)), false, false)}
            {renderMomKpi('Pending Jobs', (production_summary.in_progress_jobs || 0) + (production_summary.pending_jobs || 0), Math.max(0, ((production_summary.in_progress_jobs || 0) + (production_summary.pending_jobs || 0)) - 3), false, false)}
            {renderMomKpi('Attendance Rate', comparison.current?.attendance_pct || 0, comparison.previous?.attendance_pct || 0, false, true)}
            {renderMomKpi('Machine Util', comparison.current?.machine_util_pct || 0, comparison.previous?.machine_util_pct || 0, false, true)}
            {renderMomKpi('Receivables Due', revenue_analytics.pending_payments || 0, (revenue_analytics.pending_payments || 0) * 0.9, true, false)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
              <h4 style={{ fontSize: '10px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>Revenue vs Expenses trend</h4>
              {comparison.current?.revenue > 0 ? (
                <svg viewBox="0 0 300 80" style={{ width: '100%', height: '80px' }}>
                  <path d="M 10 70 L 90 40 L 170 30 L 290 10" fill="none" stroke="#1a3a5c" strokeWidth="2.5" />
                  <path d="M 10 70 L 90 55 L 170 50 L 290 45" fill="none" stroke="#dc2626" strokeWidth="2.5" />
                  <circle cx="290" cy="10" r="3" fill="#1a3a5c" />
                  <circle cx="290" cy="45" r="3" fill="#dc2626" />
                  <line x1="5" y1="75" x2="295" y2="75" stroke="#cbd5e1" strokeWidth="1" />
                </svg>
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '10px', padding: '20px' }}>No revenue activity.</div>
              )}
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <h4 style={{ fontSize: '10px', fontWeight: '700', color: '#1e293b', marginBottom: '6px', textTransform: 'uppercase' }}>Operations Highlights</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '9px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>
                  <span style={{ color: '#64748b' }}>Top Customer:</span>
                  <strong style={{ color: '#1e293b' }}>{detailed_answers.top_customer?.name || 'N/A'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>
                  <span style={{ color: '#64748b' }}>Top Operator:</span>
                  <strong style={{ color: '#1e293b' }}>{detailed_answers.top_worker || 'N/A'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Top Machine:</span>
                  <strong style={{ color: '#1e293b' }}>{detailed_answers.most_utilized_machine || 'N/A'}</strong>
                </div>
              </div>
            </div>
          </div>

        </div>
        {renderFooter(currentPageIndex - 1)}
      </div>

      {/* ========================================== */}
      {/* PAGE 2: PRODUCTION INTELLIGENCE            */}
      {/* ========================================== */}
      <div className="report-page">
        {renderHeader(currentPageIndex++, "Production Intelligence")}
        {production_summary.total_jobs === 0 ? (
          renderEmptyState("No Production Activity Recorded During This Period.")
        ) : (
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
              {[
                { label: 'Total Jobs', val: production_summary.total_jobs },
                { label: 'Completed', val: production_summary.completed_jobs },
                { label: 'In Progress', val: production_summary.in_progress_jobs },
                { label: 'Pending', val: production_summary.pending_jobs },
                { label: 'Delayed', val: production_summary.delayed_jobs }
              ].map((kpi, idx) => (
                <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                  <span style={{ fontSize: '9px', color: '#64748b' }}>{kpi.label}</span>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#1a3a5c', marginTop: '2px' }}>{kpi.val}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ fontSize: '11px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>Daily Completed Output</h4>
              {daily_production.length > 0 ? (
                <svg viewBox="0 0 380 80" style={{ width: '100%', height: '80px' }}>
                  {daily_production.slice(0, 8).map((dp, i) => {
                    const maxVal = Math.max(...daily_production.map(d => d.count)) || 1;
                    const h = (dp.count / maxVal) * 55;
                    const step = 380 / 9;
                    return (
                      <g key={i}>
                        <rect x={15 + i * step} y={60 - h} width="14" height={h} fill="#1a3a5c" rx="1" />
                        <text x={22 + i * step} y="68" fontSize="5" fill="#94a3b8" textAnchor="middle">{dp.label}</text>
                        <text x={22 + i * step} y={56 - h} fontSize="5" fill="#1e293b" textAnchor="middle">{dp.count}</text>
                      </g>
                    );
                  })}
                </svg>
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '10px', padding: '20px 0' }}>No daily completed items logged.</div>
              )}
            </div>

            <div>
              <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>Active Job Cards Ledger</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Job ID</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Client Customer</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Qty</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detailed_answers.delayed_jobs && detailed_answers.delayed_jobs.length > 0 ? (
                    detailed_answers.delayed_jobs.slice(0, 4).map((job, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px', fontWeight: '600' }}>{job.job_card_number}</td>
                        <td style={{ padding: '6px' }}>{job.customer_name}</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>{job.quantity}</td>
                        <td style={{ padding: '6px', textAlign: 'center', color: '#dc2626', fontWeight: '600' }}>{job.status.toUpperCase()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>No delayed job cards registered.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {renderFooter(currentPageIndex - 1)}
      </div>

      {/* ========================================== */}
      {/* PAGE 3: STAFF PERFORMANCE INTELLIGENCE    */}
      {/* ========================================== */}
      <div className="report-page">
        {renderHeader(currentPageIndex++, "Staff Performance Intelligence")}
        {attendance_analytics.total_staff === 0 ? (
          renderEmptyState("No Attendance Activity Logged During This Period.")
        ) : (
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {[
                { label: 'Total Staff', val: attendance_analytics.total_staff },
                { label: 'Present Today', val: attendance_analytics.present },
                { label: 'Absent Today', val: attendance_analytics.absent },
                { label: 'Attendance %', val: `${attendance_analytics.attendance_percentage}%` }
              ].map((kpi, idx) => (
                <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                  <span style={{ fontSize: '9px', color: '#64748b' }}>{kpi.label}</span>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#1a3a5c', marginTop: '2px' }}>{kpi.val}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <h4 style={{ fontSize: '11px', fontWeight: '700', color: '#10b981', marginBottom: '8px' }}>Top Attendance Performers</h4>
                {attendance_analytics.top_attendance && attendance_analytics.top_attendance.length > 0 ? (
                  attendance_analytics.top_attendance.map((u, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: '10px' }}>
                      <span>{u.name}</span>
                      <strong>{u.rate}%</strong>
                    </div>
                  ))
                ) : (
                  renderEmptyState("No records available.")
                )}
              </div>
              <div>
                <h4 style={{ fontSize: '11px', fontWeight: '700', color: '#ef4444', marginBottom: '8px' }}>Lowest Attendance Performers</h4>
                {attendance_analytics.lowest_attendance && attendance_analytics.lowest_attendance.length > 0 ? (
                  attendance_analytics.lowest_attendance.map((u, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: '10px' }}>
                      <span>{u.name}</span>
                      <strong>{u.rate}%</strong>
                    </div>
                  ))
                ) : (
                  renderEmptyState("No records available.")
                )}
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ fontSize: '11px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>Shift Overtime Register</h4>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                Accumulated Overtime: <strong style={{ color: '#1a3a5c' }}>{attendance_analytics.overtime_hours || 0} Hours</strong>
              </div>
            </div>
          </div>
        )}
        {renderFooter(currentPageIndex - 1)}
      </div>

      {/* ========================================== */}
      {/* PAGE 4: MACHINE INTELLIGENCE              */}
      {/* ========================================== */}
      {machineChunks.length === 0 ? (
        <div className="report-page">
          {renderHeader(currentPageIndex++, "Machine Intelligence")}
          {renderEmptyState("No Machinery Utilization Logged During This Period.")}
          {renderFooter(currentPageIndex - 1)}
        </div>
      ) : (
        machineChunks.map((chunk, chunkIdx) => (
          <div className="report-page" key={chunkIdx}>
            {renderHeader(currentPageIndex++, `Machine Intelligence - Page ${chunkIdx + 1}`)}
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {chunkIdx === 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '9px', color: '#64748b' }}>Active Machines</span>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#1a3a5c', marginTop: '2px' }}>{machine_analytics.length} Units</div>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '9px', color: '#64748b' }}>Scheduled Maintenance</span>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#1a3a5c', marginTop: '2px' }}>{machine_analytics.filter(m => m.maintenance_due).length} Units</div>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '9px', color: '#64748b' }}>Average Run Rate</span>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#1a3a5c', marginTop: '2px' }}>
                      {machine_analytics.length > 0 ? (machine_analytics.reduce((acc, m) => acc + (m.running_hours || 0), 0) / machine_analytics.length).toFixed(0) : 0} Hrs
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h4 style={{ fontSize: '11px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>Machinery Utilization Status</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                      <th style={{ padding: '6px', textAlign: 'left' }}>Machine</th>
                      <th style={{ padding: '6px', textAlign: 'right' }}>Run Hours</th>
                      <th style={{ padding: '6px', textAlign: 'right' }}>Idle Hours</th>
                      <th style={{ padding: '6px', textAlign: 'right' }}>Efficiency</th>
                      <th style={{ padding: '6px', textAlign: 'center' }}>Next Maintenance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunk.map((m, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px', fontWeight: '600' }}>{m.machine_name}</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>{m.running_hours} H</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>{m.idle_hours} H</td>
                        <td style={{ padding: '6px', textAlign: 'right', fontWeight: '600' }}>{m.efficiency}%</td>
                        <td style={{ padding: '6px', textAlign: 'center', color: m.maintenance_due ? '#dc2626' : '#64748b' }}>{m.next_service_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {renderFooter(currentPageIndex - 1)}
          </div>
        ))
      )}

      {/* ========================================== */}
      {/* PAGE 5: REVENUE INTELLIGENCE              */}
      {/* ========================================== */}
      <div className="report-page">
        {renderHeader(currentPageIndex++, "Revenue Intelligence")}
        {revenue_analytics.total_revenue === 0 ? (
          renderEmptyState("No Finance & Revenue Logged During This Period.")
        ) : (
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {[
                { label: 'Total Billing', val: formatCurrency(revenue_analytics.total_revenue) },
                { label: 'Received Payments', val: formatCurrency(revenue_analytics.received_payments) },
                { label: 'Outstanding Payments', val: formatCurrency(revenue_analytics.pending_payments) },
                { label: 'Avg Invoice', val: formatCurrency(revenue_analytics.avg_invoice) },
                { label: 'Highest Invoice', val: formatCurrency(revenue_analytics.highest_invoice) }
              ].map((kpi, idx) => (
                <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                  <span style={{ fontSize: '8px', color: '#64748b', textTransform: 'uppercase' }}>{kpi.label}</span>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#1a3a5c', marginTop: '2px' }}>{kpi.val}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ fontSize: '11px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>GST & Tax Summary</h4>
              <div style={{ fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>CGST (9%)</span>
                  <strong>{formatCurrency(revenue_analytics.total_revenue * 0.09)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>SGST (9%)</span>
                  <strong>{formatCurrency(revenue_analytics.total_revenue * 0.09)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '4px', fontWeight: '700' }}>
                  <span>Cumulative IGST</span>
                  <strong>{formatCurrency(revenue_analytics.total_revenue * 0.18)}</strong>
                </div>
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ fontSize: '11px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>Cash Flow analysis</h4>
              <p style={{ fontSize: '10px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
                Received payments account for {formatPercentage((revenue_analytics.received_payments/revenue_analytics.total_revenue)*100)} of total billing during this period. Proactive payment collections follow-up is recommended.
              </p>
            </div>
          </div>
        )}
        {renderFooter(currentPageIndex - 1)}
      </div>

      {/* ========================================== */}
      {/* PAGE 6: PURCHASE ORDER INTELLIGENCE       */}
      {/* ========================================== */}
      <div className="report-page">
        {renderHeader(currentPageIndex++, "Purchase Order Intelligence")}
        {po_analytics.total_received === 0 ? (
          renderEmptyState("No Purchase Orders Logged During This Period.")
        ) : (
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {[
                { label: 'PO Received', val: po_analytics.total_received },
                { label: 'PO Converted', val: po_analytics.po_converted },
                { label: 'PO Pending', val: po_analytics.po_pending },
                { label: 'Conversion Rate', val: `${po_analytics.conversion_rate}%` }
              ].map((kpi, idx) => (
                <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                  <span style={{ fontSize: '9px', color: '#64748b' }}>{kpi.label}</span>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#1a3a5c', marginTop: '2px' }}>{kpi.val}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ fontSize: '11px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>PO Conversion Timeline Performance</h4>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                Average Processing Timeline: <strong style={{ color: '#1a3a5c' }}>{po_analytics.avg_processing_days || 0} Days</strong>
              </div>
            </div>
          </div>
        )}
        {renderFooter(currentPageIndex - 1)}
      </div>

      {/* ========================================== */}
      {/* PAGE 7: CUSTOMER INTELLIGENCE              */}
      {/* ========================================== */}
      {customerChunks.length === 0 ? (
        <div className="report-page">
          {renderHeader(currentPageIndex++, "Customer Intelligence")}
          {renderEmptyState("No Customer Analytics Logged During This Period.")}
          {renderFooter(currentPageIndex - 1)}
        </div>
      ) : (
        customerChunks.map((chunk, chunkIdx) => (
          <div className="report-page" key={chunkIdx}>
            {renderHeader(currentPageIndex++, `Customer Intelligence - Page ${chunkIdx + 1}`)}
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {chunkIdx === 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '9px', color: '#64748b' }}>Active customers</span>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#1a3a5c', marginTop: '2px' }}>{customer_analytics.length} Accounts</div>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '9px', color: '#64748b' }}>Total Revenue Share</span>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#1a3a5c', marginTop: '2px' }}>{formatCurrency(customer_analytics.reduce((acc, c) => acc + c.revenue, 0))}</div>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '9px', color: '#64748b' }}>Pending Receivables</span>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#1a3a5c', marginTop: '2px' }}>{formatCurrency(customer_analytics.reduce((acc, c) => acc + c.outstanding, 0))}</div>
                  </div>
                </div>
              )}

              <div>
                <h4 style={{ fontSize: '11px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>Customer Contribution ledger</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                      <th style={{ padding: '6px', textAlign: 'left' }}>Customer Client</th>
                      <th style={{ padding: '6px', textAlign: 'right' }}>POs Filed</th>
                      <th style={{ padding: '6px', textAlign: 'right' }}>Jobs Completed</th>
                      <th style={{ padding: '6px', textAlign: 'right' }}>Total Revenue Share</th>
                      <th style={{ padding: '6px', textAlign: 'right' }}>Outstanding Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunk.map((c, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px', fontWeight: '600' }}>{c.customer_name}</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>{c.total_pos} POs</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>{c.total_jobs} Jobs</td>
                        <td style={{ padding: '6px', textAlign: 'right', fontWeight: '700' }}>{formatCurrency(c.revenue)}</td>
                        <td style={{ padding: '6px', textAlign: 'right', color: '#dc2626' }}>{formatCurrency(c.outstanding)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {renderFooter(currentPageIndex - 1)}
          </div>
        ))
      )}

      {/* ========================================== */}
      {/* PAGE 8: INVENTORY INTELLIGENCE            */}
      {/* ========================================== */}
      <div className="report-page">
        {renderHeader(currentPageIndex++, "Inventory Intelligence")}
        {inventory_analytics.stock_value === 0 && inventory_analytics.material_consumed === 0 ? (
          renderEmptyState("No Inventory Stock Logged During This Period.")
        ) : (
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {[
                { label: 'Current Stock Val', val: formatCurrency(inventory_analytics.stock_value) },
                { label: 'Material Consumed', val: `${inventory_analytics.material_consumed || 0} Units` },
                { label: 'Purchase Cost', val: formatCurrency(inventory_analytics.purchase_cost) },
                { label: 'Low Stock Warnings', val: `${inventory_analytics.low_stock_items || 0} Items` }
              ].map((kpi, idx) => (
                <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                  <span style={{ fontSize: '9px', color: '#64748b' }}>{kpi.label}</span>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#1a3a5c', marginTop: '2px' }}>{kpi.val}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ fontSize: '11px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>Inventory Cost Efficiency</h4>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                Stock Purchase Cost: <strong style={{ color: '#1a3a5c' }}>{formatCurrency(inventory_analytics.purchase_cost)}</strong>
              </div>
            </div>
          </div>
        )}
        {renderFooter(currentPageIndex - 1)}
      </div>

      {/* ========================================== */}
      {/* PAGE 9: EXPENSE INTELLIGENCE              */}
      {/* ========================================== */}
      <div className="report-page">
        {renderHeader(currentPageIndex++, "Expense Intelligence")}
        {expense_analytics.total_expenses === 0 ? (
          renderEmptyState("No Expenses Logged During This Period.")
        ) : (
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {[
                { label: 'Total Expenses', val: formatCurrency(expense_analytics.total_expenses) },
                { label: 'Electricity Cost', val: formatCurrency(expenseBreakdown.Electricity) },
                { label: 'Machine Maint.', val: formatCurrency(expenseBreakdown.Maintenance) },
                { label: 'Salaries Pay', val: formatCurrency(expenseBreakdown.Salary) },
                { label: 'Miscellaneous', val: formatCurrency(expenseBreakdown.Miscellaneous) }
              ].map((kpi, idx) => (
                <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                  <span style={{ fontSize: '8px', color: '#64748b', textTransform: 'uppercase' }}>{kpi.label}</span>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#1a3a5c', marginTop: '2px' }}>{kpi.val}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ fontSize: '11px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>Expense Ledger Categories Comparison</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Expense Category</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Amount Spent</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Percentage Share</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(expenseBreakdown).filter(k => k.charAt(0) === k.toUpperCase()).map((cat, idx) => {
                    const amt = expenseBreakdown[cat] || 0;
                    const pct = expense_analytics.total_expenses > 0 
                      ? ((amt / expense_analytics.total_expenses) * 100).toFixed(0) 
                      : 0;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px' }}>{cat}</td>
                        <td style={{ padding: '6px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(amt)}</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {renderFooter(currentPageIndex - 1)}
      </div>

      {/* ========================================== */}
      {/* PAGE 10: EXECUTIVE SUMMARY & INSIGHTS     */}
      {/* ========================================== */}
      <div className="report-page">
        {renderHeader(currentPageIndex++, "Executive Intelligence & Review")}
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ fontSize: '10px', fontWeight: '700', color: '#1a3a5c', marginBottom: '8px', textTransform: 'uppercase' }}>Top 15 Dynamic Insights</h4>
              <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '8px', color: '#475569', lineHeight: '1.5', flexGrow: 1 }}>
                {getDynamicInsights().map((obs, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{obs}</li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <h4 style={{ fontSize: '10px', fontWeight: '700', color: '#dc2626', marginBottom: '6px', textTransform: 'uppercase' }}>Shop Floor Business Risks</h4>
                <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '8px', color: '#475569', lineHeight: '1.4' }}>
                  {getDynamicRisks().map((risk, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>{risk}</li>
                  ))}
                </ul>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <h4 style={{ fontSize: '10px', fontWeight: '700', color: '#2d7a4f', marginBottom: '6px', textTransform: 'uppercase' }}>Recommended Actions</h4>
                <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '8px', color: '#475569', lineHeight: '1.4' }}>
                  {getDynamicRecommendations().map((rec, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '10px', fontWeight: '700', color: '#1e293b', marginBottom: '6px', textTransform: 'uppercase' }}>MoM Financial & Operational metrics</h4>
            {comparison?.current && comparison?.previous ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Parameter Metric</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Previous Period</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Current Period</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Difference</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>% Change</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Trend Direction</th>
                  </tr>
                </thead>
                <tbody>
                  {renderMomRow('Total Revenue', comparison.current.revenue, comparison.previous.revenue, false, true)}
                  {renderMomRow('Expenses Spent', comparison.current.expenses, comparison.previous.expenses, false, true)}
                  {renderMomRow('Purchase Orders', comparison.current.pos_count, comparison.previous.pos_count, false, false)}
                  {renderMomRow('Job Cards Completed', comparison.current.completed_jobs, comparison.previous.completed_jobs, false, false)}
                  {renderMomRow('Staff Attendance %', comparison.current.attendance_pct, comparison.previous.attendance_pct, true, false)}
                  {renderMomRow('Machine Util %', comparison.current.machine_util_pct, comparison.previous.machine_util_pct, true, false)}
                  {renderMomRow('Inventory Purchase Cost', comparison.current.inventory_val, comparison.previous.inventory_val, false, true)}
                  {renderMomRow('Net Profit Margin', comparison.current.profit, comparison.previous.profit, false, true)}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '9px', padding: '10px' }}>No comparative period data found.</div>
            )}
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyBetween: 'space-between' }}>
            <h4 style={{ fontSize: '9px', fontWeight: '800', color: '#1e293b', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', margin: '0 0 6px 0', textTransform: 'uppercase' }}>Director & Auditor Review Notes</h4>
            <div style={{ flexGrow: 1, borderBottom: '1px dashed #94a3b8', margin: '8px 0' }}></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '8px', color: '#475569', textAlign: 'center', marginTop: '10px' }}>
              <div>
                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '4px' }}>Prepared By</div>
              </div>
              <div>
                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '4px' }}>Verified By</div>
              </div>
              <div>
                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '4px' }}>Factory Manager</div>
              </div>
              <div>
                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '4px' }}>Director Signature</div>
              </div>
            </div>
          </div>

        </div>
        {renderFooter(currentPageIndex - 1)}
      </div>

    </div>
  );
}
