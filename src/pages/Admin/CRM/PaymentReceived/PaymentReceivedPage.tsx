// ==========================================
// DREAM GROUP CRM - PAYMENT RECEIVED PAGE
// ==========================================
// Every collected payment (POST /api/payments, entered by employees) in
// one grid, with an admin-only Approve action backed by the is_approved
// column AmountTransaction already had — it just had no reader or writer
// anywhere in the app until now (item 16).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  MdPayments, MdRefresh, MdSearch, MdCheckCircle, MdHourglassEmpty, MdVerified,
  MdChevronLeft, MdChevronRight, MdKeyboardDoubleArrowLeft, MdKeyboardDoubleArrowRight,
} from 'react-icons/md';

import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { AppTheme } from '../../../../styles/theme';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import StatCard from '../../../../components/masters/StatCard';
import { fetchPaymentList, approvePayment, bulkApprovePayments, paymentForLabel, PaymentListRow } from '../../../../services/paymentService';
import { isAdminRole } from '../../../../types';
import { formatLastLogin } from '../../../../utils';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
type Theme = AppTheme;

const rupee = (n: number): string => `₹ ${n.toLocaleString('en-IN')}`;

const ApprovalPill: React.FC<{ approved: boolean }> = ({ approved }) => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold"
    style={{ background: approved ? '#dcfce7' : '#ffedd5', color: approved ? '#16a34a' : '#ea580c', fontSize: 11 }}>
    {approved ? <MdVerified size={13} /> : <MdHourglassEmpty size={13} />}
    {approved ? 'Approved' : 'Pending'}
  </span>
);

const PaymentReceivedPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.auth.role);
  const isAdmin = isAdminRole(role);
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
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);

  // Lightweight counts (limit=1, only .total read) — same pattern as
  // Audit History's KPI row.
  const [counts, setCounts] = useState<{ total: number; approved: number; pending: number }>({ total: 0, approved: 0, pending: 0 });

  useEffect(() => { dispatch(setPageTitle('Payment Received')); }, [dispatch]);

  const fetchCounts = useCallback(async () => {
    try {
      const [all, approved, pending] = await Promise.all([
        fetchPaymentList(1, 1),
        fetchPaymentList(1, 1, { approval: 'approved' }),
        fetchPaymentList(1, 1, { approval: 'pending' }),
      ]);
      setCounts({ total: all.total, approved: approved.total, pending: pending.total });
    } catch { /* KPI row just stays at 0 if this fails */ }
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPaymentList(page, limit, {
        approval: approvalFilter === 'all' ? undefined : approvalFilter,
        search: debouncedSearch,
      });
      if (res.success) { setRows(res.rows); setTotal(res.total); }
      else toast.error('Failed to fetch payments.');
    } catch {
      toast.error('Failed to fetch payments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, approvalFilter, debouncedSearch]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);
  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { setPage(1); }, [approvalFilter, debouncedSearch]);
  // Selection is page-scoped (like the Customer List's own row selection) —
  // clear it whenever the visible rows change under it (new page, filter,
  // search, refresh) so a stale id can't get bulk-approved by surprise.
  useEffect(() => { setSelectedIds(new Set()); }, [rows]);

  const handleApprove = async (row: PaymentListRow) => {
    setApprovingId(row.id);
    try {
      await approvePayment(row.id);
      toast.success(`Payment ${row.receipt_number} approved.`);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_approved: true } : r)));
      fetchCounts();
    } catch {
      toast.error('Failed to approve payment.');
    } finally {
      setApprovingId(null);
    }
  };

  const pendingRowIds = useMemo(() => rows.filter((r) => !r.is_approved).map((r) => r.id), [rows]);
  const allPendingSelected = pendingRowIds.length > 0 && pendingRowIds.every((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    setSelectedIds(allPendingSelected ? new Set() : new Set(pendingRowIds));
  };
  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setBulkApproving(true);
    try {
      const res = await bulkApprovePayments(Array.from(selectedIds));
      toast.success(`${res.approved} payment(s) approved.`);
      setSelectedIds(new Set());
      fetchRows();
      fetchCounts();
    } catch {
      toast.error('Failed to approve selected payments.');
    } finally {
      setBulkApproving(false);
    }
  };

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
          <p style={{ fontSize: 11.5, color: t.textSecondary, margin: '2px 0 0' }}>Every payment collected, awaiting admin review</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <StatCard label="Total Payments" value={counts.total} icon={MdPayments} color="#7c3aed" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Approved" value={counts.approved} icon={MdCheckCircle} color="#16a34a" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Pending Approval" value={counts.pending} icon={MdHourglassEmpty} color="#ea580c" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
      </div>

      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <div className="flex items-center rounded-xl p-0.5" style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}` }}>
            {(['all', 'pending', 'approved'] as const).map((v) => (
              <button key={v} type="button" onClick={() => setApprovalFilter(v)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap capitalize"
                style={{ background: approvalFilter === v ? 'var(--grad-purple)' : 'transparent', color: approvalFilter === v ? '#fff' : t.textSecondary, border: 'none', cursor: 'pointer' }}>
                {v}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {isAdmin && selectedIds.size > 0 && (
              <button type="button" disabled={bulkApproving} onClick={handleBulkApprove}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white"
                style={{ background: '#16a34a', border: 'none', cursor: bulkApproving ? 'not-allowed' : 'pointer', opacity: bulkApproving ? 0.7 : 1, whiteSpace: 'nowrap' }}>
                <MdCheckCircle size={15} /> {bulkApproving ? 'Approving...' : `Approve Selected (${selectedIds.size})`}
              </button>
            )}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, width: 240 }}>
              <MdSearch size={18} style={{ color: t.textPrimary, flexShrink: 0 }} />
              <input type="text" placeholder="Search customer or receipt #..." value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 12, width: '100%' }} />
            </div>
            <button type="button" onClick={() => { fetchRows(); fetchCounts(); }} title="Refresh"
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
                {isAdmin && (
                  <th style={{ padding: '12px 14px', width: 36 }}>
                    <input type="checkbox" checked={allPendingSelected} onChange={toggleSelectAll} disabled={pendingRowIds.length === 0}
                      style={{ cursor: pendingRowIds.length === 0 ? 'not-allowed' : 'pointer' }} />
                  </th>
                )}
                {['Receipt #', 'Customer', 'Payment For', 'Amount', 'Company', 'Mode', 'Received By', 'Date', 'Status', 'Approved By', 'Action'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={isAdmin ? 12 : 11} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading payments...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={isAdmin ? 12 : 11} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>No payments found.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                    {isAdmin && (
                      <td style={{ padding: '12px 14px' }}>
                        {!r.is_approved && (
                          <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelectRow(r.id)} style={{ cursor: 'pointer' }} />
                        )}
                      </td>
                    )}
                    <td style={{ padding: '12px 14px', fontSize: 11.5, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap' }}>{r.receipt_number}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap' }}>{r.customer_name || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{paymentForLabel(r.payment_type)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap' }}>{rupee(r.amount)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.company || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.mode_of_payment || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.received_by || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatLastLogin(r.created_at)}</td>
                    <td style={{ padding: '12px 14px' }}><ApprovalPill approved={r.is_approved} /></td>
                    <td style={{ padding: '12px 14px', fontSize: 11, color: t.textSecondary, whiteSpace: 'nowrap' }}>
                      {r.is_approved && r.approved_by_name ? (
                        <>
                          <div style={{ fontWeight: 600, color: t.textPrimary }}>{r.approved_by_name}</div>
                          {r.approved_at && <div style={{ fontSize: 10 }}>{formatLastLogin(r.approved_at)}</div>}
                        </>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {!r.is_approved && isAdmin ? (
                        <button type="button" disabled={approvingId === r.id} onClick={() => handleApprove(r)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: '#16a34a', cursor: approvingId === r.id ? 'not-allowed' : 'pointer' }}>
                          <MdCheckCircle size={13} /> {approvingId === r.id ? 'Approving...' : 'Approve'}
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: t.textSecondary }}>—</span>
                      )}
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
