# Lampiran skenario pengujian

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
| C1, C2 | ID tidak berganti/tertukar; nama tidak berpindah ke orang lain (boleh tampil "Nama?" sesaat saat bersinggungan) | ByteTrack: asosiasi deteksi skor tinggi dan rendah [6]; ganti ID dihitung seperti CLEAR-MOT [7]. Nama tidak dicabut saat bersinggungan; setelah berpisah, siapa-yang-mana diputuskan dari beberapa pengamatan bersih (OSNet [8] + warna pakaian di kamera yang sama [30]) dengan penugasan Hungarian [31] | rekaman (ID dan nama di label), pelacakan.csv |
| C3a (3 dtk) | ID sama | Track yang hilang disimpan 40 frame yang diproses (±5 dtk pada 7,6 FPS; ±10 dtk dengan 2 kamera) [6] | rekaman |
| C3b (10 dtk) | ID sama atau ID baru dengan **nama dipulihkan** | Identitas dipulihkan lewat kemiripan penampilan beberapa pengamatan (OSNet [8], ≥ 0,62; 0,72 bila rupa bersihnya < 3) sampai 30 detik; ID tidak dihidupkan pada badan yang tak terjangkau dengan berjalan | rekaman, events.csv |
| C3c (20 dtk) | Nama dipulihkan; kunjungan bisa tercatat LOST lalu dibuka lagi | Jeda kunjungan 15 detik (bagian 9) | events.csv, kunjungan.csv |
| C4 | Tetap terlacak 10 menit, kunjungan tidak ditutup | Orang diam tetap terdeteksi tiap frame | events.csv |
| C5 | Jumlah orang benar (± 1) | Hitungan per kamera | metrics.csv (`orang_CAM_*`), okupansi.csv + jumlah yang diucapkan |
| C7 | A berlabel Staf, tidak dihitung pelanggan | Area staf di Tata Letak | rekaman |
| C8 | Boleh tertukar → keterbatasan | Fitur penampilan mirip untuk pakaian mirip [8] | rekaman |
| D1–D3 | ID dan nama sama setelah pindah kamera | Kamera dengan bidang pandang tumpang tindih: label konsisten di pita bersama [9]; jendela ID 15 detik, kemiripan ReID ≥ 0,65. Bila ID baru, nama tetap dibawa: muncul ≤ 30 detik di kamera lain, ≥ 0,55 (0,42 bila lewat Area pindah kamera di kedua kamera) [32]; bertiga dibagi dengan Hungarian [31] | events.csv (`PINDAH_KAMERA`), pelacakan.csv (`id_global`) |
| D4 | Boleh tidak tersambung → keterbatasan | Penampilan berubah total | rekaman |
| E0, E1–E3c | Nama ke badan yang benar **otomatis**; salah pasang 0 | Asosiasi probabilistik P = L/(ΣL + L₀) [12], P ≥ 0,85, dua kali berturut-turut; badan terdekat ke kamera wajah; kalibrasi kiri/kanan dan jarak (kuadrat terkecil) setelah ±5 contoh. Simulasi 2.000 pasangan: 99,7 % otomatis, 0 % salah | events.csv (`IKAT_OTOMATIS`, `RAGU`, `TANYA_KASIR`) |
| E3d | Kasir ditanya | Pembanding tanpa titik kamera wajah | events.csv (`TANYA_KASIR`) |
| E4–E6 | Sesuai tombol kasir | Fitur manual | events.csv (`IKAT_MANUAL`, `LEPAS`) |
| F1 | Ditutup EXIT_ZONE, jam keluar ≈ terlihat di rekaman | Zona pintu | kunjungan.csv + rekaman |
| F2, F3 | 20 dtk → LOST; 8 dtk → tidak ditutup | Jeda 15 detik (bagian 9) | kunjungan.csv, events.csv |
| F4 | Kembali sebelum batas → kunjungan sama dibuka lagi (nama kembali dari penampilan saat masuk lewat pintu, durasi termasuk waktu di luar, seperti pelanggan yang keluar merokok); sesudah batas → kunjungan baru | Batas sesi 30 menit [13], diuji dengan nilai skala 1 menit di kedua sisi batas [28]; nama hanya diberikan ke badan yang muncul di Pintu keluar, ≥ 0,60 | kunjungan.csv, events.csv |
| F6 | TIMEOUT setelah batas cadangan sejak tanda terakhir (uji 2 menit; operasional 15 menit) | Batas sesi 11–15 menit [14]; diskalakan (bagian 9.1) | kunjungan.csv |

