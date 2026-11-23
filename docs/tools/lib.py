"""Visual test guide: HTML (printed to PDF by Edge)."""
import html
import re
import sys

sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
from figs import face, room, top  # noqa: E402

V2 = __import__("os").path.join(__import__("os").path.dirname(__import__("os").path.abspath(__file__)), "..", "SKENARIO_PENGUJIAN_lampiran.md")

CSS = """
@page { size: A4 landscape; margin: 9mm 10mm 11mm 10mm;
  @bottom-right { content: "Halaman " counter(page); font: 9px 'Segoe UI'; color: #6b7280; }
  @bottom-left { content: "Skenario Pengujian Visual · uji lab"; font: 9px 'Segoe UI'; color: #9ca3af; } }
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; color: #1f2937; font-size: 11.5px; margin: 0; }
.page { break-before: page; }
.page:first-child { break-before: auto; }
h1 { font-size: 30px; margin: 0 0 4px; color: #0f766e; }
h2 { font-size: 20px; margin: 0 0 8px; }
h3 { font-size: 14px; margin: 10px 0 6px; }
.sub { color: #6b7280; font-size: 13px; margin-bottom: 14px; }
.band { display: flex; align-items: center; gap: 12px; padding: 9px 14px; border-radius: 12px; color: #fff; margin-bottom: 10px; }
.band .time { font-size: 22px; font-weight: 800; background: rgba(255,255,255,.18); padding: 4px 10px; border-radius: 8px; white-space: nowrap; }
.band .title { font-size: 19px; font-weight: 700; }
.band .day { margin-left: auto; font-size: 12px; opacity: .9; white-space: nowrap; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.chip { border-radius: 999px; padding: 3px 10px; font-size: 11px; background: #f1f5f9; border: 1px solid #e2e8f0; }
.chip b { margin-right: 4px; }
.flow { display: flex; align-items: stretch; gap: 0; margin: 6px 0 10px; }
.step { flex: 1; background: #fff; border: 2px solid #cbd5e1; border-radius: 10px; padding: 7px 8px; font-size: 11px; position: relative; }
.step .n { display: inline-block; width: 20px; height: 20px; border-radius: 50%; color: #fff; text-align: center; line-height: 20px; font-weight: 700; margin-right: 4px; font-size: 11px; }
.step .t { font-weight: 700; }
.arr { width: 20px; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 18px; }
.dec { margin-top: 6px; border-radius: 8px; font-size: 10.5px; overflow: hidden; border: 1px solid #e5e7eb; }
.dec .q { background: #f8fafc; padding: 3px 6px; font-weight: 600; }
.dec .y { background: #dcfce7; padding: 3px 6px; }
.dec .no { background: #fee2e2; padding: 3px 6px; }
.grid { display: grid; gap: 8px; }
.g2 { grid-template-columns: 1fr 1fr; } .g3 { grid-template-columns: repeat(3, 1fr); } .g4 { grid-template-columns: repeat(4, 1fr); }
.card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px; break-inside: avoid; background: #fff; display: flex; gap: 8px; }
.card .fig { width: 96px; flex: none; }
.card .fig.wide { width: 96px; }
.card.stack { flex-direction: column; }
.card.stack .fig { width: 100%; }
.card.stack .fig svg { display: block; max-height: 150px; margin: 0 auto; }
.card .body { flex: 1; min-width: 0; }
.code { display: inline-block; color: #fff; font-weight: 800; border-radius: 6px; padding: 1px 7px; margin-right: 5px; font-size: 11px; }
.card .ttl { font-weight: 700; font-size: 12.5px; }
.meta { color: #475569; font-size: 10.5px; margin: 2px 0 4px; }
.rt td, .rt th { padding: 2px 6px; font-size: 10.5px; line-height: 1.3; }
.ok { background: #dcfce7; border-left: 4px solid #16a34a; padding: 3px 6px; border-radius: 4px; margin-top: 4px; font-size: 10.5px; }
.bad { background: #fef3c7; border-left: 4px solid #d97706; padding: 3px 6px; border-radius: 4px; margin-top: 3px; font-size: 10.5px; }
.note { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 7px 10px; margin: 6px 0; font-size: 11px; }
.warn { background: #fff7ed; border: 1px solid #fdba74; border-radius: 10px; padding: 7px 10px; margin: 6px 0; font-size: 11px; }
table { border-collapse: collapse; width: 100%; font-size: 10.5px; margin: 4px 0 8px; break-inside: auto; }
th { background: #0f766e; color: #fff; text-align: left; padding: 4px 6px; }
td { border-bottom: 1px solid #e5e7eb; padding: 4px 6px; vertical-align: top; }
tr:nth-child(even) td { background: #f8fafc; }
.timeline { display: flex; height: 64px; border-radius: 10px; overflow: hidden; margin: 8px 0 4px; }
.timeline div { color: #fff; font-size: 10px; padding: 4px 5px; border-right: 2px solid #fff; overflow: hidden; }
.timeline div b { display: block; font-size: 11px; }
.ticks { display: flex; justify-content: space-between; color: #6b7280; font-size: 10px; margin-bottom: 10px; }
.tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 12px 0; }
.tile { border-radius: 14px; padding: 14px; color: #fff; }
.tile .big { font-size: 26px; font-weight: 800; }
.person { border-radius: 12px; padding: 8px; border: 1px solid #e2e8f0; display: flex; gap: 8px; align-items: center; break-inside: avoid; }
.dot { width: 34px; height: 34px; border-radius: 50%; color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; flex: none; }
.vt { border-left: 4px solid #e5e7eb; margin-left: 50px; }
.vt .row { position: relative; padding: 4px 0 8px 14px; }
.vt .row .when { position: absolute; left: -56px; top: 3px; font-weight: 800; color: #b91c1c; width: 46px; text-align: right; }
.vt .row::before { content: ""; position: absolute; left: -9px; top: 6px; width: 14px; height: 14px; border-radius: 50%; background: #ef4444; }
.small { font-size: 10px; color: #6b7280; }
.check td:first-child { width: 26px; font-size: 15px; }
.app h2 { color: #0f766e; }
.rfig svg { max-height: 170px; width: auto; max-width: 100%; display: block; margin: 0 auto; }
.after { border: 2px dashed #334155; border-radius: 12px; padding: 8px 12px; margin-top: 10px; background: #f8fafc; break-inside: avoid; }
.after .h { font-weight: 800; color: #334155; margin-bottom: 4px; }
.cmd { font-family: Consolas, monospace; font-size: 10.5px; background: #0f172a; color: #e2e8f0; border-radius: 8px; padding: 6px 9px; margin: 4px 0; white-space: pre-wrap; word-break: break-all; }
.cmd .c { color: #94a3b8; }
.reset { background: #ecfeff; border: 1px solid #67e8f9; border-radius: 10px; padding: 6px 10px; margin: 6px 0; font-size: 11px; }
"""

