import { db, getSegment, GUEST_ID, num } from "../db";
import { recommendFor, RecommendationResult } from "./recommendation";
import { getActiveVisit } from "./visits";

export interface TabItem {
  order_id: string;
  menu_id: string;
  menu_name: string;
  qty: number;
  subtotal: number;
  created_at: string;
}
export interface OpenTab {
  transaction_id: string;
  visit_id: string;
  total_amount: number;
  created_at: string;
  items: TabItem[];
}

export async function tabItems(transactionId: string): Promise<TabItem[]> {
  const { data, error } = await db()
    .from("orders")
    .select("order_id, menu_id, qty, subtotal, created_at, menu(name)")
    .eq("transaction_id", transactionId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((o: any) => ({
    order_id: o.order_id, menu_id: o.menu_id, menu_name: o.menu?.name ?? "Item",
    qty: o.qty, subtotal: num(o.subtotal), created_at: o.created_at,
  }));
}

/** The customer's unpaid tab (any of their visits), if any. */
export async function openTabFor(customerId: string): Promise<OpenTab | null> {
  if (customerId === GUEST_ID) return null;
  const { data, error } = await db()
    .from("transactions")
    .select("transaction_id, visit_id, total_amount, created_at, visits!inner(customer_id)")
    .eq("status", "UNPAID")
    .eq("visits.customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const tx = data?.[0];
  if (!tx) return null;
  const items = await tabItems(tx.transaction_id);
  return { transaction_id: tx.transaction_id, visit_id: tx.visit_id, created_at: tx.created_at,
           total_amount: items.reduce((s, i) => s + i.subtotal, 0), items };
}

export interface CustomerContext {
  customer_id: string;
  name: string;
  phone_number: string | null;
  notes: string | null;
  member_since: string;
  visit_count: number;
  segment: string;
  last_visit: string | null;
  has_face: boolean;
  consent_given: boolean;
  active_visit: { visit_id: string; entry_time: string; track_id: string | null } | null;
  open_tab: OpenTab | null;
  recommendation: RecommendationResult;
}

export async function customerContext(customerId: string): Promise<CustomerContext | null> {
  const sb = db();
  const { data: c } = await sb
    .from("customers")
    .select("customer_id, name, phone_number, notes, created_at, consent_given, is_active")
    .eq("customer_id", customerId)
    .maybeSingle();
  if (!c) return null;

  const [visits, last, faces, active, tab, rec] = await Promise.all([
    sb.from("visits").select("visit_id", { count: "exact", head: true }).eq("customer_id", customerId),
    sb.from("visits").select("entry_time").eq("customer_id", customerId).order("entry_time", { ascending: false }).limit(1),
    sb.from("embeddings").select("embedding_id", { count: "exact", head: true }).eq("customer_id", customerId),
    getActiveVisit(customerId),
    openTabFor(customerId),
    recommendFor(customerId, 3),
  ]);
  const vc = visits.count ?? 0;
  return {
    customer_id: c.customer_id, name: c.name, phone_number: c.phone_number, notes: c.notes,
    member_since: c.created_at, visit_count: vc, segment: getSegment(vc),
    last_visit: last.data?.[0]?.entry_time ?? null, has_face: (faces.count ?? 0) > 0,
    consent_given: !!c.consent_given,
    active_visit: active ? { visit_id: active.visit_id, entry_time: active.entry_time, track_id: active.track_id_aktif } : null,
    open_tab: tab, recommendation: rec,
  };
}
