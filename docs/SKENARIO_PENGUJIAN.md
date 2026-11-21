# Skenario Pengujian Sistem (uji lab)

Dokumen ini adalah panduan uji coba seluruh sistem di ruang lab. Isinya: siapa saja yang
dibutuhkan, alat apa yang disiapkan, langkah tiap skenario, hasil yang **seharusnya** terjadi, dan
apa yang harus dicatat. Setiap skenario punya kode (mis. **B3**) supaya mudah dirujuk di lembar
catatan dan di bab hasil skripsi.

Sistem yang diuji:

| Bagian | Perangkat | Isi |
|---|---|---|
| Pengenalan wajah | Arduino UNO Q + webcam di kasir | SCRFD + MobileFaceNet, τ = 0,40, margin 0,08 |
| Pelacakan orang | Raspberry Pi 5 + 1–2 webcam plafon (±3 m) | YOLO11n + ByteTrack + OSNet, multi-kamera |
| Asosiasi wajah → badan | Raspberry Pi 5 | P = L / (ΣL + L₀), P ≥ 0,85, 2× berturut-turut |
| CRM | Website (Vercel + Supabase) | Kasir, rekomendasi, kunjungan, kamera langsung |

---

## 1. Ringkasan kebutuhan

### 1.1 Orang

| Peran | Jumlah | Tugas |
|---|---|---|
| **Koordinator** (kamu) | 1 | Memimpin skenario, memberi aba-aba, mengubah pengaturan |
| **Kasir** | 1 | Mengoperasikan halaman Kasir di CRM seperti kasir sungguhan |
| **Pencatat / pengamat** | 1 | Stopwatch, mengisi lembar catatan, mencatat kejadian sebenarnya (*ground truth*) |
| **Peserta terdaftar** (P01–P12) | **12** | Wajahnya didaftarkan; berperan sebagai pelanggan |
| **Peserta tidak terdaftar** (S01–S04) | **4** | Tidak didaftarkan; menguji "orang asing tidak boleh dikenali sebagai orang lain" |
| **Total** | **19 orang** | |

**Minimum kalau sulit mencari orang:** 1 koordinator merangkap pencatat, 1 kasir, 8 peserta
terdaftar dan 3 tidak terdaftar, jadi **13 orang**. Skenario ramai (C5) lalu hanya sampai 8–10 orang.

Variasi peserta terdaftar (sebisa mungkin):
- laki-laki dan perempuan, warna kulit dan tinggi badan berbeda;
- 2–3 orang berkacamata, 2–3 orang berhijab;
- bila ada: 2 orang yang **mirip** (saudara kandung, atau sering disangka mirip), untuk B9;
- 2 peserta tidak terdaftar sebaiknya berpenampilan mirip salah satu peserta terdaftar
  (gender, gaya rambut, kacamata), supaya uji orang asing tidak terlalu mudah.

Setiap peserta memakai **label kode** (P01, S01, ...) yang terlihat oleh pencatat (bukan oleh
kamera), dan mengisi **formulir persetujuan** pendaftaran wajah (CRM menanyakan persetujuan saat
mendaftar).

### 1.2 Peralatan

- [ ] Arduino UNO Q + webcam kasir (kamera NEMESIS), menghadap posisi pelanggan di depan kasir
- [ ] Raspberry Pi 5 + **2 webcam area** (CAM_1 = area kasir/antrean, CAM_2 = area duduk), dipasang
      setinggi ±3 m (tiang, lemari tinggi, atau tripod + tongkat), menghadap ke bawah ±45°
- [ ] Laptop untuk CRM halaman **Kasir**, dan satu laptop/HP lain untuk halaman **Kamera**
- [ ] Hotspot HP atau Wi-Fi lab (catat yang dipakai)
- [ ] Lakban warna untuk tanda lantai, meteran 3–5 m
- [ ] HP dengan aplikasi **pengukur cahaya (lux meter)** dan **stopwatch**
- [ ] HP/kamera untuk merekam layar dan suasana (bukti dan untuk menghitung ulang)
- [ ] Lampu tambahan (lampu meja/LED) dan cara meredupkan ruangan (matikan sebagian lampu, tutup tirai)
- [ ] Barang untuk uji penampilan: topi, masker, kacamata hitam, jaket berwarna mencolok
- [ ] Meja + kursi (meja kasir, 2–3 meja duduk), 1 "pintu keluar" (pintu lab atau tanda di lantai)
- [ ] Lembar catatan (bagian 9) dicetak, atau spreadsheet

### 1.3 Tata letak lab

```
   ┌──────────────────────────── ruang lab ─────────────────────────────┐
   │                                                                    │
   │  [PINTU] ← zona keluar (digambar di Tata Letak Kamera)             │
   │                                                                    │
   │      CAM_1 (plafon)                          CAM_2 (plafon)        │
   │   ┌─────────────────────┐ zona pindah ┌──────────────────────┐     │
   │   │  antrean & kasir    │<===========>│   area duduk         │     │
   │   │                     │  (tumpang   │   meja 1  meja 2     │     │
   │   │  ▢ titik kasir      │   tindih)   │   meja 3             │     │
   │   │  ┄ 0,6 m ┄ 1,0 m ┄  │             │                      │     │
   │   │  [MEJA KASIR]       │             │                      │     │
   │   │  UNO Q + kamera     │             │                      │     │
   │   │  wajah (±1 m depan) │             │                      │     │
   │   │  [zona staf]        │             │                      │     │
   │   └─────────────────────┘             └──────────────────────┘     │
   └────────────────────────────────────────────────────────────────────┘
```

