// ==========================================
// DREAM GROUP CRM - DUE REPORT PAGE
// ==========================================
// GET /api/payments/due-report across every active customer — Booking /
// Possession / Pay-After-Booking / Annual amounts only (EMIAmount and
// AnnualAmount1 are deliberately not part of this report — see
// paymentService.ts / the backend's payment.service.ts getDueReport
// comment). Search + pagination follow the exact "fetch all once,
// client-side search/sort/pagination" pattern DepartmentListPage.tsx uses;
// the Due/Paid pill copies DepartmentListPage's Active/Inactive pill
// styling exactly (rounded-full, background/color pair, small dot).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { MdPayments, MdRefresh, MdSearch, MdGroups } from 'react-icons/md';

import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme } from '../../../../styles/theme';
import { fetchDueReport } from '../../../../services/paymentService';
import { DueReportRow } from '../../../../types/index';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];
type Theme = ReturnType<typeof getTheme>;

const formatAmount = (n: number): string => `₹ ${n.toLocaleString('en-IN')}`;

// Same Active/Inactive pill styling as DepartmentListPage.tsx's status
// column — green when NOT due (paid), red when due.
const DuePill: React.FC<{ isDue: boolean }> = ({ isDue }) => (
  <span
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
    style={{ background: isDue ? '#fef2f2' : '#dcfce7', color: isDue ? '#dc2626' : '#16a34a' }}
  >
    <span className="w-1.5 h-1.5 rounded-full bg-current" />
    {isDue ? 'Due' : 'Paid'}
  </span>
);

const AmountCell: React.FC<{ t: Theme; amount: number; isDue: boolean }> = ({ t, amount, isDue }) => (
  <div className="flex items-center gap-2">
    <span style={{ fontSize: 12, color: t.textPrimary, fontWeight: 600 }}>{formatAmount(amount)}</span>
    <DuePill isDue={isDue} />
  </div>
);

const DueReportPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { mode } = useAppSelector((s) => s.theme);
  const isDark = mode === 'dark';
  const t = getTheme(isDark);

  const [allRows, setAllRows] = useState<DueReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => { dispatch(setPageTitle('Due Report')); }, [dispatch]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchDueReport();
      if (res.success) setAllRows(res.rows ?? []);
      else toast.error('Failed to fetch due report.');
    } catch {
      toast.error('Failed to fetch due report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  // ── search (customer name only, client-side) ────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? allRows.filter((r) => r.customer_name?.toLowerCase().includes(q)) : allRows;
  }, [allRows, search]);

  useEffect(() => { setPage(1); }, [search]);

  // ── summary cards ─────────────────────────────────────────────────────
  const summary = useMemo(() => ({
    total: allRows.length,
    bookingDue: allRows.filter((r) => r.is_booking_amount_due).length,
    possessionDue: allRows.filter((r) => r.is_possession_amount_due).length,
    payAfterDue: allRows.filter((r) => r.is_pay_after_booking_due).length,
    annualDue: allRows.filter((r) => r.is_annual_amount_due).length,
  }), [allRows]);

  // ── pagination — same pattern as DepartmentListPage ─────────────────
  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * limit, safePage * limit);

  const pageBtns = () => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  };

  return (
    <div style={{ fontFamily: t.fontFamily }}>

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 44, height: 44, background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff' }}>
          <MdPayments size={22} style={{ color: '#4f46e5' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 19.5, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Due Report</h1>
          <p style={{ fontSize: 11.5, color: t.textSecondary, margin: '2px 0 0' }}>Booking / Possession / Pay After Booking / Annual amounts due, across all customers</p>
        </div>
      </div>

      {/* ── Summary cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total Customers', value: summary.total, color: '#7c3aed', bg: isDark ? 'rgba(124,58,237,0.12)' : '#f5f3ff' },
          { label: 'Booking Amount Due', value: summary.bookingDue, color: '#dc2626', bg: isDark ? 'rgba(220,38,38,0.12)' : '#fef2f2' },
          { label: 'Possession Amount Due', value: summary.possessionDue, color: '#dc2626', bg: isDark ? 'rgba(220,38,38,0.12)' : '#fef2f2' },
          { label: 'Pay After Booking Due', value: summary.payAfterDue, color: '#dc2626', bg: isDark ? 'rgba(220,38,38,0.12)' : '#fef2f2' },
          { label: 'Annual Amount Due', value: summary.annualDue, color: '#dc2626', bg: isDark ? 'rgba(220,38,38,0.12)' : '#fef2f2' },
        ].map((card) => (
          <div key={card.label} className="flex items-center gap-3 px-4 py-4 rounded-xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
            <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 42, height: 42, background: card.bg }}>
              <MdGroups size={21} style={{ color: card.color }} />
            </div>
            <div className="min-w-0">
              <div style={{ fontSize: 19.5, fontWeight: 800, color: t.textPrimary, lineHeight: 1.1 }}>{loading ? '—' : card.value}</div>
              <div style={{ fontSize: 10.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table panel ──────────────────────────────────────────────── */}
      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: t.textPrimary }}>All Customer Dues</div>
            <div style={{ fontSize: 11, color: t.textSecondary }}>Search by customer name, or refresh for the latest status</div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, width: 240 }}>
              <MdSearch size={18} style={{ color: t.textPrimary, flexShrink: 0 }} />
              <input
                type="text" placeholder="Search by customer name..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 12, width: '100%' }}
              />
            </div>
            <button type="button" onClick={fetchRows} title="Refresh"
              className="flex items-center justify-center rounded-xl"
              style={{ width: 38, height: 38, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
              <MdRefresh size={18} />
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ background: t.insetBg }}>
                {['#', 'Customer Name', 'Booking Amount', 'Possession Amount', 'Pay After Booking', 'Annual Amount'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: t.textSecondary, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading due report...</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>No customers found.</td></tr>
              ) : (
                pageRows.map((r, idx) => (
                  <tr key={r.customer_id} style={{ borderTop: `1px solid ${t.divider}` }}>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: t.textSecondary }}>{(safePage - 1) * limit + idx + 1}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12.5, fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap' }}>{r.customer_name || '—'}</td>
                    <td style={{ padding: '12px 16px' }}><AmountCell t={t} amount={r.booking_amount} isDue={r.is_booking_amount_due} /></td>
                    <td style={{ padding: '12px 16px' }}><AmountCell t={t} amount={r.possession_amount} isDue={r.is_possession_amount_due} /></td>
                    <td style={{ padding: '12px 16px' }}><AmountCell t={t} amount={r.pay_after_booking} isDue={r.is_pay_after_booking_due} /></td>
                    <td style={{ padding: '12px 16px' }}><AmountCell t={t} amount={r.annual_amount} isDue={r.is_annual_amount_due} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* pagination — same pattern as DepartmentListPage */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4" style={{ borderTop: `1px solid ${t.divider}` }}>
          <div className="flex items-center gap-2" style={{ fontSize: 11.5, color: t.textSecondary }}>
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, padding: '4px 8px', color: t.inputText, fontSize: 11.5 }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div style={{ fontSize: 11.5, color: t.textSecondary }}>
            Showing {totalFiltered === 0 ? 0 : (safePage - 1) * limit + 1}–{Math.min(safePage * limit, totalFiltered)} of {totalFiltered}
          </div>

          <div className="flex items-center gap-1.5">
            <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: safePage <= 1 ? 'not-allowed' : 'pointer', opacity: safePage <= 1 ? 0.5 : 1 }}>
              Prev
            </button>
            {pageBtns().map((n) => (
              <button key={n} type="button" onClick={() => setPage(n)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: n === safePage ? '#4338ca' : t.insetBg, color: n === safePage ? '#fff' : t.textPrimary, border: `1px solid ${n === safePage ? '#4338ca' : t.surfaceBorder}`, cursor: 'pointer' }}>
                {n}
              </button>
            ))}
            <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages ? 0.5 : 1 }}>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DueReportPage;
