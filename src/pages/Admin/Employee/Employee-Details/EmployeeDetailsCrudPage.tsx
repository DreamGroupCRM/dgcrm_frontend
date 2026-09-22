// ==========================================
// DREAM GROUP CRM - EMPLOYEE CRUD PAGE
// ==========================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from '@/utils/toast';
import {
  MdArrowBack, MdCloudUpload, MdPerson, MdBusinessCenter, MdAccountBalance,
  MdGroups, MdDescription, MdCheckCircle, MdOpenInNew, MdVisibility, MdDownload,
} from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';

import { AppTheme } from '../../../../styles/theme';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import { formatDate, resolveFileUrl, showAlert } from '../../../../utils';
import DocumentViewerModal from '../../../../components/common/DocumentViewerModal';
import { previewKindFor, downloadDocument } from '../../../../services/documentService';
import {
  ViewEmployee, fetchNextEmployeeCode, createEmployee, EditEmployee,
  fetchEmployeePermissions, FetchEmployeeDetails,
  FetchVisibleEmployees, AssignVisibleEmployees,
  EmployeeFormValues, EmployeeFileValues, EmployeeStatus,
} from '../../../../services/employeeDetailsService';
import { FetchDepartmentList } from '../../../../services/departmentService';
import { fetchDesignationList } from '../../../../services/designationService';
import { fetchMappingMatrix } from '../../../../services/moduleActionService';
import { runOcr, extractAadharNumber, extractPanNumber } from '../../../../utils/ocr';
import { DobPicker } from '../../../../components/common/DobPicker';
import { TimePicker } from '../../../../components/common/TimePicker';
import { PhoneInput } from '../../../../components/common/PhoneInput';
import { phoneNumberError } from '../../../../utils/phoneValidation';
import { aadhaarError, panError, sanitizeDigits, sanitizeAlphanumericUpper, EMAIL_FORMAT_MESSAGE, hasEmailFormatError } from '../../../../utils/fieldValidation';
import { ValidationErrorSummary } from '../../../../components/common/ValidationErrorSummary';
import { AccordionSection } from '../../../../components/common/Accordion';
import { useCanChangeEmail, EMAIL_ADMIN_ONLY_MESSAGE } from '../../../../utils/emailPermission';
import {
  DOCUMENT_ACCEPT, IMAGE_ACCEPT, DOCUMENT_TYPE_LABELS, IMAGE_TYPE_LABELS,
  DOCUMENT_MAX_MB, IMAGE_MAX_MB, validateFileSelection,
} from '../../../../constants/uploads';
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
type SectionKey = 'personal' | 'office' | 'bank' | 'assign';
interface Props { mode: Mode; }
type Theme = AppTheme;

const WORKING_HOURS_OPTIONS = ['8', '9', '10'];
// Weekly off. Nine choices: each of the seven days on its own, then the
// two combined patterns.
//
// 'All Saturdays + Sunday' and 'Alternate Saturdays + Sunday' keep their
// EXACT previous strings on purpose. `holidays` is a free-text VARCHAR
// that is stored and read back verbatim (no enum, no backend validation,
// and nothing in attendance or leave parses it), so every existing
// employee already on one of those two keeps working untouched — no
// migration, nothing to backfill.
const HOLIDAYS_OPTIONS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'All Saturdays + Sunday',
  'Alternate Saturdays + Sunday',
];

/**
 * The options to actually render, given whatever is currently stored.
 *
 * The two values this list used to offer and no longer does — 'Sunday
 * Only' and 'Custom / As per Company Policy' — are still sitting on live
 * employee records. Holidays is a REQUIRED field, so dropping them would
 * open an existing employee's Edit form with a blank dropdown and refuse
 * to save until someone picked a new value, quietly rewriting data that
 * was never wrong.
 *
 * So a stored value that is not one of the nine is appended as its own
 * option and shown as-is. The record opens correctly, saving changes
 * nothing, and the admin can move it onto one of the nine whenever they
 * choose to.
 */
const holidayOptionsFor = (current: string): string[] =>
  (current && !HOLIDAYS_OPTIONS.includes(current))
    ? [...HOLIDAYS_OPTIONS, current]
    : HOLIDAYS_OPTIONS;
const ACCOUNT_TYPE_OPTIONS = ['Savings', 'Current'];
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
  mobile_country_code: '+91', mobile_number: '', mobile_is_whatsapp: false,
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

// Indian comma grouping while typing — same pattern/logic as
// CustomerDetailsCrudPage.tsx's formatAmountDisplay, applied here to
// Salary (a plain numeric string in this page's state, same as there).
const formatAmountDisplay = (v: string): string => {
  if (!v) return '';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : v;
};

// K/L/Cr shorthand shown at the end of the Salary box — same
// compactINR pattern as Customize Scheme's SliderField and Customer
// CRUD's AmountField, reused here rather than a second implementation.
const trimDecimal = (x: number): string => x.toFixed(2).replace(/\.?0+$/, '');
const compactINR = (v: string): string => {
  const n = Math.max(0, Number(v) || 0);
  if (n >= 10000000) return `${trimDecimal(n / 10000000)} Cr`;
  if (n >= 100000) return `${trimDecimal(n / 100000)} L`;
  if (n >= 1000) return `${trimDecimal(n / 1000)} K`;
  return '';
};

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

const Field: React.FC<{ t: Theme; label: string; required?: boolean; error?: string; children: React.ReactNode; className?: string; fieldRef?: React.Ref<HTMLDivElement> }> = ({ t, label, required, error, children, className, fieldRef }) => (
  <div className={className} ref={fieldRef}>
    <label className="emp-label">{label}{required && <span className="emp-required"> *</span>}</label>
    {children}
    {error && <p style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4, fontFamily: t.fontFamily }}>{error}</p>}
  </div>
);

