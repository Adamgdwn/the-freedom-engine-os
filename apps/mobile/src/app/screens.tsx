import React, { useEffect, useRef, useState } from "react";
import { Linking, Platform, Pressable, RefreshControl, ScrollView, Switch, Text, TextInput, View } from "react-native";
import {
  FREEDOM_PRIMARY_SESSION_TITLE,
  FREEDOM_PRODUCT_NAME,
  FREEDOM_RUNTIME_NAME,
  PROJECT_TEMPLATES,
  humanizeResponseStyle
} from "@freedom/shared";
import type { AppState } from "../store/appStore";
import {
  buildVoiceSelectionBadges,
  describeVoiceOption,
  describeVoiceOptionRecommendation,
  shortlistVoiceOptions
} from "../services/voice/voiceOptionPersona";
import { isValidExternalEmail } from "../utils/externalSend";
import { findStopTargetSession, formatMessageTimestamp, isOperatorSession, isSessionBusy } from "../utils/operatorConsole";
import { Banner, LabeledInput, MessageBubble, StatusChip, WorkingBubble } from "./components";
import { styles } from "./mobileStyles";

const keyboardDismissMode: "interactive" | "on-drag" = Platform.OS === "ios" ? "interactive" : "on-drag";
export const refreshScrollInteractionProps = {
  alwaysBounceVertical: true,
  keyboardShouldPersistTaps: "always" as const,
  keyboardDismissMode,
  overScrollMode: "always" as const
};

