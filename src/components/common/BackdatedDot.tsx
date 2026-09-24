// ==========================================
// DREAM GROUP CRM - BACKDATED PAYMENT DOT
// ==========================================
// A payment is "backdated" when its Received Date (payment_date) was set to
// a calendar day before the day the entry was actually made (created_at) —
// only an admin can pick a past Received Date, so any such gap is an admin
// backdating a receipt. Shown as a small purple dot next to the date, with
// the day the entry was really made on hover. Derived per row from fields
// every payment list already returns, so it works under any filter.
import React from 'react';

const parse = (v: string | null | undefined): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const dmy = (d: Date): string =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

export const isBackdatedPayment = (paymentDate: string | null | undefined, createdAt: string | null | undefined): boolean => {
  const paid = parse(paymentDate);
  const created = parse(createdAt);
  if (!paid || !created) return false;
  return paid.toDateString() !== created.toDateString() && paid < created;
};

export const BackdatedDot: React.FC<{ paymentDate: string | null | undefined; createdAt: string | null | undefined }> = ({ paymentDate, createdAt }) => {
  if (!isBackdatedPayment(paymentDate, createdAt)) return null;
  const created = parse(createdAt) as Date;
  const label = `Backdated entry — entered on ${dmy(created)}`;
  return (
    <span title={label} aria-label={label} role="img"
      style={{ width: 7, height: 7, borderRadius: '50%', background: '#9333ea', flexShrink: 0, display: 'inline-block', cursor: 'help' }} />
  );
};

export default BackdatedDot;
