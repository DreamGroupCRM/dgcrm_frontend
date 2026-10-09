// EMI Scheme & Schedule — the two tables the office sees on Customize
// Scheme — two stacked accordions on every screen size — plus the
// three money tiles above them. Compact label / amount rows rather than
// wide tables, so nothing scrolls sideways on a phone, with the Before /
// After Possession totals in colour bands.
//
// Both come from GET /customer-portal/bookings/:id/scheme, which runs the
// SAME getCustomerScheme the staff pages use rather than recomputing
// anything here — so the customer and the office can never be reading
// differently-derived numbers off the same booking.
//
// The Schedule additionally overlays the due grid's per-row state, so each
// installment shows Paid / Due / Upcoming. A row settled by an Extra Pay
// advance is struck through rather than hidden, and a row only partly
// covered by leftover advance credit shows what is actually still owed —
// the same treatment the staff-side scheme view gives them.
import React, { useEffect, useMemo, useState } from 'react';
import { CircularProgress } from '@mui/material';
import {
  MdEventNote, MdListAlt, MdCheckCircle, MdErrorOutline, MdSchedule,
  MdTrendingUp, MdAccountBalanceWallet, MdHourglassEmpty, MdDownload,
} from 'react-icons/md';
import { formatDate } from '../../../utils';
import { AccordionSection } from '../../../components/common/Accordion';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import { fetchMyBookingScheme, fetchMyBookingDueGrid } from '../../../services/customerPortalService';
import { DueGridRow } from '../../../services/paymentService';
import { CustomerSchemeData, CustomerSchemeSummaryRow } from '../../../types/index';
import { exportPaymentSchedulePdf } from '../../Admin/CRM/Customer-Details/paymentPdfExport.lazy';
import { useCustomerPortal } from '../CustomerPortalContext';
import { PageHead, Stat, STAT_GRADIENTS, rupee, totalsFromDueGrid, BookingTotals } from '../CustomerPortalUi';

