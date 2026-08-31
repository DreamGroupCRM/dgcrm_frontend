// src/components/common/MasterListUI.tsx
// Shared presentational bits for every Master/Crud page's accordion,
// table, and form fields. getFormInputStyle/getFormLabelStyle/FormField
// were pulled out of LeadCrudView.tsx (where they were a local,
// Lead-only copy of the same input/label styling every other Crud page in
// this app also reinvents for itself) so a future page can import them
// directly instead of duplicating the pattern again — the exact
// "hardcoding into common place" ask this file exists to serve. Values
// are copied verbatim from LeadCrudView's original locals, so adopting
// them changes nothing about how Leads' own form already looked.

import React from 'react';
import { AppTheme } from '../../styles/theme';

export const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#4b5563', padding: 6, borderRadius: 6,
  display: 'inline-flex', alignItems: 'center',
};

export const getAccordionCardStyle = (t: AppTheme): React.CSSProperties => ({
  background: t.surfaceBg,
  border: `1px solid ${t.surfaceBorder}`,
  borderRadius: 12,
  overflow: 'hidden',
  marginBottom: 24,
});

export const getAccordionHeaderStyle = (t: AppTheme, isOpen: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 16px',
  flexWrap: 'wrap' as const,
  gap: 12,
  borderBottom: isOpen ? `1px solid ${t.divider}` : 'none',
});

// `fontSize` defaults to the original 10.5px so existing callers are
// unaffected — added when deduping RoleListPage.tsx's near-identical local
// `statusBadge`, whose only real difference was its 12.5px text.
export const StatusBadge: React.FC<{ isActive: boolean; t: AppTheme; isDark: boolean; fontSize?: number }> = ({ isActive, t: _t, isDark, fontSize = 10.5 }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 10px', borderRadius: 20, fontSize, fontWeight: 500,
    background: isActive
      ? isDark ? 'rgba(34,197,94,0.12)' : '#dcfce7'
      : isDark ? 'rgba(239,68,68,0.12)' : '#fee2e2',
    color: isActive
      ? isDark ? '#4ade80' : '#16a34a'
      : isDark ? '#f87171' : '#dc2626',
  }}>
    {isActive ? 'Active' : 'Inactive'}
  </span>
);

// ── Form fields — shared input/label styling for any Crud-style page ────
// Different pages currently use different exact padding/font-size/radius
// for their inputs (Department: 10px 14px @ 12.5px; Lead: 9px 12px @ 13px;
// etc.) — that's each page's existing, deliberate visual choice, not
// something to silently unify. `overrides` lets a page keep its own exact
// current numbers while still centralizing the actual pattern (the border/
// background/color construction from theme tokens, repeated identically
// across ~10 files before this) in one place. Omitting overrides keeps
// today's defaults (Lead's original values), so existing callers are
// unaffected.
export const getFormInputStyle = (t: AppTheme, overrides?: Partial<React.CSSProperties>): React.CSSProperties => ({
  width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
  background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText,
  ...overrides,
});

export const getFormLabelStyle = (t: AppTheme, overrides?: Partial<React.CSSProperties>): React.CSSProperties => ({
  display: 'block', fontSize: 11.5, fontWeight: 600, color: t.textSecondary, marginBottom: 4,
  ...overrides,
});

// `required`/`error` are optional so existing simple 3-prop callers (label/
// t/children) are unaffected — added when converting CompanyCrudPage.tsx,
// whose local `Field` already supported both, to this shared component.
// `errorStyle` similarly defaults to Company's 12.5px so it's a no-op for
// every caller that doesn't pass it — added for BankAccountCrudPage.tsx,
// whose original error text was 11.5px.
export const FormField: React.FC<{
  label: string; t: AppTheme; labelStyle?: React.CSSProperties;
  required?: boolean; error?: string; errorStyle?: React.CSSProperties; children: React.ReactNode;
}> = ({ label, t, labelStyle, required, error, errorStyle, children }) => (
  <div>
    <label style={labelStyle ?? getFormLabelStyle(t)}>
      {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
    </label>
    {children}
    {error && (
      <p style={errorStyle ?? { color: '#ef4444', fontSize: 12.5, marginTop: 4, fontFamily: t.fontFamily }}>
        {error}
      </p>
    )}
  </div>
);
