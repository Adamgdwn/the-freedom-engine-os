# Freedom Voice Layer v1 — Build Spec

**For:** any engineer picking this up cold  
**Goal:** add a seamless, self-interruption-free voice interface to the Freedom Engine OS  
**Scope:** Phase 1 only — voice plumbing + UI shell. No autonomous agents, no memory loops.

> Status note:
> This document is the original Phase 1 build spec.
> The repo has since moved beyond this baseline.
> Voice UI, model-level interrupts, parked task threads, in-session learning capture,
> approval-gated self-programming requests, Supabase-backed durable memory, and local
> backup/restore support now exist in the codebase.
> Use this file as the historical implementation baseline, not as the current-state source
> of truth.

---

## Current repo state (2026-04-15)

| What | Where | Status |
|------|-------|--------|
| Next.js 16 control-plane web UI | `src/` | working |
| Shared voice UI + provider | `src/components/voice-interface/` | implemented |
| Voice orb in sidebar + mobile FAB | `src/components/app-shell.tsx` | implemented |
| Voice token route | `src/app/api/voice-token/route.ts` | implemented |
| Freedom memory route | `src/app/api/freedom-memory/route.ts` | implemented |
| Durable voice memory store | `src/lib/freedom-memory-store.ts` | implemented |
| Local backup / restore scripts | `scripts/backup-freedom-memory.mjs`, `scripts/restore-freedom-memory.mjs` | implemented |
| Python voice worker | `agents/freedom_agent/agent.py` | implemented |
| Supabase memory tables | `supabase/migrations/202604150002_freedom_memory_runtime.sql` | implemented |
| Palette / CSS vars | `src/app/globals.css` | keep exactly as-is |
| Live voice dependencies | `package.json` | installed |

For current behavior and operating guidance, prefer:
- `docs/architecture.md`
- `docs/voice-realtime-architecture.md`
- `docs/roadmap.md`
- `docs/manual.md`

---

## Architecture (decided — no alternatives)

```
Browser / Phone
  └─ getUserMedia (echoCancellation: true, noiseSuppression: true)
  └─ LiveKit WebRTC room  ←→  livekit-server (cloud or self-hosted)
                                   │
                               LiveKit agent worker (Python)
                                   │
                               OpenAI Realtime API (`gpt-realtime-mini` default)
                                   │
                               tool stubs (top venture / approvals / metrics)

Next.js API route: /api/voice-token
  → signs short-lived token server-side, returns { token, wsUrl, roomName }
  → secret never reaches browser
```

**Why LiveKit + WebRTC:** native browser echo cancellation, hardware-level AEC on mobile, clean interruption model. Do NOT use raw WebSocket audio or getUserMedia + ad-hoc playback.

---

## Palette (globals.css — do not change)

```
--canvas:         #f3efe7
--surface:        rgba(255, 250, 243, 0.88)
--surface-strong: #fff8ef
--ink:            #172225
--ink-soft:       #556367
--line:           rgba(23, 34, 37, 0.11)
--primary:        #0f766e   ← teal (use for listening state)
--primary-strong: #115e59
--accent:         #b45309   ← amber (use for processing state)
--danger:         #a53a27   ← red (use for error state)
```

No neon. No dark-mode rewrite. Orb and panel use these variables only.

---

## Step 0 — Install dependencies

```bash
npm install \
  @livekit/components-react \
  @livekit/components-core \
  livekit-client \
  livekit-server-sdk \
  openai \
  framer-motion \
  clsx
```

Do not upgrade `next`, `react`, `react-dom`, or `typescript`. If a peer conflict appears, add a `--legacy-peer-deps` flag and note it.

---

## Step 1 — Env vars

Append to `.env.example` (keep existing Supabase entries intact):

```
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=replace-with-livekit-api-key
LIVEKIT_API_SECRET=replace-with-livekit-api-secret
OPENAI_API_KEY=replace-with-openai-api-key
NEXT_PUBLIC_VOICE_AGENT_NAME=Freedom
NEXT_PUBLIC_VOICE_ID=marin
```

