// ==========================================
// DREAM GROUP CRM - REFUND DETAILS PAGE
// ==========================================
// Opened from Cancelled Booking's "Refund Details" button. V_25.0 — laid out
// like Payment Received: summary boxes, filters (search, dates, status) and
// one row per refund with its status, customer, flat, amount, date, mode and
// who processed / approved it. Approved refunds have their cancelled
// receipt to view / download. Same refund records and approval rules — this
// page only reads them.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/utils/toast';
import {
  MdArrowBack, MdAssignmentReturn, MdClose, MdDownload, MdRefresh, MdSearch, MdVisibility, MdCurrencyRupee, MdHourglassEmpty, MdPeople,
} from 'react-icons/md';

import { useAppDispatch } from '../../../../hooks';
import { useRoleBasePath } from '../../../../hooks/useRoleBasePath';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import StatCard from '../../../../components/masters/StatCard';
import { PaymentReceiptViewModal } from '../../../../components/common/PaymentReceiptViewModal';
import { fetchGivenRefunds, fetchCancelledReceipt, GivenRefundRow, GivenRefundsResult } from '../../../../services/customerDetailsService';
import { exportPaymentReceiptPdf } from '../Customer-Details/paymentPdfExport.lazy';
import { PaymentReceipt } from '../../../../types';
import { formatDate } from '../../../../utils';
import DateInput from '../../../../components/common/DateInput';

const rupee = (n: number): string => `₹${(n || 0).toLocaleString('en-IN')}`;
const unitText = (r: GivenRefundRow): string => r.shop_no
  ? `${r.building_name || '—'} - Shop ${r.shop_no}`
  : [r.building_name, r.wing_name ? `${r.wing_name} Wing` : '', r.flat_no ? `Flat ${r.flat_no}` : ''].filter(Boolean).join(' - ') || '—';
const errMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const RefundDetailsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const paths = useRoleBasePath();
  const { t, cssVars } = useAppearanceTokens();
  useEffect(() => { dispatch(setPageTitle('Refund Details')); }, [dispatch]);

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [rows, setRows] = useState<GivenRefundRow[]>([]);
  const [summary, setSummary] = useState<Omit<GivenRefundsResult, 'rows'> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { rows: list, ...totals } = await fetchGivenRefunds({ date_from: dateFrom || undefined, date_to: dateTo || undefined, search, status });
      setRows(list); setSummary(totals);
    } catch (e) {
      toast.error(errMessage(e, 'Failed to load refund details.'));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, search, status]);
  // Search is typed, so wait for a pause before asking the server.
  useEffect(() => { const id = setTimeout(load, 300); return () => clearTimeout(id); }, [load]);

  const anyFilter = !!(search || dateFrom || dateTo || status !== 'all');
  const clearFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); setStatus('all'); };
  const customersRefunded = useMemo(
    () => new Set(rows.filter((r) => r.status === 'approved').map((r) => r.customer_id)).size, [rows]);
  const STATUS_CHIP: Record<string, { label: string; bg: string }> = {
    approved: { label: 'Approved', bg: '#15803d' },
    pending: { label: 'Pending Approval', bg: '#b45309' },
    rejected: { label: 'Rejected', bg: '#b91c1c' },
  };

  const [receiptView, setReceiptView] = useState<PaymentReceipt | null>(null);
  const viewReceipt = async (id: string) => {
    try { setReceiptView(await fetchCancelledReceipt(id)); } catch (e) { toast.error(errMessage(e, 'Failed to load the cancelled receipt.')); }
  };
  const downloadReceipt = async (id: string, loaded?: PaymentReceipt) => {
    try { await exportPaymentReceiptPdf(loaded ?? await fetchCancelledReceipt(id), 'cancelled'); } catch (e) { toast.error(errMessage(e, 'Failed to download the cancelled receipt.')); }
  };

  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 };
  const inputStyle: React.CSSProperties = { width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 10px', fontSize: 12, outline: 'none', height: 38 };
  const td: React.CSSProperties = { padding: '9px 12px', fontSize: 11.5, color: t.textPrimary, whiteSpace: 'nowrap' };
  const headers = ['Actions', 'Status', 'Cancelled Receipt No.', 'Customer', 'Building / Wing / Flat', 'Phone Number', 'Refund Amount', 'Refund Date', 'Mode', 'Processed By', 'Approved By'];

  return (
    <div style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div className="flex items-center gap-2 mb-3">
        <button type="button" onClick={() => navigate(paths.cancelledBooking)} title="Back to Cancelled Booking" aria-label="Back to Cancelled Booking"
          className="flex items-center justify-center rounded-lg" style={{ width: 30, height: 30, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
          <MdArrowBack size={17} />
        </button>
        <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 30, height: 30, background: 'rgba(22,163,74,0.12)' }}>
          <MdAssignmentReturn size={17} style={{ color: '#16a34a' }} />
        </div>
        <h1 style={{ fontSize: 16, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Refund Details</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Refunded (Approved)" value={rupee(summary?.total_refunded ?? 0)} icon={MdCurrencyRupee} color="#15803d" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Pending Approval" value={`${rupee(summary?.pending_amount ?? 0)} · ${summary?.pending_count ?? 0}`} icon={MdHourglassEmpty} color="#b45309" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Number of Refunds" value={rows.length} icon={MdAssignmentReturn} color="#0369a1" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Customers Refunded" value={customersRefunded} icon={MdPeople} color="#7c3aed" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
      </div>

      <div className="rounded-2xl mb-4 p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex items-end flex-wrap gap-3">
          <div style={{ width: 260, maxWidth: '100%' }}>
            <label style={labelStyle}>Search</label>
            <div className="relative">
              <MdSearch size={15} style={{ position: 'absolute', left: 10, top: 12, color: t.textSecondary, pointerEvents: 'none' }} />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Customer, receipt, building, flat"
                style={{ ...inputStyle, paddingLeft: 30 }} />
            </div>
          </div>
          <div style={{ width: 160 }}>
            <label style={labelStyle}>From Date</label>
            <DateInput t={t} value={dateFrom} onChange={setDateFrom} max={dateTo || undefined} />
          </div>
          <div style={{ width: 160 }}>
            <label style={labelStyle}>To Date</label>
            <DateInput t={t} value={dateTo} onChange={setDateTo} min={dateFrom || undefined} />
          </div>
          <div style={{ width: 170 }}>
            <label style={labelStyle}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} style={inputStyle} aria-label="Refund status">
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending Approval</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <button type="button" onClick={clearFilters} disabled={!anyFilter} title="Clear Filters" aria-label="Clear Filters"
            className="flex items-center justify-center rounded-full"
            style={{ width: 36, height: 36, background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: anyFilter ? 'pointer' : 'not-allowed', opacity: anyFilter ? 1 : 0.45 }}>
            <MdClose size={17} />
          </button>
          <button type="button" onClick={load} title="Refresh" aria-label="Refresh" className="flex items-center justify-center rounded-xl"
            style={{ width: 40, height: 38, background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: 'auto' }}>
            <MdRefresh size={18} />
          </button>
        </div>
      </div>

      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="master-table-scroll">
          <table className="master-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
            <thead>
              <tr className="master-table-header-gradient">
                {headers.map((h) => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={headers.length} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading refunds...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={headers.length} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>
                  {anyFilter ? 'No refunds match the selected filters.' : 'No refunds have been recorded yet.'}
                </td></tr>
              ) : rows.map((r) => {
                const chip = STATUS_CHIP[r.status ?? 'approved'] ?? STATUS_CHIP.approved;
                const hasReceipt = r.status !== 'pending' && r.status !== 'rejected' && !!r.receipt_number;
                return (
                  <tr key={r.id} className="master-table-row-hover" style={{ borderTop: `1px solid ${t.divider}` }}>
                    <td style={td}>
                      <span className="inline-flex items-center gap-1.5">
                        <button type="button" className="master-icon-btn" disabled={!hasReceipt} title={hasReceipt ? 'View Cancelled Receipt' : 'Receipt after approval'}
                          aria-label="View Cancelled Receipt" onClick={() => hasReceipt && viewReceipt(r.id)} style={{ opacity: hasReceipt ? 1 : 0.4 }}>
                          <MdVisibility size={14} />
                        </button>
                        <button type="button" className="master-icon-btn" disabled={!hasReceipt} title={hasReceipt ? 'Download Cancelled Receipt' : 'Receipt after approval'}
                          aria-label="Download Cancelled Receipt" onClick={() => hasReceipt && downloadReceipt(r.id)} style={{ opacity: hasReceipt ? 1 : 0.4 }}>
                          <MdDownload size={14} />
                        </button>
                      </span>
                    </td>
                    <td style={td}>
                      <span className="inline-flex items-center px-2 py-1 rounded-md font-semibold" style={{ background: chip.bg, color: '#fff', fontSize: 10.5 }}>{chip.label}</span>
                    </td>
                    <td style={{ ...td, fontWeight: 700, color: 'var(--brand-ink)' }}>{r.receipt_number || '—'}</td>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{r.customer_name}</div>
                      <div style={{ fontSize: 10.5, color: t.textSecondary }}>{r.customer_code || '—'}</div>
                    </td>
                    <td style={td}>{unitText(r)}</td>
                    <td style={td}>{r.mobile_number || '—'}</td>
                    <td style={{ ...td, fontWeight: 800 }}>{rupee(r.refunded_amount)}</td>
                    <td style={td}>{formatDate(r.refund_date)}</td>
                    <td style={td}>{r.mode_of_payment || '—'}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{r.created_by_name || '—'}</td>
                    <td style={td}>{r.approved_by_name || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {receiptView && (
        <PaymentReceiptViewModal data={receiptView} variant="cancelled" onClose={() => setReceiptView(null)}
          onDownload={() => downloadReceipt(receiptView.transaction.id, receiptView)} />
      )}
    </div>
  );
};

export default RefundDetailsPage;
