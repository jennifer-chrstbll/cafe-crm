# Rekomendasi menu: Collaborative Filtering, "Coba yang baru", dan skrip sapaan

Kode: `frontend/src/lib/server/recommendation.ts`, `frontend/src/components/pos/greeting.ts`.
Evaluasi: `scripts/evaluate_recommender.py`.

## 1. Apa itu Collaborative Filtering (CF)?

CF menebak menu yang kemungkinan disukai seorang pelanggan **dari pola pembelian semua
pelanggan**, tanpa perlu tahu isi menunya. Ide dasarnya: *menu yang sering dibeli oleh orang
yang sama itu "mirip"*. Kalau banyak pelanggan yang membeli Kopi Susu Aren juga membeli
Croissant, maka kepada pelanggan yang suka Kopi Susu Aren tetapi belum pernah mencoba Croissant,
kita tawarkan Croissant.

Sistem ini memakai **item-based CF** (Sarwar dkk., 2001; Deshpande & Karypis, 2004), varian yang
juga dipakai Amazon (Linden, Smith & York, 2003). Alasannya:
- jumlah menu sedikit dan stabil, sedangkan pelanggan banyak dan terus bertambah, jadi kemiripan
  antar-*menu* lebih stabil daripada kemiripan antar-*pelanggan*;
- alasannya bisa dijelaskan ke kasir ("sering dibeli bersama Kopi Susu Aren").

## 2. Perhitungannya

**Langkah 1: matriks pelanggan × menu (data implisit).** Kafe tidak punya rating bintang; yang
ada adalah *berapa kali* pelanggan membeli. Jumlah beli diredam dengan logaritma supaya satu
pelanggan yang membeli 30 kali tidak mendominasi (Hu, Koren & Volinsky, 2008):

  r(u, i) = log(1 + jumlah menu i yang dibeli pelanggan u)          (data 180 hari terakhir)

**Langkah 2: kemiripan antar-menu (cosine similarity).** Setiap menu adalah satu kolom matriks:

  sim(i, j) = Σ_u r(u,i)·r(u,j) / ( √Σ_u r(u,i)² · √Σ_u r(u,j)² )

Nilainya 0 (tidak pernah dibeli orang yang sama) sampai 1 (selalu dibeli oleh orang yang sama
dengan porsi yang sama).

**Langkah 3: skor untuk pelanggan u** atas setiap menu c yang **belum pernah** ia beli
(H = menu yang pernah ia beli):

  skor(u, c) = Σ_{h∈H} sim(c, h)·r(u, h) / Σ_{h∈H} r(u, h)

Artinya: rata-rata kemiripan menu c dengan riwayat pelanggan, diberi bobot sesuai seberapa sering
ia membeli tiap menu di riwayatnya. Tiga skor tertinggi ditampilkan sebagai **Rekomendasi**.

**Contoh angka.** Riwayat Jennifer: Kopi Susu Aren 4× (r = log 5 = 1,61), Croissant 1× (r = 0,69).
Kandidat Tiramisu: sim(Tiramisu, Kopi Susu Aren) = 0,62; sim(Tiramisu, Croissant) = 0,30.
skor = (0,62·1,61 + 0,30·0,69) / (1,61 + 0,69) = (1,00 + 0,21) / 2,30 = **0,53**.
Alasan yang ditampilkan: kontributor terbesar → "Sering dibeli bersama Kopi Susu Aren".

**Cold start.** Pelanggan dengan **< 3 transaksi** (aturan proposal) belum punya riwayat yang
cukup; mereka mendapat **menu terlaris 30 hari terakhir**. Popularitas adalah fallback standar dan
baseline top-N yang kuat (Cremonesi, Koren & Turrin, 2010). Slot CF yang kosong juga diisi menu
terlaris.

## 3. "Coba yang baru" untuk pelanggan setia (≥ 5 kunjungan)

Pelanggan langganan cenderung memesan hal yang sama, padahal konsumen juga punya kebutuhan akan
variasi (*variety seeking*; McAlister & Pessemier, 1982). CF murni cenderung menyarankan menu yang
sudah populer dan mirip dengan kebiasaannya. Untuk pelanggan setia, ditambahkan daftar kedua
berisi menu **yang belum pernah ia pesan**, diurutkan ulang supaya **baru (novel)** dan
**beragam (diverse)**:

- novelty berbasis popularitas (Vargas & Castells, 2011):
  nov(i) = 1 − log(1 + terjual₃₀(i)) / log(1 + terjual₃₀ maksimum)
- skor dasar: base(i) = 0,6 · skor CF ternormalisasi + 0,4 · nov(i)
- pemilihan bertahap *Maximal Marginal Relevance* (Carbonell & Goldstein, 1998), dengan
  kemiripan kategori seperti *topic diversification* (Ziegler dkk., 2005):
  pilih i = argmax [ 0,7 · base(i) − 0,3 · max_{j ∈ sudah dipilih ∪ favorit} sim′(i, j) ],
  sim′ = 1 bila kategori sama, selain itu cosine CF.

