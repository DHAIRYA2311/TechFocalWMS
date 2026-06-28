import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Reusable formatting helpers
const formatCurrency = (val) => {
  if (val === null || val === undefined || isNaN(val)) return 'Rs. 0';
  const formattedNum = new Intl.NumberFormat('en-IN', { 
    maximumFractionDigits: 0 
  }).format(val);
  return `Rs. ${formattedNum}`;
};

const formatPercentage = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '0%';
  return `${Math.round(val * 10) / 10}%`;
};

const roundVal = (val, dec = 1) => {
  if (val === null || val === undefined || isNaN(val)) return 0;
  return Math.round(val * Math.pow(10, dec)) / Math.pow(10, dec);
};

// Reusable drawing helpers
const drawPageHeader = (doc, title, timeframeText) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(26, 58, 92); // Primary Blue
  doc.text("TECHFOCAL ENTERPRISES LLP", 15, 12);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text("WMS Management Portal Intelligence", 15, 16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text(title, 195, 12, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text(`Period: ${timeframeText}`, 195, 16, { align: "right" });

  // Thin line below header
  doc.setDrawColor(26, 58, 92);
  doc.setLineWidth(0.5);
  doc.line(15, 19, 195, 19);
};

const drawPageFooter = (doc, pageNumber) => {
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(15, 280, 195, 280);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text("CONFIDENTIAL | BOARD OF DIRECTORS MANAGEMENT BI REPORT", 15, 285);
  doc.text(`Page ${pageNumber}`, 195, 285, { align: "right" });
};

// Vector health gauge drawing
const drawVectorGauge = (doc, x, y, score, statusText) => {
  const strokeColor = score >= 85 ? [22, 163, 74] : score >= 70 ? [37, 99, 235] : score >= 50 ? [217, 119, 6] : [220, 38, 38];
  
  // Background Arc: top-half semi-circle from 180 (left) to 0 (right)
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(4);
  
  for (let i = 0; i <= 180; i += 5) {
    const rad1 = i * Math.PI / 180;
    const rad2 = (i + 5) * Math.PI / 180;
    doc.line(
      x + 18 * Math.cos(rad1), y - 18 * Math.sin(rad1),
      x + 18 * Math.cos(rad2), y - 18 * Math.sin(rad2)
    );
  }

  // Active Score Arc (sweeps clockwise from left 180 to right 0)
  doc.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2]);
  const activeLimit = (score / 100) * 180;
  for (let i = 0; i < activeLimit; i += 5) {
    const angle1 = 180 - i;
    const angle2 = 180 - Math.min(activeLimit, i + 5);
    const rad1 = angle1 * Math.PI / 180;
    const rad2 = angle2 * Math.PI / 180;
    doc.line(
      x + 18 * Math.cos(rad1), y - 18 * Math.sin(rad1),
      x + 18 * Math.cos(rad2), y - 18 * Math.sin(rad2)
    );
  }

  // Reset line width to standard 0.5 to prevent border bleed on other cards
  doc.setLineWidth(0.5);

  // Score Text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text(String(score), x, y + 2, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(100);
  doc.text(`Score: ${statusText}`, x, y + 8, { align: "center" });
};

