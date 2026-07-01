// src/pages/Admin/Masters/Designation/DesignationListPage.tsx

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdAdd, MdDelete, MdDownload, MdEdit, MdRefresh,
  MdSearch, MdVisibility,
} from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme } from '../../../../styles/theme';
import { fetchDesignationList, deleteDesignation } from '../../../../services/designationService';
import { Designation } from '../../../../types/index';
import { formatDate, showAlert } from '../../../../utils';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];
const ACTION_ICON_COLOR = '#4b5563';

const DesignationListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { mode } = useAppSelector((s) => s.theme);
  const isDark   = mode === 'dark';
  const t        = getTheme(isDark);

  const [allDesignations, setAllDesignations] = useState<Designation[]>([]);
  const [filtered, setFiltered]               = useState<Designation[]>([]);
  const [search, setSearch]                   = useState('');
  const [loading, setLoading]                 = useState(false);
  const [page, setPage]                       = useState(1);
  const [limit, setLimit]                     = useState(5);

  useEffect(() => { dispatch(setPageTitle('Designation')); }, [dispatch]);

  // ── fetch ALL once — client-side search ────────────────────────────────
  const fetchDesignations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchDesignationList(1, 1000);
      if (res.success) {
        setAllDesignations(res.rows ?? []);
      } else {
        toast.error('Failed to Fetch Designations');
      }
    } catch (e) {
      toast.error('Failed to fetch designations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDesignations(); }, [fetchDesignations]);

  // ── instant client-side filter — search by designation name ────────────
  useEffect(() => {
    const q = search.trim().toLowerCase();
    setFiltered(
      q
        ? allDesignations.filter(
            (d) =>
              d.name.toLowerCase().includes(q) ||
              (d.department ?? '').toLowerCase().includes(q)
          )
        : allDesignations
    );
    setPage(1);
  }, [search, allDesignations]);

  // ── delete ─────────────────────────────────────────────────────────────
  const handleDelete = async (desig: Designation) => {
    const result = await showAlert.confirm(
      `Are you sure you want to delete "${desig.name}"?`,
      'Delete Designation?'
    );
    if (!result.isConfirmed) return;
    try {
      const res = await deleteDesignation(desig.id);
      if (res.success) {
        toast.success('Designation Deleted Successfully', { autoClose: 1000 });
        fetchDesignations();
      } else {
        toast.error(res.message || 'Failed to Delete');
      }
    } catch (e) {
      toast.error('Failed to delete designation. Please try again.');
    }
  };

  // ── export CSV ─────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (filtered.length === 0) { toast.info('No data to Export'); return; }
    const headers = ['ID', 'Designation Name', 'Department', 'Status', 'Created At', 'Updated At'];
    const rows    = filtered.map((d) => [
      d.id,
      `"${d.name}"`,
      `"${d.department ?? ''}"`,
      d.is_active ? 'Active' : 'Inactive',
      formatDate(d.created_at),
      formatDate(d.updated_at),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a   = Object.assign(document.createElement('a'), { href: url, download: 'designations.csv' });
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Designation List CSV Exported Successfully', { autoClose: 1000 });
    console.log('[DesignationListPage] CSV exported, rows:', filtered.length);
  };

  // ── pagination ─────────────────────────────────────────────────────────
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

  const iconBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    color: ACTION_ICON_COLOR, padding: 6, borderRadius: 6,
    display: 'inline-flex', alignItems: 'center',
  };

  const stickyBg = isDark ? t.surfaceBg : '#ffffff';

  const statusBadge = (isActive: boolean) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
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

  return (
    <div style={{ fontFamily: t.fontFamily }}>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">

        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ flex: '1 1 200px', maxWidth: 320, background: t.inputBg, border: `1px solid ${t.inputBorder}` }}
        >
          <MdSearch size={18} style={{ color: t.textPrimary, flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by designation or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 14, width: '100%' }}
          />
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <button
            onClick={() => navigate('/admin/masters/designation/add')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', cursor: 'pointer' }}
          >
            <MdAdd size={18} /> Add Designation
          </button>

          <button onClick={exportCSV} title="Export CSV" className="p-2 rounded-xl"
            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer', color: t.textSecondary }}>
            <MdDownload size={18} />
          </button>

          <button onClick={fetchDesignations} title="Refresh" className="p-2 rounded-xl"
            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer', color: t.textSecondary }}>
            <MdRefresh size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Table card ──────────────────────────────────────────────────── */}
      <div style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', position: 'relative' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ background: t.tableHeaderBg }}>
                {['ID', 'Designation Name', 'Department', 'Status', 'Created At', 'Updated At'].map((h) => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.05em', color: t.textPrimary,
                    borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
                <th style={{
                  padding: '12px 16px', textAlign: 'center',
                  fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.05em', color: t.textPrimary,
                  borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap',
                  position: 'sticky', right: 0, zIndex: 2,
                  background: t.tableHeaderBg,
                  borderLeft: `2px solid ${t.divider}`,
                  boxShadow: '-4px 0 8px rgba(0,0,0,0.06)',
                }}>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: t.textPrimary }}>Loading...</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: t.textPrimary }}>
                  {search ? 'No designations match your search.' : 'No designations found.'}
                </td></tr>
              ) : (
                pageRows.map((desig, idx) => {
                  const rowBg = idx % 2 === 0 ? t.surfaceBg : t.tableHeaderBg;
                  return (
                    <tr
                      key={desig.id}
                      style={{ background: rowBg, borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#d1d5db'}`, transition: 'background 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = t.tableRowHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}
                    >
                      <td style={{ padding: '12px 16px', fontSize: 13, color: t.textPrimary }}>{desig.id}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary, fontWeight: 500 }}>{desig.name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: t.textPrimary }}>{desig.department ?? '—'}</td>
                      <td style={{ padding: '12px 16px' }}>{statusBadge(desig.is_active)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: t.textPrimary, whiteSpace: 'nowrap' }}>{formatDate(desig.created_at)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: t.textPrimary, whiteSpace: 'nowrap' }}>{formatDate(desig.updated_at)}</td>

                      {/* STICKY Actions */}
                      <td style={{
                        padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap',
                        position: 'sticky', right: 0, zIndex: 1,
                        background: stickyBg,
                        borderLeft: `2px solid ${t.divider}`,
                        boxShadow: '-4px 0 8px rgba(0,0,0,0.06)',
                      }}>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => navigate(`/admin/masters/designation/view/${desig.id}`)} title="View"><MdVisibility size={18} /></button>
                          <button onClick={() => navigate(`/admin/masters/designation/edit/${desig.id}`)} title="Edit"><MdEdit size={18} /></button>
                          <button onClick={() => handleDelete(desig)} title="Delete"><MdDelete size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" style={{ borderTop: `1px solid ${t.divider}` }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 13, color: t.textPrimary }}>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 8, padding: '4px 8px', fontSize: 13, cursor: 'pointer', outline: 'none' }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <span style={{ fontSize: 13, color: t.textPrimary }}>
            Showing {showingFrom}–{showingTo} of {totalFiltered}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
              style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${t.surfaceBorder}`, background: t.btnSecondaryBg, color: t.textPrimary, cursor: safePage === 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}
            >Prev</button>

            {pageBtns().map((pg) => (
              <button key={pg} onClick={() => setPage(pg)}
                style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${pg === safePage ? '#2563eb' : t.surfaceBorder}`, background: pg === safePage ? '#2563eb' : t.btnSecondaryBg, color: pg === safePage ? '#fff' : t.textPrimary, cursor: 'pointer', fontSize: 13, fontWeight: pg === safePage ? 700 : 400 }}
              >{pg}</button>
            ))}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
              style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${t.surfaceBorder}`, background: t.btnSecondaryBg, color: t.textPrimary, cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', fontSize: 13 }}
            >Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignationListPage;
