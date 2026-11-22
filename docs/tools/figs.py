"""Small SVG pictures for the visual test guide (top views, room view, faces)."""
from __future__ import annotations

COL = {"P": "#2563eb", "S": "#dc2626", "A": "#f59e0b", "K": "#6b7280"}


def _person(x, y, label, color=None, ring=None):
    color = color or COL.get(label[0], "#2563eb")
    r = ""
    if ring:
        r = f'<circle cx="{x}" cy="{y}" r="15" fill="none" stroke="{ring}" stroke-width="3"/>'
    return (r + f'<circle cx="{x}" cy="{y}" r="11" fill="{color}"/>'
            f'<text x="{x}" y="{y + 4}" font-size="10" font-weight="700" fill="#fff" text-anchor="middle">{label}</text>')


def _arrow(points, color="#111827", dash=False):
    d = " ".join(("M" if i == 0 else "L") + f"{x},{y}" for i, (x, y) in enumerate(points))
    da = ' stroke-dasharray="5 4"' if dash else ""
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="2.2"{da} marker-end="url(#ah)"/>'


DEFS = ('<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" '
        'orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#111827"/></marker></defs>')


def top(people=(), arrows=(), obstacle=None, lights=(), queue=False, wait=True, dist=False, staff=False,
        caption="", w=200, h=150, spots=True):
    """Top view of the cashier: counter + face camera at the top, customers below.
    Positions in metres: x left(-)/right(+), y distance from the counter."""
    if caption and h < 165:
        h = 165                                   # room for the caption under the waiting line
    cx = w / 2
    X = lambda m: cx + m * 55
    Y = lambda m: 40 + m * 44
    s = [f'<svg viewBox="0 0 {w} {h}" width="100%" xmlns="http://www.w3.org/2000/svg">{DEFS}',
         f'<rect x="0" y="0" width="{w}" height="{h}" rx="10" fill="#f8fafc"/>']
    if staff:
        s.append(f'<rect x="{cx - 80}" y="3" width="160" height="15" rx="4" fill="#fde68a"/>'
                 f'<text x="{cx + 77}" y="14" font-size="9" text-anchor="end" fill="#92400e">area staf</text>')
    s.append(f'<rect x="{cx - 70}" y="19" width="140" height="11" rx="3" fill="#94a3b8"/>'
             f'<text x="{cx - 66}" y="28" font-size="8.5" fill="#fff">meja kasir</text>')
    s.append(f'<rect x="{cx - 6}" y="28" width="12" height="9" rx="2" fill="#7c3aed"/>'
             f'<text x="{cx + 10}" y="42" font-size="8.5" fill="#6d28d9">kamera wajah</text>')
    if spots:
        s.append(f'<circle cx="{X(0)}" cy="{Y(0.9)}" r="{0.42 * 55}" fill="#22c55e" opacity=".16" stroke="#16a34a"/>')
        for lab, mx in (("K", -0.3), ("N", 0.3)):
            s.append(f'<text x="{X(mx * 1.25)}" y="{Y(0.9) + 3}" font-size="9" font-weight="700" fill="#15803d" text-anchor="middle">{lab}</text>')
    if queue:
        for m, lab in ((1.5, "antre 0,6 m"), (1.9, "antre 1,0 m")):
            s.append(f'<line x1="{cx - 60}" y1="{Y(m)}" x2="{cx + 60}" y2="{Y(m)}" stroke="#64748b" stroke-dasharray="4 3"/>'
                     f'<text x="{w - 4}" y="{Y(m) + 3}" font-size="8.5" fill="#475569" text-anchor="end">{lab}</text>')
    if wait:
        s.append(f'<line x1="{cx - 75}" y1="{Y(2.1)}" x2="{cx + 75}" y2="{Y(2.1)}" stroke="#0ea5e9" stroke-width="2"/>'
                 f'<text x="{w - 4}" y="{Y(2.1) + 11}" font-size="8.5" fill="#0369a1" text-anchor="end">garis tunggu</text>')
    if dist:
        for m in (0.5, 1.0, 1.5, 2.0):
            s.append(f'<line x1="3" y1="{Y(m)}" x2="13" y2="{Y(m)}" stroke="#334155" stroke-width="1.5"/>'
                     f'<text x="15" y="{Y(m) + 3}" font-size="8.5" fill="#334155">{str(m).replace(".", ",")} m</text>')
    if obstacle:
        ox, oy, ow, oh = obstacle
        s.append(f'<rect x="{X(ox)}" y="{Y(oy)}" width="{ow * 55}" height="{oh * 44}" fill="#475569"/>'
                 f'<text x="{X(ox) + ow * 27}" y="{Y(oy) - 3}" font-size="9" text-anchor="middle" fill="#475569">sekat</text>')
    for lx, ly, kind in lights:
        s.append(_bulb(X(lx), Y(ly), kind))
    for pts in arrows:
        s.append(_arrow([(X(a), Y(b)) for a, b in pts]))
    for p in people:
        mx, my, lab = p[:3]
        ring = p[3] if len(p) > 3 else None
        s.append(_person(X(mx), Y(my), lab, ring=ring))
    if caption:
        s.append(f'<text x="{cx}" y="{h - 5}" font-size="9.5" text-anchor="middle" fill="#334155">{caption}</text>')
    s.append("</svg>")
    return "".join(s)


