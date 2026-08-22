// src/pages/Admin/Masters/Building/BuildingListPage.tsx

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdAdd, MdDownload, MdRefresh,
  MdSearch, MdApartment,
  MdBusiness, MdLayers, MdHome, MdStorefront,
} from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme } from '../../../../styles/theme';
import { FetchBuildingList, DeleteBuilding } from '../../../../services/buildingService';
import { Building, BuildingListSummary } from '../../../../types/index';
import { formatDate, showAlert } from '../../../../utils';
import MasterIconButtons from '../../../../components/masters/MasterIconButtons';
import SortableTh from '../../../../components/masters/SortableTh';
import { useSortedRows } from '../../../../components/masters/useSortedRows';
import StatCard from '../../../../components/masters/StatCard';
import MultiStatCard from '../../../../components/masters/MultiStatCard';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

// Fixed width for the Actions column — sized for exactly 3 icon buttons
// + gaps + cell padding, so it never grows/shrinks with the number of
// other columns in the table.
const ACTION_COL_WIDTH = 96;

// ── derived helpers ──────────────────────────────────────────────────────────
const totalFlatsOf = (b: Building): number =>
  (b.wings ?? []).reduce(
    (wSum, w) => wSum + (w.floors ?? []).reduce((fSum, f) => fSum + (f.flats?.length ?? 0), 0),
    0
  );

const totalFloorsOf = (b: Building): number =>
  (b.wings ?? []).reduce((sum, w) => sum + (w.floors?.length ?? 0), 0);

type SortKey = 'id' | 'project_name' | 'building_name' | 'location' | 'wings' | 'floors' | 'flats' | 'shops' | 'parking' | 'created_at';

const BuildingListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { mode } = useAppSelector((s) => s.theme);
  const isDark   = mode === 'dark';
  const t        = getTheme(isDark);

  const [allBuildings, setAllBuildings] = useState<Building[]>([]);
  const [filtered, setFiltered]         = useState<Building[]>([]);
  const [summary, setSummary]           = useState<BuildingListSummary | null>(null);
  const [search, setSearch]             = useState('');
  const [loading, setLoading]           = useState(false);
  const [page, setPage]                 = useState(1);
  const [limit, setLimit]               = useState(5);

  useEffect(() => { dispatch(setPageTitle('Building')); }, [dispatch]);

  // ── fetch ALL once — client-side search, no API call on keypress ──────────
  const fetchBuildings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await FetchBuildingList(1, 1000);
      if (res.success) {
        setAllBuildings(res.rows ?? []);
        setSummary(res.summary ?? null);
      } else {
        toast.error('Failed to Fetch Buildings');
      }
    } catch {
      toast.error('Failed to fetch buildings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBuildings(); }, [fetchBuildings]);

  // ── instant client-side filter on every keypress — zero API calls ─────────
  // Building Name only (per spec — no Project/Location matching, to keep
  // this a single, predictable search field rather than a fuzzy multi-field one).
  useEffect(() => {
    const q = search.trim().toLowerCase();
    setFiltered(
      q
        ? allBuildings.filter((b) => b.building_name?.toLowerCase().includes(q))
        : allBuildings
    );
    setPage(1);
  }, [search, allBuildings]);

  // Default sort: newest first (item 5) — a newly-added building appears at
  // the top of the table until the user picks a different column.
  const getSortValue = (b: Building, key: SortKey): string | number => {
    switch (key) {
      case 'id': return Number(b.id);
      case 'project_name': return b.project_name?.toLowerCase() || '';
      case 'building_name': return b.building_name?.toLowerCase() || '';
      case 'location': return b.location?.toLowerCase() || '';
      case 'wings': return b.wings?.length ?? 0;
      case 'floors': return totalFloorsOf(b);
      case 'flats': return totalFlatsOf(b);
      case 'shops': return b.shop_count ?? 0;
      case 'parking': return b.parking_count ?? 0;
      case 'created_at': return b.created_at || '';
    }
  };
  const { sorted, sortKey, sortDir, toggleSort } = useSortedRows<Building, SortKey>(filtered, getSortValue, 'created_at', 'desc');

  // ── delete ──────────────────────────────────────────────────────────────
  const handleDelete = async (building: Building) => {
    const result = await showAlert.confirm(
      `Are you sure you want to delete "${building.building_name}"?`,
      'Delete Building?'
    );
    if (!result.isConfirmed) return;
    try {
      const res = await DeleteBuilding(building.id);
      if (res.success) {
        toast.success('Building Deleted Successfully', { autoClose: 1000 });
        fetchBuildings();
      } else {
        toast.error(res.message || 'Failed to Delete');
      }
    } catch {
      toast.error('Failed to delete building. Please try again.');
    }
  };

  // ── export CSV ─────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (sorted.length === 0) { toast.info('No data to Export'); return; }
    const headers = [
      'ID', 'Project Name', 'Building Name', 'Location',
      'No. of Wings', 'No. of Floors', 'No. of Flats', 'No. of Shops', 'Parking',
      'Status', 'Created At', 'Updated At',
    ];
    const rows = sorted.map((b) => [
      b.id,
      `"${b.project_name}"`,
      `"${b.building_name}"`,
      `"${b.location}"`,
      b.wings?.length ?? 0,
      totalFloorsOf(b),
      totalFlatsOf(b),
      b.shop_count ?? 0,
      b.parking_count ?? 0,
      b.is_active ? 'Active' : 'Inactive',
      formatDate(b.created_at),
      formatDate(b.updated_at || ''),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a   = Object.assign(document.createElement('a'), { href: url, download: 'buildings.csv' });
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Building List CSV Exported Successfully', { autoClose: 1000 });
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

  // ── status badge ──────────────────────────────────────────────────────────
  const statusBadge = (isActive: boolean) => (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 10px',
      borderRadius: 20,
      fontSize: 13,
      fontWeight: 500,
      background: isActive
        ? isDark ? 'rgba(34,197,94,0.12)' : '#dcfce7'
        : isDark ? 'rgba(239,68,68,0.12)'  : '#fee2e2',
      color: isActive
        ? isDark ? '#4ade80' : '#16a34a'
        : isDark ? '#f87171' : '#dc2626',
    }}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="master-page">

      {/* ── Summary cards — Total Projects/Buildings/Wings as single-value
          boxes, Flats and Shops as grouped Total/Enabled/Disabled boxes
          (item 4) instead of splitting Enabled/Disabled across separate
          combined-flats-and-shops cards. 5 boxes total now (was 7), so
          .master-stat-grid-5 replaces the old 7-column grid. */}
      <div className="master-stat-grid-5">
        <StatCard label="Total Projects" value={summary?.total_projects ?? 0} icon={MdBusiness}
          color="#2563eb" bg={isDark ? 'rgba(37,99,235,0.12)' : '#eff6ff'} loading={loading} compact
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Total Buildings" value={summary?.total_buildings ?? allBuildings.length} icon={MdApartment}
          color="#7c3aed" bg={isDark ? 'rgba(124,58,237,0.12)' : '#f5f3ff'} loading={loading} compact
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Total Wings" value={summary?.total_wings ?? 0} icon={MdLayers}
          color="#0891b2" bg={isDark ? 'rgba(8,145,178,0.12)' : '#ecfeff'} loading={loading} compact
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <MultiStatCard label="Flats" icon={MdHome} color="#ea580c" bg={isDark ? 'rgba(234,88,12,0.12)' : '#fff7ed'}
          total={summary?.total_flats ?? 0} enabled={summary?.enabled_flats ?? 0} disabled={summary?.disabled_flats ?? 0}
          loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <MultiStatCard label="Shops" icon={MdStorefront} color="#db2777" bg={isDark ? 'rgba(219,39,119,0.12)' : '#fdf2f8'}
          total={summary?.total_shops ?? 0} enabled={summary?.enabled_shops ?? 0} disabled={summary?.disabled_shops ?? 0}
          loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
      </div>

      {/* ── Top bar: Search | Add + Download + Refresh ─────────────────── */}
      <div className="master-topbar">
        <div className="master-search-box" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
          <MdSearch size={18} style={{ color: t.textPrimary, flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by Building Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="master-search-input"
            style={{ color: t.inputText }}
          />
        </div>

        <div className="master-actions">
          <button onClick={() => navigate('/admin/masters/building/add')} className="master-btn-primary">
            <MdAdd size={18} /> Add New Building
          </button>
          <button onClick={exportCSV} title="Export CSV" className="master-btn-icon"
            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}>
            <MdDownload size={18} />
          </button>
          <button onClick={fetchBuildings} title="Refresh" className="master-btn-icon"
            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}>
            <MdRefresh size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Table card ───────────────────────────────────────────────────── */}
      <div className="master-table-card" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="master-table-scroll">
          <table className="master-table" style={{ minWidth: 900 }}>

            <thead>
              <tr style={{ background: t.tableHeaderBg }}>
                <th className="master-table-actions-th" style={{
                  width: ACTION_COL_WIDTH, minWidth: ACTION_COL_WIDTH, maxWidth: ACTION_COL_WIDTH,
                  borderBottom: `1px solid ${t.divider}`, zIndex: 2, background: t.tableHeaderBg,
                  borderRight: `2px solid ${t.divider}`, boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
                }}>
                  Actions
                </th>
                <SortableTh label="ID" active={sortKey === 'id'} dir={sortDir} onClick={() => toggleSort('id')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <SortableTh label="Project Name" active={sortKey === 'project_name'} dir={sortDir} onClick={() => toggleSort('project_name')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <SortableTh label="Building Name" active={sortKey === 'building_name'} dir={sortDir} onClick={() => toggleSort('building_name')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <SortableTh label="Location" active={sortKey === 'location'} dir={sortDir} onClick={() => toggleSort('location')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <SortableTh label="Wings" active={sortKey === 'wings'} dir={sortDir} onClick={() => toggleSort('wings')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <SortableTh label="Floors" active={sortKey === 'floors'} dir={sortDir} onClick={() => toggleSort('floors')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <SortableTh label="Flats" active={sortKey === 'flats'} dir={sortDir} onClick={() => toggleSort('flats')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <SortableTh label="Shops" active={sortKey === 'shops'} dir={sortDir} onClick={() => toggleSort('shops')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <SortableTh label="Parking" active={sortKey === 'parking'} dir={sortDir} onClick={() => toggleSort('parking')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <th style={{ borderBottom: `1px solid ${t.divider}` }}>Status</th>
                <SortableTh label="Created At" active={sortKey === 'created_at'} dir={sortDir} onClick={() => toggleSort('created_at')} style={{ borderBottom: `1px solid ${t.divider}` }} />
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: 48 }}>
                    Loading...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: 48 }}>
                    {search ? 'No buildings match your search.' : 'No buildings found.'}
                  </td>
                </tr>
              ) : (
                pageRows.map((b, idx) => {
                  const rowBg = idx % 2 === 0 ? t.surfaceBg : t.tableHeaderBg;
                  return (
                    <tr
                      key={b.id}
                      style={{
                        background: rowBg,
                        borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#d1d5db'}`,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = t.tableRowHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}
                    >
                      <td className="master-table-actions-td" style={{
                        width: ACTION_COL_WIDTH, minWidth: ACTION_COL_WIDTH, maxWidth: ACTION_COL_WIDTH,
                        zIndex: 1, background: isDark ? t.surfaceBg : '#ffffff',
                        borderRight: `2px solid ${t.divider}`, boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
                      }}>
                        <MasterIconButtons
                          onView={() => navigate(`/admin/masters/building/view/${b.id}`)}
                          onEdit={() => navigate(`/admin/masters/building/edit/${b.id}`)}
                          onDelete={() => handleDelete(b)}
                        />
                      </td>
                      <td>{b.id}</td>
                      <td>{b.project_name}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <MdApartment size={16} className="master-row-icon" />
                          {b.building_name}
                        </div>
                      </td>
                      <td>{b.location || '—'}</td>
                      <td>{b.wings?.length ?? 0}</td>
                      <td>{totalFloorsOf(b)}</td>
                      <td>{totalFlatsOf(b)}</td>
                      <td>{b.shop_count ?? 0}</td>
                      <td>{b.has_parking ? (b.parking_count ?? 0) : '—'}</td>
                      <td>{statusBadge(b.is_active)}</td>
                      <td>{formatDate(b.created_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer: Rows per page | Showing | Prev/Pages/Next ────────── */}
        <div className="master-pagination" style={{ borderTop: `1px solid ${t.divider}` }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 13, color: t.textPrimary }}>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{
                background: t.inputBg, border: `1px solid ${t.inputBorder}`,
                color: t.inputText, borderRadius: 8, padding: '4px 8px',
                fontSize: 13, cursor: 'pointer', outline: 'none',
              }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <span style={{ fontSize: 13, color: t.textPrimary }}>
            Showing {showingFrom}–{showingTo} of {totalFiltered}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="master-page-btn"
              style={{
                padding: '4px 10px', width: 'auto',
                border: `1px solid ${t.surfaceBorder}`,
                background: t.btnSecondaryBg,
                color: t.textPrimary,
                cursor: safePage === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Prev
            </button>

            {pageBtns().map((pg) => (
              <button
                key={pg}
                onClick={() => setPage(pg)}
                className="master-page-btn"
                style={{
                  border: `1px solid ${pg === safePage ? '#2563eb' : t.surfaceBorder}`,
                  background: pg === safePage ? '#2563eb' : t.btnSecondaryBg,
                  color: pg === safePage ? '#fff' : t.textPrimary,
                  fontWeight: pg === safePage ? 700 : 400,
                }}
              >
                {pg}
              </button>
            ))}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="master-page-btn"
              style={{
                padding: '4px 10px', width: 'auto',
                border: `1px solid ${t.surfaceBorder}`,
                background: t.btnSecondaryBg,
                color: t.textPrimary,
                cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuildingListPage;
