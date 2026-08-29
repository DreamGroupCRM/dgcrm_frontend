// ==========================================
// DREAM GROUP CRM - CUSTOMIZE SCHEME (EMI Scheme & Schedule builder)
// ==========================================
// Replaces the old "Interest Free Calculator" placeholder. Purely a
// client-side calculator — every field below feeds a live useMemo, so
// changing any value instantly recomputes both the EMI Scheme summary
// (Section A/B totals) and the full month-by-month EMI Schedule. Nothing
// here is persisted to the backend; it's a what-if tool for a sales rep to
// interactively balance a payment plan against a flat's total cost before
// quoting it to a customer. Every field starts at 0 (dates start at today)
// so the page opens blank rather than pre-filled with a worked example.
//
// V_16.0 rewrite: Total EMI Tenure and both Monthly EMI fields are now
// treated as direct inputs (what the customer actually commits to paying),
// not solved-for from a total-cost algebra as before — that approach could
// silently produce a 0-month split when the numbers didn't reconcile
// exactly, which read as "broken." Section A (Before Possession) is now a
// straight sum of Booking + Remaining Booking + (tenure × EMI-before) +
// booster-before + Possession. Section B (After Possession) then greedily
// consumes whatever's left of Total Cost of Flat in EMI-after-sized
// chunks (+ booster-after every Nth one), same as the real customer
// Scheme page's backend scheduleGenerator.ts, with the final chunk
// recorded as a partial "wrap-up" installment if less than a full EMI is
// left — so the schedule's own total always exactly reconciles to Total
// Cost of Flat (never more, never less) whenever Monthly EMI After
// Possession has been entered.
import React, { useMemo, useState } from 'react';
import { IconType } from 'react-icons';
import { toast } from 'react-toastify';
import {
  MdCalculate, MdPayments, MdListAlt,
  MdHome, MdAccountBalanceWallet, MdSchedule, MdTrendingDown, MdTrendingUp,
  MdPrint, MdAccountBalance, MdExpandMore, MdExpandLess, MdSavings, MdPictureAsPdf,
} from 'react-icons/md';

import { useAppSelector } from '../../../hooks';
import { getTheme } from '../../../styles/theme';
import StatCard from '../../../components/masters/StatCard';
import { exportSchemePdf } from './schemePdfExport';

type Theme = ReturnType<typeof getTheme>;

// ── formatting helpers ─────────────────────────────────────────────────────
const formatINR = (n: number): string => `₹ ${Math.max(0, Math.round(n || 0)).toLocaleString('en-IN')}`;

