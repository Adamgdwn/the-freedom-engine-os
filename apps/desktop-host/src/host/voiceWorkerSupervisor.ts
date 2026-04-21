import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";

const RESTART_DELAY_MS = 2_000;

function envFlagEnabled(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  return fallback;
}

function hasRequiredVoiceWorkerEnv(env: NodeJS.ProcessEnv): boolean {
  return Boolean(
    env.LIVEKIT_URL?.trim() &&
      env.LIVEKIT_API_KEY?.trim() &&
      env.LIVEKIT_API_SECRET?.trim() &&
      env.OPENAI_API_KEY?.trim(),
  );
}

export class VoiceWorkerSupervisor {
  private process: ChildProcessWithoutNullStreams | null = null;
  private restartTimer: NodeJS.Timeout | null = null;
  private stopping = false;

  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  start(): void {
    if (!envFlagEnabled(this.env.DESKTOP_VOICE_WORKER_AUTOSTART, true)) {
      process.stdout.write("[voice-worker] autostart disabled by DESKTOP_VOICE_WORKER_AUTOSTART.\n");
      return;
    }

    if (!hasRequiredVoiceWorkerEnv(this.env)) {
      process.stdout.write("[voice-worker] autostart skipped because LiveKit/OpenAI env is incomplete.\n");
      return;
    }

    if (this.process) {
      return;
    }

    this.stopping = false;
    this.spawnWorker();
  }

  stop(): void {
    this.stopping = true;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    if (!this.process) {
      return;
    }

    const child = this.process;
    this.process = null;
    child.kill("SIGTERM");
  }

  private spawnWorker(): void {
    if (this.process || this.stopping) {
      return;
    }

    const workerDir = path.resolve(process.cwd(), "..", "..", "agents", "freedom_agent");
    const explicitCommand = this.env.DESKTOP_VOICE_WORKER_COMMAND?.trim();
    const command = explicitCommand ?? "uv run --with-requirements requirements.txt agent.py dev";
    const child = spawn("/bin/bash", ["-lc", command], {
      cwd: workerDir,
      env: this.env,
      stdio: "pipe",
    });

    this.process = child;
    process.stdout.write(
      `[voice-worker] starting ${explicitCommand ? "custom command" : command}\n`,
    );

    child.stdout.on("data", (chunk) => {
      process.stdout.write(`[voice-worker] ${chunk.toString()}`);
    });
    child.stderr.on("data", (chunk) => {
      process.stderr.write(`[voice-worker] ${chunk.toString()}`);
    });
    child.on("error", (error) => {
      process.stderr.write(`[voice-worker] failed to start: ${error.message}\n`);
    });
    child.on("exit", (code, signal) => {
      const expected = this.stopping;
      this.process = null;
      if (expected) {
        process.stdout.write("[voice-worker] stopped.\n");
        return;
      }

      process.stderr.write(
        `[voice-worker] exited unexpectedly with code ${code ?? "null"} signal ${signal ?? "null"}; restarting.\n`,
      );
      this.restartTimer = setTimeout(() => {
        this.restartTimer = null;
        this.spawnWorker();
      }, RESTART_DELAY_MS);
    });
  }
}