### 8.3 Kasir, rekomendasi, website, kinerja

| Kode | Hasil yang diharapkan | Dasar | Bukti |
|---|---|---|---|
| G1 | Panel pelanggan muncul otomatis ≤ 3 detik setelah dikenali | Target latensi; batas respons yang terasa lancar ≤ 1 detik dan batas perhatian 10 detik [15] | rekaman |
| G2 | Putaran 1–3: "Terlaris 30 hari" dengan urutan seperti tabel halaman putaran | Kurang dari 3 transaksi = *cold start*, pakai popularitas [17] | rekaman, ringkasan_pelanggan.csv |
| G3 | Putaran 4–5: CF "Sering dibeli bersama ..." dengan menu, urutan, dan skor seperti bagian 9.3 | Item-based CF, cosine [18][19]; dihitung tangan di 9.3 | rekaman, transaksi.csv |
| G4 | Putaran 5 (Putaran 4 bila sudah ≥ 5 kunjungan): "Coba yang baru" seperti bagian 9.3 | Pelanggan setia ≥ 5 kunjungan (dimensi *frequency* RFM [20]); kebaruan dan keberagaman [21][22] | rekaman |
| G5 | Sapaan sesuai jenis pelanggan, berganti-ganti | Personalisasi sapaan | rekaman |
| G6 | Tamu tanpa nama | Pelanggan Tamu | transaksi.csv |
| G9 SUS | Skor ≥ 68 (rata-rata) | System Usability Scale [23], adaptasi Indonesia [24]; rata-rata acuan 68 [25] | lembar SUS |
| H1–H7 | Lihat 6.4 | Batas respons 0,1 / 1 / 10 detik [15] | rekaman, foto stopwatch |
| I1–I4 | Tidak ada data hilang; pulih sendiri | Antrean tulis (outbox) dan koneksi ulang | kunjungan.csv, pengenalan.csv (jam asli) |
| K | FPS stabil; suhu Pi < 80 °C | Batas pelambatan suhu Pi 5 | metrics.csv |

## 9. Angka waktu dan dasarnya

Saat uji hanya **dua batas menit** yang diskalakan (bagian 9.1); angka lain tidak diubah. Kolom **Saat uji** menunjukkan bagaimana jadwal menyesuaikan diri.
diri dengan angka itu.

