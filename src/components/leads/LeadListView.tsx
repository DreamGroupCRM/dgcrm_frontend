// src/components/leads/LeadListView.tsx
// Shared Leads list — used by both the Admin (full company view, employee
// filter, CSV import) and Employee (auto-scoped to own assigned leads by
// the backend, see leads.service.ts's resolveEmployeeScope) portals.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdAdd, MdDownload, MdUpload, MdRefresh, MdSearch, MdPerson, MdContentCopy,
} from 'react-icons/md';

import { useAppDispatch } from '../../hooks';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { setPageTitle } from '../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../styles/appearanceTokens';
import {
  fetchLeadList, fetchLeadStatusCounts, deleteLead, exportLeadsCSV, importLeadsCSV,
} from '../../services/leadService';
import { FetchEmployeeDetails } from '../../services/employeeDetailsService';
import { Lead, LeadStatus, LEAD_STATUSES, LEAD_STATUS_LABELS } from '../../types/index';
import { formatDate, showAlert } from '../../utils';
import MasterIconButtons from '../../components/masters/MasterIconButtons';
import SortableTh, { SortDir } from '../../components/masters/SortableTh';
import LeadStatusBadge from './LeadStatusBadge';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const ACTION_COL_WIDTH = 72;

type SortKey = 'name' | 'mobile_number' | 'status' | 'category' | 'budget' | 'created_at';

interface LeadListViewProps {
  portal: 'admin' | 'employee';
  basePath: string; // e.g. '/admin/crm/leads' or '/employee/leads'
}

const CATEGORY_OPTIONS = ['hot', 'warm', 'cold'];

