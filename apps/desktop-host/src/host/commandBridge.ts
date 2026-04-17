import { spawn, type ChildProcess } from "node:child_process";
import { createId } from "@freedom/core";
import type { RouterProvider, SessionKind } from "@freedom/shared";

interface RunTurnInput {
  cwd: string;
  threadId: string | null;
  sessionId: string;
  sessionTitle: string;
  sessionKind: SessionKind;
  text: string;
  onTurnStarted(input: { threadId: string; turnId: string }): Promise<void>;
  onDelta(delta: string): Promise<void>;
}

interface RunTurnResult {
  threadId: string;
  turnId: string;
}

export class CommandBridge {
  private readonly activeTurns = new Map<string, ChildProcess>();

  constructor(
    readonly provider: Extract<RouterProvider, "local" | "claude-code">,
    private readonly label: string,
    private readonly command: string | null,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.command?.trim());
  }

  async interrupt(_threadId: string, turnId: string): Promise<void> {
    const child = this.activeTurns.get(turnId);
    if (!child) {
      return;
    }

    child.kill("SIGTERM");
    this.activeTurns.delete(turnId);
  }

  async runTurn(input: RunTurnInput): Promise<RunTurnResult> {
    const command = this.command?.trim();
    if (!command) {
      throw new Error(`${this.label} command is not configured.`);
    }

    const threadId = input.threadId ?? `${this.provider}_thread_${input.sessionId}`;
    const turnId = createId(`${this.provider.replace(/[^a-z]/g, "")}turn`);
    const child = spawn(command, {
      cwd: input.cwd,
      env: {
        ...process.env,
        FREEDOM_ROUTED_PROVIDER: this.provider,
        FREEDOM_ROUTED_SESSION_KIND: input.sessionKind,
        FREEDOM_ROUTED_SESSION_TITLE: input.sessionTitle,
      },
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.activeTurns.set(turnId, child);
    await input.onTurnStarted({ threadId, turnId });

    let stderr = "";
    let exited = false;
    let deltaChain = Promise.resolve();

    const exitPromise = new Promise<void>((resolve, reject) => {
      child.stdout?.setEncoding("utf8");
      child.stdout?.on("data", (chunk: string) => {
        deltaChain = deltaChain.then(() => input.onDelta(chunk));
      });

      child.stderr?.setEncoding("utf8");
      child.stderr?.on("data", (chunk: string) => {
        stderr += chunk;
      });

      child.on("error", (error) => {
        exited = true;
        reject(error);
      });

      child.on("exit", (code, signal) => {
        exited = true;
        if (signal === "SIGTERM") {
          resolve();
          return;
        }

        if (code === 0) {
          resolve();
          return;
        }

        const detail = stderr.trim();
        reject(
          new Error(
            detail
              ? `${this.label} exited with code ${code ?? 1}: ${detail}`
              : `${this.label} exited with code ${code ?? 1}.`,
          ),
        );
      });
    });

    child.stdin?.write(input.text);
    child.stdin?.end();

    try {
      await exitPromise;
      await deltaChain;
      return { threadId, turnId };
    } finally {
      if (!exited) {
        child.kill("SIGTERM");
      }
      this.activeTurns.delete(turnId);
    }
  }
}
