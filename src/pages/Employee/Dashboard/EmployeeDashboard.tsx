// ==========================================
// DREAM GROUP CRM - EMPLOYEE DASHBOARD
// ==========================================
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { MdLeaderboard, MdEventAvailable, MdPayment, MdContactPage, MdTrendingUp } from 'react-icons/md';

const EmployeeDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { mode } = useAppSelector((s) => s.theme);
  const { user } = useAppSelector((s) => s.auth);
  const isDark = mode === 'dark';

  useEffect(() => {
    dispatch(setPageTitle('Dashboard'));
  }, [dispatch]);

  const stats = [
    { label: 'My Leads', value: '28', icon: <MdLeaderboard />, color: 'text-green-600', bg: 'bg-green-50', change: '+3 this week' },
    { label: 'Attendance %', value: '92%', icon: <MdEventAvailable />, color: 'text-blue-600', bg: 'bg-blue-50', change: 'This month' },
    { label: 'Payments Due', value: '₹3.2L', icon: <MdPayment />, color: 'text-red-600', bg: 'bg-red-50', change: '5 customers' },
    { label: 'My Customers', value: '43', icon: <MdContactPage />, color: 'text-purple-600', bg: 'bg-purple-50', change: '+2 new' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)' }}
      >
        <div className="relative z-10">
          <p className="text-blue-300 text-sm font-semibold mb-1">Good day 👋</p>
          <h1 className="font-display text-2xl font-bold text-white mb-2">{user?.email?.split('@')[0] || 'Employee'}</h1>
          <p className="text-white/70 text-sm">Here's your activity summary for today.</p>
        </div>
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/5" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((card, index) => (
          <div
            key={index}
            className={`rounded-2xl p-5 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100 shadow-sm'}`}
          >
            <div className={`inline-flex p-2.5 rounded-xl mb-3 ${isDark ? 'bg-gray-700' : card.bg}`}>
              <span className={`text-xl ${isDark ? 'text-gray-200' : card.color}`}>{card.icon}</span>
            </div>
            <p className={`text-2xl font-bold font-display ${isDark ? 'text-white' : 'text-gray-800'}`}>{card.value}</p>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.label}</p>
            <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
              <MdTrendingUp size={12} /> {card.change}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className={`rounded-2xl p-6 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100 shadow-sm'}`}>
        <h2 className={`font-display font-semibold text-lg mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Add Lead', icon: <MdLeaderboard size={20} />, color: 'bg-green-500 hover:bg-green-600' },
            { label: 'Mark Attendance', icon: <MdEventAvailable size={20} />, color: 'bg-blue-500 hover:bg-blue-600' },
            { label: 'View Payments', icon: <MdPayment size={20} />, color: 'bg-red-500 hover:bg-red-600' },
            { label: 'Customers', icon: <MdContactPage size={20} />, color: 'bg-purple-500 hover:bg-purple-600' },
          ].map((action) => (
            <button
              key={action.label}
              className={`${action.color} text-white rounded-xl p-4 flex flex-col items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg`}
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
