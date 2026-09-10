// ==========================================
// DREAM GROUP CRM — SHARED VALIDATION ERROR SUMMARY
// ==========================================
// One reusable "here's everything still wrong with this form" banner, used
// by every Create/Edit form in the app instead of each page inventing its
// own error list (or, as most pages did before, only ever surfacing the
// FIRST invalid field via a toast). Renders only once the caller says a
// submit was attempted, and only lists whatever is STILL invalid on the
// current render — a field that becomes valid disappears from this list on
// its own the next time the caller's own (already-reactive) validation
// re-runs; this component holds no error state of its own.
import React from 'react';
import { MdErrorOutline } from 'react-icons/md';

export interface ValidationErrorEntry {
  field: string;
  message: string;
}

interface PickerTheme {
  textPrimary: string;
  textSecondary: string;
  fontFamily: string;
}

interface ValidationErrorSummaryProps {
  t: PickerTheme;
  errors: ValidationErrorEntry[];
  // Clicking an error jumps to that field — same "reveal" behavior every
  // caller already has for its first-invalid-field case, just exposed per
  // row here instead of only for the first one.
  onErrorClick?: (field: string) => void;
  title?: string;
}

export const ValidationErrorSummary: React.FC<ValidationErrorSummaryProps> = ({
  t, errors, onErrorClick, title,
}) => {
  if (errors.length === 0) return null;
  const heading = title ?? `Please fix ${errors.length} field${errors.length === 1 ? '' : 's'} before continuing`;

  return (
    <div
      role="alert"
      style={{
        display: 'flex', gap: 10, padding: '12px 16px', marginBottom: 16,
        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)',
        borderLeft: '4px solid #ef4444', borderRadius: 10, fontFamily: t.fontFamily,
      }}
    >
      <MdErrorOutline size={19} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c', marginBottom: 6 }}>{heading}</div>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {errors.map((e) => (
            <li key={e.field}>
              {onErrorClick ? (
                <button
                  type="button"
                  onClick={() => onErrorClick(e.field)}
                  style={{
                    background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                    fontSize: 12.5, color: '#b91c1c', textAlign: 'left', textDecoration: 'underline',
                    textUnderlineOffset: 2, fontFamily: t.fontFamily,
                  }}
                >
                  {e.message}
                </button>
              ) : (
                <span style={{ fontSize: 12.5, color: '#b91c1c' }}>{e.message}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ValidationErrorSummary;
