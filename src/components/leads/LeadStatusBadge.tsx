// src/components/leads/LeadStatusBadge.tsx
// Small colored pill for a lead's pipeline status — reused on the List
// table and the Crud/View page header.
import React from 'react';
import { LeadStatus, LEAD_STATUS_LABELS } from '../../types/index';

// Grouped by rough "temperature" of the pipeline stage, not the lead's own
// category field (which tracks hot/warm/cold separately) — purely a visual
// cue for where a lead sits in the funnel.
const STATUS_COLORS: Record<LeadStatus, { bg: string; bgDark: string; fg: string; fgDark: string }> = {
  new:                   { bg: '#e0e7ff', bgDark: 'rgba(99,102,241,0.18)',  fg: '#4338ca', fgDark: '#a5b4fc' },
  follow_up:             { bg: '#dbeafe', bgDark: 'rgba(59,130,246,0.18)',  fg: '#1d4ed8', fgDark: '#93c5fd' },
  call_back:             { bg: '#e0f2fe', bgDark: 'rgba(14,165,233,0.18)',  fg: '#0369a1', fgDark: '#7dd3fc' },
  ringing:               { bg: '#fef9c3', bgDark: 'rgba(234,179,8,0.18)',   fg: '#a16207', fgDark: '#fde047' },
  switched_off:          { bg: '#f3f4f6', bgDark: 'rgba(148,163,184,0.18)', fg: '#4b5563', fgDark: '#cbd5e1' },
  wrong_number:          { bg: '#fee2e2', bgDark: 'rgba(239,68,68,0.18)',   fg: '#b91c1c', fgDark: '#fca5a5' },
  not_interested:        { bg: '#fee2e2', bgDark: 'rgba(239,68,68,0.18)',   fg: '#b91c1c', fgDark: '#fca5a5' },
  site_visit_scheduled:  { bg: '#fef3c7', bgDark: 'rgba(245,158,11,0.18)',  fg: '#b45309', fgDark: '#fcd34d' },
  visited:               { bg: '#ede9fe', bgDark: 'rgba(139,92,246,0.18)',  fg: '#6d28d9', fgDark: '#c4b5fd' },
  not_booked:            { bg: '#f3f4f6', bgDark: 'rgba(148,163,184,0.18)', fg: '#4b5563', fgDark: '#cbd5e1' },
  booked:                { bg: '#dcfce7', bgDark: 'rgba(34,197,94,0.18)',   fg: '#15803d', fgDark: '#86efac' },
  cancelled:             { bg: '#f3f4f6', bgDark: 'rgba(148,163,184,0.18)', fg: '#6b7280', fgDark: '#94a3b8' },
};

const LeadStatusBadge: React.FC<{ status: LeadStatus; isDark: boolean }> = ({ status, isDark }) => {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.new;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap',
      padding: '2px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 600,
      background: isDark ? c.bgDark : c.bg,
      color: isDark ? c.fgDark : c.fg,
    }}>
      {LEAD_STATUS_LABELS[status] ?? status}
    </span>
  );
};

export default LeadStatusBadge;
