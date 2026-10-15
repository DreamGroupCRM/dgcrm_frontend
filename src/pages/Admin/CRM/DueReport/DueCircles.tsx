// ==========================================
// DREAM GROUP CRM - PAYMENT DUE CIRCLES
// ==========================================
// V_25.0 — three coloured circles in one row, amounts only, in the page's
// one colour code (dueColors.ts):
//   red    = overdue
//   green  = due today (unpaid)
//   yellow = upcoming (not due yet — never counted in red)
// Large amounts are shortened inside the circle (₹13.95L); the full amount
// and its meaning are in the tooltip and the accessible label.
import React from 'react';
import { DUE_STATUS, DueStatus } from './dueColors';

export const compactRupee = (n: number): string => {
  const trim = (x: number) => String(Number(x.toFixed(2)));
  if (n >= 1e7) return `₹${trim(n / 1e7)}Cr`;
  if (n >= 1e5) return `₹${trim(n / 1e5)}L`;
  if (n >= 1e3) return `₹${trim(n / 1e3)}K`;
  return `₹${Math.round(n)}`;
};

const fullRupee = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const ORDER: DueStatus[] = ['overdue', 'due_today', 'upcoming'];

export type DueCircleAmounts = Record<DueStatus, number>;

const DueCircles: React.FC<{ amounts: DueCircleAmounts; size?: number }> = ({ amounts, size = 38 }) => (
  <div role="group" aria-label="Payment status" className="flex items-center" style={{ gap: 4, flexWrap: 'nowrap' }}>
    {ORDER.map((k) => {
      const c = DUE_STATUS[k];
      const v = amounts[k];
      const text = `${c.label}: ${fullRupee(v)}`;
      return (
        <span key={k} title={text} aria-label={text} role="img"
          className="inline-flex items-center justify-center"
          style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            background: c.bg, color: c.fg, // full colour even at ₹0 — a faded circle made its text unreadable
            fontSize: size < 36 ? 9 : 9.5, fontWeight: 800, letterSpacing: -0.3,
            fontVariantNumeric: 'tabular-nums', lineHeight: 1, cursor: 'default',
          }}>
          {compactRupee(v)}
        </span>
      );
    })}
  </div>
);

export default DueCircles;
