// ==========================================
// DREAM GROUP CRM - PAYMENT UPCOMING PAGE
// ==========================================
// Dedicated page (V_22.0) split out of Payment Dues' old "Show Upcoming
// Payment" checkbox+result-box UI. Pick a date range and press OK (GET
// /payments/upcoming-amount for the grand total, GET /payments/upcoming-
// list-detailed for the per-installment rows) — nothing loads until then.
// Right at the top of the page (above the date-range card itself): one
// stat box per Payment For category (Monthly Installment / Booking / Pay
// After Booking / Possession / Booster Before / Booster After Possession
// — the same options the Add Payment Details "Payment For" dropdown
// offers), each summed from the unfiltered detailed list for the applied
// range so a glance at the top tells you exactly what's coming and how
// much. The date-range card itself keeps a single combined "Upcoming
// Amount" total box next to OK/Refresh, same as the original design
// before the per-category boxes existed — the category breakdown lives
// only in the top row now, not duplicated here. The table's own Payment
// For column shows the same category label (color-coded) plus the exact
// schedule line (e.g. "12th EMI") underneath, so each row's type is
// unambiguous at a glance. Below that: 3 client-side search fields over
// the fetched list — Customer ID/Name/Email/Mobile, Employee Name/Code,
// Building Name.
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { IconType } from 'react-icons';
import {
  MdUpcoming, MdRefresh, MdSearch, MdEvent, MdAccountBalanceWallet,
  MdReceiptLong, MdSchedule, MdVpnKey, MdPayments, MdStars, MdWorkspacePremium,
} from 'react-icons/md';

import { useAppDispatch } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { AppTheme } from '../../../../styles/theme';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import PaginationFooter from '../../../../components/common/PaginationFooter';
import StatCard from '../../../../components/masters/StatCard';
import { fetchUpcomingAmount, fetchUpcomingListDetailed } from '../../../../services/paymentUpcomingService';
import { PaymentForKey, UpcomingAmountData, UpcomingListDetailRow } from '../../../../types/paymentUpcoming';
import './PaymentUpcoming.css';

type Theme = AppTheme;

const rupee = (n: number): string => `₹${n.toLocaleString('en-IN')}`;

const todayYmd = (): string => new Date().toISOString().slice(0, 10);

interface StatBoxSpec { label: string; value: number; color: string; icon: IconType; }

// Friendly label + color per payment_for_key, reused by both the top
// category boxes and the table's own Payment For column badge.
const PAYMENT_FOR_KEY_META: Record<PaymentForKey, { label: string; color: string; icon: IconType }> = {
  EMIAmount: { label: 'Monthly Installment', color: '#2563eb', icon: MdPayments },
  BookingAmount: { label: 'Booking Amount', color: '#dc2626', icon: MdReceiptLong },
  PayAfterbooking: { label: 'Payment After Booking', color: '#ea580c', icon: MdSchedule },
  PossessionAmount: { label: 'Possession Amount', color: '#7c3aed', icon: MdVpnKey },
  AnnualAmount: { label: 'Booster Before Possession', color: '#16a34a', icon: MdStars },
  AnnualAmount1: { label: 'Booster After Possession', color: '#0d9488', icon: MdWorkspacePremium },
};

const PaymentUpcomingPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isDark, t, cssVars } = useAppearanceTokens();

  useEffect(() => { dispatch(setPageTitle('Payment Upcoming')); }, [dispatch]);

  // ── Date range + OK — identical shape/behaviour to the removed Payment
  // Dues checkbox: nothing loads until OK is pressed. ─────────────────────
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(todayYmd());
  const [applied, setApplied] = useState(false);
  const [loadingAmount, setLoadingAmount] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [amountResult, setAmountResult] = useState<UpcomingAmountData | null>(null);
  const [listRows, setListRows] = useState<UpcomingListDetailRow[]>([]);

  const rangeValid = !!fromDate && !!toDate && fromDate <= toDate;
  const rangeDays = rangeValid
    ? Math.round((new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86400000) + 1
    : 0;

  const handleApply = async () => {
    if (!rangeValid) {
      toast.error('Please select a valid From/To date range.');
      return;
    }
    setLoadingAmount(true);
    setLoadingList(true);
    try {
      const [amount, list] = await Promise.all([
        fetchUpcomingAmount(fromDate, toDate),
        fetchUpcomingListDetailed(fromDate, toDate),
      ]);
      setAmountResult(amount);
      setListRows(list.rows);
      setApplied(true);
    } catch {
      toast.error('Failed to load upcoming payments.');
    } finally {
      setLoadingAmount(false);
      setLoadingList(false);
    }
  };

  const handleRefresh = () => { if (applied) handleApply(); };

  // ── Per-category stat boxes — every "Payment For" option the Add
  // Payment Details dropdown offers, summed across the whole (unfiltered)
  // detailed list for the applied range, exactly like DueReportPage's own
  // boxSums does for Payment Dues. Extra Pay is not a schedule-generated
  // payment type (it's a manual advance-collection option on the Add
  // Payment form) so it can never appear here and has no box. The grand
  // Total is deliberately NOT one of these — it stays its own single box
  // next to the date range's OK/Refresh, unchanged from the original
  // design. ─────────────────────────────────────────────────────────────
  const PAYMENT_FOR_KEY_ORDER: PaymentForKey[] = ['EMIAmount', 'BookingAmount', 'PayAfterbooking', 'PossessionAmount', 'AnnualAmount', 'AnnualAmount1'];
  const boxSums = useMemo(() => {
    const sums: Record<PaymentForKey, number> = { EMIAmount: 0, BookingAmount: 0, PayAfterbooking: 0, PossessionAmount: 0, AnnualAmount: 0, AnnualAmount1: 0 };
    for (const r of listRows) sums[r.payment_for_key] += r.amount;
    return sums;
  }, [listRows]);

  const statBoxSpecs: StatBoxSpec[] = PAYMENT_FOR_KEY_ORDER.map((key) => ({
    label: PAYMENT_FOR_KEY_META[key].label,
    value: boxSums[key],
    color: PAYMENT_FOR_KEY_META[key].color,
    icon: PAYMENT_FOR_KEY_META[key].icon,
  }));

  // ── 3 search fields — client-side, same convention as DueReportPage's
  // own Payment For / Building / Employee filters over one fetched list.
  // Customer search additionally matches email/mobile (4 fields total). ──
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchEmployee, setSearchEmployee] = useState('');
  const [searchBuilding, setSearchBuilding] = useState('');

  const filteredRows = useMemo(() => {
    const c = searchCustomer.trim().toLowerCase();
    const e = searchEmployee.trim().toLowerCase();
    const b = searchBuilding.trim().toLowerCase();
    return listRows.filter((r) => {
      if (c && !(
        r.customer_name.toLowerCase().includes(c)
        || r.customer_code.toLowerCase().includes(c)
        || (r.email || '').toLowerCase().includes(c)
        || (r.mobile_number || '').toLowerCase().includes(c)
      )) return false;
      if (e && !(
        (r.assigned_employee_name || '').toLowerCase().includes(e)
        || (r.assigned_employee_code || '').toLowerCase().includes(e)
      )) return false;
      if (b && !(r.building_name || '').toLowerCase().includes(b)) return false;
      return true;
    });
  }, [listRows, searchCustomer, searchEmployee, searchBuilding]);

  // ── Client-side pagination over the filtered list. ───────────────────────
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  useEffect(() => { setPage(1); }, [searchCustomer, searchEmployee, searchBuilding, listRows]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / limit));
  const safePage = Math.min(page, totalPages);
  const from = filteredRows.length === 0 ? 0 : (safePage - 1) * limit + 1;
  const to = Math.min(safePage * limit, filteredRows.length);
  const pagedRows = useMemo(() => filteredRows.slice((safePage - 1) * limit, safePage * limit), [filteredRows, safePage, limit]);
  const pageBtns = () => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  };

  const fieldLabelStyle: React.CSSProperties = { display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 };
  const fieldInputStyle: React.CSSProperties = {
    width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText,
    borderRadius: 10, padding: '9px 10px', fontSize: 12, outline: 'none',
  };

  return (
    <div className="payment-upcoming-page" style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div className="payment-upcoming-header flex items-center gap-3 mb-5">
        <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 44, height: 44, background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff' }}>
          <MdUpcoming size={22} style={{ color: '#4f46e5' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 19.5, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Payment Upcoming</h1>
          <p style={{ fontSize: 11.5, color: t.textSecondary, margin: '2px 0 0' }}>Every not-yet-due installment in a chosen date range, per customer, so you can plan follow-ups</p>
        </div>
      </div>

      {/* ── Per-category stat boxes — every Payment For option, moved to
          the very top of the page so a glance tells you exactly what's
          coming and how much, before even looking at the table. Only
          meaningful once a range has been applied. ──────────────────────── */}
      {applied && (
        <div className="payment-upcoming-stat-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
          {statBoxSpecs.map((spec) => (
            <StatCard key={spec.label} label={spec.label} value={rupee(spec.value)} icon={spec.icon} color={spec.color}
              bg={isDark ? 'rgba(79,70,229,0.12)' : '#eef2ff'} loading={loadingAmount || loadingList} compact labelFontSize={11.5}
              surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
          ))}
        </div>
      )}

      {/* ── Date range + OK + single combined Total box — same look/
          behaviour as the original "Show Upcoming Payment" checkbox
          (before the per-category boxes existed). ──────────────────────── */}
      <div className="payment-upcoming-range-card rounded-2xl mb-5 p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="payment-upcoming-range-row flex items-end gap-3 flex-wrap">
          <div className="payment-upcoming-range-field">
            <label style={fieldLabelStyle}>From Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ ...fieldInputStyle, width: 160 }} />
          </div>
          <div className="payment-upcoming-range-field">
            <label style={fieldLabelStyle}>To Date</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ ...fieldInputStyle, width: 160 }} />
          </div>
          <button type="button" onClick={handleApply} disabled={loadingAmount || loadingList}
            className="payment-upcoming-ok-btn px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: (loadingAmount || loadingList) ? '#6b7280' : 'linear-gradient(135deg,#4f46e5,#6366f1)', border: 'none', cursor: (loadingAmount || loadingList) ? 'not-allowed' : 'pointer' }}>
            {(loadingAmount || loadingList) ? 'Loading...' : 'OK'}
          </button>
          {applied && (
            <button type="button" onClick={handleRefresh} title="Refresh"
              className="payment-upcoming-refresh-btn flex items-center justify-center rounded-xl"
              style={{ width: 40, height: 40, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer', flexShrink: 0 }}>
              <MdRefresh size={18} />
            </button>
          )}
          {applied && amountResult && (
            <div className="payment-upcoming-result-box" style={{ marginLeft: 'auto' }}>
              <StatCard
                label={`Upcoming Amount — ${rangeDays} Day${rangeDays === 1 ? '' : 's'}`}
                value={rupee(amountResult.total_amount)}
                icon={MdAccountBalanceWallet} color="#4f46e5"
                bg={isDark ? 'rgba(79,70,229,0.12)' : '#eef2ff'} loading={loadingAmount} compact labelFontSize={12.5}
                surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── 3 search fields — Customer ID/Name/Email/Mobile, Employee
          Name/Code, Building Name. Only meaningful once a range has been
          applied. ────────────────────────────────────────────────────── */}
      <div className="payment-upcoming-search-card rounded-2xl mb-5 p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="payment-upcoming-search-row grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="payment-upcoming-search-field relative">
            <MdSearch size={15} style={{ position: 'absolute', left: 10, top: 11, color: t.textSecondary, pointerEvents: 'none' }} />
            <input type="text" placeholder="Search by Customer ID, Name, Email or Mobile" value={searchCustomer} onChange={(e) => setSearchCustomer(e.target.value)}
              style={{ ...fieldInputStyle, paddingLeft: 30 }} disabled={!applied} />
          </div>
          <div className="payment-upcoming-search-field relative">
            <MdSearch size={15} style={{ position: 'absolute', left: 10, top: 11, color: t.textSecondary, pointerEvents: 'none' }} />
            <input type="text" placeholder="Search by Employee Name or Code" value={searchEmployee} onChange={(e) => setSearchEmployee(e.target.value)}
              style={{ ...fieldInputStyle, paddingLeft: 30 }} disabled={!applied} />
          </div>
          <div className="payment-upcoming-search-field relative">
            <MdSearch size={15} style={{ position: 'absolute', left: 10, top: 11, color: t.textSecondary, pointerEvents: 'none' }} />
            <input type="text" placeholder="Search by Building Name" value={searchBuilding} onChange={(e) => setSearchBuilding(e.target.value)}
              style={{ ...fieldInputStyle, paddingLeft: 30 }} disabled={!applied} />
          </div>
        </div>
      </div>

      {/* ── Upcoming payments table — empty by default, populated only
          after the date filter (OK) has been applied. ──────────────────── */}
      <div className="payment-upcoming-table-card rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="payment-upcoming-table-scroll" style={{ overflowX: 'auto' }}>
          <table className="payment-upcoming-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1400 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                {['Customer', 'Assigned Employee', 'Company / Project / Location', 'Building / Wing / Flat', 'Contact (Email / Mobile)', 'Payment For', 'Due Date', 'Amount', 'Status'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!applied ? (
                <tr><td colSpan={9} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>
                  Select a date range above and press OK to view upcoming payments.
                </td></tr>
              ) : loadingList ? (
                <tr><td colSpan={9} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading upcoming payments...</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>
                  {listRows.length === 0 ? 'No upcoming payments in the selected date range.' : 'No upcoming payments match the selected search.'}
                </td></tr>
              ) : (
                pagedRows.map((r, i) => (
                  <tr key={`${r.customer_id}-${r.due_date}-${r.payment_for}-${i}`} style={{ borderTop: `1px solid ${t.divider}` }}>
                    <td style={{ padding: '12px 14px', fontSize: 12.5, color: '#000', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>{r.customer_name}</div>
                      <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 1 }}>{r.customer_code}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: '#000', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>{r.assigned_employee_name || '—'}</div>
                      {r.assigned_employee_code && (
                        <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 1 }}>{r.assigned_employee_code}</div>
                      )}
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
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: '#000', whiteSpace: 'nowrap' }}>
                      <div className="flex items-center gap-1.5">
                        <MdEvent size={13} style={{ color: t.textSecondary }} />
                        {new Date(r.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 700, color: '#000', whiteSpace: 'nowrap' }}>{rupee(r.amount)}</td>
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                        fontSize: 10.5, fontWeight: 700, color: '#fff', background: '#4f46e5',
                      }}>
                        Upcoming
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {applied && filteredRows.length > 0 && (
          <PaginationFooter t={t} limit={limit} setLimit={setLimit} setPage={setPage} safePage={safePage} totalPages={totalPages} from={from} to={to} total={filteredRows.length} pageBtns={pageBtns} />
        )}
      </div>
    </div>
  );
};

export default PaymentUpcomingPage;