Tanda lantai (lakban):
- **titik kasir**: tempat pelanggan berdiri saat membayar, ±0,8–1,0 m dari kamera wajah;
- **garis antrean** 0,6 m dan 1,0 m di belakang titik kasir (untuk E2/E3);
- **tanda jarak** 0,5 / 1,0 / 1,5 / 2,0 m dari kamera wajah (untuk B4).

Bidang pandang CAM_1 dan CAM_2 harus **tumpang tindih ±1 m** di zona pindah, supaya orang yang
pindah kamera bisa disambungkan (D1).

---

### 1.4 Memasang dua kamera area (multi-kamera)

Satu Raspberry Pi 5 menangani **dua** webcam USB (CAM_1 dan CAM_2). Kabel USB yang pendek
diatasi dengan menaruh **Pi-nya** di atas, bukan memanjangkan kabel kamera:

| Pilihan | Cara | Catatan |
|---|---|---|
| **A. Pi di atas (disarankan)** | Pi diletakkan tinggi di antara kedua kamera (di atas lemari/rak, atau ditempel di tiang/tripod), webcam dicolok langsung. Yang dipanjangkan hanya **kabel listrik** (pakai stop kontak/terminal) | Pi terhubung lewat Wi-Fi/hotspot; tidak perlu kabel data panjang. Pakai adaptor resmi 5 V 5 A |
| B. Kabel USB aktif | Kabel perpanjangan USB **aktif** (ada chip penguat), 5–10 m | Kabel USB 2.0 biasa (pasif) paling panjang ±5 m; jangan menyambung beberapa kabel pasif |
| C. USB lewat kabel LAN | Extender USB-over-Ethernet (Cat5e/6), sampai ±50 m | Lebih mahal |
| D. Kamera IP / HP | HP Android dengan aplikasi kamera IP (RTSP), atau kamera CCTV IP. Pilih sumbernya di CRM → Perangkat (`rtsp://...`) | Tanpa kabel data, tetapi Wi-Fi harus kuat; ada jeda ±0,2–0,5 detik |

Mengaktifkan kamera kedua di website:
1. Colok webcam kedua ke port USB biru Pi, tunggu 10 detik.
2. CRM → **Perangkat** → kartu Raspberry Pi → **Kamera area 2**: tekan **Pakai webcam ini** (atau pilih
   Webcam USB / Kamera IP), beri nama (mis. *Area duduk*), **Simpan pilihan**. Pi memulai ulang ±15 detik.
3. Beri nama juga Kamera area 1 (mis. *Area kasir*).
4. **Tata Letak Kamera**: pilih kamera 2 di atas gambar, gambar **Area pindah kamera** (dan pintu bila ada);
   gambar area pindah di tempat yang sama pada kamera 1.
5. **Kamera** → **Semua kamera area**: kedua kamera tampil berdampingan; nama pelanggan ikut pindah.

Aturan pemasangan:
- **Satu webcam per port USB 3.0 (biru)** di Pi 5. Program sudah meminta format MJPG, jadi dua kamera
  640×480 tidak berebut bandwidth.
- Tinggi ±2,5–3 m, menghadap ke bawah ±45°, seluruh badan orang (kepala sampai kaki) terlihat di area
  yang penting (antrean, titik kasir).
- Bidang pandang CAM_1 dan CAM_2 **tumpang tindih ±1 m**. Gambar **Area pindah kamera** di tempat yang
  sama pada kedua kamera.
- Jangan menghadap jendela/lampu terang secara langsung.
- Dua kamera berbagi tenaga hitung Pi: bila satu kamera ±7,6 FPS, dua kamera menjadi ±3,8 FPS
  masing-masing. Itu cukup untuk orang berjalan biasa, tetapi catat FPS-nya (K1).

## 2. Persiapan (sehari sebelumnya dan pagi hari uji)

| No | Langkah | Cek |
|---|---|---|
| P1 | Kedua perangkat menyala dan **online** (CRM → Perangkat: lampu hijau) | ☐ |
| P2 | CRM → Perangkat → **Cek mandiri** di kedua perangkat: semua baris hijau | ☐ |
| P3 | "Kamera real-time" **Aktif** di kedua perangkat; halaman Kamera menunjukkan "Langsung · … fps" | ☐ |
| P4 | Kamera wajah = webcam kasir yang benar; CAM_1 dan CAM_2 benar (CRM → Perangkat) | ☐ |
| P5 | **Tata Letak Kamera**: titik kasir, **kamera wajah** (klik meja tepat di bawah kamera UNO Q), zona staf, zona keluar (pintu), zona pindah di CAM_1 dan CAM_2 | ☐ |
| P5b | **Pemanasan kalibrasi**: 6–8 peserta berbeda, satu per satu, berdiri di posisi yang berbeda-beda di dalam lingkaran (kiri, tengah, kanan, agak maju, agak mundur) sampai namanya menempel. Cek di Perangkat bahwa kalibrasi kamera wajah sudah selesai | ☐ |
| P6 | **Pengaturan**: jeda kunjungan 15 detik, cadangan 15 menit, kunjungan maks 6 jam | ☐ |
| P7 | Menu di CRM sudah lengkap (±15–30 menu, beberapa kategori) | ☐ |
| P8 | Catat FPS awal: UNO Q ___ FPS, Pi CAM_1 ___ FPS, CAM_2 ___ FPS; suhu CPU Pi ___ °C | ☐ |
| P9 | Ukur cahaya normal di titik kasir: ___ lux, di area duduk: ___ lux | ☐ |
| P10 | Jam semua perangkat sama (lihat jam di CRM vs jam HP; selisih < 2 detik) | ☐ |
| P11 | Rekam layar disiapkan (OBS/HP) untuk halaman Kamera | ☐ |
| P12 | Hapus data uji lama (pelanggan, wajah, kunjungan, transaksi) supaya hasil bersih | ☐ |

