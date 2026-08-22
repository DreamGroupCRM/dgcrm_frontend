// ==========================================
// DREAM GROUP CRM - EMPLOYEE LIST PAGE
// ==========================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdAdd, MdDelete, MdDownload, MdEdit, MdRefresh, MdSearch, MdVisibility,
  MdFilterList, MdGroups, MdLayers, MdEventBusy, MdPersonOff, MdMoreVert,
  MdGridView, MdViewList, MdEmail, MdPhone, MdLocationOn, MdChevronLeft, MdChevronRight,
} from 'react-icons/md';

import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme } from '../../../../styles/theme';
import { fetchEmployeeList, deleteEmployee, Employee, EmployeeStatus } from '../../../../services/employeeDetailsService';
import { formatDate, showAlert } from '../../../../utils';
import StatCard from '../../../../components/masters/StatCard';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

// The CRUD form only captures one free-text Address field (no separate
// City/State inputs), but the card design shows "City, State" — this
// derives a reasonable display value from the last two comma-separated
// segments of the address rather than requiring a schema change.
const cityStateFromAddress = (address: string): string => {
  const parts = address?.split(',').map((p) => p.trim())?.filter(Boolean);
  if (parts?.length >= 2) return parts?.slice(-2).join(', ');
  return parts?.[0] || '—';
};

const STATUS_STYLES: Record<EmployeeStatus, { bg: string; color: string; label: string }> = {
  active: { bg: '#dcfce7', color: '#16a34a', label: 'Active' },
  on_leave: { bg: '#fef9c3', color: '#ca8a04', label: 'On Leave' },
  inactive: { bg: '#fee2e2', color: '#dc2626', label: 'Inactive' },
};

