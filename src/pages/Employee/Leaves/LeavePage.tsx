// ==========================================
// DREAM GROUP CRM - LEAVE PAGE (EMPLOYEE)
// ==========================================
// Replaces the never-built Leave UI — the backend (leaves.routes.ts) was
// already fully working. Self-scoped: the logged-in employee's own id is
// resolved via the same employee-stats endpoint the Employee Dashboard and
// Attendance page already use.
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { MdBeachAccess } from 'react-icons/md';

import { useAppDispatch } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import { getFormInputStyle, FormField, getAccordionCardStyle, getAccordionHeaderStyle } from '../../../components/common/MasterListUI';
import { fetchEmployeeDashboardSummary } from '../../../services/dashboardService';
import { fetchLeaves, submitLeaveRequest, LeaveRecord, LeaveStatus, GENERAL_LEAVE_TYPES, LEAVE_TYPE_LABEL, LeaveType } from '../../../services/leaveService';
import { formatDate } from '../../../utils';

const STATUS_LABEL: Record<LeaveStatus, string> = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };
const STATUS_COLOR: Record<LeaveStatus, string> = { pending: '#d97706', approved: '#16a34a', rejected: '#dc2626' };

const StatusBadge: React.FC<{ status: LeaveStatus }> = ({ status }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-full font-semibold"
    style={{ background: `${STATUS_COLOR[status]}1a`, color: STATUS_COLOR[status], fontSize: 11 }}>
    {STATUS_LABEL[status]}
  </span>
);

const todayISO = () => new Date().toISOString().slice(0, 10);

const LeavePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t, cssVars } = useAppearanceTokens();

  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fromDate, setFromDate] = useState(todayISO());
  const [toDate, setToDate] = useState(todayISO());
  const [leaveType, setLeaveType] = useState<LeaveType>('casual');
  const [reason, setReason] = useState('');

  useEffect(() => { dispatch(setPageTitle('Leave')); }, [dispatch]);

  useEffect(() => {
    fetchEmployeeDashboardSummary()
      .then((s) => setEmployeeId(s.employee.id))
      .catch(() => toast.error('Could not load your employee record.'));
  }, []);

  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      setRecords(await fetchLeaves({ employee_id: employeeId }));
    } catch {
      toast.error('Failed to load your leave requests.');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;
    if (toDate < fromDate) { toast.error('To date cannot be before From date.'); return; }
    setSaving(true);
    try {
      await submitLeaveRequest({ from_date: fromDate, to_date: toDate, leave_type: leaveType, reason: reason || null });
      toast.success('Leave request submitted.');
      setReason('');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit leave request.');
    } finally {
      setSaving(false);
    }
  };

  const cardStyle = getAccordionCardStyle(t);
  const headerStyle = getAccordionHeaderStyle(t, true);

  return (
    <div style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div style={cardStyle}>
        <div style={headerStyle}><span style={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary }}>Request Leave</span></div>
        <form onSubmit={handleSubmit} className="p-4" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="From *" t={t}><input required type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={getFormInputStyle(t)} /></FormField>
            <FormField label="To *" t={t}><input required type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={getFormInputStyle(t)} /></FormField>
          </div>
          <FormField label="Leave Type *" t={t}>
            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value as LeaveType)} style={getFormInputStyle(t)}>
              {GENERAL_LEAVE_TYPES.map((lt) => <option key={lt} value={lt}>{LEAVE_TYPE_LABEL[lt]}</option>)}
            </select>
          </FormField>
          <FormField label="Reason" t={t}>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Optional" style={{ ...getFormInputStyle(t), resize: 'vertical' as const }} />
          </FormField>
          <div>
            <button type="submit" disabled={saving || !employeeId} className="master-btn-primary">
              <MdBeachAccess size={16} /> {saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: 0 }}>My Leave Requests</h3>
        </div>
        <div className="master-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                {['From', 'To', 'Type', 'Reason', 'Status'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>No leave requests yet.</td></tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatDate(r.from_date)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatDate(r.to_date)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{LEAVE_TYPE_LABEL[r.leave_type as LeaveType] || r.leave_type}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary }}>{r.reason || '—'}</td>
                    <td style={{ padding: '12px 14px' }}><StatusBadge status={r.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LeavePage;
