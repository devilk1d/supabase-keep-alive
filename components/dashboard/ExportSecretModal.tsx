"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Modal } from "@/components/ui/Modal";

interface ExportSecretModalProps {
  open: boolean;
  onClose: () => void;
}

interface ExportTarget {
  name: string;
  url: string;
  anonKey: string;
}

function ExportSecretBody({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawJson, setRawJson] = useState("[]");
  const [targets, setTargets] = useState<ExportTarget[]>([]);
  const [revealKeys, setRevealKeys] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/export-secret", { cache: "no-store" })
      .then(async (res) => {
        const payload = (await res.json()) as {
          json?: string;
          targets?: ExportTarget[];
          error?: string;
        };
        if (!active) return;
        if (!res.ok) {
          setError(payload.error ?? "Failed to generate GitHub secret JSON.");
        } else {
          setRawJson(payload.json ?? "[]");
          setTargets(payload.targets ?? []);
        }
      })
      .catch(() => {
        if (active) setError("Network error while exporting secret payload.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const maskedJson = JSON.stringify(
    targets.map((item) => ({
      name: item.name,
      url: item.url,
      anonKey:
        item.anonKey.length > 14
          ? `${item.anonKey.slice(0, 8)}...${item.anonKey.slice(-6)}`
          : "********",
    })),
    null,
    2
  );

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border-default bg-bg-secondary p-3 text-xs text-text-secondary space-y-1.5">
        <div className="flex items-center gap-2 font-medium text-text-primary">
          <KeyRound className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>GitHub Actions Secret: PROJECTS_CONFIG</span>
        </div>
        <p className="leading-relaxed">
          Includes all active projects decrypted in server memory. Paste the
          copied JSON into your repository under{" "}
          <span className="text-text-primary font-medium">
            Settings &rarr; Secrets and variables &rarr; Actions &rarr; New repository secret
          </span>{" "}
          named <code className="tabular-mono text-text-primary">PROJECTS_CONFIG</code>.
        </p>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-status-crimson/40 bg-status-crimson/5 p-3 text-xs text-status-crimson">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>{error}</span>
        </div>
      ) : loading ? (
        <div className="rounded-md border border-border-default bg-bg-secondary p-6 text-center text-xs text-text-secondary">
          Decrypting active targets in server memory...
        </div>
      ) : (
        <div className="rounded-md border border-border-default bg-bg-secondary overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-default px-3 py-2">
            <span className="tabular-mono text-xs text-text-secondary">
              {targets.length} active project{targets.length === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRevealKeys((prev) => !prev)}
                icon={
                  revealKeys ? (
                    <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} />
                  ) : (
                    <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                  )
                }
              >
                {revealKeys ? "Mask keys" : "Reveal keys"}
              </Button>
              <CopyButton
                text={rawJson}
                label="Copy JSON Secret"
                disabled={targets.length === 0}
              />
            </div>
          </div>
          <pre className="tabular-mono max-h-72 overflow-auto p-3.5 text-xs leading-relaxed text-text-primary">
            <code>{revealKeys ? rawJson : maskedJson}</code>
          </pre>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="primary" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

export function ExportSecretModal({ open, onClose }: ExportSecretModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export GitHub Secret"
      description="Generate the decrypted JSON array for automated 48-hour GitHub Actions runs."
      maxWidthClass="max-w-2xl"
    >
      {open ? <ExportSecretBody onClose={onClose} /> : null}
    </Modal>
  );
}
