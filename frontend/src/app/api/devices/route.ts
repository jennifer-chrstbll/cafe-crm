import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const OFFLINE_AFTER_SEC = 90; // devices send a heartbeat every 30 s

/** Heartbeats of the UNO Q (face recognition) and Raspberry Pi (person tracking). */
export const GET = route(async (req: NextRequest) => {
  await requireUser(req);
  const { data } = await db().from("device_status").select("device_id, kind, last_seen_at, info").order("kind");
  return json(
    (data ?? []).map((d) => {
      const age = (Date.now() - new Date(d.last_seen_at).getTime()) / 1000;
      return { ...d, online: age < OFFLINE_AFTER_SEC, seconds_ago: Math.round(age) };
    }),
  );
});
