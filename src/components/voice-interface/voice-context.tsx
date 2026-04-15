'use client';
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  createLocalAudioTrack,
  type LocalAudioTrack,
  type RemoteTrack,
  type RemoteTrackPublication,
} from 'livekit-client';
import { MIC_CONSTRAINTS, type VoiceState } from '@/lib/voice-session';

interface VoiceSessionValue {
  state:        VoiceState;
  transcript:   string;
  connect():    Promise<void>;
  disconnect(): void;
  interrupt():  void;
}

const VoiceSessionContext = createContext<VoiceSessionValue | null>(null);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [state,      setState]      = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');

  const roomRef      = useRef<Room | null>(null);
  const localTrack   = useRef<LocalAudioTrack | null>(null);
  const agentAudio   = useRef<HTMLAudioElement | null>(null);

  const disconnect = useCallback(() => {
    agentAudio.current?.pause();
    agentAudio.current = null;
    localTrack.current?.stop();
    localTrack.current = null;
    roomRef.current?.disconnect();
    roomRef.current = null;
    setState('idle');
    setTranscript('');
  }, []);

  const interrupt = useCallback(() => {
    if (agentAudio.current) {
      agentAudio.current.pause();
      agentAudio.current = null;
    }
    localTrack.current?.unmute();
    setState('listening');
  }, []);

  const connect = useCallback(async () => {
    try {
      setState('connecting');

      const res = await fetch('/api/voice-token', { method: 'POST' });
      if (!res.ok) throw new Error(`Token error: ${res.status}`);
      const { token, wsUrl } = (await res.json()) as {
        token: string;
        wsUrl: string;
        roomName: string;
      };

      // Acquire mic with hardware AEC/NS — this is what prevents self-echo
      const track = await createLocalAudioTrack(MIC_CONSTRAINTS);
      localTrack.current = track;

      const room = new Room();
      roomRef.current = room;

      room.on(
        RoomEvent.TrackSubscribed,
        (remoteTrack: RemoteTrack, pub: RemoteTrackPublication) => {
          if (pub.kind !== Track.Kind.Audio) return;

          // mediaStreamTrack is on the base Track class — available on all track kinds
          const mediaStreamTrack = remoteTrack.mediaStreamTrack;
          if (!mediaStreamTrack) return;

          const audio = new Audio();
          audio.srcObject = new MediaStream([mediaStreamTrack]);
          agentAudio.current = audio;

          audio.onplay = () => {
            // ← THE critical line: mute our mic the moment agent audio starts.
            // This is the sole fix for "assistant hears itself" — do not remove.
            localTrack.current?.mute();
            setState('speaking');
          };
          audio.onended = () => {
            localTrack.current?.unmute();
            agentAudio.current = null;
            setState('listening');
          };
          audio.onerror = () => {
            localTrack.current?.unmute();
            setState('error');
          };
          void audio.play().catch(() => setState('error'));
        },
      );

      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        try {
          const msg = JSON.parse(new TextDecoder().decode(payload)) as {
            type?: string;
            text?: string;
          };
          if (msg.type === 'transcript' && msg.text) {
            setTranscript(msg.text);
          }
        } catch {
          // ignore malformed data frames
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        setState('idle');
        setTranscript('');
      });

      await room.connect(wsUrl, token);
      await room.localParticipant.publishTrack(track);
      setState('listening');
    } catch (err) {
      console.error('[voice]', err);
      disconnect();
      setState('error');
    }
  }, [disconnect]);

  return (
    <VoiceSessionContext value={{ state, transcript, connect, disconnect, interrupt }}>
      {children}
    </VoiceSessionContext>
  );
}

/**
 * Consume the shared voice session.
 * Must be used inside <VoiceProvider>; throws if called outside.
 */
export function useVoiceSession(): VoiceSessionValue {
  const ctx = useContext(VoiceSessionContext);
  if (!ctx) {
    throw new Error('useVoiceSession must be used inside <VoiceProvider>');
  }
  return ctx;
}