| Angka | Nilai | Jenis | Dasar | Saat uji |
|---|---|---|---|---|
| Sesi pengenalan | ≤ 10 frame / 2,5 detik; keputusan dini 4 frame | Desain + literatur | Target latensi 3 detik; uji sekuensial Wald [1] | Peserta menghadap kamera ±3 detik |
| Jeda kunjungan (tidak terlihat) | **15 detik** (tidak diubah) | Kalibrasi (nilai awal) | Segmentasi sesi Catledge & Pitkow (rata-rata + 1,5 SD) [13]; dihitung ulang dengan `gap_threshold.py` dari data uji | F2 menunggu 20 detik, F3 8 detik |
| Buka lagi kunjungan | **30 menit** (uji: **1 menit**) | Literatur | Batas sesi 25,5 menit → 30 menit [13] | Diskalakan ke 1 menit (bagian 9.1); F4a kembali setelah 30 detik (sama), F4b setelah 2 menit (baru) |
| Cadangan bila Pi mati | **15 menit** (uji: **2 menit**) | Literatur | Batas sesi 11–15 menit [14] | Diskalakan ke 2 menit (bagian 9.1) |
| Simpan track hilang | **40 frame** (±5 dtk / ±10 dtk dengan 2 kamera) | Literatur + desain | Buffer track ByteTrack [6] | C3a 3 dtk, C3b 10 dtk |
| Pulihkan nama | **30 detik**, kemiripan ≥ 0,62 (0,72 bila rupa bersih < 3) | Desain | Re-identifikasi penampilan OSNet [8]; ≥ jeda kunjungan, sehingga orang yang tertutup tidak kehilangan nama | C3c 20 dtk |
| Jendela pindah kamera | ID: **15 detik**, ≥ 0,65; nama: **30 detik**, ≥ 0,55 (0,42 lewat Area pindah kamera di kedua kamera); pengaman "dua tempat" 3 detik | Desain + literatur | Label konsisten pada kamera tumpang tindih [9]; bukti waktu-tempat antar kamera [32] | D2–D3 berjalan biasa |
| Kembali lewat pintu | Selama batas "kembali dalam" (**30 menit**, uji **1 menit** → jendela 60 detik), ≥ 0,60 | Proses bisnis kafe | Pelanggan yang keluar sebentar (merokok) tetap kunjungan yang sama | Blok E menunggu **≥ 70 detik** supaya tiap percobaan benar-benar asosiasi baru |
| Siapa-yang-mana setelah bersinggungan | ≥ 4 pengamatan bersih, unggul ≥ 0,10 per nama yang dipindah; skor = OSNet + 0,7 × warna pakaian | Desain + literatur | Hungarian [31]; warna HSV badan atas/bawah [30] | C2, C5, D3 |
| Asosiasi | P ≥ 0,85, **2 event** berturut-turut (±2,5 detik antar event); tanya kasir setelah **2 event ragu** (±5 detik) | Desain + literatur | PDA [12]; jarak personal 0,45–1,2 m [26] | E menunggu ±5 detik per percobaan |
| Kalibrasi kamera wajah | ≥ **5** contoh tanpa keraguan | Literatur (kuadrat terkecil) + evaluasi | Simulasi 2.000 pasangan | Pendaftaran + putaran memberi ±15 contoh |
| Rekomendasi CF | ≥ **3** transaksi | Proposal + literatur | *Cold start* [17] | Putaran 4 |
| Pelanggan setia | ≥ **5** kunjungan | Desain | Frekuensi RFM [20] | Putaran 5 |
| Kamera langsung | ≤ 15 fps; ≤ 2 gambar dalam perjalanan | Desain | Batas respons [15] | H |

### 9.1 Penskalaan waktu saat uji (dan cara menuliskannya di skripsi)

Dua aturan memakai batas menit: **buka lagi kunjungan (30 menit)** dan **cadangan bila Pi mati
(15 menit)**. Menunggu 30 menit per percobaan tidak efisien. Pada hari uji kedua nilai itu
**diturunkan sementara** lewat Pengaturan (1 menit dan 2 menit), lalu dikembalikan ke 30 dan 15
menit setelah uji. Yang dibuktikan adalah **logika batasnya**, bukan angkanya:

- kembali **sebelum** batas → kunjungan yang sama dibuka lagi;
- kembali **sesudah** batas → kunjungan baru.

Ini adalah teknik **analisis nilai batas** (*boundary value analysis*): uji tepat di sisi dalam dan
sisi luar sebuah batas [28]. Logika program identik untuk nilai berapa pun, karena angkanya hanya
parameter (`reopen_minutes`, `exit_timeout_minutes`) yang dibaca dari Pengaturan oleh website, UNO Q,
dan Raspberry Pi. Nilai operasionalnya tetap dari literatur: 30 menit [13] dan 15 menit [14].

Contoh kalimat untuk bab metodologi: *"Pada pengujian, batas kunjungan ulang diskalakan dari 30 menit
menjadi 1 menit dan batas cadangan dari 15 menit menjadi 2 menit agar aturan dapat diverifikasi dalam
waktu pengujian yang terbatas. Pengujian dilakukan pada kedua sisi batas (analisis nilai batas). Pada
penerapan, nilai yang digunakan adalah 30 menit dan 15 menit sesuai literatur."*

