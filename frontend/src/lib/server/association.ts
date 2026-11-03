import { db } from "../db";
import { getSettings } from "./settings";
import { getOrCreateActiveVisit } from "./visits";

/**
 * Identity association: Customer ID (face, cashier) <-> Track ID (person tracking, area camera)
 *
 *   S = w_s * exp(-d^2 / 2 sigma_s^2)          spatial:   track distance to the cashier anchor point
 *     + w_k * exp(-v^2 / 2 sigma_k^2)          kinematic: someone paying is (almost) standing still
 *     + w_t * exp(-dt^2 / 2 sigma_t^2)         temporal:  track seen at the moment the face was recognised
 *
 * Candidates: tracks of the area camera inside the cashier ROI, seen within 30 s of
 * the face, not already bound to another customer. Bind when S >= theta AND the best
 * candidate beats the runner-up by >= MARGIN (otherwise a queue is ambiguous and the
 * cashier confirms manually).
 */
export const MARGIN = 0.1;
const CANDIDATE_WINDOW_SEC = 30;

export interface TrackRow {
  camera_track_id: string;
  raw_track_id: string;
  global_id: string | null;
  camera_id: string;
  pos_x: number | null;
  pos_y: number | null;
  velocity_x: number | null;
  velocity_y: number | null;
  status: string;
  last_seen_at: string;
  customer_id: string | null;
}

export interface ScoredCandidate {
  track: TrackRow;
  spatial: number;
  kinematic: number;
  temporal: number;
  score: number;
}

export interface AssociationResult {
  status: "MATCHED" | "AMBIGUOUS" | "LOW_SCORE" | "NO_CANDIDATES" | "ALREADY_BOUND";
  customer_id: string;
  visit_id?: string;
  track_id?: string;
  score?: number;
  candidates: Array<Omit<ScoredCandidate, "track"> & { track_id: string; pos_x: number | null; pos_y: number | null }>;
}

const gauss = (x: number, sigma: number) => Math.exp(-(x * x) / (2 * sigma * sigma));

export async function scoreCandidates(faceTime: Date, customerId?: string): Promise<ScoredCandidate[]> {
  const s = await getSettings();
  const a = s.association;
  const since = new Date(faceTime.getTime() - CANDIDATE_WINDOW_SEC * 1000).toISOString();
  const { data, error } = await db()
    .from("camera_tracks")
    .select("camera_track_id, raw_track_id, global_id, camera_id, pos_x, pos_y, velocity_x, velocity_y, status, last_seen_at, customer_id")
    .eq("camera_id", s.devices.area_camera_id)
    .in("status", ["ACTIVE", "LOST"])
    .gte("last_seen_at", since)
    .order("last_seen_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);

  const inRoi = (t: TrackRow) =>
    t.pos_x != null && t.pos_y != null &&
    t.pos_x >= a.roi.x1 && t.pos_x <= a.roi.x2 && t.pos_y >= a.roi.y1 && t.pos_y <= a.roi.y2;

  return (data ?? [])
    .filter((t) => inRoi(t) && (!t.customer_id || t.customer_id === customerId))
    .map((t) => {
      const d = Math.hypot((t.pos_x ?? 0) - a.anchor.x, (t.pos_y ?? 0) - a.anchor.y);
      const v = Math.hypot(t.velocity_x ?? 0, t.velocity_y ?? 0);
      const dt = Math.abs(faceTime.getTime() - new Date(t.last_seen_at).getTime()) / 1000;
      const spatial = gauss(d, a.sigma.spatial);
      const kinematic = gauss(v, a.sigma.kinematic);
      const temporal = gauss(dt, a.sigma.temporal);
      const score = a.weights.spatial * spatial + a.weights.kinematic * kinematic + a.weights.temporal * temporal;
      return { track: t, spatial, kinematic, temporal, score };
    })
    .sort((x, y) => y.score - x.score);
}

export async function bindTrack(customerId: string, trackId: string, score: number | null, mode: "AUTO" | "MANUAL") {
  const s = await getSettings();
  const visit = await getOrCreateActiveVisit(customerId);
  const sb = db();
  const { error } = await sb
    .from("camera_tracks")
    .update({ customer_id: customerId, visit_id: visit.visit_id, association_score: score,
              associated_at: new Date().toISOString(), association_mode: mode })
    .eq("camera_id", s.devices.area_camera_id)
    .eq("raw_track_id", trackId);
  if (error) throw new Error(error.message);
  await sb.from("visits").update({ track_id_aktif: trackId }).eq("visit_id", visit.visit_id);
  return visit.visit_id;
}

export async function associate(customerId: string, faceTime = new Date()): Promise<AssociationResult> {
  const s = await getSettings();
  const scored = await scoreCandidates(faceTime, customerId);
  const view = scored.slice(0, 5).map(({ track, ...r }) => ({
    ...r, track_id: track.raw_track_id, pos_x: track.pos_x, pos_y: track.pos_y }));
  if (!scored.length) return { status: "NO_CANDIDATES", customer_id: customerId, candidates: [] };

  const [best, second] = scored;
  if (best.track.customer_id === customerId) {
    return { status: "ALREADY_BOUND", customer_id: customerId, track_id: best.track.raw_track_id,
             score: best.score, candidates: view };
  }
  if (best.score < s.association.theta) {
    return { status: "LOW_SCORE", customer_id: customerId, score: best.score, candidates: view };
  }
  if (second && best.score - second.score < MARGIN) {
    return { status: "AMBIGUOUS", customer_id: customerId, score: best.score, candidates: view };
  }
  const visitId = await bindTrack(customerId, best.track.raw_track_id, best.score, "AUTO");
  return { status: "MATCHED", customer_id: customerId, visit_id: visitId,
           track_id: best.track.raw_track_id, score: best.score, candidates: view };
}
