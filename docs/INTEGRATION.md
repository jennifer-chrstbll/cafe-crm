# Integration contract: CRM · face recognition · person tracking

Three repositories, one database (Supabase Postgres), no direct device-to-device calls.

```
 ┌───────────────────────┐        ┌──────────────────────────┐        ┌────────────────────────────┐
 │ Arduino UNO Q          │        │ Supabase (Postgres)      │        │ Raspberry Pi 5             │
 │ cafe_facerec/uno_q     │ write  │                          │ write  │ cafe-persontrack           │
 │ SCRFD + MobileFaceNet  ├───────▶│ recognition_logs, visits │◀───────┤ YOLO + tracker + OSNet     │
 │ + FAISS, cashier cam   │        │ embeddings               │        │ cafe-area webcam (~3 m up) │
 │                        │◀───────┤ enrollment_requests      │        │                            │
 │                        │ poll   │ device_status            │        │ camera_tracks, occupancy,  │
 └──────────┬─────────────┘        │ camera_tracks, occupancy │        │ occupancy_logs,            │
            │ POST /api/association/bind (x-device-key)       │        │ device_status              │
            ▼                      └────────────▲─────────────┘        └────────────────────────────┘
 ┌───────────────────────┐                      │ service_role (server only)
 │ CRM (Next.js, Vercel)  ├──────────────────────┘
 │ cafe-crm/frontend      │   browser (iPad kasir, owner laptop) ⇄ /api/* (session cookie)
 └───────────────────────┘
```

Why everything goes through the database: the CRM runs in the cloud over HTTPS and
**cannot reach devices on the cafe LAN** (private IPs, mixed content). Devices only make
outbound connections, so the setup works on any cafe Wi-Fi without port forwarding.

## Tables and who writes them

| Table | Written by | Read by | Notes |
|---|---|---|---|
| `recognition_logs` | UNO Q | CRM | one row per *decision* (3-of-5 vote), not per frame; `is_correct` = cashier feedback |
| `visits` | UNO Q (on recognition), CRM (first order) | all | active = `exit_time IS NULL` and opened < `max_open_hours`; closed by CRM exit-check |
| `embeddings` | UNO Q (enrollment), CRM (delete only) | UNO Q | 512-d MobileFaceNet, `model_name = 'mobilefacenet'` |
| `enrollment_requests` | CRM | UNO Q | `PENDING → DONE / FAILED`; UNO Q polls every 1.5 s |
| `camera_tracks` | **Raspberry Pi** (+ CRM sets `customer_id`, `visit_id`) | CRM | one row per (`camera_id`, `raw_track_id`), see below |
| `occupancy` | Raspberry Pi | CRM | current count per camera / floor (upsert) |
| `occupancy_logs` | Raspberry Pi | CRM | history, e.g. one row per camera per minute |
| `device_status` | UNO Q, Raspberry Pi | CRM | heartbeat every 30 s; offline after 90 s |
| `app_settings` | CRM (owner) | CRM | camera IDs, cashier ROI, θ, weights, capacities, retention |
| `customers`, `menu`, `orders`, `transactions`, `users` | CRM | CRM | `orders.transaction_id` always set |

Migration: run `database/004_integration.sql` once in Supabase SQL Editor (idempotent).

## Raspberry Pi → `camera_tracks` (what the person-tracking code must write)

Upsert at ~1–2 Hz per active track (not every frame), keyed by `(camera_id, raw_track_id)`:

| Column | Value |
|---|---|
| `camera_id` | e.g. `CAM_1` (must match *Pengaturan → Perangkat → ID kamera area* for the camera that sees the cashier) |
| `raw_track_id` | the stable ID of the person (after ReID across cameras, the global ID) |
| `global_id` | ReID identity shared across cameras (same as `raw_track_id` if only one ID is used) |
| `pos_x`, `pos_y` | foot point (bottom-centre of the box) in that camera's pixels |
| `velocity_x`, `velocity_y` | px/s, smoothed over ~0.5 s |
| `status` | `ACTIVE` while seen, `LOST` when temporarily missing, `EXITED` when the person left through the exit zone |
| `floor` | 1 or 2 |
| `last_seen_at` | `NOW()` at each update |

Never overwrite `customer_id`, `visit_id`, `association_*` — the CRM owns those columns.

## Identity association (Customer ID ↔ Track ID)

1. The UNO Q confirms a customer (3 of 5 frames ≥ τ) and calls
   `POST /api/association/bind {customer_id, face_timestamp}` with header `x-device-key: $DEVICE_API_KEY`.
2. The CRM takes tracks of the area camera **inside the cashier ROI**, seen within 30 s, not bound
   to another customer, and scores each:
   `S = 0.5·exp(−d²/2·200²) + 0.3·exp(−v²/2·50²) + 0.2·exp(−Δt²/2·3²)`
   (d = distance to the cashier anchor point, v = speed, Δt = time gap; values in *Pengaturan*).
3. `S ≥ θ (0.60)` **and** best − second ≥ 0.10 → bound automatically (`association_mode = AUTO`),
   `visits.track_id_aktif` set. Otherwise (`LOW_SCORE`, `AMBIGUOUS` queue, `NO_CANDIDATES`)
   the cashier confirms via `/api/association/candidates` + `/api/association/confirm` (`MANUAL`).
4. When that track becomes `EXITED` or is not seen for `exit_timeout_minutes`, the CRM closes the
   visit with `exit_time = last_seen_at` → visit duration.

## HTTP endpoints for devices

| Endpoint | Auth | Caller |
|---|---|---|
| `POST /api/association/bind` | `x-device-key` | UNO Q |
| `POST /api/visits/exit-check` | `x-device-key` | Raspberry Pi (optional, after marking tracks `EXITED`) |

## Environment variables

| Where | Variable |
|---|---|
| Vercel (CRM) | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `DEVICE_API_KEY` |
| UNO Q `uno_q/.env` | `DATABASE_URL`, `CAMERA_ID`, `CRM_URL`, `DEVICE_API_KEY`, recognition parameters |
| Raspberry Pi | `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` (or `DATABASE_URL`), `CAMERA_ID`, `FLOOR` |
