import path from "node:path";
import dotenv from "dotenv";
import {
  buildThreadInstructions,
  buildTurnPrompt,
  createId,
  getModelRouterConfig,
  planHostExecution,
  type HostAuthState,
  type HostWorkMessage,
  type RouterProvider,
} from "@freedom/shared";
import { HttpGatewayClient } from "../services/gatewayClient.js";
import { resolveApprovedRoots } from "./approvedRoots.js";
import { CodexBridge } from "./codexBridge.js";
import { isStaleThreadNoOutputError } from "./codexBridge.js";
import { CommandBridge } from "./commandBridge.js";
import { HostStateStore } from "./store.js";
import { getTailscaleStatus } from "./tailscale.js";
import { VoiceWorkerSupervisor } from "./voiceWorkerSupervisor.js";

for (const envPath of [path.resolve(process.cwd(), ".env"), path.resolve(process.cwd(), "../../.env")]) {
  dotenv.config({ path: envPath, override: true });
}

interface ActiveRun {
  taskId: string;
  sessionId: string;
  userMessageId: string;
  assistantMessageId: string;
  threadId: string;
  turnId: string;
  provider: RouterProvider;
  interrupting: boolean;
}

type RunBridge = CodexBridge | CommandBridge;

const INTERRUPT_START_TIMEOUT_MS = 4_000;
const INTERRUPT_REQUEST_TIMEOUT_MS = 5_000;
const GATEWAY_INTERRUPT_TIMEOUT_MS = 3_000;
const PROCESS_START_TIMEOUT_MS = 5_000;
const PROCESS_AUTH_TIMEOUT_MS = 4_000;
const PROCESS_TAILSCALE_TIMEOUT_MS = 4_000;
const PROCESS_HEARTBEAT_TIMEOUT_MS = 4_000;
const PROCESS_MEMORY_DIGEST_TIMEOUT_MS = 3_000;
const MAX_ACTIVE_RUNS = 2;
const HOST_WORK_WAIT_MS = 20_000;
const HOST_INTERRUPT_WAIT_MS = 2_000;

export class DesktopHostRuntime {
  private readonly gatewayUrl = process.env.DESKTOP_GATEWAY_URL ?? "http://127.0.0.1:43111";
  private readonly desktopDataDir = process.env.DESKTOP_DATA_DIR ?? ".local-data/desktop";
  private readonly gateway = new HttpGatewayClient(this.gatewayUrl);
  private readonly stateStore = new HostStateStore(this.desktopDataDir);
  private readonly codexBridge = new CodexBridge();
  private readonly routerConfig = getModelRouterConfig(process.env);
  private readonly localBridge = new CommandBridge(
    "local",
    this.routerConfig.localProviderLabel,
    process.env.FREEDOM_LOCAL_MODEL_COMMAND?.trim() || null,
  );
  private readonly openaiBridge = new CommandBridge(
    "openai",
    this.routerConfig.openaiProviderLabel,
    process.env.FREEDOM_OPENAI_COMMAND?.trim() || null,
  );
  private readonly claudeBridge = new CommandBridge(
    "claude-code",
    "Claude Code",
    process.env.FREEDOM_CLAUDE_CODE_COMMAND?.trim() || null,
  );
  private heartbeatHandle: NodeJS.Timeout | null = null;
  private hostToken: string | null = null;
  private hostId: string | null = null;
  private readonly activeRuns = new Map<string, ActiveRun>();
  private ticking = false;
  private running = false;
  private workLoopPromise: Promise<void> | null = null;
  private readonly voiceWorkerSupervisor = new VoiceWorkerSupervisor(this.desktopDataDir);

