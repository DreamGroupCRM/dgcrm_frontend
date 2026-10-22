// ==========================================
// DREAM GROUP CRM - PAYMENT DUE CIRCLES
// ==========================================
// V_25.0 — three coloured boxes (rectangles, 5% corner radius) in one row,
// amounts only, in the page's one colour code (dueColors.ts):
//   red    = overdue
//   green  = due today (unpaid)
//   yellow = upcoming (not due yet — never counted in red)
// V_26.0 — only the boxes that have an amount are shown, each with the
// full amount (₹2,50,000); the meaning is in the tooltip and the label.
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

const DueCircles: React.FC<{ amounts: DueCircleAmounts; size?: number; children?: React.ReactNode }> = ({ amounts, size = 38, children }) => (
  <div role="group" aria-label="Payment status" className="flex items-center" style={{ gap: 4, flexWrap: 'nowrap' }}>
    {ORDER.filter((k) => amounts[k] > 0).map((k) => {
      const c = DUE_STATUS[k];
      const v = amounts[k];
      const text = `${c.label}: ${fullRupee(v)}`;
      return (
        <span key={k} title={text} aria-label={text} role="img"
          className="inline-flex items-center justify-center"
          style={{
            minWidth: Math.round(size * 1.35), height: Math.round(size * 0.7), padding: '0 6px', borderRadius: '5%', flexShrink: 0,
            background: c.bg, color: c.fg, // full colour even at ₹0 — a faded box made its text unreadable
            fontSize: size < 36 ? 10 : 10.5, fontWeight: 800, letterSpacing: -0.2, whiteSpace: 'nowrap',
            fontVariantNumeric: 'tabular-nums', lineHeight: 1, cursor: 'default',
          }}>
          {fullRupee(v)}
        </span>
      );
    })}
    {children}
  </div>
);

export default DueCircles;
