// src/components/leads/LeadStatusBadge.tsx
// Small colored pill for a lead's pipeline status — reused on the List
// table and the Crud/View page header.
//
// Phase 4 pilot: colors no longer live here as literals — each status maps
// to a semantic "family" (LEAD_STATUS_FAMILY) and the active appearance
// resolves that family to actual colors (useAppearanceTokens(), in
// src/styles/appearanceTokens.ts). Selecting "Existing / Current"
// reproduces the exact same 12 status colors this file used to hardcode.
import React from 'react';
import { LeadStatus, LEAD_STATUS_LABELS } from '../../types/index';
import { LEAD_STATUS_FAMILY, useAppearanceTokens } from '../../styles/appearanceTokens';

const LeadStatusBadge: React.FC<{ status: LeadStatus; isDark: boolean }> = ({ status }) => {
  const { family } = useAppearanceTokens();
  const c = family(LEAD_STATUS_FAMILY[status] ?? 'accentInfo');
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap',
      padding: '2px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 600,
      background: c.bg, color: c.fg,
    }}>
      {LEAD_STATUS_LABELS[status] ?? status}
    </span>
  );
};

export default LeadStatusBadge;
