// ==========================================
// DREAM GROUP CRM - ADMIN DASHBOARD
// ==========================================
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { getTheme } from '../../../styles/theme';
import {
  MdPeople, MdLeaderboard, MdPayment, MdAttachMoney,
  MdTrendingUp, MdHome, MdEventAvailable,
} from 'react-icons/md';

interface StatCard {
  label  : string;
  value  : string;
  icon   : React.ReactNode;
  color  : string;     // icon color
  change : string;
  up     : boolean;
}

const statCards: StatCard[] = [
  { label: 'Total Employees',   value: '24',     icon: <MdPeople />,        color: '#3b82f6', change: '+2 this month',  up: true  },
  { label: 'Active Leads',      value: '147',    icon: <MdLeaderboard />,   color: '#22c55e', change: '+18 this week', up: true  },
  { label: 'Payment Due',       value: '₹12.4L', icon: <MdPayment />,       color: '#ef4444', change: '-3 cleared',    up: false },
  { label: 'Payment Received',  value: '₹84.2L', icon: <MdAttachMoney />,   color: '#10b981', change: '+₹6.8L',        up: true  },
  { label: 'Total Customers',   value: '312',    icon: <MdHome />,          color: '#8b5cf6', change: '+7 new',         up: true  },
  { label: 'Today Attendance',  value: '21/24',  icon: <MdEventAvailable />, color: '#f97316', change: '87.5% present', up: true  },
];

const recentLeads = [
  { name: 'Mohammad Rizwan', mobile: '9876543210', status: 'Hot',  date: '08 Jun 2026' },
  { name: 'Fatima Khan',     mobile: '9123456780', status: 'Warm', date: '07 Jun 2026' },
  { name: 'Ahmed Shaikh',    mobile: '9000012345', status: 'Cold', date: '06 Jun 2026' },
  { name: 'Aisha Siddiqui', mobile: '8800011234', status: 'Hot',  date: '05 Jun 2026' },
  { name: 'Ibrahim Malik',  mobile: '7700023456', status: 'Warm', date: '04 Jun 2026' },
];

const statusMap: Record<string, { bg: string; text: string }> = {
  Hot : { bg: '#fee2e2', text: '#b91c1c' },
  Warm: { bg: '#fef9c3', text: '#92400e' },
  Cold: { bg: '#dbeafe', text: '#1d4ed8' },
};

const AdminDashboard: React.FC = () => {
  const dispatch     = useAppDispatch();
  const { mode }     = useAppSelector((s) => s.theme);
  const { user }     = useAppSelector((s) => s.auth);
  const isDark       = mode === 'dark';
  const t            = getTheme(isDark);

  useEffect(() => { dispatch(setPageTitle('Dashboard')); }, [dispatch]);

  return (
    <div className="space-y-6" style={{ fontFamily: t.fontFamily }}>

    {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 stat-card-grid">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            style={{
              background  : t.surfaceBg,
              border      : `1px solid ${t.surfaceBorder}`,
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = t.hoverBorder)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = t.surfaceBorder)}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="p-3 rounded-xl"
                style={{ background: isDark ? t.insetBg : `${card.color}18` }}
              >
                <span className="text-2xl" style={{ color: card.color }}>{card.icon}</span>
              </div>
              <span className={`text-xs font-medium flex items-center gap-1 ${card.up ? 'text-emerald-500' : 'text-red-500'}`}>
                <MdTrendingUp size={12} className={card.up ? '' : 'rotate-180'} />
              </span>
            </div>
            <p className="text-2xl font-bold" style={{ color: t.textPrimary, fontFamily: t.fontFamily }}>
              {card.value}
            </p>
            <p className="text-sm mt-1" style={{ color: t.textSecondary }}>{card.label}</p>
            <p className={`text-xs mt-1 ${card.up ? 'text-emerald-500' : 'text-red-500'}`}>
              {card.change}
            </p>
          </div>
        ))}
      </div>

      {/* ── Recent Leads ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}
      >
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${t.divider}` }}
        >
          <h2 className="font-semibold text-lg" style={{ color: t.textPrimary, fontFamily: t.fontFamily }}>
            Recent Leads
          </h2>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{
              background: isDark ? t.insetBg : '#dcfce7',
              color     : '#16a34a',
            }}
          >
            Live
          </span>
        </div>

        <div className="overflow-x-auto responsive-table">
          <table className="w-full">
            <thead>
              <tr style={{ background: t.tableHeaderBg }}>
                {['#', 'Name', 'Mobile', 'Status', 'Date'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-6 py-3 text-xs camelcase font-semibold tracking-wider"
                    style={{ color: t.textPrimary, fontFamily: t.fontFamily }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLeads.map((lead, i) => (
                <tr
                  key={i}
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
                    {lead.mobile}
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        background: statusMap[lead.status].bg,
                        color     : statusMap[lead.status].text,
                      }}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-sm" style={{ color: t.textSecondary }}>
                    {lead.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
