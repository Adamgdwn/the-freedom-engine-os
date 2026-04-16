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
from urllib import error, parse, request
from dotenv import load_dotenv

# Load from repo root .env first, then local .env fallback
load_dotenv(dotenv_path="../../.env", override=False)
load_dotenv(override=False)

from livekit import agents, rtc
from livekit.agents import AgentSession, Agent, RoomInputOptions, cli, WorkerOptions
from livekit.plugins import openai as lk_openai

from tools import (
    park_task,
    pending_approvals,
    record_learning_signal,
    request_self_programming,
    set_event_room,
    top_venture_status,
    update_task_status,
    weekly_metrics,
)

SYSTEM_PROMPT = """
You are Freedom — a sharp, direct operating partner for a solo founder.
You speak in clear, concise sentences. Minimal filler. No unsolicited lists.
Surface what matters, flag what is blocked, and help make decisions fast.
Help keep the user on task. If they drift, redirect briefly toward the
highest-value objective or the clearest next decision.
Always look for durable patterns in preferences, repeated bottlenecks,
focus drift, operating cadence, and workflow friction.
Record meaningful learning signals as you notice them.
If the user changes topics while you are working on something, acknowledge
it briefly, park the prior task with a short label and summary, then
continue with the new topic.
If background work reaches a useful checkpoint, mark it ready and offer
to circle back in one short sentence.
If you identify an improvement that would require changing code, tools,
or runtime behavior, request self-programming and state that approval is
required before anything is changed.
If you are interrupted, stop cleanly, acknowledge briefly if helpful, and
yield the turn.
When asked a question you do not have data for, say so briefly, avoid
guessing, and move on.
You have access to venture status, pending approvals, and weekly metrics.
""".strip()


def _fetch_memory_rows(table: str, select_clause: str, limit: int) -> list[dict[str, object]]:
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_role_key:
        return []

    query = parse.urlencode({
        "select": select_clause,
        "order": "updated_at.desc",
        "limit": str(limit),
    })
    endpoint = f"{supabase_url}/rest/v1/{table}?{query}"
    req = request.Request(endpoint)
    req.add_header("apikey", service_role_key)
    req.add_header("Authorization", f"Bearer {service_role_key}")

    try:
        with request.urlopen(req, timeout=5) as response:
            payload = response.read().decode("utf-8")
    except (error.URLError, TimeoutError, json.JSONDecodeError):
        return []

    try:
        rows = json.loads(payload)
    except json.JSONDecodeError:
        return []

    return rows if isinstance(rows, list) else []


def build_memory_context() -> str:
    learning_rows = _fetch_memory_rows(
        "freedom_learning_signals",
        "topic,summary,status",
        6,
    )
    programming_rows = _fetch_memory_rows(
        "freedom_programming_requests",
        "capability,reason,status",
        3,
    )

    sections: list[str] = []

    if learning_rows:
        learning_lines = [
            f"- {row.get('topic', 'Unknown')}: {row.get('summary', '')} ({row.get('status', 'observed')})"
            for row in learning_rows
        ]
        sections.append("Recent durable memory:\n" + "\n".join(learning_lines))

    pending_programming = [
        row for row in programming_rows
        if row.get("status") == "pending"
    ]
    if pending_programming:
        programming_lines = [
            f"- {row.get('capability', 'Unknown capability')}: {row.get('reason', '')}"
            for row in pending_programming
        ]
        sections.append(
            "Pending self-programming requests requiring approval:\n"
            + "\n".join(programming_lines)
        )

    return "\n\n".join(sections).strip()


async def entrypoint(ctx: agents.JobContext) -> None:
    await ctx.connect()
    set_event_room(ctx.room)
    memory_context = build_memory_context()
    instructions = SYSTEM_PROMPT if not memory_context else f"{SYSTEM_PROMPT}\n\n{memory_context}"

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
                    park_task,
                    update_task_status,
                    record_learning_signal,
                    request_self_programming,
                ],
            ),
            room_input_options=RoomInputOptions(noise_cancellation=True),
        )
    finally:
        set_event_room(None)


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
