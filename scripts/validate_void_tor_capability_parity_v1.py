#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
import re
import sys
from typing import Any

MARKER = "VOID_TOR_CAPABILITY_PARITY_V1_SCHEMA_GREEN"
ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = ROOT / "config" / "void-tor-capability-parity-v1.json"
SCHEMA_PATH = ROOT / "schemas" / "void-tor-capability-parity-v1.schema.json"


class ValidationError(Exception):
    pass


def fail(path: str, message: str) -> None:
    raise ValidationError(f"{path}: {message}")


def type_matches(value: Any, expected: str) -> bool:
    if expected == "object":
        return isinstance(value, dict)
    if expected == "array":
        return isinstance(value, list)
    if expected == "string":
        return isinstance(value, str)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "null":
        return value is None
    return False


def validate(value: Any, schema: dict[str, Any], path: str = "$") -> None:
    if "oneOf" in schema:
        matches = 0
        errors: list[str] = []
        for index, candidate in enumerate(schema["oneOf"]):
            try:
                validate(value, candidate, path)
                matches += 1
            except ValidationError as error:
                errors.append(f"oneOf[{index}] {error}")
        if matches != 1:
            fail(path, f"oneOf matched {matches} branches; expected exactly 1; {'; '.join(errors)}")
        return

    if "const" in schema and value != schema["const"]:
        fail(path, f"expected const {schema['const']!r}, got {value!r}")

    if "enum" in schema and value not in schema["enum"]:
        fail(path, f"value {value!r} is not in enum {schema['enum']!r}")

    expected_type = schema.get("type")
    if expected_type is not None and not type_matches(value, expected_type):
        fail(path, f"expected type {expected_type}, got {type(value).__name__}")

    if isinstance(value, dict):
        required = schema.get("required", [])
        for key in required:
            if key not in value:
                fail(path, f"missing required property {key!r}")

        minimum_properties = schema.get("minProperties")
        if minimum_properties is not None and len(value) < minimum_properties:
            fail(path, f"has {len(value)} properties; minimum is {minimum_properties}")

        properties = schema.get("properties", {})
        additional = schema.get("additionalProperties", True)
        for key, item in value.items():
            child_path = f"{path}.{key}"
            if key in properties:
                validate(item, properties[key], child_path)
            elif additional is False:
                fail(child_path, "additional property is forbidden")
            elif isinstance(additional, dict):
                validate(item, additional, child_path)

    if isinstance(value, list):
        minimum_items = schema.get("minItems")
        if minimum_items is not None and len(value) < minimum_items:
            fail(path, f"has {len(value)} items; minimum is {minimum_items}")
        item_schema = schema.get("items")
        if isinstance(item_schema, dict):
            for index, item in enumerate(value):
                validate(item, item_schema, f"{path}[{index}]")

    if isinstance(value, str):
        minimum_length = schema.get("minLength")
        if minimum_length is not None and len(value) < minimum_length:
            fail(path, f"length is {len(value)}; minimum is {minimum_length}")
        pattern = schema.get("pattern")
        if pattern is not None:
            try:
                matched = re.search(pattern, value) is not None
            except re.error as error:
                fail(path, f"schema pattern is invalid: {error}")
            if not matched:
                fail(path, f"value {value!r} does not match pattern {pattern!r}")

    if isinstance(value, int) and not isinstance(value, bool):
        minimum = schema.get("minimum")
        if minimum is not None and value < minimum:
            fail(path, f"value {value} is below minimum {minimum}")


def main() -> int:
    try:
        contract = json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))
        schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        validate(contract, schema)
        print(MARKER)
        print(f"contract={CONTRACT_PATH.relative_to(ROOT)}")
        print(f"schema={SCHEMA_PATH.relative_to(ROOT)}")
        print(f"capability_count={len(contract['capabilities'])}")
        return 0
    except (OSError, json.JSONDecodeError, ValidationError, KeyError) as error:
        print("VOID_TOR_CAPABILITY_PARITY_V1_SCHEMA_FAIL", file=sys.stderr)
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
