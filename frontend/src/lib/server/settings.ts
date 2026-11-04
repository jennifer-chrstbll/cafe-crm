import { db } from "../db";

export interface AppSettings {
  cafe: { name: string; floors: { floor: number; capacity: number }[] };
  /** cashier_camera_id = CAMERA_ID of the UNO Q (enrollment requests and the Kasir screen use it). */
  devices: { cashier_camera_id: string };
  visits: { exit_timeout_minutes: number; max_open_hours: number };
  privacy: { retention_days: number };
}

export const DEFAULT_SETTINGS: AppSettings = {
  cafe: { name: "Café Lounge Gedung B", floors: [{ floor: 1, capacity: 20 }, { floor: 2, capacity: 25 }] },
  devices: { cashier_camera_id: "uno-q-001" },
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
      if (k in merged) {
        const known = Object.keys(DEFAULT_SETTINGS[k]);
        const value = Object.fromEntries(Object.entries(row.value ?? {}).filter(([f]) => known.includes(f)));
        (merged as unknown as Record<string, unknown>)[k] = { ...merged[k], ...value };
      }
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
