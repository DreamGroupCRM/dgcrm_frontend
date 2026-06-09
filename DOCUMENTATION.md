# Dream Group CRM — Complete Project Documentation

> For every MERN Stack developer working on this project.

---

## Table of Contents
1. [Application Architecture Flow](#1-application-architecture-flow)
2. [File-by-File Documentation](#2-file-by-file-documentation)
3. [Theme System](#3-theme-system)
4. [Routing Architecture](#4-routing-architecture)
5. [Authentication Flow](#5-authentication-flow)
6. [How to Add New Pages](#6-how-to-add-new-pages)

---

## 1. Application Architecture Flow

### Frontend Flow (How data moves)

```
User Action (button click, form submit)
    ↓
React Component (LoginPage, AdminDashboard, etc.)
    ↓
Redux Thunk (authThunks.ts, profileThunks.ts)
    ↓
Service Layer (authService.ts, profileService.ts)
    ↓
Axios (axiosConfig.ts) ← attaches JWT token automatically
    ↓
JSON Mock (assets/json/) ← REPLACE with real API in production
    ↓
Response flows back UP → Redux Slice → Component re-renders
```

### Backend Flow (Future: Node.js + Express + MongoDB)

```
React (Axios POST /api/auth/login)
    ↓
Express Router → authController.js
    ↓
authService.js → bcrypt.compare(password, hash)
    ↓
MongoDB (User collection) → find user by email
    ↓
JWT token created → sent back in response
    ↓
React stores token in Redux + localStorage
```

### Authentication Flow

```
1. User fills Login form
2. handleSubmit() → validateEmail() + validatePassword()
   - If fails → SweetAlert2 shows EXACT error message
3. dispatch(loginThunk({ email, password }))
4. loginThunk → authService.login()
5. authService matches against HARDCODED_USERS (or real API)
6. On success:
   - token + user stored in Redux authSlice
   - also saved to localStorage (survives page refresh)
   - SweetAlert2 "Logged In Successfully" toast
   - navigate() to /Admin/Dashboard or /Employee/Dashboard
7. On page refresh:
   - Redux store rehydrates from localStorage
   - isAuthenticated = true → user stays logged in
   - ProtectedRoute lets them through
```

### Profile Flow

```
1. User clicks Profile button in Header
2. dispatch(openProfileModal()) → profileSlice.profileModalOpen = true
3. ProfileModal renders
4. useEffect fires → dispatch(fetchProfileThunk())
5. fetchProfileThunk → profileService.getProfile()
6. profileService returns myProfileResponse.json (or real API)
7. profile stored in Redux profileSlice
8. ProfileModal displays profile data
9. User clicks Close / Cancel → dispatch(closeProfileModal())
```

### Logout Flow

```
1. User clicks Logout button
2. SweetAlert2 confirm dialog appears
3. User confirms → dispatch(logoutThunk())
4. logoutThunk → authService.logout()
5. authSlice clears: user, token, role, isAuthenticated
6. localStorage keys removed
7. profileSlice cleared
8. window.location.href = '/login' (hard redirect for clean state)
9. SweetAlert2 "Logged Out Successfully" toast
```

### Theme Flow

```
1. App starts → themeSlice reads localStorage
2. Stored theme (e.g. 'royal-purple') applied instantly
3. User opens ThemeSwitcher dropdown in Header
4. Clicks a theme → dispatch(setTheme('corporate-blue'))
5. themeSlice updates themeName + mode
6. App.tsx re-runs createAppTheme(themeName) → new MUI theme
7. Sidebar reads THEMES[themeName].sidebarBg → changes colour
8. Tailwind dark class added/removed on <html>
9. Everything updates instantly — no page reload
```

### Routing Flow

```
Browser: /Admin/Dashboard
    ↓
routes/index.tsx: matches /Admin/*
    ↓
AdminRoutes.tsx renders
    ↓
ProtectedRoute checks: isAuthenticated + role === 'Admin'
    ↓
DashboardLayout renders (Sidebar + Header + Outlet)
    ↓
<Outlet /> renders AdminDashboard component
```

### Sidebar Navigation Flow

```
User clicks "CRM" group in sidebar
    ↓
NavItemComponent: setOpen(true) → children expand
    ↓
User clicks "Leads"
    ↓
NavLink navigates to /Admin/CRM/Leads
    ↓
React Router matches route in AdminRoutes.tsx
    ↓
PlaceholderPage (or real page) renders in <Outlet />
    ↓
NavLink receives isActive=true → yellow highlight applied
```

---

## 2. File-by-File Documentation

### `src/main.tsx`
**Purpose:** App entry point. Mounts React into the HTML `#root` div.
**Responsibilities:** Wraps app with Redux `<Provider>`. StrictMode removed to fix double-render.
**Used by:** Browser (loads this first).
**Future changes:** No changes needed here usually.

---

### `src/App.tsx`
**Purpose:** Root React component. Applies MUI theme and renders routes.
**Responsibilities:** Reads `themeName` from Redux → creates MUI theme → applies Tailwind dark class.
**Used by:** `main.tsx`
**Future changes:** Add global context providers here if needed.

---

### `src/app/store.ts`
**Purpose:** Redux store configuration.
**Responsibilities:** Combines all slices (auth, profile, theme, ui) into one store.
**Used by:** `main.tsx` (Provider), all hooks via `useAppSelector`/`useAppDispatch`.
**Future changes:** Add new slices here as app grows (e.g. leadsSlice, notificationsSlice).

---

### `src/types/index.ts`
**Purpose:** TypeScript type definitions for the whole app.
**Responsibilities:** Defines User, UserProfile, LoginResponse, ThemeName, etc.
**Used by:** Every file that deals with typed data.
**Future changes:** Add new types here when adding new features.

---

### `src/constants/index.ts`
**Purpose:** All magic strings and configuration in one place.
**Responsibilities:** Route paths, hardcoded users, validation regex, social links.
**Used by:** Services, components, route guards.
**Future changes:** Add new route constants when adding new pages.

---

### `src/theme/themes.ts`
**Purpose:** Defines the 5 available CRM themes.
**Responsibilities:** Each theme has: primaryColor, sidebarBg, isDark flag, label, preview gradient.
**Used by:** `themeSlice.ts`, `ThemeSwitcher.tsx`, `Sidebar.tsx`, `theme/index.ts`.
**Future changes:** Add a new entry here to add a 6th theme.

---

### `src/theme/index.ts`
**Purpose:** Creates a MUI theme object from a ThemeName.
**Responsibilities:** Maps theme config to MUI `createTheme()` call.
**Used by:** `App.tsx`
**Future changes:** Add more MUI component overrides here for consistent styling.

---

### `src/redux/slices/authSlice.ts`
**Purpose:** Manages authentication state.
**Responsibilities:** Stores user, token, role, isAuthenticated. Rehydrates from localStorage on startup.
**Used by:** All protected pages, Header, Sidebar.
**Future changes:** Add `refreshToken` logic here when backend is connected.

---

### `src/redux/slices/profileSlice.ts`
**Purpose:** Manages profile modal state and profile data.
**Responsibilities:** Stores profile data, loading state, modal open/close flag.
**Used by:** `ProfileModal.tsx`, `Header.tsx`.
**Future changes:** Add profile update (PUT) thunk here.

---

### `src/redux/slices/themeSlice.ts`
**Purpose:** Manages active theme.
**Responsibilities:** Stores `themeName`, derives legacy `mode`. Persists to localStorage.
**Used by:** `App.tsx`, `Header.tsx`, `Sidebar.tsx`, `ThemeSwitcher.tsx`.
**Future changes:** No changes needed unless adding system-preference auto-detection.

---

### `src/redux/slices/uiSlice.ts`
**Purpose:** Manages UI state (sidebar collapse, page title, breadcrumbs).
**Responsibilities:** Controls sidebar width state.
**Used by:** `Sidebar.tsx`, `DashboardLayout.tsx`, `Header.tsx`.
**Future changes:** Add global notification/toast state here if needed.

---

### `src/redux/thunks/authThunks.ts`
**Purpose:** Async actions for login and logout.
**Responsibilities:** Calls authService, handles success/error, updates authSlice.
**Used by:** `LoginPage.tsx`, `Header.tsx`.
**Future changes:** Replace mock service call with real Axios call.

---

### `src/redux/thunks/profileThunks.ts`
**Purpose:** Async action to fetch user profile.
**Responsibilities:** Calls profileService, updates profileSlice.
**Used by:** `ProfileModal.tsx`.
**Future changes:** Add updateProfileThunk for edit functionality.

---

### `src/services/axiosConfig.ts`
**Purpose:** Configured Axios instance used across all API calls.
**Responsibilities:** Sets base URL, attaches JWT token to every request, handles 401 redirect.
**Used by:** `authService.ts`, `profileService.ts` (once real API connected).
**Future changes:** Set `VITE_API_BASE_URL` in `.env` and uncomment `baseURL`.

---

### `src/services/authService.ts`
**Purpose:** Handles login and logout API calls.
**Responsibilities:** Currently uses hardcoded users + JSON mock. Comments show real API code.
**Used by:** `authThunks.ts`
**Future changes:** Uncomment `axiosInstance.post('/auth/login', credentials)` line.

---

### `src/services/profileService.ts`
**Purpose:** Handles profile fetch API call.
**Responsibilities:** Currently returns `myProfileResponse.json`. Comments show real API code.
**Used by:** `profileThunks.ts`
**Future changes:** Uncomment `axiosInstance.get('/auth/profile')` line.

---

### `src/components/ui/Logo.tsx`
**Purpose:** Single reusable logo component — used everywhere branding appears.
**Responsibilities:** Renders Dream Group logo image at various sizes. Optional click navigation.
**Used by:** `LoginPage.tsx`, `Header.tsx`, `Sidebar.tsx`.
**Future changes:** Update image path here if logo file changes.

---

### `src/components/ui/ThemeSwitcher.tsx`
**Purpose:** Dropdown UI for switching between 5 themes.
**Responsibilities:** Shows colour swatches, dispatches `setTheme()` on click.
**Used by:** `Header.tsx`
**Future changes:** No changes needed unless adding more themes.

---

### `src/components/common/Sidebar.tsx`
**Purpose:** Left navigation panel.
**Responsibilities:** Shows role-specific nav items, handles expand/collapse, reads theme for bg colour.
**Used by:** `DashboardLayout.tsx`
**Future changes:** Add new nav items to `adminNavItems` or `employeeNavItems` arrays.

---

### `src/components/common/Header.tsx`
**Purpose:** Top application bar.
**Responsibilities:** Logo (with dashboard navigation), social links, theme switcher, profile, logout.
**Used by:** `DashboardLayout.tsx`
**Future changes:** Add notifications bell here.

---

### `src/components/common/ProfileModal.tsx`
**Purpose:** Profile info popup.
**Responsibilities:** Fetches and displays user profile. Does NOT close on outside click.
**Used by:** `DashboardLayout.tsx`
**Future changes:** Add edit profile form here.

---

### `src/routes/index.tsx`
**Purpose:** Top-level router — single file to see all route groups.
**Responsibilities:** Defines /login, /Admin/*, /Employee/* routes.
**Used by:** `App.tsx` (via AppRoutes.tsx re-export).
**Future changes:** Add new route groups here (e.g. /SuperAdmin/*).

---

### `src/routes/AdminRoutes.tsx`
**Purpose:** All Admin page routes in one file.
**Responsibilities:** Maps URL paths to Admin page components.
**Used by:** `routes/index.tsx`
**Future changes:** Add new Admin page routes here.

---

### `src/routes/EmployeeRoutes.tsx`
**Purpose:** All Employee page routes in one file.
**Responsibilities:** Maps URL paths to Employee page components.
**Used by:** `routes/index.tsx`
**Future changes:** Add new Employee page routes here.

---

### `src/routes/ProtectedRoute.tsx`
**Purpose:** Route guard for authenticated pages.
**Responsibilities:** Checks auth state. Redirects to login if not authenticated.
**Used by:** `AdminRoutes.tsx`, `EmployeeRoutes.tsx`
**Future changes:** Add token expiry check here.

---

### `src/routes/PublicRoute.tsx`
**Purpose:** Route guard for public pages (Login).
**Responsibilities:** Redirects already-logged-in users to their dashboard.
**Used by:** `routes/index.tsx`
**Future changes:** Add "remember me" logic here.

---

### `src/layouts/DashboardLayout.tsx`
**Purpose:** Layout shell for all authenticated pages.
**Responsibilities:** Renders Sidebar + Header + page content area.
**Used by:** `AdminRoutes.tsx`, `EmployeeRoutes.tsx`
**Future changes:** Add a footer bar or breadcrumbs bar here.

---

### `src/utils/index.ts`
**Purpose:** Shared utility functions.
**Responsibilities:** SweetAlert2 helpers, date formatting, initials generation.
**Used by:** Multiple components.
**Future changes:** Add more helpers here (currency formatting, etc.).

---

### `src/styles/Responsive.css`
**Purpose:** Media query overrides that can't be done with Tailwind alone.
**Responsibilities:** Hides/shows elements at specific breakpoints.
**Used by:** All layout components.
**Future changes:** Add new breakpoint fixes here.

---

## 3. Theme System

5 themes available. Each defined in `src/theme/themes.ts`:

| Theme Name | Key | Dark? |
|---|---|---|
| Emerald Green (default) | `emerald-green` | No |
| Corporate Blue | `corporate-blue` | No |
| Dark Professional | `dark-professional` | Yes |
| Royal Purple | `royal-purple` | Yes |
| Modern Orange | `modern-orange` | No |

**To add a new theme:**
1. Add the name to `ThemeName` union in `src/types/index.ts`
2. Add config entry in `src/theme/themes.ts`
3. Done — ThemeSwitcher picks it up automatically.

---

## 4. Routing Architecture

```
routes/
├── index.tsx          ← TOP LEVEL: BrowserRouter lives here
├── AdminRoutes.tsx    ← All /Admin/* routes
├── EmployeeRoutes.tsx ← All /Employee/* routes
├── ProtectedRoute.tsx ← Auth guard (checks login + role)
└── PublicRoute.tsx    ← Redirects logged-in users away from /login
```

**Rule:** Each role has its own routes file. To add a new Admin page, only touch `AdminRoutes.tsx`.

---

## 5. Authentication Flow (Quick Reference)

```
Login → authService.login() → authSlice stores token
Token saved in localStorage → survives page refresh
Every Axios request → axiosConfig.ts attaches Bearer token
401 response → axiosConfig.ts clears storage + redirects to /login
Logout → clears Redux + localStorage + window.location = /login
```

---

## 6. How to Add New Pages

### New Admin Page (Example: "Properties")

```bash
# Step 1: Create the page
src/pages/Admin/Properties/PropertiesPage.tsx

# Step 2: Add to AdminRoutes.tsx
<Route path="Properties" element={<PropertiesPage />} />

# Step 3: Add to constants
ROUTES.ADMIN.PROPERTIES: '/Admin/Properties'

# Step 4: Add to Sidebar adminNavItems array in Sidebar.tsx
{ label: 'Properties', path: ROUTES.ADMIN.PROPERTIES, icon: <MdApartment /> }
```

### Connecting to Real Backend

```typescript
// In authService.ts — replace mock with:
const response = await axiosInstance.post('/auth/login', credentials);
return response.data;

// In .env:
VITE_API_BASE_URL=http://localhost:5000/api

// In axiosConfig.ts — update:
baseURL: import.meta.env.VITE_API_BASE_URL,
```

---

*Dream Group CRM — Turning Dreams Into Reality, The Halal Way.*