Jeda kunjungan 15 detik, ambang wajah, ambang asosiasi, jumlah transaksi (3) dan jumlah kunjungan (5)
**tidak** diubah.

### 9.2 Penempatan kamera

| Kamera | Saran | Dasar |
|---|---|---|
| Kamera wajah (UNO Q) | Di sisi kasir pada meja, dekat layar/mesin kasir tempat pelanggan memandang. Tinggi lensa ±1,3–1,5 m (setinggi wajah), sedikit menunduk. Pelanggan berdiri ±0,6–1,0 m dari lensa (lebar meja + satu langkah) | Citra wajah frontal dan cahaya merata [11]; dikenali sampai ±1,6 m (evaluasi bagian 8.1); terlalu dekat (< 0,4 m) wajah terpotong tepi |
| Titik kasir dan antrean | Pelanggan yang membayar ±0,8 m dari kamera; yang berikutnya menunggu ±1,2 m di belakangnya | Jarak personal 0,45–1,2 m [26]; aturan wajah utama 1,3× menolak wajah kedua yang hampir sama dekat |
| Kamera area (Pi) | Tinggi ±2–3 m (uji lab: ±2 m di atas proyektor), menunduk ±25–40°, dari sudut ruangan memandang menyerong, seluruh badan (kepala sampai kaki) terlihat di area antrean, kasir, dan pintu. Lebar area yang diliput per kamera ≤ ±10 m pada 640 px | Kerapatan piksel tingkat *Observation* ±62,5 px/m untuk memantau orang [29] (ditentukan jarak dan lebar pandang, bukan tinggi); titik kaki dipakai untuk asosiasi dan zona. Kamera lebih rendah membuat orang lebih sering saling menutupi; ditangani oleh pelacakan yang sadar halangan (bagian 8.2) |
| Dua kamera | Bidang pandang tumpang tindih ±1 m; zona pindah kamera digambar di pita itu pada kedua kamera | Label konsisten pada kamera tumpang tindih [9] |

Jarak 2,0 m pada uji B4a **bukan** posisi normal pelanggan; itu hanya untuk mengukur batas jangkauan.

### 9.3 Skenario rekomendasi: pesanan dan hasil yang harus muncul

Pesanan Putaran 1–5 **dirancang** supaya perhitungan *collaborative filtering* (CF) terlihat jelas dengan hanya 3 pelanggan terdaftar (P1–P3) + S1. Tiga "selera" dibuat sengaja saling bersinggungan:

- **P1 pecinta kopi**: Cappuccino (+ Croissant);
- **P2 kopi + makanan manis**: Cappuccino + Tiramisu/Cheesecake (P2 menghubungkan P1 dan P3);
- **P3 non-kopi + makanan manis**: Matcha Latte + Cheesecake;
- **S1** tamu (Putaran 1–3: hanya ikut menghitung *terlaris*, tidak masuk CF), didaftarkan di Blok E.

Item-based CF menganggap dua menu "mirip" bila dibeli oleh **orang yang sama** [18]. P1 dan P2 sama-sama membeli Cappuccino, jadi menu lain milik P2 (Tiramisu, Cheesecake) menjadi rekomendasi untuk P1, dan sebaliknya.

**Pesanan (1 porsi per menu):**

| Putaran | P1 | P2 | P3 | S1 |
|---|---|---|---|---|
| 1 | Cappuccino + Croissant | Cappuccino + Tiramisu | Matcha Latte + Cheesecake | Americano (tamu) |
| 2 | Cappuccino | Cappuccino + Cheesecake | Matcha Latte | Americano (tamu) |
| 3 | Cappuccino + Croissant | Cappuccino + Tiramisu | Matcha Latte + Cheesecake | Mocha (tamu) |
| 4 | Tiramisu | Croissant | Tiramisu | Cappuccino |
| 5 | Chocolate | Cafe Latte | Chicken Sandwich | Tiramisu |

