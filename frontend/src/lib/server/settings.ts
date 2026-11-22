import { db } from "../db";

export interface AppSettings {
  cafe: { name: string; floors: { floor: number; capacity: number }[] };
  /** cashier_camera_id = CAMERA_ID of the UNO Q (enrollment requests and the Kasir screen use it). */
  devices: { cashier_camera_id: string };
  /** reopen_minutes: coming back within this many minutes continues the same visit (30, Catledge & Pitkow 1995).
   *  May be lowered temporarily for a test day to show the rule without waiting; see SKENARIO_PENGUJIAN_VISUAL. */
  visits: { exit_timeout_minutes: number; max_open_hours: number; reopen_minutes: number };
  /** Seconds out of sight of every area camera before the Raspberry Pi ends a visit. */
  tracking: { visit_gap_sec: number };
  /** Where the UNO Q sends face events: Pi's own reported address (auto), typed URL, or its .env. */
  network: { pi_face_mode: "auto" | "manual" | "env"; pi_face_url: string };
  privacy: { retention_days: number };
}

export const DEFAULT_SETTINGS: AppSettings = {
  cafe: { name: "Café Lounge Gedung B", floors: [{ floor: 1, capacity: 20 }, { floor: 2, capacity: 25 }] },
  devices: { cashier_camera_id: "uno-q-001" },
  // 15 min: web-session boundary studies put the optimum at 11-15 min (Goker & He 2000);
  // used only when no tracker reports the person (fallback).
  visits: { exit_timeout_minutes: 15, max_open_hours: 6, reopen_minutes: 30 },
  tracking: { visit_gap_sec: 15 },
  network: { pi_face_mode: "env", pi_face_url: "" },
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
