import { db } from "../db";

export interface AppSettings {
  cafe: { name: string; floors: { floor: number; capacity: number }[] };
  devices: { cashier_camera_id: string; area_camera_id: string; stream_url: string };
  association: {
    roi: { x1: number; y1: number; x2: number; y2: number };
    anchor: { x: number; y: number };
    theta: number;
    weights: { spatial: number; kinematic: number; temporal: number };
    sigma: { spatial: number; kinematic: number; temporal: number };
  };
  visits: { exit_timeout_minutes: number; max_open_hours: number };
  privacy: { retention_days: number };
}

export const DEFAULT_SETTINGS: AppSettings = {
  cafe: { name: "Café Lounge Gedung B", floors: [{ floor: 1, capacity: 20 }, { floor: 2, capacity: 25 }] },
  devices: { cashier_camera_id: "uno-q-001", area_camera_id: "CAM_1", stream_url: "http://192.168.18.80:5001/video_feed" },
  association: {
    roi: { x1: 0, y1: 0, x2: 1280, y2: 720 },
    anchor: { x: 640, y: 360 },
    theta: 0.6,
    weights: { spatial: 0.5, kinematic: 0.3, temporal: 0.2 },
    sigma: { spatial: 200, kinematic: 50, temporal: 3 },
  },
  visits: { exit_timeout_minutes: 10, max_open_hours: 6 },
  privacy: { retention_days: 90 },
};

/** Seconds a recognition stays "at the cashier" on the Kasir screen. */
export const RECOGNITION_WINDOW_SEC = 45;

let cache: { at: number; value: AppSettings } | null = null;

export async function getSettings(fresh = false): Promise<AppSettings> {
  if (!fresh && cache && Date.now() - cache.at < 30_000) return cache.value;
  const { data, error } = await db().from("app_settings").select("key, value");
  const merged: AppSettings = structuredClone(DEFAULT_SETTINGS);
  if (!error) {
    for (const row of data ?? []) {
      const k = row.key as keyof AppSettings;
      if (k in merged) (merged as unknown as Record<string, unknown>)[k] = { ...merged[k], ...row.value };
    }
  }
  cache = { at: Date.now(), value: merged };
  return merged;
}

export async function saveSettings(patch: Partial<AppSettings>) {
  const rows = Object.entries(patch)
    .filter(([k]) => k in DEFAULT_SETTINGS)
    .map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
  if (rows.length) {
    const { error } = await db().from("app_settings").upsert(rows, { onConflict: "key" });
    if (error) throw new Error(error.message);
  }
  cache = null;
  return getSettings(true);
}
