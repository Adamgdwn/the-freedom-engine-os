import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { AppShell } from "../src/app/AppShell";
import { refreshScrollInteractionProps } from "../src/app/screens";

const mockStore = {
  booting: false,
  refreshing: false,
  sendingMessage: false,
  realtimeConnected: true,
  view: "start",
  baseUrl: "http://127.0.0.1:43111",
  deviceName: "Adam's Phone",
  pairingCode: "",
  token: "device-token",
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
    availability: "ready",
    repairState: "healthy",
    runState: "ready",
    activeSessionCount: 0,
    pairedDeviceCount: 1
  },
  devices: [],
  sessions: [] as Array<any>,
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
  stopSession: jest.fn(async () => undefined),
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
  setRenameDraft: jest.fn(),
  setField: jest.fn(),
  setView: jest.fn()
};

jest.mock("../src/store/appStore", () => ({
  useAppStore: jest.fn((selector?: (state: typeof mockStore) => unknown) => (selector ? selector(mockStore) : mockStore))
}));

describe("refresh affordances", () => {
  beforeEach(() => {
    mockStore.refreshing = false;
    mockStore.view = "start";
    mockStore.sendingMessage = false;
    mockStore.voiceAvailable = true;
    mockStore.realtimeConnected = true;
    mockStore.voiceMuted = false;
    mockStore.voiceSessionActive = false;
    mockStore.sessions = [];
    mockStore.selectedSessionId = null;
    mockStore.hostStatus.auth.status = "logged_in";
    mockStore.refresh.mockClear();
    mockStore.bootstrap.mockClear();
    mockStore.selectSession.mockClear();
    mockStore.setField.mockClear();
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
    expect(labels).toContain("Type");
    expect(labels).toContain("Talk");
    expect(mockStore.bootstrap).toHaveBeenCalled();
  });

  test("shared refresh scroll interaction keeps overscroll enabled", () => {
    expect(refreshScrollInteractionProps.overScrollMode).toBe("always");
    expect(refreshScrollInteractionProps.alwaysBounceVertical).toBe(true);
  });

  test("host view stays secondary and keeps operational controls available", async () => {
    mockStore.view = "host";

    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<AppShell />);
    });

    const labels = tree!.root.findAll((node) => typeof node.props.children !== "undefined").flatMap((node) => flattenText(node.props.children));

    expect(labels).toContain("Homebase");
    expect(labels).toContain("Mission summary");
    expect(labels).toContain("Secondary detail stays here.");
    expect(labels).toContain("Wake Homebase");
    expect(labels).toContain("Trusted Devices");
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

  test("utility sheet exposes destinations and mute while the live voice loop is active", async () => {
    mockStore.view = "chat";
    mockStore.voiceSessionActive = true;
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

    expect(labels).toContain("Start");
    expect(labels).toContain("Homebase");
    expect(labels).toContain("Mute");
    expect(labels).toContain("Auto-send voice turns");
    expect(labels).toContain("Captured turns pause for review instead of sending automatically.");
    expect(labels).toContain("Resume Thread");
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
