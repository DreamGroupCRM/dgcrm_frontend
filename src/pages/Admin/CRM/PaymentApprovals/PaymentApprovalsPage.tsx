// ==========================================
// DREAM GROUP CRM - PAYMENT APPROVALS PAGE
// ==========================================
// V_21.0 — dedicated review queue for payments awaiting admin approval,
// split out of Payment Received (see that page's own header comment).
// Backed by the same is_approved column/endpoints that page always used
// (GET /api/payments?approval=pending, PUT /:id/approve, PUT
// /bulk-approve, DELETE /:id) — nothing new on those; only the filter
// panel (Received By/Building/Wing/Flat/Mode/Company/Date Range) and the
// table's columns are new, backed by findPaymentList's own filter/column
// extension (payment.repository.ts). Route-protected admin/superadmin
// only (see AdminRoutes.tsx), matching the PUT/DELETE routes' own
// requireAdmin gate. The top "Awaiting Approval" stat box is left exactly
// as it already was, per explicit request.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  MdPayments, MdRefresh, MdCheckCircle, MdHourglassEmpty, MdDownload,
  MdVisibility, MdDelete, MdClose, MdKeyboardArrowDown, MdFilterAlt,
} from 'react-icons/md';

import { useAppDispatch } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { AppTheme } from '../../../../styles/theme';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import StatCard from '../../../../components/masters/StatCard';
import PaginationFooter from '../../../../components/common/PaginationFooter';
import { PaymentReceiptViewModal } from '../../../../components/common/PaymentReceiptViewModal';
import {
  fetchPaymentList, approvePayment, bulkApprovePayments, deletePayment, fetchPaymentReceipt,
  paymentForLabel, PaymentListRow,
} from '../../../../services/paymentService';
import { FetchBuildingList, ViewBuilding } from '../../../../services/buildingService';
import { FetchEmployeeDetails } from '../../../../services/employeeDetailsService';
import { companyService } from '../../../../services/companyService';
import { exportPaymentReceiptPdf } from '../Customer-Details/paymentPdfExport';
import { Building, PaymentReceipt } from '../../../../types/index';
import { formatLastLogin, showAlert } from '../../../../utils';

type Theme = AppTheme;

const rupee = (n: number): string => `₹ ${(n || 0).toLocaleString('en-IN')}`;

