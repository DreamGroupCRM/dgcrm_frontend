// ==========================================
// DREAM GROUP CRM - PENDING APPROVALS PAGE
// ==========================================
// One shared review queue for delete requests across the modules whose
// DELETE route used to be reachable by any authenticated employee with no
// admin gate (see pendingApprovalsService.ts / modules/pendingApprovals/
// in dgcrm_backend). A non-admin's delete now marks the record
// pending_delete instead of removing it — hidden from its own module's
// list, data preserved — until an admin Approves (permanently deletes) or
// Rejects (restores) it here. Admin/superadmin only, enforced server-side.
// V_21.0 added Lead to this same queue (previously permission-gated with
// no review step at all).
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { MdPendingActions, MdCheckCircle, MdCancel, MdRefresh } from 'react-icons/md';

import { useAppDispatch } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import StatCard from '../../../components/masters/StatCard';
import { showAlert, formatLastLogin } from '../../../utils';
import {
  fetchPendingApprovals, approvePendingDelete, rejectPendingDelete,
  PendingApprovalRow, PendingApprovalEntityType,
} from '../../../services/pendingApprovalsService';

interface ErrLike { response?: { data?: { message?: string } } }
const errMessage = (e: unknown, fallback: string) => (e as ErrLike)?.response?.data?.message || fallback;

const MODULE_LABEL: Record<PendingApprovalEntityType, string> = {
  performaInvoice: 'Proforma Invoice',
  channelSalesDar: 'Channel Sales DAR',
  supplier: 'Supplier',
  bookingLetter: 'Booking Letter',
  toCollect: 'To Collect',
  toPay: 'To Pay',
  product: 'Product',
  gstInvoice: 'GST Invoice',
  channelPartner: 'Channel Partner',
  lead: 'Lead',
};

const rowKey = (r: PendingApprovalRow) => `${r.entity_type}:${r.id}`;

const PendingApprovalsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isDark, t, cssVars } = useAppearanceTokens();

  const [rows, setRows] = useState<PendingApprovalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => { dispatch(setPageTitle('Pending Approvals')); }, [dispatch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchPendingApprovals());
    } catch (e) {
      toast.error(errMessage(e, 'Failed to load pending approvals.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (row: PendingApprovalRow) => {
    const result = await showAlert.confirm(
      `This will PERMANENTLY delete "${row.label || 'this record'}" (${MODULE_LABEL[row.entity_type]}). This cannot be undone.`,
      'Approve Delete?'
    );
    if (!result.isConfirmed) return;
    setBusyKey(rowKey(row));
    try {
      await approvePendingDelete(row.entity_type, row.id);
      toast.success('Delete approved.');
      await load();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to approve delete.'));
    } finally {
      setBusyKey(null);
    }
  };

  const handleReject = async (row: PendingApprovalRow) => {
    setBusyKey(rowKey(row));
    try {
      await rejectPendingDelete(row.entity_type, row.id);
      toast.success('Delete request rejected — record restored.');
      await load();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to reject delete request.'));
    } finally {
      setBusyKey(null);
    }
  };

  const moduleCounts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.entity_type] = (acc[r.entity_type] || 0) + 1;
    return acc;
  }, {});
  const topModule = Object.entries(moduleCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <StatCard label="Pending Requests" value={rows.length} icon={MdPendingActions} color="#d97706" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Modules Affected" value={Object.keys(moduleCounts).length} icon={MdPendingActions} color="#0284c7" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Most Requested" value={topModule ? MODULE_LABEL[topModule[0] as PendingApprovalEntityType] : '—'} icon={MdPendingActions} color="#7c3aed" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
      </div>

      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: 0 }}>Delete Requests Awaiting Review</h3>
          <button type="button" onClick={load} title="Refresh"
            className="flex items-center justify-center rounded-xl"
            style={{ width: 36, height: 36, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
            <MdRefresh size={17} />
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                {['Module', 'Record', 'Requested By', 'Requested At', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>Loading pending approvals...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>No delete requests are waiting for review.</td></tr>
              ) : (
                rows.map((row) => {
                  const key = rowKey(row);
                  const busy = busyKey === key;
                  return (
                    <tr key={key} style={{ borderTop: `1px solid ${t.divider}` }}>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, fontWeight: 600, color: isDark ? '#fff' : '#000' }}>{MODULE_LABEL[row.entity_type]}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: isDark ? '#fff' : '#000' }}>{row.label || `#${row.id}`}</td>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary }}>
                        {row.requested_by_name || row.requested_by_email || (row.requested_by ? `User #${row.requested_by}` : '—')}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatLastLogin(row.requested_at)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div className="flex items-center gap-2">
                          <button type="button" title="Approve — permanently delete" onClick={() => handleApprove(row)} disabled={busy}
                            className="master-icon-btn" style={{ color: '#dc2626', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1 }}>
                            <MdCheckCircle size={16} />
                          </button>
                          <button type="button" title="Reject — restore the record" onClick={() => handleReject(row)} disabled={busy}
                            className="master-icon-btn" style={{ color: '#16a34a', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1 }}>
                            <MdCancel size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PendingApprovalsPage;
