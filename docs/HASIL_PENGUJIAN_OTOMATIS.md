# Hasil pengujian yang bisa dilakukan tanpa perangkat (22-11-2026)

| Jenis | Apa | Hasil | Cara mengulang |
|---|---|---|---|
| Unit test | Raspberry Pi (pelacakan, identitas, asosiasi, multi-kamera, kunjungan) | **185 lulus**, 1 dilewati | `DEPLOY\RaspberryPi5`: `python -m pytest -q` |
| Unit test | UNO Q (gerbang mutu wajah, aturan keputusan, vault, posisi wajah, pendaftaran, log) | **14 lulus** | `cafe_facerec`: `python -m pytest tests -q` |
| Unit test | Website (validasi tata letak & kamera, sapaan kasir, daftar kamera) | **16 lulus** | `cafe-crm\frontend`: `npm test` |
| Integrasi | UNO Q → Pi → database: heartbeat, tampilan lokal, WebSocket + token, event wajah → asosiasi otomatis → kunjungan, batas kunjungan (kedua sisi), log, reset & ekspor SQL | **21/21 lulus** (`DEPLOY\integration_test\laporan_integrasi.md`) | `python run_integration.py --cafe-video … --face-video …` |
| Akurasi wajah (dataset 20 orang, 200 foto) | verifikasi 1:1 dan identifikasi 1:N terbuka | **EER 1,89 %**; τ = 0,40: Rank-1 **100 %**, FAR **0,00 %**, FRR **1,14 %** (setelah voting 0,07 %); aturan perangkat 4.000 sesi: salah orang **0 %**, orang asing diterima **0 %** | `cafe_facerec`: `python scripts/evaluate.py` |
| Jarak (wajah diperkecil + noise/MJPEG/landmark) | skor pemilik vs orang lain per lebar wajah | 48 px (±1,6 m): skor pemilik ≥ 0,58 pada 95 % percobaan; skor orang lain maks 0,38 di semua ukuran | lihat PARAMETERS.md |
| Asosiasi dua orang di kasir (simulasi 2.000 pasangan) | benar / salah / tanya, aturan 2 event | Tanpa titik kamera wajah: 0 % otomatis. Dengan titik + kalibrasi: **99,1 % / 0 % / 0,9 %** (noise kecil), **92,5 % / 0 % / 7,5 %** (sedang), **81,2 % / 0,2 % / 18,6 %** (besar) | `DEPLOY\RaspberryPi5`: `python scripts/simulate_association.py` |
| Multi-kamera (video toko dibelah dua, pita 15 %) | ID sama di pita bersama | 0 % → **42,5 %** setelah perbaikan; penyebab sisa: orang diam di tepi pita sempit. Diuji ulang di lab dengan pita ±1 m | uji D di lab |
| Fungsional (black-box) | 38 kasus website | dijalankan manual | `docs/PENGUJIAN_BLACKBOX.md` |
| Rekomendasi (offline) | hit rate, novelty, diversity | butuh data transaksi uji lab | `cafe-crm`: `python scripts/evaluate_recommender.py` |
| Kinerja perangkat | FPS, latensi, suhu | diambil dari `metrics.csv` saat uji lab (laptop tidak mewakili Pi/UNO Q) | uji lab |

Catatan jujur untuk skripsi:
- Dataset wajah kecil (20 orang, foto satu sesi): angka akurasinya optimistis. Uji lab memberi bukti
  kondisi nyata, tetapi dengan sampel kecil (lihat catatan statistik di lampiran skenario).
- Simulasi asosiasi memakai model geometri; angka lab bisa berbeda.
