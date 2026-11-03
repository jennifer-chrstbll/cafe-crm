import { db, GUEST_ID } from "../db";
import { getSettings } from "./settings";
import { minutesBetween } from "./time";

/**
 * Visit lifecycle (one row = one stay in the cafe)
 *  - opened by the UNO Q when a customer is recognised, or by the first order
 *  - "active" = exit_time IS NULL and opened less than max_open_hours ago
 *  - closed when the bound person-tracking track ends (EXITED / not seen for
 *    exit_timeout_minutes), or after max_open_hours at the time of the last order
 */
export interface ActiveVisit {
  visit_id: string;
  entry_time: string;
  track_id_aktif: string | null;
}

export async function getActiveVisit(customerId: string): Promise<ActiveVisit | null> {
  if (customerId === GUEST_ID) return null; // every walk-in order is its own visit
  const s = await getSettings();
  const since = new Date(Date.now() - s.visits.max_open_hours * 3600_000).toISOString();
  const { data, error } = await db()
    .from("visits")
    .select("visit_id, entry_time, track_id_aktif")
    .eq("customer_id", customerId)
    .is("exit_time", null)
    .gte("entry_time", since)
    .order("entry_time", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

export async function getOrCreateActiveVisit(customerId: string): Promise<ActiveVisit> {
  const open = await getActiveVisit(customerId);
  if (open) return open;
  const { data, error } = await db()
    .from("visits")
    .insert({ customer_id: customerId, entry_time: new Date().toISOString() })
    .select("visit_id, entry_time, track_id_aktif")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function closeVisit(visitId: string, exitTime: string) {
  const { data } = await db().from("visits").select("entry_time").eq("visit_id", visitId).is("exit_time", null).single();
  if (!data) return false;
  const exit = new Date(Math.max(new Date(exitTime).getTime(), new Date(data.entry_time).getTime())).toISOString();
  await db()
    .from("visits")
    .update({ exit_time: exit, duration_minutes: minutesBetween(data.entry_time, exit) })
    .eq("visit_id", visitId)
    .is("exit_time", null);
  return true;
}

let lastRun = 0;

/** Closes visits whose person left. Cheap; throttled to once a minute per server instance. */
export async function closeStaleVisits(force = false): Promise<number> {
  if (!force && Date.now() - lastRun < 60_000) return 0;
  lastRun = Date.now();
  const s = await getSettings();
  const sb = db();
  let closed = 0;

  // 1) The tracked person left the cafe.
  const lostBefore = new Date(Date.now() - s.visits.exit_timeout_minutes * 60_000).toISOString();
  const { data: ended } = await sb
    .from("camera_tracks")
    .select("visit_id, last_seen_at, status, visits!inner(exit_time)")
    .not("visit_id", "is", null)
    .is("visits.exit_time", null)
    .or(`status.eq.EXITED,last_seen_at.lt.${lostBefore}`)
    .limit(200);
  for (const t of ended ?? []) {
    if (t.visit_id && (await closeVisit(t.visit_id, t.last_seen_at))) closed++;
  }

  // 2) Open far too long (no track bound, or the tracker was offline): close at the last order.
  const tooOld = new Date(Date.now() - s.visits.max_open_hours * 3600_000).toISOString();
  const { data: old } = await sb
    .from("visits")
    .select("visit_id, entry_time")
    .is("exit_time", null)
    .lt("entry_time", tooOld)
    .limit(200);
  for (const v of old ?? []) {
    const { data: last } = await sb
      .from("orders")
      .select("created_at")
      .eq("visit_id", v.visit_id)
      .order("created_at", { ascending: false })
      .limit(1);
    if (await closeVisit(v.visit_id, last?.[0]?.created_at ?? v.entry_time)) closed++;
  }
  return closed;
}
