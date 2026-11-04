"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Cpu, Eye, Power, RefreshCw, Stethoscope, XCircle } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader, Panel, Pill } from "@/components/app/bits";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { LiveFrame } from "@/components/app/LiveFrame";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/useApi";
import { useDeviceCommand } from "@/hooks/useDeviceCommand";
import api, { errorMessage } from "@/services/api";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CamerasResponse, CameraSource, Device, DeviceCommand } from "@/types";

type Check = NonNullable<NonNullable<DeviceCommand["result"]>["checks"]>[number];
type Avail = { source: string; name: string };

const TITLE: Record<string, string> = { facerec: "Kamera kasir · Arduino UNO Q", persontrack: "Pelacakan orang · Raspberry Pi 5" };
const ROLE_LABEL: Record<string, string> = { face: "Kamera wajah (di depan kasir)", CAM_1: "Kamera area 1 (melihat kasir)", CAM_2: "Kamera area 2" };

const fmtUptime = (s?: number) => (s == null ? "–" : s < 3600 ? `${Math.round(s / 60)} mnt` : `${Math.floor(s / 3600)} jam`);

function CheckList({ checks }: { checks: Check[] }) {
  return (
    <ul className="divide-y rounded-lg border">
      {checks.map((c) => (
        <li key={c.name} className="flex gap-3 px-3 py-2.5 text-sm">
          {c.status === "ok" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            : c.status === "warn" ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />}
          <div className="min-w-0">
            <p className="font-medium">{c.name} <span className="font-normal text-muted-foreground">— {c.detail}</span></p>
            {c.status !== "ok" && c.hint && <p className="text-muted-foreground">{c.hint}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** One role (face / CAM_1 / CAM_2): which webcam or IP camera plays it. */
function RolePicker({ device, role, current, available, running, onSaved }: {
  device: Device; role: string; current?: CameraSource; available: Avail[]; running?: string; onSaved: () => void;
}) {
  const known = available.some((a) => a.source === current?.source);
  const [mode, setMode] = useState<"auto" | "usb" | "ip" | "off">(
    !current ? (role === "CAM_2" ? "off" : "auto") : known || current.source.startsWith("/dev/") ? "usb" : "ip");
  const [usb, setUsb] = useState(current && known ? current.source : available[0]?.source ?? "");
  const [ip, setIp] = useState(current && !known && !current.source.startsWith("/dev/") ? current.source : "");
  const [floor, setFloor] = useState(current?.floor ?? (role === "CAM_2" ? 2 : 1));
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const isArea = role !== "face";

  async function save() {
    setBusy(true);
    try {
      const source = mode === "usb" ? { source: usb, floor } : mode === "ip" ? { source: ip.trim(), floor } : null;
      if (mode === "usb" && !usb) throw new Error("Pilih webcam dulu.");
      await api.put("/cameras", { device_id: device.device_id, role, source });
      toast.success(isArea ? "Disimpan. Raspberry Pi memulai ulang (±15 detik)." : "Disimpan. Kamera wajah berganti dalam beberapa detik.");
      onSaved();
    } catch (e) { toast.error(e instanceof Error && !("response" in e) ? e.message : errorMessage(e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{ROLE_LABEL[role] ?? role}</p>
        {running && <span className="max-w-full truncate text-xs text-muted-foreground">Sekarang: {running}</span>}
      </div>
      <div role="radiogroup" className="flex flex-wrap gap-2">
        {([["auto", role === "face" ? "Otomatis" : "Otomatis"], ["usb", "Webcam USB"], ["ip", "Kamera IP (RTSP)"],
           ...(role === "CAM_2" ? [["off", "Tidak dipakai"]] : [])] as [typeof mode, string][]).map(([v, l]) => (
          <button key={v} type="button" role="radio" aria-checked={mode === v} onClick={() => setMode(v)}
            className={cn("h-10 rounded-lg border px-3 text-sm font-medium", mode === v ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
            {l}
          </button>
        ))}
      </div>
      {mode === "usb" && (available.length ? (
        <select aria-label="Pilih webcam" value={usb} onChange={(e) => setUsb(e.target.value)}
          className="h-11 w-full rounded-lg border bg-background px-3 text-base">
          {available.map((a) => <option key={a.source} value={a.source}>{a.name}</option>)}
        </select>
      ) : <p className="text-sm text-warning">Perangkat ini belum melaporkan webcam. Colok webcam, tunggu 10 detik, lalu muat ulang halaman.</p>)}
      {mode === "ip" && (
        <Input placeholder="rtsp://user:sandi@192.168.1.50:554/stream1" value={ip} onChange={(e) => setIp(e.target.value)} />
      )}
      {mode === "auto" && <p className="text-sm text-muted-foreground">Memakai webcam pertama yang tercolok.</p>}
      {isArea && (mode === "usb" || mode === "ip") && (
        <label className="flex items-center gap-2 text-sm">Lantai
          <select value={floor} onChange={(e) => setFloor(Number(e.target.value))} className="h-10 rounded-lg border bg-background px-2 text-base">
            {[1, 2, 3].map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={busy || (mode === "ip" && !ip.trim())}>{busy ? "Menyimpan…" : "Simpan pilihan"}</Button>
        <Button variant="outline" onClick={() => setPreview((p) => !p)}><Eye /> {preview ? "Tutup gambar" : "Lihat gambar"}</Button>
      </div>
      {preview && <LiveFrame cameraKey={`${device.device_id}/${role}`} showPeople={false} className="max-w-xl" />}
    </div>
  );
}

function DeviceCard({ d, cams, reloadCams }: { d: Device; cams: CamerasResponse | null; reloadCams: () => void }) {
  const { run, busy } = useDeviceCommand();
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [restart, setRestart] = useState(false);
  const info = d.info as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const face = d.kind === "facerec";
  const roles = face ? ["face"] : ["CAM_1", "CAM_2"];
  const available: Avail[] = face ? (info.cameras ?? []) : (info.available_cameras ?? []);
  const runningOf = (role: string) => face ? info.camera?.source
    : (info.cameras ?? []).find((c: { id: string }) => c.id === role)?.source;

  async function command(c: string, label: string) {
    try {
      const r = await run(d.device_id, c);
      if (c === "self_check") setChecks(r.result?.checks ?? []);
      (r.status === "DONE" ? toast.success : toast.error)(r.message ?? label);
    } catch (e) { toast.error(errorMessage(e)); }
  }

  return (
    <Panel title={
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("h-3 w-3 rounded-full", d.online ? "bg-success" : "bg-destructive")} aria-hidden />
        <h2 className="font-semibold">{TITLE[d.kind] ?? d.kind}</h2>
        <span className="font-mono text-xs text-muted-foreground">{d.device_id}</span>
        <Pill tone={d.online ? "success" : "danger"}>{d.online ? "Online" : `Offline · ${timeAgo(d.last_seen_at)}`}</Pill>
      </div>
    }>
      <div className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {face ? (<>
            <div><dt className="text-muted-foreground">Kecepatan</dt><dd className="num font-semibold">{info.fps ?? "–"} FPS</dd></div>
            <div><dt className="text-muted-foreground">Wajah terdaftar</dt><dd className="num font-semibold">{info.gallery?.customers ?? "–"}</dd></div>
            <div><dt className="text-muted-foreground">Perlu daftar ulang</dt><dd className="num font-semibold">{info.gallery?.legacy ?? 0}</dd></div>
          </>) : (<>
            <div><dt className="text-muted-foreground">Kamera</dt><dd className="font-semibold">{(info.cameras ?? []).map((c: { id: string; fps: number }) => `${c.id} ${c.fps} FPS`).join(" · ") || "–"}</dd></div>
            <div><dt className="text-muted-foreground">Orang terlihat</dt><dd className="num font-semibold">{(info.cameras ?? []).reduce((a: number, c: { people: number }) => a + (c.people ?? 0), 0)}</dd></div>
            <div><dt className="text-muted-foreground">Pelanggan dikenali</dt><dd className="num font-semibold">{info.identities ?? 0}</dd></div>
          </>)}
          <div><dt className="text-muted-foreground">Versi · aktif</dt><dd className="font-semibold">{info.version ?? "–"} · {fmtUptime(info.uptime_s)}</dd></div>
        </dl>

        <div className="flex flex-wrap gap-2">
          <Button size="lg" onClick={() => command("self_check", "Cek perangkat")} disabled={!d.online || !!busy}>
            <Stethoscope /> {busy === `${d.device_id}:self_check` ? "Memeriksa…" : "Cek perangkat"}
          </Button>
          {face && (
            <Button size="lg" variant="outline" onClick={() => command("reload_gallery", "Muat ulang wajah")} disabled={!d.online || !!busy}>
              <RefreshCw /> Muat ulang wajah
            </Button>
          )}
          <Button size="lg" variant="outline" onClick={() => setRestart(true)} disabled={!d.online || !!busy}><Power /> Mulai ulang</Button>
        </div>
        {!d.online && <p className="text-sm text-muted-foreground">Perangkat offline: periksa daya dan Wi-Fi. Tombol aktif lagi saat perangkat online.</p>}
        {checks && (checks.length ? <CheckList checks={checks} /> : <p className="text-sm text-muted-foreground">Tidak ada hasil pemeriksaan.</p>)}

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Pilih kamera</h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {roles.map((role) => (
              <RolePicker key={`${role}:${JSON.stringify(cams?.sources?.[d.device_id]?.[role] ?? null)}`} device={d} role={role}
                current={cams?.sources?.[d.device_id]?.[role]} available={available} running={runningOf(role)} onSaved={reloadCams} />
            ))}
          </div>
          {!face && <p className="text-sm text-muted-foreground">Setelah memilih kamera area, atur titik kasir dan area staf di <Link className="font-semibold text-primary underline" href="/cameras">Tata Letak Kamera</Link>.</p>}
        </div>
      </div>
      <ConfirmDialog open={restart} onOpenChange={setRestart} title={`Mulai ulang ${TITLE[d.kind] ?? d.device_id}?`}
        description={face ? "Pengenalan wajah berhenti ±10 detik." : "Pelacakan berhenti ±15 detik. Pelanggan yang sedang di dalam perlu dikenali lagi di kasir."}
        confirmLabel="Mulai ulang" onConfirm={() => command("restart", "Mulai ulang")} />
    </Panel>
  );
}

export default function DevicesPage() {
  const devices = useApi<Device[]>("/devices", { interval: 10_000 });
  const cams = useApi<CamerasResponse>("/cameras");
  return (
    <AppShell ownerOnly>
      <PageHeader title="Perangkat" description="Status, pemeriksaan, dan pilihan kamera untuk UNO Q (wajah) dan Raspberry Pi (pelacakan)" />
      {devices.loading ? <ListSkeleton rows={3} avatar={false} />
        : devices.error ? <ErrorState message={devices.error} onRetry={devices.reload} />
        : !devices.data?.length ? (
          <EmptyState icon={Cpu} title="Belum ada perangkat yang terhubung"
            text="Nyalakan Arduino UNO Q dan Raspberry Pi. Setelah programnya berjalan dan tersambung ke internet, perangkat muncul di sini dalam 10 detik." />
        ) : (
          <div className="space-y-4">
            {devices.data.map((d) => <DeviceCard key={d.device_id} d={d} cams={cams.data} reloadCams={cams.reload} />)}
          </div>
        )}
    </AppShell>
  );
}
