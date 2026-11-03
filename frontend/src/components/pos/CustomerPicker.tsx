"use client";

import { useEffect, useState } from "react";
import { Search, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, SegmentBadge } from "@/components/app/bits";
import api from "@/services/api";
import { CustomerListItem } from "@/types";
import { timeAgo } from "@/lib/format";

/** Find a customer by name or phone (fallback when the face is not recognised). */
export function CustomerPicker({ open, onOpenChange, onPick, onGuest }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  onPick: (c: { customer_id: string; name: string }) => void; onGuest: () => void;
}) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<CustomerListItem[] | null>(null);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(async () => {
      try {
        const r = await api.get<{ items: CustomerListItem[] }>(`/customers?limit=8&sort=recent&search=${encodeURIComponent(q)}`);
        setRows(r.data.items);
      } catch { setRows([]); }
    }, 200);
    return () => clearTimeout(id);
  }, [q, open]);
  useEffect(() => { if (open) { setQ(""); setRows(null); } }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pilih pelanggan</DialogTitle>
          <DialogDescription>Cari nama atau nomor HP.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nama atau nomor HP" className="pl-10" />
        </div>
        <ul className="max-h-80 divide-y overflow-y-auto rounded-lg border" aria-busy={rows === null}>
          {rows === null && <li className="p-4 text-sm text-muted-foreground">Mencari…</li>}
          {rows?.length === 0 && <li className="p-4 text-sm text-muted-foreground">Tidak ada pelanggan dengan kata kunci itu.</li>}
          {rows?.map((c) => (
            <li key={c.customer_id}>
              <button className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted"
                onClick={() => { onPick(c); onOpenChange(false); }}>
                <Avatar name={c.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.phone_number ?? "Tanpa no. HP"} · terakhir {timeAgo(c.last_visit)}</p>
                </div>
                <SegmentBadge segment={c.segment} />
              </button>
            </li>
          ))}
        </ul>
        <button onClick={() => { onGuest(); onOpenChange(false); }}
          className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-dashed text-sm font-medium hover:bg-muted">
          <UserRound className="h-4 w-4" /> Lanjut sebagai tamu (tanpa data)
        </button>
      </DialogContent>
    </Dialog>
  );
}
