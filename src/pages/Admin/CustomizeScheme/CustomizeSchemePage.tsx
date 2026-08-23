// ==========================================
// DREAM GROUP CRM - CUSTOMIZE SCHEME (EMI Scheme & Schedule builder)
// ==========================================
// Replaces the old "Interest Free Calculator" placeholder. Purely a
// client-side calculator — every field below feeds a live useMemo, so
// dragging any slider instantly recomputes both the EMI Scheme summary
// (Section A/B totals) and the full month-by-month EMI Schedule. Nothing
// here is persisted to the backend; it's a what-if tool for a sales rep to
// interactively balance a payment plan against a flat's total cost before
// quoting it to a customer. Every field starts at 0 (dates start at today)
// so the page opens blank rather than pre-filled with a worked example.
//
// The Before/After Possession EMI split (how many of the Total EMI Tenure
// months fall in each phase) is no longer its own input field — it's
// derived from the other fields: given the amount still to be financed
// after Booking/Remaining Booking/Possession are subtracted from Total
// Cost, and the two monthly EMI rates, there's exactly one split of the
// tenure into (before, after) months that makes the numbers add up —
// UNLESS the two rates are equal, in which case any split balances the
// same way and there's no way to recover a specific one from amounts
// alone; that case defaults to splitting the tenure as evenly as possible.
import React, { useMemo, useState } from 'react';
import { MdCalculate, MdPayments, MdListAlt } from 'react-icons/md';

import { useAppSelector } from '../../../hooks';
import { getTheme } from '../../../styles/theme';

type Theme = ReturnType<typeof getTheme>;

const FLAT_TYPES = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', 'Studio', 'Other'];

// ── formatting helpers ─────────────────────────────────────────────────────
const formatINR = (n: number): string => `₹ ${Math.max(0, Math.round(n || 0)).toLocaleString('en-IN')}`;

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
//    new identity every render (every slider drag re-renders the page),
//    which would remount the input and drop focus/drag mid-gesture. ───────
const getFieldStyle = (t: Theme): React.CSSProperties => ({
  width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 10,
  padding: '9px 12px', fontSize: 13.5, color: t.inputText, outline: 'none', fontFamily: t.fontFamily,
});

const getLabelStyle = (t: Theme): React.CSSProperties => ({
  display: 'block', fontSize: 13, fontWeight: 600, color: t.textPrimary, marginBottom: 6,
});

// Fixed, content-appropriate width instead of stretching to fill a grid
// column — the earlier 4-per-row CSS grid made every field (even "₹ 0")
// as wide as the widest column, which looked oversized and sparse. 232px
// comfortably fits an amount/date value and lets the longer labels
// (e.g. "Booster Interval After Possession (Months)") wrap onto 2 lines
// without the field itself needing to be any wider.
const FIELD_WIDTH = 232;

const FieldWrap: React.FC<{ t: Theme; label: string; className?: string; children: React.ReactNode }> = ({ t, label, className, children }) => (
  <div className={className} style={{ width: FIELD_WIDTH, flex: `0 0 ${FIELD_WIDTH}px` }}>
    <label style={getLabelStyle(t)}>{label}</label>
    {children}
  </div>
);

