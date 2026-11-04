import { db, GUEST_ID } from "../db";
import { getSettings } from "./settings";
import { minutesBetween } from "./time";

/**
 * Visit lifecycle (one row = one stay in the cafe)
 *  - opened by the UNO Q when a customer is recognised, by the Raspberry Pi when the
 *    customer is bound to a body, or by the first order -- all three use the same
 *    database function get_or_create_visit() (migration 005), so they never create two
 *  - "active" = exit_time IS NULL and opened less than max_open_hours ago
 *  - closed by the Raspberry Pi when the person leaves (door area or lost), or here as a
 *    fallback when the tracker went quiet (exit_timeout_minutes) or after max_open_hours
 */
export interface ActiveVisit {
  visit_id: string;
  entry_time: string;
  track_id_aktif: string | null;
}

const VISIT_REOPEN_MIN = 30;   // same as VISIT_REOPEN_MIN on the devices

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
  const s = await getSettings();
  const sb = db();
  if (customerId !== GUEST_ID) {
    const { data: vid, error } = await sb.rpc("get_or_create_visit", {
      p_customer: customerId, p_max_open_hours: s.visits.max_open_hours, p_reopen_minutes: VISIT_REOPEN_MIN,
    });
    if (!error && vid) {
      const { data, error: e2 } = await sb.from("visits").select("visit_id, entry_time, track_id_aktif")
        .eq("visit_id", vid as string).single();
      if (e2) throw new Error(e2.message);
      return data;
    }
    // Migration 005 not applied yet: fall back to the plain rule below.
    const open = await getActiveVisit(customerId);
    if (open) return open;
  }
  const { data, error } = await sb
    .from("visits")
    .insert({ customer_id: customerId, entry_time: new Date().toISOString() })
    .select("visit_id, entry_time, track_id_aktif")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function closeVisit(visitId: string, exitTime: string, reason = "TIMEOUT") {
  const sb = db();
  const { data: ok, error } = await sb.rpc("close_visit", { p_visit: visitId, p_exit: exitTime, p_reason: reason });
  if (!error) return ok === true;
  const { data } = await sb.from("visits").select("entry_time").eq("visit_id", visitId).is("exit_time", null).single();
  if (!data) return false;
  const exit = new Date(Math.max(new Date(exitTime).getTime(), new Date(data.entry_time).getTime())).toISOString();
  await sb
    .from("visits")
    .update({ exit_time: exit, duration_minutes: minutesBetween(data.entry_time, exit) })
    .eq("visit_id", visitId)
    .is("exit_time", null);
  return true;
}

let lastRun = 0;

/** Fallback closing of visits whose person left. Throttled to once a minute per server instance. */
export async function closeStaleVisits(force = false): Promise<number> {
  if (!force && Date.now() - lastRun < 60_000) return 0;
  lastRun = Date.now();
  const s = await getSettings();
  const sb = db();
  let closed = 0;

  // 1) The tracked person left: judge each open visit by its NEWEST track only. A visit
  //    collects several tracks (ID splits, camera changes, Pi restarts); an old track that
  //    stopped long ago must not close a visit whose person is still being tracked.
  const lostBefore = Date.now() - s.visits.exit_timeout_minutes * 60_000;
  const { data: tracks } = await sb
    .from("camera_tracks")
    .select("visit_id, last_seen_at, status, visits!inner(exit_time)")
    .not("visit_id", "is", null)
    .is("visits.exit_time", null)
    .order("last_seen_at", { ascending: false })
    .limit(1000);
  const newest = new Map<string, { last_seen_at: string; status: string }>();
  for (const t of tracks ?? []) {
    if (t.visit_id && !newest.has(t.visit_id)) newest.set(t.visit_id, { last_seen_at: t.last_seen_at, status: t.status });
  }
  for (const [visitId, t] of newest) {
    const gone = new Date(t.last_seen_at).getTime() < lostBefore;
    if ((t.status === "EXITED" || gone) && (await closeVisit(visitId, t.last_seen_at, t.status === "EXITED" ? "EXIT_ZONE" : "TIMEOUT"))) {
      closed++;
    }
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
    if (await closeVisit(v.visit_id, last?.[0]?.created_at ?? v.entry_time, "TIMEOUT")) closed++;
  }
  return closed;
}
