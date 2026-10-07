// ==========================================
// DREAM GROUP CRM - PAYMENT HISTORY / SCHEDULE PDF EXPORT
// ==========================================
// Same jsPDF + jspdf-autotable stack every other PDF export in this app
// uses (see ../../CustomizeScheme/schemePdfExport.ts, ../../Reports/
// dashboardExport.ts) — A4 portrait, 40pt margins, autoTable 'grid' theme.
// "Rs." not "₹" inside the PDF body for the same reason schemePdfExport.ts
// documents: jsPDF's bundled base-14 helvetica has no ₹ glyph.
//
// exportPaymentSchedulePdf's input (CustomerSchemeData) is exactly what
// fetchCustomerScheme already returns for the "Show Scheme" page — no new
// backend endpoint needed, this just renders the same numbers as a PDF.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CustomerSchemeData, CustomerPaymentRecord, Customer, PaymentReceipt } from '../../../../types/index';
import { paymentForLabel } from '../../../../services/paymentService';

const rupee = (n: number): string => `Rs. ${Math.round(n || 0).toLocaleString('en-IN')}`;
// jsPDF's helvetica has no ₹ glyph — a label carrying one (e.g. "1st EMI's
// (₹ 20,000 x 24)") came out letter-spaced and garbled. Use "Rs." instead.
const pdfText = (s: string): string => s.replace(/(Rs\.\s*)?₹\s?/g, 'Rs. ');
// Before / After Possession totals get their own colour band.
const TOTAL_A_FILL: [number, number, number] = [219, 234, 254];  // light blue
const TOTAL_A_TEXT: [number, number, number] = [30, 64, 175];
const TOTAL_B_FILL: [number, number, number] = [220, 252, 231];  // light green
const TOTAL_B_TEXT: [number, number, number] = [22, 101, 52];
const GRAND_FILL: [number, number, number] = [254, 243, 199];    // light amber
const GRAND_TEXT: [number, number, number] = [146, 64, 14];

const formatDMY = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : '—';
};

const fullCustomerName = (c: { name?: string | null; middle_name?: string | null; last_name?: string | null; customer_code?: string }): string =>
  [c.name, c.middle_name, c.last_name].filter(Boolean).join(' ') || c.customer_code || '—';