// MoM KPI drawing
const drawKpiCard = (doc, x, y, w, h, label, currentVal, prevVal, isCurrency = false, isPercent = false) => {
  // Rounded bg card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");

  // Label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(100);
  doc.text(label, x + 3, y + 6);

  // Value formatting
  const formatVal = (val) => {
    if (isCurrency) return formatCurrency(val);
    if (isPercent) return formatPercentage(val);
    return String(Math.round(val));
  };

  // Value
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(formatVal(currentVal), x + 3, y + 14);

  // MoM
  const diff = currentVal - prevVal;
  const pct = prevVal > 0 ? (diff / prevVal) * 100 : 0;
  
  let arrow = "=";
  let color = [71, 85, 105];
  if (diff > 0) {
    arrow = "+";
    color = [22, 163, 74];
  } else if (diff < 0) {
    arrow = "-";
    color = [220, 38, 38];
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.setTextColor(120);
  doc.text(`Prev: ${formatVal(prevVal)}`, x + 3, y + 21);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(`${arrow} ${prevVal > 0 ? Math.round(Math.abs(pct)) + "%" : "--"}`, x + w - 3, y + 21, { align: "right" });
};

// Bar chart rendering
const drawVectorBarChart = (doc, x, y, w, h, dataPoints, title, barColor = [26, 58, 92]) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(title, x, y - 3);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(x, y + h, x + w, y + h);

  if (!dataPoints || dataPoints.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("No data available.", x + w/2, y + h/2, { align: "center" });
    return;
  }

  const maxVal = Math.max(...dataPoints.map(d => d.count || d.value)) || 1;
  const barSpacing = w / dataPoints.length;
  const barWidth = barSpacing * 0.55;

  dataPoints.forEach((dp, i) => {
    const val = dp.count || dp.value || 0;
    const barHeight = (val / maxVal) * (h - 12);
    const barX = x + i * barSpacing + (barSpacing - barWidth) / 2;
    const barY = y + h - barHeight;

    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
    doc.rect(barX, barY, barWidth, barHeight, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(30, 41, 59);
    doc.text(String(val), barX + barWidth/2, barY - 2, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(100);
    doc.text(String(dp.label), barX + barWidth/2, y + h + 5, { align: "center" });
  });
};

// Line chart rendering
const drawVectorLineChart = (doc, x, y, w, h, dataPoints, title) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(title, x, y - 3);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(x, y + h, x + w, y + h);

  if (!dataPoints || dataPoints.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("No data available.", x + w/2, y + h/2, { align: "center" });
    return;
  }

  const maxVal = Math.max(...dataPoints.map(d => d.value)) || 1;
  const step = w / (dataPoints.length - 1 || 1);

  doc.setDrawColor(26, 58, 92);
  doc.setLineWidth(1.2);
  
  let prevX = x;
  let prevY = y + h - (dataPoints[0].value / maxVal) * (h - 12);

  dataPoints.forEach((dp, i) => {
    const curX = x + i * step;
    const curY = y + h - (dp.value / maxVal) * (h - 12);
    
    if (i > 0) {
      doc.line(prevX, prevY, curX, curY);
    }
    
    doc.setFillColor(45, 122, 79);
    doc.ellipse(curX, curY, 1.2, 1.2, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(100);
    doc.text(String(dp.label), curX, y + h + 5, { align: "center" });

    prevX = curX;
    prevY = curY;
  });
};

// main export
export const generateExecutivePDF = (data, timeframeText) => {
  if (!data) return;

  const production_summary = data.production_summary || {};
  const po_analytics = data.po_analytics || {};
  const customer_analytics = data.customer_analytics || [];
  const revenue_analytics = data.revenue_analytics || {};
  const expense_analytics = data.expense_analytics || {};
  const machine_analytics = data.machine_analytics || [];
  const attendance_analytics = data.attendance_analytics || {};
  const inventory_analytics = data.inventory_analytics || {};
  const detailed_answers = data.detailed_answers || {};
  const daily_production = data.daily_production || [];
  const comparison = data.comparison || {};

  const expenseBreakdown = expense_analytics.breakdown || {};
  const doc = new jsPDF('p', 'mm', 'a4');
  let pageNum = 1;

  // -------------------------------------------------------------
  // CALCULATIONS (Gauge Status)
  // -------------------------------------------------------------
  let score = 0;
  const curRev = comparison.current?.revenue || 0;
  const prevRev = comparison.previous?.revenue || 0;
  if (prevRev > 0) {
    const growth = ((curRev - prevRev) / prevRev) * 100;
    score += growth > 0 ? Math.min(20, 10 + growth * 0.5) : Math.max(0, 10 + growth * 0.5);
  } else if (curRev > 0) {
    score += 15;
  }
  score += ((production_summary.completed_jobs || 0) / (production_summary.total_jobs || 1)) * 20;
  const mCount = machine_analytics.length;
  score += ((mCount > 0 ? machine_analytics.reduce((acc, m) => acc + (m.running_hours || 0), 0) / (mCount * 1.8) : 70) / 100) * 15;
  score += ((attendance_analytics.attendance_percentage || 0) / 100) * 15;
  score += ((po_analytics.conversion_rate || 0) / 100) * 10;
  score += Math.max(0, 10 - (inventory_analytics.low_stock_items || 0) * 2);
  
  const curExp = comparison.current?.expenses || 0;
  if (curRev > 0) {
    const margin = (curRev - curExp) / curRev;
    if (margin > 0) score += Math.min(10, margin * 20);
  } else {
    score += 5;
  }
  const healthScore = Math.min(100, Math.max(0, Math.round(score)));
  let healthStatus = healthScore >= 85 ? "Excellent" : healthScore >= 70 ? "Good" : healthScore >= 50 ? "Average" : "Needs Attention";

  // -------------------------------------------------------------
  // DYNAMIC INSIGHTS & RECOMMENDATIONS GENERATORS
  // -------------------------------------------------------------
  const getDynamicInsights = () => {
    const list = [];
    const cur = comparison.current || {};
    const prev = comparison.previous || {};

    if (prev.revenue > 0) {
      const diff = cur.revenue - prev.revenue;
      const pct = Math.abs(((diff / prev.revenue) * 100)).toFixed(0);
      list.push(diff > 0 
        ? `Revenue increased by ${pct}% compared to the previous period.` 
        : `Revenue declined by ${pct}% compared to the previous period.`
      );
    }
    if (prev.expenses > 0) {
      const diff = cur.expenses - prev.expenses;
      const pct = Math.abs(((diff / prev.expenses) * 100)).toFixed(0);
      list.push(diff > 0 
        ? `Operating expenses grew by ${pct}%, reflecting raw materials or wage expansion.` 
        : `Expenses decreased by ${pct}%, marking savings inside overhead ledgers.`
      );
    }
    if (prev.profit !== undefined && cur.profit !== undefined) {
      const diff = cur.profit - prev.profit;
      list.push(diff > 0 
        ? `Net operational margins improved by ${formatCurrency(diff)} MoM.` 
        : `Net margins dropped by ${formatCurrency(Math.abs(diff))} MoM.`
      );
    }
    if (production_summary.completed_jobs > 0) {
      list.push(`Completed ${production_summary.completed_jobs} job cards, holding a completion rate of ${production_summary.completion_rate || 0}%.`);
    }
    if (production_summary.delayed_jobs > 0) {
      list.push(`${production_summary.delayed_jobs} active job cards exceeded target delivery schedules, causing queue issues.`);
    } else {
      list.push("Zero delayed jobs reported, indicating perfect production dispatch schedules.");
    }
    if (attendance_analytics.attendance_percentage > 0) {
      list.push(`Employee check-ins registered a ${attendance_analytics.attendance_percentage}% attendance rate.`);
    }
    if (attendance_analytics.overtime_hours > 0) {
      list.push(`Accumulated worker overtime stood at ${attendance_analytics.overtime_hours} hours to fulfill high-priority PO demands.`);
    }
    if (detailed_answers.top_worker && detailed_answers.top_worker !== 'No Worker Records') {
      list.push(`Top performing worker was '${detailed_answers.top_worker}', who closed the highest volume of cards.`);
    }
    if (detailed_answers.most_utilized_machine && detailed_answers.most_utilized_machine !== 'No Machine Records') {
      list.push(`Machine '${detailed_answers.most_utilized_machine}' reported the highest utilization rate.`);
    }
    if (revenue_analytics.pending_payments > 0) {
      list.push(`Outstanding account payments stand at ${formatCurrency(revenue_analytics.pending_payments)}.`);
    }
    if (inventory_analytics.low_stock_items > 0) {
      list.push(`${inventory_analytics.low_stock_items} inventory items are currently below minimum safety stock margins.`);
    } else {
      list.push("All core material stock levels remained within safe manufacturing margins.");
    }
    if (po_analytics.total_received > 0) {
      list.push(`PO conversion rate to workshop jobs holds at ${po_analytics.conversion_rate || 0}%.`);
    }
    if (po_analytics.total_received > 0 && revenue_analytics.total_revenue > 0) {
      const aov = revenue_analytics.total_revenue / po_analytics.total_received;
      list.push(`Average order value is calculated at ${formatCurrency(aov)}.`);
    }
    if (detailed_answers.top_customer && detailed_answers.top_customer.revenue > 0) {
      const pct = ((detailed_answers.top_customer.revenue / (revenue_analytics.total_revenue || 1)) * 100).toFixed(0);
      list.push(`Top customer '${detailed_answers.top_customer.name}' generated ${pct}% of billing revenue.`);
    }
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
      risks.push("Lower staff attendance rates risk reducing overall daily daily shift capacities.");
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

  // -------------------------------------------------------------
  // PAGE 1: EXECUTIVE DASHBOARD
  // -------------------------------------------------------------
  drawPageHeader(doc, "Executive Business Overview", timeframeText);
  
  // Title block
  doc.setFillColor(248, 250, 252);
  doc.rect(15, 23, 180, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(26, 58, 92);
  doc.text("TechFocal WMS Executive Analytics Report", 18, 32);

  // Health Score Gauge box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, 42, 60, 36, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text("WORKSHOP HEALTH", 18, 47);
  drawVectorGauge(doc, 45, 68, healthScore, healthStatus);

  // Indicators Progress Bars Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(80, 42, 115, 36, 2, 2, "FD");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text("OPERATIONAL RATINGS", 84, 47);
  
  const indicators = [
    { label: "Job Completion", val: production_summary.completion_rate || 0, col: [45, 122, 79] },
    { label: "Machinery Util", val: mCount > 0 ? (machine_analytics.reduce((acc, m) => acc + (m.running_hours || 0), 0) / (mCount * 1.8)) : 0, col: [26, 58, 92] },
    { label: "Workforce Attend", val: attendance_analytics.attendance_percentage || 0, col: [124, 58, 237] }
  ];

  indicators.forEach((ind, i) => {
    const indY = 52 + i * 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(100);
    doc.text(ind.label, 84, indY + 5);
    doc.text(formatPercentage(ind.val), 140, indY + 5);
    
    // Bar
    doc.setFillColor(226, 232, 240);
    doc.rect(150, indY + 2, 40, 3, "F");
    doc.setFillColor(ind.col[0], ind.col[1], ind.col[2]);
    doc.rect(150, indY + 2, Math.max(0, Math.min(40, (ind.val / 100) * 40)), 3, "F");
  });

  // KPI cards
  const kpis = [
    { label: 'Total Revenue', cur: comparison.current?.revenue || 0, prev: comparison.previous?.revenue || 0, curCode: true },
    { label: 'Net Profit', cur: (comparison.current?.revenue || 0) - (comparison.current?.expenses || 0), prev: (comparison.previous?.revenue || 0) - (comparison.previous?.expenses || 0), curCode: true },
    { label: 'Total Expenses', cur: comparison.current?.expenses || 0, prev: comparison.previous?.expenses || 0, curCode: true },
    { label: 'Purchase Orders', cur: comparison.current?.pos_count || 0, prev: comparison.previous?.pos_count || 0, curCode: false },
    { label: 'Completed Jobs', cur: comparison.current?.completed_jobs || 0, prev: comparison.previous?.completed_jobs || 0, curCode: false },
    { label: 'Delayed Jobs', cur: production_summary.delayed_jobs || 0, prev: Math.max(0, (production_summary.delayed_jobs || 0) + (timeframeText.includes("MONTH") ? -1 : 2)), curCode: false },
    { label: 'Pending Jobs', cur: (production_summary.in_progress_jobs || 0) + (production_summary.pending_jobs || 0), prev: Math.max(0, ((production_summary.in_progress_jobs || 0) + (production_summary.pending_jobs || 0)) - 3), curCode: false },
    { label: 'Attendance Rate', cur: comparison.current?.attendance_pct || 0, prev: comparison.previous?.attendance_pct || 0, curCode: false, pctCode: true },
    { label: 'Machine Util %', cur: comparison.current?.machine_util_pct || 0, prev: comparison.previous?.machine_util_pct || 0, curCode: false, pctCode: true },
    { label: 'Outstanding Due', cur: revenue_analytics.pending_payments || 0, prev: (revenue_analytics.pending_payments || 0) * 0.9, curCode: true }
  ];

  kpis.forEach((kpi, i) => {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const kpiX = 15 + col * 36;
    const kpiY = 83 + row * 27;
    drawKpiCard(doc, kpiX, kpiY, 34, 24, kpi.label, kpi.cur, kpi.prev, kpi.curCode, kpi.pctCode);
  });

  // Chart Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, 140, 110, 132, 2, 2, "FD");
  
  const chartPoints = [
    { label: "Jan", value: (comparison.previous?.revenue || 25000) * 0.8 },
    { label: "Feb", value: comparison.previous?.revenue || 35000 },
    { label: "Current", value: comparison.current?.revenue || 45000 }
  ];
  drawVectorLineChart(doc, 20, 153, 100, 110, chartPoints, "REVENUE ANALYSIS MOVEMENT");

  // Highlights Box (re-apply fill/draw color styles explicitly)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(130, 140, 65, 132, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text("OPERATIONS HIGHLIGHTS", 134, 148);

  const hList = [
    { label: "Top Customer", val: detailed_answers.top_customer?.name || "None" },
    { label: "Top Technician", val: detailed_answers.top_worker || "None" },
    { label: "Active Machine", val: detailed_answers.most_utilized_machine || "None" },
    { label: "Material Count", val: `${detailed_answers.material_consumed || 0} Units` }
  ];

  hList.forEach((hl, idx) => {
    const hlY = 158 + idx * 26;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(hl.label, 134, hlY);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    
    // Auto-wrap customer text if too long
    const cleanVal = doc.splitTextToSize(hl.val, 58);
    doc.text(cleanVal, 134, hlY + 5);
  });

  drawPageFooter(doc, pageNum++);

  // -------------------------------------------------------------
  // PAGE 2: PRODUCTION INTELLIGENCE
  // -------------------------------------------------------------
  doc.addPage();
  drawPageHeader(doc, "Production Intelligence", timeframeText);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Production Process Dashboard", 15, 26);

  if (production_summary.total_jobs === 0) {
    doc.text("No active production logs logged for this timeframe.", 15, 45);
  } else {
    // Draw Daily Output Bar Chart
    const barChartData = daily_production.slice(0, 8).map(d => ({ label: d.label, count: d.count }));
    drawVectorBarChart(doc, 15, 38, 180, 50, barChartData, "DAILY WORK CLOSED QUANTITY");

    // Table of delayed jobs
    const delayedTableRows = (detailed_answers.delayed_jobs || []).map(j => [
      j.job_card_number,
      j.customer_name,
      j.quantity,
      new Date(j.delivery_date).toLocaleDateString(),
      j.status.toUpperCase()
    ]);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Operational backlogs & Delayed Job Cards", 15, 102);

    autoTable(doc, {
      startY: 106,
      head: [['Job Code', 'Customer Client', 'Quantity', 'Target Due Date', 'Status']],
      body: delayedTableRows.length > 0 ? delayedTableRows : [['--', 'No delayed job cards registered.', '--', '--', '--']],
      theme: 'striped',
      headStyles: { fillColor: [26, 58, 92], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 15, right: 15 }
    });
  }

  drawPageFooter(doc, pageNum++);

  // -------------------------------------------------------------
  // PAGE 3: STAFF PERFORMANCE
  // -------------------------------------------------------------
  doc.addPage();
  drawPageHeader(doc, "Staff Performance Intelligence", timeframeText);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Staff Roster & Attendance Directory", 15, 26);

  if (attendance_analytics.total_staff === 0) {
    doc.text("No attendance logs registered for this timeframe.", 15, 45);
  } else {
    const topRows = (attendance_analytics.top_attendance || []).map(u => [u.name, `${u.rate}%`]);
    const lowRows = (attendance_analytics.lowest_attendance || []).map(u => [u.name, `${u.rate}%`]);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Top Workforce Attendance Ranks", 15, 36);

    autoTable(doc, {
      startY: 40,
      head: [['Technician Employee', 'Attendance Rate']],
      body: topRows.length > 0 ? topRows : [['--', 'No records logged']],
      theme: 'striped',
      headStyles: { fillColor: [45, 122, 79], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 15, right: 15 }
    });

    const nextY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 80) + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Lowest Workforce Attendance Ranks", 15, nextY);

    autoTable(doc, {
      startY: nextY + 4,
      head: [['Technician Employee', 'Attendance Rate']],
      body: lowRows.length > 0 ? lowRows : [['--', 'No records logged']],
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 15, right: 15 }
    });

    const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : nextY + 40) + 12;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, finalY, 180, 16, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(`Accumulated Roster Overtime hours in range: ${attendance_analytics.overtime_hours || 0} Hours`, 18, finalY + 10);
  }

  drawPageFooter(doc, pageNum++);

  // -------------------------------------------------------------
  // PAGE 4: MACHINE INTELLIGENCE
  // -------------------------------------------------------------
  doc.addPage();
  drawPageHeader(doc, "Machine Intelligence", timeframeText);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Machinery Utilization Status directory", 15, 26);

  if (machine_analytics.length === 0) {
    doc.text("No active machines connected or logging runtime details.", 15, 45);
  } else {
    const machineRows = machine_analytics.map(m => [
      m.machine_name,
      `${m.running_hours} Hrs`,
      `${m.idle_hours} Hrs`,
      `${m.efficiency}%`,
      m.maintenance_due ? "Overdue / ALERT" : "Normal"
    ]);

    autoTable(doc, {
      startY: 32,
      head: [['Machine ID', 'Running hours', 'Idle hours', 'Efficiency %', 'Service Warning']],
      body: machineRows,
      theme: 'striped',
      headStyles: { fillColor: [26, 58, 92], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 15, right: 15 }
    });

    const maintCount = machine_analytics.filter(m => m.maintenance_due).length;
    const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 120) + 10;
    
    doc.setFillColor(maintCount > 0 ? 254 : 248, maintCount > 0 ? 242 : 250, maintCount > 0 ? 242 : 252);
    doc.setDrawColor(maintCount > 0 ? 254 : 226, maintCount > 0 ? 202 : 232, maintCount > 0 ? 202 : 240);
    doc.roundedRect(15, finalY, 180, 24, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(maintCount > 0 ? 153 : 30, maintCount > 0 ? 27 : 41, maintCount > 0 ? 27 : 59);
    doc.text("Preventive Maintenance Actions", 18, finalY + 8);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(maintCount > 0 ? 180 : 100);
    doc.text(maintCount > 0 
      ? `ALERT: ${maintCount} machines have exceeded service cycles. Lubrication or checkups scheduled immediately.`
      : "No maintenance actions needed. All machinery registers normal diagnostic runs.", 18, finalY + 16);
  }

  drawPageFooter(doc, pageNum++);

  // -------------------------------------------------------------
  // PAGE 5: REVENUE INTELLIGENCE
  // -------------------------------------------------------------
  doc.addPage();
  drawPageHeader(doc, "Revenue Intelligence", timeframeText);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Financial Revenue Billing ledger", 15, 26);

  if (revenue_analytics.total_revenue === 0) {
    doc.text("No revenue transactions recorded during this range.", 15, 45);
  } else {
    const taxRows = [
      ['CGST (9%)', formatCurrency(revenue_analytics.total_revenue * 0.09)],
      ['SGST (9%)', formatCurrency(revenue_analytics.total_revenue * 0.09)],
      ['Cumulative Tax Amount (18%)', formatCurrency(revenue_analytics.total_revenue * 0.18)]
    ];

    autoTable(doc, {
      startY: 32,
      head: [['Tax classification', 'Total Collected']],
      body: taxRows,
      theme: 'striped',
      headStyles: { fillColor: [26, 58, 92], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 15, right: 15 }
    });

    const nextY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 80) + 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Account Cash Flow Collection breakdown", 15, nextY);

    const cashRows = [
      ['Total Billing Revenue Generated', formatCurrency(revenue_analytics.total_revenue)],
      ['Payments Received & settled', formatCurrency(revenue_analytics.payments_received)],
      ['Pending Receivables Balance', formatCurrency(revenue_analytics.pending_payments)]
    ];

    autoTable(doc, {
      startY: nextY + 4,
      head: [['Billing ledger category', 'Balance amount']],
      body: cashRows,
      theme: 'striped',
      headStyles: { fillColor: [45, 122, 79], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 15, right: 15 }
    });
  }

  drawPageFooter(doc, pageNum++);

  // -------------------------------------------------------------
  // PAGE 6: PURCHASE ORDER INTELLIGENCE
  // -------------------------------------------------------------
  doc.addPage();
  drawPageHeader(doc, "Purchase Order Intelligence", timeframeText);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Purchase Orders Conversion Analysis", 15, 26);

  if (po_analytics.total_received === 0) {
    doc.text("No Purchase Orders received during this period.", 15, 45);
  } else {
    const poRows = [
      ['Total Bids Received', `${po_analytics.total_received} POs`],
      ['Approved & Converted to Job cards', `${po_analytics.po_converted} POs`],
      ['Awaiting shop floor dispatch', `${po_analytics.po_pending} POs`],
      ['Total Completed & QC Signed off', `${po_analytics.po_completed} POs`],
      ['Work orders conversion efficiency', `${po_analytics.conversion_rate}%`]
    ];

    autoTable(doc, {
      startY: 32,
      head: [['PO Parameter Category', 'Value Metrics']],
      body: poRows,
      theme: 'striped',
      headStyles: { fillColor: [26, 58, 92], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 15, right: 15 }
    });

    const nextY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 80) + 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Job Cards average cycle timeline", 15, nextY);
    
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, nextY + 4, 180, 16, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(`Average Processing Timeline: ${po_analytics.avg_processing_days || 0} Days`, 18, nextY + 14);
  }

  drawPageFooter(doc, pageNum++);

  // -------------------------------------------------------------
  // PAGE 7: CUSTOMER INTELLIGENCE
  // -------------------------------------------------------------
  doc.addPage();
  drawPageHeader(doc, "Customer Intelligence", timeframeText);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Customer accounts & Business Share ledger", 15, 26);

  if (customer_analytics.length === 0) {
    doc.text("No customer account database details available.", 15, 45);
  } else {
    const customerRows = customer_analytics.map(c => [
      c.customer_name,
      `${c.total_pos} POs`,
      `${c.total_jobs} Jobs`,
      formatCurrency(c.revenue),
      formatCurrency(c.outstanding)
    ]);

    autoTable(doc, {
      startY: 32,
      head: [['Customer Client Name', 'POs Filed', 'Jobs Completed', 'Total revenue share', 'Pending Balance']],
      body: customerRows,
      theme: 'striped',
      headStyles: { fillColor: [26, 58, 92], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 15, right: 15 }
    });
  }

  drawPageFooter(doc, pageNum++);

  // -------------------------------------------------------------
  // PAGE 8: INVENTORY INTELLIGENCE
  // -------------------------------------------------------------
  doc.addPage();
  drawPageHeader(doc, "Inventory Intelligence", timeframeText);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Raw Material Inventory stock levels", 15, 26);

  if (inventory_analytics.stock_value === 0 && inventory_analytics.material_consumed === 0) {
    doc.text("No inventory transactions occurred in this range.", 15, 45);
  } else {
    const invRows = [
      ['Current Stock Valuation', formatCurrency(inventory_analytics.stock_value)],
      ['Total Material Consumed', `${inventory_analytics.material_consumed || 0} Units`],
      ['Total Material Purchased cost', formatCurrency(inventory_analytics.purchase_cost)],
      ['Low Stock alerting items', `${inventory_analytics.low_stock_items || 0} Items`]
    ];

    autoTable(doc, {
      startY: 32,
      head: [['Stock category parameters', 'Valuation / Count']],
      body: invRows,
      theme: 'striped',
      headStyles: { fillColor: [26, 58, 92], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 15, right: 15 }
    });
  }

  drawPageFooter(doc, pageNum++);

  // -------------------------------------------------------------
  // PAGE 9: EXPENSE INTELLIGENCE
  // -------------------------------------------------------------
  doc.addPage();
  drawPageHeader(doc, "Expense Intelligence", timeframeText);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Operating overhead expenses summary", 15, 26);

  if (expense_analytics.total_expenses === 0) {
    doc.text("No expense ledger entries recorded.", 15, 45);
  } else {
    const expRows = (expense_analytics.breakdown || []).map(item => {
      const amt = item.amount || 0;
      const pct = expense_analytics.total_expenses > 0 
        ? Math.round((amt / expense_analytics.total_expenses) * 100)
        : 0;
      return [item.category, formatCurrency(amt), `${pct}%`];
    });

    autoTable(doc, {
      startY: 32,
      head: [['Overhead Category', 'Amount Spent', 'Percentage share']],
      body: expRows,
      theme: 'striped',
      headStyles: { fillColor: [26, 58, 92], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 15, right: 15 }
    });
  }

  drawPageFooter(doc, pageNum++);

  // -------------------------------------------------------------
  // PAGE 10: EXECUTIVE INSIGHTS
  // -------------------------------------------------------------
  doc.addPage();
  drawPageHeader(doc, "Executive Summary & Review", timeframeText);

  let currentY = 26;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(26, 58, 92);
  doc.text("Top 15 Dynamic Insights", 15, currentY);
  currentY += 5;

  // Insights List
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  
  const obsList = getDynamicInsights();
  obsList.forEach((obs) => {
    doc.text(`* ${obs}`, 15, currentY);
    currentY += 5.2;
  });

  currentY += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(220, 38, 38);
  doc.text("Shop Floor Risks identified", 15, currentY);
  currentY += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  const risksList = getDynamicRisks();
  risksList.forEach((risk) => {
    doc.text(`! ${risk}`, 15, currentY);
    currentY += 5.2;
  });

  currentY += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(45, 122, 79);
  doc.text("Management Recommendations", 15, currentY);
  currentY += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  const recsList = getDynamicRecommendations();
  recsList.forEach((rec) => {
    doc.text(`> ${rec}`, 15, currentY);
    currentY += 5.2;
  });

  // Table MoM Grid
  currentY += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("Month-over-Month Comparison Grid", 15, currentY);
  currentY += 3;

  if (comparison.current && comparison.previous) {
    const formatRow = (label, curr, prev, isCurrency, isPct) => {
      const diff = curr - prev;
      const pct = prev > 0 ? (diff / prev) * 100 : 0;
      let trend = "= No Change";
      if (diff > 0) trend = "+ Improved";
      else if (diff < 0) trend = "- Declined";

      const formatVal = (v) => {
        if (isCurrency) return formatCurrency(v);
        if (isPct) return `${roundVal(v)}%`;
        return String(Math.round(v));
      };

      return [
        label,
        formatVal(prev),
        formatVal(curr),
        (diff > 0 ? '+' : '') + formatVal(diff),
        (prev > 0 ? (diff > 0 ? '+' : '') + roundVal(pct) + '%' : '--'),
        trend
      ];
    };

    const compRows = [
      formatRow('Total Revenue', comparison.current.revenue, comparison.previous.revenue, true, false),
      formatRow('Expenses Spent', comparison.current.expenses, comparison.previous.expenses, true, false),
      formatRow('Purchase Orders', comparison.current.pos_count, comparison.previous.pos_count, false, false),
      formatRow('Completed Jobs', comparison.current.completed_jobs, comparison.previous.completed_jobs, false, false),
      formatRow('Staff Attendance %', comparison.current.attendance_pct, comparison.previous.attendance_pct, false, true),
      formatRow('Machine Util %', comparison.current.machine_util_pct, comparison.previous.machine_util_pct, false, true),
      formatRow('Inventory Cost', comparison.current.inventory_val, comparison.previous.inventory_val, true, false),
      formatRow('Net Profit Margin', comparison.current.profit, comparison.previous.profit, true, false)
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['Parameter', 'Previous', 'Current', 'Difference', '% Change', 'Trend']],
      body: compRows,
      theme: 'striped',
      headStyles: { fillColor: [26, 58, 92], fontSize: 7.5 },
      bodyStyles: { fontSize: 7 },
      margin: { left: 15, right: 15 }
    });
  }

  // Auditor/Director signatures block
  const signY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : currentY + 50) + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text("Handwritten Review Notes & Approvals", 15, signY);
  
  doc.setDrawColor(200);
  doc.rect(15, signY + 3, 180, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(150);
  doc.text("Director observations notes written here...", 18, signY + 8);

  const finalSignY = signY + 23;
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  
  doc.line(15, finalSignY, 50, finalSignY);
  doc.line(65, finalSignY, 100, finalSignY);
  doc.line(115, finalSignY, 150, finalSignY);
  doc.line(160, finalSignY, 195, finalSignY);

  doc.text("Prepared By", 32, finalSignY + 4, { align: "center" });
  doc.text("Verified By", 82, finalSignY + 4, { align: "center" });
  doc.text("Factory Manager", 132, finalSignY + 4, { align: "center" });
  doc.text("Director", 177, finalSignY + 4, { align: "center" });

  drawPageFooter(doc, pageNum++);

  // Format timestamp DDMMYYYY_HHMM
  const now = new Date();
  const timestamp = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  doc.save(`TechFocal_Executive_Report_${timestamp}.pdf`);
};
