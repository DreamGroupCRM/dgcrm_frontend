// ==========================================
// DREAM GROUP CRM - PAYMENT APPROVALS PAGE
// ==========================================
// V_21.0 — dedicated review queue for payments awaiting admin approval,
// split out of Payment Received (see that page's own header comment).
// Backed by the same is_approved column/endpoints that page always used
// (GET /api/payments?approval=pending, PUT /:id/approve, PUT
// /bulk-approve) — nothing new on the backend, only where this UI lives.
// Route-protected admin/superadmin only (see AdminRoutes.tsx), matching
// the PUT routes' own requireAdmin gate.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { MdPayments, MdRefresh, MdSearch, MdCheckCircle, MdHourglassEmpty } from 'react-icons/md';

import { useAppDispatch } from '../../../../hooks';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import StatCard from '../../../../components/masters/StatCard';
import { fetchPaymentList, approvePayment, bulkApprovePayments, paymentForLabel, PaymentListRow } from '../../../../services/paymentService';
import { formatLastLogin } from '../../../../utils';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const rupee = (n: number): string => `₹ ${n.toLocaleString('en-IN')}`;

const PaymentApprovalsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t, cssVars } = useAppearanceTokens();

  const [rows, setRows] = useState<PaymentListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);

  useEffect(() => { dispatch(setPageTitle('Payment Approvals')); }, [dispatch]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPaymentList(page, limit, { approval: 'pending', search: debouncedSearch });
      if (res.success) { setRows(res.rows); setTotal(res.total); }
      else toast.error('Failed to fetch pending payments.');
    } catch {
      toast.error('Failed to fetch pending payments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);
  // Selection is page-scoped — clear it whenever the visible rows change
  // under it (new page, search, refresh, or an approve removes rows) so a
  // stale id can't get bulk-approved by surprise.
  useEffect(() => { setSelectedIds(new Set()); }, [rows]);

  const handleApprove = async (row: PaymentListRow) => {
    setApprovingId(row.id);
    try {
      await approvePayment(row.id);
      toast.success(`Payment ${row.receipt_number} approved.`);
      fetchRows();
    } catch {
      toast.error('Failed to approve payment.');
    } finally {
      setApprovingId(null);
    }
  };

  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const toggleSelectAll = () => setSelectedIds(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <StatCard label="Awaiting Approval" value={total} icon={MdHourglassEmpty} color="#ea580c" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
      </div>

      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <p style={{ fontSize: 11.5, color: t.textSecondary, margin: 0 }}>
            Approving moves a payment onto the Payment Received page and lets its receipt be printed.
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            {selectedIds.size > 0 && (
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
                <th style={{ padding: '12px 14px', width: 36 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} disabled={rows.length === 0}
                    style={{ cursor: rows.length === 0 ? 'not-allowed' : 'pointer' }} />
                </th>
                {['Receipt #', 'Customer', 'Payment For', 'Amount', 'Company', 'Mode', 'Received By', 'Date', 'Action'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading pending payments...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>No payments are waiting for approval.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                    <td style={{ padding: '12px 14px' }}>
                      <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelectRow(r.id)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap' }}>{r.receipt_number}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap' }}>{r.customer_name || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{paymentForLabel(r.payment_type)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap' }}>{rupee(r.amount)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.company || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.mode_of_payment || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.received_by || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatLastLogin(r.created_at)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <button type="button" disabled={approvingId === r.id} onClick={() => handleApprove(r)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: '#16a34a', cursor: approvingId === r.id ? 'not-allowed' : 'pointer' }}>
                        <MdCheckCircle size={13} /> {approvingId === r.id ? 'Approving...' : 'Approve'}
                      </button>
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
            {pageBtns[0] > 1 && <span style={{ color: t.textSecondary, padding: '0 2px' }}>...</span>}
            {pageBtns.map((n) => (
              <button key={n} type="button" onClick={() => setPage(n)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: n === safePage ? '#7c3aed' : t.insetBg, color: n === safePage ? '#fff' : t.textPrimary, border: `1px solid ${n === safePage ? '#7c3aed' : t.surfaceBorder}`, cursor: 'pointer' }}>
                {n}
              </button>
            ))}
            {pageBtns[pageBtns.length - 1] < totalPages && <span style={{ color: t.textSecondary, padding: '0 2px' }}>...</span>}
          </div>
          <div style={{ width: 90 }} />
        </div>
      </div>
    </div>
  );
};

export default PaymentApprovalsPage;
