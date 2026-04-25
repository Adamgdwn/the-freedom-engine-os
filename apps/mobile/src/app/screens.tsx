import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Linking, Platform, Pressable, RefreshControl, ScrollView, Switch, Text, TextInput, View, useWindowDimensions } from "react-native";
import {
  assistantVoiceCatalog,
  FREEDOM_PHONE_PRODUCT_NAME,
  FREEDOM_PRIMARY_SESSION_TITLE,
  FREEDOM_PRODUCT_NAME,
  FREEDOM_RUNTIME_NAME,
  PROJECT_TEMPLATES,
  humanizeMobileConnectionState,
  humanizeMobileVoiceState,
  humanizeResponseStyle,
  summarizeAssistantVoiceProfile
} from "@freedom/shared";
import {
  getEffectiveConnectionState,
  getEffectiveVoiceState,
  type AppState
} from "../store/appStore";
import { isValidExternalEmail } from "../utils/externalSend";
import { findStopTargetSession, formatMessageTimestamp, isOperatorSession, isSessionBusy } from "../utils/operatorConsole";
import { Banner, LabeledInput, MessageBubble, StatusChip, WorkingBubble } from "./components";
import { styles } from "./mobileStyles";
import { DISCONNECTED_ASSISTANT_MODE } from "../generated/runtimeConfig";
import { standaloneSurfaceHint } from "../services/mobile/standalone";

const keyboardDismissMode: "interactive" | "on-drag" = Platform.OS === "ios" ? "interactive" : "on-drag";
export const refreshScrollInteractionProps = {
  alwaysBounceVertical: true,
  keyboardShouldPersistTaps: "always" as const,
  keyboardDismissMode,
  overScrollMode: "always" as const
};

function disconnectedHint(fallbackTitle: string | null): string {
  const disconnectedMode = String(DISCONNECTED_ASSISTANT_MODE);
  if (fallbackTitle) {
    return fallbackTitle;
  }
  switch (disconnectedMode) {
    case "bundled_model":
      return "Cached chats and on-device ideation are ready.";
    case "cloud":
      return "Cached chats and hosted support are ready.";
    default:
      return "Cached chats and saved ideas are ready.";
  }
}

function disconnectedCompanionLabel(state: AppState): string {
  const disconnectedMode = String(DISCONNECTED_ASSISTANT_MODE);
  if (disconnectedMode === "bundled_model") {
    return state.offlineModelState === "ready"
      ? "On-device model ready"
      : state.offlineModelState === "extracting"
        ? "Preparing on-device model"
        : state.offlineModelState === "failed"
          ? "On-device model needs attention"
          : "On-device model bundled";
  }
  if (disconnectedMode === "cloud") {
    return "Hosted support ready";
  }
  return "Saved for later";
}

function disconnectedCompanionTone(state: AppState): "teal" | "orange" {
  const disconnectedMode = String(DISCONNECTED_ASSISTANT_MODE);
  if (disconnectedMode === "bundled_model") {
    return state.offlineModelState === "ready" ? "teal" : "orange";
  }
  return "teal";
}

function connectedVoiceLaneLabel(state: AppState): string {
  return humanizeMobileVoiceState(getEffectiveVoiceState(state));
}

function connectedVoiceLaneTone(state: AppState): "teal" | "orange" {
  if (!state.realtimeConnected || !state.hostStatus?.host.isOnline || state.hostStatus?.auth.status !== "logged_in") {
    return "orange";
  }
  return "teal";
}

function voiceSurfaceCapabilityLabel(state: AppState): string {
  if (!state.token || state.offlineMode) {
    return disconnectedCompanionLabel(state);
  }
  return connectedVoiceLaneLabel(state);
}

function voiceSurfaceCapabilityTone(state: AppState): "teal" | "orange" {
  if (!state.token || state.offlineMode) {
    return disconnectedCompanionTone(state);
  }
  return connectedVoiceLaneTone(state);
}

function ThinkingSpinner(): React.JSX.Element {
  const spin = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => {
      animation.stop();
      spin.stopAnimation();
      spin.setValue(0);
    };
  }, [spin]);

  const rotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View testID="voice-thinking-spinner" style={styles.voiceSurfaceThinkingSpinnerWrap}>
      <Animated.View style={[styles.voiceSurfaceThinkingSpinner, { transform: [{ rotate: rotation }] }]}>
        <Text style={styles.voiceSurfaceThinkingSpinnerGlyph}>☣</Text>
      </Animated.View>
    </View>
  );
}

export function PairingScreen(props: {
  store: AppState;
  keyboardHeight: number;
  insetBottom: number;
  onUseStandalone(): void;
}): React.JSX.Element {
  const { store, keyboardHeight, insetBottom, onUseStandalone } = props;

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insetBottom, 16) + keyboardHeight + 12 }]}
      {...refreshScrollInteractionProps}
    >
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>{FREEDOM_PHONE_PRODUCT_NAME}</Text>
        <Text style={styles.heroTitle}>{FREEDOM_PHONE_PRODUCT_NAME}</Text>
        <Text style={styles.heroBody}>
          Pair to your desktop when you want live sync and governed execution, or keep working on this phone for voice,
          saved work, and later sync whenever the desktop is away.
        </Text>
      </View>

      {store.notice ? <Banner text={store.notice} tone="info" /> : null}
      {store.error ? <Banner text={store.error} tone="error" /> : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Connect</Text>
        <LabeledInput label="Desktop URL" value={store.baseUrl} onChange={(value) => store.setField("baseUrl", value)} />
        {store.baseUrl ? <Text style={styles.supportingText}>Use the exact desktop URL from the install page. It can be a local network URL or a Tailscale URL.</Text> : null}
        <LabeledInput label="Device Name" value={store.deviceName} onChange={(value) => store.setField("deviceName", value)} />
        <LabeledInput
          label="Pairing Code"
          value={store.pairingCode}
          onChange={(value) => store.setField("pairingCode", value)}
          autoCapitalize="characters"
        />
        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            store.connectPairing().catch((error) => console.warn(error));
          }}
        >
          <Text style={styles.primaryLabel}>Link Phone</Text>
        </Pressable>
        <Pressable testID="enter-standalone-button" style={styles.secondaryButton} onPress={onUseStandalone}>
          <Text style={styles.secondaryLabel}>Use On This Phone First</Text>
        </Pressable>
        <Text style={styles.helperText}>
          Freedom Anywhere keeps voice capture and saved work on this phone now. Pair later whenever you want desktop sync and canonical history.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Need Tailscale?</Text>
        <Text style={styles.supportingText}>
          {FREEDOM_RUNTIME_NAME} can help you get started, but it cannot silently enroll devices into your tailnet.
        </Text>
        <Text style={styles.metric}>1. Install Tailscale on this phone and on your desktop.</Text>
        <Text style={styles.metric}>2. Sign both devices into the same Tailscale account.</Text>
        <Text style={styles.metric}>3. Use the desktop URL shown on the install page in the Desktop URL field.</Text>
        <View style={styles.actions}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              Linking.openURL("https://tailscale.com/download").catch((error) => console.warn(error));
            }}
          >
            <Text style={styles.secondaryLabel}>Get Tailscale</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              Linking.openURL("https://login.tailscale.com/start").catch((error) => console.warn(error));
            }}
          >
            <Text style={styles.secondaryLabel}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