Add the real runtime secrets to repo-root `.env` for local desktop, gateway, mobile, and
voice-worker runs. Keep `.env.example` and `.env.local` as templates or web-only
overrides, never as the committed source of runtime secrets.

---

## Step 2 — Voice state machine

**Create `src/lib/voice-session.ts`**

```ts
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

/** Pass directly to getUserMedia({ audio: MIC_CONSTRAINTS }) */
export const MIC_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl:  true,
  sampleRate:       24000,
  channelCount:     1,
};

export const FREEDOM_SYSTEM_PROMPT = `
You are Freedom — a sharp, direct operating partner for a solo founder.
You speak in clear, concise sentences. No filler. No unsolicited lists.
Your role is to surface what matters, flag what's blocked, and help make
decisions fast. You have context on ventures, approvals, and weekly metrics.
When asked a question you don't have data for, say so briefly and move on.
`.trim();
```

---

## Step 3 — Voice token API route

**Create `src/app/api/voice-token/route.ts`**

```ts
import { AccessToken } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  const apiKey    = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl     = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json({ error: 'Voice not configured' }, { status: 503 });
  }

  const identity = `user-${Date.now()}`;
  const at = new AccessToken(apiKey, apiSecret, { ttl: '1h', identity });
  at.addGrant({
    roomJoin:     true,
    room:         'freedom-voice',
    canPublish:   true,
    canSubscribe: true,
  });

  return NextResponse.json({
    token:    await at.toJwt(),
    wsUrl,
    roomName: 'freedom-voice',
  });
}
```

---

## Step 4 — Voice session hook

**Create `src/components/voice-interface/use-voice-session.ts`**

This is the core lifecycle file. Implement exactly this behavior:

```ts
'use client';
import { useState, useRef, useCallback } from 'react';
import {
  Room, RoomEvent, Track, createLocalAudioTrack,
  type RemoteParticipant, type RemoteTrackPublication,
} from 'livekit-client';
import { MIC_CONSTRAINTS, type VoiceState } from '@/lib/voice-session';

export interface VoiceSession {
  state:       VoiceState;
  transcript:  string;
  connect():   Promise<void>;
  disconnect(): void;
  interrupt():  void;
}

export function useVoiceSession(): VoiceSession {
  const [state,      setState]      = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const roomRef      = useRef<Room | null>(null);
  const localTrack   = useRef<Awaited<ReturnType<typeof createLocalAudioTrack>> | null>(null);
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
    // Unmute mic immediately so user can keep talking
    localTrack.current?.unmute();
    setState('listening');
  }, []);

  const connect = useCallback(async () => {
    try {
      setState('connecting');

      // 1. Get token
      const res = await fetch('/api/voice-token', { method: 'POST' });
      if (!res.ok) throw new Error('Token fetch failed');
      const { token, wsUrl } = await res.json() as {
        token: string; wsUrl: string; roomName: string;
      };

      // 2. Acquire mic with hardware echo cancellation
      const track = await createLocalAudioTrack({ constraints: MIC_CONSTRAINTS });
      localTrack.current = track;

      // 3. Join room
      const room = new Room();
      roomRef.current = room;

      // 4. When remote agent audio starts → mute mic, enter speaking state
      room.on(RoomEvent.TrackSubscribed, (
        _: unknown,
        pub: RemoteTrackPublication,
        participant: RemoteParticipant,
      ) => {
        if (pub.kind !== Track.Kind.Audio) return;
        const mediaTrack = pub.track?.mediaStreamTrack;
        if (!mediaTrack) return;

        const stream = new MediaStream([mediaTrack]);
        const audio  = new Audio();
        audio.srcObject = stream;
        agentAudio.current = audio;

        audio.onplay  = () => {
          localTrack.current?.mute();   // ← key: mute mic while agent speaks
          setState('speaking');
        };
        audio.onended = () => {
          localTrack.current?.unmute(); // ← unmute when agent finishes
          agentAudio.current = null;
          setState('listening');
        };
        audio.onerror = () => {
          localTrack.current?.unmute();
          setState('error');
        };
        void audio.play();
      });

      // 5. Track data messages for transcript (agent sends these if configured)
      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        try {
          const msg = JSON.parse(new TextDecoder().decode(payload)) as {
            type?: string; text?: string;
          };
          if (msg.type === 'transcript' && msg.text) {
            setTranscript(msg.text);
          }
        } catch { /* ignore malformed */ }
      });

      room.on(RoomEvent.Disconnected, () => setState('idle'));

      await room.connect(wsUrl, token);
      await room.localParticipant.publishTrack(track);
      setState('listening');

    } catch (err) {
      console.error('[voice]', err);
      disconnect();
      setState('error');
    }
  }, [disconnect]);

  return { state, transcript, connect, disconnect, interrupt };
}
```

