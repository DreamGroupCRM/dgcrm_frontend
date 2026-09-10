// ==========================================
// DREAM GROUP CRM - CUSTOMER DETAILS LIST PAGE
// ==========================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdAdd, MdDelete, MdDownload, MdEdit, MdRefresh, MdVisibility,
  MdGroups, MdPersonAddAlt1, MdPersonOff, MdClose,
  MdKeyboardArrowDown, MdMoreVert, MdReceiptLong, MdLoyalty, MdPhone, MdEmail,
  MdPayments, MdPrint, MdAccountBalanceWallet, MdDescription, MdFilterList,
  MdGridView, MdViewList, MdLocationOn, MdBadge,
} from 'react-icons/md';

import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { AppTheme } from '../../../../styles/theme';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import StatCard from '../../../../components/masters/StatCard';
import PaginationFooter from '../../../../components/common/PaginationFooter';
import { fetchAllCustomerDetails, deleteCustomer, assignCustomersToEmployee, fetchCustomerPaymentHistory } from '../../../../services/customerDetailsService';
import {
  collectPayment, fetchCustomerDue, fetchCustomerRemaining, fetchPaymentReceipt, deletePayment, PAYMENT_FOR_OPTIONS, paymentForLabel,
} from '../../../../services/paymentService';
import { FetchBuildingList, ViewBuilding } from '../../../../services/buildingService';
import { FetchEmployeeDetails } from '../../../../services/employeeDetailsService';
import { fetchCustomerIntelligence, CustomerIntelligence } from '../../../../services/intelligenceService';
import {
  Customer, Building, CustomerPaymentRecord, CustomerListSummary, CustomerListFilters,
  PaymentFor, CustomerDueSummary, CustomerRemainingAmounts, PaymentReceipt, CollectPaymentPayload, isAdminRole,
} from '../../../../types/index';
import jsPDF from 'jspdf';
import { formatDate, showAlert } from '../../../../utils';
import './CustomerDetails.css';

type Theme = AppTheme;

// ── SearchableSelect — module scope (not inside the page component), so
// typing in it never causes the "cursor disappears" bug seen before.
// Click anywhere in the field to open, type to filter live, pick from the
// list, or clear with the X. Used for every filter/picker in this page. ──
const SearchableSelect: React.FC<{
  t: Theme;
  placeholder: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  // Overrides only the DISPLAYED text of each dropdown option — filtering,
  // the stored value, and what lands in the input box on selection all
  // still work off the plain option string. Used by the Flat No filter to
  // show "A-101 · 2 BHK · 850 Sqft" per option while still filtering
  // customers by the bare flat number underneath.
  labelFor?: (opt: string) => string;
  // Fired once the field's dropdown closes with a committed value — either
  // an option was clicked, or the user clicked away. Used by the chip/tag
  // filter bar to collapse a filter back into its compact pill once a value
  // has been chosen, instead of leaving the full dropdown open.
  onCommit?: () => void;
  autoFocus?: boolean;
  // Loading/empty-state support (item 6's Assign Employee fix) — without
  // this, a field whose `options` list is empty (still fetching, fetch
  // failed, or genuinely zero results) rendered its dropdown as literally
  // nothing when clicked: `filtered.length > 0` gated the whole panel, so
  // there was no visual difference between "still loading" and "silently
  // broken". `loading` shows an in-progress row instead of an empty panel;
  // `emptyMessage`/`onRetry` show a real "nothing here" state with a way
  // to recover instead of a dead field.
  loading?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
}> = ({ t, placeholder, options, value, onChange, disabled, labelFor, onCommit, autoFocus, loading, emptyMessage = 'No options found.', onRetry }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  // Every dropdown here used to render as a plain position:absolute child
  // of its own field wrapper (z-index 30) — nothing but that number kept it
  // above the results grid/table right below it, and the grid's own cards/
  // rows won a real browser's stacking order often enough that the
  // Customer Name suggestions and the Assign Employee list both ended up
  // visually and click-through BEHIND the table: options looked selectable
  // but the click actually landed on whatever table row/cell was underneath.
  // Portaling to document.body (position:fixed, computed from the field's
  // own bounding rect on open) removes the ambiguity entirely — same fix
  // already applied to RowActionMenu and to CustomerDetailsCrudPage.tsx's
  // own SearchableSelect.
  const openDropdown = () => {
    if (disabled) return;
    const r = ref.current?.getBoundingClientRect();
    if (r) setMenuPos({ top: r.bottom + 4, left: r.left, width: r.width });
    setOpen(true);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target) && !(target as HTMLElement).closest?.('[data-searchable-select-menu]')) {
        setOpen(false);
        onCommit?.();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onCommit]);

  // Reposition (rather than just closing) on scroll/resize while open — this
  // page's filter row and results grid share one scroll container, so a
  // stale position from an earlier openDropdown() would otherwise drift out
  // from under the field the moment the page scrolls.
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
      <div
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
        style={{ background: disabled ? t.insetBg : t.inputBg, border: `1px solid ${t.inputBorder}`, cursor: disabled ? 'not-allowed' : 'text' }}
        onClick={openDropdown}
      >
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          autoFocus={autoFocus}
          onFocus={openDropdown}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); openDropdown(); }}
          style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 11.5, width: '100%' }}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(''); setQuery(''); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 0, display: 'flex', flexShrink: 0 }}
          >
            <MdClose size={15} />
          </button>
        )}
        <MdKeyboardArrowDown size={16} style={{ color: t.textSecondary, flexShrink: 0 }} />
      </div>
      {open && !disabled && menuPos && (loading || filtered.length > 0 || emptyMessage) && createPortal(
        <div
          data-searchable-select-menu
          style={{
            position: 'fixed', top: menuPos.top, left: menuPos.left, width: menuPos.width, zIndex: 200, maxHeight: 220, overflowY: 'auto',
            background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '4px 0',
          }}
        >
          {loading ? (
            <div className="px-3.5 py-2 text-sm" style={{ color: t.textSecondary, fontFamily: t.fontFamily }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="px-3.5 py-2" style={{ fontFamily: t.fontFamily }}>
              <div className="text-sm" style={{ color: t.textSecondary, marginBottom: onRetry ? 6 : 0 }}>{emptyMessage}</div>
              {onRetry && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRetry(); }}
                  className="text-sm font-semibold"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#7c3aed', padding: 0 }}
                >
                  Retry
                </button>
              )}
            </div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt} type="button"
                onClick={() => { onChange(opt); setQuery(opt); setOpen(false); onCommit?.(); }}
                className="w-full text-left px-3.5 py-2 text-sm"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textPrimary, fontFamily: t.fontFamily }}
              >
                {labelFor ? labelFor(opt) : opt}
              </button>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

// Date-field styling now lives in CustomerDetails.css as .cust-date-field —
// colors come in via the --cust-* CSS vars set on the page's outer wrapper.

// Fires showPicker() on both click AND focus — a plain onClick alone opens
// the calendar when the browser-drawn icon is clicked, but clicking into
// the day/month/year text segments only moves focus between them without
// reopening it. Wrapped in try/catch — showPicker() throws if called
// without an active user gesture or while already open.
const openPicker = (e: React.SyntheticEvent<HTMLInputElement>) => {
  try { e.currentTarget.showPicker?.(); } catch { /* already open / no gesture — ignore */ }
};