export function StartScreen(props: {
  store: AppState;
  onRefresh(): void;
  bottomPadding: number;
  onOpenTypedChat(): void;
  onOpenActions(): void;
  onOpenSettings(): void;
  onStartTalk(): void;
}): React.JSX.Element {
  const { store, onRefresh, bottomPadding, onOpenTypedChat, onOpenActions, onOpenSettings, onStartTalk } = props;
  const { width: windowWidth } = useWindowDimensions();
  const canUseTalk = store.voiceAvailable || store.voiceSessionActive;
  const currentSession = store.sessions.find((item) => item.id === store.selectedSessionId) ?? store.sessions[0] ?? null;
  const connectionState = getEffectiveConnectionState(store);
  const voiceHeadline = !store.token
    ? store.voiceAvailable
      ? "Ready on this phone"
      : "Saved work ready"
    : connectionState === "stand_alone"
      ? "On this phone"
    : connectionState === "reconnecting"
      ? "Reconnecting to desktop"
      : store.voiceAvailable
        ? "Start talking"
        : "Voice unavailable";
  const voiceHint = !store.token
    ? currentSession?.title ?? standaloneSurfaceHint()
    : store.offlineMode
      ? disconnectedHint(currentSession?.title ?? null)
    : currentSession?.title ?? "Freedom is ready when you are.";
  const surfaceMessage = store.error ?? store.notice;
  const surfaceMessageTone = store.error ? "error" : "info";
  const compactVoiceSurface = windowWidth < 400;
  const tightVoiceSurface = windowWidth < 360;
  const showThinkingSpinner = store.voiceSessionPhase === "processing";

  return (
    <ScrollView
      style={styles.screenContent}
      contentContainerStyle={[styles.startContent, { paddingBottom: bottomPadding }]}
      refreshControl={<RefreshControl refreshing={store.refreshing} onRefresh={onRefresh} tintColor="#0f766e" progressViewOffset={12} />}
      {...refreshScrollInteractionProps}
    >
      <View style={styles.voiceSurfaceHeader}>
        <Pressable testID="controls-toggle" style={styles.voiceSurfaceIconButton} onPress={onOpenActions}>
          <Text style={styles.voiceSurfaceIconGlyph}>≡</Text>
        </Pressable>
        <View style={styles.voiceSurfaceTitleWrap}>
          <Text style={styles.voiceSurfaceTitle}>{FREEDOM_PRODUCT_NAME}</Text>
          <Text style={styles.voiceSurfaceTitleAccent}>Voice</Text>
        </View>
        <Pressable testID="settings-toggle" style={styles.voiceSurfaceIconButton} onPress={onOpenSettings}>
          <Text style={styles.voiceSurfaceIconGlyph}>⋮</Text>
        </Pressable>
      </View>
      <View style={styles.voiceSurfaceCenter}>
        <Text
          style={[
            styles.voiceSurfaceHeadline,
            compactVoiceSurface ? styles.voiceSurfaceHeadlineCompact : null,
            tightVoiceSurface ? styles.voiceSurfaceHeadlineTight : null
          ]}
          numberOfLines={2}
        >
          {voiceHeadline}
        </Text>
        <Text style={[styles.voiceSurfaceSubhead, compactVoiceSurface ? styles.voiceSurfaceSubheadCompact : null]}>
          {voiceHint}
        </Text>
        {showThinkingSpinner ? <ThinkingSpinner /> : null}
        {surfaceMessage ? (
          <View
            style={[
              styles.voiceSurfaceStatusPill,
              surfaceMessageTone === "error" ? styles.voiceSurfaceStatusPillError : styles.voiceSurfaceStatusPillInfo
            ]}
          >
            <Text style={styles.voiceSurfaceStatusLabel}>{surfaceMessage}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.voiceSurfaceFooter, styles.startVoiceSurfaceFooter]}>
        <Pressable
          style={[styles.voiceSurfaceRoundButton, !store.voiceSessionActive ? styles.disabledButton : null]}
          onPress={() => store.toggleVoiceMute().catch((error) => console.warn(error))}
          disabled={!store.voiceSessionActive}
        >
          <Text style={styles.voiceSurfaceRoundLabel}>{store.voiceMuted ? "Unmute" : "Mute"}</Text>
        </Pressable>
        <Pressable testID="start-message-button" style={styles.voiceSurfaceCompactButton} onPress={onOpenTypedChat}>
          <Text style={styles.voiceSurfaceCompactLabel}>Text</Text>
        </Pressable>
        <Pressable
          testID="start-talk-round-button"
          style={[styles.voiceSurfaceRoundButton, !canUseTalk ? styles.disabledButton : null]}
          onPress={onStartTalk}
          disabled={!canUseTalk}
        >
          <Text style={styles.voiceSurfaceRoundGlyph}>◉</Text>
        </Pressable>
        <Pressable
          testID="start-talk-action-button"
          style={[styles.voiceSurfaceActionButton, !canUseTalk ? styles.disabledButton : null]}
          onPress={onStartTalk}
          disabled={!canUseTalk}
        >
          <Text style={styles.voiceSurfaceActionLabel}>{store.voiceSessionActive ? "End" : "Talk"}</Text>
        </Pressable>
      </View>

    </ScrollView>
  );
}

