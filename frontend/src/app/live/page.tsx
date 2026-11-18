"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MousePointerClick, ShieldOff, UserRoundCheck, UserX, Video, X } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader, Panel, Pill, Segmented } from "@/components/app/bits";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { LiveFrame } from "@/components/app/LiveFrame";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/app/states";
import { CustomerPicker } from "@/components/pos/CustomerPicker";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { useDeviceCommand } from "@/hooks/useDeviceCommand";
import { errorMessage } from "@/services/api";
import { cn } from "@/lib/utils";
import { CamerasResponse, FramePerson, Station, TrackingPrompt } from "@/types";

type Target = { customer_id: string; name: string };
const ALL = "__all__";

/**
 * Kamera (cashier + owner): what the cameras see, and manual identity.
 * When the Raspberry Pi is not sure which person at the cashier belongs to the face the
 * UNO Q recognised, it asks here; the cashier taps the person (2 taps, Fitts: large targets).
 * Video is never recorded: frames are only sent while this page is open.
 */
function LiveContent() {
  const params = useSearchParams();
  const cams = useApi<CamerasResponse>("/cameras", { interval: 15_000 });
  const station = useApi<Station>("/station?prompts=1", { interval: 3000 });
  const list = useMemo(() => (cams.data?.cameras ?? []).slice().sort((a, b) =>
    a.kind === b.kind ? a.key.localeCompare(b.key) : a.kind === "area" ? -1 : 1), [cams.data]);
  const areas = useMemo(() => list.filter((c) => c.kind === "area"), [list]);
  const multi = areas.length > 1;
  const [key, setKey] = useState<string | null>(null);
  // "Semua kamera area": both area cameras side by side (default when there are two).
  const all = multi && (key === null || key === ALL);
  const cam = all ? areas[0] : list.find((c) => c.key === key) ?? list[0] ?? null;
  const [selected, setSelected] = useState<FramePerson | null>(null);
  const [selCam, setSelCam] = useState<string | null>(null);         // camera of the selected person
  const act = (all ? list.find((c) => c.key === selCam) : cam) ?? cam;
  const [target, setTarget] = useState<Target | null>(null);        // customer waiting for a body
  const [picker, setPicker] = useState(false);
  const [confirm, setConfirm] = useState<{ person: FramePerson; customer: Target } | null>(null);
  const [unassign, setUnassign] = useState<FramePerson | null>(null);
  const { run, busy } = useDeviceCommand();
  const prompts: TrackingPrompt[] = station.data?.tracking_prompts ?? [];

  useEffect(() => {
    const cid = params.get("prompt");
    const p = prompts.find((x) => x.customer_id === cid);
    if (p && !target) {
      setTarget({ customer_id: p.customer_id, name: p.name || "pelanggan" });
      const c = list.find((x) => x.device_id === p.device_id && x.camera === p.camera_id);
      if (c && !multi) setKey(c.key);
    }
  }, [params, prompts, target, list, multi]);

  async function assign(person: FramePerson, customer: Target) {
    if (!act) return;
    try {
      const r = await run(act.device_id, "assign", { track_id: person.id, customer_id: customer.customer_id });
      if (r.status === "DONE") { toast.success(`${customer.name} dipasang. Nama ikut orang itu sampai ia pulang.`); setTarget(null); setSelected(null); }
      else toast.error(r.message ?? "Gagal memasang identitas.");
    } catch (e) { toast.error(errorMessage(e)); }
  }

  async function release(person: FramePerson) {
    if (!act) return;
    try {
      const r = await run(act.device_id, "unassign", { track_id: person.id, customer_id: person.customer_id });
      if (r.status === "DONE") { toast.success("Identitas dilepas dari orang itu."); setSelected(null); }
      else toast.error(r.message ?? "Gagal melepas identitas.");
    } catch (e) { toast.error(errorMessage(e)); }
  }

  async function unstaff(person: FramePerson) {
    if (!act) return;
    try {
      const r = await run(act.device_id, "unstaff", { track_id: person.id });
      if (r.status === "DONE") { toast.success("Tanda staf dicabut. Orang ini dihitung sebagai pelanggan."); setSelected({ ...person, staff: false }); }
      else toast.error(r.message ?? "Gagal mencabut tanda staf.");
    } catch (e) { toast.error(errorMessage(e)); }
  }

  function onPerson(p: FramePerson, camKey: string) {
    setSelCam(camKey);
    if (target) { setConfirm({ person: p, customer: target }); return; }
    setSelected(p);
  }

  if (cams.loading) return <ListSkeleton rows={3} avatar={false} />;
  if (cams.error) return <ErrorState message={cams.error} onRetry={cams.reload} />;
  if (!cam) {
    return <EmptyState icon={Video} title="Belum ada kamera yang terhubung"
      text="Nyalakan Raspberry Pi (kamera area) dan Arduino UNO Q (kamera wajah). Kamera muncul di sini setelah perangkat online." />;
  }
  const area = cam.kind === "area";

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <div className="space-y-3">
        {list.length > 1 && (
          <Segmented value={all ? ALL : cam.key} onChange={(v) => { setKey(v); setSelected(null); }}
            options={[...(multi ? [{ value: ALL, label: "Semua kamera area" }] : []),
                      ...list.map((c) => ({ value: c.key, label: c.label }))]} />
        )}
        {target && area && (
          <div role="status" className="flex items-center gap-3 rounded-xl border-2 border-primary bg-primary/10 p-3 text-sm">
            <MousePointerClick className="h-6 w-6 shrink-0 text-primary" />
            <p className="flex-1"><b>Ketuk orang yang sedang membayar</b> untuk memasang nama <b>{target.name}</b>.</p>
            <Button variant="ghost" size="sm" onClick={() => setTarget(null)} aria-label="Batal"><X /></Button>
          </div>
        )}
        {all ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {areas.map((c) => (
              <div key={c.key} className="space-y-1.5">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <span className={cn("h-2.5 w-2.5 rounded-full", c.online && c.ok ? "bg-success" : "bg-destructive")} aria-hidden />
                  {c.label}
                </p>
                <LiveFrame cameraKey={c.key} layout={cams.data?.layout?.[c.camera]} showPeople
                  selectedId={selCam === c.key ? selected?.id : null} onPerson={(p) => onPerson(p, c.key)} />
              </div>
            ))}
          </div>
        ) : (
          <LiveFrame cameraKey={cam.key} layout={area ? cams.data?.layout?.[cam.camera] : null} showPeople={area}
            selectedId={selected?.id} onPerson={area ? (p) => onPerson(p, cam.key) : undefined} />
        )}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {area ? (<>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-success" />Dikenali</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-info" />Belum dikenali</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-warning" />Staf</span>
            <span>✓ = dipasang manual · Video tidak direkam.</span>
            {multi && <span>Nama pelanggan ikut berpindah saat ia berjalan ke kamera lain.</span>}
          </>) : <span>Kamera wajah di kasir. Video tidak direkam.</span>}
          {area && !multi && <span>Hanya 1 kamera area. Untuk multi-kamera, aktifkan <b>Kamera area 2</b> di halaman Perangkat.</span>}
        </div>
      </div>

      <div className="space-y-4">
        <Panel title={`Perlu konfirmasi${prompts.length ? ` (${prompts.length})` : ""}`}>
          {prompts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada. Sistem bertanya di sini bila tidak yakin siapa orang di kasir.</p>
          ) : (
            <ul className="space-y-2">
              {prompts.map((p) => (
                <li key={p.customer_id} className="rounded-lg border p-3 text-sm">
                  <p className="font-semibold">{p.name || "Pelanggan"}</p>
                  <p className="text-muted-foreground">{p.reason}</p>
                  <Button className="mt-2 w-full" size="lg" onClick={() => {
                    setTarget({ customer_id: p.customer_id, name: p.name || "pelanggan" });
                    const c = list.find((x) => x.device_id === p.device_id && x.camera === p.camera_id);
                    if (c) setKey(c.key);
                  }}><MousePointerClick /> Pilih orangnya</Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {area && (
          <Panel title={all && selected && act ? `Orang yang dipilih · ${act.label}` : "Orang yang dipilih"}>
            {!selected ? (
              <p className="text-sm text-muted-foreground">Ketuk kotak seseorang di gambar untuk memasang atau melepas nama.</p>
            ) : (
              <div className="space-y-3 text-sm">
                <p>
                  {selected.staff ? <Pill tone="warning">Staf</Pill>
                    : selected.customer_id ? <Pill tone="success">{selected.name || "Pelanggan"}{selected.mode === "MANUAL" ? " · manual" : ""}</Pill>
                    : <Pill tone="info">Belum dikenali</Pill>}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="lg" onClick={() => setPicker(true)} disabled={!!busy}><UserRoundCheck /> {selected.customer_id ? "Ganti pelanggan" : "Pasang pelanggan"}</Button>
                  {selected.customer_id && (
                    <Button size="lg" variant="outline" onClick={() => setUnassign(selected)} disabled={!!busy}><UserX /> Bukan dia</Button>
                  )}
                </div>
                {selected.staff && (<>
                  <Button size="lg" variant="outline" className="w-full" onClick={() => unstaff(selected)} disabled={!!busy}>
                    <ShieldOff /> {busy ? "Memproses…" : "Bukan staf"}
                  </Button>
                  <p className="text-muted-foreground">Ditandai staf karena berdiri di area staf. Kalau ini pelanggan, tekan <b>Bukan staf</b>. Bila sering terjadi, kecilkan Area staf di Tata Letak Kamera.</p>
                </>)}
              </div>
            )}
          </Panel>
        )}
      </div>

      <CustomerPicker open={picker} onOpenChange={setPicker}
        onPick={(c) => selected && setConfirm({ person: selected, customer: { customer_id: c.customer_id, name: c.name } })}
        onGuest={() => toast.info("Tamu tidak dilacak per nama.")} />
      <ConfirmDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} destructive={false}
        title={`Pasang ${confirm?.customer.name ?? ""} pada orang ini?`}
        description="Nama akan ikut orang ini di semua kamera sampai ia pulang. Lama kunjungan dihitung dari saat orang ini masuk."
        confirmLabel="Pasang nama" onConfirm={async () => { if (confirm) await assign(confirm.person, confirm.customer); }} />
      <ConfirmDialog open={!!unassign} onOpenChange={(o) => !o && setUnassign(null)}
        title={`Lepas nama ${unassign?.name || "pelanggan"} dari orang ini?`}
        description="Pakai bila nama menempel pada orang yang salah. Kunjungan pelanggan tetap tercatat bila ia memang datang."
        confirmLabel="Lepas nama" onConfirm={async () => { if (unassign) await release(unassign); }} />
    </div>
  );
}

export default function LivePage() {
  return (
    <AppShell>
      <PageHeader title="Kamera" description="Lihat kamera dan pasang nama pelanggan pada orang yang tepat" />
      <Suspense fallback={<ListSkeleton rows={3} avatar={false} />}><LiveContent /></Suspense>
    </AppShell>
  );
}
