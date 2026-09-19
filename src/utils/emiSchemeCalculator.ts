// ==========================================
// DGCRM — EMI SCHEME & SCHEDULE CALCULATOR (shared)
// ==========================================
// Pure client-side calculation, extracted from
// pages/Admin/CustomizeScheme/CustomizeSchemePage.tsx so the Customer
// Add/Edit page's Payment Details "Preview" button can show the exact
// same EMI Scheme + EMI Schedule that page computes, without duplicating
// ~130 lines of financial logic. Nothing here is persisted or sent to the
// backend — it is a live what-if projection from whatever the Payment
// Details fields currently hold, same as Customize Scheme itself.
//
// Mirrors the real customer Scheme page's backend algorithm
// (modules/customers/scheduleGenerator.ts on the server): Section A
// (Before Possession) is Booking + Remaining Booking, then exactly
// `tenure` EMIs of the before-possession amount (with a booster folded in
// every Nth one), then Possession Amount. Section B (After Possession)
// greedily consumes whatever's left of Total Cost of Flat in
// after-possession-EMI-sized chunks (+ booster every Nth one), with the
// final chunk recorded as an exact partial "wrap-up" installment so the
// schedule's own total always reconciles to Total Cost of Flat exactly —
// never more, never less.
export interface EmiSummaryRow {
  label: string;
  amount: number;
}

export interface EmiScheduleRow {
  sr: number;
  date: Date | null;
  label: string;
  amount: number;
}

export interface EmiSchemeInputs {
  totalCost: number;
  bookingDate: string; // yyyy-mm-dd
  bookingAmount: number;
  remainingBookingAmount: number;
  remainingBookingDate: string; // yyyy-mm-dd
  possessionAmount: number;
  installmentDate: string; // yyyy-mm-dd
  totalEmiTenure: number;
  monthlyEmiBeforePossession: number;
  monthlyEmiAfterPossession: number;
  boosterAmountBeforePossession: number;
  boosterIntervalBeforePossession: number;
  boosterAmountAfterPossession: number;
  boosterIntervalAfterPossession: number;
}

export interface EmiSchemeResult {
  tenure: number;
  afterCount: number;
  summaryA: EmiSummaryRow[];
  summaryB: EmiSummaryRow[];
  totalA: number;
  totalB: number;
  grandTotal: number;
  beforeRows: EmiScheduleRow[];
  afterRows: EmiScheduleRow[];
}

// ── formatting / date helpers ────────────────────────────────────────────
export const formatINR = (n: number): string => `₹ ${Math.max(0, Math.round(n || 0)).toLocaleString('en-IN')}`;

export const ordinal = (n: number): string => {
  const j = n % 10, k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
};

export const parseDateOnly = (s: string): Date | null => {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const addMonths = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
};

export const formatDMY = (d: Date | null): string =>
  d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : '—';

