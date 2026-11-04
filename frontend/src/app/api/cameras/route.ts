import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, body, json, route } from "@/lib/server/http";
import { camerasOf, listDevices } from "@/lib/server/devices";
import { LayoutMap, SourcesMap, validateLayout, validateSource } from "@/lib/server/layout";

export const dynamic = "force-dynamic";

async function readKey<T>(key: string, fallback: T): Promise<T> {
  const { data, error } = await db().from("app_settings").select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(error.message);
  return ((data?.value as T) ?? fallback);
}

async function writeKey(key: string, value: unknown) {
  const { error } = await db().from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

/** Cameras the devices report + which webcam has which role + the drawn layout. */
export const GET = route(async (req: NextRequest) => {
  await requireUser(req);
  const [devices, sources, layout] = await Promise.all([
    listDevices(), readKey<SourcesMap>("camera_sources", {}), readKey<LayoutMap>("camera_layout", {}),
  ]);
  return json({ cameras: camerasOf(devices), sources, layout });
});

/**
 * Owner only.
 *   { device_id, role, source: {source, floor, enabled} | null }   choose a webcam for a role
 *   { camera_id, layout: {...} }                                    save the layout of one area camera
 */
export const PUT = route(async (req: NextRequest) => {
  await requireUser(req, ["OWNER"]);
  const b = await body<{ device_id?: string; role?: string; source?: unknown; camera_id?: string; layout?: unknown }>(req);
  if (b.layout !== undefined) {
    const lay = validateLayout(b.camera_id, b.layout);
    const all = await readKey<LayoutMap>("camera_layout", {});
    all[b.camera_id as string] = lay;
    await writeKey("camera_layout", all);
    return json({ layout: all });
  }
  if (b.role !== undefined) {
    const src = validateSource(b.device_id, b.role, b.source);
    const all = await readKey<SourcesMap>("camera_sources", {});
    const dev = { ...(all[b.device_id as string] ?? {}) };
    if (src) dev[b.role as string] = src;
    else delete dev[b.role as string];
    // The same webcam cannot have two roles on one device.
    if (src) {
      for (const [r, s] of Object.entries(dev)) {
        if (r !== b.role && s.source === src.source) throw new ApiError(409, `Kamera itu sudah dipakai sebagai ${r}.`);
      }
    }
    all[b.device_id as string] = dev;
    await writeKey("camera_sources", all);
    return json({ sources: all });
  }
  throw new ApiError(400, "Tidak ada yang disimpan.");
});
