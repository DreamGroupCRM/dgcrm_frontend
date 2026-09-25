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
import { toast } from '@/utils/toast';
import { IconType } from 'react-icons';
import {
  MdPayments, MdRefresh, MdDownload, MdClose, MdKeyboardArrowDown,
  MdReceiptLong, MdSchedule, MdVpnKey, MdAccountBalanceWallet, MdNoteAdd,
  MdSearch, MdStars, MdWorkspacePremium, MdForum,
} from 'react-icons/md';

import { useAppDispatch } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { AppTheme } from '../../../../styles/theme';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import { useInfiniteScroll } from '../../../../hooks/useInfiniteScroll';
import { ValidationErrorSummary } from '../../../../components/common/ValidationErrorSummary';
import StatCard from '../../../../components/masters/StatCard';
import {
  fetchDueListDetailed, collectPayment, fetchDefaultAmount, DueListDetailRow,
  fetchCustomerDueGrid,
} from '../../../../services/paymentService';
import { fetchAllCustomerDetails } from '../../../../services/customerDetailsService';
import { FetchBuildingList } from '../../../../services/buildingService';
import { FetchEmployeeDetails, Employee } from '../../../../services/employeeDetailsService';
import { tasksService, Task } from '../../../../services/tasksService';
import { Customer, PaymentFor, CollectPaymentPayload, Building } from '../../../../types/index';
import { useRoleBasePath } from '../../../../hooks/useRoleBasePath';
import { formatDate } from '../../../../utils';
import { serverTodayYmd, serverYmdPlusDays } from '../../../../utils/serverTime';
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

// ── Status filter dropdown — custom (not a native <select>) because native
// <option> elements can't take a rounded, colored background in any
// browser. Each status option renders as a pill in its fixed STATUS_COLORS
// color (Overdue dark red, Due Today green, Upcoming yellow); "All Status" stays
// neutral. Portaled for the same toolbar-clipping reason as SearchableSelect.
const STATUS_FILTER_OPTIONS: { value: DueStatusFilter; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'due_today', label: 'Due Today' },
  { value: 'upcoming', label: 'Upcoming' },
];

