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
import { toast } from 'react-toastify';
import { MdPendingActions, MdCheckCircle, MdCancel, MdRefresh, MdVisibility, MdClose } from 'react-icons/md';

import { useAppDispatch } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import StatCard from '../../../components/masters/StatCard';
import { showAlert, formatLastLogin } from '../../../utils';
import {
  fetchChangeRequests, approveChangeRequest, rejectChangeRequest,
  ChangeRequestRow, ChangeRequestModule,
} from '../../../services/changeRequestsService';

interface ErrLike { response?: { data?: { message?: string } } }
const errMessage = (e: unknown, fallback: string) => (e as ErrLike)?.response?.data?.message || fallback;

// Extend this map as more modules opt into the change-request queue (see
// APPLY_HANDLERS in the backend's changeRequests.service.ts) — currently
// only Lead create.
const MODULE_LABEL: Record<ChangeRequestModule, string> = {
  lead: 'Lead',
  customer: 'Customer',
};
const MODULES = Object.keys(MODULE_LABEL) as ChangeRequestModule[];

const ACTION_LABEL: Record<ChangeRequestRow['action'], string> = { create: 'Create', edit: 'Edit' };

// Best-effort human label for a proposed row without inventing business
// rules about which field "is" the display name per module — falls back
// through a few common identity-ish keys, then the request id.
function summarize(row: ChangeRequestRow): string {
  const v = row.new_values || {};
  const candidate = (v.name || v.title || v.mobile_number || v.email) as string | undefined;
  return candidate ? String(candidate) : `Request #${row.id}`;
}

function fieldLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const ChangeRequestsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isDark, t, cssVars } = useAppearanceTokens();

  const [activeModule, setActiveModule] = useState<ChangeRequestModule>(MODULES[0]);
  const [rows, setRows] = useState<ChangeRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [detailsRow, setDetailsRow] = useState<ChangeRequestRow | null>(null);

  useEffect(() => { dispatch(setPageTitle('Change Requests')); }, [dispatch]);

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

  const handleApprove = async (row: ChangeRequestRow) => {
    const result = await showAlert.confirm(
      `This will create the proposed ${MODULE_LABEL[row.module]} record ("${summarize(row)}").`,
      'Approve Request?'
    );
    if (!result.isConfirmed) return;
    setBusyKey(row.id);
    try {
      await approveChangeRequest(row.id);
      toast.success('Request approved.');
      await load();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to approve request.'));
    } finally {
      setBusyKey(null);
    }
  };

  const handleReject = async (row: ChangeRequestRow) => {
    setBusyKey(row.id);
    try {
      await rejectChangeRequest(row.id);
      toast.success('Request rejected.');
      await load();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to reject request.'));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <StatCard label="Pending Requests" value={rows.length} icon={MdPendingActions} color="#d97706" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Module" value={MODULE_LABEL[activeModule]} icon={MdPendingActions} color="#0284c7" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
      </div>

      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex items-center justify-between p-4 flex-wrap gap-2" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <div className="flex items-center gap-2 flex-wrap">
            {MODULES.map((m) => (
              <button key={m} type="button" onClick={() => setActiveModule(m)}
                className="rounded-lg"
                style={{
                  padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${activeModule === m ? '#4338ca' : t.surfaceBorder}`,
                  background: activeModule === m ? '#4338ca' : t.insetBg,
                  color: activeModule === m ? '#fff' : t.textPrimary,
                }}>
                {MODULE_LABEL[m]}
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
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                {['Action', 'Record', 'Requested By', 'Requested At', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>Loading change requests...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>No {MODULE_LABEL[activeModule]} requests are waiting for review.</td></tr>
              ) : (
                rows.map((row) => {
                  const busy = busyKey === row.id;
                  return (
                    <tr key={row.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, fontWeight: 600, color: isDark ? '#fff' : '#000' }}>{ACTION_LABEL[row.action]}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: isDark ? '#fff' : '#000' }}>
                        <button type="button" onClick={() => setDetailsRow(row)}
                          className="flex items-center gap-1.5" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, fontSize: 12 }}>
                          {summarize(row)} <MdVisibility size={14} color="#2563eb" />
                        </button>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary }}>
                        {row.requested_by_name || row.requested_by_email || (row.requested_by ? `User #${row.requested_by}` : '—')}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatLastLogin(row.requested_at)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div className="flex items-center gap-2">
                          <button type="button" title="Approve" onClick={() => handleApprove(row)} disabled={busy}
                            className="master-icon-btn" style={{ color: '#16a34a', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1 }}>
                            <MdCheckCircle size={16} />
                          </button>
                          <button type="button" title="Reject" onClick={() => handleReject(row)} disabled={busy}
                            className="master-icon-btn" style={{ color: '#dc2626', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1 }}>
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

      {detailsRow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setDetailsRow(null)}>
          <div onClick={(e) => e.stopPropagation()} className="rounded-2xl"
            style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, maxWidth: 520, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: 0 }}>
                Proposed {MODULE_LABEL[detailsRow.module]} {ACTION_LABEL[detailsRow.action]}
              </h3>
              <button type="button" onClick={() => setDetailsRow(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary }}>
                <MdClose size={18} />
              </button>
            </div>
            <div className="p-4" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(detailsRow.new_values).filter(([, v]) => v !== null && v !== '').map(([key, value]) => (
                <div key={key} className="flex items-start justify-between gap-3" style={{ fontSize: 12 }}>
                  <span style={{ color: t.textSecondary, fontWeight: 600 }}>{fieldLabel(key)}</span>
                  <span style={{ color: t.textPrimary, textAlign: 'right' }}>{String(value)}</span>
                </div>
              ))}
              {detailsRow.reason && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${t.divider}`, fontSize: 12 }}>
                  <span style={{ color: t.textSecondary, fontWeight: 600 }}>Reason: </span>
                  <span style={{ color: t.textPrimary }}>{detailsRow.reason}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChangeRequestsPage;
