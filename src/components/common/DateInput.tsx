// ==========================================
// DREAM GROUP CRM - DATE INPUT (DD/MM/YYYY)
// ==========================================
// Drop-in replacement for <input type="date">. The browser's own date field
// shows the date in the computer's locale (MM/DD/YYYY on many machines);
// this one always shows and accepts DD/MM/YYYY. The value going in and out
// stays the same YYYY-MM-DD string the native field used, so callers and the
// API don't change.
//
// Type the date (the slashes are added as you type) or pick it from the
// calendar. min / max are honoured both ways. The calendar is portaled so a
// scrolling table or a popup never clips it.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdCalendarToday, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { AppTheme } from '../../styles/theme';
import { cssRect, viewportHeight, viewportWidth } from '../../utils/appZoom';
import { serverTodayYmd } from '../../utils/serverTime';
import { useAppearanceTokens } from '../../styles/appearanceTokens';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const pad = (n: number) => String(n).padStart(2, '0');
const toYmd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
/** YYYY-MM-DD (or a longer ISO string) -> DD/MM/YYYY; '' when not a date. */
export const ymdToDmy = (ymd: string | null | undefined): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};
/** DD/MM/YYYY -> YYYY-MM-DD; null when it isn't a real calendar date. */
const dmyToYmd = (dmy: string): string | null => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dmy);
  if (!m) return null;
  const d = Number(m[1]); const mo = Number(m[2]); const y = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > new Date(y, mo, 0).getDate() || y < 1900) return null;
  return toYmd(y, mo, d);
};
// Digits typed -> DD/MM/YYYY with the slashes put in.
const maskDigits = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

export interface DateInputProps {
  t: AppTheme;
  /** YYYY-MM-DD, or '' for no date. */
  value: string;
  /** Optional for a read-only field. */
  onChange?: (ymd: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  placeholder?: string;
  title?: string;
  id?: string;
  'aria-label'?: string;
  /** Styles the text field (same as the native field's style used to);
   *  layout properties (width, flex, margins) go on the wrapper. */
  style?: React.CSSProperties;
  /** Class for the text field — when given, it styles the field instead of
   *  the default look (same as the native field's className did). */
  className?: string;
}

const DateInput: React.FC<DateInputProps> = ({
  t, value, onChange: onChangeProp, min, max, disabled, readOnly, required, placeholder = 'DD/MM/YYYY', title, id, style, className, ...rest
}) => {
  // Theme variables (brand colours) are only set on the app layout, so the
  // portaled calendar carries them itself.
  const { cssVars } = useAppearanceTokens();
  const onChange = (v: string) => onChangeProp?.(v);
  // Layout properties size the wrapper; the rest style the text field.
  const { wrapStyle, fieldStyle } = useMemo(() => {
    const layoutKeys = ['width', 'minWidth', 'maxWidth', 'flex', 'flexShrink', 'flexGrow', 'flexBasis', 'alignSelf', 'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'gridColumn'];
    const w: Record<string, unknown> = {}; const f: Record<string, unknown> = {};
    Object.entries(style ?? {}).forEach(([k, v]) => { (layoutKeys.includes(k) ? w : f)[k] = v; });
    return { wrapStyle: w as React.CSSProperties, fieldStyle: f as React.CSSProperties };
  }, [style]);
  const [text, setText] = useState(ymdToDmy(value));
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [view, setView] = useState<{ y: number; m: number }>(() => {
    const base = value || serverTodayYmd();
    return { y: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)) };
  });
  const wrapRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const locked = disabled || readOnly;

  // Outside changes (reset, prefill) show up in the field.
  useEffect(() => { setText(ymdToDmy(value)); }, [value]);

  const inRange = (ymd: string) => (!min || ymd >= min.slice(0, 10)) && (!max || ymd <= max.slice(0, 10));

