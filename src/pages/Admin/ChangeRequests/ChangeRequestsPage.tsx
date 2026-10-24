// ==========================================
// DREAM GROUP CRM - CHANGE REQUESTS PAGE
// ==========================================
// Review queue for Create/Edit proposals submitted by non-admin users (see
// modules/changeRequests/ in dgcrm_backend). Counterpart to the Pending
// Approvals page's delete-only queue: nothing here is written to the real
// table until an admin Approves it; Reject discards the proposal and
// leaves no trace on the target record. Admin/superadmin only, enforced
// server-side.
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from '@/utils/toast';
import { MdPendingActions, MdCheckCircle, MdCancel, MdRefresh, MdVisibility, MdMoreVert } from 'react-icons/md';

import { useAppDispatch } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import StatCard from '../../../components/masters/StatCard';
import { RowActionMenu, useRowActionMenu } from '../../../components/common/RowActionMenu';
import { showAlert, formatLastLogin } from '../../../utils';
import './ChangeRequestsPage.css';
import {
  fetchChangeRequests, approveChangeRequest, rejectChangeRequest,
  ChangeRequestRow, ChangeRequestModule,
} from '../../../services/changeRequestsService';
import { MODULE_LABEL, MODULES, ACTION_LABEL, summarize, recordContext, RequestReviewModal } from '../../../components/approvals/RequestReview';
import { fetchPendingApprovalCounts, PENDING_APPROVALS_CHANGED } from '../../../services/pendingApprovalsService';

// `embedded` — shown as a tab inside Pending Admin Approval (V_25.0).
interface ErrLike { response?: { data?: { message?: string } } }
const errMessage = (e: unknown, fallback: string) => (e as ErrLike)?.response?.data?.message || fallback;

const ChangeRequestsPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const dispatch = useAppDispatch();
  const { isDark, t, cssVars } = useAppearanceTokens();

  // V_26.0 — inside Pending Approvals, payment delete requests are on the
  // Delete Requests tab instead.
  const modules = embedded ? MODULES.filter((m) => m !== 'payment') : MODULES;
  const [activeModule, setActiveModule] = useState<ChangeRequestModule>(modules[0]);
  const [rows, setRows] = useState<ChangeRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [detailsRow, setDetailsRow] = useState<ChangeRequestRow | null>(null);
  const rowMenu = useRowActionMenu<string>();
  // V_26.0 — pending count on each module tab, so nothing waits unseen in a
  // tab the Admin hasn't opened.
  const [moduleCounts, setModuleCounts] = useState<Record<string, number>>({});

  useEffect(() => { if (!embedded) dispatch(setPageTitle('Change Requests')); }, [dispatch, embedded]);

  useEffect(() => {
    const loadCounts = () => { fetchPendingApprovalCounts().then((c) => setModuleCounts(c.changes_by_module)).catch(() => { /* tabs just show no count */ }); };
    loadCounts();
    window.addEventListener(PENDING_APPROVALS_CHANGED, loadCounts);
    return () => window.removeEventListener(PENDING_APPROVALS_CHANGED, loadCounts);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchChangeRequests(activeModule, 'pending'));
    } catch (e) {
      toast.error(errMessage(e, 'Failed to load change requests.'));
    } finally {
      setLoading(false);
    }
  }, [activeModule]);

  useEffect(() => { load(); }, [load]);

  // V_26.0 — both return true when the request was decided (the popup closes).
  const handleApprove = async (row: ChangeRequestRow): Promise<boolean> => {
    const result = await showAlert.confirm(
      row.action === 'delete'
        ? `This will permanently delete the payment ${summarize(row)}.`
        : row.action === 'reassign'
        ? `${summarize(row)} will move from ${String(row.old_values?.assigned_to ?? '—')} to ${String(row.new_values?.assigned_to ?? '—')}.`
        : row.action === 'cancel_booking'
        ? `This will cancel ${summarize(row)}'s booking and move them to Cancelled Booking.`
        : row.action === 'edit'
          ? `This will apply the proposed changes to ${MODULE_LABEL[row.module]} "${summarize(row)}".`
          : `This will create the proposed ${MODULE_LABEL[row.module]} record ("${summarize(row)}").`,
      'Approve Request?'
    );
    if (!result.isConfirmed) return false;
    setBusyKey(row.id);
    try {
      await approveChangeRequest(row.id);
      // V_25.0 — a clear confirmation that the change is now live.
      const what = row.action === 'create' ? `The new ${MODULE_LABEL[row.module]} "${summarize(row)}" was approved.`
        : row.action === 'edit' ? `The changes to ${MODULE_LABEL[row.module]} "${summarize(row)}" were approved.`
        : row.action === 'cancel_booking' ? `The cancel booking request for "${summarize(row)}" was approved.`
        : row.action === 'reassign' ? `"${summarize(row)}" is now assigned to ${String(row.new_values?.assigned_to ?? '—')}.`
        : `The delete request for ${MODULE_LABEL[row.module]} "${summarize(row)}" was approved.`;
      showAlert.approved(what);
      await load();
      return true;
    } catch (e) {
      toast.error(errMessage(e, 'Failed to approve request.'));
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  const handleReject = async (row: ChangeRequestRow): Promise<boolean> => {
    // V_26.0 — the note is shown to the employee on My Requests.
    const { isConfirmed, note } = await showAlert.confirmWithNote(
      `Reject this ${MODULE_LABEL[row.module]} ${ACTION_LABEL[row.action].toLowerCase()} request ("${summarize(row)}")?`,
      'Reject Request?', 'Reject', 'Reason for the employee (optional)');
    if (!isConfirmed) return false;
    setBusyKey(row.id);
    try {
      await rejectChangeRequest(row.id, note || undefined);
      toast.success('Request rejected.');
      await load();
      return true;
    } catch (e) {
      toast.error(errMessage(e, 'Failed to reject request.'));
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div className="cr-stat-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <StatCard label="Pending Requests" value={rows.length} icon={MdPendingActions} color="#d97706" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Module" value={MODULE_LABEL[activeModule]} icon={MdPendingActions} color="#0000FF" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
      </div>

      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex items-center justify-between p-4 flex-wrap gap-2" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <div className="flex items-center gap-2 flex-wrap">
            {modules.map((m) => (
              <button key={m} type="button" onClick={() => setActiveModule(m)}
                className="rounded-lg"
                style={{
                  padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${activeModule === m ? '#4338ca' : t.surfaceBorder}`,
                  background: activeModule === m ? '#4338ca' : t.insetBg,
                  color: activeModule === m ? '#fff' : t.textPrimary,
                }}>
                {MODULE_LABEL[m]}{moduleCounts[m] ? ` (${moduleCounts[m]})` : ''}
              </button>
            ))}
          </div>
          <button type="button" onClick={load} title="Refresh"
            className="flex items-center justify-center rounded-xl"
            style={{ width: 36, height: 36, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
            <MdRefresh size={17} />
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="cr-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                {['Action', 'Record', 'Requested By', 'Department', 'Designation', 'Requested At', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>Loading change requests...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>No {MODULE_LABEL[activeModule]} requests are waiting for review.</td></tr>
              ) : (
                rows.map((row) => {
                  const busy = busyKey === row.id;
                  return (
                    <tr key={row.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, fontWeight: 600, color: isDark ? '#fff' : '#000' }}>{ACTION_LABEL[row.action]}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: isDark ? '#fff' : '#000' }}>
                        <button type="button" onClick={() => setDetailsRow(row)}
                          className="flex items-center gap-1.5" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, fontSize: 12 }}>
                          {summarize(row)} <MdVisibility size={14} color="var(--brand-gradient)" />
                        </button>
                        {recordContext(row) && <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 2 }}>{recordContext(row)}</div>}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary }}>
                        <div style={{ fontWeight: 600, color: isDark ? '#fff' : '#000' }}>
                          {row.requested_by_name || row.requested_by_email || (row.requested_by ? `User #${row.requested_by}` : '—')}
                        </div>
                        {row.requested_by_code && <div style={{ fontSize: 10.5 }}>{row.requested_by_code}</div>}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary }}>{row.requested_by_departments || '—'}</td>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary }}>{row.requested_by_designations || '—'}</td>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatLastLogin(row.requested_at)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div className="flex items-center justify-center">
                          <button type="button" title="Actions" className="master-icon-btn"
                            ref={rowMenu.openId === row.id ? rowMenu.buttonRef : undefined}
                            onClick={rowMenu.toggle(row.id, 2)}>
                            <MdMoreVert size={16} />
                          </button>
                          {rowMenu.openId === row.id && rowMenu.pos && (
                            <RowActionMenu t={t} pos={rowMenu.pos} actions={[
                              { key: 'approve', label: 'Approve', icon: <MdCheckCircle size={14} color="#16a34a" />, disabled: busy, onClick: () => { rowMenu.close(); handleApprove(row); } },
                              { key: 'reject', label: 'Reject', icon: <MdCancel size={14} />, danger: true, disabled: busy, onClick: () => { rowMenu.close(); handleReject(row); } },
                            ]} />
                          )}
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

      {detailsRow && (
        <RequestReviewModal t={t} isDark={isDark} row={detailsRow} onClose={() => setDetailsRow(null)} onDecided={load}
          onUpdated={(updated) => setRows((rs) => rs.map((r) => (r.id === updated.id ? updated : r)))} />
      )}
    </div>
  );
};

export default ChangeRequestsPage;
