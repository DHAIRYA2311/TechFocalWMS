import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ExecutiveReportTemplate from './ExecutiveReportTemplate';
import CustomSelect from './CustomSelect';
import {
  BarChart3,
  Calendar,
  Loader2,
  Briefcase,
  User,
  Cpu,
  Users,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Clock,
  Package,
  ChevronRight,
  FileSpreadsheet,
  HelpCircle,
  TrendingDown,
  Download
} from 'lucide-react';

export default function Reports() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // Filters State
  const [timeframe, setTimeframe] = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Fetch report data
  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const params = { filter: timeframe };

      if (timeframe === 'custom' && customStart && customEnd) {
        params.start_date = customStart;
        params.end_date = customEnd;
      }

      const response = await axios.get('http://127.0.0.1:8000/api/reports/analytics', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setData(response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load reports and business intelligence analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeframe !== 'custom' || (customStart && customEnd)) {
      fetchReportData();
    }
  }, [timeframe, customStart, customEnd]);

  const downloadPDF = async () => {
    const input = document.getElementById('executive-pdf-template');
    if (!input) {
      alert("Report template not found.");
      return;
    }

    setDownloading(true);

    // Temporarily make the template visible for html2canvas to capture it accurately
    input.style.left = '0';
    input.style.top = '0';
    input.style.position = 'relative';

    // Small delay to ensure DOM applies the styles
    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgProps = pdf.getImageProperties(imgData);
      const totalPdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      let heightLeft = totalPdfHeight;
      let position = 0;

      // Top padding for the first page
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, totalPdfHeight);
      heightLeft -= pdfHeight;

      // Multi-page rendering
      while (heightLeft > 0) {
        position = heightLeft - totalPdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, totalPdfHeight);
        heightLeft -= pdfHeight;
      }

      // Format timestamp DDMMYYYY HH:MM
      const now = new Date();
      const timestamp = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const footerText = `TechFocal WMS | Confidential - Internal Use Only`;

      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);

        // White bar at the bottom to cover cut-offs
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, pdfHeight - 15, pdfWidth, 15, 'F');

        pdf.setFontSize(8);
        pdf.setTextColor(100);
        pdf.text(footerText, 14, pdfHeight - 7);
        pdf.text(`Generated: ${timestamp}`, 14, pdfHeight - 4);
        pdf.text(`Page ${i} of ${pageCount}`, pdfWidth - 20, pdfHeight - 7);
      }

      pdf.save(`TechFocal_Executive_Report_${timestamp.replace(/ /g, '_')}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      // Hide the template again
      input.style.position = 'absolute';
      input.style.left = '-9999px';
      input.style.top = '0';
      setDownloading(false);
    }
  };

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        <span style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: '500' }}>Compiling business reports...</span>
      </div>
    );
  }

  // Fallback defaults
  const detailedAnswers = data?.detailed_answers || {};
  const productionSummary = data?.production_summary || {};
  const attendanceAnalytics = data?.attendance_analytics || {};
  const machineAnalytics = data?.machine_analytics || [];
  const revenueAnalytics = data?.revenue_analytics || {};
  const customerAnalytics = data?.customer_analytics || [];
  const poAnalytics = data?.po_analytics || {};
  const inventoryAnalytics = data?.inventory_analytics || {};
  const expenseAnalytics = data?.expense_analytics || {};
  const expenseBreakdown = expenseAnalytics.breakdown || {};

  return (
    <div style={{ position: 'relative', overflowX: 'hidden' }}>
      {/* Hidden PDF Template for Export */}
      <ExecutiveReportTemplate
        data={data}
        timeframe={timeframe}
        customStart={customStart}
        customEnd={customEnd}
      />

      <div id="report-content" className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px', backgroundColor: '#ffffff' }}>

        {/* 1. Header and Filters Control */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={22} style={{ color: 'var(--color-primary)' }} />
              Business Reports & Analytics
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Real-time shop floor performance indicators, operational metrics, and financial intelligence.
            </p>
          </div>

          {/* Filters Select */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: '160px' }}>
              <CustomSelect
                value={timeframe}
                onChange={(val) => setTimeframe(val)}
                options={[
                  { value: 'today', label: 'Today' },
                  { value: 'this_week', label: 'This Week' },
                  { value: 'this_month', label: 'This Month' },
                  { value: 'custom', label: 'Custom Range' }
                ]}
                style={{ height: '36px' }}
              />
            </div>

            {timeframe === 'custom' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="date"
                  className="form-input"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  style={{ width: '130px', height: '36px', fontSize: '12px', padding: '0 8px' }}
                />
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>to</span>
                <input
                  type="date"
                  className="form-input"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  style={{ width: '130px', height: '36px', fontSize: '12px', padding: '0 8px' }}
                />
              </div>
            )}

            <button
              onClick={downloadPDF}
              disabled={downloading || !data}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '36px', padding: '0 16px' }}
            >
              {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {downloading ? 'Generating PDF...' : 'Download PDF'}
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* 2. OPERATIONAL SUMMARY (Individual Core Questions) */}
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px', color: 'var(--color-text-main)' }}>
            Key Operational Questions
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>

            <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid var(--color-primary)' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Work Completed This Period</span>
              <strong style={{ fontSize: '20px', color: 'var(--color-primary)' }}>{detailedAnswers.completed_jobs_this_month || 0} Job Cards</strong>
              <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>Finished and QC signed-off</span>
            </div>

            <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid #10b981' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Top Business Contributor</span>
              <strong style={{ fontSize: '18px', color: '#10b981', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {detailedAnswers.top_customer?.name || 'None'}
              </strong>
              <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>
                Total PO value: ₹{parseFloat(detailedAnswers.top_customer?.revenue || 0).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid #8b5cf6' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Most Utilized Machine</span>
              <strong style={{ fontSize: '16px', color: '#8b5cf6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {detailedAnswers.most_utilized_machine || 'N/A'}
              </strong>
              <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>Ranked by completed jobs count</span>
            </div>

            <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid #f59e0b' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Top Performing Operator</span>
              <strong style={{ fontSize: '18px', color: '#f59e0b' }}>{detailedAnswers.top_worker || 'N/A'}</strong>
              <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>Finished the highest volume of cards</span>
            </div>

            <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid #ec4899' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Material Consumed</span>
              <strong style={{ fontSize: '20px', color: '#ec4899' }}>
                {parseFloat(detailedAnswers.material_consumed || 0).toLocaleString('en-IN')} Units
              </strong>
              <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>Processed through completed job cards</span>
            </div>

            <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid #06b6d4' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Revenue Generated</span>
              <strong style={{ fontSize: '20px', color: '#06b6d4' }}>
                ₹{parseFloat(detailedAnswers.revenue_generated || 0).toLocaleString('en-IN')}
              </strong>
              <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>From commercial invoices billed</span>
            </div>

            <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid #ef4444' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Delayed Job Cards</span>
              <strong style={{ fontSize: '20px', color: '#ef4444' }}>
                {detailedAnswers.delayed_jobs?.length || 0} Delayed
              </strong>
              <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>Overdue relative to PO delivery date</span>
            </div>

            <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid #64748b' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Pending Payroll Amount</span>
              <strong style={{ fontSize: '20px', color: '#64748b' }}>
                ₹{parseFloat(detailedAnswers.pending_payroll || 0).toLocaleString('en-IN')}
              </strong>
              <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>Awaiting salary dispatch updates</span>
            </div>

          </div>
        </div>

        {/* 3. ROW 1: PRODUCTION SUMMARY & ATTENDANCE ANALYTICS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', flexWrap: 'wrap' }}>

          {/* Production Summary Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>
              Production summary
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={{ textAlign: 'center', padding: '12px', backgroundColor: 'var(--color-bg-base)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Total Jobs</span>
                <strong style={{ fontSize: '22px' }}>{productionSummary.total_jobs || 0}</strong>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#ecfdf5', color: '#047857', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '11px', color: '#047857', display: 'block', marginBottom: '4px' }}>Completed</span>
                <strong style={{ fontSize: '22px' }}>{productionSummary.completed_jobs || 0}</strong>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#eff6ff', color: '#1d4ed8', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '11px', color: '#1d4ed8', display: 'block', marginBottom: '4px' }}>In Progress</span>
                <strong style={{ fontSize: '22px' }}>{productionSummary.in_progress_jobs || 0}</strong>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '11px', color: '#b91c1c', display: 'block', marginBottom: '4px' }}>Delayed</span>
                <strong style={{ fontSize: '22px' }}>{productionSummary.delayed_jobs || 0}</strong>
              </div>
            </div>

            {/* List of Delayed Job Cards if any */}
            {detailedAnswers.delayed_jobs && detailedAnswers.delayed_jobs.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#ef4444', display: 'block', marginBottom: '8px' }}>
                  ⚠️ DETAYED JOB DETAILS
                </span>
                <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #fca5a5', borderRadius: 'var(--radius-sm)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#fee2e2', color: '#991b1b', borderBottom: '1px solid #fca5a5' }}>
                        <th style={{ padding: '6px 12px' }}>Job Code</th>
                        <th style={{ padding: '6px 12px' }}>Client</th>
                        <th style={{ padding: '6px 12px' }}>Due Date</th>
                        <th style={{ padding: '6px 12px', textAlign: 'right' }}>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedAnswers.delayed_jobs.map((job) => (
                        <tr key={job.id} style={{ borderBottom: '1px solid #fee2e2' }}>
                          <td style={{ padding: '6px 12px', fontWeight: '600' }}>{job.job_card_number}</td>
                          <td style={{ padding: '6px 12px' }}>{job.customer_name}</td>
                          <td style={{ padding: '6px 12px', color: '#b91c1c' }}>{new Date(job.delivery_date).toLocaleDateString()}</td>
                          <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: '600' }}>{job.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Attendance Analytics Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>
              Attendance Analytics
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '12px' }}>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Total Staff:</span>
                <strong style={{ float: 'right' }}>{attendanceAnalytics.total_staff || 0}</strong>
              </div>
              <div>
                <span style={{ color: '#10b981' }}>Present Today:</span>
                <strong style={{ float: 'right', color: '#10b981' }}>{attendanceAnalytics.present_today || 0}</strong>
              </div>
              <div>
                <span style={{ color: '#ef4444' }}>Absent Today:</span>
                <strong style={{ float: 'right', color: '#ef4444' }}>{attendanceAnalytics.absent_today || 0}</strong>
              </div>
              <div>
                <span style={{ color: '#f59e0b' }}>Late Entries Today:</span>
                <strong style={{ float: 'right', color: '#f59e0b' }}>{attendanceAnalytics.late_entries || 0}</strong>
              </div>
              <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--color-border)', paddingTop: '8px', marginTop: '4px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Overtime Hours in Range:</span>
                <strong style={{ float: 'right', color: 'var(--color-primary)', fontSize: '13px' }}>
                  {attendanceAnalytics.overtime_hours || 0} hrs
                </strong>
              </div>
            </div>

            {/* Ranks list */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px', fontSize: '11px' }}>
              <div>
                <span style={{ color: '#10b981', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Top Attendance %</span>
                {attendanceAnalytics.top_attendance?.map((u, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span>{u.name.split(' ')[0]}</span>
                    <strong>{u.rate}%</strong>
                  </div>
                ))}
              </div>
              <div>
                <span style={{ color: '#ef4444', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Lowest Attendance %</span>
                {attendanceAnalytics.lowest_attendance?.map((u, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span>{u.name.split(' ')[0]}</span>
                    <strong>{u.rate}%</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* 4. ROW 2: MACHINE ANALYTICS & REVENUE ANALYTICS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '20px', flexWrap: 'wrap' }}>

          {/* Machine Analytics */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>
              Machine Analytics
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                    <th style={{ padding: '8px 12px' }}>Machine Name</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Running Hours</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Idle Hours</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Jobs Completed</th>
                    <th style={{ padding: '8px 12px' }}>Maintenance Due</th>
                  </tr>
                </thead>
                <tbody>
                  {machineAnalytics.map((mac, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: '600' }}>{mac.name}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', color: '#2563eb' }}>{mac.running_hours} hrs</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--color-text-light)' }}>{mac.idle_hours} hrs</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600' }}>{mac.jobs_completed}</td>
                      <td style={{ padding: '8px 12px', fontSize: '11px', color: mac.maintenance_due !== 'N/A' && new Date(mac.maintenance_due) < new Date() ? 'var(--color-danger)' : 'inherit' }}>
                        {mac.maintenance_due !== 'N/A' ? new Date(mac.maintenance_due).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Revenue Analytics & CSS Charts */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>
              Revenue Analytics
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ padding: '10px', backgroundColor: 'var(--color-bg-base)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>Invoices</span>
                <strong style={{ fontSize: '15px' }}>{revenueAnalytics.invoices_generated || 0} Generated</strong>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#ecfdf4', color: '#047857', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <span style={{ fontSize: '10px', color: '#047857', display: 'block', marginBottom: '2px' }}>Payments Recd</span>
                <strong style={{ fontSize: '14px' }}>₹{Math.round(revenueAnalytics.payments_received || 0).toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#fffbeb', color: '#b45309', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <span style={{ fontSize: '10px', color: '#b45309', display: 'block', marginBottom: '2px' }}>Pending</span>
                <strong style={{ fontSize: '14px' }}>₹{Math.round(revenueAnalytics.pending_payments || 0).toLocaleString('en-IN')}</strong>
              </div>
            </div>

            {/* Monthly Revenue Custom CSS Chart */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)' }}>MONTHLY REVENUE TREND</span>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '100px', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                {Object.keys(revenueAnalytics.monthly_revenue || {}).map((month) => {
                  const amount = revenueAnalytics.monthly_revenue[month];
                  // Find maximum monthly total to calculate relative height percentage
                  const maxTotal = Math.max(...Object.values(revenueAnalytics.monthly_revenue));
                  const heightPercentage = maxTotal > 0 ? (amount / maxTotal) * 100 : 0;

                  return (
                    <div key={month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40px', gap: '6px' }}>
                      <span style={{ fontSize: '9px', fontWeight: '700', color: 'var(--color-primary)' }}>₹{(amount / 1000).toFixed(0)}k</span>
                      <div style={{
                        width: '20px',
                        height: `${Math.max(4, heightPercentage * 0.7)}px`,
                        background: 'linear-gradient(to top, var(--color-primary-light), var(--color-primary))',
                        borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                        transition: 'height 0.3s ease'
                      }} />
                      <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* 5. ROW 3: CUSTOMER ANALYTICS & PURCHASE ORDER ANALYTICS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', flexWrap: 'wrap' }}>

          {/* Customer Analytics */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>
              Customer Analytics
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                    <th style={{ padding: '8px 12px' }}>Customer Name</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Revenue By Customer</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total PO Count</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Jobs</th>
                  </tr>
                </thead>
                <tbody>
                  {customerAnalytics.map((cust, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: '600' }}>{cust.customer_name}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--color-primary)' }}>
                        ₹{parseFloat(cust.revenue || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{cust.po_count} POs</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600' }}>{cust.jobs_completed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Purchase Order Analytics */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>
              Purchase Order Analytics
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dotted var(--color-border)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>PO Received:</span>
                <strong style={{ color: 'var(--color-text-main)' }}>{poAnalytics.po_received || 0} POs</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dotted var(--color-border)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>PO Converted To Jobs:</span>
                <strong style={{ color: 'var(--color-primary)' }}>{poAnalytics.po_converted_to_jobs || 0} POs</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dotted var(--color-border)' }}>
                <span style={{ color: '#10b981' }}>PO Completed:</span>
                <strong style={{ color: '#10b981' }}>{poAnalytics.po_completed || 0} POs</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ color: '#f59e0b' }}>PO Pending:</span>
                <strong style={{ color: '#f59e0b' }}>{poAnalytics.po_pending || 0} POs</strong>
              </div>
            </div>
          </div>

        </div>

        {/* 6. ROW 4: INVENTORY ANALYTICS & EXPENSE ANALYTICS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flexWrap: 'wrap' }}>

          {/* Inventory Analytics */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>
              Inventory Analytics
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
              <div style={{ padding: '12px', backgroundColor: 'var(--color-bg-base)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Stock Consumed</span>
                <strong style={{ fontSize: '18px' }}>{inventoryAnalytics.stock_consumed || 0} units</strong>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '11px', color: '#b91c1c', display: 'block', marginBottom: '4px' }}>Low Stock Items</span>
                <strong style={{ fontSize: '18px' }}>{inventoryAnalytics.low_stock_items || 0} SKUs</strong>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'var(--color-bg-base)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Material Cost</span>
                <strong style={{ fontSize: '16px', color: 'var(--color-primary)' }}>₹{Math.round(inventoryAnalytics.material_cost || 0).toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'var(--color-bg-base)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Purchase Cost</span>
                <strong style={{ fontSize: '16px', color: 'var(--color-primary)' }}>₹{Math.round(inventoryAnalytics.purchase_cost || 0).toLocaleString('en-IN')}</strong>
              </div>
            </div>
          </div>

          {/* Expense Analytics */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>
              Expense Analytics
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Electricity:</span>
                  <strong>₹{parseFloat(expenseBreakdown.electricity || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Machine Maintenance:</span>
                  <strong>₹{parseFloat(expenseBreakdown.machine_maintenance || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Consumables:</span>
                  <strong>₹{parseFloat(expenseBreakdown.consumables || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Salary:</span>
                  <strong>₹{parseFloat(expenseBreakdown.salary || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Other Expenses:</span>
                  <strong>₹{parseFloat(expenseBreakdown.other || 0).toLocaleString('en-IN')}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--color-bg-base)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Total Expenses</span>
                <strong style={{ fontSize: '20px', color: 'var(--color-danger)' }}>
                  ₹{parseFloat(expenseAnalytics.total_expenses || 0).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
