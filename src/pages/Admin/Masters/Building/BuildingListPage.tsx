// src/pages/Admin/Masters/Building/BuildingListPage.tsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdAdd, MdDelete, MdDownload, MdEdit, MdRefresh,
  MdSearch, MdVisibility, MdApartment, MdMoreVert,
  MdBusiness, MdLayers, MdHome, MdCheckCircle, MdCancel, MdStorefront,
} from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme, AppTheme } from '../../../../styles/theme';
import { fetchBuildingList, deleteBuilding } from '../../../../services/buildingService';
import { Building, BuildingListSummary } from '../../../../types/index';
import { formatDate, showAlert } from '../../../../utils';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

// All action icons use the same dark-grey color — same as every other master list
const ACTION_ICON_COLOR = '#4b5563';

// Fixed width for the Actions column — sized for exactly 3 icon buttons
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
      const res = await fetchBuildingList(1, 1000);
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

  // ── delete ──────────────────────────────────────────────────────────────
  const handleDelete = async (building: Building) => {
    const result = await showAlert.confirm(
      `Are you sure you want to delete "${building.building_name}"?`,
      'Delete Building?'
    );
    if (!result.isConfirmed) return;
    try {
      const res = await deleteBuilding(building.id);
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
    if (filtered.length === 0) { toast.info('No data to Export'); return; }
    const headers = [
      'ID', 'Project Name', 'Building Name', 'Location',
      'No. of Wings', 'No. of Floors', 'No. of Flats',
      'Status', 'Created At', 'Updated At',
    ];
    const rows = filtered.map((b) => [
      b.id,
      `"${b.project_name}"`,
      `"${b.building_name}"`,
      `"${b.location}"`,
      b.wings?.length ?? 0,
      totalFloorsOf(b),
      totalFlatsOf(b),
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
    console.log('[BuildingListPage] CSV exported, rows:', filtered.length);
  };

  // ── pagination (client-side) ─────────────────────────────────────────────
  const totalFiltered = filtered.length;
  const totalPages    = Math.max(1, Math.ceil(totalFiltered / limit));
  const safePage      = Math.min(page, totalPages);
  const startIdx      = (safePage - 1) * limit;
  const pageRows      = filtered.slice(startIdx, startIdx + limit);
  const showingFrom   = totalFiltered === 0 ? 0 : startIdx + 1;
  const showingTo     = Math.min(startIdx + limit, totalFiltered);

  const pageBtns = () => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  };

  // ── same iconBtn style as every other master page ────────────────────────
  const iconBtn: React.CSSProperties = {
    width: 32, height: 32, background: 'none',
    border: `1.5px solid ${isDark ? '#ffffff' : '#000000'}`,
    padding: 0, borderRadius: 8,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0,
  };

  const stickyBg = isDark ? t.surfaceBg : '#ffffff';

  // ── status badge ──────────────────────────────────────────────────────────
  const statusBadge = (isActive: boolean) => (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 10px',
      borderRadius: 20,
      fontSize: 14,
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
    <div style={{ fontFamily: t.fontFamily }}>

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
      </div>

      {/* ── Top bar: Search | Add + Download + Refresh ─────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">

        {/* Search — left, Building Name only per spec */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{
            flex: '1 1 200px', maxWidth: 320,
            background: t.inputBg,
            border: `1px solid ${t.inputBorder}`,
          }}
        >
          <MdSearch size={18} style={{ color: t.textPrimary, flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by Building Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: t.inputText, fontSize: 14, width: '100%',
            }}
          />
        </div>

        {/* Right: Add + Download + Refresh — identical layout to other masters */}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <button
            onClick={() => navigate('/admin/masters/building/add')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{
              background: 'linear-gradient(135deg,#1d4ed8,#2563eb)',
              border: 'none', cursor: 'pointer',
            }}
          >
            <MdAdd size={18} /> Add New Building
          </button>

          <button
            onClick={exportCSV}
            title="Export CSV"
            className="p-2 rounded-xl"
            style={{
              background: t.insetBg,
              border: `1px solid ${t.surfaceBorder}`,
              cursor: 'pointer',
              color: t.textPrimary,
            }}
          >
            <MdDownload size={18} />
          </button>

          <button
            onClick={fetchBuildings}
            title="Refresh"
            className="p-2 rounded-xl"
            style={{
              background: t.insetBg,
              border: `1px solid ${t.surfaceBorder}`,
              cursor: 'pointer',
              color: t.textPrimary,
            }}
          >
            <MdRefresh size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Table card ───────────────────────────────────────────────────── */}
      <div style={{
        background: t.surfaceBg,
        border: `1px solid ${t.surfaceBorder}`,
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto', position: 'relative' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>

            <thead>
              <tr style={{ background: t.tableHeaderBg }}>
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
                }}>
                  {isMobile ? '#' : 'Actions'}
                </th>
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
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 48, color: t.textPrimary }}>
                    Loading...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 48, color: t.textPrimary }}>
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
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                        {b.id}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                        {b.project_name}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                        <div className="flex items-center gap-2">
                          <MdApartment size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
                          {b.building_name}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                        {b.location}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                        {b.wings?.length ?? 0}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                        {totalFloorsOf(b)}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                        {totalFlatsOf(b)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {statusBadge(b.is_active)}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                        {formatDate(b.created_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer: Rows per page | Showing | Prev/Pages/Next ────────── */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          style={{ borderTop: `1px solid ${t.divider}` }}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 14, color: t.textPrimary }}>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{
                background: t.inputBg, border: `1px solid ${t.inputBorder}`,
                color: t.inputText, borderRadius: 8, padding: '4px 8px',
                fontSize: 14, cursor: 'pointer', outline: 'none',
              }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <span style={{ fontSize: 14, color: t.textPrimary }}>
            Showing {showingFrom}–{showingTo} of {totalFiltered}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              style={{
                padding: '4px 10px', borderRadius: 8,
                border: `1px solid ${t.surfaceBorder}`,
                background: t.btnSecondaryBg,
                color: t.textPrimary,
                cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                fontSize: 14,
              }}
            >
              Prev
            </button>

            {pageBtns().map((pg) => (
              <button
                key={pg}
                onClick={() => setPage(pg)}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  border: `1px solid ${pg === safePage ? '#2563eb' : t.surfaceBorder}`,
                  background: pg === safePage ? '#2563eb' : t.btnSecondaryBg,
                  color: pg === safePage ? '#fff' : t.textPrimary,
                  cursor: 'pointer', fontSize: 14,
                  fontWeight: pg === safePage ? 700 : 400,
                }}
              >
                {pg}
              </button>
            ))}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              style={{
                padding: '4px 10px', borderRadius: 8,
                border: `1px solid ${t.surfaceBorder}`,
                background: t.btnSecondaryBg,
                color: t.textPrimary,
                cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                fontSize: 14,
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
