"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Copy, Cpu, Eye, LayoutGrid, Power, RefreshCw, Stethoscope, XCircle } from "lucide-react";
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
import { AppSettings, CamerasResponse, CameraSource, Device, DeviceCommand } from "@/types";

type Check = NonNullable<NonNullable<DeviceCommand["result"]>["checks"]>[number];
type Avail = { source: string; name: string };

const TITLE: Record<string, string> = { facerec: "Kamera kasir · Arduino UNO Q", persontrack: "Pelacakan orang · Raspberry Pi 5" };
const ROLE_LABEL: Record<string, string> = { face: "Kamera wajah (di depan kasir)", CAM_1: "Kamera area 1 (melihat kasir)", CAM_2: "Kamera area 2 (multi-kamera)" };
const NAME_HINT: Record<string, string> = { CAM_1: "mis. Area kasir", CAM_2: "mis. Area duduk" };

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
function RolePicker({ device, role, current, available, running, onSaved, name: savedName = "", others = [] }: {
  device: Device; role: string; current?: CameraSource; available: Avail[]; running?: string; onSaved: () => void;
  name?: string; others?: string[];
}) {
  const known = available.some((a) => a.source === current?.source);
  const [mode, setMode] = useState<"auto" | "usb" | "ip" | "off">(
    !current ? (role === "CAM_2" ? "off" : "auto") : known || current.source.startsWith("/dev/") ? "usb" : "ip");
  const [usb, setUsb] = useState(current && known ? current.source : available[0]?.source ?? "");
  const [ip, setIp] = useState(current && !known && !current.source.startsWith("/dev/") ? current.source : "");
  const [floor, setFloor] = useState(current?.floor ?? 1);
  const [name, setName] = useState(savedName);
  const isAreaRole = role === "CAM_1" || role === "CAM_2";
  // A webcam the Pi reports that no other role uses: the obvious second camera.
  const spare = available.filter((a) => !others.includes(a.source));
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const isArea = role !== "face";

  async function save() {
    setBusy(true);
    try {
      const source = mode === "usb" ? { source: usb, floor } : mode === "ip" ? { source: ip.trim(), floor } : null;
      if (mode === "usb" && !usb) throw new Error("Pilih webcam dulu.");
      await api.put("/cameras", { device_id: device.device_id, role, source });
      if (isAreaRole && name.trim() !== savedName) await api.put("/cameras", { device_id: device.device_id, role, name: name.trim() });
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
      {role === "CAM_2" && mode === "off" && (spare.length > 0 ? (
        <div className="rounded-lg border-2 border-primary bg-primary/10 p-3 text-sm">
          <p className="font-semibold">Webcam kedua terdeteksi: {spare[0].name}</p>
          <p className="text-muted-foreground">Untuk multi-kamera, pilih <b>Webcam USB</b>, beri nama (mis. Area duduk), lalu <b>Simpan pilihan</b>.</p>
          <Button size="sm" className="mt-2" onClick={() => { setMode("usb"); setUsb(spare[0].source); if (!name) setName("Area duduk"); }}>Pakai webcam ini</Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Untuk multi-kamera: colok webcam kedua ke port USB biru Raspberry Pi, tunggu 10 detik, lalu muat ulang halaman. Atau pakai kamera IP / HP (RTSP).</p>
      ))}
      {isAreaRole && mode !== "off" && (
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Nama kamera (tampil di halaman Kamera)</span>
          <Input placeholder={NAME_HINT[role]} value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
        </label>
      )}
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

/**
 * Where the UNO Q sends recognised faces. "Otomatis" follows the address the Raspberry Pi
 * reports itself, so moving to another Wi-Fi needs no typing at all.
 */
function PiAddress({ uno, devices }: { uno: Device; devices: Device[] }) {
  const settings = useApi<AppSettings>("/settings");
  const pi = devices.find((x) => x.kind === "persontrack");
  const net = (pi?.info as { network?: { lan_ip?: string; hostname?: string; face_port?: number } } | undefined)?.network;
  const piUrl = net?.lan_ip ? `http://${net.lan_ip}:${net.face_port ?? 8765}/wajah` : null;
  const current = (uno.info as { pi?: { url?: string; mode?: string; ok?: boolean | null } }).pi;
  const [mode, setMode] = useState<"auto" | "manual" | "env" | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const m = mode ?? settings.data?.network?.pi_face_mode ?? "env";
  const u = url ?? settings.data?.network?.pi_face_url ?? "";

  async function save() {
    setBusy(true);
    try {
      await api.put("/settings", { network: { pi_face_mode: m, pi_face_url: m === "manual" ? u : "" } });
      toast.success("Disimpan. UNO Q memakai alamat ini dalam ±5 detik.");
      settings.reload();
    } catch (e) { toast.error(errorMessage(e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">Alamat Raspberry Pi (tujuan wajah yang dikenali)</p>
        {current?.url && (
          <span className="text-xs text-muted-foreground">Sekarang: {current.url}{current.ok === true ? " ✓" : current.ok === false ? " ✗" : ""}</span>
        )}
      </div>
      <div role="radiogroup" className="flex flex-wrap gap-2">
        {([["auto", "Otomatis"], ["manual", "Ketik sendiri"], ["env", "Dari file .env"]] as const).map(([v, l]) => (
          <button key={v} type="button" role="radio" aria-checked={m === v} onClick={() => setMode(v)}
            className={cn("h-10 rounded-lg border px-3 text-sm font-medium", m === v ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
            {l}
          </button>
        ))}
      </div>
      {m === "auto" && (
        <p className="text-sm text-muted-foreground">
          Mengikuti alamat yang dilaporkan Raspberry Pi sendiri{piUrl ? <>: <b className="text-foreground">{piUrl}</b></> : " (Pi belum online)"}.
          Pindah Wi-Fi tidak perlu diubah, asal UNO Q dan Pi di Wi-Fi yang sama.
        </p>
      )}
      {m === "manual" && <Input placeholder="http://192.168.1.20:8765/wajah" value={u} onChange={(e) => setUrl(e.target.value)} />}
      {m === "env" && <p className="text-sm text-muted-foreground">Memakai PI_FACE_URL di file .env UNO Q.</p>}
      <Button onClick={save} disabled={busy || settings.loading || (m === "manual" && !/^https?:\/\//.test(u))}>{busy ? "Menyimpan…" : "Simpan alamat"}</Button>
    </div>
  );
}

function DeviceCard({ d, cams, reloadCams, devices }: { d: Device; cams: CamerasResponse | null; reloadCams: () => void; devices: Device[] }) {
  const { run, busy } = useDeviceCommand();
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [restart, setRestart] = useState(false);
  const info = d.info as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const face = d.kind === "facerec";
  const roles = face ? ["face"] : ["CAM_1", "CAM_2"];
  const available: Avail[] = face ? (info.cameras ?? []) : (info.available_cameras ?? []);
  const runningOf = (role: string) => face ? info.camera?.source
    : (({ opened, source }: { opened?: string | null; source?: string }) => opened || source)((info.cameras ?? []).find((c: { id: string }) => c.id === role) ?? {});

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
          {!face && (
            <div className="col-span-2 sm:col-span-4">
              <dt className="text-muted-foreground">Asosiasi otomatis (dua orang di kasir)</dt>
              <dd className="font-semibold">
                {(() => {
                  const b = info.binding ?? {};
                  const cams = Object.entries((b.facecam ?? {}) as Record<string, boolean>).filter(([, on]) => on).map(([id]) => id);
                  if (!cams.length) return <span className="text-warning">Titik kamera wajah belum diatur (Tata Letak Kamera → Kamera wajah).</span>;
                  const c = (b.calibration ?? {})[cams[0]] as { samples?: number; left_right?: boolean } | undefined;
                  return c?.left_right
                    ? <span className="text-success">Siap: kalibrasi selesai ({c.samples} contoh).</span>
                    : <span>Belajar: {c?.samples ?? 0} contoh. Sementara itu, dua orang berdampingan di kasir masih ditanyakan ke kasir.</span>;
                })()}
              </dd>
            </div>
          )}
          <div className="col-span-2 sm:col-span-4">
            <dt className="text-muted-foreground">Kamera real-time</dt>
            <dd className={cn("font-semibold", info.live?.url ? "text-success" : "text-warning")}>
              {info.live?.url ? `Aktif (langsung dari perangkat, ${info.live.viewers ?? 0} penonton)`
                : info.live ? `Belum aktif: ${info.live.state ?? "–"}. Tampilan kamera memakai jalur cadangan yang lebih lambat.`
                : "Belum tersedia (perbarui program perangkat)."}
            </dd>
          </div>
          {d.online && info.live?.lan && info.live?.token && (
            <div className="col-span-2 sm:col-span-4">
              <dt className="text-muted-foreground">Tampilan lokal untuk merekam (lewat Wi-Fi/hotspot yang sama, tanpa kuota internet)</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {(face ? ["face"] : (info.cameras ?? []).map((c: { id: string }) => c.id)).map((cam: string) => {
                  const title = face ? "Kamera wajah" : cams?.names?.[d.device_id]?.[cam] || `Kamera area ${cam.replace("CAM_", "")}`;
                  const href = `${info.live.lan}/lihat?cam=${encodeURIComponent(cam)}&token=${encodeURIComponent(info.live.token)}&name=${encodeURIComponent(title)}`;
                  return (
                    <a key={cam} href={href} target="_blank" rel="noreferrer"
                      title="Buka sebagai jendela sendiri di kolom kanan layar (klik dua kali di gambar: penuhi jendela)"
                      onClick={(e) => {
                        // Own app-like window (no tabs or bookmark bar), stacked in the right column of the
                        // screen: camera 1 top, camera 2 middle, face camera bottom. The CRM stays on the left.
                        const slot = face ? 2 : Math.min(1, Math.max(0, Number(cam.replace("CAM_", "")) - 1 || 0));
                        const sh = window.screen as Screen & { availLeft?: number; availTop?: number };
                        const outerH = Math.floor(sh.availHeight / 3);
                        const h = outerH - 64;                       // minus the window title + address bar
                        const w = Math.round((h * 4) / 3);           // camera pictures are 4:3
                        const left = (sh.availLeft ?? 0) + sh.availWidth - w - 16;
                        const top = (sh.availTop ?? 0) + slot * outerH;
                        const win = window.open(href, `lokal-${d.device_id}-${cam}`, `popup=yes,width=${w},height=${h},left=${left},top=${top}`);
                        if (win) { e.preventDefault(); win.focus(); }
                      }}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted">
                      <Eye className="h-4 w-4" /> {title}
                    </a>
                  );
                })}
              </dd>
            </div>
          )}
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
              <RolePicker key={`${role}:${JSON.stringify(cams?.sources?.[d.device_id]?.[role] ?? null)}:${cams?.names?.[d.device_id]?.[role] ?? ""}`}
                device={d} role={role} current={cams?.sources?.[d.device_id]?.[role]} available={available} running={runningOf(role)}
                onSaved={reloadCams} name={cams?.names?.[d.device_id]?.[role] ?? ""}
                others={roles.filter((r) => r !== role).flatMap((r) => [cams?.sources?.[d.device_id]?.[r]?.source, runningOf(r)])
                  .filter((x): x is string => typeof x === "string")} />
            ))}
          </div>
          {face && <PiAddress uno={d} devices={devices} />}
          {!face && <p className="text-sm text-muted-foreground">Setelah memilih kamera area, atur titik kasir dan area staf di <Link className="font-semibold text-primary underline" href="/cameras">Tata Letak Kamera</Link>. Dengan dua kamera, gambar juga <b>Area pindah kamera</b> di tempat yang terlihat oleh kedua kamera.</p>}
        </div>
      </div>
      <ConfirmDialog open={restart} onOpenChange={setRestart} title={`Mulai ulang ${TITLE[d.kind] ?? d.device_id}?`}
        description={face ? "Pengenalan wajah berhenti ±10 detik." : "Pelacakan berhenti ±15 detik. Pelanggan yang sedang di dalam perlu dikenali lagi di kasir."}
        confirmLabel="Mulai ulang" onConfirm={() => command("restart", "Mulai ulang")} />
    </Panel>
  );
}

/** All local camera views (both devices) in ONE window, for screen recording. The page is served by a
 *  device over the cafe Wi-Fi (http), so a normal browser window shows "Not secure"; Chrome's app mode
 *  (--app) opens it without any address bar. */
function AllCamerasWindow({ devices, cams }: { devices: Device[]; cams: CamerasResponse | null }) {
  type Src = { u: string; c: string; t: string; n: string };
  const list: Src[] = [];
  const live = (d: Device) => (d.info as { live?: { lan?: string; token?: string } } | undefined)?.live;
  for (const d of [...devices].sort((a, b) => (a.kind === "facerec" ? 1 : 0) - (b.kind === "facerec" ? 1 : 0))) {
    const l = live(d);
    if (!d.online || !l?.lan || !l.token) continue;
    if (d.kind === "facerec") list.push({ u: l.lan, c: "face", t: l.token, n: "Kamera wajah" });
    else for (const c of ((d.info as { cameras?: { id: string }[] }).cameras ?? []))
      list.push({ u: l.lan, c: c.id, t: l.token, n: cams?.names?.[d.device_id]?.[c.id] || `Kamera area ${c.id.replace("CAM_", "")}` });
  }
  if (list.length < 2) return null;
  const url = `${list[0].u}/lihat?src=${encodeURIComponent(JSON.stringify(list)).replace(/'/g, "%27")}`;
  const command = `Start-Process chrome '--app=${url}'`;
  function open() {
    const sh = window.screen as Screen & { availLeft?: number; availTop?: number };
    const h = sh.availHeight - 64;
    const w = Math.min(Math.round(sh.availWidth / 3), Math.round(((h / list.length) * 4) / 3));
    const win = window.open(url, "lokal-semua", `popup=yes,width=${w},height=${h},left=${(sh.availLeft ?? 0) + sh.availWidth - w - 16},top=${sh.availTop ?? 0}`);
    win?.focus();
  }
  async function copy() {
    try { await navigator.clipboard.writeText(command); toast.success("Perintah disalin. Tempel di PowerShell laptop ini, lalu Enter."); }
    catch { toast.error("Tidak bisa menyalin. Pakai tombol Buka."); }
  }
  return (
    <Panel className="space-y-3">
      <div>
        <h2 className="font-semibold">Semua kamera dalam 1 jendela (untuk merekam)</h2>
        <p className="text-sm text-muted-foreground">
          {list.length} kamera, lewat Wi-Fi/hotspot yang sama tanpa kuota internet. Tanpa bar alamat: salin perintah, tempel di
          PowerShell, lalu taruh jendelanya di kanan layar. Buka ulang setelah perangkat dimulai ulang (token baru).
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="lg" onClick={copy}><Copy /> Salin perintah (tanpa bar alamat)</Button>
        <Button size="lg" variant="outline" onClick={open}><LayoutGrid /> Buka di jendela biasa</Button>
      </div>
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
            <AllCamerasWindow devices={devices.data} cams={cams.data} />
            {devices.data.map((d) => <DeviceCard key={d.device_id} d={d} cams={cams.data} reloadCams={cams.reload} devices={devices.data!} />)}
          </div>
        )}
    </AppShell>
  );
}
