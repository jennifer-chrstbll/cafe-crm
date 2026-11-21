# Skenario Pengujian Sistem v2 (uji lab, 9 orang, 2 hari + 1 cadangan)

Panduan ini menggantikan cara kerja versi pertama untuk pelaksanaan di lab: orang lebih sedikit,
waktu lebih singkat, dan **hampir semua hasil tercatat otomatis** (rekaman layar, log perangkat,
dan database), sehingga tidak perlu mencatat dengan tangan. Versi lama tetap ada di
`SKENARIO_PENGUJIAN.md`.

## Ringkasan satu halaman

| Hal | Isi |
|---|---|
| Orang | **9 orang**: kamu (koordinator + perekam), 1 asisten (kasir), 5 peserta terdaftar (P1–P5), 2 peserta tidak terdaftar (S1, S2). Paling sedikit 7 orang (tanpa P5 dan S2) |
| Waktu | **Hari 1** dan **Hari 2**, pukul **13.00–16.00** (persiapan mulai 12.15). **Hari 3 cadangan**, hanya bila ada yang gagal |
| Tempat | Satu ruang lab ±4 × 6 m: area kasir + antrean (kamera area 1), area duduk (kamera area 2), meja kasir dengan kamera wajah, satu "pintu" |
| Cara kerja | Peserta melakukan **putaran kunjungan** (masuk → dikenali di kasir → pesan dan bayar → duduk → keluar) setiap ±40 menit. Satu putaran sekaligus menguji pengenalan wajah, asosiasi otomatis, pindah kamera, kunjungan, dan rekomendasi. Di antara putaran dikerjakan blok uji khusus (cahaya, jarak, dua orang di kasir, oklusi, ramai, gangguan) |
| Bukti | (1) **Rekaman layar** laptop: halaman Kasir + tiga tampilan kamera langsung, dengan suara penanda; (2) **log perangkat** (`decisions.csv`, `events.csv`, `metrics.csv`); (3) **ekspor database** (`export_hasil_uji.sql`) |
| Parameter | **Tidak ada parameter yang diubah.** Yang dipersingkat hanya waktu tunggu dengan menyusun jadwal (contoh: putaran 40 menit memenuhi syarat "kunjungan baru > 30 menit") |

Kode skenario (A1, B3a, E3b, ...) dipakai di rekaman suara, log, dan bab hasil skripsi.

## 1. Orang dan peran

| Kode | Peran | Hari 1 | Hari 2 | Tugas |
|---|---|---|---|---|
| K | **Koordinator** (kamu) | 12.15–16.00 | 12.15–16.00 | Memimpin, mengoperasikan laptop dan OBS, mengucapkan penanda, mengatur cahaya |
| A | **Asisten = kasir** | 12.45–16.00 | 12.45–16.00 | Mengoperasikan halaman Kasir; berdiri di belakang meja (area staf) |
| P1–P5 | Peserta **terdaftar** | 13.00–15.45 | 12.50–15.20 | Wajah didaftarkan; berperan sebagai pelanggan |
| S1 | Peserta **tidak terdaftar** | 13.00–15.45 | 12.50–15.20 | Uji "orang asing tidak boleh dikenali sebagai orang lain"; pesan sebagai tamu |
| S2 | Tidak terdaftar → **pelanggan baru** | 13.00–15.45 | 12.50–15.20 | Hari 1 sebagai orang asing; Hari 2 didaftarkan (uji pelanggan baru, E0) |

**Variasi peserta** (sebisanya): laki-laki dan perempuan; minimal 1 berkacamata, 1 berhijab; tinggi
badan berbeda. Bila ada dua orang yang wajahnya mirip (saudara), jadikan satu sebagai P dan satu
sebagai S (uji B9).

**Pakaian:** Hari 1, **P2 dan P3 memakai atasan berwarna sama** (uji C8). Hari 2, **P1 membawa jaket**
berwarna mencolok (uji D4). Peserta lain bebas.

**Nama di CRM:** daftarkan dengan kode di depan, misalnya `P1 Andi`, `S2 Budi`. Kode ini membuat
hasil ekspor database langsung bisa dibaca tanpa mencocokkan nama.

**Persetujuan:** setiap peserta menandatangani formulir persetujuan perekaman dan pendaftaran wajah,
dan kasir mencentang persetujuan di CRM saat mendaftar.

## 2. Alat dan tata letak lab

### 2.1 Alat

- [ ] Raspberry Pi 5 + **2 webcam area**, Arduino UNO Q + webcam wajah (NEMESIS)
- [ ] Charger HP/adaptor USB-C 5 V 3 A untuk UNO Q (jangan dari laptop), adaptor resmi Pi 5 V 5 A, stop kontak
- [ ] 2 tiang/tripod/lemari tinggi untuk kamera area (±2,5–3 m), lakban kuat
- [ ] Laptop (perekam + kasir), charger laptop, mouse
- [ ] HP untuk **hotspot** (dicas selama uji) dan HP kedua untuk **stopwatch** dan foto
- [ ] Lakban warna dan meteran 5 m untuk tanda lantai
- [ ] Aplikasi **lux meter** di HP
- [ ] Lampu tambahan (lampu meja/LED) dan cara meredupkan ruangan (matikan sebagian lampu/tutup tirai)
- [ ] Barang uji: topi, masker, kacamata hitam, satu jaket mencolok
- [ ] Meja kasir, 2 meja + 4 kursi untuk area duduk, satu sekat/papan untuk oklusi (atau satu orang berdiri sebagai penghalang)
- [ ] Kartu kode peserta (P1–P5, S1, S2), formulir persetujuan, kartu pesanan (bagian 5.3), lembar SUS (bagian 13.3)

### 2.2 Tata letak

```
  ┌──────────────────────────────── ruang lab ────────────────────────────────┐
  │ [PINTU] ← zona keluar (digambar di Tata Letak Kamera, kamera area 1)        │
  │                                                                           │
  │     KAMERA AREA 1 (plafon)               KAMERA AREA 2 (plafon)           │
  │   ┌────────────────────────┐ pita   ┌──────────────────────────┐          │
  │   │ garis tunggu 1,2 m ┄┄┄ │ ±1 m   │  area duduk               │          │
  │   │ garis antre 1,0 / 0,6 m│<======>│  meja 1    meja 2          │          │
  │   │ titik kasir  K  T  N   │ zona   │                            │          │
  │   │ [MEJA KASIR] + kamera  │ pindah │                            │          │
  │   │ wajah, [area staf]     │ kamera │                            │          │
  │   └────────────────────────┘        └──────────────────────────┘          │
  └───────────────────────────────────────────────────────────────────────────┘
```

Tanda lantai (lakban):
- **Titik kasir** dengan tiga posisi: **K** (kiri), **T** (tengah), **N** (kanan), berjarak ±30 cm, ±0,8–1,0 m di depan kamera wajah. Pelanggan berganti posisi di setiap putaran supaya kalibrasi asosiasi otomatis belajar dari posisi yang berbeda.
- **Garis tunggu** 1,2 m di belakang titik kasir (di luar lingkaran hijau): pelanggan berikutnya menunggu di sini.
- **Garis antre** 0,6 m dan 1,0 m di belakang titik kasir (untuk uji E).
- **Tanda jarak** 0,5 / 1,0 / 1,5 / 2,0 m dari kamera wajah (untuk uji B4a).

Pemasangan dua kamera:
- Pi diletakkan **di atas, di antara kedua kamera** (rak/lemari/tripod). Webcam dicolok langsung ke **port USB biru**, satu kamera per port; yang dipanjangkan hanya kabel listrik. Pi tersambung lewat hotspot.
- Kedua kamera menghadap ke bawah ±45°, badan orang terlihat utuh (kepala sampai kaki) di area penting.
- Bidang pandang **tumpang tindih ±1 m** (pita). Gambar **Area pindah kamera** di pita itu pada **kedua** kamera. Program memakai mode tumpang tindih (bawaan `MULTICAM_OVERLAP=1`).
- Jangan menghadap jendela atau lampu terang secara langsung.

## 3. Persiapan (H-1 atau pagi sebelum Hari 1, ±2 jam, kamu sendiri)

Kerjakan berurutan. Centang setiap langkah.

### 3.1 Perbarui program (sekali)

Website (PowerShell):
```
cd D:\Projects\cafe-crm
git add -A
git commit -m "persiapan uji lab"
git push
```

