"use client";

import api from "@/services/api";

/**
 * Browser side of the live camera stream (see lib/server/stream.ts).
 * One Supabase Realtime connection for the whole tab; pictures are dispatched to the
 * components that show that camera. supabase-js reconnects by itself after a network drop.
 */
export interface StreamFrame {
  k: string;                                 // camera key, e.g. "pi-001/CAM_1"
  img: string;                               // JPEG, base64
  w: number;
  h: number;
  o: Record<string, unknown>;                // overlay: people boxes, prompts, ...
  t: string;                                 // capture time (ISO)
}
type Listener = (f: StreamFrame) => void;

const listeners = new Map<string, Set<Listener>>();
let starting: Promise<void> | null = null;

async function start() {
  const r = await api.get<{ url: string; key: string; topic: string } | null>("/cameras/stream");
  if (!r.data) throw new Error("stream not configured");
  const { createClient } = await import("@supabase/supabase-js");     // loaded only on camera pages
  const client = createClient(r.data.url, r.data.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 30 } },
  });
  client.channel(r.data.topic, { config: { broadcast: { self: false }, private: false } })
    .on("broadcast", { event: "frame" }, (msg) => {
      const f = msg.payload as StreamFrame;
      listeners.get(f?.k)?.forEach((cb) => cb(f));
    })
    .subscribe();
}

/** Receive live pictures of one camera. Returns an unsubscribe function. */
export function subscribeFrames(cameraKey: string, cb: Listener): () => void {
  if (!listeners.has(cameraKey)) listeners.set(cameraKey, new Set());
  listeners.get(cameraKey)!.add(cb);
  if (!starting) starting = start().catch(() => { starting = null; });   // retried on the next subscribe
  return () => { listeners.get(cameraKey)?.delete(cb); };
}
