-- =====================================================================
-- MIGRATION 005: device management from the CRM
--   * commands for the edge devices (self-check, restart, manual identity)
--   * live camera frames on demand (layout editor, Kamera page)
--   * one shared "get or create visit" rule for CRM, UNO Q and Raspberry Pi
--   * how a visit ended (exit door, identity lost, timeout, manual)
-- =====================================================================
-- Requires 004_integration.sql. Safe to run more than once.
-- Run it in Supabase -> SQL Editor. The CRM's /api/health reports
-- "migration_005": false until it has been applied.
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Commands: CRM -> device (polled by the device every ~1 s) ─────────
CREATE TABLE IF NOT EXISTS device_commands (
    command_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id    TEXT NOT NULL,                 -- e.g. uno-q-001, pi-001
    command      TEXT NOT NULL,                 -- self_check | restart | reload_gallery | assign | unassign
    payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
    status       TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | RUNNING | DONE | FAILED
    message      TEXT,
    result       JSONB,
    created_by   UUID,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at   TIMESTAMPTZ,
    finished_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_device_commands_pending ON device_commands(device_id, status, created_at);

-- ── Live frames: newest JPEG per camera, uploaded only while someone watches ──
-- The CRM sets wanted_until = NOW() + 30 s while a page shows the camera; the
-- device uploads ~1 frame/s until then and stops by itself afterwards.
CREATE TABLE IF NOT EXISTS device_frames (
    camera_key   TEXT PRIMARY KEY,              -- "<device_id>/<camera>", e.g. pi-001/CAM_1, uno-q-001/face
    device_id    TEXT NOT NULL,
    camera       TEXT NOT NULL,
    jpeg_b64     TEXT,
    width        INTEGER,
    height       INTEGER,
    overlay      JSONB NOT NULL DEFAULT '{}'::jsonb,   -- people boxes, names, pending identity questions
    captured_at  TIMESTAMPTZ,
    wanted_until TIMESTAMPTZ
);

-- ── Visits: how they ended ───────────────────────────────────────────
ALTER TABLE visits ADD COLUMN IF NOT EXISTS exit_reason VARCHAR(20);   -- EXIT_ZONE | LOST | TIMEOUT | MANUAL

-- ── One visit rule for everybody ─────────────────────────────────────
-- Returns the customer's current visit, creating it if needed:
--   1. an open visit (exit_time IS NULL) that started < p_max_open_hours ago -> that one
--   2. else a visit that ended < p_reopen_minutes ago -> reopened (stepped out and came back)
--   3. else a new visit starting at p_entry (never in the future)
-- The advisory lock makes concurrent callers (UNO Q recognising, Pi binding,
-- CRM ordering) agree on the same row instead of creating duplicates.
CREATE OR REPLACE FUNCTION get_or_create_visit(
    p_customer       UUID,
    p_max_open_hours INTEGER DEFAULT 6,
    p_reopen_minutes INTEGER DEFAULT 30,
    p_entry          TIMESTAMPTZ DEFAULT NOW()
) RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
    v UUID;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('visit:' || p_customer::text));

    SELECT visit_id INTO v FROM visits
     WHERE customer_id = p_customer AND exit_time IS NULL
       AND entry_time > NOW() - make_interval(hours => p_max_open_hours)
     ORDER BY entry_time DESC LIMIT 1;
    IF v IS NOT NULL THEN
        RETURN v;
    END IF;

    SELECT visit_id INTO v FROM visits
     WHERE customer_id = p_customer AND exit_time IS NOT NULL
       AND exit_time > NOW() - make_interval(mins => p_reopen_minutes)
     ORDER BY exit_time DESC LIMIT 1;
    IF v IS NOT NULL THEN
        UPDATE visits SET exit_time = NULL, duration_minutes = NULL, exit_reason = NULL
         WHERE visit_id = v;
        RETURN v;
    END IF;

    INSERT INTO visits (customer_id, entry_time)
    VALUES (p_customer, LEAST(COALESCE(p_entry, NOW()), NOW()))
    RETURNING visit_id INTO v;
    RETURN v;
END $$;

-- Close a visit once (no-op if it is already closed). Duration in whole minutes.
CREATE OR REPLACE FUNCTION close_visit(
    p_visit  UUID,
    p_exit   TIMESTAMPTZ,
    p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
DECLARE
    n INTEGER;
BEGIN
    UPDATE visits
       SET exit_time = GREATEST(p_exit, entry_time),
           duration_minutes = GREATEST(0, ROUND(EXTRACT(EPOCH FROM (GREATEST(p_exit, entry_time) - entry_time)) / 60.0))::INTEGER,
           exit_reason = p_reason
     WHERE visit_id = p_visit AND exit_time IS NULL;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n > 0;
END $$;

-- ── Default settings for the new features ────────────────────────────
-- camera_sources: which physical camera each device uses for each role.
-- camera_layout : cashier point, staff areas, exit areas, camera-change areas per area camera
--                 (all coordinates normalised 0..1 of the image).
INSERT INTO app_settings (key, value) VALUES
    ('camera_sources', '{}'::jsonb),
    ('camera_layout',  '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ── Row Level Security (same policy as 004: server and devices only) ──
ALTER TABLE device_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_frames   ENABLE ROW LEVEL SECURITY;

COMMIT;