// Amount / count field with a synced range slider underneath — the core
// "use range slider for changing the amount values" requirement. Typing in
// the text box and dragging the slider both update the same state. While
// the slider itself is being dragged (mouse or touch), a small value
// bubble tracks the thumb so the number is visible without looking away
// at the text box above.
const SliderField: React.FC<{
  t: Theme; label: string; value: number; onChange: (v: number) => void;
  min?: number; max: number; step?: number; prefix?: string; suffix?: string;
}> = ({ t, label, value, onChange, min = 0, max, step = 1, prefix, suffix }) => {
  const [dragging, setDragging] = useState(false);
  const sliderMax = Math.max(max, min + step);
  const clamped = Math.min(Math.max(value, min), sliderMax);
  const percent = sliderMax > min ? ((clamped - min) / (sliderMax - min)) * 100 : 0;
  const bubbleText = prefix ? formatINR(value) : suffix ? `${value} ${suffix}` : String(value);

  return (
    <FieldWrap t={t} label={label}>
      <div className="flex items-center gap-2" style={{ ...getFieldStyle(t), padding: '0 12px' }}>
        {prefix && <span style={{ color: t.textSecondary, flexShrink: 0 }}>{prefix}</span>}
        <input
          type="text" inputMode="decimal" value={value === 0 ? '0' : String(value)}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/[^\d.]/g, ''));
            onChange(Number.isFinite(n) ? n : 0);
          }}
          style={{ border: 'none', outline: 'none', background: 'transparent', padding: '9px 0', width: '100%', color: t.inputText, fontSize: 13.5, fontFamily: t.fontFamily }}
        />
        {suffix && <span style={{ color: t.textSecondary, flexShrink: 0, whiteSpace: 'nowrap' }}>{suffix}</span>}
      </div>
      {/* marginTop/the bubble's slot are always reserved at a fixed size —
          toggling them only on `dragging` (as before) shifted the range
          input itself (and everything below it) up/down by ~14px the
          instant a drag started or ended. Visibility toggles instead, so
          the layout height never changes. */}
      <div style={{ position: 'relative', marginTop: 22 }}>
        <div
          style={{
            position: 'absolute', top: -20, left: `${percent}%`, transform: 'translateX(-50%)',
            background: '#4338ca', color: '#fff', fontSize: 11, fontWeight: 700, lineHeight: 1,
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
    </FieldWrap>
  );
};

const DateField: React.FC<{ t: Theme; label: string; value: string; onChange: (v: string) => void }> = ({ t, label, value, onChange }) => (
  <FieldWrap t={t} label={label}>
    <input type="date" value={value} onClick={openPicker} onFocus={openPicker} onChange={(e) => onChange(e.target.value)} style={getFieldStyle(t)} />
  </FieldWrap>
);

const SectionHeader: React.FC<{ t: Theme; icon: React.ReactNode; title: string; color: string }> = ({ t, icon, title, color }) => (
  <div className="flex items-center gap-2.5 mb-5">
    <span className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 30, height: 30, background: `${color}1a`, color }}>
      {icon}
    </span>
    <h2 style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary, margin: 0 }}>{title}</h2>
  </div>
);

// A colored, full-bleed header bar for the two OUTPUT panels (EMI Scheme /
// EMI Schedule) — visually distinguishes "results" from the plain white
// Payment Details input panel above them, and carries the panel's headline
// figure (total cost / schedule length) right in the header band.
const ResultPanelHeader: React.FC<{ icon: React.ReactNode; title: string; gradient: string; subtitle: string }> = ({ icon, title, gradient, subtitle }) => (
  <div className="flex flex-wrap items-center justify-between gap-2 px-5 sm:px-6 py-4" style={{ background: gradient }}>
    <div className="flex items-center gap-2.5">
      <span className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.2)' }}>
        {icon}
      </span>
      <h2 style={{ fontSize: 16.5, fontWeight: 800, color: '#fff', margin: 0 }}>{title}</h2>
    </div>
    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>{subtitle}</div>
  </div>
);

// ── summary + schedule table primitives ─────────────────────────────────
interface SummaryRow { label: string; amount: number; }
interface ScheduleRow { sr: number; date: Date | null; label: string; amount: number; }

