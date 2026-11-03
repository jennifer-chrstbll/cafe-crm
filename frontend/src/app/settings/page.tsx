"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Cpu, KeyRound, Shield, Store } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Field, PageHeader, Panel, Pill } from "@/components/app/bits";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { ErrorState, ListSkeleton } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import api, { errorMessage } from "@/services/api";
import { cn } from "@/lib/utils";
import { formatDate, timeAgo } from "@/lib/format";
import { AppSettings, Device } from "@/types";

const TABS = [
  { id: "account", label: "Akun", icon: KeyRound, owner: false },
  { id: "devices", label: "Perangkat", icon: Cpu, owner: true },
  { id: "cafe", label: "Kafe & asosiasi", icon: Store, owner: true },
  { id: "privacy", label: "Privasi", icon: Shield, owner: true },
] as const;
type TabId = (typeof TABS)[number]["id"];

function Account() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Panel title="Ganti kata sandi" className="max-w-lg">
      <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true);
        try { await api.put("/users/me/password", { current_password: cur, new_password: next }); toast.success("Kata sandi diganti"); setCur(""); setNext(""); }
        catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
      }}>
        <Field label="Kata sandi saat ini" htmlFor="pw-cur"><Input id="pw-cur" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
        <Field label="Kata sandi baru" htmlFor="pw-new" hint="Minimal 8 karakter."><Input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
        <Button type="submit" size="lg" disabled={busy || !cur || next.length < 8}>{busy ? "Menyimpan…" : "Simpan kata sandi"}</Button>
      </form>
    </Panel>
  );
}