Raspberry Pi (ganti `raspberrypi.local` dengan IP Pi bila tidak ketemu):
```
scp D:\Projects\DEPLOY\RaspberryPi5\cafe_pi.py D:\Projects\DEPLOY\RaspberryPi5\crm_sync.py D:\Projects\DEPLOY\RaspberryPi5\streamer.py D:\Projects\DEPLOY\RaspberryPi5\livecast.py D:\Projects\DEPLOY\RaspberryPi5\runlog.py D:\Projects\DEPLOY\RaspberryPi5\config.py gkikarawaci@raspberrypi.local:~/cafe-pi/
scp D:\Projects\DEPLOY\RaspberryPi5\identity\face_binding.py D:\Projects\DEPLOY\RaspberryPi5\identity\face_event.py D:\Projects\DEPLOY\RaspberryPi5\identity\face_receiver.py gkikarawaci@raspberrypi.local:~/cafe-pi/identity/
scp D:\Projects\DEPLOY\RaspberryPi5\multicam\multicam_manager.py gkikarawaci@raspberrypi.local:~/cafe-pi/multicam/
```

UNO Q:
```
scp D:\Projects\DEPLOY\ArduinoUnoQ\facerec_uno_q.py arduino@dh02.local:/home/arduino/facerec/
```

Bila cloudflared belum dipasang, jalankan langkah cloudflared dari panduan sebelumnya (dibutuhkan hanya untuk halaman Kamera di website, uji H).

### 3.2 Jam perangkat = WIB (sekali)

```
ssh -t gkikarawaci@raspberrypi.local "sudo timedatectl set-timezone Asia/Jakarta && timedatectl"
ssh -t arduino@dh02.local "sudo timedatectl set-timezone Asia/Jakarta && timedatectl"
```
Pastikan tertulis `Time zone: Asia/Jakarta` dan `System clock synchronized: yes`. Jam yang sama di
semua perangkat membuat rekaman, log perangkat, dan database bisa dicocokkan per detik.

### 3.3 Bersihkan data lama (setelah gladi bersih, lihat 3.8)

Urutan ini penting: hentikan program dulu supaya tidak ada data baru yang masuk saat dibersihkan.

1. Hentikan kedua program:
   ```
   ssh -t gkikarawaci@raspberrypi.local "sudo systemctl stop cafe-pi"
   ssh -t arduino@dh02.local "sudo systemctl stop facerec"
   ```
2. Buka Supabase → proyekmu → **SQL Editor** → **New query**. Salin isi file
   `D:\Projects\cafe-crm\database\reset_data_uji.sql`.
3. Blok dan jalankan **BAGIAN 1** saja (Run). Lihat jumlah data yang akan dihapus.
4. Blok dan jalankan **BAGIAN 2** (hapus). Data hilang permanen, jadi pastikan langkah 1 sudah dilakukan.
5. Jalankan **BAGIAN 3**: harus `pelanggan = 1` (hanya Tamu), kunjungan/transaksi/data wajah = 0,
   menu dan pengaturan tetap terisi.
6. Hapus log dan kalibrasi lama di perangkat, lalu nyalakan lagi programnya:
   ```
   ssh -t gkikarawaci@raspberrypi.local "rm -f ~/cafe-pi/data/events.csv ~/cafe-pi/data/metrics.csv ~/cafe-pi/data/gaps.csv ~/cafe-pi/data/face_calib.json && sudo systemctl start cafe-pi"
   ssh -t arduino@dh02.local "rm -f ~/facerec/data/decisions.csv ~/facerec/data/metrics.csv && sudo systemctl start facerec"
   ```

Yang **dihapus**: pelanggan (kecuali Tamu), wajah, kunjungan, transaksi, pesanan, log pengenalan,
jejak pelacakan, okupansi, permintaan daftar, perintah perangkat. Yang **tetap**: akun, menu, semua
pengaturan dan tata letak kamera. Skrip ini sudah diuji pada salinan skema database.

### 3.4 Pengaturan website

- **Pengaturan → Kafe & kunjungan:** jeda kunjungan **15 detik**, cadangan **15 menit**, kunjungan maksimal **6 jam**.
- **Menu:** minimal **10 menu aktif dari 3 kategori** (mis. Kopi, Non-kopi, Makanan). Rekomendasi
  "Coba yang baru" membutuhkan menu dan kategori yang belum pernah dipesan pelanggan.
- **Akun:** selama uji, **laptop memakai akun pemilik** (halaman Kasir, Kamera, Perangkat, Kunjungan dan
  Tata Letak bisa dibuka dari satu login). Buat juga akun peran **Kasir** untuk A; akun ini hanya dipakai
  di HP untuk uji hak akses J1.
- **Perangkat:** kedua perangkat hijau. Beri nama kamera area 1 = *Area kasir*, area 2 = *Area duduk*.
  "Kamera real-time" aktif bila cloudflared terpasang. Pastikan tombol **Tampilan lokal** muncul.

### 3.5 Tata letak kamera (CRM → Tata Letak Kamera)

Kamera area 1: **Titik kasir** (lingkaran hijau ±selebar satu langkah, berpusat di T), **Kamera wajah**
(klik meja tepat di bawah kamera UNO Q), **Area staf** (lantai belakang meja kasir), **Pintu**, dan
**Area pindah kamera** (pita tumpang tindih). Kamera area 2: **Area pindah kamera** di pita yang sama.
Simpan setiap kamera.

### 3.6 Perekaman layar (OBS Studio, sudah terpasang)

1. OBS → **Settings → Output**: Output Mode **Simple**; Recording Path **`D:\UjiTA\Rekaman`**;
   Recording Quality **High Quality, Medium File Size**; Recording Format **mkv**; Encoder
   **Hardware (QSV, H.264)**. MKV dipakai karena rekaman tetap aman bila laptop mati mendadak.
2. **Settings → Video**: Base dan Output = resolusi layar laptop; FPS **30**.
3. **Settings → Audio**: Mic/Auxiliary Audio = mikrofon laptop.
4. Sumber: **+ → Display Capture** (seluruh layar).
5. **Settings → Advanced**: Filename Formatting `%CCYY-%MM-%DD %hh-%mm-%ss`.
6. Windows: matikan sleep (Power → Never), aktifkan **Focus assist/Jangan ganggu**, tunda Windows Update.

Tata layar laptop (semua jendela terlihat, tidak saling menutup):

```
┌──────────────────────────────────────────┬────────────────────────┐
│                                          │  Tampilan lokal:       │
│   CRM: halaman KASIR                     │  Area kasir (CAM_1)    │
│   (diganti ke halaman KAMERA hanya saat  ├────────────────────────┤
│    perlu memilih orang secara manual)    │  Tampilan lokal:       │
│                                          │  Area duduk (CAM_2)    │
│                                          ├────────────────────────┤
│                                          │  Tampilan lokal:       │
│                                          │  Kamera wajah          │
└──────────────────────────────────────────┴────────────────────────┘
```

Tampilan lokal dibuka dari **CRM → Perangkat → Tampilan lokal untuk merekam** (satu tombol per
kamera). Tampilan ini langsung dari perangkat lewat hotspot, **tanpa kuota internet** dan tanpa
Cloudflare. Isinya kotak orang dan wajah, nama, tata letak, FPS, dan **jam perangkat (milidetik)**.

### 3.7 Cek kapasitas (H-1)

| Yang dicek | Di mana | Harus |
|---|---|---|
| Ruang disk rekaman | File Explorer → D: | ≥ **40 GB** kosong (perkiraan rekaman ±2–3 GB/jam, ±10 GB per hari; D: sekarang ±133 GB) |
| Database Supabase | Dashboard → proyek | Status **Active** (proyek gratis berhenti setelah 7 hari tanpa aktivitas; klik *Restore* bila *Paused*). Ukuran jauh di bawah 500 MB (data uji ±beberapa MB) |
| Egress Supabase | Dashboard → Usage | Sisa ≥ 2 GB. Uji ini memakai ±50–100 MB/hari karena kamera direkam lewat tampilan lokal |
| Vercel | Dashboard → Usage | Pemakaian fungsi masih jauh dari batas (uji ini ±15 ribu pemanggilan/hari) |
| Kuota hotspot | HP | ≥ **3 GB** (website ±100 MB/hari; halaman Kamera di website hanya dipakai di blok H) |

