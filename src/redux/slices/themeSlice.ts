import { createSlice } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '../../constants';

type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
}

const stored = localStorage.getItem(STORAGE_KEYS.THEME) as ThemeMode | null;

const initialState: ThemeState = {
  mode: stored === 'dark' ? 'dark' : 'light',
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === 'light' ? 'dark' : 'light';
      localStorage.setItem(STORAGE_KEYS.THEME, state.mode);
    },
    setTheme: (state, action) => {
      state.mode = action.payload;
      localStorage.setItem(STORAGE_KEYS.THEME, action.payload);
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;