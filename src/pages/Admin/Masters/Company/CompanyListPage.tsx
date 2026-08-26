// ==========================================
// DREAM GROUP CRM - COMPANY LIST PAGE
// ==========================================
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdAdd, MdDelete, MdDownload, MdEdit, MdRefresh,
  MdSearch, MdVisibility, MdBusiness, MdMoreVert,
} from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme, AppTheme } from '../../../../styles/theme';
import { companyService } from '../../../../services/companyService';
import { Company } from '../../../../types';
import { formatDate, showAlert } from '../../../../utils';
import { ROUTES } from '../../../../constants';
import MasterIconButtons from '../../../../components/masters/MasterIconButtons';
import SortableTh from '../../../../components/masters/SortableTh';
import { useSortedRows } from '../../../../components/masters/useSortedRows';

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

type SortKey = 'id' | 'name' | 'email' | 'phone' | 'city' | 'created_at';
>>>>>>> V_14.0

const CompanyListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { mode } = useAppSelector((s) => s.theme);
  const isDark   = mode === 'dark';
  const t        = getTheme(isDark);
  const isMobile = useIsMobileTable();
  const actionColWidth = isMobile ? ACTION_COL_WIDTH_MOBILE : ACTION_COL_WIDTH;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [filtered, setFiltered]   = useState<Company[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [page, setPage]           = useState(1);
  const [limit, setLimit]         = useState(5);

  useEffect(() => { dispatch(setPageTitle('Company')); }, [dispatch]);

  // Fetch ALL once (same client-side search/sort/paginate pattern as every
  // other master) rather than paging server-side — needed so "sort by any
  // column" and "newest first by default" both apply across the whole
  // dataset, not just whatever page the server happened to return.
  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await companyService.FetchCompanyList(1, 1000);
      if (res.success) {
        setCompanies(res.rows ?? []);
      } else {
        toast.error(res.message || 'Failed to fetch companies');
      }
    } catch {
      toast.error('Failed to fetch companies. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    setFiltered(q ? companies.filter((c) => c.name.toLowerCase().includes(q)) : companies);
    setPage(1);
  }, [search, companies]);

  // Default sort: newest first (item 5) — a newly-added company appears at
  // the top of the table until the user picks a different column.
  const getSortValue = (c: Company, key: SortKey): string | number => {
    switch (key) {
      case 'id': return Number(c.id);
      case 'name': return c.name?.toLowerCase() || '';
      case 'email': return c.email?.toLowerCase() || '';
      case 'phone': return c.phone || '';
      case 'city': return c.city?.toLowerCase() || '';
      case 'created_at': return c.created_at || '';
    }
  };
  const { sorted, sortKey, sortDir, toggleSort } = useSortedRows<Company, SortKey>(filtered, getSortValue, 'created_at', 'desc');

  const handleDelete = async (company: Company) => {
    const result = await showAlert.confirm(
      `Are you sure you want to delete "${company.name}"?`,
      'Delete Company?'
    );
    if (!result.isConfirmed) return;
    try {
      const res = await companyService.DeleteCompany(company.id);
      if (res.success) {
        toast.success('Company Deleted Successfully', { autoClose: 1000 });
        fetchCompanies();
      } else {
        toast.error(res.message || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete company. Please try again.');
    }
  };

  const exportCSV = () => {
    const headers = [
      'ID', 'Company Name', 'Email', 'Phone',
      'City', 'State', 'Country', 'GST', 'PAN', 'Created At',
    ];
    const rows = sorted.map((c) => [
      c.id, `"${c.name}"`, c.email, c.phone,
      c.city || '', c.state || '', c.country || '', c.gst || '', c.pan || '',
      formatDate(c.created_at),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a   = Object.assign(document.createElement('a'), { href: url, download: 'companies.csv' });
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Company List CSV Exported Successfully', { autoClose: 1000 });
  };

  // ── pagination (client-side) ─────────────────────────────────────────────
  const totalFiltered = sorted.length;
  const totalPages    = Math.max(1, Math.ceil(totalFiltered / limit));
  const safePage      = Math.min(page, totalPages);
  const startIdx      = (safePage - 1) * limit;
  const pageRows       = sorted.slice(startIdx, startIdx + limit);
  const showingFrom    = totalFiltered === 0 ? 0 : startIdx + 1;
  const showingTo      = Math.min(startIdx + limit, totalFiltered);

  const pageBtns = () => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  };

  const stickyBg = isDark ? t.surfaceBg : '#ffffff';

  return (
    <div className="master-page">

      <div className="master-topbar">
        <div className="master-search-box" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
          <MdSearch size={18} style={{ color: t.textPrimary, flexShrink: 0 }} />
          <input type="text" placeholder="Search by Company Name..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="master-search-input" style={{ color: t.inputText }} />
        </div>

        <div className="master-actions">
          <button onClick={() => navigate(`${ROUTES.ADMIN.COMPANY}/add`)} className="master-btn-primary">
            <MdAdd size={18} /> Add Company
          </button>
          <button onClick={exportCSV} title="Export CSV" className="master-btn-icon"
            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}>
            <MdDownload size={18} />
          </button>
          <button onClick={fetchCompanies} title="Refresh" className="master-btn-icon"
            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}>
            <MdRefresh size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="master-table-card" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="master-table-scroll">
          <table className="master-table" style={{ minWidth: 1250 }}>
            <thead>
              <tr style={{ background: t.tableHeaderBg }}>
<<<<<<< HEAD
                {/* STICKY Actions — now the first column; vertical right border marks the sticky boundary */}
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
                  width: ACTION_COL_WIDTH, minWidth: ACTION_COL_WIDTH, maxWidth: ACTION_COL_WIDTH,
                  borderBottom: `1px solid ${t.divider}`, zIndex: 2, background: t.tableHeaderBg,
                  borderRight: `2px solid ${t.divider}`, boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
>>>>>>> V_14.0
                }}>
                  {isMobile ? '#' : 'Actions'}
                </th>
