// ==========================================
// DREAM GROUP CRM — DATE OF BIRTH PICKER
// ==========================================
// Replaces the native <input type="date"> for Date of Birth (item 15).
// A birthdate is, by definition, always in the past and often decades
// back — a calendar-grid picker (or the native date input's own spinner)
// makes reaching an old year painfully slow, one click/scroll-tick at a
// time. Three plain <select>s (Day / Month / Year) sidestep that
// entirely: a native <select> already supports jumping straight to a
// year by typing it or by the OS's own fast-scroll list, so "fast
// previous-year navigation" falls out of the browser's own select
// behavior for free, with zero custom scroll/virtualization logic and
// full keyboard/screen-reader support built in. Year is listed first —
// it's the field that's actually slow to reach with a calendar.
import React, { useEffect, useMemo, useState } from 'react';

export interface PickerTheme {
  inputBg: string;
  inputBorder: string;
  inputText: string;
  textSecondary: string;
  fontFamily: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const daysInMonth = (year: number, month1to12: number): number => new Date(year, month1to12, 0).getDate();

interface DobPickerProps {
  theme: PickerTheme;
  value: string; // 'YYYY-MM-DD', '' when unset
  onChange: (v: string) => void;
  disabled?: boolean;
  // Latest selectable date, ISO — defaults to today (no future DOB).
  maxDate?: string;
  // Earliest selectable year — 120 years back covers any realistic DOB
  // without the Year list growing unreasonably long.
  minYear?: number;
}

const selectStyle = (theme: PickerTheme, disabled?: boolean): React.CSSProperties => ({
  flex: 1, minWidth: 0, background: theme.inputBg, border: `1px solid ${theme.inputBorder}`,
  borderRadius: 10, padding: '9px 8px', fontSize: 12, color: theme.inputText,
  fontFamily: theme.fontFamily, cursor: disabled ? 'not-allowed' : 'pointer', outline: 'none',
});

const parseValue = (value: string): { year: string; month: string; day: string } => {
  if (!value) return { year: '', month: '', day: '' };
  const [y, m, d] = value.split('-');
  return { year: y || '', month: m ? String(Number(m)) : '', day: d ? String(Number(d)) : '' };
};

export const DobPicker: React.FC<DobPickerProps> = ({ theme, value, onChange, disabled, maxDate, minYear = new Date().getFullYear() - 120 }) => {
  const max = maxDate ? new Date(`${maxDate}T00:00:00`) : new Date();
  const maxYear = max.getFullYear();

  // Local state is the source of truth for what's currently picked, so a
  // year chosen before month/day are filled in doesn't vanish on the next
  // select's change — the ISO `value` prop only exists once ALL three are
  // chosen, so re-deriving from it after every partial pick would reset
  // the still-empty fields back to blank on every step. Only resynced from
  // the prop when it changes from the outside (e.g. Edit mode's initial
  // load), not on every local edit.
  const [local, setLocal] = useState(() => parseValue(value));
  useEffect(() => { setLocal(parseValue(value)); }, [value]);

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = maxYear; y >= minYear; y--) arr.push(y);
    return arr;
  }, [maxYear, minYear]);

  const dayCount = local.year && local.month ? daysInMonth(Number(local.year), Number(local.month)) : 31;
  const days = useMemo(() => Array.from({ length: dayCount }, (_, i) => i + 1), [dayCount]);

  // Clamps against both "day doesn't exist in this month" (e.g. Feb 30)
  // and "this exact date is in the future" (only possible when year is
  // the current max year) — the parent's onChange only fires once all
  // three parts are chosen; a partial pick just updates local state.
  const update = (part: 'year' | 'month' | 'day', v: string) => {
    const next = { ...local, [part]: v };
    setLocal(next);
    if (!next.year || !next.month || !next.day) return;
    const clampedDay = Math.min(Number(next.day), daysInMonth(Number(next.year), Number(next.month)));
    let candidate = new Date(Number(next.year), Number(next.month) - 1, clampedDay);
    if (candidate > max) candidate = max;
    const iso = `${candidate.getFullYear()}-${String(candidate.getMonth() + 1).padStart(2, '0')}-${String(candidate.getDate()).padStart(2, '0')}`;
    onChange(iso);
  };

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={local.year} disabled={disabled} aria-label="Year of birth"
        onChange={(e) => update('year', e.target.value)}
        style={{ ...selectStyle(theme, disabled), flex: '1.2 1 0' }}
      >
        <option value="">Year</option>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <select
        value={local.month} disabled={disabled} aria-label="Month of birth"
        onChange={(e) => update('month', e.target.value)}
        style={selectStyle(theme, disabled)}
      >
        <option value="">Month</option>
        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </select>
      <select
        value={local.day} disabled={disabled} aria-label="Day of birth"
        onChange={(e) => update('day', e.target.value)}
        style={selectStyle(theme, disabled)}
      >
        <option value="">Day</option>
        {days.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
    </div>
  );
};

export default DobPicker;
