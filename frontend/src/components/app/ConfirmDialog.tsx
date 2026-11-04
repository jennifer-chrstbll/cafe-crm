"use client";

import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Confirmation for destructive or irreversible actions only (Nielsen #5 error prevention).
 * The confirm button repeats the verb ("Hapus data wajah"), never a bare "OK".
 */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm, destructive = true, children, confirmDisabled = false }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: ReactNode;
  confirmLabel: string; onConfirm: () => Promise<void> | void; destructive?: boolean; children?: ReactNode;
  confirmDisabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)} disabled={busy}>Batal</Button>
          <Button variant={destructive ? "destructive" : "default"} size="lg" disabled={busy || confirmDisabled}
            onClick={async () => {
              setBusy(true);
              try { await onConfirm(); onOpenChange(false); } finally { setBusy(false); }
            }}>
            {busy ? "Memproses…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
