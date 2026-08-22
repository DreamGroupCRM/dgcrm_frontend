// ==========================================
// DREAM GROUP CRM - CUSTOMER DETAILS LIST PAGE
// ==========================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdAdd, MdDelete, MdDownload, MdEdit, MdRefresh, MdVisibility,
  MdGroups, MdCheckCircle, MdPersonAddAlt1, MdPersonOff, MdClose,
  MdKeyboardArrowDown, MdMoreVert, MdReceiptLong, MdLoyalty, MdPhone, MdEmail,
  MdChevronLeft, MdChevronRight, MdKeyboardDoubleArrowLeft, MdKeyboardDoubleArrowRight,
  MdPayments, MdPrint, MdAccountBalanceWallet, MdDescription,
} from 'react-icons/md';

import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme } from '../../../../styles/theme';
import { fetchAllCustomerDetails, deleteCustomer, assignCustomersToEmployee, fetchCustomerPaymentHistory, fetchCustomerScheme } from '../../../../services/customerDetailsService';
import {
  collectPayment, fetchCustomerDue, fetchCustomerRemaining, fetchPaymentReceipt, PAYMENT_FOR_OPTIONS, paymentForLabel,
} from '../../../../services/paymentService';
import { fetchBuildingList } from '../../../../services/buildingService';
import { fetchEmployeeList } from '../../../../services/employeeDetailsService';
import {
  Customer, Building, CustomerPaymentRecord, CustomerScheme,
  PaymentFor, CustomerDueSummary, CustomerRemainingAmounts, PaymentReceipt, CollectPaymentPayload,
} from '../../../../types/index';
import { formatDate, showAlert } from '../../../../utils';

