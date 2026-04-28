import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { AppShell } from "../src/app/AppShell";
import { refreshScrollInteractionProps } from "../src/app/screens";
import type { AppState } from "../src/store/appStore";

function mockConnectionState(state: typeof mockStore) {
  if (!state.token) {
    return "offline_safe" as const;
  }
  if (!state.realtimeConnected && state.hostStatus?.connectionState === "connected") {
    return "reconnecting" as const;
  }
  return state.hostStatus?.connectionState ?? (state.offlineMode ? "offline_safe" : "reconnecting");
}

function mockVoiceState(state: typeof mockStore) {
  if (!state.voiceAvailable) {
    return "voice_unavailable" as const;
  }
  if (state.voiceSessionActive) {
    return state.voiceRuntimeMode === "realtime_primary" ? "voice_primary_live" : "voice_fallback_only";
  }
  if (!state.token) {
    return "voice_fallback_only" as const;
  }
  return state.hostStatus?.voiceState ?? "voice_primary_ready";
}

function mockDeferredExecutionState(state: typeof mockStore) {
  if (!state.token) {
    return "awaiting_desktop" as const;
  }
  return state.hostStatus?.deferredExecutionState ?? "ready_to_execute";
}

const mockStore = {
  booting: false,
  refreshing: false,
  sendingMessage: false,
  realtimeConnected: true,
  view: "start" as AppState["view"],
  baseUrl: "http://127.0.0.1:43111",
  deviceName: "Freedom Phone",
  pairingCode: "",
  token: "device-token" as string | null,
  currentDeviceId: "device-1",
  hostStatus: {
    host: {
      hostName: "Desktop host",
      isOnline: true,
      approvedRoots: ["/tmp/workspace"],
      id: "host-1",
      pairingCode: "ABC123",
      pairingCodeIssuedAt: "2026-04-12T10:00:00.000Z",
      createdAt: "2026-04-12T10:00:00.000Z",
      lastSeenAt: "2026-04-12T10:00:00.000Z"
    },
    auth: {
      status: "logged_in",
      detail: "Freedom ready"
    },
    tailscale: {
      installed: true,
      connected: true,
      detail: "Connected",
      dnsName: "desktop.tailnet.ts.net",
      ipv4: "100.64.0.10",
      suggestedUrl: "http://desktop.tailnet.ts.net:43111",
      transportSecurity: "secure",
      installUrl: "https://tailscale.com/download",
      loginUrl: "https://login.tailscale.com/start"
    },
    wakeControl: {
      enabled: false,
      relayBaseUrl: null,
      relayToken: null,
      targetId: null,
      targetLabel: null
    },
    outboundEmail: {
      enabled: false,
      provider: "none",
      fromAddress: null,
      replyToAddress: null,
      recipientCount: 0
    },
    connectionState: "connected",
    connectionDetail: "Desktop linked and ready.",
    voiceState: "voice_primary_ready",
    voiceDetail: "Premium voice is ready.",
    deferredExecutionState: "ready_to_execute",
    deferredExecutionDetail: "Desktop can execute governed work.",
    voiceProfile: {
      targetVoice: "marin",
      displayName: "Marin",
      gender: "feminine",
      accent: null,
      tone: "warm",
      warmth: "high",
      pace: "steady",
      notes: null,
      source: "default",
      updatedAt: "2026-04-12T10:00:00.000Z"
    },
    availability: "ready",
    repairState: "healthy",
    runState: "ready",
    activeSessionCount: 0,
    pairedDeviceCount: 1
  },
  buildLaneSummary: null as AppState["buildLaneSummary"],
  operatorRunLedger: null as AppState["operatorRunLedger"],
  operatorRunActioningId: null as AppState["operatorRunActioningId"],
  operatorRunReviewDraft: null as AppState["operatorRunReviewDraft"],
  devices: [],
  sessions: [] as AppState["sessions"],
  selectedSessionId: null as string | null,
  messagesBySession: {},
  composer: "",
  composerInputMode: "text",
  newSessionRootPath: "/tmp/workspace",
  newSessionTitle: "",
  projectIntent: "",
  projectInstructions: "",
  projectOutputType: "implementation plan",
  projectTemplateId: "greenfield",
  responseStyle: "natural",
  assistantVoices: [],
  selectedAssistantVoiceId: null,
  selectedFreedomVoicePresetId: "marin",
  cachedMemoryDigest: null,
  offlineMode: false,
  offlineModelState: "ready",
  offlineModelDetail: null,
  offlineImportDrafts: {},
  deferredOperatorRunsBySession: {},
  pendingLearningSignals: [],
  pendingConversationMemories: [],
  offlineSummarizing: false,
  offlineImporting: false,
  wakeControl: null,
  wakeRequesting: false,
  outboundRecipients: [],
  outboundRecipientLabelDraft: "",
  outboundRecipientEmailDraft: "",
  externalDraft: null,
  pendingExternalRequest: null,
  sendingExternalMessage: false,
  renameDraftBySession: {},
  autoSpeak: false,
  autoSendVoice: false,
  voiceAutoSendPreferenceTouched: false,
  voiceAvailable: true,
  voiceRuntimeMode: "realtime_primary",
  voiceRuntimeBinding: null,
  pushAvailable: false,
  pushSyncing: false,
  listening: false,
  voiceSessionActive: false,
  voiceTargetSessionId: null,
  voiceMuted: false,
  voiceSessionPhase: "idle",
  liveTranscript: "",
  voiceAudioLevel: -2,
  voiceAssistantDraft: null,
  voiceTelemetry: {
    turnsStarted: 0,
    turnsCompleted: 0,
    interruptions: 0,
    reconnects: 0,
    lastHeardAt: null,
    lastAssistantStartedAt: null,
    lastRoundTripMs: null
  },
  lastSpokenMessageId: null,
  notice: null,
  error: null,
  bootstrap: jest.fn(async () => undefined),
  connectPairing: jest.fn(async () => undefined),
  disconnect: jest.fn(async () => undefined),
  refresh: jest.fn(async () => undefined),
  reconnectRealtime: jest.fn(async () => undefined),
  selectSession: jest.fn(async () => undefined),
  createProjectSession: jest.fn(async () => undefined),
  renameSession: jest.fn(async () => undefined),
  deleteSession: jest.fn(async () => undefined),
  sendMessage: jest.fn(async () => undefined),
  generateOfflineImportSummary: jest.fn(async () => undefined),
  updateOfflineImportSummary: jest.fn(),
  updateOfflineImportDraftTurn: jest.fn(),
  removeOfflineImportDraftTurn: jest.fn(),
  addDeferredOperatorRunDraft: jest.fn(),
  updateDeferredOperatorRunDraft: jest.fn(),
  removeDeferredOperatorRunDraft: jest.fn(),
  importOfflineSession: jest.fn(async () => undefined),
  continueWithFreedom: jest.fn(),
  enterStandaloneMode: jest.fn(async () => undefined),
  stopSession: jest.fn(async () => undefined),
  approveOperatorRun: jest.fn(async () => undefined),
  holdOperatorRun: jest.fn(async () => undefined),
  interruptOperatorRun: jest.fn(async () => undefined),
  startOperatorRunReview: jest.fn(),
  updateOperatorRunReviewDraft: jest.fn(),
  cancelOperatorRunReview: jest.fn(),
  submitOperatorRunReview: jest.fn(async () => undefined),
  renameCurrentDevice: jest.fn(async () => undefined),
  enablePushNotifications: jest.fn(async () => undefined),
  toggleNotificationPreference: jest.fn(async () => undefined),
  sendDeviceTestNotification: jest.fn(async () => undefined),
  revokeDevice: jest.fn(async () => undefined),
  toggleAutoSpeak: jest.fn(async () => undefined),
  toggleAutoSendVoice: jest.fn(async () => undefined),
  testAssistantVoice: jest.fn(async () => undefined),
  triggerWakeHomebase: jest.fn(async () => undefined),
  addOutboundRecipient: jest.fn(async () => undefined),
  deleteOutboundRecipient: jest.fn(async () => undefined),
  beginExternalMessageDraft: jest.fn(),
  cancelExternalMessageDraft: jest.fn(),
  updateExternalDraft: jest.fn(),
  sendExternalMessage: jest.fn(async () => undefined),
  toggleListening: jest.fn(async () => undefined),
  toggleVoiceMute: jest.fn(async () => undefined),
  setResponseStyle: jest.fn(async () => undefined),
  selectAssistantVoice: jest.fn(async () => undefined),
  selectFreedomVoicePreset: jest.fn(async () => undefined),
  setRenameDraft: jest.fn(),
  setField: jest.fn(),
  setView: jest.fn()
};

