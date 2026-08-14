// ==========================================
// DREAM GROUP CRM - DEPARTMENT LIST PAGE
// ==========================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdAdd, MdDelete, MdDownload, MdEdit, MdRefresh, MdSearch, MdVisibility,
  MdFilterList, MdGroups, MdBadge, MdCheckCircle, MdCancel, MdSwapVert,
} from 'react-icons/md';

import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme } from '../../../../styles/theme';
import { fetchDepartmentList, deleteDepartment } from '../../../../services/dapartmentService';
import { Department } from '../../../../types/index';
import { formatDate, showAlert } from '../../../../utils';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

type SortKey = 'name' | 'total' | 'enabled' | null;
type SortDir = 'asc' | 'desc';
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

  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [filtered, setFiltered] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);

  useEffect(() => { dispatch(setPageTitle('Department')); }, [dispatch]);

  // ── fetch ALL once — client-side search/sort/pagination ────────────────
  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchDepartmentList(1, 1000);
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

  // ── summary cards — counts only, no percentages ─────────────────────────
  const summary = useMemo(() => {
    let totalDesignations = 0, enabledDesignations = 0, disabledDesignations = 0;
    allDepartments.forEach((d) => {
      const c = departmentCounts(d);
      totalDesignations += c.total;
      enabledDesignations += c.enabled;
      disabledDesignations += c.disabled;
    });
    return {
      totalDepartments: allDepartments.length,
      totalDesignations,
      enabledDesignations,
      disabledDesignations,
    };
  }, [allDepartments]);

  // ── search (department name only) + status filter + sort ──────────────
  useEffect(() => {
    const q = search.trim().toLowerCase();
    let rows = q ? allDepartments.filter((d) => d.name?.toLowerCase().includes(q)) : [...allDepartments];

    if (statusFilter !== 'all') {
      rows = rows.filter((d) => (statusFilter === 'active' ? d.is_active : !d.is_active));
    }

    if (sortKey) {
      rows.sort((a, b) => {
        let av: number | string, bv: number | string;
        if (sortKey === 'name') { av = a.name?.toLowerCase() || ''; bv = b.name?.toLowerCase() || ''; }
        else if (sortKey === 'total') { av = departmentCounts(a).total; bv = departmentCounts(b).total; }
        else { av = departmentCounts(a).enabled; bv = departmentCounts(b).enabled; }
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFiltered(rows);
    setPage(1);
  }, [search, statusFilter, sortKey, sortDir, allDepartments]);

  const toggleSort = (key: Exclude<SortKey, null>) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  // ── pagination — same pattern as the rest of the Masters section ──────
  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * limit, safePage * limit);

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
      await deleteDepartment(dept.id);
      toast.success('Department Deleted Successfully');
      fetchDepartments();
    } catch {
      toast.error('Failed to delete department.');
    }
  };

  const handleExportCsv = () => {
    if (filtered.length === 0) {
      toast.error('No departments to export.');
      return;
    }
    const header = ['#', 'Department Name', 'Total Designations', 'Enabled Designations', 'Disabled Designations', 'Status', 'Created On'];
    const rows = filtered.map((d, i) => {
      const c = departmentCounts(d);
      return [i + 1, d.name, c.total, c.enabled, c.disabled, d.is_active ? 'Active' : 'Inactive', formatDate(d.created_at)];
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

  const SortHeader: React.FC<{ label: string; sortField: Exclude<SortKey, null> }> = ({ label, sortField }) => (
    <button
      type="button"
      onClick={() => toggleSort(sortField)}
      className="flex items-center gap-1"
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', font: 'inherit' }}
    >
      {label}
      <MdSwapVert size={14} style={{ opacity: sortKey === sortField ? 1 : 0.4 }} />
    </button>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: t.fontFamily }}>

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
          <p style={{ fontSize: 13, color: t.textSecondary, margin: '2px 0 0' }}>View and manage all departments</p>
        </div>
      </div>

      {/* ── Summary cards — counts only, no percentages ─────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Departments',   value: summary.totalDepartments,   icon: MdGroups,      color: '#7c3aed', bg: isDark ? 'rgba(124,58,237,0.12)' : '#f5f3ff' },
          { label: 'Total Designations',  value: summary.totalDesignations,  icon: MdBadge,       color: '#16a34a', bg: isDark ? 'rgba(22,163,74,0.12)'  : '#f0fdf4' },
          { label: 'Enabled Designations',value: summary.enabledDesignations,icon: MdCheckCircle, color: '#2563eb', bg: isDark ? 'rgba(37,99,235,0.12)'  : '#eff6ff' },
          { label: 'Disabled Designations',value: summary.disabledDesignations,icon: MdCancel,    color: '#dc2626', bg: isDark ? 'rgba(220,38,38,0.12)'  : '#fef2f2' },
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
              <div style={{ fontSize: 12, color: t.textSecondary, whiteSpace: 'nowrap' }}>
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
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ width: 38, height: 38, background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff' }}
            >
              <MdGroups size={19} style={{ color: '#4f46e5' }} />
            </div>
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 700, color: t.textPrimary }}>All Departments</div>
              <div style={{ fontSize: 12.5, color: t.textSecondary }}>Manage and view all departments and their designations</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search — Department Name only */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, width: 240 }}
            >
              <MdSearch size={18} style={{ color: t.textPrimary, flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search by department name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 13.5, width: '100%' }}
              />
            </div>

            {/* Filter — Status */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold"
                style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}
              >
                <MdFilterList size={17} /> Filter
              </button>
              {filterOpen && (
                <div
                  style={{
                    position: 'absolute', top: '110%', right: 0, zIndex: 20, minWidth: 180,
                    background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 12,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '8px 0',
                  }}
                >
                  {([
                    { key: 'all', label: 'All Status' },
                    { key: 'active', label: 'Active' },
                    { key: 'inactive', label: 'Inactive' },
                  ] as { key: StatusFilter; label: string }[]).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => { setStatusFilter(opt.key); setFilterOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm"
                      style={{
                        background: statusFilter === opt.key ? (isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff') : 'transparent',
                        color: t.textPrimary, border: 'none', cursor: 'pointer', fontFamily: t.fontFamily,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

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

            {/* Add Department */}
            <button
              type="button"
              onClick={() => navigate('/admin/masters/department/add')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#4338ca,#4f46e5)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <MdAdd size={18} /> Add Department
            </button>
          </div>
        </div>

        {/* table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ background: t.insetBg }}>
                {[
                  { label: '#', key: null },
                  { label: 'Department Name', key: 'name' as const },
                  { label: 'Total Designations', key: 'total' as const },
                  { label: 'Enabled Designations', key: 'enabled' as const },
                  { label: 'Disabled Designations', key: null },
                  { label: 'Status', key: null },
                  { label: 'Created On', key: null },
                  { label: 'Action', key: null },
                ].map((col) => (
                  <th
                    key={col.label}
                    style={{
                      padding: '12px 16px', textAlign: col.label === 'Action' ? 'right' : 'left', fontSize: 12, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.04em', color: t.textSecondary, whiteSpace: 'nowrap',
                    }}
                  >
                    {col.key ? <SortHeader label={col.label} sortField={col.key} /> : col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading departments...</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 28, textAlign: 'center', color: t.textSecondary }}>No departments found.</td></tr>
              ) : (
                pageRows.map((d, idx) => {
                  const c = departmentCounts(d);
                  return (
                    <tr key={d.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                      <td style={{ padding: '12px 16px', fontSize: 13.5, color: t.textSecondary }}>
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
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ background: d.is_active ? '#dcfce7' : '#f1f5f9', color: d.is_active ? '#16a34a' : '#64748b' }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {d.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>
                        {formatDate(d.created_at)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            title="View"
                            onClick={() => navigate(`/admin/masters/department/view/${d.id}`)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8,
                              background: isDark ? 'rgba(37,99,235,0.12)' : '#eff6ff', border: 'none', color: '#2563eb', cursor: 'pointer',
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
                              background: isDark ? 'rgba(124,58,237,0.12)' : '#f5f3ff', border: 'none', color: '#7c3aed', cursor: 'pointer',
                            }}
                          >
                            <MdEdit size={16} />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => handleDelete(d)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8,
                              background: isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2', border: 'none', color: '#dc2626', cursor: 'pointer',
                            }}
                          >
                            <MdDelete size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4" style={{ borderTop: `1px solid ${t.divider}` }}>
          <div className="flex items-center gap-2" style={{ fontSize: 13, color: t.textSecondary }}>
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, padding: '4px 8px', color: t.inputText, fontSize: 13 }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div style={{ fontSize: 13, color: t.textSecondary }}>
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
