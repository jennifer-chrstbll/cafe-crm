# cafe-crm

Dashboard for café staff and owners: cashier (POS) with live face recognition, open tabs,
customers, visits, analytics, menu, staff and privacy settings. Part of the thesis
*Perancangan Sistem Personalisasi Layanan Pelanggan Kafe Berbasis Person Tracking dan Face
Recognition secara Real-Time*.

- `frontend/` — Next.js 16 app **and** its API (`src/app/api/*`), deployed on Vercel.
- `database/` — SQL schema and migrations for Supabase.
- `docs/INTEGRATION.md` — how the CRM, the Arduino UNO Q (face recognition) and the Raspberry Pi
  (person tracking) share data.
- `docs/UX_RATIONALE.md` — design decisions and the UX theory behind them.
- `legacy/` — the former FastAPI backend (superseded by the Next.js API; not deployed).

## Setup

1. **Database** — Supabase → SQL Editor → run `database/004_integration.sql` (safe to re-run).
2. **Environment** — copy `frontend/.env.example` to `frontend/.env.local` and fill it in; set
   the same variables in Vercel. `DEVICE_API_KEY` must match the one on the UNO Q.
3. **Run locally**
   ```bash
   cd frontend
   npm install
   npm run dev        # http://localhost:3000
   ```
4. **Accounts** — the owner creates staff accounts in *Staf*. Change any default/seed
   passwords on first login (*Pengaturan → Akun*).

## Roles

| Role | Starts at | Sees |
|---|---|---|
| Kasir | Kasir | Kasir, Tagihan, Pelanggan, Transaksi (today), Kamera |
| Pemilik | Ringkasan | everything, incl. Analitik, Kunjungan, Menu, Log Wajah, Staf, Pengaturan |

## Security model

- Login sets an httpOnly, SameSite=Lax session cookie (12 h); every API route checks it
  (`requireUser`), owner-only routes check the role.
- The browser never talks to Supabase. RLS is enabled with no policies, so the public anon key
  cannot read any table; only the server (service_role) and the edge devices can.
- Edge devices call the API with the `x-device-key` header.
