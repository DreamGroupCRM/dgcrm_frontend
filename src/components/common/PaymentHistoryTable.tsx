// ==========================================
// DREAM GROUP CRM - PAYMENT HISTORY TABLE (shared)
// ==========================================
// One customer's payments, laid out exactly like the office's Payment
// Received table (minus the customer/building columns, which are the same on
// every row here): Actions, Status (Approved / UnApproved in colour),
// Receipt No., Payment Type, Payment Method, Amount, Payment Date, Received
// Date, Company, Received By. Used by Customer Details' Payment History
// popup and by the customer portal's Payment History page, so both always
// look the same. Each caller supplies its own Actions (what an office user
// may do differs from what a customer may do).
import React from 'react';
import { MdCheckCircle, MdHourglassEmpty } from 'react-icons/md';
import { AppTheme } from '../../styles/theme';
import { paymentForLabel } from '../../services/paymentService';
import { formatDate } from '../../utils';
import { BackdatedDot } from './BackdatedDot';

export interface PaymentHistoryRow {
  id: string | number;
  receipt_number?: string | null;
  payment_type: string;
  payment_tag?: string | null;
  is_after_possession_emi?: boolean;
  mode?: string | null;
  amount: number;
  inst_date?: string | null;
  payment_date?: string | null;
  created_at?: string | null;
  company?: string | null;
  received_by?: string | null;
  is_approved: boolean;
}

const HEADERS = ['Actions', 'Status', 'Receipt No.', 'Payment Type', 'Payment Method', 'Amount', 'Payment Date', 'Received Date', 'Company', 'Received By'];

const typeLabel = (r: PaymentHistoryRow): string => {
  if (r.payment_tag === 'Extra Pay') return 'Extra Pay';
  if (r.payment_type === 'EMIAmount') return r.is_after_possession_emi ? 'EMI After' : 'EMI Before';
  return paymentForLabel(r.payment_type as Parameters<typeof paymentForLabel>[0]);
};

const PaymentHistoryTable: React.FC<{
  t: AppTheme;
  isDark?: boolean;
  rows: PaymentHistoryRow[];
  renderActions: (row: PaymentHistoryRow) => React.ReactNode;
  emptyText?: string;
}> = ({ t, isDark, rows, renderActions, emptyText = 'No payment history found.' }) => {
  const td: React.CSSProperties = { padding: '9px 12px', fontSize: 11.5, color: t.textPrimary, whiteSpace: 'nowrap' };
  return (
    <div style={{ overflowX: 'auto', border: `1px solid ${t.surfaceBorder}`, borderRadius: 10 }}>
      <table className="master-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
        <thead>
          <tr className="master-table-header-gradient">
            {HEADERS.map((h) => (
              <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={HEADERS.length} style={{ padding: 18, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>{emptyText}</td></tr>
          ) : rows.map((r) => (
            <tr key={r.id} className="master-table-row-hover" style={{ borderTop: `1px solid ${t.divider}` }}>
              <td style={{ padding: '8px 12px' }}>{renderActions(r)}</td>
              <td style={{ padding: '8px 12px' }}>
                {r.is_approved ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold" style={{ background: '#16a34a', color: '#fff', fontSize: 10.5, whiteSpace: 'nowrap' }}>
                    <MdCheckCircle size={12} /> Approved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold" style={{ background: '#d97706', color: '#fff', fontSize: 10.5, whiteSpace: 'nowrap' }}>
                    <MdHourglassEmpty size={12} /> UnApproved
                  </span>
                )}
              </td>
              <td style={{ ...td, fontWeight: 600 }}>{r.receipt_number || '—'}</td>
              <td style={{ padding: '8px 12px' }}>
                <span className="inline-flex items-center px-2 py-1 rounded-md font-semibold" style={{ background: '#2563eb', color: '#fff', fontSize: 10.5, whiteSpace: 'nowrap' }}>
                  {typeLabel(r)}
                </span>
              </td>
              <td style={{ padding: '8px 12px' }}>
                <span className="inline-flex items-center px-2 py-1 rounded-md font-semibold" style={{ background: isDark ? 'rgba(0,0,255,0.18)' : '#efebe9', color: 'var(--brand-ink)', fontSize: 10.5, whiteSpace: 'nowrap' }}>
                  {r.mode || '—'}
                </span>
              </td>
              <td style={{ ...td, fontSize: 12.5, fontWeight: 700 }}>₹{(r.amount || 0).toLocaleString('en-IN')}</td>
              {/* Extra Pay is its own payment, separate from EMIs, so it
                  settles no installment — no Payment Date. */}
              <td style={{ ...td, color: t.textSecondary }}>{r.payment_tag === 'Extra Pay' || !r.inst_date ? '—' : formatDate(r.inst_date)}</td>
              <td style={{ ...td, color: t.textSecondary }}>
                <div className="flex items-center gap-1.5">
                  {formatDate(r.payment_date || r.created_at || '')}
                  <BackdatedDot paymentDate={r.payment_date ?? null} createdAt={r.created_at ?? undefined} />
                </div>
              </td>
              <td style={td}>{r.company || '—'}</td>
              <td style={td}>{r.received_by || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PaymentHistoryTable;
