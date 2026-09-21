// EMI Schedule & Scheme — the two tables the office sees on Customize
// Scheme, shown to the customer as two accordions, plus the three money
// tiles above them.
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
import { CustomerSchemeData, CustomerSchemeSummaryRow, CustomerScheduleRow } from '../../../types/index';
import { exportPaymentSchedulePdf } from '../../Admin/CRM/Customer-Details/paymentPdfExport';
import { useCustomerPortal } from '../CustomerPortalContext';
import { PageHead, Stat, STAT_GRADIENTS, rupee, totalsFromDueGrid, BookingTotals } from '../CustomerPortalUi';

const STATUS_META = {
  paid: { label: 'Paid', icon: MdCheckCircle, color: '#059669', bg: 'rgba(5,150,105,0.12)' },
  due: { label: 'Due', icon: MdErrorOutline, color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
  upcoming: { label: 'Upcoming', icon: MdSchedule, color: '#b45309', bg: 'rgba(217,119,6,0.14)' },
} as const;

const SummaryTable: React.FC<{ heading: string; rows: CustomerSchemeSummaryRow[]; total: number; totalLabel: string }> = ({ heading, rows, total, totalLabel }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 7 }}>{heading}</div>
    <div className="cp-table-wrap">
      <table className="cp-table">
        <thead>
          <tr>
            <th style={{ width: 44 }}>#</th>
            <th>Payment Details</th>
            <th className="cp-num">Amount (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{r.label}</td>
              <td className="cp-num">{rupee(r.amount)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={2} style={{ fontWeight: 800 }}>{totalLabel}</td>
            <td className="cp-num" style={{ fontWeight: 800 }}>{rupee(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const ScheduleTable: React.FC<{
  section: 'A' | 'B'; rows: CustomerScheduleRow[]; total: number; totalLabel: string; gridRows?: DueGridRow[];
}> = ({ section, rows, total, totalLabel, gridRows }) => (
  <div style={{ marginBottom: 16 }}>
    <div className="cp-table-wrap">
      <table className="cp-table">
        <thead>
          <tr>
            <th style={{ width: 56 }}>Sr No</th>
            <th>Date</th>
            <th>({section}) Mode Of Payment</th>
            <th className="cp-num">Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 18 }}>No installments in this phase.</td></tr>
          ) : rows.map((r, i) => {
            const grid = gridRows?.[i];
            const settled = !!grid?.settled_via_extra_pay;
            const status = STATUS_META[(grid?.status ?? 'upcoming') as keyof typeof STATUS_META] ?? STATUS_META.upcoming;
            const Icon = status.icon;
            // Part-paid: some of this installment is covered by leftover
            // advance credit, so the full scheduled amount is no longer
            // what is owed.
            const partial = !settled && typeof grid?.due_amount === 'number'
              && grid.due_amount > 0 && grid.due_amount < r.amount;
            return (
              <tr key={r.sr}>
                <td style={{ textDecoration: settled ? 'line-through' : undefined }}>{r.sr}</td>
                <td className="cp-nowrap" style={{ textDecoration: settled ? 'line-through' : undefined }}>
                  {r.date ? formatDate(r.date) : '—'}
                </td>
                <td style={{ textDecoration: settled ? 'line-through' : undefined }}>{r.label}</td>
                <td className="cp-num" style={{ fontWeight: 600 }}>
                  {rupee(r.amount)}
                  {partial && (
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: '#dc2626' }}>
                      {rupee(grid!.due_amount)} due
                    </div>
                  )}
                </td>
                <td>
                  <span className="cp-chip" style={{ background: status.bg, color: status.color }}>
                    <Icon size={12} />{settled ? 'Paid (Advance)' : status.label}
                  </span>
                </td>
              </tr>
            );
          })}
          <tr>
            <td colSpan={3} style={{ fontWeight: 800 }}>{totalLabel}</td>
            <td className="cp-num" style={{ fontWeight: 800 }}>{rupee(total)}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

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
        setTotals(totalsFromDueGrid(grid.rows));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  // The due grid is one flat list covering both phases in order, while the
  // schedule is split into A and B — so B's rows start where A's end.
  const gridForB = useMemo(
    () => gridRows.slice(scheme?.scheduleA.length ?? 0),
    [gridRows, scheme]
  );

  if (loading) return <div className="cp-center"><CircularProgress size={28} /></div>;
  if (error || !scheme) return <div className="cp-empty cp-empty-error">We could not load your EMI scheme. Please try again.</div>;

  return (
    <>
      <PageHead title="EMI Scheme & Schedule" subtitle="Your payment plan and every installment in it" />

      <div className="cp-stats">
        <Stat icon={<MdTrendingUp size={19} />} label="Total Flat Cost" value={rupee(totals?.totalCost)} gradient={STAT_GRADIENTS.total} />
        <Stat icon={<MdAccountBalanceWallet size={19} />} label="Payment Completed" value={rupee(totals?.paid)} gradient={STAT_GRADIENTS.paid} />
        <Stat icon={<MdHourglassEmpty size={19} />} label="Payment Pending" value={rupee(totals?.pending)} gradient={STAT_GRADIENTS.pending} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button type="button" className="cp-btn cp-btn-primary" onClick={() => exportPaymentSchedulePdf(scheme)}>
          <MdDownload size={14} /> Download Schedule PDF
        </button>
      </div>

      <AccordionSection
        theme={t} icon={<MdListAlt size={16} />} title="EMI Scheme" gradient="var(--brand-gradient)"
        open={openScheme} onToggle={() => setOpenScheme((v) => !v)}
      >
        <SummaryTable heading="A) Mode of Payment (Before Possession)" rows={scheme.summaryA} total={scheme.totalA} totalLabel="Total (A) — Before Possession" />
        <SummaryTable heading="B) After Possession" rows={scheme.summaryB} total={scheme.totalB} totalLabel="Total (B) — After Possession" />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800 }}>
          <span>Grand Total (A + B)</span>
          <span>{rupee(scheme.grandTotal)}</span>
        </div>
      </AccordionSection>

      <AccordionSection
        theme={t} icon={<MdEventNote size={16} />} title="EMI Schedule" gradient="var(--brand-gradient)"
        open={openSchedule} onToggle={() => setOpenSchedule((v) => !v)}
      >
        <ScheduleTable section="A" rows={scheme.scheduleA} total={scheme.totalA} totalLabel="(A) Total Before Possession" gridRows={gridRows} />
        <ScheduleTable section="B" rows={scheme.scheduleB} total={scheme.totalB} totalLabel="(B) Total After Possession" gridRows={gridForB} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800 }}>
          <span>Grand Total (A + B)</span>
          <span>{rupee(scheme.grandTotal)}</span>
        </div>
      </AccordionSection>
    </>
  );
};

export default CustomerSchemePage;
