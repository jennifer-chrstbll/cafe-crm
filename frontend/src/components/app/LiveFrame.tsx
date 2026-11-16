"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { VideoOff } from "lucide-react";
import api from "@/services/api";
import { cn } from "@/lib/utils";
import { CameraLayout, FramePerson, FrameResponse } from "@/types";

export type Point = { x: number; y: number };

/**
 * Live picture of one camera. The cloud website cannot open cameras on the cafe LAN, so it
 * asks for the newest frame ~2 times a second (only while the page is visible); the device
 * uploads frames only while someone is watching. Drawn on top, in image fractions (0..1):
 * the camera layout and the people the Pi tracks, so both can be clicked.
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
  const [frame, setFrame] = useState<FrameResponse | null>(null);
  const [waited, setWaited] = useState(0);
  const lastAt = useRef<string | null>(null);
  const polls = useRef(0);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<Point | null>(null);
  const [live, setLive] = useState<{ a: Point; b: Point } | null>(null);

  useEffect(() => {
    setFrame(null);
    setWaited(0);
    lastAt.current = null;
    if (!cameraKey) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (document.visibilityState === "visible") {
        try {
          polls.current += 1;
          const since = lastAt.current
            ? `&since=${encodeURIComponent(lastAt.current)}${polls.current % 20 === 0 ? "&watch=1" : ""}` : "";
          const r = await api.get<FrameResponse & { unchanged?: boolean }>(`/cameras/frame?key=${encodeURIComponent(cameraKey)}${since}`);
          if (!stop) {
            if (r.data.unchanged) {
              setFrame((f) => (f ? { ...f, overlay: r.data.overlay, age_sec: r.data.age_sec } : f));
            } else {
              lastAt.current = r.data.image ? r.data.captured_at : null;
              setFrame(r.data);
            }
          }
        } catch {
          /* keep the last picture; the empty state explains if nothing comes */
        }
        if (!stop) setWaited((w) => w + 1);
      }
      if (!stop) timer = setTimeout(tick, 250);
    };
    tick();
    return () => { stop = true; clearTimeout(timer); };
  }, [cameraKey]);

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
          {shown && <rect {...rect({ x1: shown.a.x, y1: shown.a.y, x2: shown.b.x, y2: shown.b.y })} className="fill-white/20 stroke-white" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
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
      {frame?.age_sec != null && frame.image && frame.age_sec > 5 && (
        <span className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-white">Gambar {Math.round(frame.age_sec)} dtk lalu</span>
      )}
      {children}
    </div>
  );
}
