// ==========================================
// DREAM GROUP CRM - ATTENDANCE PAGE (EMPLOYEE)
// ==========================================
// Modern attendance dashboard: a prominent Fingerprint/Mark Attendance
// action (POST /api/attendance/punch — real duplicate-punch rejection,
// device geolocation captured with full permission/error handling), plus
// quick Leave / Half Day / Work From Home request actions and a
// Daily/Weekly/Monthly/Quarterly/Yearly/Custom history view for both
// attendance and leave. Everything here is self-scoped: the logged-in
// employee's own id is resolved via the same employee-stats endpoint the
// Employee Dashboard already uses, and the backend independently
// re-resolves it server-side on every write (see attendance.routes.ts /
// leaves.routes.ts) — this page never sends employee_id for its own
// actions, only for read filters.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  MdFingerprint, MdLocationOn, MdLocationOff, MdMap, MdEventBusy, MdWbSunny,
  MdHomeWork, MdClose, MdCheckCircle,
} from 'react-icons/md';

import { useAppDispatch } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import { getFormInputStyle, FormField, getAccordionCardStyle, getAccordionHeaderStyle } from '../../../components/common/MasterListUI';
import DateRangePresetFilter, { DateRangePreset, computeDateRangePreset } from '../../../components/common/DateRangePresetFilter';
import { fetchEmployeeDashboardSummary } from '../../../services/dashboardService';
import { fetchAttendance, punchAttendance, AttendanceRecord, AttendanceStatus } from '../../../services/attendanceService';
import { fetchLeaves, submitLeaveRequest, LeaveRecord, LeaveStatus, LeaveType, LeaveSession, LEAVE_TYPE_LABEL } from '../../../services/leaveService';
import { getCurrentLocation } from '../../../utils/geolocation';
import { formatDate } from '../../../utils';

const ATT_STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present', absent: 'Absent', half_day: 'Half Day', leave: 'Leave',
};
const ATT_STATUS_COLOR: Record<AttendanceStatus, string> = {
  present: '#16a34a', absent: '#dc2626', half_day: '#d97706', leave: '#7c3aed',
};
const LEAVE_STATUS_COLOR: Record<LeaveStatus, string> = { pending: '#d97706', approved: '#16a34a', rejected: '#dc2626' };
const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };

const Badge: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-full font-semibold"
    style={{ background: `${color}1a`, color, fontSize: 11 }}>{label}</span>
);

const todayISO = () => new Date().toISOString().slice(0, 10);

type QuickActionKind = Extract<LeaveType, 'casual' | 'half_day' | 'work_from_home'>;
const QUICK_ACTION_META: Record<QuickActionKind, { title: string; icon: React.ReactNode; color: string }> = {
  casual: { title: 'Mark Leave', icon: <MdEventBusy size={18} />, color: '#7c3aed' },
  half_day: { title: 'Half Day', icon: <MdWbSunny size={18} />, color: '#d97706' },
  work_from_home: { title: 'Work From Home', icon: <MdHomeWork size={18} />, color: '#0284c7' },
};

const AttendancePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t, cssVars } = useAppearanceTokens();

  const [employeeId, setEmployeeId] = useState<number | null>(null);

  // ── Mark Attendance ──────────────────────────────────────────────────
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [punching, setPunching] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);

  useEffect(() => { dispatch(setPageTitle('Attendance')); }, [dispatch]);

  useEffect(() => {
    fetchEmployeeDashboardSummary()
      .then((s) => setEmployeeId(s.employee.id))
      .catch(() => toast.error('Could not load your employee record.'));
  }, []);

  const loadToday = useCallback(async () => {
    if (!employeeId) return;
    try {
      const rows = await fetchAttendance({ employee_id: employeeId, from: todayISO(), to: todayISO() });
      setTodayRecord(rows[0] ?? null);
    } catch {
      // today card just stays in its "not marked yet" state
    }
  }, [employeeId]);

  useEffect(() => { loadToday(); }, [loadToday]);

  const handlePunch = async (type: 'check_in' | 'check_out') => {
    setPunching(true);
    setLocationNote(null);
    let latitude: number | null = null;
    let longitude: number | null = null;
    try {
      const loc = await getCurrentLocation();
      latitude = loc.latitude;
      longitude = loc.longitude;
    } catch (err: any) {
      // Never block attendance on a GPS hiccup — record the punch anyway
      // without coordinates, but tell the employee exactly why location
      // wasn't captured (permission denied / unavailable / timeout / not
      // supported), per each browser Geolocation failure mode.
      setLocationNote(err?.message || 'Could not capture your location.');
      toast.warn(err?.message || 'Could not capture your location — marking attendance without it.');
    }
    try {
      const saved = await punchAttendance({ type, latitude, longitude });
      setTodayRecord(saved);
      toast.success(type === 'check_in' ? `Checked in at ${saved.check_in_time}.` : `Checked out at ${saved.check_out_time}.`);
      loadAttendanceHistory();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to mark attendance.');
    } finally {
      setPunching(false);
    }
  };

  const punchState: 'check_in' | 'check_out' | 'done' =
    !todayRecord?.check_in_time ? 'check_in' : !todayRecord?.check_out_time ? 'check_out' : 'done';

  // ── Quick Leave / Half Day / WFH actions ────────────────────────────
  const [quickAction, setQuickAction] = useState<QuickActionKind | null>(null);
  const [quickDate, setQuickDate] = useState(todayISO());
  const [quickSession, setQuickSession] = useState<LeaveSession>('am');
  const [quickReason, setQuickReason] = useState('');
  const [submittingQuick, setSubmittingQuick] = useState(false);

  const openQuickAction = (kind: QuickActionKind) => {
    setQuickAction(kind);
    setQuickDate(todayISO());
    setQuickSession('am');
    setQuickReason('');
  };

  const submitQuickAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAction) return;
    setSubmittingQuick(true);
    try {
      await submitLeaveRequest({
        from_date: quickDate, to_date: quickDate, leave_type: quickAction,
        session: quickAction === 'half_day' ? quickSession : 'full',
        reason: quickReason || null,
      });
      toast.success(`${QUICK_ACTION_META[quickAction].title} request submitted.`);
      setQuickAction(null);
      loadLeaveHistory();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit request.');
    } finally {
      setSubmittingQuick(false);
    }
  };

  // ── History (attendance + leave/half-day/WFH), shared date range ────
  const [preset, setPreset] = useState<DateRangePreset>('monthly');
  const [customFrom, setCustomFrom] = useState(todayISO());
  const [customTo, setCustomTo] = useState(todayISO());
  const range = useMemo(() => (preset === 'custom' ? { from: customFrom, to: customTo } : computeDateRangePreset(preset)), [preset, customFrom, customTo]);

  const [attRecords, setAttRecords] = useState<AttendanceRecord[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const loadAttendanceHistory = useCallback(async () => {
    if (!employeeId) return;
    setAttLoading(true);
    try {
      setAttRecords(await fetchAttendance({ employee_id: employeeId, from: range.from, to: range.to }));
    } catch {
      toast.error('Failed to load your attendance history.');
    } finally {
      setAttLoading(false);
    }
  }, [employeeId, range.from, range.to]);
  useEffect(() => { loadAttendanceHistory(); }, [loadAttendanceHistory]);

  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const loadLeaveHistory = useCallback(async () => {
    if (!employeeId) return;
    setLeaveLoading(true);
    try {
      setLeaveRecords(await fetchLeaves({ employee_id: employeeId, from: range.from, to: range.to }));
    } catch {
      toast.error('Failed to load your leave history.');
    } finally {
      setLeaveLoading(false);
    }
  }, [employeeId, range.from, range.to]);
  useEffect(() => { loadLeaveHistory(); }, [loadLeaveHistory]);

  const cardStyle = getAccordionCardStyle(t);
  const headerStyle = getAccordionHeaderStyle(t, true);
  const mapLink = todayRecord?.latitude != null && todayRecord?.longitude != null
    ? `https://www.google.com/maps?q=${todayRecord.latitude},${todayRecord.longitude}`
    : null;

  return (
    <div style={{ fontFamily: t.fontFamily, ...cssVars }}>
      {/* ── Mark Attendance ─────────────────────────────────────────── */}
      <div style={cardStyle}>
        <div style={headerStyle}><span style={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary }}>Mark Attendance — {formatDate(todayISO())}</span></div>
        <div className="p-5 flex flex-col items-center" style={{ gap: 14 }}>
          <button type="button" onClick={() => handlePunch(punchState === 'check_out' ? 'check_out' : 'check_in')}
            disabled={punching || punchState === 'done'}
            title={punchState === 'done' ? 'Attendance completed for today' : punchState === 'check_out' ? 'Tap to check out' : 'Tap to check in'}
            className="flex items-center justify-center rounded-full"
            style={{
              width: 96, height: 96, border: 'none', cursor: punchState === 'done' ? 'default' : 'pointer',
              background: punchState === 'done' ? '#9ca3af' : punchState === 'check_out' ? 'linear-gradient(135deg,#0284c7,#0ea5e9)' : 'linear-gradient(135deg,#16a34a,#22c55e)',
              color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', opacity: punching ? 0.7 : 1,
            }}>
            <MdFingerprint size={52} />
          </button>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>
              {punching ? 'Capturing location…' :
                punchState === 'done' ? 'Attendance completed for today' :
                punchState === 'check_out' ? 'Tap the fingerprint to check out' : 'Tap the fingerprint to check in'}
            </div>
            {todayRecord && (
              <div className="flex items-center justify-center gap-3 mt-1.5 flex-wrap">
                <Badge label={ATT_STATUS_LABEL[todayRecord.status]} color={ATT_STATUS_COLOR[todayRecord.status]} />
                <span style={{ fontSize: 12, color: t.textSecondary }}>
                  In: {todayRecord.check_in_time || '—'} &nbsp;•&nbsp; Out: {todayRecord.check_out_time || '—'}
                </span>
              </div>
            )}
          </div>

          {mapLink ? (
            <a href={mapLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5"
              style={{ fontSize: 11.5, color: '#0284c7', textDecoration: 'none' }}>
              <MdLocationOn size={15} /> Location captured — View on Map <MdMap size={13} />
            </a>
          ) : locationNote ? (
            <span className="flex items-center gap-1.5" style={{ fontSize: 11.5, color: t.textSecondary }}>
              <MdLocationOff size={15} /> {locationNote}
            </span>
          ) : null}
        </div>
      </div>

      {/* ── Quick Leave / Half Day / WFH actions ────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {(Object.keys(QUICK_ACTION_META) as QuickActionKind[]).map((kind) => (
          <button key={kind} type="button" onClick={() => openQuickAction(kind)}
            className="flex items-center gap-2.5 rounded-2xl p-4"
            style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer', textAlign: 'left' }}>
            <span className="flex items-center justify-center rounded-xl" style={{ width: 38, height: 38, background: `${QUICK_ACTION_META[kind].color}1a`, color: QUICK_ACTION_META[kind].color, flexShrink: 0 }}>
              {QUICK_ACTION_META[kind].icon}
            </span>
            <span>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textPrimary }}>{QUICK_ACTION_META[kind].title}</div>
              <div style={{ fontSize: 10.5, color: t.textSecondary }}>Today, or pick a date</div>
            </span>
          </button>
        ))}
      </div>

      {/* ── History ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl mb-5" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: '0 0 10px' }}>My Attendance History</h3>
          <DateRangePresetFilter t={t} preset={preset} onPresetChange={setPreset}
            customFrom={customFrom} customTo={customTo} onCustomFromChange={setCustomFrom} onCustomToChange={setCustomTo} />
        </div>
        <div className="master-table-scroll">
          <table className="master-table" style={{ minWidth: 600 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                {['Date', 'Status', 'Check In', 'Check Out', 'Location'].map((h) => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {attLoading ? (
                <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading...</td></tr>
              ) : attRecords.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>No attendance records for this period.</td></tr>
              ) : (
                attRecords.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(r.attendance_date)}</td>
                    <td><Badge label={ATT_STATUS_LABEL[r.status]} color={ATT_STATUS_COLOR[r.status]} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.check_in_time || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.check_out_time || '—'}</td>
                    <td>
                      {r.latitude != null && r.longitude != null ? (
                        <a href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`} target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontSize: 11 }}>View on Map</a>
                      ) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: 0 }}>My Leave / Half Day / WFH Requests</h3>
        </div>
        <div className="master-table-scroll">
          <table className="master-table" style={{ minWidth: 700 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                {['From', 'To', 'Type', 'Session', 'Reason', 'Status'].map((h) => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {leaveLoading ? (
                <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading...</td></tr>
              ) : leaveRecords.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>No requests for this period.</td></tr>
              ) : (
                leaveRecords.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(r.from_date)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(r.to_date)}</td>
                    <td>{LEAVE_TYPE_LABEL[r.leave_type as LeaveType] || r.leave_type}</td>
                    <td style={{ textTransform: 'uppercase' }}>{r.session !== 'full' ? r.session : '—'}</td>
                    <td>{r.reason || '—'}</td>
                    <td><Badge label={LEAVE_STATUS_LABEL[r.status]} color={LEAVE_STATUS_COLOR[r.status]} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Quick action modal (Leave / Half Day / WFH) ─────────────── */}
      {quickAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => !submittingQuick && setQuickAction(null)}>
          <div className="rounded-2xl w-full" style={{ maxWidth: 420, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <div className="flex items-center gap-2" style={{ fontSize: 15, fontWeight: 800, color: t.textPrimary }}>
                {QUICK_ACTION_META[quickAction].icon} {QUICK_ACTION_META[quickAction].title}
              </div>
              <button type="button" onClick={() => !submittingQuick && setQuickAction(null)} disabled={submittingQuick}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 4, display: 'flex' }}>
                <MdClose size={20} />
              </button>
            </div>
            <form onSubmit={submitQuickAction} className="p-5" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <FormField label="Date (today, or any past/future date)" t={t}>
                <input type="date" required value={quickDate} onChange={(e) => setQuickDate(e.target.value)} style={getFormInputStyle(t)} />
              </FormField>
              {quickAction === 'half_day' && (
                <FormField label="Session" t={t}>
                  <select value={quickSession} onChange={(e) => setQuickSession(e.target.value as LeaveSession)} style={getFormInputStyle(t)}>
                    <option value="am">Morning (AM)</option>
                    <option value="pm">Afternoon (PM)</option>
                  </select>
                </FormField>
              )}
              <FormField label="Reason" t={t}>
                <textarea value={quickReason} onChange={(e) => setQuickReason(e.target.value)} rows={2} placeholder="Optional"
                  style={{ ...getFormInputStyle(t), resize: 'vertical' as const }} />
              </FormField>
              <div className="flex items-center justify-end gap-2.5 mt-2">
                <button type="button" onClick={() => setQuickAction(null)} disabled={submittingQuick}
                  className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submittingQuick} className="master-btn-primary">
                  <MdCheckCircle size={16} /> {submittingQuick ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
