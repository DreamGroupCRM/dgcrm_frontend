// ==========================================
// DREAM GROUP CRM - ATTENDANCE & LEAVE PAGE (ADMIN)
// ==========================================
// Merged home for both Attendance and Leave Requests — previously two
// separate sidebar entries/pages, now one page with a tab switcher since
// both are "attendance" from an admin's point of view (mark/review a day,
// approve/reject a leave). Each tab keeps its original feature set
// (stat cards, toolbar, filters, table) untouched; only the shell around
// them — heading + tab switcher — is new. Backed by the existing working
// attendance API (GET/POST /api/attendance) and leave API
// (leaves.routes.ts) — nothing new on the backend.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '@/utils/toast';
import {
  MdEventAvailable, MdCheckCircle, MdCancel, MdTimelapse, MdBeachAccess,
  MdAdd, MdRefresh, MdHourglassEmpty, MdMoreVert,
} from 'react-icons/md';

import { useAppDispatch } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import { getFormInputStyle, FormField } from '../../../../components/common/MasterListUI';
import StatCard from '../../../../components/masters/StatCard';
import { RowActionMenu, useRowActionMenu } from '../../../../components/common/RowActionMenu';
import DateRangePresetFilter, { DateRangePreset, computeDateRangePreset } from '../../../../components/common/DateRangePresetFilter';
import { FetchEmployeeDetails } from '../../../../services/employeeDetailsService';
import { fetchAttendance, markAttendance, AttendanceRecord, AttendanceStatus } from '../../../../services/attendanceService';
import { fetchLeaves, reviewLeaveRequest, LeaveRecord, LeaveStatus, LEAVE_TYPE_LABEL, LeaveType, LEAVE_SESSION_LABEL } from '../../../../services/leaveService';
import { formatDate, formatLastLogin } from '../../../../utils';
import './AttendancePage.css';
import { StatusChip } from '../../../../components/common/MasterListUI';
import { serverTodayYmd } from '../../../../utils/serverTime';

type Tab = 'attendance' | 'leave';

const ATT_STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present', absent: 'Absent', half_day: 'Half Day', leave: 'Leave',
};
// Colors come from styles/statusColors.ts, not a local map. The previous
// `${color}1a` pattern painted a 10%-alpha background, so the chip's
// appearance changed with whatever surface was behind it — pale in light
// theme, near-black in dark. A status chip now looks the same in both.
const AttStatusBadge: React.FC<{ status: AttendanceStatus }> = ({ status }) => (
  <StatusChip label={ATT_STATUS_LABEL[status]} status={status} fontSize={11} />
);

const LV_STATUS_LABEL: Record<LeaveStatus, string> = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };
const LvStatusBadge: React.FC<{ status: LeaveStatus }> = ({ status }) => (
  <StatusChip label={LV_STATUS_LABEL[status]} status={status} fontSize={11} />
);
const leaveTypeLabel = (v: string): string => LEAVE_TYPE_LABEL[v as LeaveType] || v;
const daysInclusive = (from: string, to: string): number => {
  const ms = new Date(to.slice(0, 10)).getTime() - new Date(from.slice(0, 10)).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
};

const todayISO = () => serverTodayYmd();
const emptyAttForm = { employee_id: '', attendance_date: todayISO(), status: 'present' as AttendanceStatus, check_in_time: '', check_out_time: '', remarks: '' };

const AttendancePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t, cssVars } = useAppearanceTokens();

  const [activeTab, setActiveTab] = useState<Tab>('attendance');
  const [employeeOptions, setEmployeeOptions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    dispatch(setPageTitle(activeTab === 'attendance' ? 'Attendance' : 'Leave Requests'));
  }, [dispatch, activeTab]);

  useEffect(() => {
    FetchEmployeeDetails(1, 500, undefined, true)
      .then((res) => { if (res.success) setEmployeeOptions(res.rows.map((e) => ({ id: e.id, name: `${e.first_name} ${e.last_name}`.trim() }))); })
      .catch(() => { /* dropdown staying empty is a harmless degrade */ });
  }, []);

  // ── Attendance tab state/logic (unchanged from the former standalone page) ──
  const [attPreset, setAttPreset] = useState<DateRangePreset>('monthly');
  const [attCustomFrom, setAttCustomFrom] = useState(todayISO);
  const [attCustomTo, setAttCustomTo] = useState(todayISO);
  const [attEmployeeFilter, setAttEmployeeFilter] = useState('');
  const [attStatusFilter, setAttStatusFilter] = useState<AttendanceStatus | ''>('');
  const [attRecords, setAttRecords] = useState<AttendanceRecord[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [showAttModal, setShowAttModal] = useState(false);
  const [attForm, setAttForm] = useState(emptyAttForm);
  const [attSaving, setAttSaving] = useState(false);

  const loadAttendance = useCallback(async () => {
    setAttLoading(true);
    try {
      const { from, to } = attPreset === 'custom' ? { from: attCustomFrom, to: attCustomTo } : computeDateRangePreset(attPreset);
      const rows = await fetchAttendance({ from, to, employee_id: attEmployeeFilter || undefined });
      setAttRecords(rows);
    } catch {
      toast.error('Failed to load attendance.');
    } finally {
      setAttLoading(false);
    }
  }, [attPreset, attCustomFrom, attCustomTo, attEmployeeFilter]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  const filteredAttRecords = useMemo(
    () => (attStatusFilter ? attRecords.filter((r) => r.status === attStatusFilter) : attRecords),
    [attRecords, attStatusFilter],
  );

  const attCounts = useMemo(() => {
    const c: Record<AttendanceStatus, number> = { present: 0, absent: 0, half_day: 0, leave: 0 };
    attRecords.forEach((r) => { if (c[r.status] !== undefined) c[r.status] += 1; });
    return c;
  }, [attRecords]);

  const openAttModal = () => { setAttForm(emptyAttForm); setShowAttModal(true); };

  const handleAttSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attForm.employee_id) { toast.error('Select an employee.'); return; }
    setAttSaving(true);
    try {
      await markAttendance({
        employee_id: Number(attForm.employee_id),
        attendance_date: attForm.attendance_date,
        status: attForm.status,
        check_in_time: attForm.check_in_time || null,
        check_out_time: attForm.check_out_time || null,
        remarks: attForm.remarks || null,
      });
      toast.success('Attendance saved.');
      setShowAttModal(false);
      loadAttendance();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save attendance.');
    } finally {
      setAttSaving(false);
    }
  };

  // ── Leave Requests tab state/logic (unchanged from the former standalone page) ──
  const [lvStatusFilter, setLvStatusFilter] = useState<'all' | LeaveStatus>('pending');
  const [lvEmployeeFilter, setLvEmployeeFilter] = useState('');
  const [lvPreset, setLvPreset] = useState<DateRangePreset>('monthly');
  const [lvCustomFrom, setLvCustomFrom] = useState(todayISO);
  const [lvCustomTo, setLvCustomTo] = useState(todayISO);
  const [lvRecords, setLvRecords] = useState<LeaveRecord[]>([]);
  const [lvLoading, setLvLoading] = useState(false);
  const [lvBusyId, setLvBusyId] = useState<string | null>(null);
  const lvRowMenu = useRowActionMenu<string>();

  const loadLeaves = useCallback(async () => {
    setLvLoading(true);
    try {
      const { from, to } = lvPreset === 'custom' ? { from: lvCustomFrom, to: lvCustomTo } : computeDateRangePreset(lvPreset);
      const rows = await fetchLeaves({
        status: lvStatusFilter === 'all' ? undefined : lvStatusFilter,
        employee_id: lvEmployeeFilter || undefined,
        from,
        to,
      });
      setLvRecords(rows);
    } catch {
      toast.error('Failed to load leave requests.');
    } finally {
      setLvLoading(false);
    }
  }, [lvStatusFilter, lvEmployeeFilter, lvPreset, lvCustomFrom, lvCustomTo]);

  useEffect(() => { loadLeaves(); }, [loadLeaves]);

  const lvPendingCount = useMemo(() => lvRecords.filter((r) => r.status === 'pending').length, [lvRecords]);

  const handleLeaveReview = async (record: LeaveRecord, decision: 'approved' | 'rejected') => {
    setLvBusyId(record.id);
    try {
      await reviewLeaveRequest(record.id, decision);
      toast.success(`Leave request ${decision}.`);
      loadLeaves();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update leave request.');
    } finally {
      setLvBusyId(null);
    }
  };

  return (
    <div className="attlv-page" style={{ fontFamily: t.fontFamily, ...cssVars }}>
      {/* ── Tab switcher — Attendance and Leave Requests both live here now;
          the Leave tab carries a small badge for pending requests so an
          admin never has to open it just to check if anything's waiting. */}
      <div className="attlv-tabs flex items-center gap-1.5 mb-5" style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 14, padding: 5, width: 'fit-content' }}>
        <button type="button" onClick={() => setActiveTab('attendance')}
          className="attlv-tab flex items-center gap-2 rounded-xl"
          style={{
            padding: '9px 18px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
            background: activeTab === 'attendance' ? 'var(--brand-gradient)' : 'transparent',
            color: activeTab === 'attendance' ? '#fff' : t.textSecondary,
          }}>
          <MdEventAvailable size={16} /> Attendance
        </button>
        <button type="button" onClick={() => setActiveTab('leave')}
          className="attlv-tab flex items-center gap-2 rounded-xl"
          style={{
            padding: '9px 18px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
            background: activeTab === 'leave' ? 'var(--brand-gradient)' : 'transparent',
            color: activeTab === 'leave' ? '#fff' : t.textSecondary,
          }}>
          <MdBeachAccess size={16} /> Leave Requests
          {lvPendingCount > 0 && (
            <span className="attlv-tab-badge" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, fontSize: 10.5, fontWeight: 800,
              background: activeTab === 'leave' ? 'rgba(255,255,255,0.28)' : '#dc2626', color: '#fff',
            }}>
              {lvPendingCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'attendance' ? (
        <>
          <div className="att-admin-stat-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <StatCard label="Present" value={attCounts.present} icon={MdCheckCircle} color="#16a34a" bg="" loading={attLoading}
              surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
            <StatCard label="Absent" value={attCounts.absent} icon={MdCancel} color="#dc2626" bg="" loading={attLoading}
              surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
            <StatCard label="Half Day" value={attCounts.half_day} icon={MdTimelapse} color="#d97706" bg="" loading={attLoading}
              surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
            <StatCard label="Leave" value={attCounts.leave} icon={MdBeachAccess} color="#7c3aed" bg="" loading={attLoading}
              surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
          </div>

          <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
            <div className="att-admin-toolbar flex flex-wrap items-center justify-between gap-3 p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <DateRangePresetFilter t={t} preset={attPreset} onPresetChange={setAttPreset}
                customFrom={attCustomFrom} customTo={attCustomTo} onCustomFromChange={setAttCustomFrom} onCustomToChange={setAttCustomTo} />
              <div className="att-admin-toolbar-actions flex items-center gap-2.5">
                <button type="button" onClick={openAttModal} className="att-admin-mark-btn master-btn-primary">
                  <MdAdd size={16} /> <span className="att-admin-mark-btn-text">Mark Attendance</span>
                </button>
                <button type="button" onClick={loadAttendance} title="Refresh"
                  className="att-admin-refresh-btn flex items-center justify-center rounded-xl"
                  style={{ width: 38, height: 38, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
                  <MdRefresh size={18} />
                </button>
              </div>
            </div>

            <div className="att-admin-filters flex flex-wrap items-center gap-2.5 px-5 py-3" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <select value={attEmployeeFilter} onChange={(e) => setAttEmployeeFilter(e.target.value)} style={{ ...getFormInputStyle(t), width: 200 }}>
                <option value="">All Employees</option>
                {employeeOptions.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
              <select value={attStatusFilter} onChange={(e) => setAttStatusFilter(e.target.value as AttendanceStatus | '')} style={{ ...getFormInputStyle(t), width: 160 }}>
                <option value="">All Statuses</option>
                {(Object.keys(ATT_STATUS_LABEL) as AttendanceStatus[]).map((s) => <option key={s} value={s}>{ATT_STATUS_LABEL[s]}</option>)}
              </select>
            </div>

            <div className="master-table-scroll">
              <table className="att-admin-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                    {['Employee', 'Date', 'Status', 'Check In', 'Check Out', 'Location', 'Remarks'].map((h) => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {attLoading ? (
                    <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading attendance...</td></tr>
                  ) : filteredAttRecords.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>No attendance records for this period.</td></tr>
                  ) : (
                    filteredAttRecords.map((r) => (
                      <tr key={r.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                        <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap' }}>{r.employee_name}</td>
                        <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatDate(r.attendance_date)}</td>
                        <td style={{ padding: '12px 14px' }}><AttStatusBadge status={r.status} /></td>
                        <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.check_in_time || '—'}</td>
                        <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.check_out_time || '—'}</td>
                        <td style={{ padding: '12px 14px', fontSize: 11.5, whiteSpace: 'nowrap' }}>
                          {r.latitude != null && r.longitude != null ? (
                            <a href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`} target="_blank" rel="noreferrer" style={{ color: t.accentText }}>View on Map</a>
                          ) : <span style={{ color: t.textSecondary }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary }}>{r.remarks || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {showAttModal && (
            <div className="att-admin-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <div onClick={(e) => e.stopPropagation()} className="rounded-2xl"
                style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, maxWidth: 480, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
                <div className="p-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: 0 }}>Mark Attendance</h3>
                </div>
                <form onSubmit={handleAttSave} className="p-4" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <FormField label="Employee *" t={t}>
                    <select required value={attForm.employee_id} onChange={(e) => setAttForm((f) => ({ ...f, employee_id: e.target.value }))} style={getFormInputStyle(t)}>
                      <option value="">Select employee</option>
                      {employeeOptions.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Date *" t={t}>
                    <input required type="date" value={attForm.attendance_date} max={serverTodayYmd()} onChange={(e) => setAttForm((f) => ({ ...f, attendance_date: e.target.value }))} style={getFormInputStyle(t)} />
                  </FormField>
                  <FormField label="Status *" t={t}>
                    <select value={attForm.status} onChange={(e) => setAttForm((f) => ({ ...f, status: e.target.value as AttendanceStatus }))} style={getFormInputStyle(t)}>
                      {(Object.keys(ATT_STATUS_LABEL) as AttendanceStatus[]).map((s) => <option key={s} value={s}>{ATT_STATUS_LABEL[s]}</option>)}
                    </select>
                  </FormField>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label="Check In" t={t}><input type="time" value={attForm.check_in_time} onChange={(e) => setAttForm((f) => ({ ...f, check_in_time: e.target.value }))} style={getFormInputStyle(t)} /></FormField>
                    <FormField label="Check Out" t={t}><input type="time" value={attForm.check_out_time} onChange={(e) => setAttForm((f) => ({ ...f, check_out_time: e.target.value }))} style={getFormInputStyle(t)} /></FormField>
                  </div>
                  <FormField label="Remarks" t={t}>
                    <textarea value={attForm.remarks} onChange={(e) => setAttForm((f) => ({ ...f, remarks: e.target.value }))} rows={2} style={{ ...getFormInputStyle(t), resize: 'vertical' as const }} />
                  </FormField>
                  <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
                    <button type="submit" disabled={attSaving} className="master-btn-primary">
                      <MdEventAvailable size={16} /> {attSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button type="button" onClick={() => setShowAttModal(false)} className="master-btn-icon"
                      style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, padding: '9px 16px' }}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="lv-appr-stat-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
            <StatCard label="Showing" value={lvRecords.length} icon={MdBeachAccess} color="#7c3aed" bg="" loading={lvLoading}
              surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
            <StatCard label="Pending" value={lvPendingCount} icon={MdHourglassEmpty} color="#d97706" bg="" loading={lvLoading}
              surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
          </div>

          <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
            <div className="lv-appr-toolbar flex flex-wrap items-center justify-between gap-3 p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <div className="lv-appr-status-tabs flex items-center rounded-xl p-0.5" style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}` }}>
                {(['all', 'pending', 'approved', 'rejected'] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setLvStatusFilter(v)}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap capitalize"
                    style={{ background: lvStatusFilter === v ? 'var(--grad-purple)' : 'transparent', color: lvStatusFilter === v ? '#fff' : t.textSecondary, border: 'none', cursor: 'pointer' }}>
                    {v}
                  </button>
                ))}
              </div>
              <div className="lv-appr-toolbar-actions flex flex-wrap items-center gap-2.5">
                <select value={lvEmployeeFilter} onChange={(e) => setLvEmployeeFilter(e.target.value)} style={{ ...getFormInputStyle(t), width: 200 }}>
                  <option value="">All Employees</option>
                  {employeeOptions.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
                <button type="button" onClick={loadLeaves} title="Refresh"
                  className="lv-appr-refresh-btn flex items-center justify-center rounded-xl"
                  style={{ width: 38, height: 38, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
                  <MdRefresh size={18} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 px-5 py-3" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <DateRangePresetFilter t={t} preset={lvPreset} onPresetChange={setLvPreset}
                customFrom={lvCustomFrom} customTo={lvCustomTo} onCustomFromChange={setLvCustomFrom} onCustomToChange={setLvCustomTo}
                accentColor="#7c3aed" />
            </div>

            <div className="master-table-scroll">
              <table className="lv-appr-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
                <thead>
                  <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                    {['Employee', 'From', 'To', 'Days', 'Type', 'Session', 'Reason', 'Status', 'Requested', 'Action'].map((h) => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lvLoading ? (
                    <tr><td colSpan={10} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading leave requests...</td></tr>
                  ) : lvRecords.length === 0 ? (
                    <tr><td colSpan={10} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>No leave requests found.</td></tr>
                  ) : (
                    lvRecords.map((r) => (
                      <tr key={r.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                        <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap' }}>{r.employee_name}</td>
                        <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatDate(r.from_date)}</td>
                        <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatDate(r.to_date)}</td>
                        <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{daysInclusive(r.from_date, r.to_date)}</td>
                        <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{leaveTypeLabel(r.leave_type)}</td>
                        <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{r.session && r.session !== 'full' ? LEAVE_SESSION_LABEL[r.session] : '—'}</td>
                        <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, maxWidth: 220 }}>{r.reason || '—'}</td>
                        <td style={{ padding: '12px 14px' }}><LvStatusBadge status={r.status} /></td>
                        <td style={{ padding: '12px 14px', fontSize: 11, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatLastLogin(r.created_at)}</td>
                        <td style={{ padding: '12px 14px' }}>
                          {r.status === 'pending' ? (
                            <div className="flex items-center justify-center">
                              <button type="button" title="Actions" className="master-icon-btn"
                                ref={lvRowMenu.openId === r.id ? lvRowMenu.buttonRef : undefined}
                                onClick={lvRowMenu.toggle(r.id, 2)}>
                                <MdMoreVert size={16} />
                              </button>
                              {lvRowMenu.openId === r.id && lvRowMenu.pos && (
                                <RowActionMenu t={t} pos={lvRowMenu.pos} actions={[
                                  { key: 'approve', label: 'Approve', icon: <MdCheckCircle size={14} color="#16a34a" />, disabled: lvBusyId === r.id, onClick: () => { lvRowMenu.close(); handleLeaveReview(r, 'approved'); } },
                                  { key: 'reject', label: 'Reject', icon: <MdCancel size={14} />, danger: true, disabled: lvBusyId === r.id, onClick: () => { lvRowMenu.close(); handleLeaveReview(r, 'rejected'); } },
                                ]} />
                              )}
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
        </>
      )}
    </div>
  );
};

export default AttendancePage;
