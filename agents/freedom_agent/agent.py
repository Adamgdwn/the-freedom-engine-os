"""
Freedom voice agent — LiveKit Agents 0.12+ + OpenAI Realtime.

Run locally:
    cd agents/freedom_agent
    pip install -r requirements.txt
    python agent.py dev

Required env vars (set in .env at repo root or export in shell):
    LIVEKIT_URL
    LIVEKIT_API_KEY
    LIVEKIT_API_SECRET
    OPENAI_API_KEY
    NEXT_PUBLIC_VOICE_ID   (optional, defaults to "nova")
"""
import asyncio
import json
import os
from dotenv import load_dotenv

# Load from repo root .env first, then local .env fallback
load_dotenv(dotenv_path="../../.env", override=False)
load_dotenv(override=False)

from livekit import agents, rtc
from livekit.agents import AgentSession, Agent, RoomInputOptions, cli, WorkerOptions
from livekit.plugins import openai as lk_openai

from tools import (
    build_runtime_context,
    park_task,
    pending_approvals,
    prepare_email_draft,
    record_learning_signal,
    review_learning_signals,
    review_open_tasks,
    review_pending_programming_requests,
    review_trusted_email_recipients,
    request_self_programming,
    set_event_room,
    top_venture_status,
    update_task_status,
    weekly_metrics,
)

SYSTEM_PROMPT = """
You are Freedom — an approval-gated autonomous business partner for a solo founder.
You speak in clear, concise sentences. Minimal filler. No unsolicited lists.
Surface what matters, flag what is blocked, and help make decisions fast.

Primary operating posture:
- Maintain one main objective and as few active threads as possible.
- Help the founder decide, execute, learn, research what is missing, and improve
  future performance without losing governance.
- Keep the user on task. If they drift, redirect briefly toward the highest-value
  objective or the clearest next decision.

Task policy:
- If the user makes a real topic shift while prior work still matters, acknowledge
  it briefly, park the prior task with a short label and summary, then continue.
- If the user asks a short side question that can be answered safely without losing
  the main thread, answer it briefly and offer to return. Do not park the task unless
  the thread actually changes.
- If background work reaches a useful checkpoint, mark it ready and offer to circle
  back in one short sentence.
- Use your read tools when needed to inspect open tasks before deciding whether to
  resume, replace, or park work.

Learning policy:
- Always look for durable patterns in preferences, repeated bottlenecks, focus drift,
  operating cadence, workflow friction, and repeated capability needs.
- Record learning only when the pattern is stable, repeated, or explicitly stated.
- Do not record trivial one-off facts or transient details.
- Use your read tools when needed to inspect recent durable learning before creating
  a new learning signal.

Improvement policy:
- Treat self-learning, self-research, and self-programming as approval-gated loops.
- If a durable capability gap would materially improve future performance, request
  self-programming and explain why approval is required before anything changes.
- Review pending self-programming requests before creating another request for the
  same gap.
- Never claim code, tool, or runtime behavior changed unless approval and execution
  happened outside this voice turn.

Research and truthfulness policy:
- You do not currently have open internet research tools inside this runtime.
- Do not imply that you performed external research unless a future tool makes that true.
- When asked a question you do not have live data for, say so briefly, avoid guessing,
  and move on to the best next decision or missing input.

Communications policy:
- If the user explicitly asks you to email a summary or update, prepare an email draft
  for a trusted recipient and say that confirmation is still required before anything
  is sent.
- Never claim an email was sent unless the UI confirms it after the operator approves.
- Review trusted recipients before preparing an outbound draft when recipient choice matters.

Interruption policy:
- If you are interrupted, stop cleanly, acknowledge briefly if helpful, and yield the turn.

You have access to venture status, pending approvals, weekly metrics, open-task review,
durable-memory review, pending programming-request review, and trusted-recipient review.
""".strip()


async def entrypoint(ctx: agents.JobContext) -> None:
    await ctx.connect()
    set_event_room(ctx.room)
    supplemental_context = build_runtime_context()
    instructions = SYSTEM_PROMPT if not supplemental_context else f"{SYSTEM_PROMPT}\n\n{supplemental_context}"

    session = AgentSession(
        llm=lk_openai.realtime.RealtimeModel(
            model="gpt-4o-realtime-preview",
            voice=os.getenv("NEXT_PUBLIC_VOICE_ID", "nova"),
        ),
    )

    async def publish_event(message: dict[str, object]) -> None:
        try:
            await ctx.room.local_participant.publish_data(
                json.dumps(message),
                reliable=True,
            )
        except Exception:
            return

    def on_data_received(packet: rtc.DataPacket) -> None:
        try:
            message = json.loads(packet.data.decode("utf-8"))
        except Exception:
            return

        if message.get("type") == "interrupt":
            asyncio.ensure_future(session.interrupt())

    @session.on("user_input_transcribed")
    def on_user_input_transcribed(event) -> None:
        transcript = getattr(event, "transcript", "").strip()
        if transcript:
            asyncio.create_task(publish_event({
                "type": "transcript",
                "text": transcript,
            }))

    @session.on("conversation_item_added")
    def on_conversation_item_added(event) -> None:
        item = getattr(event, "item", None)
        if getattr(item, "type", None) != "message":
            return

        if getattr(item, "role", None) != "assistant":
            return

        text = getattr(item, "text_content", "").strip()
        if text:
            asyncio.create_task(publish_event({
                "type": "transcript",
                "text": text,
            }))

    @session.on("agent_state_changed")
    def on_agent_state_changed(event) -> None:
        raw_state = getattr(event, "new_state", "")
        mapped_state = {
            "idle": "listening",
            "listening": "listening",
            "thinking": "processing",
            "speaking": "speaking",
        }.get(raw_state)

        if mapped_state:
            asyncio.create_task(publish_event({
                "type": "state_update",
                "state": mapped_state,
            }))

    ctx.room.on("data_received", on_data_received)

    try:
        await session.start(
            room=ctx.room,
            agent=Agent(
                instructions=instructions,
                tools=[
                    top_venture_status,
                    pending_approvals,
                    weekly_metrics,
                    review_open_tasks,
                    review_learning_signals,
                    review_pending_programming_requests,
                    review_trusted_email_recipients,
                    park_task,
                    update_task_status,
                    record_learning_signal,
                    request_self_programming,
                    prepare_email_draft,
                ],
            ),
            room_input_options=RoomInputOptions(noise_cancellation=True),
        )
    finally:
        set_event_room(None)


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