// ── Payment Schedule PDF (matches the reference "EMI SCHEDULE" PDF) ──────
export function exportPaymentSchedulePdf(data: CustomerSchemeData): void {
  const c = data.customer;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const marginX = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 44;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('EMI Scheme and Schedule', pageWidth / 2, y, { align: 'center' });
  y += 26;

  autoTable(doc, {
    startY: y,
    body: [
      ['Name', fullCustomerName(c), 'Address', c.address || '—'],
      ['Building', [c.building_name, c.wing_name].filter(Boolean).join(' / ') || '—', 'Email', c.email || '—'],
      ['Mobile No.', c.mobile_number || '—', 'Total Flat Cost', rupee(c.flat_amount)],
    ],
    theme: 'grid',
    styles: { fontSize: 9.5, cellPadding: 7, lineColor: [203, 213, 225], lineWidth: 0.75 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 }, 1: { cellWidth: 175 },
      2: { fontStyle: 'bold', cellWidth: 80 }, 3: { cellWidth: 175 },
    },
    margin: { left: marginX, right: marginX },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 26;

  // (Total Flat Cost is already in the details table above — not repeated.)

  const summaryTable = (heading: string, rows: CustomerSchemeData['summaryA'], total: number, totalLabel: string, fill: [number, number, number], ink: [number, number, number]) => {
    if (y > 680) { doc.addPage(); y = 44; }
    doc.setFontSize(11.5);
    doc.setFont('helvetica', 'bold');
    doc.text(heading, marginX, y);
    y += 10;
    autoTable(doc, {
      startY: y,
      head: [['#', 'Payment Details', 'Amount (Rs.)']],
      body: rows.map((r, i) => [String(i + 1), pdfText(r.label), rupee(r.amount)]),
      foot: [[{ content: totalLabel, colSpan: 2, styles: { fontStyle: 'bold' } }, { content: rupee(total), styles: { fontStyle: 'bold' } }]],
      showHead: 'firstPage',
      showFoot: 'lastPage',
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9.5 },
      footStyles: { fillColor: fill, textColor: ink, fontSize: 9.5 },
      styles: { fontSize: 9.5, cellPadding: 6, lineColor: [203, 213, 225], lineWidth: 0.75 },
      columnStyles: { 0: { cellWidth: 24 }, 2: { halign: 'right', cellWidth: 90 } },
      margin: { left: marginX, right: marginX },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 20;
  };

  // Section heading for the A / B summary tables.
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('EMI Scheme', marginX, y);
  y += 20;
  summaryTable('A) Before Possession', data.summaryA, data.totalA, 'Total (A)', TOTAL_A_FILL, TOTAL_A_TEXT);
  summaryTable('B) After Possession', data.summaryB, data.totalB, 'Total (B)', TOTAL_B_FILL, TOTAL_B_TEXT);

  if (y > 700) { doc.addPage(); y = 44; }
  doc.setFillColor(...GRAND_FILL);
  doc.rect(marginX, y - 13, pageWidth - marginX * 2, 20, 'F');
  doc.setFontSize(11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAND_TEXT);
  doc.text(`Total Cost of Flat (A + B): ${rupee(data.grandTotal)}`, marginX + 8, y);
  doc.setTextColor(0, 0, 0);

  // ── Full dated schedule — new page, same "A) / B)" split, matching the
  // reference PDF's own page-per-section layout. ────────────────────────
  const emiRowCount = (rows: CustomerSchemeData['scheduleA']) => rows.filter((r) => r.label.includes('EMI')).length;
  const totalMonths = emiRowCount(data.scheduleA) + emiRowCount(data.scheduleB);

  doc.addPage();
  y = 44;
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('EMI Schedule', marginX, y);
  y += 18;
  doc.setFontSize(11);
  doc.text(`${rupee(c.flat_amount)} for ${c.flat_type || 'this flat'} - ${totalMonths} months`, marginX, y);
  y += 18;

  // Each section's heading and its total appear ONCE: the heading is
  // printed above the table, the header row only on the table's first page
  // and the totals only on its last page (they used to repeat on every page
  // the table ran onto).
  const scheduleTable = (rows: CustomerSchemeData['scheduleA'], heading: string, totalLabel: string, total: number, fill: [number, number, number], ink: [number, number, number], extraFootRows: [string, string][] = []) => {
    if (y > 700) { doc.addPage(); y = 44; }
    doc.setFontSize(11.5);
    doc.setFont('helvetica', 'bold');
    doc.text(heading, marginX, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      head: [['Sr No', 'Inst Date', 'Mode Of Payment', 'Amount']],
      body: rows.map((r) => [String(r.sr), formatDMY(r.date), pdfText(r.label), rupee(r.amount)]),
      foot: [
        [{ content: totalLabel, colSpan: 3, styles: { fontStyle: 'bold', fillColor: fill, textColor: ink } }, { content: rupee(total), styles: { fontStyle: 'bold', fillColor: fill, textColor: ink } }],
        ...extraFootRows.map(([label, value]) => [
          { content: label, colSpan: 3, styles: { fontStyle: 'bold' as const, fillColor: GRAND_FILL, textColor: GRAND_TEXT } },
          { content: value, styles: { fontStyle: 'bold' as const, fillColor: GRAND_FILL, textColor: GRAND_TEXT } },
        ]),
      ],
      showHead: 'firstPage',
      showFoot: 'lastPage',
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9.5 },
      footStyles: { fontSize: 9.5 },
      styles: { fontSize: 9, cellPadding: 5.5, lineColor: [203, 213, 225], lineWidth: 0.75 },
      columnStyles: { 0: { cellWidth: 44 }, 1: { cellWidth: 80 }, 3: { halign: 'right', cellWidth: 90 } },
      margin: { left: marginX, right: marginX },
      didDrawPage: () => { y = 44; },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 24;
  };

  scheduleTable(data.scheduleA, 'A) Before Possession', 'Total (A)', data.totalA, TOTAL_A_FILL, TOTAL_A_TEXT);
  scheduleTable(data.scheduleB, 'B) After Possession', 'Total (B)', data.totalB, TOTAL_B_FILL, TOTAL_B_TEXT, [['Total (A + B)', rupee(data.grandTotal)]]);

  // ── Terms and Conditions + signature ─────────────────────────────────
  if (y > 620) { doc.addPage(); y = 44; }
  doc.setFontSize(12.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms and Conditions', marginX, y);
  y += 18;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Please read the following terms and conditions carefully before proceeding:', marginX, y);
  y += 18;
  const terms = [
    'Stamp Duty and Registration charges will be borne by the purchaser.',
    'Registration of the flat will be done after receiving full payment (A + B).',
    'Extra GST Amount will be Applicable.',
  ];
  terms.forEach((line) => {
    doc.text('•', marginX, y);
    const wrapped = doc.splitTextToSize(line, pageWidth - marginX * 2 - 14);
    doc.text(wrapped, marginX + 14, y);
    y += wrapped.length * 13 + 6;
  });
  y += 10;
  doc.text('I agree to the terms and conditions.', marginX, y);
  y += 30;
  doc.setFont('helvetica', 'bold');
  doc.text('Signature:', marginX, y);

  doc.save(`EMI-Scheme-and-Schedule-${c.customer_code}.pdf`);
}

// ── Payment History PDF (matches the reference "Payments History" PDF) ──
export function exportPaymentHistoryPdf(
  customer: Customer,
  payments: CustomerPaymentRecord[],
  totalFlatCost: number | null,
  pendingAmount: number | null
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const marginX = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 40;

  // Header bar — two-tone rect approximating the reference's purple->orange
  // gradient (jsPDF has no native gradient fill).
  doc.setFillColor(109, 40, 217);
  doc.rect(marginX, y, (pageWidth - marginX * 2) / 2, 30, 'F');
  doc.setFillColor(217, 119, 6);
  doc.rect(marginX + (pageWidth - marginX * 2) / 2, y, (pageWidth - marginX * 2) / 2, 30, 'F');
  doc.setFontSize(12.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`Payments History - Total Transaction (${payments.length})`, marginX + 10, y + 20);
  doc.setTextColor(0, 0, 0);
  y += 50;

  const flatLine = [customer.building_name, customer.wing_name ? `${customer.wing_name}-` : '', customer.flat_no].filter(Boolean).join(' / ');
  autoTable(doc, {
    startY: y,
    body: [
      ['Name', customer.customer_name || '—', 'Address', customer.address || '—'],
      ['Building', flatLine || '—', 'Email', customer.email || 'no'],
      ['Mobile No.', customer.mobile_number || '—', 'Total Flat Cost', totalFlatCost != null ? rupee(totalFlatCost) : '—'],
      ['', '', 'Pending Amount', pendingAmount != null ? rupee(pendingAmount) : '—'],
    ],
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 }, 1: { cellWidth: 175 }, 2: { fontStyle: 'bold', cellWidth: 90 }, 3: { cellWidth: 165 } },
    margin: { left: marginX, right: marginX },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 16;

  const grandTotal = payments.reduce((s, p) => s + p.amount, 0);

  autoTable(doc, {
    startY: y,
    head: [['Rec Number', 'Installment Date', 'Received Date', 'Mode Of Payment', 'Payment For', 'Amount', 'Company', 'Status']],
    body: payments.map((p) => {
      // Extra Pay is its own payment, separate from EMIs — showing the
      // stored inst_date here would misleadingly read as "this
      // installment is paid."
      const isExtraPay = p.payment_tag === 'Extra Pay';
      return [
        p.receipt_number || '—',
        isExtraPay ? '—' : formatDMY(p.inst_date),
        formatDMY(p.paid_on),
        p.mode || '—',
        isExtraPay ? 'Extra Pay' : paymentForLabel(p.payment_type),
        rupee(p.amount),
        p.company || '—',
        p.is_approved ? 'Approved' : 'Pending Approval',
      ];
    }),
    theme: 'grid',
    headStyles: { fillColor: [109, 40, 217], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 5, lineColor: [203, 213, 225], lineWidth: 0.75 },
    columnStyles: { 5: { halign: 'right', textColor: [220, 38, 38], fontStyle: 'bold' } },
    margin: { left: marginX, right: marginX },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 20;

  if (y > 760) { doc.addPage(); y = 44; }
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('Grand Total:', marginX, y);
  doc.setTextColor(21, 128, 61);
  doc.text(rupee(grandTotal), pageWidth - marginX, y, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  doc.save(`Payment-History-${customer.customer_code || customer.id}.pdf`);
}

// ── Payment Receipt PDF ───────────────────────────────────────────────────
// Captures the exact same ReceiptSheet the View popup shows (the company's
// printed receipt-book layout), so view and download always match —
// including the ₹ sign and logo, which jsPDF's built-in fonts can't draw.
// The sheet is rendered in a hidden, isolated iframe (no app zoom or page
// styles to distort it), captured at 3x for sharp print, and placed on an
// A5 landscape page.
export async function exportPaymentReceiptPdf(data: PaymentReceipt, variant: 'payment' | 'cancelled' = 'payment'): Promise<void> {
  const [{ default: html2canvas }, { createRoot }, { createElement }, { ReceiptSheet, RECEIPT_SHEET_WIDTH, RECEIPT_LOGO_URL }] = await Promise.all([
    import('html2canvas'),
    import('react-dom/client'),
    import('react'),
    import('../../../../components/common/ReceiptSheet'),
  ]);

  // The capture is drawn by the browser itself (foreignObject mode), which
  // matches the on-screen popup exactly; that mode needs the logo embedded
  // as a data URL rather than a file link.
  const logoSrc = await fetch(RECEIPT_LOGO_URL)
    .then((r) => r.blob())
    .then((blob) => new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    }))
    .catch(() => RECEIPT_LOGO_URL);

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${RECEIPT_SHEET_WIDTH + 40}px;height:1200px;border:0;visibility:hidden;`;
  document.body.appendChild(frame);
  const frameDoc = frame.contentDocument!;
  frameDoc.open();
  frameDoc.write('<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#fff"><div id="r"></div></body></html>');
  frameDoc.close();
  const mount = frameDoc.getElementById('r')!;
  const root = createRoot(mount);
  try {
    // Wait for the logo so it is in the capture.
    await new Promise<void>((resolve) => {
      const timer = window.setTimeout(resolve, 4000);
      root.render(createElement(ReceiptSheet, { data, logoSrc, variant, onLogoLoad: () => { window.clearTimeout(timer); resolve(); } }));
    });
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const sheet = mount.firstElementChild as HTMLElement;
    const canvas = await html2canvas(sheet, { scale: 3, backgroundColor: '#ffffff', useCORS: true, logging: false, foreignObjectRendering: true });

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a5', compress: true });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    const ratio = Math.min((pageW - margin * 2) / canvas.width, (pageH - margin * 2) / canvas.height);
    const w = canvas.width * ratio;
    const h = canvas.height * ratio;
    // 'FAST' = compressed image stream (the raw 3x capture would make a
    // ~13 MB PDF; compressed it's a few hundred KB, still sharp for print).
    doc.addImage(canvas, 'PNG', (pageW - w) / 2, (pageH - h) / 2, w, h, undefined, 'FAST');
    doc.save(`${variant === 'cancelled' ? 'Cancelled-Receipt' : 'Receipt'}-${data.transaction.receipt_number || `Pending-${data.transaction.id}`}.pdf`);
  } finally {
    root.unmount();
    frame.remove();
  }
}
