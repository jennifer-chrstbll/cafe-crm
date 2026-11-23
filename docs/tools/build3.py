"""Visual test guide v3: 6 people, 1 test day (+1 reserve), commands placed at the moment they are needed."""
import sys

sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
from lib import C, CSS, band, card, chips, face, flow, md_section, room, timeline, top  # noqa: E402

OUT = sys.argv[1]
PI = "gkikarawaci@raspberrypi.local"
UQ = "arduino@dh02.local"
DAY = "HARI UJI"


def cmd(*lines):
    """Command box. Lines starting with '#' are comments."""
    out = []
    for l in lines:
        out.append(f'<span class="c">{l}</span>' if l.startswith("#") else l.replace("<", "&lt;"))
    return '<div class="cmd">' + "\n".join(out) + "</div>"


def after(*items):
    rows = "".join(f'<div style="margin:2px 0">☐ {x}</div>' for x in items)
    return '<div class="after"><div class="h">⏭️ Setelah blok ini, sebelum blok berikutnya (centang satu per satu)</div>' + rows + "</div>"


def li(*xs):
    return "<ol>" + "".join(f"<li>{x}</li>" for x in xs) + "</ol>"


def reset(text):
    return f'<div class="reset">🔄 <b>Pindah ke percobaan berikutnya:</b> {text}</div>'


OBS_NEXT = lambda nxt: f"OBS <b>Stop Recording</b>, lalu <b>Start Recording</b> dan ucapkan 🗣️ <i>“{nxt}”</i>."
OUT_ALL = "Semua peserta keluar lewat <b>pintu</b> ke <b>area tunggu</b> (di luar pandangan semua kamera)."


import json as _json
_FIX = _json.load(open(__import__("os").path.join(__import__("os").path.dirname(__import__("os").path.abspath(__file__)),
                       "..", "..", "frontend", "src", "__tests__", "fixtures", "rekomendasi_uji.json"), encoding="utf-8"))["steps"]


def _num(x):
    return f"{x:.2f}".replace(".", ",")


def _rec_cell(st):
    """Expected 'Rekomendasi' list on the cashier panel (exactly as recommendation.ts computes it)."""
    if "rec" not in st:
        return 'Panel “Belum terdaftar” → kasir melayani sebagai <b>Tamu</b> (G6), tanpa rekomendasi'
    out = []
    for k, (name, score, why) in enumerate(st["rec"], 1):
        if why.startswith("Sering dibeli bersama"):
            out.append(f"{k}. <b>{name}</b> <span class='small'>{_num(score)} · {why}</span>")
        else:
            out.append(f"{k}. <b>{name}</b> <span class='small'>· Terlaris</span>")
    return "<br>".join(out)


def _disc_cell(st, n):
    if "rec" not in st or not st.get("discover"):
        return "—"
    head = "" if n == 5 else "<span class='small'>(bila muncul)</span><br>"
    return head + "<br>".join(f"{k}. {name}" + (" <span class='small'>· kategori baru</span>" if "kategori baru" in why else "")
                              for k, (name, _, why) in enumerate(st["discover"], 1))


def round_page(n, time, see, extra="", s1="", cashier_note=""):
    pos = {1: "KTN", 2: "TNK", 3: "NKT", 4: "KNT", 5: "TKN"}[n]
    rows = ""
    for st in [x for x in _FIX if x["round"] == n]:
        who = st["who"]
        p = pos[int(who[1]) - 1] if who != "S1" else "T"
        order = " + ".join(m for m, q in st["order"])
        rows += (f"<tr><td><b>{who}</b></td><td style='font-size:14px;font-weight:800;color:#15803d'>{p}</td>"
                 f"<td style='font-weight:700'>{order}</td><td>{_rec_cell(st)}</td>"
                 + (f"<td>{_disc_cell(st, n)}</td>" if n >= 4 else "") + "</tr>")
    steps = [("Masuk", "Lewat pintu satu per satu seperti antre: P1, P2, P3, lalu S1."),
             ("Garis tunggu", "Yang berikutnya menunggu di garis 1,2 m sampai yang depan selesai bayar."),
             ("Titik kasir", "Berdiri di <b>K/T/N</b> (tabel), hadap kamera ±3 dtk."),
             ("Kasir", "Sapaan, cocokkan <b>Rekomendasi</b> dengan tabel, pesan <b>persis</b> (1 porsi/menu), <b>bayar</b>."),
             ("Area duduk", "Lewat <b>pita</b>, duduk <b>1 menit</b>."),
             ("Keluar", "Lewat pita, keluar <b>pintu</b> ke area tunggu.")]
    checks = ('<div class="dec" style="display:flex;margin-top:4px"><div class="q" style="flex:1">❓ ③ Nama muncul & menempel (hijau) ≤ 5 dtk? '
              '<span style="color:#b91c1c">Tidak → 🗣️ “gagal kenal Pn”, kasir pilih manual</span></div>'
              '<div class="q" style="flex:1">❓ ④ Rekomendasi = tabel (nama & urutan)? <span style="color:#b91c1c">Tidak → 🗣️ “rekomendasi beda”, foto panel, tetap pesan sesuai tabel</span></div>'
              '<div class="q" style="flex:1">❓ ⑤ Nama ikut ke kamera 2? <span style="color:#b91c1c">Tidak → 🗣️ “gagal pindah Pn”</span></div></div>')
    head = ("<tr><th>Peserta</th><th>Posisi</th><th>Pesan (persis)</th><th>✅ Panel “Rekomendasi” harus (urutan 1→3)</th>"
            + ("<th>“Coba yang baru”</th>" if n >= 4 else "") + "</tr>")
    return (f'<section class="page">{band(time, f"Putaran {n}", C["R"], DAY)}'
            + chips(siapa="P1 → P2 → P3" + s1, rekam=f"“Putaran {n}”", lama="±8 menit") +
            ('<div class="warn" style="padding:4px 10px">⏰ Semua peserta sudah <b>≥ 2 menit di area tunggu</b> → putaran ini tercatat sebagai <b>kunjungan baru</b> (mode uji “kembali dalam 1 menit”).</div>' if n > 1 else "")
            + extra + flow(steps, C["R"]) + checks +
            f'<table class="rt" style="margin-top:5px">{head}{rows}</table>'
            f'<div class="ok" style="margin-top:5px">✅ <b>Harus terlihat di panel Kasir:</b> {see} '
            '<span style="color:#475569">Lihat panel <b>±10 dtk setelah</b> orang sebelumnya membayar (rekomendasi memakai semua pesanan sampai saat itu). '
            'Salah input → perbaiki sebelum bayar; bila sudah terbayar, catat (tabel berikutnya berubah: hitung ulang dengan <code>scripts/simulasi_rekomendasi_uji.py</code>).</span></div>'
            f'{cashier_note}')