---

## 3. Jadwal yang disarankan (2 hari)

Kunjungan yang kembali dalam **30 menit** dihitung sebagai kunjungan yang sama. Status "pelanggan
setia" butuh **5 kunjungan**, dan rekomendasi collaborative filtering butuh **≥ 3 transaksi**. Karena itu
peserta datang dalam beberapa **sesi** yang berjarak **> 30 menit**, dan setiap sesi setiap peserta
melakukan "kunjungan" lengkap (masuk → pesan → bayar → duduk → keluar).

| Hari | Sesi | Waktu | Isi |
|---|---|---|---|
| 1 | Sesi 1 | 08.30–10.00 | Persiapan, **A** (pendaftaran semua P), kunjungan ke-1 (G1, G2) |
| 1 | Sesi 2 | 10.30–12.00 | **B1–B2** (pengenalan normal + orang asing), kunjungan ke-2 |
| 1 | Sesi 3 | 13.00–14.30 | **B3–B11** (cahaya, pose, jarak, aksesoris, 2 orang), kunjungan ke-3 |
| 1 | Sesi 4 | 15.00–16.30 | **C** dan **D** (pelacakan, multi-kamera), **F** (kunjungan), kunjungan ke-4 |
| 2 | Sesi 5 | 08.30–10.00 | **E** (asosiasi wajah → badan), kunjungan ke-5 → P01–P06 menjadi pelanggan setia |
| 2 | Sesi 6 | 10.30–12.00 | **G3–G7** (rekomendasi, setia, sapaan), **H** (kamera di website) |
| 2 | Sesi 7 | 13.00–16.00 | **I** (ketahanan) dan **K2** (uji jalan lama 2–3 jam), **J** (privasi) |

Supaya rekomendasi bisa dibandingkan: **P01–P06 ikut semua sesi** (≥ 5 kunjungan, setia, CF aktif),
**P07–P09 hanya 2 sesi** (< 3 transaksi, *cold start*), **P10–P12 3–4 sesi** (CF aktif, belum setia).

---

## 4. Daftar skenario

Format setiap skenario: **Tujuan** · **Orang** · **Langkah** · **Hasil yang diharapkan** · **Dicatat**.
"Diharapkan" adalah perilaku sistem menurut desainnya; bila berbeda, catat sebagai temuan.

### A. Pendaftaran wajah (UNO Q + CRM)

| Kode | Skenario | Langkah | Hasil yang diharapkan | Dicatat |
|---|---|---|---|---|
| A1 | Pendaftaran normal | Kasir: Pelanggan baru → isi data → centang persetujuan → Daftarkan wajah. Peserta berdiri di titik kasir, menghadap kamera, sedikit menoleh kiri/kanan | Selesai ≤ 20 detik, 5 sampel tersimpan, wajah muncul di **Wajah Terdaftar** | Waktu daftar, berhasil/gagal (12 orang) |
| A2 | Tanpa persetujuan | Coba daftar tanpa mencentang persetujuan | Ditolak, tidak ada data wajah tersimpan | Ya/tidak |
| A3 | Kondisi buruk saat mendaftar | Daftar sambil menoleh jauh / terlalu jauh (2 m) / cahaya gelap | Muncul pesan mutu ("Tampak samping", "Terlalu jauh", "Terlalu gelap/terang", "Buram"); gagal setelah 20 detik bila mutu tidak membaik | Pesan yang muncul |
| A4 | Dua wajah saat mendaftar | Orang lain berdiri di samping peserta saat mendaftar | Muncul "Beberapa wajah sama dekat"; tidak mengambil wajah orang lain | Ya/tidak |
| A5 | Daftar ulang | Daftarkan ulang wajah P01 | Data lama diganti, P01 tetap dikenali | Ya/tidak |
| A6 | Hapus data wajah | Hapus wajah P12 (sesudah semua uji P12 selesai) | Data hilang dari Wajah Terdaftar; P12 tidak dikenali lagi (dalam ±2 menit) | Waktu sampai tidak dikenali |

### B. Pengenalan wajah (UNO Q)

Satu **percobaan** = peserta berjalan ke titik kasir, berdiri ±3 detik menghadap kasir, lalu pergi
(minimal 3 detik di luar kamera sebelum percobaan berikutnya). Hasil dilihat di halaman Kasir dan
**Log Pengenalan**.

