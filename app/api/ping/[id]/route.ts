import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { notifyFailures } from "@/core/notifier";
import { pingSupabaseTarget } from "@/core/pinger";
import {
  getDecryptedTargetById,
  getProjectSummaryById,
  recordPingResult,
} from "@/lib/db";

export async function POST(
  _request: NextRequest,
  ctx: RouteContext<"/api/ping/[id]">
) {
  try {
    const { id } = await ctx.params;
    const target = getDecryptedTargetById(id);

    if (!target) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const result = await pingSupabaseTarget(target);
    recordPingResult(id, result);

    if (result.status === "failed") {
      await notifyFailures([result]);
    }

    const project = getProjectSummaryById(id);
    return NextResponse.json({ result, project });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to ping project.",
      },
      { status: 500 }
    );
  }
}
