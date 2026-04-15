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
import os
from dotenv import load_dotenv

# Load from repo root .env first, then local .env fallback
load_dotenv(dotenv_path="../../.env", override=False)
load_dotenv(override=False)

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions, cli, WorkerOptions
from livekit.plugins import openai as lk_openai

from tools import top_venture_status, pending_approvals, weekly_metrics

SYSTEM_PROMPT = """
You are Freedom — a sharp, direct operating partner for a solo founder.
Speak in clear, concise sentences. No filler. No unsolicited lists.
Surface what matters, flag what is blocked, and help make decisions fast.
You have access to venture status, pending approvals, and weekly metrics.
""".strip()


async def entrypoint(ctx: agents.JobContext) -> None:
    await ctx.connect()

    session = AgentSession(
        llm=lk_openai.realtime.RealtimeModel(
            model="gpt-4o-realtime-preview",
            voice=os.getenv("NEXT_PUBLIC_VOICE_ID", "nova"),
        ),
    )

    await session.start(
        room=ctx.room,
        agent=Agent(
            instructions=SYSTEM_PROMPT,
            tools=[top_venture_status, pending_approvals, weekly_metrics],
        ),
        room_input_options=RoomInputOptions(noise_cancellation=True),
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
