import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { desc, eq, inArray } from "drizzle-orm";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type {
  KeepAliveTarget,
  PingLogRecord,
  PingResult,
  PingStatus,
  ProjectSummary,
} from "@/core/types";
import { decryptSecret, encryptSecret } from "./crypto";

export const projectsTable = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  encryptedAnonKey: text("encrypted_anon_key").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  lastPingAt: text("last_ping_at"),
  lastStatus: text("last_status"),
  lastHttpStatus: integer("last_http_status"),
  lastLatencyMs: integer("last_latency_ms"),
  lastMessage: text("last_message"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const pingLogsTable = sqliteTable("ping_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: text("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  httpStatus: integer("http_status"),
  latencyMs: integer("latency_ms").notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull(),
});

const schema = {
  projects: projectsTable,
  pingLogs: pingLogsTable,
};

type AppDatabase = BetterSQLite3Database<typeof schema>;

interface GlobalDbHolder {
  __keepAliveSqlite?: Database.Database;
  __keepAliveDrizzle?: AppDatabase;
}

const globalForDb = globalThis as unknown as GlobalDbHolder;

const MAX_LOGS_PER_PROJECT = 50;

function resolveDbPath(): string {
  const configured = process.env.DATABASE_PATH?.trim();
  if (!configured) {
    return path.join(process.cwd(), "local.db");
  }
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(/*turbopackIgnore: true*/ process.cwd(), configured);
}

