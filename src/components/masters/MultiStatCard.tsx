// ==========================================
// DREAM GROUP CRM — GROUPED (TOTAL/ENABLED/DISABLED) SUMMARY CARD
// ==========================================
// One box showing 3 related counts together (Building list page's Flats
// and Shops boxes: Total, Enabled, Disabled) instead of 3 separate
// single-value StatCards. Same icon/label sizing as StatCard (compact
// variant) — only the body swaps a single value for a 3-up row.
//
// Gradient fill, matching StatCard's treatment — see that file's header.
import React from 'react';
import { IconType } from 'react-icons';
import { useAppearanceTokens } from '../../styles/appearanceTokens';
import { getStatGradient } from './statGradients';

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
  surfaceBorder, loading, labelFontSize,
}) => {
  const { tintGradient } = useAppearanceTokens();
  return (
  <div
    className="master-stat-card master-stat-card-compact master-stat-card-multi master-stat-card-gradient"
    style={{ background: getStatGradient(color, tintGradient), border: `1px solid ${surfaceBorder}` }}
  >
    <div className="master-stat-icon" style={{ background: 'rgba(255,255,255,0.22)' }}>
      <Icon size={15} style={{ color: '#fff' }} />
    </div>
    <div className="master-stat-body-multi">
      <div className="master-stat-label master-stat-label-gradient" style={labelFontSize ? { fontSize: labelFontSize } : undefined}>{label}</div>
      <div className="master-stat-multi-row">
        <div className="master-stat-multi-item">
          <span className="master-stat-multi-value" style={{ color: '#fff' }}>{loading ? '—' : total}</span>
          <span className="master-stat-multi-sublabel" style={{ color: 'rgba(255,255,255,0.85)' }}>Total</span>
        </div>
        <div className="master-stat-multi-item">
          <span className="master-stat-multi-value" style={{ color: '#86efac' }}>{loading ? '—' : enabled}</span>
          <span className="master-stat-multi-sublabel" style={{ color: 'rgba(255,255,255,0.85)' }}>Enabled</span>
        </div>
        <div className="master-stat-multi-item">
          <span className="master-stat-multi-value" style={{ color: '#fca5a5' }}>{loading ? '—' : disabled}</span>
          <span className="master-stat-multi-sublabel" style={{ color: 'rgba(255,255,255,0.85)' }}>Disabled</span>
        </div>
      </div>
    </div>
  </div>
  );
};

export default MultiStatCard;
