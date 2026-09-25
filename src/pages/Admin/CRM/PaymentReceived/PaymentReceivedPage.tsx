// ==========================================
// DREAM GROUP CRM - PAYMENT RECEIVED PAGE
// ==========================================
// V_24.0 — Payment Approval is merged into this page (its separate page
// and tab are gone). The table shows ALL payments by default; the centered
// All / Approved / UnApproved buttons on the toolbar row narrow it (each
// shows its live count for the current filters/search). UnApproved = rows
// submitted from Payment Dues that no admin has approved yet. An admin
// approves one row from its three-dot menu, or ticks several and clicks
// "Approve Selected" — approved rows then move to Approved. The search box
// matches anything shown in the table (see findPaymentList's search). Nothing
// about is_approved's effect on due/EMI/remaining-balance math changed.
//
// Full redesign per the attached legacy-style reference screenshot:
// admin-only top stat boxes (Total Flat Sold/Amount Received/Pending
// Amount — GET /payments/received-summary), per-category totals in the
// table's footer row, a
// filter/reset panel mirroring Payment Approvals' own (same fields minus
// Payment For, in 2 rows not 3), and a table whose shape matches Payment
// Approvals' (checkbox + Actions first) with View Receipt/Download
// Receipt/Delete instead of View/Approve/Delete.
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/utils/toast';
import {
  MdPayments, MdRefresh, MdSearch, MdDownload, MdClose, MdKeyboardArrowDown,
  MdFilterAlt, MdVisibility, MdDelete,
  MdCheckCircle, MdUpcoming, MdMoreVert, MdHourglassEmpty,
  MdHomeWork, MdPendingActions,
} from 'react-icons/md';

import { useAppDispatch } from '../../../../hooks';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { ROUTES } from '../../../../constants';
import { AppTheme } from '../../../../styles/theme';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import StatCard from '../../../../components/masters/StatCard';
import { useInfiniteScroll } from '../../../../hooks/useInfiniteScroll';
import { RowActionMenu, useRowActionMenu } from '../../../../components/common/RowActionMenu';
import { PaymentReceiptViewModal } from '../../../../components/common/PaymentReceiptViewModal';
import {
  fetchPaymentList, PaymentListRow,
  fetchPaymentCategorySummary, PaymentCategorySummary, fetchPaymentReceipt, deletePayment,
  fetchPaymentReceivedSummary, PaymentReceivedSummary,
  approvePayment, bulkApprovePayments,
} from '../../../../services/paymentService';
import { FetchBuildingList, ViewBuilding } from '../../../../services/buildingService';
import { FetchEmployeeDetails } from '../../../../services/employeeDetailsService';
import { companyService } from '../../../../services/companyService';
import { exportPaymentReceiptPdf } from '../Customer-Details/paymentPdfExport.lazy';
import { Building, PaymentReceipt } from '../../../../types/index';
import { showAlert } from '../../../../utils';
import './PaymentReceived.css';
import { useRoleBasePath } from '../../../../hooks/useRoleBasePath';
import { serverToday, toYmd } from '../../../../utils/serverTime';
import { BackdatedDot } from '../../../../components/common/BackdatedDot';

type Theme = AppTheme;

const rupee = (n: number): string => `₹ ${(n || 0).toLocaleString('en-IN')}`;

const formatDMY = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};


// V_24.0 — full Payment Type labels, matching Payment Due's own
// PAYMENT_FOR_KEY_META exactly (kept as a local duplicate rather than a
// shared import — same per-page convention as FilterSelect above). EMI is
// split into "EMI Before"/"EMI After" using is_after_possession_emi
// (V_24.0 — now returned by GET /payments), the same flag Payment Due's
// virtual due-item rows use for their own identical split.
const PAYMENT_TYPE_LABEL: Record<string, string> = {
  BookingAmount: 'Booking Amount', PayAfterbooking: 'Remaining Booking Amount',
  PossessionAmount: 'Possession Amount', AnnualAmount: 'Booster Before Possession', AnnualAmount1: 'Booster After Possession',
};
const paymentTypeLabel = (r: { payment_type: string; is_after_possession_emi: boolean }): string => {
  if (r.payment_type === 'EMIAmount') return r.is_after_possession_emi ? 'EMI After' : 'EMI Before';
  return PAYMENT_TYPE_LABEL[r.payment_type] || r.payment_type;
};

// Totals footer row background — a fixed dark shade (not the lighter
// header gradient) so the bold white totals read clearly in every theme.
const TOTALS_ROW_BG = '#0b3b3c';

// Rows fetched per lazy-load batch (initial view and each scroll step).
const PAYMENT_BATCH_SIZE = 100;

const MODE_OF_PAYMENT_OPTIONS = ['Cash', 'Cheque', 'Online', 'Other'];

