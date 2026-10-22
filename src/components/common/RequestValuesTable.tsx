// ==========================================
// DGCRM — CHANGE REQUEST VALUES TABLE (shared)
// ==========================================
// V_26.0 — a change request's submitted values: every field (blank ones
// too, so a value being cleared is visible), Current vs Proposed for an
// edit, an Admin's corrections marked, and uploaded documents previewable
// (stored uploads are /api/files/... paths). Used by Admin's Pending
// Approval details and the employee's My Requests.
import React from 'react';
import { AppTheme } from '../../styles/theme';
import { ChangeRequestRow } from '../../services/changeRequestsService';

export function fieldLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// V_26.0 — request details: every submitted field (blank ones too, so a
// value being cleared is visible), current vs proposed for an edit, and
// uploaded documents previewable. Stored uploads are /api/files/... paths.
export const isFileValue = (v: unknown): v is string => typeof v === 'string' && v.startsWith('/api/files/');
export const isBlank = (v: unknown) => v === null || v === undefined || v === '';
export function displayValue(v: unknown): string {
  if (isBlank(v)) return '—';
  if (typeof v === 'boolean' || v === 'true' || v === 'false') return v === true || v === 'true' ? 'Yes' : 'No';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(T|$)/.test(v)) return v.slice(0, 10).split('-').reverse().join('/');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
// V_26.0 — amounts in ₹ and payment types in the words Payment Received
// uses, so a request reads like the rest of the app (display only).
const MONEY_KEY = /^(amount|maintenance|maintanance\d*)$|_(amount|amnt)\d*$/;
const PAYMENT_TYPE_LABEL: Record<string, string> = {
  BookingAmount: 'Booking Amount', PayAfterbooking: 'Remaining Booking Amount', EMIAmount: 'EMI',
  PossessionAmount: 'Possession Amount', AnnualAmount: 'Booster Before Possession', AnnualAmount1: 'Booster After Possession',
};
const isNumeric = (v: unknown) => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && Number.isFinite(Number(v));
// For an amount, "500000" and the stored "500000.00" are the same value.
export const sameValue = (a: unknown, b: unknown, key?: string) =>
  (isBlank(a) && isBlank(b))
  || (key && MONEY_KEY.test(key) && isNumeric(a) && isNumeric(b) ? Number(a) === Number(b) : displayValue(a) === displayValue(b));

export function displayFieldValue(key: string, v: unknown): string {
  if (isBlank(v)) return '—';
  if (MONEY_KEY.test(key) && v !== true && v !== false && v !== '' && Number.isFinite(Number(v))) {
    return `₹${Number(v).toLocaleString('en-IN')}`;
  }
  if ((key === 'payment_type' || key === 'payment_for') && typeof v === 'string') return PAYMENT_TYPE_LABEL[v] ?? v;
  return displayValue(v);
}

export const RequestValuesTable: React.FC<{
  t: AppTheme; isDark: boolean; row: ChangeRequestRow; onPreview: (doc: { label: string; url: string }) => void;
}> = ({ t, isDark, row, onPreview }) => {
  // A reassignment reads like an edit: Assigned To, current vs proposed.
  const isEdit = row.action === 'edit' || row.action === 'reassign';
  // A delete request shows the record being deleted.
  const adminValues = row.admin_values ?? {};
  const source = row.action === 'delete' ? (row.old_values ?? {}) : { ...(row.new_values ?? {}), ...adminValues };
  const old = row.old_values ?? {};
  // A payment's customer is named in the popup header instead of by id.
  const entries = Object.entries(source).filter(([k, v]) => (isEdit || !isBlank(v) || k in old) && !(row.module === 'payment' && k === 'customer_id')
    && (row.action !== 'reassign' || k === 'assigned_to'));
  const cellStyle: React.CSSProperties = { padding: '7px 8px', fontSize: 12, borderTop: `1px solid ${t.divider}`, verticalAlign: 'top', wordBreak: 'break-word' };
  const valueCell = (v: unknown, label: string, key: string) => isFileValue(v)
    ? <button type="button" onClick={() => onPreview({ label, url: v })} className="master-icon-btn" style={{ fontSize: 12, padding: '2px 8px', width: 'auto' }}>View document</button>
    : <span>{displayFieldValue(key, v)}</span>;
  return (
    <div className="master-table-scroll">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: t.textSecondary, fontSize: 11, textAlign: 'left' }}>
            <th style={{ padding: '6px 8px' }}>Field</th>
            {isEdit && <th style={{ padding: '6px 8px' }}>Current</th>}
            <th style={{ padding: '6px 8px' }}>{isEdit ? 'Proposed' : 'Value'}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value]) => {
            const changed = isEdit && !sameValue(old[key], value, key);
            const cleared = changed && isBlank(value) && !isBlank(old[key]);
            return (
              <tr key={key} style={{ background: changed ? (isDark ? 'rgba(234,179,8,0.12)' : '#fefce8') : undefined, color: t.textPrimary }}>
                <td style={{ ...cellStyle, color: t.textSecondary, fontWeight: 600, whiteSpace: 'nowrap' }}>{fieldLabel(key)}</td>
                {isEdit && <td style={cellStyle}>{valueCell(old[key], fieldLabel(key), key)}</td>}
                <td style={{ ...cellStyle, fontWeight: changed ? 700 : 400 }}>
                  {cleared ? <span style={{ color: '#dc2626' }}>(cleared)</span> : valueCell(value, fieldLabel(key), key)}
                  {key in adminValues && (
                    <div style={{ fontSize: 10.5, fontWeight: 400, color: '#2563eb', marginTop: 2 }}>
                      Edited by Admin{isFileValue(row.new_values?.[key]) ? '' : ` · employee sent: ${displayFieldValue(key, row.new_values?.[key])}`}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {isEdit && <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 6 }}>Highlighted rows change on approval.</div>}
    </div>
  );
};
