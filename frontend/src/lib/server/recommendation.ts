import { db, fetchAll, GUEST_ID, num } from "../db";

/**
 * Item-based collaborative filtering (proposal: top-3 when the customer has >= 3
 * transactions, otherwise best sellers = cold start).
 *
 *   r(u,i)    = log(1 + qty of item i bought by customer u)        implicit feedback
 *   sim(i,j)  = cos(r(.,i), r(.,j))                                item-item cosine
 *   score(c)  = sum_h sim(c,h) * r(u,h) / sum_h r(u,h)             h = items u bought
 *
 * Candidates are items u has not bought yet; each comes with the item that
 * contributed most, so the cashier sees *why* ("sering dibeli bersama X").
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
}

type MenuRow = { menu_id: string; name: string; category: string; price: number };
interface Model {
  at: number;
  items: Map<string, Map<string, number>>; // item -> customer -> weight
  norms: Map<string, number>;
  byCustomer: Map<string, Map<string, number>>; // customer -> item -> qty
  popular: string[]; // menu ids by qty sold, last 30 days
  menus: Map<string, MenuRow>;
}

let model: Model | null = null;

async function buildModel(): Promise<Model> {
  if (model && Date.now() - model.at < 5 * 60_000) return model;
  const sb = db();
  const since180 = new Date(Date.now() - 180 * 86_400_000).toISOString();
  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [menuRows, orders, recent] = await Promise.all([
    sb.from("menu").select("menu_id, name, category, price").eq("is_active", true),
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

  model = { at: Date.now(), items, norms, byCustomer, popular, menus };
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

export async function recommendFor(customerId: string | null, topN = 3): Promise<RecommendationResult> {
  const m = await buildModel();
  let txCount = 0;
  if (customerId && customerId !== GUEST_ID) {
    const { count } = await db()
      .from("transactions")
      .select("transaction_id, visits!inner(customer_id)", { count: "exact", head: true })
      .eq("visits.customer_id", customerId);
    txCount = count ?? 0;
  }
  const history = (customerId && m.byCustomer.get(customerId)) || new Map<string, number>();
  const favorites: Favorite[] = [...history.entries()]
    .filter(([id]) => m.menus.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, qty]) => ({ menu_id: id, name: m.menus.get(id)!.name, qty }));

  const picked: Recommendation[] = [];
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
  return {
    strategy: useCF ? "COLLABORATIVE_FILTERING" : "COLD_START_POPULARITY",
    transaction_count: txCount,
    recommendations: picked,
    favorites,
  };
}

export function invalidateRecommendations() {
  model = null;
}
