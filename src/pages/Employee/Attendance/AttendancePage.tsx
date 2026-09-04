// ==========================================
// DREAM GROUP CRM - ATTENDANCE PAGE (EMPLOYEE)
// ==========================================
// Replaces the former "Coming Soon" placeholder. Backed by the existing
// working attendance API (GET/POST /api/attendance) — self-scoped here:
// the logged-in employee's own id is resolved via the same
// employee-stats endpoint the Employee Dashboard already uses (its
// `employee.id` field), then every attendance call is scoped to that id.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { MdEventAvailable, MdLogin, MdLogout } from 'react-icons/md';

import { useAppDispatch } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import { getFormInputStyle, FormField, getAccordionCardStyle, getAccordionHeaderStyle } from '../../../components/common/MasterListUI';
import { fetchEmployeeDashboardSummary } from '../../../services/dashboardService';
import { fetchAttendance, markAttendance, AttendanceRecord, AttendanceStatus } from '../../../services/attendanceService';
import { formatDate } from '../../../utils';

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present', absent: 'Absent', half_day: 'Half Day', leave: 'Leave',
};
const STATUS_COLOR: Record<AttendanceStatus, string> = {
  present: '#16a34a', absent: '#dc2626', half_day: '#d97706', leave: '#7c3aed',
};

const StatusBadge: React.FC<{ status: AttendanceStatus }> = ({ status }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-full font-semibold"
    style={{ background: `${STATUS_COLOR[status]}1a`, color: STATUS_COLOR[status], fontSize: 11 }}>
    {STATUS_LABEL[status]}
  </span>
);

const todayISO = () => new Date().toISOString().slice(0, 10);
const nowHHMM = () => new Date().toTimeString().slice(0, 5);

const AttendancePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t, cssVars } = useAppearanceTokens();

  const now = new Date();
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<'in' | 'out' | 'form' | null>(null);

  const [status, setStatus] = useState<AttendanceStatus>('present');
  const [remarks, setRemarks] = useState('');

  useEffect(() => { dispatch(setPageTitle('Attendance')); }, [dispatch]);

  useEffect(() => {
    fetchEmployeeDashboardSummary()
      .then((s) => setEmployeeId(s.employee.id))
      .catch(() => toast.error('Could not load your employee record.'));
  }, []);

  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      setRecords(await fetchAttendance({ employee_id: employeeId, month, year }));
    } catch {
      toast.error('Failed to load your attendance.');
    } finally {
      setLoading(false);
    }
  }, [employeeId, month, year]);

  useEffect(() => { load(); }, [load]);

  const todayRecord = useMemo(() => records.find((r) => r.attendance_date.slice(0, 10) === todayISO()) ?? null, [records]);

  const handleCheckIn = async () => {
    if (!employeeId) return;
    setSaving('in');
    try {
      await markAttendance({ employee_id: employeeId, attendance_date: todayISO(), status: 'present', check_in_time: nowHHMM() });
      toast.success('Checked in.');
      load();
    } catch {
      toast.error('Failed to check in.');
    } finally {
      setSaving(null);
    }
  };

  const handleCheckOut = async () => {
    if (!employeeId || !todayRecord) return;
    setSaving('out');
    try {
      await markAttendance({
        employee_id: employeeId, attendance_date: todayISO(), status: todayRecord.status,
        check_in_time: todayRecord.check_in_time, check_out_time: nowHHMM(), remarks: todayRecord.remarks,
      });
      toast.success('Checked out.');
      load();
    } catch {
      toast.error('Failed to check out.');
    } finally {
      setSaving(null);
    }
  };

  const handleMarkStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;
    setSaving('form');
    try {
      await markAttendance({ employee_id: employeeId, attendance_date: todayISO(), status, remarks: remarks || null });
      toast.success('Attendance updated.');
      load();
    } catch {
      toast.error('Failed to update attendance.');
    } finally {
      setSaving(null);
    }
  };

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - 2 + i);
  const cardStyle = getAccordionCardStyle(t);
  const headerStyle = getAccordionHeaderStyle(t, true);

  return (
    <div style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div style={cardStyle}>
        <div style={headerStyle}><span style={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary }}>Today — {formatDate(todayISO())}</span></div>
        <div className="p-4" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {todayRecord ? (
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={todayRecord.status} />
              <span style={{ fontSize: 12, color: t.textSecondary }}>
                In: {todayRecord.check_in_time || '—'} &nbsp;•&nbsp; Out: {todayRecord.check_out_time || '—'}
              </span>
            </div>
          ) : (
            <span style={{ fontSize: 12, color: t.textSecondary }}>No attendance marked for today yet.</span>
          )}

          <div className="flex items-center gap-2">
            <button type="button" onClick={handleCheckIn} disabled={saving !== null || !!todayRecord?.check_in_time} className="master-btn-primary">
              <MdLogin size={16} /> {saving === 'in' ? 'Checking in...' : 'Check In'}
            </button>
            <button type="button" onClick={handleCheckOut} disabled={saving !== null || !todayRecord?.check_in_time || !!todayRecord?.check_out_time} className="master-btn-primary">
              <MdLogout size={16} /> {saving === 'out' ? 'Checking out...' : 'Check Out'}
            </button>
          </div>

          <form onSubmit={handleMarkStatus} className="flex items-end gap-2 flex-wrap" style={{ borderTop: `1px solid ${t.divider}`, paddingTop: 14 }}>
            <FormField label="Mark today as" t={t}>
              <select value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)} style={{ ...getFormInputStyle(t), width: 150 }}>
                {(Object.keys(STATUS_LABEL) as AttendanceStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </FormField>
            <FormField label="Remarks" t={t}>
              <input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" style={{ ...getFormInputStyle(t), width: 220 }} />
            </FormField>
            <button type="submit" disabled={saving !== null} className="master-btn-primary">
              <MdEventAvailable size={16} /> {saving === 'form' ? 'Saving...' : 'Save'}
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: 0 }}>My Attendance History</h3>
          <div className="flex items-center gap-2.5">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ ...getFormInputStyle(t), width: 150 }}>
              {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ ...getFormInputStyle(t), width: 100 }}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="master-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                {['Date', 'Status', 'Check In', 'Check Out', 'Remarks'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>No attendance records for this period.</td></tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatDate(r.attendance_date)}</td>
                    <td style={{ padding: '12px 14px' }}><StatusBadge status={r.status} /></td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.check_in_time || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.check_out_time || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary }}>{r.remarks || '—'}</td>
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

export default AttendancePage;
