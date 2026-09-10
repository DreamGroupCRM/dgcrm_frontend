// ==========================================
// DREAM GROUP CRM - PAYMENT RECEIVED PAGE
// ==========================================
// V_21.0 — this page now shows ONLY approved payments (approval: 'approved'
// hard-coded below, not a toggle) — a payment that hasn't been approved
// yet no longer appears here at all. Review/approve pending payments moved
// to its own dedicated screen, PaymentApprovalsPage.tsx (see Sidebar.tsx's
// "Payment Approvals" entry) — this mirrors the ChangeRequestsPage split
// from each module's own list, and the user's explicit call: pending
// payments must not be visible in this existing screen, and get a
// separate page for approval. Nothing about is_approved's effect on
// due/EMI/remaining-balance math changed — those calculations still count
// a payment the moment it's collected, exactly as before.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import {
  MdPayments, MdRefresh, MdSearch, MdDownload, MdReceiptLong, MdClose, MdKeyboardArrowDown,
  MdChevronLeft, MdChevronRight, MdKeyboardDoubleArrowLeft, MdKeyboardDoubleArrowRight,
} from 'react-icons/md';

import { useAppDispatch } from '../../../../hooks';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { AppTheme } from '../../../../styles/theme';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import StatCard from '../../../../components/masters/StatCard';
import {
  fetchPaymentList, paymentForLabel, PaymentListRow, fetchMonthlyReceipt, MonthlyReceiptData,
} from '../../../../services/paymentService';
import { fetchAllCustomerDetails } from '../../../../services/customerDetailsService';
import { Customer } from '../../../../types/index';
import { formatLastLogin, formatDate } from '../../../../utils';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
type Theme = AppTheme;

const rupee = (n: number): string => `₹ ${n.toLocaleString('en-IN')}`;

// Month formatted for display, e.g. '2026-03' -> 'March 2026'.
const monthLabel = (month: string): string => {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

// ── Small local searchable dropdown — same "type to filter, click to
// pick" shape used on the Payment Dues/Customer List pages, kept local
// since this page's only picker (Customer, for the Generate Receipt
// modal) is its only user. ──────────────────────────────────────────────
const SearchableSelect: React.FC<{
  t: Theme; placeholder: string; options: string[]; value: string; onChange: (v: string) => void;
}> = ({ t, placeholder, options, value, onChange }) => {
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
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, cursor: 'text' }}
        onClick={() => setOpen(true)}>
        <MdSearch size={15} style={{ color: t.textSecondary, flexShrink: 0 }} />
        <input type="text" placeholder={placeholder} value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 12, width: '100%' }} />
        {value && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(''); setQuery(''); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 0, display: 'flex', flexShrink: 0 }}>
            <MdClose size={15} />
          </button>
        )}
        <MdKeyboardArrowDown size={16} style={{ color: t.textSecondary, flexShrink: 0 }} />
      </div>
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 30, maxHeight: 220, overflowY: 'auto', background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '4px 0' }}>
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

const PaymentReceivedPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isDark, t, cssVars } = useAppearanceTokens();

  const [rows, setRows] = useState<PaymentListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  // Debounced so typing a search term doesn't fire a real backend request
  // on every keystroke — this page is server-paginated/-filtered.
  const debouncedSearch = useDebouncedValue(search, 400);
  const [exportingCsv, setExportingCsv] = useState(false);

  useEffect(() => { dispatch(setPageTitle('Payment Received')); }, [dispatch]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPaymentList(page, limit, { approval: 'approved', search: debouncedSearch });
      if (res.success) { setRows(res.rows); setTotal(res.total); }
      else toast.error('Failed to fetch payments.');
    } catch {
      toast.error('Failed to fetch payments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  // Exports every approved payment matching the current search — not just
  // the current page — same "fetch a large batch, then download" pattern
  // as the Customer List page's own CSV export.
  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const res = await fetchPaymentList(1, 5000, { approval: 'approved', search: debouncedSearch });
      const exportRows = res.rows ?? [];
      if (exportRows.length === 0) {
        toast.error('No payments to export.');
        return;
      }
      const header = ['Receipt #', 'Customer', 'Payment For', 'Amount', 'Company', 'Mode', 'Received By', 'Date', 'Approved By'];
      const csvRows = exportRows.map((r) => [
        r.receipt_number, r.customer_name || '', paymentForLabel(r.payment_type), r.amount,
        r.company || '', r.mode_of_payment || '', r.received_by || '', formatLastLogin(r.created_at), r.approved_by_name || '',
      ]);
      const csv = [header, ...csvRows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments_received_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to export payments. Please try again.');
    } finally {
      setExportingCsv(false);
    }
  };

  // ── Generate Monthly Receipt — pick a customer + month, see every
  // approved payment they made that month, and download a combined
  // receipt PDF. Separate from the per-row "View Receipt" flow on
  // Customer Details (always exactly one transaction). ────────────────────
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [grCustomerSearch, setGrCustomerSearch] = useState('');
  const [grCustomerId, setGrCustomerId] = useState<string | null>(null);
  const [grMonth, setGrMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [grLoading, setGrLoading] = useState(false);
  const [grData, setGrData] = useState<MonthlyReceiptData | null>(null);

  const openGenerateReceipt = () => {
    setReceiptModalOpen(true);
    setGrData(null);
    if (customers.length === 0) {
      fetchAllCustomerDetails(1, 1000).then((res) => { if (res.success) setCustomers(res.rows ?? []); }).catch(() => {});
    }
  };

  const customerOptions = useMemo(
    () => customers.map((c) => `${c.customer_name}${c.customer_code ? ` (${c.customer_code})` : ''}`),
    [customers]
  );
  const handleGrCustomerChange = (v: string) => {
    setGrCustomerSearch(v);
    const exact = customers.find((c) => `${c.customer_name}${c.customer_code ? ` (${c.customer_code})` : ''}` === v);
    setGrCustomerId(exact ? exact.id : null);
    setGrData(null);
  };

  const handleGenerateReceipt = async () => {
    if (!grCustomerId) { toast.error('Select a customer first.'); return; }
    setGrLoading(true);
    try {
      const data = await fetchMonthlyReceipt(grCustomerId, grMonth);
      setGrData(data);
      if (data.transactions.length === 0) toast.info('No approved payments found for that customer in this month.');
    } catch {
      toast.error('Failed to generate the receipt. Please try again.');
    } finally {
      setGrLoading(false);
    }
  };

  const handleDownloadMonthlyReceiptPdf = () => {
    if (!grData || grData.transactions.length === 0) return;
    const { customer, month, transactions, total_amount } = grData;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const marginX = 40;
    let y = 50;

    doc.setFontSize(17);
    doc.setFont('helvetica', 'bold');
    doc.text('Dream Group CRM', marginX, y);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Monthly Payment Receipt — ${monthLabel(month)}`, marginX, y + 18);
    y += 46;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(customer.customer_name || '—', marginX, y);
    doc.setFont('helvetica', 'normal');
    y += 15;
    doc.setFontSize(9.5);
    doc.text(`${customer.customer_code}${customer.mobile_number ? ` · ${customer.mobile_number}` : ''}`, marginX, y);
    y += 13;
    if (customer.building_name || customer.flat_no) {
      doc.text([customer.building_name, customer.wing_name ? `Wing ${customer.wing_name}` : null, customer.flat_no ? `Flat ${customer.flat_no}` : null].filter(Boolean).join(' · '), marginX, y);
      y += 13;
    }
    y += 14;

    // Table header
    const cols = [
      { label: 'Receipt #', x: marginX, w: 100 },
      { label: 'Date', x: marginX + 100, w: 70 },
      { label: 'Payment For', x: marginX + 170, w: 140 },
      { label: 'Mode', x: marginX + 310, w: 90 },
      { label: 'Amount (Rs.)', x: marginX + 400, w: 95 },
    ];
    doc.setFillColor(124, 58, 237);
    doc.rect(marginX, y - 12, 515, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    cols.forEach((c) => doc.text(c.label, c.x + 4, y + 2));
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    y += 16;

    transactions.forEach((tx, i) => {
      if (y > 760) { doc.addPage(); y = 50; }
      if (i % 2 === 1) { doc.setFillColor(245, 243, 255); doc.rect(marginX, y - 12, 515, 18, 'F'); }
      doc.setFontSize(8.7);
      doc.text(tx.receipt_number, cols[0].x + 4, y);
      doc.text(formatDate(tx.created_at), cols[1].x + 4, y);
      doc.text(paymentForLabel(tx.payment_type), cols[2].x + 4, y);
      doc.text(tx.mode_of_payment || '—', cols[3].x + 4, y);
      doc.text(tx.amount.toLocaleString('en-IN'), cols[4].x + 4, y);
      y += 18;
    });

    y += 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(marginX, y - 10, marginX + 515, y - 10);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Received: Rs. ${total_amount.toLocaleString('en-IN')}`, marginX + 300, y + 8);

    doc.save(`receipt-${customer.customer_code || customer.customer_name}-${month}.pdf`);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const pageBtns = useMemo(() => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [safePage, totalPages]);

  return (
    <div style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 44, height: 44, background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff' }}>
          <MdPayments size={22} style={{ color: '#4f46e5' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 19.5, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Payment Received</h1>
          <p style={{ fontSize: 11.5, color: t.textSecondary, margin: '2px 0 0' }}>Every approved payment — pending payments are reviewed on the Payment Approvals page</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <StatCard label="Total Received" value={total} icon={MdPayments} color="#7c3aed" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
      </div>

      {/* ── Toolbar — Search, Export CSV, and Refresh all in one row. ────── */}
      <div className="rounded-2xl mb-5 p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, flex: '1 1 220px', minWidth: 200 }}>
            <MdSearch size={18} style={{ color: t.textSecondary, flexShrink: 0 }} />
            <input type="text" placeholder="Search customer or receipt #..." value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 12, width: '100%', minWidth: 0 }} />
          </div>
          <div className="flex items-center gap-2.5" style={{ flexShrink: 0 }}>
            <button type="button" onClick={openGenerateReceipt}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--grad-purple)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <MdReceiptLong size={16} /> Generate Receipt
            </button>
            <button type="button" onClick={handleExportCsv} disabled={exportingCsv}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: exportingCsv ? 'not-allowed' : 'pointer', opacity: exportingCsv ? 0.6 : 1, whiteSpace: 'nowrap' }}>
              <MdDownload size={16} /> {exportingCsv ? 'Exporting…' : 'Export CSV'}
            </button>
            <button type="button" onClick={fetchRows} title="Refresh"
              className="flex items-center justify-center rounded-xl"
              style={{ width: 40, height: 40, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer', flexShrink: 0 }}>
              <MdRefresh size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="master-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                {['Receipt #', 'Customer', 'Payment For', 'Amount', 'Company', 'Mode', 'Received By', 'Date', 'Approved By'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading payments...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>No payments found.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                      <span className="flex items-center gap-1.5">
                        <MdReceiptLong size={14} style={{ color: '#7c3aed', flexShrink: 0 }} /> {r.receipt_number}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap' }}>{r.customer_name || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{paymentForLabel(r.payment_type)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full font-semibold" style={{ background: '#dcfce7', color: '#16a34a', fontSize: 11.5, whiteSpace: 'nowrap' }}>
                        {rupee(r.amount)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.company || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.mode_of_payment || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.received_by || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatLastLogin(r.created_at)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11, color: t.textSecondary, whiteSpace: 'nowrap' }}>
                      {r.approved_by_name ? (
                        <>
                          <div style={{ fontWeight: 600, color: t.textPrimary }}>{r.approved_by_name}</div>
                          {r.approved_at && <div style={{ fontSize: 10 }}>{formatLastLogin(r.approved_at)}</div>}
                        </>
                      ) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-4" style={{ borderTop: `1px solid ${t.divider}` }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 11, color: t.textSecondary }}>Rows per page:</span>
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 8, padding: '4px 8px', fontSize: 11, cursor: 'pointer', outline: 'none' }}>
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary }}>
            Showing {total === 0 ? 0 : (safePage - 1) * limit + 1}–{Math.min(safePage * limit, total)} of {total}
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
            {pageBtns[0] > 1 && <span style={{ color: t.textSecondary, padding: '0 2px' }}>...</span>}
            {pageBtns.map((n) => (
              <button key={n} type="button" onClick={() => setPage(n)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: n === safePage ? '#7c3aed' : t.insetBg, color: n === safePage ? '#fff' : t.textPrimary, border: `1px solid ${n === safePage ? '#7c3aed' : t.surfaceBorder}`, cursor: 'pointer' }}>
                {n}
              </button>
            ))}
            {pageBtns[pageBtns.length - 1] < totalPages && <span style={{ color: t.textSecondary, padding: '0 2px' }}>...</span>}
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

      {/* ── Generate Monthly Receipt modal ────────────────────────────── */}
      {receiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setReceiptModalOpen(false)}>
          <div className="rounded-2xl w-full" style={{ maxWidth: 560, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, maxHeight: '88vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <div className="flex items-center gap-2.5">
                <MdReceiptLong size={19} style={{ color: '#7c3aed' }} />
                <div style={{ fontSize: 15, fontWeight: 800, color: t.textPrimary }}>Generate Monthly Receipt</div>
              </div>
              <button type="button" onClick={() => setReceiptModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 4, display: 'flex' }}>
                <MdClose size={20} />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <div>
                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 }}>Customer</label>
                <SearchableSelect t={t} placeholder="Search or select customer" options={customerOptions} value={grCustomerSearch} onChange={handleGrCustomerChange} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 }}>Month</label>
                <input type="month" value={grMonth} onChange={(e) => { setGrMonth(e.target.value); setGrData(null); }}
                  style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 10px', fontSize: 12, outline: 'none' }} />
              </div>
              <button type="button" onClick={handleGenerateReceipt} disabled={grLoading || !grCustomerId}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{
                  background: grLoading || !grCustomerId ? '#9ca3af' : 'var(--grad-purple)',
                  border: 'none', cursor: grLoading || !grCustomerId ? 'not-allowed' : 'pointer',
                }}>
                {grLoading ? 'Generating...' : 'Generate'}
              </button>

              {grData && (
                <div className="rounded-xl p-4 mt-2" style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}` }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>{grData.customer.customer_name}</div>
                      <div style={{ fontSize: 10.5, color: t.textSecondary }}>{monthLabel(grData.month)}</div>
                    </div>
                    {grData.transactions.length > 0 && (
                      <button type="button" onClick={handleDownloadMonthlyReceiptPdf}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white"
                        style={{ background: 'var(--grad-purple)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <MdDownload size={14} /> Download PDF
                      </button>
                    )}
                  </div>

                  {grData.transactions.length === 0 ? (
                    <p style={{ fontSize: 11.5, color: t.textSecondary, margin: 0 }}>No approved payments found for this customer in this month.</p>
                  ) : (
                    <>
                      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                        {grData.transactions.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${t.divider}` }}>
                            <div>
                              <div style={{ fontSize: 11.5, fontWeight: 600, color: t.textPrimary }}>{tx.receipt_number}</div>
                              <div style={{ fontSize: 10, color: t.textSecondary }}>{paymentForLabel(tx.payment_type)} · {formatDate(tx.created_at)}</div>
                            </div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold" style={{ background: '#dcfce7', color: '#16a34a', fontSize: 11 }}>
                              {rupee(tx.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-3 mt-1" style={{ borderTop: `1px solid ${t.surfaceBorder}` }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary }}>Total Received</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#16a34a' }}>{rupee(grData.total_amount)}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentReceivedPage;
