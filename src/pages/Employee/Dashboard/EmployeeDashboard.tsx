// ==========================================
// DREAM GROUP CRM - EMPLOYEE DASHBOARD
// ==========================================
// Every number here comes from GET /api/dashboard/employee-stats, scoped
// server-side to the logged-in employee's OWN assignments (their leads,
// their customers, their attendance) — this used to be hardcoded demo
// values identical for every employee regardless of who logged in.
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { getTheme } from '../../../styles/theme';
import { fetchEmployeeDashboardSummary, EmployeeDashboardSummary } from '../../../services/dashboardService';
import { MdLeaderboard, MdEventAvailable, MdPayment, MdContactPage } from 'react-icons/md';

const rupeeCompact = (n: number): string => {
  const v = Math.round(n);
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `₹${v.toLocaleString('en-IN')}`;
};

interface CardDef { label: string; value: string; icon: React.ReactNode; color: string; caption: string }

const quickActions = [
  { label: 'Add Lead', icon: <MdLeaderboard size={20} />, color: '#2563eb' },
  { label: 'Mark Attendance', icon: <MdEventAvailable size={20} />, color: '#059669' },
  { label: 'View Payments', icon: <MdPayment size={20} />, color: '#dc2626' },
  { label: 'Customers', icon: <MdContactPage size={20} />, color: '#7c3aed' },
];

const EmployeeDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { mode } = useAppSelector((s) => s.theme);
  const isDark = mode === 'dark';
  const t = getTheme(isDark);

  const [data, setData] = useState<EmployeeDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { dispatch(setPageTitle('Dashboard')); }, [dispatch]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchEmployeeDashboardSummary();
        setData(res);
      } catch {
        setError('No employee record is linked to this login yet.');
        toast.error('Failed to load your dashboard.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards: CardDef[] = data ? [
    { label: 'My Leads', value: String(data.my_leads), icon: <MdLeaderboard />, color: '#22c55e', caption: 'Assigned to you' },
    {
      label: 'Attendance %',
      value: data.attendance.percent === null ? '—' : `${data.attendance.percent}%`,
      icon: <MdEventAvailable />, color: '#3b82f6',
      caption: data.attendance.percent === null ? 'No attendance recorded this month' : `${data.attendance.present_days}/${data.attendance.marked_days} days this month`,
    },
    { label: 'Payments Due', value: rupeeCompact(data.payments_due), icon: <MdPayment />, color: '#ef4444',
      caption: `${data.payments_due_customer_count} of your customers` },
    { label: 'My Customers', value: String(data.my_customers), icon: <MdContactPage />, color: '#8b5cf6', caption: 'Assigned to you' },
  ] : [];

  return (
    <div className="space-y-6" style={{ fontFamily: t.fontFamily }}>

      {error && (
        <div className="rounded-xl px-4 py-3" style={{ background: isDark ? 'rgba(220,38,38,0.12)' : '#fef2f2', color: '#b91c1c', fontSize: 12.5 }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {(loading ? Array.from({ length: 4 }) : cards).map((card, i) => (
          <div
            key={i}
            className="rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = t.hoverBorder)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = t.surfaceBorder)}
          >
            {loading || !card ? (
              <div className="animate-pulse" style={{ height: 78 }}>
                <div className="rounded-xl" style={{ width: 40, height: 40, background: t.insetBg, marginBottom: 12 }} />
                <div style={{ width: '50%', height: 18, background: t.insetBg, borderRadius: 6 }} />
              </div>
            ) : (
              <>
                <div className="inline-flex p-2.5 rounded-xl mb-3" style={{ background: isDark ? t.insetBg : `${(card as CardDef).color}18` }}>
                  <span className="text-xl" style={{ color: (card as CardDef).color }}>{(card as CardDef).icon}</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: t.textPrimary, fontFamily: t.fontFamily }}>
                  {(card as CardDef).value}
                </p>
                <p className="text-sm" style={{ color: t.textSecondary }}>{(card as CardDef).label}</p>
                <p className="text-xs mt-1" style={{ color: t.textMuted }}>{(card as CardDef).caption}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <h2 className="font-semibold text-lg mb-4" style={{ color: t.textPrimary, fontFamily: t.fontFamily }}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className="rounded-xl p-4 flex flex-col items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg text-white"
              style={{ background: action.color, border: 'none', cursor: 'pointer', fontFamily: t.fontFamily }}
            >
              {action.icon}
              <span className="text-xs font-semibold text-center">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
