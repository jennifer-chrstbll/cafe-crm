# Pengujian black-box (fungsional) website CRM

Metode: *black-box testing* dengan partisi ekuivalen dan nilai batas (Myers, Sandler & Badgett, 2011,
*The Art of Software Testing*). Setiap kasus diuji dari antarmuka tanpa melihat kode. Isi kolom
**Hasil** dan **Status** (✓/✗) saat menguji (di rumah atau di lab). Login memakai akun **Pemilik**
kecuali disebut lain.

| ID | Fitur | Skenario | Masukan / langkah | Hasil yang diharapkan | Hasil | Status |
|---|---|---|---|---|---|---|
| BB-01 | Login | Akun benar | email + kata sandi benar | Masuk ke Beranda/Kasir | | |
| BB-02 | Login | Kata sandi salah | kata sandi salah | Pesan "email atau kata sandi salah", tetap di halaman login | | |
| BB-03 | Login | Tanpa login | buka /pos langsung | Dialihkan ke halaman login | | |
| BB-04 | Hak akses | Akun Kasir | login Kasir, buka Perangkat / Menu / Kunjungan | Ditolak atau menu tidak tersedia | | |
| BB-05 | Pelanggan | Tambah | nama "P9 Uji", no HP unik | Pelanggan tersimpan, muncul di daftar | | |
| BB-06 | Pelanggan | Nama kosong | nama kosong | Ditolak dengan pesan | | |
| BB-07 | Pelanggan | No HP ganda | no HP yang sudah dipakai | Ditolak dengan pesan | | |
| BB-08 | Daftar wajah | Tanpa persetujuan | tidak centang persetujuan | Tombol daftar tidak bisa / ditolak | | |
| BB-09 | Daftar wajah | Normal | centang persetujuan, hadap kamera | "Wajah tersimpan", status wajah terdaftar | | |
| BB-10 | Daftar wajah | Wajah sudah terdaftar | daftarkan wajah orang yang sama sebagai pelanggan lain | Ditolak: "sudah terdaftar sebagai …" | | |
| BB-11 | Hapus data | Hak dihapus | hapus pelanggan | Data wajah ikut terhapus, tidak dikenali lagi | | |
| BB-12 | Kasir | Pelanggan dikenali | berdiri di depan kamera wajah | Panel pelanggan muncul otomatis (nama, sapaan, favorit, rekomendasi) | | |
| BB-13 | Kasir | Tamu | pilih "Tamu" | Transaksi tanpa nama | | |
| BB-14 | Kasir | Tambah/kurangi item | klik menu 2×, kurangi 1× | Jumlah dan total benar | | |
| BB-15 | Kasir | Bayar | bayar tunai | Transaksi LUNAS, keranjang kosong | | |
| BB-16 | Kasir | Tab (bayar nanti) | simpan ke tagihan | Muncul di "Belum dibayar"; hilang setelah dibayar | | |
| BB-17 | Rekomendasi | < 3 transaksi | pelanggan baru | "Terlaris 30 hari terakhir" | | |
| BB-18 | Rekomendasi | ≥ 3 transaksi | pelanggan dengan 3 transaksi | "Sering dibeli bersama …" (CF) | | |
| BB-19 | Rekomendasi | Pelanggan setia | ≥ 5 kunjungan | Ada "Coba yang baru" | | |
| BB-20 | Sapaan | Rotasi | buka pelanggan yang sama di hari berbeda | Kalimat sapaan bisa berbeda; hari yang sama tetap | | |
| BB-21 | Menu | Tambah | nama, kategori, harga 25.000 | Tersimpan, tampil di Kasir | | |
| BB-22 | Menu | Harga 0 / kosong | harga kosong | Tombol simpan tidak aktif | | |
| BB-23 | Menu | Gambar | pilih foto JPG 3 MB | Dipotong persegi & diperkecil, tampil kecil di Menu dan Kasir | | |
| BB-24 | Menu | Hapus gambar | Hapus gambar | Kembali ke ikon kosong | | |
| BB-25 | Menu | Sembunyikan | Sembunyikan | Tidak tampil di Kasir; "Urungkan" mengembalikan | | |
| BB-26 | Kunjungan | Riwayat | buka Kunjungan | Masuk, keluar, durasi, alasan keluar tampil | | |
| BB-27 | Kamera | Semua kamera | Kamera → Semua kamera area | Dua kamera berdampingan, label nama | | |
| BB-28 | Kamera | Kaitkan manual | ketuk orang → Pasang pelanggan | Nama menempel (✓ manual) | | |
| BB-29 | Kamera | Bukan dia / Bukan staf | ketuk orang bernama / staf | Nama lepas / label staf hilang | | |
| BB-30 | Tata Letak | Titik terlalu dekat | titik kamera wajah tepat di titik kasir | Ditolak dengan pesan | | |
| BB-31 | Tata Letak | Simpan | gambar titik kasir, kamera wajah, area | Tersimpan; Pi memakai dalam ±3 detik | | |
| BB-32 | Perangkat | Status | buka Perangkat | Online/offline, FPS, kamera real-time, asosiasi otomatis | | |
| BB-33 | Perangkat | Kamera kedua | pilih webcam kedua + nama | Pi mulai ulang, kamera 2 muncul di Kamera | | |
| BB-34 | Pengaturan | Nilai di luar batas | kembali dalam = 0 | Ditolak: "Batas kembali 1–240 menit" | | |
| BB-35 | Pengaturan | Mode uji | kembali dalam = 1, cadangan = 2 | Tersimpan; perangkat memakai dalam ±5 detik | | |
| BB-36 | PWA | Pasang aplikasi | Chrome/Edge → ikon "Install" | Terpasang dengan ikon cangkir, buka di jendela sendiri | | |
| BB-37 | PWA | Offline | matikan internet, muat ulang | Halaman "Tidak ada internet" dengan tombol Coba lagi | | |
| BB-38 | Koneksi | Internet putus sesaat | matikan data 30 detik di halaman Kasir | Banner offline, pulih sendiri tanpa muat ulang | | |
