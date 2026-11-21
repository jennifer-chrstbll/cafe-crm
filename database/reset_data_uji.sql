-- =====================================================================
-- reset_data_uji.sql : bersihkan data uji sebelum hari pengujian
-- Jalankan di Supabase -> SQL Editor. Jalankan BAGIAN 1 dulu, lihat
-- hasilnya, baru BAGIAN 2. Bagian 3 untuk memastikan hasilnya benar.
--
-- DIHAPUS : pelanggan (kecuali "Tamu (walk-in)"), data wajah, kunjungan,
--           transaksi, pesanan, log pengenalan, jejak pelacakan, okupansi,
--           permintaan daftar wajah, perintah perangkat, gambar terakhir.
-- DISIMPAN: akun staf/pemilik (users), menu, semua pengaturan
--           (app_settings: tata letak kamera, nama kamera, jaringan, dll.),
--           status perangkat, baris pelanggan Tamu (wajib ada untuk Kasir).
-- =====================================================================


-- ── BAGIAN 1: lihat dulu (tidak mengubah apa pun) ────────────────────
SELECT 'pelanggan (selain Tamu)' AS data, COUNT(*) AS jumlah FROM customers
 WHERE customer_id <> '00000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'data wajah',            COUNT(*) FROM embeddings
UNION ALL SELECT 'kunjungan',             COUNT(*) FROM visits
UNION ALL SELECT 'transaksi',             COUNT(*) FROM transactions
UNION ALL SELECT 'pesanan',               COUNT(*) FROM orders
UNION ALL SELECT 'log pengenalan',        COUNT(*) FROM recognition_logs
UNION ALL SELECT 'jejak pelacakan',       COUNT(*) FROM camera_tracks
UNION ALL SELECT 'okupansi (riwayat)',    COUNT(*) FROM occupancy_logs
UNION ALL SELECT 'permintaan daftar',     COUNT(*) FROM enrollment_requests
UNION ALL SELECT 'perintah perangkat',    COUNT(*) FROM device_commands
UNION ALL SELECT '-- DISIMPAN: menu',     COUNT(*) FROM menu
UNION ALL SELECT '-- DISIMPAN: akun',     COUNT(*) FROM users
UNION ALL SELECT '-- DISIMPAN: pengaturan', COUNT(*) FROM app_settings;


-- ── BAGIAN 2: hapus (semua atau tidak sama sekali) ───────────────────
BEGIN;
DELETE FROM orders;
DELETE FROM transactions;
DELETE FROM recognition_logs;
DELETE FROM camera_tracks;
DELETE FROM visits;
DELETE FROM enrollment_requests;
DELETE FROM embeddings;
DELETE FROM customers WHERE customer_id <> '00000000-0000-0000-0000-000000000001';
DELETE FROM occupancy_logs;
DELETE FROM occupancy;
DELETE FROM device_commands;
DELETE FROM device_frames;
-- Baris Tamu harus tetap ada (dibuat ulang bila hilang).
INSERT INTO customers (customer_id, name, is_active, consent_given)
VALUES ('00000000-0000-0000-0000-000000000001', 'Tamu (walk-in)', FALSE, FALSE)
ON CONFLICT (customer_id) DO NOTHING;
COMMIT;


-- ── BAGIAN 3: periksa hasilnya ───────────────────────────────────────
-- Harus: pelanggan = 1 (hanya Tamu), yang lain 0, menu/akun/pengaturan tetap.
SELECT 'pelanggan (termasuk Tamu)' AS data, COUNT(*) AS jumlah FROM customers
UNION ALL SELECT 'kunjungan', COUNT(*) FROM visits
UNION ALL SELECT 'transaksi', COUNT(*) FROM transactions
UNION ALL SELECT 'data wajah', COUNT(*) FROM embeddings
UNION ALL SELECT 'menu', COUNT(*) FROM menu
UNION ALL SELECT 'akun', COUNT(*) FROM users
UNION ALL SELECT 'pengaturan', COUNT(*) FROM app_settings;

-- Ukuran database (paket Free: batas 500 MB)
SELECT pg_size_pretty(pg_database_size(current_database())) AS ukuran_database;
