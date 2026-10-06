// ==========================================
// DREAM GROUP CRM - REFUND DETAILS PAGE
// ==========================================
// Opened from Cancelled Booking's "Refund Details" button. Every refund
// actually given to a cancelled customer (approved — an admin's refund is
// approved on entry, an employee's once an admin approves it), date-wise:
// each refund date shows how much was refunded that day, then its refunds,
// with the cancelled receipt to view / download.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/utils/toast';
import {
  MdArrowBack, MdAssignmentReturn, MdClose, MdDownload, MdRefresh, MdSearch, MdVisibility, MdCurrencyRupee, MdEvent,
} from 'react-icons/md';

import { useAppDispatch } from '../../../../hooks';
import { useRoleBasePath } from '../../../../hooks/useRoleBasePath';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import StatCard from '../../../../components/masters/StatCard';
import { PaymentReceiptViewModal } from '../../../../components/common/PaymentReceiptViewModal';
import { fetchGivenRefunds, fetchCancelledReceipt, GivenRefundRow } from '../../../../services/customerDetailsService';
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
  const [rows, setRows] = useState<GivenRefundRow[]>([]);
  const [totalRefunded, setTotalRefunded] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchGivenRefunds({ date_from: dateFrom || undefined, date_to: dateTo || undefined, search });
      setRows(res.rows); setTotalRefunded(res.total_refunded);
    } catch (e) {
      toast.error(errMessage(e, 'Failed to load refund details.'));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, search]);
  // Search is typed, so wait for a pause before asking the server.
  useEffect(() => { const id = setTimeout(load, 300); return () => clearTimeout(id); }, [load]);

  const anyFilter = !!(search || dateFrom || dateTo);
  const clearFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); };

  // Date-wise: one group per refund date (newest first) with that day's total.
  const byDate = useMemo(() => {
    const groups = new Map<string, GivenRefundRow[]>();
    for (const r of rows) {
      const day = String(r.refund_date).slice(0, 10);
      const list = groups.get(day);
      if (list) list.push(r); else groups.set(day, [r]);
    }
    return Array.from(groups.entries());
  }, [rows]);

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
  const headers = ['Cancelled Receipt No.', 'Refund Date', 'Customer', 'Building / Wing / Flat', 'Phone Number', 'Refunded Amount', 'Processed By Employee', 'Approved By'];

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <StatCard label="Total Refunded" value={rupee(totalRefunded)} icon={MdCurrencyRupee} color="#16a34a" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Number of Refunds" value={rows.length} icon={MdAssignmentReturn} color="#0369a1" bg="" loading={loading}
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
                  {anyFilter ? 'No refunds match the selected filters.' : 'No refunds have been given yet.'}
                </td></tr>
              ) : byDate.map(([day, list]) => (
                <React.Fragment key={day}>
                  {/* Date-wise subtotal: how much was refunded that day. */}
                  <tr style={{ background: t.insetBg }}>
                    <td colSpan={headers.length} style={{ padding: '8px 12px', fontSize: 12, fontWeight: 800, color: t.textPrimary }}>
                      <span className="inline-flex items-center gap-1.5"><MdEvent size={15} style={{ color: 'var(--brand-ink)' }} /> {formatDate(day)}</span>
                      <span style={{ marginLeft: 12, color: t.textSecondary, fontWeight: 600 }}>{list.length} refund{list.length === 1 ? '' : 's'}</span>
                      <span style={{ marginLeft: 12, color: '#16a34a' }}>{rupee(list.reduce((s, r) => s + r.refunded_amount, 0))}</span>
                    </td>
                  </tr>
                  {list.map((r) => (
                    <tr key={r.id} className="master-table-row-hover" style={{ borderTop: `1px solid ${t.divider}` }}>
                      <td style={td}>
                        <span className="inline-flex items-center gap-1.5">
                          <span style={{ fontWeight: 700, color: 'var(--brand-ink)' }}>{r.receipt_number || '—'}</span>
                          <button type="button" className="master-icon-btn" title="View Cancelled Receipt" aria-label="View Cancelled Receipt" onClick={() => viewReceipt(r.id)}>
                            <MdVisibility size={14} />
                          </button>
                          <button type="button" className="master-icon-btn" title="Download Cancelled Receipt" aria-label="Download Cancelled Receipt" onClick={() => downloadReceipt(r.id)}>
                            <MdDownload size={14} />
                          </button>
                        </span>
                      </td>
                      <td style={td}>{formatDate(r.refund_date)}</td>
                      <td style={td}>
                        <div style={{ fontWeight: 600 }}>{r.customer_name}</div>
                        <div style={{ fontSize: 10.5, color: t.textSecondary }}>{r.customer_code || '—'}</div>
                      </td>
                      <td style={td}>{unitText(r)}</td>
                      <td style={td}>{r.mobile_number || '—'}</td>
                      <td style={{ ...td, fontWeight: 800, color: '#16a34a' }}>{rupee(r.refunded_amount)}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{r.created_by_name || '—'}</td>
                      <td style={td}>{r.approved_by_name || '—'}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
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
