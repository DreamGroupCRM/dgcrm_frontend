// ==========================================
// DREAM GROUP CRM - EMPLOYEE DASHBOARD
// ==========================================
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { getTheme } from '../../../styles/theme';
import { MdLeaderboard, MdEventAvailable, MdPayment, MdContactPage, MdTrendingUp } from 'react-icons/md';

const EmployeeDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { mode } = useAppSelector((s) => s.theme);
  const { user } = useAppSelector((s) => s.auth);
  const isDark   = mode === 'dark';
  const t        = getTheme(isDark);

  useEffect(() => { dispatch(setPageTitle('Dashboard')); }, [dispatch]);

  const stats = [
    { label: 'My Leads',      value: '28',    icon: <MdLeaderboard />,    color: '#22c55e', change: '+3 this week' },
    { label: 'Attendance %',  value: '92%',   icon: <MdEventAvailable />, color: '#3b82f6', change: 'This month'  },
    { label: 'Payments Due',  value: '₹3.2L', icon: <MdPayment />,        color: '#ef4444', change: '5 customers' },
    { label: 'My Customers',  value: '43',    icon: <MdContactPage />,    color: '#8b5cf6', change: '+2 new'       },
  ];

  const quickActions = [
    { label: 'Add Lead',        icon: <MdLeaderboard size={20} />,    color: '#2563eb' },
    { label: 'Mark Attendance', icon: <MdEventAvailable size={20} />, color: '#059669' },
    { label: 'View Payments',   icon: <MdPayment size={20} />,        color: '#dc2626' },
    { label: 'Customers',       icon: <MdContactPage size={20} />,    color: '#7c3aed' },
  ];

  return (
    <div className="space-y-6" style={{ fontFamily: t.fontFamily }}>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((card, i) => (
          <div
            key={i}
            className="rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            style={{
              background : t.surfaceBg,
              border     : `1px solid ${t.surfaceBorder}`,
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = t.hoverBorder)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = t.surfaceBorder)}
          >
            <div
              className="inline-flex p-2.5 rounded-xl mb-3"
              style={{ background: isDark ? t.insetBg : `${card.color}18` }}
            >
              <span className="text-xl" style={{ color: card.color }}>{card.icon}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: t.textPrimary, fontFamily: t.fontFamily }}>
              {card.value}
            </p>
            <p className="text-sm" style={{ color: t.textSecondary }}>{card.label}</p>
            <p className="text-xs mt-1 flex items-center gap-1 text-emerald-500">
              <MdTrendingUp size={12} /> {card.change}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div
        className="rounded-2xl p-6"
        style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}
      >
        <h2 className="font-semibold text-lg mb-4" style={{ color: t.textPrimary, fontFamily: t.fontFamily }}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className="rounded-xl p-4 flex flex-col items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg text-white"
              style={{
                background : action.color,
                border     : 'none',
                cursor     : 'pointer',
                fontFamily : t.fontFamily,
              }}
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