const StatusPillSelect: React.FC<{
  t: Theme; value: DueStatusFilter; onChange: (v: DueStatusFilter) => void;
}> = ({ t, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);

  const place = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setMenuPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 140) });
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (ref.current?.contains(target) || target.closest?.('[data-due-status-menu]')) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  const current = STATUS_FILTER_OPTIONS.find((o) => o.value === value) ?? STATUS_FILTER_OPTIONS[0];
  const pillStyle = (v: DueStatusFilter): React.CSSProperties => v === 'all'
    ? { background: 'transparent', color: t.inputText }
    : { background: STATUS_COLORS[v], color: STATUS_TEXT_COLORS[v], fontWeight: 700 };

  return (
    <>
      <button ref={ref} type="button" aria-haspopup="listbox" aria-expanded={open}
        onClick={() => { if (open) { setOpen(false); } else { place(); setOpen(true); } }}
        className="flex items-center justify-between gap-1"
        style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 10, padding: '5px 8px', fontSize: 12, cursor: 'pointer', outline: 'none', minHeight: 36 }}>
        <span style={{ ...pillStyle(current.value), borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap' }}>{current.label}</span>
        <MdKeyboardArrowDown size={16} style={{ color: t.textSecondary, flexShrink: 0 }} />
      </button>
      {open && menuPos && createPortal(
        <div data-due-status-menu role="listbox"
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: menuPos.width, zIndex: 200, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {STATUS_FILTER_OPTIONS.map((o) => (
            <button key={o.value} type="button" role="option" aria-selected={o.value === value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className="w-full text-left"
              style={{
                ...pillStyle(o.value), border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer', fontFamily: t.fontFamily,
                outline: o.value === value ? `2px solid ${o.value === 'all' ? t.inputBorder : STATUS_COLORS[o.value]}` : 'none', outlineOffset: 1,
              }}>
              {o.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
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
// V_23.0 — "Monthly Installment" split into "EMI Before"/"EMI After" to
// mirror the Booster Before/After pair. Both cosmetic options submit the
// SAME underlying value (EMIAmount) to collectPayment: the backend's
// due-list already computes/labels installments as "EMI Before"/"EMI
// After" depending on where they fall in the customer's schedule
// (payment.service.ts's getDueListDetailed), but collectPayment itself
// has no before/after concept — it just settles whichever EMI
// installment is next due regardless of which label was picked here.
const PAYMENT_FOR_UI_OPTIONS: PaymentForUiOption[] = [
  { key: 'emi_before', label: 'EMI Before', value: 'EMIAmount' },
  { key: 'emi_after', label: 'EMI After', value: 'EMIAmount' },
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
// badge — same convention PaymentUpcomingPage uses. EMIAmount's own label
// here is only a fallback; EMI rows are actually labeled "EMI Before"/
// "EMI After" via getPaymentForDisplay() below, using the SAME color for
// both phases so they read as one grouped category (per explicit request),
// distinguished only by their text label.
//
// EMIAmount's color is a fixed hex, deliberately NOT var(--brand-ink) —
// that reads the active Appearance theme's accent, so switching themes
// changed the EMI Before/After badge's color while every other category
// here stayed fixed. Every category badge on this page is a plain fixed
// color now, matching the other four.
const PAYMENT_FOR_KEY_META: Record<PaymentFor, { label: string; color: string; icon: IconType }> = {
  EMIAmount: { label: 'EMI Before', color: '#2563eb', icon: MdPayments },
  BookingAmount: { label: 'Booking Amount', color: '#dc2626', icon: MdReceiptLong },
  PayAfterbooking: { label: 'Remaining Booking Amount', color: '#ea580c', icon: MdSchedule },
  PossessionAmount: { label: 'Possession Amount', color: '#7c3aed', icon: MdVpnKey },
  AnnualAmount: { label: 'Booster Before Possession', color: '#16a34a', icon: MdStars },
  AnnualAmount1: { label: 'Booster After Possession', color: '#0d9488', icon: MdWorkspacePremium },
};
const PAYMENT_FOR_KEY_ORDER: Exclude<PaymentFor, 'EMIAmount'>[] = ['BookingAmount', 'PayAfterbooking', 'PossessionAmount', 'AnnualAmount', 'AnnualAmount1'];

// A row's displayed Payment-For label/color — EMI rows show "EMI Before"/
// "EMI After" (from the backend's own payment_for label) instead of the
// generic EMIAmount fallback, while keeping the SAME color for both so the
// pair reads as one grouped/background treatment.
const getPaymentForDisplay = (r: { payment_for_key: PaymentFor; payment_for: string }): { label: string; color: string } => {
  if (r.payment_for_key === 'EMIAmount') {
    return { label: r.payment_for === 'EMI After' ? 'EMI After' : 'EMI Before', color: PAYMENT_FOR_KEY_META.EMIAmount.color };
  }
  return { label: PAYMENT_FOR_KEY_META[r.payment_for_key].label, color: PAYMENT_FOR_KEY_META[r.payment_for_key].color };
};

// Category filter (top stat boxes' click-to-filter) needs to distinguish
// EMI's two phases even though they share one payment_for_key.
type CategoryFilterKey = Exclude<PaymentFor, 'EMIAmount'> | 'EMI Before' | 'EMI After';
const matchesCategoryFilter = (r: { payment_for_key: PaymentFor; payment_for: string }, key: CategoryFilterKey): boolean =>
  key === 'EMI Before' || key === 'EMI After' ? (r.payment_for_key === 'EMIAmount' && getPaymentForDisplay(r).label === key) : r.payment_for_key === key;

type DueStatusFilter = 'all' | 'overdue' | 'due_today' | 'upcoming';

// Single source of truth for the 3 status colors used everywhere on this
// page — the Payment Details column's badges (both the payment-type pill
// AND the status pill, which must always match/be driven by status, not
// payment-type) and the "All Status" filter dropdown's option pills. Plain
// hex literals, not derived from the theme/appearance object `t`, so they
// never change on theme/appearance switches (by design, per requirement).
const STATUS_COLORS: Record<'overdue' | 'due_today' | 'upcoming', string> = {
  overdue: '#991b1b',   // Dark red
  due_today: '#16a34a', // Green
  upcoming: '#FFFF00',  // Yellow
};
// Text drawn on each status color — dark on the bright yellow (white would
// be unreadable there), white on the others.
const STATUS_TEXT_COLORS: Record<'overdue' | 'due_today' | 'upcoming', string> = {
  overdue: '#fff',
  due_today: '#fff',
  upcoming: '#1f2937',
};

// Follow-up History: entries grouped under the day they were logged
// (dd/mm/yyyy), oldest day first and oldest entry first within a day —
// read top to bottom like a chat log.
const groupByDay = (tasks: Task[]): [string, Task[]][] => {
  const groups = new Map<string, Task[]>();
  for (const task of tasks) {
    const day = formatDate(task.created_at);
    const list = groups.get(day);
    if (list) list.push(task); else groups.set(day, [task]);
  }
  return Array.from(groups.entries());
};
const formatTime = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

// Rows rendered per lazy-load batch (initial view and each scroll step).
const DUE_BATCH_SIZE = 100;

// ── Row shape the table renders, built from a DueListDetailRow (overdue,
// due today, or upcoming within its early-visibility window). ────────────
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
  statusLabel: string; statusColor: string; statusTextColor: string;
  detailText: string;
  dueRow?: DueListDetailRow;
}

const DueReportPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isDark, t, cssVars } = useAppearanceTokens();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const buildingNames = useMemo(() => Array.from(new Set(buildings.filter((b) => b.is_active).map((b) => b.building_name))), [buildings]);

  // Declared up here (rather than down with the rest of the Add Payment
  // Details state below) because V_23.0 item 6 makes this ALSO drive a
  // table filter (see filteredDueRows/anyFilterApplied/clearAllFilters,
  // all of which are declared before the Add Payment block) — selecting a
  // customer in the Add Payment form narrows the table to that customer.
  const [apCustomerSearch, setApCustomerSearch] = useState('');
  const [apCustomerId, setApCustomerId] = useState<string | null>(null);

  const [dueRows, setDueRows] = useState<DueListDetailRow[]>([]);
  const [loadingDueList, setLoadingDueList] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  // ── Follow-up — ONE open follow-up per customer (note + date + assignee,
  // backed by the Task entity's customer_id). It applies to every due row of
  // that customer: scheduling it from the "EMI Before" row also shows it on
  // the same customer's "Booking Amount" row. Opening the popup for a
  // customer who already has one edits (reschedules) that follow-up instead
  // of adding a second one — previously a reschedule created a new task
  // while the row kept showing the older, sooner one, so the date looked
  // like it never changed.
  interface FollowUpTarget { customer_id: number | string; customer_name: string; customer_code: string }
  const [followUpEmployees, setFollowUpEmployees] = useState<Employee[]>([]);
  const [followUpRow, setFollowUpRow] = useState<FollowUpTarget | null>(null);
  const [followUpEditing, setFollowUpEditing] = useState<Task | null>(null);
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpAssignedTo, setFollowUpAssignedTo] = useState('');
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);
  const [followUpListOpen, setFollowUpListOpen] = useState(false);


  const [pendingFollowUps, setPendingFollowUps] = useState<Task[]>([]);

  const fetchFollowUpCounts = useCallback(async () => {
    try {
      setPendingFollowUps(await tasksService.fetchTasks({ status: 'pending' }));
    } catch { /* list/badge just keep their last known state if this fails */ }
  }, []);

  // Soonest still-open follow-up per customer — what each row displays.
  const followUpByCustomer = useMemo(() => {
    const map = new Map<string, Task>();
    for (const task of pendingFollowUps) {
      if (task.customer_id == null) continue;
      const key = String(task.customer_id);
      const existing = map.get(key);
      // No due date sorts last: a dated follow-up is the more useful one
      // to surface when a customer has several open.
      if (!existing || (task.due_date ?? '9999') < (existing.due_date ?? '9999')) map.set(key, task);
    }
    return map;
  }, [pendingFollowUps]);

  // "Take Follow Ups" list — every customer's open follow-up, soonest first,
  // whatever date it's on (not just today/tomorrow).
  const followUpListTasks = useMemo(
    () => Array.from(followUpByCustomer.values()).sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')),
    [followUpByCustomer]
  );

  useEffect(() => { fetchFollowUpCounts(); }, [fetchFollowUpCounts]);

  const openFollowUp = (target: FollowUpTarget) => {
    const existing = followUpByCustomer.get(String(target.customer_id)) ?? null;
    setFollowUpRow(target);
    setFollowUpEditing(existing);
    // Each save is a new conversation entry in the history, so the note
    // starts empty; the previous note is shown above the field instead.
    setFollowUpNote('');
    setFollowUpDate(existing?.due_date ? existing.due_date.slice(0, 10) : serverYmdPlusDays(1));
    setFollowUpAssignedTo(existing?.assigned_to != null ? String(existing.assigned_to) : '');
  };
  const closeFollowUp = () => { setFollowUpRow(null); setFollowUpEditing(null); };

  const handleSubmitFollowUp = async () => {
    if (!followUpRow) return;
    if (!followUpDate) { toast.error('Please select a follow-up date.'); return; }
    setFollowUpSubmitting(true);
    try {
      const title = `Follow-up: ${followUpRow.customer_name}`;
      const description = followUpNote.trim() || null;
      // Only an admin picks the assignee; the server assigns an employee's
      // own follow-ups to themselves.
      const assignee = isAdmin ? { assigned_to: followUpAssignedTo || null } : {};
      let keptId: string | number;
      // Always a NEW entry (never an in-place edit), so every conversation
      // stays in the Follow-up History with its own date and note. Admin
      // keeps the previous assignee unless they picked another.
      const created = await tasksService.createTask({ title, description, due_date: followUpDate, customer_id: followUpRow.customer_id, ...assignee });
      keptId = created.id;
      // The customer's previous open follow-up(s) are marked Replaced so
      // only the date just set shows as open; they stay in the history.
      const stale = pendingFollowUps.filter((tk) => String(tk.customer_id) === String(followUpRow.customer_id) && String(tk.id) !== String(keptId));
      await Promise.all(stale.map((tk) => tasksService.updateTask(tk.id, {
        title: tk.title, description: tk.description, due_date: tk.due_date, status: 'superseded',
      })));
      toast.success(followUpEditing ? 'Follow-up updated.' : 'Follow-up scheduled.');
      closeFollowUp();
      fetchFollowUpCounts();
    } catch {
      toast.error('Failed to save the follow-up.');
    } finally {
      setFollowUpSubmitting(false);
    }
  };

  // ── Follow-up history — every follow-up ever logged for one customer
  // (open, done and replaced), grouped date-wise, oldest first, as a
  // conversation-style log.
  const [historyTarget, setHistoryTarget] = useState<FollowUpTarget | null>(null);
  const [historyTasks, setHistoryTasks] = useState<Task[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const openFollowUpHistory = async (target: FollowUpTarget) => {
    setHistoryTarget(target);
    setHistoryTasks([]);
    setHistoryLoading(true);
    try {
      const tasks = await tasksService.fetchTasks({ customer_id: target.customer_id });
      setHistoryTasks([...tasks].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))));
    } catch {
      toast.error('Failed to load follow-up history.');
    } finally {
      setHistoryLoading(false);
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

  // ── Toolbar filters — Building + Employee, all narrowing the same flat
  // due-item list, in that left-to-right order. The separate "Select
  // Payment For" dropdown that used to sit here was removed (V_23.0):
  // Payment For is already filterable via the stat-box click-to-filter
  // above, and this dropdown duplicated that with a different UI. ────────
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  // ── New (V_22.0): global search across every field, and a Status filter
  // (All / Overdue / Due Today / Upcoming). Category-box click-to-filter
  // (below) is a separate, ANDed narrowing on top of all of these. ────────
  const [globalSearch, setGlobalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DueStatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterKey | null>(null);
  const toggleCategoryFilter = (key: CategoryFilterKey) => setCategoryFilter((prev) => (prev === key ? null : key));

  // Item 8 (V_23.0) — this toolbar had no Clear/Reset Filters control at
  // all; every filter here is plain client-side state narrowing the same
  // already-fetched list (see filteredDueRows below), so resetting them is
  // just resetting this state, same pattern as CustomerDetailsListPage's
  // clearAllFilters/anyFilterApplied.
  //
  // Deliberately does NOT include apCustomerId/apCustomerSearch (the Add
  // Payment form's own customer picker) — an earlier version folded that
  // in here, which meant the lower toolbar's X button and the upper form's
  // own Reset button each cleared BOTH halves of the page, so picking a
  // customer to log a payment for could silently reset an unrelated table
  // filter the admin had set, or vice versa. The two are independent state
  // now: this X only ever touches the four visible toolbar filters (Search
  // Across All Data / Employee / Building / Status) plus the stat-box
  // category filter (not a form field, not one of "those four", but not
  // part of the Add Payment form either); handleResetAddPaymentForm below
  // only ever touches the form.
  const anyFilterApplied =
    !!filterBuilding || !!filterEmployee || !!globalSearch || statusFilter !== 'all' || !!categoryFilter;
  const clearAllFilters = () => {
    setFilterBuilding(''); setFilterEmployee('');
    setGlobalSearch(''); setStatusFilter('all'); setCategoryFilter(null);
  };

  // ── One display shape for every row. The backend decides what shows and
  // its status: overdue, due today, or 'upcoming' — not due yet but inside
  // its early window (EMI 3 days before; Remaining Booking, Possession and
  // Boosters 1 month before; Booking Amount from the day it was added). ──
  const STATUS_LABEL: Record<DueListDetailRow['due_category'], string> = {
    overdue: 'Overdue', due_today: 'Due Today', upcoming: 'Upcoming',
  };
  const dueDisplayRows: DisplayRow[] = useMemo(() => dueRows.map((r, i) => ({
    key: `due-${r.customer_id}-${r.payment_for}-${r.due_category}-${i}`,
    customer_id: r.customer_id, customer_code: r.customer_code, customer_name: r.customer_name,
    email: r.email, mobile_number: r.mobile_number,
    assigned_employee_name: r.assigned_employee_name, assigned_employee_code: r.assigned_employee_code,
    company_name: r.company_name, project_name: r.project_name, location: r.location,
    building_name: r.building_name, wing_name: r.wing_name, flat_no: r.flat_no,
    payment_for: r.payment_for, payment_for_key: r.payment_for_key,
    amount: r.amount,
    months_pending: r.months_pending,
    per_month_amount: r.per_month_amount,
    statusLabel: STATUS_LABEL[r.due_category],
    statusColor: STATUS_COLORS[r.due_category],
    statusTextColor: STATUS_TEXT_COLORS[r.due_category],
    // due_date_from/to come pre-formatted (DD/MM/YYYY) from the backend.
    // A range only when several installments are pending; a single due
    // (from === to) shows its one due date instead of the same date twice.
    detailText: r.due_date_from === r.due_date_to
      ? `(Due date: ${r.due_date_from})`
      : `(from: ${r.due_date_from}, to: ${r.due_date_to})`,
    dueRow: r,
  })), [dueRows]);

  const baseDisplayRows: DisplayRow[] = useMemo(
    () => (statusFilter === 'all' ? dueDisplayRows : dueDisplayRows.filter((r) => r.dueRow?.due_category === statusFilter)),
    [statusFilter, dueDisplayRows]
  );

  const filteredDueRows = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    return baseDisplayRows.filter((r) => {
      // V_23.0 item 6 — selecting a customer in the Add Payment form below
      // also narrows this table to that customer's own dues.
      if (apCustomerId && String(r.customer_id) !== apCustomerId) return false;
      if (filterBuilding && r.building_name !== filterBuilding) return false;
      if (filterEmployee && r.assigned_employee_name !== filterEmployee) return false;
      if (categoryFilter && !matchesCategoryFilter(r, categoryFilter)) return false;
      if (q && ![
        r.customer_code, r.customer_name, r.email, r.mobile_number,
        r.assigned_employee_name, r.assigned_employee_code,
        r.company_name, r.project_name, r.location,
        r.building_name, r.wing_name, r.flat_no, r.payment_for,
      ].some((v) => (v || '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [baseDisplayRows, apCustomerId, filterBuilding, filterEmployee, categoryFilter, globalSearch]);

  // ── Stat boxes — sums across the (unfiltered) full due-item list, one
  // per payment-for category, plus a grand Total. Always reflect current
  // Due/Overdue amounts regardless of the Status filter above — the boxes
  // are the page's own headline numbers, not a view of whatever the table
  // happens to be showing. EMIAmount rows are split into "EMI Before"/"EMI
  // After" sums (V_23.0) rather than one combined EMI sum — any EMI row
  // not literally labeled "EMI After" is counted as "EMI Before", which
  // also safely covers any row using the older unphased label. ───────────
  const boxSums = useMemo(() => {
    const sums: Record<Exclude<PaymentFor, 'EMIAmount'>, number> = { BookingAmount: 0, PayAfterbooking: 0, PossessionAmount: 0, AnnualAmount: 0, AnnualAmount1: 0 };
    let emiBefore = 0;
    let emiAfter = 0;
    for (const r of dueRows) {
      if (r.payment_for_key === 'EMIAmount') {
        if (r.payment_for === 'EMI After') emiAfter += r.amount; else emiBefore += r.amount;
      } else {
        sums[r.payment_for_key] += r.amount;
      }
    }
    const total = emiBefore + emiAfter + Object.values(sums).reduce((s, v) => s + v, 0);
    return { ...sums, emiBefore, emiAfter, total };
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

  // ── Lazy rendering over the filtered due-item list — no pagination.
  // The table shows the first 100 rows; scrolling near the bottom renders
  // the next 100 (see useInfiniteScroll), so a long list never renders all
  // at once. Any filter/search change starts again from the top 100. ─────
  const [visibleCount, setVisibleCount] = useState(DUE_BATCH_SIZE);
  useEffect(() => { setVisibleCount(DUE_BATCH_SIZE); }, [apCustomerId, filterBuilding, filterEmployee, statusFilter, categoryFilter, globalSearch]);
  const pagedDueRows = useMemo(() => filteredDueRows.slice(0, Math.min(visibleCount, filteredDueRows.length)), [filteredDueRows, visibleCount]);
  const hasMoreRows = pagedDueRows.length < filteredDueRows.length;
  const loadNextBatch = useCallback(() => {
    setVisibleCount((v) => Math.min(filteredDueRows.length, v + DUE_BATCH_SIZE));
  }, [filteredDueRows.length]);
  const lazyLoadSentinelRef = useInfiniteScroll({
    hasMore: hasMoreRows, loading: false, onLoadMore: loadNextBatch, itemCount: pagedDueRows.length,
  });

  // ── Add Payment Details ──────────────────────────────────────────────
  // (apCustomerSearch/apCustomerId are declared earlier — see the comment
  // by their declaration above.)
  // Receipt Date (payment_date) is admin-only — item 9.
  const { isAdmin } = useRoleBasePath();
  const [apInstDate, setApInstDate] = useState('');
  const [apPaymentDate, setApPaymentDate] = useState('');
  const [apPaymentForKey, setApPaymentForKey] = useState('');
  const [apAmount, setApAmount] = useState('');
  const [apModeOfPayment, setApModeOfPayment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [apSuggestLoading, setApSuggestLoading] = useState(false);

  const apSelectedCustomer = useMemo(() => customers.find((c) => c.id === apCustomerId) ?? null, [customers, apCustomerId]);
  const apSelectedPaymentFor = useMemo(() => PAYMENT_FOR_UI_OPTIONS.find((o) => o.key === apPaymentForKey) ?? null, [apPaymentForKey]);
  // Every field after Customer Name stays disabled until a customer is picked.
  const formLocked = !apCustomerId;

  // V_23.0 — the disabled Payment Date field now pre-fills from the
  // customer's own saved installment date (customers.installment_date,
  // mapped to monthly_installment_date on the frontend Customer type — see
  // customerDetailsService.ts's mapCustomerRow) the moment a customer is
  // picked, before Payment For is even chosen. No extra fetch: `customers`
  // already carries this field from the same list the picker's own options
  // came from. Only runs while no Payment For is selected yet — once one
  // is, handlePaymentForChange's own fetchDefaultAmount lookup takes over
  // (a type-specific suggested date, not just the customer's default).
  useEffect(() => {
    if (apPaymentForKey) return;
    // .slice(0, 10): the backend column is a DATETIME, so this can arrive
    // as a full ISO timestamp (e.g. "2026-09-15T00:00:00.000Z") — an
    // <input type="date"> only accepts the bare YYYY-MM-DD portion, which
    // this also happens to already be a no-op on if the value came back
    // pre-trimmed.
    setApInstDate(apSelectedCustomer?.monthly_installment_date?.slice(0, 10) || '');
  }, [apSelectedCustomer, apPaymentForKey]);

  const handleCustomerSearchChange = (v: string) => {
    setApCustomerSearch(v);
    const exact = customers.find((c) => `${c.customer_name}${c.customer_code ? ` (${c.customer_code})` : ''}` === v);
    setApCustomerId(exact ? exact.id : null);
    // Customer cleared/changed to no match: everything below it goes back to
    // empty (and disabled) rather than keeping the previous customer's values.
    if (!exact) {
      setApPaymentForKey(''); setApAmount(''); setApInstDate(''); setApPaymentDate(''); setApModeOfPayment('');
    }
  };

  // ── Item 12 — a payment type that is already fully paid for the selected
  // customer is shown DISABLED with an "Already Paid" note rather than
  // dropped from the list, so it stays visible that the type exists and has
  // been completed. Derived from the customer's own due grid (one call, the
  // same GET /payments/customer/:id/due-grid the Scheme page already uses)
  // instead of six per-option fetchDefaultAmount round trips.
  //
  // A type counts as complete ONLY when the grid actually contains rows for
  // it and none of them still owes anything. Zero matching rows means the
  // grid cannot answer the question (booster rows carry payment_for: null —
  // they are not individually collectible), so the option is left enabled:
  // never disable a control on the strength of missing data.
  const [apPaidPaymentFors, setApPaidPaymentFors] = useState<Set<PaymentFor>>(new Set());
  useEffect(() => {
    if (!apCustomerId) { setApPaidPaymentFors(new Set()); return; }
    let cancelled = false;
    (async () => {
      try {
        const grid = await fetchCustomerDueGrid(apCustomerId);
        if (cancelled) return;
        const owedBy = new Map<PaymentFor, { total: number; owed: number }>();
        for (const row of grid.rows) {
          if (!row.payment_for) continue;
          const acc = owedBy.get(row.payment_for) ?? { total: 0, owed: 0 };
          acc.total += 1;
          if (row.due_amount > 0) acc.owed += 1;
          owedBy.set(row.payment_for, acc);
        }
        const complete = new Set<PaymentFor>();
        owedBy.forEach((acc, key) => { if (acc.total > 0 && acc.owed === 0) complete.add(key); });
        setApPaidPaymentFors(complete);
        // Switching to a different customer can make an ALREADY-selected
        // type complete for that customer. Clear it rather than leaving a
        // disabled option sitting selected (which submits fine in HTML and
        // would only be caught by the server's own over-payment check).
        setApPaymentForKey((current) => {
          const opt = PAYMENT_FOR_UI_OPTIONS.find((o) => o.key === current);
          if (opt && !opt.isAdvance && complete.has(opt.value)) { setApAmount(''); return ''; }
          return current;
        });
      } catch {
        // A convenience only — on failure every option stays selectable,
        // exactly as before this existed. The server still rejects a
        // genuinely over-paid collection.
        if (!cancelled) setApPaidPaymentFors(new Set());
      }
    })();
    return () => { cancelled = true; };
  }, [apCustomerId]);

  // Extra Pay is an advance against FUTURE EMIs — it is never "completed",
  // so it is never disabled even when every scheduled EMI is settled.
  const isPaymentForCompleted = (opt: PaymentForUiOption): boolean =>
    !opt.isAdvance && apPaidPaymentFors.has(opt.value);

  const handlePaymentForChange = async (key: string) => {
    setApPaymentForKey(key);
    setApAmount('');
    const opt = PAYMENT_FOR_UI_OPTIONS.find((o) => o.key === key);
    // V_23.0 item 8.8 — clear the date for EVERY change of Payment For, not
    // only when switching to Extra Pay (which has no installment date at
    // all; see the field's own comment below). The date belongs to the
    // previously-selected type, and the re-fetch below only overwrites it
    // when the new type actually has a suggested date — so if that lookup
    // returns nothing (or fails), the old type's date was being left in the
    // field and submitted as this payment's inst_date.
    setApInstDate('');
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

  // V_23.0 — the form's own Reset button clears ONLY this form's fields
  // (resetAddPaymentForm, also reused after a successful submit) — it no
  // longer also clears the lower toolbar's filters. Selecting a customer
  // here does narrow the table (see filteredDueRows below), and Reset
  // clearing apCustomerId undoes that same narrowing, but nothing else on
  // the toolbar (Search/Employee/Building/Status/category) is touched.
  const handleResetAddPaymentForm = resetAddPaymentForm;

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
        // Non-admins never see the Receipt Date control, so nothing is
        // sent for them; the server stamps "now" either way.
        payment_date: (isAdmin && apPaymentDate) ? apPaymentDate : undefined,
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

  // EMI Before/After lead the row, sharing PAYMENT_FOR_KEY_META.EMIAmount's
  // color so the pair reads as one grouped/background treatment (V_23.0).
  const statBoxSpecs: (StatBoxSpec & { key: CategoryFilterKey | 'total' })[] = [
    { key: 'EMI Before' as const, label: 'EMI Before', value: boxSums.emiBefore, color: PAYMENT_FOR_KEY_META.EMIAmount.color, icon: MdPayments },
    { key: 'EMI After' as const, label: 'EMI After', value: boxSums.emiAfter, color: PAYMENT_FOR_KEY_META.EMIAmount.color, icon: MdPayments },
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
          </div>
      </div>

      {/* ── Stat boxes — every Payment For category plus a grand Total,
          always one row on desktop, same saturated-gradient StatCard used
          site-wide (Building Master etc). Each category box doubles as a
          click-to-filter on the table below (same convention Payment
          Upcoming's own boxes use) — click again, or click Total, to
          clear it. ────────────────────────────────────────────────────── */}
      <div className="due-report-stat-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 mb-5">
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
          {/* Field sequence: Customer Name, combined Building/Wing/Flat,
              Payment For, the type's own dynamic amount field, Payment Date,
              Received Date, Mode of Payment. */}
          <div className="due-report-form-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            <div ref={setFieldRef('customer')}>
              <label style={fieldLabelStyle}>Customer Name</label>
              {/* Selecting a customer here also filters the table below to
                  that customer's own dues (see filteredDueRows) — Reset
                  clears both. */}
              <SearchableSelect t={t} placeholder="Select or type customer name" options={customerOptions} value={apCustomerSearch} onChange={handleCustomerSearchChange} />
              {errorFor('customer') && <p style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4 }}>{errorFor('customer')}</p>}
            </div>
            {/* V_23.0 item 6 — Building/Wing/Flat combined into ONE
                auto-populated field (was 3 separate read-only inputs).
                Company (a derived, read-only display field, never actually
                editable) stays removed from this form; it's still visible
                on the customer's own record. */}
            {/* Always ONE line: on wide screens this field takes exactly
                its text's width and the other fields share what's left
                (see .due-report-bwf in DueReport.css); the full text is
                also in the tooltip. */}
            <div className="due-report-bwf">
              <label style={fieldLabelStyle}>Building / Wing / Flat</label>
              {(() => {
                const buildingText = apSelectedCustomer ? [
                  apSelectedCustomer.building_name,
                  apSelectedCustomer.wing_name ? `${apSelectedCustomer.wing_name} Wing` : '',
                  apSelectedCustomer.flat_no ? `Flat ${apSelectedCustomer.flat_no}` : '',
                ].filter(Boolean).join(' - ') : '';
                return (
                  <div aria-disabled="true" title={buildingText || undefined}
                    style={{ ...readOnlyInputStyle, minHeight: 38, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>
                    {buildingText || '—'}
                  </div>
                );
              })()}
            </div>
            <div ref={setFieldRef('payment_for')}>
              <label style={fieldLabelStyle}>Payment For</label>
              <select value={apPaymentForKey} disabled={formLocked} onChange={(e) => handlePaymentForChange(e.target.value)} style={formLocked ? readOnlyInputStyle : fieldInputStyle(!!errorFor('payment_for'))}>
                <option value="">-- Select --</option>
                {PAYMENT_FOR_UI_OPTIONS.map((o) => {
                  const done = isPaymentForCompleted(o);
                  return <option key={o.key} value={o.key} disabled={done}>{o.label}{done ? ' — Already Paid' : ''}</option>;
                })}
              </select>
              {errorFor('payment_for') && <p style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4 }}>{errorFor('payment_for')}</p>}
            </div>
            {apSelectedPaymentFor && (
              <div ref={setFieldRef('amount')}>
                <label style={fieldLabelStyle}>{apSelectedPaymentFor.label} (₹){apSuggestLoading ? ' (suggesting...)' : ''}</label>
                <input type="text" inputMode="numeric" disabled={formLocked} value={formatAmountDisplay(apAmount)} onChange={(e) => setApAmount(e.target.value.replace(/[^\d]/g, ''))} placeholder="Enter amount"
                  style={fieldInputStyle(!!errorFor('amount'))} />
                {errorFor('amount') && <p style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4 }}>{errorFor('amount')}</p>}
              </div>
            )}
            {/* Extra Pay is an advance against future EMIs, not tied to any
                one installment — it has no Payment Date at all (takes
                today's date via Received Date instead), so the field is
                hidden rather than shown blank/disabled. */}
            {!apSelectedPaymentFor?.isAdvance && (
              <div>
                <label style={fieldLabelStyle}>Payment Date</label>
                {/* Read-only — auto-filled from the suggested default date
                    for the selected Payment For. Not employee-editable. */}
                <input type="date" readOnly value={apInstDate} style={readOnlyInputStyle} />
              </div>
            )}
            {/* V_23.0 item 6 — Received Date permissions: Employee can only
                ever be today (read-only, matching the server's own rule —
                see finalPaymentDate in payment.service.ts, which has
                always stamped "now" for a non-admin regardless of any
                value sent). Admin gets a real, unrestricted date input —
                no min/max — so a backdated entry (a previous date) is
                selectable, which is the whole point for Admin. A future date
                is never allowed (max = the server's today; the backend
                rejects it too). */}
            <div>
              <label style={fieldLabelStyle}>Received Date</label>
              {isAdmin ? (
                <input type="date" value={apPaymentDate} max={serverTodayYmd()} disabled={formLocked} onChange={(e) => setApPaymentDate(e.target.value)} style={formLocked ? readOnlyInputStyle : fieldInputStyle()} />
              ) : (
                <input type="date" readOnly value={serverTodayYmd()} style={readOnlyInputStyle} title="Employees can only record today's date." />
              )}
            </div>
            <div ref={setFieldRef('mode_of_payment')}>
              <label style={fieldLabelStyle}>Mode of Payment</label>
              <select value={apModeOfPayment} disabled={formLocked} onChange={(e) => setApModeOfPayment(e.target.value)} style={formLocked ? readOnlyInputStyle : fieldInputStyle(!!errorFor('mode_of_payment'))}>
                <option value="">--Select Payment Method--</option>
                {MODE_OF_PAYMENT_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              {errorFor('mode_of_payment') && <p style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4 }}>{errorFor('mode_of_payment')}</p>}
            </div>
            {/* V_23.0 item 6 — OK renamed to Submit; a new Reset button
                clears every field/dropdown/date in this form AND the
                table's own toolbar filters (including the customer filter
                above), then shows every due again. */}
            <div className="due-report-form-actions flex items-end gap-2">
              <button type="button" onClick={handleSubmitAddPayment} disabled={submitting || formLocked}
                className="flex-1 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: (submitting || formLocked) ? '#6b7280' : 'var(--brand-gradient)', border: 'none', cursor: (submitting || formLocked) ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
              <button type="button" onClick={handleResetAddPaymentForm} disabled={submitting}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: t.insetBg, color: t.textPrimary, border: `1px solid ${t.inputBorder}`, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar — Building + Employee + global search + Status filters
          (Payment For is filtered via the stat boxes above instead — see
          item 8.3), follow-up badge, Export CSV and Refresh all in a
          single row. Filter widths are kept narrow (and the follow-up
          badge/export button compact) so the whole row fits typical
          laptop/sidebar widths without a horizontal scrollbar; flex-wrap
          only kicks in as a fallback on very small screens instead of
          clipping/hiding anything. ── */}
      <div className="due-report-toolbar rounded-2xl mb-5 p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="due-report-toolbar-row flex items-center flex-wrap" style={{ gap: 10 }}>
          <div className="due-report-toolbar-filters flex items-center flex-wrap gap-2" style={{ minWidth: 0 }}>
            {/* V_23.0 item 3 — reordered to: Search Across All Data, Search
                by Employee Name, Search by Building Name, All Status.
                (The "Select Payment For" dropdown that used to sit here was
                removed in an earlier pass: it duplicated the stat boxes'
                click-to-filter above with a different control.) */}
            <div className="due-report-filter-item due-report-global-search relative" style={{ width: 160, flexShrink: 0 }}>
              <MdSearch size={15} style={{ position: 'absolute', left: 10, top: 11, color: t.textSecondary, pointerEvents: 'none' }} />
              <input type="text" placeholder="Search across all data..." value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)}
                style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 10px 9px 30px', fontSize: 12, outline: 'none' }} />
            </div>
            <div className="due-report-filter-item" style={{ width: 140, flexShrink: 0 }}>
              <SearchableSelect t={t} placeholder="Search by Employee Name" options={employeeNameOptions} value={filterEmployee} onChange={setFilterEmployee} />
            </div>
            <div className="due-report-filter-item" style={{ width: 140, flexShrink: 0 }}>
              <SearchableSelect t={t} placeholder="Search by Building Name" options={buildingNames} value={filterBuilding} onChange={setFilterBuilding} />
            </div>
            <div className="due-report-filter-item" style={{ width: 120, flexShrink: 0 }}>
              <StatusPillSelect t={t} value={statusFilter} onChange={setStatusFilter} />
            </div>
            {anyFilterApplied && (
              <button
                type="button" onClick={clearAllFilters} title="Reset Filters" aria-label="Reset Filters"
                className="flex items-center justify-center rounded-full"
                style={{ width: 36, height: 36, background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: 'pointer', flexShrink: 0 }}
              >
                <MdClose size={17} />
              </button>
            )}
          </div>
          <div className="due-report-toolbar-actions flex items-center gap-2" style={{ marginLeft: 'auto', flexShrink: 0 }}>
            {/* In-app-only badge — every open customer follow-up across the
                team; clicking it lists them with their follow-up dates. */}
            <button type="button" title="Take Follow Ups" onClick={() => setFollowUpListOpen(true)}
              className="due-report-followup-badge flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold"
              style={{ background: 'var(--brand-gradient)', border: 'none', color: '#fff', whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
              <MdNoteAdd size={15} style={{ color: '#fff' }} />
              <span className="due-report-followup-badge-text">Take Follow Ups ({followUpListTasks.length})</span>
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
          <table className="due-report-table master-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1150 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                {['Customer Name', 'Company / Project / Location', 'Building Details', 'Contact Details', 'Assigned Employee', 'Payment Details', 'Duration', 'Total Amount', 'Follow Up'].map((h) => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingDueList ? (
                <tr><td colSpan={9} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading payment dues...</td></tr>
              ) : filteredDueRows.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>
                  {baseDisplayRows.length === 0 ? 'No customers currently have a payment due.' : 'No dues match the selected filters.'}
                </td></tr>
              ) : (
                pagedDueRows.map((r) => (
                  <tr key={r.key} className="master-table-row-hover" style={{ borderTop: `1px solid ${t.divider}` }}>
                    <td style={{ padding: '10px 12px', fontSize: 12.5, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>{r.customer_name}</div>
                      <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 1 }}>{r.customer_code}</div>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 11.5, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>{r.company_name || '—'}</div>
                      {(r.project_name || r.location) && (
                        <div className="master-cell-truncate" title={`${r.project_name || ''}${r.project_name && r.location ? ' • ' : ''}${r.location || ''}`}
                          style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 1 }}>
                          {r.project_name || ''}{r.project_name && r.location ? ' • ' : ''}{r.location || ''}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 11.5, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>{r.building_name || '—'}</div>
                      {(r.wing_name || r.flat_no) && (
                        <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 1 }}>
                          {r.wing_name ? `${r.wing_name} Wing` : ''}{r.wing_name && r.flat_no ? ' - ' : ''}{r.flat_no ? `Flat ${r.flat_no}` : ''}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 11.5, color: t.textPrimary }}>
                      <div>{r.email || '—'}</div>
                      <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 1 }}>{r.mobile_number || '—'}</div>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 11.5, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>{r.assigned_employee_name || '—'}</div>
                      {r.assigned_employee_code && (
                        <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 1 }}>{r.assigned_employee_code}</div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      {/* Payment Details: the payment-type badge (in the row's
                          status color) and the EMI/installment amount below. */}
                      <span style={{
                        display: 'inline-block', padding: '3px 9px', borderRadius: 999,
                        fontSize: 10.5, fontWeight: 700, color: r.statusTextColor, background: r.statusColor,
                      }}>
                        {getPaymentForDisplay(r).label}
                      </span>
                      <div style={{ marginTop: 5, fontSize: 11.5, fontWeight: 700, color: t.textPrimary }}>
                        {rupee(r.per_month_amount ?? r.amount)}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      {/* Duration: number of months pending (status-colored
                          pill) and the From/To date range. */}
                      {r.months_pending ? (
                        <span style={{
                          display: 'inline-block', padding: '3px 9px', borderRadius: 999,
                          fontSize: 10.5, fontWeight: 700, color: r.statusTextColor, background: r.statusColor,
                        }}>
                          {r.months_pending} Month{r.months_pending === 1 ? '' : 's'}
                        </span>
                      ) : null}
                      {r.detailText && (
                        <div style={{ fontSize: 10.5, fontWeight: 600, color: r.statusColor === STATUS_COLORS.upcoming ? t.textPrimary : r.statusColor, marginTop: r.months_pending ? 5 : 0, whiteSpace: 'normal', maxWidth: 220 }}>
                          {r.detailText}
                        </div>
                      )}
                      {!r.months_pending && !r.detailText && <span style={{ color: t.textSecondary, fontSize: 11.5 }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12.5, fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                      {/* Item 14 — show the multiplication behind a
                          multi-month amount (e.g. "₹15,000 × 3 =
                          ₹45,000"), falling back to a plain total for a
                          one-time amount with no separate per-month figure. */}
                      {r.months_pending && r.months_pending > 1 && r.per_month_amount != null
                        ? `${rupee(r.per_month_amount)} × ${r.months_pending} = ${rupee(r.amount)}`
                        : rupee(r.amount)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {(() => {
                        const scheduled = followUpByCustomer.get(String(r.customer_id));
                        const target: FollowUpTarget = { customer_id: r.customer_id, customer_name: r.customer_name, customer_code: r.customer_code };
                        const iconBtn: React.CSSProperties = { width: 30, height: 30, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: 'var(--brand-ink)', cursor: 'pointer' };
                        const isPast = !!scheduled?.due_date && scheduled.due_date.slice(0, 10) < serverTodayYmd();
                        return (
                          <div className="flex items-center gap-1.5">
                            <button type="button" onClick={() => openFollowUp(target)}
                              title={scheduled ? 'Change follow-up' : 'Schedule a follow-up'}
                              className="flex items-center justify-center rounded-lg flex-shrink-0" style={iconBtn}>
                              <MdNoteAdd size={16} />
                            </button>
                            <button type="button" onClick={() => openFollowUpHistory(target)} title="Follow-up history"
                              className="flex items-center justify-center rounded-lg flex-shrink-0" style={iconBtn}>
                              <MdForum size={15} />
                            </button>
                            {scheduled?.due_date && (
                              <span style={{ fontSize: 11, fontWeight: 700, color: isPast ? '#dc2626' : 'var(--brand-ink)', whiteSpace: 'nowrap' }}>
                                {formatDate(scheduled.due_date)}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))
              )}
              {/* Invisible sentinel row — scrolling near it renders the next
                  100 rows. Only present while there is more to show. */}
              {hasMoreRows && (
                <tr ref={lazyLoadSentinelRef} aria-hidden="true"><td colSpan={9} style={{ padding: 0, border: 'none' }} /></tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredDueRows.length > 0 && (
          <div className="flex items-center justify-center px-4 py-3" style={{ borderTop: `1px solid ${t.divider}`, fontSize: 12, color: t.textSecondary }}>
            Showing {pagedDueRows.length} of {filteredDueRows.length}{hasMoreRows ? ' — scroll down to load more' : ''}
          </div>
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
                <div style={{ fontSize: 14.5, fontWeight: 800, color: t.textPrimary }}>{followUpEditing ? 'Change Follow-up' : 'Schedule Follow-up'}</div>
                <div style={{ fontSize: 11, color: t.textSecondary }}>{followUpRow.customer_name} · {followUpRow.customer_code}</div>
              </div>
              <button type="button" onClick={closeFollowUp} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary }}>
                <MdClose size={20} />
              </button>
            </div>
            <div className="p-5" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                {followUpEditing?.description && (
                  <div style={{ marginBottom: 10, padding: '8px 10px', borderRadius: 10, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, fontSize: 11.5, color: t.textSecondary }}>
                    <span style={{ fontWeight: 700, color: t.textPrimary }}>Last conversation ({formatDate(followUpEditing.created_at)}):</span>{' '}
                    {followUpEditing.description}
                  </div>
                )}
                <label style={fieldLabelStyle}>Note</label>
                <textarea rows={3} value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="What was discussed with the customer?" style={{ ...fieldInputStyle(), resize: 'vertical' }} />
              </div>
              <div>
                <label style={fieldLabelStyle}>Follow-up Date</label>
                <input type="date" value={followUpDate} min={serverTodayYmd()} onChange={(e) => setFollowUpDate(e.target.value)} style={fieldInputStyle()} />
              </div>
              {/* Only an admin assigns follow-ups; an employee's own are
                  assigned to themselves server-side. */}
              {isAdmin && (
                <div>
                  <label style={fieldLabelStyle}>Assign To</label>
                  <select value={followUpAssignedTo} onChange={(e) => setFollowUpAssignedTo(e.target.value)} style={fieldInputStyle()}>
                    <option value="">-- Unassigned --</option>
                    {followUpEmployees.map((e) => (
                      <option key={e.id} value={e.id}>{[e.first_name, e.last_name].filter(Boolean).join(' ')}</option>
                    ))}
                  </select>
                </div>
              )}
              <button type="button" onClick={handleSubmitFollowUp} disabled={followUpSubmitting}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: followUpSubmitting ? '#6b7280' : '#16a34a', border: 'none', cursor: followUpSubmitting ? 'not-allowed' : 'pointer' }}>
                {followUpSubmitting ? 'Saving...' : followUpEditing ? 'Update Follow-up' : 'Schedule Follow-up'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Follow-up list popup — the badge's own click target: every open
          customer follow-up with the date it's set for, soonest first. ── */}
      {followUpListOpen && createPortal(
        <div className="due-report-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="due-report-modal rounded-2xl w-full" style={{ maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 rounded-t-2xl" style={{ background: 'var(--grad-green)' }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: '#fff' }}>Follow-ups ({followUpListTasks.length})</div>
              <button type="button" onClick={() => setFollowUpListOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>
                <MdClose size={20} />
              </button>
            </div>
            <div style={{ padding: '8px 0', overflowY: 'auto' }}>
              {followUpListTasks.length === 0 ? (
                <p style={{ color: t.textSecondary, fontSize: 12, padding: '16px 20px' }}>No follow-ups scheduled.</p>
              ) : followUpListTasks.map((task) => {
                const isPast = !!task.due_date && task.due_date.slice(0, 10) < serverTodayYmd();
                return (
                  <div key={task.id} style={{ padding: '10px 20px', borderBottom: `1px solid ${t.divider}` }}>
                    <div className="flex items-center justify-between gap-3">
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textPrimary }}>{task.customer_name || task.title}</div>
                      <div style={{ fontSize: 11.5, fontWeight: 800, color: isPast ? '#dc2626' : 'var(--brand-ink)', whiteSpace: 'nowrap' }}>
                        {task.due_date ? formatDate(task.due_date) : 'No date'}
                      </div>
                    </div>
                    {task.description && (
                      <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }}>{task.description}</div>
                    )}
                    <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 3 }}>
                      Assigned to: {task.assigned_to_name?.trim() || 'Unassigned'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Follow-up history popup — every follow-up set for one customer,
          oldest first, as a conversation-style log. ─────────────────────── */}
      {historyTarget && createPortal(
        <div className="due-report-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="due-report-modal rounded-2xl w-full" style={{ maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: t.textPrimary }}>Follow-up History</div>
                <div style={{ fontSize: 11, color: t.textSecondary }}>{historyTarget.customer_name} · {historyTarget.customer_code}</div>
              </div>
              <button type="button" onClick={() => setHistoryTarget(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary }}>
                <MdClose size={20} />
              </button>
            </div>
            <div style={{ padding: '14px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {historyLoading ? (
                <p style={{ color: t.textSecondary, fontSize: 12 }}>Loading history...</p>
              ) : historyTasks.length === 0 ? (
                <p style={{ color: t.textSecondary, fontSize: 12 }}>No follow-ups yet for this customer.</p>
              ) : groupByDay(historyTasks).map(([day, tasks]) => (
                <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Date divider — the day the conversation was logged. */}
                  <div className="flex items-center gap-2" style={{ fontSize: 11, fontWeight: 800, color: t.textSecondary }}>
                    <span style={{ flex: 1, height: 1, background: t.divider }} />
                    <span style={{ padding: '2px 10px', borderRadius: 999, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}>{day}</span>
                    <span style={{ flex: 1, height: 1, background: t.divider }} />
                  </div>
                  {tasks.map((task) => {
                    const open = task.status === 'pending';
                    return (
                      <div key={task.id} style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: '12px 12px 12px 4px', padding: '9px 12px' }}>
                        <div className="flex items-center gap-2" style={{ fontSize: 10.5, color: t.textSecondary, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, color: t.textPrimary }}>{task.assigned_by_name?.trim() || '—'}</span>
                          <span>{formatTime(task.created_at)}</span>
                          <span style={{ marginLeft: 'auto', padding: '1px 7px', borderRadius: 999, fontWeight: 700, color: '#fff', background: open ? '#16a34a' : '#6b7280' }}>
                            {open ? 'Open' : task.status === 'superseded' ? 'Replaced' : 'Closed'}
                          </span>
                        </div>
                        <div style={{ fontSize: 12.5, color: t.textPrimary, whiteSpace: 'pre-wrap' }}>{task.description || <span style={{ color: t.textSecondary }}>(no note)</span>}</div>
                        <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 6, fontSize: 10.5, color: t.textSecondary }}>
                          <span style={{ fontWeight: 700, color: 'var(--brand-ink)' }}>Next follow-up: {task.due_date ? formatDate(task.due_date) : 'No date'}</span>
                          <span>·</span>
                          <span>Assigned to {task.assigned_to_name?.trim() || 'Unassigned'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DueReportPage;
