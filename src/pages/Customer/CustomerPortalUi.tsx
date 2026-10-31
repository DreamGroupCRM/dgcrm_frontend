// Small pieces every portal page shares, so the five pages stay about
// their own content rather than each restating the same card/field/stat
// markup. Styling lives in CustomerPortal.css.
import React, { useEffect, useState } from 'react';
import { MdCheckCircle, MdErrorOutline, MdSchedule } from 'react-icons/md';
import { DueGridRow } from '../../services/paymentService';
import { fetchMyBookingPayments, fetchMyBookingDueGrid } from '../../services/customerPortalService';

export const rupee = (n: number | null | undefined): string =>
  n == null ? '—' : `₹ ${Math.round(n).toLocaleString('en-IN')}`;

export const PageHead: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="cp-page-head">
    <h1 className="cp-page-title">{title}</h1>
    {subtitle && <p className="cp-page-sub">{subtitle}</p>}
  </div>
);

export const Card: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <section className="cp-card">
    <header className="cp-card-head">{icon}{title}</header>
    <div className="cp-card-body">{children}</div>
  </section>
);

export const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <div className="cp-field-label">{label}</div>
    <div className="cp-field-value">{value || '—'}</div>
  </div>
);

export const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string; gradient: string }> = ({ icon, label, value, gradient }) => (
  <div className="cp-stat" style={{ background: gradient }}>
    <span className="cp-stat-icon">{icon}</span>
    <div style={{ minWidth: 0 }}>
      <div className="cp-stat-label">{label}</div>
      <div className="cp-stat-value">{value}</div>
    </div>
  </div>
);

// The three gradients the stat tiles use, kept together so the same idea
// is always the same colour across pages: cost is neutral/brand, money in
// is green, money still owed is amber-red.
export const STAT_GRADIENTS = {
  total: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  paid: 'linear-gradient(135deg, #059669, #10b981)',
  pending: 'linear-gradient(135deg, #dc2626, #f97316)',
} as const;

// V_26.0 — money entered but not yet approved, under the summary tiles.
export const AwaitingNote: React.FC<{ amount?: number; staff?: boolean }> = ({ amount, staff }) => (
  amount && amount > 0 ? (
    <div className="cp-awaiting-note" style={{ fontSize: 12, fontWeight: 600, color: '#b45309', margin: '-4px 0 12px' }}>
      {staff
        ? `${rupee(amount)} entered and awaiting Admin approval — not counted in Payment Completed yet.`
        : `${rupee(amount)} received and awaiting confirmation — it shows in the paid total once confirmed.`}
    </div>
  ) : null
);

// Paid / Due / Upcoming on a schedule row — the portal's chips, also used
// by the staff Customer Scheme view so both read the same.
export const STATUS_META = {
  paid: { label: 'Paid', icon: MdCheckCircle, color: '#047857', bg: 'rgba(5,150,105,0.12)' },
  due: { label: 'Due', icon: MdErrorOutline, color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
  upcoming: { label: 'Upcoming', icon: MdSchedule, color: '#1f2937', bg: '#FFFF00' },
} as const;

export const StatusChip: React.FC<{ row?: DueGridRow }> = ({ row }) => {
  const key = (row?.status ?? 'upcoming') as keyof typeof STATUS_META;
  const status = STATUS_META[key] ?? STATUS_META.upcoming;
  const Icon = status.icon;
  return (
    <span className={`cp-chip cp-chip-${key}`} style={{ background: status.bg, color: status.color }}>
      <Icon size={11} />{row?.settled_via_extra_pay ? 'Paid (Adv.)' : status.label}
    </span>
  );
};

export interface BookingTotals {
  totalCost: number;
  paid: number;
  pending: number;
  /** V_26.0 — entered but not yet approved by Admin (not in paid). */
  awaiting?: number;
}

/**
 * Totals for the summary tiles, derived from the due grid. Paid is the sum
 * of approved payments when the server sends it (V_26.0); the older
 * schedule-based figure below is the fallback.
 *
 * `amount` is what each scheduled row costs and `due_amount` is what is
 * still owed on it (0 once paid, and reduced on the one row an EMI
 * advance partly covers — see the backend's emiRowState). So the schedule's
 * own rows give all three numbers, and they always agree with each other
 * and with what the office sees, rather than being three separate
 * calculations that can drift apart.
 */
export function totalsFromDueGrid(grid: {
  rows: DueGridRow[]; extra_pay_total?: number; approved_paid_total?: number; awaiting_approval_total?: number;
}, flatCost?: number | string | null): BookingTotals {
  const { rows } = grid;
  const extraPay = grid.extra_pay_total ?? 0;
  // V_29.0 (Q1) — the Total Flat Cost entered on the customer is the
  // official figure everywhere (the schedule should add up to it); the
  // schedule's own sum is only the fallback when no cost is recorded.
  const totalCost = Number(flatCost) > 0 ? Number(flatCost) : rows.reduce((sum, r) => sum + r.amount, 0);
  // V_26.0 — only approved payments count as paid; what is entered but
  // still awaiting approval is shown on its own. (The rows keep their
  // Paid / Due status: each payment's EMI allocation is fixed at entry.)
  if (typeof grid.approved_paid_total === 'number') {
    const paid = Math.min(totalCost, grid.approved_paid_total);
    return { totalCost, paid, pending: Math.max(0, totalCost - paid), awaiting: grid.awaiting_approval_total ?? 0 };
  }
  const owed = rows.reduce((sum, r) => sum + r.due_amount, 0);
  // Older servers (no approved_paid_total): paid comes from the schedule itself.
  const scheduleTotal = rows.reduce((sum, r) => sum + r.amount, 0);
  // V_25.0 — Extra Pay is kept separate from EMIs (no schedule row is
  // marked paid by it), but it is money the customer has paid: it counts in
  // Payment Completed and comes off Payment Pending.
  const pending = Math.max(0, owed - extraPay);
  const paid = Math.min(totalCost, Math.max(0, scheduleTotal - owed + extraPay));
  return { totalCost, paid, pending: Number(flatCost) > 0 ? Math.max(0, totalCost - paid) : pending };
}

/**
 * V_29.0 (A5) — the summary tiles' figures for one booking, the same way
 * Payment History worked them out: from the due grid for an active
 * booking; for a cancelled one, its flat amount and approved payments.
 */
export function useBookingTotals(bookingId: string | number | null | undefined, isCancelled: boolean, flatAmount?: number | string | null): BookingTotals | null {
  const [totals, setTotals] = useState<BookingTotals | null>(null);
  useEffect(() => {
    if (bookingId == null) { setTotals(null); return; }
    let stale = false;
    (async () => {
      try {
        if (!isCancelled) {
          const grid = await fetchMyBookingDueGrid(bookingId);
          if (!stale) setTotals(totalsFromDueGrid(grid, flatAmount));
          return;
        }
        const payments = await fetchMyBookingPayments(bookingId);
        if (stale) return;
        setTotals({
          totalCost: Number(flatAmount || 0),
          paid: payments.filter((r) => r.is_approved).reduce((n, r) => n + Number(r.amount || 0), 0),
          pending: 0,
          awaiting: payments.filter((r) => !r.is_approved).reduce((n, r) => n + Number(r.amount || 0), 0),
        });
      } catch { if (!stale) setTotals(null); }
    })();
    return () => { stale = true; };
  }, [bookingId, isCancelled, flatAmount]);
  return totals;
}
