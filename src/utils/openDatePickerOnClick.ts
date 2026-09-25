// ==========================================
// DGCRM — OPEN DATE PICKERS ON ANY CLICK
// ==========================================
// Browsers only open a native date/time input's calendar when its small
// calendar icon is clicked; clicking the text part just focuses a segment.
// One document-level listener makes a click ANYWHERE in such a field open
// its picker, across every page (and any added later) without per-field
// handlers. Read-only and disabled fields are left alone. Registered in the
// capture phase so it still fires inside popups whose panel calls
// stopPropagation() on clicks (e.g. Payment Due's Follow-up popup).
const PICKER_TYPES = new Set(['date', 'datetime-local', 'month', 'week', 'time']);

let installed = false;

export function installOpenDatePickerOnClick(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('click', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement)) return;
    if (!PICKER_TYPES.has(el.type) || el.readOnly || el.disabled) return;
    try {
      el.showPicker?.();
    } catch {
      // Already open, or the browser refused (no user gesture) — the
      // field still works normally.
    }
  }, true);
}
