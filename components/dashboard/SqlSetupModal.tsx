"use client";

import { Database } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Modal } from "@/components/ui/Modal";
import { KEEP_ALIVE_SQL } from "@/lib/utils";

interface SqlSetupModalProps {
  open: boolean;
  onClose: () => void;
}

export function SqlSetupModal({ open, onClose }: SqlSetupModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Supabase SQL Setup"
      description="Create an isolated single-row table (public._keep_alive) with Row Level Security locked to id = 1."
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="rounded-md border border-border-default bg-bg-secondary p-3 text-xs text-text-secondary space-y-1.5">
          <div className="flex items-center gap-2 font-medium text-text-primary">
            <Database className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Non-destructive target preparation</span>
          </div>
          <p className="leading-relaxed">
            Run this script once in each Supabase project&apos;s SQL Editor. Pings
            perform an idempotent UPSERT on <code className="tabular-mono text-text-primary">id = 1</code> using
            your anon public key without reading or altering application tables.
          </p>
        </div>

        <div className="rounded-md border border-border-default bg-bg-secondary overflow-hidden">
          <div className="flex items-center justify-between border-b border-border-default px-3 py-2">
            <span className="tabular-mono text-xs text-text-secondary">
              public._keep_alive.sql
            </span>
            <CopyButton text={KEEP_ALIVE_SQL} label="Copy SQL" />
          </div>
          <pre className="tabular-mono overflow-x-auto p-3.5 text-xs leading-relaxed text-text-primary">
            <code>{KEEP_ALIVE_SQL}</code>
          </pre>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
