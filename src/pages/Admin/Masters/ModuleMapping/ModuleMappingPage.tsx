// src/pages/Admin/Masters/ModuleMapping/ModuleMappingPage.tsx
// Grid of Module x Action checkboxes — controls which Action Master rows
// are available for a module on the employee/role permission page.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { MdGridOn, MdRefresh, MdDoneAll } from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import { getAccordionCardStyle, getAccordionHeaderStyle } from '../../../../components/common/MasterListUI';
import {
  fetchMappingMatrix, mapModuleAction, unmapModuleAction, mapAllActionsForModule,
} from '../../../../services/moduleActionService';
import { MappingMatrix } from '../../../../types/index';

const EMPTY_MATRIX: MappingMatrix = { modules: [], actions: [], mappings: [] };

const ModuleMappingPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isDark, t } = useAppearanceTokens();

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
    <div style={{ fontFamily: t.fontFamily }}>
      <div style={accordionCard}>
        <div style={accordionHeader}>
          <div className="flex items-center gap-2" style={{ flex: '0 0 auto' }}>
            <MdGridOn size={22} style={{ color: '#0891b2' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, fontFamily: t.fontFamily }}>Module ↔ Action Mapping</span>
          </div>
          <div className="flex items-center gap-2" style={{ flex: '0 0 auto', marginLeft: 'auto' }}>
            <button onClick={fetchMatrix} title="Refresh" className="p-2 rounded-xl"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer', color: t.textSecondary }}>
              <MdRefresh size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <p style={{ padding: '12px 16px 0', fontSize: 11.5, color: t.textSecondary }}>
          Check a box to make that action available for a module on the employee/role permission page. Unchecking removes it everywhere.
        </p>

        <div style={{ overflowX: 'auto', padding: '8px 0 16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 + matrix.actions.length * 90 }}>
            <thead>
              <tr style={{ background: t.tableHeaderBg }}>
                <th style={{
                  padding: '12px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.05em', color: t.textPrimary, borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap',
                  position: 'sticky', left: 0, zIndex: 2, background: t.tableHeaderBg,
                }}>
                  Module
                </th>
                {matrix.actions.map((a) => (
                  <th key={a.id} style={{ padding: '12px 16px', textAlign: 'center', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.textPrimary, borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap' }}>
                    {a.name}
                  </th>
                ))}
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.textPrimary, borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap' }}>
                  All
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={colCount} style={{ textAlign: 'center', padding: 48, color: t.textPrimary }}>Loading...</td></tr>
              ) : matrix.modules.length === 0 ? (
                <tr><td colSpan={colCount} style={{ textAlign: 'center', padding: 48, color: t.textPrimary }}>No active modules found.</td></tr>
              ) : matrix.actions.length === 0 ? (
                <tr><td colSpan={colCount} style={{ textAlign: 'center', padding: 48, color: t.textPrimary }}>No active actions found. Add one in Action Master first.</td></tr>
              ) : matrix.modules.map((m, idx) => {
                const rowBg = idx % 2 === 0 ? t.surfaceBg : t.tableHeaderBg;
                return (
                  <tr key={m.id} style={{ background: rowBg, borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#d1d5db'}` }}>
                    <td style={{
                      padding: '12px 16px', fontSize: 12.5, color: t.textPrimary, fontWeight: 500, whiteSpace: 'nowrap',
                      position: 'sticky', left: 0, zIndex: 1, background: rowBg,
                    }}>
                      {m.name}
                    </td>
                    {matrix.actions.map((a) => {
                      const key = `${m.id}-${a.id}`;
                      const checked = pairMap.has(key);
                      const isPending = pendingCell === key;
                      return (
                        <td key={a.id} style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isPending}
                            onChange={() => toggleCell(m.id, a.id)}
                            style={{ width: 16, height: 16, cursor: isPending ? 'wait' : 'pointer' }}
                          />
                        </td>
                      );
                    })}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => selectAllForModule(m.id)}
                        disabled={pendingRow === m.id}
                        title="Attach every active action to this module"
                        style={{ background: 'none', border: 'none', cursor: pendingRow === m.id ? 'wait' : 'pointer', color: '#0891b2', padding: 4, display: 'inline-flex', alignItems: 'center' }}
                      >
                        <MdDoneAll size={18} />
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
