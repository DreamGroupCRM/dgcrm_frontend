// src/pages/Admin/Masters/ActionModule/ActionModuleListPage.tsx
// Contains: Action Master accordion + Module Master accordion

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdAdd, MdDownload, MdRefresh, MdSearch, MdKeyboardArrowDown, MdSettings, MdBolt,
} from 'react-icons/md';
import { useAppDispatch } from '../../../../hooks';
import { useAccordion } from '../../../../hooks/useAccordion';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import { getAccordionCardStyle, getAccordionHeaderStyle, StatusBadge } from '../../../../components/common/MasterListUI';
import PaginationFooter from '../../../../components/common/PaginationFooter';
import MasterIconButtons from '../../../../components/masters/MasterIconButtons';
import SortableTh from '../../../../components/masters/SortableTh';
import { useSortedRows } from '../../../../components/masters/useSortedRows';
import { fetchActionMasterList, deleteActionMaster } from '../../../../services/actionMasterService';
import { fetchModuleMasterList, deleteModuleMaster } from '../../../../services/moduleMasterService';
import { ActionMaster, ModuleMaster } from '../../../../types/index';
import { formatDate, showAlert } from '../../../../utils';

const ACTION_COL_WIDTH = 96;
type ModuleSortKey = 'm_id' | 'm_name' | 'm_slug' | 'm_sort_order' | 'm_created_at';
type ActionSortKey = 'id' | 'name' | 'code' | 'created_at';

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
const ActionModuleListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isDark, t, cssVars } = useAppearanceTokens();

  useEffect(() => { dispatch(setPageTitle('Action & Module')); }, [dispatch]);

  const statusBadge = (isActive: boolean) => <StatusBadge isActive={isActive} t={t} isDark={isDark} />;
  const accordionCard = getAccordionCardStyle(t);
  const accordionHeader = (isOpen: boolean) => getAccordionHeaderStyle(t, isOpen);

  // ══════════════════════════════════════════════════════════════════════
  // ACTION MASTER STATE
  // ══════════════════════════════════════════════════════════════════════
  const actionAccordion = useAccordion(true);
  const [allActions, setAllActions] = useState<ActionMaster[]>([]);
  const [actionFiltered, setActionFiltered] = useState<ActionMaster[]>([]);
  const [actionSearch, setActionSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionPage, setActionPage] = useState(1);
  const [actionLimit, setActionLimit] = useState(5);

  const fetchActions = useCallback(async () => {
    setActionLoading(true);
    try {
      const res = await fetchActionMasterList();
      if (res.success) setAllActions(res.rows ?? []);
      else toast.error('Failed to Fetch Actions');
    } catch (e) {
      toast.error('Failed to fetch actions. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }, []);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  useEffect(() => {
    const q = actionSearch.trim().toLowerCase();
    setActionFiltered(q ? allActions.filter((a) => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)) : allActions);
    setActionPage(1);
  }, [actionSearch, allActions]);

  const getActionSortValue = useCallback((a: ActionMaster, key: ActionSortKey): string | number => {
    switch (key) {
      case 'id': return Number(a.id);
      case 'name': return a.name?.toLowerCase() || '';
      case 'code': return a.code?.toLowerCase() || '';
      case 'created_at': return a.created_at || '';
    }
  }, []);
  const { sorted: actionSorted, sortKey: actionSortKey, sortDir: actionSortDir, toggleSort: toggleActionSort } =
    useSortedRows<ActionMaster, ActionSortKey>(actionFiltered, getActionSortValue, 'created_at', 'desc');

  useEffect(() => { actionAccordion.recalc(); }, [actionSorted, actionPage, actionLimit]);

  const handleDeleteAction = async (action: ActionMaster) => {
    const result = await showAlert.confirm(`Are you sure you want to delete "${action.name}"?`, 'Delete Action?');
    if (!result.isConfirmed) return;
    try {
      await deleteActionMaster(String(action.id));
      toast.success('Action Deleted Successfully', { autoClose: 1000 });
      fetchActions();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed to delete action. Please try again.';
      toast.error(msg);
    }
  };

  const exportActionCSV = () => {
    if (actionSorted.length === 0) { toast.info('No data to Export'); return; }
    const headers = ['ID', 'Name', 'Code', 'Description', 'Status', 'Created At'];
    const rows = actionSorted.map((a) => [a.id, `"${a.name}"`, a.code, `"${a.description ?? ''}"`, a.is_active ? 'Active' : 'Inactive', formatDate(a.created_at)]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: 'actions.csv' }).click();
    URL.revokeObjectURL(url);
    toast.success('Action CSV Exported Successfully', { autoClose: 1000 });
  };

  const actionTotal = actionSorted.length;
  const actionTotalPages = Math.max(1, Math.ceil(actionTotal / actionLimit));
  const actionSafePage = Math.min(actionPage, actionTotalPages);
  const actionStart = (actionSafePage - 1) * actionLimit;
  const actionRows = actionSorted.slice(actionStart, actionStart + actionLimit);
  const actionFrom = actionTotal === 0 ? 0 : actionStart + 1;
  const actionTo = Math.min(actionStart + actionLimit, actionTotal);
  const actionPageBtns = () => { const s = Math.max(1, Math.min(actionSafePage - 2, actionTotalPages - 4)); return Array.from({ length: Math.min(5, actionTotalPages) }, (_, i) => s + i); };

  // ══════════════════════════════════════════════════════════════════════
  // MODULE MASTER STATE
  // ══════════════════════════════════════════════════════════════════════
  const moduleAccordion = useAccordion(true);
  const [allModules, setAllModules] = useState<ModuleMaster[]>([]);
  const [moduleFiltered, setModuleFiltered] = useState<ModuleMaster[]>([]);
  const [moduleSearch, setModuleSearch] = useState('');
  const [moduleLoading, setModuleLoading] = useState(false);
  const [modulePage, setModulePage] = useState(1);
  const [moduleLimit, setModuleLimit] = useState(5);

  const fetchModules = useCallback(async () => {
    setModuleLoading(true);
    try {
      const res = await fetchModuleMasterList();
      if (res.success) setAllModules(res.rows ?? []);
      else toast.error('Failed to Fetch Modules');
    } catch (e) {
      toast.error('Failed to fetch modules. Please try again.');
    } finally {
      setModuleLoading(false);
    }
  }, []);

  useEffect(() => { fetchModules(); }, [fetchModules]);

  useEffect(() => {
    const q = moduleSearch.trim().toLowerCase();
    setModuleFiltered(q ? allModules.filter((m) => m.m_name.toLowerCase().includes(q) || m.m_slug.toLowerCase().includes(q)) : allModules);
    setModulePage(1);
  }, [moduleSearch, allModules]);

  const getModuleSortValue = useCallback((m: ModuleMaster, key: ModuleSortKey): string | number => {
    switch (key) {
      case 'm_id': return Number(m.m_id);
      case 'm_name': return m.m_name?.toLowerCase() || '';
      case 'm_slug': return m.m_slug?.toLowerCase() || '';
      case 'm_sort_order': return Number(m.m_sort_order) || 0;
      case 'm_created_at': return m.m_created_at || '';
    }
  }, []);
  const { sorted: moduleSorted, sortKey: moduleSortKey, sortDir: moduleSortDir, toggleSort: toggleModuleSort } =
    useSortedRows<ModuleMaster, ModuleSortKey>(moduleFiltered, getModuleSortValue, 'm_created_at', 'desc');

  useEffect(() => { moduleAccordion.recalc(); }, [moduleSorted, modulePage, moduleLimit]);

  const handleDeleteModule = async (m: ModuleMaster) => {
    const result = await showAlert.confirm(`Are you sure you want to delete "${m.m_name}"?`, 'Delete Module?');
    if (!result.isConfirmed) return;
    try {
      await deleteModuleMaster(String(m.m_id));
      toast.success('Module Deleted Successfully', { autoClose: 1000 });
      fetchModules();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed to delete module. Please try again.';
      toast.error(msg);
    }
  };

  const exportModuleCSV = () => {
    if (moduleSorted.length === 0) { toast.info('No data to Export'); return; }
    const headers = ['ID', 'Name', 'Description', 'Sort Order', 'Status', 'Created At'];
    const rows = moduleSorted.map((m) => [m.m_id, `"${m.m_name}"`, m.m_slug, m.m_sort_order, m.m_is_active ? 'Active' : 'Inactive', formatDate(m.m_created_at)]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: 'modules.csv' }).click();
    URL.revokeObjectURL(url);
    toast.success('Module CSV Exported Successfully', { autoClose: 1000 });
  };

  const moduleTotal = moduleSorted.length;
  const moduleTotalPages = Math.max(1, Math.ceil(moduleTotal / moduleLimit));
  const moduleSafePage = Math.min(modulePage, moduleTotalPages);
  const moduleStart = (moduleSafePage - 1) * moduleLimit;
  const moduleRows = moduleSorted.slice(moduleStart, moduleStart + moduleLimit);
  const moduleFrom = moduleTotal === 0 ? 0 : moduleStart + 1;
  const moduleTo = Math.min(moduleStart + moduleLimit, moduleTotal);
  const modulePageBtns = () => { const s = Math.max(1, Math.min(moduleSafePage - 2, moduleTotalPages - 4)); return Array.from({ length: Math.min(5, moduleTotalPages) }, (_, i) => s + i); };

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="master-page" style={{ fontFamily: t.fontFamily, ...cssVars }}>

      {/* ════════════════════════════════════════
          MODULE MASTER ACCORDION
      ════════════════════════════════════════ */}
      <div style={accordionCard}>
        <div style={accordionHeader(moduleAccordion.isOpen)}>
          <div className="master-search-box master-search-box-accent" style={{ flex: '1 1 180px', maxWidth: 300, background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
            <MdSearch size={16} style={{ color: t.textPrimary, flexShrink: 0 }} />
            <input type="text" placeholder="Search by module name, slug..."
              value={moduleSearch} onChange={(e) => setModuleSearch(e.target.value)}
              className="master-search-input" style={{ color: t.inputText }} />
          </div>

          <div className="flex items-center gap-2" onClick={moduleAccordion.toggle} style={{ cursor: 'pointer', userSelect: 'none', flex: '0 0 auto' }}>
            <MdSettings size={22} style={{ color: '#d97706' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, fontFamily: t.fontFamily }}>Module Master</span>
            <MdKeyboardArrowDown size={22} style={{ color: t.textPrimary, transition: 'transform 0.3s ease', transform: moduleAccordion.isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
          </div>

          <div className="master-actions" style={{ flex: '0 0 auto' }}>
            <button onClick={() => navigate('/admin/masters/module/add')} className="master-btn-primary">
              <MdAdd size={18} /> Add Module
            </button>
            <button onClick={exportModuleCSV} title="Export CSV" className="master-btn-icon"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}><MdDownload size={18} /></button>
            <button onClick={fetchModules} title="Refresh" className="master-btn-icon"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}><MdRefresh size={18} className={moduleLoading ? 'animate-spin' : ''} /></button>
          </div>
        </div>

        <div style={{ height: typeof moduleAccordion.contentHeight === 'number' ? `${moduleAccordion.contentHeight}px` : 'auto', overflow: 'hidden', transition: 'height 0.35s ease' }}>
          <div ref={moduleAccordion.contentRef}>
            <div className="master-table-scroll">
              <table className="master-table" style={{ minWidth: 650 }}>
                <thead>
                  <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                    <th className="master-table-actions-th master-table-header-gradient" style={{
                      width: ACTION_COL_WIDTH, minWidth: ACTION_COL_WIDTH, maxWidth: ACTION_COL_WIDTH,
                      borderBottom: `1px solid ${t.divider}`, zIndex: 2, background: t.tableHeaderBg,
                      borderRight: `2px solid ${t.divider}`, boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
                    }}>Actions</th>
                    <SortableTh label="ID" active={moduleSortKey === 'm_id'} dir={moduleSortDir} onClick={() => toggleModuleSort('m_id')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                    <SortableTh label="Name" active={moduleSortKey === 'm_name'} dir={moduleSortDir} onClick={() => toggleModuleSort('m_name')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                    <SortableTh label="Description" active={moduleSortKey === 'm_slug'} dir={moduleSortDir} onClick={() => toggleModuleSort('m_slug')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                    <SortableTh label="Sort Order" active={moduleSortKey === 'm_sort_order'} dir={moduleSortDir} onClick={() => toggleModuleSort('m_sort_order')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                    <th style={{ borderBottom: `1px solid ${t.divider}` }}>Status</th>
                    <SortableTh label="Created At" active={moduleSortKey === 'm_created_at'} dir={moduleSortDir} onClick={() => toggleModuleSort('m_created_at')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                  </tr>
                </thead>
                <tbody>
                  {moduleLoading ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48 }}>Loading...</td></tr>
                  ) : moduleRows.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48 }}>{moduleSearch ? 'No modules match your search.' : 'No modules found.'}</td></tr>
                  ) : moduleRows.map((m, idx) => {
                    const rowBg = idx % 2 === 0 ? t.surfaceBg : t.tableHeaderBg;
                    return (
                      <tr key={m.m_id} style={{ background: rowBg, borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#d1d5db'}`, transition: 'background 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = t.tableRowHover)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}>
                        <td className="master-table-actions-td" style={{
                          width: ACTION_COL_WIDTH, minWidth: ACTION_COL_WIDTH, maxWidth: ACTION_COL_WIDTH,
                          zIndex: 1, background: isDark ? t.surfaceBg : '#ffffff',
                          borderRight: `2px solid ${t.divider}`, boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
                        }}>
                          <MasterIconButtons
                            onView={() => navigate(`/admin/masters/module/view/${m.m_id}`)}
                            onEdit={() => navigate(`/admin/masters/module/edit/${m.m_id}`)}
                            onDelete={() => handleDeleteModule(m)}
                          />
                        </td>
                        <td>{m.m_id}</td>
                        <td style={{ fontWeight: 500 }}>
                          <div className="flex items-center gap-2">
                            <MdSettings size={16} className="master-row-icon" />
                            {m.m_name}
                          </div>
                        </td>
                        <td>{m.m_slug}</td>
                        <td>{m.m_sort_order}</td>
                        <td>{statusBadge(m.m_is_active)}</td>
                        <td>{formatDate(m.m_created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationFooter t={t} limit={moduleLimit} setLimit={setModuleLimit} setPage={setModulePage} safePage={moduleSafePage} totalPages={moduleTotalPages} from={moduleFrom} to={moduleTo} total={moduleTotal} pageBtns={modulePageBtns} />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          ACTION MASTER ACCORDION
      ════════════════════════════════════════ */}
      <div style={accordionCard}>
        <div style={accordionHeader(actionAccordion.isOpen)}>
          <div className="master-search-box master-search-box-accent" style={{ flex: '1 1 180px', maxWidth: 300, background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
            <MdSearch size={16} style={{ color: t.textPrimary, flexShrink: 0 }} />
            <input type="text" placeholder="Search by action name, code..."
              value={actionSearch} onChange={(e) => setActionSearch(e.target.value)}
              className="master-search-input" style={{ color: t.inputText }} />
          </div>

          <div className="flex items-center gap-2" onClick={actionAccordion.toggle} style={{ cursor: 'pointer', userSelect: 'none', flex: '0 0 auto' }}>
            <MdBolt size={22} style={{ color: '#2563eb' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, fontFamily: t.fontFamily }}>Action Master</span>
            <MdKeyboardArrowDown size={22} style={{ color: t.textPrimary, transition: 'transform 0.3s ease', transform: actionAccordion.isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
          </div>

          <div className="master-actions" style={{ flex: '0 0 auto' }}>
            <button onClick={() => navigate('/admin/masters/action/add')} className="master-btn-primary">
              <MdAdd size={18} /> Add Action
            </button>
            <button onClick={exportActionCSV} title="Export CSV" className="master-btn-icon"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}><MdDownload size={18} /></button>
            <button onClick={fetchActions} title="Refresh" className="master-btn-icon"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}><MdRefresh size={18} className={actionLoading ? 'animate-spin' : ''} /></button>
          </div>
        </div>

        <div style={{ height: typeof actionAccordion.contentHeight === 'number' ? `${actionAccordion.contentHeight}px` : 'auto', overflow: 'hidden', transition: 'height 0.35s ease' }}>
          <div ref={actionAccordion.contentRef}>
            <div className="master-table-scroll">
              <table className="master-table" style={{ minWidth: 700 }}>
                <thead>
                  <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                    <th className="master-table-actions-th master-table-header-gradient" style={{
                      width: ACTION_COL_WIDTH, minWidth: ACTION_COL_WIDTH, maxWidth: ACTION_COL_WIDTH,
                      borderBottom: `1px solid ${t.divider}`, zIndex: 2, background: t.tableHeaderBg,
                      borderRight: `2px solid ${t.divider}`, boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
                    }}>Actions</th>
                    <SortableTh label="ID" active={actionSortKey === 'id'} dir={actionSortDir} onClick={() => toggleActionSort('id')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                    <SortableTh label="Name" active={actionSortKey === 'name'} dir={actionSortDir} onClick={() => toggleActionSort('name')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                    <SortableTh label="Code" active={actionSortKey === 'code'} dir={actionSortDir} onClick={() => toggleActionSort('code')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                    <th style={{ borderBottom: `1px solid ${t.divider}` }}>Description</th>
                    <th style={{ borderBottom: `1px solid ${t.divider}` }}>Status</th>
                    <SortableTh label="Created At" active={actionSortKey === 'created_at'} dir={actionSortDir} onClick={() => toggleActionSort('created_at')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                  </tr>
                </thead>
                <tbody>
                  {actionLoading ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48 }}>Loading...</td></tr>
                  ) : actionRows.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48 }}>{actionSearch ? 'No actions match your search.' : 'No actions found.'}</td></tr>
                  ) : actionRows.map((a, idx) => {
                    const rowBg = idx % 2 === 0 ? t.surfaceBg : t.tableHeaderBg;
                    return (
                      <tr key={a.id} style={{ background: rowBg, borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#d1d5db'}`, transition: 'background 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = t.tableRowHover)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}>
                        <td className="master-table-actions-td" style={{
                          width: ACTION_COL_WIDTH, minWidth: ACTION_COL_WIDTH, maxWidth: ACTION_COL_WIDTH,
                          zIndex: 1, background: isDark ? t.surfaceBg : '#ffffff',
                          borderRight: `2px solid ${t.divider}`, boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
                        }}>
                          <MasterIconButtons
                            onView={() => navigate(`/admin/masters/action/view/${a.id}`)}
                            onEdit={() => navigate(`/admin/masters/action/edit/${a.id}`)}
                            onDelete={() => handleDeleteAction(a)}
                          />
                        </td>
                        <td>{a.id}</td>
                        <td style={{ fontWeight: 500 }}>
                          <div className="flex items-center gap-2">
                            <MdBolt size={16} className="master-row-icon" />
                            {a.name}
                          </div>
                        </td>
                        <td>{a.code}</td>
                        <td>{a.description || '—'}</td>
                        <td>{statusBadge(a.is_active)}</td>
                        <td>{formatDate(a.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationFooter t={t} limit={actionLimit} setLimit={setActionLimit} setPage={setActionPage} safePage={actionSafePage} totalPages={actionTotalPages} from={actionFrom} to={actionTo} total={actionTotal} pageBtns={actionPageBtns} />
          </div>
        </div>
      </div>

    </div>
  );
};

export default ActionModuleListPage;