def _bulb(x, y, kind="on"):
    col = {"on": "#facc15", "off": "#475569"}.get(kind, "#facc15")
    rays = "" if kind == "off" else "".join(
        f'<line x1="{x}" y1="{y}" x2="{x + dx}" y2="{y + dy}" stroke="#facc15" stroke-width="2"/>'
        for dx, dy in ((-14, 0), (14, 0), (0, -14), (-10, -10), (10, -10), (-10, 10), (10, 10), (0, 14)))
    return rays + f'<circle cx="{x}" cy="{y}" r="7" fill="{col}" stroke="#a16207"/>'


def room(people=(), arrows=(), caption="", w=300, h=170, door=True):
    """Room seen from above: camera 1 (cashier side, left) and camera 2 (seating, right) with the shared strip."""
    s = [f'<svg viewBox="0 0 {w} {h}" width="100%" xmlns="http://www.w3.org/2000/svg">{DEFS}',
         f'<rect x="0" y="0" width="{w}" height="{h}" rx="10" fill="#f8fafc"/>',
         '<rect x="8" y="12" width="160" height="130" rx="6" fill="#dbeafe" stroke="#3b82f6"/>',
         '<text x="14" y="25" font-size="9" font-weight="700" fill="#1d4ed8">KAMERA 1 · area kasir</text>',
         f'<rect x="132" y="12" width="{w - 140}" height="130" rx="6" fill="#ede9fe" opacity=".85" stroke="#7c3aed"/>',
         f'<text x="{w - 14}" y="25" font-size="9" font-weight="700" fill="#6d28d9" text-anchor="end">KAMERA 2 · area duduk</text>',
         '<rect x="132" y="12" width="36" height="130" fill="#a3e635" opacity=".45"/>',
         '<text x="150" y="9" font-size="8" text-anchor="middle" fill="#3f6212">pita ±1 m</text>',
         '<rect x="30" y="52" width="70" height="10" rx="2" fill="#94a3b8"/>',
         '<text x="65" y="72" font-size="7.5" text-anchor="middle" fill="#334155">meja kasir</text>',
         f'<rect x="{w - 90}" y="50" width="26" height="18" rx="3" fill="#cbd5e1"/>',
         f'<rect x="{w - 56}" y="90" width="26" height="18" rx="3" fill="#cbd5e1"/>']
    if door:
        s.append('<rect x="8" y="104" width="8" height="30" fill="#0ea5e9"/>'
                 '<text x="20" y="122" font-size="8" fill="#0369a1">pintu</text>')
    for pts in arrows:
        s.append(_arrow(pts))
    for p in people:
        x, y, lab = p[:3]
        s.append(_person(x, y, lab, ring=p[3] if len(p) > 3 else None))
    if caption:
        s.append(f'<text x="{w / 2}" y="{h - 4}" font-size="9" text-anchor="middle" fill="#334155">{caption}</text>')
    s.append("</svg>")
    return "".join(s)


