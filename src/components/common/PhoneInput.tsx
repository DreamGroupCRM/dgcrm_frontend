// ==========================================
// DREAM GROUP CRM — SHARED PHONE NUMBER INPUT
// ==========================================
// One reusable "flag + country code | number" control (item 16), used by
// both Customer and Employee CRUD instead of each page keeping its own
// near-duplicate PhoneField. The closed trigger stays compact (flag +
// code only) — showing the full country name there is what caused the
// earlier zero-width-input bug (a wide select starved the sibling number
// input of space inside a narrow grid column). Country NAME + a
// searchable list live in the dropdown that opens on click instead,
// which is both the safer layout and the more familiar pattern from
// production phone inputs (react-phone-input-2, intl-tel-input, etc.).
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdAdd, MdKeyboardArrowDown, MdSearch } from 'react-icons/md';
// Real SVG flags instead of Unicode flag emoji (🇮🇳 etc.) — those only
// render as a picture when the OS/browser ships a color-emoji font with
// flag glyphs. Windows (pre-2022 builds) and most Linux browsers don't, so
// they silently fall back to showing the raw two-letter region-indicator
// text ("IN") instead of a flag, which is what was actually happening
// everywhere this component is used. SVGs render identically on every
// platform since they don't depend on any installed font.
import * as FlagIcons from 'country-flag-icons/react/3x2';
import { getCountries, getCountryCallingCode } from 'libphonenumber-js/min';

export interface PickerTheme {
  inputBg: string;
  inputBorder: string;
  inputText: string;
  surfaceBg: string;
  surfaceBorder: string;
  textPrimary: string;
  textSecondary: string;
  insetBg: string;
  fontFamily: string;
}

// The library's own Props type (ElementAttributes<HTMLSVGElement>) doesn't
// actually match DOM's SVGSVGElement, so a looser shape is used here for
// the two props these flags are actually given below.
type FlagIcon = React.ComponentType<{ title?: string; style?: React.CSSProperties }>;

export interface CountryOption {
  iso2: string;
  code: string;
  flag: FlagIcon;
  name: string;
}

// Every country/territory libphonenumber-js knows a dial code for — built
// once from that library's own data (not a hand-typed table) plus
// Intl.DisplayNames for the English name, so this list is exactly as
// complete and correct as the phone-number validation elsewhere in this
// app already is. India is pinned first as the default/most-used country;
// everything else is alphabetical by name. A dial code can be shared by
// more than one country (e.g. +1 for both USA and Canada) — that's real
// (not a bug here), so the closed/selected state just shows whichever of
// those countries appears first in this list for that code.
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
export const COUNTRY_OPTIONS: CountryOption[] = getCountries()
  .map((iso2) => ({
    iso2,
    code: `+${getCountryCallingCode(iso2)}`,
    flag: (FlagIcons as Record<string, FlagIcon>)[iso2],
    name: regionNames.of(iso2) || iso2,
  }))
  .filter((c) => !!c.flag)
  .sort((a, b) => (a.iso2 === 'IN' ? -1 : b.iso2 === 'IN' ? 1 : a.name.localeCompare(b.name)));

// A thin outline keeps white-heavy flags (Japan, etc.) visible against a
// white/light dropdown row instead of nearly disappearing into it.
const flagStyle: React.CSSProperties = { width: 18, height: 13, borderRadius: 2, flexShrink: 0, objectFit: 'cover', boxShadow: '0 0 0 1px rgba(0,0,0,0.12)' };

interface PhoneInputProps {
  theme: PickerTheme;
  disabled?: boolean;
  code: string;
  onCodeChange: (v: string) => void;
  number: string;
  onNumberChange: (v: string) => void;
  // Leading icon inside the field (e.g. the WhatsApp glyph Customer CRUD's
  // WhatsApp Number field uses) — optional, unused by most callers.
  icon?: React.ReactNode;
  // Renders a compact "+" button that appends a blank secondary-number row
  // (Customer CRUD's primary Mobile Number field only).
  onAdd?: () => void;
  placeholder?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  theme, disabled, code, onCodeChange, number, onNumberChange, icon, onAdd, placeholder = 'Enter number',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // The country picker is used inside accordion sections, modals, and
  // narrow grid cells all over the app (Customer/Employee/Company/Lead/User
  // Management forms) — a plain `position: absolute` panel here would get
  // clipped by any of those containers' own overflow/scroll (item 7's
  // "hidden behind accordions/cards" bug). Rendered into a document.body
  // portal at a `fixed` position computed from the trigger's own bounding
  // rect instead, same fix already applied to the app's other dropdowns.
  const openDropdown = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setMenuPos({ top: r.bottom + 4, left: r.left });
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (ref.current && !ref.current.contains(target) && !target.closest?.('[data-phone-country-menu]')) {
        setOpen(false); setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const r = ref.current?.getBoundingClientRect();
      if (r) setMenuPos({ top: r.bottom + 4, left: r.left });
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  const selected = COUNTRY_OPTIONS.find((c) => c.code === code) || COUNTRY_OPTIONS[0];
  const filtered = COUNTRY_OPTIONS.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) || c.code.includes(query)
  );

  return (
    <div className="flex items-center gap-2" style={{
      border: `1px solid ${theme.inputBorder}`, borderRadius: 12, background: disabled ? theme.insetBg : theme.inputBg,
      padding: '0 8px 0 12px',
    }}>
      {icon}
      <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          type="button" disabled={disabled} onClick={openDropdown}
          className="flex items-center gap-1.5"
          style={{ background: 'transparent', border: 'none', padding: '9px 2px', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: theme.fontFamily, fontSize: 12, color: theme.inputText }}
        >
          <selected.flag title={selected.name} style={flagStyle} /> {selected.code} <MdKeyboardArrowDown size={13} style={{ color: theme.textSecondary }} />
        </button>

        {open && !disabled && menuPos && createPortal(
          <div data-phone-country-menu style={{
            position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 200, width: 260,
            background: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}`, borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.16)', overflow: 'hidden',
          }}>
            <div className="flex items-center gap-1.5 px-2.5 py-2" style={{ borderBottom: `1px solid ${theme.surfaceBorder}` }}>
              <MdSearch size={14} style={{ color: theme.textSecondary, flexShrink: 0 }} />
              <input
                autoFocus type="text" placeholder="Search country or code" value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, width: '100%', color: theme.inputText, fontFamily: theme.fontFamily }}
              />
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '10px 12px', fontSize: 11.5, color: theme.textSecondary }}>No matching country.</div>
              ) : filtered.map((c) => (
                <button
                  key={c.iso2} type="button"
                  onClick={() => { onCodeChange(c.code); setOpen(false); setQuery(''); }}
                  className="w-full flex items-center gap-2 text-left"
                  style={{
                    padding: '8px 12px', border: 'none', cursor: 'pointer', fontFamily: theme.fontFamily,
                    background: c.code === code ? 'rgba(0, 0, 255,0.1)' : 'transparent', color: theme.textPrimary, fontSize: 12.5,
                  }}
                >
                  <c.flag title={c.name} style={flagStyle} />
                  <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                  <span style={{ color: theme.textSecondary, flexShrink: 0 }}>{c.code}</span>
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
      </div>

      <span style={{ width: 1, height: 18, background: theme.inputBorder, flexShrink: 0 }} />
      <input
        type="tel" placeholder={placeholder} value={number} disabled={disabled} maxLength={10}
        onChange={(e) => onNumberChange(e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
        style={{ border: 'none', outline: 'none', background: 'transparent', padding: '9px 0', width: '100%', minWidth: 50, color: theme.inputText, fontSize: 12, fontFamily: theme.fontFamily }}
      />
      {onAdd && !disabled && (
        <button type="button" onClick={onAdd} title="Add another mobile number"
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{ width: 22, height: 22, background: theme.insetBg, border: `1px solid ${theme.inputBorder}`, color: '#0000FF', cursor: 'pointer' }}>
          <MdAdd size={14} />
        </button>
      )}
    </div>
  );
};

export default PhoneInput;
