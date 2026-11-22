-- =====================================================================
-- cek_skema.sql : periksa apakah database sudah lengkap (HANYA MEMBACA)
-- Supabase -> SQL Editor -> tempel -> Run.
-- Setiap baris "KURANG" menyebut file migrasi yang perlu dijalankan.
-- Bila semua "OK", tidak ada SQL lain yang perlu dijalankan.
-- =====================================================================
WITH need(jenis, nama, berkas) AS (VALUES
  ('tabel', 'customers', 'schema.sql'), ('tabel', 'embeddings', 'schema.sql'), ('tabel', 'visits', 'schema.sql'),
  ('tabel', 'menu', 'schema.sql'), ('tabel', 'orders', 'schema.sql'), ('tabel', 'users', 'schema.sql'),
  ('tabel', 'recognition_logs', 'schema.sql'),
  ('tabel', 'transactions', '004_integration.sql'), ('tabel', 'enrollment_requests', '004_integration.sql'),
  ('tabel', 'camera_tracks', '004_integration.sql'), ('tabel', 'occupancy', '004_integration.sql'),
  ('tabel', 'occupancy_logs', '004_integration.sql'), ('tabel', 'device_status', '004_integration.sql'),
  ('tabel', 'app_settings', '004_integration.sql'),
  ('tabel', 'device_commands', '005_devices.sql'), ('tabel', 'device_frames', '005_devices.sql'),
  ('kolom', 'customers.consent_given', '004_integration.sql'), ('kolom', 'recognition_logs.recognized', '003_add_recognized_to_logs.sql'),
  ('kolom', 'orders.transaction_id', '004_integration.sql'), ('kolom', 'transactions.label', '004_integration.sql'),
  ('kolom', 'visits.track_id_aktif', '004_integration.sql'), ('kolom', 'camera_tracks.global_id', '004_integration.sql'),
  ('kolom', 'camera_tracks.customer_id', '004_integration.sql'), ('kolom', 'camera_tracks.association_mode', '004_integration.sql'),
  ('kolom', 'menu.image_url', 'schema.sql'), ('kolom', 'visits.exit_reason', '005_devices.sql'),
  ('fungsi', 'get_or_create_visit', '005_devices.sql'), ('fungsi', 'close_visit', '005_devices.sql'),
  ('baris', 'pelanggan Tamu (walk-in)', '004_integration.sql')
)
SELECT n.jenis, n.nama,
       CASE WHEN ada THEN 'OK' ELSE 'KURANG -> jalankan database/' || n.berkas END AS status
  FROM need n
  CROSS JOIN LATERAL (SELECT CASE n.jenis
      WHEN 'tabel' THEN EXISTS (SELECT 1 FROM information_schema.tables
                                 WHERE table_schema = 'public' AND table_name = n.nama)
      WHEN 'kolom' THEN EXISTS (SELECT 1 FROM information_schema.columns
                                 WHERE table_schema = 'public' AND table_name = split_part(n.nama, '.', 1)
                                   AND column_name = split_part(n.nama, '.', 2))
      WHEN 'fungsi' THEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace s ON s.oid = p.pronamespace
                                  WHERE s.nspname = 'public' AND p.proname = n.nama)
      ELSE EXISTS (SELECT 1 FROM customers WHERE customer_id = '00000000-0000-0000-0000-000000000001')
    END AS ada) x
 ORDER BY (CASE WHEN ada THEN 1 ELSE 0 END), n.jenis, n.nama;
