// src/pages/Admin/Masters/ActionModule/ActionModuleListPage.tsx
// Contains: Action Master accordion + Module Master accordion

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdAdd, MdDelete, MdDownload, MdEdit, MdRefresh,
  MdSearch, MdVisibility, MdKeyboardArrowDown, MdSettings,
} from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { useAccordion } from '../../../../hooks/useAccordion';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme } from '../../../../styles/theme';
import { iconBtnStyle, getAccordionCardStyle, getAccordionHeaderStyle, StatusBadge } from '../../../../components/common/MasterListUI';
import PaginationFooter from '../../../../components/common/PaginationFooter';
import { fetchActionMasterList, deleteActionMaster } from '../../../../services/actionMasterService';
import { fetchModuleMasterList, deleteModuleMaster } from '../../../../services/moduleMasterService';
import { ActionMaster, ModuleMaster } from '../../../../types/index';
import { formatDate, showAlert } from '../../../../utils';

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
const ActionModuleListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { mode } = useAppSelector((s) => s.theme);
  const isDark = mode === 'dark';
  const t = getTheme(isDark);

  useEffect(() => { dispatch(setPageTitle('Action & Module')); }, [dispatch]);

  const stickyBg = isDark ? t.surfaceBg : '#ffffff';
  const iconBtn = iconBtnStyle;
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

  useEffect(() => { actionAccordion.recalc(); }, [actionFiltered, actionPage, actionLimit]);

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
    if (actionFiltered.length === 0) { toast.info('No data to Export'); return; }
    const headers = ['ID', 'Name', 'Code', 'Description', 'Status', 'Created At'];
    const rows = actionFiltered.map((a) => [a.id, `"${a.name}"`, a.code, `"${a.description ?? ''}"`, a.is_active ? 'Active' : 'Inactive', formatDate(a.created_at)]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: 'actions.csv' }).click();
    URL.revokeObjectURL(url);
    toast.success('Action CSV Exported Successfully', { autoClose: 1000 });
  };

  const actionTotal = actionFiltered.length;
  const actionTotalPages = Math.max(1, Math.ceil(actionTotal / actionLimit));
  const actionSafePage = Math.min(actionPage, actionTotalPages);
  const actionStart = (actionSafePage - 1) * actionLimit;
  const actionRows = actionFiltered.slice(actionStart, actionStart + actionLimit);
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

  useEffect(() => { moduleAccordion.recalc(); }, [moduleFiltered, modulePage, moduleLimit]);

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
    if (moduleFiltered.length === 0) { toast.info('No data to Export'); return; }
    const headers = ['ID', 'Name', 'Description', 'Sort Order', 'Status', 'Created At'];
    const rows = moduleFiltered.map((m) => [m.m_id, `"${m.m_name}"`, m.m_slug, m.m_sort_order, m.m_is_active ? 'Active' : 'Inactive', formatDate(m.m_created_at)]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: 'modules.csv' }).click();
    URL.revokeObjectURL(url);
    toast.success('Module CSV Exported Successfully', { autoClose: 1000 });
  };

  const moduleTotal = moduleFiltered.length;
  const moduleTotalPages = Math.max(1, Math.ceil(moduleTotal / moduleLimit));
  const moduleSafePage = Math.min(modulePage, moduleTotalPages);
  const moduleStart = (moduleSafePage - 1) * moduleLimit;
  const moduleRows = moduleFiltered.slice(moduleStart, moduleStart + moduleLimit);
  const moduleFrom = moduleTotal === 0 ? 0 : moduleStart + 1;
  const moduleTo = Math.min(moduleStart + moduleLimit, moduleTotal);
  const modulePageBtns = () => { const s = Math.max(1, Math.min(moduleSafePage - 2, moduleTotalPages - 4)); return Array.from({ length: Math.min(5, moduleTotalPages) }, (_, i) => s + i); };

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: t.fontFamily }}>

      {/* ════════════════════════════════════════
          MODULE MASTER ACCORDION
      ════════════════════════════════════════ */}
      <div style={accordionCard}>
        <div style={accordionHeader(moduleAccordion.isOpen)}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ flex: '1 1 180px', maxWidth: 300, background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
            <MdSearch size={16} style={{ color: t.textPrimary, flexShrink: 0 }} />
            <input type="text" placeholder="Search by module name, slug..."
              value={moduleSearch} onChange={(e) => setModuleSearch(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 13, width: '100%' }} />
          </div>

          <div className="flex items-center gap-2" onClick={moduleAccordion.toggle} style={{ cursor: 'pointer', userSelect: 'none', flex: '0 0 auto' }}>
            <MdSettings size={22} style={{ color: '#d97706' }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary, fontFamily: t.fontFamily }}>Module Master</span>
            <MdKeyboardArrowDown size={22} style={{ color: t.textPrimary, transition: 'transform 0.3s ease', transform: moduleAccordion.isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
          </div>

          <div className="flex items-center gap-2" style={{ flex: '0 0 auto' }}>
            <button onClick={() => navigate('/admin/masters/module/add')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <MdAdd size={18} /> Add Module
            </button>
            <button onClick={exportModuleCSV} title="Export CSV" className="p-2 rounded-xl"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer', color: t.textPrimary }}><MdDownload size={18} /></button>
            <button onClick={fetchModules} title="Refresh" className="p-2 rounded-xl"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer', color: t.textPrimary }}><MdRefresh size={18} className={moduleLoading ? 'animate-spin' : ''} /></button>
          </div>
        </div>

        <div style={{ height: typeof moduleAccordion.contentHeight === 'number' ? `${moduleAccordion.contentHeight}px` : 'auto', overflow: 'hidden', transition: 'height 0.35s ease' }}>
          <div ref={moduleAccordion.contentRef}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
                <thead>
                  <tr style={{ background: t.tableHeaderBg }}>
                    {['ID', 'Name', 'Description', 'Sort Order', 'Status', 'Created At'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, textTransform: 'camelcase', letterSpacing: '0.05em', color: t.textPrimary, borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, textTransform: 'camelcase', letterSpacing: '0.05em', color: t.textPrimary, borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap', position: 'sticky', right: 0, zIndex: 2, background: t.tableHeaderBg, borderLeft: `2px solid ${t.divider}`, boxShadow: '-4px 0 8px rgba(0,0,0,0.06)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {moduleLoading ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: t.textPrimary }}>Loading...</td></tr>
                  ) : moduleRows.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: t.textPrimary }}>{moduleSearch ? 'No modules match your search.' : 'No modules found.'}</td></tr>
                  ) : moduleRows.map((m, idx) => {
                    const rowBg = idx % 2 === 0 ? t.surfaceBg : t.tableHeaderBg;
                    return (
                      <tr key={m.m_id} style={{ background: rowBg, borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#d1d5db'}`, transition: 'background 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = t.tableRowHover)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textPrimary }}>{m.m_id}</td>
                        <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary, fontWeight: 500 }}>{m.m_name}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textPrimary }}>{m.m_slug}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textPrimary }}>{m.m_sort_order}</td>
                        <td style={{ padding: '12px 16px' }}>{statusBadge(m.m_is_active)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textPrimary, whiteSpace: 'nowrap' }}>{formatDate(m.m_created_at)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap', position: 'sticky', right: 0, zIndex: 1, background: stickyBg, borderLeft: `2px solid ${t.divider}`, boxShadow: '-4px 0 8px rgba(0,0,0,0.06)' }}>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => navigate(`/admin/masters/module/view/${m.m_id}`)} title="View" style={iconBtn}><MdVisibility size={18} /></button>
                            <button onClick={() => navigate(`/admin/masters/module/edit/${m.m_id}`)} title="Edit" style={iconBtn}><MdEdit size={18} /></button>
                            <button onClick={() => handleDeleteModule(m)} title="Delete" style={iconBtn}><MdDelete size={18} /></button>
                          </div>
                        </td>
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
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ flex: '1 1 180px', maxWidth: 300, background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
            <MdSearch size={16} style={{ color: t.textPrimary, flexShrink: 0 }} />
            <input type="text" placeholder="Search by action name, code..."
              value={actionSearch} onChange={(e) => setActionSearch(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 13, width: '100%' }} />
          </div>

          <div className="flex items-center gap-2" onClick={actionAccordion.toggle} style={{ cursor: 'pointer', userSelect: 'none', flex: '0 0 auto' }}>
            <MdSettings size={22} style={{ color: '#2563eb' }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary, fontFamily: t.fontFamily }}>Action Master</span>
            <MdKeyboardArrowDown size={22} style={{ color: t.textPrimary, transition: 'transform 0.3s ease', transform: actionAccordion.isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
          </div>

          <div className="flex items-center gap-2" style={{ flex: '0 0 auto' }}>
            <button onClick={() => navigate('/admin/masters/action/add')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <MdAdd size={18} /> Add Action
            </button>
            <button onClick={exportActionCSV} title="Export CSV" className="p-2 rounded-xl"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer', color: t.textPrimary }}><MdDownload size={18} /></button>
            <button onClick={fetchActions} title="Refresh" className="p-2 rounded-xl"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer', color: t.textPrimary }}><MdRefresh size={18} className={actionLoading ? 'animate-spin' : ''} /></button>
          </div>
        </div>

        <div style={{ height: typeof actionAccordion.contentHeight === 'number' ? `${actionAccordion.contentHeight}px` : 'auto', overflow: 'hidden', transition: 'height 0.35s ease' }}>
          <div ref={actionAccordion.contentRef}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ background: t.tableHeaderBg }}>
                    {['ID', 'Name', 'Code', 'Description', 'Status', 'Created At'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, textTransform: 'camelcase', letterSpacing: '0.05em', color: t.textPrimary, borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, textTransform: 'camelcase', letterSpacing: '0.05em', color: t.textPrimary, borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap', position: 'sticky', right: 0, zIndex: 2, background: t.tableHeaderBg, borderLeft: `2px solid ${t.divider}`, boxShadow: '-4px 0 8px rgba(0,0,0,0.06)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {actionLoading ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: t.textPrimary }}>Loading...</td></tr>
                  ) : actionRows.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: t.textPrimary }}>{actionSearch ? 'No actions match your search.' : 'No actions found.'}</td></tr>
                  ) : actionRows.map((a, idx) => {
                    const rowBg = idx % 2 === 0 ? t.surfaceBg : t.tableHeaderBg;
                    return (
                      <tr key={a.id} style={{ background: rowBg, borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#d1d5db'}`, transition: 'background 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = t.tableRowHover)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textPrimary }}>{a.id}</td>
                        <td style={{ padding: '12px 16px', fontSize: 14, color: t.textPrimary, fontWeight: 500 }}>{a.name}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textPrimary }}>{a.code}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textPrimary }}>{a.description || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>{statusBadge(a.is_active)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: t.textPrimary, whiteSpace: 'nowrap' }}>{formatDate(a.created_at)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap', position: 'sticky', right: 0, zIndex: 1, background: stickyBg, borderLeft: `2px solid ${t.divider}`, boxShadow: '-4px 0 8px rgba(0,0,0,0.06)' }}>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => navigate(`/admin/masters/action/view/${a.id}`)} title="View" style={iconBtn}><MdVisibility size={18} /></button>
                            <button onClick={() => navigate(`/admin/masters/action/edit/${a.id}`)} title="Edit" style={iconBtn}><MdEdit size={18} /></button>
                            <button onClick={() => handleDeleteAction(a)} title="Delete" style={iconBtn}><MdDelete size={18} /></button>
                          </div>
                        </td>
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
