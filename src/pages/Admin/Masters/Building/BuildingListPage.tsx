// src/pages/Admin/Masters/Building/BuildingListPage.tsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
<<<<<<< HEAD
  MdAdd, MdDelete, MdDownload, MdEdit, MdRefresh,
  MdSearch, MdVisibility, MdApartment, MdMoreVert,
  MdBusiness, MdLayers, MdHome, MdCheckCircle, MdCancel, MdStorefront,
} from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme, AppTheme } from '../../../../styles/theme';
import { fetchBuildingList, deleteBuilding } from '../../../../services/buildingService';
=======
  MdAdd, MdDownload, MdRefresh,
  MdSearch, MdApartment,
  MdBusiness, MdLayers, MdHome, MdStorefront,
} from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme } from '../../../../styles/theme';
import { FetchBuildingList, DeleteBuilding } from '../../../../services/buildingService';
>>>>>>> V_14.0
import { Building, BuildingListSummary } from '../../../../types/index';
import { formatDate, showAlert } from '../../../../utils';
import MasterIconButtons from '../../../../components/masters/MasterIconButtons';
import SortableTh from '../../../../components/masters/SortableTh';
import { useSortedRows } from '../../../../components/masters/useSortedRows';
import StatCard from '../../../../components/masters/StatCard';
import MultiStatCard from '../../../../components/masters/MultiStatCard';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

// Fixed width for the Actions column — sized for exactly 3 icon buttons
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
    padding: '9px 12px', fontSize: 13.5, background: 'transparent', border: 'none',
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

// ── derived helpers ──────────────────────────────────────────────────────────
const totalFlatsOf = (b: Building): number =>
  (b.wings ?? []).reduce(
    (wSum, w) => wSum + (w.floors ?? []).reduce((fSum, f) => fSum + (f.flats?.length ?? 0), 0),
    0
  );

const totalFloorsOf = (b: Building): number =>
  (b.wings ?? []).reduce((sum, w) => sum + (w.floors?.length ?? 0), 0);

type SortKey = 'id' | 'project_name' | 'building_name' | 'wings' | 'floors' | 'flats' | 'shops' | 'parking' | 'created_at';

const BuildingListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { mode } = useAppSelector((s) => s.theme);
  const isDark   = mode === 'dark';
  const t        = getTheme(isDark);
  const isMobile = useIsMobileTable();
  const actionColWidth = isMobile ? ACTION_COL_WIDTH_MOBILE : ACTION_COL_WIDTH;

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

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="master-page">

<<<<<<< HEAD
      {/* ── Summary cards — counts only, no percentages ─────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-4">
        {[
          { label: 'Total Projects',  value: summary?.total_projects  ?? 0, icon: MdBusiness,    color: '#2563eb', bg: isDark ? 'rgba(37,99,235,0.12)'  : '#eff6ff' },
          { label: 'Total Buildings', value: summary?.total_buildings ?? allBuildings.length, icon: MdApartment,  color: '#7c3aed', bg: isDark ? 'rgba(124,58,237,0.12)' : '#f5f3ff' },
          { label: 'Total Wings',     value: summary?.total_wings     ?? 0, icon: MdLayers,      color: '#0891b2', bg: isDark ? 'rgba(8,145,178,0.12)'  : '#ecfeff' },
          { label: 'Total Flats',     value: summary?.total_flats     ?? 0, icon: MdHome,        color: '#ea580c', bg: isDark ? 'rgba(234,88,12,0.12)'  : '#fff7ed' },
          { label: 'Enabled Flats',   value: summary?.enabled_flats   ?? 0, icon: MdCheckCircle, color: '#16a34a', bg: isDark ? 'rgba(22,163,74,0.12)'  : '#f0fdf4' },
          { label: 'Disabled Flats',  value: summary?.disabled_flats  ?? 0, icon: MdCancel,      color: '#dc2626', bg: isDark ? 'rgba(220,38,38,0.12)'  : '#fef2f2' },
          { label: 'Total Shops',     value: summary?.total_shops     ?? 0, icon: MdStorefront,  color: '#db2777', bg: isDark ? 'rgba(219,39,119,0.12)' : '#fdf2f8' },
        ].map((card) => (
          <div
            key={card.label}
            className="flex items-center gap-2.5 px-3 py-3 rounded-xl"
            style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}
          >
            <div
              className="flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ width: 36, height: 36, background: card.bg }}
            >
              <card.icon size={19} style={{ color: card.color }} />
            </div>
            <div className="min-w-0">
              <div style={{ fontSize: 19, fontWeight: 800, color: t.textPrimary, lineHeight: 1.1 }}>
                {loading ? '—' : card.value}
              </div>
              <div style={{ fontSize: 11.5, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                {card.label}
              </div>
            </div>
          </div>
        ))}
=======
      {/* ── Summary cards — Total Projects/Buildings/Wings as single-value
          boxes, Flats and Shops as grouped Total/Enabled/Disabled boxes
          (item 4) instead of splitting Enabled/Disabled across separate
          combined-flats-and-shops cards. 5 boxes total now (was 7), so
          .master-stat-grid-5 replaces the old 7-column grid. */}
      <div className="master-stat-grid-5">
        <StatCard label="Total Projects" value={summary?.total_projects ?? 0} icon={MdBusiness}
          color="#2563eb" bg={isDark ? 'rgba(37,99,235,0.12)' : '#eff6ff'} loading={loading} compact labelFontSize={16}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Total Buildings" value={summary?.total_buildings ?? allBuildings.length} icon={MdApartment}
          color="#7c3aed" bg={isDark ? 'rgba(124,58,237,0.12)' : '#f5f3ff'} loading={loading} compact labelFontSize={16}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Total Wings" value={summary?.total_wings ?? 0} icon={MdLayers}
          color="#0891b2" bg={isDark ? 'rgba(8,145,178,0.12)' : '#ecfeff'} loading={loading} compact labelFontSize={16}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <MultiStatCard label="Flats" icon={MdHome} color="#ea580c" bg={isDark ? 'rgba(234,88,12,0.12)' : '#fff7ed'}
          total={summary?.total_flats ?? 0} enabled={summary?.enabled_flats ?? 0} disabled={summary?.disabled_flats ?? 0}
          loading={loading} labelFontSize={16}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <MultiStatCard label="Shops" icon={MdStorefront} color="#db2777" bg={isDark ? 'rgba(219,39,119,0.12)' : '#fdf2f8'}
          total={summary?.total_shops ?? 0} enabled={summary?.enabled_shops ?? 0} disabled={summary?.disabled_shops ?? 0}
          loading={loading} labelFontSize={16}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
