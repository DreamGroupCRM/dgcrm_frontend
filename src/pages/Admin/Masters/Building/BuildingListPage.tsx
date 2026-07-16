// src/pages/Admin/Masters/Building/BuildingListPage.tsx
// Contains: Building Details accordion + Wing Details accordion

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdAdd, MdDelete, MdDownload, MdEdit, MdRefresh,
  MdSearch, MdVisibility, MdKeyboardArrowDown, MdBusiness,
} from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme } from '../../../../styles/theme';
import { fetchBuildingList, deleteBuilding } from '../../../../services/buildingService';
import { fetchWingList, deleteWing } from '../../../../services/wingService';
import { Building, Wing } from '../../../../types/index';
import { formatDate, showAlert } from '../../../../utils';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];
const ACTION_ICON_COLOR = '#4b5563';

// ─────────────────────────────────────────────────────────────────────────────
// Reusable accordion hook
// ─────────────────────────────────────────────────────────────────────────────
const useAccordion = (defaultOpen = true) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [contentHeight, setContentHeight] = useState<number | string>(defaultOpen ? 'auto' : 0);
  const contentRef = useRef<HTMLDivElement>(null);

  const recalc = useCallback(() => {
    if (contentRef.current) {
      setContentHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  useEffect(() => { recalc(); }, [recalc]);

  const toggle = () => setIsOpen((p) => !p);

  return { isOpen, toggle, contentRef, contentHeight, recalc };
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
const BuildingListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { mode } = useAppSelector((s) => s.theme);
  const isDark = mode === 'dark';
  const t = getTheme(isDark);

  useEffect(() => { dispatch(setPageTitle('Building')); }, [dispatch]);

  // ── theme helpers ──────────────────────────────────────────────────────
  const stickyBg = isDark ? t.surfaceBg : '#ffffff';

  const iconBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    color: ACTION_ICON_COLOR, padding: 6, borderRadius: 6,
    display: 'inline-flex', alignItems: 'center',
  };

  const statusBadge = (isActive: boolean) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
      background: isActive
        ? isDark ? 'rgba(34,197,94,0.12)' : '#dcfce7'
        : isDark ? 'rgba(239,68,68,0.12)' : '#fee2e2',
      color: isActive
        ? isDark ? '#4ade80' : '#16a34a'
        : isDark ? '#f87171' : '#dc2626',
    }}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );

  // ── accordion header shared style ──────────────────────────────────────
  const accordionCard: React.CSSProperties = {
    background: t.surfaceBg,
    border: `1px solid ${t.surfaceBorder}`,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  };

  const accordionHeader = (isOpen: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    flexWrap: 'wrap' as const,
    gap: 12,
    borderBottom: isOpen ? `1px solid ${t.divider}` : 'none',
  });

  // ══════════════════════════════════════════════════════════════════════
  // BUILDING STATE
  // ══════════════════════════════════════════════════════════════════════
  const bldgAccordion = useAccordion(true);
  const [allBuildings, setAllBuildings] = useState<Building[]>([]);
  const [bldgFiltered, setBldgFiltered] = useState<Building[]>([]);
  const [bldgSearch, setBldgSearch] = useState('');
  const [bldgLoading, setBldgLoading] = useState(false);
  const [bldgPage, setBldgPage] = useState(1);
  const [bldgLimit, setBldgLimit] = useState(5);

  const fetchBuildings = useCallback(async () => {
    setBldgLoading(true);
    try {
      const res = await fetchBuildingList(1, 1000);
      if (res.success) setAllBuildings(res.rows ?? []);
      else toast.error('Failed to Fetch Buildings');
    } catch (e) {
      toast.error('Failed to fetch buildings. Please try again.');
    } finally {
      setBldgLoading(false);
    }
  }, []);

  useEffect(() => { fetchBuildings(); }, [fetchBuildings]);

  useEffect(() => {
    const q = bldgSearch.trim().toLowerCase();
    setBldgFiltered(q ? allBuildings.filter((b) => b.name.toLowerCase().includes(q) || (b.address ?? '').toLowerCase().includes(q)) : allBuildings);
    setBldgPage(1);
  }, [bldgSearch, allBuildings]);

  useEffect(() => { bldgAccordion.recalc(); }, [bldgFiltered, bldgPage, bldgLimit]);

  const handleDeleteBuilding = async (building: Building) => {
    const result = await showAlert.confirm(`Are you sure you want to delete "${building.name}"?`, 'Delete Building?');
    if (!result.isConfirmed) return;
    try {
      console.log('[BuildingListPage] deleting building id:', building.id, typeof building.id);
      await deleteBuilding(String(building.id));
      toast.success('Building Deleted Successfully', { autoClose: 1000 });
      fetchBuildings();
    } catch (e: any) {
      console.error('[BuildingListPage] deleteBuilding error:', e);
      const msg = e?.response?.data?.message || 'Failed to delete building. Please try again.';
      toast.error(msg);
    }
  };

  const exportBuildingCSV = () => {
    if (bldgFiltered.length === 0) { toast.info('No data to Export'); return; }
    const headers = ['ID', 'Building Name', 'Location', 'Status', 'Created At'];
    const rows = bldgFiltered.map((b) => [b.id, `"${b.name}"`, `"${b.address ?? ''}"`, b.is_active ? 'Active' : 'Inactive', formatDate(b.created_at)]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: 'buildings.csv' }).click();
    URL.revokeObjectURL(url);
    toast.success('Building CSV Exported Successfully', { autoClose: 1000 });
  };

  // building pagination
  const bldgTotal = bldgFiltered.length;
  const bldgTotalPages = Math.max(1, Math.ceil(bldgTotal / bldgLimit));
  const bldgSafePage = Math.min(bldgPage, bldgTotalPages);
  const bldgStart = (bldgSafePage - 1) * bldgLimit;
  const bldgRows = bldgFiltered.slice(bldgStart, bldgStart + bldgLimit);
  const bldgFrom = bldgTotal === 0 ? 0 : bldgStart + 1;
  const bldgTo = Math.min(bldgStart + bldgLimit, bldgTotal);
  const bldgPageBtns = () => { const s = Math.max(1, Math.min(bldgSafePage - 2, bldgTotalPages - 4)); return Array.from({ length: Math.min(5, bldgTotalPages) }, (_, i) => s + i); };

  // ══════════════════════════════════════════════════════════════════════
  // WING STATE
  // ══════════════════════════════════════════════════════════════════════
  const wingAccordion = useAccordion(true);
  const [allWings, setAllWings] = useState<Wing[]>([]);
  const [wingFiltered, setWingFiltered] = useState<Wing[]>([]);
  const [wingSearch, setWingSearch] = useState('');
  const [wingLoading, setWingLoading] = useState(false);
  const [wingPage, setWingPage] = useState(1);
  const [wingLimit, setWingLimit] = useState(5);

  const fetchWings = useCallback(async () => {
    setWingLoading(true);
    try {
      const res = await fetchWingList(1, 1000);
      if (res.success) setAllWings(res.rows ?? []);
      else toast.error('Failed to Fetch Wings');
    } catch (e) {
      toast.error('Failed to fetch wings. Please try again.');
    } finally {
      setWingLoading(false);
    }
  }, []);

  useEffect(() => { fetchWings(); }, [fetchWings]);

  useEffect(() => {
    const q = wingSearch.trim().toLowerCase();
    setWingFiltered(q ? allWings.filter((w) => (w.w_name ?? '').toLowerCase().includes(q) || (w.building ?? '').toLowerCase().includes(q)) : allWings);
    setWingPage(1);
  }, [wingSearch, allWings]);

  useEffect(() => { wingAccordion.recalc(); }, [wingFiltered, wingPage, wingLimit]);

  const handleDeleteWing = async (wing: Wing) => {
    const result = await showAlert.confirm(`Are you sure you want to delete wing "${wing.w_name}"?`, 'Delete Wing?');
    if (!result.isConfirmed) return;
    try {
      console.log('[BuildingListPage] deleting wing id:', wing.w_id, typeof wing.w_id);
      await deleteWing(String(wing.w_id));
      toast.success('Wing Deleted Successfully', { autoClose: 1000 });
      fetchWings();
    } catch (e: any) {
      console.error('[BuildingListPage] deleteWing error:', e);
      const msg = e?.response?.data?.message || 'Failed to delete wing. Please try again.';
      toast.error(msg);
    }
  };

  const exportWingCSV = () => {
    if (wingFiltered.length === 0) { toast.info('No data to Export'); return; }
    const headers = ['ID', 'Building Name', 'Wing Name', 'No. of Floors', 'No. of Flats', 'Status', 'Created At'];
    const rows = wingFiltered.map((w) => [w.w_id, `"${w.building ?? ''}"`, w.w_name, w.floor_count, w.flat_count, w.w_is_active ? 'Active' : 'Inactive', formatDate(w.w_created_at)]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: 'wings.csv' }).click();
    URL.revokeObjectURL(url);
    toast.success('Wing CSV Exported Successfully', { autoClose: 1000 });
  };

  // wing pagination
  const wingTotal = wingFiltered.length;
  const wingTotalPages = Math.max(1, Math.ceil(wingTotal / wingLimit));
  const wingSafePage = Math.min(wingPage, wingTotalPages);
  const wingStart = (wingSafePage - 1) * wingLimit;
  const wingRows = wingFiltered.slice(wingStart, wingStart + wingLimit);
  const wingFrom = wingTotal === 0 ? 0 : wingStart + 1;
  const wingTo = Math.min(wingStart + wingLimit, wingTotal);
  const wingPageBtns = () => { const s = Math.max(1, Math.min(wingSafePage - 2, wingTotalPages - 4)); return Array.from({ length: Math.min(5, wingTotalPages) }, (_, i) => s + i); };

  // ── pagination footer renderer ─────────────────────────────────────────
  const PaginationFooter = ({
    limit, setLimit, setPage, safePage, totalPages,
    from, to, total, pageBtns,
  }: {
    limit: number; setLimit: (n: number) => void; setPage: (p: number) => void;
    safePage: number; totalPages: number; from: number; to: number; total: number;
    pageBtns: () => number[];
  }) => (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" style={{ borderTop: `1px solid ${t.divider}` }}>
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 13, color: t.textPrimary }}>Rows per page:</span>
        <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
          style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 8, padding: '4px 8px', fontSize: 13, cursor: 'pointer', outline: 'none' }}>
          {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <span style={{ fontSize: 13, color: t.textPrimary }}>Showing {from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1}
          style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${t.surfaceBorder}`, background: t.btnSecondaryBg, color: t.textPrimary, cursor: safePage === 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}>Prev</button>
        {pageBtns().map((pg) => (
          <button key={pg} onClick={() => setPage(pg)}
            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${pg === safePage ? '#2563eb' : t.surfaceBorder}`, background: pg === safePage ? '#2563eb' : t.btnSecondaryBg, color: pg === safePage ? '#fff' : t.textPrimary, cursor: 'pointer', fontSize: 13, fontWeight: pg === safePage ? 700 : 400 }}>
            {pg}
          </button>
        ))}
        <button onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage >= totalPages}
          style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${t.surfaceBorder}`, background: t.btnSecondaryBg, color: t.textPrimary, cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', fontSize: 13 }}>Next</button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: t.fontFamily }}>

      {/* ════════════════════════════════════════
          BUILDING DETAILS ACCORDION
      ════════════════════════════════════════ */}
      <div style={accordionCard}>
        <div style={accordionHeader(bldgAccordion.isOpen)}>
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ flex: '1 1 180px', maxWidth: 300, background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
            <MdSearch size={16} style={{ color: t.textPrimary, flexShrink: 0 }} />
            <input type="text" placeholder="Search by building name, location..."
              value={bldgSearch} onChange={(e) => setBldgSearch(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 13, width: '100%' }} />
          </div>

          {/* Title */}
          <div className="flex items-center gap-2" onClick={bldgAccordion.toggle} style={{ cursor: 'pointer', userSelect: 'none', flex: '0 0 auto' }}>
            <MdBusiness size={22} style={{ color: '#2563eb' }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary, fontFamily: t.fontFamily }}>Building Details</span>
            <MdKeyboardArrowDown size={22} style={{ color: t.textPrimary, transition: 'transform 0.3s ease', transform: bldgAccordion.isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2" style={{ flex: '0 0 auto' }}>
            <button onClick={() => navigate('/admin/masters/building/add')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <MdAdd size={18} /> Add Building
            </button>
            <button onClick={exportBuildingCSV} title="Export CSV" className="p-2 rounded-xl"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer', color: t.textSecondary }}><MdDownload size={18} /></button>
            <button onClick={fetchBuildings} title="Refresh" className="p-2 rounded-xl"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer', color: t.textSecondary }}><MdRefresh size={18} className={bldgLoading ? 'animate-spin' : ''} /></button>
          </div>
        </div>

        {/* Building accordion body */}
        <div style={{ height: typeof bldgAccordion.contentHeight === 'number' ? `${bldgAccordion.contentHeight}px` : 'auto', overflow: 'hidden', transition: 'height 0.35s ease' }}>
          <div ref={bldgAccordion.contentRef}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr style={{ background: t.tableHeaderBg }}>
                    {['ID', 'Building Name', 'Location', 'Status', 'Created At'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.textPrimary, borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.textPrimary, borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap', position: 'sticky', right: 0, zIndex: 2, background: t.tableHeaderBg, borderLeft: `2px solid ${t.divider}`, boxShadow: '-4px 0 8px rgba(0,0,0,0.06)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bldgLoading ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: t.textPrimary }}>Loading...</td></tr>
                  ) : bldgRows.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: t.textPrimary }}>{bldgSearch ? 'No buildings match your search.' : 'No buildings found.'}</td></tr>
                  ) : bldgRows.map((b, idx) => {
                    const rowBg = idx % 2 === 0 ? t.surfaceBg : t.tableHeaderBg;
                    return (
                      <tr key={b.id} style={{ background: rowBg, borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#d1d5db'}`, transition: 'background 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = t.tableRowHover)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textSecondary }}>{b.id}</td>
                        <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary, fontWeight: 500 }}>{b.name}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textSecondary }}>{b.address ?? '—'}</td>
                        <td style={{ padding: '12px 16px' }}>{statusBadge(b.is_active)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatDate(b.created_at)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap', position: 'sticky', right: 0, zIndex: 1, background: stickyBg, borderLeft: `2px solid ${t.divider}`, boxShadow: '-4px 0 8px rgba(0,0,0,0.06)' }}>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => navigate(`/admin/masters/building/view/${b.id}`)} title="View" style={iconBtn}><MdVisibility size={18} /></button>
                            <button onClick={() => navigate(`/admin/masters/building/edit/${b.id}`)} title="Edit" style={iconBtn}><MdEdit size={18} /></button>
                            <button onClick={() => handleDeleteBuilding(b)} title="Delete" style={iconBtn}><MdDelete size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationFooter limit={bldgLimit} setLimit={setBldgLimit} setPage={setBldgPage} safePage={bldgSafePage} totalPages={bldgTotalPages} from={bldgFrom} to={bldgTo} total={bldgTotal} pageBtns={bldgPageBtns} />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          WING DETAILS ACCORDION
      ════════════════════════════════════════ */}
      <div style={accordionCard}>
        <div style={accordionHeader(wingAccordion.isOpen)}>
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ flex: '1 1 180px', maxWidth: 300, background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
            <MdSearch size={16} style={{ color: t.textPrimary, flexShrink: 0 }} />
            <input type="text" placeholder="Search by wing name, building..."
              value={wingSearch} onChange={(e) => setWingSearch(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 13, width: '100%' }} />
          </div>

          {/* Title */}
          <div className="flex items-center gap-2" onClick={wingAccordion.toggle} style={{ cursor: 'pointer', userSelect: 'none', flex: '0 0 auto' }}>
            <MdBusiness size={22} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary, fontFamily: t.fontFamily }}>Wing Details</span>
            <MdKeyboardArrowDown size={22} style={{ color: t.textPrimary, transition: 'transform 0.3s ease', transform: wingAccordion.isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2" style={{ flex: '0 0 auto' }}>
            <button onClick={() => navigate('/admin/masters/wing/add')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <MdAdd size={18} /> Add Wing
            </button>
            <button onClick={exportWingCSV} title="Export CSV" className="p-2 rounded-xl"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer', color: t.textSecondary }}><MdDownload size={18} /></button>
            <button onClick={fetchWings} title="Refresh" className="p-2 rounded-xl"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer', color: t.textSecondary }}><MdRefresh size={18} className={wingLoading ? 'animate-spin' : ''} /></button>
          </div>
        </div>

        {/* Wing accordion body */}
        <div style={{ height: typeof wingAccordion.contentHeight === 'number' ? `${wingAccordion.contentHeight}px` : 'auto', overflow: 'hidden', transition: 'height 0.35s ease' }}>
          <div ref={wingAccordion.contentRef}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 750 }}>
                <thead>
                  <tr style={{ background: t.tableHeaderBg }}>
                    {['ID', 'Building Name', 'Wing Name', 'No. of Floors', 'No. of Flats', 'Status', 'Created At'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.textPrimary, borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.textPrimary, borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap', position: 'sticky', right: 0, zIndex: 2, background: t.tableHeaderBg, borderLeft: `2px solid ${t.divider}`, boxShadow: '-4px 0 8px rgba(0,0,0,0.06)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {wingLoading ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: t.textPrimary }}>Loading...</td></tr>
                  ) : wingRows.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: t.textPrimary }}>{wingSearch ? 'No wings match your search.' : 'No wings found.'}</td></tr>
                  ) : wingRows.map((w, idx) => {
                    const rowBg = idx % 2 === 0 ? t.surfaceBg : t.tableHeaderBg;
                    return (
                      <tr key={w.w_id} style={{ background: rowBg, borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#d1d5db'}`, transition: 'background 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = t.tableRowHover)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textSecondary }}>{w.w_id}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textSecondary }}>{w.building ?? '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary, fontWeight: 500 }}>{w.w_name}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textSecondary }}>{w.floor_count ?? '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textSecondary }}>{w.flat_count ?? '—'}</td>
                        <td style={{ padding: '12px 16px' }}>{statusBadge(w.w_is_active)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatDate(w.w_created_at)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap', position: 'sticky', right: 0, zIndex: 1, background: stickyBg, borderLeft: `2px solid ${t.divider}`, boxShadow: '-4px 0 8px rgba(0,0,0,0.06)' }}>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => navigate(`/admin/masters/wing/view/${w.w_id}`)} title="View" style={iconBtn}><MdVisibility size={18} /></button>
                            <button onClick={() => navigate(`/admin/masters/wing/edit/${w.w_id}`)} title="Edit" style={iconBtn}><MdEdit size={18} /></button>
                            <button onClick={() => handleDeleteWing(w)} title="Delete" style={iconBtn}><MdDelete size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationFooter limit={wingLimit} setLimit={setWingLimit} setPage={setWingPage} safePage={wingSafePage} totalPages={wingTotalPages} from={wingFrom} to={wingTo} total={wingTotal} pageBtns={wingPageBtns} />
          </div>
        </div>
      </div>

      {/* Floor Details and Flat Details will be added here */}

    </div>
  );
};

export default BuildingListPage;