| Kode | Skenario | Orang | Langkah | Hasil yang diharapkan | Dicatat |
|---|---|---|---|---|---|
| B1 | **Normal** (cahaya normal, frontal, ±1 m) | 12 P | 5 percobaan per orang = 60 | Nama benar ≤ 3 detik | Benar / salah orang / tidak dikenali; waktu (stopwatch: menginjak titik → nama tampil) |
| B2 | **Orang asing** | 4 S | 15 percobaan per orang = 60 | "Tidak dikenal", **tidak pernah** dikenali sebagai P mana pun | Jumlah salah terima |
| B3a | Gelap (±20–50 lux) | 6 P | Matikan sebagian lampu; 3 percobaan per orang | Dikenali, atau pesan "Terlalu gelap/terang" (menolak lebih baik daripada salah) | Lux, benar/salah/tolak |
| B3b | Terang (> 1000 lux) | 6 P | Lampu tambahan diarahkan ke wajah; 3 percobaan | Seperti B3a | Lux, hasil |
| B3c | Cahaya dari belakang (*backlight*) | 6 P | Peserta membelakangi jendela/lampu terang | Bisa gagal (wajah gelap); tidak boleh salah orang | Hasil |
| B3d | Cahaya dari samping | 6 P | Satu lampu dari samping, sisi lain gelap | Seperti B3a | Hasil |
| B4a | Jarak | 6 P | Berdiri di tanda 0,5 / 1,0 / 1,5 / 2,0 m; 2 percobaan per jarak | Dikenali sampai ±1,6 m; "Terlalu jauh" setelahnya (tergantung sudut lensa webcam) | Jarak terjauh yang masih dikenali |
| B4b | Sudut kepala | 6 P | Menoleh ±15°, ±30°, ±45°; menunduk melihat HP | 15° dikenali; 45° → "Tampak samping" (ditunda, bukan salah) | Hasil per sudut |
| B5a | Kacamata biasa dipakai/dilepas | Peserta berkacamata | Uji dengan dan tanpa kacamata | Tetap dikenali | Hasil |
| B5b | Topi | 4 P | Pakai topi | Umumnya dikenali | Hasil |
| B5c | Masker | 4 P | Pakai masker | **Tidak dikenali** (wajar), **tidak boleh salah orang** | Hasil |
| B5d | Kacamata hitam | 4 P | Pakai kacamata hitam | Boleh tidak dikenali, tidak boleh salah orang | Hasil |
| B5e | Hijab/gaya rambut berbeda dari saat mendaftar | Peserta berhijab | Ganti model/warna hijab | Tetap dikenali | Hasil |
| B6a | **2 orang di depan kasir, berdampingan** | 2 P | Berdiri bersebelahan, jarak sama ke kamera | "Beberapa wajah sama dekat" → keputusan ditunda sampai satu orang jelas lebih dekat | Apakah ada salah orang |
| B6b | 2 orang, satu di belakang | 2 P | P di titik kasir, P lain 1 m di belakang | Yang **lebih dekat** dikenali | Siapa yang dikenali |
| B6c | 1 terdaftar + 1 asing | 1 P + 1 S | Seperti B6a dan B6b | P dikenali, S tidak pernah diberi nama P | Hasil |
| B6d | Bergantian cepat | 3 P | Antre, maju satu per satu tanpa jeda | Masing-masing dikenali dengan nama sendiri | Salah orang? |
| B7 | Berjalan lewat tanpa berhenti | 4 P | Lewat di depan kasir | Boleh dikenali atau tidak; tidak salah orang | Hasil |
| B8 | Foto wajah di HP (*spoofing*) | 2 P | Tunjukkan foto P di layar HP ke kamera | **Kemungkinan dikenali**: sistem tidak punya deteksi wajah palsu. Catat sebagai **keterbatasan** | Hasil |
| B9 | Orang mirip / saudara | pasangan mirip | Hanya satu yang didaftarkan, keduanya diuji | Yang tidak terdaftar tidak boleh diberi nama yang terdaftar (margin 0,08) | Hasil |
| B10 | Ekspresi | 4 P | Tersenyum lebar, tertawa, bicara | Dikenali | Hasil |
| B11 | Waktu pengenalan | Data dari B1 | Hitung rata-rata, median dan maksimum waktu | ≤ 3 detik (target proposal); keputusan dini ±0,3–0,5 detik bila wajah sangat jelas | Statistik waktu |

### C. Pelacakan orang, satu kamera (Pi, CAM_1)

Lihat di halaman **Kamera** (kotak orang dan nomor ID) dan rekam layarnya.

