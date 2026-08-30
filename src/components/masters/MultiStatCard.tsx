// ==========================================
// DREAM GROUP CRM — GROUPED (TOTAL/ENABLED/DISABLED) SUMMARY CARD
// ==========================================
// One box showing 3 related counts together (Building list page's Flats
// and Shops boxes: Total, Enabled, Disabled) instead of 3 separate
// single-value StatCards. Same icon/label sizing as StatCard (compact
// variant) — only the body swaps a single value for a 3-up row.
//
// Flat card, matching StatCard's treatment — see that file's header for
// why (restrained enterprise tile instead of a saturated gradient fill).
import React from 'react';
import { IconType } from 'react-icons';
import { useAppearanceTokens } from '../../styles/appearanceTokens';

interface MultiStatCardProps {
  label: string;
  icon: IconType;
  color: string;
  bg: string;
  total: number;
  enabled: number;
  disabled: number;
  surfaceBg: string;
  surfaceBorder: string;
  textPrimary: string;
  textSecondary: string;
  loading?: boolean;
  // Optional override for the label's font-size — same purpose as
  // StatCard's labelFontSize prop, undefined keeps the CSS class default.
  labelFontSize?: number;
}

const MultiStatCard: React.FC<MultiStatCardProps> = ({
  label, icon: Icon, color, total, enabled, disabled,
  surfaceBg, surfaceBorder, textPrimary, textSecondary, loading, labelFontSize,
}) => {
  const { tintColor, isDark } = useAppearanceTokens();
  const iconColor = tintColor(color);
  const successColor = isDark ? '#4ade80' : '#15803d';
  const dangerColor = isDark ? '#f87171' : '#b91c1c';
  return (
  <div
    className="master-stat-card master-stat-card-compact master-stat-card-multi"
    style={{ background: surfaceBg, border: `1px solid ${surfaceBorder}` }}
  >
    <div className="master-stat-icon" style={{ background: `${iconColor}17` }}>
      <Icon size={15} style={{ color: iconColor }} />
    </div>
    <div className="master-stat-body-multi">
      <div className="master-stat-label" style={{ color: textSecondary, ...(labelFontSize ? { fontSize: labelFontSize } : undefined) }}>{label}</div>
      <div className="master-stat-multi-row">
        <div className="master-stat-multi-item">
          <span className="master-stat-multi-value" style={{ color: textPrimary }}>{loading ? '—' : total}</span>
          <span className="master-stat-multi-sublabel" style={{ color: textSecondary }}>Total</span>
        </div>
        <div className="master-stat-multi-item">
          <span className="master-stat-multi-value" style={{ color: successColor }}>{loading ? '—' : enabled}</span>
          <span className="master-stat-multi-sublabel" style={{ color: textSecondary }}>Enabled</span>
        </div>
        <div className="master-stat-multi-item">
          <span className="master-stat-multi-value" style={{ color: dangerColor }}>{loading ? '—' : disabled}</span>
          <span className="master-stat-multi-sublabel" style={{ color: textSecondary }}>Disabled</span>
        </div>
      </div>
    </div>
  </div>
  );
};

export default MultiStatCard;
