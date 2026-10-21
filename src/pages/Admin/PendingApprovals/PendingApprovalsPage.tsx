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
import { toast } from '@/utils/toast';
import { MdPendingActions, MdCheckCircle, MdCancel, MdRefresh, MdMoreVert, MdVisibility, MdClose } from 'react-icons/md';

import { useAppDispatch } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import ChangeRequestsPage from '../ChangeRequests/ChangeRequestsPage';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import StatCard from '../../../components/masters/StatCard';
import { RowActionMenu, useRowActionMenu } from '../../../components/common/RowActionMenu';
import { showAlert, formatLastLogin, formatDate } from '../../../utils';
import DocumentViewerModal from '../../../components/common/DocumentViewerModal';
import { fieldLabel, displayFieldValue, isFileValue, isBlank } from '../../../components/common/RequestValuesTable';
import { AppTheme } from '../../../styles/theme';
import {
  fetchPendingRefunds, approveRefund, rejectRefund, fetchRefundSummary, PendingRefundRow, RefundSummary,
} from '../../../services/customerDetailsService';
import './PendingApprovalsPage.css';
import {
  fetchPendingApprovals, approvePendingDelete, rejectPendingDelete, fetchPendingDeleteRecord,
  fetchPendingApprovalCounts, PENDING_APPROVALS_CHANGED, PendingApprovalCounts,
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
  employee: 'Employee',
};

const rowKey = (r: PendingApprovalRow) => `${r.entity_type}:${r.id}`;
const rupee = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

// V_26.0 — shared popup shell for the details views on this page.
const DetailsModal: React.FC<{ t: AppTheme; title: string; onClose: () => void; children: React.ReactNode }> = ({ t, title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, maxWidth: 760, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
      <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: 0 }}>{title}</h3>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary }}><MdClose size={18} /></button>
      </div>
      <div className="p-4" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  </div>
);

