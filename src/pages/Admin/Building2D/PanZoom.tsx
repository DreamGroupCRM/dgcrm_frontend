// ==========================================
// DREAM GROUP CRM - 2D BUILDING VIEW: PAN / ZOOM FRAME
// ==========================================
// Wraps a drawing (the building elevation or a floor plan) in a frame the
// user can drag to pan (mouse or touch) and zoom with + / − / reset. Reset
// fits the whole drawing in the frame (never enlarged past 100%). Only a CSS
// transform changes — the drawing itself never re-renders while panning.
// A click that ends a drag is swallowed, so dragging never selects a flat.
import React, { useEffect, useRef, useState } from 'react';
import { MdAdd, MdRemove, MdCenterFocusStrong } from 'react-icons/md';
import { AppTheme } from '../../../styles/theme';

interface PanZoomProps {
  t: AppTheme;
  /** Changing this re-fits the view (e.g. a new floor or wing). */
  resetKey: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  minZoom?: number;
  maxZoom?: number;
  /** Space kept around the fitted drawing. */
  fitPadding?: number;
  /** Largest zoom a reset may fit to (1 = never enlarge). */
  maxFit?: number;
}

const PanZoom: React.FC<PanZoomProps> = ({ t, resetKey, children, className, style, minZoom = 0.3, maxZoom = 3, fitPadding = 24, maxFit = 1 }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);

  const fit = () => {
    const f = frameRef.current; const c = contentRef.current;
    if (!f || !c || !c.offsetWidth) return 1;
    const z = Math.min(maxFit, (f.clientWidth - fitPadding) / c.offsetWidth, (f.clientHeight - fitPadding - 44) / c.offsetHeight);
    return Math.max(minZoom, +z.toFixed(2));
  };
  const reset = () => { setZoom(fit()); setPan({ x: 0, y: 0 }); };
  useEffect(() => { reset(); }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // Re-fit when the frame itself changes size (window resize, layout switch).
  useEffect(() => {
    const f = frameRef.current;
    if (!f || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => { if (!drag.current) setZoom((z) => (z === fit() ? z : fit())); });
    ro.observe(f);
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x; const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 5) return; // still a click
    if (!d.moved) { d.moved = true; setDragging(true); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
    setPan({ x: d.px + dx, y: d.py + dy });
  };
  const endDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved) {
      justDragged.current = true;
      setDragging(false);
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* not captured */ }
    }
  };
  const onClickCapture = (e: React.MouseEvent) => {
    if (justDragged.current) { justDragged.current = false; e.stopPropagation(); e.preventDefault(); }
  };

  const btn: React.CSSProperties = { background: t.surfaceBg, color: t.textPrimary, borderColor: t.surfaceBorder };
  return (
    <div ref={frameRef} className={`pz-frame${dragging ? ' pz-dragging' : ''}${className ? ` ${className}` : ''}`} style={style}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
      onClickCapture={onClickCapture}>
      <div className="pz-stage" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
        <div ref={contentRef} className="pz-content">{children}</div>
      </div>
      <div className="pz-controls" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" title="Zoom in" aria-label="Zoom in" disabled={zoom >= maxZoom}
          onClick={() => setZoom((z) => Math.min(maxZoom, +(z * 1.2).toFixed(2)))} style={btn}><MdAdd size={18} /></button>
        <button type="button" title="Zoom out" aria-label="Zoom out" disabled={zoom <= minZoom}
          onClick={() => setZoom((z) => Math.max(minZoom, +(z / 1.2).toFixed(2)))} style={btn}><MdRemove size={18} /></button>
        <button type="button" title="Reset view" aria-label="Reset view" onClick={reset} style={btn}><MdCenterFocusStrong size={17} /></button>
        <span className="pz-level" style={{ color: t.textSecondary }}>{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
};

export default PanZoom;