function initializeSqlite(): { sqlite: Database.Database; db: AppDatabase } {
  if (globalForDb.__keepAliveSqlite && globalForDb.__keepAliveDrizzle) {
    return {
      sqlite: globalForDb.__keepAliveSqlite,
      db: globalForDb.__keepAliveDrizzle,
    };
  }

  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      encrypted_anon_key TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_ping_at TEXT,
      last_status TEXT,
      last_http_status INTEGER,
      last_latency_ms INTEGER,
      last_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ping_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      http_status INTEGER,
      latency_ms INTEGER NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ping_logs_project_created
      ON ping_logs(project_id, created_at DESC, id DESC);
  `);

  const db = drizzle(sqlite, { schema });
  globalForDb.__keepAliveSqlite = sqlite;
  globalForDb.__keepAliveDrizzle = db;

  return { sqlite, db };
}

function getDb(): AppDatabase {
  return initializeSqlite().db;
}

function toProjectSummary(
  row: typeof projectsTable.$inferSelect,
  logs: PingLogRecord[]
): ProjectSummary {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    enabled: row.enabled,
    lastPingAt: row.lastPingAt,
    lastStatus: (row.lastStatus as PingStatus | null) ?? null,
    lastHttpStatus: row.lastHttpStatus,
    lastLatencyMs: row.lastLatencyMs,
    lastMessage: row.lastMessage,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    logs,
  };
}

function toPingLogRecord(row: typeof pingLogsTable.$inferSelect): PingLogRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    status: row.status as PingStatus,
    httpStatus: row.httpStatus,
    latencyMs: row.latencyMs,
    message: row.message,
    createdAt: row.createdAt,
  };
}

export function listProjectsWithLogs(logsPerProject = 15): ProjectSummary[] {
  const db = getDb();
  const projectRows = db
    .select()
    .from(projectsTable)
    .orderBy(projectsTable.createdAt)
    .all();

  if (projectRows.length === 0) return [];

  const projectIds = projectRows.map((p) => p.id);
  const logRows = db
    .select()
    .from(pingLogsTable)
    .where(inArray(pingLogsTable.projectId, projectIds))
    .orderBy(desc(pingLogsTable.createdAt), desc(pingLogsTable.id))
    .all();

  const logsByProject = new Map<string, PingLogRecord[]>();
  for (const log of logRows) {
    const bucket = logsByProject.get(log.projectId) ?? [];
    if (bucket.length < logsPerProject) {
      bucket.push(toPingLogRecord(log));
      logsByProject.set(log.projectId, bucket);
    }
  }

  return projectRows.map((row) =>
    toProjectSummary(row, logsByProject.get(row.id) ?? [])
  );
}

export function getProjectSummaryById(
  id: string,
  logsLimit = 15
): ProjectSummary | null {
  const db = getDb();
  const row = db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, id))
    .get();

  if (!row) return null;

  const logs = db
    .select()
    .from(pingLogsTable)
    .where(eq(pingLogsTable.projectId, id))
    .orderBy(desc(pingLogsTable.createdAt), desc(pingLogsTable.id))
    .limit(logsLimit)
    .all()
    .map(toPingLogRecord);

  return toProjectSummary(row, logs);
}

export function createProject(input: {
  name: string;
  url: string;
  anonKey: string;
  enabled?: boolean;
}): ProjectSummary {
  const db = getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const encryptedAnonKey = encryptSecret(input.anonKey);

  db.insert(projectsTable)
    .values({
      id,
      name: input.name,
      url: input.url,
      encryptedAnonKey,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const created = getProjectSummaryById(id);
  if (!created) {
    throw new Error("Failed to read created project.");
  }
  return created;
}

export function updateProject(
  id: string,
  patch: {
    name?: string;
    url?: string;
    anonKey?: string;
    enabled?: boolean;
  }
): ProjectSummary | null {
  const db = getDb();
  const existing = db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, id))
    .get();

  if (!existing) return null;

  const updates: Partial<typeof projectsTable.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };

  if (patch.name !== undefined) updates.name = patch.name;
  if (patch.url !== undefined) updates.url = patch.url;
  if (patch.enabled !== undefined) updates.enabled = patch.enabled;
  if (patch.anonKey !== undefined && patch.anonKey.length > 0) {
    updates.encryptedAnonKey = encryptSecret(patch.anonKey);
  }

  db.update(projectsTable).set(updates).where(eq(projectsTable.id, id)).run();
  return getProjectSummaryById(id);
}

export function deleteProject(id: string): boolean {
  const db = getDb();
  const result = db
    .delete(projectsTable)
    .where(eq(projectsTable.id, id))
    .run();
  return result.changes > 0;
}

export function getDecryptedTargetById(id: string): KeepAliveTarget | null {
  const db = getDb();
  const row = db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, id))
    .get();

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    url: row.url,
    anonKey: decryptSecret(row.encryptedAnonKey),
    enabled: row.enabled,
  };
}

export function getDecryptedActiveTargets(): KeepAliveTarget[] {
  const db = getDb();
  const rows = db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.enabled, true))
    .orderBy(projectsTable.createdAt)
    .all();

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    url: row.url,
    anonKey: decryptSecret(row.encryptedAnonKey),
    enabled: row.enabled,
  }));
}

export function recordPingResult(projectId: string, result: PingResult): void {
  const { sqlite, db } = initializeSqlite();

  const tx = sqlite.transaction(() => {
    db.insert(pingLogsTable)
      .values({
        projectId,
        status: result.status,
        httpStatus: result.httpStatus,
        latencyMs: result.latencyMs,
        message: result.message,
        createdAt: result.timestamp,
      })
      .run();

    db.update(projectsTable)
      .set({
        lastPingAt: result.timestamp,
        lastStatus: result.status,
        lastHttpStatus: result.httpStatus,
        lastLatencyMs: result.latencyMs,
        lastMessage: result.message,
        updatedAt: result.timestamp,
      })
      .where(eq(projectsTable.id, projectId))
      .run();

    // Trim older logs per project to keep the local SQLite database compact.
    sqlite
      .prepare(
        `DELETE FROM ping_logs
         WHERE project_id = ?
           AND id NOT IN (
             SELECT id FROM ping_logs
             WHERE project_id = ?
             ORDER BY created_at DESC, id DESC
             LIMIT ?
           )`
      )
      .run(projectId, projectId, MAX_LOGS_PER_PROJECT);
  });

  tx();
}
