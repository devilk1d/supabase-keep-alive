"use client";

import { Database, Plus } from "lucide-react";
import type { ProjectSummary } from "@/core/types";
import { Button } from "@/components/ui/Button";
import { ProjectRow } from "./ProjectRow";

interface ProjectTableProps {
  projects: ProjectSummary[];
  pingingIds: Set<string>;
  togglingIds: Set<string>;
  deletingIds: Set<string>;
  onPing: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onOpenAdd: () => void;
  onOpenSqlSetup: () => void;
}

export function ProjectTable({
  projects,
  pingingIds,
  togglingIds,
  deletingIds,
  onPing,
  onToggleEnabled,
  onDelete,
  onOpenAdd,
  onOpenSqlSetup,
}: ProjectTableProps) {
  if (projects.length === 0) {
    return (
      <section
        aria-labelledby="empty-projects-heading"
        className="rounded-lg border border-border-default bg-bg-secondary px-6 py-12 text-center"
      >
        <div className="mx-auto max-w-md space-y-4">
          <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-md border border-border-default bg-bg-primary text-text-primary">
            <Database className="h-4 w-4" strokeWidth={1.5} />
          </div>
          <div className="space-y-1.5">
            <h2
              id="empty-projects-heading"
              className="text-sm font-semibold text-text-primary"
            >
              No Supabase projects registered
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              Run the isolated <code className="tabular-mono text-text-primary">_keep_alive</code> SQL
              snippet in your Supabase project first, then add its URL and anon
              key here to test and export <code className="tabular-mono text-text-primary">PROJECTS_CONFIG</code>.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={onOpenSqlSetup}
              icon={<Database className="h-3.5 w-3.5" strokeWidth={1.5} />}
            >
              View SQL Setup
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={onOpenAdd}
              icon={<Plus className="h-3.5 w-3.5" strokeWidth={1.5} />}
            >
              Add Project
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="rounded-lg border border-border-default bg-bg-primary overflow-hidden">
      <div
        tabIndex={0}
        role="region"
        aria-labelledby="projects-table-heading"
        className="projects-table-region"
      >
        <table className="projects-table w-full border-collapse text-left">
          <caption id="projects-table-heading" className="sr-only">
            Registered Supabase keep-alive targets and latest ping metrics
          </caption>
          <thead>
            <tr className="border-b border-border-default bg-bg-secondary text-[11px] font-medium uppercase tracking-wider text-text-muted">
              <th scope="col" className="px-4 py-2.5">
                Project
              </th>
              <th scope="col" className="px-4 py-2.5">
                Status
              </th>
              <th scope="col" className="px-4 py-2.5">
                HTTP
              </th>
              <th scope="col" className="px-4 py-2.5">
                Latency
              </th>
              <th scope="col" className="px-4 py-2.5">
                Last Ping
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                pinging={pingingIds.has(project.id)}
                toggling={togglingIds.has(project.id)}
                deleting={deletingIds.has(project.id)}
                onPing={onPing}
                onToggleEnabled={onToggleEnabled}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