<<<<<<< HEAD
                {[
                  'ID', 'Company', 'Email', 'Phone',
                  'City', 'State', 'Country', 'GST', 'PAN', 'Created At',
                ].map((h) => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: 14, fontWeight: 700, textTransform: 'camelcase',
                    letterSpacing: '0.05em', color: t.textPrimary,
                    borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap',
                  }}>{h}</th>
=======
                <SortableTh label="ID" active={sortKey === 'id'} dir={sortDir} onClick={() => toggleSort('id')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <SortableTh label="Company Name" active={sortKey === 'name'} dir={sortDir} onClick={() => toggleSort('name')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <SortableTh label="Email" active={sortKey === 'email'} dir={sortDir} onClick={() => toggleSort('email')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <SortableTh label="Phone" active={sortKey === 'phone'} dir={sortDir} onClick={() => toggleSort('phone')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <SortableTh label="City" active={sortKey === 'city'} dir={sortDir} onClick={() => toggleSort('city')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                {['State', 'Country', 'GST', 'PAN'].map((h) => (
                  <th key={h} style={{ borderBottom: `1px solid ${t.divider}` }}>{h}</th>
>>>>>>> V_14.0
                ))}
                <SortableTh label="Created At" active={sortKey === 'created_at'} dir={sortDir} onClick={() => toggleSort('created_at')} style={{ borderBottom: `1px solid ${t.divider}` }} />
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 48, color: t.textPrimary }}>Loading...</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 48, color: t.textPrimary }}>
                  {search ? 'No companies match your search.' : 'No companies found.'}
                </td></tr>
              ) : (
                pageRows.map((company, idx) => {
                  const rowBg = idx % 2 === 0 ? t.surfaceBg : t.tableHeaderBg;
                  return (
                    <tr key={company.id}
                      style={{ background: rowBg, borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#d1d5db'}`, transition: 'background 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = t.tableRowHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}>

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
                              onView={() => navigate(`${ROUTES.ADMIN.COMPANY}/view/${company.id}`)}
                              onEdit={() => navigate(`${ROUTES.ADMIN.COMPANY}/edit/${company.id}`)}
                              onDelete={() => handleDelete(company)}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => navigate(`${ROUTES.ADMIN.COMPANY}/view/${company.id}`)} title="View" style={iconBtn}><MdVisibility size={17} /></button>
                            <button onClick={() => navigate(`${ROUTES.ADMIN.COMPANY}/edit/${company.id}`)} title="Edit" style={iconBtn}><MdEdit size={17} /></button>
                            <button onClick={() => handleDelete(company)} title="Delete" style={iconBtn}><MdDelete size={17} /></button>
                          </div>
                        )}
=======
                      <td className="master-table-actions-td" style={{
                        width: ACTION_COL_WIDTH, minWidth: ACTION_COL_WIDTH, maxWidth: ACTION_COL_WIDTH,
                        zIndex: 1, background: stickyBg,
                        borderRight: `2px solid ${t.divider}`, boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
                      }}>
                        <MasterIconButtons
                          onView={() => navigate(`${ROUTES.ADMIN.COMPANY}/view/${company.id}`)}
                          onEdit={() => navigate(`${ROUTES.ADMIN.COMPANY}/edit/${company.id}`)}
                          onDelete={() => handleDelete(company)}
                        />
>>>>>>> V_14.0
                      </td>

                      <td>{company.id}</td>

                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}` }}>
                            {company.logo_url && company.logo_url !== 'string' ? (
                              <img src={company.logo_url} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <MdBusiness size={16} className="master-row-icon" />
                            )}
                          </div>
                          <span>{company.name}</span>
                        </div>
                      </td>

<<<<<<< HEAD
                      <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary }}>{company.email || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary, whiteSpace: 'nowrap' }}>{company.phone || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary, whiteSpace: 'nowrap' }}>{company.city || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary, whiteSpace: 'nowrap' }}>{company.state || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary, whiteSpace: 'nowrap' }}>{company.country || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary, whiteSpace: 'nowrap', fontFamily: 'monospace', textTransform: 'camelcase' }}>{company.gst || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary, whiteSpace: 'nowrap', fontFamily: 'monospace', textTransform: 'camelcase' }}>{company.pan || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary, whiteSpace: 'nowrap' }}>{formatDate(company.created_at)}</td>
=======
                      <td>{company.email || '—'}</td>
                      <td>{company.phone || '—'}</td>
                      <td>{company.city || '—'}</td>
                      <td>{company.state || '—'}</td>
                      <td>{company.country || '—'}</td>
                      <td style={{ fontFamily: 'monospace' }}>{company.gst || '—'}</td>
                      <td style={{ fontFamily: 'monospace' }}>{company.pan || '—'}</td>
                      <td>{formatDate(company.created_at)}</td>
>>>>>>> V_14.0
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

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

export default CompanyListPage;
