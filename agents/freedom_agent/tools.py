"""
Stub tools for the Freedom voice agent.
Each function returns seeded data now; swap the return values for
Supabase queries when the persistence layer is wired up.
"""
import json
import os
import re
import time
from urllib import error, parse, request
from pathlib import Path

from livekit import rtc
from livekit.agents import function_tool

_event_room: rtc.Room | None = None

_HOST_STATE_PATH = Path(
    os.getenv(
        "FREEDOM_DESKTOP_HOST_STATE_PATH",
        str(Path(__file__).resolve().parents[2] / "apps/desktop-host/.local-data/desktop/host-state.json"),
    )
)
_REPO_ROOT = Path(__file__).resolve().parents[2]
_MOBILE_RUNTIME_CONFIG_PATH = _REPO_ROOT / "apps/mobile/src/generated/runtimeConfig.ts"
_RUNTIME_CONFIG_EXPORT_RE = re.compile(r"^export const (?P<key>[A-Z0-9_]+) = (?P<value>.+);$")
_MAX_GOVERNED_FILE_CHARS = 12_000
_ALLOWED_GOVERNED_REPO_PATHS = {
    "AI_BOOTSTRAP.md",
    "README.md",
    "project-control.yaml",
    "docs/CHANGELOG.md",
    "docs/agent-inventory.md",
    "docs/architecture.md",
    "docs/current-capabilities.md",
    "docs/deployment-guide.md",
    "docs/manual.md",
    "docs/model-registry.md",
    "docs/prompt-register.md",
    "docs/roadmap.md",
    "docs/runbooks/operations.md",
    "docs/tool-permission-matrix.md",
}

_VOICE_CATALOG: dict[str, dict[str, object]] = {
    "alloy": {
        "label": "Alloy",
        "gender": "neutral",
        "warmth": "medium",
        "pace": "steady",
        "tone_hints": {"clear", "direct", "neutral", "balanced"},
    },
    "ash": {
        "label": "Ash",
        "gender": "masculine",
        "warmth": "medium",
        "pace": "steady",
        "tone_hints": {"grounded", "calm", "measured"},
    },
    "ballad": {
        "label": "Ballad",
        "gender": "masculine",
        "warmth": "high",
        "pace": "slower",
        "tone_hints": {"warm", "expressive", "storytelling"},
    },
    "cedar": {
        "label": "Cedar",
        "gender": "masculine",
        "warmth": "low",
        "pace": "steady",
        "tone_hints": {"dry", "direct", "steady"},
    },
    "coral": {
        "label": "Coral",
        "gender": "feminine",
        "warmth": "high",
        "pace": "adaptive",
        "tone_hints": {"warm", "upbeat", "friendly"},
    },
    "echo": {
        "label": "Echo",
        "gender": "masculine",
        "warmth": "low",
        "pace": "brisk",
        "tone_hints": {"plainspoken", "focused", "direct"},
    },
    "marin": {
        "label": "Marin",
        "gender": "feminine",
        "warmth": "high",
        "pace": "steady",
        "tone_hints": {"warm", "capable", "assured"},
    },
    "sage": {
        "label": "Sage",
        "gender": "androgynous",
        "warmth": "medium",
        "pace": "slower",
        "tone_hints": {"calm", "measured", "thoughtful"},
    },
    "shimmer": {
        "label": "Shimmer",
        "gender": "feminine",
        "warmth": "medium",
        "pace": "brisk",
        "tone_hints": {"bright", "light", "energetic"},
    },
    "verse": {
        "label": "Verse",
        "gender": "androgynous",
        "warmth": "medium",
        "pace": "adaptive",
        "tone_hints": {"expressive", "dramatic", "textured"},
    },
}

_VOICE_ALIASES = {
    "nova": "marin",
}

_BUILD_LANE_REASON_PREFIX = "[freedom-build-lane-v1]"
_BUILD_LANE_APPROVAL_STATES = {
    "conversation-capture",
    "needs-approval",
    "approved-for-discovery",
    "approved-for-build",
    "approved-for-release",
    "blocked",
}
_BUILD_LANE_REQUESTED_FROM = {
    "mobile_companion",
    "desktop_shell",
    "voice_runtime",
    "web_control_plane",
}


def set_event_room(room: rtc.Room | None) -> None:
    global _event_room
    _event_room = room


def _read_host_runtime_state() -> dict[str, object] | None:
    try:
        raw = _HOST_STATE_PATH.read_text(encoding="utf-8")
    except OSError:
        return None

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return None

    return payload if isinstance(payload, dict) else None


