# Setiap angka di sistem, dan dasarnya

Kolom **Jenis**: **Literatur** = diambil langsung dari penelitian; **Kalibrasi** = dihitung dari
data sendiri dengan metode dari literatur (skrip disediakan); **Desain** = keputusan rekayasa yang
dijelaskan alasannya, bisa diubah. Untuk skripsi, sebutkan jenisnya dengan jujur.

## Kunjungan (lama pelanggan di kafe)

| Angka | Di mana | Jenis | Dasar |
|---|---|---|---|
| **15 detik** tidak terlihat kamera area → kunjungan selesai (jam keluar = terakhir terlihat) | Pengaturan → Kafe & kunjungan | **Kalibrasi** | Ini masalah *segmentasi sesi*: celah lebih panjang dari ambang = sesi selesai. Catledge & Pitkow (1995) menetapkan ambang sesi = rata-rata jeda + 1,5 simpangan baku (hasilnya 25,5 menit untuk web). Metode yang sama diterapkan pada celah yang terukur di kafe: `scripts/gap_threshold.py` di Raspberry Pi membaca `data/gaps.csv` (setiap kali pelanggan hilang lalu terlihat lagi) dan menghitung rata-rata + 1,5 SD serta persentil ke-95. 15 detik adalah nilai awal sebelum ada data; ganti dengan hasil skrip. Tidak ada standar baku di literatur pelacakan untuk celah ini; nilainya berbeda per tempat dan penempatan kamera |
| **30 menit**: kembali dalam 30 menit = kunjungan yang sama dibuka lagi | `.env` UNO Q & Pi (`VISIT_REOPEN_MIN`), CRM | **Literatur** | Batas sesi 30 menit adalah standar de facto, pembulatan dari 25,5 menit (Catledge & Pitkow, 1995) |
| **15 menit**: cadangan bila Pi mati / nama tidak pernah terpasang | Pengaturan → Kafe & kunjungan | **Literatur** | Batas sesi optimal 11–15 menit (Göker & He, 2000). Nilai lama 10 menit; ubah ke 15 di Pengaturan |
| **6 jam** kunjungan paling lama | Pengaturan / `.env` | **Desain** | Batas pengaman bila tidak ada sinyal keluar sama sekali; mahasiswa bisa duduk lama, jadi dibuat longgar |

## Pengenalan wajah (UNO Q)

| Angka | Jenis | Dasar |
|---|---|---|
| τ = **0,40** (kemiripan cosine) | **Kalibrasi** | Nilai terkecil dengan FAR open-set ≤ 1 % (target proposal) = 0,38 pada dataset; 0,40 dipakai sebagai margin. `scripts/evaluate.py`, ulangi dengan peserta uji lapangan |
| Margin **0,08** ke pelanggan kedua | **Kalibrasi** | Uji rasio/margin kekhasan (sejenis *ratio test*, Lowe 2004): wajah yang hampir sama mirip dengan dua orang ditolak. Pada dataset: 0 % salah orang |
| ≥ **60 %** frame terbaik setuju | **Desain** | Mayoritas (3 dari 5) |
| Lebar wajah minimal **7,5 %** lebar gambar (48 px, ±1,6 m) untuk mengenali; **10 %** (±1,2 m) untuk mendaftar | **Evaluasi** | Foto dataset diperkecil ke ukuran itu (ditambah noise, kompresi MJPEG, salah posisi landmark). Pada 48 px, 95 % skor pemilik wajah ≥ 0,58, sedangkan skor orang lain tertinggi tidak pernah > 0,38 di ukuran mana pun, jadi τ = 0,40 tetap aman. Pendaftaran tetap dekat supaya template berkualitas |
| Sesi ≤ **10 frame / 2,5 detik** | **Desain** | Target latensi proposal ≤ 3 detik |
| Keputusan dini setelah **4 frame** (≥ 3 frame berbeda) | **Literatur** + evaluasi | Keputusan sekuensial: berhenti mengumpulkan bukti begitu bukti sudah jauh melampaui ambang (Wald, 1945). Syaratnya lebih ketat dari aturan normal: semua frame setuju, skor ≥ τ + 0,10, margin ≥ 0,16. Pada dataset: terpakai di 92,7 % sesi, 0 salah orang, 0 dari 4.000 orang asing diterima |

