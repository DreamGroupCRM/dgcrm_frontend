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
import { numberToIndianWords } from '../../../../utils';

const rupee = (n: number): string => `Rs. ${Math.round(n || 0).toLocaleString('en-IN')}`;

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
  doc.text('EMI SCHEDULE', pageWidth / 2, y, { align: 'center' });
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

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Cost of Flat for ${c.flat_type || 'this flat'}: ${rupee(c.flat_amount)}`, marginX, y);
  y += 20;

  const summaryTable = (heading: string, rows: CustomerSchemeData['summaryA'], total: number, totalLabel: string) => {
    if (y > 680) { doc.addPage(); y = 44; }
    doc.setFontSize(11.5);
    doc.setFont('helvetica', 'bold');
    doc.text(heading, marginX, y);
    y += 10;
    autoTable(doc, {
      startY: y,
      head: [['#', 'Payment Details', 'Amount (Rs.)']],
      body: rows.map((r, i) => [String(i + 1), r.label, rupee(r.amount)]),
      foot: [[{ content: totalLabel, colSpan: 2, styles: { fontStyle: 'bold' } }, { content: rupee(total), styles: { fontStyle: 'bold' } }]],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9.5 },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 9.5 },
      styles: { fontSize: 9.5, cellPadding: 6, lineColor: [203, 213, 225], lineWidth: 0.75 },
      columnStyles: { 0: { cellWidth: 24 }, 2: { halign: 'right', cellWidth: 90 } },
      margin: { left: marginX, right: marginX },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 20;
  };

  summaryTable('A) Mode of Payment (Before Possession)', data.summaryA, data.totalA, 'Total (A) (Before Possession)');
  summaryTable('B) After Possession', data.summaryB, data.totalB, 'Total (B) (After Possession)');

  if (y > 700) { doc.addPage(); y = 44; }
  doc.setFontSize(11.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Cost of Flat (A + B): ${rupee(data.grandTotal)}`, marginX, y);

  // ── Full dated schedule — new page, same "A) / B)" split, matching the
  // reference PDF's own page-per-section layout. ────────────────────────
  const emiRowCount = (rows: CustomerSchemeData['scheduleA']) => rows.filter((r) => r.label.includes('EMI')).length;
  const totalMonths = emiRowCount(data.scheduleA) + emiRowCount(data.scheduleB);

  doc.addPage();
  y = 44;
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(`Schedule ${rupee(c.flat_amount)} for ${c.flat_type || 'this flat'} - ${totalMonths} months`, marginX, y);
  y += 20;

  const scheduleTable = (rows: CustomerSchemeData['scheduleA'], section: 'A' | 'B', totalLabel: string, total: number, extraFootRows: [string, string][] = []) => {
    autoTable(doc, {
      startY: y,
      head: [['Sr No', 'Inst Date', `(${section}) Mode Of Payment`, 'Amount']],
      body: rows.map((r) => [String(r.sr), formatDMY(r.date), r.label, rupee(r.amount)]),
      foot: [
        [{ content: totalLabel, colSpan: 3, styles: { fontStyle: 'bold' } }, { content: rupee(total), styles: { fontStyle: 'bold' } }],
        ...extraFootRows.map(([label, value]) => [{ content: label, colSpan: 3, styles: { fontStyle: 'bold' as const } }, { content: value, styles: { fontStyle: 'bold' as const } }]),
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9.5 },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 9.5 },
      styles: { fontSize: 9, cellPadding: 5.5, lineColor: [203, 213, 225], lineWidth: 0.75 },
      columnStyles: { 0: { cellWidth: 44 }, 1: { cellWidth: 80 }, 3: { halign: 'right', cellWidth: 90 } },
      margin: { left: marginX, right: marginX },
      didDrawPage: () => { y = 44; },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 24;
  };

  scheduleTable(data.scheduleA, 'A', '(A) Total Before Possession :', data.totalA);
  if (y > 650) { doc.addPage(); y = 44; }
  scheduleTable(data.scheduleB, 'B', '(B) Total After Possession :', data.totalB, [['Total (A + B):', rupee(data.grandTotal)]]);

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

  doc.save(`Payment-Schedule-${c.customer_code}.pdf`);
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
    head: [['Rec Number', 'Installment Date', 'Received Date', 'Mode Of Payment', 'Payment For', 'Maintenance', 'Amount', 'Company']],
    body: payments.map((p) => [
      p.receipt_number || '—',
      formatDMY(p.inst_date),
      formatDMY(p.paid_on),
      p.mode || '—',
      paymentForLabel(p.payment_type),
      p.maintenance ? rupee(p.maintenance) : '0',
      rupee(p.amount),
      p.company || '—',
    ]),
    theme: 'grid',
    headStyles: { fillColor: [109, 40, 217], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 5, lineColor: [203, 213, 225], lineWidth: 0.75 },
    columnStyles: { 5: { textColor: [22, 163, 74] }, 6: { halign: 'right', textColor: [220, 38, 38], fontStyle: 'bold' } },
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

// ── Payment Receipt PDF (matches the reference "PAYMENT RECEIPT" screenshot) ──
// tx.company is the builder/company name selected when the payment was
// collected (a free-text field on the transaction, not an FK) — that's the
// brand this receipt is issued under, not "Dream Group CRM" (this app's own
// name). GSTIN is omitted rather than fabricated: amount_transactions has
// no GST column, and `company` is plain text with no reliable link back to
// a Company master row to pull one from.
export function exportPaymentReceiptPdf(data: PaymentReceipt): void {
  const { transaction: tx, customer } = data;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a5' });
  const marginX = 32;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 34;

  // Badge — "PAYMENT RECEIPT", top-right.
  const badgeText = 'PAYMENT RECEIPT';
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const badgeWidth = doc.getTextWidth(badgeText) + 16;
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(pageWidth - marginX - badgeWidth, y - 12, badgeWidth, 18, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(badgeText, pageWidth - marginX - badgeWidth / 2, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  // Brand name — the company this payment was collected for.
  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text(tx.company || 'Dream Group CRM', marginX, y + 20);
  doc.setTextColor(0, 0, 0);
  y += 42;

  doc.setDrawColor(203, 213, 225);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 8;

  // Building / Flat No. / Wing / EMI Month box, top-right style summarized
  // as a small info line since a5 receipts have little width to spare.
  const emiMonth = tx.inst_date ? new Date(tx.inst_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—';
  autoTable(doc, {
    startY: y,
    body: [
      ['BUILDING', customer.building_name || '—', 'FLAT NO.', customer.flat_no || '—'],
      ['WING', customer.wing_name || '—', 'EMI MONTH', emiMonth],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 4, lineColor: [203, 213, 225], lineWidth: 0.6 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 2: { fontStyle: 'bold', cellWidth: 60 } },
    margin: { left: marginX, right: marginX },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 14;

  doc.setFontSize(9);
  const line = (label: string, value: string) => { doc.text(label, marginX, y); doc.setFont('helvetica', 'bold'); doc.text(value, marginX + 130, y); doc.setFont('helvetica', 'normal'); y += 15; };
  line('RECEIPT NO :', tx.receipt_number);
  line('DATE :', formatDMY(tx.date || tx.created_at));
  line('RECEIVED WITH THANKS FROM :', customer.customer_name || '—');

  const total = tx.amount + (tx.maintenance || 0);
  line('THE SUM OF RUPEES :', `${numberToIndianWords(tx.amount)}`);
  if (tx.maintenance) line('MAINTENANCE :', rupee(tx.maintenance));
  line('TOTAL :', rupee(total));
  line('IN WORDS :', numberToIndianWords(total));
  line('BY CASH / CHEQUE NO :', tx.cheque_number || '—');
  line('DATED :', tx.clearance_date ? formatDMY(tx.clearance_date) : '—');
  line('PAYMENT MODE :', tx.mode_of_payment || '—');
  y += 10;

  // Big amount box, bottom-left.
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setDrawColor(37, 99, 235);
  const amountText = rupee(total);
  const amountBoxWidth = doc.getTextWidth(amountText) + 24;
  doc.rect(marginX, y, amountBoxWidth, 24);
  doc.text(amountText, marginX + amountBoxWidth / 2, y + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  y += 40;

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Cheques are subject to realisation', marginX, y);
  y += 12;
  doc.text('This Receipt is Computer Generated, Does not Required Signature', marginX, y);
  doc.setTextColor(0, 0, 0);

  doc.save(`Receipt-${tx.receipt_number}.pdf`);
}
