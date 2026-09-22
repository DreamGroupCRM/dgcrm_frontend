// ==========================================
// DREAM GROUP CRM — DAY-RESTRICTED DATE PICKER
// ==========================================
// V_24.0 — Add/Edit Customer's Payment Date field only ever allows the
// 1st-15th of a month (see CustomerDetailsCrudPage's MAX_INSTALLMENT_DAY_OF_
// MONTH / clampInstallmentDate), but that was enforced on a native
// <input type="date"> by silently SNAPPING an out-of-range pick back to the
// 15th after the fact — a native date input has no way to grey out or
// disable individual days inside the browser's own calendar popup. Three
// plain <select>s (Year / Month / Day), same pattern DobPicker already uses
// for Date of Birth, sidestep that entirely: a <select>'s own <option
// disabled> already renders visibly greyed-out and unselectable in every
// browser, with zero custom calendar-grid/popover code needed.
import React, { useEffect, useMemo, useState } from 'react';
import { PickerTheme } from './DobPicker';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const daysInMonth = (year: number, month1to12: number): number => new Date(year, month1to12, 0).getDate();

interface RestrictedDayPickerProps {
  theme: PickerTheme;
  value: string; // 'YYYY-MM-DD', '' when unset
  onChange: (v: string) => void;
  disabled?: boolean;
  // Earliest selectable date, ISO — a year/month/day before this is shown
  // disabled/greyed rather than simply omitted, so it's visible WHY it
  // can't be picked. Optional — omit for no lower bound.
  minDate?: string;
  // Days after this, in EVERY month, are shown disabled/greyed. Optional —
  // omit for no upper bound (every day in the month stays selectable).
  maxDayOfMonth?: number;
  // How many years past minDate's (or today's, with no minDate) year to
  // list — this field is always a specific near-term anchor date, never a
  // birthdate, so a short forward window (unlike DobPicker's 120-year-back
  // range) is all that's ever realistically needed.
  yearsAhead?: number;
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

export const RestrictedDayPicker: React.FC<RestrictedDayPickerProps> = ({
  theme, value, onChange, disabled, minDate, maxDayOfMonth, yearsAhead = 5,
}) => {
  const minYear = minDate ? Number(minDate.slice(0, 4)) : new Date().getFullYear();
  const minMonth = minDate ? Number(minDate.slice(5, 7)) : 1;
  const minDay = minDate ? Number(minDate.slice(8, 10)) : 1;

  // Same "local state is the source of truth mid-pick" reasoning as
  // DobPicker — the ISO `value` prop only exists once all three parts are
  // chosen, so re-deriving from it after every partial pick would reset
  // the still-empty fields back to blank on every step.
  const [local, setLocal] = useState(() => parseValue(value));
  useEffect(() => { setLocal(parseValue(value)); }, [value]);

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = minYear; y <= minYear + yearsAhead; y++) arr.push(y);
    return arr;
  }, [minYear, yearsAhead]);

  const selectedYear = local.year ? Number(local.year) : null;
  const isMinYear = selectedYear === minYear;

  const dayCount = local.year && local.month ? daysInMonth(Number(local.year), Number(local.month)) : 31;
  const lowerDayBound = isMinYear && Number(local.month) === minMonth ? minDay : 1;
  const days = useMemo(() => Array.from({ length: dayCount }, (_, i) => i + 1), [dayCount]);

  const isMonthDisabled = (m: number) => isMinYear && m < minMonth;
  const isDayDisabled = (d: number) => d < lowerDayBound || (!!maxDayOfMonth && d > maxDayOfMonth);

  const update = (part: 'year' | 'month' | 'day', v: string) => {
    const next = { ...local, [part]: v };
    // Switching year/month can leave a previously-valid day now out of
    // range (a shorter month, or now before the min-year's min-month) —
    // clamp it forward/backward into the newly-valid window rather than
    // silently keeping an invalid selection.
    if (part !== 'day' && next.year && next.month && next.day) {
      const total = daysInMonth(Number(next.year), Number(next.month));
      const lower = Number(next.year) === minYear && Number(next.month) === minMonth ? minDay : 1;
      const upper = maxDayOfMonth ? Math.min(maxDayOfMonth, total) : total;
      const day = Math.min(Math.max(Number(next.day), lower), Math.max(upper, lower));
      next.day = String(day);
    }
    setLocal(next);
    if (!next.year || !next.month || !next.day) return;
    if (isDayDisabled(Number(next.day))) return; // defensive — should be unreachable via the UI
    onChange(`${next.year}-${String(next.month).padStart(2, '0')}-${String(next.day).padStart(2, '0')}`);
  };

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={local.year} disabled={disabled} aria-label="Year"
        onChange={(e) => update('year', e.target.value)}
        style={{ ...selectStyle(theme, disabled), flex: '1.2 1 0' }}
      >
        <option value="">Year</option>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <select
        value={local.month} disabled={disabled} aria-label="Month"
        onChange={(e) => update('month', e.target.value)}
        style={selectStyle(theme, disabled)}
      >
        <option value="">Month</option>
        {MONTHS.map((m, i) => <option key={m} value={i + 1} disabled={isMonthDisabled(i + 1)}>{m}</option>)}
      </select>
      <select
        value={local.day} disabled={disabled} aria-label="Day"
        onChange={(e) => update('day', e.target.value)}
        style={selectStyle(theme, disabled)}
      >
        <option value="">Day</option>
        {days.map((d) => <option key={d} value={d} disabled={isDayDisabled(d)}>{d}</option>)}
      </select>
    </div>
  );
};

export default RestrictedDayPicker;