>>>>>>> V_14.0
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
            <MdAdd size={18} /> Add Building
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
          <table className="master-table" style={{ minWidth: 1180 }}>

            {/* 2-row header: Flats and Shops are grouped column headers
                (colSpan 3) with Total/Enabled/Disabled sub-columns in the
                second row; every other column spans both rows via rowSpan
                so its bottom border still lines up with the sub-header row. */}
            <thead>
              <tr style={{ background: t.tableHeaderBg }}>
<<<<<<< HEAD
<<<<<<< HEAD
                {/* STICKY Actions header — now the first column */}
                <th style={{
                  padding: '12px 16px', textAlign: 'center',
                  width: actionColWidth, minWidth: actionColWidth, maxWidth: actionColWidth,
                  fontSize: 14, fontWeight: 700, textTransform: 'camelcase',
                  letterSpacing: '0.05em', color: t.textPrimary,
                  borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap',
                  position: 'sticky', left: 0, zIndex: 2,
                  background: t.tableHeaderBg,
                  borderRight: `2px solid ${t.divider}`,
                  boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
=======
                <th className="master-table-actions-th" style={{
=======
                <th className="master-table-actions-th" rowSpan={2} style={{
>>>>>>> V_14.0
                  width: ACTION_COL_WIDTH, minWidth: ACTION_COL_WIDTH, maxWidth: ACTION_COL_WIDTH,
                  borderBottom: `1px solid ${t.divider}`, zIndex: 2, background: t.tableHeaderBg,
                  borderRight: `2px solid ${t.divider}`, boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
>>>>>>> V_14.0
                }}>
                  {isMobile ? '#' : 'Actions'}
                </th>
<<<<<<< HEAD
<<<<<<< HEAD
                {['ID', 'Project Name', 'Building Name', 'Location', 'Wings', 'Floors', 'Flats', 'Status', 'Created At'].map((h) => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: 14, fontWeight: 700, textTransform: 'camelcase',
                    letterSpacing: '0.05em', color: t.textPrimary,
                    borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
=======
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
>>>>>>> V_14.0
=======
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
              <tr style={{ background: t.tableHeaderBg }}>
                <SortableTh label="Total" active={sortKey === 'flats'} dir={sortDir} onClick={() => toggleSort('flats')} style={{ borderBottom: `1px solid ${t.divider}`, textAlign: 'center' }} />
                <th style={{ borderBottom: `1px solid ${t.divider}`, textAlign: 'center' }}>Enabled</th>
                <th style={{ borderBottom: `1px solid ${t.divider}`, textAlign: 'center' }}>Disabled</th>
                <SortableTh label="Total" active={sortKey === 'shops'} dir={sortDir} onClick={() => toggleSort('shops')} style={{ borderBottom: `1px solid ${t.divider}`, textAlign: 'center' }} />
                <th style={{ borderBottom: `1px solid ${t.divider}`, textAlign: 'center' }}>Enabled</th>
                <th style={{ borderBottom: `1px solid ${t.divider}`, textAlign: 'center' }}>Disabled</th>
>>>>>>> V_14.0
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
<<<<<<< HEAD
                      {/* STICKY Actions cell — now the first column */}
                      <td style={{
                        padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap',
                        width: actionColWidth, minWidth: actionColWidth, maxWidth: actionColWidth,
                        position: 'sticky', left: 0, zIndex: 1,
                        background: stickyBg,
                        borderRight: `2px solid ${t.divider}`,
                        boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
                      }}>
                        {isMobile ? (
                          <div className="flex items-center justify-center">
                            <RowActionMenu
                              isDark={isDark}
                              t={t}
                              onView={() => navigate(`/admin/masters/building/view/${b.id}`)}
                              onEdit={() => navigate(`/admin/masters/building/edit/${b.id}`)}
                              onDelete={() => handleDelete(b)}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => navigate(`/admin/masters/building/view/${b.id}`)}
                              title="View"
                              style={iconBtn}
                            >
                              <MdVisibility size={17} color={ACTION_ICON_COLOR} />
                            </button>
                            <button
                              onClick={() => navigate(`/admin/masters/building/edit/${b.id}`)}
                              title="Edit"
                              style={iconBtn}
                            >
                              <MdEdit size={17} color={ACTION_ICON_COLOR} />
                            </button>
                            <button
                              onClick={() => handleDelete(b)}
                              title="Delete"
                              style={iconBtn}
                            >
                              <MdDelete size={17} color={ACTION_ICON_COLOR} />
                            </button>
                          </div>
                        )}
=======
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
>>>>>>> V_14.0
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
