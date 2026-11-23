import { db, fetchAll, GUEST_ID, num } from "../db";

/**
 * Item-based collaborative filtering (Sarwar et al. 2001; Deshpande & Karypis 2004).
 * Proposal: top-3 when the customer has >= 3 transactions, otherwise best sellers
 * (popularity is the standard cold-start fallback and a strong top-N baseline,
 * Cremonesi, Koren & Turrin 2010).
 *
 *   r(u,i)    = log(1 + qty of item i bought by customer u)        implicit feedback, log-damped
 *                                                                  (Hu, Koren & Volinsky 2008)
 *   sim(i,j)  = cos(r(.,i), r(.,j))                                item-item cosine
 *   score(c)  = sum_h sim(c,h) * r(u,h) / sum_h r(u,h)             h = items u bought
 *
 * Candidates are items u has not bought yet; each comes with the item that
 * contributed most, so the cashier sees *why* ("sering dibeli bersama X").
 *
 * "Coba yang baru" for loyal customers (>= 5 visits): regulars who always order the same
 * thing are offered variety (variety-seeking, McAlister & Pessemier 1982) through a
 * novelty-aware re-ranking (Vargas & Castells 2011) with category diversification (MMR,
 * Carbonell & Goldstein 1998; topic diversification, Ziegler et al. 2005):
 *
 *   nov(i)    = 1 - log(1 + sold30(i)) / log(1 + max sold30)       less popular = more novel
 *   base(i)   = (1 - THETA) * cf(i)/max cf + THETA * nov(i)
 *   next pick = argmax  LAMBDA * base(i) - (1 - LAMBDA) * max_{j in picked U favourites} sim'(i,j)
 *   sim'(i,j) = 1 if same category, else cos(i,j)
 */
export const MIN_TRANSACTIONS_FOR_CF = 3;

export interface Recommendation {
  menu_id: string;
  name: string;
  category: string;
  price: number;
  score: number;
  reason: string;
}
export interface Favorite {
  menu_id: string;
  name: string;
  qty: number;
}
export interface RecommendationResult {
  strategy: "COLLABORATIVE_FILTERING" | "COLD_START_POPULARITY";
  transaction_count: number;
  recommendations: Recommendation[];
  favorites: Favorite[];
  /** Loyal customers only: novel, diverse items they have never ordered. */
  discover: Recommendation[];
}

export const LOYAL_MIN_VISITS = 5;     // = "Regular" segment (getSegment)
const THETA = 0.4;                     // weight of novelty vs. CF relevance
const LAMBDA = 0.7;                    // MMR: relevance vs. diversity

type MenuRow = { menu_id: string; name: string; category: string; price: number };
interface Model {
  at: number;
  sig: string; // number of orders + newest order time when the model was built
  items: Map<string, Map<string, number>>; // item -> customer -> weight
  norms: Map<string, number>;
  byCustomer: Map<string, Map<string, number>>; // customer -> item -> qty
  popular: string[]; // menu ids by qty sold, last 30 days
  sold: Map<string, number>; // qty sold per menu id, last 30 days
  menus: Map<string, MenuRow>;
}

let model: Model | null = null;

/**
 * Orders "fingerprint" (count + newest time). On Vercel every warm server instance has its own copy
 * of the model, and an order invalidates only the copy of the instance that saved it. Comparing this
 * tiny one-row query first means every instance rebuilds as soon as any order was added or removed,
 * so the cashier always sees recommendations computed from ALL orders so far (deterministic: the
 * same history always gives the same list).
 */
async function ordersSignature(): Promise<string> {
  const { data, count } = await db().from("orders").select("created_at", { count: "exact" })
    .order("created_at", { ascending: false }).limit(1);
  return `${count ?? 0}:${data?.[0]?.created_at ?? ""}`;
}

async function buildModel(): Promise<Model> {
  const sig = await ordersSignature();
  if (model && model.sig === sig && Date.now() - model.at < 5 * 60_000) return model;
  const sb = db();
  const since180 = new Date(Date.now() - 180 * 86_400_000).toISOString();
  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [menuRows, orders, recent] = await Promise.all([
    // Ordered by name: equal scores / equal sales are then always listed alphabetically.
    sb.from("menu").select("menu_id, name, category, price").eq("is_active", true).order("name"),
    fetchAll<{ menu_id: string; qty: number; visits: { customer_id: string } }>((a, b) =>
      sb.from("orders").select("menu_id, qty, visits!inner(customer_id)")
        .neq("visits.customer_id", GUEST_ID).gte("created_at", since180).range(a, b) as never),
    fetchAll<{ menu_id: string; qty: number }>((a, b) =>
      sb.from("orders").select("menu_id, qty").gte("created_at", since30).range(a, b) as never),
  ]);

  const menus = new Map<string, MenuRow>();
  for (const m of menuRows.data ?? []) menus.set(m.menu_id, { ...m, price: num(m.price) });

  const byCustomer = new Map<string, Map<string, number>>();
  for (const o of orders) {
    const c = o.visits.customer_id;
    if (!byCustomer.has(c)) byCustomer.set(c, new Map());
    const row = byCustomer.get(c)!;
    row.set(o.menu_id, (row.get(o.menu_id) ?? 0) + o.qty);
  }
  const items = new Map<string, Map<string, number>>();
  for (const [c, row] of byCustomer) {
    for (const [i, q] of row) {
      if (!items.has(i)) items.set(i, new Map());
      items.get(i)!.set(c, Math.log1p(q));
    }
  }
  const norms = new Map<string, number>();
  for (const [i, v] of items) norms.set(i, Math.sqrt([...v.values()].reduce((s, x) => s + x * x, 0)));

  const sold = new Map<string, number>();
  for (const o of recent.length ? recent : orders) sold.set(o.menu_id, (sold.get(o.menu_id) ?? 0) + o.qty);
  const popular = [...menus.keys()].sort((a, b) => (sold.get(b) ?? 0) - (sold.get(a) ?? 0));

  model = { at: Date.now(), sig, items, norms, byCustomer, popular, sold, menus };
  return model;
}

