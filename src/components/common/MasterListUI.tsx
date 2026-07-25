// src/components/common/MasterListUI.tsx
// Shared presentational bits for every Master list page's accordion + table.

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
    padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
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
