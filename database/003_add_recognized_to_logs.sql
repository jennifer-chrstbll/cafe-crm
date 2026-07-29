-- =====================================================
-- MIGRATION 003: Add recognized column to recognition_logs
-- =====================================================
-- Menyesuaikan schema DB dengan SQLAlchemy model RecognitionLog
-- dan LogService.create_log().
-- Jalankan setelah 002_identity_association.sql (atau ikuti schema.sql 001 terbaru).

BEGIN;

ALTER TABLE recognition_logs
    ADD COLUMN IF NOT EXISTS recognized BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
