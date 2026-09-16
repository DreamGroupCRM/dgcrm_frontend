// ==========================================
// DREAM GROUP CRM - 2D BUILDING VIEW (POPUP)
// ==========================================
// The read-only "view a building's structure" experience, opened as a large
// in-page popup instead of navigating to Building2DViewPage's full route —
// triggered from Building Master's row "View 2D Structure" icon (see
// BuildingListPage.tsx), preselected to that row's building. Reuses every
// building block (status colors, UnitBlock, WingColumn, floorsOf) straight
// from Building2DViewPage.tsx so the picture itself stays pixel-identical
// to the full-page version and the two never drift apart.
//
// Customer Create's "Select Flat" picker flow is NOT this component — it
// stays on Building2DViewPage's full-page route (navigate + location.state
// hand-off), since it's a genuine multi-step flow (pick a unit, confirm,
// return to the form with the selection) rather than a plain "look at the
// building" popup.
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { MdClose } from 'react-icons/md';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import { FetchBuildingList, ViewBuilding } from '../../../services/buildingService';
import { Building } from '../../../types/index';
import { UnitStatus } from './types';
import {
  STATUS_COLOR, STATUS_TEXT, UnitBlock, WingColumn, floorsOf, shopStatus,
} from './Building2DViewPage';
import './Building2D.css';

interface Building2DViewModalProps {
  initialBuildingId: string;
  onClose: () => void;
}

