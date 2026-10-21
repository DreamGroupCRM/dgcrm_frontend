// ==========================================
// DREAM GROUP CRM - ADMIN DASHBOARD — "ADMIN CONSOLE" (V_26.0)
// ==========================================
// Company-wide monitoring for Admin / Super Admin: who is waiting on an
// Admin, this month's money, the Recovery team, the team by department,
// HR requests and shortcuts. Opens with the dark-teal Admin Console band
// (see components/dashboard/DashboardParts.tsx) so it is never confused
// with an employee's My Workspace. Data: GET /api/dashboard/stats.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '@/utils/toast';
import { useAppDispatch, useAppSelector } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import { fetchDashboardSummary, DashboardSummary } from '../../../services/dashboardService';
import { ROUTES } from '../../../constants';
import { formatDate } from '../../../utils';
import { serverToday } from '../../../utils/serverTime';
import {
  IdentityBand, KpiTile, Panel, Avatar, Empty, rupeeCompact, waitingFor,
} from '../../../components/dashboard/DashboardParts';
import './AdminDashboard.css';

const greeting = (): string => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const AdminDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t, isDark } = useAppearanceTokens();
  const { user, role } = useAppSelector((s) => s.auth);

  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { dispatch(setPageTitle('Dashboard')); }, [dispatch]);

  useEffect(() => {
    (async () => {
      try {
        setData(await fetchDashboardSummary());
      } catch {
        toast.error('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totals = data?.totals;
  const waiting = data?.approvals?.total ?? 0;
  const oldest = (data?.approvals?.queues ?? []).map((q) => q.oldest).filter(Boolean).sort()[0] ?? null;
  const today = serverToday().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ');
  const rowBg = isDark ? t.insetBg : '#f8fafc';
  const red = isDark ? '#fca5a5' : '#b42318';
  const amber = isDark ? '#fcd34d' : '#92400e';

  const kpis = [
    { label: 'Customers', value: String(totals?.customers ?? 0), to: ROUTES.ADMIN.CUSTOMER_DETAILS },
    { label: 'Employees', value: String(totals?.employees ?? 0), note: totals ? `${totals.attendance_present_today} present today` : undefined, to: ROUTES.ADMIN.EMPLOYEE_DETAILS },
    { label: 'Active leads', value: String(totals?.leads ?? 0), note: totals ? `${totals.hot_leads} hot` : undefined, noteColor: red, to: ROUTES.ADMIN.LEADS },
    { label: 'Received this month', value: rupeeCompact(data?.month?.received ?? 0), to: ROUTES.ADMIN.PAYMENT_RECEIVED },
    { label: 'Overdue', value: rupeeCompact(totals?.payment_due ?? 0), note: totals?.overdue_customers != null ? `${totals.overdue_customers} customers` : undefined, noteColor: red, to: ROUTES.ADMIN.PAYMENT_DUES },
    { label: 'Waiting for you', value: String(waiting), note: oldest ? `oldest ${waitingFor(oldest)}` : undefined, noteColor: amber, to: ROUTES.ADMIN.PENDING_APPROVALS },
  ];

  const shortcuts = [
    { label: 'Add customer', to: `${ROUTES.ADMIN.CUSTOMER_DETAILS}/add` },
    { label: 'Add employee', to: `${ROUTES.ADMIN.EMPLOYEE_DETAILS}/add` },
    { label: 'Payment Received', to: ROUTES.ADMIN.PAYMENT_RECEIVED },
    { label: 'Payment Dues', to: ROUTES.ADMIN.PAYMENT_DUES },
    { label: 'Assign task', to: ROUTES.ADMIN.TASKS },
    { label: 'Reports', to: ROUTES.ADMIN.EXECUTIVE_DASHBOARD },
  ];

  const bandButton: React.CSSProperties = { textDecoration: 'none', fontWeight: 700, fontSize: 13, padding: '11px 16px', borderRadius: 12, minHeight: 44, boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center' };

  return (
    <div className="admin-dash-page" style={{ fontFamily: t.fontFamily, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <IdentityBand
        kind="admin"
        eyebrow="ADMIN CONSOLE · DREAM GROUP CRM"
        title={`${greeting()}${name ? `, ${name}` : ''}`}
        subtitle={`${today} · Company-wide view · ${role === 'superadmin' ? 'Super Admin' : 'Admin'}`}
        right={
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Link to={ROUTES.ADMIN.PENDING_APPROVALS} style={{ ...bandButton, background: '#ffffff', color: '#073b3b' }}>
              {waiting > 0 ? `Review ${waiting} approval${waiting === 1 ? '' : 's'}` : 'No approvals waiting'}
            </Link>
            <Link to={ROUTES.ADMIN.TASKS} style={{ ...bandButton, color: '#ffffff', border: '1px solid #5fb3b3' }}>Assign task</Link>
          </div>
        }
      />

      <section aria-label="Key figures" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
        {kpis.map((k) => <KpiTile key={k.label} t={t} loading={loading} {...k} />)}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        <Panel t={t} title="Pending Admin Approval" action={{ label: 'Open queue', to: ROUTES.ADMIN.PENDING_APPROVALS }}>
          {loading ? <Empty t={t}>Loading…</Empty>
            : !data?.approvals?.queues.length ? <Empty t={t}>Nothing is waiting for an Admin.</Empty>
            : data.approvals.queues.map((q) => (
              <div key={q.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, background: rowBg }}>
                <span style={{ flex: '1 1 auto', fontSize: 13, fontWeight: 600, color: t.textPrimary }}>{q.label}</span>
                {q.oldest && <span style={{ fontSize: 11.5, color: t.textSecondary }}>oldest {waitingFor(q.oldest)}</span>}
                <span style={{ minWidth: 30, textAlign: 'center', fontSize: 13, fontWeight: 800, color: '#ffffff', background: '#0A7474', borderRadius: 10, padding: '3px 8px' }}>{q.count}</span>
              </div>
            ))}
        </Panel>

        <Panel t={t} title="Payments & Recovery — this month" action={{ label: 'Payment Received', to: ROUTES.ADMIN.PAYMENT_RECEIVED }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
            {[
              ['Received', rupeeCompact(data?.month?.received ?? 0), isDark ? '#5eead4' : '#0A7474'],
              ['Overdue', rupeeCompact(totals?.payment_due ?? 0), isDark ? '#fca5a5' : '#b42318'],
              ['Awaiting approval', rupeeCompact(data?.month?.awaiting_approval ?? 0), isDark ? '#fcd34d' : '#92400e'],
            ].map(([label, value, color]) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 11.5, color: t.textSecondary }}>{label}</span>
                <span style={{ fontSize: 19, fontWeight: 800, color }}>{loading ? '…' : value}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${t.divider}`, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: t.textSecondary }}>Recovery team — collected on their customers</span>
            {!loading && !data?.recovery_team?.length && <Empty t={t}>No Recovery department set up yet.</Empty>}
            {(data?.recovery_team ?? []).map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, color: t.textPrimary }}>
                <span>{r.name} <span style={{ color: t.textSecondary }}>· {r.designation ?? (r.level === 'head' ? 'Recovery Head' : 'Recovery')}</span></span>
                <span style={{ fontWeight: 700 }}>{rupeeCompact(r.collected)}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel t={t} title="Team by department" action={{ label: 'Employee Details', to: ROUTES.ADMIN.EMPLOYEE_DETAILS }}>
        <span style={{ fontSize: 12, color: t.textSecondary, marginTop: -4 }}>
          {totals ? `${totals.employees} active · ${totals.attendance_present_today} present today` : ''}
        </span>
        {!loading && !data?.departments?.length && <Empty t={t}>No departments set up yet.</Empty>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
          {(data?.departments ?? []).map((d) => (
            <div key={d.name} style={{ border: `1px solid ${t.surfaceBorder}`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: t.textPrimary }}>{d.name}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#5eead4' : '#0A7474', background: isDark ? '#0f2b2b' : '#e6f2f2', borderRadius: 20, padding: '2px 9px' }}>{d.count} {d.count === 1 ? 'person' : 'people'}</span>
              </div>
              {d.people.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <Avatar name={p.name} photo={p.photo_url} bg={p.level === 'head' ? '#0A7474' : '#2563eb'} />
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <span style={{ fontSize: 11.5, color: t.textSecondary }}>{p.designation ?? d.name}</span>
                  </div>
                </div>
              ))}
              {d.count > d.people.length && <span style={{ fontSize: 11.5, color: t.textSecondary }}>+{d.count - d.people.length} more</span>}
            </div>
          ))}
        </div>
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        <Panel t={t} title="HR approvals" action={{ label: 'Review', to: ROUTES.ADMIN.PENDING_APPROVALS }}>
          {!loading && !data?.hr_requests?.length && <Empty t={t}>No HR requests waiting.</Empty>}
          {(data?.hr_requests ?? []).map((h) => (
            <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, padding: '8px 0', borderTop: `1px solid ${t.divider}`, color: t.textPrimary }}>
              <span>{h.action === 'create' ? 'New employee' : 'Edit'} — {h.employee_name ?? 'employee'}</span>
              <span style={{ color: t.textSecondary, whiteSpace: 'nowrap' }}>{h.requested_by_name ?? ''} · {formatDate(h.requested_at)}</span>
            </div>
          ))}
        </Panel>
        <Panel t={t} title="Shortcuts">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            {shortcuts.map((s) => (
              <Link key={s.label} to={s.to} style={{ textDecoration: 'none', color: isDark ? '#99f6e4' : '#073b3b', background: isDark ? '#0f2b2b' : '#e6f2f2', borderRadius: 12, padding: 12, fontSize: 12.5, fontWeight: 700, textAlign: 'center', minHeight: 44, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {s.label}
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default AdminDashboard;