| Kode | Skenario | Orang | Langkah | Hasil yang diharapkan | Dicatat |
|---|---|---|---|---|---|
| C1 | 1 orang berjalan | 1 | Berjalan keliling area 1 menit | Satu kotak, ID tidak berganti | Jumlah ganti ID |
| C2 | 2 orang berpapasan | 2 | Berjalan berlawanan arah, berpapasan dekat | ID tidak tertukar | Ganti/tukar ID |
| C3 | Tertutup orang lain/benda (oklusi) | 2–3 | Satu orang lewat di belakang orang lain / tiang selama 2–3 detik | ID sama setelah terlihat lagi | Hasil |
| C4 | Duduk diam lama | 3 | Duduk 10 menit | Tetap terlacak, tidak dianggap pergi | Ganti ID, kunjungan tidak ditutup |
| C5 | **Ramai** | 5, lalu 8, lalu 10 | Semua bergerak acak 2 menit, lalu duduk | Jumlah orang benar (± 1); catat ganti ID dan FPS | Jumlah terdeteksi vs sebenarnya, ganti ID, FPS |
| C6a | Gelap | 3 | Ulang C1/C2 dengan lampu redup | Masih terdeteksi; catat bila hilang | Lux, hasil |
| C6b | Terang/silau | 3 | Ulang C1/C2 dengan lampu tambahan | Seperti C6a | Hasil |
| C7 | Staf di zona staf | 1 staf | Staf berdiri/bekerja di zona staf beberapa menit | Ditandai **Staf** (oranye), tidak dihitung pelanggan | Waktu sampai ditandai staf |
| C8 | Pakaian mirip | 2–3 | Peserta berpakaian warna sama berpapasan | Catat tukar ID (keterbatasan wajar) | Hasil |

### D. Multi-kamera (CAM_1 ↔ CAM_2)

| Kode | Skenario | Orang | Langkah | Hasil yang diharapkan | Dicatat |
|---|---|---|---|---|---|
| D1 | Pindah kamera | 1 P (sudah dikenali) | Dari kasir jalan ke area duduk (CAM_2) | ID dan **nama tetap sama** di CAM_2 | Berhasil/tidak, waktu tersambung |
| D2 | Bolak-balik | 1 P | 3× bolak-balik antar kamera | Tetap sama | Jumlah gagal |
| D3 | 2–3 orang pindah bersamaan | 3 P | Bersama-sama ke area duduk | Nama tidak tertukar | Hasil |
| D4 | Ganti jaket di area duduk | 1 P | Pakai jaket mencolok di CAM_2, kembali ke CAM_1 | Bisa tidak tersambung (penampilan berubah); **catat sebagai keterbatasan** | Hasil |
| D5 | Masuk langsung ke area duduk | 1 P | Tanpa lewat kasir | Terlacak tanpa nama (belum lewat kasir) | Hasil |

### E. Asosiasi wajah → badan (UNO Q → Pi)

Inti penelitian: nama dari kamera wajah dipasang ke badan yang benar di kamera plafon.

| Kode | Skenario | Orang | Langkah | Hasil yang diharapkan | Dicatat |
|---|---|---|---|---|---|
| E0 | **Pelanggan baru** | 1 S | Kasir mendaftarkan S (A1) saat S berdiri di titik kasir | Begitu pendaftaran selesai, nama S **langsung** menempel ke badannya (tanpa kasir memilih) | Waktu dari "Wajah tersimpan" sampai nama menempel |
| E1 | 1 orang di kasir | 1 P × 12 | Berdiri di titik kasir sampai dikenali | Nama otomatis menempel ke badan yang benar (hijau) dalam beberapa detik | Benar/salah/tanya; waktu |
| E2 | Antrean berjarak ±1 m | 2 P | P_a di titik kasir, P_b di garis 1,0 m | Nama P_a menempel ke badan P_a, **tidak** ke P_b | Hasil (10 percobaan) |
| E3a | **Antre berdempetan** (< 0,6 m di belakang) | 2 P | P_b di garis 0,6 m di belakang P_a | Dengan titik kamera wajah: nama ke P_a **otomatis** (yang paling dekat kamera wajah) | Otomatis benar / salah / tanya |
| E3b | **Berdampingan** di dalam lingkaran | 2 P | P_a dan P_b berdiri sejajar, P_a di depan kamera wajah | Setelah kalibrasi (P5b): nama ke P_a otomatis. Sebelum kalibrasi: kasir ditanya (setelah ±5 detik ragu) | Otomatis benar / salah / tanya |
| E3c | Bertukar posisi | 2 P | Ulang E3b, kali ini P_b yang di depan kamera | Nama ke P_b | Hasil |
| E3d | Tanpa titik kamera wajah | 2 P | Hapus titik kamera wajah sementara, ulangi E3a | Kasir ditanya (perilaku lama), untuk perbandingan di skripsi | Hasil |
| E4 | Kaitkan manual | 2 P | Dari E3: kasir memilih orang yang benar di gambar | Nama menempel (tanda ✓ MANUAL) | Waktu kasir menjawab |
| E5 | Lepas pasangan yang salah | 1 P | Pasang manual ke orang yang salah, lalu "Bukan orang ini"/lepas | Nama lepas dari badan salah; kunjungan tidak ditutup | Hasil |
| E6 | Pelanggan dikira staf | 1 P | P berdiri lama di zona staf sampai ditandai staf, lalu kasir menekan **Bukan staf** | Status staf hilang, kembali sebagai pelanggan | Hasil |
| E7 | Nama tetap menempel | 1 P | Setelah E1: jalan ke CAM_2, duduk 5 menit, kembali | Nama tetap di badan yang sama | Hasil |
| E8 | Titik kasir belum digambar | 1 P | Hapus titik kasir sementara | Kasir ditanya ("Titik kasir belum diatur") | Hasil, lalu gambar ulang |
| E9 | Pelanggan asing di kasir | 1 S | S di titik kasir | Tidak ada nama terpasang (tidak dikenal) | Hasil |

