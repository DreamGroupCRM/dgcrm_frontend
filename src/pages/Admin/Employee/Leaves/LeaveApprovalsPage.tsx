// ==========================================
// DREAM GROUP CRM - LEAVE APPROVALS PAGE (ADMIN)
// ==========================================
// First real frontend for the leave module — the backend (leaves.routes.ts)
// was already fully working with a real audit trail (see recordAudit call
// on approve/reject) but had no UI anywhere. Admin reviews every employee's
// leave requests here and approves/rejects them (PUT /:id/approve, admin-
// only server-side).
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { MdBeachAccess, MdCheckCircle, MdCancel, MdRefresh, MdHourglassEmpty } from 'react-icons/md';

import { useAppDispatch } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import { getFormInputStyle } from '../../../../components/common/MasterListUI';
import StatCard from '../../../../components/masters/StatCard';
import { FetchEmployeeDetails } from '../../../../services/employeeDetailsService';
import { fetchLeaves, reviewLeaveRequest, LeaveRecord, LeaveStatus, LEAVE_TYPE_LABEL, LeaveType } from '../../../../services/leaveService';
import { formatDate, formatLastLogin } from '../../../../utils';

const STATUS_LABEL: Record<LeaveStatus, string> = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };
const STATUS_COLOR: Record<LeaveStatus, string> = { pending: '#d97706', approved: '#16a34a', rejected: '#dc2626' };

const StatusBadge: React.FC<{ status: LeaveStatus }> = ({ status }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-full font-semibold"
    style={{ background: `${STATUS_COLOR[status]}1a`, color: STATUS_COLOR[status], fontSize: 11 }}>
    {STATUS_LABEL[status]}
  </span>
);

const leaveTypeLabel = (v: string): string => LEAVE_TYPE_LABEL[v as LeaveType] || v;

const daysInclusive = (from: string, to: string): number => {
  const ms = new Date(to.slice(0, 10)).getTime() - new Date(from.slice(0, 10)).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
};

const LeaveApprovalsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t, cssVars } = useAppearanceTokens();

  const [statusFilter, setStatusFilter] = useState<'all' | LeaveStatus>('pending');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [employeeOptions, setEmployeeOptions] = useState<{ id: string; name: string }[]>([]);
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => { dispatch(setPageTitle('Leave Requests')); }, [dispatch]);

  useEffect(() => {
    FetchEmployeeDetails(1, 500, undefined, true)
      .then((res) => { if (res.success) setEmployeeOptions(res.rows.map((e) => ({ id: e.id, name: `${e.first_name} ${e.last_name}`.trim() }))); })
      .catch(() => { /* dropdown staying empty is a harmless degrade */ });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchLeaves({
        status: statusFilter === 'all' ? undefined : statusFilter,
        employee_id: employeeFilter || undefined,
      });
      setRecords(rows);
    } catch {
      toast.error('Failed to load leave requests.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, employeeFilter]);

  useEffect(() => { load(); }, [load]);

  const pendingCount = records.filter((r) => r.status === 'pending').length;

  const handleReview = async (record: LeaveRecord, decision: 'approved' | 'rejected') => {
    setBusyId(record.id);
    try {
      await reviewLeaveRequest(record.id, decision);
      toast.success(`Leave request ${decision}.`);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update leave request.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <StatCard label="Showing" value={records.length} icon={MdBeachAccess} color="#7c3aed" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Pending" value={pendingCount} icon={MdHourglassEmpty} color="#d97706" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
      </div>

      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <div className="flex items-center rounded-xl p-0.5" style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}` }}>
            {(['all', 'pending', 'approved', 'rejected'] as const).map((v) => (
              <button key={v} type="button" onClick={() => setStatusFilter(v)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap capitalize"
                style={{ background: statusFilter === v ? 'var(--grad-purple)' : 'transparent', color: statusFilter === v ? '#fff' : t.textSecondary, border: 'none', cursor: 'pointer' }}>
                {v}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} style={{ ...getFormInputStyle(t), width: 200 }}>
              <option value="">All Employees</option>
              {employeeOptions.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
            <button type="button" onClick={load} title="Refresh"
              className="flex items-center justify-center rounded-xl"
              style={{ width: 38, height: 38, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
              <MdRefresh size={18} />
            </button>
          </div>
        </div>

        <div className="master-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                {['Employee', 'From', 'To', 'Days', 'Type', 'Reason', 'Status', 'Requested', 'Action'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading leave requests...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>No leave requests found.</td></tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                    <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap' }}>{r.employee_name}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatDate(r.from_date)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatDate(r.to_date)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{daysInclusive(r.from_date, r.to_date)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{leaveTypeLabel(r.leave_type)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, maxWidth: 220 }}>{r.reason || '—'}</td>
                    <td style={{ padding: '12px 14px' }}><StatusBadge status={r.status} /></td>
                    <td style={{ padding: '12px 14px', fontSize: 11, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatLastLogin(r.created_at)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {r.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <button type="button" title="Approve" disabled={busyId === r.id} onClick={() => handleReview(r, 'approved')}
                            className="master-icon-btn" style={{ color: '#16a34a', cursor: busyId === r.id ? 'not-allowed' : 'pointer', opacity: busyId === r.id ? 0.5 : 1 }}>
                            <MdCheckCircle size={16} />
                          </button>
                          <button type="button" title="Reject" disabled={busyId === r.id} onClick={() => handleReview(r, 'rejected')}
                            className="master-icon-btn" style={{ color: '#dc2626', cursor: busyId === r.id ? 'not-allowed' : 'pointer', opacity: busyId === r.id ? 0.5 : 1 }}>
                            <MdCancel size={16} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: t.textSecondary }}>
                          {r.approved_at ? formatLastLogin(r.approved_at) : '—'}
                        </span>
                      )}
                    </td>
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

export default LeaveApprovalsPage;
