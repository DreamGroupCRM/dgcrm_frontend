// ==========================================
// DREAM GROUP CRM - PAYMENT RECEIVED PAGE
// ==========================================
// V_21.0 — this page shows ONLY approved payments (approval: 'approved'
// hard-coded below, not a toggle) — a payment that hasn't been approved
// yet no longer appears here at all. Review/approve pending payments moved
// to its own dedicated screen, PaymentApprovalsPage.tsx (see Sidebar.tsx's
// "Payment Approvals" entry). Nothing about is_approved's effect on
// due/EMI/remaining-balance math changed — those calculations still count
// a payment the moment it's collected, exactly as before.
//
// Full redesign per the attached legacy-style reference screenshot:
// gradient top stat boxes (Total Flat Sold/Amount Received/Pending
// Amount — a new GET /payments/received-summary endpoint, since none of
// those 3 numbers existed as a single aggregate anywhere), a
// filter/reset panel mirroring Payment Approvals' own (same fields minus
// Payment For, in 2 rows not 3), and a table whose shape matches Payment
// Approvals' (checkbox + Actions first) with View Receipt/Download
// Receipt/Delete instead of View/Approve/Delete.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdPayments, MdRefresh, MdSearch, MdDownload, MdClose, MdKeyboardArrowDown,
  MdFilterAlt, MdVisibility, MdDelete, MdHome, MdHourglassEmpty,
} from 'react-icons/md';

import { useAppDispatch } from '../../../../hooks';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { ROUTES } from '../../../../constants';
import { AppTheme } from '../../../../styles/theme';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import StatCard from '../../../../components/masters/StatCard';
import PaginationFooter from '../../../../components/common/PaginationFooter';
import { PaymentReceiptViewModal } from '../../../../components/common/PaymentReceiptViewModal';
import {
  fetchPaymentList, paymentForLabel, PaymentListRow,
  fetchPaymentReceivedSummary, PaymentReceivedSummary, fetchPaymentReceipt, deletePayment,
} from '../../../../services/paymentService';
import { FetchBuildingList, ViewBuilding } from '../../../../services/buildingService';
import { FetchEmployeeDetails } from '../../../../services/employeeDetailsService';
import { companyService } from '../../../../services/companyService';
import { exportPaymentReceiptPdf } from '../Customer-Details/paymentPdfExport';
import { Building, PaymentReceipt } from '../../../../types/index';
import { showAlert } from '../../../../utils';
import './PaymentReceived.css';
import { useRoleBasePath } from '../../../../hooks/useRoleBasePath';

type Theme = AppTheme;

const rupee = (n: number): string => `₹ ${(n || 0).toLocaleString('en-IN')}`;

const formatDMY = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const SHORT_PAYMENT_TYPE_LABEL: Record<string, string> = {
  EMIAmount: 'EMI', BookingAmount: 'Booking', PayAfterbooking: 'Remaining Booking Amount',
  PossessionAmount: 'Possession', AnnualAmount: 'Booster Before', AnnualAmount1: 'Booster After',
};

const MODE_OF_PAYMENT_OPTIONS = ['Cash', 'Cheque', 'Online', 'Other'];

const DATE_RANGE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '--Select Range--' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'last_15_days', label: 'Last 15 Days' },
  { value: 'last_month', label: 'Last Month' },
];

// ── Plain <select>-backed dropdown — used for every filter here (all of
// them are short, known lists; no need for the type-to-filter
// SearchableSelect pattern other pages use for long customer/company
// lists). Same component Payment Approvals uses. ─────────────────────────
const FilterSelect: React.FC<{
  t: Theme; label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder?: string; disabled?: boolean;
}> = ({ t, label, value, onChange, options, placeholder, disabled }) => (
  <div>
    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</label>
    <div className="relative">
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%', appearance: 'none', background: disabled ? t.insetBg : t.inputBg, border: `1px solid ${t.inputBorder}`,
          color: t.inputText, borderRadius: 10, padding: '9px 30px 9px 10px', fontSize: 12, outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <MdKeyboardArrowDown size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: t.textSecondary, pointerEvents: 'none' }} />
    </div>
  </div>
);

const PaymentReceivedPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isDark, t, cssVars } = useAppearanceTokens();
  const paths = useRoleBasePath();

  const [rows, setRows] = useState<PaymentListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportingCsv, setExportingCsv] = useState(false);

  // ── Top stat boxes — Total Flat Sold (total sale value of every sold
  // flat), Total Amount Received (every approved payment), Total Pending
  // Amount (the difference) — independent of the table's own filters. ────
  const [summary, setSummary] = useState<PaymentReceivedSummary | null>(null);
  const fetchSummary = useCallback(async () => {
    try {
      setSummary(await fetchPaymentReceivedSummary());
    } catch {
      // Stat boxes just stay at their last known value on failure.
    }
  }, []);

  // ── Filter panel data sources ────────────────────────────────────────
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [employeeNameOptions, setEmployeeNameOptions] = useState<string[]>([]);
  const [companyNameOptions, setCompanyNameOptions] = useState<string[]>([]);

  useEffect(() => {
    dispatch(setPageTitle('Payment Received'));
    (async () => {
      try {
        const res = await FetchBuildingList(1, 1000);
        if (res.success) setBuildings(res.rows ?? []);
      } catch { /* filter just stays empty if this fails */ }
    })();
    (async () => {
      try {
        const res = await FetchEmployeeDetails(1, 1000, undefined, true);
        if (res.success) setEmployeeNameOptions(Array.from(new Set((res.rows ?? []).map((e) => [e.first_name, e.last_name].filter(Boolean).join(' ')))));
      } catch { /* filter just stays empty if this fails */ }
    })();
    (async () => {
      try {
        const res = await companyService.FetchCompanyList(1, 1000);
        if (res.success) setCompanyNameOptions(Array.from(new Set((res.rows ?? []).map((c: { name: string }) => c.name))));
      } catch { /* filter just stays empty if this fails */ }
    })();
  }, [dispatch]);

  // ── Draft filter fields — bound to the panel's own inputs, only take
  // effect when "Filter" is clicked. "Reset" clears both the draft fields
  // and whatever's applied. Same button-driven pattern as Payment
  // Approvals' own filter panel. ───────────────────────────────────────
  const [draftReceivedBy, setDraftReceivedBy] = useState('');
  const [draftBuildingName, setDraftBuildingName] = useState('');
  const [draftWingName, setDraftWingName] = useState('');
  const [draftFlatNo, setDraftFlatNo] = useState('');
  const [draftMode, setDraftMode] = useState('');
  const [draftCompany, setDraftCompany] = useState('');
  const [draftDateRange, setDraftDateRange] = useState('');
  const [draftFromDate, setDraftFromDate] = useState('');
  const [draftToDate, setDraftToDate] = useState('');

  const selectedBuilding = useMemo(() => buildings.find((b) => b.building_name === draftBuildingName), [buildings, draftBuildingName]);
  const [buildingDetail, setBuildingDetail] = useState<Building | null>(null);
  useEffect(() => {
    if (!selectedBuilding) { setBuildingDetail(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await ViewBuilding(selectedBuilding.id);
        if (!cancelled && res.success) setBuildingDetail(res.data);
      } catch { /* Wing/Flat just stay empty if this fails */ }
    })();
    return () => { cancelled = true; };
  }, [selectedBuilding?.id]);

  const wingOptions = useMemo(() => (buildingDetail ? Array.from(new Set(buildingDetail.wings.map((w) => w.name))) : []), [buildingDetail]);
  const selectedWing = useMemo(() => buildingDetail?.wings.find((w) => w.name === draftWingName), [buildingDetail, draftWingName]);
  const flatsInScope = useMemo(() => selectedWing?.floors.flatMap((f) => f.flats) ?? [], [selectedWing]);

  // Changing Building/Wing clears whatever was picked at the level(s)
  // below it — a stale Wing/Flat from a different building would
  // otherwise silently stay selected.
  const handleBuildingChange = (v: string) => { setDraftBuildingName(v); setDraftWingName(''); setDraftFlatNo(''); };
  const handleWingChange = (v: string) => { setDraftWingName(v); setDraftFlatNo(''); };

  const applyDateRangePreset = (preset: string) => {
    setDraftDateRange(preset);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const today = new Date();
    if (preset === 'today') { setDraftFromDate(fmt(today)); setDraftToDate(fmt(today)); }
    else if (preset === 'yesterday') {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      setDraftFromDate(fmt(y)); setDraftToDate(fmt(y));
    } else if (preset === 'last_week') {
      const from = new Date(today); from.setDate(from.getDate() - 7);
      setDraftFromDate(fmt(from)); setDraftToDate(fmt(today));
    } else if (preset === 'last_15_days') {
      const from = new Date(today); from.setDate(from.getDate() - 15);
      setDraftFromDate(fmt(from)); setDraftToDate(fmt(today));
    } else if (preset === 'last_month') {
      const from = new Date(today); from.setMonth(from.getMonth() - 1);
      setDraftFromDate(fmt(from)); setDraftToDate(fmt(today));
    } else {
      setDraftFromDate(''); setDraftToDate('');
    }
  };

  // ── Applied filters — what the table actually queries by. ────────────
  interface AppliedFilters {
    received_by?: string; building_id?: string; wing_id?: string; flat_id?: string;
    mode_of_payment?: string; company?: string; date_from?: string; date_to?: string; search?: string;
  }
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({});

  // ── Search by Customer ID/Name — a standalone, live field on the toolbar
  // row (left of Export CSV/Refresh), independent of the Filter/Reset panel
  // above. Debounced so it doesn't fire a request on every keystroke. ─────
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 400);
  useEffect(() => {
    setAppliedFilters((prev) => ({ ...prev, search: debouncedSearch.trim() || undefined }));
  }, [debouncedSearch]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPaymentList(page, limit, { approval: 'approved', ...appliedFilters });
      if (res.success) { setRows(res.rows); setTotal(res.total); }
      else toast.error('Failed to fetch payments.');
    } catch {
      toast.error('Failed to fetch payments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, appliedFilters]);

  useEffect(() => { fetchRows(); fetchSummary(); }, [fetchRows, fetchSummary]);
  useEffect(() => { setPage(1); }, [appliedFilters]);
  // Selection is page-scoped — clear it whenever the visible rows change
  // under it (new page, filter, refresh, or a delete removes rows) so a
  // stale id can't be acted on by surprise.
  useEffect(() => { setSelectedIds(new Set()); }, [rows]);

  const handleFilter = () => {
    const flat = flatsInScope.find((f) => f.flat_no === draftFlatNo);
    setAppliedFilters((prev) => ({
      received_by: draftReceivedBy || undefined,
      building_id: selectedBuilding?.id,
      wing_id: selectedWing?.id,
      flat_id: flat?.id,
      mode_of_payment: draftMode || undefined,
      company: draftCompany || undefined,
      date_from: draftFromDate || undefined,
      date_to: draftToDate || undefined,
      search: prev.search,
    }));
  };

  const handleResetFilters = () => {
    setDraftReceivedBy(''); setDraftBuildingName(''); setDraftWingName(''); setDraftFlatNo('');
    setDraftMode(''); setDraftCompany(''); setDraftDateRange(''); setDraftFromDate(''); setDraftToDate('');
    setAppliedFilters((prev) => ({ search: prev.search }));
  };

  // Same as handleResetFilters, plus clears the search box too — used by
  // the "Total Amount Received" stat box's click, since that number
  // represents every approved payment with nothing filtered out at all.
  const handleShowAllReceived = () => {
    setSearchQuery('');
    handleResetFilters();
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

  // Exports every approved payment matching the current filters — not just
  // the current page — same "fetch a large batch, then download" pattern
  // as Payment Approvals' own CSV export.
  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const res = await fetchPaymentList(1, 5000, { approval: 'approved', ...appliedFilters });
      const exportRows = res.rows ?? [];
      if (exportRows.length === 0) {
        toast.error('No payments to export.');
        return;
      }
      const header = ['Receipt #', 'Customer', 'Building', 'Wing', 'Flat No', 'Payment Date', 'Receipt Date', 'Maintenance', 'Amount', 'Total Amount', 'Mode', 'Payment For', 'Received By', 'Company'];
      const csvRows = exportRows.map((r) => [
        r.receipt_number, r.customer_name || '', r.building_name || '', r.wing_name || '', r.flat_no || '',
        formatDMY(r.inst_date), formatDMY(r.payment_date || r.created_at), r.maintenance || 0, r.amount, r.amount + (r.maintenance || 0),
        r.mode_of_payment || '', paymentForLabel(r.payment_type), r.received_by || '', r.company || '',
      ]);
      const csv = [header, ...csvRows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments_received_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to export payments. Please try again.');
    } finally {
      setExportingCsv(false);
    }
  };

  // ── Row actions — View Receipt (popup), Download Receipt (PDF), Delete
  // (confirm then remove). ─────────────────────────────────────────────
  const [receiptPreview, setReceiptPreview] = useState<PaymentReceipt | null>(null);

  const handleViewReceipt = async (row: PaymentListRow) => {
    try {
      const res = await fetchPaymentReceipt(row.id);
      setReceiptPreview(res.data);
    } catch {
      toast.error('Failed to load receipt.');
    }
  };

  const handleDownloadReceipt = async (row: PaymentListRow) => {
    setDownloadingId(row.id);
    try {
      const res = await fetchPaymentReceipt(row.id);
      exportPaymentReceiptPdf(res.data);
    } catch {
      toast.error('Failed to download receipt.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (row: PaymentListRow) => {
    const result = await showAlert.confirm(
      `This will permanently delete the ₹${row.amount.toLocaleString('en-IN')} payment (Receipt ${row.receipt_number}) for ${row.customer_name}.`,
      'Delete Payment?'
    );
    if (!result.isConfirmed) return;
    setDeletingId(row.id);
    try {
      await deletePayment(row.id);
      toast.success('Payment deleted.');
      fetchRows();
      fetchSummary();
    } catch {
      toast.error('Failed to delete payment.');
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const to = Math.min(safePage * limit, total);
  const pageBtns = useMemo(() => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [safePage, totalPages]);

  const inputStyle: React.CSSProperties = { width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 10px', fontSize: 12, outline: 'none' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 };

  // ── Filter/Reset (+ Generate Receipt) button trio — deliberately
  // compact (not stretched to fill their grid column) and in fresh light
  // tints instead of the earlier solid orange/gray, per explicit request. ──
  const actionBtnBase: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 38, borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' };

  return (
    <div className="pr-page" style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div className="pr-header flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 44, height: 44, background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff' }}>
          <MdPayments size={22} style={{ color: '#4f46e5' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 19.5, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Payment Received</h1>
          <p style={{ fontSize: 11.5, color: t.textSecondary, margin: '2px 0 0' }}>Every approved payment — pending payments are reviewed on the Payment Approvals page</p>
        </div>
      </div>

      {/* ── Top stat boxes — gradient StatCard, same look used site-wide.
          Total Flat Sold isn't a filterable dimension of this table (it's
          a sale-value total, not a payment) so it stays non-clickable.
          Total Amount Received represents every approved payment with
          nothing filtered — clicking it clears the filter panel + search.
          Total Pending Amount lives on a different page entirely (pending
          payments are reviewed on Payment Approvals, never here) — clicking
          it navigates there instead of trying to "filter" a page that, by
          definition, never shows pending rows. ─────────────────────────── */}
      <div className="pr-stat-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <StatCard label="Total Flat Sold" value={rupee(summary?.total_flat_sold ?? 0)} icon={MdHome} color="#7c3aed" bg="" loading={!summary}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Total Amount Received" value={rupee(summary?.total_amount_received ?? 0)} icon={MdPayments} color="#16a34a" bg="" loading={!summary}
          onClick={handleShowAllReceived}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        {/* Payment Approvals is an admin-only page, and this page is now
            reachable from the employee sidebar too — so for an employee
            this tile stays a plain figure rather than a link that would
            bounce them off ProtectedRoute. */}
        <StatCard label="Total Pending Amount" value={rupee(summary?.total_pending_amount ?? 0)} icon={MdHourglassEmpty} color="#ea580c" bg="" loading={!summary}
          onClick={paths.isAdmin ? () => navigate(ROUTES.ADMIN.PAYMENT_APPROVALS) : undefined}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
      </div>

      {/* ── Filter panel — Received By/Building/Wing/Flat/Mode/Company in
          row 1, Date Range/From/To + action buttons in row 2 (exactly 2
          rows, no Payment For field). ────────────────────────────────── */}
      <div className="pr-filter-card rounded-2xl mb-5 p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="pr-filter-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 mb-3.5">
          <FilterSelect t={t} label="Received By" value={draftReceivedBy} onChange={setDraftReceivedBy}
            placeholder="--All--" options={employeeNameOptions.map((n) => ({ value: n, label: n }))} />
          <FilterSelect t={t} label="Company" value={draftCompany} onChange={setDraftCompany}
            placeholder="--Select--" options={companyNameOptions.map((n) => ({ value: n, label: n }))} />
          <FilterSelect t={t} label="Building Name" value={draftBuildingName} onChange={handleBuildingChange}
            placeholder="--Select--" options={buildings.filter((b) => b.is_active).map((b) => b.building_name).filter((v, i, arr) => arr.indexOf(v) === i).map((n) => ({ value: n, label: n }))} />
          <FilterSelect t={t} label="Wing" value={draftWingName} onChange={handleWingChange}
            placeholder="--Select--" options={wingOptions.map((n) => ({ value: n, label: n }))} disabled={!selectedBuilding} />
          <FilterSelect t={t} label="Flat Number" value={draftFlatNo} onChange={setDraftFlatNo}
            placeholder="--Select--" options={flatsInScope.map((f) => ({ value: f.flat_no, label: f.flat_no }))} disabled={!selectedWing} />
          <FilterSelect t={t} label="ModeOfPayment" value={draftMode} onChange={setDraftMode}
            placeholder="--Select Payment Method--" options={MODE_OF_PAYMENT_OPTIONS.map((m) => ({ value: m, label: m }))} />
        </div>
        <div className="pr-filter-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-end">
          <FilterSelect t={t} label="Date Range" value={draftDateRange} onChange={applyDateRangePreset} options={DATE_RANGE_OPTIONS} />
          <div>
            <label style={labelStyle}>Receipt Date From</label>
            <input type="date" value={draftFromDate} onChange={(e) => { setDraftFromDate(e.target.value); setDraftDateRange(''); }} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Receipt Date To</label>
            <input type="date" value={draftToDate} onChange={(e) => { setDraftToDate(e.target.value); setDraftDateRange(''); }} style={inputStyle} />
          </div>
          <div className="pr-filter-actions flex items-center gap-2 flex-wrap" style={{ gridColumn: 'span 3 / span 3' }}>
            <button type="button" onClick={handleFilter}
              style={{ ...actionBtnBase, background: 'var(--brand-gradient)', color: '#fff', border: 'none' }}>
              <MdFilterAlt size={15} /> Filter
            </button>
            <button type="button" onClick={handleResetFilters}
              style={{ ...actionBtnBase, background: 'var(--brand-gradient)', color: '#fff', border: 'none' }}>
              <MdClose size={15} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* ── Toolbar — Search (left), Export CSV + Refresh (right). ──────── */}
      <div className="pr-toolbar rounded-2xl mb-5 p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="pr-toolbar-row flex items-center justify-between gap-3" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
          <div className="pr-toolbar-search flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, width: 280, flexShrink: 0 }}>
            <MdSearch size={17} style={{ color: t.textSecondary, flexShrink: 0 }} />
            <input type="text" placeholder="Search by Customer ID and Customer Name" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 12, width: '100%' }} />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 0, display: 'flex', flexShrink: 0 }}>
                <MdClose size={15} />
              </button>
            )}
          </div>
          <div className="pr-toolbar-actions flex items-center gap-2.5" style={{ flexShrink: 0 }}>
            <button type="button" onClick={handleExportCsv} disabled={exportingCsv}
              className="pr-export-btn flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: exportingCsv ? 'not-allowed' : 'pointer', opacity: exportingCsv ? 0.6 : 1, whiteSpace: 'nowrap' }}>
              <MdDownload size={16} /> <span className="pr-export-btn-text">{exportingCsv ? 'Exporting…' : 'Export CSV'}</span>
            </button>
            <button type="button" onClick={() => { fetchRows(); fetchSummary(); }} title="Refresh"
              className="pr-refresh-btn flex items-center justify-center rounded-xl"
              style={{ width: 40, height: 40, background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
              <MdRefresh size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="pr-table-card rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="master-table-scroll">
          <table className="pr-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1400 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                <th style={{ padding: '12px 14px', width: 36 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} disabled={rows.length === 0}
                    style={{ cursor: rows.length === 0 ? 'not-allowed' : 'pointer' }} />
                </th>
                {['Actions', 'Receipt No.', 'Customer Name', 'Building Details', 'Payment Date', 'Receipt Date', 'Maintenance', 'Amount', 'Total Amount', 'Payment Method', 'Payment Type', 'Received By', 'Company'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={14} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading payments...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={14} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>No payments found.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                    <td style={{ padding: '12px 14px' }}>
                      <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelectRow(r.id)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div className="pr-row-actions flex items-center gap-1.5">
                        <button type="button" title="View Receipt" onClick={() => handleViewReceipt(r)}
                          className="flex items-center justify-center rounded-lg"
                          style={{ width: 26, height: 26, background: isDark ? 'rgba(0, 0, 255,0.18)' : '#e0f2ff', border: 'none', color: 'var(--brand-ink)', cursor: 'pointer' }}>
                          <MdVisibility size={13} />
                        </button>
                        <button type="button" title="Download Receipt" disabled={downloadingId === r.id} onClick={() => handleDownloadReceipt(r)}
                          className="flex items-center justify-center rounded-lg"
                          style={{ width: 26, height: 26, background: isDark ? 'rgba(22,163,74,0.15)' : '#dcfce7', border: 'none', color: '#16a34a', cursor: downloadingId === r.id ? 'not-allowed' : 'pointer' }}>
                          <MdDownload size={13} />
                        </button>
                        <button type="button" title="Delete" disabled={deletingId === r.id} onClick={() => handleDelete(r)}
                          className="flex items-center justify-center rounded-lg"
                          style={{ width: 26, height: 26, background: isDark ? 'rgba(220,38,38,0.12)' : '#fef2f2', border: 'none', color: '#dc2626', cursor: deletingId === r.id ? 'not-allowed' : 'pointer' }}>
                          <MdDelete size={13} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap' }}>{r.receipt_number}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>{r.customer_name || '—'}</div>
                      <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 1 }}>{r.customer_code || '—'}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>{r.building_name || '—'}</div>
                      {(r.wing_name || r.flat_no) && (
                        <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 1 }}>
                          {r.wing_name ? `Wing ${r.wing_name}` : ''}{r.wing_name && r.flat_no ? ' • ' : ''}{r.flat_no ? `Flat ${r.flat_no}` : ''}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.payment_tag === 'Extra Pay' ? '—' : formatDMY(r.inst_date)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatDMY(r.payment_date || r.created_at)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: '#16a34a', fontWeight: 600, whiteSpace: 'nowrap' }}>{rupee(r.maintenance || 0)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap' }}>{rupee(r.amount)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap' }}>{rupee(r.amount + (r.maintenance || 0))}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className="inline-flex items-center px-2 py-1 rounded-md font-semibold" style={{ background: isDark ? 'rgba(0, 0, 255,0.18)' : '#efebe9', color: 'var(--brand-ink)', fontSize: 10.5, whiteSpace: 'nowrap' }}>
                        {r.mode_of_payment || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div className="flex items-center gap-1 flex-wrap">
                        {r.payment_tag === 'Extra Pay' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-md font-semibold" style={{ background: isDark ? 'rgba(217,119,6,0.15)' : '#fef3c7', color: '#b45309', fontSize: 10.5, whiteSpace: 'nowrap' }}>
                            Extra Pay
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-md font-semibold" style={{ background: isDark ? 'rgba(234,88,12,0.15)' : '#ffedd5', color: '#ea580c', fontSize: 10.5, whiteSpace: 'nowrap' }}>
                            {SHORT_PAYMENT_TYPE_LABEL[r.payment_type] || paymentForLabel(r.payment_type)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.received_by || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.company || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationFooter t={t} limit={limit} setLimit={setLimit} setPage={setPage} safePage={safePage} totalPages={totalPages} from={from} to={to} total={total} pageBtns={() => pageBtns} />
      </div>

      {/* ── View Receipt popup ────────────────────────────────────────── */}
      {receiptPreview && (
        <PaymentReceiptViewModal
          data={receiptPreview}
          onClose={() => setReceiptPreview(null)}
          onDownload={() => exportPaymentReceiptPdf(receiptPreview)}
        />
      )}

    </div>
  );
};

export default PaymentReceivedPage;
