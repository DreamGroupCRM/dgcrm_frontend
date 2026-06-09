// ==========================================
// DREAM GROUP CRM - UI SLICE
// ==========================================
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  pageTitle: string;
  breadcrumbs: { label: string; path?: string }[];
}

const initialState: UIState = {
  sidebarCollapsed: false,
  sidebarMobileOpen: false,
  pageTitle: 'Dashboard',
  breadcrumbs: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    toggleMobileSidebar: (state) => {
      state.sidebarMobileOpen = !state.sidebarMobileOpen;
    },
    setMobileSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarMobileOpen = action.payload;
    },
    setPageTitle: (state, action: PayloadAction<string>) => {
      state.pageTitle = action.payload;
    },
    setBreadcrumbs: (state, action: PayloadAction<{ label: string; path?: string }[]>) => {
      state.breadcrumbs = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  toggleMobileSidebar,
  setMobileSidebarOpen,
  setPageTitle,
  setBreadcrumbs,
} = uiSlice.actions;

export default uiSlice.reducer;
