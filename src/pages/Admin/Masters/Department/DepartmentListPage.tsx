// ==========================================
// DREAM GROUP CRM - DEPARTMENT LIST PAGE
// ==========================================
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdAdd, MdDownload, MdRefresh, MdSearch,
  MdGroups,
} from 'react-icons/md';

import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import { FetchDepartmentList, DeleteDepartment, GetDepartmentAssignedEmployees } from '../../../../services/departmentService';
import { Department } from '../../../../types/index';
import { formatDate, showAlert } from '../../../../utils';
import MasterIconButtons from '../../../../components/masters/MasterIconButtons';
import SortableTh from '../../../../components/masters/SortableTh';
import { useSortedRows } from '../../../../components/masters/useSortedRows';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

// Fixed width for the Action column — sized for exactly 3 icon buttons
// + gaps + cell padding, so it never grows/shrinks with the number of
// other columns in the table.
const ACTION_COL_WIDTH = 96;

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
  const { isDark, t, accent } = useAppearanceTokens();

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
    let assigned: { name: string; employee_code: string | null }[] = [];
    try {
      assigned = await GetDepartmentAssignedEmployees(dept.id);
    } catch {
      // lookup failure shouldn't block the delete flow — fall through with an empty list
    }

    const result = assigned.length > 0
      ? await showAlert.confirmWithList(
          `"${dept.name}" has ${assigned.length} active employee${assigned.length === 1 ? '' : 's'} assigned to it. Deleting it will not unassign them automatically.`,
          'Department Has Assigned Employees',
          assigned.map((e) => (e.employee_code ? `${e.name} (${e.employee_code})` : e.name))
        )
      : await showAlert.confirm(
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

      {/* ── Top bar: Search (left) | Add + Export + Refresh (right) ────────
          Same layout as every other master (item 3) — previously Add
          Department/Export/Refresh sat inline with the search box instead
          of separated to the right. */}
      <div className="master-topbar">
        <div className="master-search-box master-search-box-accent" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
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
              <tr className="master-table-header-gradient" style={{ background: t.insetBg }}>
                <th className="master-table-actions-th master-table-header-gradient" style={{
                  width: ACTION_COL_WIDTH, minWidth: ACTION_COL_WIDTH, maxWidth: ACTION_COL_WIDTH,
                  background: t.insetBg, borderRight: `2px solid ${t.divider}`, boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
                }}>Action</th>
                <SortableTh label="ID" active={sortKey === 'id'} dir={sortDir} onClick={() => toggleSort('id')} />
                <SortableTh label="Department Name" active={sortKey === 'name'} dir={sortDir} onClick={() => toggleSort('name')} />
                <SortableTh label="Total Designations" active={sortKey === 'total'} dir={sortDir} onClick={() => toggleSort('total')} />
                <SortableTh label="Enabled Designations" active={sortKey === 'enabled'} dir={sortDir} onClick={() => toggleSort('enabled')} />
                <SortableTh label="Disabled Designations" active={sortKey === 'disabled'} dir={sortDir} onClick={() => toggleSort('disabled')} />
                <SortableTh label="Created On" active={sortKey === 'created_at'} dir={sortDir} onClick={() => toggleSort('created_at')} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center' }}>Loading departments...</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center' }}>No departments found.</td></tr>
              ) : (
                pageRows.map((d) => {
                  const c = departmentCounts(d);
                  return (
                    <tr key={d.id} style={{ borderTop: `1px solid ${t.divider}` }}>
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
                        <div className="flex items-center gap-2">
                          <MdGroups size={16} className="master-row-icon" />
                          <span style={{ fontWeight: 700 }}>{d.name}</span>
                        </div>
                      </td>
                      <td>{c.total}</td>
                      <td style={{ color: '#16a34a', fontWeight: 600 }}>{c.enabled}</td>
                      <td style={{ color: c.disabled > 0 ? '#dc2626' : undefined, fontWeight: c.disabled > 0 ? 600 : undefined }}>{c.disabled}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(d.created_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="master-pagination" style={{ borderTop: `1px solid ${t.divider}` }}>
          <div className="flex items-center gap-2" style={{ fontSize: 11.5, color: t.textSecondary }}>
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, padding: '4px 8px', color: t.inputText, fontSize: 11.5 }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div style={{ fontSize: 11.5, color: t.textSecondary }}>
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
                  background: n === safePage ? accent : t.insetBg,
                  color: n === safePage ? '#fff' : t.textPrimary,
                  border: `1px solid ${n === safePage ? accent : t.surfaceBorder}`, cursor: 'pointer',
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