// The View/Edit/Delete row menu used to render `position:absolute` inside
// the table's own `overflow-x:auto` wrapper — setting only overflow-x
// (with overflow-y left as the default) makes the browser clip BOTH axes
// per the CSS spec, so the dropdown was getting cut off (sometimes down to
// a sliver of the "View" row) any time it opened near the bottom of the
// table. Rendering it into a portal at document.body, positioned with
// `fixed` from the trigger button's own bounding rect, escapes that
// clipped container entirely — the dropdown always shows all three
// options in full, wherever the row sits on screen.
// Compact popup, positioned beside the 3-dot trigger, with a horizontal
// divider between every option (item 7's "Action menu matching Employee
// List style") — same trio as before, just tighter width/padding and
// dividers instead of a plain stacked list.
const RowActionMenu: React.FC<{
  t: Theme; pos: { top: number; left: number };
  onView: () => void; onEdit: () => void; onDelete: () => void;
}> = ({ t, pos, onView, onEdit, onDelete }) => createPortal(
  <div
    data-customer-row-menu
    style={{
      position: 'fixed', top: pos.top, left: pos.left, zIndex: 100, minWidth: 118,
      background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 8,
      boxShadow: '0 6px 16px rgba(0,0,0,0.16)', overflow: 'hidden',
    }}
  >
    <button type="button" onClick={onView}
      className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
      style={{ background: 'transparent', border: 'none', borderBottom: `1px solid ${t.divider}`, cursor: 'pointer', color: t.textPrimary, fontFamily: t.fontFamily }}>
      <MdVisibility size={14} color="#2563eb" /> View
    </button>
    <button type="button" onClick={onEdit}
      className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
      style={{ background: 'transparent', border: 'none', borderBottom: `1px solid ${t.divider}`, cursor: 'pointer', color: t.textPrimary, fontFamily: t.fontFamily }}>
      <MdEdit size={13} color="#7c3aed" /> Edit
    </button>
    <button type="button" onClick={onDelete}
      className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#dc2626', fontFamily: t.fontFamily }}>
      <MdDelete size={14} /> Delete
    </button>
  </div>,
  document.body
);

