// ==========================================
// DREAM GROUP CRM - PAYMENT DUE CIRCLES
// ==========================================
// V_25.0 — three coloured circles in one row, amounts only:
//   red    = overdue (includes installments due today that are still unpaid)
//   amber  = upcoming (not due yet — never counted in red)
//   green  = received today (Received Date = today, approved or not)
// Large amounts are shortened inside the circle (₹13.95L); the full amount
// and its meaning are in the tooltip and the accessible label.
import React from 'react';

export const compactRupee = (n: number): string => {
  const trim = (x: number) => String(Number(x.toFixed(2)));
  if (n >= 1e7) return `₹${trim(n / 1e7)}Cr`;
  if (n >= 1e5) return `₹${trim(n / 1e5)}L`;
  if (n >= 1e3) return `₹${trim(n / 1e3)}K`;
  return `₹${Math.round(n)}`;
};

const fullRupee = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const CIRCLES = [
  { key: 'overdue', label: 'Overdue', bg: '#dc2626' },
  { key: 'upcoming', label: 'Upcoming', bg: '#b45309' },
  { key: 'today', label: 'Received today', bg: '#15803d' },
] as const;

export type DueCircleAmounts = { overdue: number; upcoming: number; today: number };

const DueCircles: React.FC<{ amounts: DueCircleAmounts; size?: number }> = ({ amounts, size = 50 }) => (
  <div role="group" aria-label="Payment status" className="flex items-center" style={{ gap: 6, flexWrap: 'nowrap' }}>
    {CIRCLES.map((c) => {
      const v = amounts[c.key];
      const text = `${c.label}: ${fullRupee(v)}`;
      return (
        <span key={c.key} title={text} aria-label={text} role="img"
          className="inline-flex items-center justify-center"
          style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            background: c.bg, color: '#fff', opacity: v > 0 ? 1 : 0.35,
            fontSize: size < 46 ? 9.5 : 10.5, fontWeight: 800, letterSpacing: -0.2,
            fontVariantNumeric: 'tabular-nums', lineHeight: 1, cursor: 'default',
          }}>
          {compactRupee(v)}
        </span>
      );
    })}
  </div>
);

export default DueCircles;