Bila disk kurang dari 40 GB: pakai **flashdisk/SSD eksternal USB 3.0 ≥ 64 GB** (format exFAT) dan
arahkan Recording Path OBS ke sana. Kecepatan tulis rekaman hanya ±1 MB/detik, jadi flashdisk biasa
pun cukup.

### 3.8 Gladi bersih (15 menit, kamu + A)

1. Nyalakan semuanya, buka tata layar 3.6, mulai rekam OBS.
2. Daftarkan A sebagai pelanggan **"Uji Gladi"**, lalu lakukan satu putaran kunjungan penuh
   (dikenali → pesan → bayar → duduk di area 2 → keluar lewat pintu).
3. Hentikan rekaman. Putar ulang: gambar dan suara jelas? Tiga tampilan kamera bergerak? Panel kasir terbaca?
4. Cek log: `ssh -t gkikarawaci@raspberrypi.local "tail -5 ~/cafe-pi/data/events.csv"` harus berisi
   `WAJAH`, `IKAT_OTOMATIS`, `KUNJUNGAN_MULAI`, `PINDAH_KAMERA`, `KUNJUNGAN_SELESAI`.
5. Kalau semua benar, **bersihkan data (3.3)** supaya data gladi tidak ikut terhitung.

## 4. Merekam dan mengumpulkan bukti

### 4.1 Prinsip

- **Satu rekaman per blok** (bukan satu file 3 jam): tekan *Start Recording* di awal blok dan *Stop* di
  akhir. Nama file otomatis berisi tanggal dan jam.
- **Penanda suara** sebelum setiap percobaan, diucapkan K dengan jelas:
  *"B-empat-a, P2, satu koma lima meter, percobaan satu"*. Saat menganalisis rekaman, penanda inilah
  yang memberi tahu skenario mana yang sedang berjalan. Tidak perlu menulis apa-apa.
- **Kejadian sebenarnya** (siapa berdiri di mana, kapan keluar pintu) terlihat di tampilan kamera
  dengan jam perangkat, jadi tidak perlu dicatat terpisah.
- Catat dengan tangan **hanya masalah** (lembar 13.2): error, perangkat mati, percobaan diulang.

### 4.2 Data yang tercatat otomatis

| Data | Lokasi | Isi | Untuk skenario |
|---|---|---|---|
| `decisions.csv` | UNO Q `~/facerec/data/` | Setiap keputusan wajah: hasil (known/unknown/uncertain), pelanggan, skor, margin, jumlah frame, keputusan dini, lama sesi, posisi wajah; hasil pendaftaran | A, B, E |
| `metrics.csv` (UNO Q) | UNO Q `~/facerec/data/` | Per menit: FPS, waktu deteksi/embedding, suhu | K |
| `events.csv` | Pi `~/cafe-pi/data/` | Wajah diterima, asosiasi otomatis (peluang P, jumlah calon), ragu, tanya kasir, asosiasi manual, lepas, pindah kamera (kemiripan), kunjungan mulai/selesai (alasan), kalibrasi | C, D, E, F |
| `metrics.csv` (Pi) | Pi `~/cafe-pi/data/` | Per menit: FPS dan jumlah orang per kamera, identitas, suhu, beban, memori | C5, K |
| Database | Supabase (`export_hasil_uji.sql`) | Kunjungan, pengenalan, transaksi, pelacakan, okupansi, pendaftaran, ringkasan per peserta | A, F, G, C, D |
| Rekaman layar | `D:\UjiTA\Rekaman` | Semua yang terlihat dan terdengar | semua (kejadian sebenarnya) |
| Foto HP | HP | Tata letak, pemasangan kamera, suasana (untuk bab metodologi) | dokumentasi |

### 4.3 Akhir setiap hari (15 menit, K)

1. Hentikan rekaman OBS.
2. Buat folder hari itu (PowerShell):
   ```
   New-Item -ItemType Directory -Force -Path D:\UjiTA\Hari1\pi, D:\UjiTA\Hari1\unoq, D:\UjiTA\Hari1\db
   ```
3. Salin log perangkat (password diminta):
   ```
   scp gkikarawaci@raspberrypi.local:~/cafe-pi/data/*.csv D:\UjiTA\Hari1\pi\
   scp arduino@dh02.local:/home/arduino/facerec/data/*.csv D:\UjiTA\Hari1\unoq\
   ```
