// ==========================================
// DGCRM — REQUEST REVIEW (shared)
// ==========================================
// V_26.0 — an Admin reviews an employee's request where the record lives
// (Customer Details, Employee Details, Leads, Payment Received) instead of a
// separate Pending Approval page: the request as a filled-in form (changed
// fields highlighted, the old value under them), its documents, "Edit before
// approving", Reject and Approve. Also the hook that loads a page's pending
// requests and the list shown under a page's "Waiting for your approval" box.
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from '@/utils/toast';
import { MdCheckCircle, MdCancel, MdClose } from 'react-icons/md';
import { showAlert, formatLastLogin } from '../../utils';
import DocumentViewerModal from '../common/DocumentViewerModal';
import DateInput from '../common/DateInput';
import { serverTodayYmd } from '../../utils/serverTime';
import {
  fetchChangeRequests, approveChangeRequest, rejectChangeRequest,
  ChangeRequestRow, ChangeRequestModule,
  adminEditChangeRequest, ADMIN_EDITABLE_CUSTOMER_FIELDS, ADMIN_BOOLEAN_FIELDS, CUSTOMER_DOC_FIELDS,
  ADMIN_EDITABLE_EMPLOYEE_FIELDS, EMPLOYEE_DOC_FIELDS,
} from '../../services/changeRequestsService';
import { AppTheme } from '../../styles/theme';
import { RequestValuesTable, fieldLabel, displayFieldValue, isBlank, isFileValue, sameValue } from '../common/RequestValuesTable';
import {
  PENDING_APPROVALS_CHANGED, fetchPendingApprovals, approvePendingDelete, rejectPendingDelete,
  PendingApprovalRow, PendingApprovalEntityType,
} from '../../services/pendingApprovalsService';

interface ErrLike { response?: { data?: { message?: string } } }
const errMessage = (e: unknown, fallback: string) => (e as ErrLike)?.response?.data?.message || fallback;

// Extend this map as more modules opt into the change-request queue (see
// APPLY_HANDLERS in the backend's changeRequests.service.ts) — currently
// only Lead create.
export const MODULE_LABEL: Record<ChangeRequestModule, string> = {
  customer: 'Customer',
  lead: 'Lead',
  // V_25.0 — HR's employee add/edit.
  employee: 'Employee',
  // V_25.0 — a Head's request to delete a team payment.
  payment: 'Payment',
};
export const MODULES = Object.keys(MODULE_LABEL) as ChangeRequestModule[];

export const ACTION_LABEL: Record<ChangeRequestRow['action'], string> = { create: 'Create', edit: 'Edit', cancel_booking: 'Cancel Booking', delete: 'Delete', reassign: 'Reassign' };

// Best-effort human label for a proposed row without inventing business
// rules about which field "is" the display name per module — falls back
// through a few common identity-ish keys, then the request id.
export function summarize(row: ChangeRequestRow): string {
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
  // V_26.0 — customers keep the first name in `name` (only then is this a
  // customer's name); an edit is named by who the record is now.
  const newName = v.name ? [v.name, v.middle_name, v.last_name].filter(Boolean).join(' ') : '';
  const candidate = (row.action === 'edit'
    ? (old.customer_name || oldName || v.customer_name || newName || personName)
    : (v.customer_name || newName || personName || old.customer_name || oldName)) || v.title || v.mobile_number || v.email;
  return candidate ? String(candidate) : `Request #${row.id}`;
}


// V_26.0 — which customer (code, unit) a customer / payment request is about.
export const recordContext = (row: ChangeRequestRow): string =>
  [row.record_customer_name && row.module === 'payment' ? row.record_customer_name : null, row.record_customer_code, row.record_unit]
    .filter(Boolean).join(' · ');