function Devices({ s, save }: { s: AppSettings; save: (p: Partial<AppSettings>) => Promise<void> }) {
  const devices = useApi<Device[]>("/devices", { interval: 15_000 });
  const [d, setD] = useState(s.devices);
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="Status perangkat" bodyClassName="p-0">
        {devices.loading ? <div className="p-4"><ListSkeleton rows={2} avatar={false} /></div> : !devices.data?.length ? (
          <p className="p-4 text-sm text-muted-foreground">Belum ada perangkat yang mengirim status. Nyalakan Arduino UNO Q (kamera kasir) dan Raspberry Pi (kamera area).</p>
        ) : (
          <ul className="divide-y">
            {devices.data.map((x) => (
              <li key={x.device_id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className={cn("h-3 w-3 rounded-full", x.online ? "bg-success" : "bg-destructive")} aria-hidden />
                <div className="flex-1">
                  <p className="font-medium">{x.kind === "facerec" ? "Kamera kasir (UNO Q)" : x.kind === "persontrack" ? "Kamera area (Raspberry Pi)" : x.kind} · <span className="font-mono">{x.device_id}</span></p>
                  <p className="text-muted-foreground">
                    {x.online ? "Online" : "Offline"} · terakhir {timeAgo(x.last_seen_at)}
                    {typeof x.info?.fps === "number" && ` · ${(x.info.fps as number).toFixed(1)} FPS`}
                    {typeof x.info?.gallery === "number" && ` · ${x.info.gallery} wajah`}
                  </p>
                </div>
                <Pill tone={x.online ? "success" : "danger"}>{x.online ? "Online" : "Offline"}</Pill>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Identitas perangkat">
        <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); await save({ devices: d }); }}>
          <Field label="ID kamera kasir" htmlFor="cam-c" hint="Harus sama dengan CAMERA_ID di .env UNO Q."><Input id="cam-c" value={d.cashier_camera_id} onChange={(e) => setD({ ...d, cashier_camera_id: e.target.value })} /></Field>
          <Field label="ID kamera area (dekat kasir)" htmlFor="cam-a" hint="Kamera person tracking yang melihat area kasir."><Input id="cam-a" value={d.area_camera_id} onChange={(e) => setD({ ...d, area_camera_id: e.target.value })} /></Field>
          <Field label="Alamat video kamera kasir" htmlFor="cam-s" hint="Hanya bisa dibuka dari jaringan Wi-Fi kafe."><Input id="cam-s" value={d.stream_url} onChange={(e) => setD({ ...d, stream_url: e.target.value })} /></Field>
          <Button type="submit" size="lg">Simpan</Button>
        </form>
      </Panel>
    </div>
  );
}

function Cafe({ s, save }: { s: AppSettings; save: (p: Partial<AppSettings>) => Promise<void> }) {
  const [floors, setFloors] = useState(s.cafe.floors);
  const [a, setA] = useState(s.association);
  const [v, setV] = useState(s.visits);
  const n = (x: string) => Number(x) || 0;
  return (
    <form className="grid gap-4 xl:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); await save({ cafe: { ...s.cafe, floors }, association: a, visits: v }); }}>
      <Panel title="Lantai & kapasitas">
        <div className="space-y-3">
          {floors.map((f, i) => (
            <Field key={f.floor} label={`Lantai ${f.floor} — kapasitas kursi`}>
              <Input inputMode="numeric" value={f.capacity} onChange={(e) => setFloors(floors.map((x, j) => (j === i ? { ...x, capacity: n(e.target.value) } : x)))} />
            </Field>
          ))}
          <Field label="Kunjungan selesai bila orang tidak terlihat (menit)" hint="Dipakai untuk mencatat jam pulang dari person tracking.">
            <Input inputMode="numeric" value={v.exit_timeout_minutes} onChange={(e) => setV({ ...v, exit_timeout_minutes: n(e.target.value) })} />
          </Field>
        </div>
      </Panel>
      <Panel title={<div><h2 className="font-semibold">Asosiasi identitas</h2><p className="text-xs text-muted-foreground">Menghubungkan Customer ID (wajah) dengan Track ID (kamera area). Kalibrasi di lokasi.</p></div>}>
        <div className="space-y-3">
          <p className="text-sm font-medium">Area kasir di kamera area (piksel)</p>
          <div className="grid grid-cols-4 gap-2">
            {(["x1", "y1", "x2", "y2"] as const).map((k) => (
              <Field key={k} label={k}><Input inputMode="numeric" value={a.roi[k]} onChange={(e) => setA({ ...a, roi: { ...a.roi, [k]: n(e.target.value) } })} /></Field>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Titik berdiri kasir x"><Input inputMode="numeric" value={a.anchor.x} onChange={(e) => setA({ ...a, anchor: { ...a.anchor, x: n(e.target.value) } })} /></Field>
            <Field label="Titik berdiri kasir y"><Input inputMode="numeric" value={a.anchor.y} onChange={(e) => setA({ ...a, anchor: { ...a.anchor, y: n(e.target.value) } })} /></Field>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Field label="θ ambang"><Input inputMode="decimal" value={a.theta} onChange={(e) => setA({ ...a, theta: Number(e.target.value) })} /></Field>
            <Field label="w spasial"><Input inputMode="decimal" value={a.weights.spatial} onChange={(e) => setA({ ...a, weights: { ...a.weights, spatial: Number(e.target.value) } })} /></Field>
            <Field label="w kinematik"><Input inputMode="decimal" value={a.weights.kinematic} onChange={(e) => setA({ ...a, weights: { ...a.weights, kinematic: Number(e.target.value) } })} /></Field>
            <Field label="w temporal"><Input inputMode="decimal" value={a.weights.temporal} onChange={(e) => setA({ ...a, weights: { ...a.weights, temporal: Number(e.target.value) } })} /></Field>
          </div>
          {Math.abs(a.weights.spatial + a.weights.kinematic + a.weights.temporal - 1) > 0.01 && (
            <p className="text-sm text-warning">Jumlah bobot sebaiknya 1 (sekarang {(a.weights.spatial + a.weights.kinematic + a.weights.temporal).toFixed(2)}).</p>
          )}
        </div>
      </Panel>
      <div className="xl:col-span-2"><Button type="submit" size="lg">Simpan pengaturan</Button></div>
    </form>
  );
}

function Privacy({ s, save }: { s: AppSettings; save: (p: Partial<AppSettings>) => Promise<void> }) {
  const [days, setDays] = useState(s.privacy.retention_days);
  const status = useApi<{ embeddings: number; customers_with_face: number; to_delete_customers: number; oldest_embedding: string | null }>(`/privacy/retention?days=${days}`);
  const [confirm, setConfirm] = useState(false);
  return (
    <Panel title={<div><h2 className="font-semibold">Retensi data wajah</h2><p className="text-xs text-muted-foreground">UU PDP No. 27/2022: data biometrik disimpan seperlunya.</p></div>} className="max-w-2xl">
      <div className="space-y-4">
        <Field label="Hapus data wajah pelanggan yang tidak berkunjung selama (hari)" hint="7–730 hari. Profil dan riwayat belanja tetap ada.">
          <Input inputMode="numeric" value={days} onChange={(e) => setDays(Number(e.target.value.replace(/\D/g, "")) || 0)} className="max-w-40" />
        </Field>
        {status.loading ? <ListSkeleton rows={1} avatar={false} /> : status.error ? <ErrorState message={status.error} /> : status.data && (
          <dl className="grid grid-cols-3 gap-3 rounded-xl bg-muted p-4 text-center text-sm">
            <div><dt className="text-muted-foreground">Pelanggan berwajah</dt><dd className="num text-xl font-bold">{status.data.customers_with_face}</dd></div>
            <div><dt className="text-muted-foreground">Akan dihapus</dt><dd className="num text-xl font-bold text-warning">{status.data.to_delete_customers}</dd></div>
            <div><dt className="text-muted-foreground">Data tertua</dt><dd className="text-sm font-semibold">{status.data.oldest_embedding ? formatDate(status.data.oldest_embedding) : "–"}</dd></div>
          </dl>
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="lg" variant="outline" onClick={() => save({ privacy: { retention_days: days } })} disabled={days < 7 || days > 730}>Simpan masa retensi</Button>
          <Button size="lg" variant="destructive" onClick={() => setConfirm(true)} disabled={!status.data?.to_delete_customers || days < 7}>Hapus sekarang</Button>
        </div>
      </div>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={`Hapus data wajah ${status.data?.to_delete_customers} pelanggan?`}
        description={`Pelanggan yang tidak datang ${days} hari terakhir tidak akan dikenali otomatis lagi sampai didaftarkan ulang.`}
        confirmLabel="Hapus data wajah"
        onConfirm={async () => { try { const r = await api.post<{ deleted_customers: number }>("/privacy/retention", { days }); toast.success(`Data wajah ${r.data.deleted_customers} pelanggan dihapus`); status.reload(); } catch (e) { toast.error(errorMessage(e)); } }} />
    </Panel>
  );
}

function SettingsContent() {
  const { isOwner } = useAuth();
  const router = useRouter();
  const tab = (useSearchParams().get("tab") as TabId) || "account";
  const settings = useApi<AppSettings>(isOwner ? "/settings" : null);
  const tabs = TABS.filter((t) => !t.owner || isOwner);
  const active = tabs.some((t) => t.id === tab) ? tab : "account";

  async function save(p: Partial<AppSettings>) {
    try { await api.put("/settings", p); toast.success("Pengaturan disimpan"); settings.reload(); }
    catch (e) { toast.error(errorMessage(e)); }
  }
  return (
    <>
      <PageHeader title="Pengaturan" />
      {tabs.length > 1 && (
        <div className="mb-5 flex gap-2 overflow-x-auto border-b" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={active === t.id} onClick={() => router.replace(`/settings?tab=${t.id}`)}
              className={cn("flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold",
                active === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
      )}
      {active === "account" && <Account />}
      {active !== "account" && (settings.loading ? <ListSkeleton rows={3} avatar={false} />
        : settings.error || !settings.data ? <ErrorState message={settings.error ?? "Gagal memuat"} onRetry={settings.reload} />
        : active === "devices" ? <Devices key="d" s={settings.data} save={save} />
        : active === "cafe" ? <Cafe key="c" s={settings.data} save={save} />
        : <Privacy key="p" s={settings.data} save={save} />)}
    </>
  );
}

export default function SettingsPage() {
  return (
    <AppShell>
      <Suspense><SettingsContent /></Suspense>
    </AppShell>
  );
}
