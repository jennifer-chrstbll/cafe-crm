"""
Hitung ulang rekomendasi yang SEHARUSNYA tampil di panel Kasir pada Putaran 1-5 uji lab.

Salinan rumus frontend/src/lib/server/recommendation.ts (item-based CF, cosine, log(1+qty); cold start
< 3 transaksi = terlaris 30 hari; "Coba yang baru" untuk >= 5 kunjungan). Kecocokannya dengan kode
website diuji oleh frontend/src/__tests__/recommendation_uji.test.ts.

Pakai:  python scripts/simulasi_rekomendasi_uji.py
Bila pesanan di hari uji berbeda, ubah PESANAN di bawah (urut sesuai kejadian) lalu jalankan lagi.
"""
import math

MENU = [("Americano", "COFFEE"), ("Cafe Latte", "COFFEE"), ("Cappuccino", "COFFEE"), ("Mocha", "COFFEE"),
        ("Matcha Latte", "NON_COFFEE"), ("Chocolate", "NON_COFFEE"), ("Croissant", "FOOD"),
        ("Chicken Sandwich", "FOOD"), ("Cheesecake", "DESSERT"), ("Tiramisu", "DESSERT")]
CAT = dict(MENU)
NAMES = sorted(CAT)                       # .order("name")  (Postgres collation ~ alphabetical)
THETA, LAMBDA = 0.4, 0.7


class Model:
    def __init__(self, orders):
        """orders: list of (customer or 'GUEST', item, qty) in time order."""
        self.byC = {}
        for c, i, q in orders:
            if c == "GUEST":
                continue
            row = self.byC.setdefault(c, {})
            row[i] = row.get(i, 0) + q
        self.items = {}
        for c, row in self.byC.items():
            for i, q in row.items():
                self.items.setdefault(i, {})[c] = math.log1p(q)
        self.norm = {i: math.sqrt(sum(x * x for x in v.values())) for i, v in self.items.items()}
        self.sold = {}
        for c, i, q in orders:
            self.sold[i] = self.sold.get(i, 0) + q
        self.popular = sorted(NAMES, key=lambda n: -self.sold.get(n, 0))   # stable sort

    def cos(self, a, b):
        va, vb = self.items.get(a), self.items.get(b)
        if not va or not vb:
            return 0.0
        dot = sum(x * vb[c] for c, x in va.items() if c in vb)
        d = self.norm[a] * self.norm[b]
        return dot / d if d > 0 else 0.0


def history_of(m, cust):
    h = m.byC.get(cust, {})
    return dict(sorted(h.items(), key=lambda kv: kv[0]))      # name order (deterministic tie-break)


def recommend(m, cust, tx, loyal, topN=3):
    hist = history_of(m, cust)
    fav = sorted(hist.items(), key=lambda kv: (-kv[1], kv[0]))[:3]
    picked, cf = [], {}
    detail = {}
    use_cf = tx >= 3 and len(hist) > 0
    if use_cf:
        wsum = sum(math.log1p(q) for q in hist.values())
        scored = []
        for n in NAMES:
            if n in hist:
                continue
            s, bestH, bestC = 0.0, "", 0.0
            parts = []
            for h, q in hist.items():
                c = m.cos(n, h) * math.log1p(q)
                parts.append((h, m.cos(n, h), math.log1p(q)))
                s += c
                if c > bestC:
                    bestC, bestH = c, h
            if s > 0:
                cf[n] = s / wsum
                detail[n] = (parts, wsum)
                scored.append((n, round(s / wsum, 3), f"Sering dibeli bersama {bestH}"))
        scored.sort(key=lambda x: -x[1])
        picked += scored[:topN]
    for n in m.popular:
        if len(picked) >= topN:
            break
        if n in hist or any(p[0] == n for p in picked):
            continue
        picked.append((n, 0, "Terlaris 30 hari terakhir"))
    disc = []
    if loyal and hist:
        maxSold = max([1] + list(m.sold.values()))
        maxCf = max([0] + list(cf.values()))
        cands = [n for n in NAMES if n not in hist and n not in {p[0] for p in picked}]
        base = {}
        for n in cands:
            nov = 1 - math.log1p(m.sold.get(n, 0)) / math.log1p(maxSold)
            rel = cf.get(n, 0) / maxCf if maxCf > 0 else 0
            base[n] = (1 - THETA) * rel + THETA * nov
        sim = lambda a, b: 1.0 if CAT[a] == CAT[b] else m.cos(a, b)   # noqa: E731
        anchor = list(hist)
        left = list(cands)
        while len(disc) < topN and left:
            best, bv = "", -1e9
            for n in left:
                others = anchor + [d[0] for d in disc]
                red = max(sim(n, o) for o in others) if others else 0
                v = LAMBDA * base[n] - (1 - LAMBDA) * red
                if v > bv:
                    bv, best = v, n
            left.remove(best)
            newcat = not any(CAT[a] == CAT[best] for a in anchor)
            disc.append((best, round(base[best], 3), "Belum pernah dicoba · kategori baru" if newcat else "Belum pernah dicoba"))
    return {"cf": use_cf, "fav": fav, "rec": picked, "disc": disc, "detail": detail}


# Urutan kejadian: per putaran P1, P2, P3, lalu S1. S1 = tamu (GUEST) di Putaran 1-3.
PESANAN = {
    1: {"P1": ["Cappuccino", "Croissant"], "P2": ["Cappuccino", "Tiramisu"], "P3": ["Matcha Latte", "Cheesecake"], "S1": ["Americano"]},
    2: {"P1": ["Cappuccino"], "P2": ["Cappuccino", "Cheesecake"], "P3": ["Matcha Latte"], "S1": ["Americano"]},
    3: {"P1": ["Cappuccino", "Croissant"], "P2": ["Cappuccino", "Tiramisu"], "P3": ["Matcha Latte", "Cheesecake"], "S1": ["Mocha"]},
    4: {"P1": ["Tiramisu"], "P2": ["Croissant"], "P3": ["Tiramisu"], "S1": ["Cappuccino"]},
    5: {"P1": ["Chocolate"], "P2": ["Cafe Latte"], "P3": ["Chicken Sandwich"], "S1": ["Tiramisu"]},
}
TAMU_SAMPAI = 3          # S1 didaftarkan di Blok E (sebelum Putaran 4)
SETIA_MULAI = 4          # "Coba yang baru" dihitung mulai putaran ini (tampil bila >= 5 kunjungan)


def main():
    orders, tx = [], {}
    for rnd in sorted(PESANAN):
        print(f"\n=== Putaran {rnd} ===")
        for who, items in PESANAN[rnd].items():
            cust = "GUEST" if (who == "S1" and rnd <= TAMU_SAMPAI) else who
            if cust == "GUEST":
                print(f"{who} (tamu): pesan {', '.join(items)}")
            else:
                r = recommend(Model(orders), cust, tx.get(cust, 0), rnd >= SETIA_MULAI and who != "S1")
                kind = "CF" if r["cf"] else "Terlaris"
                recs = "; ".join(f"{n} ({s:.3f}, {why})" if s else f"{n} (terlaris)" for n, s, why in r["rec"])
                print(f"{who} [{tx.get(cust, 0)} transaksi, {kind}] rekomendasi: {recs}")
                if r["disc"]:
                    print(f"    coba yang baru: {', '.join(n for n, _, _ in r['disc'])}")
                print(f"    pesan: {', '.join(items)}")
            for it in items:
                orders.append((cust, it, 1))
            tx[cust] = tx.get(cust, 0) + 1


if __name__ == "__main__":
    main()