// Comma-formatted number for the amount input BOXES themselves (typed
// value) — "400000" reads as "4,00,000" while typing, not just in the
// result tables.
const formatAmountInput = (v: number): string => (v === 0 ? '0' : Math.round(v).toLocaleString('en-IN'));
const parseAmountInput = (raw: string): number => {
  const n = Number(raw.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

// Trims a trailing ".00" (or any trailing zeros after the decimal point) —
// "5.00 L" reads as clutter next to a clean "5 L"; "5.50 L" still needs
// its ".5", so only the trailing zeros themselves are stripped.
const trimDecimal = (x: number): string => x.toFixed(2).replace(/\.?0+$/, '');

// Indian-numbering shorthand shown at the end of every amount field —
// "1500000" alone doesn't read at a glance; "15 L" does. Cr only shows up
// in practice right at the 1-Crore slider ceiling.
const compactINR = (n: number): string => {
  const v = Math.max(0, Math.round(n || 0));
  if (v >= 10000000) return `${trimDecimal(v / 10000000)} Cr`;
  if (v >= 100000) return `${trimDecimal(v / 100000)} L`;
  if (v >= 1000) return `${trimDecimal(v / 1000)} K`;
  return '';
};

const ordinal = (n: number): string => {
  const j = n % 10, k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
};

const parseDate = (s: string): Date | null => {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const addMonths = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
};

const formatDMY = (d: Date | null): string =>
  d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : '—';

const todayISO = (): string => new Date().toISOString().slice(0, 10);

// Fires showPicker() on both click AND focus — a plain onClick alone opens
// the calendar when the browser-drawn icon is clicked, but clicking into
// the day/month/year text segments only moves focus between them without
// reopening it. Focus fires for that case too, so pairing the two covers
// "click anywhere in the field." Wrapped in try/catch — showPicker() throws
// if called without an active user gesture or while already open.
const openPicker = (e: React.SyntheticEvent<HTMLInputElement>) => {
  try { e.currentTarget.showPicker?.(); } catch { /* already open / no gesture — ignore */ }
};

// ── module-scope form field helpers — same "outside the component" rule
//    the Employee CRUD page documents: an inline component here would get a
//    new identity every render (every field change re-renders the page),
//    which would remount the input and drop focus mid-edit. ─────────────
// backgroundColor (the theme's normal input surface) + a separate, very
// low-opacity emerald backgroundImage gradient layered on top of it — every
// Payment Details field box (amount inputs, date pickers, the Remaining
// Booking Amount pair) gets a light gradient tint this way, in both themes,
// without needing an isDark branch: on the near-white light input surface
// it reads as a soft mint wash, on the near-black dark one as a subtle
// emerald glow. Text stays high-contrast either way since the base
// t.inputBg color (and t.inputText) are untouched — only a translucent
// tint sits on top of it.
const getFieldStyle = (t: Theme): React.CSSProperties => ({
  width: '100%',
  backgroundColor: t.inputBg,
  backgroundImage: 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(45,212,191,0.06))',
  border: `1px solid ${t.inputBorder}`, borderRadius: 9,
  padding: '6px 9px', fontSize: 11, color: t.inputText, outline: 'none', fontFamily: t.fontFamily,
});

// Fixed 2-line-tall label slot, text bottom-aligned within it — the actual
// fix for the "fields don't line up" problem. Labels vary from 1 line
// ("Booking Date") to 2 ("Remaining Booking Amount (₹)"); with a plain
// `display:block` label, a 1-line neighbour's input sits higher than a
// 2-line neighbour's input in the same grid row, so nothing looked
// aligned. Reserving the same height for every label regardless of its
// own line count means every input in a row starts at the same Y.
const getLabelStyle = (t: Theme): React.CSSProperties => ({
  display: 'flex', alignItems: 'flex-end', minHeight: 26, fontSize: 10.5, lineHeight: 1.2,
  fontWeight: 600, color: t.textPrimary, marginBottom: 3,
});

// Every field lives in ONE CSS grid (not several manually-sized flex-wrap
// rows) — grid columns are equal width by construction and the browser
// decides how many fit per row, so there's no per-field width bookkeeping
// and no ragged trailing gap on the last row of each group.
const FieldWrap: React.FC<{ t: Theme; label: string; span?: number; className?: string; children: React.ReactNode }> = ({ t, label, span, className, children }) => (
  <div className={className} style={span ? { gridColumn: `span ${span}` } : undefined}>
    <label style={getLabelStyle(t)}>{label}</label>
    {children}
  </div>
);

// Amount / count field, optionally with a synced range slider underneath.
// Typing in the text box and dragging the slider (when present) both
// update the same state. While the slider is being dragged (mouse or
// touch), a small value bubble tracks the thumb so the number is visible
// without looking away at the text box above. Month-count fields
// (Total EMI Tenure, Booster Intervals) pass noSlider — a slider adds
// nothing once the count is a small, precisely-typed number, and it was
// easy to fat-finger the interval fields while dragging.
const SliderField: React.FC<{
  t: Theme; label: string; value: number; onChange: (v: number) => void;
  min?: number; max: number; step?: number; prefix?: string; suffix?: string;
  extra?: React.ReactNode; span?: number; noSlider?: boolean;
  // Optional hard HTML character-count cap on the typed text box — opt-in
  // per field (undefined everywhere except Total EMI Tenure, which needs a
  // 2-digit/max-99 restriction) so no other field's typing behavior changes.
  maxLength?: number;
}> = ({ t, label, value, onChange, min = 0, max, step = 1, prefix, suffix, extra, span, noSlider, maxLength }) => {
  const [dragging, setDragging] = useState(false);
  const sliderMax = Math.max(max, min + step);
  const clamped = Math.min(Math.max(value, min), sliderMax);
  const percent = sliderMax > min ? ((clamped - min) / (sliderMax - min)) * 100 : 0;
  const bubbleText = prefix ? formatINR(value) : suffix ? `${value} ${suffix}` : String(value);
  // Amount fields (prefix="₹") get the Lakh/K shorthand at the end of the
  // row automatically — every ₹ field shows it, not just the ones a caller
  // opts into, so callers never need a separate flag for it.
  const compact = prefix ? compactINR(value) : '';
  const displayValue = prefix ? formatAmountInput(value) : (value === 0 ? '0' : String(value));

  return (
    <FieldWrap t={t} label={label} span={span}>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5" style={{ ...getFieldStyle(t), padding: '0 10px', flex: 1, minWidth: 0 }}>
          {prefix && <span style={{ color: t.textSecondary, flexShrink: 0 }}>{prefix}</span>}
          <input
            type="text" inputMode="decimal" value={displayValue} maxLength={maxLength}
            onChange={(e) => onChange(parseAmountInput(e.target.value))}
            style={{ border: 'none', outline: 'none', background: 'transparent', padding: '6px 0', width: '100%', minWidth: 0, color: t.inputText, fontSize: 11, fontFamily: t.fontFamily }}
          />
          {compact && <span style={{ color: '#4338ca', fontWeight: 700, fontSize: 9, flexShrink: 0, whiteSpace: 'nowrap' }}>{compact}</span>}
          {suffix && <span style={{ color: t.textSecondary, flexShrink: 0, whiteSpace: 'nowrap' }}>{suffix}</span>}
        </div>
        {extra}
      </div>
      {/* marginTop/the bubble's slot are always reserved at a fixed size —
          toggling them only on `dragging` (as before) shifted the range
          input itself (and everything below it) up/down by ~14px the
          instant a drag started or ended. Visibility toggles instead, so
          the layout height never changes. */}
      {!noSlider && (
        <div style={{ position: 'relative', marginTop: 17 }}>
          <div
            style={{
              position: 'absolute', top: -16, left: `${percent}%`, transform: 'translateX(-50%)',
              background: '#4338ca', color: '#fff', fontSize: 9, fontWeight: 700, lineHeight: 1,
              padding: '3px 7px', borderRadius: 6, whiteSpace: 'nowrap', pointerEvents: 'none',
              visibility: dragging ? 'visible' : 'hidden',
            }}
          >
            {bubbleText}
          </div>
          <input
            type="range" min={min} max={sliderMax} step={step} value={clamped}
            onChange={(e) => onChange(Number(e.target.value))}
            onMouseDown={() => setDragging(true)} onMouseUp={() => setDragging(false)}
            onTouchStart={() => setDragging(true)} onTouchEnd={() => setDragging(false)}
            onBlur={() => setDragging(false)}
            style={{ width: '100%', display: 'block', accentColor: '#4338ca', cursor: 'pointer' }}
          />
        </div>
      )}
    </FieldWrap>
  );
};

// "Remaining Booking Amount & Date" — a narrower amount box (not the full
// grid-cell width every other amount field gets) paired with a date input,
// under one shared label. No slider here either — this pairs with a date,
// so it behaves like a one-off entry rather than something to be dragged.
//
// hideDate (Customize Scheme overhaul): the date input is hidden per the
// "remove booking/EMI/installment date inputs" ask — the underlying date
// state still exists and still drives the schedule math (defaulted to
// today, see the page's own state init), it's just no longer editable
// here. The amount box widens to fill the row on its own once the date
// input next to it is gone.
const NarrowAmountDateField: React.FC<{
  t: Theme; label: string; amount: number; onAmountChange: (v: number) => void;
  date: string; onDateChange: (v: string) => void; hideDate?: boolean;
}> = ({ t, label, amount, onAmountChange, date, onDateChange, hideDate }) => (
  <FieldWrap t={t} label={label} span={hideDate ? 1 : 2}>
    <div className="flex items-center gap-2">
      {/* K/L/Cr shorthand now sits inside this box (after the input, before
          its closing div) instead of as a sibling out in the row — it used
          to render past the date field entirely, outside the amount box it
          describes. Same placement SliderField already uses for every
          other ₹ field. */}
      <div className="flex items-center gap-1.5" style={{ ...getFieldStyle(t), padding: '0 10px', width: hideDate ? '100%' : 158, flexShrink: 0 }}>
        <span style={{ color: t.textSecondary, flexShrink: 0 }}>₹</span>
        <input
          type="text" inputMode="decimal" value={formatAmountInput(amount)}
          onChange={(e) => onAmountChange(parseAmountInput(e.target.value))}
          style={{ border: 'none', outline: 'none', background: 'transparent', padding: '6px 0', width: '100%', minWidth: 0, color: t.inputText, fontSize: 11, fontFamily: t.fontFamily }}
        />
        {amount > 0 && <span style={{ color: '#4338ca', fontWeight: 700, fontSize: 9, flexShrink: 0, whiteSpace: 'nowrap' }}>{compactINR(amount)}</span>}
      </div>
      {/* Fixed, compact width instead of flex:1 — a date value doesn't need
          (and shouldn't stretch to fill) the rest of the row. */}
      {!hideDate && (
        <input
          type="date" value={date} onClick={openPicker} onFocus={openPicker}
          onChange={(e) => onDateChange(e.target.value)} style={{ ...getFieldStyle(t), width: 128, flexShrink: 0 }}
        />
      )}
    </div>
  </FieldWrap>
);

// A colored, full-bleed header bar for the two OUTPUT panels (EMI Scheme /
// EMI Schedule) — visually distinguishes "results" from the plain white
// Payment Details input panel above them, and carries the panel's headline
// figure (total cost / schedule length) right in the header band.
const ResultPanelHeader: React.FC<{ icon: React.ReactNode; title: string; gradient: string; subtitle: React.ReactNode }> = ({ icon, title, gradient, subtitle }) => (
  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5" style={{ background: gradient }}>
    <div className="flex items-center gap-2">
      <span className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.2)' }}>
        {icon}
      </span>
      <h2 style={{ fontSize: 12, fontWeight: 800, color: '#fff', margin: 0 }}>{title}</h2>
    </div>
    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>{subtitle}</div>
  </div>
);

