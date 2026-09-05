// src/pages/Admin/Masters/ModuleMapping/ModuleMappingPage.tsx
// Grid of Module x Action checkboxes — controls which Action Master rows
// are available for a module on the employee/role permission page.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { MdGridOn, MdRefresh, MdDoneAll, MdSettings } from 'react-icons/md';
import { useAppDispatch } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import { getAccordionCardStyle, getAccordionHeaderStyle } from '../../../../components/common/MasterListUI';
import {
  fetchMappingMatrix, mapModuleAction, unmapModuleAction, mapAllActionsForModule,
} from '../../../../services/moduleActionService';
import { MappingMatrix } from '../../../../types/index';

const EMPTY_MATRIX: MappingMatrix = { modules: [], actions: [], mappings: [] };

// Fixed width for the sticky Module column — same visual language as the
// other masters' left-sticky Actions column (divider + shadow), even
// though this column holds row labels rather than action buttons.
const MODULE_COL_WIDTH = 180;

const ModuleMappingPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isDark, t, cssVars } = useAppearanceTokens();

  useEffect(() => { dispatch(setPageTitle('Module Mapping')); }, [dispatch]);

  const [matrix, setMatrix] = useState<MappingMatrix>(EMPTY_MATRIX);
  const [loading, setLoading] = useState(false);
  const [pendingCell, setPendingCell] = useState<string | null>(null);
  const [pendingRow, setPendingRow] = useState<number | null>(null);

  const accordionCard = getAccordionCardStyle(t);
  const accordionHeader = getAccordionHeaderStyle(t, true);

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMappingMatrix();
      if (res.success) setMatrix(res.data);
      else toast.error('Failed to fetch mapping matrix');
    } catch (e) {
      toast.error('Failed to fetch mapping matrix. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMatrix(); }, [fetchMatrix]);

  // `${module_id}-${action_master_id}` -> module_actions.id (needed to unmap)
  const pairMap = useMemo(() => {
    const map = new Map<string, number>();
    matrix.mappings.forEach((p) => map.set(`${p.module_id}-${p.action_master_id}`, p.id));
    return map;
  }, [matrix.mappings]);

  const toggleCell = async (moduleId: number, actionId: number) => {
    const key = `${moduleId}-${actionId}`;
    const existingId = pairMap.get(key);
    setPendingCell(key);
    try {
      if (existingId) {
        await unmapModuleAction(existingId);
        setMatrix((prev) => ({ ...prev, mappings: prev.mappings.filter((p) => p.id !== existingId) }));
      } else {
        const res = await mapModuleAction(moduleId, actionId);
        setMatrix((prev) => ({ ...prev, mappings: [...prev.mappings, { id: res.data.id, module_id: moduleId, action_master_id: actionId }] }));
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed to update mapping. Please try again.';
      toast.error(msg);
    } finally {
      setPendingCell(null);
    }
  };

  const selectAllForModule = async (moduleId: number) => {
    setPendingRow(moduleId);
    try {
      const res = await mapAllActionsForModule(moduleId);
      toast.success(`${res.created} action(s) attached`, { autoClose: 1000 });
      await fetchMatrix();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed to attach all actions. Please try again.';
      toast.error(msg);
    } finally {
      setPendingRow(null);
    }
  };

  const colCount = matrix.actions.length + 2;

  return (
    <div className="master-page" style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div style={accordionCard}>
        <div style={accordionHeader}>
          <div className="flex items-center gap-2" style={{ flex: '0 0 auto' }}>
            <MdGridOn size={22} style={{ color: '#0891b2' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, fontFamily: t.fontFamily }}>Module ↔ Action Mapping</span>
          </div>
          <div className="master-actions" style={{ flex: '0 0 auto', marginLeft: 'auto' }}>
            <button onClick={fetchMatrix} title="Refresh" className="master-btn-icon"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}>
              <MdRefresh size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <p style={{ padding: '12px 16px 0', fontSize: 11.5, color: t.textSecondary }}>
          Check a box to make that action available for a module on the employee/role permission page. Unchecking removes it everywhere.
        </p>

        <div className="master-table-scroll" style={{ padding: '8px 0 16px' }}>
          <table className="master-table" style={{ minWidth: 400 + matrix.actions.length * 90 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                <th style={{
                  width: MODULE_COL_WIDTH, minWidth: MODULE_COL_WIDTH,
                  borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap',
                  position: 'sticky', left: 0, zIndex: 2, background: t.tableHeaderBg,
                  borderRight: `2px solid ${t.divider}`, boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
                }}>
                  Module
                </th>
                {matrix.actions.map((a) => (
                  <th key={a.id} style={{ textAlign: 'center', borderBottom: `1px solid ${t.divider}` }}>
                    {a.name}
                  </th>
                ))}
                <th style={{ textAlign: 'center', borderBottom: `1px solid ${t.divider}` }}>
                  All
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={colCount} style={{ textAlign: 'center', padding: 48 }}>Loading...</td></tr>
              ) : matrix.modules.length === 0 ? (
                <tr><td colSpan={colCount} style={{ textAlign: 'center', padding: 48 }}>No active modules found.</td></tr>
              ) : matrix.actions.length === 0 ? (
                <tr><td colSpan={colCount} style={{ textAlign: 'center', padding: 48 }}>No active actions found. Add one in Action Master first.</td></tr>
              ) : matrix.modules.map((m, idx) => {
                const rowBg = idx % 2 === 0 ? t.surfaceBg : t.tableHeaderBg;
                return (
                  <tr key={m.id} style={{ background: rowBg, borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#d1d5db'}` }}>
                    <td style={{
                      fontWeight: 500, whiteSpace: 'nowrap',
                      position: 'sticky', left: 0, zIndex: 1, background: isDark ? t.surfaceBg : '#ffffff',
                      borderRight: `2px solid ${t.divider}`, boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
                    }}>
                      <div className="flex items-center gap-2">
                        <MdSettings size={16} className="master-row-icon" />
                        {m.name}
                      </div>
                    </td>
                    {matrix.actions.map((a) => {
                      const key = `${m.id}-${a.id}`;
                      const checked = pairMap.has(key);
                      const isPending = pendingCell === key;
                      return (
                        <td key={a.id} style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isPending}
                            onChange={() => toggleCell(m.id, a.id)}
                            style={{ width: 16, height: 16, cursor: isPending ? 'wait' : 'pointer', accentColor: '#2563eb' }}
                          />
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => selectAllForModule(m.id)}
                        disabled={pendingRow === m.id}
                        title="Attach every active action to this module"
                        className="master-icon-btn"
                        style={{ cursor: pendingRow === m.id ? 'wait' : 'pointer' }}
                      >
                        <MdDoneAll size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ModuleMappingPage;
