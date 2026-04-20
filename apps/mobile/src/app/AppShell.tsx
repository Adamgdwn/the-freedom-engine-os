import React, { useEffect, useState } from "react";
import { Keyboard, Modal, Platform, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  assistantVoiceCatalog,
  FREEDOM_PRODUCT_NAME,
  FREEDOM_RUNTIME_NAME,
  humanizeVoiceGender,
  humanizeVoicePace,
  summarizeAssistantVoiceProfile
} from "@freedom/shared";
import { Banner, StatusChip } from "./components";
import { styles } from "./mobileStyles";
import { ChatScreen, HostScreen, PairingScreen, SessionsScreen, StartScreen } from "./screens";
import type { AppState } from "../store/appStore";
import { useAppStore } from "../store/appStore";
import { humanizeVoiceSessionPhase } from "../services/voice/voiceSessionMachine";
import { MOBILE_APP_VERSION_CODE, MOBILE_APP_VERSION_NAME } from "../generated/runtimeConfig";

type UtilitySheetMode = "actions" | "settings";

export function AppShell(): React.JSX.Element {
  const store = useAppStore();
  const bootstrap = useAppStore((state) => state.bootstrap);
  const setField = useAppStore((state) => state.setField);
  const selectSession = useAppStore((state) => state.selectSession);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [sheetMode, setSheetMode] = useState<UtilitySheetMode | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    bootstrap().catch((error) => {
      setField("composer", "");
      console.warn(error);
    });
  }, [bootstrap, setField]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(Math.max(0, event.endCoordinates.height - insets.bottom));
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [insets.bottom]);

  const selectedMessageCount = store.selectedSessionId ? (store.messagesBySession[store.selectedSessionId]?.length ?? 0) : 0;

  useEffect(() => {
    if (!store.token || !store.selectedSessionId || selectedMessageCount > 0) {
      return;
    }

    selectSession(store.selectedSessionId).catch((error) => console.warn(error));
  }, [selectSession, selectedMessageCount, store.selectedSessionId, store.token]);

  const activeSession = store.sessions.find((item) => item.id === store.selectedSessionId) ?? store.sessions[0] ?? null;
  const keyboardInset = store.view === "sessions" || store.view === "chat" ? keyboardHeight : 0;
  const startBottomPadding = Math.max(insets.bottom, 16) + 16;
  const screenBottomPadding = Math.max(insets.bottom, 16) + keyboardInset + 112;
  const footerBottomPadding = keyboardInset > 0 ? keyboardInset + 12 : Math.max(insets.bottom, 12);
  const toolSheetBottomPadding = footerBottomPadding + 86;
  const voiceStatus = humanizeVoiceStatus(store);
  const voiceCta = voiceActionCopy(store);
  const showGlobalBanners = store.view === "host" || store.view === "sessions";
  const liveVoiceSummary = store.hostStatus?.voiceProfile
    ? summarizeAssistantVoiceProfile(store.hostStatus.voiceProfile)
    : "Marin • feminine • warm";

  if (store.booting) {
    return (
      <SafeAreaView style={styles.root} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>{FREEDOM_RUNTIME_NAME}</Text>
          <Text style={styles.heroTitle}>Desktop-grade {FREEDOM_PRODUCT_NAME}, one scan from your phone.</Text>
          <Text style={styles.heroBody}>Loading paired device state and restoring your phone link…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!store.token) {
    return (
      <SafeAreaView style={styles.root} edges={["top", "left", "right", "bottom"]}>
        <PairingScreen store={store} keyboardHeight={keyboardHeight} insetBottom={insets.bottom} />
      </SafeAreaView>
    );
  }

  const handleNavPress = (view: "start" | "host" | "sessions" | "chat") => {
    if (view === "chat") {
      const targetSessionId = store.selectedSessionId ?? store.sessions[0]?.id;
      if (targetSessionId) {
        store.selectSession(targetSessionId).catch((error) => console.warn(error));
        return;
      }
    }

    store.setView(view);
  };

  const handleTalkPress = () => {
    if (store.view !== "chat") {
      handleNavPress("chat");
    }
    store.toggleListening().catch((error) => console.warn(error));
  };

  const handleResumeSession = (sessionId: string) => {
    store.selectSession(sessionId).catch((error) => console.warn(error));
  };

  const handleOpenTypedChat = () => {
    setControlsExpanded(true);
    handleNavPress("chat");
  };

  const handleOpenActions = () => setSheetMode("actions");
  const handleOpenSettings = () => setSheetMode("settings");
  const closeSheet = () => setSheetMode(null);

  return (
      <SafeAreaView style={styles.root} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.mobileShell}>
        {showGlobalBanners ? (
          <View style={styles.mobileBannerStack}>
            {store.notice ? <Banner text={store.notice} tone="info" /> : null}
            {store.error ? <Banner text={store.error} tone="error" /> : null}
          </View>
        ) : null}

        <View style={styles.mobileViewport}>
          {store.view === "start" ? (
            <StartScreen
              store={store}
              bottomPadding={startBottomPadding}
              onRefresh={() => store.refresh().catch((error) => console.warn(error))}
              onOpenTypedChat={handleOpenTypedChat}
              onOpenActions={handleOpenActions}
              onOpenSettings={handleOpenSettings}
              onStartTalk={handleTalkPress}
            />
          ) : null}
          {store.view === "host" ? (
            <HostScreen store={store} onRefresh={() => store.refresh().catch((error) => console.warn(error))} bottomPadding={screenBottomPadding} />
          ) : null}
          {store.view === "sessions" ? (
            <SessionsScreen store={store} onRefresh={() => store.refresh().catch((error) => console.warn(error))} bottomPadding={screenBottomPadding} />
          ) : null}
          {store.view === "chat" ? (
            <ChatScreen
              store={store}
              onRefresh={() => store.refresh().catch((error) => console.warn(error))}
              keyboardInset={keyboardInset}
              footerBottomPadding={footerBottomPadding}
              toolSheetBottomPadding={toolSheetBottomPadding}
              manualToolsVisible={controlsExpanded}
              onOpenActions={handleOpenActions}
              onOpenSettings={handleOpenSettings}
              onToggleManualTools={() => setControlsExpanded((value) => !value)}
              onStartOrStopVoice={handleTalkPress}
            />
          ) : null}
        </View>
      </View>

      <Modal visible={sheetMode !== null} animationType="slide" transparent onRequestClose={closeSheet}>
        <View style={styles.mobileSheetOverlay}>
          <Pressable style={styles.mobileSheetBackdrop} onPress={closeSheet} />
          <View style={styles.mobileSheet}>
            <View style={styles.mobileSheetHandle} />
            <View style={styles.mobileSheetHeader}>
              <Text style={styles.mobileSheetEyebrow}>
                {sheetMode === "settings" ? `${FREEDOM_PRODUCT_NAME} settings` : `${FREEDOM_PRODUCT_NAME} actions`}
              </Text>
              <Text style={styles.mobileSheetTitle}>{sheetMode === "settings" ? `${FREEDOM_PRODUCT_NAME} Settings` : `${FREEDOM_PRODUCT_NAME} Actions`}</Text>
              <Text style={styles.mobileSheetSubtitle}>
                {sheetMode === "settings"
                  ? "Voice choices, reply behavior, runtime posture, and system adjustments live here."
                  : "Capture, retrieval, build routing, and live action controls stay together here without crowding the voice canvas."}
              </Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.mobileSheetScroll}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {sheetMode === "actions" ? (
                <>
                  <View style={styles.mobileSheetSection}>
                    <Text style={styles.mobileSheetSectionTitle}>Actions & capabilities</Text>
                    {[
                      {
                        key: "host",
                        label: "Email & Contacts",
                        meta: "Open trusted recipients, outbound email setup, and contact capture details."
                      },
                      {
                        key: "sessions",
                        label: "Retrieval",
                        meta: "Open build threads, active queues, and retrieval-oriented project context."
                      },
                      {
                        key: "chat",
                        label: "Current Thread",
                        meta: "Jump back into the active voice or typed conversation."
                      }
                    ].map((item) => (
                      <Pressable
                        key={item.key}
                        style={[styles.mobileSheetNavButton, store.view === item.key ? styles.mobileSheetNavButtonActive : null]}
                        onPress={() => {
                          handleNavPress(item.key as "host" | "sessions" | "chat");
                          closeSheet();
                        }}
                      >
                        <Text style={[styles.mobileSheetNavLabel, store.view === item.key ? styles.mobileSheetNavLabelActive : null]}>
                          {item.label}
                        </Text>
                        <Text style={[styles.mobileSheetNavMeta, store.view === item.key ? styles.mobileSheetNavMetaActive : null]}>
                          {item.meta}
                        </Text>
                      </Pressable>
                    ))}
                    <Text style={styles.mobileSheetHelper}>
                      This lane is for live capabilities, retrieval, build routing, and action surfaces that Freedom can bring forward while you stay in voice.
                    </Text>
                  </View>

                  <View style={styles.mobileSheetSection}>
                    <Text style={styles.mobileSheetSectionTitle}>Voice controls</Text>
                    <View style={styles.mobileSheetActionRow}>
                      <Pressable
                        style={[styles.secondaryButton, styles.mobileSheetActionButton, !store.voiceAvailable ? styles.warningButton : null]}
                        onPress={() => {
                          handleTalkPress();
                          closeSheet();
                        }}
                      >
                        <Text style={[styles.secondaryLabel, !store.voiceAvailable ? styles.warningButtonLabel : null]}>{voiceCta.label}</Text>
                      </Pressable>
                      {store.voiceSessionActive ? (
                        <Pressable
                          style={[styles.secondaryButton, styles.mobileSheetActionButton, store.voiceMuted ? styles.warningButton : null]}
                          onPress={() => store.toggleVoiceMute().catch((error) => console.warn(error))}
                        >
                          <Text style={[styles.secondaryLabel, store.voiceMuted ? styles.warningButtonLabel : null]}>
                            {store.voiceMuted ? "Unmute" : "Mute"}
                          </Text>
                        </Pressable>
                      ) : null}
                      <Pressable
                        style={[styles.secondaryButton, styles.mobileSheetActionButton]}
                        onPress={() => setControlsExpanded((value) => !value)}
                      >
                        <Text style={styles.secondaryLabel}>{controlsExpanded ? "Hide Manual Tools" : "Show Manual Tools"}</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.mobileSheetSection}>
                    <Text style={styles.mobileSheetSectionTitle}>Current task</Text>
                    <View style={styles.mobileSheetTaskCard}>
                      <Text style={styles.mobileSheetTaskTitle}>{activeSession?.title ?? "No active thread yet"}</Text>
                      <Text style={styles.mobileSheetHelper}>
                        {activeSession?.lastPreview ??
                          (activeSession ? activeSession.rootPath : "Open Build or Talk to start a governed thread from your phone.")}
                      </Text>
                      {activeSession ? (
                        <Pressable
                          style={[styles.secondaryButton, styles.mobileSheetActionButton]}
                          onPress={() => {
                            handleResumeSession(activeSession.id);
                            closeSheet();
                          }}
                        >
                          <Text style={styles.secondaryLabel}>Resume Thread</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>

                  {store.buildLaneSummary?.configured ? (
                    <View style={styles.mobileSheetSection}>
                      <Text style={styles.mobileSheetSectionTitle}>From Conversations To Build</Text>
                      <Text style={styles.mobileSheetHelper}>
                        Freedom can decide when a voice thread has become real build work, ask to route it, and keep the governed queue here.
                      </Text>
                      <View style={styles.statusRow}>
                        <StatusChip label={`${store.buildLaneSummary.pendingCount} pending`} tone={store.buildLaneSummary.pendingCount ? "orange" : "teal"} />
                        <StatusChip label={`${store.buildLaneSummary.approvedCount} approved`} tone="teal" />
                        <StatusChip label={`${store.buildLaneSummary.blockedCount} blocked`} tone={store.buildLaneSummary.blockedCount ? "orange" : "teal"} />
                      </View>
                      {store.buildLaneSummary.items.length ? (
                        store.buildLaneSummary.items.slice(0, 3).map((item) => (
                          <View key={item.id} style={styles.mobileSheetTaskCard}>
                            <View style={styles.rowBetween}>
                              <Text style={styles.mobileSheetTaskTitle}>{item.title}</Text>
                              <Text style={styles.mobileSheetHelper}>{humanizeBuildLaneApproval(item.approvalState)}</Text>
                            </View>
                            <Text style={styles.mobileSheetHelper}>{item.summary}</Text>
                            <Text style={styles.metric}>Next checkpoint: {item.nextCheckpoint || "Review on desktop"}</Text>
                            <Text style={styles.mobileSheetHelper}>
                              {item.executionSurface} • {item.reportingPath}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <View style={styles.mobileSheetInfoCard}>
                          <Text style={styles.mobileSheetHelper}>
                            No conversation-originated Pop!_OS build items are queued yet. When an idea matures into governed implementation work, Freedom can route it here.
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : null}

                  <View style={styles.mobileSheetSection}>
                    <Text style={styles.mobileSheetSectionTitle}>Status</Text>
                    <View style={styles.statusRow}>
                      <StatusChip label={store.hostStatus?.host.isOnline ? "Desktop online" : "Desktop offline"} tone={store.hostStatus?.host.isOnline ? "teal" : "orange"} />
                      <StatusChip label={store.realtimeConnected ? "Live sync on" : "Live sync reconnecting"} tone={store.realtimeConnected ? "teal" : "orange"} />
                      <StatusChip label={voiceStatus} tone={store.voiceAvailable ? "teal" : "orange"} />
                    </View>
                    <Text style={styles.mobileSheetHelper}>{store.hostStatus?.auth.detail ?? "Waiting for desktop heartbeat."}</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.mobileSheetSection}>
                    <Text style={styles.mobileSheetSectionTitle}>Freedom voice</Text>
                    <View style={styles.mobileSheetInfoCard}>
                      <InfoRow
                        label="Realtime Freedom voice"
                        value={liveVoiceSummary}
                      />
                      <Text style={styles.mobileSheetHelper}>
                        These are the actual live Freedom voices. Marin is the currently installed default unless you switch it here. The old phone fallback voices stay in Homebase because they are not the same thing as the voice you hear in live conversation.
                      </Text>
                    </View>
                    <View style={styles.voiceChoiceList}>
                      {assistantVoiceCatalog.map((voice) => {
                        const activeVoiceId = store.hostStatus?.voiceProfile?.targetVoice ?? "marin";
                        const isActive = activeVoiceId === voice.id;
                        return (
                          <Pressable
                            key={voice.id}
                            style={[styles.voiceChoiceCard, isActive ? styles.voiceChoiceCardActive : null]}
                            onPress={() => store.selectFreedomVoicePreset(voice.id)}
                          >
                            <View style={styles.voiceChoiceHeader}>
                              <Text style={[styles.voiceChoiceTitle, isActive ? styles.voiceChoiceTitleActive : null]}>
                                {voice.label}
                              </Text>
                              {isActive ? (
                                <View style={[styles.voiceBadge, styles.voiceBadgeActive]}>
                                  <Text style={[styles.voiceBadgeLabel, styles.voiceBadgeLabelActive]}>Live</Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={[styles.voiceChoiceBody, isActive ? styles.voiceChoiceBodyActive : null]}>
                              {voice.summary} {capitalize(humanizeVoiceGender(voice.gender))} presentation, {humanizeVoicePace(voice.pace)} pace, {voice.warmth} warmth.
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <View style={styles.rowBetween}>
                      <Text style={styles.metric}>Auto-read replies</Text>
                      <Switch value={store.autoSpeak} onValueChange={() => store.toggleAutoSpeak().catch((error) => console.warn(error))} />
                    </View>
                    <View style={styles.rowBetween}>
                      <Text style={styles.metric}>Auto-send voice turns</Text>
                      <Switch value={store.autoSendVoice} onValueChange={() => store.toggleAutoSendVoice().catch((error) => console.warn(error))} />
                    </View>
                    <Text style={styles.mobileSheetHelper}>
                      {store.autoSendVoice
                        ? "Captured low-risk turns send immediately after recognition."
                        : "Captured turns pause for review instead of sending automatically."}
                    </Text>
                    <View style={styles.insetCard}>
                      <Text style={styles.inputLabel}>Phone fallback voice</Text>
                      <Text style={styles.helperText}>
                        The phone&apos;s local spoken-reply fallback voices live in Homebase. They are secondary and can sound odd because they are device TTS voices, not Freedom&apos;s live realtime voice presets.
                      </Text>
                      <View style={styles.actions}>
                        <Pressable
                          style={styles.secondaryButton}
                          onPress={() => {
                            handleNavPress("host");
                            closeSheet();
                          }}
                        >
                          <Text style={styles.secondaryLabel}>Open Homebase Voice Settings</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>

                  <View style={styles.mobileSheetSection}>
                    <Text style={styles.mobileSheetSectionTitle}>System adjustments</Text>
                    <View style={styles.mobileSheetActionRow}>
                      <Pressable
                        style={[styles.secondaryButton, styles.mobileSheetActionButton]}
                        onPress={() => {
                          handleNavPress("host");
                          closeSheet();
                        }}
                      >
                        <Text style={styles.secondaryLabel}>Open Homebase</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.secondaryButton, styles.mobileSheetActionButton, store.refreshing ? styles.disabledButton : null]}
                        onPress={() => store.refresh().catch((error) => console.warn(error))}
                        disabled={store.refreshing}
                      >
                        <Text style={styles.secondaryLabel}>{store.refreshing ? "Refreshing..." : "Refresh"}</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.secondaryButton, styles.mobileSheetActionButton]}
                        onPress={() => store.reconnectRealtime().catch((error) => console.warn(error))}
                      >
                        <Text style={styles.secondaryLabel}>Reconnect Realtime</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.mobileSheetSection}>
                    <Text style={styles.mobileSheetSectionTitle}>About this build</Text>
                    <View style={styles.mobileSheetInfoCard}>
                      <InfoRow label="App version" value={MOBILE_APP_VERSION_NAME} />
                      <InfoRow label="Build code" value={String(MOBILE_APP_VERSION_CODE)} />
                      <InfoRow label="Product" value={`${FREEDOM_PRODUCT_NAME} mobile companion`} />
                      <InfoRow label="Voice runtime" value={humanizeVoiceRuntimeMode(store)} />
                      <Text style={styles.mobileSheetHelper}>
                        Use this section to confirm the phone is running the APK you expect before testing voice or UI changes.
                      </Text>
                    </View>
                  </View>
                </>
              )}

              <Pressable
                style={[styles.secondaryButton, styles.mobileSheetDangerButton]}
                onPress={() => {
                  closeSheet();
                  store.disconnect().catch((error) => console.warn(error));
                }}
              >
                <Text style={[styles.secondaryLabel, styles.dangerButtonLabel]}>Disconnect Phone</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.mobileSheetInfoRow}>
      <Text style={styles.mobileSheetInfoLabel}>{label}</Text>
      <Text style={styles.mobileSheetInfoValue}>{value}</Text>
    </View>
  );
}

function humanizeVoiceStatus(store: AppState): string {
  if (!store.voiceAvailable) {
    return "Voice unavailable";
  }
  if (store.voiceSessionActive) {
    if (store.voiceMuted) {
      return "Microphone muted";
    }
    return humanizeVoiceSessionPhase(store.voiceSessionPhase);
  }
  if (!store.realtimeConnected) {
    return "Desktop reconnecting";
  }
  if (!store.hostStatus?.host.isOnline) {
    return "Desktop offline";
  }
  if (store.hostStatus?.auth.status !== "logged_in") {
    return "Freedom needs login";
  }
  return "Ready for voice";
}

function humanizeVoiceRuntimeMode(store: AppState): string {
  return store.voiceRuntimeMode === "realtime_primary" ? "LiveKit + OpenAI Realtime" : "Device STT/TTS fallback";
}

function humanizeBuildLaneApproval(approvalState: string): string {
  switch (approvalState) {
    case "approved":
      return "Approved";
    case "blocked":
      return "Blocked";
    case "pending_operator":
      return "Needs approval";
    default:
      return "In review";
  }
}

function voiceActionCopy(store: AppState): { label: string; hint: string } {
  if (!store.voiceAvailable) {
    return {
      label: "Voice Unavailable",
      hint: "This build cannot start the current phone voice runtime yet."
    };
  }

  switch (store.voiceSessionPhase) {
    case "assistant-speaking":
      return {
        label: "Interrupt Freedom",
        hint: "Stop the reply and jump back into the conversation."
      };
    case "processing":
      return {
        label: "Processing…",
        hint: "Freedom is shaping the current turn."
      };
    case "listening":
    case "user-speaking":
      return {
        label: "Listening…",
        hint: "Speak naturally or tap again to end the voice loop."
      };
    case "reconnecting":
      return {
        label: "Reconnecting…",
        hint: "Trying to restore the continuous voice session."
      };
    case "error":
      return {
        label: "Retry Voice",
        hint: "The voice loop hit an error and can be restarted."
      };
    case "review":
      return {
        label: "Review Voice Turn",
        hint: "Freedom paused for confirmation before sending."
      };
    case "muted":
      return {
        label: "Voice Muted",
        hint: "Freedom is live, but your microphone is muted."
      };
    default:
      return {
        label: store.voiceSessionActive ? "End Voice" : "Tap to Talk",
        hint: store.voiceSessionActive
          ? "Keep the active thread nearby while you end the voice loop."
          : "Open the continuous voice surface from anywhere."
      };
  }
}

function capitalize(value: string): string {
  if (!value) {
    return value;
  }
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