Putaran 4: tiap peserta memesan **rekomendasi nomor 1**; Putaran 5: **"Coba yang baru" nomor 1** (S1: terlaris nomor 1). Dengan begitu dibuktikan juga bahwa daftar **berubah** mengikuti pesanan yang diterima.

**Matriks setelah Putaran 3** (r = ln(1 + jumlah), hanya pelanggan terdaftar):

| | Cappuccino | Croissant | Tiramisu | Cheesecake | Matcha Latte |
|---|---|---|---|---|---|
| P1 | 3× → 1,386 | 2× → 1,099 | – | – | – |
| P2 | 3× → 1,386 | – | 2× → 1,099 | 1× → 0,693 | – |
| P3 | – | – | – | 2× → 1,099 | 3× → 1,386 |

**Contoh hitung tangan, P1 di Putaran 4** (riwayat: Cappuccino 3× → 1,386; Croissant 2× → 1,099; ΣW = 2,485):

- ‖Cappuccino‖ = √(1,386² + 1,386²) = 1,961; ‖Tiramisu‖ = 1,099 (hanya P2); ‖Cheesecake‖ = √(0,693² + 1,099²) = 1,299.
- sim(Tiramisu, Cappuccino) = (1,099 × 1,386) / (1,099 × 1,961) = **0,707**; sim(Tiramisu, Croissant) = 0 (tidak ada yang membeli keduanya).
- skor(Tiramisu) = (0,707 × 1,386 + 0 × 1,099) / 2,485 = **0,394**
- sim(Cheesecake, Cappuccino) = (0,693 × 1,386) / (1,299 × 1,961) = 0,377 → skor(Cheesecake) = 0,377 × 1,386 / 2,485 = **0,210**
- Matcha Latte, Chocolate, dll.: sim = 0 dengan riwayat P1 → tidak punya skor CF. Slot ke-3 diisi menu **terlaris 30 hari** yang belum pernah dibeli P1: Matcha Latte (3 porsi).
- Alasan yang tampil = kontributor terbesar: "Sering dibeli bersama Cappuccino".

**Hasil yang harus tampil** (sama dengan tabel di halaman Putaran 4 dan 5):

| Putaran | Peserta | Rekomendasi (skor CF · alasan) | Coba yang baru |
|---|---|---|---|
| 4 | P1 | Tiramisu (0,39 · bersama Cappuccino); Cheesecake (0,21 · bersama Cappuccino); Matcha Latte (terlaris) | Chocolate; Cafe Latte; Chicken Sandwich |
| 4 | P2 | Croissant (0,49 · bersama Cappuccino); Matcha Latte (0,18 · bersama Cheesecake); Americano (terlaris) | Chicken Sandwich; Chocolate; Cafe Latte |
| 4 | P3 | Tiramisu (0,20 · bersama Cheesecake); Cappuccino (0,17 · bersama Cheesecake); Croissant (0,13 · bersama Cheesecake) | Cafe Latte; Chicken Sandwich; Chocolate |
| 4 | S1 | Cappuccino (terlaris); Tiramisu (terlaris); Cheesecake (terlaris) | – |
| 5 | P1 | Cheesecake (0,43 · bersama Tiramisu); Matcha Latte (0,10 · bersama Tiramisu); Americano (terlaris) | Chocolate; Cafe Latte; Chicken Sandwich |
| 5 | P2 | Chocolate (0,52 · bersama Cappuccino); Matcha Latte (0,28 · bersama Cheesecake); Americano (terlaris) | Cafe Latte; Chicken Sandwich; Mocha |
| 5 | P3 | Cafe Latte (0,35 · bersama Cheesecake); Cappuccino (0,30 · bersama Tiramisu); Croissant (0,27 · bersama Tiramisu) | Chicken Sandwich; Mocha; Chocolate |
| 5 | S1 | Tiramisu (terlaris); Cheesecake (terlaris); Croissant (terlaris) | – |