### F. Kunjungan (masuk, durasi, keluar)

Pencatat menulis **jam masuk dan keluar sebenarnya** (stopwatch/HP) untuk dibandingkan dengan
halaman **Kunjungan**.

| Kode | Skenario | Langkah | Hasil yang diharapkan | Dicatat |
|---|---|---|---|---|
| F1 | Kunjungan lengkap, keluar lewat pintu | Masuk → kasir → bayar → duduk 5 menit → keluar lewat zona keluar | Kunjungan dibuka saat dikenali, ditutup dengan alasan **EXIT_ZONE**; jam keluar ≈ jam sebenarnya | Selisih jam masuk/keluar (detik) |
| F2 | Hilang dari kamera | Keluar area tanpa lewat pintu (mis. ke sudut di luar kamera) > 15 detik | Ditutup **LOST**, jam keluar = terakhir terlihat | Selisih |
| F3 | Hilang sebentar | Keluar kamera 5–10 detik lalu kembali | **Tidak** ditutup | Hasil |
| F4 | Kembali < 30 menit | Setelah F1, kembali 10 menit kemudian | Kunjungan yang sama dibuka lagi (bukan kunjungan baru) | Hasil |
| F5 | Kembali > 30 menit | Sesi berikutnya | Kunjungan **baru** | Hasil |
| F6 | Pi mati | Matikan Pi, pelanggan dikenali di kasir lalu pergi | CRM menutup kunjungan setelah **15 menit** tanpa tanda (TIMEOUT) | Waktu tutup |
| F7 | Durasi | Dari F1/F2 semua peserta | Bandingkan durasi CRM vs sebenarnya | Rata-rata selisih (MAE) |

### G. Kasir, rekomendasi, sapaan (CRM)

| Kode | Skenario | Langkah | Hasil yang diharapkan | Dicatat |
|---|---|---|---|---|
| G1 | Pelanggan dikenali di kasir | P berdiri di titik kasir | Panel pelanggan muncul otomatis di halaman Kasir: nama, sapaan, favorit, rekomendasi | Waktu muncul |
| G2 | **Cold start** (< 3 transaksi) | P07–P09 | Rekomendasi = **terlaris 30 hari** ("Terlaris 30 hari terakhir") | Strategi tampil |
| G3 | **Collaborative filtering** (≥ 3 transaksi) | P01–P06, P10–P12 | Rekomendasi CF ("Sering dibeli bersama …") | Strategi, menu |
| G4 | Pelanggan setia (≥ 5 kunjungan) | P01–P06 di sesi 6 | Ada bagian **"Coba yang baru"** berisi menu yang belum pernah dipesan | Ada/tidak, isi |
| G5 | Sapaan kasir | Lihat kartu sapaan untuk pelanggan baru, kembali, setia | Kalimat sesuai jenis ("Halo Kak …, mau pesan … lagi?"), berganti-ganti | Contoh kalimat |
| G6 | Pesanan tamu (tidak dikenal) | S memesan | Transaksi tamu tanpa nama; tidak masuk riwayat pelanggan | Hasil |
| G7 | Tab belum dibayar | Pesan dulu, bayar belakangan | Muncul di **Belum dibayar**, hilang setelah bayar | Hasil |
| G8 | Riwayat & dashboard | Setelah semua sesi | Jumlah kunjungan, transaksi, durasi rata-rata cocok dengan catatan | Cocok/tidak |
| G9 | Penilaian kasir | Kasir mengisi kuesioner singkat (mudah dipakai, membantu, cepat; skala 1–5) | – | Skor |

Untuk mengukur rekomendasi secara offline (presisi), jalankan `scripts/evaluate_recommender.py` dengan
data transaksi setelah uji (lihat `docs/RECOMMENDATION.md`).

### H. Kamera langsung di website

| Kode | Skenario | Langkah | Hasil yang diharapkan | Dicatat |
|---|---|---|---|---|
| H1 | Tampilan langsung | Buka halaman Kamera | "Langsung · ±12–15 fps", gerakan halus | fps yang tampil |
| H2 | **Jeda gambar** | Arahkan kamera ke HP yang menampilkan stopwatch (ms); foto layar CRM dan HP bersamaan | Selisih kecil (±0,2–0,5 detik) | Selisih (5 kali) |
| H3 | Hemat data | Klik **Hemat data** | ±6 fps, gambar lebih kecil | fps |
| H4 | Jalur cadangan | Matikan cloudflared (restart perangkat dengan `LIVE_TUNNEL=0`) atau putus sementara | Berubah ke **Cadangan** dalam beberapa detik, lalu kembali ke Langsung bila pulih | Waktu pindah |
| H5 | 2 penonton | Buka halaman Kamera di 2 perangkat | Keduanya lancar | fps masing-masing |
| H6 | Tab disembunyikan | Pindah tab 1 menit, kembali | Gambar langsung muncul lagi; saat tersembunyi tidak mengirim data | Hasil |
| H7 | Kotak orang | Orang berjalan cepat di CAM_1 | Kotak mengikuti orang (tidak tertinggal jauh) | Penilaian visual |

