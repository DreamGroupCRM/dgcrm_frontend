// ==========================================
// DREAM GROUP CRM - AUDIT HISTORY PAGE
// ==========================================
// Read-only trail of who did what to which record — every create/update/
// delete across Customer/Department/Designation/Company/Bank/Building/...
// already writes here via recordAudit() (see shared/audit.ts); this page
// is the first place any of it gets shown back (item 11).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  MdHistory, MdAdd, MdEdit, MdDelete, MdRefresh, MdVisibility, MdClose,
  MdFilterList, MdChevronLeft, MdChevronRight, MdKeyboardDoubleArrowLeft, MdKeyboardDoubleArrowRight,
} from 'react-icons/md';

import { useAppDispatch, useAppSelector } from '../../../hooks';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { AppTheme } from '../../../styles/theme';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import StatCard from '../../../components/masters/StatCard';
import { fetchAuditLogList, fetchAuditEntityTypes, AuditLogEntry } from '../../../services/auditService';
import { formatLastLogin } from '../../../utils';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const FILTER_LABEL_STYLE: React.CSSProperties = { display: 'block', fontSize: 10.5, fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 };
const dateFieldStyle = (t: AppTheme): React.CSSProperties => ({
  width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText,
  borderRadius: 10, padding: '8px 10px', fontSize: 11.5, outline: 'none', colorScheme: 'auto',
});

const ACTION_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  create: { label: 'Create', color: '#16a34a', bg: '#dcfce7', icon: MdAdd },
  update: { label: 'Update', color: '#7c3aed', bg: '#ede9fe', icon: MdEdit },
  delete: { label: 'Delete', color: '#dc2626', bg: '#fee2e2', icon: MdDelete },
};
const actionMeta = (action: string) => ACTION_META[action] ?? { label: action, color: '#64748b', bg: '#f1f5f9', icon: MdHistory };

const ActionBadge: React.FC<{ action: string }> = ({ action }) => {
  const m = actionMeta(action);
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full font-semibold" style={{ background: m.bg, color: m.color, fontSize: 10.5 }}>
      <Icon size={12} /> {m.label}
    </span>
  );
};