// V_26.0 — Admin corrects a customer or employee add / edit request
// before approving: contact / identity fields and the documents (never
// prices, the payment plan, department, salary or bank details — the
// server enforces the same lists). Saved separately from the employee's
// submission, which stays as sent.
const DATE_FIELDS = ['date_of_birth', 'joining_date'];
// Upload field → label; for a customer the upload field is the stored key.
const docFieldsFor = (row: ChangeRequestRow): [string, string][] => row.module === 'employee'
  ? Object.entries(EMPLOYEE_DOC_FIELDS).map(([field, key]) => [field, fieldLabel(key)])
  : CUSTOMER_DOC_FIELDS.map((k) => [k, fieldLabel(k)]);
export const canAdminEdit = (row: ChangeRequestRow) =>
  (row.module === 'customer' || row.module === 'employee') && (row.action === 'create' || row.action === 'edit') && row.status === 'pending';
export const AdminEditForm: React.FC<{ t: AppTheme; row: ChangeRequestRow; onSaved: (adminValues: Record<string, unknown>) => void; onCancel: () => void }> = ({ t, row, onSaved, onCancel }) => {
  // An edit starts from the record as it is now, so unchanged details show too.
  const current = { ...(row.action === 'edit' ? row.old_values ?? {} : {}), ...row.new_values, ...(row.admin_values ?? {}) };
  const editable: readonly string[] = row.module === 'employee' ? ADMIN_EDITABLE_EMPLOYEE_FIELDS : ADMIN_EDITABLE_CUSTOMER_FIELDS;
  const asText = (v: unknown) => (v === null || v === undefined ? '' : String(v));
  const [fields, setFields] = useState<Record<string, string>>(() =>
    Object.fromEntries(editable.map((k) => [k, asText(current[k])])));
  const [files, setFiles] = useState<Partial<Record<string, File>>>({});
  const [saving, setSaving] = useState(false);
  const input: React.CSSProperties = { width: '100%', padding: '6px 8px', fontSize: 12, borderRadius: 8, border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.textPrimary };

  const save = async () => {
    if (saving) return;
    // Only what the Admin actually changed is sent.
    const changed = Object.fromEntries(Object.entries(fields).filter(([k, v]) =>
      DATE_FIELDS.includes(k) ? v.slice(0, 10) !== asText(current[k]).slice(0, 10) : v !== asText(current[k])));
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
        {row.module === 'employee'
          ? "Correct contact details or replace documents. Department, designation, salary and bank details can't be changed here — reject the request instead."
          : "Correct contact details or replace documents. Prices and the payment plan can't be changed here — reject the request instead."}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {editable.map((k) => (
          <label key={k} style={{ fontSize: 11, color: t.textSecondary, fontWeight: 600 }}>
            {fieldLabel(k)}
            {ADMIN_BOOLEAN_FIELDS.includes(k) ? (
              <select value={fields[k] === 'true' ? 'true' : 'false'} onChange={(e) => setFields((f) => ({ ...f, [k]: e.target.value }))} style={input}>
                <option value="true">Yes</option><option value="false">No</option>
              </select>
            ) : k === 'gender' ? (
              <select value={fields[k]} onChange={(e) => setFields((f) => ({ ...f, [k]: e.target.value }))} style={input}>
                <option value="">—</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select>
            ) : DATE_FIELDS.includes(k) ? (
              <DateInput t={t} value={fields[k].slice(0, 10)} max={k === 'date_of_birth' ? serverTodayYmd() : undefined} onChange={(v) => setFields((f) => ({ ...f, [k]: v }))} style={input} />
            ) : (
              <input value={fields[k]} onChange={(e) => setFields((f) => ({ ...f, [k]: e.target.value }))} style={input} />
            )}
          </label>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {docFieldsFor(row).map(([k, label]) => (
          <label key={k} style={{ fontSize: 11, color: t.textSecondary, fontWeight: 600 }}>
            Replace {label}
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


// ── The request as a form ────────────────────────────────────────────────
// Sections in the order of the Add Customer / Add Employee forms. Every
// field of the record shows (an edit: the record as it is now with the
// proposed values laid over it); a field the request changes is
// highlighted with the old value under it.
const CUSTOMER_SECTIONS: [string, string[]][] = [
  ['Customer', ['name', 'middle_name', 'last_name', 'mobile_number', 'mobile_is_whatsapp', 'whatsapp_number', 'alternate_number', 'email',
    'date_of_birth', 'address', 'aadhar_card_no', 'pan_card_no', 'alternate_contact_name', 'alternate_contact_mobile', 'business_profile_name']],
  ['Booking & payment plan', ['unit', 'booking_date', 'has_parking', 'parking_no', 'flat_amount', 'booking_amount', 'pay_after_booking', 'pay_after_booking_date',
    'possession_amount', 'installment_amount', 'installment_tenure', 'installment_date', 'installment_amount1',
    'annual_amount', 'annual_amount_every_months', 'annual_amount1', 'annual_amount2_every_months', 'maintenance']],
];
const EMPLOYEE_SECTIONS: [string, string[]][] = [
  ['Employee', ['first_name', 'middle_name', 'last_name', 'gender', 'date_of_birth', 'email', 'mobile_number', 'mobile_is_whatsapp', 'whatsapp_number',
    'alternate_number', 'residential_address', 'aadhaar_card_number', 'pan_card_number']],
  ['Job', ['department_names', 'designation_names', 'joining_date', 'working_hours', 'check_in_time', 'check_out_time', 'holidays', 'salary', 'uan_pf_number']],
  ['Bank', ['account_holder_name', 'bank_name', 'bank_account_number', 'account_type', 'bank_ifsc', 'branch']],
];
const LABELS: Record<string, string> = {
  mobile_number: 'Mobile', alternate_number: 'Alternate Number', department_names: 'Departments', designation_names: 'Designations',
  aadhar_number: 'Aadhaar No', pan_number: 'PAN No', alternate_contact_name: 'Alternate Contact Name', email: 'Email',
  residential_address: 'Address', bank_ifsc: 'IFSC Code', uan_pf_number: 'UAN / PF No', passbook_photo_url: 'Bank Passbook',
  offer_letter_url: 'Appointment Letter', resume_url: 'Resume', salary_slip_url: 'Salary Slip', photo_url: 'Photo',
};
const label = (k: string) => LABELS[k] ?? fieldLabel(k);
// Internal / system keys never shown in the form.
const SKIP = /(^|_)ids?$|^(is_|created_|updated_|pending_delete|password|active_session|user$|building$|wing$|flat$|shop$|floor$|role|sort_order|total_|amount_(before|after)_possession|cancel|acceptance_letter|returned_documents|original_documents|employee_code$|customer_code$|secondary_numbers|possession_granted|payment_schedule|department$|designation$|project$|company$|status$|can_add_customer)/;
const show = (v: unknown) => (Array.isArray(v) ? v.join(', ') : v);

export const RequestFormView: React.FC<{ t: AppTheme; isDark: boolean; row: ChangeRequestRow; onPreview: (d: { label: string; url: string }) => void }> = ({ t, isDark, row, onPreview }) => {
  const isEdit = row.action === 'edit';
  const old = isEdit ? (row.old_values ?? {}) : {};
  const proposed = { ...(row.new_values ?? {}), ...(row.admin_values ?? {}) };
  const values: Record<string, unknown> = { ...old, ...proposed, ...(row.record_unit ? { unit: row.record_unit } : {}) };
  const changed = (k: string) => isEdit && k in proposed && !sameValue(old[k], proposed[k], k);
  const sections = row.module === 'employee' ? EMPLOYEE_SECTIONS : CUSTOMER_SECTIONS;
  const listed = new Set(sections.flatMap(([, ks]) => ks));
  const docs = Object.keys(values).filter((k) => isFileValue(values[k]) || (isEdit && k in proposed && isFileValue(old[k])));
  // Anything else the request sends (not internal) — so nothing is hidden.
  const others = Object.keys(proposed).filter((k) => !listed.has(k) && !docs.includes(k) && !SKIP.test(k) && typeof proposed[k] !== 'object'
    && !k.endsWith('country_code') && (isEdit ? changed(k) : !isBlank(proposed[k])));
  const nChanged = Object.keys(proposed).filter((k) => changed(k) && !SKIP.test(k)).length;
  const field = (k: string) => {
    const ch = changed(k);
    const v = show(values[k]);
    const code = k === 'mobile_number' ? values.mobile_country_code : k === 'whatsapp_number' ? values.whatsapp_country_code : k === 'alternate_number' ? values.alternate_country_code : null;
    return (
      <div key={k} style={{ minWidth: 0, gridColumn: k === 'address' || k === 'residential_address' ? 'span 2' : undefined }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 3 }}>{label(k)}</div>
        <div style={{ padding: '7px 9px', borderRadius: 8, fontSize: 12, minHeight: 16, wordBreak: 'break-word', color: t.textPrimary,
          border: `1px solid ${ch ? '#f59e0b' : t.inputBorder}`, background: ch ? (isDark ? 'rgba(245,158,11,0.14)' : '#fffbeb') : t.inputBg, fontWeight: ch ? 700 : 400 }}>
          {ch && isBlank(v) && !isBlank(old[k]) ? <span style={{ color: '#dc2626' }}>(cleared)</span> : `${code && !isBlank(v) ? `${String(code)} ` : ''}${displayFieldValue(k, v)}`}
        </div>
        {ch && <div style={{ fontSize: 10, color: isDark ? '#fcd34d' : '#92400e', marginTop: 2 }}>was: {displayFieldValue(k, show(old[k]))}</div>}
        {k in (row.admin_values ?? {}) && <div style={{ fontSize: 10, color: '#2563eb', marginTop: 2 }}>Edited by Admin · sent: {displayFieldValue(k, row.new_values?.[k])}</div>}
      </div>
    );
  };
  const sectionTitle = (s: string) => <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--brand-ink)', textTransform: 'uppercase', letterSpacing: 0.4, margin: '6px 0 2px' }}>{s}</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {isEdit && <div style={{ fontSize: 12, color: t.textSecondary }}>
        <b style={{ color: isDark ? '#fcd34d' : '#92400e' }}>{nChanged === 0 ? 'Nothing changes' : `${nChanged} field${nChanged === 1 ? '' : 's'} change`}</b> on approval (highlighted).
      </div>}
      {sections.map(([title, keys]) => {
        const ks = keys.filter((k) => !isBlank(values[k]) || changed(k) || title !== 'Booking & payment plan');
        if (ks.length === 0) return null;
        return (
          <div key={title}>
            {sectionTitle(title)}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{ks.map(field)}</div>
          </div>
        );
      })}
      {others.length > 0 && <div>{sectionTitle('Other details')}<div className="grid grid-cols-2 md:grid-cols-4 gap-2">{others.map(field)}</div></div>}
      {docs.length > 0 && (
        <div>
          {sectionTitle('Documents (click to preview)')}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {docs.map((k) => {
              const url = values[k];
              const ch = changed(k);
              return (
                <button key={k} type="button" disabled={!isFileValue(url)} onClick={() => isFileValue(url) && onPreview({ label: label(k), url })}
                  className="rounded-xl" style={{ height: 70, cursor: isFileValue(url) ? 'pointer' : 'default', fontSize: 11.5, fontWeight: 700,
                    border: `1px solid ${ch ? '#f59e0b' : t.surfaceBorder}`, background: ch ? (isDark ? 'rgba(245,158,11,0.14)' : '#fffbeb') : t.insetBg, color: t.textPrimary }}>
                  {label(k)}
                  <div style={{ fontSize: 10, fontWeight: 500, color: t.textSecondary, marginTop: 3 }}>{isFileValue(url) ? (ch ? 'new file · view' : 'view') : 'removed'}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const usesForm = (row: ChangeRequestRow) => (row.module === 'customer' || row.module === 'employee') && (row.action === 'create' || row.action === 'edit');

// ── Review popup ─────────────────────────────────────────────────────────
export const RequestReviewModal: React.FC<{
  t: AppTheme; isDark: boolean; row: ChangeRequestRow; onClose: () => void;
  /** Called after Approve / Reject went through (reload the page's list). */
  onDecided: () => void;
  /** Called when the Admin saved corrections (the row now carries them). */
  onUpdated?: (row: ChangeRequestRow) => void;
}> = ({ t, isDark, row: initial, onClose, onDecided, onUpdated }) => {
  const [row, setRow] = useState(initial);
  useEffect(() => setRow(initial), [initial]);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ label: string; url: string } | null>(null);

  const approve = async () => {
    const result = await showAlert.confirm(
      row.action === 'delete' ? `This will permanently delete the payment ${summarize(row)}.`
        : row.action === 'reassign' ? `${summarize(row)} will move from ${String(row.old_values?.assigned_to ?? '—')} to ${String(row.new_values?.assigned_to ?? '—')}.`
        : row.action === 'cancel_booking' ? `This will cancel ${summarize(row)}'s booking and move them to Cancelled Booking.`
        : row.action === 'edit' ? `This will apply the proposed changes to ${MODULE_LABEL[row.module]} "${summarize(row)}".`
        : `This will create the proposed ${MODULE_LABEL[row.module]} record ("${summarize(row)}").`,
      'Approve Request?');
    if (!result.isConfirmed) return;
    setBusy(true);
    try {
      await approveChangeRequest(row.id);
      showAlert.approved(row.action === 'create' ? `The new ${MODULE_LABEL[row.module]} "${summarize(row)}" was approved.`
        : row.action === 'edit' ? `The changes to ${MODULE_LABEL[row.module]} "${summarize(row)}" were approved.`
        : row.action === 'cancel_booking' ? `The cancel booking request for "${summarize(row)}" was approved.`
        : row.action === 'reassign' ? `"${summarize(row)}" is now assigned to ${String(row.new_values?.assigned_to ?? '—')}.`
        : `The delete request for ${MODULE_LABEL[row.module]} "${summarize(row)}" was approved.`);
      onDecided(); onClose();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to approve request.'));
    } finally { setBusy(false); }
  };
  const reject = async () => {
    const { isConfirmed, note } = await showAlert.confirmWithNote(
      `Reject this ${MODULE_LABEL[row.module]} ${ACTION_LABEL[row.action].toLowerCase()} request ("${summarize(row)}")?`,
      'Reject Request?', 'Reject', 'Reason for the employee (optional)');
    if (!isConfirmed) return;
    setBusy(true);
    try {
      await rejectChangeRequest(row.id, note || undefined);
      toast.success('Request rejected.');
      onDecided(); onClose();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to reject request.'));
    } finally { setBusy(false); }
  };

  const who = row.module === 'payment' ? 'Payment of ' : row.module === 'employee' ? 'Employee: ' : row.module === 'lead' ? 'Lead: ' : 'Customer: ';
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, maxWidth: usesForm(row) ? 1000 : 760, width: '100%', maxHeight: '90vh', overflowY: 'auto', fontFamily: t.fontFamily }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--grad-table-header)', borderRadius: '16px 16px 0 0', position: 'sticky', top: 0, zIndex: 1 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>
            Review {ACTION_LABEL[row.action].toLowerCase()} — {row.record_customer_name || summarize(row)}
            {[row.record_customer_code, row.record_unit].filter(Boolean).length > 0 && <span style={{ fontWeight: 500 }}> · {[row.record_customer_code, row.record_unit].filter(Boolean).join(' · ')}</span>}
          </h3>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex' }}><MdClose size={18} /></button>
        </div>
        <div className="p-4" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, color: t.textSecondary }}>
            {who}<b style={{ color: t.textPrimary }}>{row.record_customer_name || summarize(row)}</b> · requested by{' '}
            <b style={{ color: t.textPrimary }}>{row.requested_by_name || row.requested_by_email || '—'}</b>
            {row.requested_by_designations ? ` (${row.requested_by_designations})` : ''} on {formatLastLogin(row.requested_at)}
          </div>
          {usesForm(row)
            ? <RequestFormView t={t} isDark={isDark} row={row} onPreview={setPreview} />
            : <RequestValuesTable t={t} isDark={isDark} row={row} onPreview={setPreview} />}
          {row.reason && row.action !== 'cancel_booking' && (
            <div style={{ fontSize: 12 }}><span style={{ color: t.textSecondary, fontWeight: 600 }}>Reason: </span><span style={{ color: t.textPrimary }}>{row.reason}</span></div>
          )}
          {editing && (
            <div style={{ paddingTop: 8, borderTop: `1px solid ${t.divider}` }}>
              <AdminEditForm t={t} row={row} onCancel={() => setEditing(false)}
                onSaved={(adminValues) => { const updated = { ...row, admin_values: adminValues }; setRow(updated); onUpdated?.(updated); setEditing(false); }} />
            </div>
          )}
          {row.status === 'pending' && !editing && (
            <div className="flex items-center justify-between flex-wrap gap-2" style={{ paddingTop: 12, borderTop: `1px solid ${t.divider}` }}>
              <div>
                {canAdminEdit(row) && (
                  <button type="button" onClick={() => setEditing(true)} className="rounded-xl" style={{ padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: t.inputBg, color: t.textPrimary, border: `1px solid ${t.inputBorder}` }}>
                    Edit before approving
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" disabled={busy} onClick={reject} className="flex items-center gap-1.5 rounded-xl"
                  style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: t.surfaceBg, color: '#b91c1c', border: '1px solid #fca5a5' }}>
                  <MdCancel size={15} /> Reject
                </button>
                <button type="button" disabled={busy} onClick={approve} className="flex items-center gap-1.5 rounded-xl"
                  style={{ padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'var(--brand-gradient)', color: '#fff', border: 'none' }}>
                  <MdCheckCircle size={15} /> {busy ? 'Working…' : 'Approve'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {preview && <DocumentViewerModal t={t} label={preview.label} url={preview.url} onClose={() => setPreview(null)} />}
    </div>
  );
};

// ── A page's pending requests ────────────────────────────────────────────
/** Pending requests of `module` (Admin only — pass enabled=false otherwise). */
export function usePendingRequests(module: ChangeRequestModule, enabled: boolean, filter?: (r: ChangeRequestRow) => boolean) {
  const [rows, setRows] = useState<ChangeRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const reload = useCallback(async () => {
    if (!enabled) { setRows([]); return; }
    setLoading(true);
    try {
      const all = await fetchChangeRequests(module, 'pending');
      setRows(filter ? all.filter(filter) : all);
    } catch { /* the box just shows nothing; the server still guards approval */ }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, enabled]);
  useEffect(() => {
    reload();
    window.addEventListener(PENDING_APPROVALS_CHANGED, reload);
    return () => window.removeEventListener(PENDING_APPROVALS_CHANGED, reload);
  }, [reload]);
  return { rows, setRows, loading, reload };
}

/** Pending delete requests of one record type (employee, lead) — Admin only. */
export function usePendingDeletes(entityType: PendingApprovalEntityType, enabled: boolean) {
  const [rows, setRows] = useState<PendingApprovalRow[]>([]);
  const reload = useCallback(async () => {
    if (!enabled) { setRows([]); return; }
    try { setRows((await fetchPendingApprovals()).filter((r) => r.entity_type === entityType)); } catch { /* nothing shown */ }
  }, [entityType, enabled]);
  useEffect(() => {
    reload();
    window.addEventListener(PENDING_APPROVALS_CHANGED, reload);
    return () => window.removeEventListener(PENDING_APPROVALS_CHANGED, reload);
  }, [reload]);
  return { rows, reload };
}

const TAG_STYLE: Record<string, { bg: string; fg: string; text: string }> = {
  create: { bg: '#dbeafe', fg: '#1d4ed8', text: 'NEW — not added yet' },
  edit: { bg: '#fef3c7', fg: '#92400e', text: 'EDIT WAITING' },
  cancel_booking: { bg: '#fee2e2', fg: '#b91c1c', text: 'CANCEL WAITING' },
  reassign: { bg: '#ede9fe', fg: '#6d28d9', text: 'REASSIGN WAITING' },
  delete: { bg: '#fee2e2', fg: '#b91c1c', text: 'DELETE WAITING' },
};
/** The coloured tag on a record that has a request waiting. */
export const RequestTag: React.FC<{ action: ChangeRequestRow['action']; onClick?: () => void }> = ({ action, onClick }) => {
  const s = TAG_STYLE[action] ?? TAG_STYLE.edit;
  return (
    <span role={onClick ? 'button' : undefined} onClick={onClick} title={onClick ? 'Review the request' : undefined}
      style={{ display: 'inline-block', borderRadius: 999, padding: '1px 8px', fontSize: 9.5, fontWeight: 800, background: s.bg, color: s.fg, whiteSpace: 'nowrap', cursor: onClick ? 'pointer' : undefined, lineHeight: 1.6 }}>
      {s.text}
    </span>
  );
};

/** What the request asks, in a few words ("Edit · 2 fields"). */
export function requestWhat(row: ChangeRequestRow): { title: string; sub: string } {
  if (row.action === 'edit') {
    const old = row.old_values ?? {}; const p = { ...row.new_values, ...(row.admin_values ?? {}) };
    const keys = Object.keys(p).filter((k) => !SKIP.test(k) && typeof p[k] !== 'object' && !sameValue(old[k], p[k], k));
    return { title: `Edit · ${keys.length} field${keys.length === 1 ? '' : 's'}`, sub: keys.slice(0, 3).map(label).join(', ') + (keys.length > 3 ? '…' : '') };
  }
  if (row.action === 'cancel_booking') return { title: 'Cancel booking', sub: row.reason ? String(row.reason) : '' };
  if (row.action === 'create') return { title: `Add ${MODULE_LABEL[row.module].toLowerCase()}`, sub: '' };
  if (row.action === 'reassign') return { title: 'Reassign', sub: `${String(row.old_values?.assigned_to ?? '—')} → ${String(row.new_values?.assigned_to ?? '—')}` };
  return { title: ACTION_LABEL[row.action], sub: '' };
}

/** The list under a page's "Waiting for your approval" box. */
export const PendingRequestsList: React.FC<{
  t: AppTheme; isDark: boolean; rows: ChangeRequestRow[]; loading?: boolean; onReview: (r: ChangeRequestRow) => void; onShowAll: () => void; noun?: string;
  /** Delete requests of this page's records (approve = delete for good). */
  deletes?: PendingApprovalRow[]; onDeleteDecided?: () => void;
}> = ({ t, isDark, rows: changeRows, loading, onReview, onShowAll, noun = 'customers', deletes = [], onDeleteDecided }) => {
  const [busy, setBusy] = useState<string | null>(null);
  const decideDelete = async (d: PendingApprovalRow, approve: boolean) => {
    const ok = await showAlert.confirm(approve ? `This permanently deletes "${d.label ?? d.id}".` : `"${d.label ?? d.id}" stays as it is.`, approve ? 'Approve delete?' : 'Reject delete?');
    if (!ok.isConfirmed) return;
    setBusy(d.id);
    try {
      if (approve) await approvePendingDelete(d.entity_type, d.id); else await rejectPendingDelete(d.entity_type, d.id);
      toast.success(approve ? 'Deleted.' : 'Delete request rejected.');
      onDeleteDecided?.();
    } catch (e) { toast.error(errMessage(e, 'Failed.')); } finally { setBusy(null); }
  };
  const rows = changeRows;
  const count = rows.length + deletes.length;
  return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
    <div className="flex items-center gap-2 flex-wrap rounded-xl" style={{ padding: '9px 14px', fontSize: 12, fontWeight: 600, background: isDark ? 'rgba(180,83,9,0.15)' : '#fff7ed', border: `1px solid ${isDark ? 'rgba(180,83,9,0.4)' : '#fed7aa'}`, color: t.textPrimary }}>
      Showing the {count} request{count === 1 ? '' : 's'} waiting for your approval ·
      <button type="button" onClick={onShowAll} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--brand-ink)', fontWeight: 700, textDecoration: 'underline', fontSize: 12 }}>Show all {noun}</button>
    </div>
    <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, overflow: 'hidden' }}>
      <div className="master-table-scroll">
        <table className="master-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
          <thead>
            <tr className="master-table-header-gradient">
              {['Record', 'Request', 'Requested by', 'Unit / Details', ''].map((h) => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>Loading requests...</td></tr>
            ) : count === 0 ? (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>Nothing is waiting for your approval.</td></tr>
            ) : [...deletes.map((d) => (
                <tr key={`del-${d.id}`} style={{ borderTop: `1px solid ${t.divider}`, background: isDark ? 'rgba(239,68,68,0.06)' : '#fef2f2' }}>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: t.textPrimary }}><b>{d.label ?? `#${d.id}`}</b>{' '}<RequestTag action="delete" /></td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: t.textPrimary }}>Delete</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: t.textPrimary }}>{d.requested_by_name || d.requested_by_email || '—'}
                    <div style={{ fontSize: 10.5, color: t.textSecondary }}>{d.requested_at ? formatLastLogin(d.requested_at) : ''}</div></td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: t.textSecondary }}>—</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button type="button" disabled={busy === d.id} onClick={() => decideDelete(d, false)} className="rounded-lg" style={{ padding: '6px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: t.surfaceBg, color: '#b91c1c', border: '1px solid #fca5a5', marginRight: 6 }}>Reject</button>
                    <button type="button" disabled={busy === d.id} onClick={() => decideDelete(d, true)} className="rounded-lg" style={{ padding: '6px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: '#b91c1c', color: '#fff', border: 'none' }}>Approve delete</button>
                  </td>
                </tr>
              )), ...rows.map((r) => {
              const what = requestWhat(r);
              return (
                <tr key={r.id} style={{ borderTop: `1px solid ${t.divider}`, background: isDark ? 'rgba(245,158,11,0.06)' : '#fffbeb' }}>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: t.textPrimary }}>
                    <b>{r.record_customer_name || summarize(r)}</b>{r.record_customer_code ? ` · ${r.record_customer_code}` : ''}{' '}<RequestTag action={r.action} />
                    {r.action === 'create' && <div style={{ fontSize: 10.5, color: t.textSecondary }}>gets an ID once approved</div>}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: t.textPrimary }}>{what.title}{what.sub && <div style={{ fontSize: 10.5, color: t.textSecondary }}>{what.sub}</div>}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: t.textPrimary }}>
                    {r.requested_by_name || r.requested_by_email || '—'}
                    <div style={{ fontSize: 10.5, color: t.textSecondary }}>{[r.requested_by_designations, formatLastLogin(r.requested_at)].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: t.textSecondary }}>{r.record_unit || recordContext(r) || '—'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <button type="button" onClick={() => onReview(r)} className="rounded-lg" style={{ padding: '6px 14px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: 'var(--brand-gradient)', color: '#fff', border: 'none' }}>Review</button>
                  </td>
                </tr>
              );
            })]}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  );
};
