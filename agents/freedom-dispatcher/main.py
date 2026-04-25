"""
Freedom Dispatcher — FastAPI daemon.
Listens on 127.0.0.1:4317. Only accepts connections from localhost.
"""
from __future__ import annotations

import asyncio
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Optional

import uvicorn
import yaml
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel

import dispatcher as tool_dispatcher
import preconditions as pc_module
import registry
import validator

_WATCH_INTERVAL = 20  # seconds between manifest scans


async def _manifest_watcher() -> None:
    """Background task: reload registry whenever a freedom.tool.yaml is added or changed."""
    last_state: dict[str, float] = {}

    def _snapshot() -> dict[str, float]:
        roots_env = __import__("os").getenv("FREEDOM_TOOL_ROOTS", str(Path.home() / "code"))
        snap: dict[str, float] = {}
        skip = {".git", "node_modules", "__pycache__", ".venv", "venv"}
        for root_str in roots_env.split(":"):
            root = Path(root_str.strip())
            if not root.exists():
                continue
            for p in root.rglob("freedom.tool.yaml"):
                if any(part in skip for part in p.parts):
                    continue
                try:
                    snap[str(p)] = p.stat().st_mtime
                except OSError:
                    pass
        return snap

    last_state = _snapshot()

    while True:
        await asyncio.sleep(_WATCH_INTERVAL)
        current = _snapshot()
        if current != last_state:
            added = set(current) - set(last_state)
            changed = {p for p in current if p in last_state and current[p] != last_state[p]}
            result = registry.reload_registry()
            for p in added:
                print(f"[freedom-dispatcher] new manifest: {p}", flush=True)
            for p in changed:
                print(f"[freedom-dispatcher] updated manifest: {p}", flush=True)
            print(f"[freedom-dispatcher] auto-reloaded: {result['tool_count']} tools", flush=True)
            last_state = current


@asynccontextmanager
async def lifespan(app: FastAPI):
    result = registry.reload_registry()
    print(f"[freedom-dispatcher] Loaded {result['tool_count']} tools", flush=True)
    for err in result.get("errors", []):
        print(f"[freedom-dispatcher] registry warning: {err}", flush=True)
    watcher = asyncio.create_task(_manifest_watcher())
    yield
    watcher.cancel()


app = FastAPI(title="Freedom Dispatcher", version="1.0.0", lifespan=lifespan)


# ── models ────────────────────────────────────────────────────────────────────

class InvokeRequest(BaseModel):
    tool_id: str
    params: dict[str, Any] = {}
    audit_correlation_id: str = ""


class AutonomyUpdateRequest(BaseModel):
    tool_id: str
    new_level: str
    reason: str


# ── POST /invoke ──────────────────────────────────────────────────────────────

@app.post("/invoke")
async def invoke(req: InvokeRequest):
    audit_id = req.audit_correlation_id or str(uuid.uuid4())

    manifest = registry.get_tool(req.tool_id)
    if not manifest:
        raise HTTPException(404, detail={
            "ok": False,
            "error": {"code": "UNKNOWN_TOOL", "message": f"Tool {req.tool_id!r} not in registry", "audit_correlation_id": audit_id},
        })

    param_schema = manifest.get("parameters", {})
    errors = validator.validate_params(req.params, param_schema)
    if errors:
        raise HTTPException(400, detail={
            "ok": False,
            "error": {
                "code": "INVALID_PARAMS",
                "message": errors[0].message,
                "field": errors[0].field,
                "all_errors": [e.to_dict() for e in errors],
                "audit_correlation_id": audit_id,
            },
        })

    preconditions = manifest.get("governance", {}).get("preconditions", [])
    try:
        pc_module.evaluate_preconditions(preconditions, req.params)
    except pc_module.PreconditionError as e:
        raise HTTPException(412, detail={
            "ok": False,
            "error": {"code": "PRECONDITION_FAILED", "message": e.message, "kind": e.kind, "audit_correlation_id": audit_id},
        })

    result = await tool_dispatcher.invoke_subprocess(manifest, req.params, audit_id)

    if not result["ok"]:
        raise HTTPException(500, detail={**result, "tool_id": req.tool_id, "audit_correlation_id": audit_id})

    return {"ok": True, "tool_id": req.tool_id, "audit_correlation_id": audit_id, **result}


# ── POST /admin/reload ────────────────────────────────────────────────────────

@app.post("/admin/reload")
def admin_reload():
    return registry.reload_registry()


# ── GET /admin/tools ──────────────────────────────────────────────────────────

@app.get("/admin/tools")
def admin_tools(id: Optional[str] = None):
    if id:
        tool = registry.get_tool(id)
        if not tool:
            raise HTTPException(404, detail={"ok": False, "error": f"Tool {id!r} not found"})
        return {"ok": True, "tools": [_summarize(tool)]}
    return {"ok": True, "tools": [_summarize(t) for t in registry.list_tools()]}


# ── POST /admin/autonomy ──────────────────────────────────────────────────────

@app.post("/admin/autonomy")
def admin_update_autonomy(req: AutonomyUpdateRequest):
    if req.new_level not in ("A0", "A1", "A2", "A3"):
        raise HTTPException(400, detail={"ok": False, "error": "new_level must be A0, A1, A2, or A3"})

    manifest = registry.get_tool(req.tool_id)
    if not manifest:
        raise HTTPException(404, detail={"ok": False, "error": f"Tool {req.tool_id!r} not found"})

    manifest_path = registry.get_manifest_path(req.tool_id)
    if not manifest_path:
        raise HTTPException(500, detail={"ok": False, "error": "Manifest path not tracked"})

    gov = manifest.get("governance", {})
    autonomy = gov.get("autonomy", {})
    policy = autonomy.get("upgrade_policy", "locked")
    if policy == "locked":
        raise HTTPException(403, detail={
            "ok": False,
            "error": f"Tool {req.tool_id!r} has upgrade_policy: locked. Edit manually.",
        })

    previous_level = autonomy.get("level", "A1")

    data = yaml.safe_load(manifest_path.read_text())
    data.setdefault("governance", {}).setdefault("autonomy", {})
    data["governance"]["autonomy"]["level"] = req.new_level
    data["governance"]["autonomy"]["last_changed_by"] = "freedom"
    data["governance"]["autonomy"]["last_changed_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    data["governance"]["autonomy"]["last_changed_reason"] = req.reason
    manifest_path.write_text(yaml.dump(data, default_flow_style=False, allow_unicode=True, sort_keys=False))

    registry.reload_registry()

    return {"ok": True, "tool_id": req.tool_id, "previous_level": previous_level, "new_level": req.new_level}


# ── helpers ───────────────────────────────────────────────────────────────────

def _summarize(manifest: dict[str, Any]) -> dict[str, Any]:
    gov = manifest.get("governance", {})
    path = registry.get_manifest_path(manifest.get("id", ""))
    return {
        "id": manifest.get("id"),
        "name": manifest.get("name"),
        "description": (manifest.get("description") or "").strip()[:200],
        "version": manifest.get("version"),
        "tags": manifest.get("tags", []),
        "autonomy_level": gov.get("autonomy", {}).get("level", "A1"),
        "manifest_path": str(path) if path else None,
    }


# ── entrypoint ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=4317, reload=False, log_level="info")