export function HostScreen(props: {
  store: AppState;
  onRefresh(): void;
  bottomPadding: number;
}): React.JSX.Element {
  const { store, onRefresh, bottomPadding } = props;
  const currentDevice = store.devices.find((device) => device.id === store.currentDeviceId) ?? null;
  const activeFreedomVoiceId = store.hostStatus?.voiceProfile?.targetVoice ?? store.selectedFreedomVoicePresetId;
  const outboundEmail = store.hostStatus?.outboundEmail ?? null;
  const wakeConfigured = Boolean(store.wakeControl?.enabled);
  const connectionState = getEffectiveConnectionState(store);
  const hostOnline = connectionState === "desktop_linked";
  const connectedOperatorRunLedger = store.token && !store.offlineMode ? store.operatorRunLedger : null;
  const operatorRunReviewDraft = store.operatorRunReviewDraft;
  const operatorRunReviewGapCount =
    connectedOperatorRunLedger?.runs.filter((item) => !item.consequenceReview && item.status !== "completed" && item.status !== "cancelled").length ?? 0;

  return (
    <ScrollView
      style={styles.screenContent}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      refreshControl={<RefreshControl refreshing={store.refreshing} onRefresh={onRefresh} tintColor="#0f766e" progressViewOffset={12} />}
      {...refreshScrollInteractionProps}
    >
      <View style={styles.homebaseHeroCard}>
        <View style={styles.stageHeaderRow}>
          <Text style={styles.stageEyebrow}>Homebase</Text>
          <Text style={styles.stageBadge}>{hostOnline ? "Live" : "Attention"}</Text>
        </View>
        <Text style={styles.stageTitle}>Secondary detail stays here.</Text>
        <Text style={styles.stageBody}>
          Connection health, wake controls, trusted devices, and outbound setup remain available without taking over the phone’s front door.
        </Text>
        <View style={styles.statusRow}>
          <StatusChip label={humanizeMobileConnectionState(connectionState)} tone={hostOnline ? "teal" : "orange"} />
          <StatusChip
            label={humanizeCodexState(store.hostStatus?.auth.status ?? "logged_out")}
            tone={store.hostStatus?.auth.status === "logged_in" ? "teal" : "orange"}
          />
          <StatusChip label={humanizeMobileVoiceState(getEffectiveVoiceState(store))} tone={store.voiceAvailable ? "teal" : "orange"} />
        </View>
      </View>

      {store.notice ? <Banner text={store.notice} tone="info" /> : null}
      {store.error ? <Banner text={store.error} tone="error" /> : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Mission summary</Text>
        <Text style={styles.supportingText}>{store.hostStatus?.auth.detail ?? "Waiting for desktop heartbeat."}</Text>
        <View style={styles.homebaseSummaryGrid}>
          <View style={styles.homebaseSummaryTile}>
            <Text style={styles.homebaseSummaryValue}>{store.hostStatus?.activeSessionCount ?? 0}</Text>
            <Text style={styles.homebaseSummaryLabel}>Active chats</Text>
          </View>
          <View style={styles.homebaseSummaryTile}>
            <Text style={styles.homebaseSummaryValue}>{store.hostStatus?.pairedDeviceCount ?? 0}</Text>
            <Text style={styles.homebaseSummaryLabel}>Paired devices</Text>
          </View>
          <View style={styles.homebaseSummaryTile}>
            <Text style={styles.homebaseSummaryValue}>{store.hostStatus?.runState ?? "ready"}</Text>
            <Text style={styles.homebaseSummaryLabel}>Run state</Text>
          </View>
          <View style={styles.homebaseSummaryTile}>
            <Text style={styles.homebaseSummaryValue}>{store.realtimeConnected ? "live" : "retrying"}</Text>
            <Text style={styles.homebaseSummaryLabel}>Realtime</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.secondaryButton} onPress={() => store.reconnectRealtime().catch((error) => console.warn(error))}>
            <Text style={styles.secondaryLabel}>Reconnect Realtime</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={onRefresh}>
            <Text style={styles.secondaryLabel}>Refresh Homebase</Text>
          </Pressable>
        </View>
      </View>

      {connectedOperatorRunLedger?.configured ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Operator Runs</Text>
          <Text style={styles.supportingText}>
            Connected mode can watch desktop-backed operator runs here so approvals and missing consequence reviews stay visible without pretending the phone executed them.
          </Text>
          <View style={styles.statusRow}>
            <StatusChip label={`${connectedOperatorRunLedger.activeCount} active`} tone={connectedOperatorRunLedger.activeCount ? "orange" : "teal"} />
            <StatusChip
              label={`${connectedOperatorRunLedger.awaitingApprovalCount} approval`}
              tone={connectedOperatorRunLedger.awaitingApprovalCount ? "orange" : "teal"}
            />
            <StatusChip label={`${operatorRunReviewGapCount} review gaps`} tone={operatorRunReviewGapCount ? "orange" : "teal"} />
          </View>
          {connectedOperatorRunLedger.runs.length ? (
            connectedOperatorRunLedger.runs.slice(0, 2).map((item) => (
              <View key={item.id} style={styles.insetCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.metric}>{item.title}</Text>
                  <Text style={styles.metric}>{item.status}</Text>
                </View>
                <Text style={styles.supportingText}>{item.summary}</Text>
                <Text style={styles.metric}>Approval: {item.approvalClass}</Text>
                <Text style={styles.supportingText}>Next checkpoint: {item.nextCheckpoint}</Text>
                {!item.consequenceReview ? <Text style={styles.helperText}>Consequence review still missing.</Text> : null}
                {operatorRunReviewDraft?.runId === item.id ? (
                  <View style={styles.insetCard}>
                    <Text style={styles.inputLabel}>Consequence Review</Text>
                    <Text style={styles.helperText}>
                      Capture the blast radius, reversibility, dependencies, operator burden, security/privacy, plus second- and third-order effects before execution continues.
                    </Text>
                    <LabeledInput
                      label="Review Summary"
                      value={operatorRunReviewDraft.summary}
                      onChange={(value) => store.updateOperatorRunReviewDraft("summary", value)}
                      autoCapitalize="sentences"
                      multiline
                      placeholder="What is the core risk/reward posture of this run?"
                    />
                    <LabeledInput
                      label="Blast Radius"
                      value={operatorRunReviewDraft.blastRadius}
                      onChange={(value) => store.updateOperatorRunReviewDraft("blastRadius", value)}
                      autoCapitalize="sentences"
                      multiline
                      placeholder="Which systems, users, or workflows could this affect?"
                    />
                    <LabeledInput
                      label="Reversibility"
                      value={operatorRunReviewDraft.reversibility}
                      onChange={(value) => store.updateOperatorRunReviewDraft("reversibility", value)}
                      autoCapitalize="sentences"
                      multiline
                      placeholder="How easily can we undo this if it goes sideways?"
                    />
                    <LabeledInput
                      label="Dependency Impact"
                      value={operatorRunReviewDraft.dependencyImpact}
                      onChange={(value) => store.updateOperatorRunReviewDraft("dependencyImpact", value)}
                      autoCapitalize="sentences"
                      multiline
                      placeholder="What dependencies or contracts could shift?"
                    />
                    <LabeledInput
                      label="Operator Burden"
                      value={operatorRunReviewDraft.operatorBurdenImpact}
                      onChange={(value) => store.updateOperatorRunReviewDraft("operatorBurdenImpact", value)}
                      autoCapitalize="sentences"
                      multiline
                      placeholder="What review, follow-up, or monitoring burden does this create?"
                    />
                    <LabeledInput
                      label="Security & Privacy"
                      value={operatorRunReviewDraft.securityPrivacyImpact}
                      onChange={(value) => store.updateOperatorRunReviewDraft("securityPrivacyImpact", value)}
                      autoCapitalize="sentences"
                      multiline
                      placeholder="Any sensitive data, permissions, or exposure changes?"
                    />
                    <LabeledInput
                      label="Second-Order Effects"
                      value={operatorRunReviewDraft.secondOrderEffects}
                      onChange={(value) => store.updateOperatorRunReviewDraft("secondOrderEffects", value)}
                      autoCapitalize="sentences"
                      multiline
                      placeholder="One per line, or use: high | effect summary | mitigation"
                    />
                    <LabeledInput
                      label="Third-Order Effects"
                      value={operatorRunReviewDraft.thirdOrderEffects}
                      onChange={(value) => store.updateOperatorRunReviewDraft("thirdOrderEffects", value)}
                      autoCapitalize="sentences"
                      multiline
                      placeholder="One per line, or use: medium | effect summary | mitigation"
                    />
                    <LabeledInput
                      label="Stop Triggers"
                      value={operatorRunReviewDraft.stopTriggers}
                      onChange={(value) => store.updateOperatorRunReviewDraft("stopTriggers", value)}
                      autoCapitalize="sentences"
                      multiline
                      placeholder="One per line: what should make Freedom pause or stop?"
                    />
                    <View style={styles.actions}>
                      <Pressable
                        testID={`operator-run-review-save-${item.id}`}
                        style={[styles.secondaryButton, store.operatorRunActioningId === item.id ? styles.disabledButton : null]}
                        disabled={store.operatorRunActioningId === item.id}
                        onPress={() => store.submitOperatorRunReview().catch((error) => console.warn(error))}
                      >
                        <Text style={styles.secondaryLabel}>Save Review</Text>
                      </Pressable>
                      <Pressable
                        testID={`operator-run-review-cancel-${item.id}`}
                        style={styles.secondaryButton}
                        onPress={() => store.cancelOperatorRunReview()}
                      >
                        <Text style={styles.secondaryLabel}>Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.actions}>
                    <Pressable
                      testID={`operator-run-review-open-${item.id}`}
                      style={styles.secondaryButton}
                      onPress={() => store.startOperatorRunReview(item.id)}
                    >
                      <Text style={styles.secondaryLabel}>{item.consequenceReview ? "Edit Review" : "Add Consequence Review"}</Text>
                    </Pressable>
                  </View>
                )}
                <View style={styles.actions}>
                  {canContinueOperatorRun(item.status, item.consequenceReview !== null, item.approvalClass) ? (
                    <Pressable
                      testID={`operator-run-continue-${item.id}`}
                      style={[styles.secondaryButton, store.operatorRunActioningId === item.id ? styles.disabledButton : null]}
                      disabled={store.operatorRunActioningId === item.id}
                      onPress={() => store.approveOperatorRun(item.id).catch((error) => console.warn(error))}
                    >
                      <Text style={styles.secondaryLabel}>{item.status === "paused" ? "Resume Run" : "Continue Run"}</Text>
                    </Pressable>
                  ) : null}
                  {canHoldOperatorRun(item.status) ? (
                    <Pressable
                      testID={`operator-run-hold-${item.id}`}
                      style={[
                        styles.secondaryButton,
                        styles.warningButton,
                        store.operatorRunActioningId === item.id ? styles.disabledButton : null
                      ]}
                      disabled={store.operatorRunActioningId === item.id}
                      onPress={() => store.holdOperatorRun(item.id).catch((error) => console.warn(error))}
                    >
                      <Text style={[styles.secondaryLabel, styles.warningButtonLabel]}>Hold For Review</Text>
                    </Pressable>
                  ) : null}
                  {canInterruptOperatorRun(item.status, item.sessionId) ? (
                    <Pressable
                      testID={`operator-run-interrupt-${item.id}`}
                      style={[
                        styles.secondaryButton,
                        styles.dangerButton,
                        store.operatorRunActioningId === item.id ? styles.disabledButton : null
                      ]}
                      disabled={store.operatorRunActioningId === item.id}
                      onPress={() => store.interruptOperatorRun(item.id).catch((error) => console.warn(error))}
                    >
                      <Text style={[styles.secondaryLabel, styles.dangerButtonLabel]}>Interrupt Run</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.helperText}>
              No operator runs are active yet. When Freedom routes governed work, this screen will reflect the live approval and review posture from Homebase.
            </Text>
          )}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Connect</Text>
        <Text style={styles.metric}>
          Installed: {store.hostStatus?.tailscale.installed ? "yes" : "no"} | Connected: {store.hostStatus?.tailscale.connected ? "yes" : "no"}
        </Text>
        <Text style={styles.supportingText}>{store.hostStatus?.tailscale.detail ?? "No Tailscale status reported yet."}</Text>
        {store.hostStatus?.tailscale.suggestedUrl ? (
          <Text style={styles.rootPath}>Suggested mobile URL: {store.hostStatus.tailscale.suggestedUrl}</Text>
        ) : null}
        <View style={styles.actions}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              Linking.openURL(store.hostStatus?.tailscale.installUrl ?? "https://tailscale.com/download").catch((error) =>
                console.warn(error)
              );
            }}
          >
            <Text style={styles.secondaryLabel}>Install</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              Linking.openURL(store.hostStatus?.tailscale.loginUrl ?? "https://login.tailscale.com/start").catch((error) =>
                console.warn(error)
              );
            }}
          >
            <Text style={styles.secondaryLabel}>Sign In</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Voice & reply loop</Text>
        <Text style={styles.supportingText}>Keep spoken replies usable without exposing the full control plane on mobile. Voice auto-send is on by default, but risky or unusually long spoken turns still pause for review before they run.</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.metric}>Voice available</Text>
          <Text style={styles.metric}>{store.voiceAvailable ? "yes" : "no"}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.metric}>Offline model</Text>
          <Text style={styles.metric}>
            {store.offlineModelState === "ready"
              ? "ready"
              : store.offlineModelState === "extracting"
                ? "preparing"
                : store.offlineModelState === "failed"
                  ? "attention"
                  : "bundled"}
          </Text>
        </View>
        {store.offlineModelDetail ? <Text style={styles.helperText}>{store.offlineModelDetail}</Text> : null}
        <View style={styles.rowBetween}>
          <Text style={styles.metric}>Auto-read replies</Text>
          <Switch value={store.autoSpeak} onValueChange={() => store.toggleAutoSpeak().catch((error) => console.warn(error))} />
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.metric}>Auto-send voice turns</Text>
          <Switch value={store.autoSendVoice} onValueChange={() => store.toggleAutoSendVoice().catch((error) => console.warn(error))} />
        </View>
        <View style={styles.insetCard}>
          <Text style={styles.inputLabel}>Realtime Freedom Voice</Text>
          <Text style={styles.helperText}>
            {store.hostStatus?.voiceProfile
              ? `Current live voice profile: ${summarizeAssistantVoiceProfile(store.hostStatus.voiceProfile)}. Ask ${FREEDOM_PRODUCT_NAME} by voice to change this, and restart the session to hear the new live preset.`
              : `Ask ${FREEDOM_PRODUCT_NAME} by voice to change the live realtime voice. Changes to the synthesizer preset take effect on the next voice session.`}
          </Text>
        </View>
        <View style={styles.insetCard}>
          <Text style={styles.inputLabel}>Freedom backup voice</Text>
          <Text style={styles.helperText}>
            The same Freedom preset now carries into hosted spoken replies when realtime is unavailable or when this phone is working offline. The old phone-native TTS is no longer auto-selected.
          </Text>
          <View style={styles.voiceChoiceList}>
            {assistantVoiceCatalog.map((voice) => (
              <Pressable
                key={voice.id}
                style={[styles.voiceChoiceCard, activeFreedomVoiceId === voice.id ? styles.voiceChoiceCardActive : null]}
                onPress={() => store.selectFreedomVoicePreset(voice.id).catch((error) => console.warn(error))}
              >
                <View style={styles.voiceChoiceHeader}>
                  <Text style={[styles.voiceChoiceTitle, activeFreedomVoiceId === voice.id ? styles.voiceChoiceTitleActive : null]}>{voice.label}</Text>
                  {activeFreedomVoiceId === voice.id ? (
                    <View style={[styles.voiceBadge, styles.voiceBadgeActive]}>
                      <Text style={[styles.voiceBadgeLabel, styles.voiceBadgeLabelActive]}>Active</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.voiceChoiceBody, activeFreedomVoiceId === voice.id ? styles.voiceChoiceBodyActive : null]}>
                  {voice.summary} {voice.warmth} warmth, {voice.pace} pace.
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.helperText}>
            Current fallback preset: {summarizeAssistantVoiceProfile(store.hostStatus?.voiceProfile ?? {
              targetVoice: store.selectedFreedomVoicePresetId,
              tone: null,
              warmth: null,
              pace: null
            })}.
          </Text>
        </View>
        <View style={styles.insetCard}>
          <Text style={styles.inputLabel}>Reply Style</Text>
          <View style={styles.optionGrid}>
            {responseStyles.map((style) => (
              <Pressable
                key={style.id}
                style={[styles.optionChip, store.responseStyle === style.id ? styles.optionChipActive : null]}
                onPress={() => store.setResponseStyle(style.id).catch((error) => console.warn(error))}
              >
                <Text style={[styles.optionChipLabel, store.responseStyle === style.id ? styles.optionChipLabelActive : null]}>
                  {style.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.helperText}>
            Voice turns and typed sends will use a {humanizeResponseStyle(store.responseStyle)} reply style.
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.secondaryButton} onPress={() => store.testAssistantVoice().catch((error) => console.warn(error))}>
            <Text style={styles.secondaryLabel}>Test Spoken Reply</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Wake Homebase</Text>
        <Text style={styles.supportingText}>
          {wakeConfigured
            ? hostOnline
              ? `${store.wakeControl?.targetLabel ?? "Homebase"} is online. Use wake-on-request when the desktop is asleep and you want ${FREEDOM_PRODUCT_NAME} back without running the full workstation constantly.`
              : `Wake relay is configured for ${store.wakeControl?.targetLabel ?? "Homebase"}. Tap this when the desktop is asleep and you want the operator console back.`
            : "Wake-on-request is not configured on this desktop yet."}
        </Text>
        {wakeConfigured ? (
          <Pressable
            style={[styles.primaryButton, store.wakeRequesting ? styles.disabledButton : null]}
            disabled={store.wakeRequesting}
            onPress={() => store.triggerWakeHomebase().catch((error) => console.warn(error))}
          >
            <Text style={styles.primaryLabel}>{store.wakeRequesting ? "Waking..." : "Wake Homebase"}</Text>
          </Pressable>
        ) : (
          <Text style={styles.helperText}>
            Add `WAKE_RELAY_BASE_URL`, `WAKE_RELAY_TOKEN`, and `WAKE_RELAY_TARGET_ID` to the desktop `.env`, then refresh this screen.
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>External Reports</Text>
        <Text style={styles.supportingText}>
          {outboundEmail?.enabled
            ? `Email delivery is ready from ${outboundEmail.fromAddress}. In chat, use Email this reply on a completed ${FREEDOM_PRODUCT_NAME} message, or ask naturally by voice and confirm before send.`
            : store.hostStatus
              ? `External email is not ready in the running desktop process yet. If you just added the Resend env vars, restart ${FREEDOM_RUNTIME_NAME} on the desktop and refresh this screen.`
              : `External email is not configured yet. Add the Resend env vars on the desktop gateway before sending outside ${FREEDOM_PRODUCT_NAME}.`}
        </Text>
        <Text style={styles.metric}>
          Provider: {outboundEmail?.provider ?? "none"} | Trusted recipients: {store.outboundRecipients.length}
        </Text>
        <LabeledInput
          label="Recipient Label"
          value={store.outboundRecipientLabelDraft}
          onChange={(value) => store.setField("outboundRecipientLabelDraft", value)}
          autoCapitalize="sentences"
          placeholder="Weekly report, Adam, client ops..."
        />
        <LabeledInput
          label="Recipient Email"
          value={store.outboundRecipientEmailDraft}
          onChange={(value) => store.setField("outboundRecipientEmailDraft", value)}
          autoCapitalize="none"
          placeholder="name@example.com"
        />
        <Pressable style={styles.secondaryButton} onPress={() => store.addOutboundRecipient().catch((error) => console.warn(error))}>
          <Text style={styles.secondaryLabel}>Add Trusted Recipient</Text>
        </Pressable>
        {store.outboundRecipients.length ? (
          store.outboundRecipients.map((recipient) => (
            <View key={recipient.id} style={styles.insetCard}>
              <Text style={styles.metric}>{recipient.label}</Text>
              <Text style={styles.supportingText}>{recipient.destination}</Text>
              <Pressable
                style={[styles.secondaryButton, styles.dangerButton]}
                onPress={() => store.deleteOutboundRecipient(recipient.id).catch((error) => console.warn(error))}
              >
                <Text style={[styles.secondaryLabel, styles.dangerButtonLabel]}>Remove Recipient</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={styles.helperText}>No trusted outbound recipients yet.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>This Phone</Text>
        <Text style={styles.supportingText}>
          Rename the current device and manage Android background updates without leaving this phone.
        </Text>
        <LabeledInput
          label="Device Name"
          value={store.deviceName}
          onChange={(value) => store.setField("deviceName", value)}
          autoCapitalize="sentences"
        />
        <View style={styles.actions}>
          <Pressable style={styles.secondaryButton} onPress={() => store.renameCurrentDevice().catch((error) => console.warn(error))}>
            <Text style={styles.secondaryLabel}>Rename This Phone</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryButton, store.pushSyncing ? styles.disabledButton : null]}
            disabled={store.pushSyncing}
            onPress={() => store.enablePushNotifications().catch((error) => console.warn(error))}
          >
            <Text style={styles.primaryLabel}>{currentDevice?.pushToken ? "Refresh Android Updates" : "Enable Android Updates"}</Text>
          </Pressable>
        </View>
        <Text style={styles.metric}>
          Push status: {!store.pushAvailable ? "This build does not include Android FCM yet." : currentDevice?.pushToken ? "Enabled" : "Not enabled"}
        </Text>
        {currentDevice ? (
          <View style={styles.insetCard}>
            <Text style={styles.inputLabel}>Android Update Preferences</Text>
            {notificationEvents.map((event) => (
              <View key={event.id} style={styles.rowBetween}>
                <View style={styles.preferenceCopy}>
                  <Text style={styles.metric}>{event.label}</Text>
                  <Text style={styles.supportingText}>{event.description}</Text>
                </View>
                <Switch
                  value={currentDevice.notificationPrefs[event.id]}
                  onValueChange={() => {
                    store.toggleNotificationPreference(event.id).catch((error) => console.warn(error));
                  }}
                />
              </View>
            ))}
            <View style={styles.actions}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => store.sendDeviceTestNotification(currentDevice.id, "run_complete").catch((error) => console.warn(error))}
              >
                <Text style={styles.secondaryLabel}>Send Test Update</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Trusted Devices</Text>
        {store.devices.length ? (
          store.devices.map((device) => (
            <View key={device.id} style={styles.insetCard}>
              <View style={styles.statusRow}>
                <Text style={device.id === store.currentDeviceId ? styles.operatorBadge : styles.kindBadge}>
                  {device.id === store.currentDeviceId ? "This Phone" : "Trusted Device"}
                </Text>
                {device.pushToken ? <Text style={styles.pinnedBadge}>Push Ready</Text> : null}
              </View>
              <Text style={styles.metric}>{device.deviceName}</Text>
              <Text style={styles.helperText}>Last seen: {formatMessageTimestamp(device.lastSeenAt)}</Text>
              <View style={styles.actions}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => store.sendDeviceTestNotification(device.id, "run_complete").catch((error) => console.warn(error))}
                >
                  <Text style={styles.secondaryLabel}>Test Update</Text>
                </Pressable>
                <Pressable
                  style={[styles.secondaryButton, styles.dangerButton]}
                  onPress={() => store.revokeDevice(device.id).catch((error) => console.warn(error))}
                >
                  <Text style={[styles.secondaryLabel, styles.dangerButtonLabel]}>
                    {device.id === store.currentDeviceId ? "Revoke This Phone" : "Revoke"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.metric}>No trusted devices have paired yet.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Approved Workspace Context</Text>
        {(store.hostStatus?.host.approvedRoots ?? []).map((rootPath) => (
          <Text key={rootPath} style={styles.rootPath}>
            {rootPath}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

export function SessionsScreen(props: {
  store: AppState;
  onRefresh(): void;
  bottomPadding: number;
}): React.JSX.Element {
  const { store, onRefresh, bottomPadding } = props;
  const [searchQuery, setSearchQuery] = useState("");
  const visibleSessions = store.sessions.filter((item) => {
    const haystack = [item.title, item.rootPath, item.lastPreview ?? "", item.kind].join(" ").toLowerCase();
    return haystack.includes(searchQuery.trim().toLowerCase());
  });

  return (
    <ScrollView
      style={styles.screenContent}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      refreshControl={<RefreshControl refreshing={store.refreshing} onRefresh={onRefresh} tintColor="#0f766e" progressViewOffset={12} />}
      {...refreshScrollInteractionProps}
    >
      <View style={styles.assistantStageCard}>
        <View style={styles.stageHeaderRow}>
          <Text style={styles.stageEyebrow}>Build</Text>
          <Text style={styles.stageBadge}>{visibleSessions.length} ready</Text>
        </View>
        <Text style={styles.stageTitle}>Launch or resume structured work.</Text>
        <Text style={styles.stageBody}>
          Keep project threads moving from the phone while the heavier execution surface remains on desktop.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Resume work</Text>
        <Text style={styles.supportingText}>Open one of your active threads or search for an existing project before starting a fresh kickoff.</Text>
        <LabeledInput
          label="Find Existing Projects"
          value={searchQuery}
          onChange={setSearchQuery}
          autoCapitalize="none"
        />
        {visibleSessions.length ? (
          visibleSessions.slice(0, 3).map((item) => (
            <Pressable key={item.id} style={styles.buildResumeCard} onPress={() => store.selectSession(item.id).catch((error) => console.warn(error))}>
              <View style={styles.statusRow}>
                {isOperatorSession(item) ? <Text style={styles.operatorBadge}>Default {FREEDOM_PRODUCT_NAME}</Text> : <Text style={styles.kindBadge}>{humanizeSessionKind(item.kind)}</Text>}
                {item.pinned ? <Text style={styles.pinnedBadge}>Pinned</Text> : null}
              </View>
              <Text style={styles.buildResumeTitle}>{item.title}</Text>
              <Text style={styles.helperText}>{item.lastPreview ?? item.rootPath}</Text>
            </Pressable>
          ))
        ) : searchQuery.trim() ? (
          <Text style={styles.metric}>No active projects match that search yet.</Text>
        ) : (
          <Text style={styles.metric}>No active projects yet. Launch one from an approved root.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Launch build chat</Text>
        <Text style={styles.supportingText}>Start a new build or project thread with the goal, output, and response style already set.</Text>
        <Text style={styles.supportingText}>{FREEDOM_RUNTIME_NAME} keeps `{FREEDOM_PRIMARY_SESSION_TITLE}` ready for fast voice turns while this surface handles deeper build work.</Text>
        <LabeledInput
          label="Build Name"
          value={store.newSessionTitle}
          onChange={(value) => store.setField("newSessionTitle", value)}
          autoCapitalize="sentences"
          placeholder="New agent build, Android cleanup, desktop shell polish..."
        />
        <LabeledInput
          label="Workspace Root"
          value={store.newSessionRootPath}
          onChange={(value) => store.setField("newSessionRootPath", value)}
        />
        <LabeledInput
          label="Build Goal"
          value={store.projectIntent}
          onChange={(value) => store.setField("projectIntent", value)}
          autoCapitalize="sentences"
          multiline
          placeholder="What should Freedom build, improve, fix, research, or ship from this workspace?"
        />
        <LabeledInput
          label="Desired Deliverable"
          value={store.projectOutputType}
          onChange={(value) => store.setField("projectOutputType", value)}
          autoCapitalize="sentences"
          placeholder="implementation plan, bugfix patch, spec, refactor, release checklist..."
        />
        <LabeledInput
          label="Constraints & Context"
          value={store.projectInstructions}
          onChange={(value) => store.setField("projectInstructions", value)}
          autoCapitalize="sentences"
          multiline
          placeholder="Constraints, deadlines, risks, stack preferences, people context..."
        />
        <View style={styles.insetCard}>
          <Text style={styles.inputLabel}>Project Mode</Text>
          <View style={styles.optionGrid}>
            {PROJECT_TEMPLATES.map((template) => (
              <Pressable
                key={template.id}
                style={[styles.optionChip, store.projectTemplateId === template.id ? styles.optionChipActive : null]}
                onPress={() => store.setField("projectTemplateId", template.id)}
              >
                <Text style={[styles.optionChipLabel, store.projectTemplateId === template.id ? styles.optionChipLabelActive : null]}>
                  {template.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.helperText}>
            {PROJECT_TEMPLATES.find((template) => template.id === store.projectTemplateId)?.description}
          </Text>
        </View>
        <View style={styles.insetCard}>
          <Text style={styles.inputLabel}>Reply Style</Text>
          <View style={styles.optionGrid}>
            {responseStyles.map((style) => (
              <Pressable
                key={style.id}
                style={[styles.optionChip, store.responseStyle === style.id ? styles.optionChipActive : null]}
                onPress={() => store.setResponseStyle(style.id).catch((error) => console.warn(error))}
              >
                <Text style={[styles.optionChipLabel, store.responseStyle === style.id ? styles.optionChipLabelActive : null]}>
                  {style.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.helperText}>New project kickoff turns will use a {humanizeResponseStyle(store.responseStyle)} reply style.</Text>
        </View>
        <Pressable style={styles.primaryButton} onPress={() => store.createProjectSession().catch((error) => console.warn(error))}>
          <Text style={styles.primaryLabel}>Launch Build Chat</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Manage threads</Text>
        <Text style={styles.supportingText}>Rename, reopen, or clean up current Freedom work threads from the phone.</Text>
      </View>

      {visibleSessions.length ? (
        visibleSessions.map((item) => (
          <View key={item.id} style={[styles.card, styles.sessionCard]}>
            <View style={styles.statusRow}>
              {isOperatorSession(item) ? <Text style={styles.operatorBadge}>Default {FREEDOM_PRODUCT_NAME}</Text> : null}
              {!isOperatorSession(item) ? <Text style={styles.kindBadge}>{humanizeSessionKind(item.kind)}</Text> : null}
              {item.pinned ? <Text style={styles.pinnedBadge}>Pinned</Text> : null}
            </View>
            <Text style={styles.sectionTitle}>{item.title}</Text>
            <Text style={styles.rootPath}>{item.rootPath}</Text>
            {item.lastPreview ? <Text style={styles.supportingText}>{item.lastPreview}</Text> : null}
            <Text style={styles.metric}>
              Status: {item.status}
              {item.lastError ? ` | ${item.lastError}` : ""}
            </Text>
            {item.lastActivityAt ? <Text style={styles.metric}>Last activity: {formatMessageTimestamp(item.lastActivityAt)}</Text> : null}
            <LabeledInput
              label="Rename Chat"
              value={store.renameDraftBySession[item.id] ?? item.title}
              onChange={(value) => store.setRenameDraft(item.id, value)}
              autoCapitalize="sentences"
            />
            <View style={[styles.actions, styles.chatActions]}>
              <Pressable style={[styles.secondaryButton, styles.chatActionButton]} onPress={() => store.renameSession(item.id).catch((error) => console.warn(error))}>
                <Text style={styles.secondaryLabel}>Rename</Text>
              </Pressable>
              <Pressable style={[styles.primaryButton, styles.chatActionButton]} onPress={() => store.selectSession(item.id).catch((error) => console.warn(error))}>
                <Text style={styles.primaryLabel}>Open Chat</Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryButton, styles.chatActionButton, styles.dangerButton]}
                onPress={() => store.deleteSession(item.id).catch((error) => console.warn(error))}
              >
                <Text style={[styles.secondaryLabel, styles.dangerButtonLabel]}>Delete Chat</Text>
              </Pressable>
            </View>
          </View>
        ))
      ) : searchQuery.trim() ? <Text style={styles.metric}>No active projects match that search yet.</Text> : <Text style={styles.metric}>No active projects yet. Launch one from an approved root.</Text>}
    </ScrollView>
  );
}

export function ChatScreen(props: {
  store: AppState;
  onRefresh(): void;
  keyboardInset: number;
  footerBottomPadding: number;
  toolSheetBottomPadding: number;
  manualToolsVisible: boolean;
  onOpenActions(): void;
  onOpenSettings(): void;
  onToggleManualTools(): void;
  onStartOrStopVoice(): void;
}): React.JSX.Element {
  const {
    store,
    onRefresh,
    footerBottomPadding,
    toolSheetBottomPadding,
    manualToolsVisible,
    onOpenActions,
    onOpenSettings,
    onToggleManualTools,
    onStartOrStopVoice
  } = props;
  const selectedSession = store.sessions.find((item) => item.id === store.selectedSessionId) ?? null;
  const stopTargetSession = findStopTargetSession(store.selectedSessionId, store.sessions);
  const hasSelectedSession = Boolean(store.selectedSessionId);
  const hasFallbackSession = store.sessions.length > 0;
  const canCreateFromApprovedRoot = Boolean(store.newSessionRootPath || store.hostStatus?.host.approvedRoots[0]);
  const busy = isSessionBusy(stopTargetSession);
  const hasDraftText = Boolean(store.composer.trim());
  const canSend = Boolean(
    (hasSelectedSession || hasFallbackSession || canCreateFromApprovedRoot) &&
      store.composer.trim().length > 0 &&
      !store.sendingMessage &&
      !busy
  );
  const messages = store.selectedSessionId ? store.messagesBySession[store.selectedSessionId] ?? [] : [];
  const lastMessage = messages[messages.length - 1] ?? null;
  const lastMessageSnapshot = lastMessage ? `${lastMessage.id}:${lastMessage.status}:${lastMessage.updatedAt}:${lastMessage.content.length}` : "empty";
  const selectedExternalMessage =
    store.externalDraft && store.externalDraft.sessionId === store.selectedSessionId
      ? messages.find((item) => item.id === store.externalDraft?.messageId) ?? null
      : null;
  const canSendExternal = Boolean(
    store.externalDraft?.subject.trim() &&
      (store.externalDraft?.recipientId || isValidExternalEmail(store.externalDraft?.recipientDestination ?? "")) &&
      !store.sendingExternalMessage
  );
  const scrollRef = useRef<ScrollView | null>(null);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [expandExternalDraft, setExpandExternalDraft] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);
  const [composerMinimized, setComposerMinimized] = useState(false);
  const composerRef = useRef<TextInput | null>(null);
  const transcriptScrollRef = useRef<ScrollView | null>(null);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const showExternalDraftCard = Boolean(store.externalDraft);
  const storedOfflineDraft = store.selectedSessionId ? store.offlineImportDrafts?.[store.selectedSessionId] ?? null : null;
  const offlineDraft =
    store.selectedSessionId
      ? storedOfflineDraft ?? {
          sessionId: store.selectedSessionId,
          summary: "",
          draftTurns: [],
          importedAt: null,
          continueDraft: null,
          updatedAt: ""
        }
      : null;
  const deferredOperatorRuns = store.selectedSessionId ? store.deferredOperatorRunsBySession?.[store.selectedSessionId] ?? [] : [];
  const pendingDeferredOperatorRuns = deferredOperatorRuns.filter((run) => !run.importedAt);
  const hasPendingOfflineDraft = Boolean(
    storedOfflineDraft && !storedOfflineDraft.importedAt && storedOfflineDraft.draftTurns.some((turn) => turn.trim().length > 0)
  );
  const showOfflineImportReview = Boolean(store.selectedSessionId && (store.offlineMode || pendingDeferredOperatorRuns.length || hasPendingOfflineDraft));
  const showComposerPanel = manualToolsVisible || (hasDraftText && !composerMinimized);
  const composerPanelHeight = Math.max(220, Math.min(320, Math.round(windowHeight * 0.32)));
  const transcriptPanelHeight = Math.max(250, Math.min(460, Math.round(windowHeight * 0.46)));
  const shouldShowTranscript = showTranscript || showExternalDraftCard;
  const compactVoiceSurface = windowWidth < 400;
  const tightVoiceSurface = windowWidth < 360;
  const connectionState = getEffectiveConnectionState(store);
  const centerHeadline =
    !store.token && !busy && !store.sendingMessage && !store.voiceSessionActive
      ? "On this phone"
      : connectionState === "stand_alone" && !busy && !store.sendingMessage && !store.voiceSessionActive
      ? "On this phone"
      : connectionState === "reconnecting" && !busy && !store.sendingMessage && !store.voiceSessionActive
      ? "Reconnecting"
      : busy || store.sendingMessage
      ? "Working"
      : store.voiceSessionActive
        ? humanizeVoiceCenterState(store.voiceSessionPhase)
        : store.voiceAvailable
          ? "Start talking"
          : "Voice unavailable";
  const centerSubhead = store.liveTranscript
    ? store.liveTranscript
    : store.voiceAssistantDraft
      ? store.voiceAssistantDraft
      : !store.token
        ? selectedSession?.title ?? standaloneSurfaceHint()
      : store.offlineMode
        ? disconnectedHint(null)
      : busy || store.sendingMessage
        ? `${FREEDOM_RUNTIME_NAME} is still working on the current request.`
        : selectedSession?.title ?? "Talk to Freedom";
  const surfaceMessage = store.error ?? store.notice;
  const surfaceMessageTone = store.error ? "error" : "info";
  const showThinkingSpinner = store.voiceSessionPhase === "processing";
  const primaryActionLabel = busy || store.sendingMessage ? "Stop" : store.voiceSessionActive ? "End" : "Talk";
  const secondaryActionGlyph = showComposerPanel && hasDraftText ? "↑" : "◉";
  const secondaryActionDisabled = showComposerPanel && hasDraftText ? !canSend : !store.voiceAvailable;
  const manualMessageLabel = hasDraftText && !showComposerPanel ? "Draft" : "Message";

  useEffect(() => {
    if (!stickToBottom || !shouldShowTranscript) {
      return;
    }
    const timer = setTimeout(() => {
      transcriptScrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [lastMessageSnapshot, selectedSession?.id, shouldShowTranscript, stickToBottom]);

  useEffect(() => {
    if (!store.externalDraft) {
      setExpandExternalDraft(false);
      return;
    }

    setExpandExternalDraft(manualToolsVisible || !store.externalDraft.confirmationRequired);
  }, [manualToolsVisible, store.externalDraft]);

  useEffect(() => {
    if (showExternalDraftCard) {
      setShowTranscript(true);
    }
  }, [showExternalDraftCard]);

  useEffect(() => {
    if (manualToolsVisible) {
      setComposerMinimized(false);
    }
  }, [manualToolsVisible]);

  useEffect(() => {
    if (!showComposerPanel || showExternalDraftCard) {
      return;
    }

    const timer = setTimeout(() => {
      composerRef.current?.focus();
    }, 80);
    return () => clearTimeout(timer);
  }, [showComposerPanel, showExternalDraftCard]);

  useEffect(() => {
    if (!store.offlineMode) {
      return;
    }
    if (store.sendingMessage || lastMessage?.role === "assistant") {
      setShowTranscript(true);
    }
  }, [lastMessage?.role, lastMessage?.status, store.offlineMode, store.sendingMessage]);

  return (
    <View style={styles.chatScreen}>
      <ScrollView
        ref={scrollRef}
        style={styles.chatScrollArea}
        contentContainerStyle={[styles.chatScrollContent, styles.voiceScreenContent]}
        refreshControl={<RefreshControl refreshing={store.refreshing} onRefresh={onRefresh} tintColor="#0f766e" progressViewOffset={12} />}
        {...refreshScrollInteractionProps}
        onScroll={(event) => {
          const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
          const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
          setStickToBottom(distanceFromBottom < 140);
        }}
        scrollEventThrottle={16}
      >
        <View style={styles.voiceSurfaceHeader}>
          <Pressable testID="controls-toggle" style={styles.voiceSurfaceIconButton} onPress={onOpenActions}>
            <Text style={styles.voiceSurfaceIconGlyph}>≡</Text>
          </Pressable>
          <View style={styles.voiceSurfaceTitleWrap}>
            <Text style={styles.voiceSurfaceTitle}>{FREEDOM_PRODUCT_NAME}</Text>
            <Text style={styles.voiceSurfaceTitleAccent}>Voice</Text>
          </View>
          <Pressable testID="settings-toggle" style={styles.voiceSurfaceIconButton} onPress={onOpenSettings}>
            <Text style={styles.voiceSurfaceIconGlyph}>⋮</Text>
          </Pressable>
        </View>

        <View style={styles.statusRow}>
          <StatusChip
            label={voiceSurfaceCapabilityLabel(store)}
            tone={voiceSurfaceCapabilityTone(store)}
          />
        </View>

        <View style={styles.voiceSurfaceCenter}>
          <Text
            style={[
              styles.voiceSurfaceHeadline,
              compactVoiceSurface ? styles.voiceSurfaceHeadlineCompact : null,
              tightVoiceSurface ? styles.voiceSurfaceHeadlineTight : null
            ]}
            numberOfLines={2}
          >
            {centerHeadline}
          </Text>
          <Text
            style={[styles.voiceSurfaceSubhead, compactVoiceSurface ? styles.voiceSurfaceSubheadCompact : null]}
            numberOfLines={shouldShowTranscript ? 3 : 2}
          >
            {centerSubhead}
          </Text>
          {showThinkingSpinner ? <ThinkingSpinner /> : null}
          {surfaceMessage ? (
            <View
              style={[
                styles.voiceSurfaceStatusPill,
                surfaceMessageTone === "error" ? styles.voiceSurfaceStatusPillError : styles.voiceSurfaceStatusPillInfo
              ]}
            >
              <Text style={styles.voiceSurfaceStatusLabel}>{surfaceMessage}</Text>
            </View>
          ) : null}
        </View>

        {shouldShowTranscript ? (
          <View style={[styles.voiceTranscriptPanel, { maxHeight: transcriptPanelHeight }]}>
            <View style={styles.voiceTranscriptHeader}>
              <Text style={styles.voiceTranscriptTitle}>{selectedSession?.title ?? "Conversation"}</Text>
              <Pressable
                testID="voice-thread-collapse-button"
                style={styles.voiceTranscriptToggle}
                onPress={() => {
                  if (!hasSelectedSession && store.sessions[0]) {
                    store.selectSession(store.sessions[0].id).catch((error) => console.warn(error));
                  }
                  setShowTranscript(false);
                }}
              >
                <Text style={styles.voiceTranscriptToggleLabel}>Collapse</Text>
              </Pressable>
            </View>
            <ScrollView
              ref={transcriptScrollRef}
              style={styles.voiceTranscriptBody}
              contentContainerStyle={styles.voiceTranscriptBodyContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.messages}>
                {messages.length > 0 ? (
                  messages.map((item) => (
                    <MessageBubble
                      key={item.id}
                      message={item}
                      actionLabel={item.role === "assistant" && item.status === "completed" ? "Email this reply" : undefined}
                      onActionPress={
                        item.role === "assistant" && item.status === "completed"
                          ? () => store.beginExternalMessageDraft(item.id, item.sessionId)
                          : undefined
                      }
                    />
                  ))
                ) : (
                  <Text style={styles.metric}>Open a chat to see message history.</Text>
                )}
                {busy || store.sendingMessage ? (
                  <WorkingBubble
                    label={
                      store.sendingMessage
                        ? `${FREEDOM_RUNTIME_NAME} is sending your turn to the desktop.`
                        : `${FREEDOM_RUNTIME_NAME} is still working, but you can interrupt, ask a side question, or queue the next task.`
                    }
                  />
                ) : null}
              </View>
            </ScrollView>
          </View>
        ) : (
          <Pressable
            testID="voice-thread-peek"
            style={styles.voicePeekPill}
            onPress={() => setShowTranscript(true)}
          >
            <Text style={styles.voicePeekEyebrow}>Recent thread</Text>
            <Text style={styles.voicePeekTitle}>{selectedSession?.title ?? "Ready for a new turn"}</Text>
            <Text style={styles.voicePeekMeta} numberOfLines={1}>
              {busy || store.sendingMessage
                ? "Freedom is still working"
                : summarizeThreadPeek(selectedSession, lastMessage, hasFallbackSession, canCreateFromApprovedRoot)}
            </Text>
            <Text style={styles.voicePeekAction}>Open</Text>
          </Pressable>
        )}
      </ScrollView>

      {showExternalDraftCard || showOfflineImportReview ? (
        <View style={[styles.voiceToolSheet, { marginBottom: toolSheetBottomPadding }]}>
          {store.externalDraft ? (
            <View style={styles.insetCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>Send Externally</Text>
                {store.externalDraft.confirmationRequired ? (
                  <Pressable style={styles.secondaryButton} onPress={() => setExpandExternalDraft((value) => !value)}>
                    <Text style={styles.secondaryLabel}>{expandExternalDraft ? "Collapse" : "Edit"}</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.supportingText}>
                {selectedExternalMessage
                  ? store.externalDraft.confirmationRequired
                    ? `${FREEDOM_RUNTIME_NAME} prepared this email draft from your conversation and is waiting for a final confirmation before it sends.`
                    : `You are sending a completed ${FREEDOM_PRODUCT_NAME} reply from this chat to an email recipient.`
                  : `Select a completed ${FREEDOM_PRODUCT_NAME} reply before sending it externally.`}
              </Text>
              {selectedExternalMessage ? (
                <Text style={styles.helperText} numberOfLines={3}>
                  {selectedExternalMessage.content.trim().replace(/\s+/g, " ")}
                </Text>
              ) : null}
              <View style={styles.optionGrid}>
                {store.outboundRecipients.map((recipient) => (
                  <Pressable
                    key={recipient.id}
                    style={[styles.optionChip, store.externalDraft?.recipientId === recipient.id ? styles.optionChipActive : null]}
                    onPress={() => store.updateExternalDraft("recipientId", recipient.id)}
                  >
                    <Text
                      style={[styles.optionChipLabel, store.externalDraft?.recipientId === recipient.id ? styles.optionChipLabelActive : null]}
                    >
                      {recipient.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {!store.outboundRecipients.length ? (
                <Text style={styles.helperText}>Add at least one trusted recipient from Overview first.</Text>
              ) : null}
              {store.externalDraft.confirmationRequired ? (
                <Text style={styles.helperText}>
                  You can confirm by voice with “yes, send it” or cancel with “cancel”. The edit fields stay open below if you want to adjust the draft manually.
                </Text>
              ) : null}
              {!expandExternalDraft ? (
                <View style={styles.insetCard}>
                  <Text style={styles.metric}>To: {store.externalDraft.recipientDestination || "Choose recipient"}</Text>
                  <Text style={styles.metric}>Subject: {store.externalDraft.subject || "Add subject"}</Text>
                </View>
              ) : (
                <>
                  <LabeledInput
                    label="Recipient Email"
                    value={store.externalDraft.recipientDestination}
                    onChange={(value) => store.updateExternalDraft("recipientDestination", value)}
                    autoCapitalize="none"
                    placeholder="name@example.com"
                  />
                  <LabeledInput
                    label="Email Subject"
                    value={store.externalDraft.subject}
                    onChange={(value) => store.updateExternalDraft("subject", value)}
                    autoCapitalize="sentences"
                  />
                  <LabeledInput
                    label="Intro"
                    value={store.externalDraft.intro}
                    onChange={(value) => store.updateExternalDraft("intro", value)}
                    autoCapitalize="sentences"
                    multiline
                    placeholder={`Optional note before the ${FREEDOM_PRODUCT_NAME} output...`}
                  />
                </>
              )}
              <View style={styles.actions}>
                <Pressable style={styles.secondaryButton} onPress={() => store.cancelExternalMessageDraft()}>
                  <Text style={styles.secondaryLabel}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, !canSendExternal ? styles.disabledButton : null]}
                  disabled={!canSendExternal}
                  onPress={() => store.sendExternalMessage().catch((error) => console.warn(error))}
                >
                  <Text style={styles.primaryLabel}>{store.sendingExternalMessage ? "Sending..." : "Send Email"}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
          {showOfflineImportReview && offlineDraft ? (
            <View style={styles.insetCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>Offline Import Review</Text>
                <StatusChip
                  label={offlineDraft.importedAt && !pendingDeferredOperatorRuns.length ? "Imported" : "Pending import"}
                  tone={offlineDraft.importedAt && !pendingDeferredOperatorRuns.length ? "teal" : "orange"}
                />
              </View>
              <Text style={styles.supportingText}>
                Import writes non-executing system notes and awaiting-approval operator requests only. Freedom will not start desktop work until you later send an explicit follow-up turn or approve a governed run.
              </Text>
              <LabeledInput
                label="Summary"
                value={offlineDraft.summary}
                onChange={(value) => store.updateOfflineImportSummary(offlineDraft.sessionId, value)}
                autoCapitalize="sentences"
                multiline
              />
              {offlineDraft.draftTurns.map((turn, index) => (
                <View key={`${offlineDraft.sessionId}-${index}`} style={styles.insetCard}>
                  <Text style={styles.inputLabel}>Draft Turn {index + 1}</Text>
                  <TextInput
                    value={turn}
                    onChangeText={(value) => store.updateOfflineImportDraftTurn(offlineDraft.sessionId, index, value)}
                    multiline
                    autoCapitalize="sentences"
                    textAlignVertical="top"
                    style={[styles.input, styles.inputMultiline]}
                  />
                  <Pressable
                    style={[styles.secondaryButton, styles.dangerButton]}
                    onPress={() => store.removeOfflineImportDraftTurn(offlineDraft.sessionId, index)}
                  >
                  <Text style={[styles.secondaryLabel, styles.dangerButtonLabel]}>Remove Draft Turn</Text>
                </Pressable>
              </View>
              ))}
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>Deferred Operator Runs</Text>
                <Pressable
                  testID="offline-operator-run-add"
                  style={styles.secondaryButton}
                  onPress={() => store.addDeferredOperatorRunDraft()}
                >
                  <Text style={styles.secondaryLabel}>Add Deferred Run</Text>
                </Pressable>
              </View>
              <Text style={styles.helperText}>
                Draft operator work locally here. Importing these items creates governed `A3` runs in `awaiting-approval`; it does not execute them from the phone.
              </Text>
              {deferredOperatorRuns.length ? (
                deferredOperatorRuns.map((run, index) => (
                  <View key={run.id} style={styles.insetCard}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.inputLabel}>Deferred Run {index + 1}</Text>
                      <StatusChip label={run.importedAt ? "Imported" : "Deferred"} tone={run.importedAt ? "teal" : "orange"} />
                    </View>
                    <LabeledInput
                      label="Title"
                      value={run.title}
                      onChange={(value) => store.updateDeferredOperatorRunDraft(run.id, "title", value)}
                      autoCapitalize="sentences"
                    />
                    <LabeledInput
                      label="Summary"
                      value={run.summary}
                      onChange={(value) => store.updateDeferredOperatorRunDraft(run.id, "summary", value)}
                      autoCapitalize="sentences"
                      multiline
                      placeholder="What should Freedom review or prepare once the desktop-backed lane is available?"
                    />
                    {run.importedAt ? (
                      <Text style={styles.helperText}>
                        Imported into the governed operator ledger as {run.importedOperatorRunId ?? run.id}. Review it from connected Homebase before continuing.
                      </Text>
                    ) : (
                      <Pressable
                        testID={`offline-operator-run-remove-${run.id}`}
                        style={[styles.secondaryButton, styles.dangerButton]}
                        onPress={() => store.removeDeferredOperatorRunDraft(run.id)}
                      >
                        <Text style={[styles.secondaryLabel, styles.dangerButtonLabel]}>Remove Deferred Run</Text>
                      </Pressable>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.helperText}>No deferred operator drafts yet. Add one when you want the phone to stage governed work for later desktop review.</Text>
              )}
              <View style={styles.actions}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => store.generateOfflineImportSummary().catch((error) => console.warn(error))}
                >
                  <Text style={styles.secondaryLabel}>{store.offlineSummarizing ? "Summarizing..." : "Refresh Summary"}</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, (!store.token || store.offlineImporting) ? styles.disabledButton : null]}
                  disabled={!store.token || store.offlineImporting}
                  onPress={() => store.importOfflineSession().catch((error) => console.warn(error))}
                >
                  <Text style={styles.primaryLabel}>
                    {store.offlineImporting
                      ? "Importing..."
                      : pendingDeferredOperatorRuns.length && offlineDraft.draftTurns.length
                        ? "Import Notes + Runs"
                        : pendingDeferredOperatorRuns.length
                          ? "Import Deferred Runs"
                          : "Import Notes"}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.actions}>
                <Pressable
                  style={[styles.secondaryButton, !offlineDraft.importedAt ? styles.disabledButton : null]}
                  disabled={!offlineDraft.importedAt}
                  onPress={() => store.continueWithFreedom()}
                >
                  <Text style={styles.secondaryLabel}>Continue with Freedom</Text>
                </Pressable>
              </View>
              <Text style={styles.helperText}>
                {store.token
                  ? "Import when you want these notes and deferred runs added to canonical desktop state. Continue with Freedom only drafts the next live turn."
                  : "Repair the desktop link before importing these notes and deferred runs back into canonical desktop state."}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {showComposerPanel ? (
        <View
          testID="voice-composer-panel"
          style={[styles.voiceComposerPanel, { minHeight: composerPanelHeight, maxHeight: composerPanelHeight + 56 }]}
        >
          <View style={styles.voiceComposerPanelHeader}>
            <View style={styles.voiceComposerPanelCopy}>
              <Text style={styles.voiceComposerPanelEyebrow}>Typed turn</Text>
              <Text style={styles.voiceComposerPanelTitle}>Message Freedom</Text>
            </View>
            <Pressable
              testID="composer-collapse-button"
              style={styles.voiceComposerPanelCollapse}
              onPress={() => {
                setComposerMinimized(true);
                if (manualToolsVisible) {
                  onToggleManualTools();
                }
                composerRef.current?.blur();
                setComposerFocused(false);
              }}
            >
              <Text style={styles.voiceComposerPanelCollapseLabel}>−</Text>
            </Pressable>
          </View>
          <Text style={styles.voiceComposerPanelHint}>
            Type a side note or a full turn here without giving up the live voice controls below.
          </Text>
          <TextInput
            ref={composerRef}
            testID="voice-inline-composer"
            value={store.composer}
            onChangeText={(value) => store.setField("composer", value)}
            placeholder="Type to Freedom"
            placeholderTextColor="#7c7f86"
            autoCapitalize="sentences"
            autoCorrect
            multiline
            blurOnSubmit={false}
            textAlignVertical="top"
            style={[
              styles.voiceComposerPanelInput,
              composerFocused || hasDraftText ? styles.voiceComposerPanelInputActive : null
            ]}
            onFocus={() => setComposerFocused(true)}
            onBlur={() => setComposerFocused(false)}
          />
        </View>
      ) : null}

      <View style={[styles.voiceSurfaceFooter, { marginBottom: footerBottomPadding }]}>
        <Pressable
          style={[styles.voiceSurfaceRoundButton, !store.voiceSessionActive ? styles.disabledButton : null]}
          onPress={() => store.toggleVoiceMute().catch((error) => console.warn(error))}
          disabled={!store.voiceSessionActive}
        >
          <Text style={styles.voiceSurfaceRoundLabel}>{store.voiceMuted ? "Unmute" : "Mute"}</Text>
        </Pressable>
        <Pressable
          testID="chat-message-button"
          style={[styles.voiceSurfaceCompactButton, showComposerPanel ? styles.voiceSurfaceCompactButtonActive : null]}
          onPress={() => {
            if (showComposerPanel) {
              composerRef.current?.focus();
              return;
            }
            setComposerMinimized(false);
            onToggleManualTools();
          }}
        >
          <Text style={[styles.voiceSurfaceCompactLabel, showComposerPanel ? styles.voiceSurfaceCompactLabelActive : null]}>
            {manualMessageLabel === "Draft" ? "Draft" : "Text"}
          </Text>
        </Pressable>
        <Pressable
          testID="chat-secondary-action-button"
          style={[styles.voiceSurfaceRoundButton, secondaryActionDisabled ? styles.disabledButton : null]}
          onPress={() => {
            if (showComposerPanel && hasDraftText) {
              store.sendMessage().catch((error) => console.warn(error));
              return;
            }
            onStartOrStopVoice();
          }}
          disabled={secondaryActionDisabled}
        >
          <Text style={styles.voiceSurfaceRoundGlyph}>{secondaryActionGlyph}</Text>
        </Pressable>
        <Pressable
          testID="chat-primary-action-button"
          style={[
            styles.voiceSurfaceActionButton,
            !busy && !store.sendingMessage && !store.voiceAvailable ? styles.disabledButton : null
          ]}
          onPress={() => {
            if (busy || store.sendingMessage) {
              store.stopSession().catch((error) => console.warn(error));
              return;
            }
            onStartOrStopVoice();
          }}
          disabled={!busy && !store.sendingMessage && !store.voiceAvailable}
        >
          <Text style={styles.voiceSurfaceActionLabel}>{primaryActionLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
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

function canContinueOperatorRun(status: string, hasConsequenceReview: boolean, approvalClass: string): boolean {
  if (approvalClass !== "none" && !hasConsequenceReview) {
    return false;
  }
  return status === "awaiting-approval" || status === "paused";
}

function canHoldOperatorRun(status: string): boolean {
  return status === "queued" || status === "paused";
}

function canInterruptOperatorRun(status: string, sessionId: string | null): boolean {
  return status === "running" && Boolean(sessionId);
}

function humanizeVoiceCenterState(phase: AppState["voiceSessionPhase"]): string {
  switch (phase) {
    case "assistant-speaking":
      return "Speaking";
    case "processing":
      return "Thinking";
    case "listening":
    case "user-speaking":
      return "Listening";
    case "muted":
      return "Muted";
    case "reconnecting":
      return "Reconnecting";
    case "review":
      return "Reviewing";
    case "error":
      return "Voice error";
    default:
      return "Start talking";
  }
}

function summarizeThreadPeek(
  session: AppState["sessions"][number] | null,
  lastMessage: AppState["messagesBySession"][string][number] | null,
  hasFallbackSession: boolean,
  canCreateFromApprovedRoot: boolean
): string {
  if (session?.lastPreview) {
    return session.lastPreview;
  }

  if (lastMessage?.content) {
    return lastMessage.content.trim().replace(/\s+/g, " ").slice(0, 180);
  }

  if (session?.rootPath) {
    return session.rootPath;
  }

  if (hasFallbackSession) {
    return "Resume your latest thread to bring the conversation context back into view.";
  }

  if (canCreateFromApprovedRoot) {
    return "Start the first chat from the approved workspace root, then come back here to continue by voice.";
  }

  return "Open or launch a chat first.";
}

const notificationEvents: Array<{
  id: "run_complete" | "run_failed" | "repair_needed" | "approval_needed";
  label: string;
  description: string;
}> = [
  {
    id: "run_complete",
    label: "Run complete",
    description: "Send an Android update when Freedom finishes a run."
  },
  {
    id: "run_failed",
    label: "Run failed",
    description: "Send an Android update when a run ends in an error."
  },
  {
    id: "repair_needed",
    label: "Repair needed",
    description: "Send an Android update when the desktop link needs repair."
  },
  {
    id: "approval_needed",
    label: "Approval needed",
    description: "Reserve Android updates for approval-required flows."
  }
];

const responseStyles: Array<{
  id: "natural" | "executive" | "technical" | "concise";
  label: string;
}> = [
  { id: "natural", label: "Natural" },
  { id: "executive", label: "Executive" },
  { id: "technical", label: "Technical" },
  { id: "concise", label: "Concise" }
];

function humanizeSessionKind(kind: "operator" | "project" | "admin" | "build" | "notes"): string {
  switch (kind) {
    case "admin":
      return "Admin";
    case "build":
      return "Build";
    case "notes":
      return "Notes";
    case "operator":
      return FREEDOM_PRODUCT_NAME;
    default:
      return "Project";
  }
}