const LeadListView: React.FC<LeadListViewProps> = ({ portal, basePath }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isDark, t, accent, cssVars, duplicateIcon } = useAppearanceTokens();
  const isAdmin = portal === 'admin';

  useEffect(() => { dispatch(setPageTitle('Leads')); }, [dispatch]);

  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [statusCounts, setStatusCounts] = useState<Partial<Record<LeadStatus, number>>>({});
  const [duplicateCount, setDuplicateCount] = useState(0);
  // Also drives the "All" pill's count — matches the pre-migration behavior,
  // where the same fetch's total already fed both the pill and (via the
  // capped-1000 row count) pagination, so this stays scoped to whatever
  // non-status filters (search/category/employee) are currently active.
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  // Debounced so typing a search term doesn't fire a real backend request
  // on every keystroke.
  const debouncedSearch = useDebouncedValue(search, 400);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all' | 'duplicate'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [employeeOptions, setEmployeeOptions] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, countsRes] = await Promise.all([
        fetchLeadList(page, limit, {
          search: debouncedSearch.trim() || undefined,
          category: categoryFilter || undefined,
          employee_id: isAdmin ? (employeeFilter || undefined) : undefined,
          status: statusFilter !== 'all' && statusFilter !== 'duplicate' ? statusFilter : undefined,
          is_duplicate: statusFilter === 'duplicate' ? true : undefined,
          sort: sortKey,
          sort_dir: sortDir,
        }),
        fetchLeadStatusCounts(),
      ]);
      if (listRes.success) {
        setAllLeads(listRes.rows ?? []);
        setTotal(listRes.total ?? 0);
      } else {
        toast.error('Failed to fetch leads');
      }
      if (countsRes.success) {
        setStatusCounts(countsRes.data ?? {});
        setDuplicateCount(countsRes.duplicateCount ?? 0);
      }
    } catch {
      toast.error('Failed to fetch leads. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, categoryFilter, employeeFilter, statusFilter, sortKey, sortDir, isAdmin]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { setPage(1); }, [debouncedSearch, categoryFilter, employeeFilter, statusFilter]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Employee filter dropdown — admin only.
  useEffect(() => {
    if (!isAdmin) return;
    FetchEmployeeDetails(1, 500, undefined, true)
      .then((res) => { if (res.success) setEmployeeOptions(res.rows.map((e) => ({ id: e.id, name: `${e.first_name} ${e.last_name}`.trim() }))); })
      .catch(() => { /* dropdown staying empty is a harmless degrade */ });
  }, [isAdmin]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const pageRows = allLeads;

  const pageBtns = () => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  };

  const handleDelete = async (lead: Lead) => {
    const result = await showAlert.confirm(`This will permanently delete "${lead.name}".`, 'Delete Lead?');
    if (!result.isConfirmed) return;
    try {
      await deleteLead(lead.id);
      toast.success('Lead Deleted Successfully');
      fetchLeads();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to delete lead.');
    }
  };

  const handleExport = async () => {
    try {
      await exportLeadsCSV();
    } catch {
      toast.error('Failed to export leads.');
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      const res = await importLeadsCSV(file);
      toast.success(res.message || `Import complete: ${res.success_count} succeeded, ${res.failed_count} failed`);
      fetchLeads();
    } catch {
      toast.error('Failed to import CSV.');
    } finally {
      setImporting(false);
    }
  };

  const pillStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap', border: `1px solid ${active ? accent : t.surfaceBorder}`,
    background: active ? accent : t.insetBg, color: active ? '#fff' : t.textPrimary,
  });

  return (
    // cssVars (from useAppearanceTokens) are set here, on this page's own
    // root element only — CSS custom properties cascade to descendants,
    // so .master-btn-primary / .master-search-box-accent / .master-table
    // (all shared classes used by every other list page too) pick up the
    // selected appearance ONLY inside this subtree. No other page sets
    // these variables, so they keep resolving to master.css's unchanged
    // :root-fallback defaults — i.e. today's exact look.
    <div className="master-page" style={cssVars}>
      <div className="master-topbar">
        <div className="master-search-box master-search-box-accent" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
          <MdSearch size={18} style={{ color: t.textPrimary, flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by name, mobile, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="master-search-input"
            style={{ color: t.inputText }}
          />
        </div>

        <div className="master-actions" style={{ flexWrap: 'wrap' }}>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, padding: '8px 10px', color: t.inputText, fontSize: 12.5 }}>
            <option value="">All Temperatures</option>
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
          </select>

          {isAdmin && (
            <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, padding: '8px 10px', color: t.inputText, fontSize: 12.5 }}>
              <option value="">All Employees</option>
              {employeeOptions.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          )}

          <button type="button" onClick={() => navigate(`${basePath}/add`)} className="master-btn-primary">
            <MdAdd size={18} /> Add Lead
          </button>
          {isAdmin && (
            <>
              <button type="button" onClick={handleImportClick} title="Import CSV" disabled={importing} className="master-btn-icon"
                style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}>
                <MdUpload size={18} className={importing ? 'animate-spin' : ''} />
              </button>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportFile} style={{ display: 'none' }} />
            </>
          )}
          <button type="button" onClick={handleExport} title="Export CSV" className="master-btn-icon"
            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}>
            <MdDownload size={18} />
          </button>
          <button type="button" onClick={fetchLeads} title="Refresh" className="master-btn-icon"
            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}>
            <MdRefresh size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Pipeline status pill bar ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 16px' }}>
        <div style={pillStyle(statusFilter === 'all')} onClick={() => setStatusFilter('all')}>
          All <span style={{ opacity: 0.75 }}>({total})</span>
        </div>
        {LEAD_STATUSES.map((s) => (
          <div key={s} style={pillStyle(statusFilter === s)} onClick={() => setStatusFilter(s)}>
            {LEAD_STATUS_LABELS[s]} <span style={{ opacity: 0.75 }}>({statusCounts[s] ?? 0})</span>
          </div>
        ))}
        <div style={pillStyle(statusFilter === 'duplicate')} onClick={() => setStatusFilter('duplicate')}>
          <MdContentCopy size={13} /> Duplicates <span style={{ opacity: 0.75 }}>({duplicateCount})</span>
        </div>
      </div>

      <div className="master-table-card" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="master-table-scroll">
          <table className="master-table" style={{ minWidth: 980 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.insetBg }}>
                <th className="master-table-actions-th master-table-header-gradient" style={{
                  width: ACTION_COL_WIDTH, minWidth: ACTION_COL_WIDTH, maxWidth: ACTION_COL_WIDTH,
                  background: t.insetBg, borderRight: `2px solid ${t.divider}`, boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
                }}>Action</th>
                <SortableTh label="Name" active={sortKey === 'name'} dir={sortDir} onClick={() => toggleSort('name')} />
                <SortableTh label="Mobile" active={sortKey === 'mobile_number'} dir={sortDir} onClick={() => toggleSort('mobile_number')} />
                <SortableTh label="Temperature" active={sortKey === 'category'} dir={sortDir} onClick={() => toggleSort('category')} />
                <SortableTh label="Status" active={sortKey === 'status'} dir={sortDir} onClick={() => toggleSort('status')} />
                <th className="master-table-th">Source</th>
                <SortableTh label="Budget" active={sortKey === 'budget'} dir={sortDir} onClick={() => toggleSort('budget')} />
                <th className="master-table-th">Project</th>
                <th className="master-table-th">Assigned To</th>
                <SortableTh label="Created On" active={sortKey === 'created_at'} dir={sortDir} onClick={() => toggleSort('created_at')} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ padding: 28, textAlign: 'center' }}>Loading leads...</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 28, textAlign: 'center' }}>No leads found.</td></tr>
              ) : (
                pageRows.map((l) => (
                  <tr key={l.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                    <td className="master-table-actions-td" style={{
                      width: ACTION_COL_WIDTH, minWidth: ACTION_COL_WIDTH, maxWidth: ACTION_COL_WIDTH,
                      background: t.surfaceBg, borderRight: `2px solid ${t.divider}`, boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
                    }}>
                      <MasterIconButtons
                        onView={() => navigate(`${basePath}/view/${l.id}`)}
                        onEdit={() => navigate(`${basePath}/edit/${l.id}`)}
                        onDelete={isAdmin ? () => handleDelete(l) : undefined}
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <MdPerson size={16} className="master-row-icon" />
                        <span style={{ fontWeight: 700 }}>{l.name}</span>
                        {l.is_duplicate && (
                          <span title="Possible duplicate lead" style={{ color: duplicateIcon, display: 'inline-flex' }}>
                            <MdContentCopy size={13} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{l.mobile_number || '—'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{l.category || '—'}</td>
                    <td><LeadStatusBadge status={l.status} isDark={isDark} /></td>
                    <td style={{ textTransform: 'capitalize' }}>{l.source || '—'}</td>
                    <td>{l.budget != null ? `₹${Number(l.budget).toLocaleString('en-IN')}` : '—'}</td>
                    <td>{l.project_name || '—'}</td>
                    <td>{l.assigned_to || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(l.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="master-pagination" style={{ borderTop: `1px solid ${t.divider}` }}>
          <div className="flex items-center gap-2" style={{ fontSize: 11.5, color: t.textSecondary }}>
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, padding: '4px 8px', color: t.inputText, fontSize: 11.5 }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div style={{ fontSize: 11.5, color: t.textSecondary }}>
            Showing {total === 0 ? 0 : (safePage - 1) * limit + 1}–{Math.min(safePage * limit, total)} of {total}
          </div>

          <div className="flex items-center gap-1.5">
            <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: safePage <= 1 ? 'not-allowed' : 'pointer', opacity: safePage <= 1 ? 0.5 : 1 }}>
              Prev
            </button>
            {pageBtns().map((n) => (
              <button key={n} type="button" onClick={() => setPage(n)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{
                  background: n === safePage ? accent : t.insetBg,
                  color: n === safePage ? '#fff' : t.textPrimary,
                  border: `1px solid ${n === safePage ? accent : t.surfaceBorder}`, cursor: 'pointer',
                }}>
                {n}
              </button>
            ))}
            <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages ? 0.5 : 1 }}>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadListView;
