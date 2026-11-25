# Hasil pengujian yang bisa dilakukan tanpa perangkat (22-11-2026)

| Jenis | Apa | Hasil | Cara mengulang |
|---|---|---|---|
| Unit test | Raspberry Pi (pelacakan, identitas, asosiasi, multi-kamera, kunjungan, nama lintas kamera, tertutup sebagian, siapa-yang-mana saat berdekatan, duduk/kepala/kaki saja) | **246 lulus**, 1 dilewati (termasuk 23 skenario dokumen uji: C1–C5, D2/D3/D5, E7, F2/F3, keluar merokok, putar 360°, jalan berdua; 5 uji kaus merah vs kuning yang terus berdempetan; dan 10 uji koreksi nama oleh wajah di kasir + ID yang melompat ke orang di belakang, dari uji lab 23-11) | `DEPLOY\RaspberryPi5`: `python -m pytest -q` |
| Unit test | UNO Q (gerbang mutu wajah, aturan keputusan, vault, posisi wajah, pendaftaran, log) | **14 lulus** | `cafe_facerec`: `python -m pytest tests -q` |
| Unit test | Website (validasi tata letak & kamera, sapaan kasir, daftar kamera, rekomendasi Putaran 1–5 persis seperti panduan uji) | **17 lulus** | `cafe-crm\frontend`: `npm test` |
| Integrasi | UNO Q → Pi → database: heartbeat, tampilan lokal, WebSocket + token, event wajah → asosiasi otomatis → kunjungan, batas kunjungan (kedua sisi), log, reset & ekspor SQL | **21/21 lulus** (`DEPLOY\integration_test\laporan_integrasi.md`) | `python run_integration.py --cafe-video … --face-video …` |
| Akurasi wajah (dataset 20 orang, 200 foto) | verifikasi 1:1 dan identifikasi 1:N terbuka | **EER 1,89 %**; τ = 0,40: Rank-1 **100 %**, FAR **0,00 %**, FRR **1,14 %** (setelah voting 0,07 %); aturan perangkat 4.000 sesi: salah orang **0 %**, orang asing diterima **0 %** | `cafe_facerec`: `python scripts/evaluate.py` |
| Jarak (wajah diperkecil + noise/MJPEG/landmark) | skor pemilik vs orang lain per lebar wajah | 48 px (±1,6 m): skor pemilik ≥ 0,58 pada 95 % percobaan; skor orang lain maks 0,38 di semua ukuran | lihat PARAMETERS.md |
| Asosiasi dua orang di kasir (simulasi 2.000 pasangan) | benar / salah / tanya, aturan 2 event | Tanpa titik kamera wajah: 0 % otomatis. Dengan titik + kalibrasi: **99,1 % / 0 % / 0,9 %** (noise kecil), **92,5 % / 0 % / 7,5 %** (sedang), **81,2 % / 0,2 % / 18,6 %** (besar) | `DEPLOY\RaspberryPi5`: `python scripts/simulate_association.py` |
| Multi-kamera (video toko dibelah dua, pita 15 %) | ID sama di pita bersama | 0 % → **42,5 %** setelah perbaikan; penyebab sisa: orang diam di tepi pita sempit. Diuji ulang di lab dengan pita ±1 m | uji D di lab |
| Nama di keramaian (Monte Carlo, 20 × 2 menit, tracker sengaja menukar ID saat saling menutupi) | nama benar / salah / salah ≥ 1 dtk setelah berpisah | Tanpa pertukaran tracker: **100 % benar** (3, 5, 7 orang). Dengan pertukaran 2–5 %/frame: 3 orang 97–98 % benar, salah setelah berpisah 0,15 %; 5 orang 86–89 %, 1,2 %; 7 orang 74–79 %, 2,5–2,7 %. Kesalahan terjadi selama orang masih saling menutupi dan dikoreksi setelah berpisah (label "Nama?" selama itu) | `DEPLOY\RaspberryPi5`: `python scripts/simulate_crowd_identity.py` |
| Rekaman toko asli ramai (±7 orang), lama vs baru | lama nama menempel; nama lompat ke orang lain | Pelanggan 1: 10 % → **59 %**; pelanggan 2 tetap pada orang yang sama; **0** lompat ke orang lain (diperiksa visual). Ditemukan & diperbaiki: tracker menghidupkan nomor orang yang tertutup pada orang lain 200 px jauhnya; sambung-tertutup ke tetangga; rujukan rupa dari crop yang tertutup | rekaman `cafe-persontrack/cctv_test.mp4` |
| Fungsional (black-box) | 38 kasus website | dijalankan manual | `docs/PENGUJIAN_BLACKBOX.md` |
| Rekomendasi (offline) | hit rate, novelty, diversity | butuh data transaksi uji lab | `cafe-crm`: `python scripts/evaluate_recommender.py` |
| Kinerja perangkat | FPS, latensi, suhu | diambil dari `metrics.csv` saat uji lab (laptop tidak mewakili Pi/UNO Q) | uji lab |

Catatan jujur untuk skripsi:
- Dataset wajah kecil (20 orang, foto satu sesi): angka akurasinya optimistis. Uji lab memberi bukti
  kondisi nyata, tetapi dengan sampel kecil (lihat catatan statistik di lampiran skenario).
- Simulasi asosiasi memakai model geometri; angka lab bisa berbeda.
