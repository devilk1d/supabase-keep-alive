"use client";

import { useState, type FormEvent } from "react";
import { Activity, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import type { PingResult, ProjectSummary } from "@/core/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface AddProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: ProjectSummary) => void;
}

function AddProjectForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (project: ProjectSummary) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<PingResult | null>(null);

  async function handleTestConnection() {
    setFormError(null);
    setTestResult(null);
    setTesting(true);

    try {
      const response = await fetch("/api/projects/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || "Connection Test", url, anonKey }),
      });

      const data = (await response.json()) as {
        result?: PingResult;
        error?: string;
      };

      if (!response.ok || !data.result) {
        setFormError(data.error ?? "Connection test failed.");
      } else {
        setTestResult(data.result);
      }
    } catch {
      setFormError("Unable to reach local test endpoint.");
    } finally {
      setTesting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, anonKey, enabled: true }),
      });

      const data = (await response.json()) as {
        project?: ProjectSummary;
        error?: string;
      };

      if (!response.ok || !data.project) {
        setFormError(data.error ?? "Failed to save project.");
        return;
      }

      onCreated(data.project);
      onClose();
    } catch {
      setFormError("Network error while saving project.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="project-name"
          className="block text-xs font-medium text-text-primary"
        >
          Project Name
        </label>
        <input
          id="project-name"
          type="text"
          required
          autoFocus
          maxLength={80}
          placeholder="production-core"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="project-url"
          className="block text-xs font-medium text-text-primary"
        >
          Supabase Project URL
        </label>
        <input
          id="project-url"
          type="url"
          required
          placeholder="https://your-project-ref.supabase.co"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setTestResult(null);
          }}
          className="tabular-mono w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="project-anon-key"
          className="block text-xs font-medium text-text-primary"
        >
          Anon Public Key
        </label>
        <div className="relative">
          <input
            id="project-anon-key"
            type={showKey ? "text" : "password"}
            required
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            value={anonKey}
            onChange={(e) => {
              setAnonKey(e.target.value);
              setTestResult(null);
            }}
            className="tabular-mono w-full rounded-md border border-border-default bg-bg-primary py-2 pl-3 pr-9 text-xs text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowKey((prev) => !prev)}
            aria-label={showKey ? "Hide anon key" : "Show anon key"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-muted hover:text-text-primary cursor-pointer"
          >
            {showKey ? (
              <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} />
            ) : (
              <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
          </button>
        </div>
        <p className="text-[11px] text-text-muted">
          Encrypted with AES-256-GCM before persisting to local SQLite.
        </p>
      </div>

      {formError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-status-crimson/40 bg-status-crimson/5 px-3 py-2 text-xs text-status-crimson"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>{formError}</span>
        </div>
      ) : null}

      {testResult ? (
        <div
          role="status"
          className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
            testResult.status === "success"
              ? "border-status-emerald/40 bg-status-emerald/5 text-text-primary"
              : "border-status-crimson/40 bg-status-crimson/5 text-status-crimson"
          }`}
        >
          {testResult.status === "success" ? (
            <CheckCircle2
              className="h-4 w-4 shrink-0 mt-0.5 text-status-emerald"
              strokeWidth={1.5}
            />
          ) : (
            <AlertCircle
              className="h-4 w-4 shrink-0 mt-0.5 text-status-crimson"
              strokeWidth={1.5}
            />
          )}
          <div className="min-w-0 space-y-0.5">
            <div className="tabular-mono font-medium">
              {testResult.status === "success" ? "CONNECTED" : "FAILED"} |{" "}
              {testResult.httpStatus !== null
                ? `HTTP ${testResult.httpStatus}`
                : "NO_HTTP"}{" "}
              | {testResult.latencyMs} ms
            </div>
            <p className="text-text-secondary break-words">
              {testResult.message}
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-default pt-4">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={testing}
          disabled={saving || !url.trim() || !anonKey.trim()}
          onClick={handleTestConnection}
          icon={<Activity className="h-3.5 w-3.5" strokeWidth={1.5} />}
        >
          Test Connection
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={saving || testing}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={saving}
            disabled={testing}
          >
            Save Project
          </Button>
        </div>
      </div>
    </form>
  );
}

export function AddProjectModal({
  open,
  onClose,
  onCreated,
}: AddProjectModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Supabase Project"
      description="Register a project target locally and verify the public._keep_alive upsert before saving."
      maxWidthClass="max-w-lg"
    >
      {open ? <AddProjectForm onClose={onClose} onCreated={onCreated} /> : null}
    </Modal>
  );
}
