import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { FREEDOM_PRIMARY_SESSION_TITLE } from "@freedom/shared";
import { ChatScreen } from "../src/app/screens";
import type { AppState } from "../src/store/appStore";

const baseStore = {
  booting: false,
  refreshing: false,
  sendingMessage: false,
  realtimeConnected: true,
  view: "chat",
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
    runState: "running",
    activeSessionCount: 1,
    pairedDeviceCount: 1
  },
  devices: [],
  sessions: [
    {
      id: "session-1",
      hostId: "host-1",
      deviceId: "device-1",
      title: FREEDOM_PRIMARY_SESSION_TITLE,
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
      lastPreview: null,
      lastActivityAt: "2026-04-12T10:00:00.000Z",
      createdAt: "2026-04-12T10:00:00.000Z",
      updatedAt: "2026-04-12T10:00:00.000Z"
    }
  ],
  selectedSessionId: "session-1",
  messagesBySession: {},
  composer: "check the repo status",
  composerInputMode: "voice",
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
  sendingExternalMessage: false,
  renameDraftBySession: {},
  autoSpeak: false,
  autoSendVoice: false,
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
} as unknown as AppState;

describe("ChatScreen busy send state", () => {
  test("keeps the draft in the bottom bar while the target session is busy", async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ChatScreen
          store={baseStore}
          onRefresh={() => undefined}
          keyboardInset={0}
          footerBottomPadding={12}
          toolSheetBottomPadding={98}
          manualToolsVisible
          onOpenStart={() => undefined}
          onOpenUtility={() => undefined}
          onToggleManualTools={() => undefined}
          onStartOrStopVoice={() => undefined}
        />
      );
    });

    const composer = tree.root.findByProps({ testID: "voice-inline-composer" });
    const secondaryAction = tree.root.findByProps({ testID: "chat-secondary-action-button" });
    const primaryAction = tree.root.findByProps({ testID: "chat-primary-action-button" });
    const labels = tree.root.findAll((node) => typeof node.props.children !== "undefined").flatMap((node) => flattenText(node.props.children));

    expect(composer.props.value).toBe("check the repo status");
    expect(secondaryAction.props.disabled).toBe(true);
    expect(primaryAction.props.disabled).toBe(false);
    expect(labels).toContain("Stop");
  });

  test("keeps Stop enabled when another busy chat is the actual target", async () => {
    const mismatchedStore = {
      ...baseStore,
      sessions: [
        {
          ...baseStore.sessions[0],
          id: "session-1",
          title: FREEDOM_PRIMARY_SESSION_TITLE,
          status: "running"
        },
        {
          ...baseStore.sessions[0],
          id: "session-2",
          title: "Notes",
          status: "idle"
        }
      ],
      selectedSessionId: "session-2"
    } as AppState;

    let tree!: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ChatScreen
          store={mismatchedStore}
          onRefresh={() => undefined}
          keyboardInset={0}
          footerBottomPadding={12}
          toolSheetBottomPadding={98}
          manualToolsVisible
          onOpenStart={() => undefined}
          onOpenUtility={() => undefined}
          onToggleManualTools={() => undefined}
          onStartOrStopVoice={() => undefined}
        />
      );
    });

    const primaryAction = tree.root.findByProps({ testID: "chat-primary-action-button" });
    const labels = tree.root.findAll((node) => typeof node.props.children !== "undefined").flatMap((node) => flattenText(node.props.children));

    expect(primaryAction.props.disabled).toBe(false);
    expect(labels).toContain("Stop");
  });

  test("keeps typed send available from the bottom bar when the selected chat is idle", async () => {
    const idleStore = {
      ...baseStore,
      sessions: [
        {
          ...baseStore.sessions[0],
          id: "session-1",
          title: FREEDOM_PRIMARY_SESSION_TITLE,
          status: "idle",
          activeTurnId: null
        }
      ],
      selectedSessionId: "session-1"
    } as AppState;

    let tree!: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ChatScreen
          store={idleStore}
          onRefresh={() => undefined}
          keyboardInset={0}
          footerBottomPadding={12}
          toolSheetBottomPadding={98}
          manualToolsVisible
          onOpenStart={() => undefined}
          onOpenUtility={() => undefined}
          onToggleManualTools={() => undefined}
          onStartOrStopVoice={() => undefined}
        />
      );
    });

    const secondaryAction = tree.root.findByProps({ testID: "chat-secondary-action-button" });
    const labels = tree.root.findAll((node) => typeof node.props.children !== "undefined").flatMap((node) => flattenText(node.props.children));

    expect(secondaryAction.props.disabled).toBe(false);
    expect(labels).toContain("Talk");
  });

  test("stays voice-first until manual tools are opened", async () => {
    const voiceFirstStore = {
      ...baseStore,
      composer: "",
      sessions: [
        {
          ...baseStore.sessions[0],
          status: "idle",
          activeTurnId: null
        }
      ]
    } as AppState;

    let tree!: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ChatScreen
          store={voiceFirstStore}
          onRefresh={() => undefined}
          keyboardInset={0}
          footerBottomPadding={12}
          toolSheetBottomPadding={98}
          manualToolsVisible={false}
          onOpenStart={() => undefined}
          onOpenUtility={() => undefined}
          onToggleManualTools={() => undefined}
          onStartOrStopVoice={() => undefined}
        />
      );
    });

    const labels = tree.root.findAll((node) => typeof node.props.children !== "undefined").flatMap((node) => flattenText(node.props.children));

    expect(labels).toContain("Start talking");
    expect(tree.root.findAllByProps({ testID: "voice-inline-composer" })).toHaveLength(0);
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
