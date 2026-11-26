import { notifyFailures } from "../core/notifier";
import { pingTargetsConcurrently } from "../core/pinger";
import type { KeepAliveTarget } from "../core/types";

function parseProjectsConfig(raw: string | undefined): KeepAliveTarget[] {
  if (!raw || raw.trim().length === 0) {
    throw new Error("Missing PROJECTS_CONFIG environment variable.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("PROJECTS_CONFIG is not valid JSON.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("PROJECTS_CONFIG must be a JSON array.");
  }

  return parsed.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new Error(`PROJECTS_CONFIG[${index}] must be an object.`);
    }
    const item = entry as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const url = typeof item.url === "string" ? item.url.trim() : "";
    const anonKey = typeof item.anonKey === "string" ? item.anonKey.trim() : "";
    const enabled =
      typeof item.enabled === "boolean" ? item.enabled : true;

    if (!name || !url || !anonKey) {
      throw new Error(
        `PROJECTS_CONFIG[${index}] requires non-empty name, url, and anonKey strings.`
      );
    }

    return { name, url, anonKey, enabled };
  });
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  console.log(`[keep-alive] Starting headless ping run at ${startedAt}`);

  let targets: KeepAliveTarget[];
  try {
    targets = parseProjectsConfig(process.env.PROJECTS_CONFIG).filter(
      (project) => project.enabled !== false
    );
  } catch (err) {
    console.error(
      `[keep-alive] Configuration error: ${err instanceof Error ? err.message : "Invalid configuration"}`
    );
    process.exit(1);
  }

  if (targets.length === 0) {
    console.log("[keep-alive] No active projects configured. Exiting.");
    process.exit(0);
  }

  console.log(`[keep-alive] Pinging ${targets.length} active project(s)...`);
  const results = await pingTargetsConcurrently(targets);

  for (const result of results) {
    const tag = result.status === "success" ? "OK" : "FAIL";
    const statusText =
      result.httpStatus !== null ? `HTTP ${result.httpStatus}` : "NO_HTTP";
    console.log(
      `[${tag}] ${result.name} | ${statusText} | ${result.latencyMs}ms | ${result.url} | ${result.message}`
    );
  }

  const failures = results.filter((result) => result.status === "failed");
  const succeeded = results.length - failures.length;

  console.log(
    `[keep-alive] Summary: ${succeeded}/${results.length} succeeded, ${failures.length} failed`
  );

  if (failures.length > 0) {
    const notification = await notifyFailures(failures);
    if (notification.sent.length > 0) {
      console.log(
        `[keep-alive] Failure alerts delivered via: ${notification.sent.join(", ")}`
      );
    }
    if (notification.errors.length > 0) {
      for (const err of notification.errors) {
        console.error(`[keep-alive] Alert error: ${err}`);
      }
    }
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(
    `[keep-alive] Fatal runner error: ${err instanceof Error ? err.message : "Unknown error"}`
  );
  process.exit(1);
});