  async start(): Promise<void> {
    const localState = await this.stateStore.read();
    const hostName = process.env.DESKTOP_HOST_NAME ?? localState.hostName ?? "Freedom Desktop";
    const approvedRoots = await resolveApprovedRoots(parseRoots(process.env.DESKTOP_APPROVED_ROOTS));

    const auth = await this.codexBridge.getAuthState();
    const tailscale = await getTailscaleStatus(Number(new URL(this.gatewayUrl).port || 43111));
    const registration = await this.gateway.registerHost({
      hostId: localState.hostId ?? undefined,
      hostName,
      approvedRoots,
    });

    this.hostToken = registration.hostToken;
    this.hostId = registration.host.id;

    await this.stateStore.write({
      hostToken: registration.hostToken,
      hostId: registration.host.id,
      hostName,
      gatewayUrl: this.gatewayUrl,
      pairingCode: registration.pairingCode,
      pairingCodeIssuedAt: registration.host.pairingCodeIssuedAt,
      codexAuthStatus: auth.status,
      codexAuthDetail: auth.detail,
      tailscaleStatus: tailscale.installed ? (tailscale.connected ? "connected" : "not_connected") : "not_installed",
      tailscaleDetail: tailscale.detail,
      tailscaleSuggestedUrl: tailscale.suggestedUrl,
    });

    await this.gateway.heartbeat(registration.hostToken, { auth, tailscale });

    this.heartbeatHandle = setInterval(() => {
      void this.syncHeartbeat();
    }, 5000);
    this.running = true;
    await this.voiceWorkerSupervisor.start();
    this.startWorkLoop();

    process.stdout.write(
      [
        "Desktop host ready.",
        `Gateway URL: ${this.gatewayUrl}`,
        `Host ID: ${registration.host.id}`,
        `Pairing code: ${registration.pairingCode}`,
        `Codex auth: ${auth.detail ?? auth.status}`,
        `Local lane: ${this.localBridge.isConfigured() ? "configured" : "not configured"}`,
        `OpenAI lane: ${this.openaiBridge.isConfigured() ? "configured" : "not configured"}`,
        `Claude lane: ${this.claudeBridge.isConfigured() ? "configured" : "not configured"}`,
        `Tailscale: ${tailscale.detail ?? "unknown"}`,
        `Suggested mobile URL: ${tailscale.suggestedUrl ?? "not available"}`,
      ].join("\n") + "\n",
    );

    await this.syncHeartbeat();
  }

  async getLocalState() {
    return this.stateStore.read();
  }

  stop(): void {
    this.running = false;
    this.voiceWorkerSupervisor.stop();
    if (this.heartbeatHandle) {
      clearInterval(this.heartbeatHandle);
      this.heartbeatHandle = null;
    }
    void this.codexBridge.stop();
  }

  private startWorkLoop(): void {
    if (this.workLoopPromise) {
      return;
    }
    this.workLoopPromise = this.runWorkLoop().finally(() => {
      this.workLoopPromise = null;
    });
  }

  private async runWorkLoop(): Promise<void> {
    while (this.running && this.hostToken) {
      try {
        await this.tick({ waitForWork: true });
      } catch (error) {
        process.stderr.write(
          `[desktop-host] work loop error: ${error instanceof Error ? error.message : String(error)}\n`,
        );
        await delay(1_000);
      }
    }
  }

  private async syncHeartbeat(): Promise<void> {
    if (!this.hostToken) {
      return;
    }
    const auth = await this.codexBridge.getAuthState();
    const tailscale = await getTailscaleStatus(Number(new URL(this.gatewayUrl).port || 43111));
    await this.gateway.heartbeat(this.hostToken, { auth, tailscale });
    const current = await this.stateStore.read();
    await this.stateStore.write({
      ...current,
      codexAuthStatus: auth.status,
      codexAuthDetail: auth.detail,
      tailscaleStatus: tailscale.installed ? (tailscale.connected ? "connected" : "not_connected") : "not_installed",
      tailscaleDetail: tailscale.detail,
      tailscaleSuggestedUrl: tailscale.suggestedUrl,
    });
  }

  private async tick(options?: { waitForWork?: boolean }): Promise<void> {
    if (!this.hostToken || this.ticking) {
      return;
    }
    this.ticking = true;

    try {
      const workLimit = Math.max(1, MAX_ACTIVE_RUNS - this.activeRuns.size + 1);
      for (let index = 0; index < workLimit; index += 1) {
        const canAcceptQueued = this.activeRuns.size < MAX_ACTIVE_RUNS;
        const work = await this.gateway.getNextWork(this.hostToken, {
          waitMs: index === 0 && options?.waitForWork ? (canAcceptQueued ? HOST_WORK_WAIT_MS : HOST_INTERRUPT_WAIT_MS) : 0,
          acceptQueued: canAcceptQueued,
        });
        if (!work) {
          break;
        }

        if (work.type === "interrupt") {
          const activeRun = this.activeRuns.get(work.task.id);
          if (activeRun && !activeRun.interrupting) {
            activeRun.interrupting = true;
            try {
              await withTimeout(this.interruptActiveRun(activeRun), INTERRUPT_REQUEST_TIMEOUT_MS, "live interrupt");
            } catch {
              activeRun.interrupting = false;
            }
            continue;
          }

          if (work.task.threadId && !isCommandThreadId(work.task.threadId)) {
            try {
              await withTimeout(this.codexBridge.start(), INTERRUPT_START_TIMEOUT_MS, "codex app-server start");
            } catch {
              // If the bridge is unhealthy, still clear the stale session state in the gateway.
            }
            try {
              await withTimeout(
                this.codexBridge.interrupt(work.task.threadId, work.turnId),
                INTERRUPT_REQUEST_TIMEOUT_MS,
                "stale interrupt",
              );
            } catch {
              // If the desktop lost the live turn handle, still clear the stale session state in the gateway.
            }
          }

          await withTimeout(
            this.gateway.interruptTurn(this.hostToken, {
              sessionId: work.session.id,
              taskId: work.task.id,
              assistantMessageId: null,
              turnId: work.turnId,
            }),
            GATEWAY_INTERRUPT_TIMEOUT_MS,
            "gateway interrupt cleanup",
          );
          continue;
        }

        if (this.activeRuns.size >= MAX_ACTIVE_RUNS) {
          break;
        }

        void this.processMessage(work);
      }
    } finally {
      this.ticking = false;
    }
  }

