"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { VideoOff } from "lucide-react";
import api from "@/services/api";
import { StreamFrame, subscribeFrames } from "@/lib/liveStream";
import { cn } from "@/lib/utils";
import { CameraLayout, FramePerson, FrameResponse } from "@/types";

export type Point = { x: number; y: number };

/** "Halus" = smooth (more data), "Hemat" = data saver. Remembered per browser. */
export type LiveQuality = "smooth" | "saver";
const QUALITY: Record<LiveQuality, { fps: number; w: number; q: number; label: string }> = {
  smooth: { fps: 15, w: 640, q: 55, label: "Halus" },
  saver: { fps: 6, w: 480, q: 50, label: "Hemat data" },
};
const QUALITY_KEY = "live.quality";

type Mode = "connecting" | "direct" | "cloud";

/**
 * Live picture of one camera, by the fastest path that works:
 *  1. direct: a WebSocket straight to the device (livecast.py through a Cloudflare tunnel). Raw
 *     camera frames up to 15/s, ~0.1-0.3 s behind reality; every shown picture is confirmed to the
 *     device, which never has more than 2 on the way, so the view can not fall behind on a slow
 *     connection (the frame rate drops instead). Nothing passes through Supabase or the website.
 *  2. cloud fallback: pictures pushed over Supabase Realtime (limited monthly, counts as egress),
 *  3. and the newest stored frame, polled.
 * Each picture is decoded off-screen before it is swapped in; when a newer one arrives during
 * decoding, the older is skipped. Drawn on top, in image fractions (0..1): the camera layout, the
 * people the Pi tracks (clickable) and, for the face camera, the faces it sees.
 */