const initials = (first: string, last: string) => `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();

const EmployeeDetailsListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { mode } = useAppSelector((s) => s.theme);
  const isDark = mode === 'dark';
  const t = getTheme(isDark);

  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [filtered, setFiltered] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [designationFilter, setDesignationFilter] = useState('All Designations');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [locationFilter, setLocationFilter] = useState('All Locations');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { dispatch(setPageTitle('Employees')); }, [dispatch]);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchEmployeeList(1, 1000);
      if (res.success) {
        setAllEmployees(res.rows ?? []);
      } else {
        toast.error('Failed to Fetch Employees');
      }
    } catch {
      toast.error('Failed to fetch employees. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // close the row action menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── derived filter option lists ─────────────────────────────────────────
  const departmentOptions = useMemo(
    () => Array.from(new Set(allEmployees.flatMap((e) => e.department_names || []))).sort(),
    [allEmployees]
  );
  const designationOptions = useMemo(
    () => Array.from(new Set(allEmployees.flatMap((e) => e.designation_names || []))).sort(),
    [allEmployees]
  );
  const locationOptions = useMemo(
    () => Array.from(new Set(allEmployees.map((e) => cityStateFromAddress(e.address)))).sort(),
    [allEmployees]
  );

  // ── summary cards ────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const total = allEmployees.length;
    const active = allEmployees.filter((e) => e.status === 'active').length;
    const onLeave = allEmployees.filter((e) => e.status === 'on_leave').length;
    const inactive = allEmployees.filter((e) => e.status === 'inactive').length;
    const pct = (n: number) => (total === 0 ? '0' : ((n / total) * 100).toFixed(2));
    return { total, active, onLeave, inactive, activePct: pct(active), onLeavePct: pct(onLeave), inactivePct: pct(inactive) };
  }, [allEmployees]);

  // ── search + filters + sort ─────────────────────────────────────────
  useEffect(() => {
    const q = search.trim().toLowerCase();
    let rows = [...allEmployees];

    if (q) {
      rows = rows.filter((e) =>
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.mobile_number?.includes(q) ||
        e.employee_code?.toLowerCase().includes(q)
      );
    }
    if (departmentFilter !== 'All Departments') rows = rows.filter((e) => e.department_names?.includes(departmentFilter));
    if (designationFilter !== 'All Designations') rows = rows.filter((e) => e.designation_names?.includes(designationFilter));
    if (statusFilter !== 'All Status') rows = rows.filter((e) => STATUS_STYLES[e.status]?.label === statusFilter);
    if (locationFilter !== 'All Locations') rows = rows.filter((e) => cityStateFromAddress(e.address) === locationFilter);

    rows.sort((a, b) => {
      if (sortBy === 'name') return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      return sortBy === 'newest' ? bt - at : at - bt;
    });

    setFiltered(rows);
    setPage(1);
  }, [search, departmentFilter, designationFilter, statusFilter, locationFilter, sortBy, allEmployees]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * limit, safePage * limit);

  const pageBtns = () => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  };

  const handleDelete = async (emp: Employee) => {
    setOpenMenuId(null);
    const result = await showAlert.confirm(
      `This will permanently delete ${emp.first_name} ${emp.last_name}'s record.`,
      'Delete Employee?'
    );
    if (!result.isConfirmed) return;
    try {
      await deleteEmployee(emp.id);
      toast.success('Employee Deleted Successfully');
      fetchEmployees();
    } catch {
      toast.error('Failed to delete employee.');
    }
  };

  const handleExportCsv = () => {
    if (filtered.length === 0) {
      toast.error('No employees to export.');
      return;
    }
    const header = ['Employee Code', 'Name', 'Email', 'Mobile', 'Department', 'Designation', 'Status', 'Joined On'];
    const rows = filtered.map((e) => [
      e.employee_code, `${e.first_name} ${e.last_name}`, e.email, e.mobile_number,
      (e.department_names || []).join('; '), (e.designation_names || []).join('; '),
      STATUS_STYLES[e.status]?.label || e.status, formatDate(e.joining_date),
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectStyle: React.CSSProperties = {
    background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 10,
    padding: '8px 12px', fontSize: 13, color: t.inputText, fontFamily: t.fontFamily, cursor: 'pointer',
  };

  // ── card ─────────────────────────────────────────────────────────────
  const EmployeeCard: React.FC<{ emp: Employee }> = ({ emp }) => {
    const status = STATUS_STYLES[emp.status] || STATUS_STYLES.active;
    return (
      <div className="rounded-2xl p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {emp.profile_photo_url ? (
              <img src={emp.profile_photo_url} alt="" className="rounded-full flex-shrink-0" style={{ width: 48, height: 48, objectFit: 'cover' }} />
            ) : (
              <div
                className="flex items-center justify-center rounded-full flex-shrink-0 text-white font-bold"
                style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#4338ca,#4f46e5)', fontSize: 15 }}
              >
                {initials(emp.first_name, emp.last_name)}
              </div>
            )}
            <div className="min-w-0">
              <div style={{ fontSize: 14.5, fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {emp.first_name} {emp.last_name}
              </div>
              <button
                type="button"
                onClick={() => navigate(`/admin/employees/view/${emp.id}`)}
                style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: '#4f46e5', fontSize: 12.5, fontWeight: 600 }}
              >
                {emp.employee_code}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: status.bg, color: status.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" /> {status.label}
            </span>
            <div style={{ position: 'relative' }} ref={openMenuId === emp.id ? menuRef : undefined}>
              <button
                type="button"
                onClick={() => setOpenMenuId((v) => (v === emp.id ? null : emp.id))}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 2 }}
              >
                <MdMoreVert size={18} />
              </button>
              {openMenuId === emp.id && (
                <div
                  style={{
                    position: 'absolute', top: '110%', right: 0, zIndex: 20, minWidth: 140,
                    background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '6px 0',
                  }}
                >
                  <button type="button" onClick={() => { setOpenMenuId(null); navigate(`/admin/employees/view/${emp.id}`); }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-sm" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textPrimary, fontFamily: t.fontFamily }}>
                    <MdVisibility size={16} color="#2563eb" /> View
                  </button>
                  <button type="button" onClick={() => { setOpenMenuId(null); navigate(`/admin/employees/edit/${emp.id}`); }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-sm" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textPrimary, fontFamily: t.fontFamily }}>
                    <MdEdit size={15} color="#7c3aed" /> Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(emp)}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-sm" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#dc2626', fontFamily: t.fontFamily }}>
                    <MdDelete size={16} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 13, color: t.textSecondary, marginBottom: 8 }}>
          {(emp.designation_names || [])[0] || '—'}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {(emp.department_names || []).slice(0, 1).map((d) => (
            <span
              key={`dept-${d}`}
              className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: isDark ? 'rgba(37,99,235,0.15)' : '#eff6ff', color: '#2563eb' }}
            >
              {d}
            </span>
          ))}
          {(emp.designation_names || []).slice(0, 1).map((d) => (
            <span
              key={`desig-${d}`}
              className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: isDark ? 'rgba(124,58,237,0.15)' : '#f5f3ff', color: '#7c3aed' }}
            >
              {d}
            </span>
          ))}
        </div>

        <div className="space-y-1.5" style={{ fontSize: 12.5, color: t.textSecondary }}>
          <div className="flex items-center gap-1.5 min-w-0">
            <MdEmail size={14} className="flex-shrink-0" />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.email}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MdPhone size={14} className="flex-shrink-0" />
            {emp.mobile_country_code} {emp.mobile_number}
          </div>
          <div className="flex items-center gap-1.5">
            <MdLocationOn size={14} className="flex-shrink-0" />
            {cityStateFromAddress(emp.address)}
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: t.textSecondary, marginTop: 10, paddingTop: 8, borderTop: `1px solid ${t.divider}` }}>
          Joined on {formatDate(emp.joining_date)}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: t.fontFamily }}>

      {/* ── Summary cards — compact, label on top / count below (item 10),
          same size as Building master's boxes instead of the previous
          oversized cards. ────────────────────────────────────────────── */}
      <div className="master-stat-grid">
        {[
          { label: 'Total Employees', value: summary.total, icon: MdGroups, color: '#7c3aed', bg: isDark ? 'rgba(124,58,237,0.12)' : '#f5f3ff' },
          { label: 'Active Employees', value: summary.active, icon: MdLayers, color: '#16a34a', bg: isDark ? 'rgba(22,163,74,0.12)' : '#f0fdf4' },
          { label: 'On Leave', value: summary.onLeave, icon: MdEventBusy, color: '#2563eb', bg: isDark ? 'rgba(37,99,235,0.12)' : '#eff6ff' },
          { label: 'Inactive Employees', value: summary.inactive, icon: MdPersonOff, color: '#ea580c', bg: isDark ? 'rgba(234,88,12,0.12)' : '#fff7ed' },
        ].map((card) => (
          <StatCard key={card.label} {...card} loading={loading}
            surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        ))}
      </div>

      {/* ── All Employees panel ──────────────────────────────────────── */}
      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>

        <div className="flex flex-wrap items-center justify-between gap-3 p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, width: 260 }}>
              <MdSearch size={18} style={{ color: t.textPrimary, flexShrink: 0 }} />
              <input
                type="text" placeholder="Search by name, email, phone or employee code..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 13, width: '100%' }}
              />
            </div>

            <button
              type="button"
              onClick={() => navigate('/admin/employee/employee-details/add')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#4338ca,#4f46e5)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <MdAdd size={18} /> Add Employee
            </button>

            <button type="button" onClick={handleExportCsv} title="Export CSV"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold"
              style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
              <MdDownload size={17} /> Export CSV
            </button>

            <button type="button" onClick={fetchEmployees} title="Refresh" className="flex items-center justify-center rounded-xl"
              style={{ width: 34, height: 34, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
              <MdRefresh size={17} />
            </button>

          </div>
        </div>

        {/* cards */}
        <div className="p-5">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32, color: t.textSecondary }}>Loading employees...</div>
          ) : pageRows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: t.textSecondary }}>No employees found.</div>
          ) : (
            <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4' : 'flex flex-col gap-3'}>
              {pageRows.map((emp, idx) => <EmployeeCard key={emp.id || emp.employee_code || idx} emp={emp} />)}
            </div>
          )}
        </div>

        {/* pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" style={{ borderTop: `1px solid ${t.divider}` }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 13, color: t.textSecondary }}>Rows per page:</span>
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 8, padding: '4px 8px', fontSize: 13, cursor: 'pointer', outline: 'none' }}>
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ fontSize: 13, color: t.textSecondary }}>
            Showing {filtered.length === 0 ? 0 : (safePage - 1) * limit + 1}–{Math.min(safePage * limit, filtered.length)} of {filtered.length} employees
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: safePage <= 1 ? 'not-allowed' : 'pointer', opacity: safePage <= 1 ? 0.5 : 1 }}>
              <MdChevronLeft size={18} />
            </button>
            {pageBtns().map((n) => (
              <button key={n} type="button" onClick={() => setPage(n)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: n === safePage ? '#4338ca' : t.insetBg, color: n === safePage ? '#fff' : t.textPrimary, border: `1px solid ${n === safePage ? '#4338ca' : t.surfaceBorder}`, cursor: 'pointer' }}>
                {n}
              </button>
            ))}
            {totalPages > pageBtns()[pageBtns().length - 1] && <span style={{ color: t.textSecondary, padding: '0 4px' }}>...</span>}
            <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages ? 0.5 : 1 }}>
              <MdChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetailsListPage;