// Old/new value diff — only rows that actually changed are highlighted,
// so a 40-field entity update doesn't drown the 2 fields that moved.
const ValueDiff: React.FC<{ t: AppTheme; isDark: boolean; oldValues: Record<string, unknown> | null; newValues: Record<string, unknown> | null }> = ({ t, isDark, oldValues, newValues }) => {
  const keys = Array.from(new Set([...Object.keys(oldValues ?? {}), ...Object.keys(newValues ?? {})])).sort();
  if (keys.length === 0) return <p style={{ fontSize: 12, color: t.textSecondary }}>No field-level detail recorded for this entry.</p>;
  const fmt = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));
  return (
    <div style={{ maxHeight: 360, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${t.divider}` }}>
            <th style={{ textAlign: 'left', padding: '6px 8px', color: t.textSecondary, fontWeight: 700 }}>Field</th>
            <th style={{ textAlign: 'left', padding: '6px 8px', color: t.textSecondary, fontWeight: 700 }}>Before</th>
            <th style={{ textAlign: 'left', padding: '6px 8px', color: t.textSecondary, fontWeight: 700 }}>After</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => {
            const before = oldValues?.[k];
            const after = newValues?.[k];
            const changed = oldValues && newValues ? fmt(before) !== fmt(after) : true;
            return (
              <tr key={k} style={{ borderBottom: `1px solid ${t.divider}`, background: changed ? (isDark ? 'rgba(234,179,8,0.06)' : '#fffbeb') : 'transparent' }}>
                <td style={{ padding: '5px 8px', fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap' }}>{k}</td>
                <td style={{ padding: '5px 8px', color: t.textSecondary, wordBreak: 'break-word' }}>{oldValues ? fmt(before) : '—'}</td>
                <td style={{ padding: '5px 8px', color: t.textPrimary, wordBreak: 'break-word', fontWeight: changed ? 700 : 400 }}>{newValues ? fmt(after) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const AuditHistoryPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isDark, t, cssVars } = useAppearanceTokens();

  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  // Debounced so typing a search term doesn't fire a real backend request
  // on every keystroke — this page is server-paginated/-filtered (unlike
  // most other list pages, which filter an already-fetched batch in
  // memory), so every keystroke here was a real network round trip.
  const debouncedSearch = useDebouncedValue(search, 400);

  // Lightweight per-action counts for the KPI row — limit=1 so each call
  // only needs the response's `total`, not the actual rows.
  const [counts, setCounts] = useState<{ total: number; create: number; update: number; delete: number }>({ total: 0, create: 0, update: 0, delete: 0 });

  useEffect(() => { dispatch(setPageTitle('Audit History')); }, [dispatch]);

  useEffect(() => {
    (async () => {
      try { setEntityTypes(await fetchAuditEntityTypes()); } catch { /* filter just stays empty */ }
    })();
  }, []);

  const fetchCounts = useCallback(async () => {
    try {
      const [all, create, update, del] = await Promise.all([
        fetchAuditLogList(1, 1),
        fetchAuditLogList(1, 1, { action: 'create' }),
        fetchAuditLogList(1, 1, { action: 'update' }),
        fetchAuditLogList(1, 1, { action: 'delete' }),
      ]);
      setCounts({ total: all.total, create: create.total, update: update.total, delete: del.total });
    } catch { /* KPI row just stays at 0 if this fails */ }
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAuditLogList(page, limit, {
        entity_type: entityTypeFilter, action: actionFilter, date_from: fromDate, date_to: toDate, search: debouncedSearch,
      });
      if (res.success) { setRows(res.rows ?? []); setTotal(res.total ?? 0); }
      else toast.error('Failed to fetch audit history.');
    } catch {
      toast.error('Failed to fetch audit history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, entityTypeFilter, actionFilter, fromDate, toDate, debouncedSearch]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);
  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { setPage(1); }, [entityTypeFilter, actionFilter, fromDate, toDate, debouncedSearch]);

  const clearFilters = () => { setEntityTypeFilter(''); setActionFilter(''); setFromDate(''); setToDate(''); setSearch(''); };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const pageBtns = useMemo(() => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [safePage, totalPages]);

  const [detailEntry, setDetailEntry] = useState<AuditLogEntry | null>(null);

  return (
    <div style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Events" value={counts.total} icon={MdHistory} color="#7c3aed" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Creates" value={counts.create} icon={MdAdd} color="#16a34a" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Updates" value={counts.update} icon={MdEdit} color="#0284c7" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Deletes" value={counts.delete} icon={MdDelete} color="#dc2626" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
      </div>

      <div className="rounded-2xl mb-5 p-5" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex items-center gap-2.5 -m-5 mb-4 px-5 py-3.5 rounded-t-2xl" style={{ background: 'var(--grad-sky)' }}>
          <MdFilterList size={18} style={{ color: '#fff', flexShrink: 0 }} />
          <h3 style={{ fontSize: 14.5, fontWeight: 800, color: '#fff', margin: 0 }}>Filter Audit History</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label style={{ ...FILTER_LABEL_STYLE, color: t.textSecondary }}>Entity Type</label>
            <select value={entityTypeFilter} onChange={(e) => setEntityTypeFilter(e.target.value)}
              style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 10px', fontSize: 11.5, outline: 'none' }}>
              <option value="">All entity types</option>
              {entityTypes.map((et) => <option key={et} value={et}>{et}</option>)}
            </select>
          </div>
          <div>
            <label style={{ ...FILTER_LABEL_STYLE, color: t.textSecondary }}>Action</label>
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
              style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 10px', fontSize: 11.5, outline: 'none' }}>
              <option value="">All actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
          </div>
          <div>
            <label style={{ ...FILTER_LABEL_STYLE, color: t.textSecondary }}>Search (entity type / performed by)</label>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
              style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 10px', fontSize: 11.5, outline: 'none' }} />
          </div>
          <div>
            <label style={{ ...FILTER_LABEL_STYLE, color: t.textSecondary }}>From Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={dateFieldStyle(t)} />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label style={{ ...FILTER_LABEL_STYLE, color: t.textSecondary }}>To Date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={dateFieldStyle(t)} />
            </div>
            <button type="button" onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: 0 }}>Audit Trail</h3>
          <button type="button" onClick={() => { fetchRows(); fetchCounts(); }} title="Refresh"
            className="flex items-center justify-center rounded-xl"
            style={{ width: 36, height: 36, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
            <MdRefresh size={17} />
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                {['Date / Time', 'Entity Type', 'Entity ID', 'Action', 'Performed By', 'Details'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>Loading audit history...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>No audit events found.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: isDark ? '#fff' : '#000', whiteSpace: 'nowrap' }}>{formatLastLogin(r.created_at)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: isDark ? '#fff' : '#000' }}>{r.entity_type}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary }}>{r.entity_id ?? '—'}</td>
                    <td style={{ padding: '12px 14px' }}><ActionBadge action={r.action} /></td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: isDark ? '#fff' : '#000' }}>
                      {r.performed_by_name || r.performed_by_email || (r.performed_by ? `User #${r.performed_by}` : 'System')}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button type="button" title="View field-level detail" onClick={() => setDetailEntry(r)} className="master-icon-btn">
                        <MdVisibility size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-4" style={{ borderTop: `1px solid ${t.divider}` }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 11, color: t.textSecondary }}>Rows per page:</span>
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 8, padding: '4px 8px', fontSize: 11, cursor: 'pointer', outline: 'none' }}>
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary }}>
            Showing {total === 0 ? 0 : (safePage - 1) * limit + 1}–{Math.min(safePage * limit, total)} of {total}
          </div>
          <div className="flex-1 flex items-center justify-center gap-1.5">
            <button type="button" disabled={safePage <= 1} onClick={() => setPage(1)}
              className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: safePage <= 1 ? 'not-allowed' : 'pointer', opacity: safePage <= 1 ? 0.5 : 1 }}>
              <MdKeyboardDoubleArrowLeft size={16} />
            </button>
            <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: safePage <= 1 ? 'not-allowed' : 'pointer', opacity: safePage <= 1 ? 0.5 : 1 }}>
              <MdChevronLeft size={18} />
            </button>
            {pageBtns[0] > 1 && <span style={{ color: t.textSecondary, padding: '0 2px' }}>...</span>}
            {pageBtns.map((n) => (
              <button key={n} type="button" onClick={() => setPage(n)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: n === safePage ? '#7c3aed' : t.insetBg, color: n === safePage ? '#fff' : t.textPrimary, border: `1px solid ${n === safePage ? '#7c3aed' : t.surfaceBorder}`, cursor: 'pointer' }}>
                {n}
              </button>
            ))}
            {pageBtns[pageBtns.length - 1] < totalPages && <span style={{ color: t.textSecondary, padding: '0 2px' }}>...</span>}
            <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages ? 0.5 : 1 }}>
              <MdChevronRight size={18} />
            </button>
            <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(totalPages)}
              className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages ? 0.5 : 1 }}>
              <MdKeyboardDoubleArrowRight size={16} />
            </button>
          </div>
          <div style={{ width: 90 }} />
        </div>
      </div>

      {detailEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setDetailEntry(null)}>
          <div className="rounded-2xl w-full" style={{ maxWidth: 600, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <div>
                <div className="flex items-center gap-2" style={{ fontSize: 15, fontWeight: 800, color: t.textPrimary }}>
                  {detailEntry.entity_type} <ActionBadge action={detailEntry.action} />
                </div>
                <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 3 }}>
                  {formatLastLogin(detailEntry.created_at)} · {detailEntry.performed_by_name || detailEntry.performed_by_email || 'System'}
                </div>
              </div>
              <button type="button" onClick={() => setDetailEntry(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 4, display: 'flex' }}>
                <MdClose size={20} />
              </button>
            </div>
            <div className="p-5">
              <ValueDiff t={t} isDark={isDark} oldValues={detailEntry.old_values} newValues={detailEntry.new_values} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditHistoryPage;
