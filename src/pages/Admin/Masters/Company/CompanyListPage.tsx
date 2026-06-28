// ==========================================
// DREAM GROUP CRM - COMPANY LIST PAGE
// ==========================================
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdAdd, MdDelete, MdDownload, MdEdit, MdRefresh,
  MdSearch, MdVisibility, MdBusiness,
} from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme } from '../../../../styles/theme';
import { companyService } from '../../../../services/companyService';
import { Company } from '../../../../types';
import { formatDate, showAlert } from '../../../../utils';
import { ROUTES } from '../../../../constants';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

// All 3 action icons use the same dark-grey color
const ACTION_ICON_COLOR = '#4b5563';

const CompanyListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { mode } = useAppSelector((s) => s.theme);
  const isDark   = mode === 'dark';
  const t        = getTheme(isDark);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [filtered, setFiltered]   = useState<Company[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [page, setPage]           = useState(1);
  const [limit, setLimit]         = useState(10);
  const [total, setTotal]         = useState(0);

  useEffect(() => { dispatch(setPageTitle('Company')); }, [dispatch]);

  const fetchCompanies = useCallback(async (pg: number, lim: number) => {
    setLoading(true);
    try {
      const res = await companyService.getAll(pg, lim);
      if (res.success) {
        setCompanies(res.rows ?? []);
        setTotal(res.total ?? 0);
        toast.success('Company list fetched successfully', { autoClose: 1000 });
      } else {
        toast.error(res.message || 'Failed to fetch companies');
      }
    } catch {
      toast.error('Failed to fetch companies. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompanies(page, limit); }, [page, limit, fetchCompanies]);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    setFiltered(q ? companies.filter((c) => c.name.toLowerCase().includes(q)) : companies);
  }, [search, companies]);

  const handleDelete = async (company: Company) => {
    const result = await showAlert.confirm(
      `Are you sure you want to delete "${company.name}"?`,
      'Delete Company?'
    );
    if (!result.isConfirmed) return;
    try {
      const res = await companyService.remove(company.id);
      if (res.success) {
        toast.success('Company Deleted Successfully', { autoClose: 1000 });
        fetchCompanies(page, limit);
      } else {
        toast.error(res.message || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete company. Please try again.');
    }
  };

  const exportCSV = () => {
    const headers = ['ID', 'Company Name', 'Email', 'Phone', 'Created At'];
    const rows    = filtered.map((c) => [c.id, `"${c.name}"`, c.email, c.phone, formatDate(c.created_at)]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a   = Object.assign(document.createElement('a'), { href: url, download: 'companies.csv' });
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageBtns   = () => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  };

  // Same dark-grey for all 3 action icons
  const iconBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    color: ACTION_ICON_COLOR, padding: 6, borderRadius: 6,
    display: 'inline-flex', alignItems: 'center',
  };

  const stickyBg = isDark ? t.surfaceBg : '#ffffff';

  return (
    <div style={{ fontFamily: t.fontFamily }}>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ flex: '1 1 200px', maxWidth: 320, background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
          <MdSearch size={18} style={{ color: t.textMuted, flexShrink: 0 }} />
          <input type="text" placeholder="Search by company name..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 14, width: '100%' }} />
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <button onClick={() => navigate(`${ROUTES.ADMIN.COMPANY}/add`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', cursor: 'pointer' }}>
            <MdAdd size={18} /> Add Company
          </button>
          <button onClick={exportCSV} title="Export CSV" className="p-2 rounded-xl"
            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer', color: t.textSecondary }}>
            <MdDownload size={18} />
          </button>
          <button onClick={() => fetchCompanies(page, limit)} title="Refresh" className="p-2 rounded-xl"
            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer', color: t.textSecondary }}>
            <MdRefresh size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', position: 'relative' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
            <thead>
              <tr style={{ background: t.tableHeaderBg }}>
                {['ID', 'Company', 'Email', 'Phone', 'Created At'].map((h) => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.05em', color: t.textMuted,
                    borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}

                {/* STICKY Actions — vertical left border marks the sticky boundary */}
                <th style={{
                  padding: '12px 16px', textAlign: 'center',
                  fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.05em', color: t.textMuted,
                  borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap',
                  position: 'sticky', right: 0, zIndex: 2,
                  // background: t.tableHeaderBg,
                  // borderLeft: `2px solid ${t.divider}`,
                  boxShadow: '-4px 0 8px rgba(0,0,0,0.06)',
                }}>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: t.textMuted }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: t.textMuted }}>
                  {search ? 'No companies match your search.' : 'No companies found.'}
                </td></tr>
              ) : (
                filtered.map((company, idx) => {
                  const rowBg = idx % 2 === 0 ? t.surfaceBg : t.tableHeaderBg;
                  return (
                    <tr key={company.id}
                      style={{ background: rowBg, borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#d1d5db'}`, transition: 'background 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = t.tableRowHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}>

                      <td style={{ padding: '12px 16px', fontSize: 13, color: t.textSecondary, whiteSpace: 'nowrap' }}>{company.id}</td>

                      <td style={{ padding: '12px 16px' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}` }}>
                            {company.logo_url && company.logo_url !== 'string' ? (
                              <img src={company.logo_url} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <MdBusiness size={16} style={{ color: '#2563eb' }} />
                            )}
                          </div>
                          <span style={{ fontSize: 14, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                            {company.name}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px', fontSize: 13, color: t.textSecondary }}>{company.email || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: t.textSecondary, whiteSpace: 'nowrap' }}>{company.phone || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatDate(company.created_at)}</td>

                      {/* STICKY Actions cell */}
                      <td style={{
                        padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap',
                        position: 'sticky', right: 0, zIndex: 1,
                        // background: stickyBg,
                        // borderLeft: `2px solid ${t.divider}`,
                        boxShadow: '-4px 0 8px rgba(0,0,0,0.06)',
                      }}>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => navigate(`${ROUTES.ADMIN.COMPANY}/view/${company.id}`)} title="View" style={iconBtn}><MdVisibility size={18} /></button>
                          <button onClick={() => navigate(`${ROUTES.ADMIN.COMPANY}/edit/${company.id}`)} title="Edit" style={iconBtn}><MdEdit size={18} /></button>
                          <button onClick={() => handleDelete(company)} title="Delete" style={iconBtn}><MdDelete size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" style={{ borderTop: `1px solid ${t.divider}` }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 13, color: t.textMuted }}>Rows per page:</span>
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 8, padding: '4px 8px', fontSize: 13, cursor: 'pointer', outline: 'none' }}>
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <span style={{ fontSize: 13, color: t.textMuted }}>
            Showing {filtered.length === 0 ? 0 : (page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </span>

          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${t.surfaceBorder}`, background: t.btnSecondaryBg, color: page === 1 ? t.textMuted : t.textPrimary, cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}>Prev</button>
            {pageBtns().map((pg) => (
              <button key={pg} onClick={() => setPage(pg)}
                style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${pg === page ? '#2563eb' : t.surfaceBorder}`, background: pg === page ? '#2563eb' : t.btnSecondaryBg, color: pg === page ? '#fff' : t.textPrimary, cursor: 'pointer', fontSize: 13, fontWeight: pg === page ? 700 : 400 }}>
                {pg}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${t.surfaceBorder}`, background: t.btnSecondaryBg, color: page >= totalPages ? t.textMuted : t.textPrimary, cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: 13 }}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyListPage;