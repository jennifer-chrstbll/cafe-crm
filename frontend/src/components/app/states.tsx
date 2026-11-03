"use client";

import { AlertTriangle, Lock, RefreshCw } from "lucide-react";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Loading, empty and error states. Rules (docs/UX_RATIONALE.md §5):
 *  - skeletons have the SAME shape as the content they replace (no layout jump),
 *  - every empty state says what it means and offers the next action,
 *  - every error says what happened in plain words and offers "Coba lagi".
 */
export function FullPageLoader({ label = "Memuat…" }: { label?: string }) {
  return (
    <div className="flex h-dvh items-center justify-center bg-background" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-primary/25 border-t-primary" />
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action, className }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card/60 px-6 py-12 text-center", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        {text && <p className="mx-auto max-w-sm text-sm text-muted-foreground">{text}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center", className)}>
      <AlertTriangle className="h-6 w-6 text-destructive" />
      <p className="max-w-md text-sm font-medium text-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw /> Coba lagi
        </Button>
      )}
    </div>
  );
}

export function Forbidden() {
  return (
    <EmptyState icon={Lock} title="Khusus pemilik kafe"
      text="Halaman ini berisi data bisnis. Minta pemilik kafe untuk membukanya." />
  );
}

/* ── Skeletons shaped like the real content ─────────────────────────────── */

export function StatGridSkeleton({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-8 w-32" />
          <Skeleton className="mt-2 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 6, avatar = true }: { rows?: number; avatar?: boolean }) {
  return (
    <div className="divide-y rounded-xl border bg-card" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          {avatar && <Skeleton className="h-10 w-10 rounded-full" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ n = 6, className }: { n?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4", className)} aria-hidden>
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-64 w-full rounded-xl", className)} aria-hidden />;
}
