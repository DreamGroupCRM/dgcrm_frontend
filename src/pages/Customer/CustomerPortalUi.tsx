// Small pieces every portal page shares, so the five pages stay about
// their own content rather than each restating the same card/field/stat
// markup. Styling lives in CustomerPortal.css.
import React from 'react';
import { DueGridRow } from '../../services/paymentService';

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

export interface BookingTotals {
  totalCost: number;
  paid: number;
  pending: number;
}

/**
 * Totals for the summary tiles, derived from the due grid.
 *
 * `amount` is what each scheduled row costs and `due_amount` is what is
 * still owed on it (0 once paid, and reduced on the one row an Extra Pay
 * advance partly covers — see the backend's emiRowState). So the schedule's
 * own rows give all three numbers, and they always agree with each other
 * and with what the office sees, rather than being three separate
 * calculations that can drift apart.
 */
export function totalsFromDueGrid(rows: DueGridRow[]): BookingTotals {
  const totalCost = rows.reduce((sum, r) => sum + r.amount, 0);
  const pending = rows.reduce((sum, r) => sum + r.due_amount, 0);
  return { totalCost, paid: Math.max(0, totalCost - pending), pending };
}
