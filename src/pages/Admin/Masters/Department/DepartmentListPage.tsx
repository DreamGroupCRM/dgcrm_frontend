// ==========================================
// DREAM GROUP CRM - DEPARTMENT LIST PAGE
// ==========================================
<<<<<<< HEAD
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdAdd, MdDelete, MdDownload, MdEdit, MdRefresh, MdSearch, MdVisibility,
  MdFilterList, MdGroups, MdBadge, MdCheckCircle, MdCancel, MdSwapVert, MdMoreVert,
=======
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdAdd, MdDownload, MdRefresh, MdSearch,
  MdGroups,
>>>>>>> V_14.0
} from 'react-icons/md';

import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
<<<<<<< HEAD
import { getTheme, AppTheme } from '../../../../styles/theme';
import { fetchDepartmentList, deleteDepartment } from '../../../../services/departmentService';
=======
import { getTheme } from '../../../../styles/theme';
import { FetchDepartmentList, DeleteDepartment } from '../../../../services/departmentService';
>>>>>>> V_14.0
import { Department } from '../../../../types/index';
import { formatDate, showAlert } from '../../../../utils';
import MasterIconButtons from '../../../../components/masters/MasterIconButtons';
import SortableTh from '../../../../components/masters/SortableTh';
import { useSortedRows } from '../../../../components/masters/useSortedRows';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

// Fixed width for the Action column — sized for exactly 3 icon buttons
<<<<<<< HEAD
// (32px each) + gaps + cell padding, so it never grows/shrinks with the
// number of other columns in the table. On mobile the 3 buttons collapse
// into a single 3-dot menu button, so the column shrinks to match.
const ACTION_COL_WIDTH = 148;
const ACTION_COL_WIDTH_MOBILE = 64;
const MOBILE_BREAKPOINT = 640; // Tailwind `sm`

// ── responsive helper — same matchMedia pattern used by the Sidebar ────────
const useIsMobileTable = (breakpoint: number = MOBILE_BREAKPOINT): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth < breakpoint
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    if (mql.addEventListener) mql.addEventListener('change', handler);
    else mql.addListener(handler); // Safari <14 fallback
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', handler);
      else mql.removeListener(handler);
    };
  }, [breakpoint]);
  return isMobile;
};