jest.mock("../src/store/appStore", () => ({
  useAppStore: jest.fn((selector?: (state: typeof mockStore) => unknown) => (selector ? selector(mockStore) : mockStore)),
  getEffectiveConnectionState: jest.fn((state: typeof mockStore) => mockConnectionState(state)),
  getEffectiveVoiceState: jest.fn((state: typeof mockStore) => mockVoiceState(state)),
  getEffectiveDeferredExecutionState: jest.fn((state: typeof mockStore) => mockDeferredExecutionState(state)),
  getEffectiveFreedomVoiceProfile: jest.fn((state: typeof mockStore) => (
    state.offlineMode || !state.token || state.hostStatus?.connectionState === "stand_alone"
      ? {
          targetVoice: state.selectedFreedomVoicePresetId,
          displayName: state.selectedFreedomVoicePresetId,
          gender: "neutral",
          accent: null,
          tone: null,
          warmth: "medium",
          pace: "steady",
          notes: null,
          source: "manual",
          updatedAt: "2026-04-27T00:00:00.000Z"
        }
      : (state.hostStatus?.voiceProfile ?? {
          targetVoice: state.selectedFreedomVoicePresetId,
          displayName: state.selectedFreedomVoicePresetId,
          gender: "neutral",
          accent: null,
          tone: null,
          warmth: "medium",
          pace: "steady",
          notes: null,
          source: "manual",
          updatedAt: "2026-04-27T00:00:00.000Z"
        })
  ))
}));