def _postgrest_request(
    method: str,
    table: str,
    *,
    payload: dict[str, object] | None = None,
    query: dict[str, str] | None = None,
    prefer: str | None = None,
) -> object | None:
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_role_key:
        return None

    query_string = parse.urlencode(query or {})
    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/{table}"
    if query_string:
        endpoint = f"{endpoint}?{query_string}"

    encoded = None if payload is None else json.dumps(payload).encode("utf-8")
    req = request.Request(endpoint, data=encoded, method=method)
    req.add_header("apikey", service_role_key)
    req.add_header("Authorization", f"Bearer {service_role_key}")
    if encoded is not None:
        req.add_header("Content-Type", "application/json")
    if prefer:
        req.add_header("Prefer", prefer)

    try:
        with request.urlopen(req, timeout=5) as response:
            raw = response.read().decode("utf-8")
    except (error.URLError, TimeoutError):
        return None

    if not raw.strip():
        return None

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def _upsert_row(table: str, payload: dict[str, object]) -> bool:
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_role_key:
        return False

    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/{table}"
    encoded = json.dumps(payload).encode("utf-8")
    req = request.Request(endpoint, data=encoded, method="POST")
    req.add_header("apikey", service_role_key)
    req.add_header("Authorization", f"Bearer {service_role_key}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "resolution=merge-duplicates,return=minimal")

    try:
        with request.urlopen(req, timeout=5):
            return True
    except (error.URLError, TimeoutError):
        return False


def _gateway_request(
    method: str,
    pathname: str,
    body: dict[str, object] | None = None,
) -> dict[str, object] | None:
    host_state = _read_host_runtime_state()
    if not host_state:
        return None

    gateway_url = os.getenv("FREEDOM_GATEWAY_URL") or host_state.get("gatewayUrl")
    host_token = host_state.get("hostToken")
    if not isinstance(gateway_url, str) or not gateway_url.strip():
        return None
    if not isinstance(host_token, str) or not host_token.strip():
        return None

    endpoint = parse.urljoin(gateway_url.rstrip("/") + "/", pathname.lstrip("/"))
    payload = None if body is None else json.dumps(body).encode("utf-8")
    req = request.Request(endpoint, data=payload, method=method)
    req.add_header("Authorization", f"Bearer {host_token}")
    if payload is not None:
        req.add_header("Content-Type", "application/json")

    try:
        with request.urlopen(req, timeout=5) as response:
            raw = response.read().decode("utf-8")
    except (error.URLError, TimeoutError, json.JSONDecodeError):
        return None

    if not raw.strip():
        return None

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return None

    return parsed if isinstance(parsed, dict) else None


def _relay_request(
    method: str,
    pathname: str,
    body: dict[str, object] | None = None,
) -> dict[str, object] | None:
    relay_base_url = os.getenv("FREEDOM_RELAY_BASE_URL") or "http://127.0.0.1:43211"
    relay_secret = os.getenv("FREEDOM_RELAY_SHARED_SECRET")
    if not relay_base_url or not relay_secret:
        return None

    endpoint = parse.urljoin(relay_base_url.rstrip("/") + "/", pathname.lstrip("/"))
    payload = None if body is None else json.dumps(body).encode("utf-8")
    req = request.Request(endpoint, data=payload, method=method)
    req.add_header("x-freedom-relay-secret", relay_secret)
    if payload is not None:
        req.add_header("Content-Type", "application/json")

    try:
        with request.urlopen(req, timeout=5) as response:
            raw = response.read().decode("utf-8")
    except (error.URLError, TimeoutError, json.JSONDecodeError):
        return None

    if not raw.strip():
        return None

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return None

    return parsed if isinstance(parsed, dict) else None


def _loopback_gateway_base_url() -> str:
    host_state = _read_host_runtime_state() or {}
    gateway_url = os.getenv("FREEDOM_GATEWAY_URL") or host_state.get("gatewayUrl") or "http://127.0.0.1:43111"
    parsed = parse.urlsplit(str(gateway_url))
    scheme = parsed.scheme or "http"
    port = parsed.port or 43111
    return f"{scheme}://127.0.0.1:{port}"


def _loopback_gateway_request(
    method: str,
    pathname: str,
    body: dict[str, object] | None = None,
) -> dict[str, object] | None:
    endpoint = parse.urljoin(_loopback_gateway_base_url().rstrip("/") + "/", pathname.lstrip("/"))
    payload = None if body is None else json.dumps(body).encode("utf-8")
    req = request.Request(endpoint, data=payload, method=method)
    if payload is not None:
        req.add_header("Content-Type", "application/json")

    try:
        with request.urlopen(req, timeout=10) as response:
            raw = response.read().decode("utf-8")
    except (error.URLError, TimeoutError, json.JSONDecodeError):
        return None

    if not raw.strip():
        return None

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return None

    return parsed if isinstance(parsed, dict) else None


def _approved_roots() -> list[Path]:
    roots_env = os.getenv("DESKTOP_APPROVED_ROOTS", "").strip()
    root_values = [item.strip() for item in roots_env.split(",") if item.strip()]
    if not root_values:
        root_values = [str(_REPO_ROOT)]

    resolved_roots: list[Path] = []
    for item in root_values:
        try:
            resolved_roots.append(Path(item).expanduser().resolve(strict=True))
        except OSError:
            continue
    if not resolved_roots:
        resolved_roots.append(_REPO_ROOT.resolve())
    return resolved_roots


def _path_within_root(candidate: Path, root: Path) -> bool:
    try:
        candidate.relative_to(root)
        return True
    except ValueError:
        return False


def _is_allowed_governed_repo_path(relative_path: str) -> bool:
    normalized = relative_path.strip().lstrip("./")
    return normalized in _ALLOWED_GOVERNED_REPO_PATHS or normalized.endswith("/freedom.tool.yaml") or normalized == "freedom.tool.yaml"


def _resolve_governed_repo_path(path_hint: str) -> tuple[Path, str]:
    raw_hint = path_hint.strip()
    if not raw_hint:
        raise ValueError("Tell me which governed file to inspect.")

    approved_roots = _approved_roots()
    raw_path = Path(raw_hint).expanduser()
    candidates: list[tuple[Path, str]] = []
    if raw_path.is_absolute():
        try:
            resolved = raw_path.resolve(strict=True)
        except OSError as exc:
            raise ValueError(f"I could not find {raw_hint}.") from exc
        for root in approved_roots:
            if _path_within_root(resolved, root):
                candidates.append((resolved, resolved.relative_to(root).as_posix()))
                break
    else:
        for root in approved_roots:
            try:
                resolved = (root / raw_path).resolve(strict=True)
            except OSError:
                continue
            if _path_within_root(resolved, root):
                candidates.append((resolved, resolved.relative_to(root).as_posix()))

    if not candidates:
        raise ValueError("That file is outside approved roots or does not exist.")

    for resolved, relative_path in candidates:
        if _is_allowed_governed_repo_path(relative_path):
            return resolved, relative_path

    raise ValueError(
        "This runtime can only inspect governed control docs and freedom.tool.yaml manifests inside approved roots."
    )


def _read_governed_repo_file(path_hint: str, max_chars: int = _MAX_GOVERNED_FILE_CHARS) -> tuple[str, str]:
    resolved_path, relative_path = _resolve_governed_repo_path(path_hint)
    try:
        contents = resolved_path.read_text(encoding="utf-8")
    except OSError as exc:
        raise ValueError(f"I could not read {relative_path}.") from exc

    clipped = contents[:max_chars]
    if len(contents) > max_chars:
        clipped += "\n\n[truncated]"
    return relative_path, clipped


def _dispatcher_tool_summary(tool_id: str = "") -> dict[str, object] | None:
    normalized_tool_id = tool_id.strip()
    suffix = f"?id={parse.quote(normalized_tool_id, safe='')}" if normalized_tool_id else ""
    return _dispatcher_request("GET", f"/admin/tools{suffix}")


def _dispatcher_manifest_path(tool_id: str) -> str | None:
    response = _dispatcher_tool_summary(tool_id)
    if not response or not isinstance(response.get("tools"), list) or not response["tools"]:
        return None
    manifest_path = response["tools"][0].get("manifest_path")
    return manifest_path.strip() if isinstance(manifest_path, str) and manifest_path.strip() else None


def get_current_voice_profile() -> dict[str, object] | None:
    return _gateway_request("GET", "/host/voice-profile")


def get_voice_runtime_bootstrap(room_name: str | None) -> dict[str, object] | None:
    if not room_name:
        return None
    encoded_room_name = parse.quote(room_name, safe="")
    return _gateway_request(
        "GET",
        f"/host/voice-runtime-bootstrap?roomName={encoded_room_name}",
    ) or _relay_request(
        "GET",
        f"/voice-runtime-bootstrap?roomName={encoded_room_name}",
    )


def get_relay_runtime_context(room_name: str | None) -> str:
    bootstrap = get_voice_runtime_bootstrap(room_name)
    if not isinstance(bootstrap, dict):
        return ""
    runtime_context = bootstrap.get("runtimeContext")
    return str(runtime_context).strip() if isinstance(runtime_context, str) else ""


def persist_voice_runtime_transcript(
    room_name: str | None,
    message_id: str,
    role: str,
    text: str,
) -> bool:
    if not room_name or role not in {"user", "assistant"} or not text.strip():
        return False
    response = _gateway_request(
        "POST",
        "/host/voice-runtime-transcript",
        {
            "roomName": room_name,
            "messageId": message_id,
            "role": role,
            "text": text.strip(),
        },
    )
    return response is not None


def _read_mobile_runtime_config() -> dict[str, object]:
    try:
        lines = _MOBILE_RUNTIME_CONFIG_PATH.read_text(encoding="utf-8").splitlines()
    except OSError:
        return {}

    parsed: dict[str, object] = {}
    for line in lines:
        match = _RUNTIME_CONFIG_EXPORT_RE.match(line.strip())
        if not match:
            continue
        key = match.group("key")
        raw_value = match.group("value").strip()
        try:
            parsed[key] = json.loads(raw_value)
        except json.JSONDecodeError:
            parsed[key] = raw_value.strip("\"'")
    return parsed


def _configured_web_search_provider() -> str:
    return (os.getenv("FREEDOM_WEB_SEARCH_PROVIDER") or "perplexity").strip().lower() or "perplexity"


def _configured_web_search_model() -> str:
    return (os.getenv("FREEDOM_WEB_SEARCH_MODEL") or "sonar").strip() or "sonar"


def _perplexity_api_key() -> str | None:
    api_key = os.getenv("PERPLEXITY_API_KEY")
    return api_key.strip() if api_key and api_key.strip() else None


def _perplexity_chat_completion(
    *,
    system_prompt: str,
    user_prompt: str,
    search_recency_filter: str | None = None,
    search_domain_filter: list[str] | None = None,
    return_related_questions: bool = False,
) -> tuple[dict[str, object] | None, str | None]:
    provider = _configured_web_search_provider()
    if provider != "perplexity":
        return None, (
            f"The configured web-search provider is '{provider}', but this runtime is currently wired "
            "only for Perplexity-backed search."
        )

    api_key = _perplexity_api_key()
    if not api_key:
        return None, (
            "Perplexity web search is not configured on this desktop yet. "
            "Add PERPLEXITY_API_KEY to the repo-root .env to enable live search and weather."
        )

    payload: dict[str, object] = {
        "model": _configured_web_search_model(),
        "messages": [
            {"role": "system", "content": system_prompt.strip()},
            {"role": "user", "content": user_prompt.strip()},
        ],
        "temperature": 0.2,
        "web_search_options": {
            "search_mode": "web",
            "disable_search": False,
            "return_related_questions": return_related_questions,
        },
    }
    web_search_options = payload["web_search_options"]
    if not isinstance(web_search_options, dict):
        return None, "Internal error preparing Perplexity web search options."

    normalized_recency = (search_recency_filter or "").strip().lower()
    if normalized_recency in {"hour", "day", "week", "month", "year"}:
        web_search_options["search_recency_filter"] = normalized_recency

    domains = [domain.strip() for domain in (search_domain_filter or []) if domain.strip()]
    if domains:
        web_search_options["search_domain_filter"] = domains

    req = request.Request(
        "https://api.perplexity.ai/v1/sonar",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
    )
    req.add_header("Authorization", f"Bearer {api_key}")
    req.add_header("Content-Type", "application/json")

    try:
        with request.urlopen(req, timeout=20) as response:
            raw = response.read().decode("utf-8")
    except error.HTTPError as exc:
        try:
            detail = exc.read().decode("utf-8")
        except Exception:
            detail = ""
        return None, (
            f"Perplexity returned HTTP {exc.code}. "
            f"{detail.strip() or 'The request did not complete successfully.'}"
        )
    except (error.URLError, TimeoutError) as exc:
        return None, f"Perplexity web search is currently unavailable: {exc!s}"

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return None, "Perplexity returned a response that could not be parsed."

    return parsed if isinstance(parsed, dict) else None, None


def _format_perplexity_response(query: str, response: dict[str, object]) -> str:
    choices = response.get("choices")
    message_content = ""
    if isinstance(choices, list) and choices:
        first_choice = choices[0]
        if isinstance(first_choice, dict):
            message = first_choice.get("message")
            if isinstance(message, dict):
                raw_content = message.get("content")
                if isinstance(raw_content, str):
                    message_content = raw_content.strip()

    search_results = response.get("search_results")
    result_lines: list[str] = []
    if isinstance(search_results, list):
        for item in search_results[:3]:
            if not isinstance(item, dict):
                continue
            title = str(item.get("title") or item.get("url") or "Source").strip()
            url = str(item.get("url") or "").strip()
            if not url:
                continue
            result_lines.append(f"- {title}: {url}")

    citations = response.get("citations")
    citation_lines = [
        f"- {url.strip()}"
        for url in citations[:5]
        if isinstance(citations, list) and isinstance(url, str) and url.strip()
    ]

    sections = [f"Live web answer for '{query.strip()}':", message_content or "Perplexity returned no answer text."]
    if result_lines:
        sections.append("Top sources:\n" + "\n".join(result_lines))
    elif citation_lines:
        sections.append("Citations:\n" + "\n".join(citation_lines))
    return "\n".join(section for section in sections if section).strip()


def _normalize_voice_id(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().lower()
    if not normalized:
        return None
    normalized = _VOICE_ALIASES.get(normalized, normalized)
    if normalized in _VOICE_CATALOG:
        return normalized

    for voice_id, entry in _VOICE_CATALOG.items():
        if normalized == str(entry["label"]).strip().lower():
            return voice_id

    return None


def _normalize_gender(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().lower()
    aliases = {
        "female": "feminine",
        "woman": "feminine",
        "male": "masculine",
        "man": "masculine",
        "nonbinary": "androgynous",
        "non-binary": "androgynous",
    }
    normalized = aliases.get(normalized, normalized)
    return normalized if normalized in {"feminine", "masculine", "neutral", "androgynous", "unspecified"} else None


def _normalize_warmth(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().lower()
    aliases = {
        "cool": "low",
        "lean": "low",
        "soft": "high",
        "warm": "high",
    }
    normalized = aliases.get(normalized, normalized)
    return normalized if normalized in {"low", "medium", "high"} else None


def _normalize_pace(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().lower()
    aliases = {
        "slow": "slower",
        "slower": "slower",
        "fast": "brisk",
        "faster": "brisk",
        "normal": "steady",
        "adaptive": "adaptive",
    }
    normalized = aliases.get(normalized, normalized)
    return normalized if normalized in {"slower", "steady", "brisk", "adaptive"} else None


def _clean_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed or None


def _resolve_voice_choice(
    target_voice: str | None,
    gender: str | None,
    tone: str | None,
    warmth: str | None,
    pace: str | None,
) -> str:
    explicit = _normalize_voice_id(target_voice)
    if explicit:
        return explicit

    normalized_gender = _normalize_gender(gender)
    normalized_warmth = _normalize_warmth(warmth)
    normalized_pace = _normalize_pace(pace)
    tone_tokens = {
        token
        for token in (tone or "").lower().replace(",", " ").split()
        if token and len(token) > 2
    }

    best_voice = "marin"
    best_score = -1
    for voice_id, entry in _VOICE_CATALOG.items():
        score = 0
        if normalized_gender and entry["gender"] == normalized_gender:
            score += 5
        if normalized_warmth and entry["warmth"] == normalized_warmth:
            score += 4
        if normalized_pace and entry["pace"] == normalized_pace:
            score += 3
        score += len(tone_tokens.intersection(entry["tone_hints"])) * 2
        if voice_id == "marin":
            score += 1
        if score > best_score:
            best_score = score
            best_voice = voice_id
    return best_voice


def format_voice_profile(profile: dict[str, object]) -> str:
    voice_id = _normalize_voice_id(str(profile.get("targetVoice", ""))) or "marin"
    entry = _VOICE_CATALOG[voice_id]
    details = [str(profile.get("displayName") or entry["label"])]

    gender = _normalize_gender(str(profile.get("gender"))) if profile.get("gender") is not None else None
    if gender and gender != "unspecified":
        details.append(gender)

    accent = _clean_optional_text(str(profile.get("accent"))) if profile.get("accent") is not None else None
    tone = _clean_optional_text(str(profile.get("tone"))) if profile.get("tone") is not None else None
    notes = _clean_optional_text(str(profile.get("notes"))) if profile.get("notes") is not None else None
    warmth = _normalize_warmth(str(profile.get("warmth"))) if profile.get("warmth") is not None else None
    pace = _normalize_pace(str(profile.get("pace"))) if profile.get("pace") is not None else None

    if accent:
        details.append(accent)
    if tone:
        details.append(tone)
    if warmth and warmth != "medium":
        details.append("warmer" if warmth == "high" else "leaner")
    if pace and pace != "steady":
        details.append(pace)
    if notes:
        details.append(notes)

    return " | ".join(details)


def get_voice_profile_context() -> str:
    profile = get_current_voice_profile()
    if not profile:
        return ""

    return (
        "Operator voice profile:\n"
        f"- {format_voice_profile(profile)}\n"
        "- Match the requested delivery style in your wording now when reasonable.\n"
        "- Realtime synthesizer voice changes apply on the next voice session after restart."
    )


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


def _fetch_rows(table: str, select_clause: str, limit: int) -> list[dict[str, object]]:
    rows = _postgrest_request(
        "GET",
        table,
        query={
            "select": select_clause,
            "order": "updated_at.desc",
            "limit": str(limit),
        },
    )
    return rows if isinstance(rows, list) else []


def _host_runtime_identity() -> tuple[str | None, str | None]:
    host_state = _read_host_runtime_state() or {}
    host_id = host_state.get("hostId")
    host_name = host_state.get("hostName")
    return (
        host_id.strip() if isinstance(host_id, str) and host_id.strip() else None,
        host_name.strip() if isinstance(host_name, str) and host_name.strip() else None,
    )


def _normalize_build_lane_approval_state(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    return normalized if normalized in _BUILD_LANE_APPROVAL_STATES else "needs-approval"


def _normalize_build_lane_requested_from(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    return normalized if normalized in _BUILD_LANE_REQUESTED_FROM else "voice_runtime"


def _programming_status_for_build_lane(approval_state: str) -> str:
    if approval_state in {"approved-for-build", "approved-for-release"}:
        return "approved"
    if approval_state == "blocked":
        return "denied"
    return "pending"


def _serialize_build_lane_reason(summary: str, build_lane: dict[str, object] | None = None) -> str:
    trimmed_summary = summary.strip()
    if not build_lane:
        return trimmed_summary

    envelope = {
        "format": "freedom-build-lane-v1",
        "summary": trimmed_summary,
        "buildLane": build_lane,
    }
    return f"{_BUILD_LANE_REASON_PREFIX}\n{json.dumps(envelope)}"


def _parse_build_lane_reason(row: dict[str, object]) -> dict[str, object] | None:
    raw_reason = str(row.get("reason") or "").strip()
    if not raw_reason.startswith(_BUILD_LANE_REASON_PREFIX):
        return None

    payload = raw_reason[len(_BUILD_LANE_REASON_PREFIX):].strip()
    try:
        parsed = json.loads(payload)
    except json.JSONDecodeError:
        return None

    if not isinstance(parsed, dict) or parsed.get("format") != "freedom-build-lane-v1":
        return None

    build_lane = parsed.get("buildLane")
    if not isinstance(build_lane, dict):
        return None

    return {
        "id": str(row.get("id") or "").strip(),
        "title": str(row.get("capability") or "").strip() or "Untitled build lane item",
        "summary": str(parsed.get("summary") or "").strip() or str(row.get("reason") or "").strip(),
        "objective": str(build_lane.get("objective") or "").strip(),
        "businessCase": str(build_lane.get("businessCase") or "").strip(),
        "operator": str(build_lane.get("operator") or "Adam Goodwin").strip(),
        "approvalState": _normalize_build_lane_approval_state(str(build_lane.get("approvalState") or "")),
        "autonomyEnvelope": str(build_lane.get("autonomyEnvelope") or "").strip(),
        "executionSurface": str(build_lane.get("executionSurface") or "").strip(),
        "reportingPath": str(build_lane.get("reportingPath") or "").strip(),
        "nextCheckpoint": str(build_lane.get("nextCheckpoint") or "").strip(),
        "requestedBy": str(build_lane.get("requestedBy") or "Freedom").strip(),
        "requestedFrom": _normalize_build_lane_requested_from(str(build_lane.get("requestedFrom") or "")),
        "pricingModel": str(build_lane.get("pricingModel") or "").strip() or None,
        "scalePotential": str(build_lane.get("scalePotential") or "").strip() or None,
        "hostId": str(build_lane.get("hostId") or "").strip() or None,
        "requestedAt": str(row.get("created_at") or "").strip(),
        "updatedAt": str(row.get("updated_at") or "").strip(),
    }


def _format_build_lane_item(item: dict[str, object]) -> str:
    return (
        f"- {item.get('title', 'Untitled')} "
        f"[{item.get('approvalState', 'needs-approval')}] "
        f"from {item.get('requestedFrom', 'voice_runtime')}: "
        f"{item.get('summary', '')}"
    )


def get_open_task_context(limit: int = 6) -> str:
    rows = _fetch_rows(
        "freedom_voice_tasks",
        "topic,summary,status",
        limit,
    )
    active_rows = [
        row for row in rows
        if row.get("status") in {"active", "parked", "ready"}
    ]
    if not active_rows:
        return ""

    task_lines = [
        f"- {row.get('topic', 'Unknown task')}: {row.get('summary', '')} ({row.get('status', 'parked')})"
        for row in active_rows
    ]
    return "Open task memory:\n" + "\n".join(task_lines)


def get_learning_signal_context(limit: int = 6) -> str:
    rows = _fetch_rows(
        "freedom_learning_signals",
        "topic,summary,status,kind",
        limit,
    )
    if not rows:
        return ""

    learning_lines = [
        f"- {row.get('topic', 'Unknown')}: {row.get('summary', '')} ({row.get('kind', 'signal')}, {row.get('status', 'observed')})"
        for row in rows
    ]
    return "Recent durable memory:\n" + "\n".join(learning_lines)


def get_pending_programming_context(limit: int = 3) -> str:
    rows = _fetch_rows(
        "freedom_programming_requests",
        "capability,reason,status",
        limit,
    )
    pending_rows = [
        row for row in rows
        if row.get("status") == "pending"
    ]
    if not pending_rows:
        return ""

    programming_lines = [
        f"- {row.get('capability', 'Unknown capability')}: {row.get('reason', '')}"
        for row in pending_rows
    ]
    return (
        "Pending self-programming requests requiring approval:\n"
        + "\n".join(programming_lines)
    )


def get_build_lane_context(limit: int = 6) -> str:
    host_id, _ = _host_runtime_identity()
    rows = _fetch_rows(
        "freedom_programming_requests",
        "id,capability,reason,status,created_at,updated_at",
        limit,
    )
    items = [
        item for row in rows
        if (item := _parse_build_lane_reason(row))
        and (not host_id or item.get("hostId") in {None, host_id})
    ]
    if not items:
        return ""

    return "Conversation build lane:\n" + "\n".join(_format_build_lane_item(item) for item in items)


def get_trusted_recipient_context(limit: int = 10) -> str:
    rows = _fetch_rows(
        "freedom_email_recipients",
        "label,destination",
        limit,
    )
    if not rows:
        return ""

    recipient_lines = [
        f"- {row.get('label', 'Unknown')}: {row.get('destination', '')}"
        for row in rows
    ]
    return (
        "Trusted email recipients currently available for confirmation-gated outbound mail:\n"
        + "\n".join(recipient_lines)
    )


def get_persona_overlay_context(limit: int = 8) -> str:
    rows = _fetch_rows(
        "freedom_persona_overlays",
        "title,instruction,rationale,source,status,change_type,target_overlay_id",
        limit,
    )
    approved_rows = [
        row for row in rows
        if row.get("status") == "approved" and row.get("change_type") != "retirement"
    ]
    if not approved_rows:
        return ""

    overlay_lines = [
        (
            f"- {row.get('title', 'Persona overlay')}"
            f" [{row.get('change_type', 'new')}, {row.get('source', 'freedom')}]: "
            f"{row.get('instruction', '')}"
        )
        for row in approved_rows
    ]
    return "Approved persona overlays:\n" + "\n".join(overlay_lines)


def get_pending_persona_adjustment_context(limit: int = 6) -> str:
    rows = _fetch_rows(
        "freedom_persona_overlays",
        "title,rationale,status,change_type,source,target_overlay_id",
        limit,
    )
    pending_rows = [
        row for row in rows
        if row.get("status") == "pending"
    ]
    if not pending_rows:
        return ""

    overlay_lines = [
        (
            f"- {row.get('title', 'Persona adjustment')}"
            f" [{row.get('change_type', 'new')}, {row.get('source', 'freedom')}]: "
            f"{row.get('rationale', '')}"
        )
        for row in pending_rows
    ]
    return "Pending persona adjustments requiring approval:\n" + "\n".join(overlay_lines)


def get_recent_thread_context(room_name: str | None, limit: int = 8) -> str:
    bootstrap = get_voice_runtime_bootstrap(room_name)
    if not isinstance(bootstrap, dict):
        return ""

    session_title = str(bootstrap.get("sessionTitle") or "Freedom").strip() or "Freedom"
    recent_messages = bootstrap.get("recentMessages")
    if not isinstance(recent_messages, list) or not recent_messages:
        return ""

    message_lines: list[str] = []
    for item in recent_messages[-limit:]:
        if not isinstance(item, dict):
            continue
        role = "User" if item.get("role") == "user" else "Freedom"
        content = str(item.get("content") or "").strip()
        if not content:
            continue
        message_lines.append(f"- {role}: {content}")

    if not message_lines:
        return ""

    return f"Recent conversation from {session_title}:\n" + "\n".join(message_lines)


def build_runtime_context(room_name: str | None = None) -> str:
    sections = [
        get_relay_runtime_context(room_name),
        get_recent_thread_context(room_name),
        get_open_task_context(),
        get_learning_signal_context(),
        get_pending_programming_context(),
        get_build_lane_context(),
        get_trusted_recipient_context(),
        get_voice_profile_context(),
        get_persona_overlay_context(),
        get_pending_persona_adjustment_context(),
    ]
    return "\n\n".join(section for section in sections if section).strip()


@function_tool
async def review_runtime_status() -> str:
    """
    Review the current published mobile build, live Freedom voice profile, desktop
    runtime posture, and web-search availability.
    """
    host_status = _gateway_request("GET", "/host/status") or {}
    runtime_config = _read_mobile_runtime_config()
    voice_profile = None
    if isinstance(host_status.get("voiceProfile"), dict):
        voice_profile = host_status["voiceProfile"]
    else:
        voice_profile = get_current_voice_profile()

    published_version = runtime_config.get("MOBILE_APP_VERSION_NAME")
    published_build = runtime_config.get("MOBILE_APP_VERSION_CODE")
    runtime_mode = runtime_config.get("VOICE_RUNTIME_MODE")
    voice_runtime_provider = os.getenv("FREEDOM_VOICE_RUNTIME_PROVIDER") or "openai-realtime"
    voice_runtime_model = os.getenv("FREEDOM_VOICE_RUNTIME_MODEL") or "gpt-realtime-mini"

    host_block = []
    host = host_status.get("host")
    if isinstance(host, dict):
        host_name = str(host.get("hostName") or "Desktop host").strip()
        host_online = "online" if host.get("isOnline") else "offline"
        host_block.append(f"Desktop host: {host_name} ({host_online}).")

    tailscale = host_status.get("tailscale")
    if isinstance(tailscale, dict):
        suggested_url = str(tailscale.get("suggestedUrl") or "").strip()
        if suggested_url:
            host_block.append(f"Install page: {suggested_url.rstrip('/')}/install")

    sections = []
    if published_version or published_build:
        sections.append(
            "Published mobile build: "
            f"{published_version or 'unknown'} ({published_build or 'unknown'})"
            + (f" with runtime mode {runtime_mode}." if runtime_mode else ".")
        )

    sections.append(
        "Desktop voice runtime: "
        f"{voice_runtime_provider} / {voice_runtime_model}."
    )

    if voice_profile:
        sections.append(f"Current live Freedom voice profile: {format_voice_profile(voice_profile)}.")
    else:
        sections.append("Current live Freedom voice profile: default realtime preset with no saved host-level override.")

    search_provider = _configured_web_search_provider()
    search_model = _configured_web_search_model()
    if search_provider == "perplexity" and _perplexity_api_key():
        sections.append(f"Default live web search: Perplexity ({search_model}) is configured.")
    elif search_provider == "perplexity":
        sections.append(
            f"Default live web search: Perplexity ({search_model}) is selected but not configured yet. "
            "Add PERPLEXITY_API_KEY to the repo-root .env to enable it."
        )
    else:
        sections.append(f"Default live web search provider: {search_provider} ({search_model}).")

    sections.extend(host_block)
    sections.append(
        "Note: this runtime can review the published mobile build and live Freedom voice profile, "
        "but it still cannot inspect the phone's current local Spoken Reply Voice selection directly."
    )
    return "\n".join(sections)


@function_tool
async def review_governance_controls() -> str:
    """
    Review the repo's governing controls for autonomy, approved tools, and
    operating rules.

    Use this when the operator asks what Freedom is allowed to do, how
    self-programming is governed, or which policy files define tool access.
    """
    sections: list[str] = []
    approved_roots = ", ".join(str(path) for path in _approved_roots())
    sections.append(f"Approved roots: {approved_roots}")

    dispatcher_status = _dispatcher_tool_summary()
    if dispatcher_status and isinstance(dispatcher_status.get("tools"), list):
        sections.append(f"Dispatcher tool count: {len(dispatcher_status['tools'])}")
    else:
        sections.append("Dispatcher tool count: unavailable because the dispatcher is not responding on 127.0.0.1:4317.")

    for path_hint in ["project-control.yaml", "docs/tool-permission-matrix.md", "AI_BOOTSTRAP.md"]:
        try:
            relative_path, content = _read_governed_repo_file(path_hint, max_chars=2_000)
            sections.append(f"{relative_path}:\n{content}")
        except ValueError as exc:
            sections.append(f"{path_hint}: {exc}")

    return "\n\n".join(sections)


@function_tool
async def read_governed_repo_file(path: str) -> str:
    """
    Read a governed repo control document or a freedom.tool.yaml manifest from
    an approved root.

    Use this when you need the exact current contents of project-control.yaml,
    tool-permission guidance, AI bootstrap rules, or a tool manifest before
    reasoning about authority, approval, or self-improvement.
    """
    try:
        relative_path, content = _read_governed_repo_file(path)
    except ValueError as exc:
        return str(exc)
    return f"{relative_path}:\n{content}"


@function_tool
async def review_dispatcher_tool_status(tool_id: str = "") -> str:
    """
    Review the current Freedom Dispatcher registry, including autonomy level and
    manifest path for each tool or a specific tool.
    """
    response = _dispatcher_tool_summary(tool_id)
    if response is None:
        return (
            "The Freedom Dispatcher is not responding. "
            "Start it with: bash ~/code/agents/the-freedom-engine-os/agents/freedom-dispatcher/start.sh"
        )

    tools = response.get("tools")
    if not isinstance(tools, list) or not tools:
        if tool_id.strip():
            return f"I could not find dispatcher tool '{tool_id.strip()}'."
        return "The dispatcher responded, but it did not return any registered tools."

    lines = []
    for tool in tools:
        if not isinstance(tool, dict):
            continue
        lines.append(
            f"- {tool.get('id', 'unknown')} | {tool.get('name', 'unknown')} | "
            f"autonomy={tool.get('autonomy_level', 'unknown')} | "
            f"manifest={tool.get('manifest_path', 'unknown path')}"
        )
    return "\n".join(lines) if lines else "The dispatcher returned no readable tool summaries."


@function_tool
async def review_dispatcher_tool_manifest(tool_id: str) -> str:
    """
    Read the manifest for a registered Freedom Dispatcher tool.

    Use this when the operator asks what a tool can do, what autonomy it has,
    or which YAML governs that tool's behavior.
    """
    normalized_tool_id = tool_id.strip()
    if not normalized_tool_id:
        return "Tell me which dispatcher tool id to inspect."

    manifest_path = _dispatcher_manifest_path(normalized_tool_id)
    if not manifest_path:
        return (
            f"I could not resolve the manifest path for dispatcher tool '{normalized_tool_id}'. "
            "Review the dispatcher tool status first if needed."
        )

    try:
        relative_path, content = _read_governed_repo_file(manifest_path)
    except ValueError as exc:
        return str(exc)
    return f"{normalized_tool_id} manifest at {relative_path}:\n{content}"


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
async def review_open_tasks() -> str:
    """
    Review currently open partner tasks before deciding whether to resume,
    replace, or park work.
    """
    return get_open_task_context() or "No open task memory is available right now."


@function_tool
async def review_learning_signals() -> str:
    """
    Review recent durable learning before deciding whether a new signal is
    stable enough to record.
    """
    return get_learning_signal_context() or "No durable learning signals are available right now."


@function_tool
async def review_pending_programming_requests() -> str:
    """
    Review pending approval-gated programming requests before creating another
    request for the same gap.
    """
    return (
        get_pending_programming_context()
        or "No pending self-programming requests are waiting for approval right now."
    )


@function_tool
async def review_build_lane_queue() -> str:
    """
    Review conversation-originated build-lane items before adding another
    dedicated Pop!_OS programming session request.
    """
    return get_build_lane_context() or "No conversation-originated build items are queued right now."


@function_tool
async def review_trusted_email_recipients() -> str:
    """
    Review trusted recipients before preparing a confirmation-gated outbound
    email draft.
    """
    return get_trusted_recipient_context() or "No trusted email recipients are configured right now."


@function_tool
async def review_persona_overlays() -> str:
    """
    Review approved persona overlays and pending persona-adjustment requests before
    proposing or repeating a personality change, revision, or retirement.
    """
    sections = [
        get_persona_overlay_context(),
        get_pending_persona_adjustment_context(),
    ]
    message = "\n\n".join(section for section in sections if section).strip()
    return message or "No approved or pending persona overlays are available right now."


@function_tool
async def review_voice_profile() -> str:
    """
    Review the current operator voice profile before changing Freedom's live
    voice characteristics.
    """
    profile = get_current_voice_profile()
    if not profile:
        return (
            "No saved voice profile is available right now. Freedom will use the current default "
            "realtime voice until a profile is saved."
        )

    options = ", ".join(f"{entry['label']} ({voice_id})" for voice_id, entry in _VOICE_CATALOG.items())
    return (
        f"Current voice profile: {format_voice_profile(profile)}.\n"
        f"Supported preset voices: {options}.\n"
        "Changing the live synthesizer voice takes effect on the next realtime voice session."
    )


@function_tool
async def search_web(
    query: str,
    recency: str = "",
    domains: str = "",
) -> str:
    """
    Search the live web using the default configured research provider.

    Use this for current events, public facts, product checks, weather-adjacent
    research, or whenever the user explicitly asks you to look something up.
    """
    normalized_query = query.strip()
    if not normalized_query:
        return "Tell me what to look up, and I can run a live web search."

    response, failure = _perplexity_chat_completion(
        system_prompt=(
            "You are Freedom's live web research tool. Answer concisely, include concrete facts and dates "
            "when available, and ground the answer in current web results."
        ),
        user_prompt=normalized_query,
        search_recency_filter=recency or None,
        search_domain_filter=[item for item in domains.split(",") if item.strip()],
        return_related_questions=False,
    )
    if failure:
        return failure
    if not response:
        return "The live web search did not return a usable response."
    return _format_perplexity_response(normalized_query, response)


@function_tool
async def check_weather(location: str) -> str:
    """
    Get the current weather and brief near-term outlook for a location using live web data.
    """
    normalized_location = location.strip()
    if not normalized_location:
        return "Tell me the location you want the weather for."

    response, failure = _perplexity_chat_completion(
        system_prompt=(
            "You are Freedom's live weather tool. Use current web results. Include the location name, current or "
            "most recent observed conditions, temperature, wind, precipitation if relevant, and a short near-term "
            "outlook. Mention uncertainty briefly if the source timing is unclear."
        ),
        user_prompt=(
            f"What is the current weather in {normalized_location}? Include a concise current summary and short outlook. "
            "Prefer very recent sources."
        ),
        search_recency_filter="day",
        return_related_questions=False,
    )
    if failure:
        return failure
    if not response:
        return f"I could not retrieve live weather for {normalized_location} right now."
    return _format_perplexity_response(f"weather in {normalized_location}", response)


@function_tool
async def set_voice_profile_preferences(
    target_voice: str = "",
    gender: str = "",
    accent: str = "",
    tone: str = "",
    warmth: str = "",
    pace: str = "",
    notes: str = "",
    reset_to_default: bool = False,
) -> str:
    """
    Save the operator's preferred Freedom voice characteristics.

    Use this when the user explicitly asks to change Freedom's live voice,
    accent, warmth, tone, pace, or similar delivery traits. Realtime preset
    changes apply on the next voice session after restart.
    """
    if reset_to_default:
        profile = _gateway_request("POST", "/host/voice-profile", {"resetToDefault": True})
        if not profile:
            return "I could not reset the saved voice profile because the desktop gateway is unavailable right now."
        return (
            f"Reset the voice profile to the default: {format_voice_profile(profile)}. "
            "Restart the voice session to hear the default realtime voice again."
        )

    normalized_gender = _normalize_gender(gender or None)
    normalized_warmth = _normalize_warmth(warmth or None)
    normalized_pace = _normalize_pace(pace or None)
    resolved_voice = _resolve_voice_choice(
        target_voice or None,
        normalized_gender,
        tone or None,
        normalized_warmth,
        normalized_pace,
    )
    payload = {
        "targetVoice": resolved_voice,
        "gender": normalized_gender,
        "accent": _clean_optional_text(accent or None),
        "tone": _clean_optional_text(tone or None),
        "warmth": normalized_warmth,
        "pace": normalized_pace,
        "notes": _clean_optional_text(notes or None),
    }
    profile = _gateway_request("POST", "/host/voice-profile", payload)
    if not profile:
        return "I could not save the voice profile because the desktop gateway is unavailable right now."

    resolved_name = str(profile.get("displayName") or _VOICE_CATALOG[resolved_voice]["label"])
    return (
        f"Saved the voice profile as {format_voice_profile(profile)}. "
        f"The closest current realtime preset is {resolved_name}. "
        "Restart the voice session to hear the new live voice."
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
    created_at = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(now / 1000))
    stored = _upsert_row(
        "freedom_programming_requests",
        {
            "id": request_id,
            "capability": capability,
            "reason": _serialize_build_lane_reason(reason),
            "status": "pending",
            "created_at": created_at,
            "updated_at": created_at,
        },
    )
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
    if not stored:
        return "I raised the self-programming request in-session, but I could not persist it to the governed memory store right now."
    return "Self-programming request recorded for approval."


@function_tool
async def route_conversation_to_build_lane(
    request_id: str,
    title: str,
    summary: str,
    objective: str,
    business_case: str,
    approval_state: str = "needs-approval",
    execution_surface: str = "Dedicated Pop!_OS programming session",
    reporting_path: str = "Roadmap build lane + morning operating report",
    next_checkpoint: str = "Review with Adam in the next desktop programming session",
    pricing_model: str = "",
    scale_potential: str = "",
    requested_from: str = "voice_runtime",
    requested_by: str = "Freedom",
    autonomy_envelope: str = "Freedom may frame the work, document the business case, and prepare execution, but code, releases, external spend, and connector changes follow governance approval.",
) -> str:
    """
    Route a substantial conversation-born idea into the governed Pop!_OS build lane.

    Use this when a voice conversation turns into real product, agent, business,
    or runtime work that needs a dedicated programming session and a clear
    approval/reporting path.
    """
    normalized_approval = _normalize_build_lane_approval_state(approval_state)
    normalized_requested_from = _normalize_build_lane_requested_from(requested_from)
    host_id, host_name = _host_runtime_identity()
    created_at = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    build_lane = {
        "objective": objective.strip(),
        "businessCase": business_case.strip(),
        "operator": host_name or "Adam Goodwin",
        "approvalState": normalized_approval,
        "autonomyEnvelope": autonomy_envelope.strip(),
        "executionSurface": execution_surface.strip(),
        "reportingPath": reporting_path.strip(),
        "nextCheckpoint": next_checkpoint.strip(),
        "requestedBy": requested_by.strip() or "Freedom",
        "requestedFrom": normalized_requested_from,
        "pricingModel": pricing_model.strip() or None,
        "scalePotential": scale_potential.strip() or None,
        "hostId": host_id,
    }
    stored = _upsert_row(
        "freedom_programming_requests",
        {
            "id": request_id,
            "capability": title.strip(),
            "reason": _serialize_build_lane_reason(summary, build_lane),
            "status": _programming_status_for_build_lane(normalized_approval),
            "created_at": created_at,
            "updated_at": created_at,
        },
    )
    now = int(time.time() * 1000)
    await _publish_event({
        "type": "self_programming_update",
        "payload": {
            "type": "created",
            "request": {
                "id": request_id,
                "capability": title.strip(),
                "reason": summary.strip(),
                "buildLane": {
                    "id": request_id,
                    "title": title.strip(),
                    "summary": summary.strip(),
                    "objective": objective.strip(),
                    "businessCase": business_case.strip(),
                    "operator": host_name or "Adam Goodwin",
                    "approvalState": normalized_approval,
                    "autonomyEnvelope": autonomy_envelope.strip(),
                    "executionSurface": execution_surface.strip(),
                    "reportingPath": reporting_path.strip(),
                    "nextCheckpoint": next_checkpoint.strip(),
                    "requestedBy": requested_by.strip() or "Freedom",
                    "requestedFrom": normalized_requested_from,
                    "pricingModel": pricing_model.strip() or None,
                    "scalePotential": scale_potential.strip() or None,
                    "hostId": host_id,
                    "requestedAt": created_at,
                    "updatedAt": created_at,
                },
                "status": _programming_status_for_build_lane(normalized_approval),
                "createdAt": now,
                "updatedAt": now,
            },
        },
    })
    if not stored:
        return (
            f"I framed '{title.strip()}' as a Pop!_OS build-lane item in-session, "
            "but I could not persist it to the governed memory store right now."
        )
    return (
        f"Routed '{title.strip()}' into the Pop!_OS build lane with status "
        f"{normalized_approval}. It will now stay visible for approval and reporting."
    )


@function_tool
async def request_persona_adjustment(
    overlay_id: str,
    title: str,
    instruction: str,
    rationale: str,
) -> str:
    """
    Request an approval-gated persona adjustment without modifying the core Freedom
    prompt directly.

    Use this for stable style refinements or behavioral overlays that should only
    apply after approval.
    """
    now = int(time.time() * 1000)
    await _publish_event({
        "type": "persona_update",
        "payload": {
            "type": "recorded",
            "overlay": {
                "id": overlay_id,
                "title": title,
                "instruction": instruction,
                "rationale": rationale,
                "source": "freedom",
                "status": "pending",
                "changeType": "new",
                "targetOverlayId": None,
                "createdAt": now,
                "updatedAt": now,
            },
        },
    })
    return "Persona adjustment recorded for approval."


@function_tool
async def request_persona_overlay_revision(
    target_overlay_id: str,
    overlay_id: str,
    title: str,
    instruction: str,
    rationale: str,
) -> str:
    """
    Request a revised persona overlay that supersedes an existing approved overlay
    only after operator approval.
    """
    now = int(time.time() * 1000)
    await _publish_event({
        "type": "persona_update",
        "payload": {
            "type": "recorded",
            "overlay": {
                "id": overlay_id,
                "title": title,
                "instruction": instruction,
                "rationale": rationale,
                "source": "freedom",
                "status": "pending",
                "changeType": "revision",
                "targetOverlayId": target_overlay_id,
                "createdAt": now,
                "updatedAt": now,
            },
        },
    })
    return "Persona overlay revision recorded for approval."


@function_tool
async def request_persona_overlay_retirement(
    request_id: str,
    target_overlay_id: str,
    title: str,
    rationale: str,
) -> str:
    """
    Request retirement of an approved persona overlay when it is obsolete,
    redundant, or counterproductive. The target overlay remains active until
    the operator approves the retirement request.
    """
    now = int(time.time() * 1000)
    await _publish_event({
        "type": "persona_update",
        "payload": {
            "type": "recorded",
            "overlay": {
                "id": request_id,
                "title": title,
                "instruction": "",
                "rationale": rationale,
                "source": "freedom",
                "status": "pending",
                "changeType": "retirement",
                "targetOverlayId": target_overlay_id,
                "createdAt": now,
                "updatedAt": now,
            },
        },
    })
    return "Persona overlay retirement request recorded for approval."


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


# ── Freedom Dispatcher integration ────────────────────────────────────────────

_DISPATCHER_BASE = "http://127.0.0.1:4317"
_pending_scaffold: dict[str, object] = {}


def _dispatcher_request(
    method: str,
    path: str,
    *,
    payload: dict | None = None,
) -> dict | None:
    url = f"{_DISPATCHER_BASE}{path}"
    data = json.dumps(payload).encode() if payload is not None else None
    headers: dict[str, str] = {"Accept": "application/json"}
    if data:
        headers["Content-Type"] = "application/json"
    try:
        req = request.Request(url, data=data, headers=headers, method=method)
        with request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception:
        return None


@function_tool
async def reload_dispatcher_registry() -> str:
    """
    Reload the Freedom Dispatcher registry after manifests have been added or changed.
    """
    result = _dispatcher_request("POST", "/admin/reload")
    if result is None:
        return (
            "The Freedom Dispatcher is not responding. "
            "Start it with: bash ~/code/agents/the-freedom-engine-os/agents/freedom-dispatcher/start.sh"
        )

    tool_count = result.get("tool_count", "unknown")
    errors = result.get("errors")
    if isinstance(errors, list) and errors:
        return f"Reloaded the dispatcher registry with {tool_count} tools, but there were warnings: {', '.join(str(item) for item in errors)}"
    return f"Reloaded the dispatcher registry. Registered tools: {tool_count}."


@function_tool
async def update_dispatcher_tool_autonomy(
    tool_id: str,
    new_level: str,
    reason: str,
    confirmed: bool = False,
) -> str:
    """
    Update a dispatcher's tool autonomy level after explicit operator approval.

    Call first without confirmed=True to restate the change for approval, then
    call again with confirmed=True after the operator says yes.
    """
    normalized_tool_id = tool_id.strip()
    normalized_level = new_level.strip().upper()
    normalized_reason = reason.strip()
    if not normalized_tool_id:
        return "Tell me which dispatcher tool id should change autonomy."
    if normalized_level not in {"A0", "A1", "A2"}:
        return "Autonomy level must be A0, A1, or A2."
    if len(normalized_reason) < 4:
        return "Give a short reason so the autonomy change is auditable."

    if not confirmed:
        return (
            f"I can change dispatcher tool '{normalized_tool_id}' to {normalized_level}. "
            f"Reason: {normalized_reason}. Say yes to confirm."
        )

    result = _dispatcher_request(
        "POST",
        "/admin/autonomy",
        payload={
            "tool_id": normalized_tool_id,
            "new_level": normalized_level,
            "reason": normalized_reason,
        },
    )
    if result is None:
        return (
            "The Freedom Dispatcher is not responding. "
            "Start it with: bash ~/code/agents/the-freedom-engine-os/agents/freedom-dispatcher/start.sh"
        )
    if not result.get("ok"):
        return f"I could not update the tool autonomy for '{normalized_tool_id}'."

    previous_level = result.get("previous_level", "unknown")
    return (
        f"Updated dispatcher tool '{normalized_tool_id}' from {previous_level} to {normalized_level}. "
        f"Reason recorded: {normalized_reason}."
    )


@function_tool
async def scaffold_new_project(
    project_name: str,
    build_type: str,
    governance_type: str = "",
    risk_tier: str = "medium",
    primary_builder: str = "codex session",
    stack: str = "not specified",
    scope_problem: str = "",
    scope_user: str = "",
    scope_mvp: str = "",
    build_lane_id: str = "",
    confirmed: bool = False,
) -> str:
    """
    Scaffold a new governed project folder using the New Build Agent.

    Call after a build-lane record has been drafted for this capability.
    Autonomy A1 (default): call first without confirmed=True to present the
    plan to the operator, then call again with confirmed=True after they say
    yes. Autonomy A2: executes immediately and narrates.
    Never claim success without receiving status 'created' in the response.
    """
    params: dict[str, str] = {"project_name": project_name, "build_type": build_type}
    for k, v in [
        ("governance_type", governance_type),
        ("risk_tier", risk_tier),
        ("primary_builder", primary_builder),
        ("stack", stack),
        ("scope_problem", scope_problem),
        ("scope_user", scope_user),
        ("scope_mvp", scope_mvp),
        ("build_lane_id", build_lane_id),
    ]:
        if v and v not in ("not specified", "medium", "codex session"):
            params[k] = v
    params.setdefault("risk_tier", risk_tier)
    params.setdefault("primary_builder", primary_builder)

    tool_info = _dispatcher_request("GET", "/admin/tools?id=new-build-agent")
    if tool_info is None:
        return (
            "The Freedom Dispatcher is not running. "
            "Start it with: bash ~/code/agents/the-freedom-engine-os/agents/freedom-dispatcher/start.sh"
        )

    tools_list = tool_info.get("tools", [])
    autonomy = tools_list[0].get("autonomy_level", "A1") if tools_list else "A1"

    if autonomy == "A2":
        result = _dispatcher_request("POST", "/invoke", payload={"tool_id": "new-build-agent", "params": params})
        return _scaffold_result_message(project_name, result)

    if not confirmed:
        slug = re.sub(r"-+", "-", re.sub(r"[^a-z0-9-]", "", re.sub(r"[ _/]", "-", project_name.lower()))).strip("-")
        gov = governance_type or {"app": "application", "agent": "agent", "tool": "internal-tool"}.get(build_type, "internal-tool")
        folder_root = "agents" if build_type == "agent" or gov == "agent" else "Applications"
        _pending_scaffold.update({"params": params})
        return (
            f"I'll scaffold '{project_name}' at ~/code/{folder_root}/{slug} "
            f"as a {gov} project (risk: {risk_tier}, builder: {primary_builder}). "
            "Say yes to confirm and I'll create the folder now."
        )

    _pending_scaffold.clear()
    result = _dispatcher_request("POST", "/invoke", payload={"tool_id": "new-build-agent", "params": params})
    return _scaffold_result_message(project_name, result)


def _scaffold_result_message(project_name: str, result: dict | None) -> str:
    if result is None:
        return "Dispatcher call failed. Check that the Freedom Dispatcher is running on port 4317."
    if not result.get("ok"):
        err = result.get("error", {})
        return f"Scaffold failed: {err.get('message', 'unknown error')}"
    output = result.get("result", {})
    status = output.get("status", "unknown")
    path = output.get("project_path", "unknown path")
    count = len(output.get("files_created", []))
    if status == "already-existed":
        return f"Folder {path} already exists — nothing was changed."
    return (
        f"Created {path} with {count} files. "
        "Next steps: fill in AI_BOOTSTRAP.md, confirm risk tier in project-control.yaml, "
        "then run the governance preflight."
    )


@function_tool
async def delegate_approved_programming_task(
    task: str,
    confirmed: bool = False,
) -> str:
    """
    Hand an approved programming task into the desktop shell/Codex lane.

    This is the governed bridge from voice into real repo work. Call first
    without confirmed=True so the operator can approve the programming task,
    then call again with confirmed=True after they say yes.
    """
    normalized_task = task.strip()
    if not normalized_task:
        return "Describe the programming task you want me to hand into the desktop lane."

    if not confirmed:
        return (
            "I can send this into the governed desktop programming lane so Freedom can work on the repo: "
            f"{normalized_task} Say yes to confirm."
        )

    session_response = _loopback_gateway_request("POST", "/api/desktop-shell/session")
    if not session_response or not isinstance(session_response.get("id"), str):
        return "I could not open the desktop programming session on this machine."

    session_id = session_response["id"]
    message_response = _loopback_gateway_request(
        "POST",
        f"/api/desktop-shell/sessions/{parse.quote(session_id, safe='')}/messages",
        body={
            "text": normalized_task,
            "inputMode": "text",
            "responseStyle": "executive",
        },
    )
    if not message_response or not isinstance(message_response.get("id"), str):
        return "I opened the desktop programming session, but I could not queue the programming turn."

    return (
        f"Queued the approved programming task into the desktop lane under session {session_id}. "
        "Freedom can now work on it through the governed repo execution path."
    )
