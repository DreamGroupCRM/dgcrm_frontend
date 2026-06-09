// ==========================================
// DREAM GROUP CRM - REDUX STORE
// ==========================================
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../redux/slices/authSlice';
import profileReducer from '../redux/slices/profileSlice';
import themeReducer from '../redux/slices/themeSlice';
import uiReducer from '../redux/slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    profile: profileReducer,
    theme: themeReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
