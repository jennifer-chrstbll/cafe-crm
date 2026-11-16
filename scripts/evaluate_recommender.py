"""
evaluate_recommender.py -- offline evaluation of the menu recommendation model (Bab IV)
======================================================================================
Same model as the website (frontend/src/lib/server/recommendation.ts):

    r(u,i)   = log(1 + qty)                                   implicit feedback (Hu et al. 2008)
    sim(i,j) = cosine of item columns                          item-based CF (Sarwar et al. 2001)
    score(c) = sum_h sim(c,h) r(u,h) / sum_h r(u,h)            over the items h the customer bought

Protocol (temporal leave-last-out, standard for top-N recommendation; Cremonesi et al. 2010):
  * for every customer with >= MIN_TX transactions, hide their LAST transaction;
  * build the model from everything before that moment (no peeking into the future);
  * recommend top-K items the customer had not bought before;
  * a HIT = one of the K items is in the hidden transaction (new items only, like the website).
Compared with the cold-start baseline (best sellers of the 30 days before), which is what
the website shows customers with fewer than MIN_TX transactions.

Also reports, for the loyal-customer list ("Coba yang baru"): novelty (mean -log2 popularity,
Vargas & Castells 2011) and intra-list diversity (share of distinct categories).

Run (any PC with Python, inside cafe-crm):
    pip install psycopg2-binary
    set DATABASE_URL=postgresql://...      (PowerShell: $env:DATABASE_URL="postgresql://...")
    python scripts/evaluate_recommender.py --k 3
"""

from __future__ import annotations

import argparse
import math
import os
import sys
from collections import defaultdict
from datetime import timedelta

GUEST = "00000000-0000-0000-0000-000000000001"


def load(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT t.transaction_id::text, v.customer_id::text, t.created_at, o.menu_id::text, o.qty
            FROM transactions t
            JOIN visits v ON v.visit_id = t.visit_id
            JOIN orders o ON o.transaction_id = t.transaction_id
            WHERE v.customer_id <> %s
            ORDER BY t.created_at""", (GUEST,))
        rows = cur.fetchall()
        cur.execute("SELECT menu_id::text, name, category::text FROM menu WHERE is_active")
        menus = {m: (n, c) for m, n, c in cur.fetchall()}
    tx = {}
    for tid, cid, at, mid, qty in rows:
        t = tx.setdefault(tid, {"customer": cid, "at": at, "items": defaultdict(int)})
        t["items"][mid] += int(qty)
    return list(tx.values()), menus


class Model:
    def __init__(self, history, menus):
        self.menus = menus
        self.by_c = defaultdict(lambda: defaultdict(int))
        for t in history:
            for i, q in t["items"].items():
                self.by_c[t["customer"]][i] += q
        self.items = defaultdict(dict)
        for c, row in self.by_c.items():
            for i, q in row.items():
                self.items[i][c] = math.log1p(q)
        self.norm = {i: math.sqrt(sum(x * x for x in v.values())) for i, v in self.items.items()}

    def cos(self, a, b):
        va, vb = self.items.get(a), self.items.get(b)
        if not va or not vb:
            return 0.0
        if len(va) > len(vb):
            va, vb = vb, va
        dot = sum(x * vb.get(c, 0.0) for c, x in va.items())
        d = self.norm[a] * self.norm[b]
        return dot / d if d else 0.0

    def cf(self, customer):
        hist = self.by_c.get(customer, {})
        w = sum(math.log1p(q) for q in hist.values())
        out = {}
        for i in self.menus:
            if i in hist:
                continue
            s = sum(self.cos(i, h) * math.log1p(q) for h, q in hist.items())
            if s > 0:
                out[i] = s / w
        return out


def popular(history, menus, end, days=30):
    sold = defaultdict(int)
    for t in history:
        if t["at"] >= end - timedelta(days=days):
            for i, q in t["items"].items():
                sold[i] += q
    return sorted(menus, key=lambda i: -sold.get(i, 0)), sold


def discover(model, customer, cf, sold, exclude, k, theta=0.4, lam=0.7):
    hist = model.by_c.get(customer, {})
    max_sold = max([1, *sold.values()])
    max_cf = max([0.0, *cf.values()])
    cands = [i for i in model.menus if i not in hist and i not in exclude]
    base = {i: (1 - theta) * ((cf.get(i, 0) / max_cf) if max_cf else 0)
               + theta * (1 - math.log1p(sold.get(i, 0)) / math.log1p(max_sold)) for i in cands}

    def sim(a, b):
        return 1.0 if model.menus[a][1] == model.menus.get(b, (None, None))[1] else model.cos(a, b)
    picked = []
    while cands and len(picked) < k:
        anchor = [h for h in hist if h in model.menus] + picked
        best = max(cands, key=lambda i: lam * base[i] - (1 - lam) * max([0.0, *(sim(i, j) for j in anchor)]))
        picked.append(best)
        cands.remove(best)
    return picked


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--k", type=int, default=3)
    ap.add_argument("--min-tx", type=int, default=3, help="transactions needed before CF is used (website: 3)")
    args = ap.parse_args()
    import psycopg2
    url = os.getenv("DATABASE_URL")
    if not url:
        sys.exit("Set DATABASE_URL first.")
    txs, menus = load(psycopg2.connect(url, connect_timeout=15))
    by_c = defaultdict(list)
    for t in txs:
        by_c[t["customer"]].append(t)

    n = hit_cf = hit_pop = 0
    nov, div = [], []
    for c, ts in by_c.items():
        if len(ts) < args.min_tx + 1:          # >= min_tx transactions BEFORE the hidden one
            continue
        test = ts[-1]
        history = [t for t in txs if t["at"] < test["at"]]
        model = Model(history, menus)
        bought = set(model.by_c.get(c, {}))
        target = {i for i in test["items"] if i not in bought and i in menus}
        if not target:
            continue                            # nothing new to predict in that transaction
        n += 1
        cf = model.cf(c)
        top_cf = sorted(cf, key=lambda i: -cf[i])[: args.k]
        pop, sold = popular(history, menus, test["at"])
        top_pop = [i for i in pop if i not in bought][: args.k]
        # the website fills empty CF slots with best sellers
        top_cf += [i for i in top_pop if i not in top_cf][: args.k - len(top_cf)]
        hit_cf += bool(target & set(top_cf))
        hit_pop += bool(target & set(top_pop))
        d = discover(model, c, cf, sold, set(top_cf), args.k)
        if d:
            total = sum(sold.values()) or 1
            nov.append(sum(-math.log2(max(sold.get(i, 0), 1) / total) for i in d) / len(d))
            div.append(len({menus[i][1] for i in d}) / len(d))

    print(f"\nCustomers evaluated (>= {args.min_tx} earlier transactions, new item in the last one): {n}")
    if not n:
        print("Not enough data yet: collect more transactions from returning customers.")
        return
    print(f"HitRate@{args.k}  item-based CF : {hit_cf / n:.3f}")
    print(f"HitRate@{args.k}  best sellers  : {hit_pop / n:.3f}   (cold-start baseline)")
    if nov:
        print(f"'Coba yang baru': novelty {sum(nov) / len(nov):.2f} bits, category diversity {sum(div) / len(div):.2f}")


if __name__ == "__main__":
    main()