// A record's filled-in fields, documents previewable.
const RecordTable: React.FC<{ t: AppTheme; record: Record<string, unknown>; onPreview: (d: { label: string; url: string }) => void }> = ({ t, record, onPreview }) => {
  const cell: React.CSSProperties = { padding: '7px 8px', fontSize: 12, borderTop: `1px solid ${t.divider}`, verticalAlign: 'top', wordBreak: 'break-word', color: t.textPrimary };
  const entries = Object.entries(record).filter(([, v]) => !isBlank(v));
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        {entries.map(([k, v]) => (
          <tr key={k}>
            <td style={{ ...cell, color: t.textSecondary, fontWeight: 600, whiteSpace: 'nowrap', width: '40%' }}>{fieldLabel(k)}</td>
            <td style={cell}>{isFileValue(v)
              ? <button type="button" onClick={() => onPreview({ label: fieldLabel(k), url: v })} className="master-icon-btn" style={{ fontSize: 12, padding: '2px 8px', width: 'auto' }}>View document</button>
              : displayFieldValue(k, v)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const DeleteRequestsTab: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isDark, t, cssVars } = useAppearanceTokens();

  const [rows, setRows] = useState<PendingApprovalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const rowMenu = useRowActionMenu<string>();
  const [details, setDetails] = useState<{ row: PendingApprovalRow; record: Record<string, unknown> | null } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ label: string; url: string } | null>(null);

  useEffect(() => { dispatch(setPageTitle('Pending Approvals')); }, [dispatch]);

  // V_26.0 — what is being deleted, before approving.
  const openDetails = async (row: PendingApprovalRow) => {
    setDetails({ row, record: null });
    try {
      const record = await fetchPendingDeleteRecord(row.entity_type, row.id);
      setDetails({ row, record });
    } catch (e) {
      setDetails(null);
      toast.error(errMessage(e, 'Failed to load the record.'));
    }
  };

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
      showAlert.approved('The delete request was approved.');
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
      <div className="pnd-stat-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <StatCard label="Pending Requests" value={rows.length} icon={MdPendingActions} color="#d97706" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Modules Affected" value={Object.keys(moduleCounts).length} icon={MdPendingActions} color="#0000FF" bg="" loading={loading}
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
          <table className="pnd-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
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
                      <td style={{ padding: '12px 14px', fontSize: 12, color: isDark ? '#fff' : '#000' }}>
                        <button type="button" onClick={() => openDetails(row)} className="flex items-center gap-1.5"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, fontSize: 12 }}>
                          {row.label || `#${row.id}`} <MdVisibility size={14} />
                        </button>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary }}>
                        {row.requested_by_name || row.requested_by_email || (row.requested_by ? `User #${row.requested_by}` : '—')}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatLastLogin(row.requested_at)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div className="flex items-center justify-center">
                          <button type="button" title="Actions" className="master-icon-btn"
                            ref={rowMenu.openId === key ? rowMenu.buttonRef : undefined}
                            onClick={rowMenu.toggle(key, 2)}>
                            <MdMoreVert size={16} />
                          </button>
                          {rowMenu.openId === key && rowMenu.pos && (
                            <RowActionMenu t={t} pos={rowMenu.pos} actions={[
                              { key: 'view', label: 'View details', icon: <MdVisibility size={14} />, onClick: () => { rowMenu.close(); openDetails(row); } },
                              { key: 'approve', label: 'Approve — permanently delete', icon: <MdCheckCircle size={14} color="#dc2626" />, danger: true, disabled: busy, onClick: () => { rowMenu.close(); handleApprove(row); } },
                              { key: 'reject', label: 'Reject — restore the record', icon: <MdCancel size={14} color="#16a34a" />, disabled: busy, onClick: () => { rowMenu.close(); handleReject(row); } },
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
      {details && (
        <DetailsModal t={t} title={`${MODULE_LABEL[details.row.entity_type]} — delete request`} onClose={() => setDetails(null)}>
          <div style={{ fontSize: 12, color: t.textSecondary }}>
            Requested by <b style={{ color: t.textPrimary }}>{details.row.requested_by_name || details.row.requested_by_email || '—'}</b> on {formatLastLogin(details.row.requested_at)}.
            {' '}Approving deletes this record permanently.
          </div>
          {details.record ? <RecordTable t={t} record={details.record} onPreview={setPreviewDoc} /> : <div style={{ fontSize: 12, color: t.textSecondary }}>Loading...</div>}
        </DetailsModal>
      )}
      {previewDoc && <DocumentViewerModal t={t} label={previewDoc.label} url={previewDoc.url} onClose={() => setPreviewDoc(null)} />}
    </div>
  );
};

// V_26.0 — refunds for cancelled bookings, which the sidebar count already
// includes; approved / rejected here or on Cancelled Booking (same API).
const RefundRequestsTab: React.FC = () => {
  const { isDark, t, cssVars } = useAppearanceTokens();
  const [rows, setRows] = useState<PendingRefundRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [details, setDetails] = useState<{ row: PendingRefundRow; summary: RefundSummary | null } | null>(null);
  const rowMenu = useRowActionMenu<string>();

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchPendingRefunds()); }
    catch (e) { toast.error(errMessage(e, 'Failed to load refund requests.')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const unit = (r: PendingRefundRow) => [r.building_name, r.wing_name, r.flat_no ? `Flat ${r.flat_no}` : null, r.shop_no ? `Shop ${r.shop_no}` : null].filter(Boolean).join(' · ');
  const openDetails = async (row: PendingRefundRow) => {
    setDetails({ row, summary: null });
    try { setDetails({ row, summary: await fetchRefundSummary(row.customer_id) }); }
    catch (e) { setDetails(null); toast.error(errMessage(e, 'Failed to load the refund details.')); }
  };
  const handleApprove = async (row: PendingRefundRow) => {
    const ok = await showAlert.confirm(`Approve a refund of ${rupee(row.refunded_amount)} to ${row.customer_name}? A cancelled receipt number is assigned.`, 'Approve Refund?');
    if (!ok.isConfirmed) return;
    setBusyId(row.id);
    try { await approveRefund(row.id); showAlert.approved('The refund was approved.'); setDetails(null); await load(); }
    catch (e) { toast.error(errMessage(e, 'Failed to approve the refund.')); }
    finally { setBusyId(null); }
  };
  const handleReject = async (row: PendingRefundRow) => {
    const ok = await showAlert.confirm(`Reject the refund of ${rupee(row.refunded_amount)} to ${row.customer_name}?`, 'Reject Refund?');
    if (!ok.isConfirmed) return;
    setBusyId(row.id);
    try { await rejectRefund(row.id); toast.success('Refund request rejected.'); setDetails(null); await load(); }
    catch (e) { toast.error(errMessage(e, 'Failed to reject the refund.')); }
    finally { setBusyId(null); }
  };

  const cell: React.CSSProperties = { padding: '12px 14px', fontSize: 11.5, color: t.textSecondary };
  return (
    <div style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: 0 }}>Refunds Awaiting Approval</h3>
          <button type="button" onClick={load} title="Refresh" className="flex items-center justify-center rounded-xl"
            style={{ width: 36, height: 36, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
            <MdRefresh size={17} />
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: rows.length > 0 ? 900 : undefined }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                {['Customer', 'Unit', 'Refund Amount', 'Refund Date', 'Mode', 'Requested By', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>Loading refund requests...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>No refunds are waiting for approval.</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                  <td style={{ ...cell, fontSize: 12, color: isDark ? '#fff' : '#000' }}>
                    <button type="button" onClick={() => openDetails(row)} className="flex items-center gap-1.5"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, fontSize: 12, textAlign: 'left' }}>
                      {row.customer_name}{row.customer_code ? ` (${row.customer_code})` : ''} <MdVisibility size={14} />
                    </button>
                  </td>
                  <td style={cell}>{unit(row) || '—'}</td>
                  <td style={{ ...cell, fontWeight: 700, color: isDark ? '#fff' : '#000', whiteSpace: 'nowrap' }}>{rupee(row.refunded_amount)}</td>
                  <td style={{ ...cell, whiteSpace: 'nowrap' }}>{row.refund_date ? formatDate(row.refund_date) : '—'}</td>
                  <td style={cell}>{row.mode_of_payment || '—'}</td>
                  <td style={cell}>{row.created_by_name || '—'}<div style={{ fontSize: 10.5 }}>{formatLastLogin(row.created_at)}</div></td>
                  <td style={{ padding: '12px 14px' }}>
                    <div className="flex items-center justify-center">
                      <button type="button" title="Actions" className="master-icon-btn"
                        ref={rowMenu.openId === row.id ? rowMenu.buttonRef : undefined} onClick={rowMenu.toggle(row.id, 3)}>
                        <MdMoreVert size={16} />
                      </button>
                      {rowMenu.openId === row.id && rowMenu.pos && (
                        <RowActionMenu t={t} pos={rowMenu.pos} actions={[
                          { key: 'view', label: 'View details', icon: <MdVisibility size={14} />, onClick: () => { rowMenu.close(); openDetails(row); } },
                          { key: 'approve', label: 'Approve refund', icon: <MdCheckCircle size={14} color="#16a34a" />, disabled: busyId === row.id, onClick: () => { rowMenu.close(); handleApprove(row); } },
                          { key: 'reject', label: 'Reject', icon: <MdCancel size={14} />, danger: true, disabled: busyId === row.id, onClick: () => { rowMenu.close(); handleReject(row); } },
                        ]} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {details && (
        <DetailsModal t={t} title="Refund request" onClose={() => setDetails(null)}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>
            {details.row.customer_name}{details.row.customer_code ? ` · ${details.row.customer_code}` : ''}
            {unit(details.row) && <span style={{ fontWeight: 500, color: t.textSecondary }}> · {unit(details.row)}</span>}
          </div>
          <RecordTable t={t} onPreview={() => {}} record={{
            refund_amount: details.row.refunded_amount, refund_date: details.row.refund_date, mode_of_payment: details.row.mode_of_payment,
            notes: details.row.notes, requested_by: details.row.created_by_name,
          }} />
          {details.summary ? (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, marginTop: 6 }}>This customer's refund position</div>
              <RecordTable t={t} onPreview={() => {}} record={{
                total_paid_amount: details.summary.total_paid,
                already_refunded_amount: details.summary.total_refunded,
                pending_refunds_amount: details.summary.pending_refund,
                refundable_left_after_pending_amount: details.summary.remaining_refundable,
              }} />
              <div style={{ fontSize: 11, color: t.textSecondary }}>Total paid counts approved payments. Pending refunds include this request.</div>
            </>
          ) : <div style={{ fontSize: 12, color: t.textSecondary }}>Loading...</div>}
          <div className="flex items-center gap-2 justify-end" style={{ marginTop: 6 }}>
            <button type="button" disabled={busyId === details.row.id} onClick={() => handleReject(details.row)} className="rounded-xl"
              style={{ padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: t.inputBg, color: '#dc2626', border: `1px solid ${t.inputBorder}` }}>Reject</button>
            <button type="button" disabled={busyId === details.row.id} onClick={() => handleApprove(details.row)} className="master-btn-primary" style={{ padding: '7px 14px', fontSize: 12 }}>Approve refund</button>
          </div>
        </DetailsModal>
      )}
    </div>
  );
};

// V_25.0 — one place for everything waiting on an Admin: employees' and
// Heads' customer / employee / lead add & edit requests and Cancel Booking
// requests (the change-request queue, which had no menu entry before),
// next to the existing delete requests.
const PendingApprovalsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t } = useAppearanceTokens();
  useEffect(() => { dispatch(setPageTitle('Pending Approvals')); }, [dispatch]);
  const [tab, setTab] = useState<'changes' | 'deletes' | 'refunds'>('changes');
  // V_26.0 — each tab shows how many requests wait in it; together they add
  // up to the sidebar count.
  const [counts, setCounts] = useState<PendingApprovalCounts | null>(null);
  useEffect(() => {
    const loadCounts = () => { fetchPendingApprovalCounts().then(setCounts).catch(() => { /* tabs just show no count */ }); };
    loadCounts();
    window.addEventListener(PENDING_APPROVALS_CHANGED, loadCounts);
    return () => window.removeEventListener(PENDING_APPROVALS_CHANGED, loadCounts);
  }, []);
  const withCount = (label: string, n: number | undefined) => (n ? `${label} (${n})` : label);
  const tabBtn = (key: 'changes' | 'deletes' | 'refunds', label: string) => (
    <button key={key} type="button" onClick={() => setTab(key)} className="rounded-lg"
      style={{
        padding: '8px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
        border: `1px solid ${tab === key ? 'transparent' : t.surfaceBorder}`,
        background: tab === key ? 'var(--brand-gradient)' : t.surfaceBg,
        color: tab === key ? '#fff' : t.textPrimary,
      }}>
      {label}
    </button>
  );
  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {tabBtn('changes', withCount('Add / Edit / Cancel Requests', counts?.changes))}
        {tabBtn('deletes', withCount('Delete Requests', counts?.deletes))}
        {tabBtn('refunds', withCount('Refund Requests', counts?.refunds))}
      </div>
      {tab === 'changes' ? <ChangeRequestsPage embedded /> : tab === 'deletes' ? <DeleteRequestsTab /> : <RefundRequestsTab />}
    </div>
  );
};

export default PendingApprovalsPage;
