import type { HostWorkMessage } from "./schemas/platform.js";

export type RouterProvider = "local" | "openai" | "codex" | "claude-code";
export type VoiceRuntimeProvider = "openai-realtime" | "local-voice";

export interface ModelRouterConfig {
  localModelsEnabled: boolean;
  localProviderLabel: string;
  openaiProviderLabel: string;
  dayToDayProvider: RouterProvider;
  heavyCodeProvider: RouterProvider;
  broadSynthesisProvider: RouterProvider;
  voiceRuntimeProvider: VoiceRuntimeProvider;
  voiceRuntimeModel: string;
  localModelCommandConfigured: boolean;
  openaiCommandConfigured: boolean;
  claudeCodeCommandConfigured: boolean;
}

export interface HostExecutionPlan {
  lane: "day-to-day" | "heavy-code" | "broad-synthesis";
  provider: RouterProvider;
  availableProviders: RouterProvider[];
  reason: string;
  fallbackApplied: boolean;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseRouterProvider(value: string | undefined, fallback: RouterProvider): RouterProvider {
  if (value === "local" || value === "openai" || value === "codex" || value === "claude-code") {
    return value;
  }

  return fallback;
}

function parseVoiceRuntimeProvider(
  value: string | undefined,
  fallback: VoiceRuntimeProvider,
): VoiceRuntimeProvider {
  if (value === "openai-realtime" || value === "local-voice") {
    return value;
  }

  return fallback;
}

function hasCommand(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function getModelRouterConfig(env: NodeJS.ProcessEnv = process.env): ModelRouterConfig {
  return {
    localModelsEnabled: parseBoolean(env.FREEDOM_LOCAL_MODELS_ENABLED, false),
    localProviderLabel: env.FREEDOM_LOCAL_PROVIDER_LABEL?.trim() || "Local LLM",
    openaiProviderLabel: env.FREEDOM_OPENAI_PROVIDER_LABEL?.trim() || "OpenAI / ChatGPT",
    dayToDayProvider: parseRouterProvider(env.FREEDOM_DAY_TO_DAY_PROVIDER, "local"),
    heavyCodeProvider: parseRouterProvider(env.FREEDOM_HEAVY_CODE_PROVIDER, "openai"),
    broadSynthesisProvider: parseRouterProvider(env.FREEDOM_BROAD_SYNTHESIS_PROVIDER, "claude-code"),
    voiceRuntimeProvider: parseVoiceRuntimeProvider(
      env.FREEDOM_VOICE_RUNTIME_PROVIDER,
      "openai-realtime",
    ),
    voiceRuntimeModel: env.FREEDOM_VOICE_RUNTIME_MODEL?.trim() || "gpt-4o-realtime-preview",
    localModelCommandConfigured: hasCommand(env.FREEDOM_LOCAL_MODEL_COMMAND),
    openaiCommandConfigured: hasCommand(env.FREEDOM_OPENAI_COMMAND),
    claudeCodeCommandConfigured: hasCommand(env.FREEDOM_CLAUDE_CODE_COMMAND),
  };
}

export function isProviderCommandConfigured(
  provider: RouterProvider,
  config: ModelRouterConfig,
): boolean {
  if (provider === "local") {
    return config.localModelsEnabled && config.localModelCommandConfigured;
  }

  if (provider === "claude-code") {
    return config.claudeCodeCommandConfigured;
  }

  if (provider === "openai") {
    return config.openaiCommandConfigured;
  }

  return true;
}

export function hasRunnableLocalDayToDay(config: ModelRouterConfig): boolean {
  return config.localModelsEnabled && config.localModelCommandConfigured;
}

function inferLane(work: HostWorkMessage): HostExecutionPlan["lane"] {
  const text = work.message.content.trim().toLowerCase();
  const broadSynthesisIntent =
    work.session.kind === "notes" &&
    (text.length > 600 ||
      /architecture|synthesi[sz]e|compare|tradeoff|roadmap|strategy|operating model|spec/i.test(text));

  if (work.session.kind === "build" || !work.task.readOnly) {
    return "heavy-code";
  }

  if (broadSynthesisIntent) {
    return "broad-synthesis";
  }

  return "day-to-day";
}

function preferredProviderForLane(
  lane: HostExecutionPlan["lane"],
  config: ModelRouterConfig,
): RouterProvider {
  switch (lane) {
    case "heavy-code":
      return config.heavyCodeProvider;
    case "broad-synthesis":
      return config.broadSynthesisProvider;
    default:
      return config.dayToDayProvider;
  }
}

export function getEscalationChoices(
  lane: HostExecutionPlan["lane"],
  config: ModelRouterConfig,
): RouterProvider[] {
  if (lane === "day-to-day") {
    return dedupeProviders([config.dayToDayProvider, "local", "openai", "codex", "claude-code"]);
  }

  if (lane === "heavy-code") {
    return dedupeProviders([config.heavyCodeProvider, "openai", "codex", "claude-code", "local"]);
  }

  return dedupeProviders([config.broadSynthesisProvider, "openai", "claude-code", "codex", "local"]);
}

function dedupeProviders(providers: RouterProvider[]): RouterProvider[] {
  return providers.filter((provider, index) => providers.indexOf(provider) === index);
}

function fallbackProvider(
  preferred: RouterProvider,
  lane: HostExecutionPlan["lane"],
  config: ModelRouterConfig,
): RouterProvider {
  const candidates: RouterProvider[] = [
    preferred,
    config.heavyCodeProvider,
    config.dayToDayProvider,
    config.broadSynthesisProvider,
    "codex",
  ];

  const unique = candidates.filter((provider, index) => candidates.indexOf(provider) === index);
  const runnable = unique.find((provider) => isProviderCommandConfigured(provider, config));
  if (runnable) {
    return runnable;
  }

  return lane === "heavy-code" ? config.heavyCodeProvider : "codex";
}

export function planHostExecution(
  work: HostWorkMessage,
  env: NodeJS.ProcessEnv = process.env,
): HostExecutionPlan {
  const config = getModelRouterConfig(env);
  const lane = inferLane(work);
  const preferred = preferredProviderForLane(lane, config);
  const availableProviders = getEscalationChoices(lane, config);

  if (preferred === "codex" || isProviderCommandConfigured(preferred, config)) {
    return {
      lane,
      provider: preferred,
      availableProviders,
      reason: reasonForPlan(lane, preferred, false, config),
      fallbackApplied: false,
    };
  }

  const provider = fallbackProvider(preferred, lane, config);
  return {
    lane,
    provider,
    availableProviders,
    reason: reasonForPlan(lane, provider, true, config),
    fallbackApplied: provider !== preferred,
  };
}

function reasonForPlan(
  lane: HostExecutionPlan["lane"],
  provider: RouterProvider,
  fallbackApplied: boolean,
  config: ModelRouterConfig,
): string {
  const laneReason =
    lane === "heavy-code"
      ? "Task can modify the workspace or is explicitly a build lane request."
      : lane === "broad-synthesis"
        ? "Task looks like broad synthesis or planning work."
        : "Task is routine day-to-day operating work and should stay local first when possible.";

  const providerReason =
    provider === "local"
      ? `${config.localProviderLabel} is configured for prompt-in/stdout-out execution.`
      : provider === "openai"
        ? `${config.openaiProviderLabel} command execution is configured for operator-selected escalation.`
      : provider === "claude-code"
        ? "Claude Code command execution is configured for synthesis work."
        : "Codex remains the durable heavy-code and threaded execution lane.";

  if (!fallbackApplied) {
    return `${laneReason} ${providerReason}`;
  }

  return `${laneReason} Routed through ${provider} because the preferred command path is not currently executable.`;
}

export function describeModelRouterStatus(env: NodeJS.ProcessEnv = process.env) {
  const config = getModelRouterConfig(env);
  const liveStatus =
    config.voiceRuntimeProvider === "local-voice"
      ? `Voice runtime is configured for local voice model use (${config.voiceRuntimeModel}).`
      : `Voice runtime is currently configured for paid OpenAI Realtime (${config.voiceRuntimeModel}).`;

  const policyStatus = hasRunnableLocalDayToDay(config)
    ? `${config.localProviderLabel} is enabled and a local day-to-day command is configured for desktop-host work.`
    : `${config.localProviderLabel} is not fully wired for runtime execution yet. Set FREEDOM_LOCAL_MODEL_COMMAND to make day-to-day routing truly local-first.`;

  const synthesisStatus = config.claudeCodeCommandConfigured
    ? "Broad synthesis command routing is configured."
    : "Broad synthesis is still a modeled lane unless FREEDOM_CLAUDE_CODE_COMMAND is set.";

  const escalationStatus = config.openaiCommandConfigured
    ? `${config.openaiProviderLabel} is available as an operator-selectable escalation option.`
    : `${config.openaiProviderLabel} is not wired yet. Set FREEDOM_OPENAI_COMMAND to expose that choice in runtime.`;

  return {
    liveStatus,
    policyStatus,
    synthesisStatus,
    escalationStatus,
    config,
  };
}