// ── mobile Action cell — single 3-dot button that opens a View/Edit/Delete
// menu. Positioned with `position: fixed` (computed from the button's own
// bounding rect) rather than `absolute`, so it always escapes the table's
// scroll container instead of being clipped by it.
const RowActionMenu: React.FC<{
  isDark: boolean;
  t: AppTheme;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ isDark, t, onView, onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const menuWidth = 140;
      setCoords({
        top: rect.bottom + 4,
        left: Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8),
      });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    const closeOnScroll = () => setOpen(false);
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', closeOnScroll);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', closeOnScroll);
    };
  }, [open]);

  const menuItemStyle: React.CSSProperties = {
    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
    padding: '9px 12px', fontSize: 14, background: 'transparent', border: 'none',
    cursor: 'pointer', textAlign: 'left', color: t.textPrimary, fontFamily: t.fontFamily,
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title="Actions"
        onClick={() => (open ? setOpen(false) : openMenu())}
        style={{
          width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8, background: 'none',
          border: `1.5px solid ${isDark ? '#ffffff' : '#000000'}`,
          color: isDark ? '#ffffff' : '#000000', cursor: 'pointer', flexShrink: 0,
        }}
      >
        <MdMoreVert size={18} />
      </button>
      {open && coords && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed', top: coords.top, left: coords.left, zIndex: 1000, minWidth: 140,
            background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`,
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', overflow: 'hidden',
          }}
        >
          <button type="button" onClick={() => { setOpen(false); onView(); }} style={menuItemStyle}>
            <MdVisibility size={16} /> View
          </button>
          <button type="button" onClick={() => { setOpen(false); onEdit(); }} style={menuItemStyle}>
            <MdEdit size={16} /> Edit
          </button>
          <button type="button" onClick={() => { setOpen(false); onDelete(); }} style={{ ...menuItemStyle, color: '#dc2626' }}>
            <MdDelete size={16} /> Delete
          </button>
        </div>
      )}
    </>
  );
};
=======
// + gaps + cell padding, so it never grows/shrinks with the number of
// other columns in the table.
const ACTION_COL_WIDTH = 96;
>>>>>>> V_14.0

type SortKey = 'id' | 'name' | 'total' | 'enabled' | 'disabled' | 'created_at';
type StatusFilter = 'all' | 'active' | 'inactive';

const departmentCounts = (d: Department) => {
  const total = d.total_designations ?? d.designations?.length ?? 0;
  const enabled = d.enabled_designations ?? d.designations?.filter((x) => x.is_active).length ?? 0;
  const disabled = d.disabled_designations ?? (total - enabled);
  return { total, enabled, disabled };
};

const DepartmentListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { mode } = useAppSelector((s) => s.theme);
  const isDark = mode === 'dark';
  const t = getTheme(isDark);
  const isMobile = useIsMobileTable();
  const actionColWidth = isMobile ? ACTION_COL_WIDTH_MOBILE : ACTION_COL_WIDTH;

  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [filtered, setFiltered] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);

  useEffect(() => { dispatch(setPageTitle('Department')); }, [dispatch]);

  // ── fetch ALL once — client-side search/sort/pagination ────────────────
  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await FetchDepartmentList(1, 1000);
      if (res.success) {
        setAllDepartments(res.rows ?? []);
      } else {
        toast.error('Failed to Fetch Departments');
      }
    } catch {
      toast.error('Failed to fetch departments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  // ── search (department name only) + status filter ──────────────────────
  useEffect(() => {
    const q = search.trim().toLowerCase();
    let rows = q ? allDepartments.filter((d) => d.name?.toLowerCase().includes(q)) : [...allDepartments];
    if (statusFilter !== 'all') {
      rows = rows.filter((d) => (statusFilter === 'active' ? d.is_active : !d.is_active));
    }
    setFiltered(rows);
    setPage(1);
  }, [search, statusFilter, allDepartments]);

  // Default sort: newest first (item 5) — a newly-added department appears
  // at the top of the table until the user picks a different column.
  const getSortValue = (d: Department, key: SortKey): string | number => {
    const c = departmentCounts(d);
    switch (key) {
      case 'id': return Number(d.id);
      case 'name': return d.name?.toLowerCase() || '';
      case 'total': return c.total;
      case 'enabled': return c.enabled;
      case 'disabled': return c.disabled;
      case 'created_at': return d.created_at || '';
    }
  };
  const { sorted, sortKey, sortDir, toggleSort } = useSortedRows<Department, SortKey>(filtered, getSortValue, 'created_at', 'desc');

  // ── pagination — same pattern as the rest of the Masters section ──────
  const totalFiltered = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * limit, safePage * limit);

  const pageBtns = () => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  };

  // ── actions ──────────────────────────────────────────────────────────
  const handleDelete = async (dept: Department) => {
    const result = await showAlert.confirm(
      `This will permanently delete "${dept.name}" and all of its designations.`,
      'Delete Department?'
    );
    if (!result.isConfirmed) return;
    try {
      await DeleteDepartment(dept.id);
      toast.success('Department Deleted Successfully');
      fetchDepartments();
    } catch {
      toast.error('Failed to delete department.');
    }
  };

  const handleExportCsv = () => {
    if (sorted.length === 0) {
      toast.error('No departments to export.');
      return;
    }
    const header = ['ID', 'Department Name', 'Total Designations', 'Enabled Designations', 'Disabled Designations', 'Status', 'Created On'];
    const rows = sorted.map((d) => {
      const c = departmentCounts(d);
      return [d.id, d.name, c.total, c.enabled, c.disabled, d.is_active ? 'Active' : 'Inactive', formatDate(d.created_at)];
    });
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `departments_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="master-page">

<<<<<<< HEAD
<<<<<<< HEAD
      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ width: 44, height: 44, background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff' }}
        >
          <MdGroups size={22} style={{ color: '#4f46e5' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Department Master</h1>
          <p style={{ fontSize: 14, color: t.textPrimary, margin: '2px 0 0' }}>View and manage all departments</p>
        </div>
      </div>

=======
>>>>>>> V_13.0
      {/* ── Summary cards — counts only, no percentages ─────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Departments', value: summary.totalDepartments, icon: MdGroups, color: '#7c3aed', bg: isDark ? 'rgba(124,58,237,0.12)' : '#f5f3ff' },
          { label: 'Total Designations', value: summary.totalDesignations, icon: MdBadge, color: '#16a34a', bg: isDark ? 'rgba(22,163,74,0.12)' : '#f0fdf4' },
          { label: 'Enabled Designations', value: summary.enabledDesignations, icon: MdCheckCircle, color: '#2563eb', bg: isDark ? 'rgba(37,99,235,0.12)' : '#eff6ff' },
          { label: 'Disabled Designations', value: summary.disabledDesignations, icon: MdCancel, color: '#dc2626', bg: isDark ? 'rgba(220,38,38,0.12)' : '#fef2f2' },
        ].map((card) => (
          <div
            key={card.label}
            className="flex items-center gap-3 px-4 py-4 rounded-xl"
            style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}
          >
            <div
              className="flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ width: 42, height: 42, background: card.bg }}
            >
              <card.icon size={21} style={{ color: card.color }} />
            </div>
            <div className="min-w-0">
              <div style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary, lineHeight: 1.1 }}>
                {loading ? '—' : card.value}
              </div>
              <div style={{ fontSize: 15, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                {card.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── All Departments panel ───────────────────────────────────────── */}
      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>

        {/* header row */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
<<<<<<< HEAD
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ width: 38, height: 38, background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff' }}
            >
              <MdGroups size={19} style={{ color: '#4f46e5' }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary }}>All Departments</div>
              <div style={{ fontSize: 14, color: t.textPrimary }}>Manage and view all departments and their designations</div>
            </div>
          </div>
=======
>>>>>>> V_13.0

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search — Department Name only */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
<<<<<<< HEAD
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, width: '100%', maxWidth: 240, flex: '1 1 200px' }}
=======
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, width: '100%', maxWidth: 240, minWidth: 160, flex: '1 1 200px' }}
>>>>>>> V_13.0
            >
              <MdSearch size={18} style={{ color: t.textPrimary, flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search by department name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 14, width: '100%' }}
              />
            </div>

            {/* Add Department */}
            <button
              type="button"
              onClick={() => navigate('/admin/masters/department/add')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#4338ca,#4f46e5)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <MdAdd size={18} /> Add Department
            </button>

            {/* Export */}
            <button
              type="button"
              onClick={handleExportCsv}
              title="Export CSV"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold"
              style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}
            >
              <MdDownload size={17} /> Export
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchDepartments}
              title="Refresh"
              className="flex items-center justify-center rounded-xl"
              style={{ width: 38, height: 38, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}
            >
              <MdRefresh size={18} />
            </button>


          </div>
        </div>

        {/* table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ background: t.insetBg }}>
                {[
                  { label: 'Action', key: null },
                  { label: '#', key: null },
                  { label: 'Department Name', key: 'name' as const },
                  { label: 'Total Designations', key: 'total' as const },
                  { label: 'Enabled Designations', key: 'enabled' as const },
                  { label: 'Disabled Designations', key: null },
                  { label: 'Status', key: null },
                  { label: 'Created On', key: null },
                ].map((col) => (
                  <th
                    key={col.label}
                    style={{
                      padding: '12px 16px', textAlign: 'left', fontSize: 14, fontWeight: 700,
                      textTransform: 'camelcase', letterSpacing: '0.04em', color: t.textPrimary, whiteSpace: 'nowrap',
                      ...(col.label === 'Action'
                        ? { width: actionColWidth, minWidth: actionColWidth, maxWidth: actionColWidth }
                        : {}),
                    }}
                  >
                    {col.label === 'Action'
                      ? (isMobile ? '#' : 'Action')
                      : (col.key ? <SortHeader label={col.label} sortField={col.key} /> : col.label)}
                  </th>
                ))}
=======
      {/* ── Top bar: Search (left) | Add + Export + Refresh (right) ────────
          Same layout as every other master (item 3) — previously Add
          Department/Export/Refresh sat inline with the search box instead
          of separated to the right. */}
      <div className="master-topbar">
        <div className="master-search-box" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
          <MdSearch size={18} style={{ color: t.textPrimary, flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by department name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="master-search-input"
            style={{ color: t.inputText }}
          />
        </div>

        <div className="master-actions">
          <button type="button" onClick={() => navigate('/admin/masters/department/add')} className="master-btn-primary">
            <MdAdd size={18} /> Add Department
          </button>
          <button type="button" onClick={handleExportCsv} title="Export CSV" className="master-btn-icon"
            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}>
            <MdDownload size={18} />
          </button>
          <button type="button" onClick={fetchDepartments} title="Refresh" className="master-btn-icon"
            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}>
            <MdRefresh size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── All Departments panel ───────────────────────────────────────── */}
      <div className="master-table-card" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="master-table-scroll">
          <table className="master-table" style={{ minWidth: 760 }}>
            <thead>
              <tr style={{ background: t.insetBg }}>
                <th className="master-table-actions-th" style={{
                  width: ACTION_COL_WIDTH, minWidth: ACTION_COL_WIDTH, maxWidth: ACTION_COL_WIDTH,
                  background: t.insetBg, borderRight: `2px solid ${t.divider}`, boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
                }}>Action</th>
                <SortableTh label="ID" active={sortKey === 'id'} dir={sortDir} onClick={() => toggleSort('id')} />
                <SortableTh label="Department Name" active={sortKey === 'name'} dir={sortDir} onClick={() => toggleSort('name')} />
                <SortableTh label="Total Designations" active={sortKey === 'total'} dir={sortDir} onClick={() => toggleSort('total')} />
                <SortableTh label="Enabled Designations" active={sortKey === 'enabled'} dir={sortDir} onClick={() => toggleSort('enabled')} />
                <SortableTh label="Disabled Designations" active={sortKey === 'disabled'} dir={sortDir} onClick={() => toggleSort('disabled')} />
                <SortableTh label="Created On" active={sortKey === 'created_at'} dir={sortDir} onClick={() => toggleSort('created_at')} />