const STATUS_META = {
  paid: { label: 'Paid', icon: MdCheckCircle, color: '#047857', bg: 'rgba(5,150,105,0.12)' },
  due: { label: 'Due', icon: MdErrorOutline, color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
  upcoming: { label: 'Upcoming', icon: MdSchedule, color: '#1f2937', bg: '#FFFF00' },
} as const;

// Before / After Possession totals each get their own colour band so they
// stand out at a glance (same colours as the downloaded PDF). The colours
// live in CustomerPortal.css (.cp-tone-*) so dark mode can switch them to
// white text on a stronger band — dark blue / green text was unreadable on
// the dark background.
type Tone = 'A' | 'B' | 'grand';

const TotalBand: React.FC<{ label: string; value: number; tone: Tone }> = ({ label, value, tone }) => (
  <div className={`cp-total-band cp-tone-${tone}`}>
    <span>{label}</span>
    <span className="cp-num">{rupee(value)}</span>
  </div>
);

// One phase of the EMI Scheme — compact label / amount rows, then its
// coloured total.
const SchemeSection: React.FC<{ heading: string; rows: CustomerSchemeSummaryRow[]; total: number; totalLabel: string; tone: 'A' | 'B' }> = ({ heading, rows, total, totalLabel, tone }) => (
  <div className="cp-scheme-section">
    <div className={`cp-scheme-heading cp-tone-ink-${tone}`}>{heading}</div>
    {rows.map((r, i) => (
      <div key={i} className="cp-scheme-row">
        <span className="cp-scheme-idx">{i + 1}</span>
        <span className="cp-scheme-label">{r.label}</span>
        <span className="cp-num cp-scheme-amt">{rupee(r.amount)}</span>
      </div>
    ))}
    <TotalBand label={totalLabel} value={total} tone={tone} />
  </div>
);

// The full schedule: one continuous numbered list, with the "Before
// Possession" / "After Possession" heading shown ONCE where each phase
// starts and that phase's coloured total where it ends. Collapsed to a
// short preview by default (a 70+ installment schedule does not need every
// row on page load), with a "View all" toggle.
const SCHEDULE_PREVIEW_ROWS = 8;

const ScheduleList: React.FC<{ scheme: CustomerSchemeData; gridRows: DueGridRow[] }> = ({ scheme, gridRows }) => {
  const [expanded, setExpanded] = useState(false);
  const all = useMemo(() => [
    ...scheme.scheduleA.map((r) => ({ ...r, phase: 'A' as const })),
    ...scheme.scheduleB.map((r) => ({ ...r, sr: scheme.scheduleA.length + r.sr, phase: 'B' as const })),
  ], [scheme]);
  const visibleCount = expanded ? all.length : Math.min(all.length, SCHEDULE_PREVIEW_ROWS);
  const lastA = scheme.scheduleA.length - 1;

  if (all.length === 0) return <div className="cp-empty">No installments scheduled.</div>;
  return (
    <>
      <table className="cp-sched">
        <thead>
          <tr><th>#</th><th>Date</th><th>Payment</th><th className="cp-num">Amount</th><th>Status</th></tr>
        </thead>
        <tbody>
          {all.slice(0, visibleCount).map((r, i) => {
            const grid = gridRows[i];
            const settled = !!grid?.settled_via_extra_pay;
            const status = STATUS_META[(grid?.status ?? 'upcoming') as keyof typeof STATUS_META] ?? STATUS_META.upcoming;
            const Icon = status.icon;
            const partial = !settled && typeof grid?.due_amount === 'number' && grid.due_amount > 0 && grid.due_amount < r.amount;
            const strike = settled ? { textDecoration: 'line-through' as const } : undefined;
            return (
              <React.Fragment key={r.sr}>
                {(i === 0 || i === lastA + 1) && (
                  <tr className="cp-sched-phase">
                    <td colSpan={5} className={`cp-tone-ink-${r.phase}`}>{r.phase === 'A' ? 'A) Before Possession' : 'B) After Possession'}</td>
                  </tr>
                )}
                <tr>
                  <td style={strike}>{r.sr}</td>
                  <td className="cp-nowrap" style={strike}>{r.date ? formatDate(r.date) : '—'}</td>
                  <td style={strike}>{r.label}</td>
                  <td className="cp-num" style={{ fontWeight: 600 }}>
                    {rupee(r.amount)}
                    {partial && <div className="cp-due-note">{rupee(grid!.due_amount)} due</div>}
                  </td>
                  <td>
                    <span className={`cp-chip cp-chip-${grid?.status ?? 'upcoming'}`} style={{ background: status.bg, color: status.color }}>
                      <Icon size={11} />{settled ? 'Paid (Adv.)' : status.label}
                    </span>
                  </td>
                </tr>
                {i === lastA && (
                  <tr className="cp-sched-total"><td colSpan={5}><TotalBand label="Total (A) — Before Possession" value={scheme.totalA} tone="A" /></td></tr>
                )}
                {i === all.length - 1 && scheme.scheduleB.length > 0 && (
                  <tr className="cp-sched-total"><td colSpan={5}><TotalBand label="Total (B) — After Possession" value={scheme.totalB} tone="B" /></td></tr>
                )}
                {i === all.length - 1 && (
                  <tr className="cp-sched-total"><td colSpan={5}><TotalBand label="Grand Total (A + B)" value={scheme.grandTotal} tone="grand" /></td></tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      {all.length > SCHEDULE_PREVIEW_ROWS && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 11.5, color: 'var(--cp-text-secondary, #6b7280)' }}>Showing {visibleCount} of {all.length} installments</span>
          <button type="button" className="cp-btn" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Show less' : `View all ${all.length} installments`}
          </button>
        </div>
      )}
    </>
  );
};

const CustomerSchemePage: React.FC = () => {
  const { selectedId } = useCustomerPortal();
  const { t } = useAppearanceTokens();
  const [scheme, setScheme] = useState<CustomerSchemeData | null>(null);
  const [gridRows, setGridRows] = useState<DueGridRow[]>([]);
  const [totals, setTotals] = useState<BookingTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [openScheme, setOpenScheme] = useState(true);
  const [openSchedule, setOpenSchedule] = useState(true);

  useEffect(() => {
    if (selectedId == null) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const [schemeData, grid] = await Promise.all([
          fetchMyBookingScheme(selectedId),
          fetchMyBookingDueGrid(selectedId),
        ]);
        if (cancelled) return;
        setScheme(schemeData);
        setGridRows(grid.rows);
        setTotals(totalsFromDueGrid(grid.rows, grid.extra_pay_total ?? 0));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  if (loading) return <div className="cp-center"><CircularProgress size={28} /></div>;
  if (error || !scheme) return <div className="cp-empty cp-empty-error">We could not load your EMI scheme. Please try again.</div>;

  return (
    <>
      <PageHead title="EMI Scheme & Schedule" />

      <div className="cp-stats">
        <Stat icon={<MdTrendingUp size={19} />} label="Total Flat Cost" value={rupee(totals?.totalCost)} gradient={STAT_GRADIENTS.total} />
        <Stat icon={<MdAccountBalanceWallet size={19} />} label="Payment Completed" value={rupee(totals?.paid)} gradient={STAT_GRADIENTS.paid} />
        <Stat icon={<MdHourglassEmpty size={19} />} label="Payment Pending" value={rupee(totals?.pending)} gradient={STAT_GRADIENTS.pending} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button type="button" className="cp-btn cp-btn-primary" onClick={() => exportPaymentSchedulePdf(scheme)}>
          <MdDownload size={14} /> Download Scheme and Schedule PDF
        </button>
      </div>

      {/* EMI Scheme accordion, EMI Schedule accordion below it — on desktop
          and on mobile alike (CustomerPortal.css). */}
      <div className="cp-scheme-layout">
        <AccordionSection
          theme={t} icon={<MdListAlt size={16} />} title="EMI Scheme" gradient="var(--brand-gradient)"
          open={openScheme} onToggle={() => setOpenScheme((v) => !v)}
        >
          <SchemeSection heading="A) Before Possession" rows={scheme.summaryA} total={scheme.totalA} totalLabel="Total (A) — Before Possession" tone="A" />
          <SchemeSection heading="B) After Possession" rows={scheme.summaryB} total={scheme.totalB} totalLabel="Total (B) — After Possession" tone="B" />
          <TotalBand label="Grand Total (A + B)" value={scheme.grandTotal} tone="grand" />
        </AccordionSection>

        <AccordionSection
          theme={t} icon={<MdEventNote size={16} />} title={`EMI Schedule (${scheme.scheduleA.length + scheme.scheduleB.length})`} gradient="var(--brand-gradient)"
          open={openSchedule} onToggle={() => setOpenSchedule((v) => !v)}
        >
          <ScheduleList scheme={scheme} gridRows={gridRows} />
        </AccordionSection>
      </div>
    </>
  );
};

export default CustomerSchemePage;
