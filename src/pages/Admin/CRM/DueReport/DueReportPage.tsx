// ==========================================
// DREAM GROUP CRM - PAYMENT DUES PAGE
// ==========================================
// A flat, per-due-item list across every customer — GET /payments/due-list-
// detailed (payment.service.ts's getDueListDetailed), one row per overdue
// installment/one-time amount rather than one row per customer. "Add
// Payment Details" posts through the EXISTING, already-battle-tested
// POST /api/payments (collectPayment) — none of that carry-forward math is
// touched here. A newly collected payment already starts unapproved
// (is_approved defaults false) regardless of who collects it, so submitting
// here already moves it into Payment Approvals — no extra wiring needed for
// that hand-off; it's how collectPayment already behaves everywhere else.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { IconType } from 'react-icons';
import {
  MdPayments, MdRefresh, MdDownload, MdClose, MdKeyboardArrowDown,
  MdReceiptLong, MdSchedule, MdVpnKey, MdAccountBalanceWallet, MdNoteAdd,
  MdSearch, MdStars, MdWorkspacePremium,
} from 'react-icons/md';

import { useAppDispatch } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { AppTheme } from '../../../../styles/theme';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import PaginationFooter from '../../../../components/common/PaginationFooter';
import { ValidationErrorSummary } from '../../../../components/common/ValidationErrorSummary';
import StatCard from '../../../../components/masters/StatCard';
import {
  fetchDueListDetailed, collectPayment, fetchDefaultAmount, DueListDetailRow,
} from '../../../../services/paymentService';
import { fetchUpcomingListDetailed } from '../../../../services/paymentUpcomingService';
import { UpcomingListDetailRow } from '../../../../types/paymentUpcoming';
import { fetchAllCustomerDetails } from '../../../../services/customerDetailsService';
import { FetchBuildingList } from '../../../../services/buildingService';
import { FetchEmployeeDetails, Employee } from '../../../../services/employeeDetailsService';
import { tasksService, Task } from '../../../../services/tasksService';
import { Customer, PaymentFor, CollectPaymentPayload, Building } from '../../../../types/index';
import './DueReport.css';

type Theme = AppTheme;