### I. Ketahanan (gangguan)

| Kode | Skenario | Langkah | Hasil yang diharapkan | Dicatat |
|---|---|---|---|---|
| I1 | Internet putus 2 menit | Matikan hotspot, lakukan 2–3 kunjungan, nyalakan lagi | Pengenalan dan pelacakan tetap jalan; data terkirim setelah internet kembali (tidak hilang) | Data lengkap? |
| I2 | Restart Pi | CRM → Perangkat → Restart | Kembali online ≤ 1 menit; pelacakan jalan lagi | Waktu |
| I3 | Restart UNO Q | Sama | Sama | Waktu |
| I4 | Kabel webcam dicabut lalu dicolok | Cabut 10 detik | Kamera tersambung kembali sendiri | Waktu |
| I5 | Alamat IP berubah | Ganti jaringan (hotspot lain) | Mode alamat **auto**: UNO Q tetap bisa mengirim ke Pi | Hasil |
| I6 | Listrik mati | Cabut daya kedua perangkat, colok lagi | Program jalan sendiri saat menyala | Waktu sampai online |
| I7 | Website di HP / koneksi lemah | Buka CRM dari HP dengan sinyal lemah | Tidak macet; muncul banner offline bila putus, pulih sendiri | Hasil |

### J. Privasi dan hak akses

| Kode | Skenario | Hasil yang diharapkan |
|---|---|---|
| J1 | Login sebagai staf (bukan pemilik) | Tidak bisa mengubah pengaturan perangkat / menghapus data penting |
| J2 | Wajah tanpa persetujuan | Tidak bisa didaftarkan (A2) |
| J3 | Hapus data pelanggan | Data wajah ikut terhapus (A6) |
| J4 | Gambar kamera | Tidak tersimpan sebagai rekaman (hanya gambar terbaru) |

### K. Kinerja

| Kode | Skenario | Langkah | Dicatat |
|---|---|---|---|
| K1 | Kecepatan per perangkat | Saat normal, ramai (C5) dan dengan 2 penonton kamera | FPS UNO Q, FPS Pi per kamera, waktu deteksi/embedding UNO Q (Perangkat) |
| K2 | **Uji jalan lama** | 2–3 jam terus menyala dengan aktivitas kecil | FPS, suhu CPU Pi, error di Perangkat, tiap 30 menit |
| K3 | Pemakaian data | Catat kuota hotspot sebelum/sesudah 30 menit menonton kamera | MB per jam (Halus vs Hemat) |
| K4 | Kecepatan halaman | Buka halaman Kasir, Kamera, Kunjungan | Waktu terbuka (detik) |

---

## 5. Kondisi pencahayaan (pakai lux meter di titik kasir)

| Kondisi | Cara membuat | Perkiraan lux |
|---|---|---|
| Gelap | Matikan sebagian besar lampu, tutup tirai | 20–50 |
| Redup | Matikan setengah lampu | 100–200 |
| Normal | Lampu ruangan biasa | 300–500 |
| Terang | Lampu tambahan/LED ke arah wajah | > 1000 |
| Cahaya dari belakang | Pelanggan membelakangi jendela/lampu terang | wajah gelap |
| Cahaya dari samping | Satu lampu dari samping | tidak rata |

Selalu tulis **lux yang terukur**, bukan hanya "gelap/terang".

---

## 6. Ukuran dan rumus hasil

### Pengenalan wajah
- **Akurasi identifikasi** = percobaan dengan nama benar / semua percobaan peserta terdaftar
- **FRR / tidak dikenali** = percobaan peserta terdaftar yang "tidak dikenal" / semua percobaan peserta terdaftar
- **Salah orang** (*misidentification*) = percobaan dengan nama orang lain / semua percobaan; **target 0**
- **FAR** = percobaan orang asing yang diberi nama / semua percobaan orang asing; **target ≤ 1 %**
- **Waktu pengenalan**: rata-rata, median, maksimum (target ≤ 3 detik)

Catatan statistik: dengan 60 percobaan orang asing dan **0** salah terima, batas atas FAR (95 %) adalah
3/60 = 5 % (*rule of three*, Hanley & Lippman-Hand, 1983). Untuk klaim FAR ≤ 1 % dibutuhkan
± 300 percobaan tanpa salah. Karena itu angka FAR utama diambil dari evaluasi dataset
(`scripts/evaluate.py`, ribuan pasangan orang asing); uji lab ini membuktikan perilaku di kondisi nyata.

### Pelacakan dan multi-kamera
- **Ganti ID** per orang per menit (C1–C5), dari rekaman layar
- **Kesalahan hitung** = |terdeteksi − sebenarnya| di C5
- **Keberhasilan pindah kamera** = pindah dengan ID/nama tetap / semua pindah (D1–D3)

### Asosiasi wajah → badan
- **Benar otomatis** = nama menempel ke badan yang benar tanpa bantuan / semua percobaan
- **Salah pasang** = nama menempel ke badan yang salah / semua percobaan; **target 0**
- **Bertanya ke kasir** = jumlah pertanyaan / semua percobaan (E3 seharusnya bertanya)

