// ==========================================
// DREAM GROUP CRM - REFUND HISTORY TABLE (shared)
// ==========================================
// V_25.0 — one cancelled booking's refunds, laid out like the shared
// PaymentHistoryTable (same Actions first, same coloured Status pill, same
// date / amount presentation) so payment and refund history read the same
// on every page: Cancelled Booking, the Refund popup and the customer
// portal. Each caller supplies its own Actions (an office user may also
// approve / reject; a customer may only view / download an approved
// receipt).
import React from 'react';
import { MdCancel, MdCheckCircle, MdHourglassEmpty } from 'react-icons/md';
import { AppTheme } from '../../styles/theme';
import { formatDate } from '../../utils';

export interface RefundHistoryRow {
  id: string | number;
  receipt_number?: string | null;
  refunded_amount: number;
  refund_date?: string | null;
  mode_of_payment?: string | null;
  status: 'approved' | 'pending' | 'rejected' | string;
  created_by_name?: string | null;
  /** Optional extra column (e.g. Balance After on the office popup). */
  extra?: React.ReactNode;
}

const STATUS = {
  approved: { label: 'Approved', bg: '#15803d', Icon: MdCheckCircle },
  pending: { label: 'UnApproved', bg: '#b45309', Icon: MdHourglassEmpty },
  rejected: { label: 'Rejected', bg: '#b91c1c', Icon: MdCancel },
} as const;

const RefundHistoryTable: React.FC<{
  t: AppTheme;
  rows: RefundHistoryRow[];
  renderActions: (row: RefundHistoryRow) => React.ReactNode;
  /** Show the Processed By column (office pages). */
  showProcessedBy?: boolean;
  /** Header of the optional extra column; omitted = no extra column. */
  extraHeader?: string;
  emptyText?: string;
}> = ({ t, rows, renderActions, showProcessedBy, extraHeader, emptyText = 'No refunds recorded yet.' }) => {
  const headers = ['Actions', 'Status', 'Cancelled Receipt No.', 'Refunded Amount', 'Refund Date', 'Mode',
    ...(showProcessedBy ? ['Processed By'] : []), ...(extraHeader ? [extraHeader] : [])];
  const td: React.CSSProperties = { padding: '9px 12px', fontSize: 11.5, color: t.textPrimary, whiteSpace: 'nowrap' };
  return (
    <div className="master-table-scroll" style={{ border: `1px solid ${t.surfaceBorder}`, borderRadius: 10 }}>
      <table className="master-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
        <thead>
          <tr className="master-table-header-gradient">
            {headers.map((h) => (
              <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} style={{ padding: 18, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>{emptyText}</td></tr>
          ) : rows.map((r) => {
            const st = STATUS[r.status as keyof typeof STATUS] ?? STATUS.pending;
            const rejected = r.status === 'rejected';
            return (
              <tr key={r.id} className="master-table-row-hover" style={{ borderTop: `1px solid ${t.divider}` }}>
                <td style={{ padding: '8px 12px' }}>{renderActions(r)}</td>
                <td style={{ padding: '8px 12px' }}>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold" style={{ background: st.bg, color: '#fff', fontSize: 10.5, whiteSpace: 'nowrap' }}>
                    <st.Icon size={12} /> {st.label}
                  </span>
                </td>
                <td style={{ ...td, fontWeight: 600 }}>{r.receipt_number || (r.status === 'pending' ? 'After approval' : '—')}</td>
                <td style={{ ...td, fontSize: 12.5, fontWeight: 700, textDecoration: rejected ? 'line-through' : 'none', color: rejected ? t.textSecondary : t.textPrimary }}>
                  ₹{Number(r.refunded_amount || 0).toLocaleString('en-IN')}
                </td>
                <td style={{ ...td, color: t.textSecondary }}>{r.refund_date ? formatDate(r.refund_date) : '—'}</td>
                <td style={td}>{r.mode_of_payment || '—'}</td>
                {showProcessedBy && <td style={td}>{r.created_by_name || '—'}</td>}
                {extraHeader && <td style={td}>{r.extra ?? '—'}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default RefundHistoryTable;
