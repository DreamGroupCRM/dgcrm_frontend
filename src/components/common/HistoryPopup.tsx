// ==========================================
// DREAM GROUP CRM - HISTORY POPUP (shared)
// ==========================================
// V_25.0 — one Payment History layout everywhere: purple header, then
// the customer on the left (name, mobile, email, address) and the property
// on the right (project, building, flat, flat amount, paid, pending), an
// optional extra block underneath (e.g. Cancellation Details), then titled
// sections (Payment Details, Refund Details, ...) each with its table and a
// total bar underneath.
import React from 'react';
import { createPortal } from 'react-dom';
import { MdClose } from 'react-icons/md';
import { AppTheme } from '../../styles/theme';

export interface HistoryInfoItem {
  label: string;
  value: React.ReactNode;
  /** green = money in / cost, red = still owed. */
  tone?: 'green' | 'red';
}

const rupee = (n: number | null | undefined): string => (n == null ? '—' : `₹ ${Number(n).toLocaleString('en-IN')}`);

// Left column — the same four lines, in the same order, on every page.
export const customerInfoItems = (c: {
  name: string; code?: string | null; mobile?: string | null; email?: string | null; address?: string | null;
}): HistoryInfoItem[] => [
  { label: 'Name', value: `${c.name}${c.code ? ` (${c.code})` : ''}` },
  { label: 'Mobile No.', value: c.mobile || '—' },
  { label: 'Email', value: c.email || '—' },
  { label: 'Address', value: c.address || '—' },
];

// Right column — the selected booking's own property and amounts. Pending
// is left out where it doesn't apply (a cancelled booking).
export const propertyInfoItems = (p: {
  project?: string | null; building?: string | null; wing?: string | null;
  unitType?: 'flat' | 'shop' | null; unitNo?: string | null;
  flatAmount?: number | null; paid?: number | null; pending?: number | null;
  /** V_26.0 — entered but not yet approved (not in Paid). */
  awaiting?: number | null;
}): HistoryInfoItem[] => [
  { label: 'Project', value: p.project || '—' },
  // V_29.0 — "Wing 1" stays "Wing 1" (it read "Wing 1 Wing").
  { label: 'Building', value: [p.building, p.wing && (/\bwing\b/i.test(p.wing) ? p.wing : `${p.wing} Wing`)].filter(Boolean).join(' · ') || '—' },
  { label: p.unitType === 'shop' ? 'Shop No.' : 'Flat No.', value: p.unitNo || '—' },
  { label: 'Flat Amount', value: rupee(p.flatAmount), tone: 'green' },
  { label: 'Paid Amount', value: rupee(p.paid), tone: 'green' },
  ...(p.pending !== undefined ? [{ label: 'Pending Amount', value: rupee(p.pending), tone: 'red' as const }] : []),
  ...(p.awaiting ? [{ label: 'Awaiting Approval', value: `${rupee(p.awaiting)} (not in Paid yet)` }] : []),
];

const InfoPanel: React.FC<{ t: AppTheme; title: string; items: HistoryInfoItem[]; columns?: 1 | 2 }> = ({ t, title, items, columns = 1 }) => (
  <div className="rounded-xl p-3.5" style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}` }}>
    <div style={{ fontSize: 10.5, fontWeight: 800, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>{title}</div>
    <div className={columns === 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-6' : ''}>
      {items.map((it, i) => (
        <div key={i} className="grid gap-2 py-1" style={{ gridTemplateColumns: '112px 1fr', fontSize: 12, alignItems: 'baseline' }}>
          <span style={{ color: t.textSecondary }}>{it.label}</span>
          <strong style={{ color: it.tone === 'green' ? '#16a34a' : it.tone === 'red' ? '#dc2626' : t.textPrimary, wordBreak: 'break-word' }}>{it.value ?? '—'}</strong>
        </div>
      ))}
    </div>
  </div>
);

// The card itself (header + customer/property + sections). Used inside the
// popup below and, on its own, as the customer portal's Payment History page.
export const HistoryCard: React.FC<{
  t: AppTheme;
  title: string;
  onClose?: () => void;
  loading?: boolean;
  customer: HistoryInfoItem[];
  property: HistoryInfoItem[];
  extra?: { title: string; items: HistoryInfoItem[] };
  children: React.ReactNode;
}> = ({ t, title, onClose, loading, customer, property, extra, children }) => (
  <div className="rounded-2xl w-full" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
    <div className="flex items-center justify-between px-5 py-3.5" style={{ background: 'var(--grad-table-header)', borderRadius: '16px 16px 0 0' }}>
      <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fff' }}>{title}</div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', padding: 4, display: 'flex' }}>
          <MdClose size={20} />
        </button>
      )}
    </div>
    <div className="p-5">
      {loading ? (
        <p style={{ color: t.textSecondary, fontSize: 12 }}>Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <InfoPanel t={t} title="Customer Details" items={customer} />
            <InfoPanel t={t} title="Property Details" items={property} />
          </div>
          {extra && <div className="mb-3"><InfoPanel t={t} title={extra.title} items={extra.items} columns={2} /></div>}
          {children}
        </>
      )}
    </div>
  </div>
);

export const HistoryPopup: React.FC<{
  t: AppTheme;
  title: string;
  onClose: () => void;
  loading?: boolean;
  customer: HistoryInfoItem[];
  property: HistoryInfoItem[];
  extra?: { title: string; items: HistoryInfoItem[] };
  children: React.ReactNode;
  /** The page's appearance CSS variables (the popup is portaled outside the page). */
  vars?: React.CSSProperties;
}> = ({ t, title, onClose, loading, customer, property, extra, children, vars }) => createPortal(
  <div className="fixed inset-0 flex items-center justify-center p-4" style={{ ...vars, zIndex: 1300, background: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
    <div role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 1000, maxHeight: '88vh', overflowY: 'auto', borderRadius: 16 }}>
      <HistoryCard t={t} title={title} onClose={onClose} loading={loading} customer={customer} property={property} extra={extra}>{children}</HistoryCard>
    </div>
  </div>,
  document.body,
);

export const HistorySection: React.FC<{
  t: AppTheme;
  title: string;
  total?: { label: string; value: string; color?: string };
  children: React.ReactNode;
}> = ({ t, title, total, children }) => (
  <div className="mb-5">
    <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>{title}</div>
    {children}
    {total && (
      <div className="flex items-center justify-between rounded-xl px-4 py-3 mt-3" style={{ background: t.insetBg }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--brand-ink)' }}>{total.label}</span>
        <span className="rounded-lg px-3 py-1.5" style={{ border: `1px solid ${total.color ?? '#16a34a'}`, fontSize: 13, fontWeight: 800, color: total.color ?? '#16a34a' }}>
          {total.value}
        </span>
      </div>
    )}
  </div>
);
