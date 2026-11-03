"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Coffee, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/app/bits";
import { homeFor, useAuth } from "@/contexts/AuthContext";
import { errorMessage } from "@/services/api";

function LoginForm() {
  const { login, user, isLoading } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace(next && next.startsWith("/") ? next : homeFor(user));
  }, [isLoading, user, next, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      router.replace(next && next.startsWith("/") ? next : homeFor(u));
    } catch (err) {
      setError(errorMessage(err, "Gagal masuk."));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-2xl border bg-card p-8 shadow-sm" noValidate>
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Coffee className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-xl font-bold">Masuk ke Kafe CRM</h1>
          <p className="text-sm text-muted-foreground">Gunakan akun kasir atau pemilik.</p>
        </div>
      </div>

      <Field label="Email" htmlFor="email">
        <Input id="email" type="email" autoComplete="username" autoFocus required value={email}
          onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} />
      </Field>

      <Field label="Kata sandi" htmlFor="password" error={capsLock ? "Caps Lock menyala" : null}>
        <div className="relative">
          <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error} className="pr-12"
            onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))} />
          <button type="button" onClick={() => setShow((s) => !s)}
            className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </Field>

      {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={busy || !email || !password}>
        {busy ? <><Loader2 className="animate-spin" /> Memeriksa…</> : "Masuk"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Lupa kata sandi? Minta pemilik kafe meresetnya di menu Staf.</p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
