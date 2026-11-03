"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ClipboardList, EyeOff, Pencil, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Field, PageHeader, Pill } from "@/components/app/bits";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApi } from "@/hooks/useApi";
import api, { errorMessage } from "@/services/api";
import { cn } from "@/lib/utils";
import { CATEGORY_LABEL, formatRupiah } from "@/lib/format";
import { Menu, MenuCategory } from "@/types";

const CATS: MenuCategory[] = ["COFFEE", "NON_COFFEE", "FOOD", "DESSERT"];
const empty = { name: "", category: "COFFEE" as MenuCategory, price: "", description: "" };

export default function MenusPage() {
  const menus = useApi<Menu[]>("/menus?all=1");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Menu | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const grouped = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = (menus.data ?? []).filter((m) => !term || m.name.toLowerCase().includes(term));
    return CATS.map((c) => ({ cat: c, items: list.filter((m) => m.category === c) })).filter((g) => g.items.length);
  }, [menus.data, q]);

  function openForm(m: Menu | null) {
    setEditing(m);
    setForm(m ? { name: m.name, category: m.category, price: String(m.price), description: m.description ?? "" } : empty);
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    try {
      const payload = { name: form.name, category: form.category, price: Number(form.price), description: form.description };
      if (editing) await api.patch(`/menus/${editing.menu_id}`, payload);
      else await api.post("/menus", payload);
      toast.success(editing ? "Menu diperbarui" : "Menu ditambahkan");
      setOpen(false); menus.reload();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  }

  async function toggle(m: Menu) {
    try {
      await api.patch(`/menus/${m.menu_id}`, { is_active: !m.is_active });
      toast.success(m.is_active ? `${m.name} disembunyikan dari kasir` : `${m.name} dijual lagi`, {
        action: { label: "Urungkan", onClick: () => api.patch(`/menus/${m.menu_id}`, { is_active: m.is_active }).then(menus.reload) },
      });
      menus.reload();
    } catch (e) { toast.error(errorMessage(e)); }
  }

  return (
    <AppShell ownerOnly>
      <PageHeader title="Menu" description="Harga dan menu yang tampil di kasir"
        actions={<Button size="lg" onClick={() => openForm(null)}><Plus /> Tambah menu</Button>} />
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari menu" className="pl-10" />
      </div>

      {menus.loading ? <ListSkeleton rows={8} avatar={false} />
        : menus.error ? <ErrorState message={menus.error} onRetry={menus.reload} />
        : !grouped.length ? <EmptyState icon={ClipboardList} title={q ? "Menu tidak ditemukan" : "Belum ada menu"} action={!q && <Button onClick={() => openForm(null)}><Plus /> Tambah menu</Button>} />
        : (
          <div className="space-y-5">
            {grouped.map((g) => (
              <section key={g.cat}>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{CATEGORY_LABEL[g.cat]} · {g.items.length}</h2>
                <ul className="divide-y rounded-xl border bg-card shadow-sm">
                  {g.items.map((m) => (
                    <li key={m.menu_id} className={cn("flex items-center gap-3 px-4 py-3", !m.is_active && "opacity-60")}>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 font-medium">{m.name} {!m.is_active && <Pill tone="neutral">Disembunyikan</Pill>}</p>
                        {m.description && <p className="truncate text-sm text-muted-foreground">{m.description}</p>}
                      </div>
                      <span className="num w-28 text-right font-semibold">{formatRupiah(m.price)}</span>
                      <Button variant="ghost" size="icon" onClick={() => openForm(m)} aria-label={`Ubah ${m.name}`}><Pencil /></Button>
                      <Button variant="ghost" size="sm" onClick={() => toggle(m)}>
                        {m.is_active ? <><EyeOff /> Sembunyikan</> : "Jual lagi"}
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? `Ubah ${editing.name}` : "Tambah menu"}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <Field label="Nama menu" htmlFor="m-name"><Input id="m-name" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Kategori">
              <div className="grid grid-cols-2 gap-2">
                {CATS.map((c) => (
                  <button key={c} type="button" onClick={() => setForm({ ...form, category: c })} aria-pressed={form.category === c}
                    className={cn("h-11 rounded-lg border-2 text-sm font-semibold", form.category === c ? "border-primary bg-accent" : "border-border")}>
                    {CATEGORY_LABEL[c]}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Harga (Rp)" htmlFor="m-price">
              <Input id="m-price" inputMode="numeric" value={form.price ? Number(form.price).toLocaleString("id-ID") : ""}
                onChange={(e) => setForm({ ...form, price: e.target.value.replace(/\D/g, "") })} placeholder="25.000" />
            </Field>
            <Field label="Deskripsi (opsional)" htmlFor="m-desc"><Input id="m-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" size="lg" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" size="lg" disabled={busy || !form.name.trim() || !Number(form.price)}>{busy ? "Menyimpan…" : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
