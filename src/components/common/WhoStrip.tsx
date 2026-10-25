// ==========================================
// DGCRM — WHO IS LOGGED IN (every page)
// ==========================================
// V_26.0 — a slim strip above every page (not the dashboard, which has
// its own large band): who is logged in and, for an employee, their
// department · designation for this page, employee ID and team. Blue for a
// Head, purple for an Executive, the Admin's teal — same as the dashboard.
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks';
import { useAccessProfile } from '../../hooks/useAccessProfile';
import { pageRoleLabel } from '../../utils/pageRole';
import { ROUTES } from '../../constants';
import { resolveFileUrl, resolveThumbUrl } from '../../utils';

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

const WhoStrip: React.FC = () => {
  const { pathname } = useLocation();
  const { user, role } = useAppSelector((s) => s.auth);
  const { profile } = useAccessProfile();
  const pageTitle = useAppSelector((s) => s.ui.pageTitle);
  const [photoFailed, setPhotoFailed] = React.useState(false);
  if (pathname === ROUTES.ADMIN.DASHBOARD || pathname === ROUTES.EMPLOYEE.DASHBOARD) return null;

  const isAdmin = role === 'admin' || role === 'superadmin';
  const authName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  const name = (!isAdmin && profile?.me?.name) || authName || user?.email?.split('@')[0] || 'User';
  const roleText = isAdmin ? 'Admin · Company-wide view' : pageRoleLabel(profile, pathname);
  const headHere = !isAdmin && Boolean(roleText && profile?.departments.some((d) => d.level === 'head' && roleText.startsWith(`${d.department_name} ·`)));
  const teamIds = new Set([...(profile?.customer_team ?? []), ...(profile?.lead_team ?? [])].map((m) => m.id));
  const bg = isAdmin ? 'linear-gradient(90deg, #073b3b, #0a5c5c)' : headHere ? 'linear-gradient(90deg, #1d4ed8, #2563eb)' : 'linear-gradient(90deg, #6d28d9, #7c3aed)';
  const ink = isAdmin ? '#073b3b' : headHere ? '#1d4ed8' : '#6d28d9';
  const photo = !isAdmin && !photoFailed ? profile?.me?.photo_url : null;
  const chip: React.CSSProperties = { borderRadius: 999, padding: '2px 9px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.22)' };

  return (
    <div role="note" aria-label="Logged in as" className="flex items-center gap-2.5 flex-wrap"
      style={{ background: bg, color: '#fff', borderRadius: 12, padding: '7px 14px', marginBottom: 14, minHeight: 34 }}>
      {photo ? (
        <img src={resolveThumbUrl(photo)} alt="" onError={() => setPhotoFailed(true)} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', background: '#fff', flexShrink: 0 }} />
      ) : (
        <span className="flex items-center justify-center" style={{ width: 30, height: 30, borderRadius: '50%', background: '#fff', color: ink, fontWeight: 800, fontSize: 11.5, flexShrink: 0 }}>
          {initials(name)}
        </span>
      )}
      <b style={{ fontSize: 13 }}>{name}</b>
      {roleText && <span style={{ ...chip, background: '#fff', color: ink }}>{roleText}</span>}
      {!isAdmin && profile?.me?.employee_code && <span style={chip}>{profile.me.employee_code}</span>}
      {headHere && teamIds.size > 0 && <span style={chip}>Team of {teamIds.size}</span>}
      {pageTitle && <span className="hidden sm:inline" style={{ marginLeft: 'auto', fontSize: 11.5, opacity: 0.85 }}>{pageTitle}</span>}
    </div>
  );
};

export default WhoStrip;
