import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createWriteStream, rmSync, type WriteStream } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const RESTART_DELAY_MS = 2_000;
const ORPHAN_SHUTDOWN_GRACE_MS = 1_500;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const DEFAULT_WORKER_DIR = path.join(REPO_ROOT, "agents", "freedom_agent");

interface VoiceWorkerLockState {
  command: string;
  logPath: string;
  startedAt: string;
  status: "starting" | "running" | "restarting";
  supervisorPid: number;
  workerPid: number | null;
}

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
  private readonly dataDir: string;
  private readonly voiceWorkerDir: string;
  private readonly lockPath: string;
  private readonly logPath: string;
  private logStream: WriteStream | null = null;
  private lockState: VoiceWorkerLockState | null = null;

  constructor(dataDir = ".local-data/desktop", private readonly env: NodeJS.ProcessEnv = process.env) {
    this.dataDir = dataDir;
    this.voiceWorkerDir = path.join(this.dataDir, "voice-worker");
    this.lockPath = path.join(this.voiceWorkerDir, "worker.lock.json");
    this.logPath = path.join(this.voiceWorkerDir, "worker.log");
    process.once("exit", () => {
      this.handleProcessExit();
    });
  }

  async start(): Promise<void> {
    if (!envFlagEnabled(this.env.DESKTOP_VOICE_WORKER_AUTOSTART, true)) {
      await this.ensureArtifacts();
      this.log("autostart disabled by DESKTOP_VOICE_WORKER_AUTOSTART.");
      return;
    }

    if (!hasRequiredVoiceWorkerEnv(this.env)) {
      await this.ensureArtifacts();
      this.log("autostart skipped because LiveKit/OpenAI env is incomplete.");
      return;
    }

    if (this.process) {
      return;
    }

    await this.ensureArtifacts();
    this.stopping = false;

    const explicitCommand = this.env.DESKTOP_VOICE_WORKER_COMMAND?.trim();
    const command = explicitCommand ?? "uv run --with-requirements requirements.txt agent.py dev";
    if (!(await this.acquireLock(command))) {
      return;
    }

    this.spawnWorker(command, explicitCommand);
  }

  stop(): void {
    this.stopping = true;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    if (!this.process) {
      this.clearLockSync();
      this.closeLogStream();
      return;
    }

    const child = this.process;
    this.process = null;
    child.kill("SIGTERM");
  }

  private spawnWorker(command: string, explicitCommand: string | undefined): void {
    if (this.process || this.stopping) {
      return;
    }

    const shell = this.env.SHELL?.trim() || process.env.SHELL?.trim() || "bash";
    const child = spawn(shell, ["-lc", command], {
      cwd: DEFAULT_WORKER_DIR,
      env: this.env,
      stdio: "pipe",
    });

    this.process = child;
    void this.writeLock({
      ...(this.lockState ?? this.createLockState(command)),
      status: "running",
      workerPid: child.pid ?? null,
    });
    this.log(`starting ${explicitCommand ? "custom command" : command}`);

    child.stdout.on("data", (chunk) => {
      this.writeChunk("stdout", chunk.toString());
    });
    child.stderr.on("data", (chunk) => {
      this.writeChunk("stderr", chunk.toString());
    });
    child.on("error", (error) => {
      this.log(`failed to start: ${error.message}`, "stderr");
    });
    child.on("exit", (code, signal) => {
      const expected = this.stopping;
      this.process = null;
      if (expected) {
        this.log("stopped.");
        this.clearLockSync();
        return;
      }

      void this.writeLock({
        ...(this.lockState ?? this.createLockState(command)),
        status: "restarting",
        workerPid: null,
      });
      this.log(
        `exited unexpectedly with code ${code ?? "null"} signal ${signal ?? "null"}; restarting.`,
        "stderr",
      );
      this.restartTimer = setTimeout(() => {
        this.restartTimer = null;
        this.spawnWorker(command, explicitCommand);
      }, RESTART_DELAY_MS);
    });
  }

  private async ensureArtifacts(): Promise<void> {
    await mkdir(this.voiceWorkerDir, { recursive: true });
    if (!this.logStream) {
      this.logStream = createWriteStream(this.logPath, { flags: "a" });
      this.logStream.on("error", () => {
        // Keep the supervisor alive even if the log sink disappears.
      });
    }
  }

  private async acquireLock(command: string): Promise<boolean> {
    const desiredState = this.createLockState(command);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await writeFile(this.lockPath, JSON.stringify(desiredState, null, 2), {
          encoding: "utf8",
          flag: "wx",
        });
        this.lockState = desiredState;
        this.log(`worker log: ${this.logPath}`);
        return true;
      } catch (error) {
        if (!isFileExistsError(error)) {
          this.log(`failed to acquire worker lock: ${String(error)}`, "stderr");
          return false;
        }

        const existing = await this.readLock();
        if (!existing) {
          await rm(this.lockPath, { force: true });
          continue;
        }

        if (existing.supervisorPid === process.pid) {
          this.lockState = existing;
          return true;
        }

        const supervisorAlive = isPidAlive(existing.supervisorPid);
        if (supervisorAlive) {
          this.log(
            `autostart skipped because desktop host pid ${existing.supervisorPid} already owns the worker lock. Log: ${existing.logPath}`,
          );
          return false;
        }

        if (existing.workerPid && isPidAlive(existing.workerPid)) {
          this.log(
            `found orphaned worker pid ${existing.workerPid} from dead supervisor pid ${existing.supervisorPid}; terminating it before restart.`,
            "stderr",
          );
          await terminateProcess(existing.workerPid);
        }

        await rm(this.lockPath, { force: true });
      }
    }

    this.log("failed to recover a usable worker lock after multiple attempts.", "stderr");
    return false;
  }

  private createLockState(command: string): VoiceWorkerLockState {
    return {
      command,
      logPath: this.logPath,
      startedAt: new Date().toISOString(),
      status: "starting",
      supervisorPid: process.pid,
      workerPid: null,
    };
  }

  private async readLock(): Promise<VoiceWorkerLockState | null> {
    try {
      const raw = await readFile(this.lockPath, "utf8");
      return JSON.parse(raw) as VoiceWorkerLockState;
    } catch {
      return null;
    }
  }

  private async writeLock(state: VoiceWorkerLockState): Promise<void> {
    this.lockState = state;
    await writeFile(this.lockPath, JSON.stringify(state, null, 2), "utf8");
  }

  private clearLockSync(): void {
    this.lockState = null;
    try {
      rmSync(this.lockPath, { force: true });
    } catch {
      // Ignore cleanup races when the file is already gone.
    }
  }

  private handleProcessExit(): void {
    if (this.process && !this.process.killed) {
      try {
        this.process.kill("SIGTERM");
      } catch {
        // Ignore shutdown races during process exit.
      }
    }

    this.clearLockSync();
    this.closeLogStream();
  }

  private closeLogStream(): void {
    if (!this.logStream) {
      return;
    }
    this.logStream.end();
    this.logStream = null;
  }

  private log(message: string, stream: "stdout" | "stderr" = "stdout"): void {
    const line = `[voice-worker] ${message}\n`;
    if (stream === "stdout") {
      process.stdout.write(line);
    } else {
      process.stderr.write(line);
    }
    this.logStream?.write(`[${new Date().toISOString()}] ${stream.toUpperCase()} ${message}\n`);
  }

  private writeChunk(stream: "stdout" | "stderr", chunk: string): void {
    const prefixed = `[voice-worker] ${chunk}`;
    if (stream === "stdout") {
      process.stdout.write(prefixed);
    } else {
      process.stderr.write(prefixed);
    }

    const normalized = chunk.endsWith("\n") ? chunk : `${chunk}\n`;
    this.logStream?.write(`[${new Date().toISOString()}] ${stream.toUpperCase()} ${normalized}`);
  }
}

function isFileExistsError(error: unknown): boolean {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "EEXIST";
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function terminateProcess(pid: number): Promise<void> {
  if (!isPidAlive(pid)) {
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return;
  }

  const deadline = Date.now() + ORPHAN_SHUTDOWN_GRACE_MS;
  while (Date.now() < deadline) {
    await delay(150);
    if (!isPidAlive(pid)) {
      return;
    }
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // Ignore races where the process exits between the last liveness check and SIGKILL.
  }
}
