export const FREEDOM_PHONE_PRODUCT_NAME = "Freedom Anywhere";

export const mobileConnectionStates = ["desktop_linked", "reconnecting", "stand_alone"] as const;
export const mobileVoiceStates = [
  "voice_primary_ready",
  "voice_primary_starting",
  "voice_primary_live",
  "voice_primary_recovering",
  "voice_fallback_only",
  "voice_unavailable"
] as const;
export const deferredExecutionStates = [
  "captured",
  "structured",
  "awaiting_desktop",
  "ready_to_execute",
  "executed",
  "failed_needs_review"
] as const;

type MobileConnectionStateValue = (typeof mobileConnectionStates)[number];
type MobileVoiceStateValue = (typeof mobileVoiceStates)[number];
type DeferredExecutionStateValue = (typeof deferredExecutionStates)[number];

export function humanizeMobileConnectionState(state: MobileConnectionStateValue): string {
  switch (state) {
    case "desktop_linked":
      return "Connected to desktop";
    case "reconnecting":
      return "Reconnecting to desktop";
    case "stand_alone":
      return "Working on this phone";
    default:
      return "Connected to desktop";
  }
}

export function describeMobileConnectionState(state: MobileConnectionStateValue): string {
  switch (state) {
    case "desktop_linked":
      return "Desktop-linked mode is active and the phone can use live sync and governed execution.";
    case "reconnecting":
      return "The phone is actively trying to restore the desktop link without dropping into stand-alone mode yet.";
    case "stand_alone":
      return "The desktop is unavailable right now, but this phone can keep capturing work, planning, and saving intent for later sync.";
    default:
      return "Desktop-linked mode is active and the phone can use live sync and governed execution.";
  }
}

export function humanizeMobileVoiceState(state: MobileVoiceStateValue): string {
  switch (state) {
    case "voice_primary_ready":
      return "Premium voice ready";
    case "voice_primary_starting":
      return "Premium voice starting";
    case "voice_primary_live":
      return "Premium voice live";
    case "voice_primary_recovering":
      return "Premium voice recovering";
    case "voice_fallback_only":
      return "Backup voice only";
    default:
      return "Voice unavailable";
  }
}

export function describeMobileVoiceState(state: MobileVoiceStateValue): string {
  switch (state) {
    case "voice_primary_ready":
      return "Freedom's premium realtime voice lane is available and should be the default path.";
    case "voice_primary_starting":
      return "Freedom is starting the premium realtime voice lane now.";
    case "voice_primary_live":
      return "Freedom is currently live on the premium realtime voice lane.";
    case "voice_primary_recovering":
      return "Freedom is trying to recover the premium realtime voice lane.";
    case "voice_fallback_only":
      return "Freedom can still speak and listen, but the premium desktop-backed realtime lane is not ready.";
    default:
      return "No supported Freedom voice path is ready right now.";
  }
}

export function humanizeDeferredExecutionState(state: DeferredExecutionStateValue): string {
  switch (state) {
    case "captured":
      return "Captured";
    case "structured":
      return "Structured";
    case "awaiting_desktop":
      return "Awaiting desktop";
    case "ready_to_execute":
      return "Ready to execute";
    case "executed":
      return "Executed";
    default:
      return "Needs review";
  }
}

export function describeDeferredExecutionState(state: DeferredExecutionStateValue): string {
  switch (state) {
    case "captured":
      return "Freedom saved the work, but it has not been structured for later execution yet.";
    case "structured":
      return "Freedom preserved the work in a more actionable shape, but it still needs a later decision.";
    case "awaiting_desktop":
      return "Freedom preserved the work and is waiting for the desktop to return before execution can resume.";
    case "ready_to_execute":
      return "The desktop path is available and the next governed action can proceed when requested.";
    case "executed":
      return "The intended action already ran.";
    default:
      return "The deferred work needs review before Freedom should continue.";
  }
}

export function isStandAloneConnectionState(state: MobileConnectionStateValue): boolean {
  return state === "stand_alone";
}

export function isDesktopLinkedConnectionState(state: MobileConnectionStateValue): boolean {
  return state === "desktop_linked";
}

export function isOfflineSafeConnectionState(state: MobileConnectionStateValue): boolean {
  return isStandAloneConnectionState(state);
}

export function isConnectedConnectionState(state: MobileConnectionStateValue): boolean {
  return isDesktopLinkedConnectionState(state);
}
