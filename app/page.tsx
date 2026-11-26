import { Suspense } from "react";
import { connection } from "next/server";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { listProjectsWithLogs } from "@/lib/db";

async function DashboardLoader() {
  await connection();
  const projects = listProjectsWithLogs();
  return <DashboardClient initialProjects={projects} />;
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="border-b border-border-default px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-[34px] w-[34px] rounded-md bg-bg-elevated" />
            <div className="space-y-1.5">
              <div className="h-4 w-40 rounded bg-bg-elevated" />
              <div className="h-3 w-64 rounded bg-bg-elevated" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-24 rounded bg-bg-elevated" />
            <div className="h-8 w-24 rounded bg-bg-elevated" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        <div className="h-16 rounded-lg border border-border-default bg-bg-secondary" />
        <div className="h-56 rounded-lg border border-border-default bg-bg-secondary" />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardLoader />
    </Suspense>
  );
}
