// src/pages/Admin/Masters/Building/BuildingListPage.tsx
// Contains: Building Details accordion + Wing Details accordion

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdAdd, MdDelete, MdDownload, MdEdit, MdRefresh,
  MdSearch, MdVisibility, MdKeyboardArrowDown, MdBusiness,
} from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { useAccordion } from '../../../../hooks/useAccordion';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme } from '../../../../styles/theme';
import { iconBtnStyle, getAccordionCardStyle, getAccordionHeaderStyle, StatusBadge } from '../../../../components/common/MasterListUI';
import PaginationFooter from '../../../../components/common/PaginationFooter';
import { fetchBuildingList, deleteBuilding } from '../../../../services/buildingService';
import { fetchWingList, deleteWing } from '../../../../services/wingService';
import { fetchFloorList, deleteFloor } from '../../../../services/floorService';
import { fetchFlatList, deleteFlat } from '../../../../services/flatService';
import { Building, Wing, Floor, Flat } from '../../../../types/index';
import { formatDate, showAlert } from '../../../../utils';

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
  const iconBtn = iconBtnStyle;
  const statusBadge = (isActive: boolean) => <StatusBadge isActive={isActive} t={t} isDark={isDark} />;
  const accordionCard = getAccordionCardStyle(t);
  const accordionHeader = (isOpen: boolean) => getAccordionHeaderStyle(t, isOpen);

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
      fetchWings();   // cascades: building -> wing -> floor -> flat
      fetchFloors();
      fetchFlats();
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
      fetchWings();   // cascades: wing -> floor -> flat
      fetchFloors();
      fetchFlats();
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

  // ══════════════════════════════════════════════════════════════════════
  // FLOOR STATE
  // ══════════════════════════════════════════════════════════════════════
  const floorAccordion = useAccordion(true);
  const [allFloors, setAllFloors] = useState<Floor[]>([]);
  const [floorFiltered, setFloorFiltered] = useState<Floor[]>([]);
  const [floorSearch, setFloorSearch] = useState('');
  const [floorLoading, setFloorLoading] = useState(false);
  const [floorPage, setFloorPage] = useState(1);
  const [floorLimit, setFloorLimit] = useState(5);

  const fetchFloors = useCallback(async () => {
    setFloorLoading(true);
    try {
      const res = await fetchFloorList(1, 1000);
      if (res.success) setAllFloors(res.rows ?? []);
      else toast.error('Failed to Fetch Floors');
    } catch (e) {
      toast.error('Failed to fetch floors. Please try again.');
    } finally {
      setFloorLoading(false);
    }
  }, []);

  useEffect(() => { fetchFloors(); }, [fetchFloors]);

  useEffect(() => {
    const q = floorSearch.trim().toLowerCase();
    setFloorFiltered(q ? allFloors.filter((f) =>
      (f.f_name ?? '').toLowerCase().includes(q) ||
      (f.wing ?? '').toLowerCase().includes(q) ||
      (f.building ?? '').toLowerCase().includes(q)
    ) : allFloors);
    setFloorPage(1);
  }, [floorSearch, allFloors]);

  useEffect(() => { floorAccordion.recalc(); }, [floorFiltered, floorPage, floorLimit]);

  const handleDeleteFloor = async (floor: Floor) => {
    const result = await showAlert.confirm(`Are you sure you want to delete "${floor.f_name}"?`, 'Delete Floor?');
    if (!result.isConfirmed) return;
    try {
      await deleteFloor(String(floor.f_id));
      toast.success('Floor Deleted Successfully', { autoClose: 1000 });
      fetchFloors();   // cascades: floor -> flat
      fetchFlats();
      fetchWings();    // refresh parent wing's floor_count/flat_count
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed to delete floor. Please try again.';
      toast.error(msg);
    }
  };

  const exportFloorCSV = () => {
    if (floorFiltered.length === 0) { toast.info('No data to Export'); return; }
    const headers = ['ID', 'Building Name', 'Wing Name', 'Floor Name', 'No. of Flats', 'Status'];
    const rows = floorFiltered.map((f) => [f.f_id, `"${f.building ?? ''}"`, `"${f.wing ?? ''}"`, `"${f.f_name}"`, f.flat_count, f.f_is_active ? 'Active' : 'Inactive']);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: 'floors.csv' }).click();
    URL.revokeObjectURL(url);
    toast.success('Floor CSV Exported Successfully', { autoClose: 1000 });
  };

  // floor pagination
  const floorTotal = floorFiltered.length;
  const floorTotalPages = Math.max(1, Math.ceil(floorTotal / floorLimit));
  const floorSafePage = Math.min(floorPage, floorTotalPages);
  const floorStart = (floorSafePage - 1) * floorLimit;
  const floorRows = floorFiltered.slice(floorStart, floorStart + floorLimit);
  const floorFrom = floorTotal === 0 ? 0 : floorStart + 1;
  const floorTo = Math.min(floorStart + floorLimit, floorTotal);
  const floorPageBtns = () => { const s = Math.max(1, Math.min(floorSafePage - 2, floorTotalPages - 4)); return Array.from({ length: Math.min(5, floorTotalPages) }, (_, i) => s + i); };

  // ══════════════════════════════════════════════════════════════════════
  // FLAT STATE
  // ══════════════════════════════════════════════════════════════════════
  const flatAccordion = useAccordion(true);
  const [allFlats, setAllFlats] = useState<Flat[]>([]);
  const [flatFiltered, setFlatFiltered] = useState<Flat[]>([]);
  const [flatSearch, setFlatSearch] = useState('');
  const [flatLoading, setFlatLoading] = useState(false);
  const [flatPage, setFlatPage] = useState(1);
  const [flatLimit, setFlatLimit] = useState(5);

  const fetchFlats = useCallback(async () => {
    setFlatLoading(true);
    try {
      const res = await fetchFlatList(1, 1000);
      if (res.success) setAllFlats(res.rows ?? []);
      else toast.error('Failed to Fetch Flats');
    } catch (e) {
      toast.error('Failed to fetch flats. Please try again.');
    } finally {
      setFlatLoading(false);
    }
  }, []);

  useEffect(() => { fetchFlats(); }, [fetchFlats]);

  useEffect(() => {
    const q = flatSearch.trim().toLowerCase();
    setFlatFiltered(q ? allFlats.filter((f) =>
      (f.fl_flat_number ?? '').toLowerCase().includes(q) ||
      (f.wing ?? '').toLowerCase().includes(q) ||
      (f.building ?? '').toLowerCase().includes(q)
    ) : allFlats);
    setFlatPage(1);
  }, [flatSearch, allFlats]);

  useEffect(() => { flatAccordion.recalc(); }, [flatFiltered, flatPage, flatLimit]);

  const handleDeleteFlat = async (flat: Flat) => {
    const result = await showAlert.confirm(`Delete flat "${flat.fl_flat_number}"?`, 'Delete Flat?');
    if (!result.isConfirmed) return;
    try {
      await deleteFlat(String(flat.fl_id));
      toast.success('Flat Deleted Successfully', { autoClose: 1000 });
      fetchFlats();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed to delete flat. Please try again.';
      toast.error(msg);
    }
  };

  const exportFlatCSV = () => {
    if (flatFiltered.length === 0) { toast.info('No data to Export'); return; }
    const headers = ['ID', 'Building Name', 'Wing Name', 'Floor Name', 'Flat No.', 'Type', 'Area (sq.ft)', 'Status'];
    const rows = flatFiltered.map((f) => [f.fl_id, `"${f.building ?? ''}"`, `"${f.wing ?? ''}"`, `"${f.floor ?? ''}"`, f.fl_flat_number, `"${f.fl_flat_type ?? ''}"`, f.fl_area_sqft ?? '', f.fl_status]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: 'flats.csv' }).click();
    URL.revokeObjectURL(url);
    toast.success('Flat CSV Exported Successfully', { autoClose: 1000 });
  };

  // flat pagination
  const flatTotal = flatFiltered.length;
  const flatTotalPages = Math.max(1, Math.ceil(flatTotal / flatLimit));
  const flatSafePage = Math.min(flatPage, flatTotalPages);
  const flatStart = (flatSafePage - 1) * flatLimit;
  const flatRows = flatFiltered.slice(flatStart, flatStart + flatLimit);
  const flatFrom = flatTotal === 0 ? 0 : flatStart + 1;
  const flatTo = Math.min(flatStart + flatLimit, flatTotal);
  const flatPageBtns = () => { const s = Math.max(1, Math.min(flatSafePage - 2, flatTotalPages - 4)); return Array.from({ length: Math.min(5, flatTotalPages) }, (_, i) => s + i); };

  const flatStatusBadge = (status: string) => {
    const map: Record<string, [string, string]> = {
      vacant: [isDark ? 'rgba(59,130,246,0.14)' : '#dbeafe', isDark ? '#93c5fd' : '#1d4ed8'],
      occupied: [isDark ? 'rgba(234,179,8,0.14)' : '#fef9c3', isDark ? '#fde047' : '#a16207'],
      sold: [isDark ? 'rgba(34,197,94,0.12)' : '#dcfce7', isDark ? '#4ade80' : '#16a34a'],
    };
    const [bg, color] = map[status] ?? [isDark ? '#222' : '#eee', isDark ? '#ccc' : '#333'];
    return (
      <span style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: bg, color, textTransform: 'capitalize' }}>
        {status}
      </span>
    );
  };

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
            <PaginationFooter t={t} limit={bldgLimit} setLimit={setBldgLimit} setPage={setBldgPage} safePage={bldgSafePage} totalPages={bldgTotalPages} from={bldgFrom} to={bldgTo} total={bldgTotal} pageBtns={bldgPageBtns} />
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
            <PaginationFooter t={t} limit={wingLimit} setLimit={setWingLimit} setPage={setWingPage} safePage={wingSafePage} totalPages={wingTotalPages} from={wingFrom} to={wingTo} total={wingTotal} pageBtns={wingPageBtns} />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          FLOOR DETAILS ACCORDION
      ════════════════════════════════════════ */}
      <div style={accordionCard}>
        <div style={accordionHeader(floorAccordion.isOpen)}>
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ flex: '1 1 180px', maxWidth: 300, background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
            <MdSearch size={16} style={{ color: t.textPrimary, flexShrink: 0 }} />
            <input type="text" placeholder="Search by floor name, wing, building..."
              value={floorSearch} onChange={(e) => setFloorSearch(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 13, width: '100%' }} />
          </div>

          {/* Title */}
          <div className="flex items-center gap-2" onClick={floorAccordion.toggle} style={{ cursor: 'pointer', userSelect: 'none', flex: '0 0 auto' }}>
            <MdBusiness size={22} style={{ color: '#059669' }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary, fontFamily: t.fontFamily }}>Floor Details</span>
            <MdKeyboardArrowDown size={22} style={{ color: t.textPrimary, transition: 'transform 0.3s ease', transform: floorAccordion.isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2" style={{ flex: '0 0 auto' }}>
            <button onClick={() => navigate('/admin/masters/floor/add')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#059669,#10b981)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <MdAdd size={18} /> Add Floor
            </button>
            <button onClick={exportFloorCSV} title="Export CSV" className="p-2 rounded-xl"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer', color: t.textSecondary }}><MdDownload size={18} /></button>
            <button onClick={fetchFloors} title="Refresh" className="p-2 rounded-xl"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer', color: t.textSecondary }}><MdRefresh size={18} className={floorLoading ? 'animate-spin' : ''} /></button>
          </div>
        </div>

        {/* Floor accordion body */}
        <div style={{ height: typeof floorAccordion.contentHeight === 'number' ? `${floorAccordion.contentHeight}px` : 'auto', overflow: 'hidden', transition: 'height 0.35s ease' }}>
          <div ref={floorAccordion.contentRef}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 750 }}>
                <thead>
                  <tr style={{ background: t.tableHeaderBg }}>
                    {['ID', 'Building Name', 'Wing Name', 'Floor Name', 'No. of Flats', 'Status'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.textPrimary, borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.textPrimary, borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap', position: 'sticky', right: 0, zIndex: 2, background: t.tableHeaderBg, borderLeft: `2px solid ${t.divider}`, boxShadow: '-4px 0 8px rgba(0,0,0,0.06)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {floorLoading ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: t.textPrimary }}>Loading...</td></tr>
                  ) : floorRows.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: t.textPrimary }}>{floorSearch ? 'No floors match your search.' : 'No floors found.'}</td></tr>
                  ) : floorRows.map((f, idx) => {
                    const rowBg = idx % 2 === 0 ? t.surfaceBg : t.tableHeaderBg;
                    return (
                      <tr key={f.f_id} style={{ background: rowBg, borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#d1d5db'}`, transition: 'background 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = t.tableRowHover)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textSecondary }}>{f.f_id}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textSecondary }}>{f.building ?? '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textSecondary }}>{f.wing ?? '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary, fontWeight: 500 }}>{f.f_name}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textSecondary }}>{f.flat_count ?? '—'}</td>
                        <td style={{ padding: '12px 16px' }}>{statusBadge(f.f_is_active)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap', position: 'sticky', right: 0, zIndex: 1, background: stickyBg, borderLeft: `2px solid ${t.divider}`, boxShadow: '-4px 0 8px rgba(0,0,0,0.06)' }}>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => navigate(`/admin/masters/floor/view/${f.f_id}`)} title="View" style={iconBtn}><MdVisibility size={18} /></button>
                            <button onClick={() => navigate(`/admin/masters/floor/edit/${f.f_id}`)} title="Edit" style={iconBtn}><MdEdit size={18} /></button>
                            <button onClick={() => handleDeleteFloor(f)} title="Delete" style={iconBtn}><MdDelete size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationFooter t={t} limit={floorLimit} setLimit={setFloorLimit} setPage={setFloorPage} safePage={floorSafePage} totalPages={floorTotalPages} from={floorFrom} to={floorTo} total={floorTotal} pageBtns={floorPageBtns} />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          FLAT DETAILS ACCORDION
      ════════════════════════════════════════ */}
      <div style={accordionCard}>
        <div style={accordionHeader(flatAccordion.isOpen)}>
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ flex: '1 1 180px', maxWidth: 300, background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
            <MdSearch size={16} style={{ color: t.textPrimary, flexShrink: 0 }} />
            <input type="text" placeholder="Search by flat no., wing, building..."
              value={flatSearch} onChange={(e) => setFlatSearch(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 13, width: '100%' }} />
          </div>

          {/* Title */}
          <div className="flex items-center gap-2" onClick={flatAccordion.toggle} style={{ cursor: 'pointer', userSelect: 'none', flex: '0 0 auto' }}>
            <MdBusiness size={22} style={{ color: '#7c3aed' }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary, fontFamily: t.fontFamily }}>Flat Details</span>
            <MdKeyboardArrowDown size={22} style={{ color: t.textPrimary, transition: 'transform 0.3s ease', transform: flatAccordion.isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2" style={{ flex: '0 0 auto' }}>
            <button onClick={() => navigate('/admin/masters/flat/add')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <MdAdd size={18} /> Add Flat
            </button>
            <button onClick={exportFlatCSV} title="Export CSV" className="p-2 rounded-xl"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer', color: t.textSecondary }}><MdDownload size={18} /></button>
            <button onClick={fetchFlats} title="Refresh" className="p-2 rounded-xl"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer', color: t.textSecondary }}><MdRefresh size={18} className={flatLoading ? 'animate-spin' : ''} /></button>
          </div>
        </div>

        {/* Flat accordion body */}
        <div style={{ height: typeof flatAccordion.contentHeight === 'number' ? `${flatAccordion.contentHeight}px` : 'auto', overflow: 'hidden', transition: 'height 0.35s ease' }}>
          <div ref={flatAccordion.contentRef}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 850 }}>
                <thead>
                  <tr style={{ background: t.tableHeaderBg }}>
                    {['ID', 'Building Name', 'Wing Name', 'Floor Name', 'Flat No.', 'Type', 'Area (sq.ft)', 'Status'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.textPrimary, borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.textPrimary, borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap', position: 'sticky', right: 0, zIndex: 2, background: t.tableHeaderBg, borderLeft: `2px solid ${t.divider}`, boxShadow: '-4px 0 8px rgba(0,0,0,0.06)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {flatLoading ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48, color: t.textPrimary }}>Loading...</td></tr>
                  ) : flatRows.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48, color: t.textPrimary }}>{flatSearch ? 'No flats match your search.' : 'No flats found.'}</td></tr>
                  ) : flatRows.map((f, idx) => {
                    const rowBg = idx % 2 === 0 ? t.surfaceBg : t.tableHeaderBg;
                    return (
                      <tr key={f.fl_id} style={{ background: rowBg, borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#d1d5db'}`, transition: 'background 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = t.tableRowHover)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textSecondary }}>{f.fl_id}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textSecondary }}>{f.building ?? '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textSecondary }}>{f.wing ?? '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textSecondary }}>{f.floor ?? '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary, fontWeight: 500 }}>{f.fl_flat_number}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textSecondary }}>{f.fl_flat_type ?? '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textSecondary }}>{f.fl_area_sqft ?? '—'}</td>
                        <td style={{ padding: '12px 16px' }}>{flatStatusBadge(f.fl_status)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap', position: 'sticky', right: 0, zIndex: 1, background: stickyBg, borderLeft: `2px solid ${t.divider}`, boxShadow: '-4px 0 8px rgba(0,0,0,0.06)' }}>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => navigate(`/admin/masters/flat/view/${f.fl_id}`)} title="View" style={iconBtn}><MdVisibility size={18} /></button>
                            <button onClick={() => navigate(`/admin/masters/flat/edit/${f.fl_id}`)} title="Edit" style={iconBtn}><MdEdit size={18} /></button>
                            <button onClick={() => handleDeleteFlat(f)} title="Delete" style={iconBtn}><MdDelete size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationFooter t={t} limit={flatLimit} setLimit={setFlatLimit} setPage={setFlatPage} safePage={flatSafePage} totalPages={flatTotalPages} from={flatFrom} to={flatTo} total={flatTotal} pageBtns={flatPageBtns} />
          </div>
        </div>
      </div>

    </div>
  );
};

export default BuildingListPage;
