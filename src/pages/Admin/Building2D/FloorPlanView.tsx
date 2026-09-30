// ==========================================
// DREAM GROUP CRM - 2D BUILDING VIEW: INTERACTIVE FLOOR PLAN
// ==========================================
// One wing, one floor at a time, drawn straight from the building the page
// already loaded (ViewBuilding → wings[] → floors[] → flats[]) — no second
// dataset, no generated layout: only floors and flats that exist in Building
// Master are shown, and a wing/floor with nothing configured shows an empty
// state instead.
//
// Everything here is display-only. Clicking a flat SELECTS it (the page shows
// its Unit Details); nothing in this view writes to the server or changes a
// flat's status — status comes from flatStatus(), the same rule the rest of
// the Building View uses.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MdAdd, MdRemove, MdCenterFocusStrong } from 'react-icons/md';
import { BuildingWing } from '../../../types/index';
import { AppTheme } from '../../../styles/theme';
import { UnitStatus } from './types';
import { STATUS_COLOR, STATUS_TEXT, STATUS_TEXT_COLOR, flatStatus } from './Building2DViewPage';

export interface PlanFlat {
  id: string;
  no: string;
  type: string | null;
  areaSqft: number | null;
  status: UnitStatus;
  bookedById: string | null;
  bookedByName: string | null;
  floorLabel: string;
}

// "Ground Floor" -> "G", "8th Floor" -> "8"; anything else keeps its label.
export const shortFloorLabel = (label: string): string => {
  if (/ground/i.test(label)) return 'G';
  const n = label.match(/\d+/);
  return n ? n[0] : label;
};

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.2;
const ZOOM_STEP = 0.2;

interface FloorPlanViewProps {
  t: AppTheme;
  wing: BuildingWing;
  floorId: string | null;
  onFloorChange: (floorId: string) => void;
  selectedFlatId: string | null;
  onSelectFlat: (flat: PlanFlat) => void;
}

