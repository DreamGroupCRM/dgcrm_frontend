// src/redux/slices/appearanceSlice.ts
// ==========================================
// DREAM GROUP CRM — APPEARANCE SYSTEM (Phase 2-3 infrastructure)
// ==========================================
// This is the theme-system SCAFFOLDING, not a new visual theme. It exists
// so an "Appearance" / "Density" selection can be captured, persisted, and
// exposed in Settings — while every existing page keeps rendering through
// its current `getTheme(isDark)` calls, completely untouched.
//
// Only 'existing' is a real, functional value right now. The other
// appearance/density ids are defined so the Settings UI can list the full
// planned option set (with the not-yet-implemented ones visibly disabled)
// without a second state-shape change later — but nothing in the app reads
// this state to alter rendering yet. That is deliberately deferred to a
// separate, scoped pass (see the Phase 1 feasibility note: ~660 hardcoded
// colors and ~900 hardcoded spacing/font-size literals across pages would
// need to route through real tokens before a non-'existing' value could
// mean anything visually).
//
// Kept as its own slice — not merged into themeSlice — so the existing
// light/dark mechanism (mode, toggleTheme, STORAGE_KEYS.THEME) is never
// touched by this work, per the "Existing/Current must be an exact
// baseline" requirement.
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '../../constants';

export type AppearanceId = 'existing' | 'light-professional' | 'dark-professional' | 'modern' | 'executive';
export type DensityId = 'existing' | 'compact' | 'standard' | 'spacious';

// Phase 4 pilot: real (Leads-list-only) implementations now exist for all
// 5 appearances and 4 densities — see src/styles/appearanceTokens.ts. Every
// other page in the app doesn't read that file yet, so it keeps rendering
// through master.css's unchanged :root defaults regardless of what's
// selected here — see the "(Leads pilot)" caption in Header.tsx's
// Settings panel, which exists specifically so this isn't misleading.
export const APPEARANCE_OPTIONS: { id: AppearanceId; label: string; implemented: boolean }[] = [
  { id: 'existing', label: 'Existing / Current', implemented: true },
  { id: 'light-professional', label: 'Light Professional', implemented: true },
  { id: 'dark-professional', label: 'Dark Professional', implemented: true },
  { id: 'modern', label: 'Modern', implemented: true },
  { id: 'executive', label: 'Executive', implemented: true },
];

export const DENSITY_OPTIONS: { id: DensityId; label: string; implemented: boolean }[] = [
  { id: 'existing', label: 'Existing / Current', implemented: true },
  { id: 'compact', label: 'Compact', implemented: true },
  { id: 'standard', label: 'Standard', implemented: true },
  { id: 'spacious', label: 'Spacious', implemented: true },
];

interface AppearanceState {
  appearance: AppearanceId;
  density: DensityId;
}

// Defensive against a hand-edited/stale localStorage value that no longer
// matches a known id (e.g. an older build's option set) — falls back to
// the safe baseline rather than passing an invalid id through to the UI.
const storedAppearance = localStorage.getItem(STORAGE_KEYS.APPEARANCE) as AppearanceId | null;
const storedDensity = localStorage.getItem(STORAGE_KEYS.DENSITY) as DensityId | null;

const initialState: AppearanceState = {
  appearance: APPEARANCE_OPTIONS.some((o) => o.id === storedAppearance) ? (storedAppearance as AppearanceId) : 'existing',
  density: DENSITY_OPTIONS.some((o) => o.id === storedDensity) ? (storedDensity as DensityId) : 'existing',
};

const appearanceSlice = createSlice({
  name: 'appearance',
  initialState,
  reducers: {
    setAppearance: (state, action: PayloadAction<AppearanceId>) => {
      state.appearance = action.payload;
      localStorage.setItem(STORAGE_KEYS.APPEARANCE, action.payload);
    },
    setDensity: (state, action: PayloadAction<DensityId>) => {
      state.density = action.payload;
      localStorage.setItem(STORAGE_KEYS.DENSITY, action.payload);
    },
  },
});

export const { setAppearance, setDensity } = appearanceSlice.actions;
export default appearanceSlice.reducer;