describe("refresh affordances", () => {
  beforeEach(() => {
    mockStore.refreshing = false;
    mockStore.view = "start";
    mockStore.token = "device-token";
    mockStore.sendingMessage = false;
    mockStore.voiceAvailable = true;
    mockStore.realtimeConnected = true;
    mockStore.voiceMuted = false;
    mockStore.voiceSessionActive = false;
    mockStore.voiceSessionPhase = "idle";
    mockStore.sessions = [];
    mockStore.selectedSessionId = null;
    mockStore.composer = "";
    mockStore.buildLaneSummary = null;
    mockStore.operatorRunLedger = null;
    mockStore.operatorRunActioningId = null;
    mockStore.operatorRunReviewDraft = null;
    mockStore.offlineMode = false;
    mockStore.offlineImportDrafts = {};
    mockStore.deferredOperatorRunsBySession = {};
    mockStore.hostStatus.auth.status = "logged_in";
    mockStore.refresh.mockClear();
    mockStore.bootstrap.mockClear();
    mockStore.selectSession.mockClear();
    mockStore.toggleListening.mockClear();
    mockStore.enterStandaloneMode.mockClear();
    mockStore.approveOperatorRun.mockClear();
    mockStore.holdOperatorRun.mockClear();
    mockStore.interruptOperatorRun.mockClear();
    mockStore.startOperatorRunReview.mockClear();
    mockStore.updateOperatorRunReviewDraft.mockClear();
    mockStore.cancelOperatorRunReview.mockClear();
    mockStore.submitOperatorRunReview.mockClear();
    mockStore.generateOfflineImportSummary.mockClear();
    mockStore.updateOfflineImportSummary.mockClear();
    mockStore.updateOfflineImportDraftTurn.mockClear();
    mockStore.removeOfflineImportDraftTurn.mockClear();
    mockStore.addDeferredOperatorRunDraft.mockClear();
    mockStore.updateDeferredOperatorRunDraft.mockClear();
    mockStore.removeDeferredOperatorRunDraft.mockClear();
    mockStore.importOfflineSession.mockClear();
    mockStore.continueWithFreedom.mockClear();
    mockStore.setField.mockClear();
    mockStore.setView.mockClear();
  });

  test("pairing screen exposes standalone entry before any desktop link exists", async () => {
    mockStore.token = null;
    mockStore.sessions = [];
    mockStore.view = "pairing";

    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<AppShell />);
    });

    const labels = tree!.root.findAll((node) => typeof node.props.children !== "undefined").flatMap((node) => flattenText(node.props.children));
    expect(labels).toContain("Use On This Phone First");

    await ReactTestRenderer.act(async () => {
      tree!.root.findByProps({ testID: "enter-standalone-button" }).props.onPress();
    });

    expect(mockStore.enterStandaloneMode).toHaveBeenCalledTimes(1);
  });

  test("AppShell lands on the new start surface after pairing", async () => {
    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<AppShell />);
    });

    const labels = tree!.root.findAll((node) => typeof node.props.children !== "undefined").flatMap((node) => flattenText(node.props.children));

    expect(labels).toContain("Freedom");
    expect(labels).toContain("Voice");
    expect(labels).toContain("Start talking");
    expect(labels).toContain("Text");
    expect(labels).toContain("Talk");
    expect(mockStore.bootstrap).toHaveBeenCalled();
  });

  test("start talk uses the voice action without forcing a chat navigation first", async () => {
    mockStore.view = "start";
    mockStore.voiceAvailable = true;

    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<AppShell />);
    });

    await ReactTestRenderer.act(async () => {
      tree!.root.findByProps({ testID: "start-talk-action-button" }).props.onPress();
    });

    expect(mockStore.toggleListening).toHaveBeenCalledTimes(1);
    expect(mockStore.setView).not.toHaveBeenCalled();
    expect(mockStore.selectSession).not.toHaveBeenCalled();
  });

  test("start round talk button disables cleanly when voice is unavailable", async () => {
    mockStore.view = "start";
    mockStore.voiceAvailable = false;

    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<AppShell />);
    });

    const talkButton = tree!.root.findByProps({ testID: "start-talk-round-button" });
    expect(talkButton.props.disabled).toBe(true);
    expect(mockStore.toggleListening).not.toHaveBeenCalled();
    expect(mockStore.setView).not.toHaveBeenCalled();
  });

  test("start surface shows the biohazard thinking spinner while Freedom is processing", async () => {
    mockStore.view = "start";
    mockStore.voiceSessionActive = true;
    mockStore.voiceSessionPhase = "processing";

    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<AppShell />);
    });

    const spinner = tree!.root.findByProps({ testID: "voice-thinking-spinner" });
    expect(spinner).toBeTruthy();
  });

  test("chat surface shows the biohazard thinking spinner while Freedom is processing", async () => {
    mockStore.view = "chat";
    mockStore.voiceSessionActive = true;
    mockStore.voiceSessionPhase = "processing";
    mockStore.selectedSessionId = "session-1";
    mockStore.sessions = [
      {
        id: "session-1",
        hostId: "host-1",
        deviceId: "device-1",
        rootPath: "/tmp/workspace",
        title: "Voice thread",
        kind: "operator",
        pinned: false,
        archived: false,
        identity: {
          productName: "Freedom",
          assistantName: "Freedom",
          freedomSessionId: "freedom-session-1",
          originSurface: "mobile_companion",
          workspaceContext: "/tmp/workspace",
          auditCorrelationId: "audit-session-1"
        },
        threadId: null,
        status: "idle",
        activeTurnId: null,
        stopRequested: false,
        lastError: null,
        lastPreview: null,
        createdAt: "2026-04-12T10:00:00.000Z",
        updatedAt: "2026-04-12T10:00:00.000Z",
        lastActivityAt: "2026-04-12T10:00:00.000Z",
      },
    ];
    mockStore.messagesBySession = { "session-1": [] };

    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<AppShell />);
    });

    const spinner = tree!.root.findByProps({ testID: "voice-thinking-spinner" });
    expect(spinner).toBeTruthy();
  });

  test("shared refresh scroll interaction keeps overscroll enabled", () => {
    expect(refreshScrollInteractionProps.overScrollMode).toBe("always");
    expect(refreshScrollInteractionProps.alwaysBounceVertical).toBe(true);
  });

  test("host view stays secondary and keeps operational controls available", async () => {
    mockStore.view = "host";
    mockStore.operatorRunLedger = {
      configured: true,
      activeCount: 1,
      awaitingApprovalCount: 1,
      completedCount: 0,
      updatedAt: "2026-04-12T10:00:00.000Z",
      runs: [
        {
          id: "oprun-1",
          autonomyLevel: "A3",
          hostId: "host-1",
          sessionId: "session-1",
          taskId: null,
          userMessageId: null,
          turnId: null,
          requestedFrom: "mobile_companion",
          title: "Refine autonomy gating",
          summary: "Tighten approval handling before further autonomous execution.",
          status: "awaiting-approval",
          approvalClass: "operator-review",
          selectedOutcome: "build",
          outcomeAssessments: [],
          nextCheckpoint: "Review second- and third-order consequences before approving.",
          consequenceReview: {
            summary: "Risk stays bounded if the gate remains in place before repo execution.",
            secondOrderEffects: [],
            thirdOrderEffects: [],
            blastRadius: "Desktop programming lane only.",
            reversibility: "Changes stay reversible until explicit repo edits are approved and validated.",
            dependencyImpact: "No new external dependencies in this step.",
            operatorBurdenImpact: "Adds one review checkpoint before execution.",
            securityPrivacyImpact: "No new exposure if the gate is respected.",
            stopTriggers: ["Missing consequence review context", "Scope expands beyond governed repo work"],
            reviewedAt: "2026-04-12T10:00:00.000Z"
          },
          evidence: [],
          learningOutcome: null,
          createdAt: "2026-04-12T10:00:00.000Z",
          updatedAt: "2026-04-12T10:00:00.000Z"
        }
      ]
    };

    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<AppShell />);
    });

    const labels = tree!.root.findAll((node) => typeof node.props.children !== "undefined").flatMap((node) => flattenText(node.props.children));

    expect(labels).toContain("Homebase");
    expect(labels).toContain("Mission summary");
    expect(labels).toContain("Operator Runs");
    expect(labels).toContain("Refine autonomy gating");
    expect(labels).toContain("Secondary detail stays here.");
    expect(labels).toContain("Wake Homebase");
    expect(labels).toContain("Trusted Devices");

    await ReactTestRenderer.act(async () => {
      tree!.root.findByProps({ testID: "operator-run-continue-oprun-1" }).props.onPress();
    });

    expect(mockStore.approveOperatorRun).toHaveBeenCalledWith("oprun-1");
  });

  test("host view can open and submit a consequence review draft for a review-gap run", async () => {
    mockStore.view = "host";
    mockStore.operatorRunLedger = {
      configured: true,
      activeCount: 0,
      awaitingApprovalCount: 1,
      completedCount: 0,
      updatedAt: "2026-04-12T10:00:00.000Z",
      runs: [
        {
          id: "oprun-gap",
          autonomyLevel: "A3",
          hostId: "host-1",
          sessionId: null,
          taskId: null,
          userMessageId: null,
          turnId: null,
          requestedFrom: "mobile_companion",
          title: "Review missing run",
          summary: "A governed run still needs its structured consequence review.",
          status: "awaiting-approval",
          approvalClass: "operator-approval",
          selectedOutcome: "build",
          outcomeAssessments: [],
          nextCheckpoint: "Record the consequence review before execution continues.",
          consequenceReview: null,
          evidence: [],
          learningOutcome: null,
          createdAt: "2026-04-12T10:00:00.000Z",
          updatedAt: "2026-04-12T10:00:00.000Z"
        }
      ]
    };

    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<AppShell />);
    });

    expect(tree!.root.findAllByProps({ testID: "operator-run-continue-oprun-gap" })).toHaveLength(0);

    await ReactTestRenderer.act(async () => {
      tree!.root.findByProps({ testID: "operator-run-review-open-oprun-gap" }).props.onPress();
    });

    expect(mockStore.startOperatorRunReview).toHaveBeenCalledWith("oprun-gap");

    mockStore.operatorRunReviewDraft = {
      runId: "oprun-gap",
      summary: "Keep the blast radius contained before desktop execution resumes.",
      blastRadius: "Desktop lane only.",
      reversibility: "Reversible before repo edits ship.",
      dependencyImpact: "No new dependencies in this step.",
      operatorBurdenImpact: "Requires one explicit approval checkpoint.",
      securityPrivacyImpact: "No new sensitive exposure if the gate holds.",
      secondOrderEffects: "medium | Approval flow becomes more explicit",
      thirdOrderEffects: "low | Better auditability across devices",
      stopTriggers: "Scope expands\nReview context goes stale"
    };

    await ReactTestRenderer.act(async () => {
      tree!.update(<AppShell />);
    });

    await ReactTestRenderer.act(async () => {
      tree!.root.findByProps({ testID: "operator-run-review-save-oprun-gap" }).props.onPress();
    });

    expect(mockStore.submitOperatorRunReview).toHaveBeenCalledTimes(1);
  });

  test("sessions view presents the build surface with resume and launch sections", async () => {
    mockStore.view = "sessions";

    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<AppShell />);
    });

    const labels = tree!.root.findAll((node) => typeof node.props.children !== "undefined").flatMap((node) => flattenText(node.props.children));

    expect(labels).toContain("Build");
    expect(labels).toContain("Resume work");
    expect(labels).toContain("Launch build chat");
  });

  test("message control opens a raised composer panel above the footer", async () => {
    mockStore.view = "chat";
    mockStore.sessions = [
      {
        id: "session-1",
        hostId: "host-1",
        deviceId: "device-1",
        title: "Active Thread",
        kind: "operator",
        pinned: false,
        archived: false,
        rootPath: "/tmp/workspace",
        identity: {
          productName: "Freedom",
          assistantName: "Freedom",
          freedomSessionId: "freedom-session-1",
          originSurface: "mobile_companion",
          workspaceContext: "/tmp/workspace",
          auditCorrelationId: "audit-correlation-1"
        },
        threadId: null,
        status: "idle",
        activeTurnId: null,
        stopRequested: false,
        lastError: null,
        lastPreview: "Continue the current operator task.",
        lastActivityAt: "2026-04-12T10:00:00.000Z",
        createdAt: "2026-04-12T10:00:00.000Z",
        updatedAt: "2026-04-12T10:00:00.000Z"
      }
    ];
    mockStore.selectedSessionId = "session-1";

    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<AppShell />);
    });

    await ReactTestRenderer.act(async () => {
      tree!.root.findByProps({ testID: "chat-message-button" }).props.onPress();
    });

    const labels = tree!.root.findAll((node) => typeof node.props.children !== "undefined").flatMap((node) => flattenText(node.props.children));

    expect(tree!.root.findByProps({ testID: "voice-composer-panel" })).toBeTruthy();
    expect(labels).toContain("Text");
    expect(labels).toContain("Message Freedom");
    expect(labels).toContain("Typed turn");
    expect(labels).toContain("−");
  });

  test("recent thread card toggles transcript open and closed", async () => {
    mockStore.view = "chat";
    mockStore.sessions = [
      {
        id: "session-1",
        hostId: "host-1",
        deviceId: "device-1",
        title: "Active Thread",
        kind: "operator",
        pinned: false,
        archived: false,
        rootPath: "/tmp/workspace",
        identity: {
          productName: "Freedom",
          assistantName: "Freedom",
          freedomSessionId: "freedom-session-1",
          originSurface: "mobile_companion",
          workspaceContext: "/tmp/workspace",
          auditCorrelationId: "audit-correlation-1"
        },
        threadId: null,
        status: "idle",
        activeTurnId: null,
        stopRequested: false,
        lastError: null,
        lastPreview: "Continue the current operator task.",
        lastActivityAt: "2026-04-12T10:00:00.000Z",
        createdAt: "2026-04-12T10:00:00.000Z",
        updatedAt: "2026-04-12T10:00:00.000Z"
      }
    ];
    mockStore.selectedSessionId = "session-1";
    mockStore.messagesBySession = {
      "session-1": [
        {
          id: "message-1",
          sessionId: "session-1",
          role: "assistant",
          content: "Recent reply from Freedom.",
          status: "completed",
          errorMessage: null,
          createdAt: "2026-04-12T10:00:00.000Z",
          updatedAt: "2026-04-12T10:00:00.000Z"
        }
      ]
    };

    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<AppShell />);
    });

    let labels = tree!.root.findAll((node) => typeof node.props.children !== "undefined").flatMap((node) => flattenText(node.props.children));
    expect(labels).toContain("Recent thread");
    expect(labels).toContain("Open");
    expect(labels).not.toContain("Tap here to open recent thread");

    await ReactTestRenderer.act(async () => {
      tree!.root.findByProps({ testID: "voice-thread-peek" }).props.onPress();
    });

    labels = tree!.root.findAll((node) => typeof node.props.children !== "undefined").flatMap((node) => flattenText(node.props.children));
    expect(labels).toContain("Collapse");

    await ReactTestRenderer.act(async () => {
      tree!.root.findByProps({ testID: "voice-thread-collapse-button" }).props.onPress();
    });

    labels = tree!.root.findAll((node) => typeof node.props.children !== "undefined").flatMap((node) => flattenText(node.props.children));
    expect(labels).toContain("Recent thread");
    expect(labels).toContain("Open");
  });

  test("stand-alone chat can stage deferred operator runs for later import", async () => {
    mockStore.view = "chat";
    mockStore.token = null;
    mockStore.offlineMode = true;
    mockStore.sessions = [
      {
        id: "local-session-1",
        hostId: "host-1",
        deviceId: "device-1",
        title: "Phone-only planning",
        kind: "operator",
        pinned: false,
        archived: false,
        rootPath: "mobile://offline/local-session-1",
        identity: {
          productName: "Freedom",
          assistantName: "Freedom",
          freedomSessionId: "offline-freedom-session-1",
          originSurface: "mobile_companion",
          workspaceContext: "standalone",
          auditCorrelationId: "offline-audit-1"
        },
        threadId: null,
        status: "idle",
        activeTurnId: null,
        stopRequested: false,
        lastError: null,
        lastPreview: "Stage follow-up operator work.",
        lastActivityAt: "2026-04-12T10:00:00.000Z",
        createdAt: "2026-04-12T10:00:00.000Z",
        updatedAt: "2026-04-12T10:00:00.000Z"
      }
    ];
    mockStore.selectedSessionId = "local-session-1";
    mockStore.offlineImportDrafts = {
      "local-session-1": {
        sessionId: "local-session-1",
        summary: "Offline notes ready for later import.",
        draftTurns: ["Capture the next operator task."],
        importedAt: null,
        continueDraft: null,
        updatedAt: "2026-04-12T10:00:00.000Z"
      }
    };
    mockStore.deferredOperatorRunsBySession = {
      "local-session-1": [
        {
          id: "moboprun-1",
          title: "Queue autonomy follow-up",
          summary: "Prepare the next governed desktop slice after reconnect.",
          sourceSessionId: "local-session-1",
          requestedAt: "2026-04-12T10:00:00.000Z",
          consequenceReview: null,
          importedAt: null,
          importedOperatorRunId: null
        }
      ]
    };

    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<AppShell />);
    });

    const labels = tree!.root.findAll((node) => typeof node.props.children !== "undefined").flatMap((node) => flattenText(node.props.children));
    expect(labels).toContain("Offline Import Review");
    expect(labels).toContain("Deferred Operator Runs");
    expect(labels).toContain("Import Notes + Runs");
    expect(tree!.root.findByProps({ testID: "offline-operator-run-remove-moboprun-1" })).toBeTruthy();

    await ReactTestRenderer.act(async () => {
      tree!.root.findByProps({ testID: "offline-operator-run-add" }).props.onPress();
    });

    expect(mockStore.addDeferredOperatorRunDraft).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(async () => {
      tree!.root.findByProps({ testID: "offline-operator-run-remove-moboprun-1" }).props.onPress();
    });

    expect(mockStore.removeDeferredOperatorRunDraft).toHaveBeenCalledWith("moboprun-1");
  });

  test("connected talk does not surface offline import review after notes were already imported", async () => {
    mockStore.view = "chat";
    mockStore.token = "token-1";
    mockStore.offlineMode = false;
    mockStore.sessions = [
      {
        id: "session-imported",
        hostId: "host-1",
        deviceId: "device-1",
        title: "Connected Thread",
        kind: "operator",
        pinned: false,
        archived: false,
        rootPath: "/tmp/workspace",
        identity: {
          productName: "Freedom",
          assistantName: "Freedom",
          freedomSessionId: "freedom-session-imported",
          originSurface: "mobile_companion",
          workspaceContext: "/tmp/workspace",
          auditCorrelationId: "audit-imported-1"
        },
        threadId: null,
        status: "idle",
        activeTurnId: null,
        stopRequested: false,
        lastError: null,
        lastPreview: "Back on the connected desktop lane.",
        lastActivityAt: "2026-04-12T10:00:00.000Z",
        createdAt: "2026-04-12T10:00:00.000Z",
        updatedAt: "2026-04-12T10:00:00.000Z"
      }
    ];
    mockStore.selectedSessionId = "session-imported";
    mockStore.offlineImportDrafts = {
      "session-imported": {
        sessionId: "session-imported",
        summary: "Imported notes from a temporary offline period.",
        draftTurns: ["Please carry these notes back into the desktop thread."],
        importedAt: "2026-04-12T10:05:00.000Z",
        continueDraft: "I imported mobile offline ideation notes into this chat.",
        updatedAt: "2026-04-12T10:05:00.000Z"
      }
    };
    mockStore.deferredOperatorRunsBySession = {
      "session-imported": []
    };

    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<AppShell />);
    });

    const labels = tree!.root.findAll((node) => typeof node.props.children !== "undefined").flatMap((node) => flattenText(node.props.children));
    expect(labels).not.toContain("Offline Import Review");
    expect(labels).toContain("Recent thread");
  });

  test("actions sheet exposes capabilities and mute while the live voice loop is active", async () => {
    mockStore.view = "chat";
    mockStore.voiceSessionActive = true;
    mockStore.buildLaneSummary = {
      configured: true,
      pendingCount: 1,
      approvedCount: 0,
      blockedCount: 0,
      items: [
        {
          id: "lane-1",
          title: "Electrical contractor app",
          summary: "Capture the business case and kickoff path.",
          approvalState: "needs-approval",
          executionSurface: "pop_os",
          reportingPath: "morning_check_in",
          nextCheckpoint: "Review with Adam"
        }
      ]
    } as AppState["buildLaneSummary"];
    mockStore.sessions = [
      {
        id: "session-1",
        hostId: "host-1",
        deviceId: "device-1",
        title: "Active Thread",
        kind: "operator",
        pinned: false,
        archived: false,
        rootPath: "/tmp/workspace",
        identity: {
          productName: "Freedom",
          assistantName: "Freedom",
          freedomSessionId: "freedom-session-1",
          originSurface: "mobile_companion",
          workspaceContext: "/tmp/workspace",
          auditCorrelationId: "audit-correlation-1"
        },
        threadId: null,
        status: "running",
        activeTurnId: "turn-1",
        stopRequested: false,
        lastError: null,
        lastPreview: "Continue the current operator task.",
        lastActivityAt: "2026-04-12T10:00:00.000Z",
        createdAt: "2026-04-12T10:00:00.000Z",
        updatedAt: "2026-04-12T10:00:00.000Z"
      }
    ];
    mockStore.selectedSessionId = "session-1";

    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<AppShell />);
    });

    await ReactTestRenderer.act(async () => {
      tree!.root.findByProps({ testID: "controls-toggle" }).props.onPress();
    });

    const labels = tree!.root.findAll((node) => typeof node.props.children !== "undefined").flatMap((node) => flattenText(node.props.children));

    expect(labels).toContain("Email & Contacts");
    expect(labels).toContain("Retrieval");
    expect(labels).toContain("Current Thread");
    expect(labels).toContain("Mute");
    expect(labels).toContain("From Conversations To Build");
    expect(labels).toContain("Resume Thread");
  });

  test("settings sheet exposes voice choices and system adjustments", async () => {
    mockStore.view = "chat";
    mockStore.autoSpeak = true;
    mockStore.autoSendVoice = false;
    mockStore.hostStatus.voiceProfile = {
      targetVoice: "marin",
      displayName: "Marin",
      gender: "feminine",
      accent: null,
      tone: "warm",
      warmth: "high",
      pace: "steady",
      notes: null,
      source: "default",
      updatedAt: "2026-04-12T10:00:00.000Z"
    };

    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<AppShell />);
    });

    await ReactTestRenderer.act(async () => {
      tree!.root.findByProps({ testID: "settings-toggle" }).props.onPress();
    });

    const labels = tree!.root.findAll((node) => typeof node.props.children !== "undefined").flatMap((node) => flattenText(node.props.children));

    expect(labels).toContain("Freedom voice");
    expect(labels).toContain("Realtime Freedom voice");
    expect(labels).toContain("Marin • feminine • warm • warmer");
    expect(labels).toContain("Live");
    expect(labels).toContain("Auto-read replies");
    expect(labels).toContain("Auto-send voice turns");
    expect(labels).toContain("Legacy phone voice backup");
    expect(labels).toContain("Open Homebase Voice Settings");
    expect(labels).toContain("System adjustments");
    expect(labels).toContain("Open Homebase");
    expect(labels).toContain("About this build");
  });
});

function flattenText(children: React.ReactNode): string[] {
  if (typeof children === "string") {
    return [children];
  }
  if (typeof children === "number") {
    return [String(children)];
  }
  if (Array.isArray(children)) {
    return children.flatMap((child) => flattenText(child));
  }
  return [];
}
