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

import { useAppDispatch, useAppSelector } from '../../hooks';
import { setPageTitle } from '../../redux/slices/uiSlice';
import { getTheme } from '../../styles/theme';
import {
  fetchLeadList, fetchLeadStatusCounts, deleteLead, exportLeadsCSV, importLeadsCSV,
} from '../../services/leadService';
import { FetchEmployeeDetails } from '../../services/employeeDetailsService';
import { Lead, LeadStatus, LEAD_STATUSES, LEAD_STATUS_LABELS } from '../../types/index';
import { formatDate, showAlert } from '../../utils';
import MasterIconButtons from '../../components/masters/MasterIconButtons';
import SortableTh from '../../components/masters/SortableTh';
import { useSortedRows } from '../../components/masters/useSortedRows';
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
  const { mode } = useAppSelector((s) => s.theme);
  const isDark = mode === 'dark';
  const t = getTheme(isDark);
  const isAdmin = portal === 'admin';

  useEffect(() => { dispatch(setPageTitle('Leads')); }, [dispatch]);

  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [statusCounts, setStatusCounts] = useState<Partial<Record<LeadStatus, number>>>({});
  const [totalAll, setTotalAll] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all' | 'duplicate'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [employeeOptions, setEmployeeOptions] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, countsRes] = await Promise.all([
        fetchLeadList(1, 1000, {
          search: search.trim() || undefined,
          category: categoryFilter || undefined,
          employee_id: isAdmin ? (employeeFilter || undefined) : undefined,
          status: statusFilter !== 'all' && statusFilter !== 'duplicate' ? statusFilter : undefined,
          is_duplicate: statusFilter === 'duplicate' ? true : undefined,
        }),
        fetchLeadStatusCounts(),
      ]);
      if (listRes.success) {
        setAllLeads(listRes.rows ?? []);
        setTotalAll(listRes.total ?? 0);
      } else {
        toast.error('Failed to fetch leads');
      }
      if (countsRes.success) setStatusCounts(countsRes.data ?? {});
    } catch {
      toast.error('Failed to fetch leads. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, employeeFilter, statusFilter, isAdmin]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { setPage(1); }, [search, categoryFilter, employeeFilter, statusFilter]);

  // Employee filter dropdown — admin only.
  useEffect(() => {
    if (!isAdmin) return;
    FetchEmployeeDetails(1, 500, undefined, true)
      .then((res) => { if (res.success) setEmployeeOptions(res.rows.map((e) => ({ id: e.id, name: `${e.first_name} ${e.last_name}`.trim() }))); })
      .catch(() => { /* dropdown staying empty is a harmless degrade */ });
  }, [isAdmin]);

  const getSortValue = (l: Lead, key: SortKey): string | number => {
    switch (key) {
      case 'name': return l.name?.toLowerCase() || '';
      case 'mobile_number': return l.mobile_number || '';
      case 'status': return l.status || '';
      case 'category': return l.category || '';
      case 'budget': return l.budget ?? 0;
      case 'created_at': return l.created_at || '';
    }
  };
  const { sorted, sortKey, sortDir, toggleSort } = useSortedRows<Lead, SortKey>(allLeads, getSortValue, 'created_at', 'desc');

  const totalFiltered = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * limit, safePage * limit);

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

  const duplicateCount = allLeads.filter((l) => l.is_duplicate).length;

  const pillStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap', border: `1px solid ${active ? '#4338ca' : t.surfaceBorder}`,
    background: active ? '#4338ca' : t.insetBg, color: active ? '#fff' : t.textPrimary,
  });

  return (
    <div className="master-page">
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
          All <span style={{ opacity: 0.75 }}>({totalAll})</span>
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
                          <span title="Possible duplicate lead" style={{ color: '#dc2626', display: 'inline-flex' }}>
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
            Showing {totalFiltered === 0 ? 0 : (safePage - 1) * limit + 1}–{Math.min(safePage * limit, totalFiltered)} of {totalFiltered}
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
                  background: n === safePage ? '#4338ca' : t.insetBg,
                  color: n === safePage ? '#fff' : t.textPrimary,
                  border: `1px solid ${n === safePage ? '#4338ca' : t.surfaceBorder}`, cursor: 'pointer',
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
