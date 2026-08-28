// ==========================================
// DREAM GROUP CRM - EMPLOYEE CRUD PAGE
// ==========================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdArrowBack, MdCloudUpload, MdPerson, MdBusinessCenter, MdAccountBalance,
  MdGroups, MdInfoOutline, MdDescription, MdCheckCircle, MdOpenInNew,
} from 'react-icons/md';

import { useAppSelector } from '../../../../hooks';
import { getTheme } from '../../../../styles/theme';
import { formatDate } from '../../../../utils';
import {
  ViewEmployee, fetchNextEmployeeCode, createEmployee, EditEmployee,
  fetchEmployeePermissions, FetchEmployeeDetails,
  FetchVisibleEmployees, AssignVisibleEmployees, SetEmployeeRole,
  EmployeeFormValues, EmployeeFileValues, EmployeeStatus,
} from '../../../../services/employeeDetailsService';
import { FetchDepartmentList } from '../../../../services/departmentService';
import { fetchDesignationList } from '../../../../services/designationService';
import { fetchMappingMatrix } from '../../../../services/moduleActionService';
import { fetchAssignableRoles } from '../../../../services/roleService';
import './EmployeeDetails.css';

// Employee Status badge colors for View mode — same palette as
// EmployeeDetailsListPage.tsx's STATUS_STYLES, kept as its own small local
// copy since that map isn't exported (and View mode only ever needs the
// label + 2 colors, not the full card-rendering logic built around it there).
const VIEW_STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: '#dcfce7', color: '#16a34a', label: 'Active' },
  inactive: { bg: '#fee2e2', color: '#dc2626', label: 'Inactive' },
  on_leave: { bg: '#fef9c3', color: '#ca8a04', label: 'On Leave' },
};

type Mode = 'add' | 'edit' | 'view';
interface Props { mode: Mode; }
type Theme = ReturnType<typeof getTheme>;

const COUNTRY_CODES = ['+91', '+1', '+44', '+61', '+971'];
const WORKING_HOURS_OPTIONS = ['8', '9', '10'];
const HOLIDAYS_OPTIONS = ['Sunday Only', 'Alternate Saturdays + Sunday', 'All Saturdays + Sunday', 'Custom / As per Company Policy'];
const ACCOUNT_TYPE_OPTIONS = ['Savings', 'Current'];
const STATUS_OPTIONS: { value: EmployeeStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

// Sticky crud-footer height, matching every other Master CRUD page's
// convention — page wrapper reserves this much bottom padding so the
// fixed footer never overlaps form content.
const FOOTER_HEIGHT = 76;

// Native date/time inputs only open their picker when the calendar/clock
// icon itself is clicked — clicking anywhere else in the field just moves
// the text caret. showPicker() opens it from a click anywhere in the field;
// it's a no-op (via optional chaining) in browsers that don't support it,
// where the icon-only click still works as before.
const openPicker = (e: React.MouseEvent<HTMLInputElement>) => e.currentTarget.showPicker?.();

// A checklist option with a real backend id (department/designation/
// module-action id) driving selection, and a display label.
interface IdOption { value: number; label: string; }

// Designation options carry which Department they belong to (Designation
// Master's own department_id — nullable for a "global" designation not tied
// to any one department), so the Assign Designations checklist can be
// filtered down to only the departments currently checked above it.
interface DesignationOption extends IdOption { departmentId: number | null; }

const emptyForm: EmployeeFormValues = {
  first_name: '', middle_name: '', last_name: '', date_of_birth: '', email: '',
  mobile_country_code: '+91', mobile_number: '',
  alternate_country_code: '+91', alternate_number: '',
  whatsapp_country_code: '+91', whatsapp_number: '',
  address: '', aadhar_number: '', pan_number: '',
  joining_date: '', working_hours: '', check_in_time: '', check_out_time: '',
  holidays: '', salary: '',
  account_holder_name: '', bank_name: '', bank_account_number: '', account_type: '', ifsc_code: '', branch: '',
  department_names: [], designation_names: [], module_keys: [],
  department_ids: [], designation_ids: [], module_action_ids: [],
  status: 'active',
  is_active: true,
};

// Field/label styling now lives in EmployeeDetails.css as .emp-field /
// .emp-label (+ .emp-field-view for the isView background swap) — colors
// come in via the --emp-* CSS vars set on the page's outer wrapper below.
const fieldClassName = (isView: boolean) => (isView ? 'emp-field emp-field-view' : 'emp-field');

// ── Helper components — ALL defined at module scope (outside the page
// component) rather than inside it. This is the fix for the "cursor
// disappears after one keystroke" bug: when a component is declared
// inside another component's function body, React sees a brand-new
// function reference on every re-render and treats it as an entirely new
// component type — which unmounts and remounts its whole DOM subtree
// (every input included) on every single keystroke, since typing updates
// `form` state and re-renders the page. Defined out here, these keep a
// stable identity across renders, so React just updates props/DOM in
// place and focus is never lost. ────────────────────────────────────────

// Full-bleed gradient header bar for each CRUD section (Personal Details /
// Office Use Only / Bank Details / Assign Action & Module) — same visual
// language as the ResultPanelHeader used on the Scheme pages. The negative
// margins exactly cancel the parent card's own `p-5 sm:p-6` padding so this
// bar reaches the card's edges and top corners without needing
// `overflow-hidden` on the parent (which would risk clipping any dropdown
// that opens near a section's bottom edge) — `rounded-t-2xl` here matches
// the parent's own top corner radius instead. `mb-5` restores the original
// spacing before the fields grid below.
const SectionHeader: React.FC<{ t: Theme; icon: React.ReactNode; title: string; gradient: string }> = ({ icon, title, gradient }) => (
  <div
    className="flex items-center gap-2.5 -mt-5 -mx-5 sm:-mt-6 sm:-mx-6 mb-5 px-5 sm:px-6 py-3.5 rounded-t-2xl"
    style={{ background: gradient }}
  >
    <span className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.22)' }}>
      {icon}
    </span>
    <h2 className="emp-section-title">{title}</h2>
  </div>
);

const Field: React.FC<{ t: Theme; label: string; required?: boolean; children: React.ReactNode; className?: string }> = ({ t, label, required, children, className }) => (
  <div className={className}>
    <label className="emp-label">{label}{required && <span className="emp-required"> *</span>}</label>
    {children}
  </div>
);