// ── top summary row — 5 gradient KPI boxes in a single row ─────────────
// Replaces the old 2-figure "Monthly EMI" banner with the 5 numbers a sales
// rep needs at a glance while building a scheme: Total Flat Cost, the two
// pre-possession lump sums combined, the before-possession tenure, and both
// monthly EMI figures. Now built from the same shared StatCard component
// Employee/Customer Details List use (compact + labelFontSize=16), so this
// page's label/value font sizes are pixel-identical to theirs instead of a
// separately hand-tuned card markup drifting to a smaller size over time.
interface SchemeSummaryCard { label: string; value: string; icon: IconType; color: string; }

// "Remaining" moved here from the Payment Details panel's header subtitle —
// it needs to be visible at a glance while a rep is still balancing the
// scheme, not buried inside a panel further down the page ("Remaining
// amount should show on top only"). Shown first so it's the leftmost/most
// prominent card in the row.
const SchemeSummaryRow: React.FC<{
  t: Theme; totalCost: number; remaining: number; bookingAmount: number; remainingBookingAmount: number;
  tenureBefore: number; emiBefore: number; emiAfter: number;
}> = ({ t, totalCost, remaining, bookingAmount, remainingBookingAmount, tenureBefore, emiBefore, emiAfter }) => {
  const cards: SchemeSummaryCard[] = [
    { label: 'Remaining to Allocate', value: formatINR(remaining), icon: MdSavings, color: remaining > 0 ? '#dc2626' : '#16a34a' },
    { label: 'Total Flat Cost', value: formatINR(totalCost), icon: MdHome, color: '#7c3aed' },
    { label: 'Booking + Remaining', value: formatINR(bookingAmount + remainingBookingAmount), icon: MdAccountBalanceWallet, color: '#2563eb' },
    { label: 'EMI Tenure (Before)', value: `${tenureBefore} month${tenureBefore === 1 ? '' : 's'}`, icon: MdSchedule, color: '#0891b2' },
    { label: 'Monthly EMI (Before)', value: formatINR(emiBefore), icon: MdTrendingDown, color: '#ea580c' },
    { label: 'Monthly EMI (After)', value: formatINR(emiAfter), icon: MdTrendingUp, color: '#16a34a' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-4">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} bg="" compact labelFontSize={14}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
      ))}
    </div>
  );
};

