"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ScanFace, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApi } from "@/hooks/useApi";
import api, { errorMessage } from "@/services/api";
import { AppSettings } from "@/types";
import { Field } from "./bits";

type Step = "form" | "capture" | "done" | "failed";

/**
 * Face enrollment with explicit consent (UU PDP; proposal: written consent, 18+).
 * 1. data + consent   2. customer looks at the cashier camera (UNO Q captures ~10 frames)
 * 3. result. The camera captures on the device; the website never receives a photo.
 */
export function EnrollDialog({ open, onOpenChange, existing, onDone }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  existing?: { customer_id: string; name: string } | null;
  onDone?: (customerId: string, name: string) => void;
}) {
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [previewOk, setPreviewOk] = useState(true);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  const { data: settings } = useApi<AppSettings>(open ? "/settings" : null);

  useEffect(() => {
    if (open) {
      setStep("form"); setName(existing?.name ?? ""); setPhone(""); setConsent(false);
      setError(null); setCustomerId(existing?.customer_id ?? null); setPreviewOk(true);
    }
    return () => { if (poll.current) clearInterval(poll.current); };
  }, [open, existing]);

  async function start() {
    setError(null);
    if (!existing && !customerId && !name.trim()) return setError("Nama pelanggan wajib diisi.");
    if (!consent) return setError("Persetujuan pelanggan diperlukan.");
    try {
      const r = await api.post<{ request_id: string; customer_id: string }>("/enrollment", {
        consent: true, customer_id: customerId ?? undefined, name: name.trim(), phone_number: phone.trim() || undefined,
      });
      setCustomerId(r.data.customer_id);
      setStep("capture");
      const started = Date.now();
      poll.current = setInterval(async () => {
        try {
          const s = await api.get<{ status: string; message: string | null }>(`/enrollment/${r.data.request_id}`);
          if (s.data.status === "DONE") {
            clearInterval(poll.current!); setStep("done");
          } else if (s.data.status === "FAILED" || Date.now() - started > 40_000) {
            clearInterval(poll.current!); setMessage(s.data.message ?? "Wajah tidak tertangkap jelas."); setStep("failed");
          }
        } catch (e) {
          clearInterval(poll.current!); setMessage(errorMessage(e)); setStep("failed");
        }
      }, 1000);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const who = existing?.name ?? name.trim();
  const retention = settings?.privacy.retention_days ?? 90;

  return (
    <Dialog open={open} onOpenChange={(o) => step !== "capture" && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? `Daftarkan ulang wajah ${existing.name}` : "Daftarkan pelanggan"}</DialogTitle>
          <DialogDescription>
            {step === "form" && "Langkah 1 dari 2 · Data & persetujuan"}
            {step === "capture" && "Langkah 2 dari 2 · Ambil wajah"}
            {step === "done" && "Selesai"}
            {step === "failed" && "Belum berhasil"}
          </DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start(); }}>
            {!existing && !customerId && (
              <>
                <Field label="Nama panggilan" htmlFor="en-name" hint="Nama yang akan disapa kasir.">
                  <Input id="en-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
                </Field>
                <Field label="Nomor HP (opsional)" htmlFor="en-phone" hint="Untuk mencari pelanggan bila wajah tidak terbaca.">
                  <Input id="en-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Field>
              </>
            )}
            <div className="rounded-xl border bg-muted/60 p-4 text-sm">
              <p className="mb-2 flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-success" /> Bacakan kepada pelanggan</p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>Kafe menyimpan <b className="text-foreground">template wajah berupa angka, bukan foto</b>, untuk mengenali Anda di kasir.</li>
                <li>Dipakai untuk riwayat pesanan dan rekomendasi menu Anda.</li>
                <li>Bisa dihapus kapan saja dengan meminta ke kasir; otomatis terhapus bila tidak berkunjung {retention} hari.</li>
                <li>Hanya untuk usia 18 tahun ke atas.</li>
              </ul>
            </div>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3">
              <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[hsl(var(--primary))]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span className="text-sm font-medium">Pelanggan berusia 18+ dan menyetujui penyimpanan data wajah.</span>
            </label>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="xl" className="w-full" disabled={!consent}>
              <ScanFace /> Lanjut ambil wajah
            </Button>
          </form>
        )}

        {step === "capture" && (
          <div className="space-y-4 text-center" aria-live="polite">
            {settings?.devices.stream_url && previewOk ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.devices.stream_url} alt="Pratinjau kamera kasir" onError={() => setPreviewOk(false)}
                className="mx-auto aspect-video w-full rounded-xl bg-black object-cover" />
            ) : (
              <div className="mx-auto flex aspect-video w-full items-center justify-center rounded-xl bg-muted">
                <ScanFace className="h-14 w-14 animate-pulse text-primary" />
              </div>
            )}
            <div>
              <p className="font-semibold">Minta {who || "pelanggan"} menatap kamera kasir</p>
              <p className="text-sm text-muted-foreground">Lepas masker/topi, jangan bergerak sekitar 3 detik…</p>
            </div>
            <div className="mx-auto h-1.5 w-40 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/3 animate-[pulse_1s_ease-in-out_infinite] rounded-full bg-primary" />
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
            <p className="text-lg font-semibold">Wajah {who} tersimpan</p>
            <p className="text-sm text-muted-foreground">Mulai kunjungan berikutnya, {who} dikenali otomatis di kasir.</p>
            <Button size="xl" className="w-full" onClick={() => { onDone?.(customerId!, who); onOpenChange(false); }}>Selesai</Button>
          </div>
        )}

        {step === "failed" && (
          <div className="space-y-4 text-center">
            <XCircle className="mx-auto h-14 w-14 text-destructive" />
            <p className="font-semibold">{message}</p>
            <p className="text-sm text-muted-foreground">Pastikan hanya satu wajah di depan kamera dan pencahayaan cukup.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>Nanti saja</Button>
              <Button size="lg" onClick={() => { setStep("form"); setConsent(true); }}>Coba lagi</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