C = {"prep": "#475569", "open": "#0f766e", "A": "#16a34a", "R": "#0d9488", "B": "#2563eb", "C": "#7c3aed",
     "E": "#ea580c", "D": "#4f46e5", "H": "#0891b2", "I": "#dc2626", "S": "#a16207", "end": "#334155", "X": "#64748b"}

esc = html.escape


def md_inline(t: str) -> str:
    t = esc(t, quote=False)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<i>\1</i>", t)
    return t


def band(time, title, color, day=""):
    return (f'<div class="band" style="background:{color}"><span class="time">{time}</span>'
            f'<span class="title">{title}</span><span class="day">{day}</span></div>')


def chips(**kw):
    names = {"siapa": "👥 Siapa", "siapkan": "🧰 Siapkan", "rekam": "🎥 Rekam", "lama": "⏱ Lama"}
    return '<div class="chips">' + "".join(
        f'<span class="chip"><b>{names.get(k, k)}</b>{v}</span>' for k, v in kw.items()) + "</div>"


def flow(steps, color, start=1):
    """steps: list of (title, text, decision) ; decision = (question, yes, no) or None"""
    out = ['<div class="flow">']
    for i, st in enumerate(steps):
        t, txt = st[0], st[1]
        dec = st[2] if len(st) > 2 else None
        d = ""
        if dec:
            q, y, n = dec
            d = (f'<div class="dec"><div class="q">❓ {q}</div><div class="y">✅ Ya → {y}</div>'
                 f'<div class="no">⚠️ Tidak → {n}</div></div>')
        out.append(f'<div class="step" style="border-color:{color}"><span class="n" style="background:{color}">{i + start}</span>'
                   f'<span class="t">{t}</span><div>{txt}</div>{d}</div>')
        if i < len(steps) - 1:
            out.append('<div class="arr">➜</div>')
    out.append("</div>")
    return "".join(out)