**Critical audio rule:** never remove the `localTrack.current?.mute()` call on agent audio start. That single line is what prevents the assistant from hearing itself.

---

## Step 5 — Voice orb component

**Create `src/components/voice-interface/voice-orb.tsx`**

```tsx
'use client';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { VOICE_STATE_LABELS, type VoiceState } from '@/lib/voice-session';

const ORB_VARIANTS: Record<VoiceState, string> = {
  idle:       'bg-[color:var(--surface-strong)] border-[color:var(--line)]',
  connecting: 'bg-[color:var(--surface-strong)] border-[color:var(--primary)]',
  listening:  'bg-[color:var(--primary)] border-[color:var(--primary-strong)]',
  processing: 'bg-[color:var(--accent)]    border-amber-700',
  speaking:   'bg-[color:var(--primary)]   border-[color:var(--primary-strong)]',
  error:      'bg-[color:var(--danger)]    border-red-900',
};

const PULSE: Record<VoiceState, object> = {
  idle:       { scale: 1 },
  connecting: { scale: [1, 1.04, 1], transition: { repeat: Infinity, duration: 1.2 } },
  listening:  { scale: [1, 1.06, 1], transition: { repeat: Infinity, duration: 2.0 } },
  processing: { scale: [1, 1.10, 1], transition: { repeat: Infinity, duration: 0.8 } },
  speaking:   { scale: [1, 1.14, 1], transition: { repeat: Infinity, duration: 0.55 } },
  error:      { scale: 1 },
};

export function VoiceOrb({
  state,
  transcript,
  onClick,
}: {
  state:      VoiceState;
  transcript: string;
  onClick():  void;
}) {
  const active = state !== 'idle' && state !== 'error';

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button
        animate={PULSE[state]}
        onClick={onClick}
        aria-label={VOICE_STATE_LABELS[state]}
        className={clsx(
          'h-16 w-16 rounded-full border-2 shadow-md transition-colors duration-300',
          ORB_VARIANTS[state],
        )}
      />
      <p className="text-xs font-medium text-[color:var(--ink-soft)]">
        {VOICE_STATE_LABELS[state]}
      </p>
      {transcript ? (
        <p className="max-w-[220px] text-center text-xs leading-5 text-[color:var(--ink)]">
          {transcript}
        </p>
      ) : null}
    </div>
  );
}
```

---

## Step 6 — Voice panel (sidebar)

**Create `src/components/voice-interface/voice-panel.tsx`**

Replaces the "North star" static block in the sidebar. Keeps the same rounded-panel visual treatment.

```tsx
'use client';
import { VoiceOrb }         from './voice-orb';
import { useVoiceSession }  from './use-voice-session';

export function VoicePanel() {
  const { state, transcript, connect, disconnect, interrupt } = useVoiceSession();

  function handleOrbClick() {
    if (state === 'idle' || state === 'error') {
      void connect();
    } else if (state === 'speaking') {
      interrupt();
    } else {
      disconnect();
    }
  }

  return (
    <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white/75 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--ink-soft)]">
        Freedom Voice
      </p>
      <div className="mt-4 flex justify-center">
        <VoiceOrb state={state} transcript={transcript} onClick={handleOrbClick} />
      </div>
      {(state !== 'idle') && (
        <button
          onClick={disconnect}
          className="mt-4 w-full rounded-full py-1.5 text-xs text-[color:var(--ink-soft)] hover:text-[color:var(--danger)] transition-colors"
        >
          End session
        </button>
      )}
    </div>
  );
}
```