const PhoneField: React.FC<{
  t: Theme; isView: boolean;
  label: string; required?: boolean;
  code: string; number: string;
  onCode: (v: string) => void; onNumber: (v: string) => void;
}> = ({ t, isView, label, required, code, number, onCode, onNumber }) => (
  <Field t={t} label={label} required={required}>
    <div className="flex gap-2">
      <select value={code} disabled={isView} onChange={(e) => onCode(e.target.value)} className={fieldClassName(isView)} style={{ width: 80, cursor: isView ? 'default' : 'pointer' }}>
        {COUNTRY_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input
        type="tel" placeholder="Enter mobile number" value={number} readOnly={isView} disabled={isView}
        onChange={(e) => onNumber(e.target.value.replace(/[^\d]/g, ''))}
        className={fieldClassName(isView)}
      />
    </div>
  </Field>
);

const FileUploadBox: React.FC<{
  t: Theme; isView: boolean;
  label: string; hint: string; accept: string; required?: boolean;
  file: File | null | undefined; existingUrl?: string | null;
  onChange: (f: File | null) => void;
}> = ({ t, isView, label, hint, accept, required, file, existingUrl, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayName = file?.name || (existingUrl ? String(existingUrl).split('/').pop() : null);
  return (
    <Field t={t} label={label} required={required}>
      <button
        type="button"
        disabled={isView}
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center gap-2.5 rounded-xl"
        style={{
          border: `1.5px dashed ${t.inputBorder}`, padding: '12px 14px',
          background: isView ? t.insetBg : t.inputBg, cursor: isView ? 'default' : 'pointer', textAlign: 'left',
        }}
      >
        <MdCloudUpload size={18} style={{ color: '#4338ca', flexShrink: 0 }} />
        <div className="min-w-0">
          <div style={{ fontSize: 11.5, fontWeight: 600, color: '#4338ca' }}>
            {displayName ? 'Change File' : label.startsWith('Upload') ? label : `Upload ${label}`}
          </div>
          <div style={{ fontSize: 10, color: t.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName || hint}
          </div>
        </div>
      </button>
      <input
        ref={inputRef} type="file" hidden accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </Field>
  );
};

// Checkbox checklist driven by real {value, label} options (department/
// designation ids from Department & Designation Master, module_action ids
// from the module-action mapping table) rather than a hardcoded string
// list. `loading` renders a lightweight placeholder while the options are
// still being fetched.
const CheckboxGroup: React.FC<{
  t: Theme; isView: boolean;
  label: string; required?: boolean; options: IdOption[];
  selected: number[]; onToggle: (v: number) => void; emptyHint?: string; loading?: boolean;
  // 'plain' — Department/Designation's compact inline checklist (default).
  // 'chip' — Assign Visible Employees: one pill per employee, checkbox
  // first, wrapping to a new line whenever the row runs out of width.
  variant?: 'plain' | 'chip';
}> = ({ t, isView, label, required, options, selected, onToggle, emptyHint, loading, variant = 'plain' }) => (
  <div className="mb-5">
    <label className="emp-label">{label}{required && <span className="emp-required"> *</span>}</label>
    {loading ? (
      <p className="emp-hint-text">Loading...</p>
    ) : options.length === 0 ? (
      <p className="emp-hint-text">{emptyHint}</p>
    ) : variant === 'chip' ? (
      <div className="emp-chip-row">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`emp-chip${selected.includes(opt.value) ? ' emp-chip-checked' : ''}`}
            style={{ cursor: isView ? 'default' : 'pointer' }}
          >
            <input type="checkbox" checked={selected.includes(opt.value)} disabled={isView} onChange={() => onToggle(opt.value)} />
            {opt.label}
          </label>
        ))}
      </div>
    ) : (
      <div className="flex flex-wrap gap-x-5 gap-y-2.5">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2" style={{ fontSize: 12, color: t.textPrimary, cursor: isView ? 'default' : 'pointer' }}>
            <input type="checkbox" checked={selected.includes(opt.value)} disabled={isView} onChange={() => onToggle(opt.value)} />
            {opt.label}
          </label>
        ))}
      </div>
    )}
  </div>
);

// Unified shape both the Add-mode source (fetchMappingMatrix — flat
// modules/actions/mappings, nothing pre-checked) and the Edit/View-mode
// source (fetchEmployeePermissions — already grouped by module, with an
// `assigned` flag per action) get normalized into, so ONE grid component
// and ONE piece of loading code serves every mode. `cells` only has an
// entry where that module actually supports that action — a module/action
// combination with no mapping renders as a blank "—" cell, not an
// unchecked checkbox, since checking it would have nothing to save.
interface ModuleActionGridData {
  modules: { id: number; name: string }[];
  actionColumns: { code: string; label: string }[];
  cells: Record<string, number>; // `${moduleId}:${actionCode}` -> module_actions.id
}
const emptyModuleGrid: ModuleActionGridData = { modules: [], actionColumns: [], cells: {} };

// Fixed column order for the grid — "Convert" deliberately excluded (only
// Customers uses it, and it's not part of the standard action set this
// grid is meant to show); everything else appears in this exact order
// regardless of the action_master.code alphabetical order the API returns.
const ACTION_COLUMN_ORDER = ['assign', 'create', 'view', 'edit', 'delete', 'export', 'manage'];
const orderActionColumns = (labelByCode: Map<string, string>): { code: string; label: string }[] =>
  ACTION_COLUMN_ORDER.filter((code) => labelByCode.has(code)).map((code) => ({ code, label: labelByCode.get(code)! }));

