-- =====================================================
-- MIGRATION 002: Identity Association, Camera Tracking,
-- Occupancy, Transaction State Machine, Consent, Staff Embedding
-- =====================================================
-- Menutup gap Fase 0 supaya skema mendukung inti skripsi:
-- Track ID <-> Customer ID association, consent enrollment,
-- occupancy dashboard, dan alur transaksi pay-now/pay-later.
-- Jalankan setelah schema.sql (001).

BEGIN;

-- =====================================================
-- ENUMS BARU
-- =====================================================

CREATE TYPE transaction_status AS ENUM (
    'UNPAID',
    'PAID',
    'CANCELLED'
);

CREATE TYPE track_status AS ENUM (
    'ACTIVE',
    'LOST',
    'ASSOCIATED'
);

-- =====================================================
-- CUSTOMERS: consent (Batasan Masalah #13)
-- =====================================================

ALTER TABLE customers
    ADD COLUMN consent_given BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN consent_given_at TIMESTAMPTZ;

-- =====================================================
-- EMBEDDINGS: dukung embedding staff untuk verifikasi role
-- (Batasan Masalah #8) tanpa mengubah pemakaian existing
-- untuk customer.
-- =====================================================

ALTER TABLE embeddings
    ALTER COLUMN customer_id DROP NOT NULL,
    ADD COLUMN user_id UUID,
    ADD CONSTRAINT fk_embeddings_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT chk_embeddings_owner
        CHECK (
            (customer_id IS NOT NULL AND user_id IS NULL)
            OR (customer_id IS NULL AND user_id IS NOT NULL)
        );

-- =====================================================
-- VISITS: track_id_aktif (pemetaan cepat Track ID <-> Visit
-- yang sedang berlangsung, dipakai saat customer balik ke
-- kasir tanpa perlu scan wajah ulang)
-- =====================================================

ALTER TABLE visits
    ADD COLUMN track_id_aktif VARCHAR(50);

CREATE INDEX idx_visits_track_id_aktif
ON visits(track_id_aktif);

-- =====================================================
-- CAMERA TRACKS (jantung Fase 2-4: Track ID, posisi,
-- kecepatan dari BoT-SORT, dan hasil identity association)
-- =====================================================

CREATE TABLE camera_tracks (
    camera_track_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    visit_id UUID,

    camera_id VARCHAR(50) NOT NULL,

    raw_track_id VARCHAR(50) NOT NULL,

    pos_x FLOAT,
    pos_y FLOAT,

    velocity_x FLOAT,
    velocity_y FLOAT,

    status track_status NOT NULL DEFAULT 'ACTIVE',

    -- skor S_ij (Persamaan 2.3) pada saat asosiasi ditetapkan,
    -- disimpan untuk evaluasi akurasi identity association di Bab IV
    association_score FLOAT,

    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_camera_tracks_visit
        FOREIGN KEY (visit_id)
        REFERENCES visits(visit_id)
        ON DELETE SET NULL
);

-- =====================================================
-- OCCUPANCY LOGS (Fase 5, 9: panel occupancy dashboard)
-- =====================================================

CREATE TABLE occupancy_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    camera_id VARCHAR(50) NOT NULL,

    person_count INTEGER NOT NULL CHECK (person_count >= 0),

    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TRANSACTIONS (dipisah dari Orders supaya mendukung
-- pay-now/pay-later dan edit-order-sebelum-bayar, Fase 5)
-- =====================================================

CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    visit_id UUID NOT NULL,

    status transaction_status NOT NULL DEFAULT 'UNPAID',

    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,

    payment_method VARCHAR(50),

    paid_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_transactions_visit
        FOREIGN KEY (visit_id)
        REFERENCES visits(visit_id)
        ON DELETE CASCADE
);

-- =====================================================
-- ORDERS: link ke Transactions.
-- transaction_id NULL  -> order masih terbuka/bisa diedit (unpaid cart)
-- transaction_id terisi -> order terkunci, sudah dibayar
-- Penguncian ("tidak bisa diedit setelah transaction_id terisi")
-- ditegakkan di application layer (service), bukan di level DB,
-- supaya pesan error tetap ramah untuk kasir.
-- =====================================================

ALTER TABLE orders
    ADD COLUMN transaction_id UUID,
    ADD CONSTRAINT fk_orders_transaction
        FOREIGN KEY (transaction_id)
        REFERENCES transactions(transaction_id)
        ON DELETE SET NULL;

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_camera_tracks_visit
ON camera_tracks(visit_id);

CREATE INDEX idx_camera_tracks_camera
ON camera_tracks(camera_id);

CREATE INDEX idx_camera_tracks_status
ON camera_tracks(status);

CREATE INDEX idx_camera_tracks_raw_track
ON camera_tracks(camera_id, raw_track_id);

CREATE INDEX idx_occupancy_logs_camera
ON occupancy_logs(camera_id);

CREATE INDEX idx_occupancy_logs_recorded
ON occupancy_logs(recorded_at);

CREATE INDEX idx_transactions_visit
ON transactions(visit_id);

CREATE INDEX idx_transactions_status
ON transactions(status);

CREATE INDEX idx_orders_transaction
ON orders(transaction_id);

CREATE INDEX idx_embeddings_user
ON embeddings(user_id);

COMMIT;
