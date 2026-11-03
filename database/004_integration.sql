-- =====================================================================
-- MIGRATION 004: integration of CRM + face recognition (Arduino UNO Q)
--                + person tracking (Raspberry Pi 5)
-- =====================================================================
-- Safe to run more than once (everything is IF NOT EXISTS / idempotent),
-- whatever older script the live database was created from (schema.sql
-- alone, or schema.sql + 002 + 003).
--
-- Run it once in Supabase -> SQL Editor. The CRM's /api/health reports
-- "migration_004": false until it has been applied.
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Customers: consent (UU PDP) ──────────────────────────────────────
ALTER TABLE customers ADD COLUMN IF NOT EXISTS consent_given    BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS consent_given_at TIMESTAMPTZ;

-- Walk-in guest: one system customer so orders from people who did not
-- enroll can still be recorded (visits.customer_id is NOT NULL).
-- Excluded from analytics, segments and collaborative filtering.
INSERT INTO customers (customer_id, name, is_active, consent_given)
VALUES ('00000000-0000-0000-0000-000000000001', 'Tamu (walk-in)', FALSE, FALSE)
ON CONFLICT (customer_id) DO NOTHING;

-- ── Visits: link to the person-tracking track ────────────────────────
ALTER TABLE visits ADD COLUMN IF NOT EXISTS track_id_aktif VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_visits_track_id_aktif ON visits(track_id_aktif);
CREATE INDEX IF NOT EXISTS idx_visits_open ON visits(customer_id, exit_time, entry_time);
CREATE INDEX IF NOT EXISTS idx_visits_entry ON visits(entry_time);

-- ── Transactions (pay-now / stay-in tab) ─────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id       UUID NOT NULL REFERENCES visits(visit_id) ON DELETE CASCADE,
    status         VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    total_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50),
    paid_at        TIMESTAMPTZ,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS label VARCHAR(60);   -- e.g. "Meja 4" for a walk-in tab
CREATE INDEX IF NOT EXISTS idx_transactions_visit  ON transactions(visit_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_paid   ON transactions(paid_at);

-- ── Orders belong to exactly one transaction ─────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transaction_id UUID;
DO $$ BEGIN
    ALTER TABLE orders ADD CONSTRAINT fk_orders_transaction
        FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_orders_transaction ON orders(transaction_id);
CREATE INDEX IF NOT EXISTS idx_orders_created     ON orders(created_at);

-- Backfill: old orders without a transaction get attached to the
-- transaction of the same visit (or a PAID one is created for them).
INSERT INTO transactions (visit_id, status, total_amount, payment_method, paid_at, created_at)
SELECT o.visit_id, 'PAID', SUM(o.subtotal), 'UNKNOWN', MIN(o.created_at), MIN(o.created_at)
FROM orders o
WHERE o.transaction_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.visit_id = o.visit_id)
GROUP BY o.visit_id;

UPDATE orders o
SET transaction_id = (
    SELECT t.transaction_id FROM transactions t
    WHERE t.visit_id = o.visit_id
    ORDER BY (t.status = 'UNPAID') DESC, t.created_at
    LIMIT 1)
WHERE o.transaction_id IS NULL;

-- At most one open tab per visit (keeps "add to tab" unambiguous).
DO $$ BEGIN
    CREATE UNIQUE INDEX ux_transactions_one_unpaid_per_visit
        ON transactions(visit_id) WHERE status = 'UNPAID';
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN unique_violation THEN
        RAISE NOTICE 'Several UNPAID transactions share a visit; unique index skipped. Settle them, then re-run.';
END $$;

-- ── Recognition logs (written by the UNO Q) ──────────────────────────
ALTER TABLE recognition_logs ADD COLUMN IF NOT EXISTS recognized BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE recognition_logs ADD COLUMN IF NOT EXISTS is_correct BOOLEAN;
ALTER TABLE recognition_logs ADD COLUMN IF NOT EXISTS visit_id   UUID;
CREATE INDEX IF NOT EXISTS idx_logs_camera_created ON recognition_logs(camera_id, created_at DESC);

-- ── Embeddings ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_embeddings_customer ON embeddings(customer_id);

