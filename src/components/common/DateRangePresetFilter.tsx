// src/components/common/DateRangePresetFilter.tsx
// Shared Daily/Weekly/Monthly/Quarterly/Yearly/Custom date-range filter —
// extracted from ExecutiveDashboardPage.tsx's own inline preset logic (the
// only prior implementation of this pattern in the app) so Attendance and
// Leave history views can reuse the exact same chip-row UI/behavior
// without duplicating it. ExecutiveDashboardPage.tsx itself is left
// untouched — this is a new, independent component with the same visual
// language, not a refactor of already-working code.
import React from 'react';
import { MdCalendarToday } from 'react-icons/md';
import { AppTheme } from '../../styles/theme';

export type DateRangePreset = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

const PRESET_LABELS: Record<DateRangePreset, string> = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
  quarterly: 'Quarterly', yearly: 'Yearly', custom: 'Custom',
};
const PRESET_ORDER: DateRangePreset[] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'];

const iso = (d: Date): string => d.toISOString().slice(0, 10);

/** Resolves a preset (all but 'custom') to a concrete {from, to} ISO date-string range. */
export function computeDateRangePreset(preset: Exclude<DateRangePreset, 'custom'>): { from: string; to: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case 'daily':
      return { from: iso(today), to: iso(today) };
    case 'weekly': {
      const day = today.getDay(); // 0 = Sunday
      const start = new Date(today);
      start.setDate(today.getDate() - day);
      return { from: iso(start), to: iso(today) };
    }
    case 'monthly':
      return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today) };
    case 'quarterly': {
      const qStartMonth = Math.floor(today.getMonth() / 3) * 3;
      return { from: iso(new Date(today.getFullYear(), qStartMonth, 1)), to: iso(today) };
    }
    case 'yearly':
      return { from: iso(new Date(today.getFullYear(), 0, 1)), to: iso(today) };
  }
}

interface DateRangePresetFilterProps {
  t: AppTheme;
  preset: DateRangePreset;
  onPresetChange: (p: DateRangePreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
  accentColor?: string;
}

const DateRangePresetFilter: React.FC<DateRangePresetFilterProps> = ({
  t, preset, onPresetChange, customFrom, customTo, onCustomFromChange, onCustomToChange, accentColor = '#2563eb',
}) => (
  <div className="flex items-center flex-wrap gap-2">
    <div className="flex items-center gap-1.5 flex-wrap" style={{ marginRight: 8 }}>
      <MdCalendarToday size={14} style={{ color: t.textMuted }} />
      {PRESET_ORDER.map((k) => (
        <button key={k} type="button" onClick={() => onPresetChange(k)}
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
          style={{
            background: preset === k ? accentColor : t.insetBg,
            color: preset === k ? '#fff' : t.textSecondary,
            border: `1px solid ${preset === k ? accentColor : t.surfaceBorder}`, cursor: 'pointer',
          }}>
          {PRESET_LABELS[k]}
        </button>
      ))}
    </div>
    {preset === 'custom' && (
      <div className="flex items-center gap-1.5">
        <input type="date" value={customFrom} onChange={(e) => onCustomFromChange(e.target.value)}
          style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 9, padding: '6px 9px', fontSize: 12, outline: 'none' }} />
        <span style={{ color: t.textSecondary, fontSize: 12 }}>to</span>
        <input type="date" value={customTo} onChange={(e) => onCustomToChange(e.target.value)}
          style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 9, padding: '6px 9px', fontSize: 12, outline: 'none' }} />
      </div>
    )}
  </div>
);

export default DateRangePresetFilter;
