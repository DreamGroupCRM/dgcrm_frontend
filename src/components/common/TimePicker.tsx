// ==========================================
// DREAM GROUP CRM — TIME PICKER (Check In / Check Out)
// ==========================================
// Replaces the native <input type="time"> for Check In/Check Out (item
// 14) — a compact field button that opens a 3-column scroll-snap picker
// (Hour / 5-minute step / AM-PM) instead of the browser's own spinner
// control, which is what was actually feeling slow/imprecise to use.
// 5-minute steps keep each column short enough to scan and scroll in one
// or two flicks — real shift start times are essentially always on a
// round 5-minute mark anyway. Every option is a real <button>, so it's
// fully reachable by keyboard/tab, and each column scrolls independently
// with CSS scroll-snap for a smooth, native-feeling stop-on-value feel.
import React, { useEffect, useRef, useState } from 'react';
import { MdAccessTime } from 'react-icons/md';

export interface PickerTheme {
  inputBg: string;
  inputBorder: string;
  inputText: string;
  surfaceBg: string;
  surfaceBorder: string;
  textSecondary: string;
  fontFamily: string;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES_5 = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,...,55
const MERIDIEMS = ['AM', 'PM'] as const;

const to12Hour = (h24: number): { hour12: number; meridiem: 'AM' | 'PM' } => {
  const meridiem = h24 >= 12 ? 'PM' : 'AM';
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour12, meridiem };
};

const to24Hour = (hour12: number, meridiem: 'AM' | 'PM'): number => {
  if (meridiem === 'AM') return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
};

const formatDisplay = (value: string): string => {
  if (!value) return '';
  const [hStr, mStr] = value.split(':');
  const { hour12, meridiem } = to12Hour(Number(hStr) || 0);
  return `${hour12}:${String(Number(mStr) || 0).padStart(2, '0')} ${meridiem}`;
};

// Snaps the nearest-5-minute-rounded value into view without disturbing
// scroll position for unrelated columns — called only when the popover
// first opens, so re-renders while scrolling don't fight the user.
const scrollColumnTo = (container: HTMLDivElement | null, index: number) => {
  if (!container) return;
  const item = container.children[index] as HTMLElement | undefined;
  item?.scrollIntoView({ block: 'center' });
};

const ScrollColumn: React.FC<{
  theme: PickerTheme; values: (number | string)[]; selected: number | string; onSelect: (v: any) => void; label: (v: number | string) => string;
}> = ({ theme, values, selected, onSelect, label }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const idx = values.findIndex((v) => v === selected);
    if (idx >= 0) scrollColumnTo(ref.current, idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div
      ref={ref}
      style={{
        height: 168, width: 60, overflowY: 'auto', scrollSnapType: 'y mandatory',
        borderRight: `1px solid ${theme.surfaceBorder}`, padding: '4px 0',
      }}
    >
      {values.map((v) => {
        const isSelected = v === selected;
        return (
          <button
            key={v} type="button" onClick={() => onSelect(v)}
            style={{
              display: 'block', width: '100%', scrollSnapAlign: 'center',
              padding: '7px 0', border: 'none', cursor: 'pointer', fontFamily: theme.fontFamily,
              background: isSelected ? 'rgba(2,132,199,0.12)' : 'transparent',
              color: isSelected ? '#0284c7' : theme.textSecondary,
              fontWeight: isSelected ? 700 : 500, fontSize: 13,
            }}
          >
            {label(v)}
          </button>
        );
      })}
    </div>
  );
};

interface TimePickerProps {
  theme: PickerTheme;
  value: string; // 'HH:mm' 24-hour, '' when unset
  onChange: (v: string) => void;
  disabled?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({ theme, value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const [hStr, mStr] = value ? value.split(':') : ['', ''];
  const h24 = hStr ? Number(hStr) : 9; // sensible default once a column is touched
  const minute = mStr ? Number(mStr) : 0;
  const roundedMinute = MINUTES_5.reduce((closest, m) => (Math.abs(m - minute) < Math.abs(closest - minute) ? m : closest), 0);
  const { hour12, meridiem } = to12Hour(h24);

  const commit = (nextHour12: number, nextMinute: number, nextMeridiem: 'AM' | 'PM') => {
    const h = to24Hour(nextHour12, nextMeridiem);
    onChange(`${String(h).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button" disabled={disabled} onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5"
        style={{
          width: '100%', background: theme.inputBg, border: `1px solid ${theme.inputBorder}`, borderRadius: 10,
          padding: '9px 10px', fontSize: 12, color: value ? theme.inputText : theme.textSecondary,
          fontFamily: theme.fontFamily, cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left',
        }}
      >
        <MdAccessTime size={14} style={{ flexShrink: 0, color: theme.textSecondary }} />
        {value ? formatDisplay(value) : 'Select time'}
      </button>

      {open && !disabled && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 30,
            display: 'flex', background: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}`,
            borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.16)', overflow: 'hidden',
          }}
        >
          <ScrollColumn theme={theme} values={HOURS_12} selected={hour12} label={(v) => String(v)}
            onSelect={(v) => commit(v, roundedMinute, meridiem)} />
          <ScrollColumn theme={theme} values={MINUTES_5} selected={roundedMinute} label={(v) => String(v).padStart(2, '0')}
            onSelect={(v) => commit(hour12, v, meridiem)} />
          <div style={{ width: 52, padding: '4px 0' }}>
            {MERIDIEMS.map((mer) => {
              const isSelected = mer === meridiem;
              return (
                <button
                  key={mer} type="button" onClick={() => commit(hour12, roundedMinute, mer)}
                  style={{
                    display: 'block', width: '100%', padding: '7px 0', border: 'none', cursor: 'pointer',
                    fontFamily: theme.fontFamily, background: isSelected ? 'rgba(2,132,199,0.12)' : 'transparent',
                    color: isSelected ? '#0284c7' : theme.textSecondary, fontWeight: isSelected ? 700 : 500, fontSize: 13,
                  }}
                >
                  {mer}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimePicker;
