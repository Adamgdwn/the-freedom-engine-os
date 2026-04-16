import React, { useEffect, useState } from "react";
import { Keyboard, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { FREEDOM_PRODUCT_NAME, FREEDOM_RUNTIME_NAME } from "@freedom/shared";
import { Banner, StatusChip } from "./components";
import { styles } from "./mobileStyles";
import { ChatScreen, HostScreen, PairingScreen, SessionsScreen } from "./screens";
import type { AppState } from "../store/appStore";
import { useAppStore } from "../store/appStore";
import { humanizeVoiceSessionPhase } from "../services/voice/voiceSessionMachine";

export function AppShell(): React.JSX.Element {
  const store = useAppStore();
  const bootstrap = useAppStore((state) => state.bootstrap);
  const setField = useAppStore((state) => state.setField);
  const selectSession = useAppStore((state) => state.selectSession);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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

  const keyboardInset = store.view === "sessions" || store.view === "chat" ? keyboardHeight : 0;
  const screenBottomPadding = Math.max(insets.bottom, 16) + keyboardInset + 96;
  const composerBottomPadding = Math.max(insets.bottom, 12) + 86;
  const voiceStatus = humanizeVoiceStatus(store);
  const chatHeaderSession = store.sessions.find((item) => item.id === store.selectedSessionId) ?? store.sessions[0] ?? null;
  const headerTitle =
    store.view === "chat"
      ? chatHeaderSession?.title ?? "Talk"
      : store.view === "sessions"
        ? "Build"
        : "Homebase";
  const headerSubtitle =
    store.view === "chat"
      ? "Voice-first operator link"
      : store.view === "sessions"
        ? `${store.sessions.length} project chats ready`
        : store.hostStatus?.host.hostName ?? "Desktop oversight";
  const voiceCta = voiceActionCopy(store);

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

  const handleNavPress = (view: "host" | "sessions" | "chat") => {
    if (view !== "chat") {
      store.setView(view);
      return;
    }

    const targetSessionId = store.selectedSessionId ?? store.sessions[0]?.id;
    if (targetSessionId) {
      store.selectSession(targetSessionId).catch((error) => console.warn(error));
      return;
    }

    store.setView("chat");
  };

  const handleTalkPress = () => {
    if (store.view !== "chat") {
      store.setView("chat");
    }
    store.toggleListening().catch((error) => console.warn(error));
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.mobileShell}>
        <View style={styles.mobileTopBar}>
          <View style={styles.mobileIdentity}>
            <Pressable testID="controls-toggle" style={styles.mobileQuickAction} onPress={() => setMenuOpen(true)}>
              <Text style={styles.mobileQuickActionLabel}>≡</Text>
            </Pressable>
            <View style={styles.mobileIdentityCopy}>
              <Text style={styles.mobileIdentityTitle}>{headerTitle}</Text>
              <Text style={styles.mobileIdentitySubtitle}>
                {headerSubtitle} · {store.realtimeConnected ? "Live sync on" : "Reconnecting"}
              </Text>
            </View>
          </View>
          <View style={styles.mobileQuickActions}>
            <Pressable
              style={[styles.mobileQuickAction, store.refreshing ? styles.disabledButton : null]}
              onPress={() => store.refresh().catch((error) => console.warn(error))}
              disabled={store.refreshing}
            >
              <Text style={styles.mobileQuickActionLabel}>↻</Text>
            </Pressable>
            <Pressable
              style={[styles.mobileQuickAction, !store.voiceAvailable ? styles.warningButton : null]}
              onPress={handleTalkPress}
            >
              <Text style={[styles.mobileQuickActionText, !store.voiceAvailable ? styles.warningButtonLabel : null]}>
                {store.voiceSessionActive ? "Live" : "Voice"}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.mobileStatusStrip}>
          <StatusChip label={store.hostStatus?.host.isOnline ? "Desktop online" : "Desktop offline"} tone={store.hostStatus?.host.isOnline ? "teal" : "orange"} />
          <StatusChip label={humanizeCodexState(store.hostStatus?.auth.status ?? "logged_out")} tone={store.hostStatus?.auth.status === "logged_in" ? "teal" : "orange"} />
          <StatusChip label={voiceStatus} tone={store.voiceAvailable ? "teal" : "orange"} />
        </View>

        {store.notice ? <Banner text={store.notice} tone="info" /> : null}
        {store.error ? <Banner text={store.error} tone="error" /> : null}

        <View style={styles.mobileViewport}>
          {store.view === "host" ? <HostScreen store={store} onRefresh={() => store.refresh().catch((error) => console.warn(error))} bottomPadding={screenBottomPadding} /> : null}
          {store.view === "sessions" ? <SessionsScreen store={store} onRefresh={() => store.refresh().catch((error) => console.warn(error))} bottomPadding={screenBottomPadding} /> : null}
          {store.view === "chat" ? (
            <ChatScreen
              store={store}
              onRefresh={() => store.refresh().catch((error) => console.warn(error))}
              keyboardInset={keyboardInset}
              composerBottomPadding={composerBottomPadding}
              manualToolsVisible={controlsExpanded}
            />
          ) : null}
        </View>
      </View>

      <View style={[styles.mobileVoiceDock, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <Pressable
          style={[styles.mobileVoiceButton, !store.voiceAvailable ? styles.warningButton : null]}
          onPress={handleTalkPress}
        >
          <View style={styles.mobileVoiceButtonCopy}>
            <Text style={styles.mobileVoiceButtonEyebrow}>Freedom Voice</Text>
            <Text style={[styles.mobileVoiceButtonTitle, !store.voiceAvailable ? styles.warningButtonLabel : null]}>
              {voiceCta.label}
            </Text>
            <Text style={styles.mobileVoiceButtonHint}>{voiceCta.hint}</Text>
          </View>
          <Text style={styles.mobileVoiceButtonGlyph}>{store.voiceSessionActive ? "■" : "●"}</Text>
        </Pressable>
      </View>

      <Modal visible={menuOpen} animationType="slide" transparent onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.mobileSheetBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.mobileSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.mobileSheetHandle} />
            <View style={styles.mobileSheetHeader}>
              <Text style={styles.mobileSheetEyebrow}>{FREEDOM_RUNTIME_NAME}</Text>
              <Text style={styles.mobileSheetTitle}>{FREEDOM_PRODUCT_NAME}</Text>
              <Text style={styles.mobileSheetSubtitle}>Phone = command and capture. Desktop = build and govern.</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.mobileSheetScroll}>
              <View style={styles.mobileSheetSection}>
                <Text style={styles.mobileSheetSectionTitle}>Destinations</Text>
                {(["chat", "sessions", "host"] as const).map((view) => (
                  <Pressable
                    key={view}
                    style={[styles.mobileSheetNavButton, store.view === view ? styles.mobileSheetNavButtonActive : null]}
                    onPress={() => {
                      handleNavPress(view);
                      setMenuOpen(false);
                    }}
                  >
                    <Text style={[styles.mobileSheetNavLabel, store.view === view ? styles.mobileSheetNavLabelActive : null]}>
                      {labelForView(view)}
                    </Text>
                    <Text style={[styles.mobileSheetNavMeta, store.view === view ? styles.mobileSheetNavMetaActive : null]}>
                      {descriptionForView(view)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.mobileSheetSection}>
                <Text style={styles.mobileSheetSectionTitle}>Session controls</Text>
                <View style={styles.mobileSheetActionRow}>
                  <Pressable
                    style={[styles.secondaryButton, styles.mobileSheetActionButton, store.refreshing ? styles.disabledButton : null]}
                    onPress={() => store.refresh().catch((error) => console.warn(error))}
                    disabled={store.refreshing}
                  >
                    <Text style={styles.secondaryLabel}>{store.refreshing ? "Refreshing..." : "Refresh"}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.secondaryButton, styles.mobileSheetActionButton, !store.voiceAvailable ? styles.warningButton : null]}
                    onPress={() => {
                      handleTalkPress();
                      setMenuOpen(false);
                    }}
                  >
                    <Text style={[styles.secondaryLabel, !store.voiceAvailable ? styles.warningButtonLabel : null]}>
                      {voiceCta.label}
                    </Text>
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
                    <Text style={styles.secondaryLabel}>{controlsExpanded ? "Hide Tools" : "Show Tools"}</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.mobileSheetSection}>
                <Text style={styles.mobileSheetSectionTitle}>Status</Text>
                <View style={styles.statusRow}>
                  <StatusChip label={store.hostStatus?.host.isOnline ? "Host online" : "Host offline"} tone={store.hostStatus?.host.isOnline ? "teal" : "orange"} />
                  <StatusChip label={store.realtimeConnected ? "Live sync on" : "Live sync reconnecting"} tone={store.realtimeConnected ? "teal" : "orange"} />
                </View>
                <Text style={styles.mobileSheetHelper}>
                  {store.hostStatus?.auth.detail ?? "Waiting for desktop heartbeat."}
                </Text>
              </View>

              <Pressable
                style={[styles.secondaryButton, styles.mobileSheetDangerButton]}
                onPress={() => {
                  setMenuOpen(false);
                  store.disconnect().catch((error) => console.warn(error));
                }}
              >
                <Text style={[styles.secondaryLabel, styles.dangerButtonLabel]}>Disconnect Phone</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function labelForView(view: "host" | "sessions" | "chat"): string {
  if (view === "host") {
    return "Homebase";
  }
  if (view === "sessions") {
    return "Build";
  }
  return "Talk";
}

function descriptionForView(view: "host" | "sessions" | "chat"): string {
  if (view === "host") {
    return "Connection health, wake, and trusted device controls.";
  }
  if (view === "sessions") {
    return "Project chats and structured build requests.";
  }
  return "Live voice and the active operator conversation.";
}

function humanizeCodexState(status: "logged_in" | "logged_out" | "error"): string {
  if (status === "logged_in") {
    return "Freedom ready";
  }
  if (status === "error") {
    return "Freedom needs attention";
  }
  return "Freedom login required";
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

function voiceActionCopy(store: AppState): { label: string; hint: string } {
  if (!store.voiceAvailable) {
    return {
      label: "Voice Unavailable",
      hint: "This build cannot start the local speech loop yet."
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
        label: store.voiceSessionActive ? "End Voice" : "Start Voice",
        hint: store.voiceSessionActive
          ? "Keep the text thread visible while you end the voice loop."
          : "Open the continuous voice surface from anywhere."
      };
  }
}
