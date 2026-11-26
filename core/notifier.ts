import type { NotifierConfig, PingResult } from "./types";

function resolveNotifierConfig(override?: NotifierConfig): NotifierConfig {
  return {
    discordWebhookUrl:
      override?.discordWebhookUrl ?? process.env.DISCORD_WEBHOOK_URL?.trim(),
    telegramBotToken:
      override?.telegramBotToken ?? process.env.TELEGRAM_BOT_TOKEN?.trim(),
    telegramChatId:
      override?.telegramChatId ?? process.env.TELEGRAM_CHAT_ID?.trim(),
  };
}

function buildFailureReport(failures: PingResult[]): string {
  const lines = [
    `Supabase Keep-Alive Alert: ${failures.length} project(s) failed`,
    "",
    ...failures.map((item) => {
      const code = item.httpStatus !== null ? `HTTP ${item.httpStatus}` : "NO_HTTP";
      return `- ${item.name} (${item.url}) | ${code} | ${item.latencyMs}ms | ${item.message}`;
    }),
  ];
  return lines.join("\n");
}

export async function notifyFailures(
  failures: PingResult[],
  overrideConfig?: NotifierConfig
): Promise<{ sent: string[]; errors: string[] }> {
  if (failures.length === 0) {
    return { sent: [], errors: [] };
  }

  const config = resolveNotifierConfig(overrideConfig);
  const report = buildFailureReport(failures);
  const sent: string[] = [];
  const errors: string[] = [];

  if (config.discordWebhookUrl) {
    try {
      const response = await fetch(config.discordWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "Supabase Keep-Alive",
          content: `\`\`\`\n${report.slice(0, 1900)}\n\`\`\``,
        }),
      });
      if (!response.ok) {
        errors.push(`Discord webhook returned HTTP ${response.status}`);
      } else {
        sent.push("discord");
      }
    } catch (err) {
      errors.push(
        `Discord webhook error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  if (config.telegramBotToken && config.telegramChatId) {
    try {
      const endpoint = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: config.telegramChatId,
          text: report.slice(0, 4000),
          disable_web_page_preview: true,
        }),
      });
      if (!response.ok) {
        errors.push(`Telegram API returned HTTP ${response.status}`);
      } else {
        sent.push("telegram");
      }
    } catch (err) {
      errors.push(
        `Telegram notification error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  return { sent, errors };
}
