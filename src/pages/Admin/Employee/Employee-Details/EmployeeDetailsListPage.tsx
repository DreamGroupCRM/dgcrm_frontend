// ==========================================
// DREAM GROUP CRM - EMPLOYEE LIST PAGE
// ==========================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdAdd, MdDelete, MdDownload, MdEdit, MdRefresh, MdSearch, MdVisibility,
  MdFilterList, MdGroups, MdLayers, MdPersonOff, MdMoreVert,
  MdGridView, MdViewList, MdEmail, MdPhone, MdLocationOn, MdChevronLeft, MdChevronRight,
  MdToggleOn, MdToggleOff,
} from 'react-icons/md';

import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
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
  const { isDark, t, accent, cssVars: appearanceCssVars } = useAppearanceTokens();
  const accentFocus = (appearanceCssVars as Record<string, string>)['--master-accent-focus'];

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

  // ── row action dropdown — shared between Grid cards and List rows so the
  // "same View/Edit/Delete as Grid View" requirement (item 6) is trivially
  // true: both views render this exact same block. ──────────────────────
  // `align="left"` is for the List view's Action column, which is the
  // table's leftmost/sticky column — a right-anchored menu there would
  // grow off the left edge of the table (nothing to its left to grow
  // into) and get clipped by the panel/scroll container instead.
  const renderActionMenu = (emp: Employee, align: 'left' | 'right' = 'right') => (
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
          className="emp-row-menu"
          style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, ...(align === 'left' ? { left: 0, right: 'auto' } : {}) }}
        >
          <button type="button" title="View" onClick={() => { setOpenMenuId(null); navigate(`/admin/employee/employee-details/view/${emp.id}`); }}
            className="emp-row-menu-btn" style={{ borderBottom: `1px solid ${t.divider}` }}>
            <MdVisibility size={14} color="#2563eb" /> View
          </button>
          <button type="button" title="Edit" onClick={() => { setOpenMenuId(null); navigate(`/admin/employee/employee-details/edit/${emp.id}`); }}
            className="emp-row-menu-btn" style={{ borderBottom: `1px solid ${t.divider}` }}>
            <MdEdit size={13} color="#7c3aed" /> Edit
          </button>
          <button type="button" title="Delete" onClick={() => handleDelete(emp)}
            className="emp-row-menu-btn emp-menu-btn-danger" style={{ borderBottom: `1px solid ${t.divider}` }}>
            <MdDelete size={14} /> Delete
          </button>
          <button type="button" title={emp.is_active ? 'Deactivate' : 'Activate'} onClick={() => handleToggleActive(emp)}
            className="emp-row-menu-btn">
            {emp.is_active
              ? <><MdToggleOff size={14} color="#ea580c" /> Deactivate</>
              : <><MdToggleOn size={14} color="#16a34a" /> Activate</>}
          </button>
        </div>
      )}
    </div>
  );

  // ── card ─────────────────────────────────────────────────────────────
  const EmployeeCard: React.FC<{ emp: Employee }> = ({ emp }) => {
    const status = STATUS_STYLES[emp.status] || STATUS_STYLES.active;
    // Deactivated (is_active=false, but not deleted — a deleted employee
    // never reaches this list at all) — whole card reads as "grayed out"
    // rather than disappearing, so it stays visible and its row menu
    // (including Activate, to undo this) stays reachable.
    const isInactive = !emp.is_active;
    return (
      <div
        className="rounded-2xl p-4"
        style={{
          background: isInactive ? (isDark ? '#1a1a1e' : '#f1f5f9') : t.surfaceBg,
          border: `1px solid ${t.surfaceBorder}`,
          opacity: isInactive ? 0.6 : 1,
          filter: isInactive ? 'grayscale(55%)' : 'none',
          transition: 'opacity 0.15s, filter 0.15s, background 0.15s',
        }}
      >
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
                  style={{ width: 48, height: 48, background: `linear-gradient(135deg,${accent},${accentFocus})`, fontSize: 13 }}
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
            {renderActionMenu(emp)}
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Employees', value: summary.total, icon: MdGroups, color: '#7c3aed', bg: isDark ? 'rgba(124,58,237,0.12)' : '#f5f3ff' },
          { label: 'Active Employees', value: summary.active, icon: MdLayers, color: '#16a34a', bg: isDark ? 'rgba(22,163,74,0.12)' : '#f0fdf4' },
          { label: 'Inactive Employees', value: summary.inactive, icon: MdPersonOff, color: '#ea580c', bg: isDark ? 'rgba(234,88,12,0.12)' : '#fff7ed' },
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
        <div className="master-search-box master-search-box-accent" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
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
          <button type="button" onClick={() => setView((v) => (v === 'grid' ? 'list' : 'grid'))}
            title={view === 'grid' ? 'Switch to List View' : 'Switch to Grid View'} className="master-btn-icon"
            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}>
            {view === 'grid' ? <MdViewList size={18} /> : <MdGridView size={18} />}
          </button>
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

        {view === 'grid' ? (
          <div className="p-5">
            {loading ? (
              <div className="emp-empty-state">Loading employees...</div>
            ) : pageRows.length === 0 ? (
              <div className="emp-empty-state">No employees found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {pageRows.map((emp, idx) => <EmployeeCard key={emp.id || emp.employee_code || idx} emp={emp} />)}
              </div>
            )}
          </div>
        ) : (
          <div className="master-table-scroll">
            <table className="master-table" style={{ minWidth: 980 }}>
              <thead>
                <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                  <th className="master-table-actions-th master-table-header-gradient" style={{
                    width: 64, minWidth: 64, maxWidth: 64,
                    borderBottom: `1px solid ${t.divider}`, zIndex: 2, background: t.tableHeaderBg,
                    borderRight: `2px solid ${t.divider}`, boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
                  }}>Action</th>
                  {['Employee Code', 'Employee Name', 'D.O.B', 'Email ID', 'Mobile No', 'Joining Date', 'Designation', 'Status'].map((h) => (
                    <th key={h} style={{ borderBottom: `1px solid ${t.divider}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48 }}>Loading employees...</td></tr>
                ) : pageRows.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48 }}>No employees found.</td></tr>
                ) : (
                  pageRows.map((emp, idx) => {
                    const status = STATUS_STYLES[emp.status] || STATUS_STYLES.active;
                    const isInactive = !emp.is_active;
                    const rowBg = idx % 2 === 0 ? t.surfaceBg : t.tableHeaderBg;
                    return (
                      <tr key={emp.id || emp.employee_code || idx}
                        style={{
                          background: isInactive ? (isDark ? '#1a1a1e' : '#f1f5f9') : rowBg,
                          borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#d1d5db'}`,
                          opacity: isInactive ? 0.6 : 1,
                          transition: 'background 0.15s',
                        }}>
                        <td className="master-table-actions-td" style={{
                          width: 64, minWidth: 64, maxWidth: 64,
                          zIndex: openMenuId === emp.id ? 30 : 1, background: isInactive ? 'transparent' : (isDark ? t.surfaceBg : '#ffffff'),
                          borderRight: `2px solid ${t.divider}`, boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
                        }}>
                          <div className="flex items-center justify-center">{renderActionMenu(emp, 'left')}</div>
                        </td>
                        <td>
                          <button type="button" onClick={() => navigate(`/admin/employee/employee-details/view/${emp.id}`)}
                            style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: '#0284c7', fontWeight: 600 }}>
                            {emp.employee_code}
                          </button>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            {emp.profile_photo_url ? (
                              <img src={emp.profile_photo_url} alt="" className="rounded-full" style={{ width: 30, height: 30, objectFit: 'cover', flexShrink: 0 }} />
                            ) : (
                              <div className="flex items-center justify-center rounded-full text-white font-bold"
                                style={{ width: 30, height: 30, background: 'linear-gradient(135deg,#0284c7,#7c3aed)', fontSize: 11, flexShrink: 0 }}>
                                {initials(emp.first_name, emp.last_name)}
                              </div>
                            )}
                            <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{emp.first_name} {emp.last_name}</span>
                          </div>
                        </td>
                        <td>{formatDate(emp.date_of_birth) || '—'}</td>
                        <td>{emp.email || '—'}</td>
                        <td>{emp.mobile_country_code} {emp.mobile_number}</td>
                        <td>{formatDate(emp.joining_date) || '—'}</td>
                        <td>{(emp.designation_names || []).join(', ') || '—'}</td>
                        <td>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: status.bg, color: status.color, fontSize: 10.5, whiteSpace: 'nowrap' }}>
                            <span className="w-1 h-1 rounded-full bg-current" /> {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

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
                style={{ background: n === safePage ? accent : t.insetBg, color: n === safePage ? '#fff' : t.textPrimary, border: `1px solid ${n === safePage ? accent : t.surfaceBorder}`, cursor: 'pointer' }}>
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
