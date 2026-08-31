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
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import { FetchBuildingList, DeleteBuilding, BuildingSortKey } from '../../../../services/buildingService';
import { Building, BuildingListSummary } from '../../../../types/index';
import { formatDate, showAlert } from '../../../../utils';
import MasterIconButtons from '../../../../components/masters/MasterIconButtons';
import SortableTh, { SortDir } from '../../../../components/masters/SortableTh';
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

const BuildingListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isDark, t, cssVars } = useAppearanceTokens();

  // allBuildings now holds ONLY the current server page — previously this
  // held up to 1000 rows fetched once, with search AND sort both done
  // client-side (the sort/count columns, computed server-side per row
  // already, were re-sorted again in the browser). Past 1000 buildings,
  // rows silently never appeared anywhere on the page — a correctness bug,
  // not just a performance one.
  const [allBuildings, setAllBuildings] = useState<Building[]>([]);
  const [total, setTotal]               = useState(0);
  const [summary, setSummary]           = useState<BuildingListSummary | null>(null);
  const [search, setSearch]             = useState('');
  // This is now a real server-side search (see fetchBuildings below), so —
  // same reasoning as every other server-filtered list page this pass
  // touched — debounce it rather than firing a network request on every
  // keystroke.
  const debouncedSearch = useDebouncedValue(search, 400);
  const [sortKey, setSortKey] = useState<BuildingSortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [loading, setLoading]           = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [page, setPage]                 = useState(1);
  const [limit, setLimit]               = useState(5);

  useEffect(() => { dispatch(setPageTitle('Building')); }, [dispatch]);

  // Real server pagination, search, and sort (see building.repository.ts's
  // findBuildingList) — summary is a company-wide aggregate independent of
  // the search box, matching this page's prior behavior (an unfiltered
  // one-off 1000-row fetch), fetched alongside the paginated list in one
  // round trip.
  const fetchBuildings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await FetchBuildingList(page, limit, debouncedSearch, sortKey, sortDir);
      if (res.success) {
        setAllBuildings(res.rows ?? []);
        setTotal(res.total ?? 0);
        setSummary(res.summary ?? null);
      } else {
        toast.error('Failed to Fetch Buildings');
      }
    } catch {
      toast.error('Failed to fetch buildings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, sortKey, sortDir]);

  useEffect(() => { fetchBuildings(); }, [fetchBuildings]);
  // A search narrowing the result set out from under an already-deep page
  // number would otherwise land on an empty or out-of-range page.
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const toggleSort = (key: BuildingSortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

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
  // allBuildings is only the current page now, so export does its own
  // one-off fetch honoring the same search box and sort (at a higher
  // limit) rather than reading in-memory state — same pattern as the
  // Customer/Employee list pages' export fix. Capped at 5000 for the same
  // reason: large enough that a real company's search result is very
  // unlikely to exceed it, without a dedicated unpaginated backend export
  // endpoint for this pass.
  const exportCSV = async () => {
    setExportingCsv(true);
    try {
      const res = await FetchBuildingList(1, 5000, debouncedSearch, sortKey, sortDir);
      const exportRows = res.rows ?? [];
      if (exportRows.length === 0) { toast.info('No data to Export'); return; }
      const headers = [
        'ID', 'Project Name', 'Building Name', 'Location',
        'No. of Wings', 'No. of Floors', 'No. of Flats', 'No. of Shops', 'Parking',
        'Status', 'Created At', 'Updated At',
      ];
      const rows = exportRows.map((b) => [
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
    } catch {
      toast.error('Failed to export buildings. Please try again.');
    } finally {
      setExportingCsv(false);
    }
  };

  // ── pagination (server-side) ─────────────────────────────────────────────
  const totalPages    = Math.max(1, Math.ceil(total / limit));
  const safePage      = Math.min(page, totalPages);
  const startIdx      = (safePage - 1) * limit;
  const pageRows      = allBuildings;
  const showingFrom   = total === 0 ? 0 : startIdx + 1;
  const showingTo     = Math.min(startIdx + limit, total);

  const pageBtns = () => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="master-page" style={cssVars}>

      {/* ── Summary cards — Total Projects/Buildings/Wings as single-value
          boxes, Flats and Shops as grouped Total/Enabled/Disabled boxes
          (item 4) instead of splitting Enabled/Disabled across separate
          combined-flats-and-shops cards. 5 boxes total now (was 7), so
          .master-stat-grid-5 replaces the old 7-column grid. */}
      <div className="master-stat-grid-5">
        <StatCard label="Total Projects" value={summary?.total_projects ?? 0} icon={MdBusiness}
          color="#2563eb" bg={isDark ? 'rgba(37,99,235,0.12)' : '#eff6ff'} loading={loading} compact labelFontSize={14}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Total Buildings" value={summary?.total_buildings ?? allBuildings.length} icon={MdApartment}
          color="#7c3aed" bg={isDark ? 'rgba(124,58,237,0.12)' : '#f5f3ff'} loading={loading} compact labelFontSize={14}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Total Wings" value={summary?.total_wings ?? 0} icon={MdLayers}
          color="#0891b2" bg={isDark ? 'rgba(8,145,178,0.12)' : '#ecfeff'} loading={loading} compact labelFontSize={14}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <MultiStatCard label="Flats" icon={MdHome} color="#ea580c" bg={isDark ? 'rgba(234,88,12,0.12)' : '#fff7ed'}
          total={summary?.total_flats ?? 0} enabled={summary?.enabled_flats ?? 0} disabled={summary?.disabled_flats ?? 0}
          loading={loading} labelFontSize={14}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <MultiStatCard label="Shops" icon={MdStorefront} color="#db2777" bg={isDark ? 'rgba(219,39,119,0.12)' : '#fdf2f8'}
          total={summary?.total_shops ?? 0} enabled={summary?.enabled_shops ?? 0} disabled={summary?.disabled_shops ?? 0}
          loading={loading} labelFontSize={14}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
      </div>

      {/* ── Top bar: Search | Add + Download + Refresh ─────────────────── */}
      <div className="master-topbar">
        <div className="master-search-box master-search-box-accent" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
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
            <MdAdd size={18} /> Add Building
          </button>
          <button onClick={exportCSV} title="Export CSV" className="master-btn-icon" disabled={exportingCsv}
            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary,
              opacity: exportingCsv ? 0.6 : 1, cursor: exportingCsv ? 'not-allowed' : 'pointer' }}>
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
          <table className="master-table" style={{ minWidth: 1180 }}>

            {/* 2-row header: Flats and Shops are grouped column headers
                (colSpan 3) with Total/Enabled/Disabled sub-columns in the
                second row; every other column spans both rows via rowSpan
                so its bottom border still lines up with the sub-header row. */}
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                <th className="master-table-actions-th master-table-header-gradient" rowSpan={2} style={{
                  width: ACTION_COL_WIDTH, minWidth: ACTION_COL_WIDTH, maxWidth: ACTION_COL_WIDTH,
                  borderBottom: `1px solid ${t.divider}`, zIndex: 2, background: t.tableHeaderBg,
                  borderRight: `2px solid ${t.divider}`, boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
                }}>
                  Actions
                </th>
                <SortableTh label="ID" rowSpan={2} active={sortKey === 'id'} dir={sortDir} onClick={() => toggleSort('id')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <SortableTh label="Project Name" rowSpan={2} active={sortKey === 'project_name'} dir={sortDir} onClick={() => toggleSort('project_name')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <SortableTh label="Building Name" rowSpan={2} active={sortKey === 'building_name'} dir={sortDir} onClick={() => toggleSort('building_name')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <SortableTh label="Wings" rowSpan={2} active={sortKey === 'wings'} dir={sortDir} onClick={() => toggleSort('wings')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <SortableTh label="Floors" rowSpan={2} active={sortKey === 'floors'} dir={sortDir} onClick={() => toggleSort('floors')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <th colSpan={3} style={{ textAlign: 'center', borderBottom: `1px solid ${t.divider}` }}>Flats</th>
                <th colSpan={3} style={{ textAlign: 'center', borderBottom: `1px solid ${t.divider}` }}>Shops</th>
                <SortableTh label="Parking" rowSpan={2} active={sortKey === 'parking'} dir={sortDir} onClick={() => toggleSort('parking')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <SortableTh label="Created At" rowSpan={2} active={sortKey === 'created_at'} dir={sortDir} onClick={() => toggleSort('created_at')} style={{ borderBottom: `1px solid ${t.divider}` }} />
              </tr>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                <SortableTh label="Total" active={sortKey === 'flats'} dir={sortDir} onClick={() => toggleSort('flats')} style={{ borderBottom: `1px solid ${t.divider}`, textAlign: 'center' }} />
                <th style={{ borderBottom: `1px solid ${t.divider}`, textAlign: 'center' }}>Enabled</th>
                <th style={{ borderBottom: `1px solid ${t.divider}`, textAlign: 'center' }}>Disabled</th>
                <SortableTh label="Total" active={sortKey === 'shops'} dir={sortDir} onClick={() => toggleSort('shops')} style={{ borderBottom: `1px solid ${t.divider}`, textAlign: 'center' }} />
                <th style={{ borderBottom: `1px solid ${t.divider}`, textAlign: 'center' }}>Enabled</th>
                <th style={{ borderBottom: `1px solid ${t.divider}`, textAlign: 'center' }}>Disabled</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={14} style={{ textAlign: 'center', padding: 48 }}>
                    Loading...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={14} style={{ textAlign: 'center', padding: 48 }}>
                    {search ? 'No buildings match your search.' : 'No buildings found.'}
                  </td>
                </tr>
              ) : (
                pageRows.map((b, idx) => {
                  const rowBg = idx % 2 === 0 ? t.surfaceBg : t.tableHeaderBg;
                  const disabledFlats = b.disabled_flats ?? 0;
                  const disabledShops = b.disabled_shops ?? 0;
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
                      <td>
                        <div style={{ fontWeight: 600 }}>{b.project_name}</div>
                        {b.location && (
                          <div style={{ fontSize: 10.5, color: t.textSecondary, fontWeight: 400 }}>{b.location}</div>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <MdApartment size={16} className="master-row-icon" />
                          {b.building_name}
                        </div>
                      </td>
                      <td>
                        <div>{b.wings?.length ?? 0}</div>
                        {b.wing_names && (
                          <div style={{ fontSize: 10.5, color: t.textSecondary }}>{b.wing_names}</div>
                        )}
                      </td>
                      <td>{totalFloorsOf(b)}</td>
                      <td style={{ textAlign: 'center' }}>{totalFlatsOf(b)}</td>
                      <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>{b.enabled_flats ?? 0}</td>
                      <td style={{ textAlign: 'center', color: disabledFlats > 0 ? '#dc2626' : undefined, fontWeight: disabledFlats > 0 ? 600 : undefined }}>{disabledFlats}</td>
                      <td style={{ textAlign: 'center' }}>{b.shop_count ?? 0}</td>
                      <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>{b.enabled_shops ?? 0}</td>
                      <td style={{ textAlign: 'center', color: disabledShops > 0 ? '#dc2626' : undefined, fontWeight: disabledShops > 0 ? 600 : undefined }}>{disabledShops}</td>
                      <td>{b.has_parking ? (b.parking_count ?? 0) : '—'}</td>
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
            <span style={{ fontSize: 11.5, color: t.textPrimary }}>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{
                background: t.inputBg, border: `1px solid ${t.inputBorder}`,
                color: t.inputText, borderRadius: 8, padding: '4px 8px',
                fontSize: 11.5, cursor: 'pointer', outline: 'none',
              }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <span style={{ fontSize: 11.5, color: t.textPrimary }}>
            Showing {showingFrom}–{showingTo} of {total}
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
