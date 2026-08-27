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
  MdToggleOn, MdToggleOff,
} from 'react-icons/md';

import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme } from '../../../../styles/theme';
import { FetchEmployeeDetails, DeleteEmployee, SetEmployeeActiveStatus, Employee, EmployeeStatus } from '../../../../services/employeeDetailsService';
import { formatDate, showAlert } from '../../../../utils';
import StatCard from '../../../../components/masters/StatCard';
import './EmployeeDetails.css';

// Age in years + months from a 'YYYY-MM-DD' date_of_birth — same "derive
// from existing data, no schema change" approach as cityStateFromAddress
// below. e.g. DOB 22-03-1994 today -> "32 yrs 5 months", not just "32 yrs".
const ageFromDob = (dob: string): string | null => {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  if (years < 0) return null;
  return months > 0 ? `${years} yrs ${months} months` : `${years} yrs`;
};

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
  const [limit, setLimit] = useState(10);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { dispatch(setPageTitle('Employees')); }, [dispatch]);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await FetchEmployeeDetails(1, 1000);
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

  // ── search (employee name OR employee ID) + filters + sort ─────────────
  useEffect(() => {
    const q = search.trim().toLowerCase();
    let rows = [...allEmployees];

    if (q) {
      rows = rows.filter((e) =>
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
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
      await DeleteEmployee(emp.id);
      toast.success('Employee deleted successfully.');
      fetchEmployees();
    } catch {
      toast.error('Failed to delete employee.');
    }
  };

  const handleToggleActive = async (emp: Employee) => {
    setOpenMenuId(null);
    const activating = !emp.is_active;
    const result = await showAlert.confirm(
      activating
        ? `${emp.first_name} ${emp.last_name} will be able to log in again.`
        : `${emp.first_name} ${emp.last_name} will no longer be able to log in.`,
      activating ? 'Activate Employee?' : 'Deactivate Employee?'
    );
    if (!result.isConfirmed) return;
    try {
      await SetEmployeeActiveStatus(String(emp.id), activating);
      toast.success(activating ? 'Employee activated.' : 'Employee deactivated.');
      fetchEmployees();
    } catch {
      toast.error(`Failed to ${activating ? 'activate' : 'deactivate'} employee.`);
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

  // ── CSS custom properties for EmployeeDetails.css — set once here from
  // this page's own getTheme(isDark) values, consumed by the emp-* classes
  // below (and, via the emp-field-view modifier, by the Crud page too). ──
  const cssVars = {
    '--emp-field-bg': t.inputBg, '--emp-field-border': t.inputBorder, '--emp-field-text': t.inputText,
    '--emp-inset-bg': t.insetBg, '--emp-text-primary': t.textPrimary, '--emp-text-secondary': t.textSecondary,
    '--emp-surface-border': t.surfaceBorder, '--emp-divider': t.divider,
  } as React.CSSProperties;

  // ── card ─────────────────────────────────────────────────────────────
  const EmployeeCard: React.FC<{ emp: Employee }> = ({ emp }) => {
    const status = STATUS_STYLES[emp.status] || STATUS_STYLES.active;
    return (
      <div className="rounded-2xl p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Status badge lives under the photo (small, out of the name's
                way) rather than beside the name — at card width, a badge
                next to the name was eating enough space to truncate names
                like "Sohel" down to "Soh…". */}
            <div className="flex flex-col items-center flex-shrink-0" style={{ gap: 4 }}>
              {emp.profile_photo_url ? (
                <img src={emp.profile_photo_url} alt="" className="rounded-full" style={{ width: 48, height: 48, objectFit: 'cover' }} />
              ) : (
                <div
                  className="flex items-center justify-center rounded-full text-white font-bold"
                  style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#4338ca,#4f46e5)', fontSize: 13 }}
                >
                  {initials(emp.first_name, emp.last_name)}
                </div>
              )}
              <span
                className="inline-flex items-center gap-1 px-1.5 rounded-full font-semibold"
                style={{ background: status.bg, color: status.color, fontSize: 10, lineHeight: '14px', whiteSpace: 'nowrap' }}
              >
                <span className="w-1 h-1 rounded-full bg-current" /> {status.label}
              </span>
            </div>
            <div className="min-w-0">
              {/* Wraps onto a 2nd line instead of truncating with "…" — at
                  card width, a single-line ellipsis was cutting "Sohel" down
                  to "Soh…"; wrapping keeps the full name readable. */}
              <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, lineHeight: 1.25, wordBreak: 'break-word' }}>
                {emp.first_name} {emp.last_name}
              </div>
              <button
                type="button"
                onClick={() => navigate(`/admin/employee/employee-details/view/${emp.id}`)}
                style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: '#4f46e5', fontSize: 11, fontWeight: 600 }}
              >
                {emp.employee_code}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* 3-dot menu — the card itself is not clickable; only this button
                exposes View/Edit/Delete, as a vertical dropdown beneath the
                button (matching the reference design). Positioned within the
                button's own relative wrapper (not the whole card) so it
                can't get clipped by the card's edge in the grid's
                rightmost columns. */}
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
                    boxShadow: '0 8px 24px rgba(0,0,0,0.14)', padding: '6px 0',
                  }}
                >
                  <button type="button" title="View" onClick={() => { setOpenMenuId(null); navigate(`/admin/employee/employee-details/view/${emp.id}`); }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-sm emp-menu-btn">
                    <MdVisibility size={16} color="#2563eb" /> View
                  </button>
                  <button type="button" title="Edit" onClick={() => { setOpenMenuId(null); navigate(`/admin/employee/employee-details/edit/${emp.id}`); }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-sm emp-menu-btn">
                    <MdEdit size={15} color="#7c3aed" /> Edit
                  </button>
                  <button type="button" title={emp.is_active ? 'Deactivate' : 'Activate'} onClick={() => handleToggleActive(emp)}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-sm emp-menu-btn">
                    {emp.is_active
                      ? <><MdToggleOff size={16} color="#ea580c" /> Deactivate</>
                      : <><MdToggleOn size={16} color="#16a34a" /> Activate</>}
                  </button>
                  <button type="button" title="Delete" onClick={() => handleDelete(emp)}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-sm emp-menu-btn emp-menu-btn-danger">
                    <MdDelete size={16} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {(() => {
          // Department/Designation deliberately not shown on the profile
          // card (removed per request) — still available via the Department/
          // Designation filter dropdowns and the employee's own View page.
          const age = ageFromDob(emp.date_of_birth);
          return age != null ? (
            <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: 11.5, color: t.textSecondary, marginBottom: 8 }}>
              <span>{age}</span>
            </div>
          ) : null;
        })()}

        <div className="space-y-1.5" style={{ fontSize: 11, color: t.textSecondary }}>
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

        <div style={{ fontSize: 10, color: t.textSecondary, marginTop: 10, paddingTop: 8, borderTop: `1px solid ${t.divider}` }}>
          Joined on {formatDate(emp.joining_date)}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="master-page" style={{ fontFamily: t.fontFamily, ...cssVars }}>

      {/* ── Summary cards — same compact sizing/spacing as Building master's
          boxes; label font-size fixed at 16px (StatCard's labelFontSize
          prop — every other caller leaves it unset and keeps the CSS
          class's default label size). ──────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Employees', value: summary.total, icon: MdGroups, color: '#7c3aed', bg: isDark ? 'rgba(124,58,237,0.12)' : '#f5f3ff' },
          { label: 'Active Employees', value: summary.active, icon: MdLayers, color: '#16a34a', bg: isDark ? 'rgba(22,163,74,0.12)' : '#f0fdf4' },
          { label: 'Inactive Employees', value: summary.inactive, icon: MdPersonOff, color: '#ea580c', bg: isDark ? 'rgba(234,88,12,0.12)' : '#fff7ed' },
          { label: 'On Leave', value: summary.onLeave, icon: MdEventBusy, color: '#2563eb', bg: isDark ? 'rgba(37,99,235,0.12)' : '#eff6ff' },
        ].map((card) => (
          <StatCard key={card.label} {...card} loading={loading} compact labelFontSize={14}
            surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        ))}
      </div>

      {/* ── Search (left) | Add + Export + Refresh (right) — same
          master-topbar/master-search-box/master-actions classes and
          button styling every other master's list page uses, so this row
          inherits the same responsive stacking behavior at narrower
          widths for free. ──────────────────────────────────────────── */}
      <div className="master-topbar">
        <div className="master-search-box" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
          <MdSearch size={18} style={{ color: t.textPrimary, flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by Employee Name or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="master-search-input"
            style={{ color: t.inputText }}
          />
        </div>

        <div className="master-actions">
          <button type="button" onClick={() => navigate('/admin/employee/employee-details/add')} className="master-btn-primary">
            <MdAdd size={18} /> Add Employee
          </button>
          <button type="button" onClick={handleExportCsv} title="Export CSV" className="master-btn-icon"
            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}>
            <MdDownload size={18} />
          </button>
          <button type="button" onClick={fetchEmployees} title="Refresh" className="master-btn-icon"
            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}>
            <MdRefresh size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── All Employees panel ──────────────────────────────────────── */}
      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>

        {/* cards */}
        <div className="p-5">
          {loading ? (
            <div className="emp-empty-state">Loading employees...</div>
          ) : pageRows.length === 0 ? (
            <div className="emp-empty-state">No employees found.</div>
          ) : (
            <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4' : 'flex flex-col gap-3'}>
              {pageRows.map((emp, idx) => <EmployeeCard key={emp.id || emp.employee_code || idx} emp={emp} />)}
            </div>
          )}
        </div>

        {/* pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" style={{ borderTop: `1px solid ${t.divider}` }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 11.5, color: t.textSecondary }}>Rows per page:</span>
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 8, padding: '4px 8px', fontSize: 11.5, cursor: 'pointer', outline: 'none' }}>
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ fontSize: 11.5, color: t.textSecondary }}>
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