def card(code, title, who, how, ok, bad, fig="", color="#2563eb", wide=False):
    f = f'<div class="fig{" wide" if wide else ""}">{fig}</div>' if fig else ""
    plan = 'viewBox="0 0 200' in fig or 'viewBox="0 0 300' in fig      # floor plans: picture on top, full width
    return (f'<div class="card{" stack" if plan else ""}">{f}<div class="body"><div><span class="code" style="background:{color}">{code}</span>'
            f'<span class="ttl">{title}</span></div><div class="meta">👥 {who}</div><div>{how}</div>'
            f'<div class="ok">✅ {ok}</div>' + (f'<div class="bad">⚠️ {bad}</div>' if bad else "") + "</div></div>")


def timeline(segs, start=13 * 60, end=16 * 60):
    tot = end - start
    out = ['<div class="timeline">']
    for a, b, lab, col in segs:
        ma = int(a[:2]) * 60 + int(a[3:])
        mb = int(b[:2]) * 60 + int(b[3:])
        out.append(f'<div style="flex:{(mb - ma) / tot};background:{col}"><b>{a}</b>{lab}</div>')
    out.append("</div>")
    ticks = "".join(f"<span>{h}.00</span>" if m == 0 else f"<span>{h}.30</span>"
                    for h in range(start // 60, end // 60 + 1) for m in (0, 30) if h * 60 + m <= end)
    return "".join(out) + f'<div class="ticks">{ticks}</div>'


P_POS = {"P1": "KTNKTN", "P2": "TNKTNK", "P3": "NKTNKT", "P4": "KNTKNT", "P5": "TKNTKN"}
ORDERS = {1: ["Kopi A + Makanan A", "Kopi A", "Kopi B + Makanan A", "Non-kopi A + Makanan B", "Non-kopi A"],
          2: ["Kopi A", "Kopi A + Makanan A", "Kopi B", "Non-kopi A", "Non-kopi B + Makanan B"],
          3: ["Kopi B + Makanan A", "Kopi A", "Kopi A + Makanan A", "Non-kopi B + Makanan B", "Non-kopi A"]}


def round_page(n, time, day, extra_who="", see="", notes=""):
    pos = {p: v[n - 1] for p, v in P_POS.items()}
    orders = ORDERS.get(n, ["pilih dari panel rekomendasi bila cocok"] * 5)
    path = room(people=[(70, 97, "P", "#16a34a"), (215, 85, "P")],
                arrows=[[(18, 112), (57, 101)], [(85, 95), (203, 87)], [(206, 98), (20, 130)]],
                caption="pintu → kasir → area duduk (lewat pita) → pintu")
    table_rows = "".join(
        f"<tr><td><b>{p}</b></td><td style='font-size:14px;font-weight:800;color:#15803d'>{pos[p]}</td><td>{orders[i]}</td></tr>"
        for i, p in enumerate(["P1", "P2", "P3", "P4", "P5"]))
    steps = [
        ("Pintu", "Masuk lewat pintu."),
        ("Garis tunggu", "Tunggu sampai orang sebelumnya meninggalkan meja kasir."),
        ("Titik kasir", "Berdiri di posisi <b>K/T/N</b> (tabel), hadap kamera ±3 dtk.",
         ("Nama muncul di Kasir dan menempel (hijau) di badan dalam 5 dtk?", "lanjut",
          "ucapkan <i>“gagal kenal Pn”</i>, kasir pilih pelanggan manual, catat")),
        ("Kasir", "Ucapkan <b>sapaan</b> yang muncul, masukkan pesanan (tabel), <b>bayar</b>.",
         ("Rekomendasi sesuai kotak hijau di bawah?", "lanjut", "ucapkan <i>“rekomendasi beda”</i>, catat")),
        ("Area duduk", "Jalan lewat <b>pita</b>, duduk ±2 menit.",
         ("Nama ikut pindah ke kamera 2?", "lanjut", "ucapkan <i>“gagal pindah Pn”</i>, catat")),
        ("Pintu", "Kembali lewat pita, keluar lewat pintu."),
    ]
    return (f'<section class="page">{band(time, f"Putaran {n} · kunjungan ke-{n}", C["R"], day)}'
            + chips(siapa="P1 → P2 → P3 → P4 → P5 (selalu urutan ini)" + extra_who, rekam=f"file baru “Putaran {n}”",
                    lama="±13 menit") +
            '<div class="warn">⏰ <b>Jangan mulai sebelum jam ini.</b> Kunjungan baru hanya tercatat bila peserta '
            'kembali &gt; 30 menit setelah keluar. Di awal ucapkan: <i>“Putaran ' + str(n) + '”</i>.</div>'
            + flow(steps, C["R"]) +
            '<div class="grid g2"><div>' + path + '</div><div><table><tr><th>Peserta</th><th>Posisi</th>'
            f'<th>Pesanan (ganti dengan nama menu di CRM)</th></tr>{table_rows}</table>'
            f'<div class="ok">✅ <b>Harus terlihat di panel Kasir:</b> {see}</div>{notes}</div></div></section>')


def trial_loop(color):
    return flow([("Ucapkan penanda", "<i>“B3a, P1, gelap 40 lux, percobaan 1”</i>"),
                 ("Melangkah ke T", "Hadap kamera wajah ±3 detik."),
                 ("Mundur", "Ke garis tunggu ±3 detik."),
                 ("Ulangi", "Percobaan berikutnya / peserta berikutnya.")], color)


def md_section(start, end):
    """Convert part of the v2 markdown (tables, lists, paragraphs, headings) to HTML."""
    lines = open(V2, encoding="utf-8").read().splitlines()
    i0 = next(i for i, l in enumerate(lines) if l.startswith(start))
    i1 = next((i for i, l in enumerate(lines) if i > i0 and l.startswith(end)), len(lines)) if end else len(lines)
    out, i, para = [], i0, []
    seg = lines[i0:i1]
    j = 0
    while j < len(seg):
        l = seg[j]
        s = l.strip()
        if s.startswith("|"):
            rows = []
            while j < len(seg) and seg[j].strip().startswith("|"):
                cells = [c.strip() for c in seg[j].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-{2,}:?", c) for c in cells if c):
                    rows.append(cells)
                j += 1
            out.append("<table><tr>" + "".join(f"<th>{md_inline(c)}</th>" for c in rows[0]) + "</tr>" +
                       "".join("<tr>" + "".join(f"<td>{md_inline(c)}</td>" for c in r) + "</tr>" for r in rows[1:]) +
                       "</table>")
            continue
        m = re.match(r"^(#{2,4})\s+(.*)", l)
        if m:
            tag = {2: "h2", 3: "h3", 4: "h3"}[len(m.group(1))]
            out.append(f"<{tag}>{md_inline(m.group(2))}</{tag}>")
        elif re.match(r"^\s*(\d+\.|-)\s+", l):
            items = []
            while j < len(seg) and (re.match(r"^\s*(\d+\.|-)\s+", seg[j]) or (seg[j].startswith("  ") and seg[j].strip())):
                if re.match(r"^\s*(\d+\.|-)\s+", seg[j]):
                    items.append(re.sub(r"^\s*(\d+\.|-)\s+", "", seg[j]))
                else:
                    items[-1] += " " + seg[j].strip()
                j += 1
            out.append("<ul>" + "".join(f"<li>{md_inline(x)}</li>" for x in items) + "</ul>")
            continue
        elif s:
            k = j
            buf = []
            while k < len(seg) and seg[k].strip() and not seg[k].strip().startswith(("|", "#")) and \
                    not re.match(r"^\s*(\d+\.|-)\s+", seg[k]):
                buf.append(seg[k].strip())
                k += 1
            out.append(f"<p>{md_inline(' '.join(buf))}</p>")
            j = k
            continue
        j += 1
    return "".join(out)


