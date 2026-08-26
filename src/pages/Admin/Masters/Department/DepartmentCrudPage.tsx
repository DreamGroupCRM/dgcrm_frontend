// ==========================================
// DREAM GROUP CRM - DEPARTMENT CRUD PAGE (Department + Designations)
// ==========================================
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdApartment, MdArrowBack, MdSave, MdAdd, MdDelete, MdEdit, MdCheck, MdClose,
} from 'react-icons/md';

import { useAppSelector } from '../../../../hooks';
import { getTheme } from '../../../../styles/theme';
import { showAlert } from '../../../../utils';
import { Designation, CreateDepartmentPayload } from '../../../../types/index';
import { ViewDepartment, CreateDepartment, UpdateDepartment } from '../../../../services/departmentService';

// ── local id helper for not-yet-saved designation rows ──────────────────────
let localIdCounter = 0;
const localId = () => `local_${Date.now()}_${localIdCounter++}`;

type Mode = 'add' | 'edit' | 'view';
interface Props { mode: Mode; }

// Sticky footer height — same value/pattern as CustomerDetailsCrudPage.tsx's
// FOOTER_HEIGHT, so Go Back/Save are always reachable without scrolling.
const FOOTER_HEIGHT = 76;

// ── small shared bits, styled to match the rest of the Masters section ─────
const StatusToggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = (
  { checked, onChange, disabled }
) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    style={{
      width: 40, height: 22, borderRadius: 999, border: 'none', padding: 2,
      background: checked ? '#22c55e' : '#d1d5db',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center',
      justifyContent: checked ? 'flex-end' : 'flex-start',
      transition: 'background 0.15s', flexShrink: 0,
    }}
    title={checked ? 'Enabled' : 'Disabled'}
  >
    <span style={{
      width: 18, height: 18, borderRadius: '50%', background: '#fff',
      boxShadow: '0 1px 2px rgba(0,0,0,0.3)', display: 'block',
    }} />
  </button>
);

const StatusPill: React.FC<{ active: boolean }> = ({ active }) => (
  <span
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
    style={{
      background: active ? '#dcfce7' : '#f1f5f9',
      color: active ? '#16a34a' : '#64748b',
    }}
  >
    <span className="w-1.5 h-1.5 rounded-full bg-current" />
    {active ? 'Enabled' : 'Disabled'}
  </span>
);

