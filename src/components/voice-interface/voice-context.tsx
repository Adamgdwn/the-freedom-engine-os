'use client';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  createLocalAudioTrack,
  type LocalAudioTrack,
  type RemoteTrack,
  type RemoteTrackPublication,
} from 'livekit-client';
import {
  MIC_CONSTRAINTS,
  VOICE_DATA_MESSAGE_TYPES,
  type VoiceDataMessage,
  type VoiceRuntimeState,
  type VoiceState,
} from '@/lib/voice-session';
import {
  applySelfProgrammingRequestUpdate,
  applyVoiceLearningUpdate,
  type SelfProgrammingRequest,
  type SelfProgrammingRequestUpdate,
  type VoiceLearningSignal,
  type VoiceLearningUpdate,
} from '@/lib/voice-learning';
import {
  type FreedomMemorySnapshot,
  type FreedomMemoryUpdateRequest,
} from '@/lib/freedom-memory';
import {
  applyVoiceTaskUpdate as reduceVoiceTaskUpdate,
  type VoiceTask,
  type VoiceTaskUpdate,
} from '@/lib/voice-tasks';

interface VoiceSessionValue {
  state:        VoiceState;
  transcript:   string;
  connect():    Promise<void>;
  disconnect(): void;
  interrupt():  void;
  tasks:        VoiceTask[];
  applyTaskUpdate(update: VoiceTaskUpdate): void;
  learningSignals: VoiceLearningSignal[];
  programmingRequests: SelfProgrammingRequest[];
}

const VoiceSessionContext = createContext<VoiceSessionValue | null>(null);

function clearAgentAudio(audioRef: React.MutableRefObject<HTMLAudioElement | null>) {
  audioRef.current?.pause();
  if (audioRef.current) {
    audioRef.current.srcObject = null;
  }
  audioRef.current = null;
}

function isRuntimeState(value: unknown): value is VoiceRuntimeState {
  return value === 'listening' || value === 'processing' || value === 'speaking';
}

async function persistMemoryUpdate(request: FreedomMemoryUpdateRequest) {
  await fetch('/api/freedom-memory', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(request),
  });
}

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [state,      setState]      = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [tasks,      setTasks]      = useState<VoiceTask[]>([]);
  const [learningSignals,    setLearningSignals]    = useState<VoiceLearningSignal[]>([]);
  const [programmingRequests, setProgrammingRequests] = useState<SelfProgrammingRequest[]>([]);

  const roomRef      = useRef<Room | null>(null);
  const localTrack   = useRef<LocalAudioTrack | null>(null);
  const agentAudio   = useRef<HTMLAudioElement | null>(null);
  const loadedMemory = useRef(false);

  const applyTaskUpdate = useCallback((update: VoiceTaskUpdate) => {
    setTasks((currentTasks) => reduceVoiceTaskUpdate(currentTasks, update));
  }, []);

  const applyLearningUpdate = useCallback((update: VoiceLearningUpdate) => {
    setLearningSignals((currentSignals) => applyVoiceLearningUpdate(currentSignals, update));
  }, []);

  const applyProgrammingRequestUpdate = useCallback((update: SelfProgrammingRequestUpdate) => {
    setProgrammingRequests((currentRequests) => (
      applySelfProgrammingRequestUpdate(currentRequests, update)
    ));
  }, []);

  useEffect(() => {
    if (loadedMemory.current) {
      return;
    }

    loadedMemory.current = true;

    void (async () => {
      try {
        const response = await fetch('/api/freedom-memory', { cache: 'no-store' });
        if (!response.ok) {
          return;
        }

        const snapshot = await response.json() as FreedomMemorySnapshot;
        setTasks(snapshot.tasks ?? []);
        setLearningSignals(snapshot.learningSignals ?? []);
        setProgrammingRequests(snapshot.programmingRequests ?? []);
      } catch {
        // Keep the UI usable even if memory bootstrap is offline.
      }
    })();
  }, []);

  const disconnect = useCallback(() => {
    clearAgentAudio(agentAudio);
    localTrack.current?.stop();
    localTrack.current = null;
    roomRef.current?.disconnect();
    roomRef.current = null;
    setState('idle');
    setTranscript('');
  }, []);

  const interrupt = useCallback(() => {
    if (roomRef.current) {
      const payload = new TextEncoder().encode(
        JSON.stringify({ type: VOICE_DATA_MESSAGE_TYPES.interrupt }),
      );
      void roomRef.current.localParticipant.publishData(payload, {
        reliable: true,
      }).catch((error) => {
        console.error('[voice] interrupt publish failed', error);
      });
    }

    clearAgentAudio(agentAudio);
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

          clearAgentAudio(agentAudio);
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
            clearAgentAudio(agentAudio);
            setState('listening');
          };
          audio.onerror = () => {
            localTrack.current?.unmute();
            clearAgentAudio(agentAudio);
            setState('error');
          };
          void audio.play().catch(() => setState('error'));
        },
      );

      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        let msg: VoiceDataMessage | null = null;

        try {
          msg = JSON.parse(new TextDecoder().decode(payload)) as VoiceDataMessage;
        } catch {
          return;
        }

        if (msg.type === VOICE_DATA_MESSAGE_TYPES.transcript && typeof msg.text === 'string') {
          setTranscript(msg.text);
          return;
        }

        if (msg.type === VOICE_DATA_MESSAGE_TYPES.taskUpdate && msg.payload) {
          applyTaskUpdate(msg.payload);
          void persistMemoryUpdate({ channel: 'task', update: msg.payload }).catch(() => {
            console.error('[voice] task persistence failed');
          });
          return;
        }

        if (msg.type === VOICE_DATA_MESSAGE_TYPES.learningUpdate && msg.payload) {
          applyLearningUpdate(msg.payload);
          void persistMemoryUpdate({ channel: 'learning', update: msg.payload }).catch(() => {
            console.error('[voice] learning persistence failed');
          });
          return;
        }

        if (msg.type === VOICE_DATA_MESSAGE_TYPES.selfProgrammingUpdate && msg.payload) {
          applyProgrammingRequestUpdate(msg.payload);
          void persistMemoryUpdate({ channel: 'programming', update: msg.payload }).catch(() => {
            console.error('[voice] programming request persistence failed');
          });
          return;
        }

        if (msg.type === VOICE_DATA_MESSAGE_TYPES.state && isRuntimeState(msg.state)) {
          if (msg.state === 'speaking') {
            localTrack.current?.mute();
          } else {
            localTrack.current?.unmute();
          }
          setState(msg.state);
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        clearAgentAudio(agentAudio);
        localTrack.current?.stop();
        localTrack.current = null;
        roomRef.current = null;
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
  }, [applyLearningUpdate, applyProgrammingRequestUpdate, applyTaskUpdate, disconnect]);

  return (
    <VoiceSessionContext
      value={{
        state,
        transcript,
        connect,
        disconnect,
        interrupt,
        tasks,
        applyTaskUpdate,
        learningSignals,
        programmingRequests,
      }}
    >
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