4. Supabase → SQL Editor → jalankan kueri 1–7 dari `export_hasil_uji.sql` satu per satu, lalu
   **Download → CSV**, simpan ke `D:\UjiTA\Hari1\db\` dengan nama yang tertulis di kueri.
   Kueri 8 menampilkan ukuran database.
5. OBS → **File → Remux Recordings** → pilih file .mkv hari itu → MP4 (untuk diputar di mana saja).
6. Salin seluruh `D:\UjiTA\Hari1` ke flashdisk/Google Drive sebagai cadangan.
7. Matikan perangkat dengan benar: `sudo shutdown -h now` (Pi dan UNO Q), tunggu 20 detik, baru cabut.

Untuk Hari 2 ganti `Hari1` menjadi `Hari2`. Log perangkat **tidak perlu dihapus** antar hari karena
setiap baris punya tanggal dan jam.

## 5. Hari 1: 13.00–16.00

### 5.1 Jadwal

| Jam | Blok | Siapa | Isi | Rekaman |
|---|---|---|---|---|
| 12.15–12.55 | Persiapan | K (A mulai 12.45) | Nyalakan perangkat (hotspot dulu), cek Perangkat hijau, buka tata layar, cek lux normal di titik kasir dan area duduk, lakban terpasang | – |
| 13.00–13.10 | Pembukaan | semua | Penjelasan singkat, formulir persetujuan, bagikan kartu kode dan kartu pesanan | – |
| 13.10–13.28 | **Blok A** pendaftaran | A, P1–P5 | A1–A4 (5.2) | R-A |
| 13.30–13.43 | **Putaran 1** | P1–P5, S1 | Kunjungan ke-1 (5.3) | R-P1 |
| 13.45–14.08 | **Blok B-1** | P1–P5, S1, S2 | Cahaya B3, jarak B4a, orang asing B2 | R-B1 |
| 14.10–14.23 | **Putaran 2** | P1–P5 | Kunjungan ke-2 | R-P2 |
| 14.25–14.48 | **Blok B-2** | P1–P5, S1, S2 | Sudut B4b, aksesoris B5, dua orang B6, lewat B7, foto HP B8, mirip B9, ekspresi B10, orang asing B2 | R-B2 |
| 14.50–15.03 | **Putaran 3** | P1–P5, S1 | Kunjungan ke-3 | R-P3 |
| 15.05–15.28 | **Blok C** | semua | Pelacakan, oklusi, ramai, staf, pakaian sama | R-C |
| 15.30–15.43 | **Putaran 4** | P1–P5 | Kunjungan ke-4: rekomendasi CF mulai muncul | R-P4 |
| 15.45–16.00 | Penutup | K, A | Ekspor dan cadangan (4.3); peserta pulang 15.45 | – |

Kenapa putaran berjarak 40 menit: kunjungan baru baru tercatat bila orangnya kembali **lebih dari
30 menit** setelah keluar (`VISIT_REOPEN_MIN`, bagian 9). Dengan urutan peserta yang sama setiap
putaran dan ±6 menit di dalam "kafe", jarak antara keluar dan datang lagi ±34 menit. **Jangan memulai
putaran sebelum jamnya**, dan selalu dengan urutan P1, P2, P3, P4, P5.

### 5.2 Blok A: pendaftaran wajah (13.10–13.28)

Penanda suara: *"A1, P1"* dan seterusnya.

1. **A2 (tanpa persetujuan):** kasir membuat pelanggan `P1 ...` dan mencoba mendaftarkan wajah
   **tanpa** mencentang persetujuan. Hasil: ditolak.
2. **A1 (normal):** centang persetujuan, daftarkan P1–P5 satu per satu. Peserta berdiri di titik kasir
   menghadap kamera dan sedikit menoleh kiri/kanan. Bergantian di posisi **K, T, N, K, T**.
3. **A3 (kondisi buruk):** sebelum mendaftar dengan normal, P4 mencoba dari tanda 2,0 m. Hasil: muncul
   "Mendekat sedikit ke kamera"/"Terlalu jauh". Setelah itu P4 maju dan pendaftaran berhasil.
4. **A4 (dua wajah):** saat P5 mendaftar, P3 berdiri tepat di samping P5. Hasil: "Beberapa wajah sama
   dekat". P3 mundur, lalu pendaftaran berhasil.
5. **E0 (langsung terasosiasi):** setelah setiap pendaftaran berhasil, lihat tampilan Area kasir: nama
   peserta langsung menempel di badannya (hijau), tanpa kasir menekan apa-apa.

Lima pendaftaran ini juga menjadi **contoh pertama kalibrasi** asosiasi otomatis.

### 5.3 Putaran kunjungan (dipakai di semua putaran)

Penanda suara di awal: *"Putaran 1"*. Lalu setiap peserta, berurutan:

1. Masuk lewat **pintu**, jalan ke **garis tunggu**, menunggu sampai peserta sebelumnya meninggalkan meja kasir.
2. Berdiri di posisi titik kasir sesuai tabel di bawah, menghadap kasir/kamera wajah ±3 detik.
3. Kasir melihat panel pelanggan otomatis: nama, sapaan, favorit, rekomendasi. Kasir **mengucapkan
   sapaan** yang muncul dan memasukkan pesanan sesuai **kartu pesanan**, lalu **bayar**.
4. Peserta berjalan ke **area duduk** (melewati pita pindah kamera), duduk ±2 menit.
5. Kembali lewat pita pindah kamera, keluar lewat **pintu**.

S1 ikut di Putaran 1 dan 3 sebagai **tamu** (pesan tanpa nama, uji G6 dan bahan B2).

| Putaran | P1 | P2 | P3 | P4 | P5 |
|---|---|---|---|---|---|
| Posisi di titik kasir 1 / 2 / 3 / 4 / 5 / 6 | K / T / N / K / T / N | T / N / K / T / N / K | N / K / T / N / K / T | K / N / T / K / N / T | T / K / N / T / K / N |

**Kartu pesanan** (ganti nama menu dengan menu di CRM; dua kelompok selera supaya rekomendasi
collaborative filtering bisa dijelaskan):

| Putaran | P1 (kopi) | P2 (kopi) | P3 (kopi) | P4 (non-kopi) | P5 (non-kopi) |
|---|---|---|---|---|---|
| 1 | Kopi A + Makanan A | Kopi A | Kopi B + Makanan A | Non-kopi A + Makanan B | Non-kopi A |
| 2 | Kopi A | Kopi A + Makanan A | Kopi B | Non-kopi A | Non-kopi B + Makanan B |
| 3 | Kopi B + Makanan A | Kopi A | Kopi A + Makanan A | Non-kopi B + Makanan B | Non-kopi A |
| 4–6 | bebas, pilih dari panel rekomendasi bila cocok | sama | sama | sama | sama |

Yang terlihat di setiap putaran:
- **Putaran 1–3:** rekomendasi **"Terlaris 30 hari terakhir"** (kurang dari 3 transaksi).
- **Putaran 4:** rekomendasi **collaborative filtering** ("Sering dibeli bersama ..."). Misalnya P2 disarankan menu yang dibeli P1/P3 tetapi belum dibeli P2.
- **Putaran 5 (Hari 2):** muncul **"Coba yang baru"** (pelanggan setia, 5 kunjungan).

### 5.4 Blok B-1: cahaya, jarak, orang asing (13.45–14.08)

Satu **percobaan** = peserta melangkah ke titik T, menghadap kamera ±3 detik, lalu mundur ke garis
tunggu ±3 detik. Penanda suara sebelum setiap percobaan. Ukur lux di titik kasir setiap kali kondisi
cahaya berubah, dan ucapkan nilainya.

| Kode | Peserta | Percobaan | Cara |
|---|---|---|---|
| B3a Gelap | P1, P2, P3 | 2 per orang | Matikan sebagian besar lampu (target 20–50 lux) |
| B3b Terang | P1, P2, P3 | 2 per orang | Lampu tambahan diarahkan ke wajah (> 1000 lux) |
| B3c Cahaya belakang | P1, P2, P3 | 2 per orang | Peserta membelakangi lampu/jendela terang |
| B3d Cahaya samping | P1, P2, P3 | 2 per orang | Satu lampu dari samping, sisi lain gelap |
| B4a Jarak | P4, P5 | 2 per jarak | Berdiri di tanda 0,5 / 1,0 / 1,5 / 2,0 m |
| B2 Orang asing | S1, S2 | 10 per orang | Seperti percobaan biasa, cahaya normal; kasir **tidak** mendaftarkan mereka |

Kembalikan cahaya normal sebelum Putaran 2.

### 5.5 Blok B-2: sudut, aksesoris, dua orang, lainnya (14.25–14.48)

| Kode | Peserta | Percobaan | Cara |
|---|---|---|---|
| B4b Sudut | P1, P2 | 2 per sudut | Menoleh ±15°, ±30°, ±45°; menunduk melihat HP |
| B5a Kacamata | peserta berkacamata | 2 + 2 | Dengan dan tanpa kacamata |
| B5b Topi | P3 | 2 | Pakai topi |
| B5c Masker | P4, P5 | 2 per orang | Pakai masker |
| B5d Kacamata hitam | P1 | 2 | Pakai kacamata hitam |
| B5e Hijab | peserta berhijab | 2 | Model/warna berbeda dari saat mendaftar |
| B6a Berdampingan | P1 + P2 | 3 | Berdiri sejajar, jarak sama ke kamera |
| B6b Satu di belakang | P3 + P4 | 3 | P3 di T, P4 di garis 1,0 m |
| B6c Terdaftar + asing | P5 + S1 | 3 | Seperti B6a dan B6b |
| B6d Bergantian cepat | P1, P2, P3 | 1 rangkaian | Antre dan maju satu per satu tanpa jeda |
| B7 Lewat saja | P1–P5 | 1 per orang | Berjalan melintas depan kasir tanpa berhenti |
| B8 Foto di HP | P2 | 2 | Tunjukkan foto wajah P2 di layar HP ke kamera |
| B9 Wajah mirip | pasangan mirip (bila ada) | 3 | Yang tidak terdaftar berdiri di titik kasir |
| B10 Ekspresi | P3 | 2 | Tersenyum lebar, lalu sambil bicara |
| B2 Orang asing | S1, S2 | 10 per orang | Seperti Blok B-1 |

### 5.6 Blok C: pelacakan orang (15.05–15.28)

Lihat tampilan **Area kasir** dan **Area duduk**. Ucapkan kodenya sebelum mulai.

| Kode | Peserta | Durasi | Cara |
|---|---|---|---|
| C1 Satu orang | P1 | 1 menit | Berjalan keliling area kamera 1 |
| C2 Berpapasan | P1 + P2 | 2 × lewat | Berjalan berlawanan arah, berpapasan dekat |
| C3a Oklusi 3 detik | P3 | 2 × | Berjalan di belakang sekat/orang, tertutup ±3 detik |
| C3b Oklusi 10 detik | P3 | 2 × | Berdiri diam di belakang sekat ±10 detik, lalu keluar |
| C3c Oklusi 20 detik | P3 | 1 × | Berdiri diam di belakang sekat ±20 detik, lalu keluar |
| C4 Duduk lama | P5 | 10 menit (berjalan bersamaan) | Duduk di area 2 sejak awal blok sampai C5 |
| C5 Ramai | 5 orang, lalu 7 orang | 2 menit + 2 menit | Semua berjalan acak di kedua area, lalu duduk/berdiri diam. K menyebut jumlah pelanggan sebenarnya per kamera (A tidak dihitung karena staf) |
| C6 Gelap/terang | P1 + P2 | 1 menit per kondisi | Ulangi C2 dengan lampu redup, lalu lampu tambahan |
| C7 Staf | A | sepanjang blok | A bekerja di area staf; harus berlabel **Staf** (oranye) |
| C8 Pakaian sama | P2 + P3 | 2 × lewat | Berpapasan dekat (atasan berwarna sama) |

## 6. Hari 2: 13.00–16.00

### 6.1 Jadwal

| Jam | Blok | Siapa | Isi | Rekaman |
|---|---|---|---|---|
| 12.15–12.55 | Persiapan | K, A | Seperti Hari 1. Cek **Perangkat → Asosiasi otomatis: "Siap: kalibrasi selesai"** | – |
| 13.00–13.13 | **Putaran 5** | P1–P5 | Kunjungan ke-5: **pelanggan setia, "Coba yang baru"**, sapaan pelanggan setia | R-P5 |
| 13.15–13.40 | **Blok E** | P1–P5, S1, S2 | Asosiasi wajah → badan (6.2) | R-E |
| 13.45–13.58 | **Putaran 6** | P1–P5, lalu S2 terakhir | Kunjungan ke-6. **P4 dan P5 bergantian menjadi kasir** untuk 2 pelanggan (bahan SUS) | R-P6 |
| 14.00–14.25 | **Blok D + F** | P1–P5 | Pindah kamera, kunjungan (6.3) | R-DF |
| 14.25–14.45 | **Blok H** | K, A, P1, P2 | Kamera di website (6.4) | R-H |
| 14.45–15.10 | **Blok I + F6 + J** | K, A, P4 | Gangguan, Pi mati, privasi (6.5) | R-I |
| 15.10–15.20 | **SUS** | A, P4, P5 | Kuesioner kegunaan (13.3); peserta selesai 15.20 | – |
| 15.20–15.40 | Ulang | K, A | Ulangi skenario yang gagal/kurang (lembar 13.2) | R-ulang |
| 15.40–16.00 | Penutup | K | Ekspor dan cadangan (4.3) untuk Hari 2 | – |

S2 baru didaftarkan pukul ±13.16 (Blok E), jadi S2 ikut Putaran 6 **paling akhir** (±13.57). Dengan begitu
ada >30 menit sejak S2 keluar setelah didaftarkan, dan Putaran 6 tercatat sebagai kunjungan baru.

### 6.2 Blok E: asosiasi wajah → badan (13.15–13.40)

| Kode | Peserta | Percobaan | Cara | Hasil yang diharapkan |
|---|---|---|---|---|
| E0 Pelanggan baru | S2 | 1 | Kasir mendaftarkan S2 (persetujuan dicentang) saat S2 berdiri di T | Begitu "Wajah tersimpan", nama S2 langsung menempel di badannya |
| E2 Antre 1 m | P1 di T, P2 di 1,0 m | 3 | P1 menghadap kamera | Nama P1 ke badan P1 otomatis |
| E3a Antre 0,6 m | P1 di T, P2 di 0,6 m | 3 | Seperti E2 | Otomatis ke P1 (orang terdekat ke kamera wajah) |
| E3b Berdampingan | P3 + P4 di dalam lingkaran | 4 | Bergantian: yang satu tepat di depan kamera, yang lain sedikit ke samping | Otomatis ke orang yang di depan kamera |
| E3c Bertukar | P3 + P4 | 2 | Ulangi E3b dengan posisi ditukar | Nama mengikuti orang yang di depan kamera |
| E9 Orang asing di kasir | S1 | 2 | S1 di T | Tidak ada nama terpasang |
| E5 Lepas pasangan salah | P2 | 1 | Di halaman Kamera, kasir memasang nama P2 ke P1 dengan sengaja, lalu "Bukan dia" | Nama lepas, kunjungan P2 tidak ditutup |
| E6 Bukan staf | P5 | 1 | P5 berdiri di area staf ±1 menit sampai berlabel Staf, lalu di **halaman Kamera** kasir mengetuk P5 dan menekan **Bukan staf** | Label staf hilang, kembali pelanggan |
| E7 Nama tetap menempel | P1 | 1 | Setelah dikenali, berjalan ke area duduk, duduk 3 menit, kembali | Nama sama di kedua kamera sepanjang waktu |
| E3d Tanpa titik kamera wajah (**terakhir**) | P1 + P2 | 2 | K menghapus titik kamera wajah (Tata Letak → Simpan), ulangi E3a | Kasir ditanya (pembanding perilaku lama) |
| E4 Kaitkan manual | dari E3d | 1 | Kasir membuka pertanyaan di halaman Kasir/Kamera dan mengetuk orang yang benar | Nama menempel dengan tanda ✓ (manual) |

Setelah E4, **pasang lagi titik kamera wajah** dan simpan. Kalibrasi lalu mulai dari awal karena
titiknya berpindah sedikit; itu tidak masalah, karena uji dua orang di kasir sudah selesai dan putaran
berikutnya (satu orang per kali) akan mengisinya lagi.

### 6.3 Blok D + F: pindah kamera dan kunjungan (14.00–14.25)

| Kode | Peserta | Cara | Hasil yang diharapkan |
|---|---|---|---|
| D2 Bolak-balik | P1 (sudah dikenali) | 3 × bolak-balik area 1 ↔ area 2 melewati pita | ID dan nama sama di kedua kamera; `PINDAH_KAMERA` di events.csv |
| D3 Bertiga | P1, P2, P3 | Berjalan bersamaan ke area 2 | Nama tidak tertukar |
| D4 Ganti jaket | P1 | Memakai jaket di area 2, lalu kembali ke area 1 | Boleh tidak tersambung (penampilan berubah): dicatat sebagai keterbatasan |
| D5 Langsung ke area 2 | S1 | Masuk lewat area 2 tanpa lewat kasir | Terlacak tanpa nama |
| F2 Hilang 20 detik | P2 | Keluar dari pandangan kedua kamera **bukan lewat pintu** selama 20 detik, lalu kembali | Kunjungan ditutup **LOST** setelah 15 detik. Saat terlihat lagi, nama dipulihkan dari penampilan (≤ 30 detik) atau saat dikenali di kasir, dan **kunjungan yang sama** dibuka lagi |
| F3 Hilang 8 detik | P3 | Seperti F2, tetapi 8 detik | Kunjungan **tidak** ditutup |
| F4 Kembali < 30 menit | P4 | Keluar lewat pintu ±14.02, kembali dan dikenali di kasir ±14.12 | Kunjungan yang sama dibuka lagi (bukan kunjungan baru) |
| F1 dan F7 | semua putaran | (tidak perlu waktu tambahan) | Data dari Putaran 1–6 |

### 6.4 Blok H: kamera di halaman website (14.25–14.45)

| Kode | Cara | Hasil yang diharapkan |
|---|---|---|
| H1 Langsung | Buka CRM → Kamera → Semua kamera area | "Langsung · ±12–15 fps" |
| H2 Jeda gambar | HP menampilkan stopwatch milidetik di depan kamera area 1. Foto layar laptop dan HP bersamaan, 5 kali | Selisih ±0,2–1 detik |
| H3 Hemat data | Klik "Hemat data" | ±6 fps |
| H4 Jalur cadangan | `ssh -t gkikarawaci@raspberrypi.local "pkill cloudflared"` | "Cadangan" dalam beberapa detik, lalu kembali "Langsung" dalam ±1 menit (cloudflared dijalankan ulang otomatis) |
| H5 Dua penonton | Buka halaman Kamera juga di HP | Keduanya lancar |
| H6 Tab disembunyikan | Pindah tab 1 menit, kembali | Gambar langsung muncul lagi |
| H7 Kotak mengikuti | P1, P2 berjalan cepat di area 1 | Kotak tidak tertinggal jauh dari orang |

Setelah blok H, **tutup halaman Kamera di website** (hemat kuota). Rekaman kembali memakai tampilan lokal.

### 6.5 Blok I + F6 + J: gangguan dan privasi (14.45–15.10)

| Jam | Kode | Cara | Hasil yang diharapkan |
|---|---|---|---|
| 14.45 | **F6** Pi mati | `ssh -t gkikarawaci@raspberrypi.local "sudo systemctl stop cafe-pi"`. 14.47: P4 dikenali di kasir, memesan, lalu pergi. **Halaman Kasir tetap terbuka** (website menjalankan aturan penutupan saat dipakai) | Website menutup kunjungan P4 **15 menit** setelah tanda terakhir (±15.03, alasan TIMEOUT). Cek di halaman Kunjungan pukul 15.05 |
| 14.50 | I1 Internet putus | Matikan **data seluler** HP (hotspot tetap menyala) 2 menit. Selama itu P1 dikenali di kasir | Pengenalan tetap jalan dan nama tampil di tampilan lokal. Setelah data seluler dinyalakan lagi, catatan masuk ke database dengan **jam aslinya** |
| 14.54 | I4 Kabel kamera | Cabut kabel webcam wajah 10 detik, colok lagi | Kamera tersambung kembali sendiri (±5 detik) |
| 14.56 | I3 Restart UNO Q | CRM → Perangkat → Mulai ulang (UNO Q) | Online kembali ≤ 1 menit |
| 14.58 | J1 Hak akses | Di **HP**, A login dengan akun Kasir | Hanya Kasir/Kamera/Pelanggan; halaman Perangkat, Kunjungan, Menu dan Tata Letak tidak bisa dibuka |
| 15.00 | J3 Hapus data | K membuat dan mendaftarkan pelanggan **"Uji Hapus"** (wajah K), lalu menghapusnya di CRM | Data wajahnya hilang (cek ringkasan_pelanggan) |
| 15.05 | I2 Restart Pi | Setelah F6 dicek: nyalakan program Pi lagi | Online kembali ≤ 1 menit, pelacakan jalan lagi |

I5 (ganti jaringan) dan I6 (listrik mati) tidak diuji tersendiri karena sudah terjadi setiap hari saat
perangkat dinyalakan.

## 7. Hari 3 (cadangan)

Dipakai **hanya** bila ada yang gagal atau datanya kurang. Urutan prioritas:

1. Skenario yang gagal karena error (lembar 13.2). Perbaiki penyebabnya dulu, lalu ulangi.
2. Putaran yang terlewat. Ingat jarak 40 menit; pelanggan setia butuh 5 kunjungan.
3. Menambah jumlah percobaan: B1 (pengenalan normal) dan E3b (berdampingan).
4. Bila semua sudah lengkap: **simulasi bebas 30 menit**. Semua peserta berperilaku seperti
   pelanggan kafe tanpa naskah (datang dan pergi kapan saja, mengobrol, pindah meja). Ini memberi
   satu video demonstrasi yang realistis untuk sidang.

## 8. Daftar skenario, hasil yang diharapkan, dan dasarnya

Kolom **Dasar** menjelaskan kenapa hasil itu yang diharapkan; nomor rujukan ada di bagian Referensi.
**Bukti** = dari mana hasilnya diambil.

### 8.1 Pendaftaran dan pengenalan wajah (UNO Q)

| Kode | Hasil yang diharapkan | Dasar | Bukti |
|---|---|---|---|
| A1 | Berhasil ≤ 20 detik, 5 sampel tersimpan | Batas waktu daftar 20 detik; 5 foto terbaik dirata-ratakan menjadi templat | decisions.csv (`daftar_ok`), pendaftaran.csv |
| A2 | Ditolak tanpa persetujuan | Data biometrik butuh persetujuan eksplisit (UU No. 27/2022 Pelindungan Data Pribadi) [16] | rekaman |
| A3, A4 | Pesan mutu; tidak mengambil wajah yang salah | Gerbang mutu: wajah ≥ 10 % lebar gambar untuk mendaftar; wajah utama harus ≥ 1,3× lebih lebar dari wajah lain | rekaman, decisions.csv |
| B1 (putaran) | Benar ≥ 95 %, salah orang 0, ≤ 3 detik | τ = 0,40 dan margin 0,08 dikalibrasi pada dataset (FAR ≤ 1 %); target latensi proposal 3 detik; keputusan dini setelah 4 frame bila bukti sangat kuat [1] | decisions.csv, events.csv (`WAJAH`) |
| B2 | Orang asing **tidak pernah** diberi nama | Margin ke kandidat kedua menolak wajah yang mirip dua orang [2]; τ dikalibrasi untuk FAR ≤ 1 % | decisions.csv (S1/S2 = `unknown`) |
| B3a–d | Dikenali, atau ditolak "Terlalu gelap/terang"; **tidak boleh salah orang** | Cahaya kurang atau tidak merata menurunkan mutu wajah [11]; area kasir umumnya ±500 lux [10]; gerbang kecerahan menolak frame yang terlalu gelap/terang | decisions.csv + lux yang diucapkan |
| B4a | Dikenali sampai ±1,6 m; "Terlalu jauh" setelahnya | Lebar wajah minimal 48 px (7,5 % lebar gambar). Evaluasi pada dataset yang diperkecil: skor pemilik ≥ 0,58 untuk 95 % percobaan, skor orang lain tidak pernah > 0,38 | decisions.csv (`wajah_lebar`) |
| B4b | 15° dikenali; 45° "Tampak samping" (ditunda, bukan salah) | Akurasi verifikasi turun tajam dari wajah depan ke samping [3] | rekaman, decisions.csv |
| B5c, B5d | Tidak dikenali; tidak salah orang | Masker menurunkan akurasi pengenalan wajah secara besar [4] | decisions.csv |
| B6a | Keputusan ditunda ("Beberapa wajah sama dekat") | Aturan wajah utama 1,3× | rekaman |
| B6b–d | Yang terdekat dikenali dengan nama sendiri | Sama | decisions.csv |
| B8 | **Kemungkinan dikenali** (tidak ada deteksi wajah palsu) → keterbatasan | Deteksi serangan presentasi (PAD) tidak termasuk ruang lingkup [5] | rekaman |
| B9 | Yang tidak terdaftar tidak diberi nama yang terdaftar | Margin 0,08 [2] | decisions.csv |

### 8.2 Pelacakan, multi-kamera, asosiasi, kunjungan (Pi)

| Kode | Hasil yang diharapkan | Dasar | Bukti |
|---|---|---|---|
| C1, C2 | ID tidak berganti/tertukar | ByteTrack: asosiasi deteksi skor tinggi dan rendah [6]; ganti ID dihitung seperti CLEAR-MOT [7] | rekaman (ID di label), pelacakan.csv |
| C3a (3 dtk) | ID sama | Track yang hilang disimpan 40 frame yang diproses (±5 dtk pada 7,6 FPS; ±10 dtk dengan 2 kamera) [6] | rekaman |
| C3b (10 dtk) | ID sama atau ID baru dengan **nama dipulihkan** | Identitas dipulihkan lewat kemiripan penampilan (OSNet [8], ≥ 0,72) sampai 30 detik | rekaman, events.csv |
| C3c (20 dtk) | Nama dipulihkan; kunjungan bisa tercatat LOST lalu dibuka lagi | Jeda kunjungan 15 detik (bagian 9) | events.csv, kunjungan.csv |
| C4 | Tetap terlacak 10 menit, kunjungan tidak ditutup | Orang diam tetap terdeteksi tiap frame | events.csv |
| C5 | Jumlah orang benar (± 1) | Hitungan per kamera | metrics.csv (`orang_CAM_*`), okupansi.csv + jumlah yang diucapkan |
| C7 | A berlabel Staf, tidak dihitung pelanggan | Area staf di Tata Letak | rekaman |
| C8 | Boleh tertukar → keterbatasan | Fitur penampilan mirip untuk pakaian mirip [8] | rekaman |
| D1–D3 | ID dan nama sama setelah pindah kamera | Kamera dengan bidang pandang tumpang tindih: label konsisten di pita bersama [9]; jendela pindah 5 detik; kemiripan ReID ≥ 0,65 | events.csv (`PINDAH_KAMERA`), pelacakan.csv (`id_global`) |
| D4 | Boleh tidak tersambung → keterbatasan | Penampilan berubah total | rekaman |
| E0, E1–E3c | Nama ke badan yang benar **otomatis**; salah pasang 0 | Asosiasi probabilistik P = L/(ΣL + L₀) [12], P ≥ 0,85, dua kali berturut-turut; badan terdekat ke kamera wajah; kalibrasi kiri/kanan dan jarak (kuadrat terkecil) setelah ±5 contoh. Simulasi 2.000 pasangan: 99,7 % otomatis, 0 % salah | events.csv (`IKAT_OTOMATIS`, `RAGU`, `TANYA_KASIR`) |
| E3d | Kasir ditanya | Pembanding tanpa titik kamera wajah | events.csv (`TANYA_KASIR`) |
| E4–E6 | Sesuai tombol kasir | Fitur manual | events.csv (`IKAT_MANUAL`, `LEPAS`) |
| F1 | Ditutup EXIT_ZONE, jam keluar ≈ terlihat di rekaman | Zona pintu | kunjungan.csv + rekaman |
| F2, F3 | 20 dtk → LOST; 8 dtk → tidak ditutup | Jeda 15 detik (bagian 9) | kunjungan.csv, events.csv |
| F4 | Kunjungan sama dibuka lagi | Batas sesi 30 menit [13] | kunjungan.csv |
| F6 | TIMEOUT 15 menit setelah tanda terakhir | Batas sesi 11–15 menit [14] | kunjungan.csv |

### 8.3 Kasir, rekomendasi, website, kinerja

| Kode | Hasil yang diharapkan | Dasar | Bukti |
|---|---|---|---|
| G1 | Panel pelanggan muncul otomatis ≤ 3 detik setelah dikenali | Target latensi; batas respons yang terasa lancar ≤ 1 detik dan batas perhatian 10 detik [15] | rekaman |
| G2 | Putaran 1–3: "Terlaris 30 hari" | Kurang dari 3 transaksi = *cold start*, pakai popularitas [17] | rekaman, ringkasan_pelanggan.csv |
| G3 | Putaran 4–6: CF "Sering dibeli bersama ..." dari kelompok selera yang sama | Item-based CF, cosine [18][19] | rekaman, transaksi.csv |
| G4 | Putaran 5–6: "Coba yang baru" | Pelanggan setia ≥ 5 kunjungan (dimensi *frequency* RFM [20]); kebaruan dan keberagaman [21][22] | rekaman |
| G5 | Sapaan sesuai jenis pelanggan, berganti-ganti | Personalisasi sapaan | rekaman |
| G6 | Tamu tanpa nama | Pelanggan Tamu | transaksi.csv |
| G9 SUS | Skor ≥ 68 (rata-rata) | System Usability Scale [23], adaptasi Indonesia [24]; rata-rata acuan 68 [25] | lembar SUS |
| H1–H7 | Lihat 6.4 | Batas respons 0,1 / 1 / 10 detik [15] | rekaman, foto stopwatch |
| I1–I4 | Tidak ada data hilang; pulih sendiri | Antrean tulis (outbox) dan koneksi ulang | kunjungan.csv, pengenalan.csv (jam asli) |
| K | FPS stabil; suhu Pi < 80 °C | Batas pelambatan suhu Pi 5 | metrics.csv |

## 9. Angka waktu dan dasarnya

Tidak ada yang diubah untuk uji. Kolom **Saat uji** menunjukkan bagaimana jadwal menyesuaikan
diri dengan angka itu.

| Angka | Nilai | Jenis | Dasar | Saat uji |
|---|---|---|---|---|
| Sesi pengenalan | ≤ 10 frame / 2,5 detik; keputusan dini 4 frame | Desain + literatur | Target latensi 3 detik; uji sekuensial Wald [1] | Peserta menghadap kamera ±3 detik |
| Jeda kunjungan (tidak terlihat) | **15 detik** | Kalibrasi (nilai awal) | Segmentasi sesi Catledge & Pitkow (rata-rata + 1,5 SD) [13]; dihitung ulang dengan `gap_threshold.py` dari data uji | F2 menunggu 20 detik, F3 8 detik |
| Buka lagi kunjungan | **30 menit** | Literatur | Batas sesi 25,5 menit → 30 menit [13] | Putaran berjarak 40 menit; F4 kembali setelah 10 menit |
| Cadangan bila Pi mati | **15 menit** | Literatur | Batas sesi 11–15 menit [14] | F6 berjalan bersamaan dengan uji lain |
| Simpan track hilang | **40 frame** (±5 dtk / ±10 dtk dengan 2 kamera) | Literatur + desain | Buffer track ByteTrack [6] | C3a 3 dtk, C3b 10 dtk |
| Pulihkan nama | **30 detik**, kemiripan ≥ 0,72 | Desain | Re-identifikasi penampilan OSNet [8]; ≥ jeda kunjungan, sehingga orang yang tertutup tidak kehilangan nama | C3c 20 dtk |
| Jendela pindah kamera | **5 detik**, kemiripan ≥ 0,65; pengaman "dua tempat" 3 detik | Desain + literatur | Label konsisten pada kamera tumpang tindih [9] | D2–D3 berjalan biasa |
| Asosiasi | P ≥ 0,85, **2 event** berturut-turut (±2,5 detik antar event); tanya kasir setelah **2 event ragu** (±5 detik) | Desain + literatur | PDA [12]; jarak personal 0,45–1,2 m [26] | E menunggu ±5 detik per percobaan |
| Kalibrasi kamera wajah | ≥ **5** contoh tanpa keraguan | Literatur (kuadrat terkecil) + evaluasi | Simulasi 2.000 pasangan | Pendaftaran + Putaran 1–4 memberi ±25 contoh |
| Rekomendasi CF | ≥ **3** transaksi | Proposal + literatur | *Cold start* [17] | Putaran 4 |
| Pelanggan setia | ≥ **5** kunjungan | Desain | Frekuensi RFM [20] | Putaran 5 |
| Kamera langsung | ≤ 15 fps; ≤ 2 gambar dalam perjalanan | Desain | Batas respons [15] | H |

## 10. Cara menghitung hasil

| Ukuran | Rumus | Sumber data |
|---|---|---|
| Akurasi identifikasi | percobaan bernama benar / percobaan peserta terdaftar | decisions.csv + penanda di rekaman |
| Salah orang | percobaan bernama orang lain / semua percobaan (target 0) | sama |
| FAR (orang asing diterima) | percobaan S1/S2 yang diberi nama / semua percobaan S1/S2 | decisions.csv |
| Waktu pengenalan | `lama_sesi_s` (decisions.csv); dari melangkah sampai panel kasir muncul (rekaman) | decisions.csv, rekaman |
| Asosiasi otomatis benar | `IKAT_OTOMATIS` ke badan yang benar / semua percobaan asosiasi | events.csv + rekaman |
| Salah pasang | `IKAT_OTOMATIS` ke badan yang salah / semua (target 0) | sama |
| Tanya kasir | `TANYA_KASIR` / semua percobaan asosiasi | events.csv |
| Ganti ID (pelacakan) | jumlah perubahan ID per orang per menit [7] | rekaman (label ID), pelacakan.csv |
| Pindah kamera berhasil | perpindahan dengan ID sama / semua perpindahan | events.csv (`PINDAH_KAMERA`) + rekaman |
| Selisih jam keluar | \|keluar di CRM − keluar terlihat di rekaman\| (detik) | kunjungan.csv + rekaman |
| MAE durasi kunjungan | rata-rata \|durasi CRM − durasi sebenarnya\| | sama |
| Alasan keluar benar | EXIT_ZONE/LOST/TIMEOUT sesuai kejadian / semua kunjungan | kunjungan.csv |
| Strategi rekomendasi benar | strategi sesuai jumlah transaksi / semua kunjungan | rekaman + ringkasan_pelanggan.csv |
| SUS | (Σ(skor ganjil − 1) + Σ(5 − skor genap)) × 2,5 [23] | lembar SUS |

**Catatan statistik.** Dengan 9 orang, jumlah percobaan terbatas. Contohnya 60 percobaan orang asing
tanpa salah hanya membuktikan FAR ≤ 5 % (*rule of three*: 3/n [27]). Untuk FAR ≤ 1 % dibutuhkan ±300
percobaan. Karena itu angka FAR dan akurasi utama diambil dari **evaluasi dataset**
(`scripts/evaluate.py`), sedangkan uji lab ini membuktikan **sistem bekerja benar dari ujung ke ujung
dalam kondisi nyata**. Tulis keduanya dengan jujur di bab hasil.

Setelah uji, jalankan `scripts/gap_threshold.py` di Pi untuk menghitung jeda kunjungan dari data lab
(rata-rata + 1,5 SD [13]) dan bandingkan dengan 15 detik.

## 11. Kriteria berhasil (usulan)

| Bagian | Kriteria |
|---|---|
| Pengenalan normal (putaran) | Akurasi ≥ 95 %, salah orang 0, waktu ≤ 3 detik |
| Orang asing | 0 salah terima |
| Kondisi sulit (B3–B10) | Boleh "tidak dikenali"; **tidak boleh salah orang** |
| Asosiasi (E0–E3c, putaran) | ≥ 90 % benar otomatis, salah pasang 0 |
| Pelacakan 1–5 orang | ≤ 1 ganti ID per orang per 5 menit |
| Pindah kamera (berjalan melewati pita) | ≥ 80 % ID sama |
| Kunjungan | Selisih jam keluar ≤ 20 detik; alasan keluar benar ≥ 90 % |
| Rekomendasi | Strategi sesuai jumlah transaksi pada semua kunjungan |
| Ketahanan | Tidak ada data hilang; pulih sendiri |
| Kegunaan kasir | SUS ≥ 68 |

## 12. Keterbatasan (tulis bila terbukti)

- Tidak ada deteksi wajah palsu (B8).
- Masker atau kacamata hitam membuat pelanggan tidak dikenali (aman, tetapi kasir memilih manual).
- Pakaian sama atau berganti jaket bisa membuat ID tertukar atau tidak tersambung antar kamera (C8, D4).
- Pita tumpang tindih yang sempit menurunkan keberhasilan pindah kamera. Pada video uji dengan pita
  ±15 % lebar gambar, ID yang sama di pita bersama ±42 %; pada uji lab pita dibuat ±1 m.
- Uji dilakukan di lab dengan 9 orang; cahaya, tinggi kamera, dan keramaian kafe sungguhan bisa berbeda.
- Jumlah percobaan kecil (lihat catatan statistik di bagian 10).

## 13. Lembar

### 13.1 Daftar periksa harian

| Jam | Langkah | ☐ |
|---|---|---|
| 12.15 | Hotspot menyala dan HP dicas; Pi dan UNO Q dinyalakan | ☐ |
| 12.20 | CRM → Perangkat: kedua perangkat hijau; FPS normal; Asosiasi otomatis tidak bertuliskan "belum diatur" | ☐ |
| 12.25 | Tata layar dibuka: Kasir + tiga tampilan lokal | ☐ |
| 12.30 | Lux normal diukur di titik kasir ___ lux dan area duduk ___ lux | ☐ |
| 12.35 | Lakban dan barang uji siap; meja dan kursi di tempat | ☐ |
| 12.40 | OBS: rekam 10 detik dan putar ulang (gambar dan suara jelas) | ☐ |
| 12.45 | Ruang disk D: ___ GB (≥ 15 GB untuk satu hari) | ☐ |
| 15.45 | Ekspor dan cadangan (4.3) selesai | ☐ |
| 16.00 | Perangkat dimatikan dengan `shutdown` | ☐ |

### 13.2 Catatan masalah (hanya bila ada)

| Jam | Kode | Apa yang terjadi | Tindakan (diulang? kapan?) |
|---|---|---|---|
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |

### 13.3 Kuesioner SUS (kasir)

Skala 1 (sangat tidak setuju) sampai 5 (sangat setuju). Adaptasi bahasa Indonesia mengikuti [24].

| No | Pernyataan | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| 1 | Saya rasa saya akan sering memakai sistem ini | ☐ | ☐ | ☐ | ☐ | ☐ |
| 2 | Sistem ini terlalu rumit | ☐ | ☐ | ☐ | ☐ | ☐ |
| 3 | Sistem ini mudah dipakai | ☐ | ☐ | ☐ | ☐ | ☐ |
| 4 | Saya butuh bantuan orang teknis untuk memakai sistem ini | ☐ | ☐ | ☐ | ☐ | ☐ |
| 5 | Fitur-fitur sistem ini menyatu dengan baik | ☐ | ☐ | ☐ | ☐ | ☐ |
| 6 | Ada terlalu banyak hal yang tidak konsisten di sistem ini | ☐ | ☐ | ☐ | ☐ | ☐ |
| 7 | Kebanyakan orang akan cepat belajar memakai sistem ini | ☐ | ☐ | ☐ | ☐ | ☐ |
| 8 | Sistem ini merepotkan untuk dipakai | ☐ | ☐ | ☐ | ☐ | ☐ |
| 9 | Saya percaya diri memakai sistem ini | ☐ | ☐ | ☐ | ☐ | ☐ |
| 10 | Saya perlu belajar banyak hal sebelum bisa memakai sistem ini | ☐ | ☐ | ☐ | ☐ | ☐ |

## Referensi

1. Wald, A. (1945). Sequential tests of statistical hypotheses. *Annals of Mathematical Statistics*, 16(2), 117–186.
2. Lowe, D. G. (2004). Distinctive image features from scale-invariant keypoints. *International Journal of Computer Vision*, 60(2), 91–110.
3. Sengupta, S., Chen, J.-C., Castillo, C., Patel, V. M., Chellappa, R., & Jacobs, D. W. (2016). Frontal to profile face verification in the wild. *IEEE Winter Conference on Applications of Computer Vision (WACV)*.
4. Ngan, M., Grother, P., & Hanaoka, K. (2020). *Ongoing Face Recognition Vendor Test (FRVT) Part 6A: Face recognition accuracy with masks using pre-COVID-19 algorithms* (NISTIR 8311). National Institute of Standards and Technology.
5. ISO/IEC 30107-3:2017. *Information technology — Biometric presentation attack detection — Part 3: Testing and reporting*.
6. Zhang, Y., Sun, P., Jiang, Y., Yu, D., Weng, F., Yuan, Z., Luo, P., Liu, W., & Wang, X. (2022). ByteTrack: Multi-object tracking by associating every detection box. *European Conference on Computer Vision (ECCV)*.
7. Bernardin, K., & Stiefelhagen, R. (2008). Evaluating multiple object tracking performance: The CLEAR MOT metrics. *EURASIP Journal on Image and Video Processing*, 2008, 246309.
8. Zhou, K., Yang, Y., Cavallaro, A., & Xiang, T. (2019). Omni-scale feature learning for person re-identification. *IEEE/CVF International Conference on Computer Vision (ICCV)*.
9. Khan, S., & Shah, M. (2003). Consistent labeling of tracked objects in multiple cameras with overlapping fields of view. *IEEE Transactions on Pattern Analysis and Machine Intelligence*, 25(10), 1355–1360.
10. EN 12464-1:2011. *Light and lighting — Lighting of work places — Part 1: Indoor work places* (area kasir/till area ±500 lx).
11. ISO/IEC 19794-5:2011. *Information technology — Biometric data interchange formats — Part 5: Face image data* (syarat pencahayaan dan pose citra wajah).
12. Bar-Shalom, Y., & Fortmann, T. E. (1988). *Tracking and Data Association*. Academic Press.
13. Catledge, L. D., & Pitkow, J. E. (1995). Characterizing browsing strategies in the World-Wide Web. *Computer Networks and ISDN Systems*, 27(6), 1065–1073.
14. Göker, A., & He, D. (2000). Analysing web search logs to determine session boundaries for user-oriented learning. *Adaptive Hypermedia and Adaptive Web-Based Systems*, LNCS 1892, 319–322.
15. Nielsen, J. (1993). *Usability Engineering*. Academic Press (batas waktu respons 0,1 / 1 / 10 detik).
16. Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.
17. Cremonesi, P., Koren, Y., & Turrin, R. (2010). Performance of recommender algorithms on top-N recommendation tasks. *ACM Conference on Recommender Systems (RecSys)*.
18. Sarwar, B., Karypis, G., Konstan, J., & Riedl, J. (2001). Item-based collaborative filtering recommendation algorithms. *International World Wide Web Conference (WWW)*.
19. Hu, Y., Koren, Y., & Volinsky, C. (2008). Collaborative filtering for implicit feedback datasets. *IEEE International Conference on Data Mining (ICDM)*.
20. Hughes, A. M. (1994). *Strategic Database Marketing*. Probus Publishing.
21. Vargas, S., & Castells, P. (2011). Rank and relevance in novelty and diversity metrics for recommender systems. *ACM RecSys*.
22. Carbonell, J., & Goldstein, J. (1998). The use of MMR, diversity-based reranking for reordering documents and producing summaries. *ACM SIGIR*.
23. Brooke, J. (1996). SUS: A "quick and dirty" usability scale. Dalam P. W. Jordan dkk. (Ed.), *Usability Evaluation in Industry* (hlm. 189–194). Taylor & Francis.
24. Sharfina, Z., & Santoso, H. B. (2016). An Indonesian adaptation of the System Usability Scale (SUS). *International Conference on Advanced Computer Science and Information Systems (ICACSIS)*, 145–148.
25. Bangor, A., Kortum, P., & Miller, J. (2009). Determining what individual SUS scores mean: Adding an adjective rating scale. *Journal of Usability Studies*, 4(3), 114–123.
26. Hall, E. T. (1966). *The Hidden Dimension*. Doubleday.
27. Hanley, J. A., & Lippman-Hand, A. (1983). If nothing goes wrong, is everything all right? Interpreting zero numerators. *JAMA*, 249(13), 1743–1745.
