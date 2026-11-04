"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeftRight, CircleDot, DoorOpen, Eye, Frame, Save, SquareDashed, Trash2, Undo2 } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader, Panel, Segmented } from "@/components/app/bits";
import { LiveFrame, Point } from "@/components/app/LiveFrame";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import api, { errorMessage } from "@/services/api";
import { cn } from "@/lib/utils";
import { CameraLayout, CamerasResponse, Rect } from "@/types";

type Tool = "view" | "cashier" | "staff" | "exit" | "transition";
type AreaKey = "staff" | "exit" | "transition";

const AREAS: { key: AreaKey; title: string; how: string; color: string; icon: typeof SquareDashed }[] = [
  { key: "staff", title: "Area staf", how: "Tarik kotak di lantai BELAKANG meja kasir. Orang di sini dianggap staf dan tidak pernah diberi identitas pelanggan.",
    color: "bg-warning", icon: SquareDashed },
  { key: "exit", title: "Pintu keluar", how: "Tarik kotak di lantai depan pintu. Pelanggan yang terakhir terlihat di sini dicatat sudah pulang.",
    color: "bg-info", icon: DoorOpen },
  { key: "transition", title: "Area pindah kamera", how: "Tarik kotak di tempat orang berjalan keluar dari kamera ini menuju kamera lain (gambar juga di kamera lainnya).",
    color: "bg-primary", icon: ArrowLeftRight },
];

const rectOf = (a: Point, b: Point): Rect => ({
  x1: Math.min(a.x, b.x), y1: Math.min(a.y, b.y), x2: Math.max(a.x, b.x), y2: Math.max(a.y, b.y),
});

