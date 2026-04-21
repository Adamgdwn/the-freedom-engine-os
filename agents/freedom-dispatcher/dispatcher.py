"""
Freedom dispatcher — subprocess execution engine.
"""
from __future__ import annotations

import asyncio
import datetime
import json
import os
import sys
import time
from pathlib import Path
from typing import Any


async def invoke_subprocess(
    manifest: dict[str, Any],
    params: dict[str, Any],
    audit_correlation_id: str,
) -> dict[str, Any]:
    invocation = manifest.get("invocation", {})
    command: list[str] = invocation.get("command", [])
    cwd = invocation.get("cwd") or str(Path.home())
    params_transport = invocation.get("params_transport", "stdin_json")
    timeout_seconds = int(invocation.get("timeout_seconds", 60))
    env_passthrough: list[str] = invocation.get("env_passthrough", [])

    env = {
        "PATH": os.getenv("PATH", "/usr/bin:/bin:/usr/local/bin"),
        "HOME": os.getenv("HOME", str(Path.home())),
        "USER": os.getenv("USER", ""),
        "LANG": os.getenv("LANG", "en_US.UTF-8"),
    }
    for var in env_passthrough:
        val = os.getenv(var)
        if val is not None:
            env[var] = val

    full_params = {**params, "audit_correlation_id": audit_correlation_id}
    started_at = time.time()

    if params_transport == "stdin_json":
        stdin_data = json.dumps(full_params).encode()
        try:
            proc = await asyncio.create_subprocess_exec(
                *command,
                cwd=cwd,
                env=env,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        except FileNotFoundError as e:
            return _err("COMMAND_NOT_FOUND", str(e), started_at)

        try:
            stdout_b, stderr_b = await asyncio.wait_for(
                proc.communicate(stdin_data),
                timeout=timeout_seconds,
            )
        except asyncio.TimeoutError:
            try:
                proc.kill()
            except ProcessLookupError:
                pass
            await proc.wait()
            return _err("TIMEOUT", f"Tool timed out after {timeout_seconds}s", started_at)
    else:
        return _err("UNSUPPORTED_TRANSPORT", f"params_transport {params_transport!r} not implemented", started_at)

    stdout_str = stdout_b.decode(errors="replace")
    stderr_str = stderr_b.decode(errors="replace")
    exit_code = proc.returncode

    # Forward stderr to our own stderr so progress is visible in dispatcher logs
    if stderr_str.strip():
        print(stderr_str, file=sys.stderr, end="", flush=True)

    last_line = next(
        (line.strip() for line in reversed(stdout_str.splitlines()) if line.strip()),
        "",
    )
    finished_at = time.time()
    base = {
        "stdout_raw": stdout_str,
        "stderr_raw": stderr_str,
        "exit_code": exit_code,
        "started_at": _ts(started_at),
        "finished_at": _ts(finished_at),
        "duration_ms": int((finished_at - started_at) * 1000),
    }

    if not last_line:
        return {"ok": exit_code == 0, "error": {"code": "EMPTY_OUTPUT", "message": "Tool produced no stdout"}, **base}

    try:
        output = json.loads(last_line)
    except json.JSONDecodeError:
        return {"ok": False, "error": {"code": "OUTPUT_PARSE_FAILED", "message": f"Last stdout line not valid JSON: {last_line[:200]}"}, **base}

    if exit_code != 0:
        return {"ok": False, "error": {"code": "NONZERO_EXIT", "message": output.get("error", f"Exit code {exit_code}")}, "result": output, **base}

    return {"ok": True, "result": output, **base}


def _err(code: str, message: str, started_at: float) -> dict[str, Any]:
    now = time.time()
    return {
        "ok": False,
        "error": {"code": code, "message": message},
        "stdout_raw": "",
        "stderr_raw": "",
        "exit_code": -1,
        "started_at": _ts(started_at),
        "finished_at": _ts(now),
        "duration_ms": int((now - started_at) * 1000),
    }


def _ts(t: float) -> str:
    return datetime.datetime.utcfromtimestamp(t).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
