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
import { MdAdd, MdKeyboardArrowDown, MdSearch } from 'react-icons/md';
// Real SVG flags instead of Unicode flag emoji (🇮🇳 etc.) — those only
// render as a picture when the OS/browser ships a color-emoji font with
// flag glyphs. Windows (pre-2022 builds) and most Linux browsers don't, so
// they silently fall back to showing the raw two-letter region-indicator
// text ("IN") instead of a flag, which is what was actually happening
// everywhere this component is used. SVGs render identically on every
// platform since they don't depend on any installed font.
import { IN, US, GB, AU, AE, SG } from 'country-flag-icons/react/3x2';

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
  code: string;
  flag: FlagIcon;
  name: string;
}

// Same 6 countries both pages already supported — just carrying the name
// alongside the flag/code now, for the dropdown list only.
export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: '+91', flag: IN as FlagIcon, name: 'India' },
  { code: '+1', flag: US as FlagIcon, name: 'USA' },
  { code: '+44', flag: GB as FlagIcon, name: 'UK' },
  { code: '+61', flag: AU as FlagIcon, name: 'Australia' },
  { code: '+971', flag: AE as FlagIcon, name: 'UAE' },
  { code: '+65', flag: SG as FlagIcon, name: 'Singapore' },
];

const flagStyle: React.CSSProperties = { width: 18, height: 13, borderRadius: 2, flexShrink: 0, objectFit: 'cover' };

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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(''); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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
          type="button" disabled={disabled} onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5"
          style={{ background: 'transparent', border: 'none', padding: '9px 2px', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: theme.fontFamily, fontSize: 12, color: theme.inputText }}
        >
          <selected.flag title={selected.name} style={flagStyle} /> {selected.code} <MdKeyboardArrowDown size={13} style={{ color: theme.textSecondary }} />
        </button>

        {open && !disabled && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 30, width: 220,
            background: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}`, borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.16)', overflow: 'hidden',
          }}>
            <div className="flex items-center gap-1.5 px-2.5 py-2" style={{ borderBottom: `1px solid ${theme.surfaceBorder}` }}>
              <MdSearch size={14} style={{ color: theme.textSecondary, flexShrink: 0 }} />
              <input
                autoFocus type="text" placeholder="Search country" value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, width: '100%', color: theme.inputText, fontFamily: theme.fontFamily }}
              />
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '10px 12px', fontSize: 11.5, color: theme.textSecondary }}>No matching country.</div>
              ) : filtered.map((c) => (
                <button
                  key={c.code} type="button"
                  onClick={() => { onCodeChange(c.code); setOpen(false); setQuery(''); }}
                  className="w-full flex items-center gap-2 text-left"
                  style={{
                    padding: '8px 12px', border: 'none', cursor: 'pointer', fontFamily: theme.fontFamily,
                    background: c.code === code ? 'rgba(2,132,199,0.1)' : 'transparent', color: theme.textPrimary, fontSize: 12.5,
                  }}
                >
                  <c.flag title={c.name} style={flagStyle} />
                  <span style={{ flex: 1 }}>{c.name}</span>
                  <span style={{ color: theme.textSecondary }}>{c.code}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <span style={{ width: 1, height: 18, background: theme.inputBorder, flexShrink: 0 }} />
      <input
        type="tel" placeholder={placeholder} value={number} disabled={disabled}
        onChange={(e) => onNumberChange(e.target.value.replace(/[^\d]/g, ''))}
        style={{ border: 'none', outline: 'none', background: 'transparent', padding: '9px 0', width: '100%', minWidth: 50, color: theme.inputText, fontSize: 12, fontFamily: theme.fontFamily }}
      />
      {onAdd && !disabled && (
        <button type="button" onClick={onAdd} title="Add another mobile number"
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{ width: 22, height: 22, background: theme.insetBg, border: `1px solid ${theme.inputBorder}`, color: '#0284c7', cursor: 'pointer' }}>
          <MdAdd size={14} />
        </button>
      )}
    </div>
  );
};

export default PhoneInput;
