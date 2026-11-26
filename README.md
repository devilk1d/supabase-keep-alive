# Supabase Keep-Alive

An open-source, privacy-first automation and monitoring tool that prevents Supabase free-tier projects from pausing after 7 days of inactivity.

Built with a single-repository, local-first architecture requiring zero cloud hosting:

- **Automated Background Worker (GitHub Actions):** Pings all configured projects every 48 hours (`0 0 */2 * *`) via `npx tsx scripts/ping-headless.ts` using a single `PROJECTS_CONFIG` repository secret.
- **Local-First Dashboard (`localhost:3000`):** Optional Next.js + SQLite web interface to manage projects, encrypt keys at rest with AES-256-GCM, run live connection tests, inspect latency logs, and export the `PROJECTS_CONFIG` JSON secret.

---

## Architecture Overview

```text
supabase-keep-alive/
├── .github/workflows/keep-alive.yml   # 48h cron + manual workflow_dispatch
├── app/                               # Next.js App Router dashboard and API routes
├── components/                        # Monochrome UI primitives and dashboard modals
├── core/
│   ├── pinger.ts                      # Shared Supabase REST UPSERT and latency timer
│   ├── notifier.ts                    # Optional Discord and Telegram failure webhooks
│   └── types.ts                       # Shared domain TypeScript types
├── lib/
│   ├── crypto.ts                      # AES-256-GCM encryption and decryption utilities
│   ├── db.ts                          # Auto-migrating SQLite schema via Drizzle ORM
│   └── utils.ts                       # Validation, formatting, and SQL snippet
├── scripts/
│   └── ping-headless.ts               # CLI runner for GitHub Actions
├── docker-compose.yml                 # One-command local container setup
└── .env.example                       # Environment template
```

---

## Step 1: Prepare Each Supabase Project (Non-Destructive SQL)

Run the following SQL once in your Supabase project's **SQL Editor**. It creates an isolated `public._keep_alive` table restricted to a single row (`id = 1`) with Row Level Security policies scoped strictly to `anon`. No existing application tables or user data are read or modified.

```sql
CREATE TABLE IF NOT EXISTS public._keep_alive (
  id integer PRIMARY KEY CHECK (id = 1),
  last_ping timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public._keep_alive (id, last_ping)
VALUES (1, now())
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public._keep_alive ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = '_keep_alive'
      AND policyname = 'allow_anon_keep_alive_select'
  ) THEN
    CREATE POLICY "allow_anon_keep_alive_select"
      ON public._keep_alive
      FOR SELECT
      TO anon
      USING (id = 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = '_keep_alive'
      AND policyname = 'allow_anon_keep_alive_insert'
  ) THEN
    CREATE POLICY "allow_anon_keep_alive_insert"
      ON public._keep_alive
      FOR INSERT
      TO anon
      WITH CHECK (id = 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = '_keep_alive'
      AND policyname = 'allow_anon_keep_alive_update'
  ) THEN
    CREATE POLICY "allow_anon_keep_alive_update"
      ON public._keep_alive
      FOR UPDATE
      TO anon
      USING (id = 1)
      WITH CHECK (id = 1);
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public._keep_alive TO anon;
```

---

## Mode 1: Automated GitHub Actions (Headless Mode)

Use this mode if you want zero local uptime and fully automated 48-hour pings on GitHub's runners.

1. Fork or clone this repository to your GitHub account.
2. Open your repository on GitHub and navigate to **Settings -> Secrets and variables -> Actions**.
3. Create a new repository secret named `PROJECTS_CONFIG` containing a JSON array of your Supabase targets:

```json
[
  {
    "name": "production-core",
    "url": "https://your-project-ref.supabase.co",
    "anonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  {
    "name": "staging-app",
    "url": "https://your-staging-ref.supabase.co",
    "anonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
]
```

4. Optionally add alert secrets if you want failure notifications:
   - `DISCORD_WEBHOOK_URL`
   - `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
5. Go to **Actions -> Supabase Keep-Alive** and click **Run workflow** to verify immediately. Thereafter, the workflow executes automatically every 48 hours (`0 0 */2 * *`).

You can also test the headless runner locally:

```bash
PROJECTS_CONFIG='[{"name":"demo","url":"https://your-ref.supabase.co","anonKey":"your-anon-key"}]' npx tsx scripts/ping-headless.ts
```

---

## Mode 2: Local-First Dashboard (`localhost:3000`)

Use the local dashboard to manage projects visually, test live connections before saving, inspect per-project ping logs, and generate your `PROJECTS_CONFIG` secret with one click.

### Prerequisites

- Node.js 20+ (tested with Node 22 and Node 26)

### Quick Start

```bash
npm install
cp .env.example .env.local
```

Generate a persistent 32-byte encryption key (optional; if omitted, `.env.local` is provisioned automatically on first boot):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Start the dashboard:

```bash
npm run dev
```

Open `http://localhost:3000`.

### Dashboard Capabilities

- **Auto-Initialized SQLite (`local.db`):** Tables `projects` and `ping_logs` are created automatically on first request with no manual migration step.
- **AES-256-GCM Secret Storage:** Every `anonKey` is encrypted with a random 12-byte IV and GCM authentication tag before hitting disk, and decrypted only in server memory during pings or secret export.
- **Live Connection Tester:** Validate URL, anon key, and `public._keep_alive` RLS permissions directly inside the **Add Project** modal before saving.
- **Expandable Log Drawer:** Inspect recent HTTP status codes, round-trip latency (`ms`), and diagnostic messages per project.
- **Export GitHub Secret Bridge:** Click **Export Secret** to format all active projects into clean JSON ready to paste into `PROJECTS_CONFIG`.

---

## Mode 3: Docker Compose

Run the local dashboard in an isolated container with persistent SQLite storage:

```bash
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") docker compose up --build -d
```

The dashboard will be available at `http://localhost:3000`, with SQLite persisted in the `keep_alive_data` Docker volume.

---

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `ENCRYPTION_KEY` | Recommended | 64-character hex key (32 bytes) for AES-256-GCM encryption of `anonKey` values in SQLite. |
| `DATABASE_PATH` | Optional | Path to the SQLite database file (defaults to `./local.db`). |
| `DISCORD_WEBHOOK_URL` | Optional | Discord webhook URL notified when any ping fails. |
| `TELEGRAM_BOT_TOKEN` | Optional | Telegram bot token used with `TELEGRAM_CHAT_ID` for failure alerts. |
| `TELEGRAM_CHAT_ID` | Optional | Target Telegram chat ID for failure alerts. |
| `PROJECTS_CONFIG` | GitHub Actions only | JSON array of `{ name, url, anonKey }` targets used by `scripts/ping-headless.ts`. |

---

## Verification Commands

```bash
npm run lint
npx tsc --noEmit
npm run build
```
