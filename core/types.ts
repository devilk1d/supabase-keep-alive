export type PingStatus = "success" | "failed";

export interface KeepAliveTarget {
  id?: string;
  name: string;
  url: string;
  anonKey: string;
  enabled?: boolean;
}

export interface PingResult {
  id?: string;
  name: string;
  url: string;
  status: PingStatus;
  httpStatus: number | null;
  latencyMs: number;
  message: string;
  timestamp: string;
}

export interface PingLogRecord {
  id: number;
  projectId: string;
  status: PingStatus;
  httpStatus: number | null;
  latencyMs: number;
  message: string;
  createdAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  lastPingAt: string | null;
  lastStatus: PingStatus | null;
  lastHttpStatus: number | null;
  lastLatencyMs: number | null;
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
  logs: PingLogRecord[];
}

export interface NotifierConfig {
  discordWebhookUrl?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
}

export const KEEP_ALIVE_TABLE = "_keep_alive";