const DepartmentCrudPage: React.FC<Props> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mode: themeMode } = useAppSelector((s) => s.theme);
  const isDark = themeMode === 'dark';
  const t = getTheme(isDark);

  const isView = mode === 'view';

  const [fetching, setFetching] = useState(mode !== 'add');
  const [saving, setSaving] = useState(false);

  const [departmentName, setDepartmentName] = useState('');
  const [isActive, setIsActive] = useState(true);

  // "Do you want to add designations for this department?" — a display
  // toggle (defaults to Yes, matching the screenshot), not a mandatory
  // validation choice; Step 2 is explicitly optional.
  const [wantDesignations, setWantDesignations] = useState(true);

  const [designations, setDesignations] = useState<Designation[]>([]);
  const [newDesignationName, setNewDesignationName] = useState('');

  // ── editing an existing designation's name in place ─────────────────────
  const [editingDesignationId, setEditingDesignationId] = useState<string | null>(null);
  const [editingDesignationName, setEditingDesignationName] = useState('');

  // ── load for edit/view ───────────────────────────────────────────────────
  useEffect(() => {
    if (mode === 'add' || !id) return;
    (async () => {
      setFetching(true);
      try {
        const res = await ViewDepartment(id);
        if (res.success && res.data) {
          const d = res.data;
          setDepartmentName(d.name || '');
          setIsActive(d.is_active);
          const loadedDesignations = d.designations || [];
          setDesignations(loadedDesignations);
          setWantDesignations(loadedDesignations.length > 0);
        } else {
          toast.error('Failed to load department details.');
        }
      } catch {
        toast.error('Failed to load department details.');
      } finally {
        setFetching(false);
      }
    })();
  }, [mode, id]);

  // ── designations: add / toggle / delete — all local until Save ─────────
  const addDesignation = () => {
    const name = newDesignationName.trim();
    if (!name) {
      toast.error('Enter a designation name first.');
      return;
    }
    if (designations.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      showAlert.error('Designation with the same name under this department already exists.');
      return;
    }
    setDesignations((prev) => [...prev, { id: localId(), name, is_active: true }]);
    setNewDesignationName('');
    toast.success('Designation added', { autoClose: 900 });
  };

  const toggleDesignation = (designationId: string | undefined, v: boolean) => {
    setDesignations((prev) => prev.map((d) => (d.id === designationId ? { ...d, is_active: v } : d)));
  };

  // Deleting a designation is immediate and local — no confirmation dialog,
  // no separate API call. It's just removed from the array that gets sent
  // on Save, same as removing a not-yet-saved row in a Building floor.
  const removeDesignation = (designationId: string | undefined) => {
    setDesignations((prev) => prev.filter((d) => d.id !== designationId));
    if (designationId === editingDesignationId) setEditingDesignationId(null);
  };

  // Rename an existing designation — same "local until Save" model as
  // add/toggle/delete above. Enter/checkmark commits, X/Escape cancels.
  const startEditDesignation = (d: Designation) => {
    setEditingDesignationId(d.id ?? null);
    setEditingDesignationName(d.name);
  };
  const cancelEditDesignation = () => {
    setEditingDesignationId(null);
    setEditingDesignationName('');
  };
  const saveEditDesignation = () => {
    const name = editingDesignationName.trim();
    if (!name) {
      toast.error('Designation name cannot be empty.');
      return;
    }
    if (designations.some((d) => d.id !== editingDesignationId && d.name.toLowerCase() === name.toLowerCase())) {
      showAlert.error('Designation with the same name under this department already exists.');
      return;
    }
    setDesignations((prev) => prev.map((d) => (d.id === editingDesignationId ? { ...d, name } : d)));
    setEditingDesignationId(null);
    setEditingDesignationName('');
  };

  // ── validation ────────────────────────────────────────────────────────
  const isFormValid = departmentName.trim() !== '';

  const handleSubmit = async () => {
    if (!isFormValid) {
      toast.error('Please enter a Department Name.');
      return;
    }
    setSaving(true);
    try {
      const payload: CreateDepartmentPayload = {
        name: departmentName.trim(),
        is_active: isActive,
        designations: wantDesignations
          ? designations.map((d) => ({
              // Only send a real id (already-saved rows); a `local_...` id
              // means this row was created in this session and should be
              // treated as new by the backend.
              ...(d.id && !d.id.startsWith('local_') ? { id: d.id } : {}),
              name: d.name.trim(),
              is_active: d.is_active,
            }))
          : [],
      };

      if (mode === 'edit' && id) {
        await UpdateDepartment(id, payload);
        toast.success('Department Updated Successfully');
      } else {
        await CreateDepartment(payload);
        toast.success('Department Created Successfully');
      }
      navigate('/admin/masters/department');
    } catch (e) {
      // Backend duplicate-entry checks (department name, designation name
      // within this department) throw a 409 with a specific message —
      // surface it via SweetAlert as required, instead of the generic
      // toast fallback below.
      const status = (e as { response?: { status?: number; data?: { message?: string } } })?.response?.status;
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (status === 409 && message) {
        showAlert.error(message);
      } else {
        toast.error(mode === 'edit' ? 'Failed to update department.' : 'Failed to create department.');
      }
    } finally {
      setSaving(false);
    }
  };

  // ── shared field styles ──────────────────────────────────────────────────
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: t.textPrimary, marginBottom: 6,
  };
  const fieldStyle: React.CSSProperties = {
    width: '100%', background: isView ? t.insetBg : t.inputBg,
    border: `1px solid ${t.inputBorder}`, borderRadius: 10, padding: '10px 14px',
    fontSize: 12.5, color: t.inputText, outline: 'none', fontFamily: t.fontFamily,
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 300, color: t.textSecondary, fontFamily: t.fontFamily }}>
        Loading department details...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: t.fontFamily, paddingBottom: FOOTER_HEIGHT + 40 }}>

        {/* ── Step 1: Department Details ───────────────────────────────── */}
      <div
        className="rounded-2xl mb-4"
        style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <span
              className="flex items-center justify-center rounded-full text-white text-xs font-bold flex-shrink-0"
              style={{ width: 24, height: 24, background: '#4338ca' }}
            >
              1
            </span>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: 0 }}>Department Details</h2>
          </div>

          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div style={{ flex: '0 1 400px', minWidth: 220 }}>
              <label style={labelStyle}>
                Department Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Enter department name"
                value={departmentName}
                readOnly={isView}
                disabled={isView}
                onChange={(e) => setDepartmentName(e.target.value)}
                style={fieldStyle}
              />
            </div>

            <div
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 rounded-xl"
              style={{ background: t.insetBg, flex: 1 }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary }}>
                Do you want to add designations for this department?
              </span>
              <div className="flex items-center gap-5 flex-shrink-0">
                <label className="flex items-center gap-2" style={{ fontSize: 12, color: t.textPrimary, cursor: isView ? 'default' : 'pointer' }}>
                  <input
                    type="radio" name="want_designations" checked={wantDesignations === true} disabled={isView}
                    onChange={() => setWantDesignations(true)}
                  />
                  Yes
                </label>
                <label className="flex items-center gap-2" style={{ fontSize: 12, color: t.textPrimary, cursor: isView ? 'default' : 'pointer' }}>
                  <input
                    type="radio" name="want_designations" checked={wantDesignations === false} disabled={isView}
                    onChange={() => setWantDesignations(false)}
                  />
                  No
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Step 2: Add Designations ─────────────────────────────────── */}
      {wantDesignations && (
        <div
          className="rounded-2xl mb-4"
          style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <span
                className="flex items-center justify-center rounded-full text-white text-xs font-bold flex-shrink-0"
                style={{ width: 24, height: 24, background: '#4338ca' }}
              >
                2
              </span>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: 0 }}>
                Add Designations{departmentName.trim() ? ` for ${departmentName.trim()} Department` : ''}
              </h2>
            </div>

            {!isView && (
              <>
                <label style={labelStyle}>Add Designation Name</label>
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <input
                    type="text"
                    placeholder="Enter designation name"
                    value={newDesignationName}
                    onChange={(e) => setNewDesignationName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDesignation(); } }}
                    style={{ ...fieldStyle, flex: '1 1 260px', maxWidth: 420 }}
                  />
                  <button
                    type="button"
                    onClick={addDesignation}
                    disabled={!newDesignationName.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{
                      background: !newDesignationName.trim() ? '#9ca3af' : 'linear-gradient(135deg,#4338ca,#4f46e5)',
                      border: 'none', cursor: !newDesignationName.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    <MdAdd size={17} /> Add Designation
                  </button>
                </div>
              </>
            )}

            {designations.length === 0 ? (
              <p style={{ color: t.textSecondary, fontSize: 12 }}>
                No designations added yet.
              </p>
            ) : (
              <div style={{ overflowX: 'auto', border: `1px solid ${t.surfaceBorder}`, borderRadius: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                  <thead>
                    <tr style={{ background: t.insetBg }}>
                      {['#', 'Designation Name', 'Status', 'Action'].map((h) => (
                        <th
                          key={h}
                          style={{
<<<<<<< HEAD
                            padding: '10px 16px', textAlign: h === 'Action' ? 'right' : 'left', fontSize: 12.5, fontWeight: 700,
                            textTransform: 'camelcase', letterSpacing: '0.04em', color: t.textSecondary,
=======
                            padding: '10px 16px', textAlign: h === 'Action' ? 'right' : 'left', fontSize: 11, fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.04em', color: t.textSecondary,
>>>>>>> V_16.0
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {designations.map((d, idx) => (
                      <tr
                        key={d.id ?? idx}
                        style={{
                          borderTop: `1px solid ${t.divider}`,
                          background: d.is_active ? 'transparent' : (isDark ? 'rgba(148,163,184,0.10)' : '#f3f4f6'),
                        }}
                      >
                        <td style={{ padding: '10px 16px', fontSize: 12, color: t.textSecondary, width: 48 }}>{idx + 1}</td>
                        <td style={{ padding: '10px 16px', fontSize: 12.5, fontWeight: 600, color: d.is_active ? t.textPrimary : t.textSecondary }}>
                          {editingDesignationId === d.id ? (
                            <input
                              type="text" autoFocus value={editingDesignationName}
                              onChange={(e) => setEditingDesignationName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); saveEditDesignation(); }
                                if (e.key === 'Escape') { e.preventDefault(); cancelEditDesignation(); }
                              }}
                              style={{
                                width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8,
                                padding: '6px 10px', fontSize: 12.5, fontWeight: 600, color: t.inputText, outline: 'none', fontFamily: t.fontFamily,
                              }}
                            />
                          ) : d.name}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <StatusPill active={d.is_active} />
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div className="flex items-center justify-end gap-3">
                            {editingDesignationId === d.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={saveEditDesignation}
                                  title="Save designation name"
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    width: 32, height: 32, borderRadius: 8,
                                    background: isDark ? 'rgba(34,197,94,0.12)' : '#f0fdf4',
                                    border: `1px solid ${isDark ? 'rgba(34,197,94,0.3)' : '#bbf7d0'}`,
                                    color: '#16a34a', cursor: 'pointer',
                                  }}
                                >
                                  <MdCheck size={17} />
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditDesignation}
                                  title="Cancel"
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    width: 32, height: 32, borderRadius: 8,
                                    background: t.insetBg, border: `1px solid ${t.surfaceBorder}`,
                                    color: t.textSecondary, cursor: 'pointer',
                                  }}
                                >
                                  <MdClose size={17} />
                                </button>
                              </>
                            ) : (
                              <>
                                {/* Sequence: Edit, Delete, then Enable/Disable toggle last. */}
                                {!isView && (
                                  <button
                                    type="button"
                                    onClick={() => startEditDesignation(d)}
                                    title="Edit designation name"
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      width: 32, height: 32, borderRadius: 8,
                                      background: isDark ? 'rgba(124,58,237,0.12)' : '#f5f3ff',
                                      border: `1px solid ${isDark ? 'rgba(124,58,237,0.3)' : '#ddd6fe'}`,
                                      color: '#7c3aed', cursor: 'pointer',
                                    }}
                                  >
                                    <MdEdit size={16} />
                                  </button>
                                )}
                                {!isView && (
                                  <button
                                    type="button"
                                    onClick={() => removeDesignation(d.id)}
                                    title="Delete designation"
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      width: 32, height: 32, borderRadius: 8,
                                      background: isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2',
                                      border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : '#fecaca'}`,
                                      color: '#dc2626', cursor: 'pointer',
                                    }}
                                  >
                                    <MdDelete size={17} />
                                  </button>
                                )}
                                <StatusToggle
                                  checked={d.is_active}
                                  disabled={isView}
                                  onChange={(v) => toggleDesignation(d.id, v)}
                                />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Action Buttons — fixed to the viewport bottom, always visible,
          not just once you scroll all the way down (same pattern as
          CustomerDetailsCrudPage.tsx's footer). Wraps + shrinks padding on
          narrow screens so both buttons stay fully reachable and tappable
          on mobile instead of overflowing. Rounded top corners + full
          border via master.css's .master-crud-footer, matching
          BuildingCrudPage.tsx's footer and the SectionCards above it. ── */}
      <div
        className="master-crud-footer flex items-center justify-center flex-wrap gap-2 sm:gap-3"
        style={{ background: t.surfaceBg, borderColor: t.surfaceBorder }}
      >
        <button
          type="button"
          onClick={() => navigate('/admin/masters/department')}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: isDark ? '#374151' : '#e5e7eb', color: t.textPrimary, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer' }}
        >
          <MdArrowBack size={16} /> Go Back
        </button>

        {!isView && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || saving}
            className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{
              background: !isFormValid || saving ? '#9ca3af' : 'linear-gradient(135deg,#4338ca,#4f46e5)',
              border: 'none', cursor: !isFormValid || saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.8 : 1,
            }}
          >
            <MdSave size={17} /> {saving ? 'Saving...' : mode === 'edit' ? 'Update' : 'Create'}
          </button>
        )}
      </div>
    </div>
  );
};

export default DepartmentCrudPage;
