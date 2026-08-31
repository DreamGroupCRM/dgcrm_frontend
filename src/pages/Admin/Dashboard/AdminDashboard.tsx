// ==========================================
// DREAM GROUP CRM - ADMIN DASHBOARD
// ==========================================
// Every number here comes from GET /api/dashboard/stats (dashboard.service.ts
// in dgcrm_backend) — this page used to render entirely hardcoded demo
// values (24 employees, 147 leads, fake "Recent Leads" rows, ...) with no
// API call at all; wired to the real, company-scoped data so it reflects
// whatever is actually in the database, including an empty one.
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { AppTheme } from '../../../styles/theme';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import { formatDate } from '../../../utils';
import { fetchDashboardSummary, DashboardSummary } from '../../../services/dashboardService';
import {
  MdPeople, MdLeaderboard, MdPayment, MdAttachMoney,
  MdHome, MdEventAvailable,
} from 'react-icons/md';

type Theme = AppTheme;

const rupeeCompact = (n: number): string => {
  const v = Math.round(n);
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `₹${v.toLocaleString('en-IN')}`;
};

interface CardDef { label: string; value: string; icon: React.ReactNode; color: string; caption?: string }

const statusMap: Record<string, { bg: string; text: string }> = {
  hot: { bg: '#fee2e2', text: '#b91c1c' },
  warm: { bg: '#fef9c3', text: '#92400e' },
  cold: { bg: '#dbeafe', text: '#1d4ed8' },
};

const AdminDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isDark, t, tintColor } = useAppearanceTokens();

  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { dispatch(setPageTitle('Dashboard')); }, [dispatch]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchDashboardSummary();
        setData(res);
      } catch {
        toast.error('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totals = data?.totals;
  // Real subtext only where a genuine second number exists — no fabricated
  // "+2 this month" style deltas (no history is tracked for these totals).
  const cards: CardDef[] = totals ? [
    { label: 'Total Employees', value: String(totals.employees), icon: <MdPeople />, color: tintColor('#3b82f6') },
    { label: 'Active Leads', value: String(totals.leads), icon: <MdLeaderboard />, color: tintColor('#22c55e'),
      caption: `${totals.hot_leads} hot` },
    { label: 'Payment Due', value: rupeeCompact(totals.payment_due), icon: <MdPayment />, color: tintColor('#ef4444'),
      caption: 'Outstanding across all customers' },
    { label: 'Payment Received', value: rupeeCompact(totals.payment_received), icon: <MdAttachMoney />, color: tintColor('#10b981'),
      caption: 'All-time total' },
    { label: 'Total Customers', value: String(totals.customers), icon: <MdHome />, color: tintColor('#8b5cf6') },
    { label: 'Today Attendance', value: `${totals.attendance_present_today}/${totals.attendance_total_active}`, icon: <MdEventAvailable />, color: tintColor('#f97316'),
      caption: totals.attendance_total_active > 0
        ? `${Math.round((totals.attendance_present_today / totals.attendance_total_active) * 100)}% present`
        : 'No active employees' },
  ] : [];

  return (
    <div className="space-y-6" style={{ fontFamily: t.fontFamily }}>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 stat-card-grid">
        {(loading ? Array.from({ length: 6 }) : cards).map((card, i) => (
          <div
            key={i}
            className="rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = t.hoverBorder)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = t.surfaceBorder)}
          >
            {loading || !card ? (
              <div className="animate-pulse" style={{ height: 84 }}>
                <div className="rounded-xl" style={{ width: 44, height: 44, background: t.insetBg, marginBottom: 16 }} />
                <div style={{ width: '50%', height: 20, background: t.insetBg, borderRadius: 6 }} />
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl" style={{ background: isDark ? t.insetBg : `${(card as CardDef).color}18` }}>
                    <span className="text-2xl" style={{ color: (card as CardDef).color }}>{(card as CardDef).icon}</span>
                  </div>
                </div>
                <p className="text-2xl font-bold" style={{ color: t.textPrimary, fontFamily: t.fontFamily }}>
                  {(card as CardDef).value}
                </p>
                <p className="text-sm mt-1" style={{ color: t.textSecondary }}>{(card as CardDef).label}</p>
                {(card as CardDef).caption && (
                  <p className="text-xs mt-1" style={{ color: t.textMuted }}>{(card as CardDef).caption}</p>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── Recent Leads ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <h2 className="font-semibold text-lg" style={{ color: t.textPrimary, fontFamily: t.fontFamily }}>
            Recent Leads
          </h2>
        </div>

        {loading ? (
          <div className="px-6 py-8 text-center" style={{ fontSize: 12.5, color: t.textMuted }}>Loading…</div>
        ) : !data || data.recent_leads.length === 0 ? (
          <div className="px-6 py-8 text-center" style={{ fontSize: 12.5, color: t.textMuted }}>No leads yet.</div>
        ) : (
          <div className="overflow-x-auto responsive-table">
            <table className="w-full">
              <thead>
                <tr style={{ background: t.tableHeaderBg }}>
                  {['#', 'Name', 'Mobile', 'Status', 'Date'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs uppercase font-semibold tracking-wider" style={{ color: t.textPrimary, fontFamily: t.fontFamily }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recent_leads.map((lead, i) => {
                  const statusKey = (lead.category || '').toLowerCase();
                  const status = statusMap[statusKey] ?? { bg: t.insetBg, text: t.textSecondary };
                  return (
                    <tr
                      key={lead.id}
                      className="transition-colors"
                      style={{ borderTop: `1px solid ${t.tableRowBorder}` }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = t.tableRowHover)}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                      <td className="px-6 py-3.5 text-sm" style={{ color: t.textPrimary }}>
                        {String(i + 1).padStart(2, '0')}
                      </td>
                      <td className="px-6 py-3.5 text-sm font-semibold" style={{ color: t.textPrimary, fontFamily: t.fontFamily }}>
                        {lead.name}
                      </td>
                      <td className="px-6 py-3.5 text-sm font-mono" style={{ color: t.textSecondary }}>
                        {lead.mobile_number || '—'}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: status.bg, color: status.text, textTransform: 'capitalize' }}>
                          {lead.category}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-sm" style={{ color: t.textSecondary }}>
                        {formatDate(lead.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