// ── the calculation itself ────────────────────────────────────────────────
export function computeEmiScheme(inputs: EmiSchemeInputs): EmiSchemeResult {
  const {
    totalCost, bookingDate, bookingAmount, remainingBookingAmount, remainingBookingDate,
    possessionAmount, installmentDate, totalEmiTenure, monthlyEmiBeforePossession,
    monthlyEmiAfterPossession, boosterAmountBeforePossession, boosterIntervalBeforePossession,
    boosterAmountAfterPossession, boosterIntervalAfterPossession,
  } = inputs;

  const tenure = Math.max(0, Math.round(totalEmiTenure));
  const bookingD = parseDateOnly(bookingDate);
  const remainingD = parseDateOnly(remainingBookingDate);
  const firstEmiD = parseDateOnly(installmentDate);
  const daysDiff = bookingD && remainingD ? Math.round((remainingD.getTime() - bookingD.getTime()) / 86400000) : null;
  const remainingLabel = daysDiff != null && daysDiff > 0 ? `After ${daysDiff} days from booking` : 'Remaining Booking Amount';

  // ── Section A (Before Possession) ────────────────────────────────────
  const beforeRows: EmiScheduleRow[] = [];
  let sr = 1;
  beforeRows.push({ sr: sr++, date: bookingD, label: 'Booking Amount', amount: bookingAmount });
  beforeRows.push({ sr: sr++, date: remainingD, label: remainingLabel, amount: remainingBookingAmount });
  let lastBeforeDate: Date | null = firstEmiD;
  let boosterOccBefore = 0;
  for (let i = 1; i <= tenure; i++) {
    const d = firstEmiD ? addMonths(firstEmiD, i - 1) : null;
    beforeRows.push({ sr: sr++, date: d, label: `${ordinal(i)} EMI`, amount: monthlyEmiBeforePossession });
    if (d) lastBeforeDate = d;
    if (boosterIntervalBeforePossession > 0 && boosterAmountBeforePossession > 0 && i % boosterIntervalBeforePossession === 0) {
      beforeRows.push({ sr: sr++, date: d, label: `Booster (after ${ordinal(i)} EMI)`, amount: boosterAmountBeforePossession });
      boosterOccBefore++;
    }
  }
  beforeRows.push({ sr: sr++, date: lastBeforeDate, label: 'Possession Amount', amount: possessionAmount });

  const totalA = beforeRows.reduce((s, r) => s + r.amount, 0);

  // ── Section B (After Possession) — greedy consumption of what's left ──
  const remainingFlatAmount = Math.max(0, totalCost - totalA);
  const afterStartDate = lastBeforeDate ? addMonths(lastBeforeDate, 1) : null;
  const afterRows: EmiScheduleRow[] = [];
  let amountLeft = remainingFlatAmount;
  let srB = 1;
  while (amountLeft > 0 && monthlyEmiAfterPossession > 0 && srB <= 2000) {
    const isBoosterMonth = boosterIntervalAfterPossession > 0 && boosterAmountAfterPossession > 0 && srB % boosterIntervalAfterPossession === 0;
    const fullAmount = monthlyEmiAfterPossession + (isBoosterMonth ? boosterAmountAfterPossession : 0);
    const d = afterStartDate ? addMonths(afterStartDate, srB - 1) : null;
    if (amountLeft >= fullAmount) {
      afterRows.push({ sr: srB, date: d, label: `${ordinal(srB)} EMI${isBoosterMonth ? ' + Booster' : ''}`, amount: fullAmount });
      amountLeft -= fullAmount;
    } else {
      afterRows.push({ sr: srB, date: d, label: `${ordinal(srB)} EMI (Final)`, amount: amountLeft });
      amountLeft = 0;
    }
    srB++;
  }

  const totalB = afterRows.reduce((s, r) => s + r.amount, 0);
  const afterCount = afterRows.length;
  const boosterOccAfter = boosterIntervalAfterPossession > 0 ? Math.floor(afterCount / boosterIntervalAfterPossession) : 0;
  const boosterTotalAfter = boosterAmountAfterPossession * boosterOccAfter;
  const emiOnlyTotalAfter = totalB - boosterTotalAfter;

  // ── Summary (EMI Scheme) rows ────────────────────────────────────────
  const summaryA: EmiSummaryRow[] = [
    { label: 'Booking Amount', amount: bookingAmount },
    { label: remainingLabel, amount: remainingBookingAmount },
    { label: `${ordinal(1)} EMI's (${formatINR(monthlyEmiBeforePossession)} x ${tenure})`, amount: monthlyEmiBeforePossession * tenure },
    { label: `After every ${boosterIntervalBeforePossession} EMI's, additional Rs. ${formatINR(boosterAmountBeforePossession)} (x ${boosterOccBefore})`, amount: boosterAmountBeforePossession * boosterOccBefore },
    { label: 'At the time of possession (one-time payment)', amount: possessionAmount },
  ];
  const summaryB: EmiSummaryRow[] = [
    { label: `${ordinal(2)} EMI's (${formatINR(monthlyEmiAfterPossession)} x ${afterCount} months)`, amount: emiOnlyTotalAfter },
    { label: `After every ${boosterIntervalAfterPossession} EMI's, additional Rs. ${formatINR(boosterAmountAfterPossession)} (x ${boosterOccAfter})`, amount: boosterTotalAfter },
  ];

  const grandTotal = totalA + totalB;

  return { tenure, afterCount, summaryA, summaryB, totalA, totalB, grandTotal, beforeRows, afterRows };
}
