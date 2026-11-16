import { randomBytes } from "crypto";
import { db } from "../db";

/**
 * Live camera pictures travel over Supabase Realtime (WebSocket), not through this website:
 * device --HTTPS--> Supabase Realtime --WebSocket--> browser. Each picture arrives the moment
 * it is sent (no polling), so the view is smooth (~8-10 frames/s) and the boxes stay in sync.
 *
 * The channel is a public Realtime channel whose name is a random secret (a capability):
 * only logged-in staff receive it from GET /api/cameras/stream, and the devices read it from
 * app_settings (which the browser's public key cannot read, RLS). Pictures are never stored.
 * The public URL and anon key are already public (they ship in the browser bundle).
 */
export interface StreamConfig { url: string; key: string; topic: string }

export async function getStreamConfig(): Promise<StreamConfig | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const sb = db();
  const { data, error } = await sb.from("app_settings").select("value").eq("key", "stream").maybeSingle();
  if (error) throw new Error(error.message);
  const cur = (data?.value ?? {}) as Partial<StreamConfig>;
  if (cur.topic && cur.url === url && cur.key === key) return cur as StreamConfig;
  const next: StreamConfig = { url, key, topic: cur.topic || `cam-${randomBytes(16).toString("hex")}` };
  const { error: e2 } = await sb.from("app_settings")
    .upsert({ key: "stream", value: next, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (e2) throw new Error(e2.message);
  return next;
}
