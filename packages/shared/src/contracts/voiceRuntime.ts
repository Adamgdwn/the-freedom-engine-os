export type VoiceRuntimeMode = "realtime_primary" | "device_fallback" | "on_device_offline";

export type VoiceRuntimeState = "listening" | "processing" | "speaking";

export type VoiceTransport = "livekit_webrtc" | "device_local";

export type VoiceControlEventType =
  | "interrupt"
  | "clear_user_turn"
  | "commit_user_turn"
  | "playback_started"
  | "playback_finished"
  | "false_interruption"
  | "resume_playback"
  | "intent_captured";

export interface VoiceSessionBinding {
  voiceSessionId: string;
  chatSessionId: string;
  assistantName: string;
  model: string;
  runtimeMode: VoiceRuntimeMode;
  transport: VoiceTransport;
  roomName: string | null;
  participantIdentity: string | null;
  degraded: boolean;
}

export interface VoiceControlEvent {
  voiceSessionId: string;
  chatSessionId: string;
  type: VoiceControlEventType;
  createdAt: string;
  reason: string | null;
  transcript: string | null;
}

export interface VoiceIntentEnvelope {
  voiceSessionId: string;
  chatSessionId: string;
  transcript: string;
  transcriptFinal: boolean;
  capturedAt: string;
  runtimeMode: VoiceRuntimeMode;
  degraded: boolean;
}
