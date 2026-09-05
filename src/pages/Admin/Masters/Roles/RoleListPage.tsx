// src/pages/masters/RoleListPage.tsx

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MdAdd, MdDownload, MdRefresh, MdSearch, MdSecurity } from 'react-icons/md';
import { useAppDispatch } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import { StatusBadge } from '../../../../components/common/MasterListUI';
import { fetchRoleList, deleteRole } from '../../../../services/roleService';
import { Role } from '../../../../types/index';
import { formatDate, showAlert } from '../../../../utils';
import MasterIconButtons from '../../../../components/masters/MasterIconButtons';
import SortableTh from '../../../../components/masters/SortableTh';
import { useSortedRows } from '../../../../components/masters/useSortedRows';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

// Fixed width for the Actions column — sized for exactly 3 icon buttons
// + gaps + cell padding, so it never grows/shrinks with the number of
// other columns in the table (matches Company/Department/Building/Bank).
const ACTION_COL_WIDTH = 96;

type SortKey = 'id' | 'name' | 'created_at' | 'updated_at';

const RoleListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isDark, t, cssVars } = useAppearanceTokens();

  const [allRoles, setAllRoles]     = useState<Role[]>([]);
  const [filtered, setFiltered]     = useState<Role[]>([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(false);
  const [page, setPage]             = useState(1);
  const [limit, setLimit]           = useState(5);

  useEffect(() => { dispatch(setPageTitle('Roles')); }, [dispatch]);

  // ── fetch ALL once — client-side search, no API call on keypress ────────
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchRoleList(1, 1000);
      if (res.success) {
        setAllRoles(res.rows ?? []);
      } else {
        toast.error('Failed to Fetch Roles');
      }
    } catch {
      toast.error('Failed to fetch roles. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  // ── instant client-side filter on every keypress — zero API calls ───────
  useEffect(() => {
    const q = search.trim().toLowerCase();
    setFiltered(q ? allRoles.filter((r) => r.name.toLowerCase().includes(q)) : allRoles);
    setPage(1);
  }, [search, allRoles]);

  // Default sort: newest first — a newly-added role appears at the top of
  // the table until the user picks a different column (same convention as
  // Company/Department/Building/Bank Account).
  const getSortValue = useCallback((r: Role, key: SortKey): string | number => {
    switch (key) {
      case 'id': return Number(r.id);
      case 'name': return r.name?.toLowerCase() || '';
      case 'created_at': return r.created_at || '';
      case 'updated_at': return r.updated_at || '';
    }
  }, []);
  const { sorted, sortKey, sortDir, toggleSort } = useSortedRows<Role, SortKey>(filtered, getSortValue, 'created_at', 'desc');

  // ── delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (role: Role) => {
    const result = await showAlert.confirm(
      `Are you sure you want to delete "${role.name}"?`,
      'Delete Role?'
    );
    if (!result.isConfirmed) return;
    try {
      const res = await deleteRole(role.id);
      if (res.success) {
        toast.success('Role Deleted Successfully', { autoClose: 1000 });
        fetchRoles();
      } else {
        toast.error(res.message || 'Failed to Delete');
      }
    } catch {
      toast.error('Failed to delete role. Please try again.');
    }
  };

  // ── export CSV ───────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (sorted.length === 0) { toast.info('No data to Export'); return; }
    const headers = ['ID', 'Role Name', 'Status', 'Created At', 'Updated At'];
    const rows    = sorted.map((r) => [
      r.id,
      `"${r.name}"`,
      r.is_active ? 'Active' : 'Inactive',
      formatDate(r.created_at),
      formatDate(r.updated_at),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a   = Object.assign(document.createElement('a'), { href: url, download: 'roles.csv' });
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Role List CSV Exported Successfully', { autoClose: 1000 });
  };

  // ── pagination (client-side) ─────────────────────────────────────────────
  const totalFiltered = sorted.length;
  const totalPages    = Math.max(1, Math.ceil(totalFiltered / limit));
  const safePage      = Math.min(page, totalPages);
  const startIdx      = (safePage - 1) * limit;
  const pageRows      = sorted.slice(startIdx, startIdx + limit);
  const showingFrom   = totalFiltered === 0 ? 0 : startIdx + 1;
  const showingTo     = Math.min(startIdx + limit, totalFiltered);

  const pageBtns = () => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  };

  const statusBadge = (isActive: boolean) => (
    <StatusBadge isActive={isActive} t={t} isDark={isDark} fontSize={12.5} />
  );

  return (
    <div className="master-page" style={cssVars}>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="master-topbar">
        <div className="master-search-box master-search-box-accent" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
          <MdSearch size={18} style={{ color: t.textPrimary, flexShrink: 0 }} />
          <input type="text" placeholder="Search by Role Name..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="master-search-input" style={{ color: t.inputText }} />
        </div>

        <div className="master-actions">
          <button onClick={() => navigate('/admin/masters/roles/add')} className="master-btn-primary">
            <MdAdd size={18} /> Add Role
          </button>
          <button onClick={exportCSV} title="Export CSV" className="master-btn-icon"
            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}>
            <MdDownload size={18} />
          </button>
          <button onClick={fetchRoles} title="Refresh" className="master-btn-icon"
            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}>
            <MdRefresh size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Table card ───────────────────────────────────────────────────── */}
      <div className="master-table-card" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="master-table-scroll">
          <table className="master-table" style={{ minWidth: 650 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                <th className="master-table-actions-th master-table-header-gradient" style={{
                  width: ACTION_COL_WIDTH, minWidth: ACTION_COL_WIDTH, maxWidth: ACTION_COL_WIDTH,
                  borderBottom: `1px solid ${t.divider}`, zIndex: 2, background: t.tableHeaderBg,
                  borderRight: `2px solid ${t.divider}`, boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
                }}>Actions</th>
                <SortableTh label="ID" active={sortKey === 'id'} dir={sortDir} onClick={() => toggleSort('id')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <SortableTh label="Role Name" active={sortKey === 'name'} dir={sortDir} onClick={() => toggleSort('name')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <th style={{ borderBottom: `1px solid ${t.divider}` }}>Status</th>
                <SortableTh label="Created At" active={sortKey === 'created_at'} dir={sortDir} onClick={() => toggleSort('created_at')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <SortableTh label="Updated At" active={sortKey === 'updated_at'} dir={sortDir} onClick={() => toggleSort('updated_at')} style={{ borderBottom: `1px solid ${t.divider}` }} />
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48 }}>Loading...</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48 }}>
                  {search ? 'No roles match your search.' : 'No roles found.'}
                </td></tr>
              ) : (
                pageRows.map((role, idx) => {
                  const rowBg = idx % 2 === 0 ? t.surfaceBg : t.tableHeaderBg;
                  return (
                    <tr key={role.id}
                      style={{ background: rowBg, borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#d1d5db'}`, transition: 'background 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = t.tableRowHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}>
                      <td className="master-table-actions-td" style={{
                        width: ACTION_COL_WIDTH, minWidth: ACTION_COL_WIDTH, maxWidth: ACTION_COL_WIDTH,
                        zIndex: 1, background: isDark ? t.surfaceBg : '#ffffff',
                        borderRight: `2px solid ${t.divider}`, boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
                      }}>
                        <MasterIconButtons
                          onView={() => navigate(`/admin/masters/roles/view/${role.id}`)}
                          onEdit={() => navigate(`/admin/masters/roles/edit/${role.id}`)}
                          onDelete={() => handleDelete(role)}
                        />
                      </td>
                      <td>{role.id}</td>
                      <td style={{ fontWeight: 500 }}>
                        <div className="flex items-center gap-2">
                          <MdSecurity size={16} className="master-row-icon" />
                          {role.name}
                        </div>
                      </td>
                      <td>{statusBadge(role.is_active)}</td>
                      <td>{formatDate(role.created_at)}</td>
                      <td>{formatDate(role.updated_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="master-pagination" style={{ borderTop: `1px solid ${t.divider}` }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 11.5, color: t.textPrimary }}>Rows per page:</span>
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 8, padding: '4px 8px', fontSize: 11.5, cursor: 'pointer', outline: 'none' }}>
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <span style={{ fontSize: 11.5, color: t.textPrimary }}>
            Showing {showingFrom}–{showingTo} of {totalFiltered}
          </span>

          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className="master-page-btn"
              style={{ padding: '4px 10px', width: 'auto', border: `1px solid ${t.surfaceBorder}`, background: t.btnSecondaryBg, color: t.textPrimary, cursor: safePage === 1 ? 'not-allowed' : 'pointer' }}>Prev</button>
            {pageBtns().map((pg) => (
              <button key={pg} onClick={() => setPage(pg)} className="master-page-btn"
                style={{ border: `1px solid ${pg === safePage ? '#2563eb' : t.surfaceBorder}`, background: pg === safePage ? '#2563eb' : t.btnSecondaryBg, color: pg === safePage ? '#fff' : t.textPrimary, fontWeight: pg === safePage ? 700 : 400 }}>
                {pg}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="master-page-btn"
              style={{ padding: '4px 10px', width: 'auto', border: `1px solid ${t.surfaceBorder}`, background: t.btnSecondaryBg, color: t.textPrimary, cursor: safePage >= totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleListPage;
