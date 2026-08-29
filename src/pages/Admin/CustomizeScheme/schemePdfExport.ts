// ==========================================
// DREAM GROUP CRM - CUSTOMIZE SCHEME PDF EXPORT
// ==========================================
// "Traditional Bank Loan VS. Our Interest-Free Model" comparison PDF —
// same jsPDF + jspdf-autotable stack the Executive Dashboard's export
// already uses (see ../Reports/dashboardExport.ts), same page setup
// (unit 'pt', A4, 40pt margins, autoTable 'grid' theme). Everything here
// is derived from ONE input — flatCost, the page's own "Total Cost of
// Flat" field — nothing is hard-coded.
//
// "Rs." not "₹" inside the PDF body: jsPDF's bundled base-14 fonts
// (helvetica) have no glyph for ₹, so it renders as a blank/broken
// character — dashboardExport.ts's own `rupee()` already made this exact
// call for the same reason. The ₹ symbol is used everywhere else (on
// screen, in the downloaded filename) where it's just text, not a
// font-rendered PDF glyph.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoUrl from '../../../assets/images/logo_dream_group.png';

const rupee = (n: number): string => `Rs. ${Math.round(n).toLocaleString('en-IN')}`;
const inr = (n: number): string => `₹${Math.round(n).toLocaleString('en-IN')}`;

// ── Bank loan (8% p.a., 20-year / 240-month tenure, reducing-balance EMI) ──
const BANK_RATE_PERCENT = 8;
const BANK_TENURE_YEARS = 20;
const BANK_TENURE_MONTHS = BANK_TENURE_YEARS * 12;

// ── Our interest-free plan (0%, 7-year / 84-month tenure, flat split) ──
const PLAN_TENURE_YEARS = 7;
const PLAN_TENURE_MONTHS = PLAN_TENURE_YEARS * 12;

interface LoanFigures { emi: number; totalPayment: number; interest: number; }

function computeBankLoan(flatCost: number): LoanFigures {
  const r = BANK_RATE_PERCENT / 12 / 100;
  const n = BANK_TENURE_MONTHS;
  const factor = Math.pow(1 + r, n);
  const emi = (flatCost * r * factor) / (factor - 1);
  const totalPayment = emi * n;
  return { emi, totalPayment, interest: totalPayment - flatCost };
}

function computeInterestFreePlan(flatCost: number): LoanFigures {
  return { emi: flatCost / PLAN_TENURE_MONTHS, totalPayment: flatCost, interest: 0 };
}

async function loadImageAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function exportSchemePdf(flatCost: number): Promise<void> {
  const bank = computeBankLoan(flatCost);
  const plan = computeInterestFreePlan(flatCost);
  const savings = bank.interest - plan.interest; // plan.interest is always 0, kept explicit for clarity

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const marginX = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 40;

  // ── Header — logo (Dream Group's own asset; no separate "Dream Park"
  // banner exists in this project) + project line + title. ────────────────
  try {
    const logoDataUrl = await loadImageAsDataUrl(logoUrl);
    doc.addImage(logoDataUrl, 'PNG', marginX, y, 46, 46);
  } catch {
    // Logo is a nice-to-have, not a reason to fail the whole export.
  }
  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.text('Dream Park', marginX + 58, y + 20);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Project: Dreams Group', marginX + 58, y + 36);
  y += 66;

  doc.setDrawColor(203, 213, 225);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 26;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Traditional Bank Loan VS. Our Interest-Free Model', pageWidth / 2, y, { align: 'center' });
  y += 28;

  // ── Comparison table ──────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    head: [['Loan Option', `Bank Loan (${BANK_RATE_PERCENT}% interest for ${BANK_TENURE_YEARS} years)`, `Our Interest-Free Payment Plan (${PLAN_TENURE_YEARS} years)`]],
    body: [
      ['Flat Cost', rupee(flatCost), rupee(flatCost)],
      ['Interest Rate', `${BANK_RATE_PERCENT}% per annum`, '0% (No Interest)'],
      ['Total Loan Tenure', `${BANK_TENURE_YEARS} years`, `${PLAN_TENURE_YEARS} years`],
      ['Monthly EMI', rupee(bank.emi), rupee(plan.emi)],
      ['Total Payment', rupee(bank.totalPayment), rupee(plan.totalPayment)],
      ['Extra Paid in Interest', rupee(bank.interest), 'Rs. 0 (you save big!)'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9.5 },
    styles: { fontSize: 9.5, cellPadding: 7, lineColor: [203, 213, 225], lineWidth: 0.75 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 130 } },
    margin: { left: marginX, right: marginX },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 30;

  // ── Key Benefits ──────────────────────────────────────────────────────
  if (y > 650) { doc.addPage(); y = 44; }
  doc.setFontSize(12.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Key Benefits of Choosing Our Plan', marginX, y);
  y += 20;

  const benefits = [
    '100% Interest-Free — No hidden charges!',
    `Save ${rupee(savings)} compared to a bank loan!`,
    `Affordable Monthly EMI of ${rupee(plan.emi)} — No financial stress!`,
    `Full Ownership in Just ${PLAN_TENURE_YEARS} Years (vs. ${BANK_TENURE_YEARS} years with a bank loan).`,
  ];
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(21, 128, 61);
  benefits.forEach((line) => {
    // "•" not "✓" — same helvetica glyph gap as ₹ above; "•" is the one
    // bullet-ish character the base14 font actually renders (see the
    // Conclusion section below, which already relies on it).
    doc.text('•', marginX, y);
    doc.text(line, marginX + 14, y);
    y += 20;
  });
  doc.setTextColor(0, 0, 0);
  y += 12;

  // ── Conclusion ────────────────────────────────────────────────────────
  if (y > 650) { doc.addPage(); y = 44; }
  doc.setFontSize(12.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Conclusion', marginX, y);
  y += 18;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const conclusionLines = [
    `• If you choose the bank loan, you will pay ${rupee(bank.totalPayment)} in total — ${rupee(bank.interest)} more than the ${rupee(flatCost)} flat cost due to interest.`,
    `• With our interest-free plan, you pay only the original flat cost of ${rupee(flatCost)} with Rs. 0 interest, completing the payment in just ${PLAN_TENURE_YEARS} years.`,
  ];
  const maxWidth = pageWidth - marginX * 2;
  conclusionLines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, maxWidth);
    doc.text(wrapped, marginX, y);
    y += wrapped.length * 14 + 8;
  });

  doc.save(`Dream-Park-Scheme-${inr(flatCost)}.pdf`);
}
