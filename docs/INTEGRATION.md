# Integration contract: CRM · face recognition · person tracking

Three programs, one database (Supabase Postgres). The website never talks to a device
directly: it runs in the cloud over HTTPS and cannot reach the cafe LAN. Devices only make
outbound connections, so nothing needs port forwarding.

```
 CASHIER                                   CEILING (~3 m)                      ANYWHERE (back office)
 face webcam ─USB-C hub─ Arduino UNO Q     area webcam(s) / IP CCTV ─────────── Raspberry Pi 5
 cafe_facerec/uno_q/facerec_uno_q.py                                           DEPLOY/RaspberryPi5/cafe_pi.py
   SCRFD + MobileFaceNet + vault + FAISS                                         YOLO11n + ByteTrack + OSNet
        │  face event (LAN, HTTP :8765, X-Auth-Token)  ───────────────────────────▶ │
        │                                                                           │
        └──────────── Supabase (internet) ◀────────────────────────────────────────┘
                              ▲
               CRM website (Vercel)  ⇄  browser: iPad (cashier), laptop (owner)
```

| Link | Direction | How |
|---|---|---|
| Face recognised → body at the cashier | UNO Q → Pi | `POST http://<pi-ip>:8765/wajah` `{customer_id, score, label}` with `X-Auth-Token: FACE_TOKEN`. Pi uses the arrival time (LAN latency ms), so the boards' clocks do not matter for this |
| Everything else | device ↔ Supabase | PostgreSQL (`DATABASE_URL`, Session pooler) |
| Website | browser ↔ Vercel ↔ Supabase | session cookie; service_role key on the server only |

Migrations: run `database/004_integration.sql`, then `database/005_devices.sql` (both idempotent).

## Tables