type Theme = ReturnType<typeof getTheme>;
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

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
}> = ({ t, placeholder, options, value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter((o) => o?.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
        style={{ background: disabled ? t.insetBg : t.inputBg, border: `1px solid ${t.inputBorder}`, cursor: disabled ? 'not-allowed' : 'text' }}
        onClick={() => !disabled && setOpen(true)}
      >
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 13, width: '100%' }}
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
      {open && !disabled && filtered.length > 0 && (
        <div
          style={{
            position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 30, maxHeight: 220, overflowY: 'auto',
            background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '4px 0',
          }}
        >
          {filtered.map((opt) => (
            <button
              key={opt} type="button"
              onClick={() => { onChange(opt); setQuery(opt); setOpen(false); }}
              className="w-full text-left px-3.5 py-2 text-sm"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textPrimary, fontFamily: t.fontFamily }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const dateFieldStyle = (t: Theme): React.CSSProperties => ({
  width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 10,
  padding: '8px 12px', fontSize: 13, color: t.inputText, fontFamily: t.fontFamily, cursor: 'pointer',
});

const CustomerDetailsListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { mode } = useAppSelector((s) => s.theme);
  const isDark = mode === 'dark';
  const t = getTheme(isDark);

  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [employees, setEmployees] = useState<{ id: string; label: string }[]>([]);

  // ── filters ──────────────────────────────────────────────────────────
  const [customerNameFilter, setCustomerNameFilter] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [wingFilter, setWingFilter] = useState('');
  const [flatNoFilter, setFlatNoFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // ── selection + assignment ──────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [assigning, setAssigning] = useState(false);

  // ── row action menu + modals ────────────────────────────────────────
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [infoModal, setInfoModal] = useState<{
    type: 'payment' | 'scheme'; customer: Customer; loading: boolean;
    payments?: CustomerPaymentRecord[]; scheme?: CustomerScheme | null;
    // Customer Due view — fetched alongside payment history, additive to
    // the existing Payment History modal (see openPaymentHistory below).
    due?: CustomerDueSummary; remaining?: CustomerRemainingAmounts;
  } | null>(null);

  // ── Collect Payment modal — reachable from the row actions, and also
  // refreshes the Payment History modal above when that's open for the
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
  const [receiptModal, setReceiptModal] = useState<{ transactionId: string; loading: boolean; data?: PaymentReceipt } | null>(null);

  useEffect(() => { dispatch(setPageTitle('Customer Details')); }, [dispatch]);

  // ── fetch everything this page needs ────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAllCustomerDetails(1, 1000);
      if (res.success) setAllCustomers(res.rows ?? []);
      else toast.error('Failed to Fetch Customers');
    } catch {
      toast.error('Failed to fetch customers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchBuildingList(1, 1000);
        if (res.success) setBuildings(res.rows ?? []);
      } catch { /* dropdowns just stay empty if this fails */ }
    })();
    (async () => {
      try {
        const res = await fetchEmployeeList(1, 1000);
        if (res.success) {
          setEmployees((res.rows ?? []).map((e) => ({ id: e.id, label: `${e.first_name} ${e.last_name} (${e.employee_code})` })));
        }
      } catch { /* dropdown just stays empty if this fails */ }
    })();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── cascading Building -> Wing -> Flat option lists, sourced live from
  //    the existing Building module (not duplicated/hardcoded here) ─────
  const buildingNameOptions = useMemo(() => Array.from(new Set(buildings.map((b) => b.building_name))), [buildings]);
  const selectedBuilding = useMemo(() => buildings.find((b) => b.building_name === buildingFilter), [buildings, buildingFilter]);
  const wingNameOptions = useMemo(() => {
    const source = selectedBuilding ? [selectedBuilding] : buildings;
    return Array.from(new Set(source.flatMap((b) => b.wings.map((w) => w.name))));
  }, [buildings, selectedBuilding]);
  const selectedWing = useMemo(() => selectedBuilding?.wings.find((w) => w.name === wingFilter), [selectedBuilding, wingFilter]);
  const flatNoOptions = useMemo(() => {
    const wingsSource = selectedWing ? [selectedWing] : selectedBuilding ? selectedBuilding.wings : buildings.flatMap((b) => b.wings);
    return Array.from(new Set(wingsSource.flatMap((w) => w.floors.flatMap((f) => f.flats.map((fl) => fl.flat_no)))));
  }, [buildings, selectedBuilding, selectedWing]);

  const customerNameOptions = useMemo(() => Array.from(new Set(allCustomers.map((c) => c.customer_name))), [allCustomers]);
  const employeeOptions = useMemo(() => employees.map((e) => e.label), [employees]);

  const clearAllFilters = () => {
    setCustomerNameFilter(''); setBuildingFilter(''); setWingFilter(''); setFlatNoFilter('');
    setFromDate(''); setToDate('');
  };

  // ── filtered rows (client-side, same pattern as Building/Department/Employee) ──
  const filtered = useMemo(() => {
    return allCustomers.filter((c) => {
      if (customerNameFilter && !c.customer_name?.toLowerCase().includes(customerNameFilter.toLowerCase())) return false;
      if (buildingFilter && c.building_name !== buildingFilter) return false;
      if (wingFilter && c.wing_name !== wingFilter) return false;
      if (flatNoFilter && c.flat_no !== flatNoFilter) return false;
      if (fromDate && c.booking_date && c.booking_date < fromDate) return false;
      if (toDate && c.booking_date && c.booking_date > toDate) return false;
      return true;
    });
  }, [allCustomers, customerNameFilter, buildingFilter, wingFilter, flatNoFilter, fromDate, toDate]);

  useEffect(() => { setPage(1); }, [customerNameFilter, buildingFilter, wingFilter, flatNoFilter, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * limit, safePage * limit);

  const pageBtns = () => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  };

  // ── summary cards ────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const total = allCustomers.length;
    const active = allCustomers.filter((c) => c.status === 'active').length;
    const inactive = allCustomers.filter((c) => c.status === 'inactive').length;
    const now = new Date();
    const newThisMonth = allCustomers.filter((c) => {
      const d = new Date(c.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
    return { total, active, inactive, newThisMonth, activePct: total ? ((active / total) * 100).toFixed(2) : '0', inactivePct: total ? ((inactive / total) * 100).toFixed(2) : '0' };
  }, [allCustomers]);

  // ── checkbox selection ───────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = pageRows.every((c) => next.has(c.id));
      pageRows.forEach((c) => (allSelected ? next.delete(c.id) : next.add(c.id)));
      return next;
    });
  };

  const assignmentEnabled = selectedIds.size > 0;

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
      const [historyRes, dueRes, remainingRes] = await Promise.allSettled([
        fetchCustomerPaymentHistory(c.id),
        fetchCustomerDue(c.id),
        fetchCustomerRemaining(c.id),
      ]);
      if (historyRes.status === 'rejected') throw historyRes.reason;
      setInfoModal({
        type: 'payment', customer: c, loading: false,
        payments: historyRes.value.rows,
        due: dueRes.status === 'fulfilled' ? dueRes.value.data : undefined,
        remaining: remainingRes.status === 'fulfilled' ? remainingRes.value.data : undefined,
      });
    } catch {
      toast.error('Failed to load payment history.');
      setInfoModal(null);
    }
  };

  const openScheme = async (c: Customer) => {
    setInfoModal({ type: 'scheme', customer: c, loading: true });
    try {
      const res = await fetchCustomerScheme(c.id);
      setInfoModal({ type: 'scheme', customer: c, loading: false, scheme: res.data });
    } catch {
      toast.error('Failed to load scheme.');
      setInfoModal(null);
    }
  };

  // ── Collect Payment ──────────────────────────────────────────────────
  const openCollectPayment = (c: Customer) => {
    setOpenMenuId(null);
    setCpPaymentFor('EMIAmount');
    setCpAmount(''); setCpInstDate(''); setCpModeOfPayment(''); setCpChequeNumber('');
    setCpClearanceDate(''); setCpCompany(''); setCpMaintenance(''); setCpIsAdvancePay(false);
    setCpDate(''); setCpPaymentDate('');
    setCollectPaymentModal({ customer: c });
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
  const openReceipt = async (transactionId: string) => {
    setReceiptModal({ transactionId, loading: true });
    try {
      const res = await fetchPaymentReceipt(transactionId);
      setReceiptModal({ transactionId, loading: false, data: res.data });
    } catch {
      toast.error('Failed to load receipt.');
      setReceiptModal(null);
    }
  };

  const handleExportCsv = () => {
    if (filtered.length === 0) {
      toast.error('No customers to export.');
      return;
    }
    const header = ['Employee Code', 'Employee Name', 'Customer Name', 'Mobile', 'Email', 'Building', 'Wing', 'Flat No', 'Flat Type', 'Area (Sq Ft)', 'Booking Date', 'Monthly EMI'];
    const rows = filtered.map((c) => [
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
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: t.fontFamily }}>

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Customer Details</h1>
        <p style={{ fontSize: 13, color: t.textSecondary, margin: '2px 0 0' }}>Dashboard / Customer Details</p>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Customers', sub: 'All Customers', value: summary.total, icon: MdGroups, color: '#7c3aed', bg: isDark ? 'rgba(124,58,237,0.12)' : '#f5f3ff' },
          { label: 'Active Customers', sub: `${summary.activePct}% of total`, value: summary.active, icon: MdCheckCircle, color: '#16a34a', bg: isDark ? 'rgba(22,163,74,0.12)' : '#f0fdf4' },
          { label: 'New Customers This Month', sub: 'This Month', value: summary.newThisMonth, icon: MdPersonAddAlt1, color: '#ea580c', bg: isDark ? 'rgba(234,88,12,0.12)' : '#fff7ed' },
          { label: 'Inactive Customers', sub: `${summary.inactivePct}% of total`, value: summary.inactive, icon: MdPersonOff, color: '#dc2626', bg: isDark ? 'rgba(220,38,38,0.12)' : '#fef2f2' },
        ].map((card) => (
          <div key={card.label} className="flex items-center gap-3 rounded-2xl p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
            <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 44, height: 44, background: card.bg }}>
              <card.icon size={22} style={{ color: card.color }} />
            </div>
            <div className="min-w-0">
              <div style={{ fontSize: 12.5, fontWeight: 600, color: t.textSecondary }}>{card.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary, lineHeight: 1.3 }}>{loading ? '—' : card.value}</div>
              <div style={{ fontSize: 11.5, color: t.textSecondary }}>{card.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters row ───────────────────────────────────────────────── */}
      <div className="rounded-2xl p-5 mb-5" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 5 }}>Search Customer Name</label>
            <SearchableSelect t={t} placeholder="Select or type customer name" options={customerNameOptions} value={customerNameFilter} onChange={setCustomerNameFilter} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 5 }}>Search Building Name</label>
            <SearchableSelect t={t} placeholder="Select or type building name" options={buildingNameOptions} value={buildingFilter}
              onChange={(v) => { setBuildingFilter(v); setWingFilter(''); setFlatNoFilter(''); }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 5 }}>Select Wing</label>
            <SearchableSelect t={t} placeholder="Select wing" options={wingNameOptions} value={wingFilter}
              onChange={(v) => { setWingFilter(v); setFlatNoFilter(''); }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 5 }}>Select Flat No</label>
            <SearchableSelect t={t} placeholder="Select flat number" options={flatNoOptions} value={flatNoFilter} onChange={setFlatNoFilter} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 5 }}>From Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={dateFieldStyle(t)} />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 5 }}>To Date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={dateFieldStyle(t)} />
            </div>
            <button
              type="button" onClick={clearAllFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}
            > X
            </button>
          </div>
        </div>
      </div>

      {/* ── Employee assignment + action row ─────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
        <div className="flex items-end gap-3">
          <div style={{ minWidth: 240 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 5 }}>Search Employee</label>
            <SearchableSelect t={t} placeholder="Select employee" options={employeeOptions} value={employeeSearch} onChange={setEmployeeSearch} disabled={!assignmentEnabled} />
          </div>
          <button
            type="button"
            onClick={handleAssign}
            disabled={!assignmentEnabled || !employeeSearch || assigning}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              background: !assignmentEnabled || !employeeSearch || assigning ? t.insetBg : 'linear-gradient(135deg,#4338ca,#4f46e5)',
              color: !assignmentEnabled || !employeeSearch || assigning ? t.textSecondary : '#fff',
              border: `1px solid ${!assignmentEnabled || !employeeSearch || assigning ? t.surfaceBorder : 'transparent'}`,
              cursor: !assignmentEnabled || !employeeSearch || assigning ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {assigning ? 'Assigning...' : 'Assign to Employee'}
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => navigate('/admin/crm/customer-details/add')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#4338ca,#4f46e5)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <MdAdd size={18} /> Add Customer
          </button>
          <button type="button" onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
            <MdDownload size={17} /> Export CSV
          </button>
          <button type="button" onClick={fetchCustomers} title="Refresh"
            className="flex items-center justify-center rounded-xl"
            style={{ width: 40, height: 40, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
            <MdRefresh size={18} />
          </button>
        </div>
      </div>
      {!assignmentEnabled && (
        <p style={{ fontSize: 12, color: t.textSecondary, margin: '0 0 12px' }}>ⓘ Select one or more customers to enable</p>
      )}

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
            <thead>
              <tr style={{ background: t.insetBg }}>
                <th style={{ padding: '12px 14px', width: 40 }}>
                  <input type="checkbox" checked={pageRows.length > 0 && pageRows.every((c) => selectedIds.has(c.id))} onChange={toggleSelectAllOnPage} />
                </th>
                {['Action', 'Employee Code', 'Employee Name', 'Customer Name', 'Contact Details', 'Project / Flat Details', 'Flat Booking Date', 'Monthly EMI Amount'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12.5, fontWeight: 700, color: isDark ? '#ffffff' : '#000000', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: t.textSecondary }}>Loading customers...</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: t.textSecondary }}>No customers found.</td></tr>
              ) : (
                pageRows.map((c) => (
                  <tr key={c.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                    <td style={{ padding: '12px 14px' }}>
                      <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} />
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div className="flex items-center gap-1.5" ref={openMenuId === c.id ? menuRef : undefined}>
                        <div style={{ position: 'relative' }}>
                          <button type="button" onClick={() => setOpenMenuId((v) => (v === c.id ? null : c.id))}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 4 }}>
                            <MdMoreVert size={18} />
                          </button>
                          {openMenuId === c.id && (
                            <div style={{
                              position: 'absolute', top: '110%', left: 0, zIndex: 20, minWidth: 130,
                              background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 10,
                              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '6px 0',
                            }}>
                              <button type="button" onClick={() => { setOpenMenuId(null); navigate(`/admin/crm/customer-details/view/${c.id}`); }}
                                className="w-full flex items-center gap-2 px-3.5 py-2 text-sm" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textPrimary, fontFamily: t.fontFamily }}>
                                <MdVisibility size={16} color="#2563eb" /> View
                              </button>
                              <button type="button" onClick={() => { setOpenMenuId(null); navigate(`/admin/crm/customer-details/edit/${c.id}`); }}
                                className="w-full flex items-center gap-2 px-3.5 py-2 text-sm" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textPrimary, fontFamily: t.fontFamily }}>
                                <MdEdit size={15} color="#7c3aed" /> Edit
                              </button>
                              <button type="button" onClick={() => handleDelete(c)}
                                className="w-full flex items-center gap-2 px-3.5 py-2 text-sm" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#dc2626', fontFamily: t.fontFamily }}>
                                <MdDelete size={16} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                        <button type="button" title="Show Payment History" className="master-icon-btn" onClick={() => openPaymentHistory(c)}>
                          <MdReceiptLong size={15} />
                        </button>
                        <button type="button" title="Show Scheme" className="master-icon-btn" onClick={() => openScheme(c)}>
                          <MdLoyalty size={15} />
                        </button>
                        <button type="button" title="Collect Payment" className="master-icon-btn" onClick={() => openCollectPayment(c)}>
                          <MdPayments size={15} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div className="flex items-center gap-2">
                        {c.assigned_employee_photo_url ? (
                          <img src={c.assigned_employee_photo_url} alt="" className="rounded-full flex-shrink-0" style={{ width: 32, height: 32, objectFit: 'cover' }} />
                        ) : (
                          <div className="flex items-center justify-center rounded-full flex-shrink-0 text-white text-xs font-bold" style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#4338ca,#4f46e5)' }}>
                            {(c.assigned_employee_name || '—').slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#ffffff' : '#000000' }}>{c.assigned_employee_code || '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13.5, color: isDark ? '#ffffff' : '#000000' }}>{c.assigned_employee_name || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13.5, fontWeight: 600, color: isDark ? '#ffffff' : '#000000', whiteSpace: 'nowrap' }}>
                      <div className="flex items-center gap-1.5">
                        <MdGroups size={15} className="master-row-icon" />
                        {c.customer_name}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12.5, color: isDark ? '#ffffff' : '#000000' }}>
                      <div className="flex items-center gap-1.5"><MdPhone size={13} /> {c.mobile_number}</div>
                      <div className="flex items-center gap-1.5 mt-0.5"><MdEmail size={13} /> {c.email}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12.5, color: isDark ? '#ffffff' : '#000000' }}>
                      <div style={{ fontWeight: 700 }}>{c.building_name}</div>
                      <div>{c.wing_name} Wing, {c.flat_no} ({c.flat_type}{c.area_sqft ? ` - ${c.area_sqft} Sqft` : ''})</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: isDark ? '#ffffff' : '#000000', whiteSpace: 'nowrap' }}>{formatDate(c.booking_date)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13.5, fontWeight: 600, color: isDark ? '#ffffff' : '#000000', whiteSpace: 'nowrap' }}>
                      {c.monthly_emi != null ? `₹ ${c.monthly_emi.toLocaleString('en-IN')}` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* pagination — bottom-center, First/Prev/[numbers]/Next/Last */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4" style={{ borderTop: `1px solid ${t.divider}` }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 12.5, color: t.textSecondary }}>Rows per page:</span>
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 8, padding: '4px 8px', fontSize: 12.5, cursor: 'pointer', outline: 'none' }}>
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ fontSize: 12.5, color: t.textSecondary }}>
            Showing {filtered.length === 0 ? 0 : (safePage - 1) * limit + 1}–{Math.min(safePage * limit, filtered.length)} of {filtered.length}
          </div>
          <div className="flex-1 flex items-center justify-center gap-1.5">
            <button type="button" disabled={safePage <= 1} onClick={() => setPage(1)}
              className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: safePage <= 1 ? 'not-allowed' : 'pointer', opacity: safePage <= 1 ? 0.5 : 1 }}>
              <MdKeyboardDoubleArrowLeft size={16} />
            </button>
            <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: safePage <= 1 ? 'not-allowed' : 'pointer', opacity: safePage <= 1 ? 0.5 : 1 }}>
              <MdChevronLeft size={18} />
            </button>
            {pageBtns()[0] > 1 && <span style={{ color: t.textSecondary, padding: '0 2px' }}>...</span>}
            {pageBtns().map((n) => (
              <button key={n} type="button" onClick={() => setPage(n)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: n === safePage ? '#4338ca' : t.insetBg, color: n === safePage ? '#fff' : t.textPrimary, border: `1px solid ${n === safePage ? '#4338ca' : t.surfaceBorder}`, cursor: 'pointer' }}>
                {n}
              </button>
            ))}
            {pageBtns()[pageBtns().length - 1] < totalPages && <span style={{ color: t.textSecondary, padding: '0 2px' }}>...</span>}
            <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages ? 0.5 : 1 }}>
              <MdChevronRight size={18} />
            </button>
            <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(totalPages)}
              className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages ? 0.5 : 1 }}>
              <MdKeyboardDoubleArrowRight size={16} />
            </button>
          </div>
          <div style={{ width: 90 }} />
        </div>
      </div>

      {/* ── Payment History / Scheme modal ───────────────────────────── */}
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
            <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: t.textPrimary }}>
                  {infoModal.type === 'payment' ? 'Payment History' : 'Scheme'}
                </div>
                <div style={{ fontSize: 12.5, color: t.textSecondary }}>{infoModal.customer.customer_name}</div>
              </div>
              <button type="button" onClick={() => setInfoModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary }}>
                <MdClose size={20} />
              </button>
            </div>
            <div className="p-5">
              {infoModal.loading ? (
                <p style={{ color: t.textSecondary, fontSize: 13.5 }}>Loading...</p>
              ) : infoModal.type === 'payment' ? (
                <>
                  {/* ── Customer Due panel — total_due/remaining_amount +
                      per-type remaining breakdown, additive above the
                      existing payment list. ──────────────────────────── */}
                  {(infoModal.due || infoModal.remaining) && (
                    <div className="rounded-xl p-3.5 mb-4" style={{ background: isDark ? 'rgba(220,38,38,0.08)' : '#fef2f2', border: `1px solid ${isDark ? 'rgba(220,38,38,0.25)' : '#fecaca'}` }}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <MdAccountBalanceWallet size={15} style={{ color: '#dc2626' }} />
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: t.textPrimary }}>Customer Due</span>
                      </div>
                      {infoModal.due && (
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <div style={{ fontSize: 11, color: t.textSecondary }}>Total Due</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>₹ {infoModal.due.total_due.toLocaleString('en-IN')}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: t.textSecondary }}>Remaining</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>₹ {infoModal.due.remaining_amount.toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                      )}
                      {infoModal.remaining && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1" style={{ borderTop: `1px solid ${isDark ? 'rgba(220,38,38,0.2)' : '#fecaca'}`, paddingTop: 6 }}>
                          {PAYMENT_FOR_OPTIONS.map((o) => (
                            <div key={o.value} style={{ fontSize: 11.5, color: t.textSecondary }}>
                              {o.label}: <strong style={{ color: t.textPrimary }}>₹ {(infoModal.remaining![o.value] ?? 0).toLocaleString('en-IN')}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {(infoModal.payments || []).length === 0 ? (
                    <p style={{ color: t.textSecondary, fontSize: 13.5 }}>No payment history found.</p>
                  ) : (
                    <div className="space-y-3">
                      {infoModal.payments!.map((p) => (
                        <div key={p.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: t.insetBg }}>
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: t.textPrimary }}>₹ {p.amount.toLocaleString('en-IN')}</div>
                            <div style={{ fontSize: 12, color: t.textSecondary }}>{formatDate(p.paid_on)}{p.mode ? ` · ${p.mode}` : ''}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {p.reference_no && <div style={{ fontSize: 11.5, color: t.textSecondary }}>Ref: {p.reference_no}</div>}
                            <button type="button" title="View Receipt" onClick={() => openReceipt(p.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
                              style={{ background: isDark ? 'rgba(37,99,235,0.12)' : '#eff6ff', border: 'none', color: '#2563eb', cursor: 'pointer' }}>
                              <MdDescription size={13} /> Receipt
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : !infoModal.scheme ? (
                <p style={{ color: t.textSecondary, fontSize: 13.5 }}>No scheme applied for this customer.</p>
              ) : (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>{infoModal.scheme.scheme_name}</div>
                  {infoModal.scheme.description && <p style={{ fontSize: 13, color: t.textSecondary, marginBottom: 8 }}>{infoModal.scheme.description}</p>}
                  {infoModal.scheme.discount_percent != null && (
                    <div style={{ fontSize: 13.5, color: t.textPrimary }}>Discount: <strong>{infoModal.scheme.discount_percent}%</strong></div>
                  )}
                  {infoModal.scheme.valid_till && (
                    <div style={{ fontSize: 13.5, color: t.textPrimary }}>Valid till: <strong>{formatDate(infoModal.scheme.valid_till)}</strong></div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Collect Payment modal ────────────────────────────────────── */}
      {collectPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => !collecting && setCollectPaymentModal(null)}>
          <div className="rounded-2xl w-full" style={{ maxWidth: 560, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, maxHeight: '88vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: t.textPrimary }}>Collect Payment</div>
                <div style={{ fontSize: 12.5, color: t.textSecondary }}>{collectPaymentModal.customer.customer_name}</div>
              </div>
              <button type="button" onClick={() => setCollectPaymentModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary }}>
                <MdClose size={20} />
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: t.textSecondary, marginBottom: 5 }}>Payment For <span style={{ color: '#ef4444' }}>*</span></label>
                <select value={cpPaymentFor} onChange={(e) => setCpPaymentFor(e.target.value as PaymentFor)}
                  style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 10, padding: '9px 12px', fontSize: 13.5, color: t.inputText, fontFamily: t.fontFamily }}>
                  {PAYMENT_FOR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: t.textSecondary, marginBottom: 5 }}>Amount (₹) <span style={{ color: '#ef4444' }}>*</span></label>
                <div className="flex items-center gap-2" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 10, padding: '0 12px' }}>
                  <span style={{ color: t.textSecondary }}>₹</span>
                  <input type="text" inputMode="decimal" placeholder="Enter amount" value={cpAmount}
                    onChange={(e) => setCpAmount(e.target.value.replace(/[^\d.]/g, ''))}
                    style={{ border: 'none', outline: 'none', background: 'transparent', padding: '9px 0', width: '100%', color: t.inputText, fontSize: 13.5, fontFamily: t.fontFamily }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: t.textSecondary, marginBottom: 5 }}>Installment Date</label>
                <input type="date" value={cpInstDate} onChange={(e) => setCpInstDate(e.target.value)} style={dateFieldStyle(t)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: t.textSecondary, marginBottom: 5 }}>Mode of Payment</label>
                <input type="text" placeholder="e.g. Cash, Cheque, NEFT" value={cpModeOfPayment} onChange={(e) => setCpModeOfPayment(e.target.value)}
                  style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 10, padding: '9px 12px', fontSize: 13.5, color: t.inputText, fontFamily: t.fontFamily }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: t.textSecondary, marginBottom: 5 }}>Cheque Number</label>
                <input type="text" placeholder="Optional" value={cpChequeNumber} onChange={(e) => setCpChequeNumber(e.target.value)}
                  style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 10, padding: '9px 12px', fontSize: 13.5, color: t.inputText, fontFamily: t.fontFamily }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: t.textSecondary, marginBottom: 5 }}>Clearance Date</label>
                <input type="date" value={cpClearanceDate} onChange={(e) => setCpClearanceDate(e.target.value)} style={dateFieldStyle(t)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: t.textSecondary, marginBottom: 5 }}>Company</label>
                <input type="text" placeholder="Optional" value={cpCompany} onChange={(e) => setCpCompany(e.target.value)}
                  style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 10, padding: '9px 12px', fontSize: 13.5, color: t.inputText, fontFamily: t.fontFamily }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: t.textSecondary, marginBottom: 5 }}>Maintenance (₹)</label>
                <input type="text" inputMode="numeric" placeholder="Optional" value={cpMaintenance}
                  onChange={(e) => setCpMaintenance(e.target.value.replace(/[^\d]/g, ''))}
                  style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 10, padding: '9px 12px', fontSize: 13.5, color: t.inputText, fontFamily: t.fontFamily }} />
              </div>
              {/* date/payment_date — only Admin/SuperAdmin callers actually get
                  these applied server-side; a non-admin caller's submission is
                  silently forced to "now" instead (see paymentService.ts). */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: t.textSecondary, marginBottom: 5 }}>Date <span style={{ fontWeight: 400 }}>(Admin only)</span></label>
                <input type="date" value={cpDate} onChange={(e) => setCpDate(e.target.value)} style={dateFieldStyle(t)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: t.textSecondary, marginBottom: 5 }}>Payment Date <span style={{ fontWeight: 400 }}>(Admin only)</span></label>
                <input type="date" value={cpPaymentDate} onChange={(e) => setCpPaymentDate(e.target.value)} style={dateFieldStyle(t)} />
              </div>
              {cpPaymentFor === 'EMIAmount' && (
                <div className="sm:col-span-2 flex items-center gap-2">
                  <input id="cp-advance-pay" type="checkbox" checked={cpIsAdvancePay} onChange={(e) => setCpIsAdvancePay(e.target.checked)} />
                  <label htmlFor="cp-advance-pay" style={{ fontSize: 13, color: t.textPrimary, cursor: 'pointer' }}>
                    Advance Pay <span style={{ color: t.textSecondary }}>(pay ahead into future EMIs)</span>
                  </label>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-5" style={{ borderTop: `1px solid ${t.divider}` }}>
              <button type="button" onClick={() => setCollectPaymentModal(null)} disabled={collecting}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: t.surfaceBg, color: t.textPrimary, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" onClick={handleCollectPayment} disabled={collecting}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: collecting ? '#9ca3af' : 'linear-gradient(135deg,#4338ca,#4f46e5)', border: 'none', cursor: collecting ? 'not-allowed' : 'pointer' }}>
                {collecting ? 'Collecting...' : 'Collect Payment'}
              </button>
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
            <div className="flex items-center justify-between p-5 receipt-no-print" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <div style={{ fontSize: 15.5, fontWeight: 700, color: t.textPrimary }}>Payment Receipt</div>
              <button type="button" onClick={() => setReceiptModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary }}>
                <MdClose size={20} />
              </button>
            </div>
            <div className="p-5">
              {receiptModal.loading || !receiptModal.data ? (
                <p style={{ color: t.textSecondary, fontSize: 13.5 }}>{receiptModal.loading ? 'Loading receipt...' : 'Receipt not found.'}</p>
              ) : (
                <>
                  <div className="text-center mb-4">
                    <div style={{ fontSize: 17, fontWeight: 800, color: t.textPrimary }}>Dream Group CRM</div>
                    <div style={{ fontSize: 12, color: t.textSecondary }}>Payment Receipt</div>
                  </div>
                  <div className="rounded-xl p-4 mb-4" style={{ background: t.insetBg }}>
                    <div className="flex justify-between mb-1.5"><span style={{ fontSize: 12.5, color: t.textSecondary }}>Receipt No.</span><strong style={{ fontSize: 13, color: t.textPrimary }}>{receiptModal.data.transaction.receipt_number}</strong></div>
                    <div className="flex justify-between mb-1.5"><span style={{ fontSize: 12.5, color: t.textSecondary }}>Date</span><strong style={{ fontSize: 13, color: t.textPrimary }}>{formatDate(receiptModal.data.transaction.date || receiptModal.data.transaction.created_at)}</strong></div>
                    <div className="flex justify-between"><span style={{ fontSize: 12.5, color: t.textSecondary }}>Received By</span><strong style={{ fontSize: 13, color: t.textPrimary }}>{receiptModal.data.transaction.received_by || '—'}</strong></div>
                  </div>

                  <div className="mb-4">
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Customer</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>{receiptModal.data.customer.customer_name || '—'}</div>
                    <div style={{ fontSize: 12.5, color: t.textSecondary }}>{receiptModal.data.customer.customer_code}{receiptModal.data.customer.mobile_number ? ` · ${receiptModal.data.customer.mobile_number}` : ''}</div>
                    {/* Prefers real building/wing/flat names (the backend now
                        loads those relations — see paymentService.ts); falls
                        back to the raw id only if a relation didn't resolve
                        (e.g. a deleted building). */}
                    {(receiptModal.data.customer.building_id || receiptModal.data.customer.wing_id || receiptModal.data.customer.flat_id) && (
                      <div style={{ fontSize: 11.5, color: t.textSecondary }}>
                        {receiptModal.data.customer.building_id ? `${receiptModal.data.customer.building_name || `Building #${receiptModal.data.customer.building_id}`} ` : ''}
                        {receiptModal.data.customer.wing_id ? `· ${receiptModal.data.customer.wing_name ? `Wing ${receiptModal.data.customer.wing_name}` : `Wing #${receiptModal.data.customer.wing_id}`} ` : ''}
                        {receiptModal.data.customer.flat_id ? `· ${receiptModal.data.customer.flat_no ? `Flat ${receiptModal.data.customer.flat_no}` : `Flat #${receiptModal.data.customer.flat_id}`}` : ''}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl p-4 mb-4" style={{ background: isDark ? 'rgba(22,163,74,0.1)' : '#f0fdf4', border: `1px solid ${isDark ? 'rgba(22,163,74,0.25)' : '#bbf7d0'}` }}>
                    <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 2 }}>{paymentForLabel(receiptModal.data.transaction.payment_type)}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a' }}>₹ {receiptModal.data.transaction.amount.toLocaleString('en-IN')}</div>
                    {receiptModal.data.transaction.payment_type === 'EMIAmount' && receiptModal.data.emi_number > 0 && (
                      <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 4 }}>
                        EMI #{receiptModal.data.emi_number} of {receiptModal.data.total_emis} total ({receiptModal.data.paid_emis} paid, {receiptModal.data.future_emis} future)
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 mb-2">
                    {receiptModal.data.transaction.mode_of_payment && (
                      <div><span style={{ fontSize: 11.5, color: t.textSecondary }}>Mode of Payment</span><div style={{ fontSize: 13, color: t.textPrimary, fontWeight: 600 }}>{receiptModal.data.transaction.mode_of_payment}</div></div>
                    )}
                    {receiptModal.data.transaction.cheque_number && (
                      <div><span style={{ fontSize: 11.5, color: t.textSecondary }}>Cheque Number</span><div style={{ fontSize: 13, color: t.textPrimary, fontWeight: 600 }}>{receiptModal.data.transaction.cheque_number}</div></div>
                    )}
                    {receiptModal.data.transaction.clearance_date && (
                      <div><span style={{ fontSize: 11.5, color: t.textSecondary }}>Clearance Date</span><div style={{ fontSize: 13, color: t.textPrimary, fontWeight: 600 }}>{formatDate(receiptModal.data.transaction.clearance_date)}</div></div>
                    )}
                    {receiptModal.data.transaction.company && (
                      <div><span style={{ fontSize: 11.5, color: t.textSecondary }}>Company</span><div style={{ fontSize: 13, color: t.textPrimary, fontWeight: 600 }}>{receiptModal.data.transaction.company}</div></div>
                    )}
                    {receiptModal.data.transaction.payment_tag && (
                      <div><span style={{ fontSize: 11.5, color: t.textSecondary }}>Tag</span><div style={{ fontSize: 13, color: '#ea580c', fontWeight: 700 }}>{receiptModal.data.transaction.payment_tag}</div></div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-5 receipt-no-print" style={{ borderTop: `1px solid ${t.divider}` }}>
              <button type="button" onClick={() => setReceiptModal(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: t.surfaceBg, color: t.textPrimary, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer' }}>
                Close
              </button>
              <button type="button" onClick={() => window.print()} disabled={!receiptModal.data}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: !receiptModal.data ? '#9ca3af' : 'linear-gradient(135deg,#4338ca,#4f46e5)', border: 'none', cursor: !receiptModal.data ? 'not-allowed' : 'pointer' }}>
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
