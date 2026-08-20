// ==========================================
// DREAM GROUP CRM — GROUPED (TOTAL/ENABLED/DISABLED) SUMMARY CARD
// ==========================================
// One box showing 3 related counts together (Building list page's Flats
// and Shops boxes: Total, Enabled, Disabled) instead of 3 separate
// single-value StatCards. Same icon/label sizing as StatCard (compact
// variant) — only the body swaps a single value for a 3-up row.
import React from 'react';
import { IconType } from 'react-icons';

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
  label, icon: Icon, color, bg, total, enabled, disabled,
  surfaceBg, surfaceBorder, textPrimary, textSecondary, loading, labelFontSize,
}) => (
  <div
    className="master-stat-card master-stat-card-compact master-stat-card-multi"
    style={{ background: surfaceBg, border: `1px solid ${surfaceBorder}` }}
  >
    <div className="master-stat-icon" style={{ background: bg }}>
      <Icon size={15} style={{ color }} />
    </div>
    <div className="master-stat-body-multi">
      <div className="master-stat-label" style={{ color: textSecondary, ...(labelFontSize ? { fontSize: labelFontSize } : {}) }}>{label}</div>
      <div className="master-stat-multi-row">
        <div className="master-stat-multi-item">
          <span className="master-stat-multi-value" style={{ color: textPrimary }}>{loading ? '—' : total}</span>
          <span className="master-stat-multi-sublabel" style={{ color: textSecondary }}>Total</span>
        </div>
        <div className="master-stat-multi-item">
          <span className="master-stat-multi-value" style={{ color: '#16a34a' }}>{loading ? '—' : enabled}</span>
          <span className="master-stat-multi-sublabel" style={{ color: textSecondary }}>Enabled</span>
        </div>
        <div className="master-stat-multi-item">
          <span className="master-stat-multi-value" style={{ color: '#dc2626' }}>{loading ? '—' : disabled}</span>
          <span className="master-stat-multi-sublabel" style={{ color: textSecondary }}>Disabled</span>
        </div>
      </div>
    </div>
  </div>
);

export default MultiStatCard;