const Building2DViewModal: React.FC<Building2DViewModalProps> = ({ initialBuildingId, onClose }) => {
  const { t } = useAppearanceTokens();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(true);
  const [selectedBuildingId, setSelectedBuildingId] = useState(initialBuildingId);
  const [buildingDetail, setBuildingDetail] = useState<Building | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await FetchBuildingList(1, 1000);
        if (res.success) setBuildings(res.rows ?? []);
      } catch { /* dropdown just stays empty if this fails */ }
      finally { setLoadingBuildings(false); }
    })();
  }, []);

  useEffect(() => {
    if (!selectedBuildingId) { setBuildingDetail(null); return; }
    let cancelled = false;
    setLoadingDetail(true);
    (async () => {
      try {
        const res = await ViewBuilding(selectedBuildingId);
        if (!cancelled && res.success) setBuildingDetail(res.data);
      } catch { toast.error('Failed to load this building’s structure.'); }
      finally { if (!cancelled) setLoadingDetail(false); }
    })();
    return () => { cancelled = true; };
  }, [selectedBuildingId]);

  // Close on Escape — a large popup like this should behave like a real
  // dialog, not trap the user with only the X icon as an exit.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const wings = buildingDetail?.wings ?? [];
  const shops = buildingDetail?.shops ?? [];

  // Heading name comes from the buildings list (available the instant a
  // building is picked) rather than buildingDetail (which only resolves
  // once its own fetch finishes) — so the heading never lags a beat behind
  // the dropdown selection.
  const selectedBuildingName = buildings.find((b) => b.id === selectedBuildingId)?.building_name || '';

  return createPortal(
    <div
      className="building-2d-modal-backdrop fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="building-2d-modal-card rounded-2xl w-full flex flex-col"
        style={{ maxWidth: 1180, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, fontFamily: t.fontFamily }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header — Heading top-left, building switcher centered, Cancel
            icon top-right with the color legend stacked vertically directly
            underneath it (per explicit design spec: no Back button anywhere
            in this popup, X is the only way to leave besides Escape/
            backdrop-click). ──────────────────────────────────────────── */}
        <div className="building-2d-modal-header grid items-start gap-3" style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${t.divider}` }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: t.textPrimary, margin: 0, lineHeight: 1.25, wordBreak: 'break-word' }}>
              {selectedBuildingName ? `${selectedBuildingName} 2D View` : 'Building 2D View'}
            </h2>
            <p style={{ fontSize: 11.5, color: t.textSecondary, margin: '3px 0 0' }}>
              Every flat and shop's live availability, straight from Building Master.
            </p>
          </div>

          <div className="flex justify-center">
            <select
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              disabled={loadingBuildings}
              style={{
                padding: '9px 14px', borderRadius: 9, fontSize: 13, minWidth: 280, textAlign: 'center',
                background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, cursor: 'pointer',
              }}
            >
              <option value="">{loadingBuildings ? 'Loading buildings...' : '-- Select Building --'}</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.building_name} ({b.project_name})</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col items-end" style={{ gap: 10 }}>
            <button type="button" onClick={onClose} title="Close" aria-label="Close"
              className="flex items-center justify-center rounded-lg"
              style={{ width: 32, height: 32, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer', flexShrink: 0 }}>
              <MdClose size={18} />
            </button>

            {/* Vertical color legend — directly under the Cancel icon, per
                spec, always visible (not gated on a building being loaded)
                so it reads as a fixed key for the whole popup. */}
            <div className="flex flex-col items-end" style={{ gap: 5 }}>
              {(['blocked', 'booked', 'available'] as UnitStatus[]).map((s) => (
                <span key={s} className="flex items-center gap-1.5" style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary, whiteSpace: 'nowrap' }}>
                  {STATUS_TEXT[s]}
                  <span style={{ width: 12, height: 12, borderRadius: 4, background: STATUS_COLOR[s], display: 'inline-block', flexShrink: 0 }} />
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── The picture itself — scrollable both axes, big enough to read
            comfortably (a real popup, not a cramped inline card). ──────── */}
        <div className="building-2d-modal-box" style={{ background: t.subtleBg }}>
          {!selectedBuildingId ? (
            <div className="building-2d-modal-canvas" style={{ color: t.textSecondary, fontSize: 13.5 }}>
              Select a building above to see its 2D view.
            </div>
          ) : !buildingDetail ? (
            <div className="building-2d-modal-canvas" style={{ color: t.textSecondary, fontSize: 13.5 }}>
              {loadingDetail ? 'Loading building...' : 'Failed to load this building.'}
            </div>
          ) : wings.length === 0 && shops.length === 0 ? (
            <div className="building-2d-modal-canvas" style={{ color: t.textSecondary, fontSize: 13.5, textAlign: 'center', maxWidth: 380, padding: '0 24px' }}>
              This building has no wings or shops configured in Building Master yet — add them there to see its picture here.
            </div>
          ) : (
            <div className="building-2d-modal-canvas">
              <div
                style={{
                  background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 18,
                  padding: '28px 36px', color: t.textPrimary,
                }}
              >
                <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 16, marginBottom: 22 }}>
                  {buildingDetail.building_name}
                </div>

                <div className="flex items-end justify-center" style={{ gap: 56 }}>
                  {wings.map((w) => (
                    <WingColumn
                      key={w.id}
                      wing={w}
                      floors={floorsOf(w)}
                      pickerMode={false}
                      selectedId={null}
                      onSelect={() => { /* read-only popup — clicks never select a unit */ }}
                    />
                  ))}
                </div>

                {shops.length > 0 && (
                  <div style={{ marginTop: 24, paddingTop: 18, borderTop: `2px dashed ${t.surfaceBorder}` }}>
                    <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, opacity: 0.65, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Ground Floor — Shops
                    </div>
                    <div className="flex flex-wrap items-center justify-center" style={{ gap: 6 }}>
                      {shops.map((s) => (
                        <UnitBlock
                          key={s.id}
                          no={s.shop_no} area={s.area_sqft} status={shopStatus(s)}
                          selected={false} clickable={false}
                          extraTitle={shopStatus(s) === 'booked' && s.booked_by_customer_name ? `Booked by ${s.booked_by_customer_name}` : undefined}
                          onClick={() => { /* read-only */ }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Building2DViewModal;
