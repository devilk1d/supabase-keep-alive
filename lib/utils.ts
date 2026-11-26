import { normalizeSupabaseUrl } from "@/core/pinger";

export const KEEP_ALIVE_SQL = `-- Non-destructive keep-alive table for Supabase Keep-Alive
-- Isolates pings to a single locked row (id = 1) with strict anon RLS.

CREATE TABLE IF NOT EXISTS public._keep_alive (
  id integer PRIMARY KEY CHECK (id = 1),
  last_ping timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public._keep_alive (id, last_ping)
VALUES (1, now())
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public._keep_alive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_anon_keep_alive_select" ON public._keep_alive;
CREATE POLICY "allow_anon_keep_alive_select"
  ON public._keep_alive
  FOR SELECT
  TO anon
  USING (id = 1);

DROP POLICY IF EXISTS "allow_anon_keep_alive_insert" ON public._keep_alive;
CREATE POLICY "allow_anon_keep_alive_insert"
  ON public._keep_alive
  FOR INSERT
  TO anon
  WITH CHECK (id = 1);

DROP POLICY IF EXISTS "allow_anon_keep_alive_update" ON public._keep_alive;
CREATE POLICY "allow_anon_keep_alive_update"
  ON public._keep_alive
  FOR UPDATE
  TO anon
  USING (id = 1)
  WITH CHECK (id = 1);

GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public._keep_alive TO anon;`;

export interface ValidatedProjectInput {
  name: string;
  url: string;
  anonKey: string;
  enabled: boolean;
}

export function validateProjectInput(body: unknown): ValidatedProjectInput {
  if (typeof body !== "object" || body === null) {
    throw new Error("Request body must be a JSON object.");
  }

  const record = body as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const rawUrl = typeof record.url === "string" ? record.url.trim() : "";
  const anonKey =
    typeof record.anonKey === "string" ? record.anonKey.trim() : "";
  const enabled =
    typeof record.enabled === "boolean" ? record.enabled : true;

  if (name.length < 1 || name.length > 80) {
    throw new Error("Project name must be between 1 and 80 characters.");
  }

  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeSupabaseUrl(rawUrl);
  } catch {
    throw new Error("Enter a valid Supabase project URL (https://...).");
  }

  if (anonKey.length < 20) {
    throw new Error("Enter a valid Supabase anon public key.");
  }

  return {
    name,
    url: normalizedUrl,
    anonKey,
    enabled,
  };
}

export function formatTimestamp(iso: string | null): string {
  if (!iso) return "Never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";

  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 10) return "Just now";
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function formatLatency(ms: number | null): string {
  if (ms === null || Number.isNaN(ms)) return "--";
  return `${ms} ms`;
}

export function formatHostOnly(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
