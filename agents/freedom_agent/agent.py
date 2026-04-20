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
    NEXT_PUBLIC_VOICE_ID   (optional, defaults to "marin")
"""
import asyncio
import json
import os
from dotenv import load_dotenv
from openai.types import realtime

# Load from repo root .env first, then local .env fallback
load_dotenv(dotenv_path="../../.env", override=False)
load_dotenv(override=False)

from livekit import agents, rtc
from livekit.agents import AgentSession, Agent, RoomInputOptions, cli, WorkerOptions
from livekit.agents.voice.room_io.types import RoomOptions
from livekit.plugins import openai as lk_openai

from persona import load_freedom_core_prompt, load_freedom_runtime_policy_prompt
from tools import (
    build_runtime_context,
    get_current_voice_profile,
    park_task,
    pending_approvals,
    prepare_email_draft,
    record_learning_signal,
    review_voice_profile,
    request_persona_adjustment,
    request_persona_overlay_retirement,
    request_persona_overlay_revision,
    review_learning_signals,
    review_open_tasks,
    review_persona_overlays,
    review_pending_programming_requests,
    review_trusted_email_recipients,
    request_self_programming,
    set_voice_profile_preferences,
    set_event_room,
    top_venture_status,
    update_task_status,
    weekly_metrics,
)

SYSTEM_PROMPT = "\n\n".join([
    load_freedom_core_prompt(),
    load_freedom_runtime_policy_prompt(),
]).strip()

SUPPORTED_REALTIME_VOICES = {
    "alloy",
    "ash",
    "ballad",
    "cedar",
    "coral",
    "echo",
    "marin",
    "sage",
    "shimmer",
    "verse",
}
LEGACY_REALTIME_VOICE_ALIASES = {
    "nova": "marin",
}


def resolve_realtime_voice(profile: dict[str, object] | None = None) -> str:
    requested = str(profile.get("targetVoice", "")) if profile else os.getenv("NEXT_PUBLIC_VOICE_ID", "marin").strip().lower()
    normalized = LEGACY_REALTIME_VOICE_ALIASES.get(requested, requested)
    return normalized if normalized in SUPPORTED_REALTIME_VOICES else "marin"


async def entrypoint(ctx: agents.JobContext) -> None:
    await ctx.connect()
    set_event_room(ctx.room)
    voice_profile = get_current_voice_profile()
    supplemental_context = build_runtime_context()
    instructions = SYSTEM_PROMPT if not supplemental_context else f"{SYSTEM_PROMPT}\n\nRuntime context:\n{supplemental_context}"

    session = AgentSession(
        llm=lk_openai.realtime.RealtimeModel(
            model="gpt-realtime-mini",
            voice=resolve_realtime_voice(voice_profile),
            input_audio_transcription=realtime.AudioTranscription(
                model="gpt-4o-transcribe",
            ),
            input_audio_noise_reduction="near_field",
            turn_detection=realtime.realtime_audio_input_turn_detection.SemanticVad(
                type="semantic_vad",
                create_response=True,
                eagerness="auto",
                interrupt_response=True,
            ),
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
                "source": "user",
                "final": True,
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
                "source": "assistant",
                "final": True,
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
                    review_voice_profile,
                    review_persona_overlays,
                    park_task,
                    update_task_status,
                    record_learning_signal,
                    request_self_programming,
                    request_persona_adjustment,
                    request_persona_overlay_revision,
                    request_persona_overlay_retirement,
                    set_voice_profile_preferences,
                    prepare_email_draft,
                ],
            ),
            room_options=RoomOptions(delete_room_on_close=True),
            room_input_options=RoomInputOptions(noise_cancellation=True),
        )
    finally:
        set_event_room(None)


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
