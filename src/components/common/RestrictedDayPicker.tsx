// ==========================================
// DREAM GROUP CRM — DAY-RESTRICTED CALENDAR PICKER
// ==========================================
// V_24.0 — Add/Edit Customer's Payment Date field only ever allows the
// 1st-15th of a month (see CustomerDetailsCrudPage's MAX_INSTALLMENT_DAY_OF_
// MONTH / clampInstallmentDate). That used to be a native
// <input type="date">, which has no way to grey out or disable individual
// days inside the browser's own calendar popup — it could only snap an
// out-of-range pick back to the 15th after the fact. A first pass replaced
// it with three plain Year/Month/Day <select>s (same pattern DobPicker uses
// for Date of Birth), which correctly greyed out the 16th-31st via
// <option disabled> — but lost the actual calendar-grid look the rest of
// the form (and the user) expects a date field to have.
//
// This is a real calendar-grid popover instead: same visual shape as the
// browser's own date picker (month header with prev/next, a 7-column day
// grid), portaled to document.body and positioned off the trigger's own
// bounding rect — same technique this page's own SearchableSelect already
// uses so the popover is never clipped by AccordionSection's
// overflow:hidden. The 16th-31st (and anything before `minDate`) render as
// actually disabled, greyed-out, unclickable cells, not merely snapped
// after the fact.
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdChevronLeft, MdChevronRight, MdCalendarToday } from 'react-icons/md';
import { PickerTheme } from './DobPicker';
import { serverTodayYmd } from '../../utils/serverTime';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const pad2 = (n: number): string => String(n).padStart(2, '0');
const isoOf = (y: number, m0: number, d: number): string => `${y}-${pad2(m0 + 1)}-${pad2(d)}`;
const todayIso = (): string => serverTodayYmd();

interface RestrictedDayPickerTheme extends PickerTheme {
  surfaceBg: string;
  surfaceBorder: string;
  textPrimary: string;
}

interface RestrictedDayPickerProps {
  theme: RestrictedDayPickerTheme;
  value: string; // 'YYYY-MM-DD', '' when unset
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  // Earliest selectable date, ISO — a day before this renders disabled/
  // greyed rather than simply omitted, so it's visible WHY it can't be
  // picked. Optional — omit for no lower bound.
  minDate?: string;
  // Days after this, in EVERY month, render disabled/greyed. Optional —
  // omit for no upper bound (every day in the month stays selectable).
  maxDayOfMonth?: number;
}

const formatDisplay = (iso: string): string => (iso ? `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}` : '');

export const RestrictedDayPicker: React.FC<RestrictedDayPickerProps> = ({
  theme, value, onChange, disabled, placeholder = 'dd-mm-yyyy', minDate, maxDayOfMonth,
}) => {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const anchor = value || minDate || todayIso();
  const [viewYear, setViewYear] = useState(() => Number(anchor.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number(anchor.slice(5, 7)) - 1); // 0-based
  const ref = useRef<HTMLButtonElement>(null);

  // Jump the visible month back to wherever the current value (or, once
  // it's picked, minDate) actually is whenever it changes from the
  // outside — e.g. Edit mode's initial load, or Booking Date moving
  // forward mid-edit.
  useEffect(() => {
    const jumpTo = value || minDate;
    if (!jumpTo) return;
    setViewYear(Number(jumpTo.slice(0, 4)));
    setViewMonth(Number(jumpTo.slice(5, 7)) - 1);
  }, [value, minDate]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target) && !(target as HTMLElement).closest?.('[data-restricted-day-picker-menu]')) setOpen(false);
    };
    const onScrollOrResize = () => setOpen(false);
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open]);

  const toggleOpen = () => {
    if (disabled) return;
    if (!open) {
      const r = ref.current?.getBoundingClientRect();
      if (r) setMenuPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen((v) => !v);
  };

  const changeMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    else if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  };

  const isDisabledDay = (day: number): boolean => {
    if (maxDayOfMonth && day > maxDayOfMonth) return true;
    if (minDate && isoOf(viewYear, viewMonth, day) < minDate) return true;
    return false;
  };

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const today = todayIso();

  return (
    <button
      ref={ref} type="button" disabled={disabled} onClick={toggleOpen}
      className={disabled ? 'cust-field cust-field-view' : 'cust-field'}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%',
        cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left', appearance: 'none', WebkitAppearance: 'none',
      }}
    >
      <span style={{ color: value ? theme.inputText : theme.textSecondary }}>{value ? formatDisplay(value) : placeholder}</span>
      <MdCalendarToday size={14} style={{ color: theme.textSecondary, flexShrink: 0 }} />

      {open && !disabled && menuPos && createPortal(
        <div
          data-restricted-day-picker-menu
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', top: menuPos.top, left: menuPos.left, width: Math.max(menuPos.width, 240), zIndex: 200,
            background: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}`, borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 10, fontFamily: theme.fontFamily,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            {/* React portals bubble synthetic events along the REACT tree,
                not the real DOM tree — this content is only a DOM
                descendant of document.body, but it's still a REACT child
                of the outer trigger <button>, so a plain click here would
                also fire that button's own onClick (toggleOpen) right
                after this one, undoing whatever this button just did. */}
            <button type="button" onClick={(e) => { e.stopPropagation(); changeMonth(-1); }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: theme.textPrimary, display: 'flex', padding: 2 }}>
              <MdChevronLeft size={18} />
            </button>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.textPrimary }}>{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); changeMonth(1); }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: theme.textPrimary, display: 'flex', padding: 2 }}>
              <MdChevronRight size={18} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
            {WEEKDAYS.map((w) => (
              <div key={w} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: theme.textSecondary, padding: '2px 0' }}>{w}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((day, i) => {
              if (day == null) return <div key={`blank-${i}`} />;
              const iso = isoOf(viewYear, viewMonth, day);
              const dayDisabled = isDisabledDay(day);
              const selected = iso === value;
              const isToday = iso === today;
              return (
                <button
                  key={iso} type="button" disabled={dayDisabled}
                  onClick={(e) => { e.stopPropagation(); onChange(iso); setOpen(false); }}
                  title={dayDisabled ? 'Payment Date can only fall on the 1st-15th of a month' : undefined}
                  style={{
                    aspectRatio: '1 / 1', borderRadius: 8, fontSize: 11.5, fontWeight: selected ? 700 : 500,
                    border: isToday && !selected ? `1px solid var(--brand-gradient)` : '1px solid transparent',
                    background: selected ? 'var(--brand-gradient)' : 'transparent',
                    color: selected ? '#fff' : dayDisabled ? theme.textSecondary : theme.textPrimary,
                    opacity: dayDisabled ? 0.4 : 1,
                    cursor: dayDisabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </button>
  );
};

export default RestrictedDayPicker;