-- ── Enrollment requests: CRM (HTTPS, cloud) -> UNO Q (cafe LAN) ──────
-- The website cannot reach the UNO Q directly from Vercel, so it queues a
-- request here; the UNO Q picks it up, captures the face template and
-- inserts the embedding itself.
CREATE TABLE IF NOT EXISTS enrollment_requests (
    request_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id  UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    camera_id    VARCHAR(50) NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING | DONE | FAILED
    message      TEXT,
    n_frames     INTEGER,
    created_by   UUID,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_enroll_pending ON enrollment_requests(camera_id, status, created_at);

-- ── Person tracking (written by the Raspberry Pi 5) ──────────────────
CREATE TABLE IF NOT EXISTS camera_tracks (
    camera_track_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id          UUID REFERENCES visits(visit_id) ON DELETE SET NULL,
    camera_id         VARCHAR(50) NOT NULL,
    raw_track_id      VARCHAR(50) NOT NULL,
    pos_x             FLOAT,
    pos_y             FLOAT,
    velocity_x        FLOAT,
    velocity_y        FLOAT,
    status            VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | LOST | EXITED
    association_score FLOAT,
    first_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Migration 002 declared status as an enum without 'EXITED': widen it to text.
DO $$ BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'camera_tracks' AND column_name = 'status') = 'USER-DEFINED' THEN
        ALTER TABLE camera_tracks ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE camera_tracks ALTER COLUMN status TYPE VARCHAR(20) USING status::text;
        ALTER TABLE camera_tracks ALTER COLUMN status SET DEFAULT 'ACTIVE';
    END IF;
END $$;
ALTER TABLE camera_tracks ADD COLUMN IF NOT EXISTS customer_id     UUID;
ALTER TABLE camera_tracks ADD COLUMN IF NOT EXISTS global_id       VARCHAR(50);   -- ReID identity across cameras
ALTER TABLE camera_tracks ADD COLUMN IF NOT EXISTS floor           INTEGER;
ALTER TABLE camera_tracks ADD COLUMN IF NOT EXISTS associated_at   TIMESTAMPTZ;
ALTER TABLE camera_tracks ADD COLUMN IF NOT EXISTS association_mode VARCHAR(10); -- AUTO | MANUAL
DO $$ BEGIN
    CREATE UNIQUE INDEX ux_camera_tracks_camera_raw ON camera_tracks(camera_id, raw_track_id);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN unique_violation THEN RAISE NOTICE 'Duplicate (camera_id, raw_track_id) rows; unique index skipped.';
END $$;
CREATE INDEX IF NOT EXISTS idx_camera_tracks_seen   ON camera_tracks(camera_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_camera_tracks_visit  ON camera_tracks(visit_id);
CREATE INDEX IF NOT EXISTS idx_camera_tracks_global ON camera_tracks(global_id);

-- Current people per camera/floor (upserted by the Pi)
CREATE TABLE IF NOT EXISTS occupancy (
    camera_id    TEXT PRIMARY KEY,
    floor        INTEGER NOT NULL,
    person_count INTEGER NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);
-- History for the owner's charts and the occupancy-accuracy evaluation
CREATE TABLE IF NOT EXISTS occupancy_logs (
    log_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camera_id    VARCHAR(50) NOT NULL,
    person_count INTEGER NOT NULL CHECK (person_count >= 0),
    recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE occupancy_logs ADD COLUMN IF NOT EXISTS floor INTEGER;
CREATE INDEX IF NOT EXISTS idx_occupancy_logs_recorded ON occupancy_logs(recorded_at);

-- ── Device heartbeats (UNO Q, Raspberry Pi) ──────────────────────────
CREATE TABLE IF NOT EXISTS device_status (
    device_id    TEXT PRIMARY KEY,
    kind         TEXT NOT NULL,          -- facerec | persontrack
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    info         JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ── App settings (owner-editable, key/value) ─────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
    key        TEXT PRIMARY KEY,
    value      JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO app_settings (key, value) VALUES
    ('cafe',        '{"name": "Café Lounge Gedung B", "floors": [{"floor": 1, "capacity": 20}, {"floor": 2, "capacity": 25}]}'),
    ('devices',     '{"cashier_camera_id": "uno-q-001", "area_camera_id": "CAM_1", "stream_url": "http://192.168.18.80:5001/video_feed"}'),
    ('association', '{"roi": {"x1": 0, "y1": 0, "x2": 1280, "y2": 720}, "anchor": {"x": 640, "y": 360}, "theta": 0.60, "weights": {"spatial": 0.5, "kinematic": 0.3, "temporal": 0.2}, "sigma": {"spatial": 200, "kinematic": 50, "temporal": 3}}'),
    ('visits',      '{"exit_timeout_minutes": 10, "max_open_hours": 6}'),
    ('privacy',     '{"retention_days": 90}')
ON CONFLICT (key) DO NOTHING;

-- ── Users ────────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active  BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- ── Row Level Security ───────────────────────────────────────────────
-- The anon key is public (it ships in the browser bundle). With RLS on and
-- no policies, anon/authenticated roles can read nothing; the CRM server
-- (service_role) and the edge devices (postgres role / service key) bypass RLS.
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['customers','embeddings','visits','menu','orders','transactions','users',
                             'recognition_logs','camera_tracks','occupancy','occupancy_logs',
                             'enrollment_requests','device_status','app_settings']
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

COMMIT;
