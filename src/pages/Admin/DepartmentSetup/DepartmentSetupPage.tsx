// ==========================================
// DREAM GROUP CRM — DEPARTMENT SETUP (Super Admin, V_25.0)
// ==========================================
// Per department: which pages its employees get, whether a designation is
// required (e.g. Refund: no), and which designation is the Head and which
// the Executive. The Employee Add/Edit screen reads this, so a designation
// added here under Recovery is offered there without code changes.
//
// Departments and designations themselves are still added in Masters →
// Department. A department left "Not set up" keeps today's access for its
// employees (e.g. Maintenance). Nothing here bypasses Admin approval:
// customer/employee adds and edits by employees still go to Pending Admin
// Approval.
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from '@/utils/toast';
import { MdAccountTree, MdRefresh, MdSave, MdCheckCircle, MdInfoOutline } from 'react-icons/md';
import { useAppDispatch } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import {
  ACCESS_AREAS, ACCESS_AREA_LABELS, AccessArea, ConfigDepartment, DesignationLevel,
  fetchAccessConfig, saveDepartmentSetup, saveDesignationLevel,
} from '../../../services/accessService';

interface ErrLike { response?: { data?: { message?: string } } }
const errMessage = (e: unknown, fallback: string) => (e as ErrLike)?.response?.data?.message || fallback;

interface Draft { setUp: boolean; areas: AccessArea[]; designation_required: boolean }

const LEVEL_OPTIONS: { value: '' | 'head' | 'executive'; label: string }[] = [
  { value: '', label: '— (none)' },
  { value: 'head', label: 'Head' },
  { value: 'executive', label: 'Executive (reports to a Head)' },
];

const DepartmentSetupPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t, cssVars } = useAppearanceTokens();
  const [departments, setDepartments] = useState<ConfigDepartment[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { dispatch(setPageTitle('Department Setup')); }, [dispatch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchAccessConfig();
      setDepartments(rows);
      setDrafts(Object.fromEntries(rows.map((d) => [d.id, {
        setUp: d.access_areas != null,
        areas: d.access_areas ?? [],
        designation_required: d.designation_required,
      }])));
    } catch (e) {
      toast.error(errMessage(e, 'Failed to load departments.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const patch = (id: number, p: Partial<Draft>) => setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }));
  const toggleArea = (id: number, area: AccessArea) => {
    const cur = drafts[id]?.areas ?? [];
    patch(id, { areas: cur.includes(area) ? cur.filter((a) => a !== area) : [...cur, area] });
  };

  const saveDept = async (d: ConfigDepartment) => {
    const draft = drafts[d.id];
    if (draft.setUp && draft.areas.length === 0) {
      toast.error('Pick at least one page, or switch the department back to "Not set up".');
      return;
    }
    setBusy(`d${d.id}`);
    try {
      await saveDepartmentSetup(d.id, {
        access_areas: draft.setUp ? ACCESS_AREAS.filter((a) => draft.areas.includes(a)) : null,
        designation_required: draft.designation_required,
      });
      toast.success(`${d.name} saved.`);
      await load();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to save.'));
    } finally {
      setBusy(null);
    }
  };

  const saveLevel = async (deptId: number, desigId: number, level: DesignationLevel) => {
    setBusy(`g${desigId}`);
    try {
      await saveDesignationLevel(desigId, level);
      setDepartments((prev) => prev.map((d) => d.id !== deptId ? d : {
        ...d, designations: d.designations.map((g) => g.id === desigId ? { ...g, level } : g),
      }));
      toast.success('Designation saved.');
    } catch (e) {
      toast.error(errMessage(e, 'Failed to save designation.'));
    } finally {
      setBusy(null);
    }
  };

  const card: React.CSSProperties = { background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 16 };

  return (
    <div style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-start gap-2" style={{ maxWidth: 760, fontSize: 12.5, color: t.textSecondary, lineHeight: 1.5 }}>
          <MdInfoOutline size={18} style={{ flexShrink: 0, marginTop: 1, color: 'var(--brand-ink)' }} />
          <span>
            Choose which pages each department&apos;s employees get, and which designation is the <b>Head</b> and which the{' '}
            <b>Executive</b>. The Employee Add/Edit screen follows this automatically. Add departments and designations in{' '}
            <b>Masters → Department</b>. A department left <b>Not set up</b> keeps today&apos;s access for its employees.
          </span>
        </div>
        <button type="button" onClick={load} title="Refresh" className="master-btn-icon"
          style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, color: 'var(--brand-ink)' }}>
          <MdRefresh size={18} />
        </button>
      </div>

      {loading && departments.length === 0 ? (
        <div style={{ ...card, padding: 28, textAlign: 'center', color: t.textSecondary }}>Loading departments…</div>
      ) : departments.length === 0 ? (
        <div style={{ ...card, padding: 28, textAlign: 'center', color: t.textSecondary }}>
          No departments yet. Add them in Masters → Department first.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {departments.map((d) => {
            const draft = drafts[d.id];
            if (!draft) return null;
            const dirty = draft.setUp !== (d.access_areas != null)
              || draft.designation_required !== d.designation_required
              || (draft.setUp && JSON.stringify([...draft.areas].sort()) !== JSON.stringify([...(d.access_areas ?? [])].sort()));
            return (
              <section key={d.id} style={{ ...card, padding: 18 }}>
                <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, background: 'var(--brand-gradient)', color: '#fff' }}>
                      <MdAccountTree size={17} />
                    </span>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: t.textPrimary }}>{d.name}</h3>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full font-semibold" style={{
                    fontSize: 10.5,
                    background: d.access_areas != null ? '#dcfce7' : '#fef3c7',
                    color: d.access_areas != null ? '#15803d' : '#92400e',
                  }}>
                    {d.access_areas != null ? <><MdCheckCircle size={12} /> Set up</> : 'Not set up — today’s access'}
                  </span>
                </div>

                <label className="flex items-center gap-2 mb-2" style={{ fontSize: 12.5, fontWeight: 700, color: t.textPrimary, cursor: 'pointer' }}>
                  <input type="checkbox" checked={draft.setUp} onChange={(e) => patch(d.id, { setUp: e.target.checked })} />
                  Set up this department&apos;s pages
                </label>
                {draft.setUp && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-3" style={{ padding: '10px 12px', borderRadius: 10, background: t.insetBg, border: `1px solid ${t.surfaceBorder}` }}>
                    {ACCESS_AREAS.map((a) => (
                      <label key={a} className="flex items-center gap-2" style={{ fontSize: 12, color: t.textPrimary, cursor: 'pointer' }}>
                        <input type="checkbox" checked={draft.areas.includes(a)} onChange={() => toggleArea(d.id, a)} />
                        {ACCESS_AREA_LABELS[a]}
                      </label>
                    ))}
                  </div>
                )}

                <label className="flex items-center gap-2 mb-3" style={{ fontSize: 12.5, fontWeight: 700, color: t.textPrimary, cursor: 'pointer' }}>
                  <input type="checkbox" checked={draft.designation_required} onChange={(e) => patch(d.id, { designation_required: e.target.checked })} />
                  Designation required when adding an employee
                </label>

                <div className="flex justify-end mb-3">
                  <button type="button" onClick={() => saveDept(d)} disabled={!dirty || busy === `d${d.id}`}
                    className="master-btn-primary flex items-center gap-1.5"
                    style={{ opacity: !dirty || busy === `d${d.id}` ? 0.5 : 1, cursor: !dirty ? 'not-allowed' : 'pointer' }}>
                    <MdSave size={15} /> {busy === `d${d.id}` ? 'Saving…' : 'Save'}
                  </button>
                </div>

                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.textSecondary, marginBottom: 6 }}>
                  Designations — Head / Executive
                </div>
                {d.designations.length === 0 ? (
                  <div style={{ fontSize: 12, color: t.textSecondary }}>No designations in this department.</div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {d.designations.map((g) => (
                      <div key={g.id} className="flex items-center justify-between gap-3" style={{ padding: '6px 10px', borderRadius: 10, border: `1px solid ${t.surfaceBorder}` }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: t.textPrimary }}>
                          {g.name}{!g.is_active && <span style={{ color: t.textSecondary, fontWeight: 500 }}> (inactive)</span>}
                        </span>
                        <select value={g.level ?? ''} disabled={busy === `g${g.id}`}
                          onChange={(e) => saveLevel(d.id, g.id, (e.target.value || null) as DesignationLevel)}
                          style={{ maxWidth: 230, height: 32, fontSize: 12, padding: '0 8px', borderRadius: 8, border: `1px solid ${t.surfaceBorder}`, background: t.surfaceBg, color: t.textPrimary }}>
                          {LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DepartmentSetupPage;