---

## Step 7 — Voice FAB (mobile)

**Create `src/components/voice-interface/voice-fab.tsx`**

```tsx
'use client';
import { motion }         from 'framer-motion';
import clsx               from 'clsx';
import { useVoiceSession } from './use-voice-session';

export function VoiceFab() {
  const { state, connect, disconnect, interrupt } = useVoiceSession();

  function handlePress() {
    if (state === 'idle' || state === 'error') void connect();
    else if (state === 'speaking') interrupt();
    else disconnect();
  }

  const active = state !== 'idle' && state !== 'error';

  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={handlePress}
      aria-label="Toggle Freedom voice"
      className={clsx(
        'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center',
        'rounded-full border-2 shadow-lg transition-colors duration-300 lg:hidden',
        active
          ? 'border-[color:var(--primary-strong)] bg-[color:var(--primary)] text-white'
          : 'border-[color:var(--line)] bg-[color:var(--surface-strong)] text-[color:var(--ink)]',
      )}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8"  y1="23" x2="16" y2="23"/>
      </svg>
    </motion.button>
  );
}
```

---

## Step 8 — Barrel export

**Create `src/components/voice-interface/index.ts`**

```ts
export { VoicePanel }      from './voice-panel';
export { VoiceFab }        from './voice-fab';
export { VoiceOrb }        from './voice-orb';
export { useVoiceSession } from './use-voice-session';
```

---

## Step 9 — Wire into app shell

**Modify `src/components/app-shell.tsx`**

Three changes only:
1. Add `'use client'` at the top (required to render client components in the sidebar).
2. Replace the "North star" static block (lines 27–35) with `<VoicePanel />`.
3. Mount `<VoiceFab />` inside the root div before the closing tag.

```tsx
'use client';                              // ← add this line
import Link from 'next/link';
import type { PropsWithChildren } from 'react';
import { SidebarNav }  from '@/components/sidebar-nav';
import { VoicePanel, VoiceFab } from '@/components/voice-interface';  // ← add

// ... AppShellProps unchanged ...

export function AppShell({ title, summary, children }: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-5 lg:flex-row lg:px-6">
      <aside className="panel h-fit rounded-[2rem] border border-white/60 p-5 lg:sticky lg:top-6 lg:w-[300px]">
        <div className="rounded-[1.75rem] bg-[color:var(--ink)] px-5 py-6 text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-white/70">The Freedom Engine</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Internal venture OS</h1>
          <p className="mt-3 text-sm leading-6 text-white/78">
            Governed allocation of attention, capital, and agent effort toward long-term freedom.
          </p>
        </div>
        <div className="mt-5">
          <SidebarNav />
        </div>

        {/* Replace the static North star block with this: */}
        <div className="mt-6">
          <VoicePanel />
        </div>

        <div className="mt-4 text-sm text-[color:var(--ink-soft)]">
          Venture detail:
          <div className="mt-2">
            <Link href="/ventures/ai-consulting-build" className="rounded-full bg-white/70 px-3 py-1.5 text-[color:var(--ink)] transition hover:bg-white">
              AI Consulting Build
            </Link>
          </div>
        </div>
      </aside>

      <main className="flex-1">
        {/* ... header and children unchanged ... */}
      </main>

      <VoiceFab />   {/* ← add before closing div */}
    </div>
  );
}
```

**Note:** making app-shell a client component means child pages should NOT import heavy server data directly into this component. The children prop already handles that correctly.

---

## Step 10 — Python agent scaffold

**Create `agents/freedom_agent/requirements.txt`**

```
livekit-agents[openai]>=0.8
livekit-plugins-openai>=0.8
python-dotenv
```

**Create `agents/freedom_agent/tools.py`**

