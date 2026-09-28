// ==========================================
// DGCRM — SEARCHABLE SELECT (type to filter, click to pick)
// ==========================================
// Same field Payment Due's Customer Name uses: clicking it lists every
// option, typing narrows the list, the X inside the field clears it. The
// options panel is portaled to document.body (position:fixed) so a
// toolbar's overflow never clips it.
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdClose, MdKeyboardArrowDown } from 'react-icons/md';
import { AppTheme } from '../../styles/theme';
import { cssRect } from '../../utils/appZoom';

interface SearchableSelectProps {
  t: AppTheme;
  placeholder: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  /** Accessible name / tooltip for the X button. */
  clearLabel?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ t, placeholder, options, value, onChange, disabled, clearLabel = 'Clear' }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  const place = () => {
    const r = cssRect(ref.current);
    if (r) setMenuPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 220) });
  };
  const openDropdown = () => {
    if (disabled) return;
    place();
    setOpen(true);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (ref.current && !ref.current.contains(target) && !target.closest?.('[data-searchable-select-menu]')) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  // The picked value lists everything again, so the user can switch to
  // another option without first clearing the field.
  const q = options.includes(query) ? '' : query.toLowerCase();
  const filtered = options.filter((o) => o?.toLowerCase().includes(q));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className="flex items-center gap-1.5 px-2.5 rounded-xl"
        style={{ height: 38, background: disabled ? t.insetBg : t.inputBg, border: `1px solid ${t.inputBorder}`, cursor: disabled ? 'not-allowed' : 'text' }}
        onClick={openDropdown}>
        <input type="text" placeholder={placeholder} value={query} disabled={disabled}
          onFocus={openDropdown}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); openDropdown(); }}
          style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 12, width: '100%', minWidth: 0, padding: 0, height: 'auto' }} />
        {value && !disabled && (
          <button type="button" title={clearLabel} aria-label={clearLabel}
            onClick={(e) => { e.stopPropagation(); onChange(''); setQuery(''); setOpen(false); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 0, display: 'flex', flexShrink: 0 }}>
            <MdClose size={15} />
          </button>
        )}
        <MdKeyboardArrowDown size={16} style={{ color: t.textSecondary, flexShrink: 0 }} />
      </div>
      {open && !disabled && menuPos && createPortal(
        <div data-searchable-select-menu
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: menuPos.width, zIndex: 200, maxHeight: 260, overflowY: 'auto', background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '4px 0' }}>
          {filtered.length === 0 ? (
            <div className="px-3.5 py-2 text-sm" style={{ color: t.textSecondary, fontFamily: t.fontFamily }}>No match found</div>
          ) : filtered.slice(0, 100).map((opt) => (
            <button key={opt} type="button" onClick={() => { onChange(opt); setQuery(opt); setOpen(false); }}
              className="w-full text-left px-3.5 py-2 text-sm"
              style={{ background: opt === value ? t.insetBg : 'transparent', border: 'none', cursor: 'pointer', color: t.textPrimary, fontFamily: t.fontFamily, fontWeight: opt === value ? 700 : 400 }}>
              {opt}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

export default SearchableSelect;
