// ==========================================
// DREAM GROUP CRM - MY REQUESTS PAGE (EMPLOYEE)
// ==========================================
// V_26.0 — every request the logged-in employee sent for Admin approval
// (customer add / edit / cancel booking, lead, employee, payment delete),
// with its status and Admin's remark. Read-only — the same details view
// Admin reviews.
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from '@/utils/toast';
import { MdClose, MdRefresh, MdVisibility } from 'react-icons/md';

import { useAppDispatch } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import { getFormInputStyle, StatusChip } from '../../../components/common/MasterListUI';
import { RequestValuesTable } from '../../../components/common/RequestValuesTable';
import DocumentViewerModal from '../../../components/common/DocumentViewerModal';
import { fetchMyChangeRequests, ChangeRequestRow, ChangeRequestStatus } from '../../../services/changeRequestsService';
import { formatLastLogin } from '../../../utils';

const MODULE_LABEL: Record<string, string> = { customer: 'Customer', lead: 'Lead', employee: 'Employee', payment: 'Payment' };
const ACTION_LABEL: Record<string, string> = { create: 'Add', edit: 'Edit', cancel_booking: 'Cancel Booking', delete: 'Delete' };
const STATUS_LABEL: Record<ChangeRequestStatus, string> = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };

function recordName(r: ChangeRequestRow): string {
  const v = { ...(r.old_values ?? {}), ...r.new_values, ...(r.admin_values ?? {}) } as Record<string, unknown>;
  if (r.module === 'payment') return r.old_values?.receipt_number ? `Receipt ${r.old_values.receipt_number}` : `₹${Number(r.old_values?.amount ?? 0).toLocaleString('en-IN')}`;
  const name = [v.name ?? v.first_name, v.last_name].filter(Boolean).join(' ') || (v.title as string) || (v.customer_name as string);
  return name || `Request #${r.id}`;
}

const MyRequestsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t, isDark, cssVars } = useAppearanceTokens();
  const [rows, setRows] = useState<ChangeRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'' | ChangeRequestStatus>('');
  const [details, setDetails] = useState<ChangeRequestRow | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ label: string; url: string } | null>(null);

  useEffect(() => { dispatch(setPageTitle('My Requests')); }, [dispatch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchMyChangeRequests({ status: status || undefined }));
    } catch (e) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load your requests.');
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => { load(); }, [load]);
  // Reload when the tab is focused again — Admin may have decided meanwhile.
  useEffect(() => { window.addEventListener('focus', load); return () => window.removeEventListener('focus', load); }, [load]);

  const cell: React.CSSProperties = { padding: '12px 14px', fontSize: 11.5, color: t.textSecondary };

  return (
    <div style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="p-4 flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: 0 }}>Requests sent for Admin approval</h3>
          <div className="flex items-center gap-2">
            <select value={status} onChange={(e) => setStatus(e.target.value as '' | ChangeRequestStatus)} aria-label="Status" style={{ ...getFormInputStyle(t), width: 150 }}>
              <option value="">All Status</option>
              {(Object.keys(STATUS_LABEL) as ChangeRequestStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <button type="button" onClick={load} title="Refresh" aria-label="Refresh" className="flex items-center justify-center rounded-xl"
              style={{ width: 40, height: 40, background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
              <MdRefresh size={18} />
            </button>
          </div>
        </div>
        <div className="master-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                {['Request', 'Record', 'Sent On', 'Status', 'Admin Remark', 'Details'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ ...cell, padding: 28, textAlign: 'center' }}>Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} style={{ ...cell, padding: 28, textAlign: 'center' }}>You have not sent any requests.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                  <td style={{ ...cell, whiteSpace: 'nowrap', color: t.textPrimary, fontWeight: 600 }}>{MODULE_LABEL[r.module] ?? r.module} · {ACTION_LABEL[r.action] ?? r.action}</td>
                  <td style={{ ...cell, wordBreak: 'break-word' }}>{recordName(r)}</td>
                  <td style={{ ...cell, whiteSpace: 'nowrap' }}>{formatLastLogin(r.requested_at)}</td>
                  <td style={cell}><StatusChip label={STATUS_LABEL[r.status] ?? r.status} status={r.status} fontSize={11} /></td>
                  <td style={{ ...cell, wordBreak: 'break-word' }}>{r.admin_remarks || '—'}</td>
                  <td style={cell}>
                    <button type="button" onClick={() => setDetails(r)} title="View details" aria-label={`View details of ${recordName(r)}`} className="master-icon-btn">
                      <MdVisibility size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {details && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, maxWidth: 760, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: 0 }}>
                {MODULE_LABEL[details.module] ?? details.module} {ACTION_LABEL[details.action] ?? details.action} — {STATUS_LABEL[details.status] ?? details.status}
              </h3>
              <button type="button" onClick={() => setDetails(null)} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary }}>
                <MdClose size={18} />
              </button>
            </div>
            <div className="p-4" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {details.reviewed_at && (
                <div style={{ fontSize: 12, color: t.textSecondary }}>
                  {STATUS_LABEL[details.status]} by <b style={{ color: t.textPrimary }}>{details.reviewed_by_name || 'Admin'}</b> on {formatLastLogin(details.reviewed_at)}
                  {details.admin_remarks ? <> · Remark: <b style={{ color: t.textPrimary }}>{details.admin_remarks}</b></> : null}
                </div>
              )}
              <RequestValuesTable t={t} isDark={isDark} row={details} onPreview={setPreviewDoc} />
            </div>
          </div>
        </div>
      )}
      {previewDoc && <DocumentViewerModal t={t} label={previewDoc.label} url={previewDoc.url} onClose={() => setPreviewDoc(null)} />}
    </div>
  );
};

export default MyRequestsPage;