export function LiveFrame({
  cameraKey, layout, showPeople = true, selectedId, onPerson, onPoint, onDrag, draft, className, children,
}: {
  cameraKey: string | null;
  layout?: CameraLayout | null;
  showPeople?: boolean;
  selectedId?: string | null;
  onPerson?: (p: FramePerson) => void;
  onPoint?: (pt: Point) => void;
  onDrag?: (a: Point, b: Point) => void;
  draft?: { a: Point; b: Point } | null;
  className?: string;
  children?: ReactNode;
}) {
  const [frame, setFrame] = useState<(FrameResponse & { raw?: boolean }) | null>(null);
  const [waited, setWaited] = useState(0);
  const [mode, setMode] = useState<Mode>("connecting");
  const [fps, setFps] = useState(0);
  const [quality, setQuality] = useState<LiveQuality>("smooth");
  const lastAt = useRef<string | null>(null);
  const polls = useRef(0);
  const lastRt = useRef(0);
  const lastDirect = useRef(0);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<Point | null>(null);
  const [live, setLive] = useState<{ a: Point; b: Point } | null>(null);

  useEffect(() => {
    const q = localStorage.getItem(QUALITY_KEY);
    if (q === "smooth" || q === "saver") setQuality(q);
  }, []);
  const pickQuality = (q: LiveQuality) => { setQuality(q); localStorage.setItem(QUALITY_KEY, q); };

  useEffect(() => {
    setFrame(null);
    setWaited(0);
    setMode("connecting");
    lastAt.current = null;
    lastRt.current = 0;
    lastDirect.current = 0;
    if (!cameraKey) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    let retry: ReturnType<typeof setTimeout>;
    const started = Date.now();
    let directGrace = 6000;                    // give the direct view a moment before using the cloud
    const shownTimes: number[] = [];
    let currentUrl: string | null = null;

    // One decoding pipeline for every path: newest picture wins, nothing queues up.
    type Pic = { src: string; blob?: boolean; w: number; h: number; o: unknown; t: string; raw: boolean; done?: () => void };
    let decoding = false;
    let pending: Pic | null = null;
    const show = async (p: Pic) => {
      decoding = true;
      try {
        const im = new Image();
        im.src = p.src;
        await im.decode();
      } catch {
        /* show it anyway */
      }
      if (!stop) {
        lastAt.current = p.t;
        const old = currentUrl;
        currentUrl = p.blob ? p.src : null;
        setFrame({ key: cameraKey, image: p.src, width: p.w, height: p.h, raw: p.raw,
                   overlay: p.o as FrameResponse["overlay"], captured_at: p.t, age_sec: 0 });
        const now = performance.now();
        shownTimes.push(now);
        while (shownTimes.length && now - shownTimes[0] > 2000) shownTimes.shift();
        requestAnimationFrame(() => {
          p.done?.();                          // confirm to the device once it is on screen
          if (old) setTimeout(() => URL.revokeObjectURL(old), 1000);
        });
      } else if (p.blob) {
        URL.revokeObjectURL(p.src);
      }
      decoding = false;
      if (pending && !stop) { const next = pending; pending = null; show(next); }
    };
    const offer = (p: Pic) => {
      if (!decoding) { show(p); return; }
      if (pending) {                           // skipped: still confirm it, or the device waits
        pending.done?.();
        if (pending.blob) URL.revokeObjectURL(pending.src);
      }
      pending = p;
    };

    // 1) Direct WebSocket to the device.
    let ws: WebSocket | null = null;
    let backoff = 2000;
    const q = QUALITY[quality];
    const openDirect = async () => {
      if (stop || ws || document.visibilityState !== "visible") return;
      let url: string | null = null;
      try {
        url = (await api.get<{ url: string | null }>(`/cameras/live?key=${encodeURIComponent(cameraKey)}`)).data.url;
      } catch {
        url = null;
      }
      if (stop || ws) return;
      if (!url) {
        directGrace = 0;                       // not available now: use the cloud, look again later
        retry = setTimeout(openDirect, 20000);
        return;
      }
      const sock = new WebSocket(`${url}&fps=${q.fps}&w=${q.w}&q=${q.q}`);
      sock.binaryType = "arraybuffer";
      ws = sock;
      sock.onmessage = (ev) => {
        if (stop || typeof ev.data === "string") return;
        const buf = ev.data as ArrayBuffer;
        const dv = new DataView(buf);
        const n = dv.getUint32(0);
        let head: { o: unknown; w: number; h: number; t: number };
        try {
          head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, n)));
        } catch {
          return;
        }
        lastDirect.current = Date.now();
        backoff = 2000;
        setMode("direct");
        const src = URL.createObjectURL(new Blob([new Uint8Array(buf, 4 + n)], { type: "image/jpeg" }));
        offer({ src, blob: true, w: head.w, h: head.h, o: head.o, t: new Date(head.t).toISOString(), raw: true,
                done: () => { if (sock.readyState === WebSocket.OPEN) sock.send("a"); } });
      };
      sock.onclose = () => {
        if (ws === sock) ws = null;
        if (stop) return;
        if (Date.now() - lastDirect.current > 3000) directGrace = 0;
        retry = setTimeout(openDirect, backoff);
        backoff = Math.min(backoff * 2, 30000);
      };
      sock.onerror = () => sock.close();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") openDirect();
      else if (ws) { const s = ws; ws = null; s.close(); }   // hidden tab: no data used
    };
    document.addEventListener("visibilitychange", onVisible);
    openDirect();

    // 2) Cloud fallback, Supabase Realtime: only used while the direct view is not working.
    const unsubscribe = subscribeFrames(cameraKey, (f) => {
      if (stop || Date.now() - lastDirect.current < 3000) return;
      lastRt.current = Date.now();
      setMode("cloud");
      offer({ src: `data:image/jpeg;base64,${f.img}`, w: f.w, h: f.h, o: f.o, t: f.t, raw: false });
    });
    // 3) Polling: asks the device for cloud pictures ("someone is watching", every 3 s) and shows the
    //    stored frame when nothing else arrives. Idle while the direct view works.
    const tick = async () => {
      const direct = Date.now() - lastDirect.current < 3000;
      const waiting = Date.now() - started < directGrace;
      const rt = Date.now() - lastRt.current < 3000;
      if (!direct && !waiting && document.visibilityState === "visible") {
        try {
          polls.current += 1;
          const since = lastAt.current
            ? `&since=${encodeURIComponent(lastAt.current)}${rt || polls.current % 20 === 0 ? "&watch=1" : ""}` : "";
          const r = await api.get<FrameResponse & { unchanged?: boolean }>(`/cameras/frame?key=${encodeURIComponent(cameraKey)}${since}`);
          if (!stop && Date.now() - lastRt.current >= 3000 && Date.now() - lastDirect.current >= 3000) {
            setMode("cloud");
            if (r.data.unchanged) {
              setFrame((f) => (f ? { ...f, overlay: r.data.overlay, age_sec: r.data.age_sec } : f));
            } else if (r.data.image) {
              offer({ src: r.data.image, w: r.data.width ?? 16, h: r.data.height ?? 9, o: r.data.overlay,
                      t: r.data.captured_at ?? "", raw: false });
            } else {
              lastAt.current = null;
              setFrame(r.data);
            }
          }
        } catch {
          /* keep the last picture; the empty state explains if nothing comes */
        }
      }
      if (!stop) {
        if (document.visibilityState === "visible") setWaited((w) => w + 1);
        setFps(shownTimes.length >= 2 ? Math.round((shownTimes.length - 1) * 1000 / (shownTimes[shownTimes.length - 1] - shownTimes[0])) : 0);
        timer = setTimeout(tick, direct || waiting ? 1000 : rt ? 3000 : 250);
      }
    };
    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
      clearTimeout(retry);
      document.removeEventListener("visibilitychange", onVisible);
      if (ws) { const s = ws; ws = null; s.close(); }
      unsubscribe();
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      if (pending?.blob) URL.revokeObjectURL(pending.src);
    };
  }, [cameraKey, quality]);

  const toPoint = useCallback((e: React.PointerEvent): Point => {
    const r = svg.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
             y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  }, []);

  const w = frame?.width ?? 16;
  const h = frame?.height ?? 9;
  const aspect = h / w;
  const interactive = !!(onPoint || onDrag);
  const people = showPeople ? frame?.overlay.people ?? [] : [];
  // Face camera, raw frames from the direct view: the device did not draw on the picture.
  const faces = frame?.raw ? frame.overlay.faces ?? [] : [];
  const faceStatus = frame?.raw && frame.overlay.faces ? frame.overlay.status ?? "" : "";
  const rect = (r: { x1: number; y1: number; x2: number; y2: number }) =>
    ({ x: Math.min(r.x1, r.x2), y: Math.min(r.y1, r.y2), width: Math.abs(r.x2 - r.x1), height: Math.abs(r.y2 - r.y1) });
  const shown = live ?? draft ?? null;

  return (
    <div className={cn("relative overflow-hidden rounded-xl border bg-black", className)}
      style={{ aspectRatio: `${w} / ${h}` }}>
      {frame?.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={frame.image} alt="Gambar langsung kamera" className="absolute inset-0 h-full w-full select-none object-fill" draggable={false} />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-white/90">
          {waited < 16 ? (
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" aria-label="Memuat gambar" />
          ) : (
            <>
              <VideoOff className="h-9 w-9" />
              <p className="font-semibold">Belum ada gambar dari kamera</p>
              <p className="max-w-sm text-sm text-white/70">Pastikan perangkat menyala dan online (lampu hijau di atas). Gambar muncul beberapa detik setelah halaman dibuka.</p>
            </>
          )}
        </div>
      )}
      {frame?.image && (
        <svg ref={svg} viewBox="0 0 1 1" preserveAspectRatio="none"
          className={cn("absolute inset-0 h-full w-full", interactive && "cursor-crosshair touch-none")}
          onPointerDown={(e) => {
            if (!interactive) return;
            const p = toPoint(e);
            if (onDrag) { drag.current = p; setLive({ a: p, b: p }); (e.target as Element).setPointerCapture?.(e.pointerId); }
          }}
          onPointerMove={(e) => { if (drag.current) setLive({ a: drag.current, b: toPoint(e) }); }}
          onPointerUp={(e) => {
            const p = toPoint(e);
            if (drag.current && onDrag) {
              const a = drag.current;
              drag.current = null;
              setLive(null);
              if (Math.abs(a.x - p.x) > 0.01 && Math.abs(a.y - p.y) > 0.01) onDrag(a, p);
              return;
            }
            onPoint?.(p);
          }}>
          {(layout?.staff ?? []).map((r, i) => <rect key={`s${i}`} {...rect(r)} className="fill-warning/25 stroke-warning" strokeWidth={2} vectorEffect="non-scaling-stroke" />)}
          {(layout?.exit ?? []).map((r, i) => <rect key={`e${i}`} {...rect(r)} className="fill-info/25 stroke-info" strokeWidth={2} vectorEffect="non-scaling-stroke" />)}
          {(layout?.transition ?? []).map((r, i) => <rect key={`t${i}`} {...rect(r)} className="fill-primary/20 stroke-primary" strokeDasharray="0.01 0.01" strokeWidth={2} vectorEffect="non-scaling-stroke" />)}
          {layout?.cashier && (
            <g>
              <ellipse cx={layout.cashier.x} cy={layout.cashier.y} rx={layout.cashier.r} ry={layout.cashier.r / aspect}
                className="fill-success/20 stroke-success" strokeWidth={2} vectorEffect="non-scaling-stroke" />
              <ellipse cx={layout.cashier.x} cy={layout.cashier.y} rx={0.008} ry={0.008 / aspect} className="fill-success" />
            </g>
          )}
          {layout?.facecam && (
            <g>
              {layout.cashier && (
                <line x1={layout.facecam.x} y1={layout.facecam.y} x2={layout.cashier.x} y2={layout.cashier.y}
                  className="stroke-violet-500" strokeDasharray="0.012 0.008" strokeWidth={2} vectorEffect="non-scaling-stroke" />
              )}
              <rect x={layout.facecam.x - 0.012} y={layout.facecam.y - 0.012 / aspect} width={0.024} height={0.024 / aspect}
                className="fill-violet-500 stroke-white" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            </g>
          )}
          {shown && <rect {...rect({ x1: shown.a.x, y1: shown.a.y, x2: shown.b.x, y2: shown.b.y })} className="fill-white/20 stroke-white" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
          {faces.map((f, i) => (
            <rect key={`f${i}`} x={f.box[0]} y={f.box[1]} width={f.box[2] - f.box[0]} height={f.box[3] - f.box[1]}
              className={cn("fill-transparent", f.main ? "stroke-success" : "stroke-white/60")}
              strokeWidth={2} vectorEffect="non-scaling-stroke" />
          ))}
          {people.map((p) => {
            const [x1, y1, x2, y2] = p.box;
            const known = !!p.customer_id;
            const sel = selectedId === p.id;
            return (
              <g key={p.id} className={cn(onPerson && !interactive && "cursor-pointer")}
                onClick={onPerson && !interactive ? (e) => { e.stopPropagation(); onPerson(p); } : undefined}>
                <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1}
                  className={cn("fill-transparent", sel ? "stroke-white" : p.staff ? "stroke-warning" : known ? "stroke-success" : "stroke-info",
                    onPerson && !interactive && "hover:fill-white/10")}
                  strokeWidth={sel ? 4 : 2} vectorEffect="non-scaling-stroke" />
                <ellipse cx={(x1 + x2) / 2} cy={y2} rx={0.006} ry={0.006 / aspect} className={p.staff ? "fill-warning" : known ? "fill-success" : "fill-info"} />
              </g>
            );
          })}
        </svg>
      )}
      {frame?.image && showPeople && people.map((p) => (
        <span key={`l${p.id}`} className={cn("pointer-events-none absolute -translate-y-full rounded px-1.5 py-0.5 text-[11px] font-semibold leading-tight text-white",
            p.staff ? "bg-warning" : p.customer_id ? "bg-success" : "bg-info")}
          style={{ left: `${p.box[0] * 100}%`, top: `${p.box[1] * 100}%` }}>
          {p.staff ? "Staf" : p.customer_id ? (p.name || "Pelanggan") + (p.mode === "MANUAL" ? " ✓" : "") : "?"}
        </span>
      ))}
      {faceStatus && (
        <div className="pointer-events-none absolute inset-x-0 top-0 truncate bg-black/70 px-3 py-1 text-sm text-white">{faceStatus}</div>
      )}
      {frame?.image && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[11px] font-medium text-white">
          <span className={cn("flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5")}
            title={mode === "direct" ? "Langsung dari perangkat (real-time)" : "Lewat cloud (cadangan, lebih lambat)"}>
            <span className={cn("h-1.5 w-1.5 rounded-full", mode === "direct" ? "bg-success" : "bg-warning")} />
            {mode === "direct" ? "Langsung" : "Cadangan"}{fps > 0 ? ` · ${fps} fps` : ""}
          </span>
          {mode === "direct" && (Object.keys(QUALITY) as LiveQuality[]).map((k) => (
            <button key={k} type="button" onClick={(e) => { e.stopPropagation(); pickQuality(k); }}
              className={cn("rounded px-1.5 py-0.5", quality === k ? "bg-white text-black" : "bg-black/70 hover:bg-black/90")}>
              {QUALITY[k].label}
            </button>
          ))}
        </div>
      )}
      {frame?.age_sec != null && frame.image && frame.age_sec > 5 && (
        <span className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-white">Gambar {Math.round(frame.age_sec)} dtk lalu</span>
      )}
      {children}
    </div>
  );
}