export default function CamerasPage() {
  const res = useApi<CamerasResponse>("/cameras");
  const areaCams = useMemo(() => (res.data?.cameras ?? []).filter((c) => c.kind === "area"), [res.data]);
  const [key, setKey] = useState<string | null>(null);
  const cam = areaCams.find((c) => c.key === key) ?? areaCams[0] ?? null;
  const saved: CameraLayout = (cam && res.data?.layout?.[cam.camera]) || {};
  const [draft, setDraft] = useState<CameraLayout>({});
  const [tool, setTool] = useState<Tool>("cashier");
  const [busy, setBusy] = useState(false);
  const twoCams = areaCams.length > 1;

  useEffect(() => {
    setDraft(structuredClone(saved));
    setTool(saved.cashier ? "view" : "cashier");
    // reload the draft when the camera or the stored layout changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cam?.key, JSON.stringify(saved)]);

  const dirty = JSON.stringify({ ...draft, updated_at: undefined }) !== JSON.stringify({ ...saved, updated_at: undefined });

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    if (!cam) return;
    setBusy(true);
    try {
      await api.put("/cameras", { camera_id: cam.camera, layout: draft });
      toast.success("Tata letak disimpan. Raspberry Pi memakainya dalam ±3 detik.");
      res.reload();
    } catch (e) { toast.error(errorMessage(e)); }
    finally { setBusy(false); }
  }

  const tools: { value: Tool; label: React.ReactNode }[] = [
    { value: "view", label: <span className="flex items-center justify-center gap-1.5"><Eye className="h-4 w-4" />Lihat</span> },
    { value: "cashier", label: <span className="flex items-center justify-center gap-1.5"><CircleDot className="h-4 w-4" />Titik kasir</span> },
    { value: "staff", label: <span className="flex items-center justify-center gap-1.5"><SquareDashed className="h-4 w-4" />Area staf</span> },
    { value: "exit", label: <span className="flex items-center justify-center gap-1.5"><DoorOpen className="h-4 w-4" />Pintu</span> },
    ...(twoCams ? [{ value: "transition" as Tool, label: <span className="flex items-center justify-center gap-1.5"><ArrowLeftRight className="h-4 w-4" />Pindah kamera</span> }] : []),
  ];
  const hint: Record<Tool, string> = {
    view: "Kotak biru = orang yang dilacak, titik di kakinya = titik pijak yang dipakai sistem.",
    cashier: "Klik LANTAI tempat pembeli berdiri saat membayar (di depan meja, bukan di belakangnya).",
    staff: "Tekan dan tarik untuk menggambar kotak di belakang meja kasir.",
    exit: "Tekan dan tarik untuk menggambar kotak di depan pintu.",
    transition: "Tekan dan tarik di tempat orang pindah ke kamera lain.",
  };

  return (
    <AppShell ownerOnly>
      <PageHeader title="Tata Letak Kamera" description="Tandai titik kasir, area staf, dan pintu langsung di gambar kamera area" />
      {res.loading ? <ListSkeleton rows={3} avatar={false} />
        : res.error ? <ErrorState message={res.error} onRetry={res.reload} />
        : !cam ? (
          <EmptyState icon={Frame} title="Belum ada kamera area"
            text="Nyalakan Raspberry Pi dan pilih kameranya di halaman Perangkat."
            action={<Button asChild size="lg"><Link href="/devices">Buka Perangkat</Link></Button>} />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <div className="space-y-3">
              {areaCams.length > 1 && (
                <Segmented value={cam.key} onChange={(v) => {
                  if (dirty && !window.confirm("Perubahan belum disimpan. Pindah kamera dan buang perubahan?")) return;
                  setKey(v);
                }} options={areaCams.map((c) => ({ value: c.key, label: c.label }))} />
              )}
              <Segmented value={tool} onChange={setTool} options={tools} size="lg" className="w-full" />
              <p className="text-sm text-muted-foreground" aria-live="polite">{hint[tool]}</p>
              <LiveFrame cameraKey={cam.key} layout={draft} showPeople
                onPoint={tool === "cashier" ? (p) => setDraft({ ...draft, cashier: { x: p.x, y: p.y, r: draft.cashier?.r ?? 0.08 } }) : undefined}
                onDrag={tool === "staff" || tool === "exit" || tool === "transition"
                  ? (a, b) => setDraft({ ...draft, [tool]: [...(draft[tool] ?? []), rectOf(a, b)].slice(0, 10) }) : undefined} />
              {!cam.online && <p className="text-sm text-warning">Raspberry Pi offline: gambar tidak diperbarui. Tata letak tetap bisa disimpan.</p>}
            </div>

            <div className="space-y-4">
              <Panel title="Langkah">
                <ol className="space-y-4 text-sm">
                  <li>
                    <p className="flex items-center gap-2 font-semibold"><span className="h-3 w-3 rounded-full bg-success" />1. Titik kasir {draft.cashier ? "✓" : ""}</p>
                    <p className="text-muted-foreground">Klik lantai tempat pembeli berdiri. Lingkaran hijau = jangkauan: hanya orang di dalamnya yang bisa menerima nama dari kamera wajah.</p>
                    {draft.cashier && (
                      <div className="mt-2 space-y-1">
                        <label htmlFor="radius" className="font-medium">Jangkauan: {Math.round(draft.cashier.r * 100)} % lebar gambar</label>
                        <input id="radius" type="range" min={2} max={25} step={1} value={Math.round(draft.cashier.r * 100)}
                          onChange={(e) => setDraft({ ...draft, cashier: { ...draft.cashier!, r: Number(e.target.value) / 100 } })}
                          className="w-full accent-[hsl(var(--success))]" />
                        <p className="text-xs text-muted-foreground">Cukup selebar satu orang berdiri (±1 langkah). Terlalu lebar = orang yang antre ikut terjangkau.</p>
                        <Button variant="outline" size="sm" onClick={() => setDraft({ ...draft, cashier: null })}><Trash2 /> Hapus titik</Button>
                      </div>
                    )}
                  </li>
                  {AREAS.filter((a) => a.key !== "transition" || twoCams).map((a, i) => (
                    <li key={a.key}>
                      <p className="flex items-center gap-2 font-semibold"><span className={cn("h-3 w-3 rounded-sm", a.color)} />{i + 2}. {a.title} {(draft[a.key]?.length ?? 0) > 0 ? "✓" : ""}</p>
                      <p className="text-muted-foreground">{a.how}</p>
                      {(draft[a.key] ?? []).length > 0 && (
                        <ul className="mt-1 space-y-1">
                          {(draft[a.key] ?? []).map((r, j) => (
                            <li key={j} className="flex items-center justify-between rounded-md bg-muted px-2 py-1">
                              <span>{a.title} {j + 1}</span>
                              <Button variant="ghost" size="sm" aria-label={`Hapus ${a.title} ${j + 1}`}
                                onClick={() => setDraft({ ...draft, [a.key]: (draft[a.key] ?? []).filter((_, k) => k !== j) })}>
                                <Trash2 />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              </Panel>
              <div className="flex flex-wrap gap-2">
                <Button size="lg" onClick={save} disabled={!dirty || busy}><Save /> {busy ? "Menyimpan…" : "Simpan tata letak"}</Button>
                <Button size="lg" variant="outline" onClick={() => setDraft(structuredClone(saved))} disabled={!dirty || busy}><Undo2 /> Batalkan</Button>
              </div>
              {saved.updated_at && !dirty && <p className="text-xs text-muted-foreground">Tersimpan. Buka Perangkat → Cek perangkat untuk memastikan Raspberry Pi memakainya.</p>}
            </div>
          </div>
        )}
    </AppShell>
  );
}