function cosine(m: Model, a: string, b: string): number {
  const va = m.items.get(a), vb = m.items.get(b);
  if (!va || !vb) return 0;
  const [small, big] = va.size < vb.size ? [va, vb] : [vb, va];
  let dot = 0;
  for (const [c, x] of small) {
    const y = big.get(c);
    if (y) dot += x * y;
  }
  const d = (m.norms.get(a) ?? 0) * (m.norms.get(b) ?? 0);
  return d > 0 ? dot / d : 0;
}

function discoverFor(m: Model, history: Map<string, number>, cf: Map<string, number>, exclude: Set<string>,
                     n: number): Recommendation[] {
  const maxSold = Math.max(1, ...m.sold.values());
  const maxCf = Math.max(0, ...cf.values());
  const cands = [...m.menus.keys()].filter((id) => !history.has(id) && !exclude.has(id));
  const base = new Map<string, number>();
  for (const id of cands) {
    const nov = 1 - Math.log1p(m.sold.get(id) ?? 0) / Math.log1p(maxSold);
    const rel = maxCf > 0 ? (cf.get(id) ?? 0) / maxCf : 0;
    base.set(id, (1 - THETA) * rel + THETA * nov);
  }
  const sim = (a: string, b: string) =>
    m.menus.get(a)?.category === m.menus.get(b)?.category ? 1 : cosine(m, a, b);
  const anchor = [...history.keys()].filter((id) => m.menus.has(id));
  const out: Recommendation[] = [];
  const left = new Set(cands);
  while (out.length < n && left.size) {
    let best = "", bestV = -Infinity;
    for (const id of left) {
      const others = [...anchor, ...out.map((o) => o.menu_id)];
      const red = others.length ? Math.max(...others.map((o) => sim(id, o))) : 0;
      const v = LAMBDA * (base.get(id) ?? 0) - (1 - LAMBDA) * red;
      if (v > bestV) { bestV = v; best = id; }
    }
    left.delete(best);
    const menu = m.menus.get(best)!;
    const newCat = !anchor.some((a) => m.menus.get(a)?.category === menu.category);
    out.push({ ...menu, score: +(base.get(best) ?? 0).toFixed(3),
      reason: newCat ? "Belum pernah dicoba · kategori baru" : "Belum pernah dicoba" });
  }
  return out;
}

export async function recommendFor(customerId: string | null, topN = 3, loyal = false): Promise<RecommendationResult> {
  const m = await buildModel();
  let txCount = 0;
  if (customerId && customerId !== GUEST_ID) {
    const { count } = await db()
      .from("transactions")
      .select("transaction_id, visits!inner(customer_id)", { count: "exact", head: true })
      .eq("visits.customer_id", customerId);
    txCount = count ?? 0;
  }
  // Menu-name order, so equal contributions/quantities always resolve the same way (orders come
  // back from the database in no particular order).
  const nameOf = (id: string) => m.menus.get(id)?.name ?? id;
  const history = new Map<string, number>(
    [...((customerId && m.byCustomer.get(customerId)) || new Map<string, number>()).entries()]
      .sort((a, b) => (nameOf(a[0]) < nameOf(b[0]) ? -1 : nameOf(a[0]) > nameOf(b[0]) ? 1 : 0)));
  const favorites: Favorite[] = [...history.entries()]
    .filter(([id]) => m.menus.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, qty]) => ({ menu_id: id, name: m.menus.get(id)!.name, qty }));

  const picked: Recommendation[] = [];
  const cfScore = new Map<string, number>();
  const useCF = txCount >= MIN_TRANSACTIONS_FOR_CF && history.size > 0;
  if (useCF) {
    const wSum = [...history.values()].reduce((s, q) => s + Math.log1p(q), 0);
    const scored: Recommendation[] = [];
    for (const [id, menu] of m.menus) {
      if (history.has(id)) continue;
      let s = 0, bestH = "", bestC = 0;
      for (const [h, q] of history) {
        const c = cosine(m, id, h) * Math.log1p(q);
        s += c;
        if (c > bestC) { bestC = c; bestH = h; }
      }
      if (s > 0) {
        cfScore.set(id, s / wSum);
        const because = m.menus.get(bestH)?.name;
        scored.push({ ...menu, score: +(s / wSum).toFixed(3),
          reason: because ? `Sering dibeli bersama ${because}` : "Cocok dengan riwayat pesanan" });
      }
    }
    picked.push(...scored.sort((a, b) => b.score - a.score).slice(0, topN));
  }
  // Cold start, or fill the remaining slots with best sellers.
  for (const id of m.popular) {
    if (picked.length >= topN) break;
    if (history.has(id) || picked.some((p) => p.menu_id === id)) continue;
    picked.push({ ...m.menus.get(id)!, score: 0, reason: "Terlaris 30 hari terakhir" });
  }
  const discover = loyal && history.size > 0
    ? discoverFor(m, history, cfScore, new Set(picked.map((p) => p.menu_id)), topN) : [];
  return {
    strategy: useCF ? "COLLABORATIVE_FILTERING" : "COLD_START_POPULARITY",
    transaction_count: txCount,
    recommendations: picked,
    favorites,
    discover,
  };
}

/** New orders: rebuild on the next request (other instances notice through ordersSignature). */
export function invalidateRecommendations() {
  if (model) model.at = 0;
}