const SummaryTable: React.FC<{ t: Theme; heading: string; rows: SummaryRow[]; total: number; totalLabel: string }> = ({ t, heading, rows, total, totalLabel }) => (
  <div className="mb-5">
    <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>{heading}</div>
    <div style={{ overflowX: 'auto', border: `1px solid ${t.surfaceBorder}`, borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
        <thead>
          <tr style={{ background: t.insetBg }}>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}`, width: 40 }}>#</th>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}` }}>Payment Details</th>
            <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 12, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}` }}>Amount (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: i === 0 ? 'none' : `1px solid ${t.divider}` }}>
              <td style={{ padding: '8px 12px', fontSize: 13, color: t.textSecondary }}>{i + 1}</td>
              <td style={{ padding: '8px 12px', fontSize: 13.5, color: t.textPrimary }}>{r.label}</td>
              <td style={{ padding: '8px 12px', fontSize: 13.5, color: t.textPrimary, textAlign: 'right', fontWeight: 600 }}>{formatINR(r.amount)}</td>
            </tr>
          ))}
          <tr style={{ borderTop: `1px solid ${t.surfaceBorder}`, background: t.insetBg }}>
            <td colSpan={2} style={{ padding: '9px 12px', fontSize: 13.5, fontWeight: 700, color: t.textPrimary }}>{totalLabel}</td>
            <td style={{ padding: '9px 12px', fontSize: 13.5, fontWeight: 800, color: '#4338ca', textAlign: 'right' }}>{formatINR(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const ScheduleTable: React.FC<{ t: Theme; section: 'A' | 'B'; rows: ScheduleRow[]; total: number; totalLabel: string }> = ({ t, section, rows, total, totalLabel }) => (
  <div className="mb-5">
    <div style={{ overflowX: 'auto', border: `1px solid ${t.surfaceBorder}`, borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
        <thead>
          <tr style={{ background: t.insetBg }}>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}`, width: 56 }}>Sr No</th>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}`, width: 110 }}>Inst Date</th>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}` }}>({section}) Mode Of Payment</th>
            <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 12, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}` }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', fontSize: 13, color: t.textSecondary }}>No installments in this phase.</td></tr>
          ) : rows.map((r) => (
            <tr key={r.sr} style={{ borderTop: `1px solid ${t.divider}` }}>
              <td style={{ padding: '7px 12px', fontSize: 13, color: t.textSecondary }}>{r.sr}</td>
              <td style={{ padding: '7px 12px', fontSize: 13, color: t.textPrimary, whiteSpace: 'nowrap' }}>{formatDMY(r.date)}</td>
              <td style={{ padding: '7px 12px', fontSize: 13, color: t.textPrimary }}>{r.label}</td>
              <td style={{ padding: '7px 12px', fontSize: 13, color: t.textPrimary, textAlign: 'right', fontWeight: 600 }}>{formatINR(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div style={{ fontSize: 13.5, fontWeight: 700, color: t.textPrimary, marginTop: 8 }}>
      {totalLabel} : <span style={{ color: '#4338ca' }}>{formatINR(total)}</span>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────
const CustomizeSchemePage: React.FC = () => {
  const { mode: themeMode } = useAppSelector((s) => s.theme);
  const isDark = themeMode === 'dark';
  const t = getTheme(isDark);

  const [flatType, setFlatType] = useState('1 BHK');
  const [totalCost, setTotalCost] = useState(0);

  const [bookingDate, setBookingDate] = useState(todayISO());
  const [bookingAmount, setBookingAmount] = useState(0);

  const [remainingBookingAmount, setRemainingBookingAmount] = useState(0);
  const [remainingBookingDate, setRemainingBookingDate] = useState(todayISO());

  const [possessionAmount, setPossessionAmount] = useState(0);
  const [installmentDate, setInstallmentDate] = useState(todayISO());

  const [totalEmiTenure, setTotalEmiTenure] = useState(0);
  const [monthlyEmiBeforePossession, setMonthlyEmiBeforePossession] = useState(0);
  const [monthlyEmiAfterPossession, setMonthlyEmiAfterPossession] = useState(0);

  const [boosterAmountBeforePossession, setBoosterAmountBeforePossession] = useState(0);
  const [boosterIntervalBeforePossession, setBoosterIntervalBeforePossession] = useState(0);
  const [boosterAmountAfterPossession, setBoosterAmountAfterPossession] = useState(0);
  const [boosterIntervalAfterPossession, setBoosterIntervalAfterPossession] = useState(0);

  // ── the whole EMI Scheme + EMI Schedule, recomputed live on every field
  //    change (including every slider drag) — see the file-header note on
  //    how the before/after possession EMI split is derived. ─────────────
  const computed = useMemo(() => {
    const remainingToFinance = Math.max(0, totalCost - bookingAmount - remainingBookingAmount - possessionAmount);

    let beforeCount = 0;
    if (totalEmiTenure > 0) {
      if (monthlyEmiBeforePossession === monthlyEmiAfterPossession) {
        // Rates equal — every split balances the totals identically, so
        // there's no amount-based signal to recover one; split evenly.
        beforeCount = Math.round(totalEmiTenure / 2);
      } else {
        const raw = (remainingToFinance - totalEmiTenure * monthlyEmiAfterPossession) / (monthlyEmiBeforePossession - monthlyEmiAfterPossession);
        beforeCount = Math.round(raw);
      }
      beforeCount = Math.min(totalEmiTenure, Math.max(0, beforeCount));
    }
    const afterCount = Math.max(0, totalEmiTenure - beforeCount);

    const boosterOccBefore = boosterIntervalBeforePossession > 0 ? Math.floor(beforeCount / boosterIntervalBeforePossession) : 0;
    const boosterTotalBefore = boosterOccBefore * boosterAmountBeforePossession;
    const boosterOccAfter = boosterIntervalAfterPossession > 0 ? Math.floor(afterCount / boosterIntervalAfterPossession) : 0;
    const boosterTotalAfter = boosterOccAfter * boosterAmountAfterPossession;

    const emiBeforeTotal = beforeCount * monthlyEmiBeforePossession;
    const emiAfterTotal = afterCount * monthlyEmiAfterPossession;

    const totalA = bookingAmount + remainingBookingAmount + emiBeforeTotal + boosterTotalBefore + possessionAmount;
    const totalB = emiAfterTotal + boosterTotalAfter;
    const grandTotal = totalA + totalB;

    const bookingD = parseDate(bookingDate);
    const remainingD = parseDate(remainingBookingDate);
    const firstEmiD = parseDate(installmentDate);
    const daysDiff = bookingD && remainingD ? Math.round((remainingD.getTime() - bookingD.getTime()) / 86400000) : null;
    const remainingLabel = daysDiff != null && daysDiff > 0 ? `Within ${daysDiff} days from booking` : 'Remaining Booking Amount';

    // Section A — summary rows
    const summaryA: SummaryRow[] = [
      { label: 'Booking Amount', amount: bookingAmount },
      { label: remainingLabel, amount: remainingBookingAmount },
      { label: `${ordinal(1)} EMI's (${formatINR(monthlyEmiBeforePossession)} x ${beforeCount})`, amount: emiBeforeTotal },
      { label: `After every ${boosterIntervalBeforePossession} EMI's, additional Rs. ${formatINR(boosterAmountBeforePossession)} (x ${boosterOccBefore})`, amount: boosterTotalBefore },
      { label: 'At the time of possession (one-time payment)', amount: possessionAmount },
    ];
    // Section B — summary rows
    const summaryB: SummaryRow[] = [
      { label: `${ordinal(2)} EMI's (${formatINR(monthlyEmiAfterPossession)} x ${afterCount} months)`, amount: emiAfterTotal },
      { label: `After every ${boosterIntervalAfterPossession} EMI's, additional Rs. ${formatINR(boosterAmountAfterPossession)} (x ${boosterOccAfter})`, amount: boosterTotalAfter },
    ];

    // Section A — detailed schedule rows
    const beforeRows: ScheduleRow[] = [];
    let sr = 1;
    beforeRows.push({ sr: sr++, date: bookingD, label: 'Booking', amount: bookingAmount });
    beforeRows.push({ sr: sr++, date: remainingD, label: remainingLabel, amount: remainingBookingAmount });
    let lastBeforeDate: Date | null = firstEmiD;
    for (let i = 1; i <= beforeCount; i++) {
      const d = firstEmiD ? addMonths(firstEmiD, i - 1) : null;
      beforeRows.push({ sr: sr++, date: d, label: `${ordinal(i)} EMI`, amount: monthlyEmiBeforePossession });
      if (d) lastBeforeDate = d;
      if (boosterIntervalBeforePossession > 0 && boosterAmountBeforePossession > 0 && i % boosterIntervalBeforePossession === 0) {
        beforeRows.push({ sr: sr++, date: d, label: `Booster (after ${ordinal(i)} EMI)`, amount: boosterAmountBeforePossession });
      }
    }
    beforeRows.push({ sr: sr++, date: lastBeforeDate, label: 'Possession Amount', amount: possessionAmount });

    // Section B — detailed schedule rows, continuing month-by-month right
    // after the last before-possession installment date.
    const afterStartDate = lastBeforeDate ? addMonths(lastBeforeDate, 1) : (firstEmiD ? addMonths(firstEmiD, beforeCount) : null);
    const afterRows: ScheduleRow[] = [];
    sr = 1;
    for (let i = 1; i <= afterCount; i++) {
      const d = afterStartDate ? addMonths(afterStartDate, i - 1) : null;
      afterRows.push({ sr: sr++, date: d, label: `${ordinal(i)} EMI`, amount: monthlyEmiAfterPossession });
      if (boosterIntervalAfterPossession > 0 && boosterAmountAfterPossession > 0 && i % boosterIntervalAfterPossession === 0) {
        afterRows.push({ sr: sr++, date: d, label: `Booster (after ${ordinal(i)} EMI)`, amount: boosterAmountAfterPossession });
      }
    }

    return { beforeCount, afterCount, summaryA, summaryB, totalA, totalB, grandTotal, beforeRows, afterRows };
  }, [
    totalCost, bookingDate, bookingAmount, remainingBookingAmount, remainingBookingDate,
    possessionAmount, installmentDate, monthlyEmiBeforePossession, monthlyEmiAfterPossession,
    totalEmiTenure, boosterAmountBeforePossession, boosterIntervalBeforePossession,
    boosterAmountAfterPossession, boosterIntervalAfterPossession,
  ]);

  const costMismatch = totalCost > 0 && Math.round(computed.grandTotal) !== Math.round(totalCost);

  return (
    <div style={{ fontFamily: t.fontFamily }}>

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 44, height: 44, background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff' }}>
          <MdCalculate size={22} style={{ color: '#4f46e5' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Customize Scheme</h1>
          <p style={{ fontSize: 13, color: t.textSecondary, margin: '2px 0 0' }}>Build an EMI Scheme &amp; Schedule — drag any slider to see it recalculate live</p>
        </div>
      </div>

      {/* ── Payment Details form ────────────────────────────────────── */}
      <div className="rounded-2xl mb-5 p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)' }}>
        <SectionHeader t={t} icon={<MdPayments size={16} />} title="Payment Details" color="#059669" />

        <div className="flex flex-wrap gap-4 mb-4">
          <FieldWrap t={t} label="Flat Type">
            <select value={flatType} onChange={(e) => setFlatType(e.target.value)} style={{ ...getFieldStyle(t), cursor: 'pointer' }}>
              {FLAT_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </FieldWrap>
          <SliderField t={t} label="Total Cost of Flat (₹)" value={totalCost} onChange={setTotalCost} max={50000000} step={10000} prefix="₹" />
          <DateField t={t} label="Booking Date" value={bookingDate} onChange={setBookingDate} />
          <SliderField t={t} label="Booking Amount (₹)" value={bookingAmount} onChange={setBookingAmount} max={Math.max(totalCost, 100000)} step={10000} prefix="₹" />
        </div>

        <div className="flex flex-wrap gap-4 mb-4">
          <SliderField t={t} label="Remaining Booking Amount (₹)" value={remainingBookingAmount} onChange={setRemainingBookingAmount} max={Math.max(totalCost, 100000)} step={10000} prefix="₹" />
          <DateField t={t} label="Remaining Booking Date" value={remainingBookingDate} onChange={setRemainingBookingDate} />
          <SliderField t={t} label="Possession Amount (₹)" value={possessionAmount} onChange={setPossessionAmount} max={Math.max(totalCost, 100000)} step={10000} prefix="₹" />
          <DateField t={t} label="Installment Date (1st EMI)" value={installmentDate} onChange={setInstallmentDate} />
        </div>

        <div className="flex flex-wrap gap-4 mb-4">
          <SliderField t={t} label="Total EMI Tenure (Months)" value={totalEmiTenure} onChange={setTotalEmiTenure} max={120} step={1} suffix="months" />
          <SliderField t={t} label="Monthly EMI Before Possession (₹)" value={monthlyEmiBeforePossession} onChange={setMonthlyEmiBeforePossession} max={300000} step={10000} prefix="₹" />
          <SliderField t={t} label="Monthly EMI After Possession (₹)" value={monthlyEmiAfterPossession} onChange={setMonthlyEmiAfterPossession} max={300000} step={10000} prefix="₹" />
        </div>

        <div className="flex flex-wrap gap-4">
          <SliderField t={t} label="Booster Amount Before Possession (₹)" value={boosterAmountBeforePossession} onChange={setBoosterAmountBeforePossession} max={1000000} step={10000} prefix="₹" />
          <SliderField t={t} label="Booster Interval Before Possession (Months)" value={boosterIntervalBeforePossession} onChange={setBoosterIntervalBeforePossession} max={24} step={1} suffix="months" />
          <SliderField t={t} label="Booster Amount After Possession (₹)" value={boosterAmountAfterPossession} onChange={setBoosterAmountAfterPossession} max={1000000} step={10000} prefix="₹" />
          <SliderField t={t} label="Booster Interval After Possession (Months)" value={boosterIntervalAfterPossession} onChange={setBoosterIntervalAfterPossession} max={24} step={1} suffix="months" />
        </div>

        {costMismatch && (
          <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 mt-5" style={{ background: isDark ? 'rgba(234,88,12,0.12)' : '#fff7ed', color: '#c2410c', fontSize: 12.5 }}>
            The scheme below totals {formatINR(computed.grandTotal)}, which doesn't match the Total Cost of Flat ({formatINR(totalCost)}) — adjust the sliders above until they match.
          </div>
        )}
      </div>

      {/* ── EMI Scheme summary ──────────────────────────────────────── */}
      <div className="rounded-2xl mb-5 overflow-hidden" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)' }}>
        <ResultPanelHeader
          icon={<MdCalculate size={17} color="#fff" />} title="EMI Scheme"
          gradient="linear-gradient(135deg,#4338ca,#6366f1)"
          subtitle={`Total Cost of Flat for ${flatType}: ${formatINR(totalCost)}`}
        />
        <div className="p-5 sm:p-6">
          <SummaryTable t={t} heading="A) Mode of Payment (Before Possession)" rows={computed.summaryA} total={computed.totalA} totalLabel="Total (A) (Before Possession)" />
          <SummaryTable t={t} heading="B) After Possession" rows={computed.summaryB} total={computed.totalB} totalLabel="Total (B) (After Possession)" />
          <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: isDark ? 'rgba(67,56,202,0.12)' : '#eef2ff' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>Total Cost of Flat (A + B)</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#4338ca' }}>{formatINR(computed.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* ── EMI Schedule — full month-by-month breakdown ────────────── */}
      <div className="rounded-2xl mb-5 overflow-hidden" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)' }}>
        <ResultPanelHeader
          icon={<MdListAlt size={17} color="#fff" />} title="EMI Schedule"
          gradient="linear-gradient(135deg,#059669,#10b981)"
          subtitle={`Schedule ${formatINR(totalCost)} for ${flatType} - ${totalEmiTenure} months`}
        />
        <div className="p-5 sm:p-6">
          <ScheduleTable t={t} section="A" rows={computed.beforeRows} total={computed.totalA} totalLabel="(A) Total Before Possession" />
          <ScheduleTable t={t} section="B" rows={computed.afterRows} total={computed.totalB} totalLabel="(B) Total After Possession" />
          <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: isDark ? 'rgba(67,56,202,0.12)' : '#eef2ff' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>Total (A + B)</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#4338ca' }}>{formatINR(computed.grandTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomizeSchemePage;