  private async processMessage(work: HostWorkMessage): Promise<void> {
    if (!this.hostToken) {
      return;
    }

    const assistantMessageId = createId("msg");
    let started = false;
    const plan = planHostExecution(work, process.env);

    try {
      const auth = await withTimeout(this.codexBridge.getAuthState(), PROCESS_AUTH_TIMEOUT_MS, "codex auth check");
      const tailscale = await withTimeout(
        getTailscaleStatus(Number(new URL(this.gatewayUrl).port || 43111)),
        PROCESS_TAILSCALE_TIMEOUT_MS,
        "tailscale status",
      );
      await withTimeout(
        this.gateway.heartbeat(this.hostToken, { auth, tailscale }),
        PROCESS_HEARTBEAT_TIMEOUT_MS,
        "gateway heartbeat",
      );
      const runtimeContext = await this.loadRuntimeContext();

      const bridge = await this.resolveBridge(plan.provider, auth);
      const buildPrompt = () =>
        plan.provider === "codex"
          ? buildCodexPrompt(work)
          : buildCommandPrompt(work, plan.reason, runtimeContext);

      const runTurn = async (threadId: string | null) =>
        bridge.runTurn({
          cwd: work.session.rootPath,
          threadId,
          sessionId: work.session.id,
          sessionTitle: work.session.title,
          sessionKind: work.session.kind,
          text: buildPrompt(),
          onTurnStarted: async ({ threadId: nextThreadId, turnId }) => {
            this.activeRuns.set(work.task.id, {
              taskId: work.task.id,
              sessionId: work.session.id,
              userMessageId: work.message.id,
              assistantMessageId,
              threadId: nextThreadId,
              turnId,
              provider: plan.provider,
              interrupting: false,
            });
            started = true;
            await this.gateway.startTurn(this.hostToken as string, {
              sessionId: work.session.id,
              taskId: work.task.id,
              userMessageId: work.message.id,
              threadId: nextThreadId,
              turnId,
              assistantMessageId,
            });
          },
          onDelta: async (delta) => {
            await this.gateway.appendAssistantDelta(this.hostToken as string, {
              sessionId: work.session.id,
              taskId: work.task.id,
              assistantMessageId,
              delta,
            });
          },
        });

      let result;
      try {
        result = await runTurn(work.session.threadId);
      } catch (error) {
        const message = error instanceof Error ? error.message : `${plan.provider} run failed.`;
        if (
          plan.provider === "codex" &&
          !started &&
          work.session.threadId &&
          (isMissingThreadError(message) || isStaleThreadNoOutputError(message))
        ) {
          result = await runTurn(null);
        } else {
          throw error;
        }
      }

      const activeRun = this.activeRuns.get(work.task.id);
      if (activeRun?.interrupting) {
        await this.gateway.interruptTurn(this.hostToken, {
          sessionId: work.session.id,
          taskId: work.task.id,
          assistantMessageId,
          turnId: result.turnId,
        });
      } else {
        await this.gateway.completeTurn(this.hostToken, {
          sessionId: work.session.id,
          taskId: work.task.id,
          userMessageId: work.message.id,
          assistantMessageId,
          threadId: result.threadId,
          turnId: result.turnId,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : `${plan.provider} run failed.`;
      const activeRun = this.activeRuns.get(work.task.id);
      if (started && activeRun?.interrupting) {
        await this.gateway.interruptTurn(this.hostToken, {
          sessionId: work.session.id,
          taskId: work.task.id,
          assistantMessageId,
          turnId: activeRun.turnId,
        });
      } else {
        await this.gateway.failTurn(this.hostToken, {
          sessionId: work.session.id,
          taskId: work.task.id,
          userMessageId: work.message.id,
          assistantMessageId: started ? assistantMessageId : null,
          threadId: activeRun?.threadId ?? work.task.threadId ?? work.session.threadId,
          turnId: activeRun?.turnId ?? work.task.turnId ?? null,
          errorMessage: message,
        });
      }
    } finally {
      this.activeRuns.delete(work.task.id);
    }
  }

  private async interruptActiveRun(activeRun: ActiveRun): Promise<void> {
    const bridge = await this.resolveBridge(activeRun.provider, await this.codexBridge.getAuthState(), false);
    if (activeRun.provider === "codex") {
      await withTimeout(this.codexBridge.start(), INTERRUPT_START_TIMEOUT_MS, "codex app-server start");
    }
    await bridge.interrupt(activeRun.threadId, activeRun.turnId);
  }

  private async resolveBridge(
    provider: RouterProvider,
    auth: HostAuthState,
    startCodex = true,
  ): Promise<RunBridge> {
    if (provider === "codex") {
      if (auth.status !== "logged_in") {
        throw new Error(auth.detail ?? "Codex is not logged in. Run `codex login --device-auth` on the desktop.");
      }
      if (startCodex) {
        await withTimeout(this.codexBridge.start(), PROCESS_START_TIMEOUT_MS, "codex app-server start");
      }
      return this.codexBridge;
    }

    if (provider === "claude-code") {
      if (!this.claudeBridge.isConfigured()) {
        throw new Error("Claude Code routing was selected, but FREEDOM_CLAUDE_CODE_COMMAND is not configured.");
      }
      return this.claudeBridge;
    }

    if (provider === "openai") {
      if (!this.openaiBridge.isConfigured()) {
        throw new Error(
          `${this.routerConfig.openaiProviderLabel} routing was selected, but FREEDOM_OPENAI_COMMAND is not configured.`,
        );
      }
      return this.openaiBridge;
    }

    if (!this.localBridge.isConfigured()) {
      throw new Error(
        `Local day-to-day routing was selected, but FREEDOM_LOCAL_MODEL_COMMAND is not configured for ${this.routerConfig.localProviderLabel}.`,
      );
    }
    return this.localBridge;
  }

  private async loadRuntimeContext(): Promise<string | null> {
    if (!this.hostToken) {
      return null;
    }

    try {
      const digest = await withTimeout(
        this.gateway.getMemoryDigest(this.hostToken),
        PROCESS_MEMORY_DIGEST_TIMEOUT_MS,
        "gateway memory digest",
      );
      const context = digest.context.trim();
      return context ? context : null;
    } catch {
      return null;
    }
  }
}

function buildCodexPrompt(work: HostWorkMessage): string {
  return buildTurnPrompt({
    sessionTitle: work.session.title,
    sessionKind: work.session.kind,
    userText: work.message.content,
    responseStyle: work.message.responseStyle,
    inputMode: work.message.inputMode,
    transcriptPolished: work.message.transcriptPolished,
    runtimeContext: work.task.runtimeContext,
  });
}

function buildCommandPrompt(work: HostWorkMessage, routingReason: string, runtimeContext: string | null): string {
  const sections = [
    buildThreadInstructions({
      sessionTitle: work.session.title,
      sessionKind: work.session.kind,
    }),
    `Routing note: ${routingReason}`,
    runtimeContext ? `Runtime context:\n${runtimeContext}` : null,
    "Use the supplied runtime context as durable continuity for this turn. Do not invent hidden memory beyond what is provided here.",
    work.task.resumeContext ? `Resume context: ${work.task.resumeContext}` : null,
    buildCodexPrompt(work),
  ].filter(Boolean);

  return sections.join("\n\n");
}

function isCommandThreadId(threadId: string): boolean {
  return (
    threadId.startsWith("local_thread_") ||
    threadId.startsWith("openai_thread_") ||
    threadId.startsWith("claude-code_thread_")
  );
}

function isMissingThreadError(message: string): boolean {
  return /thread not found/i.test(message);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let handle: NodeJS.Timeout | null = null;
  const timeout = new Promise<never>((_, reject) => {
    handle = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (handle) {
      clearTimeout(handle);
    }
  }
}

function parseRoots(raw: string | undefined): string[] {
  const roots = raw?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
  if (!roots.length) {
    throw new Error("DESKTOP_APPROVED_ROOTS must include at least one absolute path.");
  }
  return roots;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
