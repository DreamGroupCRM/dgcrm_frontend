// ==========================================
// DREAM GROUP CRM - CUSTOMIZE SCHEME (EMI Scheme & Schedule builder)
// ==========================================
// Replaces the old "Interest Free Calculator" placeholder. Purely a
// client-side calculator — every field below feeds a live useMemo, so
// dragging any slider instantly recomputes both the EMI Scheme summary
// (Section A/B totals) and the full month-by-month EMI Schedule. Nothing
// here is persisted to the backend; it's a what-if tool for a sales rep to
// interactively balance a payment plan against a flat's total cost before
// quoting it to a customer.
//
// One field is NOT in the reference Payment Details form (the one already
// used on the Customer Details page): "EMIs Before Possession". It's
// required to split the "Total EMI Tenure" between the before-possession
// and after-possession phases — without it the split is mathematically
// undetermined whenever the before/after monthly EMI amounts are equal
// (any split balances the totals). It's just another slider-driven field,
// consistent with the "adjust everything via sliders" spirit of this page.
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

const openPicker = (e: React.MouseEvent<HTMLInputElement>) => e.currentTarget.showPicker?.();

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

const FieldWrap: React.FC<{ t: Theme; label: string; className?: string; children: React.ReactNode }> = ({ t, label, className, children }) => (
  <div className={className}>
    <label style={getLabelStyle(t)}>{label}</label>
    {children}
  </div>
);

// Amount / count field with a synced range slider underneath — the core
// "use range slider for changing the amount values" requirement. Typing in
// the text box and dragging the slider both update the same state.
const SliderField: React.FC<{
  t: Theme; label: string; value: number; onChange: (v: number) => void;
  min?: number; max: number; step?: number; prefix?: string; suffix?: string;
}> = ({ t, label, value, onChange, min = 0, max, step = 1, prefix, suffix }) => (
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
    <input
      type="range" min={min} max={Math.max(max, min + 1)} step={step} value={Math.min(Math.max(value, min), max)}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: '100%', marginTop: 8, accentColor: '#4338ca', cursor: 'pointer' }}
    />
  </FieldWrap>
);

