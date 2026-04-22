import { readFile } from "node:fs/promises";
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

const inputArg = process.argv.find((value) => value.startsWith("--input="));
const inputPath = inputArg ? inputArg.slice("--input=".length) : process.argv[2];

if (!inputPath) {
  process.stderr.write(
    "Provide a backup file path: npm run restore:freedom-memory -- --input=.local-data/backups/freedom-memory/latest.json\n",
  );
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  process.stderr.write(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Restore aborted.\n",
  );
  process.exit(1);
}

const snapshot = JSON.parse(await readFile(path.resolve(process.cwd(), inputPath), "utf8"));
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function upsertTable(table, rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }

  const { error } = await supabase.from(table).upsert(rows);
  if (error) {
    throw error;
  }
}

await upsertTable("freedom_voice_tasks", snapshot.memory?.tasks ?? []);
await upsertTable("freedom_learning_signals", snapshot.memory?.learningSignals ?? []);
await upsertTable("freedom_programming_requests", snapshot.memory?.programmingRequests ?? []);

process.stdout.write(
  `Freedom memory restored from ${path.resolve(process.cwd(), inputPath)}\n`,
);
