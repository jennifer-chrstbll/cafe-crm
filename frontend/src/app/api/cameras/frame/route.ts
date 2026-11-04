import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { route } from "@/lib/server/http";
import { parseCameraKey } from "@/lib/server/devices";

export const dynamic = "force-dynamic";

/** How long a device keeps sending frames after the last request (the page asks every second). */
const WATCH_SEC = 20;

/**
 * Newest picture of one camera (?key=pi-001/CAM_1). The cloud website cannot open the
 * cameras on the cafe LAN directly, so the page "asks" for frames: this marks the camera
 * as watched, and the device uploads about one JPEG per second until nobody asks any more.
 * Frames are overwritten, never stored as a recording.
 */
export const GET = route(async (req: NextRequest) => {
  await requireUser(req);
  const { device_id, camera } = parseCameraKey(req.nextUrl.searchParams.get("key"));
  const key = `${device_id}/${camera}`;
  const sb = db();
  const until = new Date(Date.now() + WATCH_SEC * 1000).toISOString();
  const { error: e1 } = await sb.from("device_frames")
    .upsert({ camera_key: key, device_id, camera, wanted_until: until }, { onConflict: "camera_key" });
  if (e1) throw new Error(e1.message);
  const { data, error } = await sb.from("device_frames")
    .select("jpeg_b64, width, height, overlay, captured_at").eq("camera_key", key).maybeSingle();
  if (error) throw new Error(error.message);
  const age = data?.captured_at ? (Date.now() - new Date(data.captured_at).getTime()) / 1000 : null;
  return NextResponse.json({
    key,
    image: data?.jpeg_b64 && age !== null && age < 30 ? `data:image/jpeg;base64,${data.jpeg_b64}` : null,
    width: data?.width ?? null,
    height: data?.height ?? null,
    overlay: data?.overlay ?? {},
    captured_at: data?.captured_at ?? null,
    age_sec: age === null ? null : Math.round(age * 10) / 10,
  }, { headers: { "Cache-Control": "no-store" } });
});