const FloorPlanView: React.FC<FloorPlanViewProps> = ({ t, wing, floorId, onFloorChange, selectedFlatId, onSelectFlat }) => {
  // Top floor first, as a building reads.
  const floors = useMemo(() => [...wing.floors].sort((a, b) => b.sort_order - a.sort_order), [wing]);
  const floor = floors.find((f) => f.id === floorId) ?? null;

  const flats: PlanFlat[] = useMemo(() => (floor?.flats ?? []).map((f) => ({
    id: f.id, no: f.flat_no, type: f.flat_type || null, areaSqft: f.area_sqft, status: flatStatus(f),
    bookedById: f.booked_by_customer_id ?? null, bookedByName: f.booked_by_customer_name ?? null,
    floorLabel: floor?.label ?? '',
  })), [floor]);

  // Flats in their Building Master order, in balanced rows of up to 5
  // (4 flats → one row of 4, 8 → 2 × 4, 10 → 2 × 5).
  const rowsNeeded = Math.max(1, Math.ceil(flats.length / 5));
  const cols = Math.max(1, Math.ceil(flats.length / rowsNeeded));

  // ── Zoom / pan (transform only — nothing re-renders the plan) ──────────
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);
  // Reset = the whole floor fits the frame (never enlarged past 100%).
  const planRef = useRef<HTMLDivElement>(null);
  const fitZoom = () => {
    const frame = frameRef.current; const plan = planRef.current;
    if (!frame || !plan || !plan.offsetWidth) return 1;
    const z = Math.min(1, (frame.clientWidth - 24) / plan.offsetWidth, (frame.clientHeight - 64) / plan.offsetHeight);
    return Math.max(MIN_ZOOM, +z.toFixed(2));
  };
  const resetView = () => { setZoom(fitZoom()); setPan({ x: 0, y: 0 }); };
  // A new floor or wing starts from the fitted view.
  useEffect(() => { resetView(); }, [floorId, wing.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x; const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 5) return; // still a click, not a drag
    if (!d.moved) { d.moved = true; setDragging(true); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setHover(null); }
    setPan({ x: d.px + dx, y: d.py + dy });
  };
  const endDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved) {
      setDragging(false);
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* not captured */ }
    }
  };
  // A click that ended a drag must not select a flat.
  const wasDrag = useRef(false);
  const onPointerUpCapture = () => { wasDrag.current = !!drag.current?.moved; };

  // ── Hover tooltip (desktop); a tap on touch selects straight away ──────
  const frameRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ flat: PlanFlat; x: number; y: number } | null>(null);
  const showTip = (flat: PlanFlat, e: React.MouseEvent) => {
    if (dragging) return;
    const r = frameRef.current?.getBoundingClientRect();
    if (!r) return;
    // The app zooms <html> at desktop widths; convert to the frame's own units.
    const scale = r.width / (frameRef.current as HTMLElement).offsetWidth || 1;
    setHover({ flat, x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale });
  };

  if (floors.length === 0) {
    return (
      <div className="fp-empty" style={{ color: t.textSecondary }}>
        {wing.name} has no floors configured in Building Master yet.
      </div>
    );
  }

  return (
    <div className="fp-layout">
      {/* ── Floor selector: only the floors that exist, top floor first ── */}
      <div className="fp-floors" role="tablist" aria-label="Floors">
        {floors.map((f) => {
          const active = f.id === floorId;
          return (
            <button key={f.id} type="button" role="tab" aria-selected={active} title={f.label}
              onClick={() => onFloorChange(f.id)}
              className={`fp-floor-btn${active ? ' fp-floor-btn-active' : ''}`}
              style={active ? undefined : { background: t.surfaceBg, color: t.textPrimary, borderColor: t.surfaceBorder }}>
              {shortFloorLabel(f.label)}
            </button>
          );
        })}
      </div>

      {/* ── The plan ───────────────────────────────────────────────────── */}
      <div ref={frameRef} className={`fp-frame${dragging ? ' fp-frame-dragging' : ''}`}
        style={{ background: t.subtleBg, borderColor: t.surfaceBorder }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
        onPointerUpCapture={onPointerUpCapture}
        onMouseLeave={() => setHover(null)}>
        {!floor ? (
          <div className="fp-empty" style={{ color: t.textSecondary }}>Select a floor.</div>
        ) : (
          <div className="fp-stage" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
            {/* key on the floor → a short fade/slide when the floor changes */}
            <div key={floor.id} ref={planRef} className="fp-plan" style={{ borderColor: t.surfaceBorder, background: t.surfaceBg }}>
              <div className="fp-plan-title" style={{ color: t.textPrimary }}>{floor.label} — {wing.name}</div>
              {flats.length === 0 ? (
                <div className="fp-empty-inline" style={{ color: t.textSecondary }}>No flats configured on this floor in Building Master.</div>
              ) : (
                <div className="fp-grid" style={{ gridTemplateColumns: `repeat(${cols}, var(--fp-cell))` }}>
                  {flats.map((f) => {
                    const selected = f.id === selectedFlatId;
                    return (
                      <button key={f.id} type="button"
                        className={`fp-flat${selected ? ' fp-flat-selected' : ''}`}
                        aria-pressed={selected}
                        aria-label={`Flat ${f.no}, ${STATUS_TEXT[f.status]}`}
                        style={{ background: STATUS_COLOR[f.status], color: STATUS_TEXT_COLOR[f.status] }}
                        onMouseEnter={(e) => showTip(f, e)} onMouseMove={(e) => showTip(f, e)} onMouseLeave={() => setHover(null)}
                        onClick={() => { if (wasDrag.current) { wasDrag.current = false; return; } onSelectFlat(f); }}>
                        <span className="fp-flat-no">{f.no}</span>
                        <span className="fp-flat-status">{STATUS_TEXT[f.status]}</span>
                        {f.type && <span className="fp-flat-type">{f.type}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tooltip — outside the zoomed stage so it stays the same size. */}
        {hover && (
          <div className="fp-tip" style={{ left: hover.x + 14, top: hover.y + 14, background: t.surfaceBg, color: t.textPrimary, borderColor: t.surfaceBorder }}>
            <div className="fp-tip-head">
              Flat {hover.flat.no}
              <span className="fp-tip-status" style={{ background: STATUS_COLOR[hover.flat.status], color: STATUS_TEXT_COLOR[hover.flat.status] }}>
                {STATUS_TEXT[hover.flat.status]}
              </span>
            </div>
            <div className="fp-tip-row"><span>Unit Type</span><b>{hover.flat.type || '—'}</b></div>
            <div className="fp-tip-row"><span>Area</span><b>{hover.flat.areaSqft != null ? `${hover.flat.areaSqft.toLocaleString('en-IN')} sq.ft` : '—'}</b></div>
            <div className="fp-tip-row"><span>Price</span><b>—</b></div>
          </div>
        )}

        {/* Zoom / pan controls */}
        <div className="fp-controls" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" title="Zoom in" aria-label="Zoom in" disabled={zoom >= MAX_ZOOM}
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}
            style={{ background: t.surfaceBg, color: t.textPrimary, borderColor: t.surfaceBorder }}><MdAdd size={18} /></button>
          <button type="button" title="Zoom out" aria-label="Zoom out" disabled={zoom <= MIN_ZOOM}
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}
            style={{ background: t.surfaceBg, color: t.textPrimary, borderColor: t.surfaceBorder }}><MdRemove size={18} /></button>
          <button type="button" title="Reset view" aria-label="Reset view" onClick={resetView}
            style={{ background: t.surfaceBg, color: t.textPrimary, borderColor: t.surfaceBorder }}><MdCenterFocusStrong size={17} /></button>
          <span className="fp-zoom-level" style={{ color: t.textSecondary }}>{Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </div>
  );
};

export default FloorPlanView;