### Kunjungan
- **Selisih jam masuk/keluar** (detik) dan **MAE durasi** = rata-rata |durasi CRM − durasi sebenarnya|
- **Alasan keluar benar** = EXIT_ZONE/LOST sesuai kejadian / semua kunjungan
- Setelah uji, jalankan `scripts/gap_threshold.py` di Pi untuk menghitung jeda kunjungan dari data lab
  (rata-rata + 1,5 SD, Catledge & Pitkow, 1995) dan bandingkan dengan 15 detik.

---

## 7. Kriteria berhasil (usulan)

| Bagian | Kriteria |
|---|---|
| Pengenalan wajah, kondisi normal (B1) | Akurasi ≥ 95 %, salah orang 0, waktu ≤ 3 detik |
| Orang asing (B2) | 0 salah terima |
| Kondisi sulit (B3–B10) | Boleh "tidak dikenali", **tidak boleh salah orang** |
| Asosiasi (E0–E3c) | ≥ 90 % benar otomatis (termasuk dua orang di lingkaran setelah kalibrasi), salah pasang 0 |
| Pelacakan 1–5 orang | ≤ 1 ganti ID per orang per 5 menit |
| Kunjungan | Selisih jam keluar ≤ 20 detik; alasan keluar benar ≥ 90 % |
| Rekomendasi | Strategi sesuai jumlah transaksi (G2/G3), "Coba yang baru" muncul untuk pelanggan setia |
| Ketahanan | Tidak ada data hilang saat internet putus; pulih sendiri setelah restart/cabut kamera |
| Kamera website | "Langsung" ≥ 10 fps (Halus), jeda ≤ 1 detik |

Angka ini bisa disesuaikan dengan target di proposal. Yang wajib dari proposal: FAR ≤ 1 % dan
latensi ≤ 3 detik.

---

## 8. Keterbatasan yang perlu ditulis di skripsi (bila terbukti saat uji)

- Tidak ada deteksi wajah palsu: foto di HP bisa dikenali (B8).
- Masker atau kacamata hitam menutup wajah, jadi pelanggan tidak dikenali (B5c, B5d). Ini aman
  karena tidak salah orang, tetapi kasir perlu memilih pelanggan secara manual.
- Orang dengan pakaian sama, atau yang berganti jaket, bisa tertukar atau tidak tersambung antar
  kamera (C8, D4).
- Sebelum kalibrasi terkumpul (±5 pelanggan), dua orang berdampingan di kasir membuat sistem bertanya ke kasir (E3b); ini disengaja.
- Hasil lab belum tentu sama dengan kafe sungguhan (cahaya, tinggi kamera, keramaian).

---

## 9. Lembar catatan (cetak atau salin ke spreadsheet)

### 9.1 Pengenalan wajah (B)

| No | Kode | Peserta | Kondisi (lux / jarak / sudut / aksesoris) | Hasil (Benar / Salah: nama? / Tidak dikenal / Pesan mutu) | Waktu (detik) | Catatan |
|---|---|---|---|---|---|---|
| 1 | B1 | P01 | 420 lux, 1 m, frontal | | | |
| 2 | | | | | | |

### 9.2 Pelacakan dan multi-kamera (C, D)

| No | Kode | Jumlah orang | Durasi | Ganti ID | Terdeteksi vs sebenarnya | FPS | Catatan |
|---|---|---|---|---|---|---|---|
| 1 | C5 | 8 | 2 menit | | / 8 | | |

### 9.3 Asosiasi wajah → badan (E)

| No | Kode | Peserta di kasir | Orang lain (jarak) | Hasil (Otomatis benar / Salah pasang / Kasir ditanya) | Waktu | Catatan |
|---|---|---|---|---|---|---|
| 1 | E2 | P03 | P04 (1,0 m) | | | |

### 9.4 Kunjungan (F)

| No | Peserta | Masuk sebenarnya | Masuk di CRM | Keluar sebenarnya | Keluar di CRM | Alasan di CRM | Alasan sebenarnya | Catatan |
|---|---|---|---|---|---|---|---|---|
| 1 | P01 | 08:41:05 | | | | | Pintu | |

### 9.5 Rekomendasi (G)

| No | Peserta | Jumlah transaksi | Jumlah kunjungan | Strategi tampil | 3 rekomendasi | "Coba yang baru" | Sapaan | Dipesan? |
|---|---|---|---|---|---|---|---|---|
| 1 | P01 | | | | | | | |

### 9.6 Kinerja (K)

| Jam | FPS UNO Q | FPS CAM_1 | FPS CAM_2 | Suhu Pi (°C) | Jumlah orang | Error/peringatan | Catatan |
|---|---|---|---|---|---|---|---|
| 13:00 | | | | | | | |

---

## Referensi

- Catledge, L. D., & Pitkow, J. E. (1995). Characterizing browsing strategies in the World-Wide Web.
  *Computer Networks and ISDN Systems*, 27(6), 1065–1073.
- Hanley, J. A., & Lippman-Hand, A. (1983). If nothing goes wrong, is everything all right?
  Interpreting zero numerators. *JAMA*, 249(13), 1743–1745.
- Parameter lain dan dasarnya: `docs/PARAMETERS.md`; rekomendasi: `docs/RECOMMENDATION.md`.
