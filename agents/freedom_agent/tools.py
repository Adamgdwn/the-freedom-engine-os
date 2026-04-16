"""
Stub tools for the Freedom voice agent.
Each function returns seeded data now; swap the return values for
Supabase queries when the persistence layer is wired up.
"""
import json
import time

from livekit import rtc
from livekit.agents import function_tool

_event_room: rtc.Room | None = None


def set_event_room(room: rtc.Room | None) -> None:
    global _event_room
    _event_room = room


async def _publish_event(message: dict[str, object]) -> None:
    if _event_room is None:
        return

    try:
        await _event_room.local_participant.publish_data(
            json.dumps(message),
            reliable=True,
        )
    except Exception:
        return


@function_tool
async def top_venture_status() -> str:
    """Return the status of the top-priority active venture."""
    # TODO: replace with Supabase query against ventures table
    return (
        "AI Consulting Build — active. Score: 87. "
        "Blocking item: proposal template not finalized."
    )


@function_tool
async def pending_approvals() -> str:
    """Return any approvals that are currently pending."""
    # TODO: replace with Supabase query
    return (
        "1 pending approval: budget increase for PDF Flow infrastructure. "
        "Awaiting: Adam."
    )


@function_tool
async def weekly_metrics() -> str:
    """Return this week's key metrics."""
    # TODO: replace with Supabase query
    return (
        "Week of Apr 14: 3 sessions completed, "
        "2 ventures active, 0 governance overrides."
    )


@function_tool
async def park_task(task_id: str, topic: str, summary: str) -> str:
    """
    Park an in-progress task so it can be resumed later.

    This is a UI-facing coordination primitive. Keep the topic short and the
    summary to one sentence.
    """
    now = int(time.time() * 1000)
    await _publish_event({
        "type": "task_update",
        "payload": {
            "type": "created",
            "task": {
                "id": task_id,
                "topic": topic,
                "summary": summary,
                "status": "parked",
                "createdAt": now,
                "updatedAt": now,
            },
        },
    })
    return "Parked."


@function_tool
async def update_task_status(task_id: str, status: str, summary: str = "") -> str:
    """
    Update the status of a parked or active task.

    This is a UI-facing coordination primitive used to reflect progress back to
    the web voice panel.
    """
    await _publish_event({
        "type": "task_update",
        "payload": {
            "type": "status",
            "taskId": task_id,
            "status": status,
        },
    })

    if summary:
        await _publish_event({
            "type": "task_update",
            "payload": {
                "type": "summary",
                "taskId": task_id,
                "summary": summary,
            },
        })

    return "Updated."


@function_tool
async def record_learning_signal(
    signal_id: str,
    topic: str,
    summary: str,
    kind: str,
    status: str = "observed",
) -> str:
    """
    Record a durable learning signal from conversation.

    Use this for stable preferences, focus patterns, workflow friction, and
    repeated capability needs that should influence future behavior.
    """
    now = int(time.time() * 1000)
    await _publish_event({
        "type": "learning_update",
        "payload": {
            "type": "recorded",
            "signal": {
                "id": signal_id,
                "topic": topic,
                "summary": summary,
                "kind": kind,
                "status": status,
                "createdAt": now,
                "updatedAt": now,
            },
        },
    })
    return "Learning recorded."


@function_tool
async def request_self_programming(request_id: str, capability: str, reason: str) -> str:
    """
    Surface a self-programming request that requires explicit approval.

    This does not execute any code changes. It only raises the request into the
    UI so the operator can decide whether Freedom should pursue it.
    """
    now = int(time.time() * 1000)
    await _publish_event({
        "type": "self_programming_update",
        "payload": {
            "type": "created",
            "request": {
                "id": request_id,
                "capability": capability,
                "reason": reason,
                "status": "pending",
                "createdAt": now,
                "updatedAt": now,
            },
        },
    })
    return "Self-programming request recorded for approval."


@function_tool
async def prepare_email_draft(
    draft_id: str,
    recipient_destination: str,
    subject: str,
    body: str,
    recipient_label: str = "",
    intro: str = "",
) -> str:
    """
    Prepare an outbound email draft for explicit user confirmation.

    This does not send email. It only publishes a draft to the web UI so the
    operator can review and confirm the delivery.
    """
    await _publish_event({
        "type": "email_draft_update",
        "payload": {
            "type": "created",
            "draft": {
                "id": draft_id,
                "recipientLabel": recipient_label or None,
                "recipientDestination": recipient_destination,
                "subject": subject,
                "intro": intro,
                "body": body,
                "createdAt": int(time.time() * 1000),
            },
        },
    })
    return "Email draft prepared for confirmation."
