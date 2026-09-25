// ==========================================
// DGCRM — APP-WIDE ZOOM HELPERS
// ==========================================
// The whole app is drawn at 90% on laptop/desktop screens (CSS `zoom` on
// <html>, see index.css) so it looks like browser zoom 90% while the
// browser itself stays at 100%.
//
// Under CSS zoom, getBoundingClientRect() and window.innerWidth/innerHeight
// are in SCREEN pixels, but a `position: fixed; top/left` set on an element
// inside the zoomed page is in the page's own (zoomed) CSS pixels. Anything
// that places a popup next to a field/button must convert with these
// helpers, or the popup lands ~10% away from where it should.

/** The zoom currently applied to <html> (1 when none / unsupported). */
export const currentZoom = (): number => {
  if (typeof document === 'undefined') return 1;
  const z = parseFloat(getComputedStyle(document.documentElement).zoom || '1');
  return Number.isFinite(z) && z > 0 ? z : 1;
};

/** getBoundingClientRect() in the page's CSS pixels — use for
 * position:fixed coordinates. */
export function cssRect(el: Element | null | undefined): DOMRect | undefined {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  const z = currentZoom();
  return z === 1 ? r : new DOMRect(r.x / z, r.y / z, r.width / z, r.height / z);
}

/** Viewport size in the page's CSS pixels. */
export const viewportWidth = (): number => window.innerWidth / currentZoom();
export const viewportHeight = (): number => window.innerHeight / currentZoom();
