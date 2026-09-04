// ==========================================
// DREAM GROUP CRM - ATTENDANCE PAGE (ADMIN)
// ==========================================
// Replaces the former "Coming Soon" placeholder. Backed by the existing
// working attendance API (GET/POST /api/attendance — attendance.routes.ts)
// — nothing new on the backend, this is the first real UI for it. Admin
// can view any employee's attendance for a month and mark/correct a
// record for any employee (the same upsert-by-date the API already does).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { MdEventAvailable, MdCheckCircle, MdCancel, MdTimelapse, MdBeachAccess, MdAdd, MdRefresh } from 'react-icons/md';

import { useAppDispatch } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import { getFormInputStyle, FormField } from '../../../../components/common/MasterListUI';
import StatCard from '../../../../components/masters/StatCard';
import { FetchEmployeeDetails } from '../../../../services/employeeDetailsService';
import { fetchAttendance, markAttendance, AttendanceRecord, AttendanceStatus } from '../../../../services/attendanceService';
import { formatDate } from '../../../../utils';

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
const emptyForm = { employee_id: '', attendance_date: todayISO(), status: 'present' as AttendanceStatus, check_in_time: '', check_out_time: '', remarks: '' };

const AttendancePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t, cssVars } = useAppearanceTokens();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [employeeOptions, setEmployeeOptions] = useState<{ id: string; name: string }[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { dispatch(setPageTitle('Attendance')); }, [dispatch]);

  useEffect(() => {
    FetchEmployeeDetails(1, 500, undefined, true)
      .then((res) => { if (res.success) setEmployeeOptions(res.rows.map((e) => ({ id: e.id, name: `${e.first_name} ${e.last_name}`.trim() }))); })
      .catch(() => { /* dropdown staying empty is a harmless degrade */ });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchAttendance({ month, year, employee_id: employeeFilter || undefined });
      setRecords(rows);
    } catch {
      toast.error('Failed to load attendance.');
    } finally {
      setLoading(false);
    }
  }, [month, year, employeeFilter]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<AttendanceStatus, number> = { present: 0, absent: 0, half_day: 0, leave: 0 };
    records.forEach((r) => { if (c[r.status] !== undefined) c[r.status] += 1; });
    return c;
  }, [records]);

  const openModal = () => { setForm(emptyForm); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id) { toast.error('Select an employee.'); return; }
    setSaving(true);
    try {
      await markAttendance({
        employee_id: Number(form.employee_id),
        attendance_date: form.attendance_date,
        status: form.status,
        check_in_time: form.check_in_time || null,
        check_out_time: form.check_out_time || null,
        remarks: form.remarks || null,
      });
      toast.success('Attendance saved.');
      setShowModal(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i);

  return (
    <div style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Present" value={counts.present} icon={MdCheckCircle} color="#16a34a" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Absent" value={counts.absent} icon={MdCancel} color="#dc2626" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Half Day" value={counts.half_day} icon={MdTimelapse} color="#d97706" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Leave" value={counts.leave} icon={MdBeachAccess} color="#7c3aed" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
      </div>

      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <div className="flex flex-wrap items-center gap-2.5">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ ...getFormInputStyle(t), width: 150 }}>
              {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ ...getFormInputStyle(t), width: 100 }}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} style={{ ...getFormInputStyle(t), width: 200 }}>
              <option value="">All Employees</option>
              {employeeOptions.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={openModal} className="master-btn-primary">
              <MdAdd size={16} /> Mark Attendance
            </button>
            <button type="button" onClick={load} title="Refresh"
              className="flex items-center justify-center rounded-xl"
              style={{ width: 38, height: 38, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
              <MdRefresh size={18} />
            </button>
          </div>
        </div>

        <div className="master-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                {['Employee', 'Date', 'Status', 'Check In', 'Check Out', 'Remarks'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading attendance...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>No attendance records for this period.</td></tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                    <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap' }}>{r.employee_name}</td>
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

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="rounded-2xl"
            style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, maxWidth: 480, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="p-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: 0 }}>Mark Attendance</h3>
            </div>
            <form onSubmit={handleSave} className="p-4" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <FormField label="Employee *" t={t}>
                <select required value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))} style={getFormInputStyle(t)}>
                  <option value="">Select employee</option>
                  {employeeOptions.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </FormField>
              <FormField label="Date *" t={t}>
                <input required type="date" value={form.attendance_date} onChange={(e) => setForm((f) => ({ ...f, attendance_date: e.target.value }))} style={getFormInputStyle(t)} />
              </FormField>
              <FormField label="Status *" t={t}>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as AttendanceStatus }))} style={getFormInputStyle(t)}>
                  {(Object.keys(STATUS_LABEL) as AttendanceStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Check In" t={t}><input type="time" value={form.check_in_time} onChange={(e) => setForm((f) => ({ ...f, check_in_time: e.target.value }))} style={getFormInputStyle(t)} /></FormField>
                <FormField label="Check Out" t={t}><input type="time" value={form.check_out_time} onChange={(e) => setForm((f) => ({ ...f, check_out_time: e.target.value }))} style={getFormInputStyle(t)} /></FormField>
              </div>
              <FormField label="Remarks" t={t}>
                <textarea value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} rows={2} style={{ ...getFormInputStyle(t), resize: 'vertical' as const }} />
              </FormField>
              <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
                <button type="submit" disabled={saving} className="master-btn-primary">
                  <MdEventAvailable size={16} /> {saving ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="master-btn-icon"
                  style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, padding: '9px 16px' }}>
                  Cancel
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
