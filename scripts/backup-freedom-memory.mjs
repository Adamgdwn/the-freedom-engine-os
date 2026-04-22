import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

for (const envPath of [
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), ".env"),
]) {
  dotenv.config({ path: envPath, override: true });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  process.stderr.write(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Backup aborted.\n",
  );
  process.exit(1);
}

const backupDir = path.resolve(
  process.cwd(),
  process.env.FREEDOM_MEMORY_BACKUP_DIR ?? ".local-data/backups/freedom-memory",
);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function fetchTable(table, columns) {
  const { data, error } = await supabase.from(table).select(columns).order("updated_at", {
    ascending: false,
  });
  if (error) {
    throw error;
  }
  return data ?? [];
}

const snapshot = {
  exportedAt: new Date().toISOString(),
  source: {
    supabaseUrl,
    projectRef: process.env.SUPABASE_PROJECT_REF ?? null,
  },
  memory: {
    tasks: await fetchTable(
      "freedom_voice_tasks",
      "id, topic, status, summary, created_at, updated_at",
    ),
    learningSignals: await fetchTable(
      "freedom_learning_signals",
      "id, topic, summary, kind, status, created_at, updated_at",
    ),
    programmingRequests: await fetchTable(
      "freedom_programming_requests",
      "id, capability, reason, status, created_at, updated_at",
    ),
  },
};

await mkdir(backupDir, { recursive: true });

const stamp = snapshot.exportedAt.replaceAll(":", "-");
const backupPath = path.join(backupDir, `freedom-memory-${stamp}.json`);
const latestPath = path.join(backupDir, "latest.json");

await writeFile(backupPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
await writeFile(latestPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

process.stdout.write(`Freedom memory backup written to ${backupPath}\n`);
