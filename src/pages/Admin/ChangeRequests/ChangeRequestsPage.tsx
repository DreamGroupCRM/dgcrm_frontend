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
import { MdPendingActions, MdCheckCircle, MdCancel, MdRefresh, MdVisibility, MdClose, MdMoreVert } from 'react-icons/md';

import { useAppDispatch } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import StatCard from '../../../components/masters/StatCard';
import { RowActionMenu, useRowActionMenu } from '../../../components/common/RowActionMenu';
import { showAlert, formatLastLogin } from '../../../utils';
import './ChangeRequestsPage.css';
import DocumentViewerModal from '../../../components/common/DocumentViewerModal';
import DateInput from '../../../components/common/DateInput';
import { serverTodayYmd } from '../../../utils/serverTime';
import {
  fetchChangeRequests, approveChangeRequest, rejectChangeRequest,
  ChangeRequestRow, ChangeRequestModule,
  adminEditChangeRequest, ADMIN_EDITABLE_CUSTOMER_FIELDS, ADMIN_BOOLEAN_FIELDS, CUSTOMER_DOC_FIELDS,
} from '../../../services/changeRequestsService';
import { AppTheme } from '../../../styles/theme';
import { RequestValuesTable, fieldLabel } from '../../../components/common/RequestValuesTable';

interface ErrLike { response?: { data?: { message?: string } } }
const errMessage = (e: unknown, fallback: string) => (e as ErrLike)?.response?.data?.message || fallback;

// Extend this map as more modules opt into the change-request queue (see
// APPLY_HANDLERS in the backend's changeRequests.service.ts) — currently
// only Lead create.
const MODULE_LABEL: Record<ChangeRequestModule, string> = {
  customer: 'Customer',
  lead: 'Lead',
  // V_25.0 — HR's employee add/edit.
  employee: 'Employee',
  // V_25.0 — a Head's request to delete a team payment.
  payment: 'Payment',
};
const MODULES = Object.keys(MODULE_LABEL) as ChangeRequestModule[];

const ACTION_LABEL: Record<ChangeRequestRow['action'], string> = { create: 'Create', edit: 'Edit', cancel_booking: 'Cancel Booking', delete: 'Delete' };

// Best-effort human label for a proposed row without inventing business
// rules about which field "is" the display name per module — falls back
// through a few common identity-ish keys, then the request id.
function summarize(row: ChangeRequestRow): string {
  if (row.module === 'payment') {
    const o = row.old_values || {};
    const amt = o.amount != null ? `₹${Number(o.amount).toLocaleString('en-IN')}` : 'Payment';
    return `${amt}${o.receipt_number ? ` (Receipt ${o.receipt_number})` : ''}`;
  }
  const v = row.new_values || {};
  const personName = [v.first_name, v.last_name].filter(Boolean).join(' ');
  const old = row.old_values || {};
  // Customers keep the first name in `name`, employees in `first_name`.
  const oldName = [old.first_name ?? old.name, old.last_name].filter(Boolean).join(' ');
  const newName = [v.name, v.middle_name, v.last_name].filter(Boolean).join(' ');
  const candidate = (v.customer_name || newName || personName || old.customer_name || oldName || v.title || v.mobile_number || v.email) as string | undefined;
  return candidate ? String(candidate) : `Request #${row.id}`;
}


