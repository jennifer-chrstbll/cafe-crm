-- =====================================================================
-- export_hasil_uji.sql : ambil hasil uji dari database (tanpa mencatat manual)
-- Supabase -> SQL Editor. Jalankan SATU kueri (blok antar garis) sekali,
-- lalu klik "Download" -> CSV. Simpan ke folder hari itu, mis.
-- D:\UjiTA\Hari1\db\kunjungan.csv. Semua jam dalam WIB (Asia/Jakarta).
-- Data hanya dari pengujian karena database dibersihkan sebelum uji
-- (reset_data_uji.sql). Nama pelanggan memakai kode peserta (P1 ..., S1 ...).
-- =====================================================================

-- ── 1. kunjungan.csv : masuk, keluar, durasi, alasan keluar (skenario F) ──
SELECT c.name AS pelanggan,
       v.entry_time AT TIME ZONE 'Asia/Jakarta' AS masuk,
       v.exit_time  AT TIME ZONE 'Asia/Jakarta' AS keluar,
       v.duration_minutes AS durasi_menit,
       v.exit_reason AS alasan_keluar,
       v.track_id_aktif AS track,
       v.visit_id
  FROM visits v JOIN customers c USING (customer_id)
 ORDER BY v.entry_time;

-- ── 2. pengenalan.csv : keputusan wajah yang masuk database (skenario B, E) ──
-- (Pelanggan yang sama dicatat paling sering tiap 30 detik; daftar lengkap tiap
--  percobaan ada di UNO Q: data/decisions.csv.)
SELECT r.created_at AT TIME ZONE 'Asia/Jakarta' AS waktu,
       COALESCE(c.name, '(tidak dikenal)') AS pelanggan,
       ROUND(r.similarity_score::numeric, 3) AS skor,
       r.recognized AS dikenali,
       r.camera_id AS kamera
  FROM recognition_logs r LEFT JOIN customers c USING (customer_id)
 ORDER BY r.created_at;

-- ── 3. transaksi.csv : pesanan per kunjungan (skenario G) ──
SELECT t.created_at AT TIME ZONE 'Asia/Jakarta' AS waktu,
       c.name AS pelanggan,
       t.status, t.total_amount AS total, t.payment_method AS bayar,
       string_agg(m.name || ' x' || o.qty, ', ' ORDER BY m.name) AS pesanan
  FROM transactions t
  JOIN visits v ON v.visit_id = t.visit_id
  JOIN customers c ON c.customer_id = v.customer_id
  LEFT JOIN orders o ON o.transaction_id = t.transaction_id
  LEFT JOIN menu m ON m.menu_id = o.menu_id
 GROUP BY t.transaction_id, t.created_at, c.name, t.status, t.total_amount, t.payment_method
 ORDER BY t.created_at;

-- ── 4. pelacakan.csv : setiap orang per kamera, ID lintas kamera, nama (skenario C, D, E) ──
SELECT ct.camera_id AS kamera,
       ct.raw_track_id AS track,
       ct.global_id AS id_global,
       COALESCE(c.name, '') AS pelanggan,
       ct.association_mode AS cara_asosiasi,
       ROUND(ct.association_score::numeric, 3) AS peluang,
       ct.associated_at AT TIME ZONE 'Asia/Jakarta' AS waktu_asosiasi,
       ct.first_seen_at AT TIME ZONE 'Asia/Jakarta' AS pertama_terlihat,
       ct.last_seen_at  AT TIME ZONE 'Asia/Jakarta' AS terakhir_terlihat,
       ROUND(EXTRACT(EPOCH FROM (ct.last_seen_at - ct.first_seen_at))::numeric, 1) AS lama_detik,
       ct.status
  FROM camera_tracks ct LEFT JOIN customers c USING (customer_id)
 ORDER BY ct.first_seen_at;

-- ── 5. okupansi.csv : jumlah orang per kamera tiap menit (skenario C5) ──
SELECT recorded_at AT TIME ZONE 'Asia/Jakarta' AS waktu, camera_id AS kamera, person_count AS orang
  FROM occupancy_logs ORDER BY recorded_at;

-- ── 6. pendaftaran.csv : pendaftaran wajah (skenario A) ──
SELECT e.created_at   AT TIME ZONE 'Asia/Jakarta' AS diminta,
       e.completed_at AT TIME ZONE 'Asia/Jakarta' AS selesai,
       ROUND(EXTRACT(EPOCH FROM (e.completed_at - e.created_at))::numeric, 1) AS lama_detik,
       c.name AS pelanggan, e.status, e.message AS pesan, e.n_frames AS jumlah_foto
  FROM enrollment_requests e JOIN customers c USING (customer_id)
 ORDER BY e.created_at;

-- ── 7. ringkasan_pelanggan.csv : kunjungan & transaksi per peserta (skenario G2-G4) ──
SELECT c.name AS pelanggan,
       (SELECT COUNT(*) FROM visits v WHERE v.customer_id = c.customer_id) AS kunjungan,
       (SELECT COUNT(*) FROM transactions t JOIN visits v USING (visit_id) WHERE v.customer_id = c.customer_id) AS transaksi,
       (SELECT ROUND(AVG(v.duration_minutes), 1) FROM visits v WHERE v.customer_id = c.customer_id) AS rata_durasi_menit,
       (SELECT COUNT(*) FROM embeddings e WHERE e.customer_id = c.customer_id) AS foto_wajah
  FROM customers c
 WHERE c.customer_id <> '00000000-0000-0000-0000-000000000001'
 ORDER BY c.name;

-- ── 8. ukuran database (cek di akhir hari; batas paket Free 500 MB) ──
SELECT pg_size_pretty(pg_database_size(current_database())) AS ukuran_database;
