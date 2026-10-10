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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/utils/toast';
import {
  MdEventBusy, MdClose, MdRefresh, MdMoreVert, MdVisibility, MdDownload,
  MdCalendarMonth, MdCurrencyRupee, MdAssignmentReturn, MdAccountBalanceWallet, MdPendingActions,
  MdCheckCircle, MdCancel, MdPhone, MdEmail, MdExpandMore, MdPayments, MdHistory, MdReceiptLong, MdUndo,
} from 'react-icons/md';

import { useAppDispatch } from '../../../../hooks';
import { usePermission } from '../../../../hooks/usePermission';
import { useRoleBasePath } from '../../../../hooks/useRoleBasePath';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import PaymentHistoryTable, { toPaymentHistoryRow } from '../../../../components/common/PaymentHistoryTable';
import RefundHistoryTable from '../../../../components/common/RefundHistoryTable';
import StatCard from '../../../../components/masters/StatCard';
import PaginationFooter from '../../../../components/common/PaginationFooter';
import { RowActionMenu, useRowActionMenu } from '../../../../components/common/RowActionMenu';
import {
  fetchCancelledCustomers, CancelledCustomerRow, CancelledCustomerFilters,
  fetchCancelledBookingSummary, CancelledBookingSummary,
  fetchCustomerPaymentHistory, fetchCustomerFullDetails, fetchCustomerScheme,
  fetchRefundSummary, createRefund, RefundSummary, assignCustomersToEmployee,
  fetchPendingRefunds, approveRefund, rejectRefund, PendingRefundRow, fetchCancelledReceipt,
  revertCancellation,
} from '../../../../services/customerDetailsService';
import { fetchChangeRequests, approveChangeRequest, rejectChangeRequest, ChangeRequestRow } from '../../../../services/changeRequestsService';
import { FetchEmployeeDetails } from '../../../../services/employeeDetailsService';
import { exportPaymentHistoryPdf, exportPaymentSchedulePdf, exportPaymentReceiptPdf } from '../Customer-Details/paymentPdfExport.lazy';
import { PaymentReceiptViewModal } from '../../../../components/common/PaymentReceiptViewModal';
import { CustomerPaymentRecord, PaymentReceipt } from '../../../../types';
import { SearchableSelect } from '../../../../components/common/SearchableSelect';
import { formatDate, resolveFileUrl, showAlert } from '../../../../utils';
import './CancelledBooking.css';
import CancelBookingPicker from './CancelBookingPicker';

const rupee = (n: number): string => `₹ ${(n || 0).toLocaleString('en-IN')}`;
const errMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const unitText = (c: CancelledCustomerRow): string =>
  c.unit_type === 'shop' ? `Shop ${c.shop_no || '—'}` : `${c.wing_name || '—'} Wing - Flat ${c.flat_no || '—'}`;

// Filters the table: the customer picked in the refund row, the employee
// picked beside Refresh, and the clicked top box.
type Applied = Required<Pick<CancelledCustomerFilters, 'customer_id' | 'employee_id' | 'box'>>;
const NO_FILTERS: Applied = { customer_id: '', employee_id: '', box: '' };


// Refunds oldest first, each with the balance still owed after it.
const refundHistoryRows = (s: RefundSummary) => {
  let left = s.total_paid;
  return [...s.refunds]
    .sort((a, b) => String(a.refund_date).localeCompare(String(b.refund_date)) || Number(a.id) - Number(b.id))
    .map((r) => {
      // Only approved refunds reduce the balance; a pending/rejected row
      // shows the balance as it stands.
      if (r.status === 'approved') left -= r.refunded_amount;
      return { ...r, balance_after: Math.max(0, left) };
    });
};

// Collapsible section of the refund popup: a heading bar with a table inside.
const Accordion: React.FC<{
  t: ReturnType<typeof useAppearanceTokens>['t']; open: boolean; onToggle: () => void;
  icon: React.ReactNode; title: string; meta?: string; children: React.ReactNode;
}> = ({ t, open, onToggle, icon, title, meta, children }) => (
  <div className="rounded-xl" style={{ border: `1px solid ${t.surfaceBorder}`, overflow: 'hidden' }}>
    <button type="button" onClick={onToggle} aria-expanded={open}
      className="w-full flex items-center justify-between gap-3 px-4 py-2.5"
      style={{ background: '#059669', border: 'none', cursor: 'pointer', color: '#fff', textAlign: 'left' }}>
      <span className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 800 }}>{icon} {title}</span>
      <span className="flex items-center gap-2" style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>
        {meta}
        <MdExpandMore size={20} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
      </span>
    </button>
    {open && <div>{children}</div>}
  </div>
);

const customerLabel = (c: { customer_name: string; customer_code?: string | null }): string =>
  `${c.customer_name}${c.customer_code ? ` (${c.customer_code})` : ''}`;
const flatText = (c: CancelledCustomerRow): string =>
  [c.building_name, c.unit_type === 'shop' ? `Shop ${c.shop_no || '—'}` : [c.wing_name ? `${c.wing_name} Wing` : '', c.flat_no ? `Flat ${c.flat_no}` : ''].filter(Boolean).join(' - ')]
    .filter(Boolean).join(' - ');

const CancelledBookingPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t, isDark, cssVars } = useAppearanceTokens();
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

  // ── Table filters ────────────────────────────────────────────────────────
  const [applied, setApplied] = useState<Applied>(NO_FILTERS);
  const setFilter = <K extends keyof Applied>(k: K, v: Applied[K]) => { setPage(1); setApplied((a) => ({ ...a, [k]: v })); };

  const [employees, setEmployees] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await FetchEmployeeDetails(1, 1000, undefined, true);
        if (res.success) setEmployees((res.rows ?? []).map((e) => ({ id: String(e.id), label: `${e.first_name} ${e.last_name ?? ''} (${e.employee_code})`.replace(/\s+/g, ' ') })));
      } catch { /* employee filter/assign stay empty */ }
    })();
  }, []);

  // Every cancelled customer this user can see — the Customer Name picker's
  // list (and each one's paid / refunded figures for the refund row).
  // Loaded on first use of the picker (not on every page open — it is up to
  // 5000 rows), then kept fresh after each change once it has been loaded.
  const [allCancelled, setAllCancelled] = useState<CancelledCustomerRow[]>([]);
  const allCancelledWanted = useRef(false);
  const fetchAllCancelled = useCallback(async () => {
    try { const res = await fetchCancelledCustomers(1, 5000); if (res.success) setAllCancelled(res.rows); } catch { /* picker stays empty */ }
  }, []);
  const loadAllCancelled = useCallback(() => { if (allCancelledWanted.current) void fetchAllCancelled(); }, [fetchAllCancelled]);
  const wantAllCancelled = () => {
    if (allCancelledWanted.current) return;
    allCancelledWanted.current = true;
    void fetchAllCancelled();
  };
  const customerOptions = useMemo(() => allCancelled.map(customerLabel), [allCancelled]);

  // ── Refund entry row: Customer, Building/Wing/Flat, Refund Amount, Submit,
  // X. No Refund Date / Mode of Payment: a refund is dated today by the
  // server and has no mode. ────────────────────────────────────────────────
  const [custText, setCustText] = useState('');
  const [rAmount, setRAmount] = useState('');
  const [rSubmitAttempted, setRSubmitAttempted] = useState(false);
  const [savingRefund, setSavingRefund] = useState(false);
  const selectedCustomer = useMemo(() => allCancelled.find((c) => customerLabel(c) === custText) ?? null, [allCancelled, custText]);
  const selectedBalance = selectedCustomer ? Math.max(0, selectedCustomer.total_paid - selectedCustomer.total_refunded - selectedCustomer.pending_refund) : 0;
  const refundLocked = !selectedCustomer;

  // Picking a customer filters the table to them; clearing (or typing a
  // name that isn't picked yet) removes that filter — same as Payment Due.
  const handleCustomerChange = (v: string) => {
    setCustText(v);
    const exact = allCancelled.find((c) => customerLabel(c) === v);
    setFilter('customer_id', exact ? exact.id : '');
    if (!exact) { setRAmount(''); setRSubmitAttempted(false); }
  };
  const hasRefundInput = Boolean(custText.trim() || rAmount);
  const clearRefundRow = () => {
    setCustText(''); setRAmount(''); setRSubmitAttempted(false);
    setFilter('customer_id', '');
  };

  const amountNum = Number(rAmount);
  const amountError = !rAmount ? 'Enter the refund amount.'
    : !(amountNum > 0) ? 'Enter a valid amount.'
    : amountNum > selectedBalance ? `Max refundable is ${rupee(selectedBalance)}.` : '';

  const handleSubmitRefund = async () => {
    if (!selectedCustomer) { toast.error('Select a customer first.'); return; }
    setRSubmitAttempted(true);
    const err = amountError;
    if (err) { toast.error(err); return; }
    setSavingRefund(true);
    try {
      // Dated today by the server; no mode of payment.
      const updated = await createRefund(selectedCustomer.id, { refunded_amount: amountNum });
      // An admin's refund is approved on entry (cancelled receipt generated);
      // an employee's waits for admin approval.
      toast.success(isAdmin
        ? `Refund of ${rupee(amountNum)} recorded for ${selectedCustomer.customer_name} — cancelled receipt generated.`
        : `Refund of ${rupee(amountNum)} for ${selectedCustomer.customer_name} sent for admin approval.`);
      setRAmount(''); setRSubmitAttempted(false);
      if (refundFor?.id === selectedCustomer.id) setRefundSummary(updated);
      fetchRows(); loadSummary(); loadAllCancelled(); loadPendingRefunds();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to record refund.'));
    } finally {
      setSavingRefund(false);
    }
  };

  // ── Refunds awaiting admin approval (admin only) ─────────────────────────
  const [pendingRefunds, setPendingRefunds] = useState<PendingRefundRow[]>([]);
  // Both approval queues are collapsed by default so a long list never pushes
  // the refund row and the table down; the heading shows the count.
  const [approvalsOpen, setApprovalsOpen] = useState<{ refunds: boolean; cancellations: boolean }>({ refunds: false, cancellations: false });
  const [busyRefund, setBusyRefund] = useState<string | null>(null);
  const loadPendingRefunds = useCallback(async () => {
    if (!isAdmin) return;
    try { setPendingRefunds(await fetchPendingRefunds()); } catch { toast.error('Failed to load refunds awaiting approval.'); }
  }, [isAdmin]);
  useEffect(() => { loadPendingRefunds(); }, [loadPendingRefunds]);

  const decideRefund = async (refundId: string, approve: boolean, label: string) => {
    const res = await showAlert.confirm(
      approve ? `${label} will be marked refunded and a cancelled receipt number (C_…) will be generated.` : `${label} will not be refunded.`,
      approve ? 'Approve Refund?' : 'Reject Refund?',
    );
    if (!res.isConfirmed) return;
    setBusyRefund(refundId);
    try {
      const updated = approve ? await approveRefund(refundId) : await rejectRefund(refundId);
      toast.success(approve ? 'Refund approved — cancelled receipt generated.' : 'Refund rejected.');
      if (refundFor && updated.refunds.some((r) => r.id === refundId)) setRefundSummary(updated);
      fetchRows(); loadSummary(); loadAllCancelled(); loadPendingRefunds();
    } catch (e) {
      toast.error(errMessage(e, approve ? 'Failed to approve refund.' : 'Failed to reject refund.'));
    } finally {
      setBusyRefund(null);
    }
  };

  // ── Cancel Revert (admin) — a cancellation made by mistake. Refused by
  // the server once a refund is recorded or the unit is booked again. ─────
  const handleRevert = async (c: CancelledCustomerRow) => {
    const res = await showAlert.confirm(
      `${c.customer_name}'s booking will be active again, with all its payments.`,
      'Revert Cancellation?',
    );
    if (!res.isConfirmed) return;
    try {
      const out = await revertCancellation(c.id);
      toast.success(out.message || 'Cancellation reverted.');
      fetchRows(); loadSummary(); loadAllCancelled();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to revert the cancellation.'));
    }
  };

  // ── Cancelled receipt (C_FY_MM_n): view + download ───────────────────────
  const [receiptView, setReceiptView] = useState<PaymentReceipt | null>(null);
  const viewCancelledReceipt = async (refundId: string) => {
    try { setReceiptView(await fetchCancelledReceipt(refundId)); } catch (e) { toast.error(errMessage(e, 'Failed to load the cancelled receipt.')); }
  };
  const downloadCancelledReceipt = async (refundId: string, loaded?: PaymentReceipt) => {
    try { await exportPaymentReceiptPdf(loaded ?? await fetchCancelledReceipt(refundId), 'cancelled'); } catch (e) { toast.error(errMessage(e, 'Failed to download the cancelled receipt.')); }
  };
  const receiptIcons = (refundId: string) => (
    <span className="inline-flex items-center gap-1">
      <button type="button" className="master-icon-btn" title="View Cancelled Receipt" aria-label="View Cancelled Receipt" onClick={() => viewCancelledReceipt(refundId)}>
        <MdVisibility size={14} />
      </button>
      <button type="button" className="master-icon-btn" title="Download Cancelled Receipt" aria-label="Download Cancelled Receipt" onClick={() => downloadCancelledReceipt(refundId)}>
        <MdDownload size={14} />
      </button>
    </span>
  );

  // ── Employee filter (beside Refresh) ─────────────────────────────────────
  const [empFilterText, setEmpFilterText] = useState('');
  const handleEmployeeFilterChange = (v: string) => {
    setEmpFilterText(v);
    const exact = employees.find((e) => e.label === v);
    setFilter('employee_id', exact ? exact.id : '');
  };

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

  const refreshAll = () => { fetchRows(); loadSummary(); loadRequests(); loadAllCancelled(); loadPendingRefunds(); };

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
      fetchRows(); loadAllCancelled();
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
  const [payHistory, setPayHistory] = useState<CustomerPaymentRecord[] | null>(null);
  const [openSection, setOpenSection] = useState<{ payments: boolean; refunds: boolean }>({ payments: true, refunds: true });

  const openRefunds = async (c: CancelledCustomerRow) => {
    setRefundFor(c);
    setRefundSummary(null);
    setPayHistory(null);
    setOpenSection({ payments: true, refunds: true });
    const [sumRes, histRes] = await Promise.allSettled([fetchRefundSummary(c.id), fetchCustomerPaymentHistory(c.id)]);
    if (sumRes.status === 'fulfilled') setRefundSummary(sumRes.value); else toast.error(errMessage(sumRes.reason, 'Failed to load refund details.'));
    if (histRes.status === 'fulfilled') setPayHistory(histRes.value.rows); else { setPayHistory([]); toast.error('Failed to load payment history.'); }
  };

  // ── Styles ───────────────────────────────────────────────────────────────
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 };
  const inputStyle: React.CSSProperties = { width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 10px', fontSize: 12, outline: 'none' };
  const readOnlyStyle: React.CSSProperties = { ...inputStyle, background: t.insetBg, color: t.textSecondary, cursor: 'not-allowed' };
  const cellText = isDark ? '#ffffff' : '#000000';
  const td: React.CSSProperties = { padding: '10px 12px', fontSize: 11.5, color: cellText, whiteSpace: 'nowrap' };
  const bandLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 };
  const emptyCell: React.CSSProperties = { padding: 18, textAlign: 'center', color: t.textSecondary, fontSize: 12 };

  const docLinks = (r: { cancel_letter?: unknown; acceptance_letter?: unknown; cancel_documents?: unknown; returned_documents?: unknown }) =>
    ([['Cancel Letter', r.cancel_letter], ['Acceptance Letter', r.acceptance_letter], ['Cancel Documents', r.cancel_documents], ['Documents', r.returned_documents]] as [string, unknown][])
      .filter(([, url]) => typeof url === 'string' && url)
      .map(([label, url]) => (
        <a key={label} href={resolveFileUrl(String(url))} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-ink)', fontWeight: 600, fontSize: 11 }}>{label}</a>
      ));

  return (
    <div style={{ fontFamily: t.fontFamily }}>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 30, height: 30, background: 'rgba(220,38,38,0.1)' }}>
            <MdEventBusy size={17} style={{ color: '#dc2626' }} />
          </div>
          <h1 style={{ fontSize: 16, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Cancelled Booking</h1>
        </div>
        {/* All refunds given, date-wise (admin). */}
        {isAdmin && (
          <button type="button" onClick={() => navigate(`${paths.cancelledBooking}/refund-details`)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold"
            style={{ background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <MdAssignmentReturn size={16} /> Refund Details
          </button>
        )}
      </div>

      {/* ── Summary boxes — admin only ─────────────────────────────────── */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
          <StatCard label="Total Booking Cancelled" value={summary?.total_cancelled ?? 0} icon={MdEventBusy} color="#b91c1c" bg="" loading={!summary}
            onClick={() => setFilter('box', '')}
            surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
          <StatCard label="Total Cancelled Amount" value={rupee(summary?.total_cancelled_amount ?? 0)} icon={MdAccountBalanceWallet} color="#7c3aed" bg="" loading={!summary}
            onClick={() => setFilter('box', applied.box === 'paid' ? '' : 'paid')} active={applied.box === 'paid'}
            surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
          <StatCard label="Total Refund Amount Paid" value={rupee(summary?.total_refund_paid ?? 0)} icon={MdAssignmentReturn} color="#16a34a" bg="" loading={!summary}
            onClick={() => setFilter('box', applied.box === 'refunded' ? '' : 'refunded')} active={applied.box === 'refunded'}
            surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
          <StatCard label="Total Refund Amount Balance" value={rupee(summary?.total_refund_balance ?? 0)} icon={MdCurrencyRupee} color="#ea580c" bg="" loading={!summary}
            onClick={() => setFilter('box', applied.box === 'balance' ? '' : 'balance')} active={applied.box === 'balance'}
            surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        </div>
      )}

      {/* ── Cancellation requests awaiting approval — admin only ───────── */}
      {isAdmin && requests.length > 0 && (
        <div className="rounded-2xl mb-5" style={{ background: t.surfaceBg, border: '1px solid #d97706', overflow: 'hidden' }}>
          <button type="button" aria-expanded={approvalsOpen.cancellations}
            onClick={() => setApprovalsOpen((o) => ({ ...o, cancellations: !o.cancellations }))}
            className="w-full flex items-center justify-between gap-2 px-4 py-2.5"
            style={{ background: 'rgba(217,119,6,0.12)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800, color: '#b45309', textAlign: 'left' }}>
            <span className="flex items-center gap-2"><MdPendingActions size={18} /> Cancellation Requests Awaiting Approval
              <span className="cb-count-badge" style={{ background: '#dc2626' }} title={`${requests.length} pending`}>{requests.length}</span></span>
            <span className="flex items-center gap-1" style={{ fontSize: 11.5, fontWeight: 700 }}>
              {approvalsOpen.cancellations ? 'Hide' : 'Show'}
              <MdExpandMore size={20} style={{ transform: approvalsOpen.cancellations ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
            </span>
          </button>
          {approvalsOpen.cancellations && (
          <div className="master-table-scroll cb-approval-scroll">
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
          )}
        </div>
      )}

      {/* ── Refunds awaiting approval — admin only ───────────────────────── */}
      {isAdmin && pendingRefunds.length > 0 && (
        <div className="rounded-2xl mb-4" style={{ background: t.surfaceBg, border: '1px solid #059669', overflow: 'hidden' }}>
          <button type="button" aria-expanded={approvalsOpen.refunds}
            onClick={() => setApprovalsOpen((o) => ({ ...o, refunds: !o.refunds }))}
            className="w-full flex items-center justify-between gap-2 px-4 py-2.5"
            style={{ background: '#059669', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800, color: '#fff', textAlign: 'left' }}>
            <span className="flex items-center gap-2">
              <MdPendingActions size={18} /> Refunds Awaiting Approval
              <span className="cb-count-badge" style={{ background: '#dc2626' }} title={`${pendingRefunds.length} pending`}>{pendingRefunds.length}</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, opacity: 0.92 }}>{rupee(pendingRefunds.reduce((sum, r) => sum + r.refunded_amount, 0))}</span>
            </span>
            <span className="flex items-center gap-1" style={{ fontSize: 11.5, fontWeight: 700 }}>
              {approvalsOpen.refunds ? 'Hide' : 'Show'}
              <MdExpandMore size={20} style={{ transform: approvalsOpen.refunds ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
            </span>
          </button>
          {approvalsOpen.refunds && (
          <div className="master-table-scroll cb-approval-scroll">
            <table className="master-table" style={{ width: '100%', minWidth: 900 }}>
              <thead>
                <tr className="master-table-header-gradient">
                  {['Customer', 'Building / Wing / Flat', 'Processed By Employee', 'Refund Amount', 'Refund Date', 'Mode', 'Actions'].map((h) => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingRefunds.map((r) => {
                  const busy = busyRefund === r.id;
                  const unit = [r.building_name, r.shop_no ? `Shop ${r.shop_no}` : [r.wing_name ? `${r.wing_name} Wing` : '', r.flat_no ? `Flat ${r.flat_no}` : ''].filter(Boolean).join(' - ')].filter(Boolean).join(' - ');
                  const label = `${rupee(r.refunded_amount)} to ${r.customer_name}`;
                  return (
                    <tr key={r.id} className="master-table-row-hover">
                      <td style={td}><div style={{ fontWeight: 700 }}>{r.customer_name}</div><div style={{ fontSize: 10.5, color: t.textSecondary }}>{r.customer_code || ''}</div></td>
                      <td style={td}>{unit || '—'}</td>
                      <td style={td}>{r.created_by_name || '—'}</td>
                      <td style={{ ...td, fontWeight: 800, color: '#16a34a' }}>{rupee(r.refunded_amount)}</td>
                      <td style={td}>{formatDate(r.refund_date)}</td>
                      <td style={td}>{r.mode_of_payment || '—'}</td>
                      <td style={td}>
                        <div className="flex items-center gap-1.5">
                          <button type="button" disabled={busy} onClick={() => decideRefund(r.id, true, label)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                            style={{ background: '#16a34a', border: 'none', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                            <MdCheckCircle size={14} /> Approve
                          </button>
                          <button type="button" disabled={busy} onClick={() => decideRefund(r.id, false, label)}
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
          )}
        </div>
      )}

      {/* ── Refund entry: pick a cancelled customer (also filters the table),
          record a refund, X clears. One row from 1280px up. ─────────── */}
      <div className="rounded-2xl mb-4 p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="cb-filter-grid grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <div className="cb-f-customer" onFocusCapture={wantAllCancelled} onPointerDownCapture={wantAllCancelled}>
            <label style={labelStyle}>Customer Name / ID</label>
            <SearchableSelect t={t} placeholder="Name or ID" options={customerOptions} value={custText}
              onChange={handleCustomerChange} clearLabel="Clear customer" />
          </div>
          <div className="cb-f-bwf">
            <label style={labelStyle}>Building / Wing / Flat</label>
            <div aria-disabled="true" title={selectedCustomer ? flatText(selectedCustomer) : undefined}
              style={{ ...readOnlyStyle, height: 38, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedCustomer ? flatText(selectedCustomer) : '—'}
            </div>
          </div>
          <div className="cb-f-amount">
            <label style={labelStyle}>Refund Amount (₹)</label>
            <input type="number" min={0} value={rAmount} disabled={refundLocked}
              placeholder={selectedCustomer ? `Max ${rupee(selectedBalance)}` : 'Amount'}
              title={selectedCustomer ? `Refund balance: ${rupee(selectedBalance)}` : 'Select a customer first'}
              // Never more than the refund balance: a larger number is capped
              // at the balance as it is typed (digits only, no minus/decimal).
              max={selectedBalance}
              onChange={(e) => {
                const digits = e.target.value.replace(/[^\d]/g, '');
                if (!digits) { setRAmount(''); return; }
                const n = Math.min(Number(digits), selectedBalance);
                if (Number(digits) > selectedBalance) toast.error(`Refund amount cannot be more than the balance of ${rupee(selectedBalance)}.`, { toastId: 'refund-max', autoClose: 3000 });
                setRAmount(String(n));
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitRefund(); }}
              style={refundLocked ? readOnlyStyle : { ...inputStyle, ...(rSubmitAttempted && amountError ? { borderColor: '#ef4444' } : {}) }} />
          </div>
          <div className="cb-filter-actions flex items-center gap-2">
            <button type="button" onClick={handleSubmitRefund} disabled={refundLocked || savingRefund || selectedBalance <= 0}
              title={selectedCustomer && selectedBalance <= 0 ? 'Fully refunded' : undefined}
              className="flex items-center justify-center px-4 rounded-xl text-sm font-bold text-white"
              style={{ height: 38, background: refundLocked || savingRefund || selectedBalance <= 0 ? '#6b7280' : 'var(--brand-gradient)', border: 'none', cursor: refundLocked || savingRefund || selectedBalance <= 0 ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
              {savingRefund ? 'Submitting...' : selectedCustomer && selectedBalance <= 0 ? 'Fully Refunded' : 'Submit'}
            </button>
            <button type="button" onClick={clearRefundRow} disabled={!hasRefundInput} title="Clear Filters" aria-label="Clear Filters"
              className="flex items-center justify-center rounded-full"
              style={{ width: 36, height: 36, background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: hasRefundInput ? 'pointer' : 'not-allowed', flexShrink: 0, opacity: hasRefundInput ? 1 : 0.45 }}>
              <MdClose size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Toolbar — Search Employee + Assign, Refresh ────────────────── */}
      {/* One row on laptop/desktop; on phones and tablets the two groups
          stack and stretch to the full width (CancelledBooking.css). */}
      <div className="cb-toolbar flex items-end justify-between gap-3 mb-2">
        {canAssign ? (
          <div className="cb-toolbar-group flex items-end gap-3">
            <div className="cb-toolbar-field" style={{ width: 260 }}>
              <label style={labelStyle}>Employee to Assign</label>
              <input list="cancelled-assign-employees" value={employeeSearch} disabled={selected.size === 0}
                placeholder={selected.size === 0 ? 'Select customers' : 'Search employee'}
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
        <div className="cb-toolbar-group flex items-end gap-2">
          {/* Filter the table by assigned employee; the X inside clears it. */}
          <div className="cb-toolbar-field" style={{ width: 260 }}>
            <label style={labelStyle}>Filter by Employee</label>
            <SearchableSelect t={t} placeholder="Search employee name" options={employees.map((e) => e.label)} value={empFilterText}
              onChange={handleEmployeeFilterChange} clearLabel="Clear employee filter" />
          </div>
          <CancelBookingPicker t={t} isAdmin={isAdmin} onDone={refreshAll} />
          <button type="button" onClick={refreshAll} title="Refresh"
            className="flex items-center justify-center rounded-xl"
            style={{ width: 40, height: 38, background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
            <MdRefresh size={18} />
          </button>
        </div>
      </div>

      {/* ── Cancelled bookings table ───────────────────────────────────── */}
      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="master-table-scroll">
          <table className="master-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1480 }}>
            <thead>
              <tr className="master-table-header-gradient">
                <th style={{ padding: '10px 12px', width: 40 }}>
                  {canAssign && <input type="checkbox" checked={allOnPage} onChange={toggleAll} disabled={rows.length === 0} title="Select all on this page" />}
                </th>
                {['Action', 'Customer ID', 'Customer Name', 'Contact Details', 'Company / Project', 'Building Details', 'Cancellation Date', 'Refund Amount', 'Balance Amount', 'Refund Date', 'Mode of Payment', 'Assigned Employee'].map((h) => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', ...(h === 'Action' ? { minWidth: 120 } : {}) }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={13} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={13} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>No cancelled bookings found.</td></tr>
              ) : rows.map((c) => (
                <tr key={c.id} className="master-table-row-hover" style={{ borderTop: `1px solid ${t.divider}` }}>
                  <td style={{ padding: '10px 12px' }}>
                    {canAssign && <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleRow(c.id)} />}
                  </td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    <div className="flex items-center gap-1.5">
                      <button type="button" title="Actions"
                        ref={rowMenu.openId === c.id ? rowMenu.buttonRef : undefined}
                        onClick={rowMenu.toggle(c.id, (c.cancelled_receipts.length ? 5 : 3) + (isAdmin ? 1 : 0))}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 4 }}>
                        <MdMoreVert size={18} />
                      </button>
                      {rowMenu.openId === c.id && rowMenu.pos && (
                        <RowActionMenu t={t} pos={rowMenu.pos} actions={[
                          { key: 'view', label: 'View', icon: <MdVisibility size={14} color="var(--brand-ink)" />, onClick: () => { rowMenu.close(); navigate(`${paths.cancelledBooking}/view/${c.id}`); } },
                          { key: 'history', label: 'Download History', icon: <MdDownload size={14} color="#7c3aed" />, onClick: () => { rowMenu.close(); handleDownloadHistory(c); } },
                          { key: 'scheme', label: 'Download Scheme', icon: <MdDownload size={14} color="#059669" />, onClick: () => { rowMenu.close(); handleDownloadScheme(c); } },
                          // Latest approved refund's cancelled receipt.
                          ...(c.cancelled_receipts.length ? [
                            { key: 'cr-view', label: 'View Cancelled Receipt', icon: <MdReceiptLong size={14} color="#0369a1" />, onClick: () => { rowMenu.close(); viewCancelledReceipt(c.cancelled_receipts[c.cancelled_receipts.length - 1].refund_id); } },
                            { key: 'cr-download', label: 'Download Cancelled Receipt', icon: <MdDownload size={14} color="#0369a1" />, onClick: () => { rowMenu.close(); downloadCancelledReceipt(c.cancelled_receipts[c.cancelled_receipts.length - 1].refund_id); } },
                          ] : []),
                          // Admin: undo a cancellation made by mistake.
                          ...(isAdmin ? [
                            { key: 'revert', label: 'Cancel Revert', icon: <MdUndo size={14} color="#b45309" />, onClick: () => { rowMenu.close(); handleRevert(c); } },
                          ] : []),
                        ]} />
                      )}
                      <button type="button" title="Show Scheme" className="master-icon-btn" onClick={() => navigate(`${paths.cancelledBooking}/scheme/${c.id}`)}>
                        <MdCalendarMonth size={15} />
                      </button>
                      <button type="button" title="Show Payment Refund History" className="master-icon-btn" onClick={() => openRefunds(c)}>
                        <MdHistory size={15} />
                      </button>
                    </div>
                  </td>
                  <td style={td}>
                    <button type="button" onClick={() => navigate(`${paths.cancelledBooking}/view/${c.id}`)}
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
                    {c.pending_refund > 0 && <div style={{ fontSize: 10.5, fontWeight: 700, color: '#b45309' }}>{rupee(c.pending_refund)} refund payment pending for approval</div>}
                  </td>
                  {/* Still to be refunded out of what the customer paid
                      (approved refunds only). */}
                  <td style={td}>
                    <div style={{ fontWeight: 700, color: '#ea580c' }}>{rupee(Math.max(0, c.total_paid - c.total_refunded))}</div>
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
        // The popup is portaled outside the page, so it carries the page's
        // appearance variables itself — table headings and the three boxes
        // then follow the chosen theme/appearance like the page does.
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ ...cssVars, background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl w-full" style={{ maxWidth: 1080, maxHeight: '90vh', overflowY: 'auto', background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}
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
            <div className="p-5" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Flat details — one row on a tinted band. */}
              <div className="cb-popup-band flex items-center rounded-xl px-4 py-2.5" style={{ gap: '6px 22px', background: 'var(--brand-soft, rgba(5,150,105,0.10))', border: `1px solid ${t.surfaceBorder}`, fontSize: 12.5, color: t.textPrimary }}>
                <span><span style={bandLabel}>Flat Details:</span> <b>{flatText(refundFor) || '—'}</b></span>
                <span><span style={bandLabel}>Cancellation Date:</span> <b>{refundFor.cancelled_at ? formatDate(refundFor.cancelled_at) : '—'}</b></span>
                <span><span style={bandLabel}>Original Documents Returned:</span> <b>{refundFor.original_documents_returned ? 'Yes' : 'No'}</b></span>
                <span><span style={bandLabel}>Assigned Employee:</span> <b>{refundFor.assigned_employee_name || '—'}</b></span>
              </div>

              {/* Cancellation reason — label and text on the same row. */}
              <div className="flex items-baseline flex-wrap rounded-xl px-4 py-2.5" style={{ gap: '4px 10px', background: 'rgba(234,88,12,0.10)', border: '1px solid rgba(234,88,12,0.30)' }}>
                <span style={{ ...bandLabel, color: '#c2410c' }}>Cancellation Reason →</span>
                <span style={{ fontSize: 14, color: t.textPrimary, fontWeight: 600 }}>{refundFor.cancellation_reason || '—'}</span>
              </div>

              {docLinks(refundFor).length > 0 && (
                <div className="flex items-center gap-4 flex-wrap" style={{ fontSize: 12 }}>
                  <span style={bandLabel}>Cancellation Documents:</span>{docLinks(refundFor)}
                </div>
              )}

              {!refundSummary ? (
                <p style={{ color: t.textSecondary, fontSize: 12 }}>Loading refund details...</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <StatCard compact label="Total Paid" value={rupee(refundSummary.total_paid)} icon={MdAccountBalanceWallet} color="#7c3aed" bg=""
                      surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
                    <StatCard compact label="Total Refunded" value={rupee(refundSummary.total_refunded)} icon={MdAssignmentReturn} color="#16a34a" bg=""
                      surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
                    <StatCard compact label="Refund Balance" value={rupee(Math.max(0, refundSummary.total_paid - refundSummary.total_refunded))} icon={MdCurrencyRupee} color="#ea580c" bg=""
                      surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
                  </div>

                  {/* ── Payment history (before cancellation) ─────────────── */}
                  <Accordion t={t} open={openSection.payments} onToggle={() => setOpenSection((o) => ({ ...o, payments: !o.payments }))}
                    icon={<MdPayments size={17} />} title="Payment History (Before Cancellation)"
                    meta={payHistory ? `${payHistory.length} payment${payHistory.length === 1 ? '' : 's'} · ${rupee(payHistory.reduce((sum, p) => sum + p.amount, 0))}` : 'Loading...'}>
                    {/* V_25.0 — the same Payment History table as Customer Details. */}
                    {!payHistory ? (
                      <p style={{ ...emptyCell, textAlign: 'left' }}>Loading...</p>
                    ) : (
                      <PaymentHistoryTable t={t} isDark={isDark} emptyText="No payments recorded for this customer."
                        rows={[...payHistory].sort((x, y) => String(y.paid_on).localeCompare(String(x.paid_on))).map(toPaymentHistoryRow)}
                        renderActions={() => <span style={{ color: t.textSecondary }}>—</span>} />
                    )}
                  </Accordion>

                  {/* ── Refund history ─────────────────────────────────────── */}
                  <Accordion t={t} open={openSection.refunds} onToggle={() => setOpenSection((o) => ({ ...o, refunds: !o.refunds }))}
                    icon={<MdHistory size={17} />} title="Refund History (After Cancellation)"
                    meta={`Refunded ${rupee(refundSummary.total_refunded)}${refundSummary.pending_refund ? ` · Pending approval ${rupee(refundSummary.pending_refund)}` : ''} · Balance ${rupee(Math.max(0, refundSummary.total_paid - refundSummary.total_refunded))}`}>
                    {/* V_25.0 — the shared Refund History table (same layout as Payment History). */}
                    <RefundHistoryTable t={t} showProcessedBy extraHeader="Balance After"
                      rows={refundHistoryRows(refundSummary).map((r) => ({
                        id: r.id, receipt_number: r.receipt_number, refunded_amount: r.refunded_amount, refund_date: r.refund_date,
                        mode_of_payment: r.mode_of_payment, status: r.status, created_by_name: r.created_by_name,
                        extra: <span style={{ fontWeight: 700, color: '#ea580c' }}>{rupee(r.balance_after)}</span>,
                      }))}
                      renderActions={(r) => (
                        <div className="flex items-center gap-1.5">
                          {r.status === 'approved' && r.receipt_number ? receiptIcons(String(r.id)) : (
                            <span className="inline-flex items-center gap-1" style={{ opacity: 0.4 }} title="Available after admin approval">
                              <button type="button" className="master-icon-btn" disabled aria-label="View Cancelled Receipt (after approval)" style={{ cursor: 'not-allowed' }}><MdVisibility size={14} /></button>
                              <button type="button" className="master-icon-btn" disabled aria-label="Download Cancelled Receipt (after approval)" style={{ cursor: 'not-allowed' }}><MdDownload size={14} /></button>
                            </span>
                          )}
                          {isAdmin && r.status === 'pending' && (
                            <>
                              <button type="button" title="Approve" aria-label="Approve refund" disabled={busyRefund === String(r.id)}
                                onClick={() => decideRefund(String(r.id), true, `${rupee(r.refunded_amount)} to ${refundFor.customer_name}`)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#16a34a', display: 'flex', padding: 0 }}>
                                <MdCheckCircle size={18} />
                              </button>
                              <button type="button" title="Reject" aria-label="Reject refund" disabled={busyRefund === String(r.id)}
                                onClick={() => decideRefund(String(r.id), false, `${rupee(r.refunded_amount)} to ${refundFor.customer_name}`)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex', padding: 0 }}>
                                <MdCancel size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      )} />
                  </Accordion>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {receiptView && (
        <PaymentReceiptViewModal data={receiptView} variant="cancelled"
          onClose={() => setReceiptView(null)}
          onDownload={() => downloadCancelledReceipt(receiptView.transaction.id, receiptView)} />
      )}
    </div>
  );
};

export default CancelledBookingPage;
