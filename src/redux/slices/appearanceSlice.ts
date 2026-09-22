// src/redux/slices/appearanceSlice.ts
// ==========================================
// DREAM GROUP CRM — APPEARANCE SYSTEM (Phase 2-3 infrastructure)
// ==========================================
// This is the theme-system SCAFFOLDING, not a new visual theme. It exists
// so an "Appearance" selection can be captured, persisted, and exposed in
// Settings — while every existing page keeps rendering through its current
// `getTheme(isDark)` calls, completely untouched.
//
// Only 'existing' is a real, functional value right now. The other
// appearance ids are defined so the Settings UI can list the full planned
// option set (with the not-yet-implemented ones visibly disabled) without
// a second state-shape change later — but nothing in the app reads this
// state to alter rendering yet. That is deliberately deferred to a
// separate, scoped pass (see the Phase 1 feasibility note: ~660 hardcoded
// colors and ~900 hardcoded spacing/font-size literals across pages would
// need to route through real tokens before a non-'existing' value could
// mean anything visually).
//
// Kept as its own slice — not merged into themeSlice — so the existing
// light/dark mechanism (mode, toggleTheme, STORAGE_KEYS.THEME) is never
// touched by this work, per the "Existing/Current must be an exact
// baseline" requirement.
//
// A "Density" selection (compact/standard/spacious row spacing) used to
// live alongside Appearance here, but its real implementation only ever
// reached the Leads list — every other page kept rendering through
// master.css's fixed spacing regardless of what was selected — so it was
// removed as a user-facing setting rather than kept as a control that only
// worked on one page.
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '../../constants';

// V_23.0 — 'dark-professional' (green), 'executive' (gold/amber) and
// 'sunset-gradient' (orange-red) were removed: Payment Due's status
// indicators now own green/yellow/red (see DueReportPage.tsx), so a
// selectable theme accent in the same hue families would visually collide
// with payment status. Replaced by 'midnight-navy' and 'plum-boardroom' —
// see appearanceTokens.ts for the actual color values.
export type AppearanceId =
  | 'existing' | 'light-professional' | 'midnight-navy' | 'modern' | 'plum-boardroom'
  | 'ocean-gradient' | 'coral-reef' | 'neutral-gray';

export const APPEARANCE_OPTIONS: { id: AppearanceId; label: string; implemented: boolean }[] = [
  { id: 'existing', label: 'Existing / Current', implemented: true },
  { id: 'light-professional', label: 'Light Professional', implemented: true },
  { id: 'midnight-navy', label: 'Midnight Navy', implemented: true },
  { id: 'modern', label: 'Modern', implemented: true },
  { id: 'plum-boardroom', label: 'Plum Boardroom', implemented: true },
  { id: 'ocean-gradient', label: 'Ocean Gradient', implemented: true },
  { id: 'coral-reef', label: 'Coral Reef', implemented: true },
  { id: 'neutral-gray', label: 'Gray', implemented: true },
];

interface AppearanceState {
  appearance: AppearanceId;
}

// Defensive against a hand-edited/stale localStorage value that no longer
// matches a known id (e.g. an older build's option set) — falls back to
// the safe baseline rather than passing an invalid id through to the UI.
const storedAppearance = localStorage.getItem(STORAGE_KEYS.APPEARANCE) as AppearanceId | null;

const initialState: AppearanceState = {
  appearance: APPEARANCE_OPTIONS.some((o) => o.id === storedAppearance) ? (storedAppearance as AppearanceId) : 'existing',
};

const appearanceSlice = createSlice({
  name: 'appearance',
  initialState,
  reducers: {
    setAppearance: (state, action: PayloadAction<AppearanceId>) => {
      state.appearance = action.payload;
      localStorage.setItem(STORAGE_KEYS.APPEARANCE, action.payload);
    },
  },
});

export const { setAppearance } = appearanceSlice.actions;
export default appearanceSlice.reducer;
