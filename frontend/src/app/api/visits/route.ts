import { NextRequest } from "next/server";
import { db, GUEST_ID } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, route } from "@/lib/server/http";
import { jakartaDayStart } from "@/lib/server/time";
import { closeStaleVisits } from "@/lib/server/visits";

export const dynamic = "force-dynamic";

/** GET /api/visits?range=today|7d|30d&status=open|closed&offset=&limit= */
export const GET = route(async (req: NextRequest) => {
  await requireUser(req, ["OWNER"]);
  await closeStaleVisits();
  const p = req.nextUrl.searchParams;
  const range = p.get("range") ?? "today";
  const status = p.get("status");
  const limit = Math.min(parseInt(p.get("limit") ?? "25"), 200);
  const offset = Math.max(parseInt(p.get("offset") ?? "0"), 0);
  const days = range === "30d" ? 30 : range === "7d" ? 7 : 1;

  let q = db().from("visits")
    .select("visit_id, customer_id, entry_time, exit_time, duration_minutes, track_id_aktif, customers(name), camera_tracks(association_score, association_mode)",
            { count: "exact" })
    .neq("customer_id", GUEST_ID)
    .gte("entry_time", jakartaDayStart(new Date(), days - 1).toISOString())
    .order("entry_time", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status === "open") q = q.is("exit_time", null);
  if (status === "closed") q = q.not("exit_time", "is", null);
  const { data, count, error } = await q;
  if (error) throw new Error(error.message);

  return json({
    total: count ?? 0,
    items: (data ?? []).map((v: any) => {
      const t = (v.camera_tracks ?? [])[0];
      return {
        visit_id: v.visit_id, customer_id: v.customer_id, name: v.customers?.name ?? "Pelanggan",
        entry_time: v.entry_time, exit_time: v.exit_time, duration_minutes: v.duration_minutes,
        track_id: v.track_id_aktif, association_score: t?.association_score ?? null,
        association_mode: t?.association_mode ?? null,
      };
    }),
  });
});