```python
from livekit.agents import function_context

@function_context.ai_callable(
    description="Return the status of the top-priority active venture."
)
async def top_venture_status() -> str:
    # TODO: replace with Supabase query against ventures table
    return "AI Consulting Build — active. Score: 87. Blocking item: proposal template not finalized."

@function_context.ai_callable(
    description="Return any approvals that are currently pending."
)
async def pending_approvals() -> str:
    # TODO: replace with Supabase query
    return "1 pending approval: budget increase for PDF Flow infrastructure. Awaiting: Adam."

@function_context.ai_callable(
    description="Return this week's key metrics."
)
async def weekly_metrics() -> str:
    # TODO: replace with Supabase query
    return "Week of Apr 14: 3 sessions completed, 2 ventures active, 0 governance overrides."
```

**Create `agents/freedom_agent/agent.py`**

```python
import asyncio
import os
from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.agents.voice.room_io.types import RoomOptions
from livekit.plugins import openai as lk_openai
from tools import top_venture_status, pending_approvals, weekly_metrics
from voice_session import FREEDOM_SYSTEM_PROMPT  # share prompt from TS via env or inline

load_dotenv()

SYSTEM_PROMPT = os.getenv("FREEDOM_SYSTEM_PROMPT", """
You are Freedom — a sharp, direct operating partner for a solo founder.
Speak in clear, concise sentences. No filler. No unsolicited lists.
Surface what matters, flag what is blocked, and help make decisions fast.
""".strip())

async def entrypoint(ctx: agents.JobContext):
    await ctx.connect()
    session = AgentSession(
        llm=lk_openai.realtime.RealtimeModel(
            model="gpt-realtime-mini",
            voice=os.getenv("NEXT_PUBLIC_VOICE_ID", "marin"),
        ),
    )
    await session.start(
        room=ctx.room,
        agent=Agent(
            instructions=SYSTEM_PROMPT,
            tools=[top_venture_status, pending_approvals, weekly_metrics],
        ),
        room_options=RoomOptions(delete_room_on_close=True),
        room_input_options=RoomInputOptions(noise_cancellation=True),
    )

if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
```

**Local run command:**

```bash
cd agents/freedom_agent
pip install -r requirements.txt
python agent.py dev
```

Set these in your `.env` or shell before running:
```
LIVEKIT_URL=wss://...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
OPENAI_API_KEY=...
```

---

## File inventory (complete)

| Action | Path |
|--------|------|
| Create | `src/lib/voice-session.ts` |
| Create | `src/app/api/voice-token/route.ts` |
| Create | `src/components/voice-interface/use-voice-session.ts` |
| Create | `src/components/voice-interface/voice-orb.tsx` |
| Create | `src/components/voice-interface/voice-panel.tsx` |
| Create | `src/components/voice-interface/voice-fab.tsx` |
| Create | `src/components/voice-interface/index.ts` |
| Modify | `src/components/app-shell.tsx` |
| Modify | `.env.example` |
| Create | `agents/freedom_agent/agent.py` |
| Create | `agents/freedom_agent/tools.py` |
| Create | `agents/freedom_agent/requirements.txt` |

---

## Validation (run all three — all must pass)

```bash
npm run lint
npm run typecheck
npm run build
```

If `build` fails due to the `'use client'` boundary on app-shell, ensure child page components that call `fetch` or DB are wrapped in their own async server components passed as `children`, not co-located in the shell file.

---

## Do-not-do list

- Do not leave the mic open while the agent is speaking (the `mute()` call is non-negotiable)
- Do not switch voices mid-session
- Do not add dark mode, neon palette, or redesign the layout
- Do not implement memory loops, autonomy, or self-learning in this phase
- Do not use raw WebSocket audio instead of LiveKit WebRTC
- Do not expose `LIVEKIT_API_SECRET` to the browser (keep it server-side in the route handler)
- Do not invent your own turn-detection — LiveKit + OpenAI Realtime handle it
- Do not touch `src/lib/scoring.ts`, `seed-data.ts`, or any governance/venture code

---

## Acceptance criteria

- [ ] One tap starts voice; agent connects within normal network startup time
- [ ] Agent never hears its own audio output (mic muted during playback)
- [ ] User can interrupt agent by speaking; agent yields and listens
- [ ] Mobile has a visible FAB as primary voice trigger
- [ ] Desktop sidebar shows voice orb where the static North star block was
- [ ] `npm run lint && npm run typecheck && npm run build` all pass clean
