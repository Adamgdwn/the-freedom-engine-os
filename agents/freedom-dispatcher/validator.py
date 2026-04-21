"""
Parameter validation against freedom.tool.yaml parameter schemas (strict JSON Schema subset).
"""
from __future__ import annotations

import re
from typing import Any

_DISPATCHER_INJECTED = {"audit_correlation_id", "confirmed"}


class ValidationError:
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message

    def to_dict(self) -> dict:
        return {"field": self.field, "message": self.message}


def validate_params(
    params: dict[str, Any],
    schema: dict[str, Any],
) -> list[ValidationError]:
    errors: list[ValidationError] = []
    properties: dict[str, Any] = schema.get("properties", {})
    required: list[str] = schema.get("required", [])

    for field in required:
        val = params.get(field)
        if val is None or (isinstance(val, str) and val == ""):
            errors.append(ValidationError(field, f"{field!r} is required"))

    allowed = set(properties.keys()) | _DISPATCHER_INJECTED
    for key in params:
        if key not in allowed:
            errors.append(ValidationError(key, f"Unknown parameter {key!r}"))

    if errors:
        return errors

    for field, value in params.items():
        if field in _DISPATCHER_INJECTED or field not in properties:
            continue
        errors.extend(_validate_value(field, value, properties[field]))

    return errors


def _validate_value(field: str, value: Any, schema: dict[str, Any]) -> list[ValidationError]:
    errors: list[ValidationError] = []
    if value is None:
        return errors

    expected_type = schema.get("type")
    type_map: dict[str, Any] = {
        "string": str,
        "integer": int,
        "number": (int, float),
        "boolean": bool,
        "array": list,
        "object": dict,
    }

    if expected_type and expected_type in type_map:
        expected = type_map[expected_type]
        if expected_type == "integer" and isinstance(value, bool):
            errors.append(ValidationError(field, "Expected integer, got boolean"))
            return errors
        if expected_type in ("integer", "number") and isinstance(value, bool):
            errors.append(ValidationError(field, f"Expected {expected_type}, got boolean"))
            return errors
        if not isinstance(value, expected):
            errors.append(ValidationError(field, f"Expected {expected_type}, got {type(value).__name__}"))
            return errors

    if "enum" in schema and value not in schema["enum"]:
        allowed_vals = ", ".join(repr(v) for v in schema["enum"])
        errors.append(ValidationError(field, f"Must be one of: {allowed_vals}"))

    if "pattern" in schema and isinstance(value, str):
        if not re.fullmatch(schema["pattern"], value):
            errors.append(ValidationError(field, "Does not match required pattern"))

    if isinstance(value, str):
        if "minLength" in schema and len(value) < schema["minLength"]:
            errors.append(ValidationError(field, f"Must be at least {schema['minLength']} characters"))
        if "maxLength" in schema and len(value) > schema["maxLength"]:
            errors.append(ValidationError(field, f"Must be at most {schema['maxLength']} characters"))

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            errors.append(ValidationError(field, f"Must be >= {schema['minimum']}"))
        if "maximum" in schema and value > schema["maximum"]:
            errors.append(ValidationError(field, f"Must be <= {schema['maximum']}"))

    if isinstance(value, list):
        if "minLength" in schema and len(value) < schema["minLength"]:
            errors.append(ValidationError(field, f"Array must have at least {schema['minLength']} items"))
        if "items" in schema:
            for i, item in enumerate(value):
                errors.extend(_validate_value(f"{field}[{i}]", item, schema["items"]))

    return errors
