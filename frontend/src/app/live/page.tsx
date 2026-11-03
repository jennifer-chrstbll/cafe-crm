"use client";

import { useState } from "react";
import { RefreshCw, VideoOff, Wifi } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader, Panel, Pill } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { timeAgo } from "@/lib/format";
import { AppSettings, Device, Station } from "@/types";

/**
 * Camera check for staff: is the cashier camera on, and what does it see? Recognition itself
 * is shown on the Kasir page; this page exists for troubleshooting and positioning the camera.
 * The video comes straight from the UNO Q on the cafe LAN and is never stored.
 */
export default function LivePage() {
  const settings = useApi<AppSettings>("/settings");
  const devices = useApi<Device[]>("/devices", { interval: 10_000 });
  const station = useApi<Station>("/station", { interval: 2000 });
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);
  const url = settings.data?.devices.stream_url;
  const cam = (devices.data ?? []).find((d) => d.kind === "facerec");
  const mixed = typeof window !== "undefined" && window.location.protocol === "https:" && url?.startsWith("http:");
  const st = station.data;

  return (
    <AppShell>
      <PageHeader title="Kamera kasir" description="Cek posisi kamera dan status pengenalan" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-xl border bg-black shadow-sm">
          {url && !failed && !mixed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={nonce} src={url} alt="Video langsung kamera kasir" className="aspect-video w-full object-contain" onError={() => setFailed(true)} />
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center gap-3 p-6 text-center text-white/90">
              <VideoOff className="h-10 w-10" />
              <p className="font-semibold">Video tidak dapat ditampilkan</p>
              <p className="max-w-md text-sm text-white/70">
                {mixed ? "Video kamera hanya bisa dibuka dari jaringan Wi-Fi kafe lewat alamat lokal (http). Pengenalan wajah tetap berjalan normal."
                  : "Pastikan perangkat ini terhubung ke Wi-Fi kafe dan kamera kasir menyala."}
              </p>
              {!mixed && <Button variant="secondary" onClick={() => { setFailed(false); setNonce((n) => n + 1); }}><RefreshCw /> Coba lagi</Button>}
            </div>
          )}
        </div>
        <div className="space-y-4">
          <Panel title="Status">
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><dt className="text-muted-foreground">Kamera kasir</dt>
                <dd>{cam ? <Pill tone={cam.online ? "success" : "danger"}>{cam.online ? "Online" : `Offline ${timeAgo(cam.last_seen_at)}`}</Pill> : <Pill tone="neutral">Belum terhubung</Pill>}</dd></div>
              {cam?.online && typeof cam.info?.fps === "number" && (
                <div className="flex justify-between"><dt className="text-muted-foreground">Kecepatan</dt><dd className="num">{(cam.info.fps as number).toFixed(1)} FPS</dd></div>
              )}
              <div className="flex items-center justify-between"><dt className="text-muted-foreground">Di depan kamera</dt>
                <dd>{!st ? "…" : st.state === "known" ? <Pill tone="success">{st.customer.name}</Pill> : st.state === "unknown" ? <Pill tone="warning">Wajah baru</Pill> : <span className="text-muted-foreground">Tidak ada</span>}</dd></div>
            </dl>
          </Panel>
          <Panel title="Tips posisi kamera">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>Setinggi wajah, 0,5–1,5 m dari pelanggan yang membayar.</li>
              <li>Hindari cahaya terang tepat di belakang pelanggan.</li>
              <li>Kotak abu-abu “move closer” berarti wajah terlalu jauh.</li>
            </ul>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Wifi className="h-3.5 w-3.5" /> Video tidak direkam atau disimpan.</p>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
