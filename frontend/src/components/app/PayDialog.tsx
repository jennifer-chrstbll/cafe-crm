"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, CreditCard, QrCode, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { PaymentMethod } from "@/types";

const METHODS: { value: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "QRIS", label: "QRIS", icon: QrCode },
  { value: "CASH", label: "Tunai", icon: Banknote },
  { value: "DEBIT", label: "Debit", icon: CreditCard },
  { value: "EWALLET", label: "E-wallet", icon: Wallet },
];

/** Quick cash amounts: exact, then the next 10k / 50k / 100k notes above the total. */
function quickAmounts(total: number) {
  const up = (step: number) => Math.ceil(total / step) * step;
  return [...new Set([total, up(10_000), up(50_000), up(100_000)])].filter((v) => v >= total).slice(0, 4);
}

export function PayDialog({ open, onOpenChange, total, title, description, onPay }: {
  open: boolean; onOpenChange: (o: boolean) => void; total: number; title: string;
  description?: string; onPay: (method: PaymentMethod) => Promise<void>;
}) {
  const [method, setMethod] = useState<PaymentMethod>("QRIS");
  const [cash, setCash] = useState<string>("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setCash(""); setBusy(false); } }, [open]);

  const received = Number(cash.replace(/\D/g, "")) || 0;
  const change = received - total;
  const cashOk = method !== "CASH" || received === 0 || change >= 0;
  const quick = useMemo(() => quickAmounts(total), [total]);

  async function submit() {
    if (!cashOk || busy) return;
    setBusy(true);
    try { await onPay(method); onOpenChange(false); } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="rounded-xl bg-muted p-4 text-center">
          <p className="text-sm text-muted-foreground">Total dibayar</p>
          <p className="num text-3xl font-bold tracking-tight">{formatRupiah(total)}</p>
        </div>

        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Metode pembayaran">
          {METHODS.map((m) => (
            <button key={m.value} type="button" role="radio" aria-checked={method === m.value}
              onClick={() => setMethod(m.value)}
              className={cn("flex h-14 items-center justify-center gap-2 rounded-lg border-2 text-base font-semibold transition-colors",
                method === m.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card hover:bg-muted")}>
              <m.icon className="h-5 w-5" /> {m.label}
            </button>
          ))}
        </div>

        {method === "CASH" && (
          <div className="space-y-2">
            <label htmlFor="cash" className="text-sm font-medium">Uang diterima (opsional)</label>
            <input id="cash" inputMode="numeric" value={cash ? Number(cash).toLocaleString("id-ID") : ""}
              onChange={(e) => setCash(e.target.value.replace(/\D/g, ""))} placeholder="0"
              className="num h-12 w-full rounded-lg border border-input bg-card px-3 text-right text-xl font-semibold" />
            <div className="grid grid-cols-4 gap-2">
              {quick.map((q) => (
                <Button key={q} type="button" variant="outline" className="num h-11 px-1 text-xs" onClick={() => setCash(String(q))}>
                  {q === total ? "Uang pas" : `${(q / 1000).toLocaleString("id-ID")} rb`}
                </Button>
              ))}
            </div>
            {received > 0 && (
              <p className={cn("num rounded-lg px-3 py-2 text-base font-semibold", change >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                {change >= 0 ? `Kembalian ${formatRupiah(change)}` : `Kurang ${formatRupiah(-change)}`}
              </p>
            )}
          </div>
        )}

        <Button size="xl" className="w-full" disabled={!cashOk || busy} onClick={submit}>
          {busy ? "Memproses…" : `Terima ${formatRupiah(total)}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
