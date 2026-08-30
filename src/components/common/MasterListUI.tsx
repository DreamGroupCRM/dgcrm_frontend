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

export const StatusBadge: React.FC<{ isActive: boolean; t: AppTheme; isDark: boolean }> = ({ isActive, t: _t, isDark }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 500,
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
export const getFormInputStyle = (t: AppTheme): React.CSSProperties => ({
  width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
  background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText,
});

export const getFormLabelStyle = (t: AppTheme): React.CSSProperties => ({
  display: 'block', fontSize: 11.5, fontWeight: 600, color: t.textSecondary, marginBottom: 4,
});

export const FormField: React.FC<{ label: string; t: AppTheme; children: React.ReactNode }> = ({ label, t, children }) => (
  <div>
    <label style={getFormLabelStyle(t)}>{label}</label>
    {children}
  </div>
);