const formatDMY = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const SHORT_PAYMENT_TYPE_LABEL: Record<string, string> = {
  EMIAmount: 'EMI', BookingAmount: 'Booking', PayAfterbooking: 'Pay After Booking',
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
// lists). ─────────────────────────────────────────────────────────────
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

const PaymentApprovalsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isDark, t, cssVars } = useAppearanceTokens();

  const [rows, setRows] = useState<PaymentListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);

  // ── Filter panel data sources ────────────────────────────────────────
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [employeeNameOptions, setEmployeeNameOptions] = useState<string[]>([]);
  const [companyNameOptions, setCompanyNameOptions] = useState<string[]>([]);

  useEffect(() => {
    dispatch(setPageTitle('Payment Approvals'));
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
  // effect when "Filter" is clicked (item: filtering is button-driven, not
  // live). "Reset" clears both the draft fields and whatever's applied. ──
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
    mode_of_payment?: string; company?: string; date_from?: string; date_to?: string;
  }
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({});

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPaymentList(page, limit, { approval: 'pending', ...appliedFilters });
      if (res.success) { setRows(res.rows); setTotal(res.total); }
      else toast.error('Failed to fetch pending payments.');
    } catch {
      toast.error('Failed to fetch pending payments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, appliedFilters]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { setPage(1); }, [appliedFilters]);
  // Selection is page-scoped — clear it whenever the visible rows change
  // under it (new page, filter, refresh, or an approve removes rows) so a
  // stale id can't get bulk-approved by surprise.
  useEffect(() => { setSelectedIds(new Set()); }, [rows]);

  const handleFilter = () => {
    const flat = flatsInScope.find((f) => f.flat_no === draftFlatNo);
    setAppliedFilters({
      received_by: draftReceivedBy || undefined,
      building_id: selectedBuilding?.id,
      wing_id: selectedWing?.id,
      flat_id: flat?.id,
      mode_of_payment: draftMode || undefined,
      company: draftCompany || undefined,
      date_from: draftFromDate || undefined,
      date_to: draftToDate || undefined,
    });
  };

  const handleResetFilters = () => {
    setDraftReceivedBy(''); setDraftBuildingName(''); setDraftWingName(''); setDraftFlatNo('');
    setDraftMode(''); setDraftCompany(''); setDraftDateRange(''); setDraftFromDate(''); setDraftToDate('');
    setAppliedFilters({});
  };

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

  const handleDelete = async (row: PaymentListRow) => {
    const result = await showAlert.confirm(
      `This will permanently delete the ₹${row.amount.toLocaleString('en-IN')} pending payment (Receipt ${row.receipt_number}) for ${row.customer_name}.`,
      'Delete Payment?'
    );
    if (!result.isConfirmed) return;
    setDeletingId(row.id);
    try {
      await deletePayment(row.id);
      toast.success('Payment deleted.');
      fetchRows();
    } catch {
      toast.error('Failed to delete payment.');
    } finally {
      setDeletingId(null);
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

  // Exports every pending payment matching the current filters — not just
  // the current page — same "fetch a large batch, then download" pattern
  // as Payment Received's own CSV export.
  const [exportingCsv, setExportingCsv] = useState(false);
  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const res = await fetchPaymentList(1, 5000, { approval: 'pending', ...appliedFilters });
      const exportRows = res.rows ?? [];
      if (exportRows.length === 0) {
        toast.error('No pending payments to export.');
        return;
      }
      const header = ['Receipt #', 'Customer', 'Building', 'Wing', 'Flat No', 'Instalment Date', 'Received Date', 'Maintenance', 'Amount', 'Total Amount', 'Mode', 'Payment For', 'Received By', 'Company'];
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
      a.download = `pending_payments_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to export payments. Please try again.');
    } finally {
      setExportingCsv(false);
    }
  };

  // ── Receipt Details (View) popup + the View Receipt preview layered on
  // top of it. ──────────────────────────────────────────────────────────
  const [viewModal, setViewModal] = useState<{ row: PaymentListRow; loading: boolean; data?: PaymentReceipt } | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<PaymentReceipt | null>(null);

  const openViewModal = async (row: PaymentListRow) => {
    setViewModal({ row, loading: true });
    try {
      const res = await fetchPaymentReceipt(row.id);
      setViewModal({ row, loading: false, data: res.data });
    } catch {
      toast.error('Failed to load receipt details.');
      setViewModal(null);
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

  return (
    <div style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 44, height: 44, background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff' }}>
          <MdPayments size={22} style={{ color: '#4f46e5' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 19.5, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Payment Approvals</h1>
          <p style={{ fontSize: 11.5, color: t.textSecondary, margin: '2px 0 0' }}>Approving moves a payment onto the Payment Received page and lets its receipt be printed</p>
        </div>
      </div>

      {/* ── Top stat box — left exactly as it already was. ─────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <StatCard label="Awaiting Approval" value={total} icon={MdHourglassEmpty} color="#ea580c" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
      </div>

      {/* ── Filter panel ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl mb-5 p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 mb-3.5">
          <FilterSelect t={t} label="Received By" value={draftReceivedBy} onChange={setDraftReceivedBy}
            placeholder="--All--" options={employeeNameOptions.map((n) => ({ value: n, label: n }))} />
          <FilterSelect t={t} label="Building Name" value={draftBuildingName} onChange={handleBuildingChange}
            placeholder="--Select--" options={buildings.map((b) => b.building_name).filter((v, i, arr) => arr.indexOf(v) === i).map((n) => ({ value: n, label: n }))} />
          <FilterSelect t={t} label="Wing" value={draftWingName} onChange={handleWingChange}
            placeholder="--Select--" options={wingOptions.map((n) => ({ value: n, label: n }))} disabled={!selectedBuilding} />
          <FilterSelect t={t} label="Flat Number" value={draftFlatNo} onChange={setDraftFlatNo}
            placeholder="--Select--" options={flatsInScope.map((f) => ({ value: f.flat_no, label: f.flat_no }))} disabled={!selectedWing} />
          <FilterSelect t={t} label="ModeOfPayment" value={draftMode} onChange={setDraftMode}
            placeholder="--Select Payment Method--" options={MODE_OF_PAYMENT_OPTIONS.map((m) => ({ value: m, label: m }))} />
          <FilterSelect t={t} label="Company" value={draftCompany} onChange={setDraftCompany}
            placeholder="--Select--" options={companyNameOptions.map((n) => ({ value: n, label: n }))} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-end">
          <FilterSelect t={t} label="Date Range" value={draftDateRange} onChange={applyDateRangePreset} options={DATE_RANGE_OPTIONS} />
          <div>
            <label style={labelStyle}>Payment Date From</label>
            <input type="date" value={draftFromDate} onChange={(e) => { setDraftFromDate(e.target.value); setDraftDateRange(''); }} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Payment Date To</label>
            <input type="date" value={draftToDate} onChange={(e) => { setDraftToDate(e.target.value); setDraftDateRange(''); }} style={inputStyle} />
          </div>
          <button type="button" onClick={handleFilter}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', border: 'none', cursor: 'pointer', height: 38 }}>
            <MdFilterAlt size={16} /> Filter
          </button>
          <button type="button" onClick={handleResetFilters}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer', height: 38 }}>
            <MdClose size={16} /> Reset
          </button>
        </div>
      </div>

      {/* ── Bulk-approve bar — only while rows are selected. ────────────── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl mb-3 p-3" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
          <span style={{ fontSize: 11.5, color: t.textSecondary }}>{selectedIds.size} payment(s) selected</span>
          <button type="button" disabled={bulkApproving} onClick={handleBulkApprove}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white"
            style={{ background: '#16a34a', border: 'none', cursor: bulkApproving ? 'not-allowed' : 'pointer', opacity: bulkApproving ? 0.7 : 1, whiteSpace: 'nowrap' }}>
            <MdCheckCircle size={15} /> {bulkApproving ? 'Approving...' : `Approve Selected Payment (${selectedIds.size})`}
          </button>
        </div>
      )}

      <div className="rounded-2xl mb-5 p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex items-center justify-end gap-2.5">
          <button type="button" onClick={handleExportCsv} disabled={exportingCsv}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: exportingCsv ? 'not-allowed' : 'pointer', opacity: exportingCsv ? 0.6 : 1, whiteSpace: 'nowrap' }}>
            <MdDownload size={16} /> {exportingCsv ? 'Exporting…' : 'Export CSV'}
          </button>
          <button type="button" onClick={fetchRows} title="Refresh"
            className="flex items-center justify-center rounded-xl"
            style={{ width: 40, height: 40, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer', flexShrink: 0 }}>
            <MdRefresh size={18} />
          </button>
        </div>
      </div>

      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="master-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1400 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                <th style={{ padding: '12px 14px', width: 36 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} disabled={rows.length === 0}
                    style={{ cursor: rows.length === 0 ? 'not-allowed' : 'pointer' }} />
                </th>
                {['Actions', 'Receipt No.', 'Name', 'Building', 'Wing', 'Flat No.', 'Instalment Date', 'Received Date', 'Maintenance', 'Amount', 'Total Amount', 'Payment Method', 'Payment Type', 'Received By', 'Company'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={16} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading pending payments...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={16} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>No payments are waiting for approval.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                    <td style={{ padding: '12px 14px' }}>
                      <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelectRow(r.id)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div className="flex items-center gap-1.5">
                        <button type="button" title="View" onClick={() => openViewModal(r)}
                          className="flex items-center justify-center rounded-lg"
                          style={{ width: 26, height: 26, background: isDark ? 'rgba(234,88,12,0.15)' : '#ffedd5', border: 'none', color: '#ea580c', cursor: 'pointer' }}>
                          <MdVisibility size={13} />
                        </button>
                        <button type="button" title="Approve" disabled={approvingId === r.id} onClick={() => handleApprove(r)}
                          className="flex items-center justify-center rounded-lg"
                          style={{ width: 26, height: 26, background: isDark ? 'rgba(22,163,74,0.15)' : '#dcfce7', border: 'none', color: '#16a34a', cursor: approvingId === r.id ? 'not-allowed' : 'pointer' }}>
                          <MdCheckCircle size={13} />
                        </button>
                        <button type="button" title="Delete" disabled={deletingId === r.id} onClick={() => handleDelete(r)}
                          className="flex items-center justify-center rounded-lg"
                          style={{ width: 26, height: 26, background: isDark ? 'rgba(220,38,38,0.12)' : '#fef2f2', border: 'none', color: '#dc2626', cursor: deletingId === r.id ? 'not-allowed' : 'pointer' }}>
                          <MdDelete size={13} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap' }}>{r.receipt_number}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap' }}>{r.customer_name || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.building_name || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.wing_name || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.flat_no || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatDMY(r.inst_date)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatDMY(r.payment_date || r.created_at)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: '#16a34a', fontWeight: 600, whiteSpace: 'nowrap' }}>{rupee(r.maintenance || 0)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap' }}>{rupee(r.amount)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap' }}>{rupee(r.amount + (r.maintenance || 0))}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className="inline-flex items-center px-2 py-1 rounded-md font-semibold" style={{ background: isDark ? 'rgba(37,99,235,0.15)' : '#dbeafe', color: '#2563eb', fontSize: 10.5, whiteSpace: 'nowrap' }}>
                        {r.mode_of_payment || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="inline-flex items-center px-2 py-1 rounded-md font-semibold" style={{ background: isDark ? 'rgba(234,88,12,0.15)' : '#ffedd5', color: '#ea580c', fontSize: 10.5, whiteSpace: 'nowrap' }}>
                          {SHORT_PAYMENT_TYPE_LABEL[r.payment_type] || paymentForLabel(r.payment_type)}
                        </span>
                        {r.payment_tag === 'Extra Pay' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md font-semibold" style={{ background: isDark ? 'rgba(217,119,6,0.15)' : '#fef3c7', color: '#b45309', fontSize: 10.5, whiteSpace: 'nowrap' }}>
                            Extra Pay
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

      {/* ── Receipt Details (View) popup ─────────────────────────────────── */}
      {viewModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setViewModal(null)}>
          <div className="rounded-2xl w-full overflow-hidden" style={{ maxWidth: 560, background: t.surfaceBg, maxHeight: '88vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5" style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Receipt Details - {viewModal.row.receipt_number}</div>
              <button type="button" onClick={() => setViewModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', padding: 4, display: 'flex' }}>
                <MdClose size={20} />
              </button>
            </div>
            <div className="p-5">
              {viewModal.loading || !viewModal.data ? (
                <p style={{ color: t.textSecondary, fontSize: 12 }}>{viewModal.loading ? 'Loading...' : 'Receipt not found.'}</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-4 mb-5">
                    <div><div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' }}>Name</div><div style={{ fontSize: 12.5, fontWeight: 600, color: t.textPrimary }}>{viewModal.data.customer.customer_name || '—'}</div></div>
                    <div><div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' }}>Building</div><div style={{ fontSize: 12.5, fontWeight: 600, color: t.textPrimary }}>{viewModal.data.customer.building_name || '—'}</div></div>
                    <div><div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' }}>Wing</div><div style={{ fontSize: 12.5, fontWeight: 600, color: t.textPrimary }}>{viewModal.data.customer.wing_name || '—'}</div></div>
                    <div><div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' }}>Flat No.</div><div style={{ fontSize: 12.5, fontWeight: 600, color: t.textPrimary }}>{viewModal.data.customer.flat_no || '—'}</div></div>
                    <div><div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' }}>Instalment Date</div><div style={{ fontSize: 12.5, fontWeight: 600, color: t.textPrimary }}>{formatDMY(viewModal.data.transaction.inst_date)}</div></div>
                    <div><div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' }}>Payment Date</div><div style={{ fontSize: 12.5, fontWeight: 600, color: t.textPrimary }}>{formatDMY(viewModal.data.transaction.payment_date || viewModal.data.transaction.created_at)}</div></div>
                    <div><div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' }}>Created At</div><div style={{ fontSize: 12.5, fontWeight: 600, color: t.textPrimary }}>{formatDMY(viewModal.data.transaction.created_at)}</div></div>
                    <div><div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' }}>Payment Method</div><div style={{ fontSize: 12.5, fontWeight: 600, color: t.textPrimary }}>{viewModal.data.transaction.mode_of_payment || '—'}</div></div>
                    <div><div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' }}>Payment Type</div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold" style={{ background: isDark ? 'rgba(234,88,12,0.15)' : '#ffedd5', color: '#ea580c', fontSize: 10.5 }}>
                        {SHORT_PAYMENT_TYPE_LABEL[viewModal.data.transaction.payment_type] || paymentForLabel(viewModal.data.transaction.payment_type)}
                      </span>
                    </div>
                    <div><div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' }}>Maintenance</div><div style={{ fontSize: 12.5, fontWeight: 600, color: '#16a34a' }}>{rupee(viewModal.data.transaction.maintenance || 0)}</div></div>
                    <div><div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' }}>Amount</div><div style={{ fontSize: 12.5, fontWeight: 700, color: t.textPrimary }}>{rupee(viewModal.data.transaction.amount)}</div></div>
                    <div><div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' }}>Total</div><div style={{ fontSize: 12.5, fontWeight: 700, color: t.textPrimary }}>{rupee(viewModal.data.transaction.amount + (viewModal.data.transaction.maintenance || 0))}</div></div>
                    <div><div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' }}>Received By</div><div style={{ fontSize: 12.5, fontWeight: 600, color: t.textPrimary }}>{viewModal.data.transaction.received_by || '—'}</div></div>
                    <div><div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' }}>Company</div><div style={{ fontSize: 12.5, fontWeight: 600, color: t.textPrimary }}>{viewModal.data.transaction.company || '—'}</div></div>
                    <div><div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' }}>Status</div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold" style={{ background: isDark ? 'rgba(217,119,6,0.15)' : '#fef3c7', color: '#b45309', fontSize: 10.5 }}>
                        {viewModal.data.transaction.is_approved ? 'Approved' : 'Unapproved'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 flex-wrap" style={{ borderTop: `1px solid ${t.divider}`, paddingTop: 16 }}>
                    <button type="button" onClick={() => setViewModal(null)}
                      className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
                      Close
                    </button>
                    <button type="button" onClick={() => viewModal.data && exportPaymentReceiptPdf(viewModal.data)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
                      style={{ background: isDark ? 'rgba(22,163,74,0.15)' : '#dcfce7', border: 'none', color: '#16a34a', cursor: 'pointer' }}>
                      <MdDownload size={15} /> Download Receipt
                    </button>
                    <button type="button" onClick={() => viewModal.data && setReceiptPreview(viewModal.data)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
                      style={{ background: isDark ? 'rgba(37,99,235,0.15)' : '#dbeafe', border: 'none', color: '#2563eb', cursor: 'pointer' }}>
                      <MdVisibility size={15} /> View Receipt
                    </button>
                    <button type="button" disabled={approvingId === viewModal.row.id}
                      onClick={async () => { await handleApprove(viewModal.row); setViewModal(null); }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                      style={{ background: '#16a34a', border: 'none', cursor: approvingId === viewModal.row.id ? 'not-allowed' : 'pointer' }}>
                      <MdCheckCircle size={15} /> Approve
                    </button>
                    <button type="button" disabled={deletingId === viewModal.row.id}
                      onClick={async () => { await handleDelete(viewModal.row); setViewModal(null); }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                      style={{ background: '#dc2626', border: 'none', cursor: deletingId === viewModal.row.id ? 'not-allowed' : 'pointer' }}>
                      <MdDelete size={15} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── View Receipt preview — layered above the Receipt Details popup. ── */}
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

export default PaymentApprovalsPage;