const DateField: React.FC<{ t: Theme; label: string; value: string; onChange: (v: string) => void }> = ({ t, label, value, onChange }) => (
  <FieldWrap t={t} label={label}>
    <input type="date" value={value} onClick={openPicker} onChange={(e) => onChange(e.target.value)} style={getFieldStyle(t)} />
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
  const [totalCost, setTotalCost] = useState(1500000);

  const [bookingDate, setBookingDate] = useState('2026-07-19');
  const [bookingAmount, setBookingAmount] = useState(180000);

  const [remainingBookingAmount, setRemainingBookingAmount] = useState(0);
  const [remainingBookingDate, setRemainingBookingDate] = useState('2026-08-03');

  const [possessionAmount, setPossessionAmount] = useState(0);
  const [installmentDate, setInstallmentDate] = useState('2026-08-05');

  const [monthlyEmiBeforePossession, setMonthlyEmiBeforePossession] = useState(30000);
  const [monthlyEmiAfterPossession, setMonthlyEmiAfterPossession] = useState(30000);

  const [totalEmiTenure, setTotalEmiTenure] = useState(44);
  const [emisBeforePossession, setEmisBeforePossession] = useState(30);

  const [boosterAmountBeforePossession, setBoosterAmountBeforePossession] = useState(0);
  const [boosterIntervalBeforePossession, setBoosterIntervalBeforePossession] = useState(0);
  const [boosterAmountAfterPossession, setBoosterAmountAfterPossession] = useState(0);
  const [boosterIntervalAfterPossession, setBoosterIntervalAfterPossession] = useState(0);

  // ── the whole EMI Scheme + EMI Schedule, recomputed live on every field
  //    change (including every slider drag) — see the file-header note. ──
  const computed = useMemo(() => {
    const beforeCount = Math.max(0, Math.min(emisBeforePossession, totalEmiTenure));
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
    flatType, totalCost, bookingDate, bookingAmount, remainingBookingAmount, remainingBookingDate,
    possessionAmount, installmentDate, monthlyEmiBeforePossession, monthlyEmiAfterPossession,
    totalEmiTenure, emisBeforePossession, boosterAmountBeforePossession, boosterIntervalBeforePossession,
    boosterAmountAfterPossession, boosterIntervalAfterPossession,
  ]);

  const costMismatch = Math.round(computed.grandTotal) !== Math.round(totalCost);

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
      <div className="rounded-2xl mb-5 p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <SectionHeader t={t} icon={<MdPayments size={16} />} title="Payment Details" color="#059669" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <FieldWrap t={t} label="Flat Type">
            <select value={flatType} onChange={(e) => setFlatType(e.target.value)} style={{ ...getFieldStyle(t), cursor: 'pointer' }}>
              {FLAT_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </FieldWrap>
          <SliderField t={t} label="Total Cost of Flat (₹)" value={totalCost} onChange={setTotalCost} max={50000000} step={5000} prefix="₹" />
          <DateField t={t} label="Booking Date" value={bookingDate} onChange={setBookingDate} />
          <SliderField t={t} label="Booking Amount (₹)" value={bookingAmount} onChange={setBookingAmount} max={Math.max(totalCost, 100000)} step={1000} prefix="₹" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <SliderField t={t} label="Remaining Booking Amount (₹)" value={remainingBookingAmount} onChange={setRemainingBookingAmount} max={Math.max(totalCost, 100000)} step={1000} prefix="₹" />
          <DateField t={t} label="Remaining Booking Date" value={remainingBookingDate} onChange={setRemainingBookingDate} />
          <SliderField t={t} label="Possession Amount (₹)" value={possessionAmount} onChange={setPossessionAmount} max={Math.max(totalCost, 100000)} step={1000} prefix="₹" />
          <DateField t={t} label="Installment Date (1st EMI)" value={installmentDate} onChange={setInstallmentDate} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <SliderField t={t} label="Monthly EMI Before Possession (₹)" value={monthlyEmiBeforePossession} onChange={setMonthlyEmiBeforePossession} max={300000} step={500} prefix="₹" />
          <SliderField t={t} label="Monthly EMI After Possession (₹)" value={monthlyEmiAfterPossession} onChange={setMonthlyEmiAfterPossession} max={300000} step={500} prefix="₹" />
          <SliderField t={t} label="Total EMI Tenure (Months)" value={totalEmiTenure} onChange={(v) => setTotalEmiTenure(v)} max={120} step={1} suffix="months" />
          <SliderField
            t={t} label="EMIs Before Possession" value={Math.min(emisBeforePossession, totalEmiTenure)}
            onChange={setEmisBeforePossession} max={totalEmiTenure} step={1} suffix="months"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SliderField t={t} label="Booster Amount Before Possession (₹)" value={boosterAmountBeforePossession} onChange={setBoosterAmountBeforePossession} max={1000000} step={500} prefix="₹" />
          <SliderField t={t} label="Booster Interval Before Possession (Months)" value={boosterIntervalBeforePossession} onChange={setBoosterIntervalBeforePossession} max={24} step={1} suffix="months" />
          <SliderField t={t} label="Booster Amount After Possession (₹)" value={boosterAmountAfterPossession} onChange={setBoosterAmountAfterPossession} max={1000000} step={500} prefix="₹" />
          <SliderField t={t} label="Booster Interval After Possession (Months)" value={boosterIntervalAfterPossession} onChange={setBoosterIntervalAfterPossession} max={24} step={1} suffix="months" />
        </div>

        {costMismatch && (
          <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 mt-5" style={{ background: isDark ? 'rgba(234,88,12,0.12)' : '#fff7ed', color: '#c2410c', fontSize: 12.5 }}>
            The scheme below totals {formatINR(computed.grandTotal)}, which doesn't match the Total Cost of Flat ({formatINR(totalCost)}) — adjust the sliders above until they match.
          </div>
        )}
      </div>

      {/* ── EMI Scheme summary ──────────────────────────────────────── */}
      <div className="rounded-2xl mb-5 p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <SectionHeader t={t} icon={<MdCalculate size={16} />} title="EMI Scheme" color="#4338ca" />
        <div style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary, marginBottom: 16 }}>
          Total Cost of Flat for {flatType}: {formatINR(totalCost)}
        </div>
        <SummaryTable t={t} heading="A) Mode of Payment (Before Possession)" rows={computed.summaryA} total={computed.totalA} totalLabel="Total (A) (Before Possession)" />
        <SummaryTable t={t} heading="B) After Possession" rows={computed.summaryB} total={computed.totalB} totalLabel="Total (B) (After Possession)" />
        <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: isDark ? 'rgba(67,56,202,0.12)' : '#eef2ff' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>Total Cost of Flat (A + B)</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#4338ca' }}>{formatINR(computed.grandTotal)}</span>
        </div>
      </div>

      {/* ── EMI Schedule — full month-by-month breakdown ────────────── */}
      <div className="rounded-2xl mb-5 p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <SectionHeader t={t} icon={<MdListAlt size={16} />} title="EMI Schedule" color="#059669" />
        <div style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary, marginBottom: 16 }}>
          Schedule {formatINR(totalCost)} for {flatType} - {totalEmiTenure} months
        </div>
        <ScheduleTable t={t} section="A" rows={computed.beforeRows} total={computed.totalA} totalLabel="(A) Total Before Possession" />
        <ScheduleTable t={t} section="B" rows={computed.afterRows} total={computed.totalB} totalLabel="(B) Total After Possession" />
        <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: isDark ? 'rgba(67,56,202,0.12)' : '#eef2ff' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>Total (A + B)</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#4338ca' }}>{formatINR(computed.grandTotal)}</span>
        </div>
      </div>
    </div>
  );
};

export default CustomizeSchemePage;
