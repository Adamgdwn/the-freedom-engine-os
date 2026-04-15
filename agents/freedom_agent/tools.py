"""
Stub tools for the Freedom voice agent.
Each function returns seeded data now; swap the return values for
Supabase queries when the persistence layer is wired up.
"""
from livekit.agents import function_tool


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
