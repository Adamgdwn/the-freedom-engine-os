"""
Freedom tool registry — scans FREEDOM_TOOL_ROOTS for freedom.tool.yaml manifests.
"""
from __future__ import annotations

import os
import threading
from pathlib import Path
from typing import Any

import yaml

TOOL_MANIFEST_FILENAME = "freedom.tool.yaml"
SUPPORTED_SCHEMA_VERSIONS = {1}
_SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", ".mypy_cache"}

_registry: dict[str, dict[str, Any]] = {}
_manifest_paths: dict[str, Path] = {}
_lock = threading.Lock()


def _get_roots() -> list[Path]:
    roots_env = os.getenv("FREEDOM_TOOL_ROOTS", str(Path.home() / "code"))
    return [Path(r.strip()) for r in roots_env.split(":") if r.strip()]


def _load_manifest(path: Path) -> dict[str, Any] | None:
    try:
        data = yaml.safe_load(path.read_text())
        if not isinstance(data, dict):
            return None
        if data.get("schema_version") not in SUPPORTED_SCHEMA_VERSIONS:
            return None
        if not data.get("id") or not data.get("name"):
            return None
        return data
    except Exception:
        return None


def _should_skip(path: Path) -> bool:
    return any(part in _SKIP_DIRS for part in path.parts)


def reload_registry() -> dict[str, Any]:
    roots = _get_roots()
    found: dict[str, dict[str, Any]] = {}
    found_paths: dict[str, Path] = {}
    errors: list[str] = []

    for root in roots:
        if not root.exists():
            continue
        for manifest_path in root.rglob(TOOL_MANIFEST_FILENAME):
            if _should_skip(manifest_path):
                continue
            data = _load_manifest(manifest_path)
            if data is None:
                errors.append(f"parse-failed: {manifest_path}")
                continue
            tool_id = data["id"]
            if tool_id in found:
                errors.append(f"duplicate-id: {tool_id!r} at {manifest_path} (kept {found_paths[tool_id]})")
                continue
            found[tool_id] = data
            found_paths[tool_id] = manifest_path

    with _lock:
        _registry.clear()
        _registry.update(found)
        _manifest_paths.clear()
        _manifest_paths.update(found_paths)

    return {"ok": True, "tool_count": len(found), "errors": errors}


def get_tool(tool_id: str) -> dict[str, Any] | None:
    with _lock:
        return _registry.get(tool_id)


def get_manifest_path(tool_id: str) -> Path | None:
    with _lock:
        return _manifest_paths.get(tool_id)


def list_tools() -> list[dict[str, Any]]:
    with _lock:
        return list(_registry.values())
