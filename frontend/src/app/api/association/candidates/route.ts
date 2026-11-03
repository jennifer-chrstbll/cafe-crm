import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { json, route } from "@/lib/server/http";
import { scoreCandidates } from "@/lib/server/association";
import { getSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

/** People currently standing in the cashier zone, with their association score (manual confirmation). */
export const GET = route(async (req: NextRequest) => {
  await requireUser(req);
  const customerId = req.nextUrl.searchParams.get("customer_id") ?? undefined;
  const s = await getSettings();
  const scored = await scoreCandidates(new Date(), customerId);
  return json({
    theta: s.association.theta,
    candidates: scored.map((c) => ({
      track_id: c.track.raw_track_id, pos_x: c.track.pos_x, pos_y: c.track.pos_y,
      last_seen_at: c.track.last_seen_at, bound_to: c.track.customer_id,
      score: c.score, spatial: c.spatial, kinematic: c.kinematic, temporal: c.temporal,
    })),
  });
});
