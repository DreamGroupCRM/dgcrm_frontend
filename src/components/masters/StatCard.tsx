// ==========================================
// DREAM GROUP CRM — COMPACT SUMMARY STAT CARD
// ==========================================
// Shared list-page summary box — label on top, count below, same compact
// size everywhere (item 10). Structural sizing lives in master.css
// (.master-stat-card/.master-stat-icon/.master-stat-label/-value); only
// the per-card accent color/icon/value stay as props since those
// legitimately differ card to card.
//
// Flat card (surfaceBg + border), a small tinted icon chip, and dark
// value/label text — not a saturated gradient fill with white text. Reads
// as a restrained enterprise KPI tile instead of a bright marketing card;
// the per-card color still carries meaning (people=blue, danger=red, ...)
// via the icon chip alone, which is enough to differentiate without the
// whole tile competing for attention.
import React from 'react';
import { IconType } from 'react-icons';
import { useAppearanceTokens } from '../../styles/appearanceTokens';

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
  label, value, icon: Icon, color, surfaceBg, surfaceBorder, textPrimary, textSecondary, loading, compact, labelFontSize,
}) => {
  const { tintColor } = useAppearanceTokens();
  const iconColor = tintColor(color);
  return (
  <div
    className={`master-stat-card${compact ? ' master-stat-card-compact' : ''}`}
    style={{ background: surfaceBg, border: `1px solid ${surfaceBorder}` }}
  >
    <div className="master-stat-icon" style={{ background: `${iconColor}17` }}>
      <Icon size={compact ? 15 : 19} style={{ color: iconColor }} />
    </div>
    <div className="master-stat-body">
      <div className="master-stat-label" style={{ color: textSecondary, ...(labelFontSize ? { fontSize: labelFontSize } : undefined) }}>{label}</div>
      <div className="master-stat-value" style={{ color: textPrimary }}>{loading ? '—' : value}</div>
    </div>
  </div>
  );
};

export default StatCard;