## Deteksi orang (Raspberry Pi)

| Angka | Jenis | Dasar |
|---|---|---|
| YOLO11n input **480×640** (sebelumnya 640×640) | **Evaluasi** | Skala piksel sama dengan 640×640 untuk webcam 4:3, tanpa padding abu-abu, jadi ±25 % lebih sedikit hitungan. Diukur pada video kafe: dari orang yang ditemukan 640×640 dengan keyakinan ≥ 0,5, model 480×640 menemukan 99,0 %. Ukuran 384×512 hanya menemukan ±80 % sehingga tidak dipakai |

## Tampilan kamera langsung (CRM)

Jalur utama: perangkat → WebSocket (cloudflared quick tunnel) → browser. Tidak lewat Supabase
maupun server website, jadi tidak memakai kuota Supabase. Model dan akurasi tidak berubah; yang
diubah hanya cara gambar dikirim.

| Angka | Jenis | Dasar |
|---|---|---|
| Gambar kamera mentah hingga **15 fps** ("Halus") / **6 fps** ("Hemat data") | **Desain** | Gerak terlihat halus pada ±12–15 fps; gambar tidak menunggu deteksi (Pi ±7,6 FPS), jadi tampilan lebih halus dari kecepatan pelacakan |
| Kotak orang digeser sesuai kecepatan orang itu ke waktu gambar, paling jauh **0,5 detik** | **Desain** | Kotak berasal dari hasil pelacakan terakhir; tanpa penggeseran, kotak tertinggal di belakang orang yang berjalan. Hanya tampilan; pelacakan, identitas, dan data tidak berubah |
| Paling banyak **2 gambar** dalam perjalanan; browser mengonfirmasi setiap gambar yang tampil | **Desain** | Kontrol aliran (seperti jendela TCP): pada koneksi lambat, jumlah gambar/detik turun tetapi gambar tidak tertinggal (tidak ada antrean) |
| Lebar **640 px**, JPEG kualitas **55** ("Halus"); **480 px**, **50** ("Hemat data") | **Desain** | ±25–50 KB / ±15–30 KB per gambar |
| Hanya saat ada yang menonton; tab disembunyikan = koneksi ditutup | **Desain** | Tidak ada pemakaian data tanpa penonton |
| Token acak baru setiap program dimulai, hanya untuk pengguna yang login | **Desain** | Alamat tunnel saja tidak cukup untuk melihat kamera |

Jalur cadangan (bila cloudflared belum dipasang atau terputus): Supabase Realtime, lalu gambar
tersimpan di database.

| Angka | Jenis | Dasar |
|---|---|---|
| **8 fps** (Pi) / **10 fps** (UNO Q) saat ada orang/wajah, **2 fps** saat kosong | **Desain** | Hemat kuota |
| **300 MB**/bulan per perangkat (`STREAM_MONTHLY_MB`) | **Desain**, dari kuota | Data yang diterima lewat Realtime dihitung sebagai *egress* Supabase; paket Free: 5 GB/bulan untuk seluruh proyek (database juga). 2 × 300 MB = 0,6 GB, sisanya untuk website. Bila habis: gambar tersimpan (±1–3/detik) sampai bulan berikutnya |
| Gambar tersimpan **1×/detik** saat Realtime jalan, **±3×/detik** saat gagal | **Desain** | Halaman kamera tidak pernah kosong |

## Asosiasi wajah → badan (Raspberry Pi)