def face(variant="", w=110, h=110, label=""):
    """A simple face showing the condition of a trial."""
    cx, cy = 55, 52
    turn = {"t15": 6, "t30": 11, "t45": 17}.get(variant, 0)
    bg = {"dark": "#1f2937", "bright": "#fef9c3", "back": "#fef3c7", "side": "#e5e7eb"}.get(variant, "#f8fafc")
    s = [f'<svg viewBox="0 0 {w} {h}" width="100%" xmlns="http://www.w3.org/2000/svg">',
         f'<rect width="{w}" height="{h}" rx="10" fill="{bg}"/>']
    if variant == "back":
        s.append(f'<circle cx="{cx}" cy="{cy}" r="44" fill="#fde047" opacity=".9"/>')
    if variant == "side":
        s.append(f'<rect x="0" y="0" width="{w / 2}" height="{h}" fill="#fde68a" opacity=".7"/>')
    if variant == "phone":
        s.append('<rect x="28" y="12" width="54" height="86" rx="7" fill="#111827"/>'
                 '<rect x="32" y="20" width="46" height="70" rx="3" fill="#e0f2fe"/>')
        cx, cy, sc = 55, 55, 0.55
    else:
        sc = 1.0
    skin = "#4b5563" if variant in ("dark", "back") else "#fcd34d"
    if variant == "hijab":
        s.append(f'<ellipse cx="{cx}" cy="{cy + 4}" rx="{36 * sc}" ry="{40 * sc}" fill="#14b8a6"/>')
    s.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{28 * sc}" ry="{33 * sc}" fill="{skin}" stroke="#92400e" stroke-width="1.5"/>')
    ex = 10 * sc
    s.append(f'<circle cx="{cx - ex + turn}" cy="{cy - 6 * sc}" r="{3 * sc}" fill="#111827"/>'
             f'<circle cx="{cx + ex + turn}" cy="{cy - 6 * sc}" r="{3 * sc}" fill="#111827"/>'
             f'<path d="M{cx - 4 * sc + turn},{cy + 3 * sc} L{cx + 2 * sc + turn},{cy + 8 * sc}" stroke="#92400e" stroke-width="1.5"/>')
    mouth = (f'<path d="M{cx - 10 * sc + turn},{cy + 15 * sc} Q{cx + turn},{cy + 26 * sc} {cx + 10 * sc + turn},{cy + 15 * sc}" '
             'stroke="#111827" stroke-width="2" fill="none"/>') if variant == "smile" else \
        f'<line x1="{cx - 8 * sc + turn}" y1="{cy + 17 * sc}" x2="{cx + 8 * sc + turn}" y2="{cy + 17 * sc}" stroke="#111827" stroke-width="2"/>'
    s.append(mouth)
    if variant == "glasses":
        s.append(f'<circle cx="{cx - 10}" cy="{cy - 6}" r="7" fill="none" stroke="#111827" stroke-width="2"/>'
                 f'<circle cx="{cx + 10}" cy="{cy - 6}" r="7" fill="none" stroke="#111827" stroke-width="2"/>'
                 f'<line x1="{cx - 3}" y1="{cy - 6}" x2="{cx + 3}" y2="{cy - 6}" stroke="#111827" stroke-width="2"/>')
    if variant == "sunglasses":
        s.append(f'<rect x="{cx - 20}" y="{cy - 12}" width="16" height="11" rx="4" fill="#111827"/>'
                 f'<rect x="{cx + 4}" y="{cy - 12}" width="16" height="11" rx="4" fill="#111827"/>')
    if variant == "cap":
        s.append(f'<path d="M{cx - 30},{cy - 16} Q{cx},{cy - 52} {cx + 30},{cy - 16} Z" fill="#dc2626"/>'
                 f'<rect x="{cx - 34}" y="{cy - 18}" width="44" height="6" rx="3" fill="#b91c1c"/>')
    if variant == "mask":
        s.append(f'<rect x="{cx - 20}" y="{cy + 2}" width="40" height="24" rx="8" fill="#93c5fd" stroke="#2563eb"/>')
    if variant in ("dark",):
        s.append(f'<rect width="{w}" height="{h}" rx="10" fill="#000" opacity=".35"/>')
    if variant == "bright":
        s.append(_bulb(18, 18, "on"))
    if label:
        s.append(f'<text x="{w / 2}" y="{h - 4}" font-size="10" text-anchor="middle" fill="#111827" '
                 f'font-weight="600">{label}</text>')
    s.append("</svg>")
    return "".join(s)
