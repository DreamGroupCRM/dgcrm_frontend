// ==========================================
// DREAM GROUP CRM - 2D BUILDING VIEW: FLAT HOVER TOOLTIP
// ==========================================
// Shared by the building elevation and the floor plan. Portaled and
// position:fixed so it is never clipped by a pan/zoom frame; the pointer
// position is converted into the app's CSS pixels (the app zooms <html> at
// desktop widths — see utils/appZoom).
import React from 'react';
import { createPortal } from 'react-dom';
import { BuildingFlat } from '../../../types/index';
import { AppTheme } from '../../../styles/theme';
import { currentZoom } from '../../../utils/appZoom';
import { UnitStatus } from './types';
import { STATUS_COLOR, STATUS_TEXT, STATUS_TEXT_COLOR, flatStatus } from './Building2DViewPage';

/** One flat as the interactive views use it — straight from Building Master. */
export interface PlanFlat {
  id: string;
  no: string;
  type: string | null;
  areaSqft: number | null;
  status: UnitStatus;
  bookedById: string | null;
  bookedByName: string | null;
  floorId: string;
  floorLabel: string;
  wingId: string;
  wingName: string;
}

export const toPlanFlat = (f: BuildingFlat, floor: { id: string; label: string }, wing: { id: string; name: string }): PlanFlat => ({
  id: f.id, no: f.flat_no, type: f.flat_type || null, areaSqft: f.area_sqft, status: flatStatus(f),
  bookedById: f.booked_by_customer_id ?? null, bookedByName: f.booked_by_customer_name ?? null,
  floorId: floor.id, floorLabel: floor.label, wingId: wing.id, wingName: wing.name,
});

export interface HoverState { flat: PlanFlat; clientX: number; clientY: number }

const FlatTooltip: React.FC<{ t: AppTheme; hover: HoverState | null }> = ({ t, hover }) => {
  if (!hover) return null;
  const z = currentZoom() || 1;
  const { flat } = hover;
  return createPortal(
    <div className="bv-tip" style={{ left: hover.clientX / z + 14, top: hover.clientY / z + 14, background: t.surfaceBg, color: t.textPrimary, borderColor: t.surfaceBorder }}>
      <div className="bv-tip-head">
        Flat {flat.no}
        <span className="bv-tip-status" style={{ background: STATUS_COLOR[flat.status], color: STATUS_TEXT_COLOR[flat.status] }}>{STATUS_TEXT[flat.status]}</span>
      </div>
      <div className="bv-tip-row"><span>Wing / Floor</span><b>{flat.wingName} · {flat.floorLabel}</b></div>
      <div className="bv-tip-row"><span>Unit Type</span><b>{flat.type || '—'}</b></div>
      <div className="bv-tip-row"><span>Area</span><b>{flat.areaSqft != null ? `${flat.areaSqft.toLocaleString('en-IN')} sq.ft` : '—'}</b></div>
      <div className="bv-tip-row"><span>Price</span><b>—</b></div>
    </div>,
    document.body,
  );
};

export default FlatTooltip;
