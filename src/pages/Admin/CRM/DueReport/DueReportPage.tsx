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
  MdReceiptLong, MdSchedule, MdVpnKey, MdEvent, MdAccountBalanceWallet, MdNoteAdd,
} from 'react-icons/md';

import { useAppDispatch } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { AppTheme } from '../../../../styles/theme';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import PaginationFooter from '../../../../components/common/PaginationFooter';
import { ValidationErrorSummary } from '../../../../components/common/ValidationErrorSummary';
import StatCard from '../../../../components/masters/StatCard';
import {
  fetchDueListDetailed, collectPayment, fetchDefaultAmount, fetchUpcomingAmount, DueListDetailRow, UpcomingAmountData,
} from '../../../../services/paymentService';
import { fetchAllCustomerDetails } from '../../../../services/customerDetailsService';
import { FetchBuildingList } from '../../../../services/buildingService';
import { FetchEmployeeDetails, Employee } from '../../../../services/employeeDetailsService';
import { tasksService } from '../../../../services/tasksService';
import { Customer, PaymentFor, CollectPaymentPayload, Building } from '../../../../types/index';

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
  { key: 'pay_after_booking', label: 'Payment After Booking', value: 'PayAfterbooking' },
  { key: 'possession', label: 'Possession Amount', value: 'PossessionAmount' },
  { key: 'booster_before', label: 'Booster Before Possession', value: 'AnnualAmount' },
  { key: 'booster_after', label: 'Booster After Possession', value: 'AnnualAmount1' },
  { key: 'extra_pay', label: 'Extra Pay', value: 'EMIAmount', isAdvance: true },
];
const MODE_OF_PAYMENT_OPTIONS = ['Cash', 'Cheque', 'Online', 'Other'];

const DueReportPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isDark, t, cssVars } = useAppearanceTokens();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const buildingNames = useMemo(() => Array.from(new Set(buildings.map((b) => b.building_name))), [buildings]);

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

  const paymentForFilterOptions = useMemo(
    () => Array.from(new Set(dueRows.map((r) => r.payment_for).filter((v): v is string => !!v))),
    [dueRows]
  );

  const filteredDueRows = useMemo(() => {
    return dueRows.filter((r) => {
      if (filterPaymentFor && r.payment_for !== filterPaymentFor) return false;
      if (filterBuilding && r.building_name !== filterBuilding) return false;
      if (filterEmployee && r.assigned_employee_name !== filterEmployee) return false;
      return true;
    });
  }, [dueRows, filterPaymentFor, filterBuilding, filterEmployee]);

  // ── Stat boxes — sums across the (unfiltered) full due-item list, one
  // per payment-for category, plus a grand Total. ─────────────────────────
  const boxSums = useMemo(() => {
    let booking = 0, payAfterBooking = 0, possession = 0, emi = 0, annual = 0;
    for (const r of dueRows) {
      if (r.payment_for === 'Booking Amount') booking += r.amount;
      else if (r.payment_for === 'Remaining Booking Amount') payAfterBooking += r.amount;
      else if (r.payment_for === 'Possession Amount') possession += r.amount;
      else if (r.payment_for === 'EMI Before' || r.payment_for === 'EMI After') emi += r.amount;
      else if (r.payment_for === 'Annual Amount' || r.payment_for === 'Annual Amount (After)') annual += r.amount;
    }
    return { booking, payAfterBooking, possession, emi, annual, total: booking + payAfterBooking + possession + emi + annual };
  }, [dueRows]);

  const handleRefresh = () => fetchDueRows();

  const handleExportCsv = () => {
    setExportingCsv(true);
    try {
      if (filteredDueRows.length === 0) {
        toast.error('No dues to export.');
        return;
      }
      const header = ['Customer Code', 'Customer Name', 'Assigned Employee', 'Building', 'Wing', 'Flat No', 'Mobile No', 'Payment For', 'Amount', 'Due Status'];
      const rows = filteredDueRows.map((r) => [
        r.customer_code, r.customer_name, r.assigned_employee_name || '', r.building_name || '', r.wing_name || '',
        r.flat_no || '', r.mobile_number || '', r.payment_for, r.amount, r.due_status,
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
  useEffect(() => { setPage(1); }, [filterPaymentFor, filterBuilding, filterEmployee]);
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

  // ── "Show Upcoming Amount" — checkbox reveals a From/To date range; OK
  // enables only once both dates are picked (and To isn't before From),
  // and totals every customer's upcoming (not-yet-due) installment amount
  // in that range via the pre-existing GET /payments/upcoming-amount. ────
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [upcomingFrom, setUpcomingFrom] = useState('');
  const [upcomingTo, setUpcomingTo] = useState('');
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [upcomingResult, setUpcomingResult] = useState<UpcomingAmountData | null>(null);

  const upcomingRangeValid = !!upcomingFrom && !!upcomingTo && upcomingTo >= upcomingFrom;
  const upcomingDays = upcomingRangeValid
    ? Math.round((new Date(upcomingTo).getTime() - new Date(upcomingFrom).getTime()) / 86400000) + 1
    : 0;

  const handleToggleUpcoming = (checked: boolean) => {
    setShowUpcoming(checked);
    if (!checked) {
      setUpcomingFrom('');
      setUpcomingTo('');
      setUpcomingResult(null);
    }
  };

  const handleCalculateUpcoming = async () => {
    if (!upcomingRangeValid) return;
    setUpcomingLoading(true);
    setUpcomingResult(null);
    try {
      const data = await fetchUpcomingAmount(upcomingFrom, upcomingTo);
      setUpcomingResult(data);
    } catch {
      toast.error('Failed to calculate upcoming amount.');
    } finally {
      setUpcomingLoading(false);
    }
  };

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

  const statBoxSpecs: StatBoxSpec[] = [
    { label: 'Booking Amount', value: boxSums.booking, color: '#dc2626', icon: MdReceiptLong },
    { label: 'Pay After Booking', value: boxSums.payAfterBooking, color: '#ea580c', icon: MdSchedule },
    { label: 'Possession Amount', value: boxSums.possession, color: '#7c3aed', icon: MdVpnKey },
    { label: 'EMI', value: boxSums.emi, color: '#2563eb', icon: MdPayments },
    { label: 'Annual Amount', value: boxSums.annual, color: '#16a34a', icon: MdEvent },
    { label: 'Total', value: boxSums.total, color: '#0891b2', icon: MdAccountBalanceWallet },
  ];

  return (
    <div style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 44, height: 44, background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff' }}>
          <MdPayments size={22} style={{ color: '#4f46e5' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 19.5, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Payment Dues</h1>
          <p style={{ fontSize: 11.5, color: t.textSecondary, margin: '2px 0 0' }}>Every overdue amount across every customer, and a form to collect one directly</p>
        </div>
      </div>

      {/* ── Stat boxes — always 6, always one row on desktop, same
          saturated-gradient StatCard used site-wide (Building Master etc). */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        {statBoxSpecs.map((spec) => (
          <StatCard key={spec.label} label={spec.label} value={rupee(spec.value)} icon={spec.icon} color={spec.color}
            bg={isDark ? 'rgba(37,99,235,0.12)' : '#eff6ff'} loading={loadingDueList} compact labelFontSize={12.5}
            surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        ))}
      </div>

      {/* ── Add Payment Details ─────────────────────────────────────────── */}
      <div className="rounded-2xl mb-5 overflow-hidden" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div style={{ background: 'linear-gradient(135deg,#f97316,#fbbf24)', padding: '12px 18px' }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: '#fff' }}>Add Payment Details</span>
        </div>
        <div className="p-5">
          <ValidationErrorSummary
            t={t}
            errors={activeErrors.map((c) => ({ field: c.field, message: c.message }))}
            onErrorClick={revealInvalidField}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 mb-3.5">
            <div ref={setFieldRef('customer')}>
              <label style={fieldLabelStyle}>Customer Name</label>
              <SearchableSelect t={t} placeholder="Select or type customer name" options={customerOptions} value={apCustomerSearch} onChange={handleCustomerSearchChange} />
              {errorFor('customer') && <p style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4 }}>{errorFor('customer')}</p>}
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
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
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
            <div>
              {/* V_22.0 — no longer free-typed; read straight off the
                  selected customer's building's linked business Company. */}
              <label style={fieldLabelStyle}>Company</label>
              <input type="text" readOnly value={apDerivedCompanyName} placeholder="—" style={readOnlyInputStyle} />
            </div>
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
                style={{ background: submitting ? '#6b7280' : 'linear-gradient(135deg,#16a34a,#22c55e)', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>

          {/* ── Row 3 — Show Upcoming Amount: checkbox reveals a date
              range whose total upcoming (not-yet-due) installment amount
              can be calculated on demand. ─────────────────────────────── */}
          <div className="flex flex-wrap items-end gap-3.5 mt-4 pt-4" style={{ borderTop: `1px dashed ${t.divider}` }}>
            <label className="flex items-center gap-2" style={{ cursor: 'pointer', paddingBottom: 9 }}>
              <input type="checkbox" checked={showUpcoming} onChange={(e) => handleToggleUpcoming(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: t.textPrimary }}>Show Upcoming Payment</span>
            </label>
            {showUpcoming && (
              <>
                <div>
                  <label style={fieldLabelStyle}>From Date</label>
                  <input type="date" value={upcomingFrom} onChange={(e) => { setUpcomingFrom(e.target.value); setUpcomingResult(null); }} style={{ ...fieldInputStyle(), width: 160 }} />
                </div>
                <div>
                  <label style={fieldLabelStyle}>To Date</label>
                  <input type="date" value={upcomingTo} onChange={(e) => { setUpcomingTo(e.target.value); setUpcomingResult(null); }} style={{ ...fieldInputStyle(), width: 160 }} />
                </div>
                <button type="button" onClick={handleCalculateUpcoming} disabled={!upcomingRangeValid || upcomingLoading}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{
                    background: !upcomingRangeValid || upcomingLoading ? '#6b7280' : 'linear-gradient(135deg,#2563eb,#3b82f6)',
                    border: 'none', cursor: !upcomingRangeValid || upcomingLoading ? 'not-allowed' : 'pointer',
                  }}>
                  {upcomingLoading ? 'Calculating…' : 'OK'}
                </button>
                {upcomingResult && (
                  <div className="rounded-xl" style={{ background: isDark ? 'rgba(37,99,235,0.14)' : '#eff6ff', border: `1px solid ${isDark ? 'rgba(37,99,235,0.3)' : '#bfdbfe'}`, padding: '8px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                      Upcoming Amount — {upcomingDays} Day{upcomingDays === 1 ? '' : 's'}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: '#2563eb' }}>{rupee(upcomingResult.total_amount)}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Toolbar — Payment For + Building + Employee filters (left),
          Export CSV + Refresh (right), always one row. ─────────────────── */}
      <div className="rounded-2xl mb-5 p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex items-center justify-between gap-3" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
          <div className="flex items-center gap-3" style={{ flexWrap: 'nowrap', overflowX: 'auto', minWidth: 0 }}>
            <div style={{ width: 200, flexShrink: 0 }}>
              <SearchableSelect t={t} placeholder="Select Payment For" options={paymentForFilterOptions} value={filterPaymentFor} onChange={setFilterPaymentFor} />
            </div>
            <div style={{ width: 200, flexShrink: 0 }}>
              <SearchableSelect t={t} placeholder="Select Building" options={buildingNames} value={filterBuilding} onChange={setFilterBuilding} />
            </div>
            <div style={{ width: 200, flexShrink: 0 }}>
              <SearchableSelect t={t} placeholder="Select Employee" options={employeeNameOptions} value={filterEmployee} onChange={setFilterEmployee} />
            </div>
          </div>
          <div className="flex items-center gap-2.5" style={{ flexShrink: 0 }}>
            {/* In-app-only badge — open follow-ups due today/tomorrow across
                the whole team (no email/WhatsApp sending, out of scope). */}
            <div title="Open follow-ups due today / tomorrow"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, whiteSpace: 'nowrap' }}>
              <MdNoteAdd size={15} style={{ color: '#0284c7' }} />
              Follow-ups — Today: {followUpCounts.today} · Tomorrow: {followUpCounts.tomorrow}
            </div>
            <button type="button" onClick={handleExportCsv} disabled={exportingCsv || filteredDueRows.length === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: exportingCsv ? 'not-allowed' : 'pointer', opacity: exportingCsv ? 0.6 : 1, whiteSpace: 'nowrap' }}>
              <MdDownload size={16} /> {exportingCsv ? 'Exporting…' : 'Export CSV'}
            </button>
            <button type="button" onClick={handleRefresh} title="Refresh"
              className="flex items-center justify-center rounded-xl"
              style={{ width: 40, height: 40, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer', flexShrink: 0 }}>
              <MdRefresh size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Payment Due table ────────────────────────────────────────────── */}
      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                {['Customer Code', 'Customer Name', 'Assigned Employee', 'Building / Wing / Flat', 'Mobile No', 'Payment For', 'Amount', 'Status', 'Overdue By', 'Follow Up'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingDueList ? (
                <tr><td colSpan={10} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading payment dues...</td></tr>
              ) : filteredDueRows.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>
                  {dueRows.length === 0 ? 'No customers currently have a payment due.' : 'No dues match the selected filters.'}
                </td></tr>
              ) : (
                pagedDueRows.map((r, i) => {
                  // Every row in this list is, by definition, overdue (see
                  // getDueListDetailed) — so the chip is always "Overdue".
                  // The detail column keeps the rest of the backend's
                  // already-computed duration/date/amount text, just with
                  // the leading "Overdue" word stripped since the chip now
                  // says that.
                  const overdueDetail = r.due_status.replace(/^Overdue\s+/, '');
                  return (
                    <tr key={`${r.customer_id}-${r.payment_for}-${i}`} style={{ borderTop: `1px solid ${t.divider}` }}>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: '#000', whiteSpace: 'nowrap' }}>{r.customer_code}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 600, color: '#000', whiteSpace: 'nowrap' }}>{r.customer_name}</td>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: '#000', whiteSpace: 'nowrap' }}>{r.assigned_employee_name || '—'}</td>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: '#000', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600 }}>{r.building_name || '—'}</div>
                        {(r.wing_name || r.flat_no) && (
                          <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 1 }}>
                            {r.wing_name ? `Wing ${r.wing_name}` : ''}{r.wing_name && r.flat_no ? ' • ' : ''}{r.flat_no ? `Flat ${r.flat_no}` : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: '#000', whiteSpace: 'nowrap' }}>{r.mobile_number || '—'}</td>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: '#000', whiteSpace: 'nowrap' }}>{r.payment_for}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 700, color: '#000', whiteSpace: 'nowrap' }}>{rupee(r.amount)}</td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                          fontSize: 10.5, fontWeight: 700, color: '#fff', background: '#dc2626',
                        }}>
                          Overdue
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, fontWeight: 600, color: '#dc2626', minWidth: 260 }}>{overdueDetail}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <button type="button" onClick={() => openFollowUp(r)} title="Schedule a follow-up"
                          className="flex items-center justify-center rounded-lg"
                          style={{ width: 32, height: 32, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: '#0284c7', cursor: 'pointer' }}>
                          <MdNoteAdd size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={closeFollowUp}>
          <div className="rounded-2xl w-full" style={{ maxWidth: 440, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}
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
                style={{ background: followUpSubmitting ? '#6b7280' : 'linear-gradient(135deg,#16a34a,#22c55e)', border: 'none', cursor: followUpSubmitting ? 'not-allowed' : 'pointer' }}>
                {followUpSubmitting ? 'Scheduling...' : 'Schedule Follow-up'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DueReportPage;