// V_26.0 — Admin corrects a customer add / edit request before approving:
// contact / identity fields and the six documents (never prices or the
// payment plan — the server enforces the same list). Saved separately from
// the employee's submission, which stays as sent.
const AdminEditForm: React.FC<{ t: AppTheme; row: ChangeRequestRow; onSaved: (adminValues: Record<string, unknown>) => void; onCancel: () => void }> = ({ t, row, onSaved, onCancel }) => {
  const current = { ...row.new_values, ...(row.admin_values ?? {}) };
  const asText = (v: unknown) => (v === null || v === undefined ? '' : String(v));
  const [fields, setFields] = useState<Record<string, string>>(() =>
    Object.fromEntries(ADMIN_EDITABLE_CUSTOMER_FIELDS.map((k) => [k, asText(current[k])])));
  const [files, setFiles] = useState<Partial<Record<(typeof CUSTOMER_DOC_FIELDS)[number], File>>>({});
  const [saving, setSaving] = useState(false);
  const input: React.CSSProperties = { width: '100%', padding: '6px 8px', fontSize: 12, borderRadius: 8, border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.textPrimary };

  const save = async () => {
    if (saving) return;
    // Only what the Admin actually changed is sent.
    const changed = Object.fromEntries(Object.entries(fields).filter(([k, v]) =>
      k === 'date_of_birth' ? v.slice(0, 10) !== asText(current[k]).slice(0, 10) : v !== asText(current[k])));
    if (Object.keys(changed).length === 0 && Object.keys(files).length === 0) { toast.error('Nothing changed.'); return; }
    setSaving(true);
    try {
      const adminValues = await adminEditChangeRequest(row.id, changed, files);
      toast.success('Changes saved. They are applied when you approve the request.');
      onSaved(adminValues);
    } catch (e) {
      toast.error(errMessage(e, 'Failed to save the changes.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 12, color: t.textSecondary }}>
        Correct contact details or replace documents. Prices and the payment plan can't be changed here — reject the request instead.
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ADMIN_EDITABLE_CUSTOMER_FIELDS.map((k) => (
          <label key={k} style={{ fontSize: 11, color: t.textSecondary, fontWeight: 600 }}>
            {fieldLabel(k)}
            {ADMIN_BOOLEAN_FIELDS.includes(k) ? (
              <select value={fields[k] === 'true' ? 'true' : 'false'} onChange={(e) => setFields((f) => ({ ...f, [k]: e.target.value }))} style={input}>
                <option value="true">Yes</option><option value="false">No</option>
              </select>
            ) : k === 'date_of_birth' ? (
              <DateInput t={t} value={fields[k].slice(0, 10)} max={serverTodayYmd()} onChange={(v) => setFields((f) => ({ ...f, [k]: v }))} style={input} />
            ) : (
              <input value={fields[k]} onChange={(e) => setFields((f) => ({ ...f, [k]: e.target.value }))} style={input} />
            )}
          </label>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {CUSTOMER_DOC_FIELDS.map((k) => (
          <label key={k} style={{ fontSize: 11, color: t.textSecondary, fontWeight: 600 }}>
            Replace {fieldLabel(k)}
            <input type="file" accept="image/*,application/pdf"
              onChange={(e) => { const f = e.target.files?.[0]; setFiles((p) => { const n = { ...p }; if (f) n[k] = f; else delete n[k]; return n; }); }}
              style={{ ...input, padding: 4 }} />
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button type="button" onClick={onCancel} disabled={saving} className="rounded-xl" style={{ padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: t.inputBg, color: t.textPrimary, border: `1px solid ${t.inputBorder}` }}>Cancel</button>
        <button type="button" onClick={save} disabled={saving} className="master-btn-primary" style={{ padding: '7px 14px', fontSize: 12 }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

// `embedded` — shown as a tab inside Pending Admin Approval (V_25.0).
const ChangeRequestsPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const dispatch = useAppDispatch();
  const { isDark, t, cssVars } = useAppearanceTokens();

  const [activeModule, setActiveModule] = useState<ChangeRequestModule>(MODULES[0]);
  const [previewDoc, setPreviewDoc] = useState<{ label: string; url: string } | null>(null);
  const [adminEditing, setAdminEditing] = useState(false);
  const [rows, setRows] = useState<ChangeRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [detailsRow, setDetailsRow] = useState<ChangeRequestRow | null>(null);
  const rowMenu = useRowActionMenu<string>();

  useEffect(() => { if (!embedded) dispatch(setPageTitle('Change Requests')); }, [dispatch, embedded]);

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
      row.action === 'delete'
        ? `This will permanently delete the payment ${summarize(row)}.`
        : row.action === 'cancel_booking'
        ? `This will cancel ${summarize(row)}'s booking and move them to Cancelled Booking.`
        : row.action === 'edit'
          ? `This will apply the proposed changes to ${MODULE_LABEL[row.module]} "${summarize(row)}".`
          : `This will create the proposed ${MODULE_LABEL[row.module]} record ("${summarize(row)}").`,
      'Approve Request?'
    );
    if (!result.isConfirmed) return;
    setBusyKey(row.id);
    try {
      await approveChangeRequest(row.id);
      // V_25.0 — a clear confirmation that the change is now live.
      const what = row.action === 'create' ? `The new ${MODULE_LABEL[row.module]} "${summarize(row)}" was approved.`
        : row.action === 'edit' ? `The changes to ${MODULE_LABEL[row.module]} "${summarize(row)}" were approved.`
        : row.action === 'cancel_booking' ? `The cancel booking request for "${summarize(row)}" was approved.`
        : `The delete request for ${MODULE_LABEL[row.module]} "${summarize(row)}" was approved.`;
      showAlert.approved(what);
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
      <div className="cr-stat-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <StatCard label="Pending Requests" value={rows.length} icon={MdPendingActions} color="#d97706" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Module" value={MODULE_LABEL[activeModule]} icon={MdPendingActions} color="#0000FF" bg="" loading={loading}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="rounded-2xl"
            style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, maxWidth: 760, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: 0 }}>
                Proposed {MODULE_LABEL[detailsRow.module]} {ACTION_LABEL[detailsRow.action]}
              </h3>
              <button type="button" onClick={() => { setDetailsRow(null); setAdminEditing(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary }}>
                <MdClose size={18} />
              </button>
            </div>
            <div className="p-4" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, color: t.textSecondary }}>
                Requested by <b style={{ color: t.textPrimary }}>{detailsRow.requested_by_name || detailsRow.requested_by_email || '—'}</b>
                {' '}on {formatLastLogin(detailsRow.requested_at)} · Status: <b style={{ color: t.textPrimary }}>{detailsRow.status}</b>
              </div>
              <RequestValuesTable t={t} isDark={isDark} row={detailsRow} onPreview={setPreviewDoc} />
              {detailsRow.module === 'customer' && (detailsRow.action === 'create' || detailsRow.action === 'edit') && detailsRow.status === 'pending' && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${t.divider}` }}>
                  {adminEditing ? (
                    <AdminEditForm t={t} row={detailsRow} onCancel={() => setAdminEditing(false)}
                      onSaved={(adminValues) => {
                        const updated = { ...detailsRow, admin_values: adminValues };
                        setDetailsRow(updated);
                        setRows((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
                        setAdminEditing(false);
                      }} />
                  ) : (
                    <button type="button" onClick={() => setAdminEditing(true)} className="rounded-xl" style={{ padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: t.inputBg, color: t.textPrimary, border: `1px solid ${t.inputBorder}` }}>
                      Edit before approving
                    </button>
                  )}
                </div>
              )}
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
      {previewDoc && <DocumentViewerModal t={t} label={previewDoc.label} url={previewDoc.url} onClose={() => setPreviewDoc(null)} />}
    </div>
  );
};

export default ChangeRequestsPage;
