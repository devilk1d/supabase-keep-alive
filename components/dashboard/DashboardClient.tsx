"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  KeyRound,
  Moon,
  Plus,
  RefreshCw,
  Sun,
} from "lucide-react";
import type { PingResult, ProjectSummary } from "@/core/types";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { AddProjectModal } from "./AddProjectModal";
import { ExportSecretModal } from "./ExportSecretModal";
import { ProjectTable } from "./ProjectTable";
import { SqlSetupModal } from "./SqlSetupModal";

interface DashboardClientProps {
  initialProjects: ProjectSummary[];
}

interface Notice {
  tone: "success" | "error";
  text: string;
}

export function DashboardClient({ initialProjects }: DashboardClientProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>(initialProjects);
  const [pingingAll, setPingingAll] = useState(false);
  const [pingingIds, setPingingIds] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");

  function toggleTheme() {
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const currentEffective =
      theme === "system" ? (prefersDark ? "dark" : "light") : theme;
    const nextTheme = currentEffective === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  }

  async function handlePingSingle(id: string) {
    setNotice(null);
    setPingingIds((prev) => new Set(prev).add(id));

    try {
      const response = await fetch(`/api/ping/${id}`, { method: "POST" });
      const data = (await response.json()) as {
        result?: PingResult;
        project?: ProjectSummary;
        error?: string;
      };

      if (!response.ok || !data.project || !data.result) {
        setNotice({
          tone: "error",
          text: data.error ?? "Failed to ping project.",
        });
        return;
      }

      setProjects((prev) =>
        prev.map((item) => (item.id === id ? data.project! : item))
      );

      setNotice({
        tone: data.result.status === "success" ? "success" : "error",
        text: `${data.result.name}: ${data.result.message} (${data.result.latencyMs} ms)`,
      });
    } catch {
      setNotice({
        tone: "error",
        text: "Network error while pinging project.",
      });
    } finally {
      setPingingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handlePingAll() {
    setNotice(null);
    setPingingAll(true);

    try {
      const response = await fetch("/api/ping-all", { method: "POST" });
      const data = (await response.json()) as {
        results?: PingResult[];
        projects?: ProjectSummary[];
        error?: string;
      };

      if (!response.ok || !data.projects || !data.results) {
        setNotice({
          tone: "error",
          text: data.error ?? "Batch ping failed.",
        });
        return;
      }

      setProjects(data.projects);

      if (data.results.length === 0) {
        setNotice({
          tone: "error",
          text: "No active projects enabled to ping.",
        });
        return;
      }

      const failed = data.results.filter((r) => r.status === "failed").length;
      const passed = data.results.length - failed;
      setNotice({
        tone: failed === 0 ? "success" : "error",
        text: `Batch ping finished: ${passed}/${data.results.length} succeeded, ${failed} failed.`,
      });
    } catch {
      setNotice({
        tone: "error",
        text: "Network error during batch ping.",
      });
    } finally {
      setPingingAll(false);
    }
  }

  async function handleToggleEnabled(id: string, enabled: boolean) {
    setNotice(null);
    setTogglingIds((prev) => new Set(prev).add(id));

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      const data = (await response.json()) as {
        project?: ProjectSummary;
        error?: string;
      };

      if (!response.ok || !data.project) {
        setNotice({
          tone: "error",
          text: data.error ?? "Failed to update project status.",
        });
        return;
      }

      setProjects((prev) =>
        prev.map((item) => (item.id === id ? data.project! : item))
      );
    } catch {
      setNotice({
        tone: "error",
        text: "Network error while updating project.",
      });
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleDelete(id: string) {
    setNotice(null);
    setDeletingIds((prev) => new Set(prev).add(id));

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setNotice({
          tone: "error",
          text: data.error ?? "Failed to delete project.",
        });
        return;
      }
      setProjects((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setNotice({
        tone: "error",
        text: "Network error while deleting project.",
      });
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  const activeCount = projects.filter((p) => p.enabled).length;
  const healthyCount = projects.filter(
    (p) => p.enabled && p.lastStatus === "success"
  ).length;
  const failingCount = projects.filter(
    (p) => p.enabled && p.lastStatus === "failed"
  ).length;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <header className="border-b border-border-default bg-bg-primary">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Logo size={34} />
            <div className="min-w-0">
              <h1 className="text-base font-semibold tracking-tight text-text-primary">
                Supabase Keep-Alive
              </h1>
              <p className="mt-0.5 text-xs text-text-secondary">
                Local SQLite monitor and GitHub Actions secret bridge
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              title="Toggle light or dark mode"
              icon={
                theme === "dark" ? (
                  <Sun className="h-3.5 w-3.5" strokeWidth={1.5} />
                ) : (
                  <Moon className="h-3.5 w-3.5" strokeWidth={1.5} />
                )
              }
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSqlModalOpen(true)}
              icon={<Database className="h-3.5 w-3.5" strokeWidth={1.5} />}
            >
              SQL Setup
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setExportModalOpen(true)}
              icon={<KeyRound className="h-3.5 w-3.5" strokeWidth={1.5} />}
            >
              Export Secret
            </Button>
            <Button
              size="sm"
              variant="secondary"
              loading={pingingAll}
              disabled={activeCount === 0}
              onClick={handlePingAll}
              icon={<RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />}
            >
              Ping All
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setAddModalOpen(true)}
              icon={<Plus className="h-3.5 w-3.5" strokeWidth={1.5} />}
            >
              Add Project
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        <section
          aria-label="Fleet overview"
          className="grid grid-cols-2 divide-x divide-y rounded-lg border border-border-default bg-bg-secondary sm:grid-cols-4 sm:divide-y-0"
        >
          <div className="px-4 py-3">
            <div className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
              Active Targets
            </div>
            <div className="tabular-mono mt-1 text-lg font-semibold text-text-primary">
              {activeCount}
              <span className="text-xs font-normal text-text-muted">
                /{projects.length}
              </span>
            </div>
          </div>

          <div className="px-4 py-3">
            <div className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
              Healthy
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full bg-status-emerald"
                aria-hidden="true"
              />
              <span className="tabular-mono text-lg font-semibold text-text-primary">
                {healthyCount}
              </span>
            </div>
          </div>

          <div className="px-4 py-3">
            <div className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
              Failing
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  failingCount > 0 ? "bg-status-crimson" : "bg-text-muted"
                }`}
                aria-hidden="true"
              />
              <span className="tabular-mono text-lg font-semibold text-text-primary">
                {failingCount}
              </span>
            </div>
          </div>

          <div className="px-4 py-3">
            <div className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
              Actions Cadence
            </div>
            <div className="tabular-mono mt-1 text-sm font-medium text-text-primary">
              0 0 */2 * * (48h)
            </div>
          </div>
        </section>

        {notice ? (
          <div
            role="status"
            className={`flex items-center justify-between gap-3 rounded-md border px-3.5 py-2.5 text-xs ${
              notice.tone === "success"
                ? "border-border-default bg-bg-secondary text-text-primary"
                : "border-status-crimson/40 bg-status-crimson/5 text-status-crimson"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {notice.tone === "success" ? (
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-status-emerald"
                  strokeWidth={1.5}
                />
              ) : (
                <AlertCircle
                  className="h-4 w-4 shrink-0 text-status-crimson"
                  strokeWidth={1.5}
                />
              )}
              <span className="truncate">{notice.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-text-muted hover:text-text-primary cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <ProjectTable
          projects={projects}
          pingingIds={pingingIds}
          togglingIds={togglingIds}
          deletingIds={deletingIds}
          onPing={handlePingSingle}
          onToggleEnabled={handleToggleEnabled}
          onDelete={handleDelete}
          onOpenAdd={() => setAddModalOpen(true)}
          onOpenSqlSetup={() => setSqlModalOpen(true)}
        />
      </main>

      <AddProjectModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onCreated={(project) => {
          setProjects((prev) => [...prev, project]);
          setNotice({
            tone: "success",
            text: `Registered "${project.name}" in local SQLite.`,
          });
        }}
      />

      <SqlSetupModal
        open={sqlModalOpen}
        onClose={() => setSqlModalOpen(false)}
      />

      <ExportSecretModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />
    </div>
  );
}
