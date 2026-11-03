implementation plan:
# Cafe CRM Frontend — Implementation Plan

## Overview

Build a complete Next.js 15 + TypeScript + Tailwind + shadcn/ui frontend dashboard for the Cafe CRM system that connects to the existing FastAPI backend running on `localhost:8000`.

The backend already provides:
- `GET /analytics/overview` — total customers, visits, recognition logs
- `GET /analytics/top-customers` — top 10 by visit count
- `GET /analytics/visit-trend` — visits per day
- `GET /analytics/recent-visits` — last 20 visits
- `GET /analytics/recent-recognitions` — last 20 recognitions
- `GET /customers` — list all active customers
- `GET /customers/{id}` — customer detail
- `GET /customers/{id}/visits` — customer visits
- `GET /customers/{id}/summary` — customer summary
- `POST /customers` — create customer
- `POST /recognition/search` — face recognition

---

## Backend Additions Needed

The following endpoints don't exist yet and need to be added to the backend:

1. **`POST /auth/login`** — JWT authentication (username/password → JWT token)
2. **`GET /visits`** — list all visits (with customer names, pagination/filter by date)
3. **`GET /recognition-logs`** — list all recognition logs (with customer name, timestamp, score, recognized bool)
4. **`GET /analytics/dashboard-summary`** — today's visits, recognized today, unknown today (for the kasir dashboard cards)
5. **`GET /users`** — list users (for owner/settings)
6. **`POST /users`** — create user
7. **`DELETE /users/{id}`** — delete user
8. **`PUT /users/{id}/password`** — reset password

> [!IMPORTANT]
> Auth needs to be added to the backend first. The `User` model already exists with `role: OWNER | CASHIER | ADMIN`. We need JWT auth (python-jose + passlib).

---

## Proposed Changes

### Backend — New Router: `app/routers/auth.py` [NEW]
- `POST /auth/login` — verify email+password, return JWT token with `user_id`, `role`, `name`

### Backend — New Router: `app/routers/visits.py` [NEW]
- `GET /visits` — paginated visits with customer name; filter by `?filter=today|week|month`

### Backend — New Router: `app/routers/recognition_logs.py` [NEW]
- `GET /recognition-logs` — paginated list with customer name, score, recognized, camera_id, created_at

### Backend — New Router: `app/routers/users.py` [NEW]
- CRUD for users (owner-only)

### Backend — Analytics Router additions [`analytics.py`](file:///d:/Projects/cafe-crm/backend/app/routers/analytics.py)
- Add `/analytics/dashboard-summary` endpoint: today visits, recognized today, unknown today

### Backend — `main.py` updates [`main.py`](file:///d:/Projects/cafe-crm/backend/app/main.py)
- Register new routers

---

### Frontend (Next.js 15, in `d:\Projects\cafe-crm\frontend\`)

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx             (redirect to /login or /dashboard)
│   │   ├── login/page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── customers/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── visits/page.tsx
│   │   ├── recognition-logs/page.tsx
│   │   ├── analytics/page.tsx
│   │   └── settings/page.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── DashboardLayout.tsx
│   │   ├── ui/  (shadcn)
│   │   ├── StatsCard.tsx
│   │   └── charts/
│   │       ├── VisitTrendChart.tsx
│   │       ├── RecognitionPieChart.tsx
│   │       ├── TopCustomersChart.tsx
│   │       └── PeakHoursChart.tsx
│   ├── lib/
│   │   └── utils.ts
│   ├── services/
│   │   └── api.ts
│   ├── types/
│   │   └── index.ts
│   └── contexts/
│       └── AuthContext.tsx
```

**Color palette** (cafe-themed, no blue):
- Primary: `#5C3D2E`
- Secondary: `#8B5E3C`
- Background: `#F5F1EA`
- Card: `#FFFFFF`
- Accent: `#D4A373`
- Success: `#4CAF50`
- Danger: `#E53935`

**Tech stack:**
- Next.js 15 + App Router + TypeScript
- Tailwind CSS
- shadcn/ui components
- Recharts (charts)
- Axios (HTTP)
- lucide-react (icons)

---

## Open Questions

> [!NOTE]
> The `User` model has email as username — login will use email + password. Passwords are stored as `password_hash` (bcrypt). I'll use `passlib[bcrypt]` + `python-jose[cryptography]` for JWT.

> [!IMPORTANT]
> Since no users exist in the database yet, after adding the auth router I'll also add a **seeder script** to create a default `admin@cafe.com` / `admin123` owner account so login works immediately.

---

## Verification Plan

### Automated
- Backend: Start uvicorn and verify all new endpoints return 200 in browser
- Frontend: `npm run dev` and verify pages load without errors

### Manual
- Login as owner → see full sidebar including Analytics
- Login as cashier → see limited sidebar
- Dashboard cards show real data from DB
- Charts render with real data
- Customers table lists, search works, detail page works
- Visits table with date filter works
- Recognition logs show with YES/NO badges
- Analytics charts render (owner only)