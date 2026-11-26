import { KEEP_ALIVE_TABLE, type KeepAliveTarget, type PingResult } from "./types";

const DEFAULT_TIMEOUT_MS = 15_000;

interface PostgrestErrorPayload {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

export function normalizeSupabaseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/\/+$/, "");
  const parsed = new URL(trimmed);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Supabase URL must start with https:// or http://");
  }
  return `${parsed.protocol}//${parsed.host}${parsed.pathname === "/" ? "" : parsed.pathname}`;
}

async function parseErrorBody(response: Response): Promise<string> {
  const fallback = response.statusText || "Request failed";
  try {
    const text = await response.text();
    if (!text) return fallback;
    const parsed = JSON.parse(text) as PostgrestErrorPayload;
    const parts = [parsed.message, parsed.hint, parsed.code].filter(
      (part): part is string => typeof part === "string" && part.length > 0
    );
    return parts.length > 0 ? parts.join(" | ") : text.slice(0, 200);
  } catch {
    return fallback;
  }
}

function formatFailureMessage(httpStatus: number, detail: string): string {
  if (
    httpStatus === 404 ||
    detail.includes("PGRST205") ||
    detail.includes("42P01")
  ) {
    return `HTTP ${httpStatus}: Table public.${KEEP_ALIVE_TABLE} not found. Run the SQL setup snippet in Supabase.`;
  }
  if (httpStatus === 401 || httpStatus === 403 || detail.includes("42501")) {
    return `HTTP ${httpStatus}: Invalid anon key or RLS policy blocks id=1 upsert.`;
  }
  return `HTTP ${httpStatus}: ${detail}`;
}

export async function pingSupabaseTarget(
  target: KeepAliveTarget,
  options?: { timeoutMs?: number }
): Promise<PingResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timestamp = new Date().toISOString();

  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeSupabaseUrl(target.url);
  } catch (err) {
    return {
      id: target.id,
      name: target.name,
      url: target.url,
      status: "failed",
      httpStatus: null,
      latencyMs: 0,
      message: err instanceof Error ? err.message : "Invalid Supabase URL",
      timestamp,
    };
  }

  const endpoint = `${normalizedUrl}/rest/v1/${KEEP_ALIVE_TABLE}?on_conflict=id`;
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: target.anonKey,
        Authorization: `Bearer ${target.anonKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        id: 1,
        last_ping: timestamp,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));

    if (response.ok) {
      return {
        id: target.id,
        name: target.name,
        url: normalizedUrl,
        status: "success",
        httpStatus: response.status,
        latencyMs,
        message: `Upserted id=1 (${response.status})`,
        timestamp,
      };
    }

    const detail = await parseErrorBody(response);
    return {
      id: target.id,
      name: target.name,
      url: normalizedUrl,
      status: "failed",
      httpStatus: response.status,
      latencyMs,
      message: formatFailureMessage(response.status, detail),
      timestamp,
    };
  } catch (err) {
    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      id: target.id,
      name: target.name,
      url: normalizedUrl,
      status: "failed",
      httpStatus: null,
      latencyMs,
      message: isTimeout
        ? `Request timed out after ${timeoutMs}ms`
        : err instanceof Error
          ? err.message
          : "Network request failed",
      timestamp,
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export async function pingTargetsConcurrently(
  targets: KeepAliveTarget[],
  options?: { timeoutMs?: number }
): Promise<PingResult[]> {
  const settled = await Promise.allSettled(
    targets.map((target) => pingSupabaseTarget(target, options))
  );

  return settled.map((outcome, index) => {
    if (outcome.status === "fulfilled") {
      return outcome.value;
    }
    const target = targets[index];
    return {
      id: target.id,
      name: target.name,
      url: target.url,
      status: "failed",
      httpStatus: null,
      latencyMs: 0,
      message:
        outcome.reason instanceof Error
          ? outcome.reason.message
          : "Unexpected ping error",
      timestamp: new Date().toISOString(),
    };
  });
}