| Angka | Jenis | Dasar |
|---|---|---|
| Rumus *P* = *L* / (Σ*L* + *L₀*) | **Literatur** | Probabilistic data association (Bar-Shalom & Fortmann, 1988) |
| σ_d = **0,25** tinggi badan (≈ 0,43 m) | **Desain**, berbasis literatur | Orang dalam antrean berjarak sekitar zona personal 0,45–1,2 m (Hall, 1966). Dengan 0,25: orang yang antre ±0,9 m di belakang tidak membuat ragu (P ≈ 0,88), orang yang lebih dekat dari ±0,6 m membuat ragu → kasir ditanya |
| P ≥ **0,85**, **2×** berturut-turut | **Desain** | Mengutamakan "tidak boleh salah orang"; ubah di `.env` Pi (`BIND_P_MIN`, `BIND_CONFIRM`) |
| Titik kamera wajah: badan **terdekat** ke kamera wajah | **Desain**, dari aturan UNO Q | UNO Q hanya memutuskan bila wajah utama ≥ **1,3×** lebih lebar dari wajah lain, jadi pemiliknya orang yang paling dekat ke kamera wajah. Kelunakan s = 0,10 tinggi badan |
| Kalibrasi kiri/kanan dan jarak, ≥ **5** contoh | **Literatur** (kuadrat terkecil) + evaluasi | Posisi wajah di kamera kasir (α, w) dipetakan ke sudut dan jarak badan dari kamera wajah: sudut ≈ k·α, jarak ≈ c/w (model kamera lubang jarum: lebar wajah berbanding terbalik dengan jarak). Dipelajari dari pengikatan tanpa keraguan dan pilihan manual kasir. Simulasi 2.000 pasangan: 99,7 % otomatis, 0 % salah |
| Kasir ditanya bila ragu **2** event berturut-turut | **Desain** | Event berikutnya datang dalam ±2,5 detik; biasanya posisi orang sudah jelas |

## Rekomendasi

| Angka | Jenis | Dasar |
|---|---|---|
| Item-based CF, cosine, log(1+qty) | **Literatur** | Sarwar dkk. (2001); Hu, Koren & Volinsky (2008) |
| CF hanya bila ≥ **3 transaksi**, selain itu terlaris | **Proposal** + literatur | Cold start; popularitas sebagai baseline (Cremonesi dkk., 2010) |
| Top-**3** | **Desain** | Kasir memilih cepat; waktu memilih naik dengan jumlah pilihan (Hick, 1952) |
| Pelanggan setia ≥ **5** kunjungan | **Desain** | Sama dengan segmen "Regular"; dimensi *frequency* dari RFM |
| θ = **0,4**, λ = **0,7** ("Coba yang baru") | **Desain** | Bobot novelty dan MMR; uji dengan `scripts/evaluate_recommender.py` |

## Referensi

- Bar-Shalom, Y., & Fortmann, T. E. (1988). *Tracking and Data Association*. Academic Press.
- Catledge, L. D., & Pitkow, J. E. (1995). Characterizing browsing strategies in the World-Wide Web. *Computer Networks and ISDN Systems*, 27(6), 1065–1073.
- Göker, A., & He, D. (2000). Analysing web search logs to determine session boundaries for user-oriented learning. *Adaptive Hypermedia and Adaptive Web-Based Systems*, LNCS 1892, 319–322.
- Hall, E. T. (1966). *The Hidden Dimension*. Doubleday.
- Hick, W. E. (1952). On the rate of gain of information. *Quarterly Journal of Experimental Psychology*, 4(1), 11–26.
- Wald, A. (1945). Sequential tests of statistical hypotheses. *Annals of Mathematical Statistics*, 16(2), 117–186.
- Lowe, D. G. (2004). Distinctive image features from scale-invariant keypoints. *International Journal of Computer Vision*, 60(2), 91–110.
- Referensi rekomendasi: lihat `docs/RECOMMENDATION.md`.