  const place = () => {
    const r = cssRect(wrapRef.current);
    if (!r) return;
    const W = 264; const H = 300;
    const left = Math.max(8, Math.min(r.left, viewportWidth() - W - 8));
    const below = r.bottom + 4;
    const top = below + H > viewportHeight() && r.top - H - 4 > 8 ? r.top - H - 4 : below;
    setPos({ top, left });
  };
  const openCalendar = () => {
    if (locked) return;
    const base = value || (max && max < serverTodayYmd() ? max : min && min > serverTodayYmd() ? min : serverTodayYmd());
    setView({ y: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)) });
    place();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target) || popRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleType = (raw: string) => {
    const masked = maskDigits(raw);
    setText(masked);
    if (masked === '') { onChange(''); return; }
    const ymd = dmyToYmd(masked);
    if (ymd && inRange(ymd)) { onChange(ymd); setView({ y: Number(ymd.slice(0, 4)), m: Number(ymd.slice(5, 7)) }); }
  };
  // Leaving the field with an incomplete / out-of-range date puts back the
  // last valid value rather than keeping text that isn't the real value.
  const handleBlur = () => { if (text !== ymdToDmy(value)) setText(ymdToDmy(value)); };

  const pick = (ymd: string) => { onChange(ymd); setText(ymdToDmy(ymd)); setOpen(false); };

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m - 1, 1);
    const lead = (first.getDay() + 6) % 7; // Monday first
    const days = new Date(view.y, view.m, 0).getDate();
    const out: (number | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= days; d++) out.push(d);
    while (out.length % 7) out.push(null);
    return out;
  }, [view]);
  const step = (k: number) => setView(({ y, m }) => {
    const n = (y * 12 + (m - 1)) + k;
    return { y: Math.floor(n / 12), m: (n % 12) + 1 };
  });
  const today = serverTodayYmd();

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', minWidth: 0, ...wrapStyle }}>
      <input
        type="text" inputMode="numeric" id={id} aria-label={rest['aria-label']} title={title}
        value={text} placeholder={placeholder} disabled={disabled} readOnly={readOnly} required={required}
        onChange={(e) => handleType(e.target.value)} onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' || (e.key === 'Enter' && !open)) { e.preventDefault(); openCalendar(); } }}
        onClick={() => { if (!open) openCalendar(); }}
        className={className}
        style={{
          ...(className ? {} : {
            background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText,
            borderRadius: 10, padding: '9px 10px', fontSize: 12, outline: 'none',
          }),
          ...fieldStyle, width: '100%', paddingRight: 32, cursor: locked ? 'not-allowed' : 'text',
        }}
      />
      <button type="button" tabIndex={-1} aria-label="Open calendar" disabled={locked} onClick={() => (open ? setOpen(false) : openCalendar())}
        style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', padding: 2, display: 'flex', color: t.textSecondary, cursor: locked ? 'not-allowed' : 'pointer' }}>
        <MdCalendarToday size={15} />
      </button>
      {open && pos && createPortal(
        <div ref={popRef} role="dialog" aria-label="Choose date"
          style={{ ...cssVars, position: 'fixed', top: pos.top, left: pos.left, width: 264, zIndex: 1000, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 12, boxShadow: '0 10px 28px rgba(0,0,0,0.18)', padding: 10, fontFamily: t.fontFamily }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <button type="button" onClick={() => step(-1)} aria-label="Previous month" style={{ background: t.insetBg, border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.textPrimary }}>
              <MdChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1">
              <select value={view.m} onChange={(e) => setView((v) => ({ ...v, m: Number(e.target.value) }))} aria-label="Month"
                style={{ background: t.inputBg, color: t.inputText, border: `1px solid ${t.inputBorder}`, borderRadius: 6, fontSize: 12, padding: '2px 4px' }}>
                {MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
              </select>
              <input type="number" value={view.y} aria-label="Year" min={1900} max={2200}
                onChange={(e) => { const y = Number(e.target.value); if (y > 1900 && y < 2200) setView((v) => ({ ...v, y })); }}
                style={{ width: 62, background: t.inputBg, color: t.inputText, border: `1px solid ${t.inputBorder}`, borderRadius: 6, fontSize: 12, padding: '2px 4px' }} />
            </div>
            <button type="button" onClick={() => step(1)} aria-label="Next month" style={{ background: t.insetBg, border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.textPrimary }}>
              <MdChevronRight size={18} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {WEEKDAYS.map((w) => <div key={w} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, padding: '3px 0' }}>{w}</div>)}
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} />;
              const ymd = toYmd(view.y, view.m, d);
              const ok = inRange(ymd);
              const sel = ymd === value?.slice(0, 10);
              const isToday = ymd === today;
              return (
                <button key={ymd} type="button" disabled={!ok} onClick={() => pick(ymd)} aria-label={ymdToDmy(ymd)} aria-pressed={sel}
                  style={{
                    height: 30, borderRadius: 8, fontSize: 12, fontWeight: sel || isToday ? 800 : 500, cursor: ok ? 'pointer' : 'not-allowed',
                    background: sel ? 'var(--brand-gradient, #2563eb)' : 'transparent', color: sel ? '#fff' : ok ? t.textPrimary : t.textSecondary,
                    border: isToday && !sel ? `1px solid ${t.inputBorder}` : '1px solid transparent', opacity: ok ? 1 : 0.35,
                  }}>
                  {d}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between" style={{ marginTop: 8 }}>
            <button type="button" onClick={() => { onChange(''); setText(''); setOpen(false); }}
              style={{ background: 'transparent', border: 'none', color: t.textSecondary, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Clear</button>
            <button type="button" disabled={!inRange(today)} onClick={() => pick(today)}
              style={{ background: 'transparent', border: 'none', color: inRange(today) ? 'var(--brand-ink, #2563eb)' : t.textSecondary, fontSize: 12, fontWeight: 700, cursor: inRange(today) ? 'pointer' : 'not-allowed' }}>Today</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DateInput;
