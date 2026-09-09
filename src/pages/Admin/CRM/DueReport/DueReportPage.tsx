// ==========================================
// DREAM GROUP CRM - PAYMENT DUES PAGE
// ==========================================
// Rebuilt per item 15: pick a customer, see their EMI Schedule re-dated
// against today as a per-installment grid — Red (already due), Orange
// (upcoming), Green (paid) — with an inline "Add Payment" action per row
// (and a general one) that posts through the EXISTING, already-battle-
// tested POST /api/payments (collectPayment) — none of that carry-forward
// math is touched here, this page only reads a new view of it
// (payment.service.ts's getCustomerDueGrid) and writes through the same
// endpoint the rest of the app already uses.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  MdPayments, MdRefresh, MdAdd, MdClose, MdCheckCircle, MdSchedule, MdErrorOutline, MdKeyboardArrowDown,
} from 'react-icons/md';

import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { AppTheme } from '../../../../styles/theme';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import StatCard from '../../../../components/masters/StatCard';
import {
  fetchCustomerDueGrid, collectPayment, fetchDefaultAmount, PAYMENT_FOR_OPTIONS, DueGridRow, CustomerDueGrid,
} from '../../../../services/paymentService';
import { fetchAllCustomerDetails } from '../../../../services/customerDetailsService';
import { companyService } from '../../../../services/companyService';
import { Customer, Company, PaymentFor, CollectPaymentPayload } from '../../../../types/index';
import { formatDate } from '../../../../utils';

type Theme = AppTheme;

// ── Small local searchable dropdown — same "type to filter, click to
// pick" shape as the one on the Customer List/CRUD pages, kept local
// since this page's two pickers (Customer, Company) are its only users. ──
const SearchableSelect: React.FC<{
  t: Theme; placeholder: string; options: string[]; value: string; onChange: (v: string) => void; disabled?: boolean;
}> = ({ t, placeholder, options, value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter((o) => o?.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: disabled ? t.insetBg : t.inputBg, border: `1px solid ${t.inputBorder}`, cursor: disabled ? 'not-allowed' : 'text' }}
        onClick={() => !disabled && setOpen(true)}>
        <input type="text" placeholder={placeholder} value={query} disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 12, width: '100%' }} />
        {value && !disabled && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(''); setQuery(''); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 0, display: 'flex', flexShrink: 0 }}>
            <MdClose size={15} />
          </button>
        )}
        <MdKeyboardArrowDown size={16} style={{ color: t.textSecondary, flexShrink: 0 }} />
      </div>
      {open && !disabled && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 30, maxHeight: 240, overflowY: 'auto', background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '4px 0' }}>
          {filtered.slice(0, 50).map((opt) => (
            <button key={opt} type="button" onClick={() => { onChange(opt); setQuery(opt); setOpen(false); }}
              className="w-full text-left px-3.5 py-2 text-sm" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textPrimary, fontFamily: t.fontFamily }}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  paid: { label: 'Paid', color: '#16a34a', bg: '#dcfce7', icon: MdCheckCircle },
  due: { label: 'Due', color: '#dc2626', bg: '#fee2e2', icon: MdErrorOutline },
  upcoming: { label: 'Upcoming', color: '#ea580c', bg: '#ffedd5', icon: MdSchedule },
};
const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const m = STATUS_META[status] ?? STATUS_META.upcoming;
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold" style={{ background: m.bg, color: m.color, fontSize: 11 }}>
      <Icon size={13} /> {m.label}
    </span>
  );
};

const rupee = (n: number): string => `₹ ${n.toLocaleString('en-IN')}`;

// Indian comma grouping while typing — same pattern as
// CustomerDetailsCrudPage.tsx's/EmployeeDetailsCrudPage.tsx's own
// formatAmountDisplay, applied here to the Collect Payment amount field
// (a plain numeric string in this page's state, same as those).
const formatAmountDisplay = (v: string): string => {
  if (!v) return '';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : v;
};

const DueReportPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isDark, t, cssVars } = useAppearanceTokens();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const [grid, setGrid] = useState<CustomerDueGrid | null>(null);
  const [loadingGrid, setLoadingGrid] = useState(false);

  useEffect(() => { dispatch(setPageTitle('Payment Dues')); }, [dispatch]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchAllCustomerDetails(1, 1000);
        if (res.success) setCustomers(res.rows ?? []);
      } catch { /* picker just stays empty if this fails */ }
    })();
    (async () => {
      try {
        const res = await companyService.FetchCompanyList(1, 1000);
        if (res.success) setCompanies(res.rows ?? []);
      } catch { /* company dropdown just stays empty if this fails */ }
    })();
  }, []);

  const customerOptions = useMemo(
    () => customers.map((c) => `${c.customer_name}${c.customer_code ? ` (${c.customer_code})` : ''}`),
    [customers]
  );
  const companyNameOptions = useMemo(() => Array.from(new Set(companies.map((c) => c.name))), [companies]);

  const handleCustomerSearchChange = (v: string) => {
    setCustomerSearch(v);
    const exact = customers.find((c) => `${c.customer_name}${c.customer_code ? ` (${c.customer_code})` : ''}` === v);
    setSelectedCustomerId(exact ? exact.id : null);
  };

  const fetchGrid = useCallback(async () => {
    if (!selectedCustomerId) { setGrid(null); return; }
    setLoadingGrid(true);
    try {
      const data = await fetchCustomerDueGrid(selectedCustomerId);
      setGrid(data);
    } catch {
      toast.error('Failed to load payment dues for this customer.');
      setGrid(null);
    } finally {
      setLoadingGrid(false);
    }
  }, [selectedCustomerId]);

  useEffect(() => { fetchGrid(); }, [fetchGrid]);

  // Header counts — reactive to the currently-displayed grid, not a
  // separate global tally (item 15's "header counts reactive to grid
  // values").
  const counts = useMemo(() => {
    const rows = grid?.rows ?? [];
    return {
      total: rows.length,
      due: rows.filter((r) => r.status === 'due').length,
      upcoming: rows.filter((r) => r.status === 'upcoming').length,
      paid: rows.filter((r) => r.status === 'paid').length,
    };
  }, [grid]);

  // ── Add Payment modal ────────────────────────────────────────────────
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [apPaymentFor, setApPaymentFor] = useState<PaymentFor>('EMIAmount');
  const [apInstDate, setApInstDate] = useState('');
  const [apAmount, setApAmount] = useState('');
  const [apModeOfPayment, setApModeOfPayment] = useState('');
  const [apChequeNumber, setApChequeNumber] = useState('');
  const [apClearanceDate, setApClearanceDate] = useState('');
  const [apCompany, setApCompany] = useState('');
  const [apMaintenance, setApMaintenance] = useState('');
  const [apIsAdvancePay, setApIsAdvancePay] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Smart suggester (GET .../default-amount) — phase-aware default
  // amount + next due date per payment type, plus whether maintenance is
  // currently collectible. A row click already carries a perfectly good
  // amount/date (it's a specific due-grid row the user picked, which may
  // not even be the "first due" one this endpoint would suggest), so this
  // is only used to PREFILL when there's no row to go on (the general "Add
  // Payment" button, or after switching "Payment For" mid-form) — never to
  // silently override an explicit row selection. show_maintenance is
  // always refreshed either way, since neither a row nor the old value
  // says anything about eligibility for the newly-selected type. ─────────
  const [apShowMaintenance, setApShowMaintenance] = useState(true);
  const [apSuggestLoading, setApSuggestLoading] = useState(false);

  const applySuggestion = useCallback(async (customerId: number, paymentFor: PaymentFor, prefill: boolean) => {
    setApSuggestLoading(true);
    try {
      const suggestion = await fetchDefaultAmount(customerId, paymentFor);
      setApShowMaintenance(suggestion.show_maintenance);
      if (prefill) {
        setApAmount(suggestion.amount > 0 ? String(suggestion.amount) : '');
        setApInstDate(suggestion.date ?? '');
      }
    } catch {
      // A convenience prefill, not a required field — leave whatever the
      // user already has (or the row-provided values) untouched on failure.
    } finally {
      setApSuggestLoading(false);
    }
  }, []);

  const openAddPayment = (row?: DueGridRow) => {
    const paymentFor = row?.payment_for ?? 'EMIAmount';
    setApPaymentFor(paymentFor);
    setApInstDate(row?.date ?? '');
    setApAmount(row && row.amount > 0 ? String(row.amount) : '');
    setApModeOfPayment('');
    setApChequeNumber('');
    setApClearanceDate('');
    setApCompany(grid?.company_name ?? ''); // item 15: company pre-selected
    setApMaintenance('');
    setApIsAdvancePay(false);
    setAddPaymentOpen(true);
    if (grid) applySuggestion(grid.customer_id, paymentFor, !row);
  };

  const handlePaymentForChange = (newType: PaymentFor) => {
    setApPaymentFor(newType);
    if (grid) applySuggestion(grid.customer_id, newType, true);
  };

  const handleSubmitPayment = async () => {
    if (!grid) return;
    const amountNum = Number(apAmount);
    if (!apAmount.trim() || Number.isNaN(amountNum) || amountNum <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: CollectPaymentPayload = {
        customer_id: grid.customer_id,
        amount: amountNum,
        payment_for: apPaymentFor,
        inst_date: apInstDate || undefined,
        cheque_number: apChequeNumber.trim() || undefined,
        clearance_date: apClearanceDate || undefined,
        company: apCompany.trim() || undefined,
        mode_of_payment: apModeOfPayment.trim() || undefined,
        maintenance: apMaintenance.trim() ? Number(apMaintenance) : undefined,
        is_advance_pay: apPaymentFor === 'EMIAmount' ? apIsAdvancePay : undefined,
      };
      const res = await collectPayment(payload);
      toast.success(`${res.message}${res.receiptNumber ? ` — Receipt #${res.receiptNumber}` : ''}`);
      setAddPaymentOpen(false);
      fetchGrid();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 44, height: 44, background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff' }}>
          <MdPayments size={22} style={{ color: '#4f46e5' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 19.5, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Payment Dues</h1>
          <p style={{ fontSize: 11.5, color: t.textSecondary, margin: '2px 0 0' }}>Pick a customer to see their full installment schedule, color-coded by due status</p>
        </div>
      </div>

      <div className="rounded-2xl mb-5 p-5" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 }}>Customer</label>
        <div style={{ maxWidth: 420 }}>
          <SearchableSelect t={t} placeholder="Select or type customer name" options={customerOptions} value={customerSearch} onChange={handleCustomerSearchChange} />
        </div>
      </div>

      {!selectedCustomerId ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, color: t.textSecondary, fontSize: 13 }}>
          Select a customer above to view their payment dues.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <StatCard label="Total Installments" value={counts.total} icon={MdPayments} color="#7c3aed" bg="" loading={loadingGrid}
              surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
            <StatCard label="Already Due" value={counts.due} icon={MdErrorOutline} color="#dc2626" bg="" loading={loadingGrid}
              surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
            <StatCard label="Upcoming" value={counts.upcoming} icon={MdSchedule} color="#ea580c" bg="" loading={loadingGrid}
              surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
            <StatCard label="Paid" value={counts.paid} icon={MdCheckCircle} color="#16a34a" bg="" loading={loadingGrid}
              surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
          </div>

          <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
            <div className="flex flex-wrap items-center justify-between gap-3 p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: t.textPrimary }}>{grid?.customer_name || 'Customer'}</div>
                <div style={{ fontSize: 11, color: t.textSecondary }}>{grid?.company_name || 'No company set'}</div>
              </div>
              <div className="flex items-center gap-2.5">
                <button type="button" onClick={() => openAddPayment()}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'var(--grad-purple)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <MdAdd size={18} /> Add Payment
                </button>
                <button type="button" onClick={fetchGrid} title="Refresh"
                  className="flex items-center justify-center rounded-xl"
                  style={{ width: 40, height: 40, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
                  <MdRefresh size={18} />
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                <thead>
                  <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                    {['#', 'Installment', 'Due Date', 'Amount', 'Status', 'Action'].map((h) => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingGrid ? (
                    <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading dues...</td></tr>
                  ) : !grid || grid.rows.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>No scheduled installments for this customer.</td></tr>
                  ) : (
                    grid.rows.map((r) => (
                      <tr key={r.sr} style={{ borderTop: `1px solid ${t.divider}` }}>
                        <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary }}>{r.sr}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 600, color: t.textPrimary }}>{r.label}</td>
                        <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.date ? formatDate(r.date) : '—'}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap' }}>{rupee(r.amount)}</td>
                        <td style={{ padding: '12px 14px' }}><StatusPill status={r.status} /></td>
                        <td style={{ padding: '12px 14px' }}>
                          {r.status !== 'paid' && r.payment_for ? (
                            <button type="button" onClick={() => openAddPayment(r)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: '#7c3aed', cursor: 'pointer' }}>
                              <MdAdd size={13} /> Add Payment
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: t.textSecondary }}>{r.payment_for ? '—' : 'Not individually collectible'}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {addPaymentOpen && grid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setAddPaymentOpen(false)}>
          <div className="rounded-2xl w-full" style={{ maxWidth: 480, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, maxHeight: '88vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: t.textPrimary }}>Add Payment</div>
                <div style={{ fontSize: 11, color: t.textSecondary }}>{grid.customer_name}</div>
              </div>
              <button type="button" onClick={() => setAddPaymentOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 4, display: 'flex' }}>
                <MdClose size={20} />
              </button>
            </div>
            <div className="p-5 space-y-3.5">
              {/* Item 15: "Payment for" BEFORE Installment date — sometimes
                  the installment date differs from the schedule's own
                  dates, so this order matters. */}
              <div>
                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 }}>Payment For</label>
                <select value={apPaymentFor} onChange={(e) => handlePaymentForChange(e.target.value as PaymentFor)}
                  style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 10px', fontSize: 12, outline: 'none' }}>
                  {PAYMENT_FOR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  Installment Date{apSuggestLoading ? ' (suggesting...)' : ''}
                </label>
                <input type="date" value={apInstDate} onChange={(e) => setApInstDate(e.target.value)}
                  style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '8px 10px', fontSize: 12, outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  Amount (₹) *{apSuggestLoading ? ' (suggesting...)' : ''}
                </label>
                <input type="text" inputMode="numeric" value={formatAmountDisplay(apAmount)} onChange={(e) => setApAmount(e.target.value.replace(/[^\d]/g, ''))} placeholder="Enter amount"
                  style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 10px', fontSize: 12, outline: 'none' }} />
              </div>
              {apPaymentFor === 'EMIAmount' && (
                <label className="flex items-center gap-2" style={{ fontSize: 12, color: t.textPrimary, cursor: 'pointer' }}>
                  <input type="checkbox" checked={apIsAdvancePay} onChange={(e) => setApIsAdvancePay(e.target.checked)} />
                  Advance pay (applies toward future EMIs)
                </label>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 }}>Mode of Payment</label>
                  <input type="text" value={apModeOfPayment} onChange={(e) => setApModeOfPayment(e.target.value)} placeholder="Cash / Cheque / UPI..."
                    style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 10px', fontSize: 12, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 }}>Cheque Number</label>
                  <input type="text" value={apChequeNumber} onChange={(e) => setApChequeNumber(e.target.value)} placeholder="Optional"
                    style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 10px', fontSize: 12, outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 }}>Clearance Date</label>
                <input type="date" value={apClearanceDate} onChange={(e) => setApClearanceDate(e.target.value)}
                  style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '8px 10px', fontSize: 12, outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 }}>Company</label>
                <SearchableSelect t={t} placeholder="Select company" options={companyNameOptions} value={apCompany} onChange={setApCompany} />
              </div>
              {/* Maintenance is only collectible once every pre-possession EMI is
                  fully paid — apShowMaintenance comes from the same suggester
                  fetch above (getDefaultAmount's maintenance-eligibility flag). */}
              {apShowMaintenance ? (
                <div>
                  <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 }}>Maintenance (₹)</label>
                  <input type="text" inputMode="numeric" value={formatAmountDisplay(apMaintenance)} onChange={(e) => setApMaintenance(e.target.value.replace(/[^\d]/g, ''))} placeholder="Optional"
                    style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 10px', fontSize: 12, outline: 'none' }} />
                </div>
              ) : (
                <div style={{ fontSize: 11, color: t.textSecondary, background: t.insetBg, borderRadius: 10, padding: '8px 10px' }}>
                  Maintenance becomes collectible once all pre-possession EMIs are paid.
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-5" style={{ borderTop: `1px solid ${t.divider}` }}>
              <button type="button" onClick={() => setAddPaymentOpen(false)} disabled={submitting}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" onClick={handleSubmitPayment} disabled={submitting}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'var(--grad-purple)', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.8 : 1 }}>
                {submitting ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DueReportPage;
