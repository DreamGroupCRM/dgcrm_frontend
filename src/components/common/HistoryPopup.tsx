// ==========================================
// DREAM GROUP CRM - HISTORY POPUP (shared)
// ==========================================
// V_25.0 — the plain Customer Details "Payments History" popup layout,
// shared so every history popup looks the same: purple header, a simple
// two-column "Customer Details" text block (no boxes or banners), then
// titled sections (Payment Details, Refund Details, ...) each with its
// table and a total bar underneath.
import React from 'react';
import { createPortal } from 'react-dom';
import { MdClose } from 'react-icons/md';
import { AppTheme } from '../../styles/theme';

export interface HistoryInfoItem {
  label: string;
  value: React.ReactNode;
  /** green = money in / cost, red = still owed (same as Customer Details). */
  tone?: 'green' | 'red';
}

export const HistoryPopup: React.FC<{
  t: AppTheme;
  title: string;
  onClose: () => void;
  loading?: boolean;
  info: HistoryInfoItem[];
  children: React.ReactNode;
  /** The page's appearance CSS variables (the popup is portaled outside the page). */
  vars?: React.CSSProperties;
}> = ({ t, title, onClose, loading, info, children, vars }) => createPortal(
  <div className="fixed inset-0 flex items-center justify-center p-4" style={{ ...vars, zIndex: 1300, background: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
    <div role="dialog" aria-label={title} className="rounded-2xl w-full" onClick={(e) => e.stopPropagation()}
      style={{ maxWidth: 1000, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, maxHeight: '88vh', overflowY: 'auto' }}>
      <div className="flex items-center justify-between px-5 py-3.5" style={{ background: '#6d28d9', borderRadius: '16px 16px 0 0' }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fff' }}>{title}</div>
        <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', padding: 4, display: 'flex' }}>
          <MdClose size={20} />
        </button>
      </div>
      <div className="p-5">
        {loading ? (
          <p style={{ color: t.textSecondary, fontSize: 12 }}>Loading...</p>
        ) : (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>Customer Details</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 mb-4">
              {info.map((it, i) => (
                <div key={i} style={{ fontSize: 12, color: it.tone === 'green' ? '#16a34a' : it.tone === 'red' ? '#dc2626' : t.textPrimary }}>
                  {it.label}: <strong>{it.value ?? '—'}</strong>
                </div>
              ))}
            </div>
            {children}
          </>
        )}
      </div>
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