// ── Assign Actions & Modules — module-rows x action-columns grid, checkbox
//    at each cell the module actually supports (see ModuleActionGridData
//    above). Replaces the old flat "Module – Action" checkbox list so it's
//    clear at a glance which actions apply to which module.
const ModuleActionGrid: React.FC<{
  t: Theme; isView: boolean; grid: ModuleActionGridData;
  selected: number[]; onToggle: (moduleActionId: number) => void; loading?: boolean;
}> = ({ t, isView, grid, selected, onToggle, loading }) => {
  if (loading) return <p className="emp-hint-text">Loading...</p>;
  if (grid.modules.length === 0) return <p className="emp-hint-text">No modules available.</p>;
  return (
    <div className="emp-grid-scroll" style={{ border: `1px solid ${t.surfaceBorder}`, borderRadius: 12 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 560 }}>
        <thead>
          <tr>
            <th className="emp-grid-th-gradient">
              Module
            </th>
            {grid.actionColumns.map((a) => (
              <th key={a.code} className="emp-grid-th-gradient emp-grid-th-gradient-center">
                {a.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.modules.map((m) => (
            <tr key={m.id} className="emp-grid-tr">
              <td className="emp-grid-td">
                {m.name}
              </td>
              {grid.actionColumns.map((a) => {
                const moduleActionId = grid.cells[`${m.id}:${a.code}`];
                const checked = moduleActionId != null && selected.includes(moduleActionId);
                return (
                  <td key={a.code} className={`emp-grid-td-center${checked ? ' emp-grid-td-checked' : ''}`}>
                    {moduleActionId != null ? (
                      isView ? (
                        checked ? <MdCheckCircle size={15} color="#16a34a" /> : <span style={{ color: t.divider }}>–</span>
                      ) : (
                        <input
                          type="checkbox" checked={checked} disabled={isView}
                          style={{ cursor: isView ? 'default' : 'pointer' }}
                          onChange={() => onToggle(moduleActionId)}
                        />
                      )
                    ) : (
                      <span style={{ color: t.divider }}>—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── View mode — label-over-value "ID card" cell, used instead of Field's
// label+input pairing so a read-only page never looks like a disabled form.
const ViewValue: React.FC<{ label: string; value: React.ReactNode; className?: string }> = ({ label, value, className }) => (
  <div className={`emp-view-field${className ? ` ${className}` : ''}`}>
    <div className="emp-view-label">{label}</div>
    <div className="emp-view-value">
      {value === '' || value == null ? <span style={{ opacity: 0.5 }}>—</span> : value}
    </div>
  </div>
);

// ── View mode — one uploaded-document card (Aadhar/PAN/Resume/Appointment
// Letter/Passbook). Shows an inline thumbnail for image uploads, a generic
// document icon otherwise, and a "View" link that opens the file in a new
// tab — no download machinery of our own, just the URL the backend already
// serves uploaded files from.
// Real preview, not just a filename — an image renders as an actual
// thumbnail spanning the card's top; a PDF/other document gets a clear
// document icon block instead, since there's no reasonable inline
// thumbnail for those. Either way, the whole card opens the file in a new
// tab (the browser's own image/PDF viewer) on click, not just a small
// "View" link tucked into a corner.
const DocumentCard: React.FC<{ t: Theme; label: string; url?: string | null }> = ({ t, label, url }) => {
  const isImage = !!url && /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);
  const content = (
    <>
      <div
        className="w-full flex items-center justify-center overflow-hidden"
        style={{
          height: 120,
          background: isImage ? t.insetBg : url ? 'linear-gradient(135deg,#0284c7,#7c3aed)' : t.insetBg,
        }}
      >
        {isImage && url ? (
          <img src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <MdDescription size={34} color={url ? '#fff' : t.textSecondary} />
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
        <div className="min-w-0">
          <div className="emp-doc-card-label">{label}</div>
          <div className="emp-doc-card-status">{url ? 'Uploaded' : 'Not uploaded'}</div>
        </div>
        {url && (
          <span className="emp-doc-card-link" style={{ flexShrink: 0 }}>
            <MdOpenInNew size={12} /> Open
          </span>
        )}
      </div>
    </>
  );
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="emp-doc-card" style={{ border: `1px solid ${t.surfaceBorder}`, background: t.insetBg, textDecoration: 'none' }}>
      {content}
    </a>
  ) : (
    <div className="emp-doc-card" style={{ border: `1px solid ${t.surfaceBorder}`, background: t.insetBg, cursor: 'default' }}>
      {content}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────
const EmployeeDetailsCrudPage: React.FC<Props> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mode: themeMode } = useAppSelector((s) => s.theme);
  const isDark = themeMode === 'dark';
  const t = getTheme(isDark);
  const isView = mode === 'view';

  const [fetching, setFetching] = useState(mode !== 'add');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<EmployeeFormValues>(emptyForm);
  const [files, setFiles] = useState<EmployeeFileValues>({});
  const [existingUrls, setExistingUrls] = useState<Record<string, string | null | undefined>>({});
  const [employeeCode, setEmployeeCode] = useState<string | null>(null);

  // Assign Departments / Assign Designations / Assign Actions & Modules
  // checklist options — fetched from the real Department, Designation and
  // Module/Action masters (see file header note in employeeDetailsService.ts;
  // this used to be a fixed static list with no real ids at all).
  const [departmentOptions, setDepartmentOptions] = useState<IdOption[]>([]);
  const [designationOptions, setDesignationOptions] = useState<DesignationOption[]>([]);
  const [moduleGrid, setModuleGrid] = useState<ModuleActionGridData>(emptyModuleGrid);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingDesignations, setLoadingDesignations] = useState(true);
  const [loadingModules, setLoadingModules] = useState(true);

  // Assign Visible Employees — which other employees this one can view/
  // manage (see AssignVisibleEmployees in employeeDetailsService.ts: reuses
  // the reporting-line mechanism, so this is a genuine checklist like
  // Department/Designation above, not a numeric cap).
  const [visibleEmployeeOptions, setVisibleEmployeeOptions] = useState<IdOption[]>([]);
  const [visibleEmployeeIds, setVisibleEmployeeIds] = useState<number[]>([]);
  const [loadingVisibleEmployees, setLoadingVisibleEmployees] = useState(true);

  // User Management — Role. Lives outside `form` (like visibleEmployeeIds
  // above) since role_id is saved through its own endpoint (SetEmployeeRole),
  // not the main Employee create/update payload — see
  // employeeDetailsService.ts's comment on why.
  const [roleOptions, setRoleOptions] = useState<IdOption[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [loadingRoles, setLoadingRoles] = useState(true);

  const set = <K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setFile = (key: keyof EmployeeFileValues) => (f: File | null) =>
    setFiles((prev) => ({ ...prev, [key]: f }));

  // ── Scroll-wheel stepping for Check In/Check Out (time) and Date of Birth
  // (date) — native browser scroll-to-adjust on these input types is wildly
  // inconsistent: on a trackpad it fires many wheel events per physical
  // gesture, so time fields flip through many minutes on one scroll (too
  // fast); the date field's native step, by contrast, reads as sluggish (too
  // slow). Both are intercepted here and driven by one deliberate step per
  // throttle window instead — a longer window for time (normal/expected
  // speed), a shorter one for date (snappier than the native default).
  const timeWheelThrottleRef = useRef(0);
  const dateWheelThrottleRef = useRef(0);

  const stepTime = (value: string, deltaSign: number): string => {
    const [hStr, mStr] = (value || '00:00').split(':');
    let h = Number(hStr) || 0;
    let m = (Number(mStr) || 0) + deltaSign;
    if (m < 0) { m = 59; h = (h + 23) % 24; }
    if (m > 59) { m = 0; h = (h + 1) % 24; }
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const handleTimeWheel = (key: 'check_in_time' | 'check_out_time') => (e: React.WheelEvent<HTMLInputElement>) => {
    if (isView) return;
    e.preventDefault();
    const now = Date.now();
    if (now - timeWheelThrottleRef.current < 120) return;
    timeWheelThrottleRef.current = now;
    set(key, stepTime(form[key], e.deltaY > 0 ? -1 : 1));
  };

  const stepDate = (value: string, deltaSign: number): string => {
    const base = value ? new Date(`${value}T00:00:00`) : new Date();
    if (Number.isNaN(base.getTime())) return value;
    base.setDate(base.getDate() + deltaSign);
    return base.toISOString().slice(0, 10);
  };

  const handleDobWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    if (isView) return;
    e.preventDefault();
    const now = Date.now();
    if (now - dateWheelThrottleRef.current < 40) return;
    dateWheelThrottleRef.current = now;
    set('date_of_birth', stepDate(form.date_of_birth, e.deltaY > 0 ? -1 : 1));
  };

  // ── employee code preview (Add) or actual code (Edit/View) ────────────
  useEffect(() => {
    if (mode !== 'add') return;
    (async () => {
      const code = await fetchNextEmployeeCode();
      setEmployeeCode(code); // null -> falls back to "Auto-generated" in the UI
    })();
  }, [mode]);

  // ── Assign Departments / Assign Designations checklist options — real
  //    Department & Designation Master data, needed in every mode ────────
  useEffect(() => {
    (async () => {
      try {
        const res = await FetchDepartmentList(1, 1000);
        if (res.success) setDepartmentOptions((res.rows || []).map((d) => ({ value: Number(d.id), label: d.name })));
      } catch {
        toast.error('Failed to load departments.');
      } finally {
        setLoadingDepartments(false);
      }
    })();
    (async () => {
      try {
        const res = await fetchDesignationList(1, 1000);
        if (res.success) {
          setDesignationOptions((res.rows || []).map((d) => ({
            value: Number(d.id), label: d.name,
            departmentId: d.department_id != null && d.department_id !== '' ? Number(d.department_id) : null,
          })));
        }
      } catch {
        toast.error('Failed to load designations.');
      } finally {
        setLoadingDesignations(false);
      }
    })();
  }, []);

  // ── Role dropdown options — needed in every mode. Uses the plain
  //    admin-usable /masters/roles dropdown, not the SuperAdmin-only Role
  //    Master screen's /role endpoint (roleService.fetchRoleList) — see
  //    fetchAssignableRoles's own comment. ─────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchAssignableRoles();
        if (res.success) setRoleOptions((res.data || []).map((r) => ({ value: Number(r.id), label: r.name })));
      } catch {
        toast.error('Failed to load roles.');
      } finally {
        setLoadingRoles(false);
      }
    })();
  }, []);

  // ── Assign Actions & Modules grid — Add mode only. There's no employeeId
  //    yet, so /employee-permissions/:id can't be used; build the grid from
  //    the full Module x Action mapping matrix instead, all unchecked
  //    initially. (Edit/View mode builds the same grid shape, pre-checked,
  //    from fetchEmployeePermissions in the load effect below.)
  useEffect(() => {
    if (mode !== 'add') return;
    (async () => {
      try {
        const res = await fetchMappingMatrix();
        if (res.success) {
          // Keys normalized to Number — the matrix endpoint returns
          // modules[].id/actions[].id as numbers but mappings[].module_id/
          // action_master_id as numeric strings (raw Postgres bigint), so a
          // strict Map.get() on the raw values always missed.
          const modulesById = new Map(res.data.modules.map((m) => [Number(m.id), m]));
          const actionsById = new Map(res.data.actions.map((a) => [Number(a.id), a]));
          const modules = res.data.modules.map((m) => ({ id: Number(m.id), name: m.name }));
          const actionLabelByCode = new Map<string, string>();
          const cells: Record<string, number> = {};
          res.data.mappings.forEach((mp) => {
            const mod = modulesById.get(Number(mp.module_id));
            const act = actionsById.get(Number(mp.action_master_id));
            if (!mod || !act) return;
            actionLabelByCode.set(act.code, act.name || act.code);
            cells[`${Number(mp.module_id)}:${act.code}`] = Number(mp.id);
          });
          const actionColumns = orderActionColumns(actionLabelByCode);
          setModuleGrid({ modules, actionColumns, cells });
        }
      } catch {
        toast.error('Failed to load module/action list.');
      } finally {
        setLoadingModules(false);
      }
    })();
  }, [mode]);

  // ── Assign Visible Employees checklist options — every other employee in
  //    the company, needed in every mode; the currently-assigned set is
  //    loaded below alongside Edit/View's other per-employee data.
  //    activeOnly=true — a deactivated employee isn't a meaningful pick for
  //    "who can this employee view/manage". ─────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await FetchEmployeeDetails(1, 1000, undefined, true);
        if (res.success) {
          const opts = (res.rows || [])
            .filter((e) => !(mode !== 'add' && id && String(e.id) === id))
            .map((e) => ({ value: Number(e.id), label: `${e.first_name} ${e.last_name || ''}`.trim() + (e.employee_code ? ` (${e.employee_code})` : '') }));
          setVisibleEmployeeOptions(opts);
        }
      } catch {
        toast.error('Failed to load employee list.');
      } finally {
        if (mode === 'add') setLoadingVisibleEmployees(false);
      }
    })();
  }, [mode, id]);

  // ── load for edit/view ───────────────────────────────────────────────
  useEffect(() => {
    if (mode === 'add' || !id) return;
    (async () => {
      setFetching(true);
      try {
        const res = await ViewEmployee(id);
        if (res.success && res.data) {
          const e = res.data;
          setEmployeeCode(e.employee_code);
          setForm({
            first_name: e.first_name || '', middle_name: e.middle_name || '', last_name: e.last_name || '',
            date_of_birth: e.date_of_birth || '', email: e.email || '',
            mobile_country_code: e.mobile_country_code || '+91', mobile_number: e.mobile_number || '',
            alternate_country_code: e.alternate_country_code || '+91', alternate_number: e.alternate_number || '',
            whatsapp_country_code: e.whatsapp_country_code || '+91', whatsapp_number: e.whatsapp_number || '',
            address: e.address || '', aadhar_number: e.aadhar_number || '', pan_number: e.pan_number || '',
            joining_date: e.joining_date || '', working_hours: e.working_hours || '',
            check_in_time: e.check_in_time || '', check_out_time: e.check_out_time || '',
            holidays: e.holidays || '', salary: e.salary != null ? String(e.salary) : '',
            account_holder_name: e.account_holder_name || '', bank_name: e.bank_name || '',
            bank_account_number: e.bank_account_number || '', account_type: e.account_type || '',
            ifsc_code: e.ifsc_code || '', branch: e.branch || '',
            department_names: e.department_names || [], designation_names: e.designation_names || [],
            module_keys: [],
            department_ids: (e.department_ids || []).map(Number),
            designation_ids: (e.designation_ids || []).map(Number),
            module_action_ids: [], // filled in below once /employee-permissions loads
            status: e.status || 'active',
            is_active: e.is_active,
          });
          setSelectedRoleId(e.role_id != null ? Number(e.role_id) : null);
          setExistingUrls({
            profile_photo: e.profile_photo_url, aadhar_card: e.aadhar_card_url, pan_card: e.pan_card_url,
            resume: e.resume_url, appointment_letter: e.appointment_letter_url, passbook_photo: e.passbook_photo_url,
          });
        } else {
          toast.error('Failed to load employee details.');
        }
      } catch {
        toast.error('Failed to load employee details.');
      } finally {
        setFetching(false);
      }

      // Assign Actions & Modules grid, pre-checked — one call gives both the
      // full assignable list AND which ones are currently assigned, already
      // grouped by module, for this existing employee.
      try {
        const permRes = await fetchEmployeePermissions(id);
        if (permRes.success) {
          const modules = (permRes.data || []).map((mod) => ({ id: mod.module_id, name: mod.module_name }));
          const actionLabelByCode = new Map<string, string>();
          const cells: Record<string, number> = {};
          const assignedIds: number[] = [];
          (permRes.data || []).forEach((mod) => {
            mod.actions.forEach((a) => {
              actionLabelByCode.set(a.action, a.label || a.action);
              cells[`${mod.module_id}:${a.action}`] = a.module_action_id;
              if (a.assigned) assignedIds.push(a.module_action_id);
            });
          });
          const actionColumns = orderActionColumns(actionLabelByCode);
          setModuleGrid({ modules, actionColumns, cells });
          setForm((prev) => ({ ...prev, module_action_ids: assignedIds }));
        }
      } catch {
        toast.error('Failed to load module/action permissions.');
      } finally {
        setLoadingModules(false);
      }

      // Assign Visible Employees checklist, pre-checked from this
      // employee's current reporting-line assignments (see
      // AssignVisibleEmployees / getVisibleEmployees).
      try {
        const visRes = await FetchVisibleEmployees(id);
        if (visRes.success) setVisibleEmployeeIds((visRes.data || []).map((e) => Number(e.id)));
      } catch {
        toast.error('Failed to load visible-employees assignment.');
      } finally {
        setLoadingVisibleEmployees(false);
      }
    })();
  }, [mode, id]);

  const toggleIdInArray = (key: 'department_ids' | 'designation_ids' | 'module_action_ids', value: number) => {
    setForm((prev) => {
      const arr = prev[key];
      return { ...prev, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  };

  // Assign Designations is scoped to whichever Departments are checked above
  // it — e.g. checking "Sales" only reveals Sales's designations; unchecking
  // it hides them again. A designation with no department_id of its own
  // (Designation Master allows leaving it unset) is treated as global and
  // always stays visible, since there's no department to scope it to.
  const visibleDesignationOptions = useMemo(
    () => designationOptions.filter((d) => d.departmentId == null || form.department_ids.includes(d.departmentId)),
    [designationOptions, form.department_ids]
  );

  // Toggling a Department off also drops any currently-selected designation
  // that belongs ONLY to that department — otherwise it would keep counting
  // as "assigned" while no longer being visible/editable in the checklist.
  const toggleDepartment = (deptId: number) => {
    setForm((prev) => {
      const isChecked = prev.department_ids.includes(deptId);
      const department_ids = isChecked
        ? prev.department_ids.filter((v) => v !== deptId)
        : [...prev.department_ids, deptId];
      const designation_ids = isChecked
        ? prev.designation_ids.filter((desigId) => {
            const opt = designationOptions.find((d) => d.value === desigId);
            return !opt || opt.departmentId == null || department_ids.includes(opt.departmentId);
          })
        : prev.designation_ids;
      return { ...prev, department_ids, designation_ids };
    });
  };

  // Assign Visible Employees lives outside `form` — it saves through a
  // separate endpoint (AssignVisibleEmployees), not the main employee
  // payload, so it isn't part of EmployeeFormValues.
  const toggleVisibleEmployee = (value: number) => {
    setVisibleEmployeeIds((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
  };

  // ── validation ────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!form.first_name.trim()) return 'Please enter the First Name.';
    if (!form.last_name.trim()) return 'Please enter the Last Name.';
    if (!form.date_of_birth) return 'Please enter the Date of Birth.';
    if (!form.email.trim()) return 'Please enter the Email address.';
    if (!form.mobile_number.trim()) return 'Please enter the Mobile Number.';
    if (!form.address.trim()) return 'Please enter the Address.';
    if (!form.aadhar_number.trim()) return 'Please enter the Aadhar Number.';
    if (!files.aadhar_card && !existingUrls.aadhar_card) return 'Please upload the Aadhar Card.';
    if (!form.pan_number.trim()) return 'Please enter the PAN Number.';
    if (!files.pan_card && !existingUrls.pan_card) return 'Please upload the PAN Card.';
    if (!files.profile_photo && !existingUrls.profile_photo) return 'Please upload the Profile Photo.';
    if (!form.joining_date) return 'Please enter the Employee Joining Date.';
    if (!form.working_hours) return 'Please select Working Hours.';
    if (!form.check_in_time || !form.check_out_time) return 'Please enter both Check In and Check Out time.';
    if (!form.holidays) return 'Please select Holidays.';
    if (!form.salary.trim()) return 'Please enter the Salary.';
    if (!form.account_holder_name.trim()) return 'Please enter the Account Holder Name.';
    if (!form.bank_name.trim()) return 'Please enter the Bank Name.';
    if (!form.bank_account_number.trim()) return 'Please enter the Bank Account Number.';
    if (!form.account_type) return 'Please select the Account Type.';
    if (!form.ifsc_code.trim()) return 'Please enter the IFSC Code.';
    if (!form.branch.trim()) return 'Please enter the Branch.';
    if (!files.passbook_photo && !existingUrls.passbook_photo) return 'Please upload the Bank Passbook Photo.';
    if (form.department_ids.length === 0) return 'Please assign at least one Department.';
    if (form.designation_ids.length === 0) return 'Please assign at least one Designation.';
    if (form.module_action_ids.length === 0) return 'Please assign at least one Action/Module.';
    return null;
  };

  const isFormValid = validate() === null;

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      let targetId = id;
      if (mode === 'edit' && id) {
        await EditEmployee(id, form, files);
        toast.success('Employee updated successfully.');
      } else {
        const created = await createEmployee(form, files);
        targetId = created.data?.id != null ? String(created.data.id) : undefined;
        toast.success('Employee created successfully.');
      }
      // Visible-employees assignment and Role both save through their own
      // endpoints (neither is part of the Employee payload) — always sent,
      // including an empty Visible Employees selection, so unchecking
      // everyone on Edit actually clears it rather than leaving the
      // previous assignment in place. The two calls are independent of each
      // other, so they run in parallel (Promise.allSettled — each still
      // gets its own error toast regardless of how the other one turns
      // out) instead of one waiting on the other to finish first; this used
      // to add two full sequential round-trips after the main save before
      // the page would navigate away.
      if (targetId) {
        const [visibleResult, roleResult] = await Promise.allSettled([
          AssignVisibleEmployees(targetId, visibleEmployeeIds),
          SetEmployeeRole(targetId, selectedRoleId),
        ]);
        if (visibleResult.status === 'rejected') {
          toast.error('Employee saved, but failed to update the Visible Employees assignment.');
        }
        if (roleResult.status === 'rejected') {
          toast.error('Employee saved, but failed to update the Role assignment.');
        }
      }
      navigate('/admin/employee/employee-details');
    } catch (err: any) {
      const fallback = mode === 'edit' ? 'Failed to update employee.' : 'Failed to create employee.';
      toast.error(err?.response?.data?.message || fallback);
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = fieldClassName(isView);

  if (fetching) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 300, color: t.textSecondary, fontFamily: t.fontFamily }}>
        Loading employee details...
      </div>
    );
  }

  // ── CSS custom properties for EmployeeDetails.css — set once here from
  // this page's own getTheme(isDark) values, consumed by the emp-* classes
  // used throughout this page's form fields/labels/grid below. ──────────
  const cssVars = {
    '--emp-field-bg': t.inputBg, '--emp-field-border': t.inputBorder, '--emp-field-text': t.inputText,
    '--emp-inset-bg': t.insetBg, '--emp-text-primary': t.textPrimary, '--emp-text-secondary': t.textSecondary,
    '--emp-surface-border': t.surfaceBorder, '--emp-divider': t.divider,
  } as React.CSSProperties;

  // ── View mode — a completely separate, read-only "ID card" layout instead
  // of the same form fields disabled: 4 boxes (Personal Details / Office Use
  // Only / Bank Details / Assign Action & Module) in 2 rows, label-over-
  // value cells instead of inputs, plus an Uploaded Documents section. The
  // sticky footer below is untouched from the add/edit return further down
  // — same markup, same behavior, same positioning.
  if (isView) {
    const statusStyle = VIEW_STATUS_STYLES[form.status] || VIEW_STATUS_STYLES.active;
    const roleLabel = roleOptions.find((r) => r.value === selectedRoleId)?.label || 'No role assigned';
    const deptLabels = departmentOptions.filter((d) => form.department_ids.includes(d.value)).map((d) => d.label);
    const desigLabels = designationOptions.filter((d) => form.designation_ids.includes(d.value)).map((d) => d.label);
    const visibleLabels = visibleEmployeeOptions.filter((e) => visibleEmployeeIds.includes(e.value)).map((e) => e.label);
    const fullName = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ');

    return (
      <div style={{ fontFamily: t.fontFamily, paddingBottom: FOOTER_HEIGHT + 40, ...cssVars }}>

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/employee/employee-details')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textPrimary, padding: 6 }}
            >
              <MdArrowBack size={20} />
            </button>
            <div>
              <h1 className="emp-crud-title">View Employee</h1>
              <p className="emp-crud-subtitle">Employee details</p>
            </div>
          </div>

          <div className="emp-id-badge">
            <span className="emp-id-value">Employee ID - {employeeCode || '—'}</span>
          </div>
        </div>

        {/* ── Identity strip — photo + name + email, above the 4 boxes ──── */}
        <div className="flex items-center gap-3 mb-5">
          {existingUrls.profile_photo ? (
            <img src={existingUrls.profile_photo} alt="" className="rounded-full flex-shrink-0" style={{ width: 56, height: 56, objectFit: 'cover' }} />
          ) : (
            <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ width: 56, height: 56, background: 'linear-gradient(135deg,#4338ca,#4f46e5)', fontSize: 18 }}>
              {(form.first_name[0] || '')}{(form.last_name[0] || '')}
            </div>
          )}
          <div className="min-w-0">
            <div style={{ fontSize: 16, fontWeight: 800, color: t.textPrimary, wordBreak: 'break-word' }}>{fullName || '—'}</div>
            <div style={{ fontSize: 11.5, color: t.textSecondary }}>{form.email}</div>
          </div>
          <span className="emp-view-status-badge" style={{ background: statusStyle.bg, color: statusStyle.color }}>{statusStyle.label}</span>
        </div>

        {/* ── Row 1: Personal Details + Office Use Only ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <div className="rounded-2xl p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
            <SectionHeader t={t} icon={<MdPerson size={16} />} title="Personal Details" gradient="var(--grad-sky)" />
            <div className="emp-view-grid">
              <ViewValue label="First Name" value={form.first_name} />
              <ViewValue label="Middle Name" value={form.middle_name} />
              <ViewValue label="Last Name" value={form.last_name} />
              <ViewValue label="Date of Birth" value={form.date_of_birth ? formatDate(form.date_of_birth) : ''} />
              <ViewValue label="Mobile Number" value={form.mobile_number ? `${form.mobile_country_code} ${form.mobile_number}` : ''} />
              <ViewValue label="Alternate Number" value={form.alternate_number ? `${form.alternate_country_code} ${form.alternate_number}` : ''} />
              <ViewValue label="WhatsApp Number" value={form.whatsapp_number ? `${form.whatsapp_country_code} ${form.whatsapp_number}` : ''} />
              <ViewValue label="Aadhar Number" value={form.aadhar_number} />
              <ViewValue label="PAN Number" value={form.pan_number} />
              <ViewValue label="Address" value={form.address} className="emp-view-field-wide" />
            </div>
          </div>

          <div className="rounded-2xl p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
            <SectionHeader t={t} icon={<MdBusinessCenter size={16} />} title="Office Use Only" gradient="var(--grad-purple)" />
            <div className="emp-view-grid">
              <ViewValue label="Joining Date" value={form.joining_date ? formatDate(form.joining_date) : ''} />
              <ViewValue label="Working Hours" value={form.working_hours ? `${form.working_hours} Hours` : ''} />
              <ViewValue label="Check In" value={form.check_in_time} />
              <ViewValue label="Check Out" value={form.check_out_time} />
              <ViewValue label="Holidays" value={form.holidays} />
              <ViewValue label="Salary" value={form.salary ? `₹ ${Number(form.salary).toLocaleString('en-IN')}` : ''} />
              <ViewValue label="Role" value={roleLabel} />
            </div>
          </div>
        </div>

        {/* ── Row 2: Bank Details + Assign Action & Module ───────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <div className="rounded-2xl p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
            <SectionHeader t={t} icon={<MdAccountBalance size={16} />} title="Bank Details" gradient="var(--grad-green)" />
            <div className="emp-view-grid">
              <ViewValue label="Account Holder Name" value={form.account_holder_name} />
              <ViewValue label="Bank Name" value={form.bank_name} />
              <ViewValue label="Account Number" value={form.bank_account_number} />
              <ViewValue label="Account Type" value={form.account_type} />
              <ViewValue label="IFSC Code" value={form.ifsc_code} />
              <ViewValue label="Branch" value={form.branch} />
            </div>
            {/* Bank Passbook lives here now, filling the space this box used
                to leave empty below its 6 field values — no longer
                duplicated in the Documents section below. */}
            <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${t.divider}` }}>
              <div className="emp-view-label" style={{ marginBottom: 8 }}>Bank Passbook</div>
              {existingUrls.passbook_photo ? (
                <a
                  href={existingUrls.passbook_photo} target="_blank" rel="noopener noreferrer"
                  className="block rounded-xl overflow-hidden" style={{ border: `1px solid ${t.surfaceBorder}`, maxWidth: 280 }}
                >
                  <img src={existingUrls.passbook_photo} alt="Bank Passbook" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
                </a>
              ) : (
                <p className="emp-hint-text">Not uploaded.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
            <SectionHeader t={t} icon={<MdGroups size={16} />} title="Assign Action & Module" gradient="var(--grad-grey)" />
            <div className="mb-4">
              <div className="emp-view-label" style={{ marginBottom: 6 }}>Assigned Departments</div>
              <div className="emp-chip-row">
                {deptLabels.length > 0
                  ? deptLabels.map((l) => <span key={l} className="emp-view-chip">{l}</span>)
                  : <p className="emp-hint-text">None assigned.</p>}
              </div>
            </div>
            <div className="mb-4">
              <div className="emp-view-label" style={{ marginBottom: 6 }}>Assigned Designations</div>
              <div className="emp-chip-row">
                {desigLabels.length > 0
                  ? desigLabels.map((l) => <span key={l} className="emp-view-chip">{l}</span>)
                  : <p className="emp-hint-text">None assigned.</p>}
              </div>
            </div>
            <div className="mb-4">
              <div className="emp-view-label" style={{ marginBottom: 6 }}>Assigned Actions &amp; Modules</div>
              <div className="emp-module-panel">
                <ModuleActionGrid t={t} isView grid={moduleGrid} selected={form.module_action_ids} onToggle={() => {}} loading={loadingModules} />
              </div>
            </div>
            <div>
              <div className="emp-view-label" style={{ marginBottom: 6 }}>Visible Employees</div>
              <div className="emp-chip-row">
                {visibleLabels.length > 0
                  ? visibleLabels.map((l) => <span key={l} className="emp-view-chip">{l}</span>)
                  : <p className="emp-hint-text">None assigned.</p>}
              </div>
            </div>
          </div>
        </div>

        {/* ── Uploaded Documents ──────────────────────────────────────────── */}
        <div className="rounded-2xl mb-5 p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
          <SectionHeader t={t} icon={<MdDescription size={16} />} title="Uploaded Documents" gradient="var(--grad-teal)" />
          {/* Bank Passbook moved into the Bank Details box above (no longer
              duplicated here) — the remaining 4 documents fill 2 rows of 2
              at the .emp-doc-grid breakpoint. */}
          <div className="emp-doc-grid">
            <DocumentCard t={t} label="Aadhar Card" url={existingUrls.aadhar_card} />
            <DocumentCard t={t} label="PAN Card" url={existingUrls.pan_card} />
            <DocumentCard t={t} label="Resume" url={existingUrls.resume} />
            <DocumentCard t={t} label="Appointment Letter" url={existingUrls.appointment_letter} />
          </div>
        </div>

        {/* ── Sticky footer — Go Back only, exactly as every other mode's
            footer (same markup/behavior/positioning; !isView below just
            keeps this to Go Back with no Create/Update button). ────────── */}
        <div className="master-crud-footer flex items-center justify-center gap-3" style={{ background: t.surfaceBg, borderColor: t.surfaceBorder }}>
          <button
            type="button"
            onClick={() => navigate('/admin/employee/employee-details')}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: t.surfaceBg, color: t.textPrimary, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer' }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: t.fontFamily, paddingBottom: FOOTER_HEIGHT + 40, ...cssVars }}>

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/employee/employee-details')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textPrimary, padding: 6 }}
          >
            <MdArrowBack size={20} />
          </button>
          <div>
            <h1 className="emp-crud-title">
              {mode === 'add' ? 'Create Employee' : 'Edit Employee'}
            </h1>
            <p className="emp-crud-subtitle">
              {mode === 'add' ? 'Add new employee details' : 'Employee details'}
            </p>
          </div>
        </div>

        <div className="emp-id-badge">
          <span className="emp-id-value">Employee ID - {employeeCode || '—'}</span>
        </div>
      </div>

      {/* ── Personal Details ─────────────────────────────────────────── */}
      <div className="rounded-2xl mb-5 p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <SectionHeader t={t} icon={<MdPerson size={16} />} title="Personal Details" gradient="var(--grad-sky)" />

        {/* Row 1 of 4 — Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Field t={t} label="First Name" required>
            <input type="text" placeholder="Enter first name" value={form.first_name} readOnly={isView} disabled={isView}
              onChange={(e) => set('first_name', e.target.value)} className={fieldClass} />
          </Field>
          <Field t={t} label="Middle Name">
            <input type="text" placeholder="Enter middle name" value={form.middle_name} readOnly={isView} disabled={isView}
              onChange={(e) => set('middle_name', e.target.value)} className={fieldClass} />
          </Field>
          <Field t={t} label="Last Name" required>
            <input type="text" placeholder="Enter last name" value={form.last_name} readOnly={isView} disabled={isView}
              onChange={(e) => set('last_name', e.target.value)} className={fieldClass} />
          </Field>
          <Field t={t} label="Date of Birth" required>
            <input type="date" value={form.date_of_birth} readOnly={isView} disabled={isView}
              onChange={(e) => set('date_of_birth', e.target.value)} onClick={openPicker} onWheel={handleDobWheel} className={fieldClass} />
          </Field>
        </div>

        {/* Row 2 of 4 — Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Field t={t} label="Email" required>
            <input type="email" placeholder="Enter email address" value={form.email} readOnly={isView} disabled={isView}
              onChange={(e) => set('email', e.target.value)} className={fieldClass} />
          </Field>
          <PhoneField t={t} isView={isView} label="Mobile Number" required code={form.mobile_country_code} number={form.mobile_number}
            onCode={(v) => set('mobile_country_code', v)} onNumber={(v) => set('mobile_number', v)} />
          <PhoneField t={t} isView={isView} label="Alternate Number" code={form.alternate_country_code} number={form.alternate_number}
            onCode={(v) => set('alternate_country_code', v)} onNumber={(v) => set('alternate_number', v)} />
          <PhoneField t={t} isView={isView} label="WhatsApp Number" code={form.whatsapp_country_code} number={form.whatsapp_number}
            onCode={(v) => set('whatsapp_country_code', v)} onNumber={(v) => set('whatsapp_number', v)} />
        </div>

        {/* Row 3 of 4 — ID proofs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Field t={t} label="Aadhar Number" required>
            <input type="text" placeholder="Enter aadhar number" value={form.aadhar_number} readOnly={isView} disabled={isView}
              onChange={(e) => set('aadhar_number', e.target.value.replace(/[^\d]/g, ''))} className={fieldClass} />
          </Field>
          <FileUploadBox t={t} isView={isView} label="Upload Aadhar Card" hint="JPG, PNG, PDF (Max 2MB)" accept=".jpg,.jpeg,.png,.pdf" required
            file={files.aadhar_card} existingUrl={existingUrls.aadhar_card} onChange={setFile('aadhar_card')} />
          <Field t={t} label="PAN Number" required>
            <input type="text" placeholder="Enter PAN number" value={form.pan_number} readOnly={isView} disabled={isView}
              onChange={(e) => set('pan_number', e.target.value.toUpperCase())} className={fieldClass} />
          </Field>
          <FileUploadBox t={t} isView={isView} label="Upload PAN Card" hint="JPG, PNG, PDF (Max 2MB)" accept=".jpg,.jpeg,.png,.pdf" required
            file={files.pan_card} existingUrl={existingUrls.pan_card} onChange={setFile('pan_card')} />
        </div>

        {/* Row 4 of 4 — Address + Profile Photo. Profile Photo now uses the
            same compact FileUploadBox as Aadhar/PAN just above (was a tall
            square dropzone that left a lot of dead space below the much
            shorter Address textarea next to it). */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 items-start">
          <Field t={t} label="Address" required className="lg:col-span-3">
            <textarea
              placeholder="Enter full address" value={form.address} readOnly={isView} disabled={isView} rows={2}
              onChange={(e) => set('address', e.target.value)} className={fieldClass} style={{ resize: 'vertical' }}
            />
          </Field>
          <FileUploadBox t={t} isView={isView} label="Upload Profile Photo" hint="JPG, PNG (Max 2MB)" accept=".jpg,.jpeg,.png" required
            file={files.profile_photo} existingUrl={existingUrls.profile_photo} onChange={setFile('profile_photo')} />
        </div>
      </div>

      {/* ── Office Use Only ──────────────────────────────────────────── */}
      <div className="rounded-2xl mb-5 p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <SectionHeader t={t} icon={<MdBusinessCenter size={16} />} title="Office Use Only" gradient="var(--grad-purple)" />

        {/* All 10 fields flow across exactly 2 rows on desktop (5 cols x 2) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Field t={t} label="Employee Joining Date" required>
            <input type="date" value={form.joining_date} readOnly={isView} disabled={isView}
              onChange={(e) => set('joining_date', e.target.value)} onClick={openPicker} className={fieldClass} />
          </Field>
          <Field t={t} label="Working Hours" required>
            <select value={form.working_hours} disabled={isView} onChange={(e) => set('working_hours', e.target.value)} className={fieldClass} style={{ cursor: isView ? 'default' : 'pointer' }}>
              <option value="">Select hours (8, 9, 10)</option>
              {WORKING_HOURS_OPTIONS.map((h) => <option key={h} value={h}>{h} Hours</option>)}
            </select>
          </Field>
          <Field t={t} label="Check In" required>
            <input type="time" value={form.check_in_time} readOnly={isView} disabled={isView}
              onChange={(e) => set('check_in_time', e.target.value)} onClick={openPicker} onWheel={handleTimeWheel('check_in_time')} className={fieldClass} />
          </Field>
          <Field t={t} label="Check Out" required>
            <input type="time" value={form.check_out_time} readOnly={isView} disabled={isView}
              onChange={(e) => set('check_out_time', e.target.value)} onClick={openPicker} onWheel={handleTimeWheel('check_out_time')} className={fieldClass} />
          </Field>
          <Field t={t} label="Holidays" required>
            <select value={form.holidays} disabled={isView} onChange={(e) => set('holidays', e.target.value)} className={fieldClass} style={{ cursor: isView ? 'default' : 'pointer' }}>
              <option value="">Select holidays</option>
              {HOLIDAYS_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </Field>
          <Field t={t} label="Salary" required>
            <div className={`flex items-center gap-2 ${fieldClass}`} style={{ padding: '0 12px' }}>
              <span style={{ color: t.textSecondary }}>₹</span>
              <input
                type="number" placeholder="Enter salary" value={form.salary} readOnly={isView} disabled={isView}
                onChange={(e) => set('salary', e.target.value.replace(/[^\d.]/g, ''))}
                style={{ border: 'none', outline: 'none', background: 'transparent', padding: '9px 0', width: '100%', color: t.inputText, fontSize: 12, fontFamily: t.fontFamily }}
              />
            </div>
          </Field>
          <FileUploadBox t={t} isView={isView} label="Resume" hint="PDF, DOC, DOCX (Max 5MB)" accept=".pdf,.doc,.docx"
            file={files.resume} existingUrl={existingUrls.resume} onChange={setFile('resume')} />
          <FileUploadBox t={t} isView={isView} label="Appointment Letter" hint="PDF, DOC, DOCX (Max 5MB)" accept=".pdf,.doc,.docx"
            file={files.appointment_letter} existingUrl={existingUrls.appointment_letter} onChange={setFile('appointment_letter')} />
          <Field t={t} label="Employee Status" required>
            <select value={form.status} disabled={isView} onChange={(e) => set('status', e.target.value as EmployeeStatus)} className={fieldClass} style={{ cursor: isView ? 'default' : 'pointer' }}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field t={t} label="Role">
            <select
              value={selectedRoleId ?? ''} disabled={isView || loadingRoles}
              onChange={(e) => setSelectedRoleId(e.target.value ? Number(e.target.value) : null)}
              className={fieldClass} style={{ cursor: isView ? 'default' : 'pointer' }}
            >
              <option value="">{loadingRoles ? 'Loading roles...' : 'No role assigned'}</option>
              {roleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {/* ── Bank Details ─────────────────────────────────────────────── */}
      <div className="rounded-2xl mb-5 p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <SectionHeader t={t} icon={<MdAccountBalance size={16} />} title="Bank Details" gradient="var(--grad-green)" />

        {/* All 7 fields flow across exactly 2 rows on desktop (4 cols x 2) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field t={t} label="Account Holder Name" required>
            <input type="text" placeholder="Enter account holder name" value={form.account_holder_name} readOnly={isView} disabled={isView}
              onChange={(e) => set('account_holder_name', e.target.value)} className={fieldClass} />
          </Field>
          <Field t={t} label="Bank Name" required>
            <input type="text" placeholder="Enter bank name" value={form.bank_name} readOnly={isView} disabled={isView}
              onChange={(e) => set('bank_name', e.target.value)} className={fieldClass} />
          </Field>
          <Field t={t} label="Bank Account Number" required>
            <input type="text" placeholder="Enter account number" value={form.bank_account_number} readOnly={isView} disabled={isView}
              onChange={(e) => set('bank_account_number', e.target.value.replace(/[^\d]/g, ''))} className={fieldClass} />
          </Field>
          <Field t={t} label="Account Type" required>
            <select value={form.account_type} disabled={isView} onChange={(e) => set('account_type', e.target.value)} className={fieldClass} style={{ cursor: isView ? 'default' : 'pointer' }}>
              <option value="">Select account type</option>
              {ACCOUNT_TYPE_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
          <Field t={t} label="IFSC Code" required>
            <input type="text" placeholder="Enter IFSC code" value={form.ifsc_code} readOnly={isView} disabled={isView}
              onChange={(e) => set('ifsc_code', e.target.value.toUpperCase())} className={fieldClass} />
          </Field>
          <Field t={t} label="Branch" required>
            <input type="text" placeholder="Enter branch name" value={form.branch} readOnly={isView} disabled={isView}
              onChange={(e) => set('branch', e.target.value)} className={fieldClass} />
          </Field>
          <FileUploadBox t={t} isView={isView} label="Upload Bank Passbook Photo" hint="JPG, PNG (Max 2MB)" accept=".jpg,.jpeg,.png" required
            file={files.passbook_photo} existingUrl={existingUrls.passbook_photo} onChange={setFile('passbook_photo')} />
        </div>
      </div>

      {/* ── Assign Action & Module for this Employee ────────────────── */}
      <div className="rounded-2xl mb-5 p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <SectionHeader t={t} icon={<MdGroups size={16} />} title="Assign Action & Module for this Employee" gradient="var(--grad-grey)" />

        {/* Department (left) + Designation (right) — side by side, equal balance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <div className="emp-assign-box">
            <CheckboxGroup
              t={t} isView={isView}
              label="Assign Departments" required
              options={departmentOptions} selected={form.department_ids}
              onToggle={toggleDepartment}
              loading={loadingDepartments} emptyHint="No departments available."
            />
          </div>
          <div className="emp-assign-box">
            <CheckboxGroup
              t={t} isView={isView}
              label="Assign Designations" required
              options={visibleDesignationOptions} selected={form.designation_ids}
              onToggle={(v) => toggleIdInArray('designation_ids', v)}
              loading={loadingDesignations}
              emptyHint={form.department_ids.length === 0 ? 'Select a department above to see its designations.' : 'No designations available for the selected department(s).'}
            />
          </div>
        </div>

        <div className="mb-5">
          <label className="emp-label">Assign Actions & Modules<span className="emp-required"> *</span></label>
          <div className="emp-module-panel">
            <ModuleActionGrid
              t={t} isView={isView} grid={moduleGrid}
              selected={form.module_action_ids}
              onToggle={(v) => toggleIdInArray('module_action_ids', v)}
              loading={loadingModules}
            />
          </div>
        </div>

        <CheckboxGroup
          t={t} isView={isView}
          label="Assign Visible Employees" variant="chip"
          options={visibleEmployeeOptions} selected={visibleEmployeeIds}
          onToggle={toggleVisibleEmployee}
          loading={loadingVisibleEmployees} emptyHint="No other employees available."
        />

        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl mt-2"
          style={{ background: isDark ? 'rgba(99,102,241,0.1)' : '#eef2ff', color: '#4338ca', fontSize: 11 }}
        >
          <MdInfoOutline size={16} style={{ flexShrink: 0 }} />
          You can assign multiple departments and designations, pick exactly which actions apply per module, and choose which employees this employee can view.
        </div>
      </div>

      {/* ── Sticky footer — Go Back (always) + Create/Update (add/edit only), centered ──────── */}
      <div className="master-crud-footer flex items-center justify-center gap-3" style={{ background: t.surfaceBg, borderColor: t.surfaceBorder }}>
        <button
          type="button"
          onClick={() => navigate('/admin/employee/employee-details')}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: t.surfaceBg, color: t.textPrimary, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer' }}
        >
          Go Back
        </button>
        {!isView && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || saving}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{
              background: !isFormValid || saving ? '#9ca3af' : 'linear-gradient(135deg,#4338ca,#4f46e5)',
              border: 'none', cursor: !isFormValid || saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.8 : 1,
            }}
          >
            {saving ? 'Saving...' : mode === 'edit' ? 'Update' : 'Create'}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmployeeDetailsCrudPage;
