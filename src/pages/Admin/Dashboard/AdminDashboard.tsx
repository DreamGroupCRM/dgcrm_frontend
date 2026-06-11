// ==========================================
// DREAM GROUP CRM - ADMIN DASHBOARD
// ==========================================
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import {
  MdPeople, MdLeaderboard, MdPayment, MdAttachMoney,
  MdTrendingUp, MdHome, MdEventAvailable,
} from 'react-icons/md';

interface StatCard {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  change: string;
  up: boolean;
}

const statCards: StatCard[] = [
  { label: 'Total Employees', value: '24', icon: <MdPeople />, color: 'text-blue-600', bg: 'bg-blue-50', change: '+2 this month', up: true },
  { label: 'Active Leads', value: '147', icon: <MdLeaderboard />, color: 'text-green-600', bg: 'bg-green-50', change: '+18 this week', up: true },
  { label: 'Payment Due', value: '₹12.4L', icon: <MdPayment />, color: 'text-red-600', bg: 'bg-red-50', change: '-3 cleared', up: false },
  { label: 'Payment Received', value: '₹84.2L', icon: <MdAttachMoney />, color: 'text-emerald-600', bg: 'bg-emerald-50', change: '+₹6.8L', up: true },
  { label: 'Total Customers', value: '312', icon: <MdHome />, color: 'text-purple-600', bg: 'bg-purple-50', change: '+7 new', up: true },
  { label: 'Today Attendance', value: '21/24', icon: <MdEventAvailable />, color: 'text-orange-600', bg: 'bg-orange-50', change: '87.5% present', up: true },
];

const recentLeads = [
  { name: 'Mohammad Rizwan', mobile: '9876543210', status: 'Hot', date: '08 Jun 2026' },
  { name: 'Fatima Khan', mobile: '9123456780', status: 'Warm', date: '07 Jun 2026' },
  { name: 'Ahmed Shaikh', mobile: '9000012345', status: 'Cold', date: '06 Jun 2026' },
  { name: 'Aisha Siddiqui', mobile: '8800011234', status: 'Hot', date: '05 Jun 2026' },
  { name: 'Ibrahim Malik', mobile: '7700023456', status: 'Warm', date: '04 Jun 2026' },
];

const statusColors: Record<string, string> = {
  Hot: 'bg-red-100 text-red-700',
  Warm: 'bg-yellow-100 text-yellow-700',
  Cold: 'bg-blue-100 text-blue-700',
};

const AdminDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { mode } = useAppSelector((s) => s.theme);
  const { user } = useAppSelector((s) => s.auth);
  const isDark = mode === 'dark';

  useEffect(() => {
    dispatch(setPageTitle('Dashboard'));
  }, [dispatch]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f2d1a 0%, #1a5c38 60%, #2d7a4f 100%)' }}
      >
        <div className="relative z-10">
          <p className="text-yellow-400 text-sm font-semibold mb-1">Welcome back 👋</p>
          <h1 className="font-display text-2xl font-bold text-white mb-2">
            {user?.email || 'Admin'}
          </h1>
          <p className="text-white/70 text-sm">Here's what's happening at Dream Group CRM today.</p>
        </div>
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -bottom-4 right-16 w-20 h-20 rounded-full bg-yellow-400/10" />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 stat-card-grid">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
              isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100 shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-700' : card.bg}`}>
                <span className={`text-2xl ${isDark ? 'text-gray-200' : card.color}`}>{card.icon}</span>
              </div>
              <span className={`text-xs font-medium flex items-center gap-1 ${card.up ? 'text-green-500' : 'text-red-500'}`}>
                <MdTrendingUp size={12} className={card.up ? '' : 'rotate-180'} />
              </span>
            </div>
            <p className={`text-2xl font-bold font-display ${isDark ? 'text-white' : 'text-gray-800'}`}>{card.value}</p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.label}</p>
            <p className={`text-xs mt-1 ${card.up ? 'text-green-500' : 'text-red-500'}`}>{card.change}</p>
          </div>
        ))}
      </div>

      {/* Recent Leads */}
      <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100 shadow-sm'}`}>
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className={`font-display font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Recent Leads
          </h2>
          <span className="text-xs text-green-600 font-semibold bg-green-50 px-2.5 py-1 rounded-full">
            Live
          </span>
        </div>
        <div className="overflow-x-auto responsive-table">
          <table className="w-full">
            <thead>
              <tr className={`text-xs uppercase font-semibold tracking-wider ${isDark ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                <th className="text-left px-6 py-3">#</th>
                <th className="text-left px-6 py-3">Name</th>
                <th className="text-left px-6 py-3">Mobile</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentLeads.map((lead, index) => (
                <tr
                  key={index}
                  className={`border-t transition-colors ${
                    isDark
                      ? 'border-gray-700 hover:bg-gray-700/50'
                      : 'border-gray-50 hover:bg-gray-50'
                  }`}
                >
                  <td className={`px-6 py-3.5 text-sm ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                    {String(index + 1).padStart(2, '0')}
                  </td>
                  <td className={`px-6 py-3.5 text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    {lead.name}
                  </td>
                  <td className={`px-6 py-3.5 text-sm font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {lead.mobile}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[lead.status]}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className={`px-6 py-3.5 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
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
