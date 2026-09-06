// ==========================================
// DREAM GROUP CRM - PAYMENT RECEIVED PAGE
// ==========================================
// V_21.0 — this page now shows ONLY approved payments (approval: 'approved'
// hard-coded below, not a toggle) — a payment that hasn't been approved
// yet no longer appears here at all. Review/approve pending payments moved
// to its own dedicated screen, PaymentApprovalsPage.tsx (see Sidebar.tsx's
// "Payment Approvals" entry) — this mirrors the ChangeRequestsPage split
// from each module's own list, and the user's explicit call: pending
// payments must not be visible in this existing screen, and get a
// separate page for approval. Nothing about is_approved's effect on
// due/EMI/remaining-balance math changed — those calculations still count
// a payment the moment it's collected, exactly as before.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  MdPayments, MdRefresh, MdSearch,
  MdChevronLeft, MdChevronRight, MdKeyboardDoubleArrowLeft, MdKeyboardDoubleArrowRight,
} from 'react-icons/md';

import { useAppDispatch } from '../../../../hooks';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { AppTheme } from '../../../../styles/theme';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import StatCard from '../../../../components/masters/StatCard';
import { fetchPaymentList, paymentForLabel, PaymentListRow } from '../../../../services/paymentService';
import { formatLastLogin } from '../../../../utils';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
type Theme = AppTheme;

const rupee = (n: number): string => `₹ ${n.toLocaleString('en-IN')}`;

const PaymentReceivedPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isDark, t, cssVars } = useAppearanceTokens();

  const [rows, setRows] = useState<PaymentListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  // Debounced so typing a search term doesn't fire a real backend request
  // on every keystroke — this page is server-paginated/-filtered.
  const debouncedSearch = useDebouncedValue(search, 400);

  useEffect(() => { dispatch(setPageTitle('Payment Received')); }, [dispatch]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPaymentList(page, limit, { approval: 'approved', search: debouncedSearch });
      if (res.success) { setRows(res.rows); setTotal(res.total); }
      else toast.error('Failed to fetch payments.');
    } catch {
      toast.error('Failed to fetch payments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const pageBtns = useMemo(() => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [safePage, totalPages]);

  return (
    <div style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 44, height: 44, background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff' }}>
          <MdPayments size={22} style={{ color: '#4f46e5' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 19.5, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Payment Received</h1>
          <p style={{ fontSize: 11.5, color: t.textSecondary, margin: '2px 0 0' }}>Every approved payment — pending payments are reviewed on the Payment Approvals page</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <StatCard label="Total Received" value={total} icon={MdPayments} color="#7c3aed" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
      </div>

      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex flex-wrap items-center justify-end gap-3 p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, flex: '1 1 200px', maxWidth: 240, minWidth: 0 }}>
              <MdSearch size={18} style={{ color: t.textPrimary, flexShrink: 0 }} />
              <input type="text" placeholder="Search customer or receipt #..." value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 12, width: '100%', minWidth: 0 }} />
            </div>
            <button type="button" onClick={fetchRows} title="Refresh"
              className="flex items-center justify-center rounded-xl"
              style={{ width: 38, height: 38, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
              <MdRefresh size={18} />
            </button>
          </div>
        </div>

        <div className="master-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                {['Receipt #', 'Customer', 'Payment For', 'Amount', 'Company', 'Mode', 'Received By', 'Date', 'Approved By'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading payments...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>No payments found.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap' }}>{r.receipt_number}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap' }}>{r.customer_name || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{paymentForLabel(r.payment_type)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap' }}>{rupee(r.amount)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.company || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.mode_of_payment || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.received_by || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatLastLogin(r.created_at)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11, color: t.textSecondary, whiteSpace: 'nowrap' }}>
                      {r.approved_by_name ? (
                        <>
                          <div style={{ fontWeight: 600, color: t.textPrimary }}>{r.approved_by_name}</div>
                          {r.approved_at && <div style={{ fontSize: 10 }}>{formatLastLogin(r.approved_at)}</div>}
                        </>
                      ) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-4" style={{ borderTop: `1px solid ${t.divider}` }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 11, color: t.textSecondary }}>Rows per page:</span>
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 8, padding: '4px 8px', fontSize: 11, cursor: 'pointer', outline: 'none' }}>
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary }}>
            Showing {total === 0 ? 0 : (safePage - 1) * limit + 1}–{Math.min(safePage * limit, total)} of {total}
          </div>
          <div className="flex-1 flex items-center justify-center gap-1.5">
            <button type="button" disabled={safePage <= 1} onClick={() => setPage(1)}
              className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: safePage <= 1 ? 'not-allowed' : 'pointer', opacity: safePage <= 1 ? 0.5 : 1 }}>
              <MdKeyboardDoubleArrowLeft size={16} />
            </button>
            <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: safePage <= 1 ? 'not-allowed' : 'pointer', opacity: safePage <= 1 ? 0.5 : 1 }}>
              <MdChevronLeft size={18} />
            </button>
            {pageBtns[0] > 1 && <span style={{ color: t.textSecondary, padding: '0 2px' }}>...</span>}
            {pageBtns.map((n) => (
              <button key={n} type="button" onClick={() => setPage(n)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: n === safePage ? '#7c3aed' : t.insetBg, color: n === safePage ? '#fff' : t.textPrimary, border: `1px solid ${n === safePage ? '#7c3aed' : t.surfaceBorder}`, cursor: 'pointer' }}>
                {n}
              </button>
            ))}
            {pageBtns[pageBtns.length - 1] < totalPages && <span style={{ color: t.textSecondary, padding: '0 2px' }}>...</span>}
            <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages ? 0.5 : 1 }}>
              <MdChevronRight size={18} />
            </button>
            <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(totalPages)}
              className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages ? 0.5 : 1 }}>
              <MdKeyboardDoubleArrowRight size={16} />
            </button>
          </div>
          <div style={{ width: 90 }} />
        </div>
      </div>
    </div>
  );
};

export default PaymentReceivedPage;
