// ==========================================
// DREAM GROUP CRM — COMPACT SUMMARY STAT CARD
// ==========================================
// Shared list-page summary box — label on top, count below, same compact
// size everywhere (item 10). Structural sizing lives in master.css
// (.master-stat-card/.master-stat-icon/.master-stat-label/-value); only
// the per-card accent color/icon/value stay as props since those
// legitimately differ card to card.
//
// Saturated gradient fill (see statGradients.ts) with white icon/label/
// value text — the per-card color picks which gradient, tinted toward the
// active appearance's accent via tintGradient so the palette still reads
// as "on brand" for every Appearance choice.
import React from 'react';
import { IconType } from 'react-icons';
import { useAppearanceTokens } from '../../styles/appearanceTokens';
import { getStatGradient } from './statGradients';

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
  // Smaller icon/padding/font — used on Building's 7-card summary row so
  // all 7 fit on one row instead of the cards being oversized to fill 4
  // columns' worth of width (see master.css's .master-stat-card-compact).
  compact?: boolean;
  // Optional override for the label's font-size (e.g. Employee Details'
  // summary cards ask for 18px specifically) — undefined everywhere else,
  // so every other caller keeps the CSS class's default label size.
  labelFontSize?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  label, value, icon: Icon, color, surfaceBorder, loading, compact, labelFontSize,
}) => {
  const { tintGradient } = useAppearanceTokens();
  return (
  <div
    className={`master-stat-card master-stat-card-gradient${compact ? ' master-stat-card-compact' : ''}`}
    style={{ background: getStatGradient(color, tintGradient), border: `1px solid ${surfaceBorder}` }}
  >
    <div className="master-stat-icon" style={{ background: 'rgba(255,255,255,0.22)' }}>
      <Icon size={compact ? 15 : 19} style={{ color: '#fff' }} />
    </div>
    <div className="master-stat-body">
      <div className="master-stat-label master-stat-label-gradient" style={labelFontSize ? { fontSize: labelFontSize } : undefined}>{label}</div>
      <div className="master-stat-value master-stat-value-gradient">{loading ? '—' : value}</div>
    </div>
  </div>
  );
};

export default StatCard;