| Table | Written by | Read by | Notes |
|---|---|---|---|
| `recognition_logs` | UNO Q | CRM | one row per decision of a face *session* (not per frame); known customers at most every 30 s |
| `embeddings` | UNO Q (enrollment), CRM (delete) | UNO Q | 5 per customer, `model_name = 'mbf-scrfd-v2'`, vault-protected (rotated); other model names are ignored by the UNO Q and listed as "perlu daftar ulang" |
| `enrollment_requests` | CRM | UNO Q | `PENDING → RUNNING → DONE / FAILED`; created only after consent |
| `visits` | UNO Q, Pi, CRM | all | always through `get_or_create_visit()`; closed by the Pi (`close_visit`, `exit_reason`) or by the CRM fallback |
| `camera_tracks` | Pi | CRM | one row per person per camera per Pi run (`raw_track_id = "<run>:<GT-id>"`), ~1 Hz; the Pi owns `customer_id`, `visit_id`, `association_*` |
| `occupancy`, `occupancy_logs` | Pi | CRM | people per camera now (staff excluded) / once a minute |
| `device_status` | UNO Q, Pi | CRM | heartbeat every 10 s; offline after 45 s; `info` = cameras, fps, gallery, open questions |
| `device_commands` | CRM | UNO Q, Pi | `self_check`, `restart`, `reload_gallery` (owner); `assign`, `unassign` (staff); ignored when older than 2 min |
| `device_frames` | CRM (`wanted_until`), devices (JPEG) | CRM | newest JPEG per camera, only while a page watches; overwritten, never a recording. 1/s while the Realtime stream works, ~3/s when it does not (fallback) |
| `app_settings` | CRM (owner) | CRM, devices | `camera_sources`, `camera_layout`, `devices.cashier_camera_id`, `visits`, `privacy`, `tracking.visit_gap_sec` (Pi), `stream` (live view, below), `network` (UNO Q: where to send face events: `auto` = the Pi's own address from its heartbeat `info.network.lan_ip`, `manual` = typed URL, `env` = PI_FACE_URL) |

### Live view
1. **Direct (main path).** Each device runs `livecast.py` on 127.0.0.1 and a cloudflared quick tunnel;
   its heartbeat `info.live` = `{url, token, state, viewers, fps_max}`. `GET /api/cameras/live?key=`
   (logged-in users) turns it into `wss://<tunnel>/live?cam=<camera>&token=<token>`; the browser adds
   `fps`, `w`, `q`. Binary messages: 4-byte header length, JSON `{o: overlay, w, h, s, t}`, JPEG. The
   browser answers `"a"` for every picture shown; the device keeps at most 2 unconfirmed. Raw camera
   frames; overlay = newest tracking result (Pi boxes moved by `vel` × age, max 0.5 s; UNO Q `faces`
   and `status` are drawn by the browser).
2. **Fallback: Supabase Realtime Broadcast**, `app_settings.stream` =
   `{ "url": "https://<project>.supabase.co", "key": "<anon key>", "topic": "cam-<32 random hex>" }`,
   created by the CRM the first time a logged-in user opens a camera page. While
   `device_frames.wanted_until` is in the future, each device POSTs its newest processed frame to
   `{url}/realtime/v1/api/broadcast` (`event: "frame"`, payload `{k, img, w, h, o, t}`), 8–10/s with
   people/faces in view, 2/s otherwise, at most `STREAM_MONTHLY_MB` (300) per device per month
   (`data/stream_budget.json`), because Realtime traffic counts toward Supabase egress.
3. **Fallback: `device_frames`**, polled by the page.
The page uses 2 and 3 only while 1 delivers nothing for 3 s, and then marks the camera watched.

### `app_settings.camera_sources`
```json
{ "uno-q-001": { "face":  { "source": "/dev/v4l/by-id/usb-...-video-index0" } },
  "pi-001":    { "CAM_1": { "source": "/dev/v4l/by-id/usb-046d_0825_...-video-index0", "floor": 1, "enabled": true },
                 "CAM_2": { "source": "rtsp://user:pass@192.168.1.50:554/stream1", "floor": 2 } } }
```
No entry = the device's default (`CAMERA_SOURCE` / `CAM_1_SOURCE`, "auto" = first free webcam).
The UNO Q switches camera live; the Pi restarts itself (systemd) when its cameras change.

### `app_settings.camera_layout` (fractions of the image, 0..1)
```json
{ "CAM_1": { "cashier": { "x": 0.27, "y": 0.47, "r": 0.09 },
             "staff":      [ { "x1": 0.17, "y1": 0.25, "x2": 0.27, "y2": 0.42 } ],
             "exit":       [ { "x1": 0.85, "y1": 0.30, "x2": 1.00, "y2": 1.00 } ],
             "transition": [],
             "updated_at": "2026-11-04T10:00:00Z" } }
```
`r` is the radius as a fraction of the image width. The Pi reloads it within 3 s.

## Face → body (on the Pi, `identity/face_binding.py`)

For every body *j* in the camera with the cashier point, at the frame the face event arrives:
*d_j* = |foot − Q| / body height, *v_j* = speed / body height,
*L_j* = exp(−d²/2·0.25²) · exp(−v²/2·0.6²), *P_j* = *L_j* / (Σ*L* + exp(−2.5²/2)).
Bind if the body is inside the circle, not staff, not someone else's, *P* ≥ 0.85, and the same body
wins 2 face events in a row. Otherwise the Pi publishes a question (`device_status.info.prompts`);
the CRM shows it on *Kasir* and *Kamera*, and the cashier taps the person (`assign`).

## Visit lifecycle

1. UNO Q recognises the customer → `get_or_create_visit(customer)`.
2. Pi binds the face to a body → the same function (returns that visit), `entry_time` moved back
   to when that body was first seen (the door), `track_id_aktif` set.
3. The body is lost and not recovered → Pi `close_visit(exit = last seen, reason = EXIT_ZONE`
   if last seen in a door area, else `LOST`). Coming back within 30 min reopens the same visit.
4. Cashier un-assigns a wrong body → the visit is kept if the customer was recognised or ordered,
   otherwise deleted (it only came from the wrong tap).
5. Fallback in the CRM: newest track of the visit silent for `exit_timeout_minutes` → `TIMEOUT`;
   open longer than `max_open_hours` → closed at the last order. Walk-in guests: `PAID`.

## Environment variables

| Where | Variables |
|---|---|
| Vercel (CRM) | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET` (≥ 32 chars). `DEVICE_API_KEY` only for `POST /api/visits/exit-check` |
| UNO Q `.env` | `DATABASE_URL`, `CAMERA_ID` (= CRM "ID kamera kasir"), `VAULT_KEY` (back it up), `PI_FACE_URL`, `FACE_TOKEN` |
| Pi `.env` | `DATABASE_URL`, `PI_DEVICE_ID`, `FACE_TOKEN` (same as UNO Q), `CAM_1_SOURCE` (until chosen in the CRM) |
