"""
Structured precondition evaluation for freedom.tool.yaml manifests.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import socket
from pathlib import Path
from typing import Any
from urllib import parse, request


class PreconditionError(Exception):
    def __init__(self, kind: str, message: str):
        self.kind = kind
        self.message = message
        super().__init__(message)


def evaluate_preconditions(
    preconditions: list[dict[str, Any]],
    params: dict[str, Any],
) -> None:
    """Evaluate all preconditions in order. Raises PreconditionError on first failure."""
    for pc in preconditions:
        kind = pc.get("kind", "")
        _evaluate_one(kind, pc, params)


def _substitute(template: str, params: dict[str, Any]) -> str:
    """Expand ${env.VAR}, ${params.field}, and ${slug(params.field)} in a string."""
    result = template

    result = re.sub(
        r"\$\{env\.([^}]+)\}",
        lambda m: os.getenv(m.group(1), ""),
        result,
    )
    result = re.sub(
        r"\$\{slug\(params\.([^)]+)\)\}",
        lambda m: _slugify(str(params.get(m.group(1), ""))),
        result,
    )
    result = re.sub(
        r"\$\{params\.([^}]+)\}",
        lambda m: str(params.get(m.group(1), "")),
        result,
    )
    return result


def _slugify(name: str) -> str:
    s = name.lower()
    s = re.sub(r"[ _/]", "-", s)
    s = re.sub(r"[^a-z0-9-]", "", s)
    s = re.sub(r"-+", "-", s)
    return s.strip("-")


def _evaluate_one(kind: str, pc: dict[str, Any], params: dict[str, Any]) -> None:
    on_fail = pc.get("on_fail", f"Precondition {kind!r} failed.")

    if kind == "path_exists":
        path = Path(_substitute(pc.get("path", ""), params))
        if not path.exists():
            raise PreconditionError(kind, on_fail)

    elif kind == "path_not_exists":
        path = Path(_substitute(pc.get("path", ""), params))
        if path.exists():
            raise PreconditionError(kind, on_fail)

    elif kind == "command_available":
        if not shutil.which(pc.get("command", "")):
            raise PreconditionError(kind, on_fail)

    elif kind == "port_available_or_ours":
        port = int(pc.get("port", 0))
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind(("127.0.0.1", port))
            except OSError:
                raise PreconditionError(kind, on_fail)

    elif kind == "env_var_set":
        if not os.getenv(pc.get("var", "")):
            raise PreconditionError(kind, on_fail)

    elif kind == "supabase_row_exists":
        _check_supabase_row(pc, params, on_fail)

    elif kind == "tool_manifest_upgrade_policy_allows":
        _check_upgrade_policy(pc, params, on_fail)

    else:
        raise PreconditionError(kind, f"Unknown precondition kind: {kind!r}")


def _check_supabase_row(pc: dict[str, Any], params: dict[str, Any], on_fail: str) -> None:
    supabase_url = os.getenv("SUPABASE_URL", "")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not supabase_url or not service_key:
        raise PreconditionError("supabase_row_exists", "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured")

    table = pc.get("table", "")
    match_spec: dict = pc.get("match", {})
    require: dict = pc.get("require", {})

    filters = {}
    for k, v in match_spec.items():
        filters[k] = f"eq.{_substitute(str(v), params)}"

    url = f"{supabase_url.rstrip('/')}/rest/v1/{table}?" + parse.urlencode(filters)
    req = request.Request(
        url,
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept": "application/json",
        },
    )
    try:
        with request.urlopen(req, timeout=5) as resp:
            rows = json.loads(resp.read())
    except Exception as e:
        raise PreconditionError("supabase_row_exists", f"Supabase check failed: {e}")

    if not rows:
        raise PreconditionError("supabase_row_exists", on_fail)

    status_in = require.get("status_in", [])
    if status_in and rows[0].get("status") not in status_in:
        raise PreconditionError("supabase_row_exists", on_fail)


def _check_upgrade_policy(pc: dict[str, Any], params: dict[str, Any], on_fail: str) -> None:
    import registry as reg
    tool_id = params.get(pc.get("tool_id_param", "tool_id"), "")
    manifest = reg.get_tool(tool_id)
    if not manifest:
        raise PreconditionError("tool_manifest_upgrade_policy_allows", f"Tool {tool_id!r} not in registry")
    policy = manifest.get("governance", {}).get("autonomy", {}).get("upgrade_policy", "locked")
    if policy == "locked":
        raise PreconditionError("tool_manifest_upgrade_policy_allows", on_fail)