const FileUploadBox: React.FC<{
  t: Theme; isView: boolean;
  label: string; hint: string; accept: string; required?: boolean;
  file: File | null | undefined; existingUrl?: string | null;
  onChange: (f: File | null) => void;
  fieldRef?: React.Ref<HTMLDivElement>;
  // V_23.0 item 3 — a small View icon beside the field, so an already-
  // saved upload can be previewed without leaving this form. Only an
  // already-SAVED file (existingUrl, no fresh pick in progress) can be
  // opened this way — the same rule Customer's CompactFileUpload uses.
  onView?: (label: string, url: string) => void;
}> = ({ t, isView, label, hint, accept, required, file, existingUrl, onChange, fieldRef, onView }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayName = file?.name || (existingUrl ? String(existingUrl).split('/').pop() : null);

  // Real image preview, same treatment as Customer's CompactFileUpload — a
  // freshly-picked File gets an object URL (revoked on unmount/change), an
  // already-uploaded value just needs resolving. A non-image (PDF/DOC/etc)
  // isn't previewable as a thumbnail, so it falls back to the cloud icon.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    if (!file && existingUrl && previewKindFor(existingUrl) === 'image') {
      setPreviewUrl(resolveFileUrl(existingUrl));
    } else {
      setPreviewUrl(null);
    }
  }, [file, existingUrl]);

  return (
    <Field t={t} label={label} required={required} fieldRef={fieldRef}>
      {/* The whole box opens the file picker on click (item 5) — including
          when a file is already selected/saved, so replacing it doesn't
          need a separate delete step first. The View icon below stops
          propagation so clicking IT previews the file instead of also
          reopening the picker underneath. */}
      <div
        role="button" tabIndex={isView ? -1 : 0}
        onClick={() => !isView && inputRef.current?.click()}
        onKeyDown={(e) => { if (!isView && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); inputRef.current?.click(); } }}
        className="w-full flex items-center gap-2.5 rounded-xl"
        style={{
          border: `1.5px dashed ${t.inputBorder}`, padding: '12px 14px',
          background: isView ? t.insetBg : t.inputBg, cursor: isView ? 'default' : 'pointer', textAlign: 'left',
        }}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="" className="rounded-lg flex-shrink-0" style={{ width: 32, height: 32, objectFit: 'cover' }} />
        ) : (
          <MdCloudUpload size={18} style={{ color: t.accentText, flexShrink: 0 }} />
        )}
        <div className="min-w-0" style={{ flex: 1 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: t.accentText }}>
            {displayName ? 'Change File' : label.startsWith('Upload') ? label : `Upload ${label}`}
          </div>
          <div style={{ fontSize: 10, color: t.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName || hint}
          </div>
        </div>
        {onView && !file && existingUrl && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onView(label, resolveFileUrl(existingUrl)); }}
            title="View" aria-label={`View ${label}`}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.accentText, padding: 0, display: 'flex', flexShrink: 0 }}>
            <MdVisibility size={17} />
          </button>
        )}
      </div>
      {/* Pre-checked here so a wrong pick is refused instantly rather than
          after the whole file has been uploaded. The server re-validates
          everything (extension, mime AND real magic bytes) regardless —
          this only saves the round trip and gives an immediate message.
          The input is cleared on rejection so re-picking the same file
          still fires onChange. */}
      <input
        ref={inputRef} type="file" hidden accept={accept}
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null;
          if (!picked) { onChange(null); return; }
          const isImageOnly = accept === IMAGE_ACCEPT;
          const problem = validateFileSelection(
            picked, accept,
            isImageOnly ? IMAGE_TYPE_LABELS : DOCUMENT_TYPE_LABELS,
            isImageOnly ? IMAGE_MAX_MB : DOCUMENT_MAX_MB
          );
          if (problem) { toast.error(problem); e.target.value = ''; return; }
          onChange(picked);
        }}
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
  containerRef?: React.Ref<HTMLDivElement>;
}> = ({ t, isView, label, required, options, selected, onToggle, emptyHint, loading, variant = 'plain', containerRef }) => (
  <div className="mb-5" ref={containerRef}>
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

// Designations grouped by their own Department, one row per department —
// "Sales" -> "Sales Executive | Sales Head | Sales Manager", "Marketing" ->
// "Marketing Executive | Marketing Head" — instead of a flat list where
// every single designation repeated its department name in its own label
// ("Sales Executive | Sales", "Sales Head | Sales", ...). Each name stays
// individually checkable; the " | " between them is purely a visual
// separator matching the requested layout, not a joined static string.
// A designation with no department of its own (global) falls into its own
// "Other" group at the end.
const GroupedDesignationChecklist: React.FC<{
  t: Theme; isView: boolean; required?: boolean;
  options: DesignationOption[]; departmentOptions: IdOption[];
  selected: number[]; onToggle: (v: number) => void; loading?: boolean; emptyHint?: string;
  containerRef?: React.Ref<HTMLDivElement>;
}> = ({ t, isView, required, options, departmentOptions, selected, onToggle, loading, emptyHint, containerRef }) => {
  const groups = useMemo(() => {
    const byDept = new Map<number | null, DesignationOption[]>();
    options.forEach((opt) => {
      const key = opt.departmentId;
      const arr = byDept.get(key) || [];
      arr.push(opt);
      byDept.set(key, arr);
    });
    const named = Array.from(byDept.entries())
      .filter(([deptId]) => deptId != null)
      .map(([deptId, opts]) => ({
        key: String(deptId),
        heading: departmentOptions.find((d) => d.value === deptId)?.label || 'Department',
        opts,
      }));
    const other = byDept.get(null);
    return other?.length ? [...named, { key: 'other', heading: 'Other', opts: other }] : named;
  }, [options, departmentOptions]);

  return (
    <div className="mb-5" ref={containerRef}>
      <label className="emp-label">Assign Designations{required && <span className="emp-required"> *</span>}</label>
      {loading ? (
        <p className="emp-hint-text">Loading...</p>
      ) : groups.length === 0 ? (
        <p className="emp-hint-text">{emptyHint}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
                {group.opts.map((opt, i) => (
                  <React.Fragment key={opt.value}>
                    {i > 0 && <span style={{ color: t.divider }}>|</span>}
                    <label className="flex items-center gap-1.5" style={{ fontSize: 12, color: t.textPrimary, cursor: isView ? 'default' : 'pointer' }}>
                      <input type="checkbox" checked={selected.includes(opt.value)} disabled={isView} onChange={() => onToggle(opt.value)} />
                      {opt.label}
                    </label>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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
  // Final "Check All" column (item 8) — toggles every valid checkbox in
  // that row at once; its own checked state stays in sync with the row's
  // individual checkboxes both ways (checking every box manually also
  // shows Check All as checked, and unchecking any one of them unchecks it).
  onToggleRow?: (moduleActionIds: number[], checked: boolean) => void;
}> = ({ t, isView, grid, selected, onToggle, loading, onToggleRow }) => {
  if (loading) return <p className="emp-hint-text">Loading...</p>;
  if (grid.modules.length === 0) return <p className="emp-hint-text">No modules available.</p>;
  return (
    <div className="emp-grid-scroll" style={{ border: `1px solid ${t.surfaceBorder}`, borderRadius: 12 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 620 }}>
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
            <th className="emp-grid-th-gradient emp-grid-th-gradient-center">Check All</th>
          </tr>
        </thead>
        <tbody>
          {grid.modules.map((m) => {
            const rowIds = grid.actionColumns
              .map((a) => grid.cells[`${m.id}:${a.code}`])
              .filter((id): id is number => id != null);
            const rowAllChecked = rowIds.length > 0 && rowIds.every((id) => selected.includes(id));
            return (
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
                <td className={`emp-grid-td-center${rowAllChecked ? ' emp-grid-td-checked' : ''}`}>
                  {rowIds.length === 0 ? (
                    <span style={{ color: t.divider }}>—</span>
                  ) : isView ? (
                    rowAllChecked ? <MdCheckCircle size={15} color="#16a34a" /> : <span style={{ color: t.divider }}>–</span>
                  ) : (
                    <input
                      type="checkbox" checked={rowAllChecked}
                      style={{ cursor: 'pointer' }}
                      onChange={() => onToggleRow?.(rowIds, !rowAllChecked)}
                    />
                  )}
                </td>
              </tr>
            );
          })}
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
// Letter/Passbook). Shows an inline thumbnail for image uploads and a
// document icon otherwise, with two explicit actions: Quick View and
// Download.
//
// It used to be a plain <a target="_blank"> wrapping the whole card, which
// pointed a new tab at the raw file URL. That lost the user's place in the
// record, and on a DOCX/XLSX it silently turned into a download. Now the
// card opens the shared DocumentViewerModal (components/common), which
// fetches the file over the authenticated axios instance — the session
// token travels as a header, and no file has to be publicly readable for
// the preview to work.
const DocumentCard: React.FC<{
  t: Theme; label: string; url?: string | null;
  onQuickView: (label: string, url: string) => void;
}> = ({ t, label, url, onQuickView }) => {
  const resolved = url ? resolveFileUrl(url) : '';
  const kind = previewKindFor(resolved);
  const isImage = !!resolved && kind === 'image';
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!resolved) return;
    setDownloading(true);
    try {
      await downloadDocument(resolved, label);
    } catch {
      showAlert.error('That file could not be downloaded. It may have been removed.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="emp-doc-card" style={{ border: `1px solid ${t.surfaceBorder}`, background: t.insetBg }}>
      <button
        type="button"
        disabled={!resolved}
        onClick={() => resolved && onQuickView(label, resolved)}
        aria-label={resolved ? `Quick view ${label}` : `${label} not uploaded`}
        className="w-full flex items-center justify-center overflow-hidden"
        style={{
          height: 120, padding: 0, border: 'none',
          cursor: resolved ? 'pointer' : 'default',
          background: isImage ? t.insetBg : resolved ? 'var(--master-btn-primary-gradient, var(--brand-gradient))' : t.insetBg,
        }}
      >
        {isImage
          ? <img src={resolved} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <MdDescription size={34} color={resolved ? '#fff' : t.textMuted} />}
      </button>
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
        <div className="min-w-0">
          <div className="emp-doc-card-label">{label}</div>
          <div className="emp-doc-card-status">{resolved ? 'Uploaded' : 'Not uploaded'}</div>
        </div>
        {resolved && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => onQuickView(label, resolved)}
              title="Quick View"
              aria-label={`Quick view ${label}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.accentText, display: 'inline-flex', padding: 4 }}
            >
              <MdVisibility size={16} />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              title="Download"
              aria-label={`Download ${label}`}
              style={{ background: 'none', border: 'none', cursor: downloading ? 'wait' : 'pointer', color: t.accentText, display: 'inline-flex', padding: 4, opacity: downloading ? 0.5 : 1 }}
            >
              <MdDownload size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────
const EmployeeDetailsCrudPage: React.FC<Props> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDark, t, accent, cssVars: appearanceCssVars } = useAppearanceTokens();
  const isView = mode === 'view';

  // An employee's email is their login credential, so only an Admin may
  // change it — on an existing record. On Add there is nothing to protect
  // yet (the account is being created here), and the route is already
  // admin-only. The server enforces the same rule; see
  // utils/emailPermission.ts.
  // ── Email format, checked as soon as the user leaves the field ──────
  // An improper address is caught immediately rather than at submit, so
  // the user fixes it while they are still looking at it. The popup is
  // modal, which is what actually stops them moving on; once they dismiss
  // it focus goes back to the email box.
  //
  // Two deliberate limits, so this warns without trapping anyone:
  //   • Only fires for a NON-EMPTY value. Tabbing through an untouched
  //     field must not nag — submit still catches a missing email.
  //   • Never fires when focus is leaving for a button or a link. Cancel,
  //     Go Back and the accordion headers have to stay clickable even
  //     while the address is half-typed.
  const emailAlertOpen = useRef(false);
  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!hasEmailFormatError(form.email)) return;
    const next = e.relatedTarget as HTMLElement | null;
    if (next && (next.tagName === 'BUTTON' || next.tagName === 'A' || next.closest?.('button, a'))) return;
    // Guard against re-entry: refocusing below fires another blur when the
    // alert closes, which would otherwise stack popups.
    if (emailAlertOpen.current) return;
    emailAlertOpen.current = true;
    const input = e.target;
    showAlert.error(EMAIL_FORMAT_MESSAGE, 'Invalid Email Address').finally(() => {
      emailAlertOpen.current = false;
      // Next tick, not immediately: SweetAlert restores focus to whatever
      // was active when it opened (by then, the field the user tabbed
      // INTO). Focusing in the same turn would be undone by that
      // restoration and the caret would end up in the wrong box.
      setTimeout(() => { input.focus(); input.select(); }, 0);
    });
  };

  const canEditEmail = useCanChangeEmail();
  const emailLocked = !isView && mode !== 'add' && !canEditEmail;

  // Quick View — which document, if any, the shared viewer is showing.
  // Kept at page level so the modal renders above the whole record and
  // closing it leaves the page exactly where it was.
  const [preview, setPreview] = useState<{ label: string; url: string } | null>(null);
  const openPreview = useCallback((label: string, url: string) => setPreview({ label, url }), []);

  const [fetching, setFetching] = useState(mode !== 'add');

  // Accordion (item 2.1) — each CRUD section can independently collapse;
  // all start open since every section holds required fields on a fresh
  // form. sectionRefs/fieldRefs back item 2.2's auto-expand-and-scroll-to-
  // error behavior (see revealInvalidField below).
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({ personal: true, office: true, bank: true, assign: true });
  const sectionRefs = useRef<Record<SectionKey, HTMLDivElement | null>>({ personal: null, office: null, bank: null, assign: null });
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const setFieldRef = (key: string) => (el: HTMLElement | null) => { fieldRefs.current[key] = el; };
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

  const set = <K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setFile = (key: keyof EmployeeFileValues) => (f: File | null) =>
    setFiles((prev) => ({ ...prev, [key]: f }));

  // ── OCR auto-fill from Aadhar/PAN photo — same client-side Tesseract.js
  // approach as Customer CRUD's handleAadharPhotoChange/handlePancardPhotoChange
  // (see CustomerDetailsCrudPage.tsx), reused here rather than a second OCR
  // implementation. Only pre-fills the number field, which stays fully
  // editable, and never overwrites a value the user already typed in.
  const [ocrRunning, setOcrRunning] = useState<'aadhar' | 'pancard' | null>(null);

  const handleAadharCardChange = (f: File | null) => {
    setFile('aadhar_card')(f);
    if (!(f instanceof File)) return;
    setOcrRunning('aadhar');
    runOcr(f).then((text) => {
      const number = extractAadharNumber(text);
      if (number) { set('aadhar_number', number); toast.success('Aadhar number auto-filled from the photo — please verify it.'); }
      else toast.info('Could not read an Aadhar number from that photo — please enter it manually.');
    }).finally(() => setOcrRunning(null));
  };

  const handlePanCardChange = (f: File | null) => {
    setFile('pan_card')(f);
    if (!(f instanceof File)) return;
    setOcrRunning('pancard');
    runOcr(f).then((text) => {
      const number = extractPanNumber(text);
      if (number) { set('pan_number', number); toast.success('PAN number auto-filled from the photo — please verify it.'); }
      else toast.info('Could not read a PAN number from that photo — please enter it manually.');
    }).finally(() => setOcrRunning(null));
  };

  // Item 13 — Check In + Working Hours auto-calculates Check Out
  // ("09:30 AM" + "8 Hours" -> "17:30"). Runs whenever either input
  // changes; the field stays a normal editable time input afterward, so
  // the computed value is a starting point, not a lock.
  const addHoursToTime = (time: string, hours: number): string => {
    const [hStr, mStr] = (time || '00:00').split(':');
    const totalMinutes = ((Number(hStr) || 0) * 60 + (Number(mStr) || 0) + hours * 60) % (24 * 60);
    const normalized = (totalMinutes + 24 * 60) % (24 * 60);
    return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
  };

  const setCheckInAndAutoCheckOut = (checkIn: string, workingHours: string) => {
    setForm((prev) => ({
      ...prev,
      check_in_time: checkIn,
      check_out_time: checkIn && workingHours ? addHoursToTime(checkIn, Number(workingHours)) : prev.check_out_time,
    }));
  };

  const setWorkingHoursAndAutoCheckOut = (workingHours: string) => {
    setForm((prev) => ({
      ...prev,
      working_hours: workingHours,
      check_out_time: prev.check_in_time && workingHours ? addHoursToTime(prev.check_in_time, Number(workingHours)) : prev.check_out_time,
    }));
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
          // Plain designation name — which department it belongs to is now
          // shown once, as that department's own group heading in the
          // checklist below, instead of being repeated inside every single
          // designation's own label ("Sales Executive | Sales", "Sales
          // Head | Sales", ...).
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
            mobile_is_whatsapp: e.mobile_is_whatsapp ?? false,
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

  // Assign Actions & Modules — Check All column (item 8): applies to every
  // valid checkbox in one module's row at once.
  const toggleModuleActionRow = (moduleActionIds: number[], checked: boolean) => {
    setForm((prev) => {
      const next = new Set(prev.module_action_ids);
      moduleActionIds.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return { ...prev, module_action_ids: Array.from(next) };
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
  // Each check names the accordion section (item 2.1) and field it belongs
  // to, so a failed submit (item 2.2) can auto-expand that section, then
  // scroll to and focus/highlight that exact field — not just show a
  // generic toast the user has to go hunting for.
  const validationChecks: { field: string; section: SectionKey; message: string; failed: () => boolean }[] = [
    { field: 'first_name', section: 'personal', message: 'Please enter the First Name.', failed: () => !form.first_name.trim() },
    { field: 'last_name', section: 'personal', message: 'Please enter the Last Name.', failed: () => !form.last_name.trim() },
    { field: 'date_of_birth', section: 'personal', message: 'Please enter the Date of Birth.', failed: () => !form.date_of_birth },
    { field: 'email', section: 'personal', message: 'Please enter the Email address.', failed: () => !form.email.trim() },
    // Format, not just presence. The on-blur check below catches this the
    // moment the user leaves the field; this is the backstop for a form
    // submitted without the field ever being blurred (autofill, Enter from
    // another field), and it uses the SAME rule so the two can't disagree.
    { field: 'email', section: 'personal', message: EMAIL_FORMAT_MESSAGE, failed: () => hasEmailFormatError(form.email) },
    { field: 'mobile_number', section: 'personal', message: 'Please enter the Mobile Number.', failed: () => !form.mobile_number.trim() },
    { field: 'mobile_number', section: 'personal', message: phoneNumberError(form.mobile_country_code, form.mobile_number), failed: () => !!phoneNumberError(form.mobile_country_code, form.mobile_number) },
    { field: 'alternate_number', section: 'personal', message: phoneNumberError(form.alternate_country_code, form.alternate_number), failed: () => !!phoneNumberError(form.alternate_country_code, form.alternate_number) },
    { field: 'address', section: 'personal', message: 'Please enter the Address.', failed: () => !form.address.trim() },
    { field: 'aadhar_number', section: 'personal', message: aadhaarError(form.aadhar_number, true), failed: () => !!aadhaarError(form.aadhar_number, true) },
    { field: 'aadhar_card', section: 'personal', message: 'Please upload the Aadhar Card.', failed: () => !files.aadhar_card && !existingUrls.aadhar_card },
    { field: 'pan_number', section: 'personal', message: panError(form.pan_number, true), failed: () => !!panError(form.pan_number, true) },
    { field: 'pan_card', section: 'personal', message: 'Please upload the PAN Card.', failed: () => !files.pan_card && !existingUrls.pan_card },
    { field: 'profile_photo', section: 'personal', message: 'Please upload the Profile Photo.', failed: () => !files.profile_photo && !existingUrls.profile_photo },
    { field: 'joining_date', section: 'office', message: 'Please enter the Employee Joining Date.', failed: () => !form.joining_date },
    { field: 'working_hours', section: 'office', message: 'Please select Working Hours.', failed: () => !form.working_hours },
    { field: 'check_in_time', section: 'office', message: 'Please enter both Check In and Check Out time.', failed: () => !form.check_in_time || !form.check_out_time },
    { field: 'holidays', section: 'office', message: 'Please select Holidays.', failed: () => !form.holidays },
    { field: 'salary', section: 'office', message: 'Please enter the Salary.', failed: () => !form.salary.trim() },
    { field: 'account_holder_name', section: 'bank', message: 'Please enter the Account Holder Name.', failed: () => !form.account_holder_name.trim() },
    { field: 'bank_name', section: 'bank', message: 'Please enter the Bank Name.', failed: () => !form.bank_name.trim() },
    { field: 'bank_account_number', section: 'bank', message: 'Please enter the Bank Account Number.', failed: () => !form.bank_account_number.trim() },
    { field: 'account_type', section: 'bank', message: 'Please select the Account Type.', failed: () => !form.account_type },
    { field: 'ifsc_code', section: 'bank', message: 'Please enter the IFSC Code.', failed: () => !form.ifsc_code.trim() },
    { field: 'branch', section: 'bank', message: 'Please enter the Branch.', failed: () => !form.branch.trim() },
    { field: 'passbook_photo', section: 'bank', message: 'Please upload the Bank Passbook Photo.', failed: () => !files.passbook_photo && !existingUrls.passbook_photo },
    { field: 'department_ids', section: 'assign', message: 'Please assign at least one Department.', failed: () => form.department_ids.length === 0 },
    // Actions/Modules is deliberately NOT required here — the backend
    // itself treats it as fully optional (employees.service.ts's
    // createEmployee/updateEmployee only assigns permissions when the
    // array is non-empty, never requires it), and on a fresh install
    // before an admin has defined any modules/actions this checklist can
    // legitimately be empty. Requiring it here used to make Employee
    // Creation impossible on a fresh install.
    { field: 'designation_ids', section: 'assign', message: 'Please assign at least one Designation.', failed: () => form.designation_ids.length === 0 },
  ];

  const getFirstInvalid = () => validationChecks.find((c) => c.failed()) ?? null;
  const validate = (): string | null => getFirstInvalid()?.message ?? null;
  const isFormValid = getFirstInvalid() === null;

  // Global validation error summary — validationChecks already re-evaluates
  // every field fresh on every render, so activeErrors is automatically
  // just "whatever is still wrong right now": fixing a field makes it drop
  // out of both this list and its own inline message on the very next
  // render. Gated on submitAttempted so a fresh form doesn't open with
  // every required field already flagged red.
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const activeErrors = submitAttempted ? validationChecks.filter((c) => c.failed()) : [];
  const errorFor = (field: string): string | undefined =>
    submitAttempted ? validationChecks.find((c) => c.field === field && c.failed())?.message : undefined;

  // Auto-expand the section containing the first invalid field, then
  // scroll to and focus it once the section has actually rendered open.
  const revealInvalidField = (field: string, section: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [section]: true }));
    setTimeout(() => {
      const el = fieldRefs.current[field] ?? sectionRefs.current[section];
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.querySelector<HTMLElement>('input, select, button, textarea')?.focus();
    }, 60);
  };

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    const invalid = getFirstInvalid();
    if (invalid) {
      revealInvalidField(invalid.field, invalid.section);
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
      // Visible-employees assignment saves through its own endpoint (not
      // part of the Employee payload) — always sent, including an empty
      // selection, so unchecking everyone on Edit actually clears it
      // rather than leaving the previous assignment in place.
      if (targetId) {
        try {
          await AssignVisibleEmployees(targetId, visibleEmployeeIds);
        } catch {
          toast.error('Employee saved, but failed to update the Visible Employees assignment.');
        }
      }
      navigate('/admin/employee/employee-details');
    } catch (err: any) {
      const fallback = mode === 'edit' ? 'Failed to update employee.' : 'Failed to create employee.';
      const backendErrors = err?.response?.data?.errors as { field: string; message: string }[] | undefined;
      toast.error(
        backendErrors?.length ? backendErrors.map((er) => `${er.field}: ${er.message}`).join('; ') : err?.response?.data?.message || fallback
      );
      // Item 8: reuse the same accordion auto-expand-and-scroll mechanism
      // client-side validation already has above for a server-side (Zod)
      // rejection — this page's own validationChecks already key fields by
      // their snake_case backend name, so no name translation is needed.
      if (backendErrors?.length) {
        for (const er of backendErrors) {
          const match = validationChecks.find((c) => c.field === er.field);
          if (match) { revealInvalidField(match.field, match.section); break; }
        }
      }
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
  // this page's own theme values, consumed by the emp-* classes used
  // throughout this page's form fields/labels/grid below. Also spreads
  // in the appearance system's shared vars for consistency with the
  // other pages (this page's own accent literals below are converted
  // directly via accent/accentHover instead, since they're inline, not
  // read from a CSS class). ─────────────────────────────────────────────
  const cssVars = {
    ...appearanceCssVars,
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
    // Mirrors the Employee List's employeeStatusStyle. The form no longer
    // offers a status dropdown anywhere — a new employee is always Active
    // and enabling/disabling is done from the list's row menu, which sets
    // is_active (and cascades to the login user). So is_active decides the
    // badge; the status column is still consulted so a legacy 'on_leave'
    // value keeps showing as On Leave.
    const statusStyle = !form.is_active
      ? VIEW_STATUS_STYLES.inactive
      : (VIEW_STATUS_STYLES[form.status] || VIEW_STATUS_STYLES.active);
    const deptLabels = departmentOptions.filter((d) => form.department_ids.includes(d.value)).map((d) => d.label);
    const desigLabels = designationOptions.filter((d) => form.designation_ids.includes(d.value)).map((d) => d.label);
    const visibleLabels = visibleEmployeeOptions.filter((e) => visibleEmployeeIds.includes(e.value)).map((e) => e.label);
    const fullName = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ');

    return (
      <div className="emp-crud-page" style={{ fontFamily: t.fontFamily, paddingBottom: FOOTER_HEIGHT + 40, ...cssVars }}>

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="emp-crud-header flex flex-wrap items-center justify-between gap-3 mb-6">
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
            <img src={resolveFileUrl(existingUrls.profile_photo)} alt="" className="rounded-full flex-shrink-0" style={{ width: 56, height: 56, objectFit: 'cover' }} />
          ) : (
            <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ width: 56, height: 56, background: accent, fontSize: 18 }}>
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
        {/* items-start (item 12) — Office Use Only has far fewer fields than
            Personal Details; without this the grid's default equal-height
            stretch left a large block of empty space below its last field. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5 items-start">
          <div className="rounded-2xl p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
            <SectionHeader t={t} icon={<MdPerson size={16} />} title="Personal Details" gradient="var(--grad-green)" />
            <div className="emp-view-grid">
              <ViewValue label="First Name" value={form.first_name} />
              <ViewValue label="Middle Name" value={form.middle_name} />
              <ViewValue label="Last Name" value={form.last_name} />
              <ViewValue label="Date of Birth" value={form.date_of_birth ? formatDate(form.date_of_birth) : ''} />
              <ViewValue label="Mobile Number" value={form.mobile_number ? `${form.mobile_country_code} ${form.mobile_number}${form.mobile_is_whatsapp ? ' (WhatsApp)' : ''}` : ''} />
              <ViewValue label="Alternate Number" value={form.alternate_number ? `${form.alternate_country_code} ${form.alternate_number}` : ''} />
              <ViewValue label="Aadhar Number" value={form.aadhar_number} />
              <ViewValue label="PAN Number" value={form.pan_number} />
              <ViewValue label="Address" value={form.address} className="emp-view-field-wide" />
            </div>
          </div>

          <div className="rounded-2xl p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
            <SectionHeader t={t} icon={<MdBusinessCenter size={16} />} title="Office Use Only" gradient="var(--grad-green)" />
            <div className="emp-view-grid">
              <ViewValue label="Joining Date" value={form.joining_date ? formatDate(form.joining_date) : ''} />
              <ViewValue label="Working Hours" value={form.working_hours ? `${form.working_hours} Hours` : ''} />
              <ViewValue label="Check In" value={form.check_in_time} />
              <ViewValue label="Check Out" value={form.check_out_time} />
              <ViewValue label="Holidays" value={form.holidays} />
              <ViewValue label="Salary" value={form.salary ? `₹ ${Number(form.salary).toLocaleString('en-IN')}` : ''} />
            </div>
          </div>
        </div>

        {/* ── Row 2: Bank Details + Assign Action & Module ───────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5 items-start">
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
            <SectionHeader t={t} icon={<MdGroups size={16} />} title="Assign Action & Module" gradient="var(--grad-green)" />
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
          <SectionHeader t={t} icon={<MdDescription size={16} />} title="Uploaded Documents" gradient="var(--grad-green)" />
          {/* Bank Passbook moved into the Bank Details box above (no longer
              duplicated here) — the remaining 4 documents fill 2 rows of 2
              at the .emp-doc-grid breakpoint. */}
          <div className="emp-doc-grid">
            <DocumentCard t={t} label="Aadhar Card" url={existingUrls.aadhar_card} onQuickView={openPreview} />
            <DocumentCard t={t} label="PAN Card" url={existingUrls.pan_card} onQuickView={openPreview} />
            <DocumentCard t={t} label="Resume" url={existingUrls.resume} onQuickView={openPreview} />
            <DocumentCard t={t} label="Appointment Letter" url={existingUrls.appointment_letter} onQuickView={openPreview} />
          </div>
        </div>

        {preview && (
          <DocumentViewerModal t={t} label={preview.label} url={preview.url} onClose={() => setPreview(null)} />
        )}

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
    <div className="emp-crud-page" style={{ fontFamily: t.fontFamily, paddingBottom: FOOTER_HEIGHT + 40, ...cssVars }}>

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="emp-crud-header flex flex-wrap items-center justify-between gap-3 mb-6">
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

      <ValidationErrorSummary
        t={t}
        errors={activeErrors.map((c) => ({ field: c.field, message: c.message }))}
        onErrorClick={(field) => {
          const c = validationChecks.find((vc) => vc.field === field);
          if (c) revealInvalidField(c.field, c.section);
        }}
      />

      {/* ── Personal Details ─────────────────────────────────────────── */}
      <AccordionSection theme={t} icon={<MdPerson size={16} />} title="Personal Details" gradient="var(--grad-green)"
        open={openSections.personal} onToggle={() => setOpenSections((p) => ({ ...p, personal: !p.personal }))}
        sectionRef={(el) => (sectionRefs.current.personal = el)}>

        {/* Row 1 of 4 — Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Field t={t} label="First Name" required error={errorFor('first_name')} fieldRef={setFieldRef('first_name') as React.Ref<HTMLDivElement>}>
            <input type="text" placeholder="Enter first name" value={form.first_name} readOnly={isView} disabled={isView}
              onChange={(e) => set('first_name', e.target.value)} className={fieldClass} />
          </Field>
          <Field t={t} label="Middle Name">
            <input type="text" placeholder="Enter middle name" value={form.middle_name} readOnly={isView} disabled={isView}
              onChange={(e) => set('middle_name', e.target.value)} className={fieldClass} />
          </Field>
          <Field t={t} label="Last Name" required error={errorFor('last_name')} fieldRef={setFieldRef('last_name') as React.Ref<HTMLDivElement>}>
            <input type="text" placeholder="Enter last name" value={form.last_name} readOnly={isView} disabled={isView}
              onChange={(e) => set('last_name', e.target.value)} className={fieldClass} />
          </Field>
          <Field t={t} label="Date of Birth" required error={errorFor('date_of_birth')} fieldRef={setFieldRef('date_of_birth') as React.Ref<HTMLDivElement>}>
            <DobPicker theme={t} value={form.date_of_birth} disabled={isView} onChange={(v) => set('date_of_birth', v)} />
          </Field>
        </div>

        {/* Row 2 of 4 — Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Field t={t} label="Email" required error={errorFor('email')} fieldRef={setFieldRef('email') as React.Ref<HTMLDivElement>}>
            <input type="email" placeholder="Enter email address" value={form.email}
              readOnly={isView || emailLocked} disabled={isView || emailLocked}
              title={emailLocked ? EMAIL_ADMIN_ONLY_MESSAGE : undefined}
              onChange={(e) => set('email', e.target.value)}
              onBlur={handleEmailBlur}
              className={emailLocked && !isView ? `${fieldClass} emp-field-view` : fieldClass} />
            {emailLocked && (
              <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 4 }}>{EMAIL_ADMIN_ONLY_MESSAGE}</div>
            )}
          </Field>
          {/* V_23.0 item 2.2 — the separate WhatsApp Number field is replaced
              by an "Also on WhatsApp" flag on the Mobile Number, the same
              redesign the Customer form already uses. The stored
              whatsapp_number/whatsapp_country_code columns are untouched —
              existing employees keep their saved number in the database,
              the form just no longer collects it. */}
          <Field t={t} label="Mobile Number" required error={errorFor('mobile_number')} fieldRef={setFieldRef('mobile_number') as React.Ref<HTMLDivElement>}>
            <PhoneInput theme={t} disabled={isView} code={form.mobile_country_code} onCodeChange={(v) => set('mobile_country_code', v)}
              number={form.mobile_number} onNumberChange={(v) => set('mobile_number', v)} placeholder="Enter mobile number" />
            <label className="flex items-center gap-1.5 mt-1.5" style={{ fontSize: 10.5, color: t.textSecondary, cursor: isView ? 'default' : 'pointer' }}>
              <input type="checkbox" checked={form.mobile_is_whatsapp} disabled={isView}
                onChange={(e) => set('mobile_is_whatsapp', e.target.checked)} style={{ width: 13, height: 13, cursor: isView ? 'default' : 'pointer' }} />
              <FaWhatsapp size={12} style={{ color: '#25D366', flexShrink: 0 }} /> Also on WhatsApp
            </label>
          </Field>
          <Field t={t} label="Alternate Number" error={errorFor('alternate_number')} fieldRef={setFieldRef('alternate_number') as React.Ref<HTMLDivElement>}>
            <PhoneInput theme={t} disabled={isView} code={form.alternate_country_code} onCodeChange={(v) => set('alternate_country_code', v)}
              number={form.alternate_number} onNumberChange={(v) => set('alternate_number', v)} placeholder="Enter mobile number" />
          </Field>
        </div>

        {/* Row 3 of 4 — ID proofs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <FileUploadBox t={t} isView={isView} label="Upload Aadhar Card" hint="JPG, PNG, PDF (Max 2MB)" accept={DOCUMENT_ACCEPT} required
            file={files.aadhar_card} existingUrl={existingUrls.aadhar_card} onChange={handleAadharCardChange} onView={openPreview}
            fieldRef={setFieldRef('aadhar_card') as React.Ref<HTMLDivElement>} />
          <Field t={t} label="Aadhar Number" required error={errorFor('aadhar_number')} fieldRef={setFieldRef('aadhar_number') as React.Ref<HTMLDivElement>}>
            <input type="text" placeholder="Enter aadhar number" value={form.aadhar_number} readOnly={isView} disabled={isView} maxLength={12}
              onChange={(e) => set('aadhar_number', sanitizeDigits(e.target.value, 12))} className={fieldClass} />
            {ocrRunning === 'aadhar' && <p style={{ fontSize: 10, color: 'var(--brand-ink)', margin: '4px 0 0' }}>Reading Aadhar number from photo...</p>}
          </Field>
          <FileUploadBox t={t} isView={isView} label="Upload PAN Card" hint="JPG, PNG, PDF (Max 2MB)" accept={DOCUMENT_ACCEPT} required
            file={files.pan_card} existingUrl={existingUrls.pan_card} onChange={handlePanCardChange} onView={openPreview}
            fieldRef={setFieldRef('pan_card') as React.Ref<HTMLDivElement>} />
          <Field t={t} label="PAN Number" required error={errorFor('pan_number')} fieldRef={setFieldRef('pan_number') as React.Ref<HTMLDivElement>}>
            <input type="text" placeholder="Enter PAN number" value={form.pan_number} readOnly={isView} disabled={isView} maxLength={10}
              onChange={(e) => set('pan_number', sanitizeAlphanumericUpper(e.target.value, 10))} className={fieldClass} />
            {ocrRunning === 'pancard' && <p style={{ fontSize: 10, color: 'var(--brand-ink)', margin: '4px 0 0' }}>Reading PAN number from photo...</p>}
          </Field>
        </div>

        {/* Row 4 of 4 — Address + Profile Photo. Profile Photo now uses the
            same compact FileUploadBox as Aadhar/PAN just above (was a tall
            square dropzone that left a lot of dead space below the much
            shorter Address textarea next to it). */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 items-start">
          <Field t={t} label="Address" required className="lg:col-span-3" fieldRef={setFieldRef('address') as React.Ref<HTMLDivElement>}>
            <textarea
              placeholder="Enter full address" value={form.address} readOnly={isView} disabled={isView} rows={2}
              onChange={(e) => set('address', e.target.value)} className={fieldClass} style={{ resize: 'vertical' }}
            />
          </Field>
          <FileUploadBox t={t} isView={isView} label="Upload Profile Photo" hint="JPG, PNG (Max 2MB)" accept={IMAGE_ACCEPT} required
            file={files.profile_photo} existingUrl={existingUrls.profile_photo} onChange={setFile('profile_photo')} onView={openPreview}
            fieldRef={setFieldRef('profile_photo') as React.Ref<HTMLDivElement>} />
        </div>
      </AccordionSection>

      {/* ── Office Use Only ──────────────────────────────────────────── */}
      <AccordionSection theme={t} icon={<MdBusinessCenter size={16} />} title="Office Use Only" gradient="var(--grad-green)"
        open={openSections.office} onToggle={() => setOpenSections((p) => ({ ...p, office: !p.office }))}
        sectionRef={(el) => (sectionRefs.current.office = el)}>

        {/* All 10 fields flow across exactly 2 rows on desktop (5 cols x 2) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Field t={t} label="Employee Joining Date" required error={errorFor('joining_date')} fieldRef={setFieldRef('joining_date') as React.Ref<HTMLDivElement>}>
            <input type="date" value={form.joining_date} readOnly={isView} disabled={isView}
              onChange={(e) => set('joining_date', e.target.value)} onClick={openPicker} className={fieldClass} />
          </Field>
          <Field t={t} label="Working Hours" required error={errorFor('working_hours')} fieldRef={setFieldRef('working_hours') as React.Ref<HTMLDivElement>}>
            <select value={form.working_hours} disabled={isView} onChange={(e) => setWorkingHoursAndAutoCheckOut(e.target.value)} className={fieldClass} style={{ cursor: isView ? 'default' : 'pointer' }}>
              <option value="">Select hours (8, 9, 10)</option>
              {WORKING_HOURS_OPTIONS.map((h) => <option key={h} value={h}>{h} Hours</option>)}
            </select>
          </Field>
          <Field t={t} label="Check In" required error={errorFor('check_in_time')} fieldRef={setFieldRef('check_in_time') as React.Ref<HTMLDivElement>}>
            <TimePicker theme={t} value={form.check_in_time} disabled={isView}
              onChange={(v) => setCheckInAndAutoCheckOut(v, form.working_hours)} />
          </Field>
          <Field t={t} label="Check Out" required>
            <TimePicker theme={t} value={form.check_out_time} disabled={isView} onChange={(v) => set('check_out_time', v)} />
          </Field>
          <Field t={t} label="Holidays" required error={errorFor('holidays')} fieldRef={setFieldRef('holidays') as React.Ref<HTMLDivElement>}>
            <select value={form.holidays} disabled={isView} onChange={(e) => set('holidays', e.target.value)} className={fieldClass} style={{ cursor: isView ? 'default' : 'pointer' }}>
              <option value="">Select holidays</option>
              {holidayOptionsFor(form.holidays).map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </Field>
          <Field t={t} label="Salary" required error={errorFor('salary')} fieldRef={setFieldRef('salary') as React.Ref<HTMLDivElement>}>
            <div className={`flex items-center gap-2 ${fieldClass}`} style={{ padding: '0 12px' }}>
              <span style={{ color: t.textSecondary }}>₹</span>
              <input
                type="text" inputMode="decimal" placeholder="Enter salary" value={formatAmountDisplay(form.salary)} readOnly={isView} disabled={isView}
                onChange={(e) => set('salary', e.target.value.replace(/[^\d.]/g, ''))}
                style={{ border: 'none', outline: 'none', background: 'transparent', padding: '9px 0', width: '100%', minWidth: 0, color: t.inputText, fontSize: 12, fontFamily: t.fontFamily }}
              />
              {compactINR(form.salary) && (
                <span style={{ color: 'var(--brand-ink)', fontWeight: 700, fontSize: 10, flexShrink: 0, whiteSpace: 'nowrap' }}>{compactINR(form.salary)}</span>
              )}
            </div>
          </Field>
          <FileUploadBox t={t} isView={isView} label="Resume" hint="PDF, DOC, DOCX (Max 5MB)" accept={DOCUMENT_ACCEPT}
            file={files.resume} existingUrl={existingUrls.resume} onChange={setFile('resume')} onView={openPreview} />
          <FileUploadBox t={t} isView={isView} label="Appointment Letter" hint="PDF, DOC, DOCX (Max 5MB)" accept={DOCUMENT_ACCEPT}
            file={files.appointment_letter} existingUrl={existingUrls.appointment_letter} onChange={setFile('appointment_letter')} onView={openPreview} />
        </div>
      </AccordionSection>

      {/* ── Bank Details ─────────────────────────────────────────────── */}
      <AccordionSection theme={t} icon={<MdAccountBalance size={16} />} title="Bank Details" gradient="var(--grad-green)"
        open={openSections.bank} onToggle={() => setOpenSections((p) => ({ ...p, bank: !p.bank }))}
        sectionRef={(el) => (sectionRefs.current.bank = el)}>

        {/* All 7 fields flow across exactly 2 rows on desktop (4 cols x 2) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field t={t} label="Account Holder Name" required error={errorFor('account_holder_name')} fieldRef={setFieldRef('account_holder_name') as React.Ref<HTMLDivElement>}>
            <input type="text" placeholder="Enter account holder name" value={form.account_holder_name} readOnly={isView} disabled={isView}
              onChange={(e) => set('account_holder_name', e.target.value)} className={fieldClass} />
          </Field>
          <Field t={t} label="Bank Name" required error={errorFor('bank_name')} fieldRef={setFieldRef('bank_name') as React.Ref<HTMLDivElement>}>
            <input type="text" placeholder="Enter bank name" value={form.bank_name} readOnly={isView} disabled={isView}
              onChange={(e) => set('bank_name', e.target.value)} className={fieldClass} />
          </Field>
          <Field t={t} label="Bank Account Number" required error={errorFor('bank_account_number')} fieldRef={setFieldRef('bank_account_number') as React.Ref<HTMLDivElement>}>
            <input type="text" placeholder="Enter account number" value={form.bank_account_number} readOnly={isView} disabled={isView}
              onChange={(e) => set('bank_account_number', e.target.value.replace(/[^\d]/g, ''))} className={fieldClass} />
          </Field>
          <Field t={t} label="Account Type" required error={errorFor('account_type')} fieldRef={setFieldRef('account_type') as React.Ref<HTMLDivElement>}>
            <select value={form.account_type} disabled={isView} onChange={(e) => set('account_type', e.target.value)} className={fieldClass} style={{ cursor: isView ? 'default' : 'pointer' }}>
              <option value="">Select account type</option>
              {ACCOUNT_TYPE_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
          <Field t={t} label="IFSC Code" required error={errorFor('ifsc_code')} fieldRef={setFieldRef('ifsc_code') as React.Ref<HTMLDivElement>}>
            <input type="text" placeholder="Enter IFSC code" value={form.ifsc_code} readOnly={isView} disabled={isView}
              onChange={(e) => set('ifsc_code', e.target.value.toUpperCase())} className={fieldClass} />
          </Field>
          <Field t={t} label="Branch" required error={errorFor('branch')} fieldRef={setFieldRef('branch') as React.Ref<HTMLDivElement>}>
            <input type="text" placeholder="Enter branch name" value={form.branch} readOnly={isView} disabled={isView}
              onChange={(e) => set('branch', e.target.value)} className={fieldClass} />
          </Field>
          <FileUploadBox t={t} isView={isView} label="Upload Bank Passbook Photo" hint="JPG, PNG (Max 2MB)" accept={IMAGE_ACCEPT} required
            file={files.passbook_photo} existingUrl={existingUrls.passbook_photo} onChange={setFile('passbook_photo')} onView={openPreview}
            fieldRef={setFieldRef('passbook_photo') as React.Ref<HTMLDivElement>} />
        </div>
      </AccordionSection>

      {/* ── Assign Action & Module for this Employee ────────────────── */}
      <AccordionSection theme={t} icon={<MdGroups size={16} />} title="Assign Action & Module for this Employee" gradient="var(--grad-green)"
        open={openSections.assign} onToggle={() => setOpenSections((p) => ({ ...p, assign: !p.assign }))}
        sectionRef={(el) => (sectionRefs.current.assign = el)}>

        {/* Department (left) + Designation (right) — side by side, equal balance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <div className="emp-assign-box">
            <CheckboxGroup
              t={t} isView={isView}
              label="Assign Departments" required
              options={departmentOptions} selected={form.department_ids}
              onToggle={toggleDepartment}
              loading={loadingDepartments} emptyHint="No departments available."
              containerRef={setFieldRef('department_ids') as React.Ref<HTMLDivElement>}
            />
          </div>
          <div className="emp-assign-box">
            <GroupedDesignationChecklist
              t={t} isView={isView} required
              options={visibleDesignationOptions} departmentOptions={departmentOptions} selected={form.designation_ids}
              onToggle={(v) => toggleIdInArray('designation_ids', v)}
              loading={loadingDesignations}
              emptyHint={form.department_ids.length === 0 ? 'Select a department above to see its designations.' : 'No designations available for the selected department(s).'}
              containerRef={setFieldRef('designation_ids') as React.Ref<HTMLDivElement>}
            />
          </div>
        </div>

        <div className="mb-5">
          <label className="emp-label">Assign Actions & Modules</label>
          <div className="emp-module-panel">
            <ModuleActionGrid
              t={t} isView={isView} grid={moduleGrid}
              selected={form.module_action_ids}
              onToggle={(v) => toggleIdInArray('module_action_ids', v)}
              onToggleRow={toggleModuleActionRow}
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
      </AccordionSection>

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
            disabled={saving}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{
              background: !isFormValid || saving ? '#9ca3af' : 'var(--brand-gradient)',
              border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.8 : 1,
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