// ── Bank loan comparison (fixed 20-year tenure, 8.5% p.a., standard
//    reducing-balance amortization) — "how much would this flat cost if
//    financed by a bank instead of this scheme". Principal is the scheme's
//    own Total Cost of Flat, so the comparison is apples-to-apples against
//    the same flat. Tenure/rate are fixed per the brief, not editable here —
//    surfaced as read-only labels rather than form fields so they can't be
//    mistaken for inputs. ──────────────────────────────────────────────────
const LOAN_TENURE_YEARS = 20;
const LOAN_INTEREST_RATE = 8.5;

interface LoanComparison { monthlyEmi: number; principal: number; totalInterest: number; totalPayable: number; }

function computeLoanComparison(principal: number): LoanComparison {
  if (principal <= 0) return { monthlyEmi: 0, principal: 0, totalInterest: 0, totalPayable: 0 };
  const n = LOAN_TENURE_YEARS * 12;
  const r = LOAN_INTEREST_RATE / 12 / 100;
  const monthlyEmi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totalPayable = monthlyEmi * n;
  return { monthlyEmi, principal, totalInterest: totalPayable - principal, totalPayable };
}

// Compact sidebar version (was BankComparisonPanel, a full-width panel
// buried below the EMI Scheme section) — per explicit request, this now
// sits directly beside the Payment Details form (sticky on desktop, so it
// stays in view while scrolling) instead of requiring a scroll past EMI
// Scheme/Schedule to find it. The Generate PDF button lives at the top of
// THIS card rather than up in the page header, since it's a PDF of this
// exact comparison — co-locating them makes that relationship obvious.
const BankComparisonSidebar: React.FC<{
  t: Theme; isDark: boolean; totalCost: number;
  onGeneratePdf: () => void; generatingPdf: boolean;
}> = ({ t, isDark, totalCost, onGeneratePdf, generatingPdf }) => {
  const loan = useMemo(() => computeLoanComparison(totalCost), [totalCost]);
  const hasCost = totalCost > 0;
  const pdfDisabled = generatingPdf || !hasCost;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, boxShadow: isDark ? 'none' : '0 4px 16px rgba(0,0,0,0.07)' }}>
      <ResultPanelHeader
        icon={<MdAccountBalance size={15} color="#fff" />} title="Bank Loan vs. Our Plan"
        gradient="linear-gradient(135deg,#b91c1c,#dc2626)"
        subtitle={`${LOAN_TENURE_YEARS}yr @ ${LOAN_INTEREST_RATE}%`}
      />
      <div className="p-3.5">
        <button type="button" onClick={onGeneratePdf} disabled={pdfDisabled}
          title="Generate a Bank Loan vs. Interest-Free Model comparison PDF from the Flat Cost above"
          className="print-hide flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-xl text-xs font-bold text-white mb-3.5"
          style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', border: 'none', cursor: pdfDisabled ? 'not-allowed' : 'pointer', opacity: pdfDisabled ? 0.55 : 1 }}>
          <MdPictureAsPdf size={15} /> {generatingPdf ? 'Generating...' : 'Generate PDF'}
        </button>

        {!hasCost ? (
          <div className="rounded-xl px-3 py-5 text-center" style={{ background: t.insetBg, fontSize: 11, color: t.textSecondary }}>
            Enter the Total Cost of Flat to see the bank loan comparison.
          </div>
        ) : (
          <>
            <div className="rounded-xl p-3 mb-2" style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}` }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>
                Bank Loan ({LOAN_TENURE_YEARS} yrs @ {LOAN_INTEREST_RATE}%)
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <span style={{ fontSize: 10.5, color: t.textSecondary }}>Monthly EMI</span>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: t.textPrimary }}>{formatINR(loan.monthlyEmi)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 10.5, color: t.textSecondary }}>Total Payable</span>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: t.textPrimary }}>{formatINR(loan.totalPayable)}</span>
              </div>
            </div>
            <div className="rounded-xl p-3 mb-3" style={{ background: isDark ? 'rgba(22,163,74,0.1)' : '#f0fdf4', border: `1px solid ${isDark ? 'rgba(22,163,74,0.25)' : '#bbf7d0'}` }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>Our Plan (0% Interest)</div>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 10.5, color: t.textSecondary }}>Total Payable</span>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: '#16a34a' }}>{formatINR(totalCost)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: isDark ? 'rgba(220,38,38,0.12)' : '#fef2f2' }}>
              <MdTrendingUp size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
              <span style={{ fontSize: 10.5, color: '#b91c1c', fontWeight: 600 }}>
                Save <strong>{formatINR(loan.totalInterest)}</strong> in interest vs. a bank loan.
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── summary + schedule table primitives ─────────────────────────────────
interface SummaryRow { label: string; amount: number; }
interface ScheduleRow { sr: number; date: Date | null; label: string; amount: number; }

const SummaryTable: React.FC<{ t: Theme; heading: string; rows: SummaryRow[]; total: number; totalLabel: string }> = ({ t, heading, rows, total, totalLabel }) => (
  <div className="mb-3">
    <div style={{ fontSize: 11, fontWeight: 700, color: t.textPrimary, marginBottom: 6 }}>{heading}</div>
    <div style={{ overflowX: 'auto', border: `1px solid ${t.surfaceBorder}`, borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
        <thead>
          <tr style={{ background: t.insetBg }}>
            <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 9.5, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}`, width: 40 }}>#</th>
            <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 9.5, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}` }}>Payment Details</th>
            <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: 9.5, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}` }}>Amount (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: i === 0 ? 'none' : `1px solid ${t.divider}` }}>
              <td style={{ padding: '6px 10px', fontSize: 10.5, color: t.textSecondary }}>{i + 1}</td>
              <td style={{ padding: '6px 10px', fontSize: 11, color: t.textPrimary }}>{r.label}</td>
              <td style={{ padding: '6px 10px', fontSize: 11, color: t.textPrimary, textAlign: 'right', fontWeight: 600 }}>{formatINR(r.amount)}</td>
            </tr>
          ))}
          <tr style={{ borderTop: `1px solid ${t.surfaceBorder}`, background: t.insetBg }}>
            <td colSpan={2} style={{ padding: '7px 10px', fontSize: 11, fontWeight: 700, color: t.textPrimary }}>{totalLabel}</td>
            <td style={{ padding: '7px 10px', fontSize: 11, fontWeight: 800, color: '#4338ca', textAlign: 'right' }}>{formatINR(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const ScheduleTable: React.FC<{ t: Theme; section: 'A' | 'B'; rows: ScheduleRow[]; total: number; totalLabel: string }> = ({ t, section, rows, total, totalLabel }) => (
  <div className="mb-3">
    <div style={{ overflowX: 'auto', border: `1px solid ${t.surfaceBorder}`, borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
        <thead>
          <tr style={{ background: t.insetBg }}>
            <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 9.5, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}`, width: 56 }}>Sr No</th>
            <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 9.5, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}`, width: 110 }}>Inst Date</th>
            <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 9.5, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}` }}>({section}) Mode Of Payment</th>
            <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: 9.5, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}` }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', fontSize: 10.5, color: t.textSecondary }}>No installments in this phase.</td></tr>
          ) : rows.map((r) => (
            <tr key={r.sr} style={{ borderTop: `1px solid ${t.divider}` }}>
              <td style={{ padding: '5px 10px', fontSize: 10.5, color: t.textSecondary }}>{r.sr}</td>
              <td style={{ padding: '5px 10px', fontSize: 10.5, color: t.textPrimary, whiteSpace: 'nowrap' }}>{formatDMY(r.date)}</td>
              <td style={{ padding: '5px 10px', fontSize: 10.5, color: t.textPrimary }}>{r.label}</td>
              <td style={{ padding: '5px 10px', fontSize: 10.5, color: t.textPrimary, textAlign: 'right', fontWeight: 600 }}>{formatINR(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div style={{ fontSize: 11, fontWeight: 700, color: t.textPrimary, marginTop: 6 }}>
      {totalLabel} : <span style={{ color: '#4338ca' }}>{formatINR(total)}</span>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────
const CustomizeSchemePage: React.FC = () => {
  const { mode: themeMode } = useAppSelector((s) => s.theme);
  const isDark = themeMode === 'dark';
  const t = getTheme(isDark);

  const [totalCost, setTotalCost] = useState(0);

  const [bookingDate, setBookingDate] = useState(todayISO());
  const [bookingAmount, setBookingAmount] = useState(0);

  const [remainingBookingAmount, setRemainingBookingAmount] = useState(0);
  const [remainingBookingDate, setRemainingBookingDate] = useState(todayISO());

  const [possessionAmount, setPossessionAmount] = useState(0);

  const [monthlyEmiBeforePossession, setMonthlyEmiBeforePossession] = useState(0);
  const [installmentDate, setInstallmentDate] = useState(todayISO());
  const [totalEmiTenure, setTotalEmiTenure] = useState(0);
  const [monthlyEmiAfterPossession, setMonthlyEmiAfterPossession] = useState(0);

  const [boosterAmountBeforePossession, setBoosterAmountBeforePossession] = useState(0);
  const [boosterIntervalBeforePossession, setBoosterIntervalBeforePossession] = useState(0);
  const [boosterAmountAfterPossession, setBoosterAmountAfterPossession] = useState(0);
  const [boosterIntervalAfterPossession, setBoosterIntervalAfterPossession] = useState(0);

  // Detailed EMI Schedule table is collapsed by default — "below scheme row
  // should [be] visible on click of a button" — the EMI Scheme summary
  // stays visible; only the long row-by-row Schedule table hides behind
  // this toggle.
  const [showSchedule, setShowSchedule] = useState(false);

  // ── the whole EMI Scheme + EMI Schedule, recomputed live on every field
  //    change — see the file-header note on the direct-input + greedy-
  //    consumption model this now uses (mirrors the real Customer Scheme
  //    page's backend scheduleGenerator.ts). ──────────────────────────────
  const computed = useMemo(() => {
    const tenure = Math.max(0, Math.round(totalEmiTenure));
    const bookingD = parseDate(bookingDate);
    const remainingD = parseDate(remainingBookingDate);
    const firstEmiD = parseDate(installmentDate);
    const daysDiff = bookingD && remainingD ? Math.round((remainingD.getTime() - bookingD.getTime()) / 86400000) : null;
    const remainingLabel = daysDiff != null && daysDiff > 0 ? `After ${daysDiff} days from booking` : 'Remaining Booking Amount';

    // ── Section A (Before Possession) — Booking + Remaining Booking, then
    //    exactly `tenure` EMIs of `monthlyEmiBeforePossession` starting ON
    //    the Installment Date itself (not the month after it), each with a
    //    booster payment folded in every Nth EMI, then Possession Amount. ──
    const beforeRows: ScheduleRow[] = [];
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

    // ── Section B (After Possession) — greedily consumes whatever's left
    //    of Total Cost of Flat in Monthly-EMI-After-sized chunks (+
    //    booster every Nth one), so booking a bigger booking/booster
    //    amount up front — or a bigger EMI-after — always shortens this
    //    phase, and a smaller one always lengthens it. The last chunk is
    //    recorded as the exact leftover if it's less than one full EMI,
    //    so the running total NEVER over- or under-shoots Total Cost of
    //    Flat. ────────────────────────────────────────────────────────────
    const remainingFlatAmount = Math.max(0, totalCost - totalA);
    const afterStartDate = lastBeforeDate ? addMonths(lastBeforeDate, 1) : null;
    const afterRows: ScheduleRow[] = [];
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
    // Same simplification the backend scheduleGenerator.ts uses for its
    // summary split — the plain-EMI portion is whatever's left of totalB
    // after subtracting the booster occurrences' share, so the two summary
    // rows always add up to exactly totalB (including any partial final
    // installment) rather than an approximation that could drift from it.
    const boosterOccAfter = boosterIntervalAfterPossession > 0 ? Math.floor(afterCount / boosterIntervalAfterPossession) : 0;
    const boosterTotalAfter = boosterAmountAfterPossession * boosterOccAfter;
    const emiOnlyTotalAfter = totalB - boosterTotalAfter;

    // ── Summary (EMI Scheme) rows ──────────────────────────────────────
    const summaryA: SummaryRow[] = [
      { label: 'Booking Amount', amount: bookingAmount },
      { label: remainingLabel, amount: remainingBookingAmount },
      { label: `${ordinal(1)} EMI's (${formatINR(monthlyEmiBeforePossession)} x ${tenure})`, amount: monthlyEmiBeforePossession * tenure },
      { label: `After every ${boosterIntervalBeforePossession} EMI's, additional Rs. ${formatINR(boosterAmountBeforePossession)} (x ${boosterOccBefore})`, amount: boosterAmountBeforePossession * boosterOccBefore },
      { label: 'At the time of possession (one-time payment)', amount: possessionAmount },
    ];
    const summaryB: SummaryRow[] = [
      { label: `${ordinal(2)} EMI's (${formatINR(monthlyEmiAfterPossession)} x ${afterCount} months)`, amount: emiOnlyTotalAfter },
      { label: `After every ${boosterIntervalAfterPossession} EMI's, additional Rs. ${formatINR(boosterAmountAfterPossession)} (x ${boosterOccAfter})`, amount: boosterTotalAfter },
    ];

    const grandTotal = totalA + totalB;

    return { tenure, afterCount, summaryA, summaryB, totalA, totalB, grandTotal, beforeRows, afterRows };
  }, [
    totalCost, bookingDate, bookingAmount, remainingBookingAmount, remainingBookingDate,
    possessionAmount, installmentDate, monthlyEmiBeforePossession, monthlyEmiAfterPossession,
    totalEmiTenure, boosterAmountBeforePossession, boosterIntervalBeforePossession,
    boosterAmountAfterPossession, boosterIntervalAfterPossession,
  ]);

  const costMismatch = totalCost > 0 && Math.round(computed.grandTotal) !== Math.round(totalCost);
  const remaining = Math.max(0, totalCost - computed.totalA);

  const handlePrint = () => window.print();

  // ── Generate Scheme PDF — "Traditional Bank Loan VS. Our Interest-Free
  // Model" comparison, built purely from the Flat Cost already entered
  // above (Total Cost of Flat). See schemePdfExport.ts for the calculation
  // and layout; this handler only validates the input and manages the
  // button's loading/error state (async because the PDF embeds the logo,
  // which has to be fetched first).
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const handleGeneratePdf = async () => {
    if (!totalCost || totalCost <= 0 || !Number.isFinite(totalCost)) {
      toast.error('Enter a valid Flat Cost (Total Cost of Flat) before generating the PDF.');
      return;
    }
    setGeneratingPdf(true);
    try {
      await exportSchemePdf(totalCost);
    } catch {
      toast.error('Failed to generate the PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div style={{ fontFamily: t.fontFamily }}>

      {/* ── Page header + Print action (Generate PDF now lives in the Bank
          Loan sidebar card below, next to the comparison it produces) ──── */}
      <div className="flex items-center justify-end mb-3 print-hide">
        <button type="button" onClick={handlePrint}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold"
          style={{ background: t.btnSecondaryBg, color: t.btnSecondaryText, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer' }}>
          <MdPrint size={15} /> Print Scheme
        </button>
      </div>

      {/* ── Top summary row — Remaining shown here ONLY (moved out of the
          Payment Details panel below), alongside 5 more gradient KPI boxes ── */}
      <SchemeSummaryRow
        t={t} totalCost={totalCost} remaining={remaining} bookingAmount={bookingAmount} remainingBookingAmount={remainingBookingAmount}
        tenureBefore={computed.tenure} emiBefore={monthlyEmiBeforePossession} emiAfter={monthlyEmiAfterPossession}
      />

      {/* ── Payment Details (left) + Bank Loan Comparison (right sidebar) ──
          Two columns on desktop (lg+) so the bank comparison + Generate PDF
          button stay visible right beside the Flat Cost field the moment
          it's entered, without scrolling past EMI Scheme/Schedule below.
          `lg:sticky lg:top-4` keeps the sidebar in view while the (taller)
          Payment Details form scrolls past it. Below lg, this collapses to
          a single column — the sidebar naturally stacks under the form
          (order in the DOM), still far higher on the page than its old spot
          after the EMI Scheme section. ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 items-start">
        <div className="lg:col-span-2">
          {/* Gradient header band (same card pattern as the EMI Scheme/
              Schedule result panels below) PLUS a soft emerald/teal wash
              behind the fields themselves (fading to plain surfaceBg toward
              the bottom) — makes this INPUT panel clearly distinguishable at
              a glance from the plain-white-bodied EMI Scheme/Schedule OUTPUT
              panels below it, not just by its header. The tinted emerald
              border replaces the neutral one for the same reason. Every
              field/handler is untouched — each input keeps its own solid
              t.inputBg background (see getFieldStyle), so label/value/icon
              contrast against the wash is unaffected either theme. */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: t.surfaceBg,
              border: `1px solid ${isDark ? 'rgba(16,185,129,0.28)' : '#a7f3d0'}`,
              boxShadow: isDark ? '0 4px 20px rgba(5,150,105,0.18)' : '0 10px 28px rgba(5,150,105,0.14)',
            }}
          >
            <ResultPanelHeader
              icon={<MdPayments size={15} color="#fff" />} title="Payment Details"
              gradient="linear-gradient(135deg,#059669,#10b981,#0d9488)"
              // "Remaining" now lives ONLY in the top KPI row (SchemeSummaryRow)
              // — kept out of this panel's own header so it isn't shown twice.
              subtitle={totalCost > 0 ? `Total Cost of Flat: ${formatINR(totalCost)}` : 'Enter the scheme inputs below'}
            />
            <div
              className="p-4"
              style={{
                background: isDark
                  ? 'linear-gradient(180deg, rgba(5,150,105,0.12) 0%, rgba(13,148,136,0.05) 45%, transparent 100%)'
                  : 'linear-gradient(180deg, #ecfdf5 0%, #f0fdfa 45%, #ffffff 100%)',
              }}
            >
              {/* One grid for every field — equal-width columns, however many
                  fit the container per row, each row's inputs starting at the
                  same Y (see getLabelStyle's fixed label height above). Narrower
                  minmax (was 200px) fits more fields per row on wide screens —
                  matches the "fewer, wider empty rows" complaint. */}
              <div className="grid gap-x-3 gap-y-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))' }}>
                <SliderField t={t} label="Total Cost of Flat (₹)" value={totalCost} onChange={setTotalCost} max={10000000} step={10000} prefix="₹" />
                {/* Booking Date / Remaining Booking Date / Installment Date
                    inputs are hidden per the Customize Scheme overhaul — the
                    schedule keeps computing off these dates internally
                    (defaulted to today at state-init above), they're just no
                    longer editable from this form. */}
                <SliderField t={t} label="Booking Amount (₹)" value={bookingAmount} onChange={setBookingAmount} max={Math.max(totalCost, 100000)} step={10000} prefix="₹" />
                <NarrowAmountDateField
                  t={t} label="Remaining Booking Amount" amount={remainingBookingAmount} onAmountChange={setRemainingBookingAmount}
                  date={remainingBookingDate} onDateChange={setRemainingBookingDate} hideDate
                />
                <SliderField t={t} label="Possession Amount (₹)" value={possessionAmount} onChange={setPossessionAmount} max={Math.max(totalCost, 100000)} step={10000} prefix="₹" />
                <SliderField t={t} label="Monthly EMI Before Possession (₹)" value={monthlyEmiBeforePossession} onChange={setMonthlyEmiBeforePossession} max={300000} step={10000} prefix="₹" />
                {/* Max 99 / 2-digit cap (Task 6) — maxLength blocks typing a 3rd
                    digit, and the onChange clamp covers paste/backspace-then-
                    retype edge cases so the stored value can never exceed 99. */}
                <SliderField t={t} label="Total EMI Tenure Before Possession" value={totalEmiTenure}
                  onChange={(v) => setTotalEmiTenure(Math.min(99, v))} max={99} step={1} suffix="months" noSlider maxLength={2} />
                <SliderField t={t} label="Monthly EMI After Possession (₹)" value={monthlyEmiAfterPossession} onChange={setMonthlyEmiAfterPossession} max={300000} step={10000} prefix="₹" />
                <SliderField t={t} label="Booster Amount Before Possession (₹)" value={boosterAmountBeforePossession} onChange={setBoosterAmountBeforePossession} max={1000000} step={10000} prefix="₹" />
                <SliderField t={t} label="Booster Interval Before Possession" value={boosterIntervalBeforePossession} onChange={setBoosterIntervalBeforePossession} max={24} step={1} suffix="months" noSlider />
                <SliderField t={t} label="Booster Amount After Possession (₹)" value={boosterAmountAfterPossession} onChange={setBoosterAmountAfterPossession} max={1000000} step={10000} prefix="₹" />
                <SliderField t={t} label="Booster Interval After Possession" value={boosterIntervalAfterPossession} onChange={setBoosterIntervalAfterPossession} max={24} step={1} suffix="months" noSlider />
              </div>

              {costMismatch && (
                <div className="flex items-center gap-2 rounded-xl px-3 py-2 mt-3" style={{ background: isDark ? 'rgba(234,88,12,0.12)' : '#fff7ed', color: '#c2410c', fontSize: 10 }}>
                  The scheme below totals {formatINR(computed.grandTotal)}, which doesn't match the Total Cost of Flat ({formatINR(totalCost)}) — adjust the values above until they match
                  {monthlyEmiAfterPossession === 0 && computed.totalA < totalCost ? ' (Monthly EMI After Possession is still 0, so the after-possession balance has nowhere to go yet).' : '.'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-4">
          <BankComparisonSidebar t={t} isDark={isDark} totalCost={totalCost} onGeneratePdf={handleGeneratePdf} generatingPdf={generatingPdf} />
        </div>
      </div>

      {/* ── EMI Scheme summary ──────────────────────────────────────── */}
      <div className="rounded-2xl mb-4 overflow-hidden" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)' }}>
        <ResultPanelHeader
          icon={<MdCalculate size={15} color="#fff" />} title="EMI Scheme"
          gradient="linear-gradient(135deg,#4338ca,#6366f1)"
          subtitle={`Total Cost of Flat: ${formatINR(totalCost)}`}
        />
        <div className="p-4">
          <SummaryTable t={t} heading="A) Mode of Payment (Before Possession)" rows={computed.summaryA} total={computed.totalA} totalLabel="Total (A) (Before Possession)" />
          <SummaryTable t={t} heading="B) After Possession" rows={computed.summaryB} total={computed.totalB} totalLabel="Total (B) (After Possession)" />
          <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: isDark ? 'rgba(67,56,202,0.12)' : '#eef2ff' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textPrimary }}>Total Cost of Flat (A + B)</span>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: '#4338ca' }}>{formatINR(computed.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* ── EMI Schedule — full month-by-month breakdown, collapsed by
          default ("below scheme row should [be] visible on click of a
          button"). The header itself is the toggle, plus an explicit
          button on the right so the click target reads clearly either way. ── */}
      <div className="rounded-2xl mb-4 overflow-hidden" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)' }}>
        <button
          type="button" onClick={() => setShowSchedule((v) => !v)}
          className="w-full text-left" style={{ border: 'none', padding: 0, cursor: 'pointer', display: 'block' }}
        >
          <ResultPanelHeader
            icon={<MdListAlt size={15} color="#fff" />} title="EMI Schedule"
            gradient="linear-gradient(135deg,#059669,#10b981)"
            subtitle={
              <span className="flex items-center gap-1.5">
                {`${computed.tenure} + ${computed.afterCount} months`}
                {showSchedule ? <MdExpandLess size={16} /> : <MdExpandMore size={16} />}
              </span>
            }
          />
        </button>
        {showSchedule && (
          <div className="p-4">
            <ScheduleTable t={t} section="A" rows={computed.beforeRows} total={computed.totalA} totalLabel="(A) Total Before Possession" />
            <ScheduleTable t={t} section="B" rows={computed.afterRows} total={computed.totalB} totalLabel="(B) Total After Possession" />
            <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: isDark ? 'rgba(67,56,202,0.12)' : '#eef2ff' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.textPrimary }}>Total (A + B)</span>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: '#4338ca' }}>{formatINR(computed.grandTotal)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomizeSchemePage;
