"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, MoreVertical, UserCog, UserPlus } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Avatar, Field, PageHeader, Pill, Segmented } from "@/components/app/bits";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import api, { errorMessage } from "@/services/api";
import { timeAgo } from "@/lib/format";
import { User } from "@/types";

export default function StaffPage() {
  const { user: me } = useAuth();
  const users = useApi<User[]>("/users");
  const [adding, setAdding] = useState(false);
  const [resetFor, setResetFor] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "CASHIER" as "CASHIER" | "OWNER" });
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      await api.post("/users", form);
      toast.success(`Akun ${form.name} dibuat`, { description: "Berikan email dan kata sandi ke staf tersebut." });
      setAdding(false); setForm({ name: "", email: "", password: "", role: "CASHIER" }); users.reload();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  }
  async function patch(u: User, body: Record<string, unknown>, msg: string) {
    try { await api.patch(`/users/${u.user_id}`, body); toast.success(msg); users.reload(); }
    catch (e) { toast.error(errorMessage(e)); }
  }

  return (
    <AppShell ownerOnly>
      <PageHeader title="Staf" description="Akun yang bisa masuk ke aplikasi"
        actions={<Button size="lg" onClick={() => setAdding(true)}><UserPlus /> Tambah staf</Button>} />

      {users.loading ? <ListSkeleton rows={4} />
        : users.error ? <ErrorState message={users.error} onRetry={users.reload} />
        : !users.data?.length ? <EmptyState icon={UserCog} title="Belum ada staf" />
        : (
          <ul className="divide-y rounded-xl border bg-card shadow-sm">
            {users.data.map((u) => (
              <li key={u.user_id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={u.name} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {u.name} {u.user_id === me?.user_id && <Pill tone="info">Anda</Pill>}
                    {!u.is_active && <Pill tone="neutral">Nonaktif</Pill>}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{u.email} · masuk terakhir {timeAgo(u.last_login)}</p>
                </div>
                <Pill tone={u.role === "CASHIER" ? "neutral" : "info"}>{u.role === "CASHIER" ? "Kasir" : "Pemilik"}</Pill>
                {u.user_id !== me?.user_id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted" aria-label={`Aksi untuk ${u.name}`}>
                      <MoreVertical className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="h-10" onSelect={() => { setPw(""); setResetFor(u); }}><KeyRound className="mr-2 h-4 w-4" /> Reset kata sandi</DropdownMenuItem>
                      <DropdownMenuItem className="h-10" onSelect={() => patch(u, { role: u.role === "CASHIER" ? "OWNER" : "CASHIER" }, "Peran diubah")}>
                        Jadikan {u.role === "CASHIER" ? "pemilik" : "kasir"}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="h-10 text-destructive focus:text-destructive" onSelect={() => patch(u, { is_active: !u.is_active }, u.is_active ? "Akun dinonaktifkan" : "Akun diaktifkan")}>
                        {u.is_active ? "Nonaktifkan akun" : "Aktifkan akun"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </li>
            ))}
          </ul>
        )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah staf</DialogTitle><DialogDescription>Kasir hanya melihat menu operasional; pemilik melihat semua.</DialogDescription></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create(); }}>
            <Field label="Nama" htmlFor="s-name"><Input id="s-name" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Email" htmlFor="s-email"><Input id="s-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Kata sandi awal" htmlFor="s-pw" hint="Minimal 8 karakter.">
              <Input id="s-pw" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="off" />
            </Field>
            <Field label="Peran"><Segmented size="lg" className="w-full" value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={[{ value: "CASHIER", label: "Kasir" }, { value: "OWNER", label: "Pemilik" }]} /></Field>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" size="lg" onClick={() => setAdding(false)}>Batal</Button>
              <Button type="submit" size="lg" disabled={busy || !form.name || !form.email || form.password.length < 8}>{busy ? "Menyimpan…" : "Buat akun"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetFor} onOpenChange={(o) => !o && setResetFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset kata sandi {resetFor?.name}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); if (resetFor) { await patch(resetFor, { password: pw }, "Kata sandi direset"); setResetFor(null); } }}>
            <Field label="Kata sandi baru" htmlFor="r-pw" hint="Minimal 8 karakter."><Input id="r-pw" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="off" /></Field>
            <DialogFooter className="gap-2"><Button type="button" variant="outline" size="lg" onClick={() => setResetFor(null)}>Batal</Button><Button type="submit" size="lg" disabled={pw.length < 8}>Simpan</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
