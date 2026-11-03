"use client";

import { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Crown, Repeat, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials, SEGMENT_LABEL } from "@/lib/format";

/** Page title block: what this page is for, plus at most one primary action. */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className, bodyClassName }: {
  title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card shadow-sm", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          {typeof title === "string" ? <h2 className="font-semibold">{title}</h2> : title}
          {action}
        </div>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/** KPI card: label, big number, and context (comparison) so the number means something. */
export function StatCard({ label, value, hint, delta, icon: Icon, tone = "default", onClick }: {
  label: string; value: ReactNode; hint?: ReactNode; delta?: number | null;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "default" | "warning" | "success"; onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp onClick={onClick}
      className={cn("rounded-xl border bg-card p-4 text-left shadow-sm transition-colors",
        onClick && "hover:border-primary/40 hover:bg-accent/40",
        tone === "warning" && "border-warning/40 bg-warning/5",
        tone === "success" && "border-success/30")}>
      <div className="flex items-center justify-between gap-2 text-sm font-medium text-muted-foreground">
        <span>{label}</span>
        {Icon && <Icon className="h-4 w-4" />}
      </div>
      <div className="num mt-2 text-2xl font-bold tracking-tight">{value}</div>
      {(hint || delta != null) && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          {delta != null && Number.isFinite(delta) && (
            <span className={cn("inline-flex items-center font-semibold", delta >= 0 ? "text-success" : "text-destructive")}>
              {delta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(Math.round(delta * 100))}%
            </span>
          )}
          {hint}
        </div>
      )}
    </Comp>
  );
}

const SEGMENT_STYLE: Record<string, { cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  VIP: { cls: "bg-primary/10 text-primary", icon: Crown },
  Regular: { cls: "bg-info/10 text-info", icon: Repeat },
  New: { cls: "bg-success/10 text-success", icon: Sparkles },
};

/** Segment = icon + word + colour (never colour alone, for colour-blind users). */
export function SegmentBadge({ segment, className }: { segment: string; className?: string }) {
  const s = SEGMENT_STYLE[segment] ?? SEGMENT_STYLE.New;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", s.cls, className)}>
      <s.icon className="h-3 w-3" /> {SEGMENT_LABEL[segment] ?? segment}
    </span>
  );
}

export function Pill({ tone, children, className }: {
  tone: "success" | "warning" | "danger" | "info" | "neutral"; children: ReactNode; className?: string;
}) {
  const cls = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
    neutral: "bg-muted text-muted-foreground",
  }[tone];
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", cls, className)}>{children}</span>;
}

/** Initials avatar. No face photos are stored or shown (privacy by design). */
export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const s = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg", xl: "h-20 w-20 text-2xl" }[size];
  return (
    <div aria-hidden className={cn("flex shrink-0 items-center justify-center rounded-full bg-accent font-bold text-accent-foreground", s, className)}>
      {initials(name)}
    </div>
  );
}

/** Segmented control (tabs-like toggle) with large touch targets. */
export function Segmented<T extends string>({ value, onChange, options, className, size = "md" }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string; size?: "md" | "lg";
}) {
  return (
    <div role="radiogroup" className={cn("inline-flex rounded-lg bg-muted p-1", className)}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={cn("flex-1 rounded-md px-3 text-sm font-semibold transition-colors",
            size === "lg" ? "h-11" : "h-9",
            value === o.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, error, children, htmlFor }: {
  label: string; hint?: string; error?: string | null; children: ReactNode; htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