export function PairingScreen(props: {
  store: AppState;
  keyboardHeight: number;
  insetBottom: number;
}): React.JSX.Element {
  const { store, keyboardHeight, insetBottom } = props;

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insetBottom, 16) + keyboardHeight + 12 }]}
      {...refreshScrollInteractionProps}
    >
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Freedom Companion</Text>
        <Text style={styles.heroTitle}>{FREEDOM_PRODUCT_NAME}</Text>
        <Text style={styles.heroBody}>
          Turn this phone into a private Freedom companion for your desktop. Pair once, keep API keys off the device,
          and use voice or text from anywhere on your tailnet.
        </Text>
      </View>

      {store.notice ? <Banner text={store.notice} tone="info" /> : null}
      {store.error ? <Banner text={store.error} tone="error" /> : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Connect</Text>
        <LabeledInput label="Desktop URL" value={store.baseUrl} onChange={(value) => store.setField("baseUrl", value)} />
        {store.baseUrl ? <Text style={styles.supportingText}>Desktop URL is pre-filled for this host.</Text> : null}
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
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Need Tailscale?</Text>
        <Text style={styles.supportingText}>
          {FREEDOM_RUNTIME_NAME} can help you get started, but it cannot silently enroll devices into your tailnet.
        </Text>
        <Text style={styles.metric}>1. Install Tailscale on this phone and on your desktop.</Text>
        <Text style={styles.metric}>2. Sign both devices into the same Tailscale account.</Text>
        <Text style={styles.metric}>3. Use the desktop Tailscale URL in the Desktop URL field.</Text>
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
  onOpenUtility(): void;
  onStartTalk(): void;
}): React.JSX.Element {
  const { store, onRefresh, bottomPadding, onOpenTypedChat, onOpenUtility, onStartTalk } = props;
  const currentSession = store.sessions.find((item) => item.id === store.selectedSessionId) ?? store.sessions[0] ?? null;
  const voiceHeadline = store.voiceAvailable ? "Start talking" : "Voice unavailable";
  const voiceHint = currentSession?.title ?? "Freedom is ready when you are.";
  const surfaceMessage = store.error ?? store.notice;
  const surfaceMessageTone = store.error ? "error" : "info";

  return (
    <ScrollView
      style={styles.screenContent}
      contentContainerStyle={[styles.startContent, { paddingBottom: bottomPadding }]}
      refreshControl={<RefreshControl refreshing={store.refreshing} onRefresh={onRefresh} tintColor="#0f766e" progressViewOffset={12} />}
      {...refreshScrollInteractionProps}
    >
      <View style={styles.voiceSurfaceHeader}>
        <Pressable testID="controls-toggle" style={styles.voiceSurfaceIconButton} onPress={onOpenUtility}>
          <Text style={styles.voiceSurfaceIconGlyph}>≡</Text>
        </Pressable>
        <View style={styles.voiceSurfaceTitleWrap}>
          <Text style={styles.voiceSurfaceTitle}>{FREEDOM_PRODUCT_NAME}</Text>
          <Text style={styles.voiceSurfaceTitleAccent}>Voice</Text>
        </View>
        <Pressable style={styles.voiceSurfaceIconButton} onPress={onOpenUtility}>
          <Text style={styles.voiceSurfaceIconGlyph}>⋮</Text>
        </Pressable>
      </View>

      <View style={styles.voiceSurfaceCenter}>
        <Text style={styles.voiceSurfaceHeadline}>{voiceHeadline}</Text>
        <Text style={styles.voiceSurfaceSubhead}>{voiceHint}</Text>
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
        <Pressable style={styles.voiceSurfaceRoundButton} onPress={onOpenUtility}>
          <Text style={styles.voiceSurfaceRoundGlyph}>+</Text>
        </Pressable>
        <Pressable style={styles.voiceSurfaceTypeButton} onPress={onOpenTypedChat}>
          <Text style={styles.voiceSurfaceTypeLabel}>Type</Text>
        </Pressable>
        <Pressable style={styles.voiceSurfaceRoundButton} onPress={onStartTalk}>
          <Text style={styles.voiceSurfaceRoundGlyph}>◉</Text>
        </Pressable>
        <Pressable style={[styles.voiceSurfaceActionButton, !store.voiceAvailable ? styles.disabledButton : null]} onPress={onStartTalk} disabled={!store.voiceAvailable}>
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
  const selectedVoice = store.assistantVoices.find((voice) => voice.id === store.selectedAssistantVoiceId) ?? null;
  const curatedVoices = shortlistVoiceOptions(store.assistantVoices, store.selectedAssistantVoiceId, 4);
  const outboundEmail = store.hostStatus?.outboundEmail ?? null;
  const wakeConfigured = Boolean(store.wakeControl?.enabled);
  const hostOnline = store.hostStatus?.availability === "ready";

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
          <StatusChip label={store.hostStatus?.host.isOnline ? "Desktop online" : "Desktop offline"} tone={store.hostStatus?.host.isOnline ? "teal" : "orange"} />
          <StatusChip
            label={humanizeCodexState(store.hostStatus?.auth.status ?? "logged_out")}
            tone={store.hostStatus?.auth.status === "logged_in" ? "teal" : "orange"}
          />
          <StatusChip label={humanizeAvailability(store.hostStatus?.availability ?? "needs_attention")} tone={store.hostStatus?.availability === "ready" ? "teal" : "orange"} />
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
          <Text style={styles.metric}>Auto-read replies</Text>
          <Switch value={store.autoSpeak} onValueChange={() => store.toggleAutoSpeak().catch((error) => console.warn(error))} />
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.metric}>Auto-send voice turns</Text>
          <Switch value={store.autoSendVoice} onValueChange={() => store.toggleAutoSendVoice().catch((error) => console.warn(error))} />
        </View>
        <View style={styles.insetCard}>
          <Text style={styles.inputLabel}>Spoken Reply Voice</Text>
          <Text style={styles.helperText}>
            Freedom is now only surfacing the strongest installed voices instead of the full raw list, with cues aimed at sounding less mechanical.
          </Text>
          <View style={styles.voiceChoiceList}>
            <Pressable
              style={[styles.voiceChoiceCard, !store.selectedAssistantVoiceId ? styles.voiceChoiceCardActive : null]}
              onPress={() => store.selectAssistantVoice(null).catch((error) => console.warn(error))}
            >
              <View style={styles.voiceChoiceHeader}>
                <Text style={[styles.voiceChoiceTitle, !store.selectedAssistantVoiceId ? styles.voiceChoiceTitleActive : null]}>Automatic</Text>
                <View style={[styles.voiceBadge, !store.selectedAssistantVoiceId ? styles.voiceBadgeActive : null]}>
                  <Text style={[styles.voiceBadgeLabel, !store.selectedAssistantVoiceId ? styles.voiceBadgeLabelActive : null]}>Recommended</Text>
                </View>
              </View>
              <Text style={[styles.voiceChoiceBody, !store.selectedAssistantVoiceId ? styles.voiceChoiceBodyActive : null]}>
                Freedom will favor the richest installed English voice and keep the picker focused on the least robotic choices.
              </Text>
            </Pressable>
            {curatedVoices.map((voice) => (
              <Pressable
                key={voice.id}
                style={[styles.voiceChoiceCard, store.selectedAssistantVoiceId === voice.id ? styles.voiceChoiceCardActive : null]}
                onPress={() => store.selectAssistantVoice(voice.id).catch((error) => console.warn(error))}
              >
                <View style={styles.voiceChoiceHeader}>
                  <Text style={[styles.voiceChoiceTitle, store.selectedAssistantVoiceId === voice.id ? styles.voiceChoiceTitleActive : null]}>
                    {voice.label}
                  </Text>
                </View>
                <View style={styles.voiceBadgeRow}>
                  {buildVoiceSelectionBadges(voice).map((badge) => (
                    <View
                      key={`${voice.id}-${badge}`}
                      style={[styles.voiceBadge, store.selectedAssistantVoiceId === voice.id ? styles.voiceBadgeActive : null]}
                    >
                      <Text
                        style={[styles.voiceBadgeLabel, store.selectedAssistantVoiceId === voice.id ? styles.voiceBadgeLabelActive : null]}
                      >
                        {badge}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={[styles.voiceChoiceBody, store.selectedAssistantVoiceId === voice.id ? styles.voiceChoiceBodyActive : null]}>
                  {describeVoiceOptionRecommendation(voice)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.helperText}>
            {selectedVoice
              ? `Current spoken reply voice: ${describeVoiceOption(selectedVoice)}.`
              : "Automatic now looks for the strongest available English voice instead of just showing every installed option."}
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
          Rename the current device and manage Android background updates without leaving the companion.
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
  onOpenStart(): void;
  onOpenUtility(): void;
  onToggleManualTools(): void;
  onStartOrStopVoice(): void;
}): React.JSX.Element {
  const { store, onRefresh, footerBottomPadding, toolSheetBottomPadding, manualToolsVisible, onOpenStart, onOpenUtility, onToggleManualTools, onStartOrStopVoice } = props;
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
  const showExternalDraftCard = Boolean(store.externalDraft);
  const showInlineComposer = manualToolsVisible || hasDraftText;
  const shouldShowTranscript = showTranscript || showExternalDraftCard;
  const centerHeadline =
    busy || store.sendingMessage
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
      : busy || store.sendingMessage
        ? `${FREEDOM_RUNTIME_NAME} is still working on the current request.`
        : selectedSession?.title ?? "Talk to Freedom";
  const surfaceMessage = store.error ?? store.notice;
  const surfaceMessageTone = store.error ? "error" : "info";
  const primaryActionLabel = busy || store.sendingMessage ? "Stop" : store.voiceSessionActive ? "End" : "Talk";
  const secondaryActionGlyph = showInlineComposer && hasDraftText ? "↑" : "◉";
  const secondaryActionDisabled = showInlineComposer && hasDraftText ? !canSend : !store.voiceAvailable;

  useEffect(() => {
    if (!stickToBottom || !shouldShowTranscript) {
      return;
    }
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
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
        onContentSizeChange={() => {
          if (stickToBottom && shouldShowTranscript) {
            scrollRef.current?.scrollToEnd({ animated: true });
          }
        }}
        scrollEventThrottle={16}
      >
        <View style={styles.voiceSurfaceHeader}>
          <Pressable style={styles.voiceSurfaceIconButton} onPress={onOpenStart}>
            <Text style={styles.voiceSurfaceIconGlyph}>‹</Text>
          </Pressable>
          <View style={styles.voiceSurfaceTitleWrap}>
            <Text style={styles.voiceSurfaceTitle}>{FREEDOM_PRODUCT_NAME}</Text>
            <Text style={styles.voiceSurfaceTitleAccent}>Voice</Text>
          </View>
          <Pressable testID="controls-toggle" style={styles.voiceSurfaceIconButton} onPress={onOpenUtility}>
            <Text style={styles.voiceSurfaceIconGlyph}>⋮</Text>
          </Pressable>
        </View>

        <View style={styles.voiceSurfaceCenter}>
          <Text style={styles.voiceSurfaceHeadline}>{centerHeadline}</Text>
          <Text style={styles.voiceSurfaceSubhead} numberOfLines={shouldShowTranscript ? 3 : 2}>
            {centerSubhead}
          </Text>
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
          <View style={styles.voiceTranscriptPanel}>
            <View style={styles.voiceTranscriptHeader}>
              <Text style={styles.voiceTranscriptTitle}>{selectedSession?.title ?? "Conversation"}</Text>
              <Pressable
                style={styles.voiceTranscriptToggle}
                onPress={() => {
                  if (!hasSelectedSession && store.sessions[0]) {
                    store.selectSession(store.sessions[0].id).catch((error) => console.warn(error));
                  }
                  setShowTranscript(false);
                }}
              >
                <Text style={styles.voiceTranscriptToggleLabel}>Hide</Text>
              </Pressable>
            </View>
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
          </View>
        ) : (
          <Pressable style={styles.voicePeekPill} onPress={() => setShowTranscript(true)}>
            <Text style={styles.voicePeekTitle}>{selectedSession?.title ?? "Ready for a new turn"}</Text>
            <Text style={styles.voicePeekMeta} numberOfLines={1}>
              {busy || store.sendingMessage
                ? "Freedom is still working"
                : summarizeThreadPeek(selectedSession, lastMessage, hasFallbackSession, canCreateFromApprovedRoot)}
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {showExternalDraftCard ? (
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
        </View>
      ) : null}

      <View style={[styles.voiceSurfaceFooter, { marginBottom: footerBottomPadding }]}>
        <Pressable style={styles.voiceSurfaceRoundButton} onPress={onOpenUtility}>
          <Text style={styles.voiceSurfaceRoundGlyph}>+</Text>
        </Pressable>
        {showInlineComposer ? (
          <TextInput
            testID="voice-inline-composer"
            value={store.composer}
            onChangeText={(value) => store.setField("composer", value)}
            placeholder="Type"
            placeholderTextColor="#a1a1aa"
            autoCapitalize="sentences"
            autoCorrect
            returnKeyType="send"
            style={styles.voiceSurfaceInlineComposer}
            onSubmitEditing={() => {
              if (canSend) {
                store.sendMessage().catch((error) => console.warn(error));
              }
            }}
          />
        ) : (
          <Pressable style={styles.voiceSurfaceTypeButton} onPress={onToggleManualTools}>
            <Text style={styles.voiceSurfaceTypeLabel}>Type</Text>
          </Pressable>
        )}
        <Pressable
          testID="chat-secondary-action-button"
          style={[styles.voiceSurfaceRoundButton, secondaryActionDisabled ? styles.disabledButton : null]}
          onPress={() => {
            if (showInlineComposer && hasDraftText) {
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

function humanizeAvailability(value: "ready" | "offline" | "reconnecting" | "repair_needed" | "codex_unavailable" | "tailscale_unavailable" | "needs_attention"): string {
  switch (value) {
    case "codex_unavailable":
      return "Freedom unavailable";
    case "offline":
      return "Desktop offline";
    case "ready":
      return "Ready";
    case "reconnecting":
      return "Reconnecting";
    case "repair_needed":
      return "Repair needed";
    case "tailscale_unavailable":
      return "Tailscale unavailable";
    default:
      return "Needs attention";
  }
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