Hasilnya: menu yang masih relevan dengan seleranya, jarang dipesan orang lain, dan dari kategori
yang berbeda dari favoritnya ("Belum pernah dicoba · kategori baru").

## 4. Skrip sapaan kasir

Panel Kasir menampilkan satu kalimat saran, misalnya *"Halo Kak Jennifer, senang ketemu lagi! Mau
pesan Matcha Latte seperti biasa?"*, dengan tombol **Kalimat lain**.

| Pilihan desain | Dasar |
|---|---|
| Menyebut nama pelanggan | Mengingat nama seseorang meningkatkan kesediaan membeli, karena terasa sebagai pujian (Howard, Gengler & Jain, 1995) |
| Menyebut satu menu konkret (favorit / rekomendasi) | Saran lisan dari staf menaikkan penjualan menu yang disarankan (Johnson & Masotti, 1990; van Kleef, van Trijp & van den Broek, 2015, tanpa membuat pelanggan merasa ditekan) |
| Beberapa variasi kalimat, diacak per pelanggan per hari | Pelanggan bisa mendeteksi naskah yang kaku, terutama saat mengharapkan rekomendasi personal (Victorino, Verma, Bonner & Wardell, 2012) |
| Pelanggan baru → menu terlaris; langganan → favorit; setia → "Coba yang baru" | Sesuai data yang tersedia (cold start) dan variety seeking |

Kalimat hanya saran untuk kasir; sistem tidak membacakannya.

## 5. Mengevaluasi modelnya (Bab IV)

```
pip install psycopg2-binary
$env:DATABASE_URL="postgresql://..."      # sama dengan di .env Raspberry Pi
python scripts/evaluate_recommender.py --k 3
```
Protokol *temporal leave-last-out*: untuk setiap pelanggan dengan ≥ 3 transaksi sebelumnya,
transaksi terakhirnya disembunyikan, model dibangun hanya dari data **sebelum** saat itu, lalu
dihitung apakah salah satu dari 3 rekomendasi muncul di transaksi tersembunyi itu (**HitRate@3**).
Dibandingkan dengan baseline terlaris. Juga dilaporkan novelty (bit) dan keragaman kategori
daftar "Coba yang baru". Laporkan juga jumlah pelanggan yang dievaluasi (n).

Uji coba skrip pada data sintetis: CF 0,90 vs terlaris 0,35. Itu **hanya** bukti skripnya
berjalan; angka skripsi harus dari data transaksi kafe sungguhan.

## Referensi

- Carbonell, J., & Goldstein, J. (1998). The use of MMR, diversity-based reranking for reordering documents and producing summaries. *SIGIR '98*, 335–336.
- Cremonesi, P., Koren, Y., & Turrin, R. (2010). Performance of recommender algorithms on top-N recommendation tasks. *RecSys '10*, 39–46.
- Deshpande, M., & Karypis, G. (2004). Item-based top-N recommendation algorithms. *ACM TOIS*, 22(1), 143–177.
- Howard, D. J., Gengler, C., & Jain, A. (1995). What's in a name? A complimentary means of persuasion. *Journal of Consumer Research*, 22(2), 200–211.
- Hu, Y., Koren, Y., & Volinsky, C. (2008). Collaborative filtering for implicit feedback datasets. *ICDM '08*, 263–272.
- Johnson, C. M., & Masotti, R. M. (1990). Suggestive selling by waitstaff in family-style restaurants: An experiment and multisetting observations. *Journal of Organizational Behavior Management*, 11(1), 35–54.
- Linden, G., Smith, B., & York, J. (2003). Amazon.com recommendations: Item-to-item collaborative filtering. *IEEE Internet Computing*, 7(1), 76–80.
- McAlister, L., & Pessemier, E. (1982). Variety seeking behavior: An interdisciplinary review. *Journal of Consumer Research*, 9(3), 311–322.
- Sarwar, B., Karypis, G., Konstan, J., & Riedl, J. (2001). Item-based collaborative filtering recommendation algorithms. *WWW '01*, 285–295.
- van Kleef, E., van Trijp, H. C. M., & van den Broek, K. (2015). Exploiting the spur of the moment to enhance healthy consumption: Verbal prompting to increase fruit choices in a self-service restaurant. *Applied Psychology: Health and Well-Being*, 7(2), 149–166.
- Vargas, S., & Castells, P. (2011). Rank and relevance in novelty and diversity metrics for recommender systems. *RecSys '11*, 109–116.
- Victorino, L., Verma, R., Bonner, B. L., & Wardell, D. G. (2012). Can customers detect script usage in service encounters? An experimental video analysis. *Journal of Service Research*, 15(4), 390–400.
- Ziegler, C.-N., McNee, S. M., Konstan, J. A., & Lausen, G. (2005). Improving recommendation lists through topic diversification. *WWW '05*, 22–32.
