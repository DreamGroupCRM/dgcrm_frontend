// ==========================================
// DREAM GROUP CRM - EXECUTIVE DASHBOARD EXPORT (PDF / Excel)
// ==========================================
// Both exports work purely off the already-fetched ExecutiveDashboardData —
// no extra network calls, no re-deriving numbers the backend already
// computed. jsPDF/jspdf-autotable render a print-friendly PDF report;
// ExcelJS builds a multi-sheet workbook, saved via file-saver.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { ExecutiveDashboardData } from '../../../services/executiveDashboardService';

const rupee = (n: number): string => `Rs. ${Math.round(n).toLocaleString('en-IN')}`;

interface RangeInfo { from: string; to: string }

export function exportDashboardToPdf(data: ExecutiveDashboardData, range: RangeInfo): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const marginX = 40;
  let y = 44;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('DGCRM — Executive Dashboard', marginX, y);
  y += 18;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Period: ${range.from} to ${range.to}`, marginX, y);
  y += 20;

  const { kpis } = data;
  autoTable(doc, {
    startY: y,
    head: [['KPI', 'Value']],
    body: [
      ['Total Customers', String(kpis.total_customers)],
      ['Total Properties', String(kpis.total_properties)],
      ['Available Properties', String(kpis.available_properties)],
      ['Booked / Sold Properties', String(kpis.booked_properties)],
      ['Total Booking / Sales Value', rupee(kpis.total_booking_value)],
      ['Pending Payments', rupee(kpis.pending_payments)],
      ['Active Employees', String(kpis.active_employees)],
      ['Pending / Overdue Activities', String(kpis.pending_or_overdue_activities)],
    ],
    theme: 'grid', headStyles: { fillColor: [37, 99, 235] }, styles: { fontSize: 9 },
    margin: { left: marginX, right: marginX },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 20;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Property Overview', marginX, y);
  y += 8;
  autoTable(doc, {
    startY: y, head: [['Status', 'Count']],
    body: data.property_overview.map((r) => [r.status, String(r.count)]),
    theme: 'grid', headStyles: { fillColor: [124, 58, 237] }, styles: { fontSize: 9 },
    margin: { left: marginX, right: marginX },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 20;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Overview', marginX, y);
  y += 8;
  autoTable(doc, {
    startY: y, head: [['Metric', 'Amount']],
    body: [
      ['Total Received', rupee(data.payment_overview.total_received)],
      ['Pending Approval', rupee(data.payment_overview.pending_approval)],
      ['Overdue', rupee(data.payment_overview.overdue)],
    ],
    theme: 'grid', headStyles: { fillColor: [220, 38, 38] }, styles: { fontSize: 9 },
    margin: { left: marginX, right: marginX },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 20;

  if (data.employee_performance.length > 0) {
    if (y > 650) { doc.addPage(); y = 44; }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Employee Performance', marginX, y);
    y += 8;
    autoTable(doc, {
      startY: y, head: [['Employee', 'Activities', 'Tasks Pending', 'Tasks Overdue', 'Customers Managed']],
      body: data.employee_performance.map((r) => [
        r.employee_name, String(r.activities_completed), String(r.tasks_pending), String(r.tasks_overdue), String(r.customers_managed),
      ]),
      theme: 'grid', headStyles: { fillColor: [22, 163, 74] }, styles: { fontSize: 9 },
      margin: { left: marginX, right: marginX },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  if (data.needs_attention.overdue_payments.length > 0) {
    if (y > 650) { doc.addPage(); y = 44; }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Needs Attention — Overdue Payments', marginX, y);
    y += 8;
    autoTable(doc, {
      startY: y, head: [['Customer', 'Amount Due']],
      body: data.needs_attention.overdue_payments.map((r) => [r.customer_name, rupee(r.amount_due)]),
      theme: 'grid', headStyles: { fillColor: [220, 38, 38] }, styles: { fontSize: 9 },
      margin: { left: marginX, right: marginX },
    });
  }

  doc.save(`dgcrm-executive-dashboard-${range.from}-to-${range.to}.pdf`);
}

export async function exportDashboardToExcel(data: ExecutiveDashboardData, range: RangeInfo): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DGCRM';
  wb.created = new Date();

  const headerFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF2563EB' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' } };

  const styleHeader = (ws: ExcelJS.Worksheet) => {
    ws.getRow(1).eachCell((cell) => { cell.fill = headerFill; cell.font = headerFont; });
  };

  const kpiSheet = wb.addWorksheet('KPIs');
  kpiSheet.columns = [{ header: 'KPI', key: 'k', width: 32 }, { header: 'Value', key: 'v', width: 20 }];
  kpiSheet.addRow({ k: 'Period', v: `${range.from} to ${range.to}` });
  kpiSheet.addRow({ k: 'Total Customers', v: data.kpis.total_customers });
  kpiSheet.addRow({ k: 'Total Properties', v: data.kpis.total_properties });
  kpiSheet.addRow({ k: 'Available Properties', v: data.kpis.available_properties });
  kpiSheet.addRow({ k: 'Booked / Sold Properties', v: data.kpis.booked_properties });
  kpiSheet.addRow({ k: 'Total Booking / Sales Value', v: data.kpis.total_booking_value });
  kpiSheet.addRow({ k: 'Pending Payments', v: data.kpis.pending_payments });
  kpiSheet.addRow({ k: 'Active Employees', v: data.kpis.active_employees });
  kpiSheet.addRow({ k: 'Pending / Overdue Activities', v: data.kpis.pending_or_overdue_activities });
  styleHeader(kpiSheet);

  const trendSheet = wb.addWorksheet('Sales Trend');
  trendSheet.columns = [{ header: 'Month', key: 'month', width: 16 }, { header: 'Bookings', key: 'booking_count', width: 14 }, { header: 'Booking Value', key: 'booking_value', width: 18 }];
  data.sales_trend.forEach((r) => trendSheet.addRow(r));
  styleHeader(trendSheet);

  const propSheet = wb.addWorksheet('Property Overview');
  propSheet.columns = [{ header: 'Status', key: 'status', width: 28 }, { header: 'Count', key: 'count', width: 12 }];
  data.property_overview.forEach((r) => propSheet.addRow(r));
  styleHeader(propSheet);

  const custSheet = wb.addWorksheet('Customer Overview');
  custSheet.columns = [{ header: 'Month', key: 'month', width: 16 }, { header: 'New Customers', key: 'count', width: 16 }];
  data.customer_overview.monthly_new_customers.forEach((r) => custSheet.addRow(r));
  styleHeader(custSheet);

  const empSheet = wb.addWorksheet('Employee Performance');
  empSheet.columns = [
    { header: 'Employee', key: 'employee_name', width: 24 },
    { header: 'Activities Completed', key: 'activities_completed', width: 20 },
    { header: 'Tasks Pending', key: 'tasks_pending', width: 16 },
    { header: 'Tasks Overdue', key: 'tasks_overdue', width: 16 },
    { header: 'Customers Managed', key: 'customers_managed', width: 18 },
  ];
  data.employee_performance.forEach((r) => empSheet.addRow(r));
  styleHeader(empSheet);

  const paySheet = wb.addWorksheet('Payment Overview');
  paySheet.columns = [{ header: 'Metric', key: 'k', width: 24 }, { header: 'Amount', key: 'v', width: 18 }];
  paySheet.addRow({ k: 'Total Received', v: data.payment_overview.total_received });
  paySheet.addRow({ k: 'Pending Approval', v: data.payment_overview.pending_approval });
  paySheet.addRow({ k: 'Overdue', v: data.payment_overview.overdue });
  styleHeader(paySheet);

  const attnSheet = wb.addWorksheet('Needs Attention');
  attnSheet.columns = [{ header: 'Category', key: 'cat', width: 22 }, { header: 'Detail', key: 'detail', width: 32 }, { header: 'Amount / Due', key: 'amt', width: 18 }];
  data.needs_attention.overdue_payments.forEach((r) => attnSheet.addRow({ cat: 'Overdue Payment', detail: r.customer_name, amt: r.amount_due }));
  data.needs_attention.pending_payment_approvals.forEach((r) => attnSheet.addRow({ cat: 'Pending Approval', detail: `${r.customer_name} (${r.receipt_number})`, amt: r.amount }));
  data.needs_attention.unassigned_customers.forEach((r) => attnSheet.addRow({ cat: 'Unassigned Customer', detail: r.customer_name, amt: '' }));
  data.needs_attention.overdue_tasks.forEach((r) => attnSheet.addRow({ cat: 'Overdue Activity', detail: r.title, amt: r.due_date || '' }));
  styleHeader(attnSheet);

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `dgcrm-executive-dashboard-${range.from}-to-${range.to}.xlsx`);
}
