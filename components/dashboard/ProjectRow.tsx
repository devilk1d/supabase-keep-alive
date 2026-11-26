"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Pause,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type { ProjectSummary } from "@/core/types";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  formatHostOnly,
  formatLatency,
  formatRelativeTime,
  formatTimestamp,
} from "@/lib/utils";

interface ProjectRowProps {
  project: ProjectSummary;
  pinging: boolean;
  toggling: boolean;
  deleting: boolean;
  onPing: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}

function getStatusBadge(project: ProjectSummary): {
  tone: BadgeTone;
  label: string;
} {
  if (!project.enabled) {
    return { tone: "neutral", label: "Paused" };
  }
  if (project.lastStatus === null) {
    return { tone: "neutral", label: "Pending" };
  }
  if (project.lastStatus === "failed") {
    return { tone: "crimson", label: "Error" };
  }
  if (project.lastLatencyMs !== null && project.lastLatencyMs > 2000) {
    return { tone: "amber", label: "Slow" };
  }
  return { tone: "emerald", label: "Healthy" };
}

export function ProjectRow({
  project,
  pinging,
  toggling,
  deleting,
  onPing,
  onToggleEnabled,
  onDelete,
}: ProjectRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const badge = getStatusBadge(project);

  return (
    <>
      <tr className="project-summary-row border-b border-border-default transition-colors hover:bg-bg-secondary/70">
        <th scope="row" className="px-4 py-3 text-left font-medium align-middle">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              aria-label={`Toggle ping logs for ${project.name}`}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-transparent text-text-muted hover:border-border-default hover:bg-bg-elevated hover:text-text-primary cursor-pointer"
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              )}
            </button>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-text-primary">
                {project.name}
              </div>
              <div
                className="tabular-mono truncate text-xs text-text-muted"
                title={project.url}
              >
                {formatHostOnly(project.url)}
              </div>
            </div>
          </div>
        </th>

        <td data-label="Status" className="px-4 py-3 align-middle whitespace-nowrap">
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </td>

        <td
          data-label="HTTP"
          className="tabular-mono px-4 py-3 align-middle text-xs text-text-secondary whitespace-nowrap"
        >
          {project.lastHttpStatus !== null ? project.lastHttpStatus : "--"}
        </td>

        <td
          data-label="Latency"
          className="tabular-mono px-4 py-3 align-middle text-xs text-text-primary whitespace-nowrap"
        >
          {formatLatency(project.lastLatencyMs)}
        </td>

        <td
          data-label="Last Ping"
          className="tabular-mono px-4 py-3 align-middle text-xs text-text-secondary whitespace-nowrap"
          title={formatTimestamp(project.lastPingAt)}
        >
          {formatRelativeTime(project.lastPingAt)}
        </td>

        <td data-label="Actions" className="px-4 py-3 align-middle text-right">
          <div className="inline-flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              loading={pinging}
              disabled={deleting}
              onClick={() => onPing(project.id)}
              icon={<RefreshCw className="h-3 w-3" strokeWidth={1.5} />}
            >
              Ping
            </Button>

            <Button
              size="sm"
              variant="ghost"
              loading={toggling}
              disabled={pinging || deleting}
              onClick={() => onToggleEnabled(project.id, !project.enabled)}
              aria-label={
                project.enabled
                  ? `Pause ${project.name}`
                  : `Resume ${project.name}`
              }
              title={
                project.enabled
                  ? "Exclude from Ping All & Secret Export"
                  : "Include in Ping All & Secret Export"
              }
              icon={
                project.enabled ? (
                  <Pause className="h-3.5 w-3.5" strokeWidth={1.5} />
                ) : (
                  <Play className="h-3.5 w-3.5" strokeWidth={1.5} />
                )
              }
            >
              {project.enabled ? "Pause" : "Enable"}
            </Button>

            {confirmDelete ? (
              <div className="inline-flex items-center gap-1">
                <Button
                  size="sm"
                  variant="danger"
                  loading={deleting}
                  onClick={() => onDelete(project.id)}
                >
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={deleting}
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                disabled={pinging || toggling || deleting}
                onClick={() => setConfirmDelete(true)}
                aria-label={`Delete ${project.name}`}
                icon={<Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />}
              />
            )}
          </div>
        </td>
      </tr>

      {expanded ? (
        <tr className="border-b border-border-default bg-bg-secondary/60">
          <td colSpan={6} className="px-4 py-3">
            <div className="space-y-2.5 pl-0 sm:pl-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-text-primary">
                  Recent Ping Log History ({project.logs.length})
                </span>
                {project.lastMessage ? (
                  <span className="tabular-mono text-xs text-text-secondary">
                    Latest: {project.lastMessage}
                  </span>
                ) : null}
              </div>

              {project.logs.length === 0 ? (
                <div className="rounded-md border border-border-default bg-bg-primary px-3 py-2.5 text-xs text-text-muted">
                  No ping attempts recorded yet. Click Ping to test this target.
                </div>
              ) : (
                <div className="rounded-md border border-border-default bg-bg-primary divide-y divide-border-default">
                  {project.logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                            log.status === "success"
                              ? "bg-status-emerald"
                              : "bg-status-crimson"
                          }`}
                          aria-hidden="true"
                        />
                        <span className="tabular-mono text-text-secondary whitespace-nowrap">
                          {formatTimestamp(log.createdAt)}
                        </span>
                        <span className="text-text-primary truncate">
                          {log.message}
                        </span>
                      </div>
                      <div className="tabular-mono flex items-center gap-3 text-text-secondary whitespace-nowrap">
                        <span>
                          {log.httpStatus !== null ? `HTTP ${log.httpStatus}` : "NO_HTTP"}
                        </span>
                        <span className="text-text-primary">{log.latencyMs} ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