// ── Grid card — module scope, mirrors Employee Grid View's card design
// (avatar/status top, 3-dot menu top-right, contact rows below) so the two
// modules' Grid Views read as one consistent visual language (item 10). ──
const CustomerCard: React.FC<{
  c: Customer; t: Theme; isDark: boolean;
  onOpenMenu: (e: React.MouseEvent<HTMLButtonElement>) => void;
  menuOpen: boolean; menuPos: { top: number; left: number } | null;
  onView: () => void; onEdit: () => void; onDelete: () => void;
}> = ({ c, t, isDark, onOpenMenu, menuOpen, menuPos, onView, onEdit, onDelete }) => {
  const statusBg = c.status === 'active' ? '#dcfce7' : '#fee2e2';
  const statusColor = c.status === 'active' ? '#16a34a' : '#dc2626';
  return (
    <div className="rounded-2xl p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex flex-col items-center flex-shrink-0" style={{ gap: 4 }}>
            {c.customer_photo_url ? (
              <img src={c.customer_photo_url} alt="" className="rounded-full" style={{ width: 48, height: 48, objectFit: 'cover' }} />
            ) : (
              <div className="flex items-center justify-center rounded-full text-white font-bold"
                style={{ width: 48, height: 48, background: 'var(--grad-purple)', fontSize: 15 }}>
                {(c.customer_name || '—').slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="inline-flex items-center gap-1 px-1.5 rounded-full font-semibold"
              style={{ background: statusBg, color: statusColor, fontSize: 10, lineHeight: '14px', whiteSpace: 'nowrap' }}>
              <span className="w-1 h-1 rounded-full bg-current" /> {c.status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="min-w-0">
            <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, lineHeight: 1.25, wordBreak: 'break-word' }}>
              {c.customer_name}
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed' }}>{c.customer_code || '—'}</span>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <button type="button" onClick={onOpenMenu} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 2 }}>
            <MdMoreVert size={18} />
          </button>
          {menuOpen && menuPos && <RowActionMenu t={t} pos={menuPos} onView={onView} onEdit={onEdit} onDelete={onDelete} />}
        </div>
      </div>

      <div className="space-y-1.5" style={{ fontSize: 11, color: t.textSecondary }}>
        <div className="flex items-center gap-1.5 min-w-0">
          <MdEmail size={14} className="flex-shrink-0" />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email || '—'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MdPhone size={14} className="flex-shrink-0" />
          {c.mobile_number || '—'}
        </div>
        <div className="flex items-center gap-1.5">
          <MdLocationOn size={14} className="flex-shrink-0" />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.address || '—'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MdBadge size={14} className="flex-shrink-0" />
          {c.building_name ? `${c.building_name}, ${c.wing_name} Wing, ${c.flat_no}` : '—'}
        </div>
      </div>

      <div style={{ fontSize: 10, color: t.textSecondary, marginTop: 10, paddingTop: 8, borderTop: `1px solid ${t.divider}` }}>
        Booked on {formatDate(c.booking_date)}
      </div>
    </div>
  );
};

const CustomerDetailsListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isDark, t, cssVars: appearanceCssVars } = useAppearanceTokens();
  const role = useAppSelector((s) => s.auth.role);
  const isAdmin = isAdminRole(role);

  // allCustomers now holds ONLY the current server page (see fetchCustomers
  // below) — previously this held up to 1000 rows fetched once, with
  // filtering/pagination done client-side in memory. Past 1000 customers
  // that was a real correctness bug (rows past the cutoff silently never
  // appeared anywhere on this page, not just a performance issue), not
  // just something worth optimizing — see `total` below for the real
  // server-side count driving pagination now.
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  // A small, server-searched result set (top 25, matching whatever's
  // currently typed into the customer-name field) used ONLY for the
  // customer-name autocomplete and the "select a name -> auto-fill
  // Building/Wing/Flat" convenience (handleCustomerNameFilterChange below)
  // — decoupled from allCustomers so those two features keep working
  // independent of the real table/pagination. Previously this was a single
  // unfiltered fetch of up to 1000 customers on mount — harmless with a
  // few hundred customers, but a real per-load cost (and still an
  // eventual correctness cap) once a company has tens of thousands. Since
  // selecting a suggestion only ever picks from what's currently rendered
  // in the dropdown, and the dropdown only ever renders what's in this
  // array, narrowing it to a live search has no effect on either feature's
  // correctness — see the fetch effect below.
  const [customerDirectory, setCustomerDirectory] = useState<Customer[]>([]);
  const [summary, setSummary] = useState<CustomerListSummary>({ total_customers: 0, active_customers: 0, inactive_customers: 0, new_this_month: 0, assigned_customers: 0, unassigned_customers: 0 });
  const [loading, setLoading] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [view, setView] = useState<'grid' | 'list'>('list');

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [employees, setEmployees] = useState<{ id: string; label: string }[]>([]);

  // ── filters ──────────────────────────────────────────────────────────
  const [customerNameFilter, setCustomerNameFilter] = useState('');
  // This is now a real server-side search (see fetchCustomers below), so —
  // same reasoning as Audit History/Leads — debounce it rather than firing
  // a network request on every keystroke.
  const debouncedCustomerNameFilter = useDebouncedValue(customerNameFilter, 400);
  const [buildingFilter, setBuildingFilter] = useState('');
  const [wingFilter, setWingFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [flatNoFilter, setFlatNoFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  // Item 13: the assign/unassign area doubles as an Assigned/Unassigned
  // filter on the table below it.
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');

  // ── selection + assignment ──────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [assigning, setAssigning] = useState(false);

  // ── row action menu + modals ────────────────────────────────────────
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [infoModal, setInfoModal] = useState<{
    type: 'payment'; customer: Customer; loading: boolean;
    payments?: CustomerPaymentRecord[];
    // Customer Due view — fetched alongside payment history, additive to
    // the existing Payment History modal (see openPaymentHistory below).
    due?: CustomerDueSummary; remaining?: CustomerRemainingAmounts;
    // AI Customer Intelligence — fetched alongside the above, same
    // allSettled defensive pattern (see openPaymentHistory below).
    ai?: CustomerIntelligence;
  } | null>(null);

  // same customer. ────────────────────────────────────────────────────
  const [collectPaymentModal, setCollectPaymentModal] = useState<{ customer: Customer } | null>(null);
  const [cpPaymentFor, setCpPaymentFor] = useState<PaymentFor>('EMIAmount');
  const [cpAmount, setCpAmount] = useState('');
  const [cpInstDate, setCpInstDate] = useState('');
  const [cpModeOfPayment, setCpModeOfPayment] = useState('');
  const [cpChequeNumber, setCpChequeNumber] = useState('');
  const [cpClearanceDate, setCpClearanceDate] = useState('');
  const [cpCompany, setCpCompany] = useState('');
  const [cpMaintenance, setCpMaintenance] = useState('');
  const [cpIsAdvancePay, setCpIsAdvancePay] = useState(false);
  const [cpDate, setCpDate] = useState('');
  const [cpPaymentDate, setCpPaymentDate] = useState('');
  const [collecting, setCollecting] = useState(false);

  // ── View Receipt modal — layered on top of the Payment History modal,
  // opened from a "View Receipt" button on each of its rows. ──────────
  const [receiptModal, setReceiptModal] = useState<{ transactionId: string; loading: boolean; data?: PaymentReceipt; pendingApproval?: boolean } | null>(null);

  useEffect(() => { dispatch(setPageTitle('Customer Details')); }, [dispatch]);

  // ── Employee dropdown for "Assign to Employee" — root cause of the
  // reported "select customer, open Assign, dropdown stays empty" bug:
  // this fetch used to run exactly once on page mount with its failure
  // silently swallowed (empty catch, no toast, no retry) and no way to
  // notice it had failed, since the field itself stays disabled — and
  // invisible — until a customer is actually selected. If that one
  // mount-time request hit any transient failure (auth/token refresh
  // race on initial load, a network blip), `employees` stayed `[]` for
  // the rest of the page's life with zero visible sign anything was
  // wrong, right up to the exact moment the user needed it. Fix: surface
  // the failure with a toast, and retry automatically the moment the
  // Assign row becomes usable (a customer gets checked) if the list is
  // still empty, so a one-off failure self-heals instead of requiring a
  // full page reload.
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const fetchEmployeesForAssignment = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      // activeOnly=true — don't offer a deactivated employee as an
      // assignee for a customer.
      const res = await FetchEmployeeDetails(1, 1000, undefined, true);
      if (res.success) {
        setEmployees((res.rows ?? []).map((e) => ({ id: e.id, label: `${e.first_name} ${e.last_name} (${e.employee_code})` })));
      } else {
        toast.error('Failed to load employees for assignment.');
      }
    } catch {
      toast.error('Failed to load employees for assignment. Please try again.');
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  // ── fetch everything this page needs ────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await FetchBuildingList(1, 1000);
        if (res.success) setBuildings(res.rows ?? []);
      } catch { /* dropdowns just stay empty if this fails */ }
    })();
    fetchEmployeesForAssignment();
  }, [fetchEmployeesForAssignment]);

  // Customer-name autocomplete — a small server search (top 25) that
  // re-runs as the user types, instead of one unfiltered fetch of up to
  // 1000 rows on mount. Keyed on the same debounced value that drives the
  // main table's own name filter, so both settle together; an empty query
  // still returns a small "most recent" batch so the field isn't empty the
  // moment it's focused. See customerDirectory's own declaration for why
  // narrowing this is safe for the auto-populate feature too.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchAllCustomerDetails(1, 25, { customer_name: debouncedCustomerNameFilter || undefined });
        if (!cancelled && res.success) setCustomerDirectory(res.rows ?? []);
      } catch { /* autocomplete just stays at its last results if this fails */ }
    })();
    return () => { cancelled = true; };
  }, [debouncedCustomerNameFilter]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // The dropdown itself now lives in a document.body portal (see
      // RowActionMenu), so it's no longer inside menuRef — it's tagged
      // with data-customer-row-menu instead, and both are checked here.
      if (menuRef.current?.contains(target)) return;
      if (target.closest?.('[data-customer-row-menu]')) return;
      setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── cascading Building -> Wing -> Floor -> Flat option lists ────────────
  // FetchBuildingList (used for the Building Name options below) is a LIST
  // endpoint — its wings/floors/flats are placeholder entries sized to match
  // aggregate counts only (empty name/label/flat_no on every one of them;
  // see buildingService.ts's fromListRow), never real names. Real wing/
  // floor/flat names only come from the per-building detail endpoint
  // (ViewBuilding), so once a specific building is selected here its real
  // detail is fetched and THAT backs the Wing/Floor/Flat option lists below
  // — not the list row's placeholders. Floor itself isn't a customer field
  // (customers only carry flat_no), so it's purely a narrowing step for the
  // Flat No list, not a filter criterion applied to customers directly. ────
  const buildingNameOptions = useMemo(() => Array.from(new Set(buildings.map((b) => b.building_name))), [buildings]);
  const selectedBuilding = useMemo(() => buildings.find((b) => b.building_name === buildingFilter), [buildings, buildingFilter]);

  const [buildingDetail, setBuildingDetail] = useState<Building | null>(null);
  const [loadingBuildingDetail, setLoadingBuildingDetail] = useState(false);
  useEffect(() => {
    if (!selectedBuilding) { setBuildingDetail(null); return; }
    let cancelled = false;
    setLoadingBuildingDetail(true);
    (async () => {
      try {
        const res = await ViewBuilding(selectedBuilding.id);
        if (!cancelled && res.success) setBuildingDetail(res.data);
      } catch { /* Wing/Floor/Flat just stay empty if this fails */ }
      finally { if (!cancelled) setLoadingBuildingDetail(false); }
    })();
    return () => { cancelled = true; };
  }, [selectedBuilding?.id]);

  const wingNameOptions = useMemo(() => (buildingDetail ? Array.from(new Set(buildingDetail.wings.map((w) => w.name))) : []), [buildingDetail]);
  const selectedWing = useMemo(() => buildingDetail?.wings.find((w) => w.name === wingFilter), [buildingDetail, wingFilter]);
  const floorLabelOptions = useMemo(() => (selectedWing ? Array.from(new Set(selectedWing.floors.map((f) => f.label))) : []), [selectedWing]);
  const selectedFloor = useMemo(() => selectedWing?.floors.find((f) => f.label === floorFilter), [selectedWing, floorFilter]);
  const flatsInScope = useMemo(() => selectedFloor?.flats ?? [], [selectedFloor]);

  // ── fetch the customer list itself ──────────────────────────────────
  // Shared by fetchCustomers (below) and handleExportCsv — both need the
  // SAME current-filter-chips-as-backend-params translation, building/
  // wing/flat resolved to ids (selectedBuilding/selectedWing/selectedFloor
  // above) since the backend can only filter those by id, never by
  // display name.
  const buildActiveFilters = (): CustomerListFilters => ({
    customer_name: debouncedCustomerNameFilter,
    building_id: selectedBuilding?.id,
    wing_id: selectedWing?.id,
    flat_id: selectedFloor?.flats.find((fl) => fl.flat_no === flatNoFilter)?.id,
    from_date: fromDate,
    to_date: toDate,
    assignment_status: assignmentStatusFilter === 'all' ? undefined : assignmentStatusFilter,
  });

  // Real server pagination + filtering (see customer.repository.ts's
  // findCustomerList).
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAllCustomerDetails(page, limit, buildActiveFilters());
      if (res.success) {
        setAllCustomers(res.rows ?? []);
        setTotal(res.total ?? 0);
        if (res.summary) setSummary(res.summary);
      } else toast.error('Failed to Fetch Customers');
    } catch {
      toast.error('Failed to fetch customers. Please try again.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, debouncedCustomerNameFilter, selectedBuilding?.id, selectedWing?.id, flatNoFilter, selectedFloor, fromDate, toDate, assignmentStatusFilter]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  const flatNoOptions = useMemo(() => Array.from(new Set(flatsInScope.map((fl) => fl.flat_no))), [flatsInScope]);
  // "A-101" -> "A-101 · 2 BHK · 850 Sqft" for the Flat No dropdown's option
  // text — filtering/selection still work off the bare flat_no.
  const flatLabelFor = (flatNo: string): string => {
    const fl = flatsInScope.find((f) => f.flat_no === flatNo);
    if (!fl) return flatNo;
    const parts = [flatNo, fl.flat_type, fl.area_sqft != null ? `${fl.area_sqft} Sqft` : null].filter(Boolean);
    return parts.join(' · ');
  };

  const customerNameOptions = useMemo(() => Array.from(new Set(customerDirectory.map((c) => c.customer_name))), [customerDirectory]);
  const employeeOptions = useMemo(() => employees.map((e) => e.label), [employees]);

  const clearAllFilters = () => {
    setCustomerNameFilter(''); setBuildingFilter(''); setWingFilter(''); setFloorFilter(''); setFlatNoFilter('');
    setFromDate(''); setToDate(''); setAssignmentStatusFilter('all');
  };
  const anyFilterApplied =
    !!customerNameFilter || !!buildingFilter || !!wingFilter || !!floorFilter || !!flatNoFilter || !!fromDate || !!toDate
    || assignmentStatusFilter !== 'all';

  // Every filter is fully independent — setting/typing into Customer Name
  // touches ONLY customerNameFilter. An earlier version of this handler
  // auto-populated Building/Wing/Floor/Flat No from the matched customer's
  // own booking as a "convenience"; that is exactly the "other filters get
  // automatically selected" behavior reported against this page, so it has
  // been removed outright rather than merely guarded — the user must
  // explicitly set every filter they want applied.
  const handleCustomerNameFilterChange = (v: string) => {
    setCustomerNameFilter(v);
  };

  // allCustomers IS the current page now — the server already applied
  // every filter above (see fetchCustomers) and returned exactly this
  // page's rows, so there's no client-side filtering or slicing left to
  // do here. Resetting to page 1 on filter change still matters — a
  // filter narrowing the result set out from under an already-deep page
  // number would otherwise land on an empty or out-of-range page.
  useEffect(() => { setPage(1); }, [debouncedCustomerNameFilter, buildingFilter, wingFilter, floorFilter, flatNoFilter, fromDate, toDate, assignmentStatusFilter]);

  const pageRows = allCustomers;
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

  // ── checkbox selection — item 13: an inactive customer can't be
  // selected for assignment at all (its checkbox is disabled in the
  // table), so these never need to guard against one slipping in via a
  // stale selection. ──────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const activePageRows = useMemo(() => pageRows.filter((c) => c.status === 'active'), [pageRows]);
  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = activePageRows.length > 0 && activePageRows.every((c) => next.has(c.id));
      activePageRows.forEach((c) => (allSelected ? next.delete(c.id) : next.add(c.id)));
      return next;
    });
  };

  const assignmentEnabled = selectedIds.size > 0;

  // Self-healing retry: if the mount-time fetch above ever failed (or is
  // still in flight when the user checks a customer), pick it back up the
  // moment the Assign row actually becomes usable, instead of leaving the
  // dropdown silently empty until a full page reload. Fires at most ONCE
  // per selection (guarded by retriedForSelectionRef, reset when the
  // selection is cleared) — a legitimately-empty employee table must not
  // turn this into a tight fetch loop every time loadingEmployees flips.
  const retriedForSelectionRef = useRef(false);
  useEffect(() => {
    if (!assignmentEnabled) { retriedForSelectionRef.current = false; return; }
    if (employees.length === 0 && !loadingEmployees && !retriedForSelectionRef.current) {
      retriedForSelectionRef.current = true;
      fetchEmployeesForAssignment();
    }
  }, [assignmentEnabled, employees.length, loadingEmployees, fetchEmployeesForAssignment]);

  const handleAssign = async () => {
    const employee = employees.find((e) => e.label === employeeSearch);
    if (!employee) {
      toast.error('Select an employee to assign to.');
      return;
    }
    setAssigning(true);
    try {
      await assignCustomersToEmployee({ customer_ids: Array.from(selectedIds), employee_id: employee.id });
      toast.success('Customer(s) Assigned Successfully');
      setSelectedIds(new Set());
      setEmployeeSearch('');
      fetchCustomers();
    } catch {
      toast.error('Failed to assign customer(s).');
    } finally {
      setAssigning(false);
    }
  };

  // ── row actions ──────────────────────────────────────────────────────
  const handleDelete = async (c: Customer) => {
    setOpenMenuId(null);
    const result = await showAlert.confirm(`This will permanently delete ${c.customer_name}'s record.`, 'Delete Customer?');
    if (!result.isConfirmed) return;
    try {
      await deleteCustomer(c.id);
      toast.success('Customer Deleted Successfully');
      fetchCustomers();
    } catch {
      toast.error('Failed to delete customer.');
    }
  };

  const openPaymentHistory = async (c: Customer) => {
    setInfoModal({ type: 'payment', customer: c, loading: true });
    try {
      // Payment History is unchanged; Customer Due (total_due/remaining_amount
      // + the per-type remaining breakdown) is fetched alongside it so the
      // one modal shows both — using allSettled so a due/remaining failure
      // never blocks the existing payment history from rendering.
      const [historyRes, dueRes, remainingRes, aiRes] = await Promise.allSettled([
        fetchCustomerPaymentHistory(c.id),
        fetchCustomerDue(c.id),
        fetchCustomerRemaining(c.id),
        fetchCustomerIntelligence(c.id),
      ]);
      if (historyRes.status === 'rejected') throw historyRes.reason;
      setInfoModal({
        type: 'payment', customer: c, loading: false,
        payments: historyRes.value.rows,
        due: dueRes.status === 'fulfilled' ? dueRes.value.data : undefined,
        remaining: remainingRes.status === 'fulfilled' ? remainingRes.value.data : undefined,
        ai: aiRes.status === 'fulfilled' ? aiRes.value : undefined,
      });
    } catch {
      toast.error('Failed to load payment history.');
      setInfoModal(null);
    }
  };



  const handleCollectPayment = async () => {
    if (!collectPaymentModal) return;
    const amountNum = Number(cpAmount);
    if (!cpAmount.trim() || Number.isNaN(amountNum)) {
      toast.error('Enter a valid amount.');
      return;
    }
    setCollecting(true);
    try {
      const payload: CollectPaymentPayload = {
        customer_id: Number(collectPaymentModal.customer.id),
        amount: amountNum,
        payment_for: cpPaymentFor,
        // date/payment_date: only Admin/SuperAdmin callers actually get to
        // set these — the backend silently forces "now" for everyone else
        // (see paymentService.ts) — still sent as-is either way.
        date: cpDate || undefined,
        payment_date: cpPaymentDate || undefined,
        inst_date: cpInstDate || undefined,
        cheque_number: cpChequeNumber.trim() || undefined,
        clearance_date: cpClearanceDate || undefined,
        company: cpCompany.trim() || undefined,
        mode_of_payment: cpModeOfPayment.trim() || undefined,
        maintenance: cpMaintenance.trim() ? Number(cpMaintenance) : undefined,
        is_advance_pay: cpPaymentFor === 'EMIAmount' ? cpIsAdvancePay : undefined,
      };
      const res = await collectPayment(payload);
      toast.success(res.tag ? `${res.message} (${res.tag})` : res.message || 'Payment collected successfully.');
      const collectedFor = collectPaymentModal.customer;
      setCollectPaymentModal(null);
      // Refresh the Payment History modal (payments + due + remaining) if
      // it's open for the same customer, so the new payment shows up
      // without the user having to close and reopen it.
      if (infoModal && infoModal.type === 'payment' && infoModal.customer.id === collectedFor.id) {
        openPaymentHistory(collectedFor);
      }
    } catch {
      toast.error('Failed to collect payment.');
    } finally {
      setCollecting(false);
    }
  };

  // ── View Receipt ─────────────────────────────────────────────────────
  // Legacy blocks receipt/PDF access until an admin approves the payment —
  // the backend returns 403 for that specific case (admins bypass it
  // server-side), which is shown here as an inline "pending approval"
  // state inside the modal rather than treated like any other failure.
  const openReceipt = async (transactionId: string) => {
    setReceiptModal({ transactionId, loading: true });
    try {
      const res = await fetchPaymentReceipt(transactionId);
      setReceiptModal({ transactionId, loading: false, data: res.data });
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setReceiptModal({ transactionId, loading: false, pendingApproval: true });
        return;
      }
      toast.error('Failed to load receipt.');
      setReceiptModal(null);
    }
  };

  // ── Download Receipt PDF — client-side (jsPDF), same approach as the
  // Executive Dashboard's export (dashboardExport.ts). Only reachable once
  // receiptModal.data exists at all, which itself required the approval
  // gate above to pass. ───────────────────────────────────────────────────
  const handleDownloadReceiptPdf = () => {
    if (!receiptModal?.data) return;
    const { transaction: tx, customer, paid_emis, future_emis, total_emis, emi_number } = receiptModal.data;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a5' });
    const marginX = 36;
    let y = 40;

    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('Dream Group CRM', marginX, y);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Payment Receipt', marginX, y + 14);
    y += 34;

    doc.setFontSize(9.5);
    const line = (label: string, value: string) => { doc.text(label, marginX, y); doc.setFont('helvetica', 'bold'); doc.text(value, 220, y); doc.setFont('helvetica', 'normal'); y += 15; };
    line('Receipt No.', tx.receipt_number);
    line('Date', formatDate(tx.date || tx.created_at));
    line('Received By', tx.received_by || '—');
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.text(customer.customer_name || '—', marginX, y);
    doc.setFont('helvetica', 'normal');
    y += 13;
    doc.setFontSize(8.5);
    doc.text(`${customer.customer_code}${customer.mobile_number ? ` · ${customer.mobile_number}` : ''}`, marginX, y);
    y += 20;

    doc.setFontSize(9.5);
    doc.text(paymentForLabel(tx.payment_type), marginX, y);
    y += 16;
    doc.setFontSize(17);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${tx.amount.toLocaleString('en-IN')}`, marginX, y);
    doc.setFont('helvetica', 'normal');
    y += 18;

    if (tx.payment_type === 'EMIAmount' && emi_number > 0) {
      doc.setFontSize(8.5);
      doc.text(`EMI #${emi_number} of ${total_emis} total (${paid_emis} paid, ${future_emis} future)`, marginX, y);
      y += 18;
    }

    doc.setFontSize(9);
    if (tx.mode_of_payment) { line('Mode of Payment', tx.mode_of_payment); }
    if (tx.cheque_number) { line('Cheque Number', tx.cheque_number); }
    if (tx.clearance_date) { line('Clearance Date', formatDate(tx.clearance_date)); }
    if (tx.company) { line('Company', tx.company); }
    if (tx.payment_tag) { line('Tag', tx.payment_tag); }

    doc.save(`receipt-${tx.receipt_number}.pdf`);
  };

  // ── Delete Payment (admin-only) — triggers the backend's EMI
  // recalculation ripple for EMIAmount transactions. Confirm dialog warns
  // about that specifically rather than using the generic delete-confirm
  // wording, since this is a bigger blast radius than a normal row delete. ─
  const handleDeletePayment = async (payment: CustomerPaymentRecord, customer: Customer) => {
    const isEmi = payment.payment_type === 'EMIAmount';
    const result = await showAlert.confirm(
      isEmi
        ? `This will permanently delete this ₹${payment.amount.toLocaleString('en-IN')} EMI payment and recalculate every other EMI transaction for ${customer.customer_name}.`
        : `This will permanently delete this ₹${payment.amount.toLocaleString('en-IN')} payment for ${customer.customer_name}.`,
      'Delete Payment?'
    );
    if (!result.isConfirmed) return;
    try {
      await deletePayment(payment.id);
      toast.success('Payment deleted.');
      openPaymentHistory(customer);
    } catch {
      toast.error('Failed to delete payment.');
    }
  };

  // allCustomers is only the current page now, so export can no longer
  // just read it off state — it does its own one-off fetch honoring the
  // SAME active filter chips (buildActiveFilters) but a high limit, so
  // the export still covers every filtered customer, not just the page
  // on screen. Capped at 5000: large enough that a real company's
  // filtered result set is very unlikely to exceed it, without needing a
  // dedicated unpaginated backend export endpoint (the way Leads has) for
  // this pass — a good candidate for one if this cap is ever actually hit.
  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const res = await fetchAllCustomerDetails(1, 5000, buildActiveFilters());
      const exportRows = res.rows ?? [];
      if (exportRows.length === 0) {
        toast.error('No customers to export.');
        return;
      }
      const header = ['Employee Code', 'Employee Name', 'Customer Name', 'Mobile', 'Email', 'Building', 'Wing', 'Flat No', 'Flat Type', 'Area (Sq Ft)', 'Booking Date', 'Monthly EMI'];
      const rows = exportRows.map((c) => [
        c.assigned_employee_code || '', c.assigned_employee_name || '', c.customer_name, c.mobile_number, c.email,
        c.building_name, c.wing_name, c.flat_no, c.flat_type, c.area_sqft ?? '', formatDate(c.booking_date), c.monthly_emi ?? '',
      ]);
      const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to export customers. Please try again.');
    } finally {
      setExportingCsv(false);
    }
  };

  // ── CSS custom properties for CustomerDetails.css — set once here from
  // this page's own theme values, consumed by the cust-* classes used
  // throughout this page's filters/table/modals below. Also spreads in
  // the appearance system's shared vars so .cust-btn-primary (Add
  // Customer) responds to appearance switching like every other primary
  // CTA — see CustomerDetailsCrudPage.tsx for the same change. ──────────
  const cssVars = {
    ...appearanceCssVars,
    '--cust-field-bg': t.inputBg, '--cust-field-border': t.inputBorder, '--cust-field-text': t.inputText,
    '--cust-inset-bg': t.insetBg, '--cust-text-primary': t.textPrimary, '--cust-text-secondary': t.textSecondary,
    '--cust-surface-bg': t.surfaceBg, '--cust-surface-border': t.surfaceBorder, '--cust-divider': t.divider,
  } as React.CSSProperties;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: t.fontFamily, ...cssVars }}>

      {/* ── KPI cards — All/Assigned/Un Assigned Customer, doubling as the
          assignment filter (item 3): clicking a box applies that filter to
          the table below and highlights itself as the active one. Replaces
          the old Active/Inactive pair, which never reflected a real
          "inactive customer" concept anyway (see getCustomerListSummary's
          comment) and duplicated the separate Assigned/Unassigned toggle
          that used to sit further down this page. ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {([
          { filterKey: 'all', label: 'All Customers', value: summary.total_customers, icon: MdGroups, color: '#7c3aed' },
          { filterKey: 'assigned', label: 'Assigned Customers', value: summary.assigned_customers, icon: MdPersonAddAlt1, color: '#16a34a' },
          { filterKey: 'unassigned', label: 'Un Assigned Customers', value: summary.unassigned_customers, icon: MdPersonOff, color: '#ea580c' },
        ] as const).map(({ filterKey, ...card }) => (
          <StatCard key={filterKey} {...card} bg="" loading={loading} compact labelFontSize={14}
            active={assignmentStatusFilter === filterKey}
            onClick={() => setAssignmentStatusFilter(filterKey)}
            surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        ))}
      </div>

      {/* ── Filters row ───────────────────────────────────────────────── */}
      <div className="rounded-2xl mb-5 p-5" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        {/* Negative margin (not `overflow-hidden` on the card) pulls the
            gradient bar out to the card's own edges — the Select Flat No
            dropdown sits in this grid's last row and opens downward past
            the card's bottom edge, which `overflow-hidden` here would clip. */}
        <div className="flex items-center gap-2.5 -m-5 mb-4 px-5 py-3.5 rounded-t-2xl" style={{ background: 'var(--grad-sky)' }}>
          <MdFilterList size={18} style={{ color: '#fff', flexShrink: 0 }} />
          <h3 style={{ fontSize: 14.5, fontWeight: 800, color: '#fff', margin: 0 }}>Search &amp; Filter Customers</h3>
        </div>

        {/* All filters always visible in one row (wraps on narrow screens) —
            no click-to-reveal step. Each filter below sets ONLY its own
            state — no filter clears, overwrites, or disables another. The
            option LIST a filter offers may still be narrowed by ones set
            before it (Wing's options come from whichever Building is
            selected, same as any real drill-down picker), but that's a
            list of valid choices to show, never a value picked on the
            user's behalf, and every field stays enabled and independently
            usable — a genuinely empty option list surfaces via
            SearchableSelect's own empty-state message, not by disabling
            the field. */}
        <div className="flex flex-wrap items-end gap-3">
          <div style={{ flex: '1 1 170px', minWidth: 150 }}>
            <label className="cust-filter-label">Customer Name</label>
            <SearchableSelect t={t} placeholder="Select or type customer name" options={customerNameOptions} value={customerNameFilter} onChange={handleCustomerNameFilterChange} />
          </div>
          <div style={{ flex: '1 1 170px', minWidth: 150 }}>
            <label className="cust-filter-label">Building</label>
            <SearchableSelect t={t} placeholder="Select or type building name" options={buildingNameOptions} value={buildingFilter}
              onChange={setBuildingFilter} />
          </div>
          <div style={{ flex: '1 1 150px', minWidth: 130 }}>
            <label className="cust-filter-label">Wing</label>
            <SearchableSelect t={t} placeholder={loadingBuildingDetail ? 'Loading wings...' : 'Select wing'} options={wingNameOptions} value={wingFilter}
              loading={loadingBuildingDetail}
              emptyMessage={selectedBuilding ? 'No wings found for this building.' : 'Select a Building first to see its wings.'}
              onChange={setWingFilter} />
          </div>
          <div style={{ flex: '1 1 150px', minWidth: 130 }}>
            <label className="cust-filter-label">Floor</label>
            <SearchableSelect t={t} placeholder="Select floor" options={floorLabelOptions} value={floorFilter}
              emptyMessage={selectedWing ? 'No floors found for this wing.' : 'Select a Wing first to see its floors.'}
              onChange={setFloorFilter} />
          </div>
          <div style={{ flex: '1 1 150px', minWidth: 130 }}>
            <label className="cust-filter-label">Flat No</label>
            <SearchableSelect t={t} placeholder="Select flat number" options={flatNoOptions} value={flatNoFilter}
              emptyMessage={selectedFloor ? 'No flats found for this floor.' : 'Select a Floor first to see its flats.'}
              onChange={setFlatNoFilter} labelFor={flatLabelFor} />
          </div>
          <div style={{ flex: '1 1 140px', minWidth: 130 }}>
            <label className="cust-filter-label">From Date</label>
            <input type="date" value={fromDate} onClick={openPicker} onFocus={openPicker} onChange={(e) => setFromDate(e.target.value)} className="cust-date-field" />
          </div>
          <div style={{ flex: '1 1 140px', minWidth: 130 }}>
            <label className="cust-filter-label">To Date</label>
            <input type="date" value={toDate} onClick={openPicker} onFocus={openPicker} onChange={(e) => setToDate(e.target.value)} className="cust-date-field" />
          </div>

          {anyFilterApplied && (
            <button
              type="button" onClick={clearAllFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer', flexShrink: 0 }}
            > Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar — Search Employee + Assign to Employee together on the
          left, Add Customer / Grid-List / Export CSV / Refresh always on
          the right, all in one single row — flex-nowrap (not flex-wrap)
          so this never splits into two rows on desktop; the row scrolls
          horizontally instead of wrapping if the viewport is too narrow
          to fit everything (e.g. on mobile). ───────────────────────────── */}
      <div className="flex items-end justify-between gap-3 mb-2" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
        <div className="flex items-end gap-3" style={{ flexWrap: 'nowrap', flexShrink: 0 }}>
          <div style={{ width: 240 }}>
            <label className="cust-filter-label">Search Employee</label>
            <SearchableSelect
              t={t}
              placeholder={loadingEmployees ? 'Loading employees...' : 'Select employee'}
              options={employeeOptions}
              value={employeeSearch}
              onChange={setEmployeeSearch}
              disabled={!assignmentEnabled}
              loading={loadingEmployees}
              emptyMessage={employees.length === 0 ? 'No employees found.' : 'No matching employees.'}
              onRetry={employees.length === 0 && !loadingEmployees ? fetchEmployeesForAssignment : undefined}
            />
          </div>
          <button
            type="button"
            onClick={handleAssign}
            disabled={!assignmentEnabled || !employeeSearch || assigning}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              background: !assignmentEnabled || !employeeSearch || assigning ? t.insetBg : 'var(--grad-purple)',
              color: !assignmentEnabled || !employeeSearch || assigning ? t.textSecondary : '#fff',
              border: `1px solid ${!assignmentEnabled || !employeeSearch || assigning ? t.surfaceBorder : 'transparent'}`,
              cursor: !assignmentEnabled || !employeeSearch || assigning ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {assigning ? 'Assigning...' : 'Assign to Employee'}
          </button>
        </div>

        <div className="flex items-center gap-2.5" style={{ flexWrap: 'nowrap', flexShrink: 0 }}>
          <button type="button" onClick={() => setView((v) => (v === 'grid' ? 'list' : 'grid'))}
            title={view === 'grid' ? 'Switch to List View' : 'Switch to Grid View'}
            className="flex items-center justify-center rounded-xl"
            style={{ width: 40, height: 40, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
            {view === 'grid' ? <MdViewList size={18} /> : <MdGridView size={18} />}
          </button>
          <button type="button" onClick={() => navigate('/admin/crm/customer-details/add')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--grad-purple)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <MdAdd size={18} /> Add Customer
          </button>
          <button type="button" onClick={handleExportCsv} disabled={exportingCsv}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: exportingCsv ? 'not-allowed' : 'pointer', opacity: exportingCsv ? 0.6 : 1 }}>
            <MdDownload size={17} /> {exportingCsv ? 'Exporting…' : 'Export CSV'}
          </button>
          <button type="button" onClick={fetchCustomers} title="Refresh"
            className="flex items-center justify-center rounded-xl"
            style={{ width: 40, height: 40, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
            <MdRefresh size={18} />
          </button>
        </div>
      </div>
      {!assignmentEnabled && (
        <p style={{ fontSize: 10.5, color: t.textSecondary, margin: '0 0 12px' }}>ⓘ Select one or more customers to enable</p>
      )}

      {/* ── Table / Grid ──────────────────────────────────────────────── */}
      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        {view === 'grid' ? (
          <div className="p-5">
            {loading ? (
              <div className="cust-empty-state">Loading customers...</div>
            ) : pageRows.length === 0 ? (
              <div className="cust-empty-state">No customers found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {pageRows.map((c) => (
                  <CustomerCard key={c.id} c={c} t={t} isDark={isDark}
                    onOpenMenu={(e) => {
                      if (openMenuId === c.id) { setOpenMenuId(null); setMenuPos(null); return; }
                      const r = e.currentTarget.getBoundingClientRect();
                      setMenuPos({ top: r.bottom + 4, left: r.left - 96 });
                      setOpenMenuId(c.id);
                    }}
                    menuOpen={openMenuId === c.id} menuPos={menuPos}
                    onView={() => { setOpenMenuId(null); navigate(`/admin/crm/customer-details/view/${c.id}`); }}
                    onEdit={() => { setOpenMenuId(null); navigate(`/admin/crm/customer-details/edit/${c.id}`); }}
                    onDelete={() => { setOpenMenuId(null); handleDelete(c); }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
        <div className="master-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1250 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                <th style={{ padding: '12px 14px', width: 40 }}>
                  <input type="checkbox" title="Select all active customers on this page"
                    checked={activePageRows.length > 0 && activePageRows.every((c) => selectedIds.has(c.id))} onChange={toggleSelectAllOnPage} />
                </th>
                {['Action', 'Customer Code', 'Customer Name', 'Employee Name', 'Contact Details', 'Project & Flat Details', 'Flat Type', 'Flat Area (Sq Ft)', 'Flat Booking Date', 'Monthly EMI Amount'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="cust-empty-state">Loading customers...</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={11} className="cust-empty-state">No customers found.</td></tr>
              ) : (
                pageRows.map((c) => (
                  <tr key={c.id} className="cust-divider-top">
                    <td style={{ padding: '12px 14px' }}>
                      <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)}
                        disabled={c.status !== 'active'} title={c.status !== 'active' ? "Inactive customers can't be assigned" : undefined} />
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div className="flex items-center gap-1.5" ref={openMenuId === c.id ? menuRef : undefined}>
                        <div style={{ position: 'relative' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              if (openMenuId === c.id) { setOpenMenuId(null); setMenuPos(null); return; }
                              const r = e.currentTarget.getBoundingClientRect();
                              setMenuPos({ top: r.bottom + 4, left: r.left });
                              setOpenMenuId(c.id);
                            }}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 4 }}>
                            <MdMoreVert size={18} />
                          </button>
                          {openMenuId === c.id && menuPos && (
                            <RowActionMenu
                              t={t} pos={menuPos}
                              onView={() => { setOpenMenuId(null); navigate(`/admin/crm/customer-details/view/${c.id}`); }}
                              onEdit={() => { setOpenMenuId(null); navigate(`/admin/crm/customer-details/edit/${c.id}`); }}
                              onDelete={() => { setOpenMenuId(null); handleDelete(c); }}
                            />
                          )}
                        </div>
                        <button type="button" title="Show Payment History" className="master-icon-btn" onClick={() => openPaymentHistory(c)}>
                          <MdReceiptLong size={15} />
                        </button>
                        <button type="button" title="Show Scheme" className="master-icon-btn" onClick={() => navigate(`/admin/crm/customer-details/scheme/${c.id}`)}>
                          <MdLoyalty size={15} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, fontWeight: 600, color: isDark ? '#ffffff' : '#000000', whiteSpace: 'nowrap' }}>
                      {c.customer_code || '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: isDark ? '#ffffff' : '#000000', whiteSpace: 'nowrap' }}>
                      <div className="flex items-center gap-2">
                        {c.customer_photo_url ? (
                          <img src={c.customer_photo_url} alt="" className="rounded-full flex-shrink-0" style={{ width: 30, height: 30, objectFit: 'cover' }} />
                        ) : (
                          <div className="flex items-center justify-center rounded-full flex-shrink-0 text-white font-bold" style={{ width: 30, height: 30, fontSize: 11, background: 'var(--grad-purple)' }}>
                            {(c.customer_name || '—').slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        {c.customer_name}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div className="flex items-center gap-2">
                        {c.assigned_employee_photo_url ? (
                          <img src={c.assigned_employee_photo_url} alt="" className="rounded-full flex-shrink-0" style={{ width: 28, height: 28, objectFit: 'cover' }} />
                        ) : c.assigned_employee_name ? (
                          <div className="flex items-center justify-center rounded-full flex-shrink-0 text-white text-xs font-bold" style={{ width: 28, height: 28, background: 'var(--grad-sky)' }}>
                            {c.assigned_employee_name.slice(0, 1).toUpperCase()}
                          </div>
                        ) : null}
                        <span style={{ fontSize: 12, color: isDark ? '#ffffff' : '#000000', whiteSpace: 'nowrap' }}>{c.assigned_employee_name || '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11, color: isDark ? '#ffffff' : '#000000' }}>
                      <div className="flex items-center gap-1.5"><MdPhone size={13} /> {c.mobile_number}</div>
                      <div className="flex items-center gap-1.5 mt-0.5"><MdEmail size={13} /> {c.email}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11, color: isDark ? '#ffffff' : '#000000' }}>
                      <div style={{ fontWeight: 700 }}>{c.building_name}</div>
                      <div>{c.wing_name} Wing, {c.flat_no}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: isDark ? '#ffffff' : '#000000', whiteSpace: 'nowrap' }}>{c.flat_type || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: isDark ? '#ffffff' : '#000000', whiteSpace: 'nowrap' }}>{c.area_sqft ?? '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: isDark ? '#ffffff' : '#000000', whiteSpace: 'nowrap' }}>{formatDate(c.booking_date)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: isDark ? '#ffffff' : '#000000', whiteSpace: 'nowrap' }}>
                      {c.monthly_emi != null ? `₹ ${c.monthly_emi.toLocaleString('en-IN')}` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}

        <PaginationFooter t={t} limit={limit} setLimit={setLimit} setPage={setPage} safePage={safePage} totalPages={totalPages} from={from} to={to} total={total} pageBtns={pageBtns} />
      </div>

      {/* ── Payment History modal ────────────────────────────────────── */}
      {infoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setInfoModal(null)}
        >
          <div
            className="rounded-2xl w-full"
            style={{ maxWidth: 480, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, maxHeight: '80vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 cust-divider-bottom">
              <div>
                <div className="cust-modal-title">
                  Payment History
                </div>
                <div className="cust-modal-subtitle">{infoModal.customer.customer_name}</div>
              </div>
              <button type="button" onClick={() => setInfoModal(null)} className="cust-modal-close">
                <MdClose size={20} />
              </button>
            </div>
            <div className="p-5">
              {infoModal.loading ? (
                <p style={{ color: t.textSecondary, fontSize: 12 }}>Loading...</p>
              ) : (
                <>
                  {/* ── 🤖 AI Customer Intelligence — engagement/risk
                      computed server-side from this customer's own payment
                      history (see intelligenceService.ts /
                      customerIntelligence.service.ts). Silently omitted if
                      the fetch failed (allSettled in openPaymentHistory) —
                      never shown with fabricated data. ─────────────────── */}
                  {infoModal.ai && (
                    <div className="rounded-xl p-3.5 mb-4" style={{ background: isDark ? 'rgba(124,58,237,0.08)' : '#f5f3ff', border: `1px solid ${isDark ? 'rgba(124,58,237,0.3)' : '#ddd6fe'}` }}>
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <span style={{ fontSize: 13 }}>🤖</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: t.textPrimary }}>AI Customer Intelligence</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2.5">
                        <div>
                          <div style={{ fontSize: 9.5, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 }}>Engagement</div>
                          <div style={{
                            fontSize: 12, fontWeight: 800,
                            color: infoModal.ai.engagement === 'HIGH' ? '#16a34a' : infoModal.ai.engagement === 'MEDIUM' ? '#d97706' : '#64748b',
                          }}>
                            {infoModal.ai.engagement}
                          </div>
                          <div style={{ fontSize: 10, color: t.textSecondary }}>{infoModal.ai.engagement_reason}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9.5, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 }}>Risk</div>
                          <div style={{
                            fontSize: 12, fontWeight: 800,
                            color: infoModal.ai.risk === 'HIGH' ? '#dc2626' : infoModal.ai.risk === 'MEDIUM' ? '#d97706' : '#16a34a',
                          }}>
                            {infoModal.ai.risk === 'HIGH' ? '⚠️ HIGH' : infoModal.ai.risk}
                          </div>
                          <div style={{ fontSize: 10, color: t.textSecondary }}>{infoModal.ai.risk_reason}</div>
                        </div>
                      </div>
                      <div className="rounded-lg px-2.5 py-2" style={{ background: isDark ? 'rgba(124,58,237,0.12)' : '#fff', border: `1px solid ${isDark ? 'rgba(124,58,237,0.25)' : '#e9d5ff'}` }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: '#7c3aed', marginBottom: 1 }}>{infoModal.ai.recommended_action}</div>
                        <div style={{ fontSize: 10, color: t.textSecondary }}>{infoModal.ai.recommended_action_reason}</div>
                      </div>
                    </div>
                  )}

                  {/* ── Customer Due panel — total_due/remaining_amount +
                      per-type remaining breakdown, additive above the
                      existing payment list. ──────────────────────────── */}
                  {(infoModal.due || infoModal.remaining) && (
                    <div className="rounded-xl p-3.5 mb-4" style={{ background: isDark ? 'rgba(220,38,38,0.08)' : '#fef2f2', border: `1px solid ${isDark ? 'rgba(220,38,38,0.25)' : '#fecaca'}` }}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <MdAccountBalanceWallet size={15} style={{ color: '#dc2626' }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: t.textPrimary }}>Customer Due</span>
                      </div>
                      {infoModal.due && (
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <div style={{ fontSize: 10, color: t.textSecondary }}>Total Due</div>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textPrimary }}>₹ {infoModal.due.total_due.toLocaleString('en-IN')}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: t.textSecondary }}>Remaining</div>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#dc2626' }}>₹ {infoModal.due.remaining_amount.toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                      )}
                      {infoModal.remaining && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1" style={{ borderTop: `1px solid ${isDark ? 'rgba(220,38,38,0.2)' : '#fecaca'}`, paddingTop: 6 }}>
                          {PAYMENT_FOR_OPTIONS.map((o) => (
                            <div key={o.value} style={{ fontSize: 10, color: t.textSecondary }}>
                              {o.label}: <strong style={{ color: t.textPrimary }}>₹ {(infoModal.remaining![o.value] ?? 0).toLocaleString('en-IN')}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {(infoModal.payments || []).length === 0 ? (
                    <p style={{ color: t.textSecondary, fontSize: 12 }}>No payment history found.</p>
                  ) : (
                    <div className="space-y-3">
                      {infoModal.payments!.map((p) => (
                        <div key={p.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: t.insetBg }}>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary }}>₹ {p.amount.toLocaleString('en-IN')}</span>
                              <span
                                style={{
                                  fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                                  color: p.is_approved ? '#16a34a' : '#d97706',
                                  background: p.is_approved ? (isDark ? 'rgba(22,163,74,0.15)' : '#dcfce7') : (isDark ? 'rgba(217,119,6,0.15)' : '#fef3c7'),
                                }}>
                                {p.is_approved ? 'Approved' : 'Pending'}
                              </span>
                              <span
                                style={{
                                  fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                                  color: '#2563eb', background: isDark ? 'rgba(37,99,235,0.15)' : '#eff6ff',
                                }}>
                                {paymentForLabel(p.payment_type)}
                              </span>
                            </div>
                            <div style={{ fontSize: 10.5, color: t.textSecondary }}>
                              Paid on {formatDate(p.paid_on)}{p.mode ? ` · ${p.mode}` : ''}
                              {p.inst_date && p.inst_date !== p.paid_on ? ` · Installment due ${formatDate(p.inst_date)}` : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {p.reference_no && <div style={{ fontSize: 10, color: t.textSecondary }}>Ref: {p.reference_no}</div>}
                            <button type="button" title="View Receipt" onClick={() => openReceipt(p.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
                              style={{ background: isDark ? 'rgba(37,99,235,0.12)' : '#eff6ff', border: 'none', color: '#2563eb', cursor: 'pointer' }}>
                              <MdDescription size={13} /> Receipt
                            </button>
                            {isAdmin && (
                              <button type="button" title="Delete Payment" onClick={() => handleDeletePayment(p, infoModal.customer)}
                                className="flex items-center justify-center rounded-lg"
                                style={{ width: 26, height: 26, background: isDark ? 'rgba(220,38,38,0.12)' : '#fef2f2', border: 'none', color: '#dc2626', cursor: 'pointer' }}>
                                <MdDelete size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── View Receipt modal — layered above the Payment History modal.
          `receipt-print-area` + the inline @media print rule below make
          only this card's content visible when printed, matching how the
          rest of this app keeps one-off styling inline rather than in a
          new CSS file. ──────────────────────────────────────────────── */}
      {receiptModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setReceiptModal(null)}>
          <style>{`
            @media print {
              body * { visibility: hidden; }
              .receipt-print-area, .receipt-print-area * { visibility: visible; }
              .receipt-print-area { position: absolute; top: 0; left: 0; width: 100%; }
              .receipt-no-print { display: none !important; }
            }
          `}</style>
          <div className="rounded-2xl w-full receipt-print-area" style={{ maxWidth: 480, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, maxHeight: '88vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 receipt-no-print cust-divider-bottom">
              <div className="cust-modal-title">Payment Receipt</div>
              <button type="button" onClick={() => setReceiptModal(null)} className="cust-modal-close">
                <MdClose size={20} />
              </button>
            </div>
            <div className="p-5">
              {receiptModal.pendingApproval ? (
                <div className="rounded-xl p-4 text-center" style={{ background: isDark ? 'rgba(217,119,6,0.1)' : '#fffbeb', border: `1px solid ${isDark ? 'rgba(217,119,6,0.25)' : '#fde68a'}` }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#d97706', marginBottom: 3 }}>Pending Approval</div>
                  <div style={{ fontSize: 11, color: t.textSecondary }}>This receipt will be available to view, print, or download once an admin approves the payment.</div>
                </div>
              ) : receiptModal.loading || !receiptModal.data ? (
                <p style={{ color: t.textSecondary, fontSize: 12 }}>{receiptModal.loading ? 'Loading receipt...' : 'Receipt not found.'}</p>
              ) : (
                <>
                  <div className="text-center mb-4">
                    <div style={{ fontSize: 15, fontWeight: 800, color: t.textPrimary }}>Dream Group CRM</div>
                    <div style={{ fontSize: 10.5, color: t.textSecondary }}>Payment Receipt</div>
                  </div>
                  <div className="rounded-xl p-4 mb-4" style={{ background: t.insetBg }}>
                    <div className="flex justify-between mb-1.5"><span style={{ fontSize: 11, color: t.textSecondary }}>Receipt No.</span><strong style={{ fontSize: 11.5, color: t.textPrimary }}>{receiptModal.data.transaction.receipt_number}</strong></div>
                    <div className="flex justify-between mb-1.5"><span style={{ fontSize: 11, color: t.textSecondary }}>Date</span><strong style={{ fontSize: 11.5, color: t.textPrimary }}>{formatDate(receiptModal.data.transaction.date || receiptModal.data.transaction.created_at)}</strong></div>
                    <div className="flex justify-between"><span style={{ fontSize: 11, color: t.textSecondary }}>Received By</span><strong style={{ fontSize: 11.5, color: t.textPrimary }}>{receiptModal.data.transaction.received_by || '—'}</strong></div>
                  </div>

                  <div className="mb-4">
                    <div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Customer</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textPrimary }}>{receiptModal.data.customer.customer_name || '—'}</div>
                    <div style={{ fontSize: 11, color: t.textSecondary }}>{receiptModal.data.customer.customer_code}{receiptModal.data.customer.mobile_number ? ` · ${receiptModal.data.customer.mobile_number}` : ''}</div>
                    {/* Prefers real building/wing/flat names (the backend now
                        loads those relations — see paymentService.ts); falls
                        back to the raw id only if a relation didn't resolve
                        (e.g. a deleted building). */}
                    {(receiptModal.data.customer.building_id || receiptModal.data.customer.wing_id || receiptModal.data.customer.flat_id) && (
                      <div style={{ fontSize: 10, color: t.textSecondary }}>
                        {receiptModal.data.customer.building_id ? `${receiptModal.data.customer.building_name || `Building #${receiptModal.data.customer.building_id}`} ` : ''}
                        {receiptModal.data.customer.wing_id ? `· ${receiptModal.data.customer.wing_name ? `Wing ${receiptModal.data.customer.wing_name}` : `Wing #${receiptModal.data.customer.wing_id}`} ` : ''}
                        {receiptModal.data.customer.flat_id ? `· ${receiptModal.data.customer.flat_no ? `Flat ${receiptModal.data.customer.flat_no}` : `Flat #${receiptModal.data.customer.flat_id}`}` : ''}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl p-4 mb-4" style={{ background: isDark ? 'rgba(22,163,74,0.1)' : '#f0fdf4', border: `1px solid ${isDark ? 'rgba(22,163,74,0.25)' : '#bbf7d0'}` }}>
                    <div style={{ fontSize: 10.5, color: t.textSecondary, marginBottom: 2 }}>{paymentForLabel(receiptModal.data.transaction.payment_type)}</div>
                    <div style={{ fontSize: 21, fontWeight: 800, color: '#16a34a' }}>₹ {receiptModal.data.transaction.amount.toLocaleString('en-IN')}</div>
                    {receiptModal.data.transaction.payment_type === 'EMIAmount' && receiptModal.data.emi_number > 0 && (
                      <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 4 }}>
                        EMI #{receiptModal.data.emi_number} of {receiptModal.data.total_emis} total ({receiptModal.data.paid_emis} paid, {receiptModal.data.future_emis} future)
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 mb-2">
                    {receiptModal.data.transaction.mode_of_payment && (
                      <div><span style={{ fontSize: 10, color: t.textSecondary }}>Mode of Payment</span><div style={{ fontSize: 11.5, color: t.textPrimary, fontWeight: 600 }}>{receiptModal.data.transaction.mode_of_payment}</div></div>
                    )}
                    {receiptModal.data.transaction.cheque_number && (
                      <div><span style={{ fontSize: 10, color: t.textSecondary }}>Cheque Number</span><div style={{ fontSize: 11.5, color: t.textPrimary, fontWeight: 600 }}>{receiptModal.data.transaction.cheque_number}</div></div>
                    )}
                    {receiptModal.data.transaction.clearance_date && (
                      <div><span style={{ fontSize: 10, color: t.textSecondary }}>Clearance Date</span><div style={{ fontSize: 11.5, color: t.textPrimary, fontWeight: 600 }}>{formatDate(receiptModal.data.transaction.clearance_date)}</div></div>
                    )}
                    {receiptModal.data.transaction.company && (
                      <div><span style={{ fontSize: 10, color: t.textSecondary }}>Company</span><div style={{ fontSize: 11.5, color: t.textPrimary, fontWeight: 600 }}>{receiptModal.data.transaction.company}</div></div>
                    )}
                    {receiptModal.data.transaction.payment_tag && (
                      <div><span style={{ fontSize: 10, color: t.textSecondary }}>Tag</span><div style={{ fontSize: 11.5, color: '#ea580c', fontWeight: 700 }}>{receiptModal.data.transaction.payment_tag}</div></div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-5 receipt-no-print cust-divider-top">
              <button type="button" onClick={() => setReceiptModal(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold cust-btn-secondary">
                Close
              </button>
              <button type="button" onClick={handleDownloadReceiptPdf} disabled={!receiptModal.data}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: receiptModal.data ? 'pointer' : 'not-allowed' }}>
                <MdDownload size={16} /> Download PDF
              </button>
              <button type="button" onClick={() => window.print()} disabled={!receiptModal.data}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white cust-btn-primary">
                <MdPrint size={16} /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetailsListPage;
