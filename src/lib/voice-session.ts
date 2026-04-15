import type { AudioCaptureOptions } from 'livekit-client';

export type VoiceState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error';

export const VOICE_STATE_LABELS: Record<VoiceState, string> = {
  idle:       'Ready',
  connecting: 'Starting…',
  listening:  'Listening',
  processing: 'Thinking',
  speaking:   'Speaking',
  error:      'Something went wrong',
};

/**
 * Passed directly to createLocalAudioTrack().
 * AudioCaptureOptions is a LiveKit type — not MediaTrackConstraints.
 * sampleRate is not in this interface; LiveKit leaves that to the device default.
 */
export const MIC_CONSTRAINTS: AudioCaptureOptions = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl:  true,
  channelCount:     1,
};

export const FREEDOM_SYSTEM_PROMPT = `
You are Freedom — a sharp, direct operating partner for a solo founder.
You speak in clear, concise sentences. No filler. No unsolicited lists.
Your role is to surface what matters, flag what's blocked, and help make
decisions fast. You have context on ventures, approvals, and weekly metrics.
When asked a question you don't have data for, say so briefly and move on.
`.trim();