// ── Small local searchable dropdown — same "type to filter, click to
// pick" shape used across this app's other pickers. Its options panel used
// to render `position:absolute` inside the toolbar's own `overflowX:'auto'`
// wrapper — setting only overflow-x (leaving overflow-y at its default)
// makes the browser clip BOTH axes per the CSS spec, so the panel was
// getting clipped/hidden behind the table below it. Portaling to
// document.body (position:fixed, computed from the field's own bounding
// rect on open) escapes that clipped container entirely — same fix already
// applied to CustomerDetailsListPage's/CustomerDetailsCrudPage's own
// SearchableSelect. ───────────────────────────────────────────────────────
const SearchableSelect: React.FC<{
  t: Theme; placeholder: string; options: string[]; value: string; onChange: (v: string) => void; disabled?: boolean;
}> = ({ t, placeholder, options, value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  const openDropdown = () => {
    if (disabled) return;
    const r = ref.current?.getBoundingClientRect();
    if (r) setMenuPos({ top: r.bottom + 4, left: r.left, width: r.width });
    setOpen(true);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target) && !(target as HTMLElement).closest?.('[data-due-report-select-menu]')) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const r = ref.current?.getBoundingClientRect();
      if (r) setMenuPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  const filtered = options.filter((o) => o?.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: disabled ? t.insetBg : t.inputBg, border: `1px solid ${t.inputBorder}`, cursor: disabled ? 'not-allowed' : 'text' }}
        onClick={openDropdown}>
        <input type="text" placeholder={placeholder} value={query} disabled={disabled}
          onFocus={openDropdown}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); openDropdown(); }}
          style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 12, width: '100%' }} />
        {value && !disabled && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(''); setQuery(''); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 0, display: 'flex', flexShrink: 0 }}>
            <MdClose size={15} />
          </button>
        )}
        <MdKeyboardArrowDown size={16} style={{ color: t.textSecondary, flexShrink: 0 }} />
      </div>
      {open && !disabled && menuPos && filtered.length > 0 && createPortal(
        <div data-due-report-select-menu
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: menuPos.width, zIndex: 200, maxHeight: 240, overflowY: 'auto', background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '4px 0' }}>
          {filtered.slice(0, 50).map((opt) => (
            <button key={opt} type="button" onClick={() => { onChange(opt); setQuery(opt); setOpen(false); }}
              className="w-full text-left px-3.5 py-2 text-sm" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textPrimary, fontFamily: t.fontFamily }}>
              {opt}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

const rupee = (n: number): string => `₹${n.toLocaleString('en-IN')}`;

const formatAmountDisplay = (v: string): string => {
  if (!v) return '';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : v;
};

// ── Stat box spec — feeds the shared gradient StatCard component (same
// saturated-gradient look used site-wide, e.g. Building Master's summary
// row) instead of a bespoke flat card. ──────────────────────────────────
interface StatBoxSpec { label: string; value: number; color: string; icon: IconType; }

// ── "Payment For" options shown on the Add Payment Details form — richer,
// friendlier labels than PAYMENT_FOR_OPTIONS (used elsewhere for the raw
// enum), with "Extra Pay" mapped to EMIAmount + is_advance_pay: true — the
// exact same "advance pay, applies toward future EMIs" flow collectPayment
// already supports and already tags "Extra Pay" in its own response
// message, just surfaced here as its own selectable option instead of a
// checkbox. ───────────────────────────────────────────────────────────────
interface PaymentForUiOption { key: string; label: string; value: PaymentFor; isAdvance?: boolean; }
const PAYMENT_FOR_UI_OPTIONS: PaymentForUiOption[] = [
  { key: 'emi', label: 'Monthly Installment', value: 'EMIAmount' },
  { key: 'booking', label: 'Booking Amount', value: 'BookingAmount' },
  { key: 'pay_after_booking', label: 'Remaining Booking Amount', value: 'PayAfterbooking' },
  { key: 'possession', label: 'Possession Amount', value: 'PossessionAmount' },
  { key: 'booster_before', label: 'Booster Before Possession', value: 'AnnualAmount' },
  { key: 'booster_after', label: 'Booster After Possession', value: 'AnnualAmount1' },
  { key: 'extra_pay', label: 'Extra Pay', value: 'EMIAmount', isAdvance: true },
];
const MODE_OF_PAYMENT_OPTIONS = ['Cash', 'Cheque', 'Online', 'Other'];

// Friendly label + color per payment_for_key, reused by both the top
// category boxes (click-to-filter) and the table's own Payment For column
// badge — same convention PaymentUpcomingPage uses.
const PAYMENT_FOR_KEY_META: Record<PaymentFor, { label: string; color: string; icon: IconType }> = {
  EMIAmount: { label: 'Monthly Installment', color: 'var(--brand-gradient)', icon: MdPayments },
  BookingAmount: { label: 'Booking Amount', color: '#dc2626', icon: MdReceiptLong },
  PayAfterbooking: { label: 'Remaining Booking Amount', color: '#ea580c', icon: MdSchedule },
  PossessionAmount: { label: 'Possession Amount', color: '#7c3aed', icon: MdVpnKey },
  AnnualAmount: { label: 'Booster Before Possession', color: '#16a34a', icon: MdStars },
  AnnualAmount1: { label: 'Booster After Possession', color: '#0d9488', icon: MdWorkspacePremium },
};
const PAYMENT_FOR_KEY_ORDER: PaymentFor[] = ['EMIAmount', 'BookingAmount', 'PayAfterbooking', 'PossessionAmount', 'AnnualAmount', 'AnnualAmount1'];

type DueStatusFilter = 'all' | 'overdue' | 'due_today' | 'upcoming';

// ── Unified row shape the table renders — either an overdue/due-today row
// (DueListDetailRow) or, when the Status filter is set to Upcoming, an
// upcoming-installment row (UpcomingListDetailRow, reusing the already-
// built Payment Upcoming endpoint for a rolling 30-day window rather than
// duplicating that logic here). `dueRow` is set only for the former —
// Follow-Up only makes sense against something actually due. ────────────
interface DisplayRow {
  key: string;
  customer_id: number; customer_code: string; customer_name: string;
  email: string | null; mobile_number: string | null;
  assigned_employee_name: string | null; assigned_employee_code: string | null;
  company_name: string | null; project_name: string | null; location: string | null;
  building_name: string | null; wing_name: string | null; flat_no: string | null;
  payment_for: string; payment_for_key: PaymentFor;
  amount: number;
  months_pending: number | null;
  per_month_amount: number | null;
  statusLabel: string; statusColor: string;
  detailText: string;
  dueRow?: DueListDetailRow;
}

const DueReportPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isDark, t, cssVars } = useAppearanceTokens();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const buildingNames = useMemo(() => Array.from(new Set(buildings.filter((b) => b.is_active).map((b) => b.building_name))), [buildings]);

  const [dueRows, setDueRows] = useState<DueListDetailRow[]>([]);
  const [loadingDueList, setLoadingDueList] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  // ── Follow-up (V_22.0) — per-row note + date + assigned employee, backed
  // by the Task entity's customer_id link. Plus an in-app-only badge for
  // how many open follow-ups (across the team) are due today/tomorrow.
  const [followUpEmployees, setFollowUpEmployees] = useState<Employee[]>([]);
  const [followUpRow, setFollowUpRow] = useState<DueListDetailRow | null>(null);
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpAssignedTo, setFollowUpAssignedTo] = useState('');
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);
  const [followUpCounts, setFollowUpCounts] = useState({ today: 0, tomorrow: 0 });
  // The badge's own click target — today's + tomorrow's open follow-ups,
  // each tagged with which day it falls on so the popup can group them.
  const [followUpListTasks, setFollowUpListTasks] = useState<(Task & { dueBucket: 'today' | 'tomorrow' })[]>([]);
  const [followUpListOpen, setFollowUpListOpen] = useState(false);

  const ymd = (d: Date) => d.toISOString().slice(0, 10);

  const fetchFollowUpCounts = useCallback(async () => {
    try {
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 86400000);
      const [todayTasks, tomorrowTasks] = await Promise.all([
        tasksService.fetchTasks({ status: 'pending', due_date: ymd(today) }),
        tasksService.fetchTasks({ status: 'pending', due_date: ymd(tomorrow) }),
      ]);
      setFollowUpCounts({ today: todayTasks.length, tomorrow: tomorrowTasks.length });
      setFollowUpListTasks([
        ...todayTasks.map((task) => ({ ...task, dueBucket: 'today' as const })),
        ...tomorrowTasks.map((task) => ({ ...task, dueBucket: 'tomorrow' as const })),
      ]);
    } catch { /* badge just stays at its last known count if this fails */ }
  }, []);

  useEffect(() => { fetchFollowUpCounts(); }, [fetchFollowUpCounts]);

  const openFollowUp = (row: DueListDetailRow) => {
    setFollowUpRow(row);
    setFollowUpNote('');
    const tomorrow = new Date(Date.now() + 86400000);
    setFollowUpDate(ymd(tomorrow));
    setFollowUpAssignedTo('');
  };
  const closeFollowUp = () => setFollowUpRow(null);

  const handleSubmitFollowUp = async () => {
    if (!followUpRow) return;
    setFollowUpSubmitting(true);
    try {
      await tasksService.createTask({
        title: `Follow-up: ${followUpRow.customer_name}`,
        description: followUpNote.trim() || null,
        due_date: followUpDate || null,
        assigned_to: followUpAssignedTo || null,
        customer_id: followUpRow.customer_id,
      });
      toast.success('Follow-up scheduled.');
      closeFollowUp();
      fetchFollowUpCounts();
    } catch {
      toast.error('Failed to schedule the follow-up.');
    } finally {
      setFollowUpSubmitting(false);
    }
  };

  useEffect(() => { dispatch(setPageTitle('Payment Dues')); }, [dispatch]);

  const fetchDueRows = useCallback(async () => {
    setLoadingDueList(true);
    try {
      const res = await fetchDueListDetailed();
      setDueRows(res.rows ?? []);
    } catch {
      toast.error('Failed to load payment dues.');
    } finally {
      setLoadingDueList(false);
    }
  }, []);

  useEffect(() => { fetchDueRows(); }, [fetchDueRows]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchAllCustomerDetails(1, 1000);
        if (res.success) setCustomers(res.rows ?? []);
      } catch { /* picker just stays empty if this fails */ }
    })();
    (async () => {
      try {
        const res = await FetchBuildingList(1, 1000);
        // Kept as full rows (not just names) — the Add Payment section
        // looks up the selected customer's building here to auto-derive
        // its Company display (business_company_name), replacing the old
        // free-typed Company field.
        if (res.success) setBuildings(res.rows ?? []);
      } catch { /* building filter/company lookup just stays empty if this fails */ }
    })();
    (async () => {
      try {
        const res = await FetchEmployeeDetails(1, 1000, undefined, true);
        if (res.success) setFollowUpEmployees(res.rows ?? []);
      } catch { /* follow-up assignee dropdown just stays empty if this fails */ }
    })();
  }, []);

  const customerOptions = useMemo(
    () => customers.map((c) => `${c.customer_name}${c.customer_code ? ` (${c.customer_code})` : ''}`),
    [customers]
  );
  const employeeNameOptions = useMemo(
    () => Array.from(new Set(dueRows.map((r) => r.assigned_employee_name).filter((n): n is string => !!n))),
    [dueRows]
  );

  // ── Toolbar filters — Payment For + Building + Employee, all narrowing
  // the same flat due-item list, in that left-to-right order. ─────────────
  const [filterPaymentFor, setFilterPaymentFor] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  // ── New (V_22.0): global search across every field, and a Status filter
  // (All / Overdue / Due Today / Upcoming). Category-box click-to-filter
  // (below) is a separate, ANDed narrowing on top of all of these. ────────
  const [globalSearch, setGlobalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DueStatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<PaymentFor | null>(null);
  const toggleCategoryFilter = (key: PaymentFor) => setCategoryFilter((prev) => (prev === key ? null : key));

  // ── Upcoming (Status = Upcoming) — lazily fetched once, reusing the
  // already-built Payment Upcoming endpoint for a rolling next-30-days
  // window rather than duplicating that logic here. ───────────────────────
  const [upcomingRows, setUpcomingRows] = useState<UpcomingListDetailRow[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);
  useEffect(() => {
    if (statusFilter !== 'upcoming' || upcomingRows.length > 0) return;
    (async () => {
      setLoadingUpcoming(true);
      try {
        const from = ymd(new Date());
        const to = ymd(new Date(Date.now() + 30 * 86400000));
        const res = await fetchUpcomingListDetailed(from, to);
        setUpcomingRows(res.rows);
      } catch {
        toast.error('Failed to load upcoming payments.');
      } finally {
        setLoadingUpcoming(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const paymentForFilterOptions = useMemo(
    () => Array.from(new Set(dueRows.map((r) => r.payment_for).filter((v): v is string => !!v))),
    [dueRows]
  );

  // ── Normalize both data sources into one display shape the table
  // renders — see DisplayRow's own comment. ───────────────────────────────
  const dueDisplayRows: DisplayRow[] = useMemo(() => dueRows.map((r, i) => ({
    key: `due-${r.customer_id}-${r.payment_for}-${i}`,
    customer_id: r.customer_id, customer_code: r.customer_code, customer_name: r.customer_name,
    email: r.email, mobile_number: r.mobile_number,
    assigned_employee_name: r.assigned_employee_name, assigned_employee_code: r.assigned_employee_code,
    company_name: r.company_name, project_name: r.project_name, location: r.location,
    building_name: r.building_name, wing_name: r.wing_name, flat_no: r.flat_no,
    payment_for: r.payment_for, payment_for_key: r.payment_for_key,
    amount: r.amount,
    months_pending: r.months_pending,
    per_month_amount: r.per_month_amount,
    statusLabel: r.due_category === 'due_today' ? 'Due Today' : 'Overdue',
    statusColor: r.due_category === 'due_today' ? '#d97706' : '#dc2626',
    detailText: r.due_status.replace(/^Overdue\s+/, '').replace(/^Due Today\s*\|\s*/, ''),
    dueRow: r,
  })), [dueRows]);

  const upcomingDisplayRows: DisplayRow[] = useMemo(() => upcomingRows.map((r, i) => ({
    key: `up-${r.customer_id}-${r.due_date}-${i}`,
    customer_id: r.customer_id, customer_code: r.customer_code, customer_name: r.customer_name,
    email: r.email, mobile_number: r.mobile_number,
    assigned_employee_name: r.assigned_employee_name, assigned_employee_code: r.assigned_employee_code,
    company_name: r.company_name, project_name: r.project_name, location: r.location,
    building_name: r.building_name, wing_name: r.wing_name, flat_no: r.flat_no,
    payment_for: r.payment_for, payment_for_key: r.payment_for_key,
    amount: r.amount,
    months_pending: null,
    per_month_amount: null,
    statusLabel: 'Upcoming', statusColor: '#4f46e5',
    detailText: `Due on ${new Date(r.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
  })), [upcomingRows]);

  const baseDisplayRows: DisplayRow[] = useMemo(() => {
    if (statusFilter === 'upcoming') return upcomingDisplayRows;
    if (statusFilter === 'overdue') return dueDisplayRows.filter((r) => r.dueRow?.due_category === 'overdue');
    if (statusFilter === 'due_today') return dueDisplayRows.filter((r) => r.dueRow?.due_category === 'due_today');
    return dueDisplayRows;
  }, [statusFilter, dueDisplayRows, upcomingDisplayRows]);

  const filteredDueRows = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    return baseDisplayRows.filter((r) => {
      if (filterPaymentFor && r.payment_for !== filterPaymentFor) return false;
      if (filterBuilding && r.building_name !== filterBuilding) return false;
      if (filterEmployee && r.assigned_employee_name !== filterEmployee) return false;
      if (categoryFilter && r.payment_for_key !== categoryFilter) return false;
      if (q && ![
        r.customer_code, r.customer_name, r.email, r.mobile_number,
        r.assigned_employee_name, r.assigned_employee_code,
        r.company_name, r.project_name, r.location,
        r.building_name, r.wing_name, r.flat_no, r.payment_for,
      ].some((v) => (v || '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [baseDisplayRows, filterPaymentFor, filterBuilding, filterEmployee, categoryFilter, globalSearch]);

  // ── Stat boxes — sums across the (unfiltered) full due-item list, one
  // per payment-for category, plus a grand Total. Always reflect current
  // Due/Overdue amounts regardless of the Status filter above — the boxes
  // are the page's own headline numbers, not a view of whatever the table
  // happens to be showing. ─────────────────────────────────────────────────
  const boxSums = useMemo(() => {
    const sums: Record<PaymentFor, number> = { EMIAmount: 0, BookingAmount: 0, PayAfterbooking: 0, PossessionAmount: 0, AnnualAmount: 0, AnnualAmount1: 0 };
    for (const r of dueRows) sums[r.payment_for_key] += r.amount;
    const total = Object.values(sums).reduce((s, v) => s + v, 0);
    return { ...sums, total };
  }, [dueRows]);

  const handleRefresh = () => fetchDueRows();

  const handleExportCsv = () => {
    setExportingCsv(true);
    try {
      if (filteredDueRows.length === 0) {
        toast.error('No dues to export.');
        return;
      }
      const header = ['Customer Code', 'Customer Name', 'Company', 'Assigned Employee', 'Building', 'Wing', 'Flat No', 'Email', 'Mobile No', 'Payment For', 'Months Pending', 'Amount', 'Status', 'Detail'];
      const rows = filteredDueRows.map((r) => [
        r.customer_code, r.customer_name, r.company_name || '', r.assigned_employee_name || '', r.building_name || '', r.wing_name || '',
        r.flat_no || '', r.email || '', r.mobile_number || '', r.payment_for, r.months_pending ?? '',
        r.months_pending && r.months_pending > 1 && r.per_month_amount != null
          ? `${r.per_month_amount} x ${r.months_pending} = ${r.amount}` : r.amount,
        r.statusLabel, r.detailText,
      ]);
      const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment_dues_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingCsv(false);
    }
  };

  // ── Client-side pagination over the filtered due-item list. ─────────────
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  useEffect(() => { setPage(1); }, [filterPaymentFor, filterBuilding, filterEmployee, statusFilter, categoryFilter, globalSearch]);
  const totalPages = Math.max(1, Math.ceil(filteredDueRows.length / limit));
  const safePage = Math.min(page, totalPages);
  const from = filteredDueRows.length === 0 ? 0 : (safePage - 1) * limit + 1;
  const to = Math.min(safePage * limit, filteredDueRows.length);
  const pagedDueRows = useMemo(() => filteredDueRows.slice((safePage - 1) * limit, safePage * limit), [filteredDueRows, safePage, limit]);
  const pageBtns = useCallback(() => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [safePage, totalPages]);

  // ── Add Payment Details ──────────────────────────────────────────────
  const [apCustomerSearch, setApCustomerSearch] = useState('');
  const [apCustomerId, setApCustomerId] = useState<string | null>(null);
  const [apInstDate, setApInstDate] = useState('');
  const [apPaymentDate, setApPaymentDate] = useState('');
  const [apPaymentForKey, setApPaymentForKey] = useState('');
  const [apAmount, setApAmount] = useState('');
  const [apModeOfPayment, setApModeOfPayment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [apSuggestLoading, setApSuggestLoading] = useState(false);

  const apSelectedCustomer = useMemo(() => customers.find((c) => c.id === apCustomerId) ?? null, [customers, apCustomerId]);
  const apSelectedPaymentFor = useMemo(() => PAYMENT_FOR_UI_OPTIONS.find((o) => o.key === apPaymentForKey) ?? null, [apPaymentForKey]);
  // V_22.0 — Company is no longer free-typed; it's read straight off the
  // selected customer's building's linked business Company (see
  // Building.entity.ts's business_company_id / buildingService.ts), same
  // as collectPayment now derives it server-side.
  const apDerivedCompanyName = useMemo(
    () => buildings.find((b) => b.id === apSelectedCustomer?.building_id)?.business_company_name || '',
    [buildings, apSelectedCustomer]
  );

  const handleCustomerSearchChange = (v: string) => {
    setApCustomerSearch(v);
    const exact = customers.find((c) => `${c.customer_name}${c.customer_code ? ` (${c.customer_code})` : ''}` === v);
    setApCustomerId(exact ? exact.id : null);
  };

  const handlePaymentForChange = async (key: string) => {
    setApPaymentForKey(key);
    setApAmount('');
    const opt = PAYMENT_FOR_UI_OPTIONS.find((o) => o.key === key);
    // Extra Pay has no Installment Date at all (see the field's own comment
    // below) — clear any stale value left over from a prior selection.
    if (opt?.isAdvance) setApInstDate('');
    if (!opt || !apCustomerId) return;
    setApSuggestLoading(true);
    try {
      const suggestion = await fetchDefaultAmount(apCustomerId, opt.value);
      setApAmount(suggestion.amount > 0 ? String(suggestion.amount) : '');
      if (suggestion.date && !opt.isAdvance) setApInstDate(suggestion.date);
    } catch {
      // A convenience prefill only — leave the field blank on failure.
    } finally {
      setApSuggestLoading(false);
    }
  };

  const resetAddPaymentForm = () => {
    setApCustomerSearch('');
    setApCustomerId(null);
    setApInstDate('');
    setApPaymentDate('');
    setApPaymentForKey('');
    setApAmount('');
    setApModeOfPayment('');
    setSubmitAttempted(false);
  };

  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const setFieldRef = (key: string) => (el: HTMLDivElement | null) => { fieldRefs.current[key] = el; };
  const revealInvalidField = (field: string) => {
    const el = fieldRefs.current[field];
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.querySelector<HTMLElement>('input, select, button, textarea')?.focus();
  };

  const validationChecks = useMemo(() => [
    { field: 'customer', message: 'Please select a customer.', failed: () => !apCustomerId },
    { field: 'payment_for', message: 'Payment type is required.', failed: () => !apPaymentForKey },
    { field: 'amount', message: 'Please enter a valid amount.', failed: () => !apAmount.trim() || Number(apAmount) <= 0 },
    { field: 'mode_of_payment', message: 'Payment method is required.', failed: () => !apModeOfPayment.trim() },
  ], [apCustomerId, apPaymentForKey, apAmount, apModeOfPayment]);

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const activeErrors = submitAttempted ? validationChecks.filter((c) => c.failed()) : [];
  const errorFor = (field: string): string | undefined =>
    submitAttempted ? validationChecks.find((c) => c.field === field && c.failed())?.message : undefined;

  const handleSubmitAddPayment = async () => {
    setSubmitAttempted(true);
    const invalid = validationChecks.find((c) => c.failed());
    if (invalid) { revealInvalidField(invalid.field); return; }
    if (!apSelectedCustomer || !apSelectedPaymentFor) return;

    setSubmitting(true);
    try {
      const payload: CollectPaymentPayload = {
        customer_id: Number(apSelectedCustomer.id),
        amount: Number(apAmount),
        payment_for: apSelectedPaymentFor.value,
        inst_date: apInstDate || undefined,
        payment_date: apPaymentDate || undefined,
        mode_of_payment: apModeOfPayment,
        is_advance_pay: apSelectedPaymentFor.isAdvance || undefined,
      };
      const res = await collectPayment(payload);
      toast.success(`${res.message}${res.receiptNumber ? ` — Receipt #${res.receiptNumber}` : ''}`);
      resetAddPaymentForm();
      fetchDueRows();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldLabelStyle: React.CSSProperties = { display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 };
  const fieldInputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%', background: t.inputBg, border: `1px solid ${hasError ? '#ef4444' : t.inputBorder}`, color: t.inputText,
    borderRadius: 10, padding: '9px 10px', fontSize: 12, outline: 'none',
  });
  const readOnlyInputStyle: React.CSSProperties = { ...fieldInputStyle(false), background: t.insetBg, cursor: 'not-allowed', color: t.textSecondary };

  const statBoxSpecs: (StatBoxSpec & { key: PaymentFor | 'total' })[] = [
    ...PAYMENT_FOR_KEY_ORDER.map((key) => ({
      key, label: PAYMENT_FOR_KEY_META[key].label, value: boxSums[key], color: PAYMENT_FOR_KEY_META[key].color, icon: PAYMENT_FOR_KEY_META[key].icon,
    })),
    { key: 'total' as const, label: 'Total', value: boxSums.total, color: '#0891b2', icon: MdAccountBalanceWallet },
  ];

  return (
    <div className="due-report-page" style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div className="due-report-header flex items-center gap-3 mb-5">
        <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 44, height: 44, background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff' }}>
          <MdPayments size={22} style={{ color: '#4f46e5' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 19.5, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Payment Dues</h1>
          <p style={{ fontSize: 11.5, color: t.textSecondary, margin: '2px 0 0' }}>Every overdue amount across every customer, and a form to collect one directly</p>
        </div>
      </div>

      {/* ── Stat boxes — every Payment For category plus a grand Total,
          always one row on desktop, same saturated-gradient StatCard used
          site-wide (Building Master etc). Each category box doubles as a
          click-to-filter on the table below (same convention Payment
          Upcoming's own boxes use) — click again, or click Total, to
          clear it. ────────────────────────────────────────────────────── */}
      <div className="due-report-stat-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3 mb-5">
        {statBoxSpecs.map((spec) => (
          <StatCard key={spec.key} label={spec.label} value={rupee(spec.value)} icon={spec.icon} color={spec.color}
            bg={isDark ? 'rgba(37,99,235,0.12)' : '#eff6ff'} loading={loadingDueList} compact
            active={spec.key !== 'total' && categoryFilter === spec.key}
            onClick={() => (spec.key === 'total' ? setCategoryFilter(null) : toggleCategoryFilter(spec.key))}
            surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        ))}
      </div>

      {/* ── Payment fields — no section heading, per explicit product
          decision (Customer Name through Mode of Payment, unchanged). ── */}
      <div className="due-report-form-card rounded-2xl mb-5 overflow-hidden" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="due-report-form-card-body p-5">
          <ValidationErrorSummary
            t={t}
            errors={activeErrors.map((c) => ({ field: c.field, message: c.message }))}
            onErrorClick={revealInvalidField}
          />
          <div className="due-report-form-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            <div ref={setFieldRef('customer')}>
              <label style={fieldLabelStyle}>Customer Name</label>
              <SearchableSelect t={t} placeholder="Select or type customer name" options={customerOptions} value={apCustomerSearch} onChange={handleCustomerSearchChange} />
              {errorFor('customer') && <p style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4 }}>{errorFor('customer')}</p>}
            </div>
            <div>
              {/* V_22.0 — no longer free-typed; read straight off the
                  selected customer's building's linked business Company. */}
              <label style={fieldLabelStyle}>Company</label>
              <input type="text" readOnly value={apDerivedCompanyName} placeholder="—" style={readOnlyInputStyle} />
            </div>
            <div>
              <label style={fieldLabelStyle}>Building Name</label>
              <input type="text" readOnly value={apSelectedCustomer?.building_name || ''} placeholder="—" style={readOnlyInputStyle} />
            </div>
            <div>
              <label style={fieldLabelStyle}>Wing</label>
              <input type="text" readOnly value={apSelectedCustomer?.wing_name || ''} placeholder="—" style={readOnlyInputStyle} />
            </div>
            <div>
              <label style={fieldLabelStyle}>Flat Number</label>
              <input type="text" readOnly value={apSelectedCustomer?.flat_no || ''} placeholder="—" style={readOnlyInputStyle} />
            </div>
            {/* Extra Pay is an advance against future EMIs, not tied to any
                one installment — it has no Installment Date at all (takes
                today's date via Payment Date instead), so the field is
                hidden rather than shown blank/disabled. */}
            {!apSelectedPaymentFor?.isAdvance && (
              <div>
                <label style={fieldLabelStyle}>Installment Date</label>
                {/* Read-only — auto-filled from the suggested default date
                    for the selected Payment For, same as Building/Wing/Flat
                    above. Not employee-editable. */}
                <input type="date" readOnly value={apInstDate} style={readOnlyInputStyle} />
              </div>
            )}
            <div>
              <label style={fieldLabelStyle}>Payment Date</label>
              <input type="date" value={apPaymentDate} onChange={(e) => setApPaymentDate(e.target.value)} style={fieldInputStyle()} />
            </div>
            <div ref={setFieldRef('payment_for')}>
              <label style={fieldLabelStyle}>Payment For</label>
              <select value={apPaymentForKey} onChange={(e) => handlePaymentForChange(e.target.value)} style={fieldInputStyle(!!errorFor('payment_for'))}>
                <option value="">-- Select --</option>
                {PAYMENT_FOR_UI_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              {errorFor('payment_for') && <p style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4 }}>{errorFor('payment_for')}</p>}
            </div>
            {apSelectedPaymentFor && (
              <div ref={setFieldRef('amount')}>
                <label style={fieldLabelStyle}>{apSelectedPaymentFor.label} (₹){apSuggestLoading ? ' (suggesting...)' : ''}</label>
                <input type="text" inputMode="numeric" value={formatAmountDisplay(apAmount)} onChange={(e) => setApAmount(e.target.value.replace(/[^\d]/g, ''))} placeholder="Enter amount"
                  style={fieldInputStyle(!!errorFor('amount'))} />
                {errorFor('amount') && <p style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4 }}>{errorFor('amount')}</p>}
              </div>
            )}
            <div ref={setFieldRef('mode_of_payment')}>
              <label style={fieldLabelStyle}>Mode of Payment</label>
              <select value={apModeOfPayment} onChange={(e) => setApModeOfPayment(e.target.value)} style={fieldInputStyle(!!errorFor('mode_of_payment'))}>
                <option value="">--Select Payment Method--</option>
                {MODE_OF_PAYMENT_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              {errorFor('mode_of_payment') && <p style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4 }}>{errorFor('mode_of_payment')}</p>}
            </div>
            <div className="flex items-end">
              <button type="button" onClick={handleSubmitAddPayment} disabled={submitting}
                className="w-full px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: submitting ? '#6b7280' : 'var(--brand-gradient)', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar — Payment For + Building + Employee + global search +
          Status filters, follow-up badge, Export CSV and Refresh all in a
          single row. Filter widths are kept narrow (and the follow-up
          badge/export button compact) so the whole row fits typical
          laptop/sidebar widths without a horizontal scrollbar; flex-wrap
          only kicks in as a fallback on very small screens instead of
          clipping/hiding anything. ── */}
      <div className="due-report-toolbar rounded-2xl mb-5 p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="due-report-toolbar-row flex items-center flex-wrap" style={{ gap: 10 }}>
          <div className="due-report-toolbar-filters flex items-center flex-wrap gap-2" style={{ minWidth: 0 }}>
            <div className="due-report-filter-item" style={{ width: 140, flexShrink: 0 }}>
              <SearchableSelect t={t} placeholder="Select Payment For" options={paymentForFilterOptions} value={filterPaymentFor} onChange={setFilterPaymentFor} />
            </div>
            <div className="due-report-filter-item" style={{ width: 140, flexShrink: 0 }}>
              <SearchableSelect t={t} placeholder="Select Building" options={buildingNames} value={filterBuilding} onChange={setFilterBuilding} />
            </div>
            <div className="due-report-filter-item" style={{ width: 140, flexShrink: 0 }}>
              <SearchableSelect t={t} placeholder="Select Employee" options={employeeNameOptions} value={filterEmployee} onChange={setFilterEmployee} />
            </div>
            <div className="due-report-filter-item due-report-global-search relative" style={{ width: 160, flexShrink: 0 }}>
              <MdSearch size={15} style={{ position: 'absolute', left: 10, top: 11, color: t.textSecondary, pointerEvents: 'none' }} />
              <input type="text" placeholder="Search across all data..." value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)}
                style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 10px 9px 30px', fontSize: 12, outline: 'none' }} />
            </div>
            <div className="due-report-filter-item" style={{ width: 120, flexShrink: 0 }}>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as DueStatusFilter)}
                style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 10px', fontSize: 12, outline: 'none' }}>
                <option value="all">All Status</option>
                <option value="overdue">Overdue</option>
                <option value="due_today">Due Today</option>
                <option value="upcoming">Upcoming</option>
              </select>
            </div>
          </div>
          <div className="due-report-toolbar-actions flex items-center gap-2" style={{ marginLeft: 'auto', flexShrink: 0 }}>
            {/* In-app-only badge — open follow-ups due today/tomorrow across
                the whole team (no email/WhatsApp sending, out of scope).
                Clicking it opens a popup listing those follow-ups. */}
            <button type="button" title="Open follow-ups due today / tomorrow" onClick={() => setFollowUpListOpen(true)}
              className="due-report-followup-badge flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold"
              style={{ background: 'var(--brand-gradient)', border: 'none', color: '#fff', whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
              <MdNoteAdd size={15} style={{ color: '#fff' }} />
              <span className="due-report-followup-badge-text">Today: {followUpCounts.today} · Tmrw: {followUpCounts.tomorrow}</span>
            </button>
            <button type="button" onClick={handleExportCsv} disabled={exportingCsv || filteredDueRows.length === 0}
              className="due-report-export-btn flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold"
              style={{ background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: exportingCsv ? 'not-allowed' : 'pointer', opacity: exportingCsv ? 0.6 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}>
              <MdDownload size={16} /> <span className="due-report-export-btn-text">{exportingCsv ? 'Exporting…' : 'Export CSV'}</span>
            </button>
            <button type="button" onClick={handleRefresh} title="Refresh"
              className="due-report-refresh-btn flex items-center justify-center rounded-xl"
              style={{ width: 36, height: 36, background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
              <MdRefresh size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Payment Due table — Customer, Company/Project/Location, Building/
          Wing/Flat, Assigned Employee+Code, Contact, Payment For (color-
          coded badge, matching the top boxes), Amount, Status, Detail,
          Follow Up. ────────────────────────────────────────────────────── */}
      <div className="due-report-table-card rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="due-report-table-scroll" style={{ overflowX: 'auto' }}>
          <table className="due-report-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1400 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                {['Customer Name', 'Company / Project / Location', 'Building Details', 'Assigned Employee', 'Contact (Email / Mobile)', 'Payment For', 'Months Pending', 'Amount', 'Status', 'Detail', 'Follow Up'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(loadingDueList || (statusFilter === 'upcoming' && loadingUpcoming)) ? (
                <tr><td colSpan={11} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading payment dues...</td></tr>
              ) : filteredDueRows.length === 0 ? (
                <tr><td colSpan={11} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>
                  {baseDisplayRows.length === 0 ? 'No customers currently have a payment due.' : 'No dues match the selected filters.'}
                </td></tr>
              ) : (
                pagedDueRows.map((r) => (
                  <tr key={r.key} style={{ borderTop: `1px solid ${t.divider}` }}>
                    <td style={{ padding: '12px 14px', fontSize: 12.5, color: '#000', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>{r.customer_name}</div>
                      <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 1 }}>{r.customer_code}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: '#000', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>{r.company_name || '—'}</div>
                      {(r.project_name || r.location) && (
                        <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 1 }}>
                          {r.project_name || ''}{r.project_name && r.location ? ' • ' : ''}{r.location || ''}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: '#000', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>{r.building_name || '—'}</div>
                      {(r.wing_name || r.flat_no) && (
                        <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 1 }}>
                          {r.wing_name ? `Wing ${r.wing_name}` : ''}{r.wing_name && r.flat_no ? ' • ' : ''}{r.flat_no ? `Flat ${r.flat_no}` : ''}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: '#000', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>{r.assigned_employee_name || '—'}</div>
                      {r.assigned_employee_code && (
                        <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 1 }}>{r.assigned_employee_code}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: '#000' }}>
                      <div>{r.email || '—'}</div>
                      <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 1 }}>{r.mobile_number || '—'}</div>
                    </td>
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 9px', borderRadius: 999,
                        fontSize: 10.5, fontWeight: 700, color: '#fff', background: PAYMENT_FOR_KEY_META[r.payment_for_key].color,
                      }}>
                        {PAYMENT_FOR_KEY_META[r.payment_for_key].label}
                      </span>
                      <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 3 }}>{r.payment_for}</div>
                    </td>
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      {r.months_pending ? (
                        <span style={{
                          display: 'inline-block', padding: '3px 9px', borderRadius: 999,
                          fontSize: 10.5, fontWeight: 700, color: '#fff',
                          background: r.months_pending >= 5 ? '#dc2626' : r.months_pending >= 3 ? '#ea580c' : '#d97706',
                        }}>
                          {r.months_pending} month{r.months_pending === 1 ? '' : 's'}
                        </span>
                      ) : (
                        <span style={{ color: t.textSecondary, fontSize: 11.5 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 700, color: '#000', whiteSpace: 'nowrap' }}>
                      {r.months_pending && r.months_pending > 1 && r.per_month_amount != null
                        ? `${rupee(r.per_month_amount)} × ${r.months_pending} = ${rupee(r.amount)}`
                        : rupee(r.amount)}
                    </td>
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                        fontSize: 10.5, fontWeight: 700, color: '#fff', background: r.statusColor,
                      }}>
                        {r.statusLabel}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, fontWeight: 600, color: r.statusColor, minWidth: 220 }}>{r.detailText}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {r.dueRow && (
                        <button type="button" onClick={() => openFollowUp(r.dueRow as DueListDetailRow)} title="Schedule a follow-up"
                          className="flex items-center justify-center rounded-lg"
                          style={{ width: 32, height: 32, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: 'var(--brand-gradient)', cursor: 'pointer' }}>
                          <MdNoteAdd size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredDueRows.length > 0 && (
          <PaginationFooter t={t} limit={limit} setLimit={setLimit} setPage={setPage} safePage={safePage} totalPages={totalPages} from={from} to={to} total={filteredDueRows.length} pageBtns={pageBtns} />
        )}
      </div>

      {/* ── Follow-up modal (V_22.0) — note + follow-up date + assigned
          employee for the row's customer, backed by the Task entity. ──── */}
      {followUpRow && createPortal(
        <div className="due-report-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="due-report-modal rounded-2xl w-full" style={{ maxWidth: 440, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: t.textPrimary }}>Schedule Follow-up</div>
                <div style={{ fontSize: 11, color: t.textSecondary }}>{followUpRow.customer_name} · {followUpRow.customer_code}</div>
              </div>
              <button type="button" onClick={closeFollowUp} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary }}>
                <MdClose size={20} />
              </button>
            </div>
            <div className="p-5" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={fieldLabelStyle}>Note</label>
                <textarea rows={3} value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="What needs to be followed up on?" style={{ ...fieldInputStyle(), resize: 'vertical' }} />
              </div>
              <div>
                <label style={fieldLabelStyle}>Follow-up Date</label>
                <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} style={fieldInputStyle()} />
              </div>
              <div>
                <label style={fieldLabelStyle}>Assign To</label>
                <select value={followUpAssignedTo} onChange={(e) => setFollowUpAssignedTo(e.target.value)} style={fieldInputStyle()}>
                  <option value="">-- Unassigned --</option>
                  {followUpEmployees.map((e) => (
                    <option key={e.id} value={e.id}>{[e.first_name, e.last_name].filter(Boolean).join(' ')}</option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={handleSubmitFollowUp} disabled={followUpSubmitting}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: followUpSubmitting ? '#6b7280' : '#16a34a', border: 'none', cursor: followUpSubmitting ? 'not-allowed' : 'pointer' }}>
                {followUpSubmitting ? 'Scheduling...' : 'Schedule Follow-up'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Follow-up list popup — the badge's own click target, listing
          every open follow-up due today/tomorrow across the team. ────── */}
      {followUpListOpen && createPortal(
        <div className="due-report-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="due-report-modal rounded-2xl w-full" style={{ maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 rounded-t-2xl" style={{ background: 'var(--grad-green)' }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: '#fff' }}>Follow-ups — Today &amp; Tomorrow</div>
              <button type="button" onClick={() => setFollowUpListOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>
                <MdClose size={20} />
              </button>
            </div>
            <div style={{ padding: '8px 0', overflowY: 'auto' }}>
              {followUpListTasks.length === 0 ? (
                <p style={{ color: t.textSecondary, fontSize: 12, padding: '16px 20px' }}>No follow-ups scheduled for today or tomorrow.</p>
              ) : (
                followUpListTasks.map((task) => (
                  <div key={task.id} style={{ padding: '10px 20px', borderBottom: `1px solid ${t.divider}` }}>
                    <div className="flex items-center justify-between gap-2">
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textPrimary }}>{task.customer_name || task.title}</div>
                      <span style={{
                        flexShrink: 0, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                        padding: '2px 8px', borderRadius: 999, color: '#fff',
                        background: task.dueBucket === 'today' ? '#dc2626' : '#d97706',
                      }}>
                        {task.dueBucket === 'today' ? 'Today' : 'Tomorrow'}
                      </span>
                    </div>
                    {task.description && (
                      <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }}>{task.description}</div>
                    )}
                    <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 3 }}>
                      Assigned to: {task.assigned_to_name || 'Unassigned'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DueReportPage;