const DATE_RANGE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '--Select Range--' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'last_15_days', label: 'Last 15 Days' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_financial_year', label: 'Last Financial Year' },
];


// Returns the [from, to] Received Date range for a Date Range preset.
// last_month = the full previous calendar month (e.g. on 24 Sep: 1 Aug–31 Aug).
// last_financial_year = the previous Apr–Mar Indian FY (e.g. on 24 Sep 2026:
// 1 Apr 2025–31 Mar 2026; on 10 Feb 2026: 1 Apr 2024–31 Mar 2025).
const dateRangeForPreset = (preset: string, today: Date = serverToday()): [string, string] => {
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  switch (preset) {
    case 'today': return [toYmd(today), toYmd(today)];
    case 'yesterday': { const t = new Date(y, m, d - 1); return [toYmd(t), toYmd(t)]; }
    case 'last_week': return [toYmd(new Date(y, m, d - 7)), toYmd(today)];
    case 'last_15_days': return [toYmd(new Date(y, m, d - 15)), toYmd(today)];
    case 'last_month': return [toYmd(new Date(y, m - 1, 1)), toYmd(new Date(y, m, 0))];
    case 'last_financial_year': {
      const currentFyStartYear = m >= 3 ? y : y - 1;
      return [toYmd(new Date(currentFyStartYear - 1, 3, 1)), toYmd(new Date(currentFyStartYear, 2, 31))];
    }
    default: return ['', ''];
  }
};

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

// V_24.0 — which rows the table shows: every payment, only approved, or
// only unapproved (is_approved = false). Maps onto GET /payments' own
// `approval` param ('all' just omits it).
type ApprovalView = 'all' | 'approved' | 'pending';
const APPROVAL_VIEWS: { key: ApprovalView; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: '#2563eb' },
  { key: 'approved', label: 'Approved', color: '#16a34a' },
  { key: 'pending', label: 'UnApproved', color: '#d97706' },
];
const approvalParam = (v: ApprovalView): 'approved' | 'pending' | undefined => (v === 'all' ? undefined : v);

// ── Totals bar (EMI Before … Total) ─────────────────────────────────────
// Always ONE line with every entry visible and no horizontal scrollbar.
// Each entry is only as wide as its label + amount; spare width is spread
// between them. If the entries don't fit at 13px (a narrow screen or very
// large amounts), the font steps down until they do (min 8px); it's
// re-checked whenever the bar resizes or the amounts change.
const TotalsBar: React.FC<{ items: { key: string; label: string; value: string; grand?: boolean }[] }> = ({ items }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [fontPx, setFontPx] = useState(13);
  const signature = items.map((i) => i.value).join('|');
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      let size = 13;
      el.style.fontSize = `${size}px`;
      while (el.scrollWidth > el.clientWidth + 1 && size > 8) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
      }
      setFontPx(size);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [signature]);
  return (
    <div ref={ref} className="pr-totals-row" style={{ background: TOTALS_ROW_BG, color: '#fff', fontSize: fontPx }}>
      {items.map((i) => (
        <div key={i.key} className={i.grand ? 'pr-totals-item pr-totals-grand' : 'pr-totals-item'}>
          <span className="pr-totals-label">{i.label}:</span>
          <span>{i.value}</span>
        </div>
      ))}
    </div>
  );
};

const PaymentReceivedPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isDark, t, cssVars } = useAppearanceTokens();
  const paths = useRoleBasePath();
  const [approvalView, setApprovalView] = useState<ApprovalView>('all');
  const [approvalCounts, setApprovalCounts] = useState<{ approved: number; pending: number } | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);

  const [rows, setRows] = useState<PaymentListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportingCsv, setExportingCsv] = useState(false);

  // ── Row actions three-dot menu — see components/common/RowActionMenu. ──
  const rowMenu = useRowActionMenu<string>();

  // ── Per-category totals (EMI Before/After, Booking, Remaining Booking,
  // Possession, Booster Before/After, grand Total) — shown in the table's
  // footer row, not as top boxes. fetchCategorySummary is defined further
  // down since it depends on appliedFilters. ──────────────────────────────
  const [categorySummary, setCategorySummary] = useState<PaymentCategorySummary | null>(null);
  const [categorySummaryError, setCategorySummaryError] = useState(false);

  // ── Admin-only top boxes: Total Flat Sold / Total Amount Received / Total
  // Pending Amount. Company-wide figures, not affected by the filters; the
  // backend route is requireAdmin too, so an employee never fetches them. ──
  const [receivedSummary, setReceivedSummary] = useState<PaymentReceivedSummary | null>(null);
  const [receivedSummaryError, setReceivedSummaryError] = useState(false);
  const fetchReceivedSummary = useCallback(async () => {
    if (!paths.isAdmin) return;
    setReceivedSummaryError(false);
    try {
      setReceivedSummary(await fetchPaymentReceivedSummary());
    } catch {
      setReceivedSummaryError(true);
    }
  }, [paths.isAdmin]);
  useEffect(() => { fetchReceivedSummary(); }, [fetchReceivedSummary]);

  // ── Filter panel data sources ────────────────────────────────────────
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [employeeNameOptions, setEmployeeNameOptions] = useState<string[]>([]);
  const [companyNameOptions, setCompanyNameOptions] = useState<string[]>([]);

  useEffect(() => { dispatch(setPageTitle('Payment Received')); }, [dispatch]);

  useEffect(() => {
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
  const [draftProjectName, setDraftProjectName] = useState('');
  const [draftBuildingName, setDraftBuildingName] = useState('');
  const [draftWingName, setDraftWingName] = useState('');
  const [draftFlatNo, setDraftFlatNo] = useState('');
  const [draftMode, setDraftMode] = useState('');
  const [draftCompany, setDraftCompany] = useState('');
  const [draftDateRange, setDraftDateRange] = useState('');
  const [draftFromDate, setDraftFromDate] = useState('');
  const [draftToDate, setDraftToDate] = useState('');

  // V_24.0 — Company -> Project -> Building strict cascade. Company here is
  // Building.business_company_name (the real Company Master link — see
  // Building.entity.ts), same source `buildings` already carries for every
  // row. Project stays disabled until a Company is picked and only ever
  // lists projects among THAT company's buildings; Building stays disabled
  // until a Project is picked, same as before, now also scoped to the
  // selected Company so two companies reusing the same free-text project
  // name can never leak buildings across each other.
  const projectNameOptions = useMemo(
    () => Array.from(new Set(
      buildings
        .filter((b) => b.is_active && b.project_name && (!draftCompany || b.business_company_name === draftCompany))
        .map((b) => b.project_name)
    )),
    [buildings, draftCompany]
  );
  const buildingOptionsForProject = useMemo(
    () => buildings.filter((b) => b.is_active && b.project_name === draftProjectName
      && (!draftCompany || b.business_company_name === draftCompany)),
    [buildings, draftProjectName, draftCompany]
  );
  // Changing Company clears Project/Building/Wing/Flat — a stale Project
  // from a different company would otherwise silently stay selected and
  // keep filtering by it even though it's no longer visible in the (now
  // company-scoped) dropdown.
  const handleCompanyChange = (v: string) => { setDraftCompany(v); setDraftProjectName(''); setDraftBuildingName(''); setDraftWingName(''); setDraftFlatNo(''); };
  // Changing Project clears Building (and everything below it) — a stale
  // Building from a different project would otherwise silently stay
  // selected and keep filtering by it even though it's no longer visible
  // in the (now project-scoped) dropdown.
  const handleProjectChange = (v: string) => { setDraftProjectName(v); setDraftBuildingName(''); setDraftWingName(''); setDraftFlatNo(''); };

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

  // V_23.0 — picking a Date Range preset (Today/Yesterday/Last Week/Last
  // Month, etc.) now applies immediately, instead of only updating the
  // draft From/To fields and waiting for a "Filter" click: it commits
  // straight into appliedFilters, so both the table and its totals footer
  // row update together the moment a preset is chosen. Manual
  // From/To typing is unaffected — that still only takes effect on
  // "Filter", same as every other field in this panel.
  const applyDateRangePreset = (preset: string) => {
    setDraftDateRange(preset);
    const [from, to] = dateRangeForPreset(preset);
    setDraftFromDate(from);
    setDraftToDate(to);
    setAppliedFilters((prev) => ({ ...prev, date_from: from || undefined, date_to: to || undefined }));
  };

  // ── Applied filters — what the table actually queries by. ────────────
  interface AppliedFilters {
    received_by?: string; building_id?: string; wing_id?: string; flat_id?: string;
    mode_of_payment?: string; company?: string; date_from?: string; date_to?: string; search?: string;
  }
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({});

  // ── Search across all table data — a standalone, live field on the
  // toolbar row, independent of the Filter/Reset panel above. The backend
  // matches receipt no., customer name/ID, building/wing/flat, payment
  // type/method, amount, dates, company and received by. Debounced so it
  // doesn't fire a request on every keystroke. ────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 400);
  useEffect(() => {
    // Same object back when the search didn't change (e.g. on first load),
    // so the list isn't fetched twice.
    setAppliedFilters((prev) => {
      const search = debouncedSearch.trim() || undefined;
      return prev.search === search ? prev : { ...prev, search };
    });
  }, [debouncedSearch]);

  // ── Lazy loading, no pagination: the first 100 matching rows load, then
  // each scroll near the bottom fetches the next 100 from the server and
  // appends them (useInfiniteScroll prefetches ~800px early). Only what's
  // been scrolled to is ever fetched. `requestSeq` drops any response that
  // arrives after the filters/view changed, so rows never mix. ──────────
  const requestSeq = useRef(0);
  const rowsRef = useRef<PaymentListRow[]>([]);
  rowsRef.current = rows;
  const listFilters = useMemo(() => ({ ...appliedFilters, approval: approvalParam(approvalView) }), [appliedFilters, approvalView]);

  // Loads rows from the top. `count` is rounded up to whole batches so the
  // next scroll batch lines up with the server's page/limit offsets.
  const loadFromTop = useCallback(async (count: number, silent: boolean) => {
    const seq = ++requestSeq.current;
    const batches = Math.max(1, Math.ceil(count / PAYMENT_BATCH_SIZE));
    if (!silent) setLoading(true);
    setLoadingMore(false);
    try {
      const res = await fetchPaymentList(1, batches * PAYMENT_BATCH_SIZE, listFilters);
      if (seq !== requestSeq.current) return;
      if (res.success) { setRows(res.rows); setTotal(res.total); }
      else toast.error('Failed to fetch payments.');
    } catch {
      if (seq === requestSeq.current) toast.error('Failed to fetch payments. Please try again.');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [listFilters]);

  // Filters/view changed → start again from the first 100, clear selection.
  useEffect(() => {
    setSelectedIds(new Set());
    loadFromTop(PAYMENT_BATCH_SIZE, false);
  }, [loadFromTop]);

  // Refresh after approve/delete/refresh button — reloads as many rows as
  // are already loaded, without blanking the table or losing scroll place.
  const fetchRows = useCallback(() => loadFromTop(Math.max(PAYMENT_BATCH_SIZE, rowsRef.current.length), true), [loadFromTop]);

  const hasMoreRows = rows.length < total;
  const loadMoreRows = useCallback(async () => {
    const loaded = rowsRef.current.length;
    if (loadingMore || loaded === 0 || loaded % PAYMENT_BATCH_SIZE !== 0) return;
    const seq = requestSeq.current;
    setLoadingMore(true);
    try {
      const res = await fetchPaymentList(loaded / PAYMENT_BATCH_SIZE + 1, PAYMENT_BATCH_SIZE, listFilters);
      if (seq !== requestSeq.current || !res.success) return;
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...res.rows.filter((r) => !seen.has(r.id))];
      });
      setTotal(res.total);
    } catch {
      if (seq === requestSeq.current) toast.error('Failed to load more payments.');
    } finally {
      if (seq === requestSeq.current) setLoadingMore(false);
    }
  }, [loadingMore, listFilters]);
  const lazyLoadSentinelRef = useInfiniteScroll({
    hasMore: hasMoreRows, loading: loading || loadingMore, onLoadMore: loadMoreRows, itemCount: rows.length,
  });

  // Counts shown inside the Approved/UnApproved buttons (All = their sum).
  // Same filters/search as the table, so the badges always describe what
  // clicking the button would show. limit=1 — only `total` is needed.
  const fetchApprovalCounts = useCallback(async () => {
    try {
      const [ap, pe] = await Promise.all([
        fetchPaymentList(1, 1, { ...appliedFilters, approval: 'approved' }),
        fetchPaymentList(1, 1, { ...appliedFilters, approval: 'pending' }),
      ]);
      setApprovalCounts({ approved: ap.total ?? 0, pending: pe.total ?? 0 });
    } catch {
      setApprovalCounts(null);
    }
  }, [appliedFilters]);
  useEffect(() => { fetchApprovalCounts(); }, [fetchApprovalCounts]);

  // Same appliedFilters object fetchRows queries by (minus page/limit,
  // which an aggregate has no use for) — this is what guarantees the 8 stat
  // boxes and the table below always match: whatever date range/building/
  // etc. is currently applied, both this and fetchRows query it identically.
  const fetchCategorySummary = useCallback(async () => {
    setCategorySummaryError(false);
    try {
      setCategorySummary(await fetchPaymentCategorySummary({ ...appliedFilters, approval: approvalParam(approvalView) }));
    } catch {
      setCategorySummaryError(true);
    }
  }, [appliedFilters, approvalView]);

  useEffect(() => { fetchCategorySummary(); }, [fetchCategorySummary]);
  // Drop selected ids that are no longer in the list (deleted/filtered out).
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const ids = new Set(rows.map((r) => r.id));
      const next = new Set(Array.from(prev).filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

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
    setDraftReceivedBy(''); setDraftProjectName(''); setDraftBuildingName(''); setDraftWingName(''); setDraftFlatNo('');
    setDraftMode(''); setDraftCompany(''); setDraftDateRange(''); setDraftFromDate(''); setDraftToDate('');
    setAppliedFilters((prev) => ({ search: prev.search }));
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

  // Only unapproved rows can be approved — approved ones in the selection
  // are simply skipped.
  const selectedPendingIds = useMemo(
    () => rows.filter((r) => selectedIds.has(r.id) && !r.is_approved).map((r) => r.id),
    [rows, selectedIds]
  );

  const refreshAll = () => { fetchRows(); fetchCategorySummary(); fetchReceivedSummary(); fetchApprovalCounts(); };

  // Approve actions — admin only (PUT /payments/:id/approve and
  // /bulk-approve are requireAdmin server-side too).
  const handleApprove = async (row: PaymentListRow) => {
    setApprovingId(row.id);
    try {
      await approvePayment(row.id);
      toast.success(`Payment for ${row.customer_name || 'customer'} approved.`);
      refreshAll();
    } catch {
      toast.error('Failed to approve payment.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedPendingIds.length === 0) return;
    setBulkApproving(true);
    try {
      const res = await bulkApprovePayments(selectedPendingIds);
      toast.success(`${res.approved} payment(s) approved.`);
      setSelectedIds(new Set());
      refreshAll();
    } catch {
      toast.error('Failed to approve selected payments.');
    } finally {
      setBulkApproving(false);
    }
  };

  // Exports every payment matching the current view + filters — not just
  // the current page — "fetch a large batch, then download".
  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const res = await fetchPaymentList(1, 5000, { ...appliedFilters, approval: approvalParam(approvalView) });
      const exportRows = res.rows ?? [];
      if (exportRows.length === 0) {
        toast.error('No payments to export.');
        return;
      }
      const header = ['Status', 'Receipt #', 'Customer', 'Building', 'Wing', 'Flat No', 'Payment Type', 'Payment Method', 'Amount', 'Payment Date', 'Received Date', 'Company', 'Received By'];
      const csvRows = exportRows.map((r) => [
        r.is_approved ? 'Approved' : 'UnApproved', r.receipt_number || '', r.customer_name || '', r.building_name || '', r.wing_name || '', r.flat_no || '',
        paymentTypeLabel(r), r.mode_of_payment || '', r.amount,
        formatDMY(r.inst_date), formatDMY(r.payment_date || r.created_at), r.company || '', r.received_by || '',
      ]);
      const csv = [header, ...csvRows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments_${approvalView === 'pending' ? 'unapproved' : approvalView}_${new Date().toISOString().slice(0, 10)}.csv`;
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
      await exportPaymentReceiptPdf(res.data);
    } catch {
      toast.error('Failed to download receipt.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (row: PaymentListRow) => {
    const result = await showAlert.confirm(
      `This will permanently delete the ₹${row.amount.toLocaleString('en-IN')} payment${row.receipt_number ? ` (Receipt ${row.receipt_number})` : ''} for ${row.customer_name}.`,
      'Delete Payment?'
    );
    if (!result.isConfirmed) return;
    setDeletingId(row.id);
    try {
      await deletePayment(row.id);
      toast.success('Payment deleted.');
      refreshAll();
    } catch {
      toast.error('Failed to delete payment.');
    } finally {
      setDeletingId(null);
    }
  };


  const inputStyle: React.CSSProperties = { width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 10px', fontSize: 12, outline: 'none' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 };

  // ── Filter/Reset (+ Generate Receipt) button trio — deliberately
  // compact (not stretched to fill their grid column) and in fresh light
  // tints instead of the earlier solid orange/gray, per explicit request. ──
  const actionBtnBase: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 38, borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' };

  // ── Totals footer row — one entry per Payment For category plus the
  // grand Total, all in ONE full-width cell (not tied to table columns) so
  // each entry takes only its own text's width. See .pr-totals-row in
  // PaymentReceived.css for how it always stays on one line. ────────────
  const totalsFooterCells: { key: keyof PaymentCategorySummary; label: string }[] = [
    { key: 'emi_before', label: 'EMI Before' },
    { key: 'emi_after', label: 'EMI After' },
    { key: 'booking', label: 'Booking Amount' },
    { key: 'pay_after_booking', label: 'Remaining Booking' },
    { key: 'possession', label: 'Possession' },
    { key: 'booster_before', label: 'Booster Before' },
    { key: 'booster_after', label: 'Booster After' },
    { key: 'total', label: 'Total' },
  ];

  return (
    <div className="pr-page" style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div className="pr-header flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 44, height: 44, background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff' }}>
          <MdPayments size={22} style={{ color: '#4f46e5' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 19.5, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Payment Received</h1>
          </div>
      </div>

      {/* ── Top stat boxes — admin only. Company-wide totals; they do not
          follow the filter panel (the per-category totals for the filtered
          rows live in the table's footer row instead). ─────────────────── */}
      {paths.isAdmin && (
        <>
          <div className="pr-stat-grid grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <StatCard label="Total Flat Sold" value={rupee(receivedSummary?.total_flat_sold ?? 0)} icon={MdHomeWork} color="#2563eb"
              bg="" loading={!receivedSummary && !receivedSummaryError}
              surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
            <StatCard label="Total Amount Received" value={rupee(receivedSummary?.total_amount_received ?? 0)} icon={MdPayments} color="#16a34a"
              bg="" loading={!receivedSummary && !receivedSummaryError}
              surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
            <StatCard label="Total Pending Amount" value={rupee(receivedSummary?.total_pending_amount ?? 0)} icon={MdPendingActions} color="#dc2626"
              bg="" loading={!receivedSummary && !receivedSummaryError}
              surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
          </div>
          {receivedSummaryError && (
            <div className="flex items-center gap-2 mb-5" style={{ fontSize: 12, color: '#dc2626' }}>
              <span>Failed to load summary totals.</span>
              <button type="button" onClick={fetchReceivedSummary} style={{ fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', color: '#dc2626', fontSize: 12 }}>
                Retry
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Filter panel — Received By/Company/Project/Building/Wing/Flat in
          row 1, Mode/Date Range/From/To + action buttons in row 2 (exactly
          2 rows of 6 columns on xl, no Payment For field). ─────────────── */}
      <div className="pr-filter-card rounded-2xl mb-5 p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="pr-filter-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 mb-3.5">
          <FilterSelect t={t} label="Received By" value={draftReceivedBy} onChange={setDraftReceivedBy}
            placeholder="--All--" options={employeeNameOptions.map((n) => ({ value: n, label: n }))} />
          <FilterSelect t={t} label="Company" value={draftCompany} onChange={handleCompanyChange}
            placeholder="--Select--" options={companyNameOptions.map((n) => ({ value: n, label: n }))} />
          <FilterSelect t={t} label="Project" value={draftProjectName} onChange={handleProjectChange}
            placeholder={draftCompany ? '--Select--' : 'Select a Company first'} disabled={!draftCompany}
            options={projectNameOptions.map((n) => ({ value: n, label: n }))} />
          <FilterSelect t={t} label="Building Name" value={draftBuildingName} onChange={handleBuildingChange}
            placeholder={draftProjectName ? '--Select--' : 'Select a Project first'} disabled={!draftProjectName}
            options={buildingOptionsForProject.map((b) => b.building_name).filter((v, i, arr) => arr.indexOf(v) === i).map((n) => ({ value: n, label: n }))} />
          <FilterSelect t={t} label="Wing" value={draftWingName} onChange={handleWingChange}
            placeholder="--Select--" options={wingOptions.map((n) => ({ value: n, label: n }))} disabled={!selectedBuilding} />
          <FilterSelect t={t} label="Flat Number" value={draftFlatNo} onChange={setDraftFlatNo}
            placeholder="--Select--" options={flatsInScope.map((f) => ({ value: f.flat_no, label: f.flat_no }))} disabled={!selectedWing} />
        </div>
        <div className="pr-filter-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-end">
          <FilterSelect t={t} label="ModeOfPayment" value={draftMode} onChange={setDraftMode}
            placeholder="--Select Payment Method--" options={MODE_OF_PAYMENT_OPTIONS.map((m) => ({ value: m, label: m }))} />
          <FilterSelect t={t} label="Date Range" value={draftDateRange} onChange={applyDateRangePreset} options={DATE_RANGE_OPTIONS} />
          <div>
            <label style={labelStyle}>Received Date From</label>
            <input type="date" value={draftFromDate} onChange={(e) => { setDraftFromDate(e.target.value); setDraftDateRange(''); }} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Received Date To</label>
            <input type="date" value={draftToDate} onChange={(e) => { setDraftToDate(e.target.value); setDraftDateRange(''); }} style={inputStyle} />
          </div>
          <div className="pr-filter-actions flex items-center gap-2 flex-wrap" style={{ gridColumn: 'span 2 / span 2' }}>
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

      {/* ── Toolbar — Search (left), All/Approved/UnApproved (center),
          Approve Selected/Payment Upcoming/Export CSV/Refresh (right). ── */}
      <div className="pr-toolbar rounded-2xl mb-5 p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="pr-toolbar-row flex items-center justify-between gap-3" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
          <div className="pr-toolbar-search flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, width: 260, flexShrink: 0 }}>
            <MdSearch size={17} style={{ color: t.textSecondary, flexShrink: 0 }} />
            <input type="text" placeholder="Search by all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 12, width: '100%' }} />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 0, display: 'flex', flexShrink: 0 }}>
                <MdClose size={15} />
              </button>
            )}
          </div>
          <div className="pr-approval-views flex items-center justify-center gap-2" style={{ flex: 1, minWidth: 'max-content' }}>
            {APPROVAL_VIEWS.map((v) => {
              const active = approvalView === v.key;
              const count = !approvalCounts ? null
                : v.key === 'all' ? approvalCounts.approved + approvalCounts.pending
                : approvalCounts[v.key];
              return (
                <button key={v.key} type="button" onClick={() => setApprovalView(v.key)} aria-pressed={active}
                  className="flex items-center gap-2 rounded-xl"
                  style={{
                    padding: '7px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                    background: active ? v.color : t.inputBg,
                    color: active ? '#fff' : t.textPrimary,
                    border: `1px solid ${active ? v.color : t.inputBorder}`,
                  }}>
                  {v.label}
                  <span style={{
                    minWidth: 22, padding: '1px 7px', borderRadius: 999, fontSize: 11, fontWeight: 800, textAlign: 'center',
                    background: active ? 'rgba(255,255,255,0.25)' : v.color, color: '#fff',
                  }}>
                    {count ?? '…'}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="pr-toolbar-actions flex items-center gap-2.5" style={{ flexShrink: 0 }}>
            {paths.isAdmin && selectedPendingIds.length > 0 && (
              <button type="button" onClick={handleBulkApprove} disabled={bulkApproving}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: '#16a34a', border: 'none', color: '#fff', cursor: bulkApproving ? 'not-allowed' : 'pointer', opacity: bulkApproving ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                <MdCheckCircle size={16} /> {bulkApproving ? 'Approving…' : `Approve Selected (${selectedPendingIds.length})`}
              </button>
            )}
            {paths.isAdmin && (
              <button type="button" onClick={() => navigate(ROUTES.ADMIN.PAYMENT_UPCOMING)}
                className="pr-upcoming-btn flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <MdUpcoming size={16} /> <span className="pr-export-btn-text">Payment Upcoming</span>
              </button>
            )}
            <button type="button" onClick={handleExportCsv} disabled={exportingCsv}
              className="pr-export-btn flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: exportingCsv ? 'not-allowed' : 'pointer', opacity: exportingCsv ? 0.6 : 1, whiteSpace: 'nowrap' }}>
              <MdDownload size={16} /> <span className="pr-export-btn-text">{exportingCsv ? 'Exporting…' : 'Export CSV'}</span>
            </button>
            <button type="button" onClick={refreshAll} title="Refresh"
              className="pr-refresh-btn flex items-center justify-center rounded-xl"
              style={{ width: 40, height: 40, background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
              <MdRefresh size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="pr-table-card rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="master-table-scroll">
          <table className="pr-table master-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                <th style={{ padding: '10px 12px', width: 36 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} disabled={rows.length === 0}
                    style={{ cursor: rows.length === 0 ? 'not-allowed' : 'pointer' }} />
                </th>
                {['Actions', 'Status', 'Receipt No.', 'Customer Name', 'Building Details', 'Payment Type', 'Payment Method', 'Amount', 'Payment Date', 'Received Date', 'Company', 'Received By'].map((h) => (
                  <th key={h}
                    style={h === 'Actions'
                      ? { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', width: 64, minWidth: 64, maxWidth: 64 }
                      : { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={13} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading payments...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={13} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>No payments found.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="master-table-row-hover" style={{ borderTop: `1px solid ${t.divider}` }}>
                    <td style={{ padding: '10px 12px' }}>
                      <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelectRow(r.id)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '10px 12px', width: 64, minWidth: 64, maxWidth: 64 }}>
                      {/* V_23.0 — the old inline View/Download/Delete icon
                          row is now one three-dot trigger; the menu itself
                          is a document.body portal (see RowActionMenu) so
                          it always draws above the table, never clipped by
                          .master-table-scroll's overflow:auto. */}
                      <button type="button" title="Actions"
                        ref={rowMenu.openId === r.id ? rowMenu.buttonRef : undefined}
                        onClick={rowMenu.toggle(r.id, (r.is_approved ? 2 : 1) + (paths.isAdmin ? (r.is_approved ? 1 : 2) : 0))}
                        className="flex items-center justify-center rounded-lg"
                        style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: t.textSecondary, cursor: 'pointer' }}>
                        <MdMoreVert size={18} />
                      </button>
                      {rowMenu.openId === r.id && rowMenu.pos && (
                        <RowActionMenu t={t} pos={rowMenu.pos} actions={[
                          { key: 'view', label: r.is_approved ? 'View Receipt' : 'View', icon: <MdVisibility size={14} color="var(--brand-ink)" />, onClick: () => { rowMenu.close(); handleViewReceipt(r); } },
                          // No receipt exists until approval, so Download is
                          // only offered on approved rows; Approve only on
                          // unapproved ones (admin).
                          ...(r.is_approved
                            ? [{ key: 'download', label: 'Download Receipt', icon: <MdDownload size={14} color="#16a34a" />, disabled: downloadingId === r.id, onClick: () => { rowMenu.close(); handleDownloadReceipt(r); } }]
                            : paths.isAdmin
                              ? [{ key: 'approve', label: 'Approve', icon: <MdCheckCircle size={14} color="#16a34a" />, disabled: approvingId === r.id, onClick: () => { rowMenu.close(); handleApprove(r); } }]
                              : []),
                          // V_23.0 item 7 — delete is admin-only; the backend
                          // route (DELETE /payments/:id) already enforces
                          // this via requireAdmin, so this is UI-side only —
                          // an employee must not even see the option.
                          ...(paths.isAdmin ? [{ key: 'delete', label: 'Delete', icon: <MdDelete size={14} />, danger: true, disabled: deletingId === r.id, onClick: () => { rowMenu.close(); handleDelete(r); } }] : []),
                        ]} />
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {r.is_approved ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold" title={r.approved_by_name ? `Approved by ${r.approved_by_name}${r.approved_at ? ` on ${formatDMY(r.approved_at)}` : ''}` : undefined}
                          style={{ background: '#16a34a', color: '#fff', fontSize: 10.5, whiteSpace: 'nowrap' }}>
                          <MdCheckCircle size={12} /> Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold" style={{ background: '#d97706', color: '#fff', fontSize: 10.5, whiteSpace: 'nowrap' }}>
                          <MdHourglassEmpty size={12} /> UnApproved
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 11.5, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap' }}>{r.receipt_number || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>{r.customer_name || '—'}</div>
                      <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 1 }}>{r.customer_code || '—'}</div>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 11.5, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>{r.building_name || '—'}</div>
                      {(r.wing_name || r.flat_no) && (
                        <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 1 }}>
                          {r.wing_name ? `${r.wing_name} Wing` : ''}{r.wing_name && r.flat_no ? ' - ' : ''}{r.flat_no ? `Flat ${r.flat_no}` : ''}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div className="flex items-center gap-1 flex-wrap">
                        {r.payment_tag === 'Extra Pay' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-md font-semibold" style={{ background: '#2563eb', color: '#fff', fontSize: 10.5, whiteSpace: 'nowrap' }}>
                            Extra Pay
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-md font-semibold" style={{ background: '#2563eb', color: '#fff', fontSize: 10.5, whiteSpace: 'nowrap' }}>
                            {paymentTypeLabel(r)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="inline-flex items-center px-2 py-1 rounded-md font-semibold" style={{ background: isDark ? 'rgba(0, 0, 255,0.18)' : '#efebe9', color: 'var(--brand-ink)', fontSize: 10.5, whiteSpace: 'nowrap' }}>
                        {r.mode_of_payment || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12.5, fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap' }}>{rupee(r.amount)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.payment_tag === 'Extra Pay' ? '—' : formatDMY(r.inst_date)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>
                      <div className="flex items-center gap-1.5">
                        {formatDMY(r.payment_date || r.created_at)}
                        <BackdatedDot paymentDate={r.payment_date} createdAt={r.created_at} />
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.company || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.received_by || '—'}</td>
                  </tr>
                ))
              )}
              {/* Invisible sentinel row — scrolling near it loads the next 100. */}
              {!loading && hasMoreRows && (
                <tr ref={lazyLoadSentinelRef} aria-hidden="true"><td colSpan={13} style={{ padding: 0, border: 'none' }} /></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Totals bar — per-category sums for every row matching the
            current filters (all rows, not just the loaded ones), same query
            as the table. Outside the table's horizontal scroll area, full
            card width, always one line (see TotalsBar). ── */}
        {!loading && rows.length > 0 && (
          categorySummaryError ? (
            <div style={{ padding: '10px 12px', background: TOTALS_ROW_BG, color: '#fff', fontSize: 13, fontWeight: 800 }}>
              Failed to load totals.{' '}
              <button type="button" onClick={fetchCategorySummary} style={{ fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', color: '#fff', fontSize: 12, padding: 0 }}>
                Retry
              </button>
            </div>
          ) : (
            <TotalsBar items={totalsFooterCells.map((c) => ({ key: c.key, label: c.label, value: categorySummary ? rupee(categorySummary[c.key]) : '…', grand: c.key === 'total' }))} />
          )
        )}

        {total > 0 && (
          <div className="flex items-center justify-center px-4 py-3" style={{ borderTop: `1px solid ${t.divider}`, fontSize: 12, color: t.textSecondary }}>
            {loadingMore ? 'Loading more…' : `Showing ${rows.length} of ${total}${hasMoreRows ? ' — scroll down to load more' : ''}`}
          </div>
        )}
      </div>

      {/* ── View Receipt popup ────────────────────────────────────────── */}
      {receiptPreview && (
        <PaymentReceiptViewModal
          data={receiptPreview}
          onClose={() => setReceiptPreview(null)}
          onDownload={() => {
            if (!receiptPreview.transaction.is_approved) { toast.error('Receipt is available after admin approval.'); return; }
            exportPaymentReceiptPdf(receiptPreview);
          }}
        />
      )}
    </div>
  );
};

export default PaymentReceivedPage;
