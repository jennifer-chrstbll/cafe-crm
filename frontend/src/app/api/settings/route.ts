import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, body, json, route } from "@/lib/server/http";
import { AppSettings, getSettings, saveSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

export const GET = route(async (req: NextRequest) => {
  await requireUser(req);
  return json(await getSettings(true));
});

export const PUT = route(async (req: NextRequest) => {
  await requireUser(req, ["OWNER"]);
  const b = await body<Partial<AppSettings>>(req);
  if (b.network) {
    const { pi_face_mode: m, pi_face_url: u } = b.network;
    if (!["auto", "manual", "env"].includes(m)) throw new ApiError(422, "Mode alamat tidak valid.");
    if (m === "manual" && !/^https?:\/\/[A-Za-z0-9.\-]+(:\d{1,5})?(\/[A-Za-z0-9._\-/]*)?$/.test(u ?? "")) {
      throw new ApiError(422, "Alamat harus seperti http://192.168.1.20:8765/wajah");
    }
    b.network = { pi_face_mode: m, pi_face_url: m === "manual" ? u.trim() : "" };
  }
  if (b.tracking) {
    const g = Number(b.tracking.visit_gap_sec);
    if (!Number.isFinite(g) || g < 3 || g > 300) throw new ApiError(422, "Batas tak terlihat 3–300 detik.");
    b.tracking = { visit_gap_sec: Math.round(g) };
  }
  if (b.visits) {
    const { exit_timeout_minutes: e, max_open_hours: h } = b.visits;
    const r = b.visits.reopen_minutes ?? 30;
    if (!(e >= 1 && e <= 240) || !(h >= 1 && h <= 24)) throw new ApiError(422, "Batas kunjungan tidak valid.");
    if (!(r >= 1 && r <= 240)) throw new ApiError(422, "Batas kembali 1–240 menit.");
    b.visits = { exit_timeout_minutes: Math.round(e), max_open_hours: Math.round(h), reopen_minutes: Math.round(r) };
  }
  return json(await saveSettings(b));
});
