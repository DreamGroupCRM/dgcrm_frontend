// ==========================================
// DREAM GROUP CRM — COMPACT SUMMARY STAT CARD
// ==========================================
// Shared list-page summary box — label on top, count below, same compact
// size everywhere (item 10). Structural sizing lives in master.css
// (.master-stat-card/.master-stat-icon/.master-stat-label/-value); only
// the per-card accent color/icon/value stay as props since those
// legitimately differ card to card.
import React from 'react';
import { IconType } from 'react-icons';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: IconType;
  color: string;
  bg: string;
  surfaceBg: string;
  surfaceBorder: string;
  textPrimary: string;
  textSecondary: string;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  label, value, icon: Icon, color, bg, surfaceBg, surfaceBorder, textPrimary, textSecondary, loading,
}) => (
  <div className="master-stat-card" style={{ background: surfaceBg, border: `1px solid ${surfaceBorder}` }}>
    <div className="master-stat-icon" style={{ background: bg }}>
      <Icon size={19} style={{ color }} />
    </div>
    <div className="master-stat-body">
      <div className="master-stat-label" style={{ color: textSecondary }}>{label}</div>
      <div className="master-stat-value" style={{ color: textPrimary }}>{loading ? '—' : value}</div>
    </div>
  </div>
);

export default StatCard;
