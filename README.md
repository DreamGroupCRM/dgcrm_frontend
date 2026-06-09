# Dream Group CRM — Frontend

**A production-ready Enterprise CRM for Dream Group.**

> Interest Free Home For All Community People 🏠

---

## Tech Stack

| Technology | Version |
|---|---|
| React | 18+ |
| TypeScript | 5+ |
| Vite | 5+ |
| Redux Toolkit | 2+ |
| React Router DOM | v6 |
| Material UI (MUI) | v5 |
| Tailwind CSS | v3 |
| Axios | v1 |
| SweetAlert2 | v11 |
| React Icons | v5 |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Build for production
npm run build
```

Open: http://localhost:5173

---

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin.sohel@gmail.com | Admin@123 |
| Employee | employee.sohel@gmail.com | Employee@123 |

---

## Project Structure

```
src/
├── assets/
│   ├── images/carousel/    ← 7 carousel images (1.png–7.png)
│   ├── logo/
│   └── json/               ← Mock API responses
│       ├── loginResponse.json
│       ├── logoutResponse.json
│       └── myProfileResponse.json
│
├── app/
│   └── store.ts            ← Redux store
│
├── components/
│   ├── common/
│   │   ├── Sidebar.tsx       ← Collapsible sidebar (Admin + Employee)
│   │   ├── Header.tsx        ← Top header with social/theme/profile
│   │   ├── ProfileModal.tsx  ← Profile card modal
│   │   ├── ProtectedRoute.tsx← Role-based route guard
│   │   └── PlaceholderPage.tsx
│   └── ui/
│
├── layouts/
│   └── DashboardLayout.tsx ← Main layout wrapper
│
├── pages/
│   ├── Login/LoginPage.tsx  ← Full-screen glassmorphism login
│   ├── Admin/Dashboard/     ← Admin dashboard with stats
│   └── Employee/Dashboard/  ← Employee dashboard
│
├── redux/
│   ├── slices/              ← authSlice, profileSlice, themeSlice, uiSlice
│   └── thunks/              ← authThunks, profileThunks
│
├── routes/
│   └── AppRoutes.tsx        ← All routes (protected + public)
│
├── services/
│   ├── axiosConfig.ts       ← Axios instance + interceptors
│   ├── authService.ts       ← Login / Logout service
│   └── profileService.ts    ← Profile fetch service
│
├── hooks/index.ts           ← useAppDispatch, useAppSelector
├── types/index.ts           ← All TypeScript interfaces
├── constants/index.ts       ← Routes, credentials, validation
├── utils/index.ts           ← SweetAlert2 helpers, formatDate
├── theme/index.ts           ← MUI theme factory
└── styles/Responsive.css    ← Media queries
```

---

## Connecting Your Backend

Every service file has commented backend code ready to uncomment:

```typescript
// authService.ts — replace mock with:
const response = await axiosInstance.post('/auth/login', credentials);
return response.data;

// profileService.ts — replace mock with:
const response = await axiosInstance.get('/auth/profile');
return response.data;
```

Update `.env`:
```
VITE_API_BASE_URL=http://localhost:5000/api
```

Update `axiosConfig.ts`:
```typescript
baseURL: import.meta.env.VITE_API_BASE_URL,
```

---

## Features

- ✅ Role-based authentication (Admin / Employee)
- ✅ Full-screen glassmorphism login with 7-image carousel
- ✅ Dark / Light theme toggle (persisted in localStorage)
- ✅ Collapsible sidebar with nested navigation
- ✅ Profile modal with API integration
- ✅ SweetAlert2 for all notifications
- ✅ Protected routes with role-based guards
- ✅ Refresh persistence (stays on current route)
- ✅ Lazy loading + code splitting
- ✅ Fully responsive (mobile-friendly)
- ✅ TypeScript throughout (`.tsx` everywhere)
- ✅ Clean Redux Toolkit architecture
- ✅ Axios with JWT interceptors
- ✅ Ready for backend integration

---

## Environment Variables

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## Adding New Pages

1. Create component in `src/pages/Admin/YourModule/YourPage.tsx`
2. Add route in `src/routes/AppRoutes.tsx`
3. Add nav item in `src/components/common/Sidebar.tsx`
4. Add route constant in `src/constants/index.ts`

---

*Dream Group CRM — Turning Dreams Into Reality, The Halal Way.*
