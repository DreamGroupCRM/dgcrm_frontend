// ==========================================
// DREAM GROUP CRM - CANCELLED BOOKING PAGE
// ==========================================
// Customers whose booking was cancelled (from Customer Details' Cancel
// Booking popup — an admin cancels directly, an employee's request needs
// admin approval). Nothing is ever deleted: the customer's row, booking,
// payments and receipts stay intact, and refunds are recorded against them.
//
// Mounted for admin (/admin/cancelled-booking) and employee
// (/employee/cancelled-booking). An employee sees only customers assigned to
// them; the summary boxes and the approval queue are admin-only — all
// enforced by the API, not just hidden here.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/utils/toast';
import {
  MdEventBusy, MdClose, MdSearch, MdRefresh, MdMoreVert, MdVisibility, MdDownload,
  MdLoyalty, MdCurrencyRupee, MdAssignmentReturn, MdAccountBalanceWallet, MdPendingActions,
  MdCheckCircle, MdCancel, MdArrowBack, MdPhone, MdEmail,
} from 'react-icons/md';

import { useAppDispatch } from '../../../../hooks';
import { usePermission } from '../../../../hooks/usePermission';
import { useRoleBasePath } from '../../../../hooks/useRoleBasePath';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import StatCard from '../../../../components/masters/StatCard';
import PaginationFooter from '../../../../components/common/PaginationFooter';
import { RowActionMenu, useRowActionMenu } from '../../../../components/common/RowActionMenu';
import {
  fetchCancelledCustomers, CancelledCustomerRow, CancelledCustomerFilters,
  fetchCancelledBookingSummary, CancelledBookingSummary,
  fetchCustomerPaymentHistory, fetchCustomerFullDetails, fetchCustomerScheme,
  fetchRefundSummary, createRefund, RefundSummary, assignCustomersToEmployee,
} from '../../../../services/customerDetailsService';
import { fetchChangeRequests, approveChangeRequest, rejectChangeRequest, ChangeRequestRow } from '../../../../services/changeRequestsService';
import { FetchBuildingList, ViewBuilding } from '../../../../services/buildingService';
import { FetchEmployeeDetails } from '../../../../services/employeeDetailsService';
import { exportPaymentHistoryPdf, exportPaymentSchedulePdf } from '../Customer-Details/paymentPdfExport.lazy';
import { Building } from '../../../../types';
import { formatDate, resolveFileUrl, showAlert } from '../../../../utils';
import { serverTodayYmd } from '../../../../utils/serverTime';

const rupee = (n: number): string => `₹ ${(n || 0).toLocaleString('en-IN')}`;
const MODE_OPTIONS = ['Cash', 'Cheque', 'Online', 'Other'];
const errMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const unitText = (c: CancelledCustomerRow): string =>
  c.unit_type === 'shop' ? `Shop ${c.shop_no || '—'}` : `${c.wing_name || '—'} Wing - Flat ${c.flat_no || '—'}`;

type Draft = Required<CancelledCustomerFilters>;
const EMPTY_FILTERS: Draft = {
  customer_name: '', building_id: '', wing_id: '', flat_id: '',
  refund_amount: '', refund_date: '', mode_of_payment: '', employee_id: '',
};

const CancelledBookingPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t, isDark } = useAppearanceTokens();
  const paths = useRoleBasePath();
  const isAdmin = paths.isAdmin;
  const canAssign = usePermission('customers', 'assign');
  const rowMenu = useRowActionMenu<string>();

  useEffect(() => { dispatch(setPageTitle('Cancelled Booking')); }, [dispatch]);

  // ── Admin-only summary boxes ─────────────────────────────────────────────
  const [summary, setSummary] = useState<CancelledBookingSummary | null>(null);
  const loadSummary = useCallback(async () => {
    if (!isAdmin) return;
    try { setSummary(await fetchCancelledBookingSummary()); } catch { toast.error('Failed to load cancellation totals.'); }
  }, [isAdmin]);

  // ── Admin-only: employees' cancellation requests awaiting approval ───────
  const [requests, setRequests] = useState<ChangeRequestRow[]>([]);
  const [busyRequest, setBusyRequest] = useState<string | null>(null);
  const loadRequests = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const rows = await fetchChangeRequests('customer', 'pending');
      setRequests(rows.filter((r) => r.action === 'cancel_booking'));
    } catch { toast.error('Failed to load cancellation requests.'); }
  }, [isAdmin]);

  // ── Filters: edited as a draft, applied on Search ────────────────────────
  const [draft, setDraft] = useState<Draft>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Draft>(EMPTY_FILTERS);
  const setField = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingDetail, setBuildingDetail] = useState<Building | null>(null);
  const [employees, setEmployees] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => {
    (async () => {
      try { const res = await FetchBuildingList(1, 1000); if (res.success) setBuildings(res.rows ?? []); } catch { /* filter stays empty */ }
    })();
    (async () => {
      try {
        const res = await FetchEmployeeDetails(1, 1000, undefined, true);
        if (res.success) setEmployees((res.rows ?? []).map((e) => ({ id: String(e.id), label: `${e.first_name} ${e.last_name ?? ''} (${e.employee_code})`.replace(/\s+/g, ' ') })));
      } catch { /* employee filter/assign stay empty */ }
    })();
  }, []);
  useEffect(() => {
    if (!draft.building_id) { setBuildingDetail(null); return; }
    let cancelled = false;
    (async () => {
      try { const res = await ViewBuilding(draft.building_id); if (!cancelled && res.success) setBuildingDetail(res.data); } catch { /* wing/flat stay empty */ }
    })();
    return () => { cancelled = true; };
  }, [draft.building_id]);
  const wings = buildingDetail?.wings ?? [];
  const flats = useMemo(() => wings.find((w) => String(w.id) === draft.wing_id)?.floors.flatMap((f) => f.flats) ?? [], [wings, draft.wing_id]);

  // ── List ─────────────────────────────────────────────────────────────────
  const [rows, setRows] = useState<CancelledCustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCancelledCustomers(page, limit, applied);
      if (res.success) { setRows(res.rows); setTotal(res.total); }
    } catch {
      toast.error('Failed to load cancelled bookings.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, applied]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { loadSummary(); loadRequests(); }, [loadSummary, loadRequests]);
  useEffect(() => { setSelected(new Set()); }, [rows]);

  const refreshAll = () => { fetchRows(); loadSummary(); loadRequests(); };
  const handleSearch = () => { setPage(1); setApplied({ ...draft }); };
  const handleClear = () => { setDraft(EMPTY_FILTERS); setApplied(EMPTY_FILTERS); setPage(1); };
  const anyFilter = Object.values(applied).some(Boolean) || Object.values(draft).some(Boolean);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const to = Math.min(safePage * limit, total);
  const pageBtns = () => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  };

  // ── Search Employee + Assign (same flow as Customer Details) ─────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [assigning, setAssigning] = useState(false);
  const toggleRow = (id: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected(allOnPage ? new Set() : new Set(rows.map((r) => r.id)));
  const handleAssign = async () => {
    const employee = employees.find((e) => e.label === employeeSearch);
    if (!employee) { toast.error('Select an employee to assign to.'); return; }
    setAssigning(true);
    try {
      await assignCustomersToEmployee({ customer_ids: Array.from(selected), employee_id: employee.id });
      toast.success('Customer(s) Assigned Successfully');
      setSelected(new Set());
      setEmployeeSearch('');
      fetchRows();
    } catch {
      toast.error('Failed to assign customer(s).');
    } finally {
      setAssigning(false);
    }
  };

  // ── Row actions ──────────────────────────────────────────────────────────
  const handleDownloadHistory = async (c: CancelledCustomerRow) => {
    try {
      const [historyRes, fullRes] = await Promise.allSettled([fetchCustomerPaymentHistory(c.id), fetchCustomerFullDetails(c.id)]);
      if (historyRes.status === 'rejected') throw historyRes.reason;
      const totalFlatCost = fullRes.status === 'fulfilled' ? fullRes.value.data?.total_cost ?? null : null;
      const totalPaid = historyRes.value.rows.reduce((s, p) => s + p.amount, 0);
      await exportPaymentHistoryPdf(c, historyRes.value.rows, totalFlatCost, totalFlatCost != null ? Math.max(0, totalFlatCost - totalPaid) : null);
    } catch {
      toast.error('Failed to generate the payment history PDF.');
    }
  };
  const handleDownloadScheme = async (c: CancelledCustomerRow) => {
    try {
      const res = await fetchCustomerScheme(c.id);
      if (!res.success || !res.data) throw new Error('No scheme data');
      await exportPaymentSchedulePdf(res.data);
    } catch {
      toast.error('Failed to generate the payment schedule PDF.');
    }
  };

  // ── Approve / reject an employee's cancellation request ──────────────────
  const handleApprove = async (r: ChangeRequestRow) => {
    const name = String(r.new_values.customer_name ?? `Customer #${r.entity_id}`);
    const res = await showAlert.confirm(`This will cancel ${name}'s booking and move them to Cancelled Booking.`, 'Approve Cancellation?');
    if (!res.isConfirmed) return;
    setBusyRequest(r.id);
    try {
      await approveChangeRequest(r.id);
      toast.success('Cancellation approved.');
      refreshAll();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to approve cancellation.'));
    } finally {
      setBusyRequest(null);
    }
  };
  const handleReject = async (r: ChangeRequestRow) => {
    const res = await showAlert.confirm('The booking stays active and the request is closed.', 'Reject Cancellation?');
    if (!res.isConfirmed) return;
    setBusyRequest(r.id);
    try {
      await rejectChangeRequest(r.id);
      toast.success('Cancellation request rejected.');
      loadRequests();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to reject request.'));
    } finally {
      setBusyRequest(null);
    }
  };

  // ── Payment Refund History popup ─────────────────────────────────────────
  const [refundFor, setRefundFor] = useState<CancelledCustomerRow | null>(null);
  const [refundSummary, setRefundSummary] = useState<RefundSummary | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundDate, setRefundDate] = useState('');
  const [refundMode, setRefundMode] = useState('');
  const [refundNotes, setRefundNotes] = useState('');
  const [submittingRefund, setSubmittingRefund] = useState(false);

  const openRefunds = async (c: CancelledCustomerRow) => {
    setRefundFor(c);
    setRefundSummary(null);
    setRefundAmount(''); setRefundDate(serverTodayYmd()); setRefundMode(''); setRefundNotes('');
    try { setRefundSummary(await fetchRefundSummary(c.id)); } catch (e) { toast.error(errMessage(e, 'Failed to load refund details.')); }
  };

  const handleSubmitRefund = async () => {
    if (!refundFor) return;
    const amount = Number(refundAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid refund amount.'); return; }
    if (isAdmin && !refundDate) { toast.error('Select the refund date.'); return; }
    setSubmittingRefund(true);
    try {
      const updated = await createRefund(refundFor.id, {
        refunded_amount: amount,
        // Only an admin picks (and may backdate) the date; an employee's
        // refund is dated today by the server regardless.
        refund_date: isAdmin ? refundDate : undefined,
        mode_of_payment: refundMode || undefined,
        notes: refundNotes.trim() || undefined,
      });
      setRefundSummary(updated);
      setRefundAmount(''); setRefundMode(''); setRefundNotes(''); setRefundDate(serverTodayYmd());
      toast.success('Refund recorded.');
      fetchRows(); loadSummary();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to record refund.'));
    } finally {
      setSubmittingRefund(false);
    }
  };

  // ── Styles ───────────────────────────────────────────────────────────────
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 };
  const inputStyle: React.CSSProperties = { width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 10px', fontSize: 12, outline: 'none' };
  const readOnlyStyle: React.CSSProperties = { ...inputStyle, background: t.insetBg, color: t.textSecondary, cursor: 'not-allowed' };
  const cellText = isDark ? '#ffffff' : '#000000';
  const td: React.CSSProperties = { padding: '10px 12px', fontSize: 11.5, color: cellText, whiteSpace: 'nowrap' };

  const docLinks = (r: { cancel_letter?: unknown; acceptance_letter?: unknown; cancel_documents?: unknown; returned_documents?: unknown }) =>
    ([['Cancel Letter', r.cancel_letter], ['Acceptance Letter', r.acceptance_letter], ['Cancel Documents', r.cancel_documents], ['Documents', r.returned_documents]] as [string, unknown][])
      .filter(([, url]) => typeof url === 'string' && url)
      .map(([label, url]) => (
        <a key={label} href={resolveFileUrl(String(url))} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-ink)', fontWeight: 600, fontSize: 11 }}>{label}</a>
      ));

  return (
    <div style={{ fontFamily: t.fontFamily }}>
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 44, height: 44, background: 'rgba(220,38,38,0.1)' }}>
            <MdEventBusy size={22} style={{ color: '#dc2626' }} />
          </div>
          <h1 style={{ fontSize: 19.5, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Cancelled Booking</h1>
        </div>
        <button type="button" onClick={() => navigate(paths.customerDetails)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
          <MdArrowBack size={16} /> Customer Details
        </button>
      </div>

      {/* ── Summary boxes — admin only ─────────────────────────────────── */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
          <StatCard label="Total Booking Cancelled" value={summary?.total_cancelled ?? 0} icon={MdEventBusy} color="#b91c1c" bg="" loading={!summary}
            surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
          <StatCard label="Total Cancelled Amount" value={rupee(summary?.total_cancelled_amount ?? 0)} icon={MdAccountBalanceWallet} color="#7c3aed" bg="" loading={!summary}
            surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
          <StatCard label="Total Refund Amount Paid" value={rupee(summary?.total_refund_paid ?? 0)} icon={MdAssignmentReturn} color="#16a34a" bg="" loading={!summary}
            surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
          <StatCard label="Total Refund Amount Balance" value={rupee(summary?.total_refund_balance ?? 0)} icon={MdCurrencyRupee} color="#ea580c" bg="" loading={!summary}
            surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        </div>
      )}

      {/* ── Cancellation requests awaiting approval — admin only ───────── */}
      {isAdmin && requests.length > 0 && (
        <div className="rounded-2xl mb-5" style={{ background: t.surfaceBg, border: '1px solid #d97706', overflow: 'hidden' }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'rgba(217,119,6,0.12)', fontSize: 13, fontWeight: 800, color: '#b45309' }}>
            <MdPendingActions size={18} /> Cancellation Requests Awaiting Approval ({requests.length})
          </div>
          <div className="master-table-scroll">
            <table className="master-table" style={{ width: '100%', minWidth: 860 }}>
              <thead>
                <tr className="master-table-header-gradient">
                  {['Customer', 'Reason', 'Documents', 'Originals Returned', 'Requested By', 'Requested On', 'Actions'].map((h) => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const v = r.new_values;
                  const busy = busyRequest === r.id;
                  const links = docLinks(v);
                  return (
                    <tr key={r.id} className="master-table-row-hover">
                      <td style={td}>
                        <div style={{ fontWeight: 600 }}>{String(v.customer_name ?? '—')}</div>
                        <div style={{ fontSize: 10.5, color: t.textSecondary }}>{String(v.customer_code ?? '')}</div>
                      </td>
                      <td style={{ ...td, whiteSpace: 'normal', maxWidth: 260 }}>{String(v.reason ?? r.reason ?? '—')}</td>
                      <td style={td}><div className="flex flex-col gap-0.5">{links.length ? links : '—'}</div></td>
                      <td style={td}>{v.original_documents_returned ? 'Yes' : 'No'}</td>
                      <td style={td}>{r.requested_by_name || r.requested_by_email || '—'}</td>
                      <td style={td}>{formatDate(r.requested_at)}</td>
                      <td style={td}>
                        <div className="flex items-center gap-1.5">
                          <button type="button" disabled={busy} onClick={() => handleApprove(r)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                            style={{ background: '#16a34a', border: 'none', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                            <MdCheckCircle size={14} /> Approve
                          </button>
                          <button type="button" disabled={busy} onClick={() => handleReject(r)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                            style={{ background: '#dc2626', border: 'none', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                            <MdCancel size={14} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Search & filters ───────────────────────────────────────────── */}
      <div className="rounded-2xl mb-5 p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="cb-filter-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 items-end">
          <div>
            <label style={labelStyle}>Customer Name</label>
            <input type="text" value={draft.customer_name} placeholder="Name or Customer ID"
              onChange={(e) => setField('customer_name', e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Building</label>
            <select value={draft.building_id} onChange={(e) => setDraft((d) => ({ ...d, building_id: e.target.value, wing_id: '', flat_id: '' }))} style={inputStyle}>
              <option value="">--All--</option>
              {buildings.filter((b) => b.is_active).map((b) => <option key={b.id} value={b.id}>{b.building_name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Wing</label>
            <select value={draft.wing_id} disabled={!draft.building_id} onChange={(e) => setDraft((d) => ({ ...d, wing_id: e.target.value, flat_id: '' }))}
              style={draft.building_id ? inputStyle : readOnlyStyle}>
              <option value="">{draft.building_id ? '--All--' : 'Select a Building first'}</option>
              {wings.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Flat</label>
            <select value={draft.flat_id} disabled={!draft.wing_id} onChange={(e) => setField('flat_id', e.target.value)}
              style={draft.wing_id ? inputStyle : readOnlyStyle}>
              <option value="">{draft.wing_id ? '--All--' : 'Select a Wing first'}</option>
              {flats.map((f) => <option key={f.id} value={f.id}>{f.flat_no}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Refund Amount (₹)</label>
            <input type="number" min={0} value={draft.refund_amount} placeholder="Exact amount"
              onChange={(e) => setField('refund_amount', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Refund Date</label>
            <input type="date" value={draft.refund_date} onChange={(e) => setField('refund_date', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Mode of Payment</label>
            <select value={draft.mode_of_payment} onChange={(e) => setField('mode_of_payment', e.target.value)} style={inputStyle}>
              <option value="">--All--</option>
              {MODE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Employee</label>
            <select value={draft.employee_id} onChange={(e) => setField('employee_id', e.target.value)} style={inputStyle}>
              <option value="">--All--</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleSearch}
              className="flex items-center gap-1.5 px-4 rounded-xl text-sm font-bold text-white"
              style={{ height: 38, background: 'var(--brand-gradient)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <MdSearch size={16} /> Search
            </button>
            <button type="button" onClick={handleClear} title="Clear Filters" aria-label="Clear Filters"
              className="flex items-center justify-center rounded-full"
              style={{ width: 36, height: 36, background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: 'pointer', flexShrink: 0, opacity: anyFilter ? 1 : 0.5 }}>
              <MdClose size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Toolbar — Search Employee + Assign, Refresh ────────────────── */}
      <div className="flex items-end justify-between gap-3 mb-2" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
        {canAssign ? (
          <div className="flex items-end gap-3" style={{ flexShrink: 0 }}>
            <div style={{ width: 260 }}>
              <label style={labelStyle}>Search Employee</label>
              <input list="cancelled-assign-employees" value={employeeSearch} disabled={selected.size === 0}
                placeholder={selected.size === 0 ? 'Select customers first' : 'Type to search employee'}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                style={selected.size === 0 ? readOnlyStyle : inputStyle} />
              <datalist id="cancelled-assign-employees">
                {employees.map((e) => <option key={e.id} value={e.label} />)}
              </datalist>
            </div>
            <button type="button" onClick={handleAssign} disabled={selected.size === 0 || !employeeSearch || assigning}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{
                background: selected.size === 0 || !employeeSearch || assigning ? t.insetBg : 'var(--grad-purple)',
                color: selected.size === 0 || !employeeSearch || assigning ? t.textSecondary : '#fff',
                border: `1px solid ${selected.size === 0 || !employeeSearch || assigning ? t.surfaceBorder : 'transparent'}`,
                cursor: selected.size === 0 || !employeeSearch || assigning ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
              }}>
              {assigning ? 'Assigning...' : 'Assign to Employee'}
            </button>
          </div>
        ) : <div />}
        <button type="button" onClick={refreshAll} title="Refresh"
          className="flex items-center justify-center rounded-xl"
          style={{ width: 40, height: 40, background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
          <MdRefresh size={18} />
        </button>
      </div>

      {/* ── Cancelled bookings table ───────────────────────────────────── */}
      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="master-table-scroll">
          <table className="master-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1350 }}>
            <thead>
              <tr className="master-table-header-gradient">
                <th style={{ padding: '10px 12px', width: 40 }}>
                  {canAssign && <input type="checkbox" checked={allOnPage} onChange={toggleAll} disabled={rows.length === 0} title="Select all on this page" />}
                </th>
                {['Action', 'Customer ID', 'Customer Name', 'Contact Details', 'Company / Project', 'Building Details', 'Cancellation Date', 'Refund Amount', 'Refund Date', 'Mode of Payment', 'Assigned Employee'].map((h) => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', ...(h === 'Action' ? { minWidth: 120 } : {}) }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={12} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>No cancelled bookings found.</td></tr>
              ) : rows.map((c) => (
                <tr key={c.id} className="master-table-row-hover" style={{ borderTop: `1px solid ${t.divider}` }}>
                  <td style={{ padding: '10px 12px' }}>
                    {canAssign && <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleRow(c.id)} />}
                  </td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    <div className="flex items-center gap-1.5">
                      <button type="button" title="Actions"
                        ref={rowMenu.openId === c.id ? rowMenu.buttonRef : undefined}
                        onClick={rowMenu.toggle(c.id, 3)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 4 }}>
                        <MdMoreVert size={18} />
                      </button>
                      {rowMenu.openId === c.id && rowMenu.pos && (
                        <RowActionMenu t={t} pos={rowMenu.pos} actions={[
                          { key: 'view', label: 'View', icon: <MdVisibility size={14} color="var(--brand-ink)" />, onClick: () => { rowMenu.close(); navigate(`${paths.customerDetails}/view/${c.id}`); } },
                          { key: 'history', label: 'Download History', icon: <MdDownload size={14} color="#7c3aed" />, onClick: () => { rowMenu.close(); handleDownloadHistory(c); } },
                          { key: 'scheme', label: 'Download Scheme', icon: <MdDownload size={14} color="#059669" />, onClick: () => { rowMenu.close(); handleDownloadScheme(c); } },
                        ]} />
                      )}
                      <button type="button" title="Show Scheme" className="master-icon-btn" onClick={() => navigate(`${paths.customerDetails}/scheme/${c.id}`)}>
                        <MdLoyalty size={15} />
                      </button>
                      <button type="button" title="Show Payment Refund History" className="master-icon-btn" onClick={() => openRefunds(c)}>
                        <MdCurrencyRupee size={15} />
                      </button>
                    </div>
                  </td>
                  <td style={td}>
                    <button type="button" onClick={() => navigate(`${paths.customerDetails}/view/${c.id}`)}
                      style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11.5, fontWeight: 600, color: 'var(--brand-ink)' }}>
                      {c.customer_code || '—'}
                    </button>
                  </td>
                  <td style={{ ...td, fontSize: 12, fontWeight: 600 }}>{c.customer_name}</td>
                  <td style={{ ...td, fontSize: 11 }}>
                    <div className="flex items-center gap-1.5"><MdPhone size={13} /> {c.mobile_number || '—'}</div>
                    <div className="flex items-center gap-1.5 mt-0.5"><MdEmail size={13} /> {c.email || '—'}</div>
                  </td>
                  <td style={{ ...td, fontSize: 11 }}>
                    <div style={{ fontWeight: 700 }}>{c.company_name || '—'}</div>
                    <div>{c.project_name || '—'}</div>
                  </td>
                  <td style={{ ...td, fontSize: 11 }}>
                    <div style={{ fontWeight: 700 }}>{c.building_name || '—'}</div>
                    <div>{unitText(c)}</div>
                  </td>
                  <td style={td}>{c.cancelled_at ? formatDate(c.cancelled_at) : '—'}</td>
                  <td style={td}>
                    <div style={{ fontWeight: 700, color: '#16a34a' }}>{rupee(c.total_refunded)}</div>
                    <div style={{ fontSize: 10.5, color: t.textSecondary }}>of {rupee(c.total_paid)} paid</div>
                  </td>
                  <td style={td}>{c.last_refund_date ? formatDate(c.last_refund_date) : '—'}</td>
                  <td style={td}>{c.last_refund_mode || '—'}</td>
                  <td style={td}>{c.assigned_employee_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationFooter t={t} limit={limit} setLimit={setLimit} setPage={setPage} safePage={safePage} totalPages={totalPages} from={from} to={to} total={total} pageBtns={pageBtns} />
      </div>

      {/* ── Payment Refund History popup ───────────────────────────────── */}
      {refundFor && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl w-full" style={{ maxWidth: 860, maxHeight: '90vh', overflowY: 'auto', background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5" style={{ background: '#059669', borderRadius: '16px 16px 0 0' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>
                Payment Refund — {refundFor.customer_name} {refundFor.customer_code ? `(${refundFor.customer_code})` : ''}
              </div>
              <button type="button" onClick={() => setRefundFor(null)} aria-label="Close"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', padding: 4 }}>
                <MdClose size={20} />
              </button>
            </div>
            <div className="p-5" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ fontSize: 12 }}>
                <div><div style={labelStyle}>Flat Details</div><div style={{ color: t.textPrimary, fontWeight: 600 }}>{refundFor.building_name || '—'} - {unitText(refundFor)}</div></div>
                <div><div style={labelStyle}>Cancellation Date</div><div style={{ color: t.textPrimary, fontWeight: 600 }}>{refundFor.cancelled_at ? formatDate(refundFor.cancelled_at) : '—'}</div></div>
                <div><div style={labelStyle}>Original Documents Returned</div><div style={{ color: t.textPrimary, fontWeight: 600 }}>{refundFor.original_documents_returned ? 'Yes' : 'No'}</div></div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={labelStyle}>Cancellation Reason</div>
                  <div className="rounded-xl p-3" style={{ color: t.textPrimary, background: t.insetBg }}>{refundFor.cancellation_reason || '—'}</div>
                </div>
                {docLinks(refundFor).length > 0 && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={labelStyle}>Cancellation Documents</div>
                    <div className="flex items-center gap-4 flex-wrap">{docLinks(refundFor)}</div>
                  </div>
                )}
              </div>

              {!refundSummary ? (
                <p style={{ color: t.textSecondary, fontSize: 12 }}>Loading refund details...</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Total Paid', value: refundSummary.total_paid, color: t.textPrimary },
                      { label: 'Total Refunded', value: refundSummary.total_refunded, color: '#16a34a' },
                      { label: 'Refund Balance', value: refundSummary.remaining_refundable, color: '#ea580c' },
                    ].map((b) => (
                      <div key={b.label} className="rounded-xl p-3" style={{ background: t.insetBg }}>
                        <div style={labelStyle}>{b.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: b.color }}>{rupee(b.value)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                    <div>
                      <label style={labelStyle}>Refund Amount (₹)</label>
                      <input type="number" min={0} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} placeholder="Enter amount" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Refund Date</label>
                      {isAdmin ? (
                        <input type="date" value={refundDate} max={serverTodayYmd()} onChange={(e) => setRefundDate(e.target.value)} style={inputStyle} />
                      ) : (
                        <input type="date" value={serverTodayYmd()} readOnly disabled title="Employees can only record today's date." style={readOnlyStyle} />
                      )}
                    </div>
                    <div>
                      <label style={labelStyle}>Mode of Payment</label>
                      <select value={refundMode} onChange={(e) => setRefundMode(e.target.value)} style={inputStyle}>
                        <option value="">--Select--</option>
                        {MODE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Notes (optional)</label>
                      <input type="text" value={refundNotes} onChange={(e) => setRefundNotes(e.target.value)} placeholder="e.g. Bank transfer ref." style={inputStyle} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <button type="button" onClick={handleSubmitRefund} disabled={submittingRefund || refundSummary.remaining_refundable <= 0}
                        className="px-5 rounded-xl text-sm font-bold text-white"
                        style={{ height: 38, background: submittingRefund || refundSummary.remaining_refundable <= 0 ? '#6b7280' : 'var(--brand-gradient)', border: 'none', cursor: submittingRefund || refundSummary.remaining_refundable <= 0 ? 'not-allowed' : 'pointer' }}>
                        {submittingRefund ? 'Submitting...' : refundSummary.remaining_refundable <= 0 ? 'Fully Refunded' : 'Submit Refund'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>Refund History</div>
                    <div className="master-table-scroll rounded-xl" style={{ border: `1px solid ${t.surfaceBorder}` }}>
                      <table className="master-table" style={{ width: '100%', minWidth: 640 }}>
                        <thead>
                          <tr className="master-table-header-gradient">
                            {['Refund Date', 'Mode', 'Refunded Amount', 'Processed By', 'Notes'].map((h) => (
                              <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {refundSummary.refunds.length === 0 ? (
                            <tr><td colSpan={5} style={{ padding: 18, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>No refunds recorded yet.</td></tr>
                          ) : refundSummary.refunds.map((r) => (
                            <tr key={r.id}>
                              <td style={td}>{formatDate(r.refund_date)}</td>
                              <td style={td}>{r.mode_of_payment || '—'}</td>
                              <td style={{ ...td, fontWeight: 700, color: '#16a34a' }}>{rupee(r.refunded_amount)}</td>
                              <td style={td}>{r.created_by_name || '—'}</td>
                              <td style={{ ...td, whiteSpace: 'normal' }}>{r.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CancelledBookingPage;
