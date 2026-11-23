/**
 * The 5 rounds of the lab test (SKENARIO_PENGUJIAN, Putaran 1-5) run through the REAL recommender
 * (lib/server/recommendation.ts) against an in-memory database. The expected lists in
 * fixtures/rekomendasi_uji.json were computed independently (Python port of the formulas, the
 * numbers printed in the test guide). Passing = what the cashier panel shows on the test day is
 * exactly what the guide says, given the same orders.
 *
 * Rows are returned from the fake database in a scrambled order on purpose: ties must not depend
 * on the order the database happens to return rows in.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "./fixtures/rekomendasi_uji.json";

const GUEST = "00000000-0000-0000-0000-000000000001";
const MENU: [string, string, number][] = [
  ["Americano", "COFFEE", 25000], ["Cafe Latte", "COFFEE", 32000], ["Cappuccino", "COFFEE", 32000],
  ["Mocha", "COFFEE", 35000], ["Matcha Latte", "NON_COFFEE", 35000], ["Chocolate", "NON_COFFEE", 30000],
  ["Croissant", "FOOD", 28000], ["Chicken Sandwich", "FOOD", 42000], ["Cheesecake", "DESSERT", 38000],
  ["Tiramisu", "DESSERT", 40000],
];
const id = (name: string) => `menu-${name.toLowerCase().replace(/ /g, "-")}`;

type Order = { customer: string; menu: string; qty: number; at: string };
const state = { orders: [] as Order[], tx: new Map<string, number>(), clock: Date.now() - 3_600_000 };

function scramble<T>(xs: T[]): T[] {
  return xs.map((x, i) => [((i * 7919) % 13) + i / 1000, x] as const).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
}

function query(table: string) {
  const q = { table, cols: "", opts: {} as Record<string, unknown>, filters: [] as [string, string, unknown][],
    orderBy: "" as string, asc: true, lim: Infinity, from: 0, to: Infinity };
  const api = {
    select(cols: string, opts?: Record<string, unknown>) { q.cols = cols; q.opts = opts ?? {}; return api; },
    eq(k: string, v: unknown) { q.filters.push(["eq", k, v]); return api; },
    neq(k: string, v: unknown) { q.filters.push(["neq", k, v]); return api; },
    gte(k: string, v: unknown) { q.filters.push(["gte", k, v]); return api; },
    order(k: string, o?: { ascending?: boolean }) { q.orderBy = k; q.asc = o?.ascending ?? true; return api; },
    limit(n: number) { q.lim = n; return api; },
    range(a: number, b: number) { q.from = a; q.to = b; return api; },
    then(res: (v: unknown) => void, rej?: (e: unknown) => void) {
      try { res(run()); } catch (e) { rej?.(e); }
    },
  };
  function run() {
    if (q.table === "menu") {
      let rows = scramble(MENU.map(([name, category, price]) => ({ menu_id: id(name), name, category, price })));
      if (q.orderBy === "name") rows = [...rows].sort((a, b) => (a.name < b.name ? -1 : 1));
      return { data: rows, error: null };
    }
    if (q.table === "orders" && q.opts.count) {
      const last = [...state.orders].sort((a, b) => (a.at < b.at ? 1 : -1))[0];
      return { data: last ? [{ created_at: last.at }] : [], count: state.orders.length, error: null };
    }
    if (q.table === "orders") {
      const registered = q.filters.some(([op, k, v]) => op === "neq" && k === "visits.customer_id" && v === GUEST);
      const rows = scramble(state.orders.filter((o) => !registered || o.customer !== GUEST))
        .map((o) => ({ menu_id: id(o.menu), qty: o.qty, visits: { customer_id: o.customer } }));
      return { data: rows.slice(q.from, q.to + 1), error: null };
    }
    if (q.table === "transactions") {
      const c = q.filters.find(([op, k]) => op === "eq" && k === "visits.customer_id")?.[2] as string;
      return { count: state.tx.get(c) ?? 0, data: null, error: null };
    }
    throw new Error(`unexpected table ${q.table}`);
  }
  return api;
}

vi.mock("@/lib/supabase", () => ({ createAdminClient: () => ({ from: (t: string) => query(t) }) }));

type Step = {
  round: number; who: string; customer: string; tx?: number; loyal?: boolean; strategy?: string;
  favorites?: [string, number][]; rec?: [string, number, string][]; discover?: [string, number, string][];
  order: [string, number][];
};

describe("rekomendasi pada skenario uji (Putaran 1-5)", () => {
  beforeEach(() => { state.orders = []; state.tx = new Map(); });

  it("panel Kasir menampilkan persis daftar di panduan uji", async () => {
    const { recommendFor } = await import("@/lib/server/recommendation");
    for (const s of (fixture as { steps: Step[] }).steps) {
      const cust = s.customer === "GUEST" ? GUEST : s.customer;
      if (s.rec) {
        const r = await recommendFor(cust, 3, !!s.loyal);
        const where = `Putaran ${s.round} ${s.who}`;
        expect(r.transaction_count, where).toBe(s.tx);
        expect(r.strategy, where).toBe(s.strategy);
        expect(r.recommendations.map((x) => [x.name, x.score, x.reason]), where).toEqual(s.rec);
        expect(r.discover.map((x) => x.name), where).toEqual(s.discover!.map((x) => x[0]));
        expect(r.discover.map((x) => x.reason), where).toEqual(s.discover!.map((x) => x[2]));
        expect(r.favorites.map((f) => [f.name, f.qty]), where).toEqual(s.favorites);
      }
      for (const [menu, qty] of s.order) {
        state.clock += 1000;
        state.orders.push({ customer: cust, menu, qty, at: new Date(state.clock).toISOString() });
      }
      state.tx.set(cust, (state.tx.get(cust) ?? 0) + 1);
    }
  });
});