Yang dibuktikan: (1) P1–P3 memakai CF tepat setelah 3 transaksi, S1 tetap *cold start*; (2) rekomendasi datang dari pelanggan lain yang seleranya bersinggungan (P1↔P2 lewat Cappuccino, P2↔P3 lewat Cheesecake); (3) setelah P1 menerima Tiramisu, Cheesecake naik dari 0,21 ke 0,43 karena P3 yang juga membeli Tiramisu menyukai Cheesecake; (4) "Coba yang baru" memilih kategori yang belum pernah dipesan (P1: Chocolate, kategori non-kopi) [21][22].

**Kenapa hasilnya pasti.** Model dibangun ulang setiap kali jumlah/waktu pesanan terakhir berubah (berlaku di semua server Vercel), dan nilai seri selalu diurutkan menurut nama menu. Urutan di atas sudah diuji terhadap kode website yang sebenarnya (`frontend/src/__tests__/recommendation_uji.test.ts`, lulus) dan dihitung ulang terpisah dengan `scripts/simulasi_rekomendasi_uji.py`. Bila ada pesanan berbeda di hari uji, ubah daftar di skrip itu lalu jalankan untuk mendapat hasil yang seharusnya.


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
| Rekomendasi tepat hitungan | kunjungan yang daftarnya sama persis dengan 9.3 / semua kunjungan P1–P3 & S1 | rekaman (panel Kasir) |
| SUS | (Σ(skor ganjil − 1) + Σ(5 − skor genap)) × 2,5 [23] | lembar SUS |

**Catatan statistik.** Dengan 6 orang, jumlah percobaan terbatas. Contohnya 60 percobaan orang asing
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
| Rekomendasi | Strategi sesuai jumlah transaksi pada semua kunjungan; daftar (menu dan urutan) sama dengan bagian 9.3 / tabel halaman putaran |
| Ketahanan | Tidak ada data hilang; pulih sendiri |
| Kegunaan kasir | SUS ≥ 68 |

## 12. Keterbatasan (tulis bila terbukti)

- Tidak ada deteksi wajah palsu (B8).
- Masker atau kacamata hitam membuat pelanggan tidak dikenali (aman, tetapi kasir memilih manual).
- Pakaian sama atau berganti jaket bisa membuat ID tertukar atau tidak tersambung antar kamera (C8, D4).
- Pita tumpang tindih yang sempit menurunkan keberhasilan pindah kamera. Pada video uji dengan pita
  ±15 % lebar gambar, ID yang sama di pita bersama ±42 %; pada uji lab pita dibuat ±1 m.
- Uji dilakukan di lab dengan 6 orang (keramaian paling banyak ±5 orang dalam gambar); cahaya, tinggi kamera (lab ±2 m), dan keramaian kafe sungguhan bisa berbeda.
- Saat beberapa orang terus saling menutupi, siapa yang mana baru bisa dipastikan setelah mereka berpisah (label "Nama?" sementara).
- Rekomendasi di uji lab memakai data kecil yang dirancang (3 pelanggan); kualitas rekomendasi (HitRate) diukur dari data transaksi sungguhan dengan `scripts/evaluate_recommender.py`.
- Jumlah percobaan kecil (lihat catatan statistik di bagian 10).

## 13. Lembar

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
28. Myers, G. J., Sandler, C., & Badgett, T. (2011). *The Art of Software Testing* (3rd ed.). Wiley (analisis nilai batas).
29. IEC 62676-4:2014. *Video surveillance systems for use in security applications — Part 4: Application guidelines* (tingkat DORI dan kerapatan piksel).
30. Swain, M. J., & Ballard, D. H. (1991). Color indexing. *International Journal of Computer Vision*, 7(1), 11–32.
31. Kuhn, H. W. (1955). The Hungarian method for the assignment problem. *Naval Research Logistics Quarterly*, 2(1–2), 83–97.
32. Javed, O., Shafique, K., Rasheed, Z., & Shah, M. (2008). Modeling inter-camera space–time and appearance relationships for tracking across non-overlapping views. *Computer Vision and Image Understanding*, 109(2), 146–162.