def build():
    H = []
    # ── cover ───────────────────────────────────────────────────────────────
    H.append('<section class="page"><h1>Skenario Pengujian Sistem · uji lab</h1>'
             '<div class="sub">Pengenalan wajah (Arduino UNO Q) · pelacakan orang multi-kamera (Raspberry Pi 5) · CRM</div>'
             '<div class="tiles">'
             f'<div class="tile" style="background:{C["open"]}"><div class="big">👥 6 orang</div>kamu, 1 kasir, 3 peserta terdaftar, 1 tidak terdaftar</div>'
             f'<div class="tile" style="background:{C["B"]}"><div class="big">📅 1 hari</div>+ 1 hari cadangan bila ada yang gagal</div>'
             f'<div class="tile" style="background:{C["C"]}"><div class="big">🕐 13.00–16.00</div>persiapan mulai 12.15</div>'
             f'<div class="tile" style="background:{C["E"]}"><div class="big">🎥 otomatis</div>rekaman layar + log perangkat + database</div></div>'
             '<div class="grid g3">'
             '<div class="note"><b>① H-1</b>: kerjakan halaman <b>Persiapan H-1</b> (ada perintahnya).</div>'
             '<div class="note"><b>② Hari uji</b>: buka halaman sesuai <b>jam</b>. Kerjakan dari atas ke bawah, termasuk kotak <b>⏭️ Setelah blok ini</b>.</div>'
             '<div class="note"><b>③ Skripsi</b>: dasar, rumus, kriteria, referensi di <b>Lampiran</b>.</div></div>'
             '<h3>Arti tanda</h3><div class="grid g4">'
             '<div class="person"><div class="dot" style="background:#2563eb">P</div>Peserta terdaftar (P1–P3)</div>'
             '<div class="person"><div class="dot" style="background:#dc2626">S</div>Peserta tidak terdaftar (S1)</div>'
             '<div class="person"><div class="dot" style="background:#f59e0b">A</div>Asisten = kasir</div>'
             '<div class="person"><div class="dot" style="background:#7c3aed">▣</div>Kamera wajah (UNO Q)</div>'
             '<div class="ok">✅ yang harus terjadi</div><div class="bad">⚠️ kalau tidak terjadi: lakukan ini</div>'
             '<div class="reset" style="margin:0">🔄 cara pindah ke percobaan berikutnya</div><div class="note" style="margin:0">🗣️ <i>“…”</i> = ucapkan untuk rekaman</div></div>'
             '<div class="warn" style="margin-top:10px"><b>Mode uji (hanya hari uji):</b> di Pengaturan, “kembali dalam” = <b>1 menit</b> (normal 30) dan '
             'cadangan = <b>2 menit</b> (normal 15), supaya aturan kunjungan bisa dibuktikan tanpa menunggu lama. Yang diuji adalah '
             '<b>logika batasnya</b> (kembali sebelum vs sesudah batas). Dikembalikan ke 30 dan 15 di Penutup. Parameter lain tidak diubah. '
             'Penjelasan untuk skripsi: Lampiran 9.1.</div></section>')

    # ── people + equipment + waiting area ────────────────────────────────────
    people = [("K", "#6b7280", "Kamu · koordinator", "Laptop, OBS, perintah, ucapkan penanda, atur lampu"),
              ("A", "#f59e0b", "Asisten · kasir", "Halaman Kasir; berdiri di area staf (belakang meja)"),
              ("P1", "#2563eb", "Peserta terdaftar", "Kelompok kopi · bawa jaket mencolok (D4)"),
              ("P2", "#2563eb", "Peserta terdaftar", "Kelompok kopi · atasan warna sama dengan P3 (C8)"),
              ("P3", "#2563eb", "Peserta terdaftar", "Kelompok non-kopi · atasan warna sama dengan P2"),
              ("S1", "#dc2626", "Tidak terdaftar → pelanggan baru", "Orang asing sampai Blok E, lalu didaftarkan")]
    cards = "".join(f'<div class="person"><div class="dot" style="background:{c}">{k}</div><div><b>{t}</b><br>'
                    f'<span class="small">{d}</span></div></div>' for k, c, t, d in people)
    equip = ["Raspberry Pi 5 + 2 webcam area", "UNO Q + webcam wajah (NEMESIS)", "Charger 5 V 3 A untuk UNO Q, adaptor Pi, stop kontak",
             "2 tempat kamera ±2–3 m (atas proyektor/lemari/tripod) + lakban kuat", "Laptop + charger + mouse", "HP hotspot (dicas) + HP stopwatch/foto",
             "Lakban warna + meteran 3 m", "Aplikasi lux meter", "Lampu tambahan + cara meredupkan ruangan",
             "Topi, masker, kacamata hitam, jaket", "Meja kasir, 1 meja + 2 kursi, 1 sekat", "Formulir persetujuan, lembar SUS"]
    H.append(f'<section class="page"><h2>👥 Siapa saja · 🧰 Alat · 🚪 Area tunggu</h2><div class="grid g3">{cards}</div>'
             '<div class="grid g2"><div class="note">Semua datang <b>12.50</b>, selesai <b>15.51</b>. Paling sedikit <b>5 orang</b> (tanpa P3; uji dua orang di kasir memakai P1 + P2 bergantian dengan jeda lebih lama). '
             'Nama di CRM pakai kode: <b>“P1 Andi”</b>. Bila bisa: laki-laki & perempuan, ≥1 berkacamata.</div>'
             '<div class="note">🚪 <b>Area tunggu</b> = tempat di luar pandangan <b>semua</b> kamera (lorong di luar pintu, atau pojok di belakang kamera). '
             'Peserta yang tidak sedang diuji selalu menunggu di sini, supaya tidak ikut terhitung.</div></div>'
             '<h3>Alat</h3><table class="check">' + "".join(
                 f"<tr><td>☐</td><td>{e}</td><td>☐</td><td>{equip[i + 6]}</td></tr>" for i, e in enumerate(equip[:6])) +
             "</table></section>")

    # ── lab layout + camera placement ───────────────────────────────────────
    big_room = room(people=[(70, 85, "P"), (60, 115, "P"), (215, 80, "P"), (66, 40, "A")], caption="tampak atas ruang lab", w=300, h=170)
    cashier = top(people=[(0, -0.68, "A"), (0, 0.9, "P1", "#16a34a"), (0.4, 2.3, "P2")], queue=True, staff=True,
                  dist=True, caption="tampak atas meja kasir", h=170)
    H.append('<section class="page"><h2>🗺️ Tata letak dan penempatan kamera</h2><div class="grid g2"><div>' + big_room +
             '</div><div>' + cashier + '</div></div><div class="grid g3">'
             '<div class="note"><b>📷 Kamera wajah (UNO Q)</b><br>• Di sisi <b>kasir</b> pada meja, dekat layar kasir (tempat pelanggan memandang)<br>'
             '• Lensa setinggi wajah ±1,3–1,5 m, sedikit menunduk<br>• Pelanggan berdiri <b>±0,8 m</b> dari lensa (lebar meja + 1 langkah). Terlalu dekat (&lt; 0,4 m) wajah terpotong<br>'
             '• Jangan membelakangi jendela/lampu terang</div>'
             '<div class="note"><b>🎥 Dua kamera area (Pi)</b><br>• Tinggi ±2–3 m (2 m di atas proyektor cukup), menunduk ±25–40°, badan utuh (kepala–kaki) terlihat di titik kasir & area duduk<br>'
             '• Dari <b>sudut</b> ruangan, memandang menyerong (bukan searah antrean); kamera & kabel dilakban agar tidak bergeser<br>'
             '• Kamera 1: antrean, kasir, pintu. Kamera 2: area duduk<br>• <b>Tumpang tindih ±1 m</b> (pita hijau)<br>'
             '• Pi di atas di antara kamera, webcam ke <b>port USB biru</b>, satu per port</div>'
             '<div class="note"><b>Tanda lantai (lakban)</b><br>• Titik kasir <b>K · T · N</b> (±30 cm), ±0,8 m dari kamera wajah<br>'
             '• <b>Garis tunggu</b> 1,2 m di belakangnya (jarak personal, Hall 1966)<br>• Garis antre <b>0,6 m</b> dan <b>1,0 m</b> (uji E)<br>'
             '• Tanda <b>0,5 · 1,0 · 1,5 · 2,0 m</b> (hanya uji jangkauan B4a)</div></div>'
             '<div class="small">Dasar penempatan (kerapatan piksel IEC 62676-4, citra wajah ISO/IEC 19794-5, kamera tumpang tindih Khan & Shah 2003): Lampiran 9.2.</div></section>')

    # ── recording ───────────────────────────────────────────────────────────
    screen = ('<svg viewBox="0 0 420 240" width="100%"><rect x="2" y="2" width="416" height="236" rx="12" fill="#0f172a"/>'
              '<rect x="12" y="12" width="262" height="216" rx="6" fill="#f8fafc"/><text x="143" y="110" font-size="15" text-anchor="middle" font-weight="700">CRM: halaman KASIR</text>'
              '<text x="143" y="130" font-size="10" text-anchor="middle" fill="#475569">(ganti ke halaman KAMERA hanya saat perlu memilih orang)</text>'
              '<rect x="282" y="12" width="126" height="68" rx="6" fill="#1e3a8a"/><text x="345" y="50" font-size="10" fill="#fff" text-anchor="middle">Lokal: Area kasir</text>'
              '<rect x="282" y="86" width="126" height="68" rx="6" fill="#4c1d95"/><text x="345" y="124" font-size="10" fill="#fff" text-anchor="middle">Lokal: Area duduk</text>'
              '<rect x="282" y="160" width="126" height="68" rx="6" fill="#065f46"/><text x="345" y="198" font-size="10" fill="#fff" text-anchor="middle">Lokal: Kamera wajah</text></svg>')
    H.append('<section class="page"><h2>🎥 Merekam bukti</h2><div class="grid g2"><div>' + screen + '<div class="small">'
             'Kolom kanan = <b>satu jendela berisi ketiga kamera</b>: <b>CRM → Perangkat → Semua kamera dalam 1 jendela → Salin perintah (tanpa bar alamat)</b>, '
             'tempel di PowerShell, Enter, lalu taruh jendelanya di kanan layar. Buka ulang setelah perangkat dimulai ulang (token baru). '
             'Lewat hotspot saja, tanpa kuota internet. Isinya kotak, nama (“Nama?” = sedang dipastikan), tata letak, FPS, dan <b>jam perangkat</b>.</div></div><div>'
             + flow([("Awal blok", "OBS <b>Start Recording</b>"), ("Penanda", "🗣️ ucapkan kode sebelum percobaan"),
                     ("Akhir blok", "OBS <b>Stop</b> (kotak ⏭️)")], C["X"]) +
             '<div class="ok">✅ <b>Tidak perlu menulis hasil</b>, semua tercatat otomatis:</div><table>'
             '<tr><th>Bukti</th><th>Isi</th></tr>'
             '<tr><td>🎥 Rekaman layar + suara</td><td>kejadian sebenarnya dan penanda</td></tr>'
             '<tr><td>📄 UNO Q <code>decisions.csv</code></td><td>setiap keputusan wajah: siapa, skor, lama sesi</td></tr>'
             '<tr><td>📄 Pi <code>events.csv</code></td><td>asosiasi, ragu, tanya kasir, pindah kamera, kunjungan</td></tr>'
             '<tr><td>📄 <code>metrics.csv</code> (keduanya)</td><td>FPS, suhu, jumlah orang per menit</td></tr>'
             '<tr><td>🗄️ Database (7 file)</td><td>kunjungan, pengenalan, transaksi, pelacakan, okupansi, pendaftaran, ringkasan</td></tr></table>'
             '<div class="bad">⚠️ Tulis tangan <b>hanya masalah</b> (Lampiran: Catatan masalah).</div></div></div></section>')

    # ── H-1 preparation with commands ───────────────────────────────────────
    H.append('<section class="page">' + band("H-1", "Persiapan (±2 jam, kamu; A ikut gladi)", C["prep"]) +
             '<h3>1 · Perbarui program (sekali)</h3>' +
             cmd("# Website", "cd D:\\Projects\\cafe-crm", "git add -A", 'git commit -m "persiapan uji"', "git push",
                 "# Raspberry Pi (ganti raspberrypi.local dengan IP Pi bila tidak ketemu)",
                 f"scp D:\\Projects\\DEPLOY\\RaspberryPi5\\cafe_pi.py D:\\Projects\\DEPLOY\\RaspberryPi5\\crm_sync.py D:\\Projects\\DEPLOY\\RaspberryPi5\\streamer.py D:\\Projects\\DEPLOY\\RaspberryPi5\\livecast.py D:\\Projects\\DEPLOY\\RaspberryPi5\\runlog.py D:\\Projects\\DEPLOY\\RaspberryPi5\\config.py {PI}:~/cafe-pi/",
                 f"scp D:\\Projects\\DEPLOY\\RaspberryPi5\\identity\\associator.py D:\\Projects\\DEPLOY\\RaspberryPi5\\identity\\color_cue.py D:\\Projects\\DEPLOY\\RaspberryPi5\\identity\\face_binding.py D:\\Projects\\DEPLOY\\RaspberryPi5\\identity\\face_event.py D:\\Projects\\DEPLOY\\RaspberryPi5\\identity\\face_receiver.py {PI}:~/cafe-pi/identity/",
                 f"scp D:\\Projects\\DEPLOY\\RaspberryPi5\\tracker\\byte_track.py {PI}:~/cafe-pi/tracker/",
                 "# Kamera lab TUMPANG TINDIH (pita): hapus pengaturan uji rumah (beda ruangan) dari .env bila pernah ditambahkan",
                 f'ssh {PI} "sed -i -e /^MULTICAM_OVERLAP=/d -e /^TRANSITION_TIME_WINDOW_SEC=/d -e /^CROSS_CAM_WINDOW_SEC=/d ~/cafe-pi/.env"',
                 f"scp D:\\Projects\\DEPLOY\\RaspberryPi5\\multicam\\multicam_manager.py {PI}:~/cafe-pi/multicam/",
                 "# UNO Q", f"scp D:\\Projects\\DEPLOY\\ArduinoUnoQ\\facerec_uno_q.py {UQ}:/home/arduino/facerec/",
                 "# Jam WIB + mulai ulang keduanya",
                 f'ssh -t {PI} "sudo timedatectl set-timezone Asia/Jakarta && sudo systemctl restart cafe-pi"',
                 f'ssh -t {UQ} "sudo timedatectl set-timezone Asia/Jakarta && sudo systemctl restart facerec"') +
             '<div class="grid g2"><div><h3>2 · Database lengkap?</h3>Supabase → SQL Editor → isi <code>database/cek_skema.sql</code> → Run. '
             'Semua harus <b>OK</b>. Bila ada <b>KURANG</b>, jalankan file yang disebut.'
             '<h3>3 · Pengaturan website</h3>• Kafe & kunjungan: jeda <b>15 dtk</b>, cadangan <b>15</b>, kembali dalam <b>30</b>, maks <b>6 jam</b><br>'
             '• Menu aktif <b>tepat 10</b>, nama persis: Americano, Cafe Latte, Cappuccino, Mocha, Matcha Latte, Chocolate, Croissant, Chicken Sandwich, Cheesecake, Tiramisu '
             '(menu lain dinonaktifkan dulu: tabel rekomendasi Putaran 1–5 dihitung dari 10 menu ini) · akun <b>Kasir</b> untuk A<br>'
             '• Tata Letak: titik kasir, <b>kamera wajah</b>, area staf, pintu, area pindah (kedua kamera)<br>'
             '• Perangkat: nama kamera <i>Area kasir</i> / <i>Area duduk</i>; panel <b>Semua kamera dalam 1 jendela</b> muncul'
             '<h3>4 · OBS</h3>Simple · <b>D:\\UjiTA\\Rekaman</b> · mkv · <b>QSV</b> · 30 fps · mikrofon · Display Capture. '
             'Windows: sleep Never, Focus assist ON, tunda Windows Update.'
             '<h3>5 · Cek kuota</h3>D: ≥ 30 GB · Supabase <b>Active</b> (bukan Paused) · kuota hotspot ≥ 2 GB.</div><div>'
             '<h3>6 · Gladi bersih (15 mnt, K + A)</h3>Daftarkan A sebagai “Uji Gladi”, satu kunjungan penuh, rekam 1 menit. Cek log:' +
             cmd(f'ssh -t {PI} "tail -5 ~/cafe-pi/data/events.csv"') +
             '<div class="dec"><div class="q">❓ Rekaman jelas, 3 kamera bergerak, ada IKAT_OTOMATIS & PINDAH_KAMERA?</div>'
             '<div class="y">✅ Ya → langkah 7</div><div class="no">⚠️ Tidak → perbaiki, ulangi gladi</div></div>'
             '<h3>7 · Bersihkan data gladi</h3>' +
             cmd(f'ssh -t {PI} "sudo systemctl stop cafe-pi"', f'ssh -t {UQ} "sudo systemctl stop facerec"',
                 "# Supabase SQL Editor: database/reset_data_uji.sql -> BAGIAN 1, lalu BAGIAN 2, lalu BAGIAN 3 (pelanggan = 1)",
                 f'ssh -t {PI} "rm -f ~/cafe-pi/data/events.csv ~/cafe-pi/data/metrics.csv ~/cafe-pi/data/gaps.csv ~/cafe-pi/data/face_calib.json && sudo systemctl start cafe-pi"',
                 f'ssh -t {UQ} "rm -f ~/facerec/data/decisions.csv ~/facerec/data/metrics.csv && sudo systemctl start facerec"',
                 "# lalu matikan dengan benar",
                 f'ssh -t {PI} "sudo shutdown -h now"', f'ssh -t {UQ} "sudo shutdown -h now"') +
             '</div></div></section>')

    # ── emergency card ──────────────────────────────────────────────────────
    sos = [("🔴 Perangkat merah di CRM", "Cek daya & hotspot, tunggu 1 menit. Masih → CRM → Perangkat → Mulai ulang. Ucapkan jamnya."),
           ("⬛ Tampilan lokal hitam", "Tunggu 5 dtk (menyambung sendiri). Masih → buka lagi dari Perangkat."),
           ("❔ Nama tidak muncul", "Maju ke ±0,8 m, hadap lurus, tunggu 5 dtk. Masih → kasir pilih manual, catat."),
           ("🔀 Nama ke orang salah", "Kamera → ketuk orang itu → <b>Bukan dia</b> → pasang ke yang benar. Catat."),
           ("🙋 Kasir ditanya “siapa?”", "Di luar Blok E: ketuk orang yang benar. Itu data, bukan error."),
           ("🎥 OBS berhenti", "Mulai rekam lagi, ucapkan jamnya."),
           ("📶 Internet putus", "Lanjutkan. Perangkat tetap mencatat; data masuk saat internet kembali."),
           ("⚡ Listrik mati", "Hotspot dulu, lalu Pi & UNO Q (program jalan sendiri). Ulangi percobaan yang terpotong."),
           ("🌡️ Suhu Pi > 80 °C", "Istirahat 5 menit, pastikan kipas berputar.")]
    H.append(f'<section class="page">{band("bila perlu", "Kartu darurat", C["I"], DAY)}<div class="grid g3">' +
             "".join(f'<div class="card"><div class="body"><div class="ttl">{a}</div><div>{b}</div></div></div>' for a, b in sos) +
             '</div><div class="note">Setiap masalah: 🗣️ ucapkan jam & kode, tulis satu baris di Catatan masalah, lanjutkan jadwal. Ulangi di hari cadangan.</div></section>')

    # ── overview ────────────────────────────────────────────────────────────
    H.append('<section class="page">' + band("Hari uji", "Gambaran hari ini", C["open"], DAY) +
             timeline([("13.00", "13.05", "Buka", C["open"]), ("13.05", "13.25", "Putaran 1 + daftar", C["R"]),
                       ("13.25", "13.50", "B Wajah", C["B"]), ("13.50", "14.00", "P2", C["R"]),
                       ("14.00", "14.17", "C Lacak", C["C"]), ("14.17", "14.27", "P3", C["R"]),
                       ("14.27", "14.47", "E Asosiasi", C["E"]), ("14.47", "14.57", "P4", C["R"]),
                       ("14.57", "15.15", "D+F", C["D"]), ("15.15", "15.25", "P5", C["R"]),
                       ("15.25", "15.33", "H", C["H"]), ("15.33", "15.47", "I+J", C["I"]),
                       ("15.47", "15.51", "SUS", C["S"]), ("15.51", "16.00", "Tutup", C["end"])]) +
             '<div class="grid g3"><div class="note"><b>Putaran</b> (hijau tosca) = semua peserta 1 kunjungan lengkap: masuk → kasir → bayar → duduk → keluar. '
             'Ada 5 putaran: transaksi ke-1 s.d. 5.</div>'
             '<div class="note"><b>Blok</b> = uji khusus. Peserta yang tidak sedang diuji menunggu di <b>area tunggu</b>.</div>'
             '<div class="note"><b>Jeda 2 menit</b> sebelum Putaran 2–5: semua di area tunggu (syarat kunjungan baru), sekaligus waktu ganti file OBS.</div></div></section>')

    # 12.15 prep day
    H.append('<section class="page">' + band("12.15–12.55", "Persiapan hari uji", C["prep"], DAY) + chips(siapa="K (A mulai 12.45)") +
             flow([("Hotspot", "HP hotspot ON, HP dicas."), ("Perangkat", "Pi & UNO Q dicolok (program jalan sendiri)."),
                   ("Perangkat hijau?", "CRM → Perangkat: dua-duanya <b>Online</b>.",
                    ("Hijau dalam 2 menit?", "lanjut", "Kartu darurat 🔴")),
                   ("<b>Mode uji</b>", "Pengaturan → Kafe & kunjungan: <b>kembali dalam = 1</b>, <b>cadangan = 2</b> → Simpan."),
                   ("Layar rekaman", "Kasir (kiri) + jendela <b>Semua kamera</b> (kanan): Perangkat → Salin perintah → PowerShell."),
                   ("Cek", "Lux normal di titik kasir ___ dan area duduk ___. OBS rekam 10 dtk & putar ulang. D: ≥ 15 GB.")], C["prep"]) +
             '<div class="note">💡 <b>Lux meter</b>: HP Android → Play Store → pasang aplikasi <b>“Lux Light Meter”</b> (atau aplikasi lux lain yang membaca <b>sensor cahaya</b>). '
             'Ukur di <b>titik T setinggi wajah</b>, layar HP menghadap <b>kamera wajah</b> (sensornya di atas layar, dekat kamera depan), tahan 3 dtk, baca angkanya. '
             'iPhone tidak membuka sensor cahaya ke aplikasi (hanya lewat kamera, kurang akurat): pinjam HP Android, atau tulis “perkiraan”.</div>'
             '<div class="note">Cek kesiapan perangkat dari laptop (opsional):</div>' +
             cmd(f'ssh -t {PI} "tail -3 ~/cafe-pi/data/events.csv"', f'ssh -t {UQ} "tail -3 ~/facerec/data/decisions.csv"') +
             after(OBS_NEXT("Pembukaan"), "Peserta datang 12.50, kumpul di area tunggu.") + "</section>")

    H.append('<section class="page">' + band("13.00–13.05", "Pembukaan", C["open"], DAY) + chips(siapa="semua", siapkan="formulir persetujuan") +
             flow([("Jelaskan", "Tujuan uji, kamera merekam, data hanya untuk skripsi."),
                   ("Persetujuan", "Semua tanda tangan formulir.", ("Semua setuju?", "lanjut", "yang tidak setuju tidak ikut")),
                   ("Tunjukkan", "Pintu, area tunggu, garis tunggu, titik K/T/N, area duduk.")], C["open"]) +
             after(OBS_NEXT("Putaran 1"), "Semua di area tunggu.") + "</section>")

    # Round 1 + enrolment
    enrol = ('<div class="grid g2" style="margin-bottom:6px">'
             + card("A1 + E0", "Daftar di kunjungan pertama", "P1, P2, P3",
                    "Di titik kasir: kasir <b>Pelanggan baru</b> “P1 Nama” → centang <b>persetujuan</b> → <b>Daftarkan wajah</b> (peserta hadap kamera, sedikit menoleh kiri-kanan) → lalu pesan & bayar.",
                    "“Wajah tersimpan” ≤ 20 dtk, dan nama <b>langsung menempel</b> di badan (E0).", "Gagal: baca pesan di layar, perbaiki, ulangi sekali.", "", C["A"])
             + card("A2 · A3 · A4", "Variasi (sekali masing-masing)", "P1 · P2 · P3",
                    "<b>A2</b> P1: coba daftar <b>tanpa</b> centang persetujuan. <b>A3</b> P2: mulai dari tanda 2,0 m, lalu maju. <b>A4</b> P3: P1 berdiri tepat di samping P3 saat mendaftar, lalu mundur.",
                    "A2 ditolak · A3 “Terlalu jauh/Mendekat sedikit” lalu berhasil · A4 “Beberapa wajah sama dekat” lalu berhasil.", "", "", C["A"]) + "</div>")
    H.append(round_page(1, "13.05–13.25", "<b>“Terlaris 30 hari terakhir”</b> (pelanggan baru; belum ada penjualan → urut abjad, lalu berubah setelah tiap pembayaran).", extra=enrol,
                        s1=" · lalu S1 (tamu)")
             + after(OBS_NEXT("Blok B"), OUT_ALL + " Lalu P1, P2, S1 masuk lagi untuk Blok B.") + "</section>")

    # Block B
    H.append('<section class="page">' + band("13.25–13.50", "Blok B · Pengenalan wajah dalam berbagai kondisi", C["B"], DAY) +
             chips(siapa="P1, P2, P3, S1", siapkan="lux meter, lampu, topi, masker, kacamata hitam, HP berisi foto P2", lama="±25 menit") +
             '<b>Satu percobaan:</b>' + flow([("Ucapkan", "🗣️ <i>“B3a, P1, gelap 40 lux, percobaan 1”</i>"), ("Maju ke T", "hadap kamera ±3 dtk"),
                                             ("Mundur", "ke garis tunggu ±3 dtk"), ("Ulangi", "")], C["B"]) +
             reset("<b>langsung back-to-back</b>. Tidak perlu keluar pintu; cukup mundur ke garis tunggu 3 detik (sesi wajah otomatis selesai). "
                   "Yang belum giliran berdiri di garis tunggu atau area tunggu.") +
             '<div class="grid g4">'
             + card("B3a", "Gelap 20–50 lux", "P1, P2 · 2×", "Matikan sebagian lampu. 🗣️ ucapkan lux.", "Dikenali, atau “Terlalu gelap/terang”.", "Nama orang lain → 🗣️ “salah orang”, catat.", face("dark", label="gelap"), C["B"])
             + card("B3b", "Terang > 1000 lux", "P1, P2 · 2×", "Lampu ke wajah.", "Dikenali atau ditolak, tidak salah orang.", "", face("bright", label="terang"), C["B"])
             + card("B3c", "Cahaya belakang", "P1, P2 · 2×", "Membelakangi lampu/jendela.", "Boleh gagal; tidak salah orang.", "", face("back", label="silau"), C["B"])
             + card("B3d", "Cahaya samping", "P1, P2 · 2×", "Satu lampu dari samping.", "Dikenali atau ditolak.", "", face("side", label="samping"), C["B"])
             + card("B4a", "Jarak", "P3 · 1× per tanda", "Tanda 0,5 / 1,0 / 1,5 / 2,0 m (uji jangkauan saja).", "Dikenali sampai ±1,6 m.", "", top(people=[(0, 1.5, "P3")], dist=True, wait=False), C["B"])
             + card("B4b", "Sudut kepala", "P1 · 1× per sudut", "Menoleh 15°, 30°, 45°; menunduk lihat HP.", "15° dikenali; 45° “Tampak samping”.", "", face("t45", label="menoleh"), C["B"])
             + card("B5", "Aksesoris", "P2 topi · P3 masker · P1 kacamata hitam · 2× masing-masing", "Pakai, lalu percobaan biasa.", "Topi umumnya dikenali; masker & kacamata hitam <b>tidak dikenali</b> (wajar), tidak salah orang.", "", face("mask", label="masker"), C["B"])
             + card("B8 · B10", "Foto HP · ekspresi", "P2 · 2× masing-masing", "Tunjukkan foto P2 di HP; lalu senyum lebar sambil bicara.", "Foto: <b>mungkin dikenali</b> → keterbatasan. Ekspresi: dikenali.", "", face("phone", label="foto HP"), C["B"])
             + card("B6a", "Berdampingan", "P1 + P2 · 2×", "Berdiri sejajar di T, jarak sama.", "Ditunda: “Beberapa wajah sama dekat”.", "", top(people=[(-0.2, 0.9, "P1"), (0.2, 0.9, "P2")]), C["B"])
             + card("B6b", "Satu di belakang", "P1 di T + P2 di 1,0 m · 2×", "", "Yang depan (P1) dikenali.", "", top(people=[(0, 0.9, "P1"), (0, 1.9, "P2")], queue=True), C["B"])
             + card("B6c", "Terdaftar + asing", "P3 + S1 · 2×", "Berdampingan, lalu S1 di belakang.", "P3 dikenali; S1 tidak pernah diberi nama P.", "", top(people=[(-0.2, 0.9, "P3"), (0.2, 0.9, "S1")]), C["B"])
             + card("B7", "Lewat saja", "P1, P2, P3 · 1×", "Melintas depan kasir tanpa berhenti.", "Tidak salah orang.", "", top(people=[(-1.1, 1.2, "P1")], arrows=[[(-0.9, 1.2), (1.2, 1.2)]]), C["B"])
             + card("B2", "Orang asing", "S1 · 20× (di sela-sela)", "Setiap ada jeda, S1 melakukan satu percobaan biasa.", "Selalu <b>tidak dikenal</b>.", "Diberi nama → 🗣️ “salah terima”, catat (penting).", top(people=[(0, 0.9, "S1")]), C["B"])
             + '</div>' + after("Kembalikan cahaya normal.", OUT_ALL, "⏳ <b>Jeda 2 menit</b> (semua di area tunggu) — syarat kunjungan baru di Putaran 2.", OBS_NEXT("Putaran 2")) + "</section>")

    H.append(round_page(2, "13.50–14.00", "<b>“Terlaris”</b> untuk P1–P3 (baru 1 transaksi; menu yang pernah dibeli sendiri tidak ditawarkan).", s1=" · lalu S1 (tamu)")
             + after(OUT_ALL, OBS_NEXT("Blok C")) + "</section>")

    occl = lambda: top(people=[(0.55, 1.2, "P3")], obstacle=(0.3, 0.95, 0.15, 0.6), spots=False, wait=False, arrows=[[(-0.8, 1.2), (0.3, 1.2)]])
    H.append('<section class="page">' + band("14.00–14.17", "Blok C · Pelacakan orang", C["C"], DAY) +
             chips(siapa="P1, P2, P3, S1, A (staf)", siapkan="sekat", lama="±17 menit") +
             '<div class="note">Lihat label di tampilan Area kasir & Area duduk: nomor ID orang (mis. “? · GT-0012”). 🗣️ ucapkan kode sebelum mulai.</div>' +
             reset("tidak perlu keluar pintu; percobaan C boleh langsung berurutan. Yang tidak ikut menunggu di area tunggu.") +
             '<div class="grid g4">'
             + card("C1", "Satu orang", "P1 · 1 mnt", "Berjalan keliling area kamera 1.", "ID tidak berganti.", "Berganti → 🗣️, catat.",
                    room(people=[(70, 95, "P1")], arrows=[[(80, 95), (120, 80), (95, 75), (50, 85), (62, 100)]]), C["C"])
             + card("C2", "Berpapasan", "P1 + P2 · 2×", "Berlawanan arah, berpapasan dekat.", "ID tidak tertukar.", "",
                    room(people=[(30, 95, "P1"), (120, 95, "P2")], arrows=[[(42, 95), (115, 91)], [(108, 100), (35, 104)]]), C["C"])
             + card("C3a", "Tertutup 3 dtk", "P3 · 2×", "Lewat di belakang sekat.", "ID sama.", "", occl(), C["C"])
             + card("C3b", "Tertutup 10 dtk", "P3 · 1×", "Diam di belakang sekat ±10 dtk.", "ID sama, atau ID baru dengan nama dipulihkan.", "", occl(), C["C"])
             + card("C3c", "Tertutup 20 dtk", "P3 · 1×", "Diam ±20 dtk.", "Nama dipulihkan (≤ 30 dtk).", "", occl(), C["C"])
             + card("C5", "Ramai", "P1, P2, P3, S1 · 2 + 1 mnt", "Semua berjalan acak di kedua area, lalu diam. 🗣️ jumlah pelanggan per kamera (A tidak dihitung).",
                    "Jumlah benar (± 1).", "", room(people=[(40, 95, "P"), (100, 110, "P"), (200, 80, "P"), (240, 115, "S")]), C["C"])
             + card("C6", "Redup / terang", "P1 + P2 · 1 mnt per kondisi", "Ulangi C2 dengan lampu redup, lalu terang.", "Tetap terlacak.", "", face("dark", label="redup"), C["C"])
             + card("C7 · C8", "Staf · pakaian sama", "A sepanjang blok · P2 + P3 2×", "A bekerja di area staf. P2 & P3 (atasan sama) berpapasan dekat.",
                    "A berlabel <b>Staf</b>. C8: boleh tertukar → keterbatasan.", "", top(people=[(0, -0.68, "A")], staff=True, spots=False, wait=False), C["C"])
             + '</div><div class="note"><b>C4 Duduk lama</b>: P2 duduk di area duduk 10 menit selama blok ini (sejak C3). ✅ Tetap terlacak, kunjungan tidak ditutup.</div>'
             + after(OUT_ALL, "⏳ <b>Jeda 2 menit</b>.", OBS_NEXT("Putaran 3")) + "</section>")

    H.append(round_page(3, "14.17–14.27", "<b>“Terlaris”</b> (baru 2 transaksi). Setelah putaran ini P1–P3 punya 3 transaksi → Putaran 4 memakai CF.", s1=" · lalu S1 (tamu)")
             + after(OUT_ALL, OBS_NEXT("Blok E"), "Cek CRM → Perangkat → Asosiasi otomatis: <b>“Siap: kalibrasi selesai”</b>. Belum siap → E3b tetap dijalankan, hasil “kasir ditanya” dicatat.") + "</section>")

    # Block E
    rot = lambda rows: ('<table><tr><th>Percobaan</th><th>Depan (di T, hadap kamera)</th><th>Orang kedua</th><th>Setelah percobaan</th></tr>' +
                        "".join(f"<tr><td>{a}</td><td><b>{b}</b></td><td>{c}</td><td>{d}</td></tr>" for a, b, c, d in rows) + "</table>")
    H.append('<section class="page">' + band("14.27–14.47", "Blok E · Asosiasi wajah → badan", C["E"], DAY) +
             chips(siapa="P1, P2, P3, S1", lama="±20 menit") +
             '<div class="note">Yang dinilai: setelah wajah orang di depan dikenali, <b>namanya menempel ke badan yang benar</b> di tampilan Area kasir, tanpa kasir menekan apa-apa. Kerjakan <b>berurutan</b>.</div>' +
             reset("orang yang tadi di <b>depan</b> (sudah diberi nama) keluar lewat <b>pintu</b> dan menunggu <b>≥ 70 detik</b> di area tunggu "
                   "(yang kembali lewat pintu dalam batas “kembali dalam” — mode uji 1 menit — dikenali lagi dari penampilannya, seperti pelanggan yang keluar merokok; itu bukan uji asosiasi baru). "
                   "Pakai giliran berputar di tabel supaya tidak ada yang menunggu.") +
             '<div class="grid g2"><div>'
             + '<b>E9 · Orang asing di kasir</b> (S1, 2×): S1 di T. ✅ Tidak ada nama terpasang. S1 mundur ke garis tunggu di antara percobaan.'
             + '<br><b>E2 · Antre 1 m</b>' + rot([("1", "P1", "P2 di garis 1,0 m", "P1 keluar ≥70 dtk"), ("2", "P2", "P3 di 1,0 m", "P2 keluar"), ("3", "P3", "P1 di 1,0 m", "P3 keluar")])
             + '<b>E3a · Antre 0,6 m</b>' + rot([("1", "P1", "P2 di garis 0,6 m", "P1 keluar ≥70 dtk"), ("2", "P2", "P3 di 0,6 m", "P2 keluar"), ("3", "P3", "P1 di 0,6 m", "P3 keluar")])
             + '<b>E3b · Berdampingan</b> (orang kedua ±40 cm di samping, masih di lingkaran)'
             + rot([("1", "P1", "P2 di kanan", "P1 keluar"), ("2", "P2", "P3 di kiri", "P2 keluar"), ("3", "P3", "P1 di kanan", "P3 keluar"), ("4", "P1", "P2 di kiri", "P1 tetap (untuk E5)")])
             + '<div class="ok">✅ E2, E3a, E3b: nama <b>otomatis</b> ke orang <b>depan</b>; tidak ada salah pasang.</div>'
             + '<div class="bad">⚠️ Nama ke orang kedua → 🗣️ “salah pasang”, catat. Kasir ditanya → 🗣️ “ditanya”, catat (itu data).</div></div><div><div class="rfig">'
             + top(people=[(0, 0.9, "P1", "#16a34a"), (0, 1.5, "P2")], queue=True, caption="E3a: depan di T, orang kedua di 0,6 m")
             + '</div><div class="rfig" style="margin-top:6px">'
             + top(people=[(-0.05, 0.88, "P1", "#16a34a"), (0.38, 0.95, "P2")], caption="E3b: berdampingan")
             + '</div></div></div>'
             + '<h3>Lanjutan (berurutan)</h3><div class="grid g3">'
             + card("E5", "Lepas pasangan salah", "P1 (bernama) + P2", "Halaman <b>Kamera</b>: ketuk P2 → <b>Pasang pelanggan</b> → pilih P1 → konfirmasi (salah sengaja) → ketuk P2 → <b>Bukan dia</b>.",
                    "Nama lepas dari P2; kunjungan P1 tidak ditutup.", "", "", C["E"])
             + card("E6", "Bukan staf", "P3", "P3 berdiri di area staf ±1 mnt sampai berlabel Staf → Kamera → ketuk P3 → <b>Bukan staf</b>.", "Label staf hilang.", "", "", C["E"])
             + card("E7", "Nama tetap menempel", "P2 (keluar ≥70 dtk dulu)", "P2 dikenali di T → jalan ke area duduk, duduk 1 mnt → kembali.", "Nama sama di kedua kamera.", "", "", C["E"])
             + card("E0b", "Pelanggan baru", "S1", "Kasir mendaftarkan S1 (“S1 Nama”, persetujuan) saat S1 di T.", "Nama S1 langsung menempel.", "", "", C["E"])
             + card("E3d", "Tanpa titik kamera wajah", "P1 + P3 (keduanya keluar ≥70 dtk dulu)", "K: Tata Letak → hapus <b>Kamera wajah</b> → Simpan. P1 di T, P3 di 0,6 m.", "Kasir <b>ditanya</b> dalam ±5 dtk (pembanding).", "", "", C["E"])
             + card("E4", "Kaitkan manual", "dari E3d", "Kasir membuka pertanyaan → ketuk P1.", "Nama menempel, tanda ✓ (manual).", "", "", C["E"])
             + '</div>' + after("K: Tata Letak → <b>pasang lagi titik Kamera wajah</b> → Simpan (kalibrasi mulai dari awal, tidak masalah).", OUT_ALL,
                                "⏳ <b>Jeda 2 menit</b>.", OBS_NEXT("Putaran 4")) + "</section>")

    H.append(round_page(4, "14.47–14.57", "P1–P3: keterangan <b>“Berdasarkan pelanggan dengan selera serupa”</b> dan alasan <b>“Sering dibeli bersama …”</b> dengan skor seperti tabel. "
                        "Contoh P1: <b>Tiramisu</b>, karena P2 (sama-sama suka Cappuccino) membeli Tiramisu. Setiap peserta <b>memesan rekomendasi nomor 1</b>. S1: “Terlaris” (pelanggan baru).",
                        s1=" · lalu S1 (sekarang pelanggan)",
                        cashier_note='<div class="note">“Coba yang baru” hanya muncul bila panel menunjukkan ≥ 5 kunjungan (kunjungan blok uji ikut dihitung); bila muncul, isinya seperti tabel. Perhitungan lengkap: Lampiran 9.3.</div>')
             + after(OUT_ALL, OBS_NEXT("Blok D-F")) + "</section>")

    H.append('<section class="page">' + band("14.57–15.15", "Blok D + F · Pindah kamera dan kunjungan", C["D"], DAY) +
             chips(siapa="P1, P2, P3, S1", siapkan="jaket P1, stopwatch HP", lama="±18 menit") +
             '<div class="note">Ikuti jam di kiri. Setiap peserta yang dipakai untuk F <b>dikenali dulu di kasir</b> (berdiri di T 3 dtk) supaya kunjungannya terbuka.</div><div class="vt">'
             '<div class="row"><span class="when">14.57</span><b>D2 Bolak-balik</b> · P1 dikenali di T → 3× area 1 ↔ area 2 lewat pita. ✅ ID & nama sama di kedua kamera.</div>'
             '<div class="row"><span class="when">14.59</span><b>F4a sisi dalam batas</b> · P2 dikenali di T → keluar lewat <b>pintu</b> (⏱ mulai) → tunggu <b>30 dtk</b> → kembali ke T. ✅ <b>Kunjungan yang sama</b> dibuka lagi.</div>'
             '<div class="row"><span class="when">15.01</span><b>D3 Bertiga</b> · P1, P2, P3 berjalan bersama ke area 2. ✅ Nama tidak tertukar.</div>'
             '<div class="row"><span class="when">15.03</span><b>F4b sisi luar batas</b> · P2 keluar lewat pintu (⏱ mulai) → tunggu <b>2 menit</b> → 15.05 kembali ke T. ✅ <b>Kunjungan baru</b>.</div>'
             '<div class="row"><span class="when">15.03</span><b>F2 Hilang 20 dtk</b> · (bersamaan) P3 keluar pandangan kedua kamera <b>bukan</b> lewat pintu, 20 dtk, kembali. ✅ LOST setelah 15 dtk, lalu kunjungan yang sama dibuka lagi.</div>'
             '<div class="row"><span class="when">15.06</span><b>F3 Hilang 8 dtk</b> · P1 seperti F2, 8 dtk. ✅ Kunjungan <b>tidak</b> ditutup.</div>'
             '<div class="row"><span class="when">15.08</span><b>D4 Ganti jaket</b> · P1 pakai jaket di area 2, kembali ke area 1. ✅ Boleh tidak tersambung (keterbatasan).</div>'
             '<div class="row"><span class="when">15.11</span><b>D5 Langsung ke area 2</b> · S1 masuk lewat area 2 tanpa ke kasir. ✅ Terlacak tanpa nama.</div>'
             '<div class="row"><span class="when">15.13</span>F1 dan durasi kunjungan diambil dari semua putaran (tidak perlu uji tambahan).</div></div>'
             + after(OUT_ALL, "⏳ <b>Jeda 2 menit</b>.", OBS_NEXT("Putaran 5")) + "</section>")

    H.append(round_page(5, "15.15–15.25", "P1–P3: CF berubah mengikuti pesanan Putaran 4 (P1: <b>Cheesecake</b> naik ke nomor 1 karena P1 kini membeli Tiramisu) + <b>“Coba yang baru”</b> (≥ 5 kunjungan) + <b>sapaan pelanggan setia</b>. "
                        "P1–P3 <b>memesan “Coba yang baru” nomor 1</b>. S1: “Terlaris”.",
                        s1=" · lalu S1",
                        cashier_note='<div class="note"><b>Untuk SUS</b>: P1 menjadi kasir saat P2 memesan, P2 menjadi kasir saat P3 memesan (A mendampingi).</div>')
             + after(OUT_ALL, OBS_NEXT("Blok H"), "CRM → <b>Kamera</b> dibuka di laptop (dibutuhkan blok H).") + "</section>")

    H.append('<section class="page">' + band("15.25–15.33", "Blok H · Kamera di halaman website", C["H"], DAY) +
             chips(siapa="K, P1", siapkan="HP stopwatch milidetik", lama="±8 menit") +
             '<div class="vt">'
             '<div class="row"><span class="when">15.25</span><b>H1</b> CRM → Kamera → Semua kamera area. ✅ “Langsung · ±12–15 fps”.</div>'
             '<div class="row"><span class="when">15.26</span><b>H2 Jeda gambar</b> · HP stopwatch di depan kamera 1, foto layar laptop & HP bersamaan, 3×. ✅ selisih ±0,2–1 dtk.</div>'
             '<div class="row"><span class="when">15.28</span><b>H3</b> klik “Hemat data”. ✅ ±6 fps. · <b>H6</b> pindah tab 30 dtk, kembali. ✅ gambar muncul lagi.</div>'
             '<div class="row"><span class="when">15.29</span><b>H4 Jalur cadangan</b> · jalankan perintah di bawah. ✅ “Cadangan” beberapa detik, lalu “Langsung” lagi ±1 mnt.</div>'
             '<div class="row"><span class="when">15.31</span><b>H5</b> buka halaman Kamera juga di HP. ✅ keduanya lancar. · <b>H7</b> P1 berjalan cepat. ✅ kotak tidak tertinggal jauh.</div></div>'
             + cmd("# 15.29  H4", f'ssh -t {PI} "pkill cloudflared"')
             + after("Tutup halaman Kamera di website (hemat kuota).", OBS_NEXT("Blok I")) + "</section>")

    H.append('<section class="page">' + band("15.33–15.47", "Blok I + F6 + J · Gangguan dan privasi", C["I"], DAY) +
             chips(siapa="K, A, P1, P3", siapkan="HP untuk akun Kasir", lama="±14 menit") + '<div class="grid g2"><div class="vt">'
             '<div class="row"><span class="when">15.33</span><b>F6 Pi mati</b> · perintah ① di kanan. <b>Halaman Kasir tetap terbuka.</b></div>'
             '<div class="row"><span class="when">15.34</span>P3 dikenali di kasir, memesan, lalu keluar lewat pintu. ⏳ (cadangan uji 2 menit)</div>'
             '<div class="row"><span class="when">15.35</span><b>I1 Internet putus</b> · matikan <b>data seluler</b> HP 2 mnt (hotspot tetap ON); P1 dikenali di kasir. ✅ Nama tampil di tampilan lokal; setelah data ON, catatan masuk dengan <b>jam aslinya</b>.</div>'
             '<div class="row"><span class="when">15.38</span><b>F6 cek</b> · CRM → Kunjungan: kunjungan P3 <b>ditutup TIMEOUT</b> ±2 mnt setelah tanda terakhir.</div>'
             '<div class="row"><span class="when">15.39</span><b>I2</b> · perintah ② (Pi jalan lagi). ✅ Online ≤ 1 mnt.</div>'
             '<div class="row"><span class="when">15.40</span><b>I4 Kabel kamera</b> · cabut webcam wajah 10 dtk, colok lagi. ✅ Tersambung sendiri ±5 dtk.</div>'
             '<div class="row"><span class="when">15.41</span><b>I3</b> · CRM → Perangkat → Mulai ulang UNO Q. ✅ Online ≤ 1 mnt.</div>'
             '<div class="row"><span class="when">15.43</span><b>J1 Hak akses</b> · di HP, A login akun Kasir. ✅ Perangkat, Kunjungan, Menu, Tata Letak tidak bisa dibuka.</div>'
             '<div class="row"><span class="when">15.44</span><b>J3 Hapus data</b> · K mendaftarkan “Uji Hapus” (wajah K), lalu menghapusnya. ✅ Data wajah hilang.</div></div><div>'
             + cmd("# ① 15.33  F6: hentikan program Pi", f'ssh -t {PI} "sudo systemctl stop cafe-pi"',
                   "# ② 15.39  I2: jalankan lagi", f'ssh -t {PI} "sudo systemctl start cafe-pi"')
             + '</div></div>' + after(OBS_NEXT("SUS"), "Peserta P1, P2 dan A siap mengisi SUS.") + "</section>")

    H.append('<section class="page">' + band("15.47–15.51", "SUS · kuesioner kegunaan", C["S"], DAY) + chips(siapa="A, P1, P2") +
             flow([("Bagikan", "Lembar SUS (Lampiran), satu per orang."), ("Isi", "±3 menit, tanpa diskusi."), ("Selesai", "Peserta pulang. Terima kasih!")], C["S"]) + "</section>")

    H.append('<section class="page">' + band("15.51–16.00", "Penutup · kembalikan pengaturan & simpan bukti", C["end"], DAY) +
             flow([("⚠️ Pengaturan", "Kafe & kunjungan: <b>kembali dalam = 30</b>, <b>cadangan = 15</b> → Simpan."),
                   ("OBS", "Stop Recording."),
                   ("Database", "Supabase SQL Editor: kueri 1–7 <code>export_hasil_uji.sql</code> → Download CSV ke <b>D:\\UjiTA\\Hari1\\db</b>."),
                   ("Log perangkat", "Perintah di bawah."),
                   ("Rekaman", "OBS → File → Remux → MP4. Salin <b>D:\\UjiTA\\Hari1</b> ke flashdisk/Drive.",
                    ("Ada video, 4 csv perangkat, 7 csv database?", "matikan", "ulangi yang kurang"))], C["end"]) +
             cmd("# folder hasil", "New-Item -ItemType Directory -Force -Path D:\\UjiTA\\Hari1\\pi, D:\\UjiTA\\Hari1\\unoq, D:\\UjiTA\\Hari1\\db",
                 "# log perangkat", f"scp {PI}:~/cafe-pi/data/*.csv D:\\UjiTA\\Hari1\\pi\\",
                 f"scp {UQ}:/home/arduino/facerec/data/*.csv D:\\UjiTA\\Hari1\\unoq\\",
                 "# matikan dengan benar (tunggu 20 dtk, baru cabut)", f'ssh -t {PI} "sudo shutdown -h now"', f'ssh -t {UQ} "sudo shutdown -h now"') + "</section>")

    H.append('<section class="page">' + band("cadangan", "Hari cadangan · hanya bila perlu", C["X"], "HARI 2") +
             flow([("Ada yang gagal karena error?", "Perbaiki penyebabnya, ulangi skenario itu.", ("Masih ada?", "ulangi", "langkah 2")),
                   ("Data kurang?", "Tambah percobaan B (normal), E3b, D2."),
                   ("Semua lengkap?", "<b>Simulasi bebas 30 menit</b>: peserta berperilaku seperti pelanggan tanpa naskah (bagus untuk video sidang).")], C["X"]) +
             '<div class="note">Jam dan persiapan sama: 12.15 persiapan (<b>mode uji ON</b>), 13.00 mulai, penutup (<b>mode uji OFF</b>) dengan folder <b>Hari2</b>.</div></section>')

    # ── appendix ────────────────────────────────────────────────────────────
    H.append('<section class="page app"><h1>Lampiran · untuk menulis skripsi</h1><div class="sub">Tidak perlu dibuka saat pelaksanaan.</div>'
             + md_section("### 8.1", "## 9.") + "</section>")
    H.append('<section class="page app">' + md_section("## 9.", "### 9.3") + "</section>")
    H.append('<section class="page app">' + md_section("### 9.3", "## 10.") + "</section>")
    H.append('<section class="page app">' + md_section("## 10.", "## 13.") + "</section>")
    H.append('<section class="page app">' + md_section("### 13.2", "### 13.3") + "</section>")
    H.append('<section class="page app">' + md_section("### 13.3", "## Referensi") + "</section>")
    H.append('<section class="page app">' + md_section("## Referensi", None).replace("<ul>", "<ol>").replace("</ul>", "</ol>") + "</section>")

    doc = f'<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Skenario Pengujian Visual</title><style>{CSS}</style></head><body>{"".join(H)}</body></html>'
    open(OUT, "w", encoding="utf-8").write(doc)
    print("ok", OUT)


build()
