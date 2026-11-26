import { NextResponse } from "next/server";
import { notifyFailures } from "@/core/notifier";
import { pingTargetsConcurrently } from "@/core/pinger";
import {
  getDecryptedActiveTargets,
  listProjectsWithLogs,
  recordPingResult,
} from "@/lib/db";

export async function POST() {
  try {
    const targets = getDecryptedActiveTargets();
    if (targets.length === 0) {
      return NextResponse.json({
        results: [],
        projects: listProjectsWithLogs(),
      });
    }

    const results = await pingTargetsConcurrently(targets);
    for (const result of results) {
      if (result.id) {
        recordPingResult(result.id, result);
      }
    }

    const failures = results.filter((item) => item.status === "failed");
    if (failures.length > 0) {
      await notifyFailures(failures);
    }

    return NextResponse.json({
      results,
      projects: listProjectsWithLogs(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Batch ping failed.",
      },
      { status: 500 }
    );
  }
}
