// ==========================================
// DREAM GROUP CRM - CANCELLED BOOKING PAGE
// ==========================================
// V_23.0 — a customer whose booking is cancelled (via the Customer list's
// admin-only "Cancel Booking" three-dot action, see CustomerDetailsListPage
// and customer.service.ts's cancelCustomerBooking) lands here instead of
// the active Customer list. Nothing about that customer's row, booking,
// payments, or receipts is ever deleted — is_customer_deleted is purely a
// visibility flag (see Customer.entity.ts's own comment) — so every one of
// this page's two accordions reads real, complete history: month-wise
// payments via the same GET /payments/customer/:id the active Customer
// list's own payment-history view uses, and the refund ledger via the new
// GET/POST /customers/:id/refunds this module added.
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from '@/utils/toast';
import { MdEventBusy, MdSearch, MdClose, MdExpandMore, MdExpandLess, MdReceiptLong, MdCurrencyRupee } from 'react-icons/md';

import { useAppDispatch } from '../../../../hooks';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import PaginationFooter from '../../../../components/common/PaginationFooter';
import {
  fetchCancelledCustomers, CancelledCustomerRow,
  fetchCustomerPaymentHistory,
  fetchRefundSummary, createRefund, RefundSummary,
} from '../../../../services/customerDetailsService';
import { paymentForLabel } from '../../../../services/paymentService';
import { CustomerPaymentRecord } from '../../../../types';

const rupee = (n: number): string => `₹ ${(n || 0).toLocaleString('en-IN')}`;

const formatDMY = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const formatDMYHM = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDMY(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// ── Simple expand/collapse section — used for both accordions below. ──────
const Accordion: React.FC<{
  t: ReturnType<typeof useAppearanceTokens>['t']; icon: React.ReactNode; title: string;
  defaultOpen?: boolean; children: React.ReactNode;
}> = ({ t, icon, title, defaultOpen, children }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="rounded-2xl mb-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, overflow: 'hidden' }}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
        <span className="flex items-center gap-2" style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>
          {icon} {title}
        </span>
        {open ? <MdExpandLess size={20} color={t.textSecondary} /> : <MdExpandMore size={20} color={t.textSecondary} />}
      </button>
      {open && <div className="px-4 pb-4" style={{ borderTop: `1px solid ${t.divider}` }}>{children}</div>}
    </div>
  );
};

const CancelledBookingPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t } = useAppearanceTokens();

  useEffect(() => { dispatch(setPageTitle('Cancelled Booking')); }, [dispatch]);

  // ── List + search/filter ────────────────────────────────────────────────
  const [rows, setRows] = useState<CancelledCustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCancelledCustomers(page, limit, debouncedSearch);
      if (res.success) { setRows(res.rows); setTotal(res.total); }
    } catch {
      toast.error('Failed to load cancelled bookings.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

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

  // ── Selected customer + its two accordions' data ────────────────────────
  const [selected, setSelected] = useState<CancelledCustomerRow | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<CustomerPaymentRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refundSummary, setRefundSummary] = useState<RefundSummary | null>(null);
  const [loadingRefunds, setLoadingRefunds] = useState(false);

  const selectCustomer = async (row: CancelledCustomerRow) => {
    setSelected(row);
    setLoadingHistory(true);
    setLoadingRefunds(true);
    try {
      const res = await fetchCustomerPaymentHistory(row.id);
      setPaymentHistory(res.success ? res.rows : []);
    } catch {
      toast.error('Failed to load payment history.');
    } finally {
      setLoadingHistory(false);
    }
    try {
      setRefundSummary(await fetchRefundSummary(row.id));
    } catch {
      toast.error('Failed to load refund details.');
    } finally {
      setLoadingRefunds(false);
    }
  };

  // ── Refund entry form ────────────────────────────────────────────────────
  const [refundAmount, setRefundAmount] = useState('');
  const [refundDateTime, setRefundDateTime] = useState('');
  const [refundNotes, setRefundNotes] = useState('');
  const [submittingRefund, setSubmittingRefund] = useState(false);

  const handleSubmitRefund = async () => {
    if (!selected) return;
    const amount = Number(refundAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid refund amount.'); return; }
    setSubmittingRefund(true);
    try {
      const summary = await createRefund(selected.id, {
        refunded_amount: amount,
        refund_date: refundDateTime ? new Date(refundDateTime).toISOString() : undefined,
        notes: refundNotes.trim() || undefined,
      });
      setRefundSummary(summary);
      setRefundAmount(''); setRefundDateTime(''); setRefundNotes('');
      toast.success('Refund recorded.');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to record refund.');
    } finally {
      setSubmittingRefund(false);
    }
  };

  return (
    <div style={{ fontFamily: t.fontFamily }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 44, height: 44, background: 'rgba(220,38,38,0.1)' }}>
          <MdEventBusy size={22} style={{ color: '#dc2626' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 19.5, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Cancelled Booking</h1>
        </div>
      </div>

      {/* ── Search/filter — above both accordions/list, as required. ──────── */}
      <div className="rounded-2xl mb-5 p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, maxWidth: 380 }}>
          <MdSearch size={17} style={{ color: t.textSecondary, flexShrink: 0 }} />
          <input type="text" placeholder="Search by Customer ID, Name, or Building" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 12, width: '100%' }} />
          {search && (
            <button type="button" onClick={() => setSearch('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 0, display: 'flex' }}>
              <MdClose size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── Cancelled customers list ────────────────────────────────────── */}
      <div className="rounded-2xl mb-5" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, overflow: 'hidden' }}>
        <div className="master-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr style={{ background: t.tableHeaderBg }}>
                {['Customer', 'Building Details', 'Property Cost', 'Cancelled On', 'Reason'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>No cancelled bookings found.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} onClick={() => selectCustomer(r)}
                    style={{
                      borderTop: `1px solid ${t.divider}`, cursor: 'pointer',
                      background: selected?.id === r.id ? t.insetBg : 'transparent',
                    }}>
                    <td style={{ padding: '12px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, color: t.textPrimary }}>{r.customer_name}</div>
                      <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 1 }}>{r.customer_code}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>{r.building_name || '—'}</div>
                      {(r.wing_name || r.flat_no) && (
                        <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 1 }}>
                          {r.wing_name ? `Wing ${r.wing_name}` : ''}{r.wing_name && r.flat_no ? ' • ' : ''}{r.flat_no ? `Flat ${r.flat_no}` : ''}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap' }}>{rupee(r.flat_amount)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatDMY(r.cancelled_at)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.cancellation_reason || ''}>
                      {r.cancellation_reason || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationFooter t={t} limit={limit} setLimit={setLimit} setPage={setPage} safePage={safePage} totalPages={totalPages} from={from} to={to} total={total} pageBtns={pageBtns} />
      </div>

      {/* ── Selected customer's two accordions ─────────────────────────────── */}
      {selected && (
        <>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textSecondary, marginBottom: 10 }}>
            Showing details for <span style={{ color: t.textPrimary }}>{selected.customer_name} ({selected.customer_code})</span>
          </div>

          <Accordion t={t} icon={<MdReceiptLong size={17} color="var(--brand-ink)" />} title="Booking & Payment Details" defaultOpen>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-4">
              <div><div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' }}>Customer</div><div style={{ fontSize: 12.5, fontWeight: 600, color: t.textPrimary }}>{selected.customer_name}</div><div style={{ fontSize: 10.5, color: t.textSecondary }}>{selected.customer_code}</div></div>
              <div><div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' }}>Building</div><div style={{ fontSize: 12.5, fontWeight: 600, color: t.textPrimary }}>{selected.building_name || '—'}</div></div>
              <div><div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' }}>Wing / Flat</div><div style={{ fontSize: 12.5, fontWeight: 600, color: t.textPrimary }}>{[selected.wing_name, selected.flat_no].filter(Boolean).join(' • ') || '—'}</div></div>
              <div><div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' }}>Property Cost</div><div style={{ fontSize: 12.5, fontWeight: 700, color: t.textPrimary }}>{rupee(selected.flat_amount)}</div></div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' }}>Cancellation Reason</div>
                <div className="rounded-xl p-3 mt-1" style={{ fontSize: 12.5, color: t.textPrimary, background: t.insetBg }}>{selected.cancellation_reason || '—'}</div>
              </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, margin: '4px 0 8px' }}>Month-wise Payment History</div>
            <div className="master-table-scroll rounded-xl" style={{ border: `1px solid ${t.surfaceBorder}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                <thead>
                  <tr style={{ background: t.tableHeaderBg }}>
                    {['Paid On', 'Installment Date', 'Payment Type', 'Mode', 'Amount'].map((h) => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingHistory ? (
                    <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>Loading...</td></tr>
                  ) : paymentHistory.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>No payments recorded.</td></tr>
                  ) : (
                    paymentHistory.map((p) => (
                      <tr key={p.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                        <td style={{ padding: '10px 12px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatDMY(p.paid_on)}</td>
                        <td style={{ padding: '10px 12px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{p.payment_tag === 'Extra Pay' ? '—' : formatDMY(p.inst_date)}</td>
                        <td style={{ padding: '10px 12px', fontSize: 11.5, color: t.textPrimary, whiteSpace: 'nowrap' }}>{p.payment_tag === 'Extra Pay' ? 'Extra Pay' : paymentForLabel(p.payment_type)}</td>
                        <td style={{ padding: '10px 12px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{p.mode || '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap' }}>{rupee(p.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Accordion>

          <Accordion t={t} icon={<MdCurrencyRupee size={17} color="#16a34a" />} title="Payment Refund">
            {loadingRefunds || !refundSummary ? (
              <p style={{ color: t.textSecondary, fontSize: 12, padding: '16px 0' }}>Loading refund details...</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
                  <div className="rounded-xl p-3" style={{ background: t.insetBg }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' }}>Total Paid</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: t.textPrimary }}>{rupee(refundSummary.total_paid)}</div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: t.insetBg }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' }}>Total Refunded</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#dc2626' }}>{rupee(refundSummary.total_refunded)}</div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: t.insetBg }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' }}>Remaining Refundable</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#16a34a' }}>{rupee(refundSummary.remaining_refundable)}</div>
                  </div>
                </div>

                {/* ── Refund entry form ────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end mb-4">
                  <div>
                    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase' }}>Refund Amount (₹)</label>
                    <input type="number" min={0} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder="Enter amount"
                      style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 10px', fontSize: 12, outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase' }}>Refund Date/Time</label>
                    <input type="datetime-local" value={refundDateTime} onChange={(e) => setRefundDateTime(e.target.value)}
                      style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 10px', fontSize: 12, outline: 'none' }} />
                  </div>
                  <div style={{ gridColumn: 'span 2 / span 2' }}>
                    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase' }}>Notes (optional)</label>
                    <input type="text" value={refundNotes} onChange={(e) => setRefundNotes(e.target.value)}
                      placeholder="e.g. Refunded via bank transfer"
                      style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 10px', fontSize: 12, outline: 'none' }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <button type="button" onClick={handleSubmitRefund} disabled={submittingRefund}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 18px', height: 38, borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: submittingRefund ? 'not-allowed' : 'pointer', background: 'var(--brand-gradient)', color: '#fff', border: 'none', opacity: submittingRefund ? 0.6 : 1 }}>
                      {submittingRefund ? 'Submitting...' : 'Add Refund Entry'}
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, margin: '4px 0 8px' }}>Refund History</div>
                <div className="master-table-scroll rounded-xl" style={{ border: `1px solid ${t.surfaceBorder}` }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                    <thead>
                      <tr style={{ background: t.tableHeaderBg }}>
                        {['Date/Time', 'Refunded Amount', 'Processed By', 'Notes'].map((h) => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {refundSummary.refunds.length === 0 ? (
                        <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>No refunds recorded yet.</td></tr>
                      ) : (
                        refundSummary.refunds.map((r) => (
                          <tr key={r.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                            <td style={{ padding: '10px 12px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatDMYHM(r.refund_date)}</td>
                            <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#dc2626', whiteSpace: 'nowrap' }}>{rupee(r.refunded_amount)}</td>
                            <td style={{ padding: '10px 12px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.created_by_name || '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 11.5, color: t.textSecondary }}>{r.notes || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Accordion>
        </>
      )}
    </div>
  );
};

export default CancelledBookingPage;
