// ==========================================
// DGCRM — DASHBOARD BUILDING BLOCKS (V_26.0)
// ==========================================
// Shared by the Admin Console and My Workspace (Head / Executive)
// dashboards. Each dashboard opens with an IdentityBand in its own colour
// so it is always clear whose screen it is: dark teal = Admin Console,
// blue = Head, purple = Executive. Everything else follows the app theme
// (light / dark) through the appearance tokens.
import React from 'react';
import { Link } from 'react-router-dom';
import { AppTheme } from '../../styles/theme';
import { resolveFileUrl, resolveThumbUrl } from '../../utils';

export const BAND = {
  admin: { bg: '#073b3b', label: '#9fd8d8', sub: '#cfeaea', chip: '#0f5555', strong: '#073b3b' },
  head: { bg: '#1d4ed8', label: '#c7d7ff', sub: '#dbe5ff', chip: '#3b63e6', strong: '#1d4ed8' },
  executive: { bg: '#6d28d9', label: '#e4d8ff', sub: '#ece4ff', chip: '#8146e3', strong: '#6d28d9' },
} as const;
export type BandKind = keyof typeof BAND;

export const rupeeCompact = (n: number): string => {
  const v = Math.round(n || 0);
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `₹${v.toLocaleString('en-IN')}`;
};

/** "today", "1 day", "3 days" — how long a request has been waiting. */
export const waitingFor = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return days <= 0 ? 'today' : days === 1 ? '1 day' : `${days} days`;
};

/** "1 customer" / "3 customers". */
export const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

export const initialsOf = (name: string): string =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '—';

export const Avatar: React.FC<{ name: string; photo?: string | null; size?: number; bg?: string; fg?: string }> = ({ name, photo, size = 34, bg = '#0A7474', fg = '#ffffff' }) => (
  photo
    ? <img src={resolveThumbUrl(photo)} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flex: '0 0 auto' }} />
    : <span aria-hidden style={{ width: size, height: size, borderRadius: '50%', background: bg, color: fg, fontSize: Math.round(size * 0.36), fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>{initialsOf(name)}</span>
);

/** The coloured header that says whose screen this is. */
export const IdentityBand: React.FC<{ kind: BandKind; eyebrow: string; title: string; subtitle?: React.ReactNode; leading?: React.ReactNode; chips?: string[]; right?: React.ReactNode }> = ({ kind, eyebrow, title, subtitle, leading, chips, right }) => {
  const c = BAND[kind];
  return (
    <section aria-label="Whose screen" className="rounded-2xl" style={{ background: c.bg, color: '#ffffff', padding: '20px 24px', display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
        {leading}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: c.label }}>{eyebrow}</span>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, lineHeight: 1.2 }}>{title}</h1>
          {subtitle && <span style={{ fontSize: 13, color: c.sub }}>{subtitle}</span>}
          {chips && chips.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {chips.map((ch, i) => (
                <span key={ch} style={{ fontSize: 11.5, fontWeight: i === 0 ? 700 : 600, background: i === 0 ? '#ffffff' : c.chip, color: i === 0 ? c.strong : '#ffffff', borderRadius: 20, padding: '3px 10px' }}>{ch}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      {right}
    </section>
  );
};

export const KpiTile: React.FC<{ t: AppTheme; label: string; value: string; note?: string; noteColor?: string; to?: string; loading?: boolean }> = ({ t, label, value, note, noteColor, to, loading }) => {
  const body = (
    <>
      <span style={{ fontSize: 12, color: t.textSecondary, fontWeight: 600 }}>{label}</span>
      {loading
        ? <span className="animate-pulse" style={{ display: 'block', width: '50%', height: 26, background: t.insetBg, borderRadius: 6 }} />
        : <span style={{ fontSize: 24, fontWeight: 800, color: t.textPrimary }}>{value}</span>}
      {note && !loading && <span style={{ fontSize: 11.5, color: noteColor ?? t.textMuted }}>{note}</span>}
    </>
  );
  const style: React.CSSProperties = { background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 16, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 4, textDecoration: 'none', color: 'inherit' };
  return to ? <Link to={to} style={style}>{body}</Link> : <div style={style}>{body}</div>;
};

export const Panel: React.FC<{ t: AppTheme; title: React.ReactNode; action?: { label: string; to: string }; children: React.ReactNode }> = ({ t, title, action, children }) => (
  <section style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: t.textPrimary }}>{title}</h2>
      {action && <Link to={action.to} style={{ fontSize: 12, fontWeight: 600, color: t.accentText }}>{action.label}</Link>}
    </div>
    {children}
  </section>
);

export const Empty: React.FC<{ t: AppTheme; children: React.ReactNode }> = ({ t, children }) => (
  <div style={{ fontSize: 12.5, color: t.textMuted, padding: '8px 0' }}>{children}</div>
);

export const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, [string, string, string]> = {
    pending: ['#fef3c7', '#92400e', 'Pending'], in_progress: ['#dbeafe', '#1e40af', 'In Progress'],
    approved: ['#dcfce7', '#166534', 'Approved'], rejected: ['#fee2e2', '#991b1b', 'Rejected'], completed: ['#dcfce7', '#166534', 'Completed'],
  };
  const [bg, fg, label] = map[status] ?? ['#e2e8f0', '#334155', status];
  return <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 9px', background: bg, color: fg, whiteSpace: 'nowrap' }}>{label}</span>;
};

export const QuickAction: React.FC<{ t: AppTheme; label: string; to: string; tint: string; tintBg: string; icon: React.ReactNode }> = ({ t, label, to, tint, tintBg, icon }) => (
  <Link to={to} style={{ textDecoration: 'none', background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, boxSizing: 'border-box', color: t.textPrimary, fontWeight: 700, fontSize: 13 }}>
    <span aria-hidden style={{ width: 30, height: 30, borderRadius: 9, background: tintBg, color: tint, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>{icon}</span>
    {label}
  </Link>
);