>>>>>>> V_14.0
              </tr>
            </thead>
            <tbody>
              {loading ? (
<<<<<<< HEAD
<<<<<<< HEAD
                <tr><td colSpan={8} style={{ padding: 28, textAlign: 'center', color: t.textPrimary }}>Loading departments...</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 28, textAlign: 'center', color: t.textPrimary }}>No departments found.</td></tr>
=======
                <tr><td colSpan={8} style={{ padding: 28, textAlign: 'center' }}>Loading departments...</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 28, textAlign: 'center' }}>No departments found.</td></tr>
>>>>>>> V_14.0
=======
                <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center' }}>Loading departments...</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center' }}>No departments found.</td></tr>
>>>>>>> V_14.0
              ) : (
                pageRows.map((d) => {
                  const c = departmentCounts(d);
                  return (
                    <tr key={d.id} style={{ borderTop: `1px solid ${t.divider}` }}>
<<<<<<< HEAD
<<<<<<< HEAD
                      <td style={{ padding: '12px 16px', width: actionColWidth, minWidth: actionColWidth, maxWidth: actionColWidth }}>
                        {isMobile ? (
                          <div className="flex items-center">
                            <RowActionMenu
                              isDark={isDark}
                              t={t}
                              onView={() => navigate(`/admin/masters/department/view/${d.id}`)}
                              onEdit={() => navigate(`/admin/masters/department/edit/${d.id}`)}
                              onDelete={() => handleDelete(d)}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              title="View"
                              onClick={() => navigate(`/admin/masters/department/view/${d.id}`)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8,
                                background: isDark ? 'rgba(37,99,235,0.12)' : '#eff6ff',
                                border: `1.5px solid ${isDark ? '#ffffff' : '#000000'}`,
                                color: '#2563eb', cursor: 'pointer',
                              }}
                            >
                              <MdVisibility size={17} />
                            </button>
                            <button
                              type="button"
                              title="Edit"
                              onClick={() => navigate(`/admin/masters/department/edit/${d.id}`)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8,
                                background: isDark ? 'rgba(124,58,237,0.12)' : '#f5f3ff',
                                border: `1.5px solid ${isDark ? '#ffffff' : '#000000'}`,
                                color: '#7c3aed', cursor: 'pointer',
                              }}
                            >
                              <MdEdit size={17} />
                            </button>
                            <button
                              type="button"
                              title="Delete"
                              onClick={() => handleDelete(d)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8,
                                background: isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2',
                                border: `1.5px solid ${isDark ? '#ffffff' : '#000000'}`,
                                color: '#dc2626', cursor: 'pointer',
                              }}
                            >
                              <MdDelete size={17} />
                            </button>
                          </div>
                        )}
=======
                      <td style={{ padding: '12px 16px', width: ACTION_COL_WIDTH, minWidth: ACTION_COL_WIDTH, maxWidth: ACTION_COL_WIDTH }}>
=======
                      <td className="master-table-actions-td" style={{
                        width: ACTION_COL_WIDTH, minWidth: ACTION_COL_WIDTH, maxWidth: ACTION_COL_WIDTH,
                        background: t.surfaceBg,
                        borderRight: `2px solid ${t.divider}`, boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
                      }}>
                        <MasterIconButtons
                          onView={() => navigate(`/admin/masters/department/view/${d.id}`)}
                          onEdit={() => navigate(`/admin/masters/department/edit/${d.id}`)}
                          onDelete={() => handleDelete(d)}
                        />
                      </td>
                      <td>{d.id}</td>
                      <td>
>>>>>>> V_14.0
                        <div className="flex items-center gap-2">
                          <MdGroups size={16} className="master-row-icon" />
                          <span style={{ fontWeight: 700 }}>{d.name}</span>
                        </div>
>>>>>>> V_13.0
                      </td>
<<<<<<< HEAD
                      <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary }}>
                        {(safePage - 1) * limit + idx + 1}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/masters/department/view/${d.id}`)}
                          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: '#4f46e5', fontWeight: 700, fontSize: 14, fontFamily: t.fontFamily }}
                        >
                          {d.name}
                        </button>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary }}>{c.total}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: '#16a34a', fontWeight: 600 }}>{c.enabled}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: c.disabled > 0 ? '#dc2626' : t.textPrimary, fontWeight: c.disabled > 0 ? 600 : 400 }}>{c.disabled}</td>
                      <td style={{ padding: '12px 16px' }}>
=======
                      <td>{c.total}</td>
                      <td style={{ color: '#16a34a', fontWeight: 600 }}>{c.enabled}</td>
                      <td style={{ color: c.disabled > 0 ? '#dc2626' : undefined, fontWeight: c.disabled > 0 ? 600 : undefined }}>{c.disabled}</td>
<<<<<<< HEAD
                      <td>
>>>>>>> V_14.0
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ background: d.is_active ? '#dcfce7' : '#f1f5f9', color: d.is_active ? '#16a34a' : '#64748b' }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {d.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
<<<<<<< HEAD
                      <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                        {formatDate(d.created_at)}
                      </td>
=======
=======
>>>>>>> V_14.0
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(d.created_at)}</td>
>>>>>>> V_14.0
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* pagination */}
<<<<<<< HEAD
        <div className="flex flex-wrap items-center justify-between gap-3 p-4" style={{ borderTop: `1px solid ${t.divider}` }}>
          <div className="flex items-center gap-2" style={{ fontSize: 14, color: t.textPrimary }}>
=======
        <div className="master-pagination" style={{ borderTop: `1px solid ${t.divider}` }}>
<<<<<<< HEAD
          <div className="flex items-center gap-2" style={{ fontSize: 13, color: t.textSecondary }}>
>>>>>>> V_14.0
=======
          <div className="flex items-center gap-2" style={{ fontSize: 11.5, color: t.textSecondary }}>
>>>>>>> V_16.0
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
<<<<<<< HEAD
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, padding: '4px 8px', color: t.inputText, fontSize: 14 }}
=======
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, padding: '4px 8px', color: t.inputText, fontSize: 11.5 }}
>>>>>>> V_16.0
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

<<<<<<< HEAD
          <div style={{ fontSize: 14, color: t.textPrimary }}>
=======
          <div style={{ fontSize: 11.5, color: t.textSecondary }}>
>>>>>>> V_16.0
            Showing {totalFiltered === 0 ? 0 : (safePage - 1) * limit + 1}–{Math.min(safePage * limit, totalFiltered)} of {totalFiltered}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: safePage <= 1 ? 'not-allowed' : 'pointer', opacity: safePage <= 1 ? 0.5 : 1 }}
            >
              Prev
            </button>
            {pageBtns().map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{
                  background: n === safePage ? '#4338ca' : t.insetBg,
                  color: n === safePage ? '#fff' : t.textPrimary,
                  border: `1px solid ${n === safePage ? '#4338ca' : t.surfaceBorder}`, cursor: 'pointer',
                }}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages ? 0.5 : 1 }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentListPage;
