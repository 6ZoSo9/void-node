#!/usr/bin/env python3
"""Close one accepted authenticated paid-work submission through provider quote.

This operator-side contract starts from a full accepted intake receipt and the
exact prepared submission request that produced it. It performs no live
submission. It composes the merged review-queue, operator-review,
provider-selection, work-order, quote, and signed-node-binding contracts.

Authorized writes are limited to private append-once state for:
- review queue handoff;
- explicit operator approval;
- provider authentication evidence;
- provider registry snapshot;
- deterministic provider selection;
- one private provider quote and closeout receipt.

It never authorizes or performs requester acceptance, payment, work execution,
dispatch, Work Credit writes, VOID settlement, wallet/signer access, signing,
transaction broadcast, service restart, deployment, or Git mutation.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Iterable

MARKER = (
    "VOID_AUTHENTICATED_PAID_WORK_POST_ADMISSION_PROVIDER_QUOTE_CLOSEOUT_V1"
)
RESULT_MARKER = (
    "VOID_AUTHENTICATED_PAID_WORK_POST_ADMISSION_PROVIDER_QUOTE_RESULT_V1"
)
CONFIRMATION = (
    "closeVoidAuthenticatedPaidWorkPostAdmissionProviderQuoteV1"
)

RECEIPT_MARKER = "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_RECEIPT_V1"
ADMISSION_MARKER = "VOID_AGENT_PAID_WORK_SUBMISSION_ADMISSION_V1"
REQUEST_MARKER = "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1"
WORK_ORDER_MARKER = "VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1"
QUEUE_RESULT_MARKER = (
    "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_REVIEW_QUEUE_HANDOFF_V1"
)
REVIEW_RESULT_MARKER = (
    "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_OPERATOR_REVIEW_RESULT_V1"
)
REVIEW_DECISION_MARKER = (
    "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_OPERATOR_REVIEW_DECISION_V1"
)
AUTH_PACKET_MARKER = (
    "VOID_AUTHENTICATED_PAID_WORK_PROVIDER_AUTHENTICATION_PACKET_V1"
)
AUTH_REVIEW_INDEX_MARKER = (
    "VOID_AUTHENTICATED_PAID_WORK_PROVIDER_AUTHENTICATION_REVIEW_INDEX_V1"
)
REGISTRY_MARKER = (
    "VOID_AUTHENTICATED_PAID_WORK_PROVIDER_REGISTRY_SNAPSHOT_V1"
)
SELECTION_RESULT_MARKER = (
    "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_PROVIDER_SELECTION_RESULT_V1"
)
SELECTION_MARKER = (
    "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_PROVIDER_SELECTION_V1"
)
QUOTE_MARKER = "VOID_AGENT_PAID_WORK_QUOTE_ENVELOPE_V1"
QUOTE_INDEX_MARKER = (
    "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_PROVIDER_QUOTE_INDEX_V1"
)
QUOTE_RESPONSE_MARKER = (
    "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_PROVIDER_QUOTE_RESULT_V1"
)

QUOTE_TOTAL = "0.01"
QUOTE_ASSET = "USD"
PAYMENT_RAIL_ID = "void.external.prepaid.v1"
LOGICAL_PROVIDER_ID = "void.provider.datanet.verify.precision"
MAX_REQUEST_TOTAL_MICROUSD = 10_000_000
AVAILABLE_CAPACITY = 1
PRIORITY = 10
MIN_REMAINING_SECONDS = 600
APPROVAL_REASON_CODES = ("operator_approved",)
STATE_ROOT = (Path.home() / ".local/state").resolve()

SOURCE_SHA256 = {
    "scripts/authenticated_paid_work_submission_review_queue_handoff_v1.ts": (
        "271cdaa4034993d6fcdcf00ecb001333db7880980d0152a22901c0d327746687"
    ),
    "scripts/authenticated_paid_work_submission_operator_review_decision_v1.ts": (
        "3b4cf123691dc5bcb8c98a473a0b3506574dc8184d66e67bd66a301627091074"
    ),
    "scripts/authenticated_paid_work_submission_provider_selection_v1.ts": (
        "fb95a5e919a197ade4940839f7d1b01d787da5cec21a58732c99f9ced8c9e681"
    ),
    "scripts/agent_paid_work_order_envelope_v1.ts": (
        "c803796b968678c9b8b0a35291dede8f96647922b494cf123c3660715f7e3575"
    ),
    "scripts/agent_paid_work_quote_envelope_v1.ts": (
        "40311db0e173f19f42193a9b2e6fa4ac0e90d14fa38ef694e53a72a71b30ed23"
    ),
    "tools/void-node-onion-binding-v1.mjs": (
        "5fe4a63294dfbe947c2b8bcebf7fbf578d361eae3d9f7e22aeef1259f7387f26"
    ),
}

SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$")
ADMISSION_ID_RE = re.compile(r"^voidawsa1_[0-9a-f]{64}$")
CREDENTIAL_REGISTRY_ID_RE = re.compile(r"^voidapwcr1_[0-9a-f]{64}$")
CREDENTIAL_ID_RE = re.compile(r"^voidapwc1_[0-9a-f]{64}$")
WORK_ORDER_ID_RE = re.compile(r"^voidawo1_[0-9a-f]{64}$")
RECEIPT_ID_RE = re.compile(r"^voidawsi1_[0-9a-f]{64}$")
QUEUE_ID_RE = re.compile(r"^voidapwsrq1_[0-9a-f]{64}$")
REVIEW_ID_RE = re.compile(r"^voidapwod1_[0-9a-f]{64}$")
AUTH_ID_RE = re.compile(r"^voidapwpa1_[0-9a-f]{64}$")
PROVIDER_ID_RE = re.compile(r"^voidapwp1_[0-9a-f]{64}$")
REGISTRY_ID_RE = re.compile(r"^voidapwprs1_[0-9a-f]{64}$")
SELECTION_ID_RE = re.compile(r"^voidapwps1_[0-9a-f]{64}$")
QUOTE_ID_RE = re.compile(r"^voidawq1_[0-9a-f]{64}$")


class Hold(RuntimeError):
    """Fail-closed operator boundary."""


def hold(message: str) -> None:
    raise Hold(message)


def canonicalize(value: Any) -> Any:
    if isinstance(value, list):
        return [canonicalize(item) for item in value]
    if isinstance(value, dict):
        return {
            key: canonicalize(value[key])
            for key in sorted(value)
        }
    return value


def canonical_json(value: Any) -> str:
    return json.dumps(
        canonicalize(value),
        ensure_ascii=False,
        separators=(",", ":"),
    )


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def digest_identity(prefix: str, value: Any) -> str:
    return f"{prefix}_{sha256_bytes(canonical_json(value).encode('utf-8'))}"


def require_record(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        hold(f"{label} must be an object")
    return value


def require_text(
    value: Any,
    label: str,
    pattern: re.Pattern[str] | None = None,
) -> str:
    if not isinstance(value, str) or not value:
        hold(f"{label} must be a non-empty string")
    if pattern is not None and pattern.fullmatch(value) is None:
        hold(f"{label} format mismatch")
    return value


def require_integer(value: Any, label: str, minimum: int) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or value < minimum:
        hold(f"{label} must be an integer >= {minimum}")
    return value


def parse_utc(value: Any, label: str) -> dt.datetime:
    text = require_text(value, label)
    candidate = text[:-1] + "+00:00" if text.endswith("Z") else text
    try:
        parsed = dt.datetime.fromisoformat(candidate)
    except ValueError:
        hold(f"{label} is not a valid timestamp")
    if parsed.tzinfo is None:
        hold(f"{label} must include UTC timezone")
    return parsed.astimezone(dt.timezone.utc)


def iso_seconds(value: dt.datetime) -> str:
    return (
        value.astimezone(dt.timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def utc_now() -> str:
    return iso_seconds(dt.datetime.now(dt.timezone.utc))


def exact_false_authority(
    value: Any,
    label: str,
    *,
    allowed_true: Iterable[str] = (),
) -> None:
    authority = require_record(value, label)
    allowed = set(allowed_true)
    if not authority:
        hold(f"{label} must not be empty")
    for key, candidate in authority.items():
        if key in allowed:
            if candidate is not True:
                hold(f"{label}.{key} must be true")
        elif candidate is not False:
            hold(f"{label}.{key} must be false")


def read_json(path: Path, label: str) -> Any:
    require_regular(path, label)
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        hold(f"failed to read {label}: {error}")


def require_regular(
    path: Path,
    label: str,
    *,
    allowed_modes: tuple[int, ...] = (0o600, 0o640, 0o644, 0o700, 0o750, 0o755),
) -> None:
    if not path.exists() or path.is_symlink() or not path.is_file():
        hold(f"{label} must be a regular non-symlink file: {path}")
    mode = stat.S_IMODE(path.stat().st_mode)
    if mode not in allowed_modes:
        hold(
            f"{label} mode mismatch: observed={mode:04o} "
            f"allowed={[f'{item:04o}' for item in allowed_modes]}"
        )


def private_directory(path: Path) -> Path:
    expanded = path.expanduser()
    if expanded.is_symlink():
        hold(f"private path must not be a symlink: {expanded}")
    resolved = expanded.resolve()
    try:
        relative = resolved.relative_to(STATE_ROOT)
    except ValueError:
        hold(
            "private state path must remain below ~/.local/state: "
            f"{resolved}"
        )
    if not relative.parts:
        hold("private state path must be narrower than ~/.local/state")
    resolved.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(resolved, 0o700)
    metadata = resolved.lstat()
    if not stat.S_ISDIR(metadata.st_mode) or resolved.is_symlink():
        hold(f"private path is not a non-symlink directory: {resolved}")
    if stat.S_IMODE(metadata.st_mode) & 0o077:
        hold(f"private path is not owner-private: {resolved}")
    return resolved


def ensure_within(root: Path, candidate: Path, label: str) -> Path:
    resolved_root = root.expanduser().resolve()
    resolved_candidate = candidate.expanduser().resolve()
    try:
        resolved_candidate.relative_to(resolved_root)
    except ValueError:
        hold(
            f"{label} escapes its private root: "
            f"root={resolved_root} candidate={resolved_candidate}"
        )
    return resolved_candidate


def write_exclusive_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(path.parent, 0o700)
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump(value, handle, indent=2, sort_keys=True, ensure_ascii=False)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
    except Exception:
        try:
            path.unlink(missing_ok=True)
        finally:
            raise


def write_or_verify_json(path: Path, expected: Any, label: str) -> bool:
    if path.exists():
        existing = read_json(path, label)
        if canonical_json(existing) != canonical_json(expected):
            hold(f"conflicting {label} exists: {path}")
        return True
    write_exclusive_json(path, expected)
    return False


def run(
    args: list[str],
    *,
    cwd: Path,
    timeout: int = 600,
    check: bool = True,
) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        args,
        cwd=str(cwd),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
        timeout=timeout,
    )
    if check and result.returncode != 0:
        hold(
            f"command failed ({result.returncode}): "
            f"{' '.join(args)}\n{result.stdout}"
        )
    return result


def git(repo: Path, args: list[str]) -> str:
    return run(["git", "-C", str(repo), *args], cwd=repo).stdout.strip()


def verify_repository(repo: Path) -> tuple[str, Path]:
    resolved = repo.expanduser().resolve()
    if not (resolved / ".git").exists():
        hold(f"repository is not a Git worktree: {resolved}")
    status = git(resolved, ["status", "--porcelain=v1", "--untracked-files=all"])
    if status:
        hold("repository must be clean for a live closeout")
    head = git(resolved, ["rev-parse", "HEAD"])

    for relative, expected_sha in SOURCE_SHA256.items():
        path = resolved / relative
        require_regular(path, f"canonical source {relative}")
        observed = sha256_file(path)
        if observed != expected_sha:
            hold(
                f"canonical source SHA mismatch: {relative} "
                f"observed={observed} expected={expected_sha}"
            )

    tsx = resolved / "node_modules/tsx/dist/cli.mjs"
    require_regular(tsx, "canonical TSX CLI")
    return head, tsx


def unwrap_receipt(value: Any) -> dict[str, Any]:
    root = require_record(value, "receipt input")
    if root.get("marker") == RECEIPT_MARKER:
        return root
    nested = root.get("receipt")
    if isinstance(nested, dict) and nested.get("marker") == RECEIPT_MARKER:
        return nested
    hold("receipt input does not contain a full accepted intake receipt")


def validate_receipt_and_request(
    receipt_value: Any,
    request_value: Any,
    request_bytes: bytes,
    *,
    min_remaining_seconds: int,
    now: dt.datetime | None = None,
) -> tuple[dict[str, Any], dict[str, Any], int]:
    receipt = unwrap_receipt(receipt_value)
    request = require_record(request_value, "prepared request")

    if receipt.get("version") != 1:
        hold("intake receipt version mismatch")
    receipt_id = require_text(receipt.get("receipt_id"), "receipt_id", RECEIPT_ID_RE)
    submission_id = require_text(receipt.get("submission_id"), "submission_id", ID_RE)
    work_order_id = require_text(
        receipt.get("work_order_id"), "receipt.work_order_id", WORK_ORDER_ID_RE
    )
    request_payload_sha = require_text(
        receipt.get("request_payload_sha256"),
        "receipt.request_payload_sha256",
        SHA256_RE,
    )
    canonical_request_sha = require_text(
        receipt.get("canonical_request_sha256"),
        "receipt.canonical_request_sha256",
        SHA256_RE,
    )
    admission_id = require_text(
        receipt.get("admission_id"),
        "receipt.admission_id",
        ADMISSION_ID_RE,
    )
    parse_utc(receipt.get("received_at_utc"), "receipt.received_at_utc")
    authentication = require_record(
        receipt.get("authentication"),
        "receipt.authentication",
    )
    if authentication.get("mode") != "credential_registry":
        hold("receipt authentication mode mismatch")
    require_text(
        authentication.get("registry_id"),
        "receipt.authentication.registry_id",
        CREDENTIAL_REGISTRY_ID_RE,
    )
    require_text(
        authentication.get("credential_id"),
        "receipt.authentication.credential_id",
        CREDENTIAL_ID_RE,
    )
    require_text(
        authentication.get("agent_id"),
        "receipt.authentication.agent_id",
        ID_RE,
    )
    if authentication.get("scope") != "agent_paid_work_submit":
        hold("receipt authentication scope mismatch")
    if receipt.get("authorization_verified") is not True:
        hold("receipt authorization was not verified")
    if receipt.get("loopback_source") is not True:
        hold("receipt is not loopback-sourced")
    if receipt.get("duplicate") is not False:
        hold("closeout requires the original accepted-new receipt")
    exact_false_authority(receipt.get("authority"), "receipt authority")

    admission = require_record(receipt.get("admission"), "receipt.admission")
    if admission.get("marker") != ADMISSION_MARKER:
        hold("receipt admission marker mismatch")
    if admission.get("version") != 1:
        hold("receipt admission version mismatch")
    if admission.get("admission_id") != admission_id:
        hold("receipt admission ID mismatch")
    if admission.get("work_order_id") != work_order_id:
        hold("receipt admission work-order mismatch")
    require_text(admission.get("policy_id"), "admission.policy_id", ID_RE)
    parse_utc(admission.get("evaluated_at_utc"), "admission.evaluated_at_utc")
    if admission.get("decision") != "accepted_for_review":
        hold("receipt admission is not accepted_for_review")
    if admission.get("reason_codes") != []:
        hold("accepted receipt must contain zero admission reason codes")
    exact_false_authority(admission.get("authority"), "admission authority")
    normalized = require_record(admission.get("normalized"), "admission.normalized")

    if request.get("marker") != REQUEST_MARKER or request.get("version") != 1:
        hold("prepared request marker/version mismatch")
    if request.get("submission_id") != submission_id:
        hold("prepared request submission ID mismatch")
    work_order = require_record(request.get("work_order"), "prepared request work_order")
    if work_order.get("marker") != WORK_ORDER_MARKER or work_order.get("version") != 1:
        hold("work-order marker/version mismatch")
    if work_order.get("work_order_id") != work_order_id:
        hold("prepared request work-order ID mismatch")
    require_text(work_order_id, "work_order_id", WORK_ORDER_ID_RE)

    observed_payload_sha = sha256_bytes(request_bytes)
    observed_canonical_sha = sha256_bytes(
        canonical_json(request).encode("utf-8")
    )
    if observed_payload_sha != request_payload_sha:
        hold(
            "prepared request raw SHA does not match intake receipt: "
            f"observed={observed_payload_sha} receipt={request_payload_sha}"
        )
    if observed_canonical_sha != canonical_request_sha:
        hold(
            "prepared request canonical SHA does not match intake receipt: "
            f"observed={observed_canonical_sha} receipt={canonical_request_sha}"
        )

    service = require_record(work_order.get("service"), "work_order.service")
    commercial = require_record(
        work_order.get("commercial"), "work_order.commercial"
    )
    limits = require_record(
        work_order.get("execution_limits"), "work_order.execution_limits"
    )
    capability_id = require_text(
        service.get("capability_id"), "work_order.service.capability_id", ID_RE
    )
    quote_asset = require_text(
        commercial.get("quote_asset"), "work_order.commercial.quote_asset", ID_RE
    )
    max_total = require_text(
        commercial.get("max_total"), "work_order.commercial.max_total"
    )
    if quote_asset != QUOTE_ASSET:
        hold(f"closeout supports only {QUOTE_ASSET} quote assets")
    try:
        if Decimal(max_total) < Decimal(QUOTE_TOTAL):
            hold("work-order max_total is below the fixed quote total")
    except InvalidOperation:
        hold("work-order max_total is not a decimal")
    if commercial.get("payment_required_before_execution") is not True:
        hold("work order must require payment before execution")

    if normalized.get("capability_id") != capability_id:
        hold("admission/work-order capability mismatch")
    if normalized.get("quote_asset") != quote_asset:
        hold("admission/work-order quote asset mismatch")
    if normalized.get("max_total") != max_total:
        hold("admission/work-order max total mismatch")

    for key in (
        "external_side_effects_allowed",
        "wallet_access_allowed",
        "money_movement_allowed",
    ):
        if limits.get(key) is not False:
            hold(f"unsafe work-order execution limit: {key}")

    expected_outputs = service.get("expected_outputs")
    if (
        not isinstance(expected_outputs, list)
        or not expected_outputs
        or not all(isinstance(item, str) and item for item in expected_outputs)
    ):
        hold("work order expected_outputs must be a non-empty string list")

    max_runtime_seconds = require_integer(
        limits.get("max_runtime_seconds"),
        "work_order.execution_limits.max_runtime_seconds",
        1,
    )
    max_output_bytes = require_integer(
        limits.get("max_output_bytes"),
        "work_order.execution_limits.max_output_bytes",
        1,
    )
    if normalized.get("max_runtime_seconds") != max_runtime_seconds:
        hold("admission/work-order max runtime mismatch")
    if normalized.get("max_output_bytes") != max_output_bytes:
        hold("admission/work-order max output mismatch")
    input_refs = service.get("input_refs")
    if (
        not isinstance(input_refs, list)
        or not input_refs
        or not all(isinstance(item, str) and item for item in input_refs)
    ):
        hold("work order input_refs must be a non-empty string list")
    input_ref_count = require_integer(
        normalized.get("input_ref_count"),
        "admission.normalized.input_ref_count",
        0,
    )
    if input_ref_count != len(input_refs):
        hold("admission/work-order input reference count mismatch")
    expected_output_count = require_integer(
        normalized.get("expected_output_count"),
        "admission.normalized.expected_output_count",
        1,
    )
    if expected_output_count != len(expected_outputs):
        hold("admission/work-order expected output count mismatch")
    requester = require_record(work_order.get("requester"), "work_order.requester")
    callback_uri = require_text(
        requester.get("callback_uri"),
        "work_order.requester.callback_uri",
    )
    callback = urllib.parse.urlparse(callback_uri)
    callback_scheme = require_text(
        normalized.get("callback_scheme"),
        "admission.normalized.callback_scheme",
    )
    callback_host = require_text(
        normalized.get("callback_host"),
        "admission.normalized.callback_host",
    )
    if callback_scheme != callback.scheme or callback_host != callback.hostname:
        hold("admission/work-order callback binding mismatch")
    created = parse_utc(work_order.get("created_at_utc"), "work_order.created_at_utc")
    ttl_seconds = require_integer(
        normalized.get("ttl_seconds"),
        "admission.normalized.ttl_seconds",
        1,
    )
    expires = parse_utc(work_order.get("expires_at_utc"), "work_order.expires_at_utc")
    expected_ttl_seconds = int((expires - created).total_seconds())
    if ttl_seconds != expected_ttl_seconds:
        hold("admission/work-order TTL mismatch")
    current = now or dt.datetime.now(dt.timezone.utc)
    remaining = int((expires - current).total_seconds())
    if remaining < min_remaining_seconds:
        hold(
            "work order does not retain the required provider-quote window: "
            f"remaining_seconds={remaining} required={min_remaining_seconds}"
        )

    # Explicitly touch IDs so malformed but unused values cannot pass silently.
    _ = receipt_id
    return receipt, work_order, remaining


def assert_remaining(
    work_order: dict[str, Any],
    minimum: int,
    stage: str,
) -> int:
    expires = parse_utc(work_order.get("expires_at_utc"), "work_order.expires_at_utc")
    remaining = int(
        (expires - dt.datetime.now(dt.timezone.utc)).total_seconds()
    )
    if remaining < minimum:
        hold(
            f"work order freshness exhausted at {stage}: "
            f"remaining_seconds={remaining} required={minimum}"
        )
    return remaining


def parse_binding_fields(binding: dict[str, Any]) -> tuple[str, str, str, str]:
    node_id = binding.get("node_id", binding.get("nodeId"))
    node_id = require_text(node_id, "binding.node_id")
    if (
        len(node_id) > 512
        or node_id.strip() != node_id
        or any(
            ord(character) < 0x21 or ord(character) > 0x7E
            for character in node_id
        )
    ):
        hold("binding node ID is not canonical printable ASCII")
    onion_uri = binding.get("onion_uri", binding.get("onionUri"))
    onion_uri = require_text(onion_uri, "binding.onion_uri")
    parsed = urllib.parse.urlparse(onion_uri)
    if (
        parsed.scheme != "http"
        or not parsed.hostname
        or not parsed.hostname.endswith(".onion")
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
    ):
        hold("binding onion URI is invalid")
    expires_at = binding.get("expires_at", binding.get("expiresAt"))
    expires_at = require_text(expires_at, "binding.expires_at")
    if parse_utc(expires_at, "binding.expires_at") <= dt.datetime.now(
        dt.timezone.utc
    ):
        hold("signed node binding is expired")
    return node_id, onion_uri, parsed.hostname, expires_at


def parse_binding_verifier_output(stdout: str) -> tuple[str, str, str, str]:
    values: dict[str, set[str]] = {
        "node_id": set(),
        "onion_uri": set(),
        "expires_at": set(),
    }
    green_marker_count = 0
    read_only_count = 0
    for raw_line in stdout.splitlines():
        line = raw_line.strip()
        if line == "VOID_NODE_ONION_BINDING_V1_VERIFY_GREEN":
            green_marker_count += 1
            continue
        if line == "read_only=true":
            read_only_count += 1
            continue
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key in values and value:
            values[key].add(value)
    if green_marker_count != 1:
        hold(
            "signed-node-binding verifier green-marker count mismatch: "
            f"{green_marker_count}"
        )
    if read_only_count != 1:
        hold(
            "signed-node-binding verifier read-only marker count mismatch: "
            f"{read_only_count}"
        )
    resolved: dict[str, str] = {}
    for key, candidates in values.items():
        if len(candidates) != 1:
            hold(
                f"signed-node-binding verifier did not resolve one unique {key}: "
                f"{sorted(candidates)}"
            )
        resolved[key] = next(iter(candidates))
    node_id, onion_uri, onion_hostname, expires_at = parse_binding_fields(
        resolved
    )
    return node_id, onion_uri, onion_hostname, expires_at


def verify_health_node_id(health_url: str, expected_node_id: str) -> None:
    parsed = urllib.parse.urlparse(health_url)
    if (
        parsed.scheme != "http"
        or parsed.hostname not in {"127.0.0.1", "localhost", "::1"}
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
    ):
        hold("health URL must be an uncredentialed loopback HTTP URL")
    request = urllib.request.Request(
        health_url,
        headers={"accept": "application/json"},
        method="GET",
    )
    try:
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        with opener.open(request, timeout=10) as response:
            if response.status != 200:
                hold(f"health endpoint returned HTTP {response.status}")
            body = response.read(1_048_577)
            if len(body) > 1_048_576:
                hold("health response exceeds one MiB")
            value = json.loads(body.decode("utf-8"))
    except Exception as error:
        hold(f"failed to read loopback health endpoint: {error}")
    payload = require_record(value, "health response")
    if payload.get("nodeId") != expected_node_id:
        hold(
            "health node ID mismatch: "
            f"observed={payload.get('nodeId')!r} expected={expected_node_id}"
        )


def verify_signed_binding(
    *,
    repo: Path,
    binding_path: Path,
    health_url: str,
) -> dict[str, Any]:
    credential_root = (Path.home() / ".config/void/credentials").resolve()
    resolved = binding_path.expanduser().resolve()
    try:
        resolved.relative_to(credential_root)
    except ValueError:
        pass
    else:
        hold("signed binding path must not be inside the credential root")
    require_regular(resolved, "signed node binding")

    verifier = repo / "tools/void-node-onion-binding-v1.mjs"
    require_regular(verifier, "signed-node-binding verifier")
    expected_verifier_sha = SOURCE_SHA256[
        "tools/void-node-onion-binding-v1.mjs"
    ]
    observed_verifier_sha = sha256_file(verifier)
    if observed_verifier_sha != expected_verifier_sha:
        hold(
            "signed-node-binding verifier SHA mismatch: "
            f"observed={observed_verifier_sha} "
            f"expected={expected_verifier_sha}"
        )

    discovery = run(
        [
            "node",
            str(verifier),
            "verify",
            "--input",
            str(resolved),
            "--virtual-port",
            "80",
        ],
        cwd=repo,
    )
    node_id, onion_uri, onion_hostname, expires_at = (
        parse_binding_verifier_output(discovery.stdout)
    )

    expected = run(
        [
            "node",
            str(verifier),
            "verify",
            "--input",
            str(resolved),
            "--expected-node-id",
            node_id,
            "--expected-onion-hostname",
            onion_hostname,
            "--virtual-port",
            "80",
        ],
        cwd=repo,
    )
    expected_summary = parse_binding_verifier_output(expected.stdout)
    if expected_summary != (
        node_id,
        onion_uri,
        onion_hostname,
        expires_at,
    ):
        hold(
            "expected-value signed-node-binding verification changed "
            "the authenticated summary"
        )

    verify_health_node_id(health_url, node_id)
    print("signed_binding_schema=nested_envelope")
    print("signed_binding_field_source=canonical_node_verifier")
    print("signed_binding_discovery_verification=true")
    print("signed_binding_expected_value_reverification=true")
    print("signed_binding_loopback_health_match=true")
    return {
        "path": str(resolved),
        "sha256": sha256_file(resolved),
        "node_id": node_id,
        "onion_uri": onion_uri,
        "onion_hostname": onion_hostname,
        "expires_at": expires_at,
        "signature_verified": True,
    }


def run_ts(
    *,
    repo: Path,
    tsx: Path,
    relative_source: str,
    args: list[str],
    required_marker: str,
) -> str:
    result = run(
        ["node", str(tsx), str(repo / relative_source), *args],
        cwd=repo,
    )
    if required_marker not in result.stdout:
        hold(
            f"{relative_source} omitted required marker: {required_marker}"
        )
    return result.stdout


def semantic_response_equal(
    existing: dict[str, Any],
    candidate: dict[str, Any],
    ignored_fields: Iterable[str],
) -> bool:
    adjusted = dict(candidate)
    for field in ignored_fields:
        adjusted[field] = existing.get(field)
    return canonical_json(existing) == canonical_json(adjusted)


def invoke_and_persist_response(
    *,
    response_path: Path,
    command: list[str],
    cwd: Path,
    marker: str,
    required_stdout_marker: str,
    ignored_fields: Iterable[str] = (),
) -> tuple[dict[str, Any], bool]:
    response_parent = private_directory(response_path.parent)
    with tempfile.TemporaryDirectory(
        prefix=f".{response_path.stem}.invoke-",
        dir=str(response_parent),
    ) as directory:
        candidate_path = Path(directory) / "response.json"
        result = run([*command, str(candidate_path)], cwd=cwd)
        if required_stdout_marker not in result.stdout:
            hold(f"command omitted terminal marker: {required_stdout_marker}")
        candidate = require_record(
            read_json(candidate_path, f"created {marker} response"),
            f"created {marker} response",
        )

    if (
        candidate.get("marker") != marker
        or candidate.get("version") != 1
        or candidate.get("ok") is not True
    ):
        hold(f"created response marker/version/status mismatch: {response_path}")

    if response_path.exists():
        existing = require_record(
            read_json(response_path, f"existing {marker} response"),
            f"existing {marker} response",
        )
        if (
            existing.get("marker") != marker
            or existing.get("version") != 1
            or existing.get("ok") is not True
        ):
            hold(f"existing response marker/version/status mismatch: {response_path}")
        if not semantic_response_equal(existing, candidate, ignored_fields):
            hold(f"conflicting {marker} response exists: {response_path}")
        return existing, True

    write_exclusive_json(response_path, candidate)
    return candidate, True


def verify_canonical_work_order(
    *,
    repo: Path,
    tsx: Path,
    work_order: dict[str, Any],
) -> None:
    with tempfile.TemporaryDirectory(
        prefix="void-post-admission-work-order-verify-"
    ) as directory:
        work_path = Path(directory) / "work-order.json"
        write_exclusive_json(work_path, work_order)
        run_ts(
            repo=repo,
            tsx=tsx,
            relative_source="scripts/agent_paid_work_order_envelope_v1.ts",
            args=["verify", str(work_path)],
            required_marker="VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1_VALID",
        )


def require_fixed_logical_provider(value: Any) -> str:
    observed = require_text(value, "logical_provider_id", ID_RE)
    if observed != LOGICAL_PROVIDER_ID:
        hold(
            "V1 logical provider ID is fixed: "
            f"observed={observed} expected={LOGICAL_PROVIDER_ID}"
        )
    return observed

def auth_identity(
    *,
    logical_provider_id: str,
    review: dict[str, Any],
    queue: dict[str, Any],
    binding: dict[str, Any],
) -> dict[str, Any]:
    return {
        "logical_provider_id": logical_provider_id,
        "review_decision_id": review["review_decision_id"],
        "queue_item_id": queue["queue_item_id"],
        "node_id": binding["node_id"],
        "signed_node_binding_sha256": binding["sha256"],
        "capability_id": queue["admission"]["capability_id"],
        "quote_asset": queue["admission"]["quote_asset"],
    }


def registry_provider_id(
    *,
    logical_provider_id: str,
    packet_id: str,
    binding: dict[str, Any],
    capability_id: str,
) -> str:
    return digest_identity(
        "voidapwp1",
        {
            "logical_provider_id": logical_provider_id,
            "node_id": binding["node_id"],
            "provider_authentication_packet_id": packet_id,
            "capability_id": capability_id,
        },
    )


def provider_auth_packet(
    *,
    logical_provider_id: str,
    review: dict[str, Any],
    queue: dict[str, Any],
    binding: dict[str, Any],
    created_at: str,
) -> dict[str, Any]:
    identity = auth_identity(
        logical_provider_id=logical_provider_id,
        review=review,
        queue=queue,
        binding=binding,
    )
    packet_id = digest_identity("voidapwpa1", identity)
    capability_id = queue["admission"]["capability_id"]
    quote_asset = queue["admission"]["quote_asset"]
    provider_id = registry_provider_id(
        logical_provider_id=logical_provider_id,
        packet_id=packet_id,
        binding=binding,
        capability_id=capability_id,
    )
    return {
        "marker": AUTH_PACKET_MARKER,
        "version": 1,
        "provider_authentication_packet_id": packet_id,
        "created_at_utc": created_at,
        "status": "provider_authenticated_for_registry",
        "provider": {
            "logical_provider_id": logical_provider_id,
            "registry_provider_id": provider_id,
            "capability_id": capability_id,
            "quote_asset": quote_asset,
        },
        "operator_authorization": {
            "review_decision_id": review["review_decision_id"],
            "queue_item_id": queue["queue_item_id"],
            "operator_id": review["reviewer"]["operator_id"],
            "outcome": "approved_for_provider_selection",
            "provider_selection_eligible": True,
            "authority_source": "explicit_local_operator_confirmation",
        },
        "node_key_possession_evidence": {
            "evidence_type": "signed_void_node_onion_binding_v1",
            "binding_path": binding["path"],
            "binding_sha256": binding["sha256"],
            "node_id": binding["node_id"],
            "health_node_id": binding["node_id"],
            "onion_uri": binding["onion_uri"],
            "binding_expires_at": binding["expires_at"],
            "signature_verified": True,
            "uses_existing_void_node_key": True,
            "canonical_void_node_id_preserved": True,
            "node_private_key_read_in_this_operation": False,
            "node_private_key_generated": False,
            "production_signing_source": True,
            "ephemeral_test_signing_performed": False,
        },
        "provider_limits": {
            "max_request_total_microusd": MAX_REQUEST_TOTAL_MICROUSD,
            "max_runtime_seconds": queue["admission"]["max_runtime_seconds"],
            "max_output_bytes": queue["admission"]["max_output_bytes"],
            "available_capacity": AVAILABLE_CAPACITY,
            "priority": PRIORITY,
        },
        "authentication": {
            "mode": (
                "production_signed_node_binding_plus_"
                "explicit_operator_provider_mapping"
            ),
            "provider_authentication_verified": True,
            "eligible_for_provider_registry": True,
            "production_signing_performed_in_source_binding": True,
            "ephemeral_test_signing_performed": False,
        },
        "authority": {
            "provider_registry_written": False,
            "provider_selected": False,
            "provider_selection_executed": False,
            "quote_creation_granted": False,
            "quote_created": False,
            "requester_acceptance_granted": False,
            "payment_authorization_granted": False,
            "payment_execution_granted": False,
            "work_execution_authorization_granted": False,
            "work_dispatch_granted": False,
            "wc_award_granted": False,
            "wc_ledger_write_granted": False,
            "void_settlement_granted": False,
            "wallet_or_signer_access_granted": False,
            "signing_granted": False,
            "transaction_broadcast_granted": False,
            "buy_void_fulfillment_granted": False,
        },
        "next_action": "materialize_provider_registry_and_select_provider",
    }


def materialize_auth_packet(
    *,
    auth_root: Path,
    logical_provider_id: str,
    review: dict[str, Any],
    queue: dict[str, Any],
    binding: dict[str, Any],
) -> tuple[Path, dict[str, Any], bool]:
    root = private_directory(auth_root)
    packets = private_directory(root / "packets")
    review_indexes = private_directory(root / "review-indexes")
    identity = auth_identity(
        logical_provider_id=logical_provider_id,
        review=review,
        queue=queue,
        binding=binding,
    )
    packet_id = require_text(
        digest_identity("voidapwpa1", identity),
        "provider_authentication_packet_id",
        AUTH_ID_RE,
    )
    packet_path = packets / f"{packet_id}.json"
    if packet_path.exists():
        existing = require_record(
            read_json(packet_path, "provider-authentication packet"),
            "provider-authentication packet",
        )
        created_at = require_text(
            existing.get("created_at_utc"),
            "provider-authentication created_at_utc",
        )
        packet = provider_auth_packet(
            logical_provider_id=logical_provider_id,
            review=review,
            queue=queue,
            binding=binding,
            created_at=created_at,
        )
        if canonical_json(existing) != canonical_json(packet):
            hold("conflicting provider-authentication packet exists")
        duplicate = True
        packet = existing
    else:
        packet = provider_auth_packet(
            logical_provider_id=logical_provider_id,
            review=review,
            queue=queue,
            binding=binding,
            created_at=utc_now(),
        )
        write_exclusive_json(packet_path, packet)
        duplicate = False

    index = {
        "marker": AUTH_REVIEW_INDEX_MARKER,
        "version": 1,
        "review_decision_id": review["review_decision_id"],
        "queue_item_id": queue["queue_item_id"],
        "logical_provider_id": logical_provider_id,
        "registry_provider_id": packet["provider"]["registry_provider_id"],
        "provider_authentication_packet_id": packet_id,
        "packet_path": str(packet_path),
        "packet_sha256": sha256_file(packet_path),
        "node_id": binding["node_id"],
    }
    index_path = review_indexes / f"{review['review_decision_id']}.json"
    write_or_verify_json(
        index_path,
        index,
        "provider-authentication review index",
    )
    exact_false_authority(packet["authority"], "provider-authentication authority")
    return packet_path, packet, duplicate


def materialize_registry(
    *,
    repo: Path,
    tsx: Path,
    registry_root: Path,
    auth_packet_path: Path,
    packet: dict[str, Any],
) -> tuple[Path, dict[str, Any], bool]:
    root = private_directory(registry_root)
    snapshots = private_directory(root / "snapshots")
    limits = packet["provider_limits"]
    providers = [
        {
            "provider_id": packet["provider"]["registry_provider_id"],
            "active": True,
            "provider_authentication_verified": True,
            "provider_authentication_packet_sha256": sha256_file(
                auth_packet_path
            ),
            "capabilities": [
                {
                    "capability_id": packet["provider"]["capability_id"],
                    "quote_assets": [packet["provider"]["quote_asset"]],
                    "max_request_total_microusd": limits[
                        "max_request_total_microusd"
                    ],
                    "max_runtime_seconds": limits["max_runtime_seconds"],
                    "max_output_bytes": limits["max_output_bytes"],
                    "available_capacity": limits["available_capacity"],
                    "priority": limits["priority"],
                }
            ],
        }
    ]

    with tempfile.TemporaryDirectory(
        prefix="void-post-admission-provider-registry-",
        dir=str(root),
    ) as directory:
        candidate_path = Path(directory) / "registry.json"
        run_ts(
            repo=repo,
            tsx=tsx,
            relative_source=(
                "scripts/"
                "authenticated_paid_work_submission_provider_selection_v1.ts"
            ),
            args=[
                "materialize-registry",
                packet["created_at_utc"],
                canonical_json(providers),
                str(candidate_path),
            ],
            required_marker=(
                "VOID_AUTHENTICATED_PAID_WORK_PROVIDER_"
                "REGISTRY_SNAPSHOT_V1_MATERIALIZED"
            ),
        )
        candidate = require_record(
            read_json(candidate_path, "provider registry candidate"),
            "provider registry candidate",
        )

    if candidate.get("marker") != REGISTRY_MARKER:
        hold("provider registry marker mismatch")
    registry_id = require_text(
        candidate.get("provider_registry_snapshot_id"),
        "provider_registry_snapshot_id",
        REGISTRY_ID_RE,
    )
    registry_path = snapshots / f"{registry_id}.json"
    duplicate = write_or_verify_json(
        registry_path,
        candidate,
        "provider registry snapshot",
    )
    stored = require_record(
        read_json(registry_path, "provider registry snapshot"),
        "provider registry snapshot",
    )
    return registry_path, stored, duplicate


def quote_draft(
    *,
    work_order: dict[str, Any],
    selection: dict[str, Any],
) -> dict[str, Any]:
    selected_at = parse_utc(
        selection.get("selected_at_utc"), "selection.selected_at_utc"
    )
    expires = parse_utc(
        work_order.get("expires_at_utc"), "work_order.expires_at_utc"
    )
    if selected_at >= expires:
        hold("provider selection is not earlier than work-order expiry")
    selected_provider = require_record(
        selection.get("selected_provider"), "selection.selected_provider"
    )
    service = require_record(work_order.get("service"), "work_order.service")
    limits = require_record(
        work_order.get("execution_limits"), "work_order.execution_limits"
    )
    selection_id = require_text(
        selection.get("provider_selection_id"),
        "provider_selection_id",
        SELECTION_ID_RE,
    )
    return {
        "marker": QUOTE_MARKER,
        "version": 1,
        "work_order_id": work_order["work_order_id"],
        "created_at_utc": iso_seconds(selected_at),
        "expires_at_utc": iso_seconds(expires),
        "provider": {
            "provider_id": selected_provider["provider_id"],
            "capability_id": selected_provider["capability_id"],
        },
        "commercial": {
            "quote_asset": selected_provider["quote_asset"],
            "total": QUOTE_TOTAL,
            "payment_rail_id": PAYMENT_RAIL_ID,
        },
        "execution_commitment": {
            "max_runtime_seconds": limits["max_runtime_seconds"],
            "max_output_bytes": limits["max_output_bytes"],
            "output_labels": service["expected_outputs"],
            "external_side_effects_allowed": False,
            "wallet_access_allowed": False,
            "money_movement_allowed": False,
        },
        "terms": {
            "separate_acceptance_required": True,
            "payment_required_before_execution": True,
            "quote_grants_no_execution_authority": True,
            "provider_authentication_required": True,
            "quote_is_not_payment_instruction": True,
        },
        "nonce": f"provider-quote-{selection_id[-32:]}",
    }


def quote_response_authority() -> dict[str, bool]:
    return {
        "quote_published": False,
        "requester_acceptance_created": False,
        "payment_rail_resolved": False,
        "payment_destination_resolved": False,
        "payment_authorized": False,
        "payment_executed": False,
        "work_execution_authorized": False,
        "work_executed": False,
        "work_dispatched": False,
        "wc_awarded": False,
        "wc_ledger_written": False,
        "void_settled": False,
        "wallet_or_signer_accessed": False,
        "signing": False,
        "transaction_broadcast": False,
    }


def materialize_quote(
    *,
    repo: Path,
    tsx: Path,
    quote_root: Path,
    work_order: dict[str, Any],
    review: dict[str, Any],
    auth_packet_path: Path,
    auth_packet: dict[str, Any],
    registry_path: Path,
    registry: dict[str, Any],
    selection_path: Path,
    selection: dict[str, Any],
) -> tuple[Path, dict[str, Any], Path, dict[str, Any], bool]:
    root = private_directory(quote_root)
    quotes = private_directory(root / "quotes")
    indexes = private_directory(root / "provider-selection-indexes")
    responses = private_directory(root / "responses")
    selection_id = require_text(
        selection.get("provider_selection_id"),
        "provider_selection_id",
        SELECTION_ID_RE,
    )
    index_path = indexes / f"{selection_id}.json"

    if index_path.exists():
        index = require_record(
            read_json(index_path, "existing provider quote index"),
            "existing provider quote index",
        )
        quote_path = ensure_within(
            quotes,
            Path(require_text(index.get("quote_path"), "quote index path")),
            "provider quote path",
        )
        quote = require_record(
            read_json(quote_path, "existing provider quote"),
            "existing provider quote",
        )
        duplicate = True
    else:
        draft = quote_draft(work_order=work_order, selection=selection)
        with tempfile.TemporaryDirectory(
            prefix="void-post-admission-provider-quote-",
            dir=str(root),
        ) as directory:
            temp = Path(directory)
            work_path = temp / "work-order.json"
            draft_path = temp / "quote-draft.json"
            output_path = temp / "quote-envelope.json"
            for path, value in (
                (work_path, work_order),
                (draft_path, draft),
            ):
                write_exclusive_json(path, value)
            run_ts(
                repo=repo,
                tsx=tsx,
                relative_source="scripts/agent_paid_work_quote_envelope_v1.ts",
                args=[
                    "materialize",
                    str(work_path),
                    str(draft_path),
                    str(output_path),
                ],
                required_marker=(
                    "VOID_AGENT_PAID_WORK_QUOTE_ENVELOPE_V1_MATERIALIZED"
                ),
            )
            quote = require_record(
                read_json(output_path, "materialized provider quote"),
                "materialized provider quote",
            )
        quote_id = require_text(
            quote.get("quote_id"), "quote_id", QUOTE_ID_RE
        )
        quote_path = quotes / f"{quote_id}.json"
        write_or_verify_json(
            quote_path,
            quote,
            "provider quote",
        )
        duplicate = False

    with tempfile.TemporaryDirectory(
        prefix="void-post-admission-provider-quote-verify-"
    ) as directory:
        work_path = Path(directory) / "work-order.json"
        write_exclusive_json(work_path, work_order)
        run_ts(
            repo=repo,
            tsx=tsx,
            relative_source="scripts/agent_paid_work_quote_envelope_v1.ts",
            args=["verify", str(work_path), str(quote_path)],
            required_marker="VOID_AGENT_PAID_WORK_QUOTE_ENVELOPE_V1_VALID",
        )

    selected_provider = require_record(
        selection.get("selected_provider"), "selection.selected_provider"
    )
    index = {
        "marker": QUOTE_INDEX_MARKER,
        "version": 1,
        "provider_selection_id": selection_id,
        "provider_selection_sha256": sha256_file(selection_path),
        "provider_authentication_packet_id": auth_packet[
            "provider_authentication_packet_id"
        ],
        "provider_authentication_packet_sha256": sha256_file(auth_packet_path),
        "provider_registry_snapshot_id": registry[
            "provider_registry_snapshot_id"
        ],
        "provider_registry_sha256": sha256_file(registry_path),
        "review_decision_id": review["review_decision_id"],
        "work_order_id": work_order["work_order_id"],
        "quote_id": quote["quote_id"],
        "quote_path": str(quote_path),
        "selected_provider_id": selected_provider["provider_id"],
        "quote_asset": quote["commercial"]["quote_asset"],
        "total": quote["commercial"]["total"],
        "payment_rail_id": quote["commercial"]["payment_rail_id"],
    }
    write_or_verify_json(
        index_path,
        index,
        "provider quote index",
    )

    response_path = (
        responses / f"{selection_id}-provider-quote-response-v1.json"
    )
    response = {
        "marker": QUOTE_RESPONSE_MARKER,
        "version": 1,
        "ok": True,
        "duplicate": duplicate,
        "recovered_orphan_quote": False,
        "provider_selection_id": selection_id,
        "provider_authentication_packet_id": auth_packet[
            "provider_authentication_packet_id"
        ],
        "provider_registry_snapshot_id": registry[
            "provider_registry_snapshot_id"
        ],
        "quote": quote,
        "quote_path": str(quote_path),
        "selection_index_path": str(index_path),
        "status": "provider_quote_created_pending_requester_acceptance",
        "next_action": (
            "requester_acceptance_may_be_created_but_not_performed"
        ),
        "authority": quote_response_authority(),
    }
    if response_path.exists():
        existing = require_record(
            read_json(response_path, "provider quote response"),
            "provider quote response",
        )
        compare = dict(response)
        compare["duplicate"] = existing.get("duplicate")
        compare["recovered_orphan_quote"] = existing.get(
            "recovered_orphan_quote"
        )
        if canonical_json(existing) != canonical_json(compare):
            hold("conflicting provider quote response exists")
        response = existing
    else:
        write_exclusive_json(response_path, response)
    exact_false_authority(response["authority"], "provider quote authority")
    return quote_path, quote, response_path, response, duplicate


def closeout_authority() -> dict[str, bool]:
    return {
        "authenticated_submission_post": False,
        "provider_authentication_packet_written": False,
        "provider_registry_written": False,
        "provider_selected": False,
        "provider_selection_executed": False,
        "quote_created": False,
        "quote_published": False,
        "requester_acceptance_created": False,
        "payment_authorization_granted": False,
        "payment_executed": False,
        "work_execution_authorization_granted": False,
        "work_executed": False,
        "work_dispatched": False,
        "wc_awarded": False,
        "wc_ledger_written": False,
        "void_settled": False,
        "wallet_or_signer_accessed": False,
        "signing": False,
        "transaction_broadcast": False,
        "service_restart": False,
        "deployment": False,
        "git_mutation": False,
    }


def execute(args: argparse.Namespace) -> dict[str, Any]:
    operator_id = require_text(args.operator_id, "operator_id", ID_RE)
    logical_provider_id = require_fixed_logical_provider(
        args.logical_provider_id
    )
    repo = Path(args.repo_root)
    head, tsx = verify_repository(repo)
    receipt_path = Path(args.receipt).expanduser().resolve()
    request_path = Path(args.prepared_request).expanduser().resolve()
    signed_binding_path = Path(args.signed_node_binding).expanduser().resolve()
    require_regular(receipt_path, "accepted intake receipt")
    require_regular(request_path, "prepared request")
    request_bytes = request_path.read_bytes()
    receipt_input = read_json(receipt_path, "accepted intake receipt")
    request_input = read_json(request_path, "prepared request")
    receipt, work_order, remaining = validate_receipt_and_request(
        receipt_input,
        request_input,
        request_bytes,
        min_remaining_seconds=args.min_remaining_seconds,
    )
    verify_canonical_work_order(repo=repo, tsx=tsx, work_order=work_order)
    binding = verify_signed_binding(
        repo=repo,
        binding_path=signed_binding_path,
        health_url=args.health_url,
    )

    queue_root = private_directory(Path(args.queue_root))
    decision_root = private_directory(Path(args.decision_root))
    auth_root = private_directory(Path(args.auth_root))
    registry_root = private_directory(Path(args.registry_root))
    selection_root = private_directory(Path(args.selection_root))
    quote_root = private_directory(Path(args.quote_root))
    closeout_root = private_directory(Path(args.closeout_root))
    locks = private_directory(closeout_root / "locks")
    responses = private_directory(closeout_root / "responses")

    work_order_id = work_order["work_order_id"]
    lock_path = locks / f"{work_order_id}.lock"
    try:
        lock_path.mkdir(mode=0o700)
    except FileExistsError:
        hold(f"post-admission closeout lock already held: {work_order_id}")

    try:
        queue_responses = private_directory(queue_root / "responses")
        queue_response_path = (
            queue_responses / f"{receipt['receipt_id']}-review-queue-response-v1.json"
        )
        with tempfile.TemporaryDirectory(
            prefix="void-post-admission-receipt-",
            dir=str(closeout_root),
        ) as directory:
            receipt_cli_path = Path(directory) / "accepted-intake-receipt.json"
            write_exclusive_json(receipt_cli_path, receipt)
            queue_response, queue_invoked = invoke_and_persist_response(
                response_path=queue_response_path,
                command=[
                    "node",
                    str(tsx),
                    str(
                        repo
                        / "scripts/"
                        "authenticated_paid_work_submission_review_queue_handoff_v1.ts"
                    ),
                    "enqueue",
                    str(receipt_cli_path),
                    utc_now(),
                    str(queue_root),
                ],
                cwd=repo,
                marker=QUEUE_RESULT_MARKER,
                required_stdout_marker=(
                    "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_"
                    "REVIEW_QUEUE_HANDOFF_V1_ENQUEUED"
                ),
                ignored_fields=("duplicate", "recovered_orphan_item"),
            )
            queue_candidate = require_record(
                queue_response.get("queue_item"),
                "queue response queue_item",
            )
            queue_candidate_path = ensure_within(
                queue_root,
                Path(
                    require_text(
                        queue_response.get("queue_item_path"),
                        "queue_item_path",
                    )
                ),
                "queue item path",
            )
            run_ts(
                repo=repo,
                tsx=tsx,
                relative_source=(
                    "scripts/"
                    "authenticated_paid_work_submission_review_queue_handoff_v1.ts"
                ),
                args=[
                    "verify",
                    str(receipt_cli_path),
                    str(queue_candidate_path),
                ],
                required_marker=(
                    "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_"
                    "REVIEW_QUEUE_HANDOFF_V1_VERIFIED"
                ),
            )
        queue = require_record(
            queue_response.get("queue_item"), "queue response queue_item"
        )
        queue_item_path = ensure_within(
            queue_root,
            Path(
                require_text(
                    queue_response.get("queue_item_path"), "queue_item_path"
                )
            ),
            "queue item path",
        )
        receipt_index_path = ensure_within(
            queue_root,
            Path(
                require_text(
                    queue_response.get("receipt_index_path"),
                    "receipt_index_path",
                )
            ),
            "receipt index path",
        )
        require_text(queue.get("queue_item_id"), "queue_item_id", QUEUE_ID_RE)
        exact_false_authority(queue_response.get("authority"), "queue authority")
        assert_remaining(
            work_order,
            args.min_remaining_seconds,
            "after_review_queue",
        )

        decision_responses = private_directory(decision_root / "responses")
        decision_response_path = (
            decision_responses
            / f"{queue['queue_item_id']}-operator-review-response-v1.json"
        )
        decision_response, decision_invoked = invoke_and_persist_response(
            response_path=decision_response_path,
            command=[
                "node",
                str(tsx),
                str(
                    repo
                    / "scripts/"
                    "authenticated_paid_work_submission_operator_review_decision_v1.ts"
                ),
                "decide",
                str(queue_item_path),
                str(receipt_index_path),
                utc_now(),
                operator_id,
                "approved_for_provider_selection",
                canonical_json(list(APPROVAL_REASON_CODES)),
                str(decision_root),
            ],
            cwd=repo,
            marker=REVIEW_RESULT_MARKER,
            required_stdout_marker=(
                "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_"
                "OPERATOR_REVIEW_DECISION_V1_DECIDED"
            ),
            ignored_fields=("duplicate", "recovered_orphan_decision"),
        )
        review = require_record(
            decision_response.get("decision"), "operator review decision"
        )
        if review.get("marker") != REVIEW_DECISION_MARKER:
            hold("operator review decision marker mismatch")
        require_text(
            review.get("review_decision_id"),
            "review_decision_id",
            REVIEW_ID_RE,
        )
        if review.get("outcome") != "approved_for_provider_selection":
            hold("operator review did not approve provider selection")
        if review.get("provider_selection_eligible") is not True:
            hold("operator review is not provider-selection eligible")
        exact_false_authority(review.get("authority"), "review authority")
        exact_false_authority(
            decision_response.get("authority"),
            "operator review response authority",
        )
        review_path = ensure_within(
            decision_root,
            Path(
                require_text(
                    decision_response.get("decision_path"),
                    "review decision path",
                )
            ),
            "review decision path",
        )
        ensure_within(
            decision_root,
            Path(
                require_text(
                    decision_response.get("index_path"),
                    "review decision index path",
                )
            ),
            "review decision index path",
        )
        run_ts(
            repo=repo,
            tsx=tsx,
            relative_source=(
                "scripts/"
                "authenticated_paid_work_submission_operator_review_decision_v1.ts"
            ),
            args=[
                "verify",
                str(queue_item_path),
                str(receipt_index_path),
                str(review_path),
            ],
            required_marker=(
                "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_"
                "OPERATOR_REVIEW_DECISION_V1_VERIFIED"
            ),
        )
        assert_remaining(
            work_order,
            args.min_remaining_seconds,
            "after_operator_review",
        )

        auth_packet_path, auth_packet, auth_duplicate = materialize_auth_packet(
            auth_root=auth_root,
            logical_provider_id=logical_provider_id,
            review=review,
            queue=queue,
            binding=binding,
        )
        registry_path, registry, registry_duplicate = materialize_registry(
            repo=repo,
            tsx=tsx,
            registry_root=registry_root,
            auth_packet_path=auth_packet_path,
            packet=auth_packet,
        )
        assert_remaining(
            work_order,
            args.min_remaining_seconds,
            "after_provider_registry",
        )

        selection_responses = private_directory(selection_root / "responses")
        selection_response_path = (
            selection_responses
            / f"{review['review_decision_id']}-provider-selection-response-v1.json"
        )
        selection_response, selection_invoked = invoke_and_persist_response(
            response_path=selection_response_path,
            command=[
                "node",
                str(tsx),
                str(
                    repo
                    / "scripts/"
                    "authenticated_paid_work_submission_provider_selection_v1.ts"
                ),
                "select",
                str(review_path),
                str(registry_path),
                utc_now(),
                str(selection_root),
            ],
            cwd=repo,
            marker=SELECTION_RESULT_MARKER,
            required_stdout_marker=(
                "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_"
                "PROVIDER_SELECTION_V1_SELECTED"
            ),
            ignored_fields=("duplicate", "recovered_orphan_selection"),
        )
        selection = require_record(
            selection_response.get("selection"), "provider selection"
        )
        if selection.get("marker") != SELECTION_MARKER:
            hold("provider selection marker mismatch")
        require_text(
            selection.get("provider_selection_id"),
            "provider_selection_id",
            SELECTION_ID_RE,
        )
        if selection.get("status") != "provider_selected_pending_quote":
            hold("provider selection status mismatch")
        exact_false_authority(
            selection.get("authority"),
            "provider selection authority",
            allowed_true={"provider_selected", "provider_selection_executed"},
        )
        exact_false_authority(
            selection_response.get("authority"),
            "provider selection response authority",
            allowed_true={"provider_selected"},
        )
        selection_path = ensure_within(
            selection_root,
            Path(
                require_text(
                    selection_response.get("selection_path"),
                    "provider selection path",
                )
            ),
            "provider selection path",
        )
        ensure_within(
            selection_root,
            Path(
                require_text(
                    selection_response.get("index_path"),
                    "provider selection index path",
                )
            ),
            "provider selection index path",
        )
        run_ts(
            repo=repo,
            tsx=tsx,
            relative_source=(
                "scripts/"
                "authenticated_paid_work_submission_provider_selection_v1.ts"
            ),
            args=[
                "verify",
                str(review_path),
                str(registry_path),
                str(selection_path),
            ],
            required_marker=(
                "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_"
                "PROVIDER_SELECTION_V1_VERIFIED"
            ),
        )
        assert_remaining(
            work_order,
            args.min_remaining_seconds,
            "before_provider_quote",
        )

        (
            quote_path,
            quote,
            quote_response_path,
            quote_response,
            quote_duplicate,
        ) = materialize_quote(
            repo=repo,
            tsx=tsx,
            quote_root=quote_root,
            work_order=work_order,
            review=review,
            auth_packet_path=auth_packet_path,
            auth_packet=auth_packet,
            registry_path=registry_path,
            registry=registry,
            selection_path=selection_path,
            selection=selection,
        )

        selected_provider = require_record(
            selection.get("selected_provider"),
            "selection.selected_provider",
        )
        closeout_path = (
            responses / f"{work_order_id}-post-admission-provider-quote-v1.json"
        )
        existing_closeout = (
            require_record(
                read_json(closeout_path, "post-admission provider quote closeout"),
                "post-admission provider quote closeout",
            )
            if closeout_path.exists()
            else None
        )
        closeout = {
            "marker": RESULT_MARKER,
            "version": 1,
            "ok": True,
            "created_at_utc": (
                require_text(
                    existing_closeout.get("created_at_utc"),
                    "existing closeout created_at_utc",
                )
                if existing_closeout is not None
                else utc_now()
            ),
            "repository": {
                "head": head,
                "source_sha256": SOURCE_SHA256,
            },
            "lineage": {
                "receipt_id": receipt["receipt_id"],
                "submission_id": receipt["submission_id"],
                "work_order_id": work_order_id,
                "request_payload_sha256": receipt[
                    "request_payload_sha256"
                ],
                "canonical_request_sha256": receipt[
                    "canonical_request_sha256"
                ],
                "queue_item_id": queue["queue_item_id"],
                "review_decision_id": review["review_decision_id"],
                "provider_authentication_packet_id": auth_packet[
                    "provider_authentication_packet_id"
                ],
                "provider_registry_snapshot_id": registry[
                    "provider_registry_snapshot_id"
                ],
                "provider_selection_id": selection[
                    "provider_selection_id"
                ],
                "selected_provider_id": selected_provider["provider_id"],
                "quote_id": quote["quote_id"],
            },
            "artifacts": {
                "receipt_path": str(receipt_path),
                "prepared_request_path": str(request_path),
                "queue_item_path": str(queue_item_path),
                "receipt_index_path": str(receipt_index_path),
                "review_decision_path": str(review_path),
                "provider_authentication_packet_path": str(
                    auth_packet_path
                ),
                "provider_registry_path": str(registry_path),
                "provider_selection_path": str(selection_path),
                "provider_quote_path": str(quote_path),
                "provider_quote_response_path": str(quote_response_path),
            },
            "operations": (
                existing_closeout.get("operations")
                if existing_closeout is not None
                else {
                    "queue_invoked": queue_invoked,
                    "review_invoked": decision_invoked,
                    "provider_authentication_duplicate": auth_duplicate,
                    "provider_registry_duplicate": registry_duplicate,
                    "provider_selection_invoked": selection_invoked,
                    "provider_quote_duplicate": quote_duplicate,
                }
            ),
            "quote": {
                "quote_asset": quote["commercial"]["quote_asset"],
                "total": quote["commercial"]["total"],
                "payment_rail_id": quote["commercial"]["payment_rail_id"],
                "status": quote_response["status"],
                "published": False,
                "requester_acceptance_created": False,
            },
            "work_order_remaining_seconds_at_start": remaining,
            "authority": closeout_authority(),
            "next_action": (
                "requester_acceptance_requires_a_separate_explicit_contract"
            ),
        }
        # These are evidence of bounded writes, not downstream authority grants.
        closeout["authority"][
            "provider_authentication_packet_written"
        ] = True
        closeout["authority"]["provider_registry_written"] = True
        closeout["authority"]["provider_selected"] = True
        closeout["authority"]["provider_selection_executed"] = True
        closeout["authority"]["quote_created"] = True

        write_or_verify_json(
            closeout_path,
            closeout,
            "post-admission provider quote closeout",
        )
        closeout["artifacts"]["closeout_path"] = str(closeout_path)
        closeout["artifacts"]["closeout_sha256"] = sha256_file(closeout_path)
        return closeout
    finally:
        shutil.rmtree(lock_path, ignore_errors=True)



def run_contract_integration_self_test(repo: Path, tsx: Path) -> None:
    fixed = dt.datetime(2026, 7, 30, 23, 0, tzinfo=dt.timezone.utc)
    draft = {
        "marker": WORK_ORDER_MARKER,
        "version": 1,
        "created_at_utc": iso_seconds(fixed),
        "expires_at_utc": iso_seconds(fixed + dt.timedelta(hours=1)),
        "requester": {
            "agent_id": "void.integration.agent",
            "callback_uri": "https://example.invalid/void/callback",
        },
        "service": {
            "capability_id": "datanet.fetch_verify",
            "objective": "Verify one deterministic DataNet fixture.",
            "input_refs": ["void://integration/input"],
            "expected_outputs": ["receipt.json"],
        },
        "commercial": {
            "quote_asset": QUOTE_ASSET,
            "max_total": "3",
            "payment_required_before_execution": True,
        },
        "execution_limits": {
            "max_runtime_seconds": 30,
            "max_output_bytes": 4096,
            "external_side_effects_allowed": False,
            "wallet_access_allowed": False,
            "money_movement_allowed": False,
        },
        "nonce": "integration-self-test-v1",
    }

    with tempfile.TemporaryDirectory(
        prefix="void-post-admission-contract-integration-"
    ) as directory:
        root = Path(directory)
        os.chmod(root, 0o700)
        draft_path = root / "work-order-draft.json"
        work_path = root / "work-order.json"
        write_exclusive_json(draft_path, draft)
        run_ts(
            repo=repo,
            tsx=tsx,
            relative_source="scripts/agent_paid_work_order_envelope_v1.ts",
            args=["materialize", str(draft_path), str(work_path)],
            required_marker="VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1_MATERIALIZED",
        )
        work_order = require_record(
            read_json(work_path, "integration work order"),
            "integration work order",
        )
        verify_canonical_work_order(repo=repo, tsx=tsx, work_order=work_order)

        request = {
            "marker": REQUEST_MARKER,
            "version": 1,
            "submission_id": "void-integration-submission",
            "work_order": work_order,
        }
        request_path = root / "prepared-request.json"
        write_exclusive_json(request_path, request)
        request_bytes = request_path.read_bytes()
        receipt = {
            "marker": RECEIPT_MARKER,
            "version": 1,
            "receipt_id": f"voidawsi1_{'9' * 64}",
            "submission_id": request["submission_id"],
            "work_order_id": work_order["work_order_id"],
            "request_payload_sha256": sha256_bytes(request_bytes),
            "canonical_request_sha256": sha256_bytes(
                canonical_json(request).encode("utf-8")
            ),
            "admission_id": f"voidawsa1_{'8' * 64}",
            "received_at_utc": iso_seconds(fixed),
            "authorization_verified": True,
            "loopback_source": True,
            "duplicate": False,
            "authentication": {
                "mode": "credential_registry",
                "registry_id": f"voidapwcr1_{'7' * 64}",
                "credential_id": f"voidapwc1_{'6' * 64}",
                "agent_id": "void.integration.agent",
                "scope": "agent_paid_work_submit",
            },
            "admission": {
                "marker": ADMISSION_MARKER,
                "version": 1,
                "admission_id": f"voidawsa1_{'8' * 64}",
                "work_order_id": work_order["work_order_id"],
                "policy_id": "void.policy.agent-paid-work-submission-admission.v1",
                "evaluated_at_utc": iso_seconds(fixed),
                "decision": "accepted_for_review",
                "reason_codes": [],
                "normalized": {
                    "capability_id": "datanet.fetch_verify",
                    "quote_asset": QUOTE_ASSET,
                    "max_total": "3",
                    "max_runtime_seconds": 30,
                    "max_output_bytes": 4096,
                    "input_ref_count": 1,
                    "expected_output_count": 1,
                    "callback_scheme": "https",
                    "callback_host": "example.invalid",
                    "ttl_seconds": 3600,
                },
                "authority": {
                    "provider_selected": False,
                    "quote_created": False,
                    "payment_authorized": False,
                    "work_execution_authorized": False,
                    "work_dispatched": False,
                    "wc_award_authorized": False,
                    "wc_ledger_write_authorized": False,
                    "mutation_authority_granted": False,
                    "wallet_or_signer_access_granted": False,
                    "buy_void_fulfillment_authority_granted": False,
                },
            },
            "authority": {
                "provider_selection": False,
                "quote_creation": False,
                "payment_execution": False,
            },
        }
        receipt_path = root / "accepted-intake-receipt.json"
        write_exclusive_json(receipt_path, receipt)
        validate_receipt_and_request(
            receipt,
            request,
            request_bytes,
            min_remaining_seconds=600,
            now=fixed,
        )

        queue_root = root / "queue"
        queue_response_path = root / "queue-response.json"
        run_ts(
            repo=repo,
            tsx=tsx,
            relative_source=(
                "scripts/"
                "authenticated_paid_work_submission_review_queue_handoff_v1.ts"
            ),
            args=[
                "enqueue",
                str(receipt_path),
                iso_seconds(fixed + dt.timedelta(seconds=1)),
                str(queue_root),
                str(queue_response_path),
            ],
            required_marker=(
                "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_"
                "REVIEW_QUEUE_HANDOFF_V1_ENQUEUED"
            ),
        )
        queue_response = require_record(
            read_json(queue_response_path, "integration queue response"),
            "integration queue response",
        )
        queue_path = Path(
            require_text(queue_response.get("queue_item_path"), "queue_item_path")
        )
        receipt_index_path = Path(
            require_text(
                queue_response.get("receipt_index_path"),
                "receipt_index_path",
            )
        )

        decision_root = root / "decisions"
        decision_response_path = root / "decision-response.json"
        run_ts(
            repo=repo,
            tsx=tsx,
            relative_source=(
                "scripts/"
                "authenticated_paid_work_submission_operator_review_decision_v1.ts"
            ),
            args=[
                "decide",
                str(queue_path),
                str(receipt_index_path),
                iso_seconds(fixed + dt.timedelta(seconds=2)),
                "void.operator.integration",
                "approved_for_provider_selection",
                canonical_json(list(APPROVAL_REASON_CODES)),
                str(decision_root),
                str(decision_response_path),
            ],
            required_marker=(
                "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_"
                "OPERATOR_REVIEW_DECISION_V1_DECIDED"
            ),
        )
        decision_response = require_record(
            read_json(decision_response_path, "integration decision response"),
            "integration decision response",
        )
        review = require_record(
            decision_response.get("decision"),
            "integration review decision",
        )
        review_path = Path(
            require_text(decision_response.get("decision_path"), "decision_path")
        )

        fake_binding = {
            "path": str(root / "signed-binding.json"),
            "sha256": "5" * 64,
            "node_id": "void-integration-node",
            "onion_uri": f"http://{'a' * 56}.onion",
            "expires_at": "2027-01-01T00:00:00Z",
        }
        queue = require_record(
            queue_response.get("queue_item"),
            "integration queue item",
        )
        packet = provider_auth_packet(
            logical_provider_id=LOGICAL_PROVIDER_ID,
            review=review,
            queue=queue,
            binding=fake_binding,
            created_at=iso_seconds(fixed + dt.timedelta(seconds=3)),
        )
        packet_path = root / "provider-authentication.json"
        write_exclusive_json(packet_path, packet)
        limits = packet["provider_limits"]
        providers = [
            {
                "provider_id": packet["provider"]["registry_provider_id"],
                "active": True,
                "provider_authentication_verified": True,
                "provider_authentication_packet_sha256": sha256_file(packet_path),
                "capabilities": [
                    {
                        "capability_id": packet["provider"]["capability_id"],
                        "quote_assets": [packet["provider"]["quote_asset"]],
                        "max_request_total_microusd": limits[
                            "max_request_total_microusd"
                        ],
                        "max_runtime_seconds": limits["max_runtime_seconds"],
                        "max_output_bytes": limits["max_output_bytes"],
                        "available_capacity": limits["available_capacity"],
                        "priority": limits["priority"],
                    }
                ],
            }
        ]
        registry_path = root / "provider-registry.json"
        run_ts(
            repo=repo,
            tsx=tsx,
            relative_source=(
                "scripts/"
                "authenticated_paid_work_submission_provider_selection_v1.ts"
            ),
            args=[
                "materialize-registry",
                packet["created_at_utc"],
                canonical_json(providers),
                str(registry_path),
            ],
            required_marker=(
                "VOID_AUTHENTICATED_PAID_WORK_PROVIDER_"
                "REGISTRY_SNAPSHOT_V1_MATERIALIZED"
            ),
        )
        registry = require_record(
            read_json(registry_path, "integration registry"),
            "integration registry",
        )
        selection_root = root / "selection"
        selection_response_path = root / "selection-response.json"
        run_ts(
            repo=repo,
            tsx=tsx,
            relative_source=(
                "scripts/"
                "authenticated_paid_work_submission_provider_selection_v1.ts"
            ),
            args=[
                "select",
                str(review_path),
                str(registry_path),
                iso_seconds(fixed + dt.timedelta(seconds=4)),
                str(selection_root),
                str(selection_response_path),
            ],
            required_marker=(
                "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_"
                "PROVIDER_SELECTION_V1_SELECTED"
            ),
        )
        selection_response = require_record(
            read_json(selection_response_path, "integration selection response"),
            "integration selection response",
        )
        selection = require_record(
            selection_response.get("selection"),
            "integration selection",
        )
        draft_quote = quote_draft(work_order=work_order, selection=selection)
        quote_draft_path = root / "quote-draft.json"
        quote_path = root / "quote.json"
        write_exclusive_json(quote_draft_path, draft_quote)
        run_ts(
            repo=repo,
            tsx=tsx,
            relative_source="scripts/agent_paid_work_quote_envelope_v1.ts",
            args=[
                "materialize",
                str(work_path),
                str(quote_draft_path),
                str(quote_path),
            ],
            required_marker=(
                "VOID_AGENT_PAID_WORK_QUOTE_ENVELOPE_V1_MATERIALIZED"
            ),
        )
        run_ts(
            repo=repo,
            tsx=tsx,
            relative_source="scripts/agent_paid_work_quote_envelope_v1.ts",
            args=["verify", str(work_path), str(quote_path)],
            required_marker="VOID_AGENT_PAID_WORK_QUOTE_ENVELOPE_V1_VALID",
        )

    print("canonical_contract_integration_queue=true")
    print("canonical_contract_integration_operator_review=true")
    print("canonical_contract_integration_provider_selection=true")
    print("canonical_contract_integration_quote=true")

def fake_work_order(now: dt.datetime) -> dict[str, Any]:
    return {
        "marker": WORK_ORDER_MARKER,
        "version": 1,
        "work_order_id": f"voidawo1_{'a' * 64}",
        "created_at_utc": iso_seconds(now),
        "expires_at_utc": iso_seconds(now + dt.timedelta(hours=1)),
        "requester": {
            "agent_id": "void.self-test.agent",
            "callback_uri": "https://example.invalid/void/callback",
        },
        "service": {
            "capability_id": "datanet.fetch_verify",
            "objective": "Verify one deterministic self-test fixture.",
            "input_refs": ["void://self-test/input"],
            "expected_outputs": ["receipt.json"],
        },
        "commercial": {
            "quote_asset": "USD",
            "max_total": "3",
            "payment_required_before_execution": True,
        },
        "execution_limits": {
            "max_runtime_seconds": 30,
            "max_output_bytes": 4096,
            "external_side_effects_allowed": False,
            "wallet_access_allowed": False,
            "money_movement_allowed": False,
        },
        "nonce": "self-test-work-order-v1",
    }


def run_self_test() -> None:
    global STATE_ROOT

    now = dt.datetime(2026, 7, 30, 23, 0, tzinfo=dt.timezone.utc)
    work_order = fake_work_order(now)
    request = {
        "marker": REQUEST_MARKER,
        "version": 1,
        "submission_id": "void-self-test-submission",
        "work_order": work_order,
    }
    request_bytes = (
        json.dumps(request, indent=2, sort_keys=True).encode("utf-8") + b"\n"
    )
    receipt = {
        "marker": RECEIPT_MARKER,
        "version": 1,
        "receipt_id": f"voidawsi1_{'b' * 64}",
        "submission_id": request["submission_id"],
        "work_order_id": work_order["work_order_id"],
        "request_payload_sha256": sha256_bytes(request_bytes),
        "canonical_request_sha256": sha256_bytes(
            canonical_json(request).encode("utf-8")
        ),
        "admission_id": f"voidawsa1_{'c' * 64}",
        "received_at_utc": iso_seconds(now),
        "authorization_verified": True,
        "loopback_source": True,
        "duplicate": False,
        "authentication": {
            "mode": "credential_registry",
            "registry_id": f"voidapwcr1_{'d' * 64}",
            "credential_id": f"voidapwc1_{'e' * 64}",
            "agent_id": "void.self-test.agent",
            "scope": "agent_paid_work_submit",
        },
        "admission": {
            "marker": "VOID_AGENT_PAID_WORK_SUBMISSION_ADMISSION_V1",
            "version": 1,
            "admission_id": f"voidawsa1_{'c' * 64}",
            "work_order_id": work_order["work_order_id"],
            "policy_id": "void.policy.agent-paid-work-submission-admission.v1",
            "evaluated_at_utc": iso_seconds(now),
            "decision": "accepted_for_review",
            "reason_codes": [],
            "normalized": {
                "capability_id": "datanet.fetch_verify",
                "quote_asset": "USD",
                "max_total": "3",
                "max_runtime_seconds": 30,
                "max_output_bytes": 4096,
                "input_ref_count": 1,
                "expected_output_count": 1,
                "callback_scheme": "https",
                "callback_host": "example.invalid",
                "ttl_seconds": 3600,
            },
            "authority": {
                "provider_selection": False,
                "quote_creation": False,
                "payment_authorization": False,
            },
        },
        "authority": {
            "provider_selection": False,
            "quote_creation": False,
            "payment_execution": False,
        },
    }
    parsed_receipt, parsed_work, remaining = validate_receipt_and_request(
        receipt,
        request,
        request_bytes,
        min_remaining_seconds=600,
        now=now,
    )
    if parsed_receipt["receipt_id"] != receipt["receipt_id"]:
        hold("self-test receipt binding failed")
    if parsed_work["work_order_id"] != work_order["work_order_id"]:
        hold("self-test work-order binding failed")
    if remaining != 3600:
        hold("self-test remaining window mismatch")

    queue = {
        "queue_item_id": f"voidapwsrq1_{'f' * 64}",
        "admission": {
            "capability_id": "datanet.fetch_verify",
            "quote_asset": "USD",
            "max_runtime_seconds": 30,
            "max_output_bytes": 4096,
        },
    }
    review_one = {
        "review_decision_id": f"voidapwod1_{'1' * 64}",
        "reviewer": {"operator_id": "void.operator.self-test"},
    }
    review_two = {
        "review_decision_id": f"voidapwod1_{'2' * 64}",
        "reviewer": {"operator_id": "void.operator.self-test"},
    }
    binding = {
        "path": "/tmp/signed-binding.json",
        "sha256": "3" * 64,
        "node_id": "self-test-node-id",
        "onion_uri": f"http://{'a' * 56}.onion",
        "expires_at": "2027-01-01T00:00:00Z",
    }
    packet_one = provider_auth_packet(
        logical_provider_id=LOGICAL_PROVIDER_ID,
        review=review_one,
        queue=queue,
        binding=binding,
        created_at="2026-07-30T23:00:01Z",
    )
    packet_two = provider_auth_packet(
        logical_provider_id=LOGICAL_PROVIDER_ID,
        review=review_two,
        queue=queue,
        binding=binding,
        created_at="2026-07-30T23:00:01Z",
    )
    if packet_one["provider_authentication_packet_id"] == packet_two[
        "provider_authentication_packet_id"
    ]:
        hold("self-test provider auth IDs did not vary by review")
    require_text(
        packet_one["provider_authentication_packet_id"],
        "self-test auth ID",
        AUTH_ID_RE,
    )
    require_text(
        packet_one["provider"]["registry_provider_id"],
        "self-test provider ID",
        PROVIDER_ID_RE,
    )
    exact_false_authority(
        packet_one["authority"],
        "self-test provider authentication authority",
    )

    verifier_sample = "\n".join(
        [
            "VOID_NODE_ONION_BINDING_V1_VERIFY_GREEN",
            "marker=VOID_NODE_ONION_BINDING_V1",
            "node_id=void-node-integration:alpha_01",
            (
                "onion_uri=http://"
                "exampleexampleexampleexampleexampleexampleexampleexample.onion"
            ),
            "expires_at=2099-01-01T00:00:00Z",
            "read_only=true",
        ]
    )
    verifier_summary = parse_binding_verifier_output(verifier_sample)
    if verifier_summary != (
        "void-node-integration:alpha_01",
        (
            "http://"
            "exampleexampleexampleexampleexampleexampleexampleexample.onion"
        ),
        "exampleexampleexampleexampleexampleexampleexampleexample.onion",
        "2099-01-01T00:00:00Z",
    ):
        hold("self-test verifier-summary parser mismatch")
    try:
        parse_binding_verifier_output(
            verifier_sample + "\nnode_id=void-node-integration:beta_02"
        )
    except Hold:
        pass
    else:
        hold("self-test accepted conflicting verifier node IDs")

    selection = {
        "provider_selection_id": f"voidapwps1_{'4' * 64}",
        "selected_at_utc": "2026-07-30T23:00:02Z",
        "selected_provider": {
            "provider_id": packet_one["provider"]["registry_provider_id"],
            "capability_id": "datanet.fetch_verify",
            "quote_asset": "USD",
        },
    }
    draft = quote_draft(work_order=work_order, selection=selection)
    if draft["commercial"] != {
        "quote_asset": "USD",
        "total": "0.01",
        "payment_rail_id": PAYMENT_RAIL_ID,
    }:
        hold("self-test quote commercial terms mismatch")
    if any(draft["execution_commitment"][key] for key in (
        "external_side_effects_allowed",
        "wallet_access_allowed",
        "money_movement_allowed",
    )):
        hold("self-test quote side-effect boundary failed")
    exact_false_authority(
        quote_response_authority(),
        "self-test quote response authority",
    )
    if list(APPROVAL_REASON_CODES) != ["operator_approved"]:
        hold("self-test approval reason codes changed")
    require_fixed_logical_provider(LOGICAL_PROVIDER_ID)
    try:
        require_fixed_logical_provider("void.provider.other")
    except Hold:
        pass
    else:
        hold("self-test accepted a non-canonical logical provider")
    response_one = {
        "marker": "SELF_TEST_RESPONSE",
        "version": 1,
        "ok": True,
        "duplicate": False,
        "value": 1,
    }
    response_two = {
        "marker": "SELF_TEST_RESPONSE",
        "version": 1,
        "ok": True,
        "duplicate": True,
        "value": 1,
    }
    if not semantic_response_equal(response_one, response_two, ("duplicate",)):
        hold("self-test semantic response reuse rejected a duplicate-only delta")
    response_two["value"] = 2
    if semantic_response_equal(response_one, response_two, ("duplicate",)):
        hold("self-test semantic response reuse accepted a conflicting delta")

    with tempfile.TemporaryDirectory(
        prefix="void-post-admission-self-test-"
    ) as directory:
        root = Path(directory)
        try:
            private_directory(root / "outside-state")
        except Hold:
            pass
        else:
            hold("self-test accepted a private root outside ~/.local/state")

        original_state_root = STATE_ROOT
        try:
            STATE_ROOT = root.resolve()
            private_root = private_directory(root / "private-state")
            if not private_root.is_dir() or private_root.is_symlink():
                hold("self-test private directory type verification failed")
            if stat.S_IMODE(private_root.stat().st_mode) != 0o700:
                hold("self-test private directory mode verification failed")
        finally:
            STATE_ROOT = original_state_root

        path = root / "append-once.json"
        value = {"marker": "SELF_TEST", "value": 1}
        if write_or_verify_json(path, value, "self-test artifact"):
            hold("self-test initial write reported duplicate")
        if not write_or_verify_json(path, value, "self-test artifact"):
            hold("self-test duplicate reuse was not detected")
        try:
            write_or_verify_json(
                path,
                {"marker": "SELF_TEST", "value": 2},
                "self-test artifact",
            )
        except Hold:
            pass
        else:
            hold("self-test conflicting append-once write was accepted")

    stale_work = dict(work_order)
    stale_work["expires_at_utc"] = iso_seconds(now + dt.timedelta(seconds=599))
    stale_request = dict(request)
    stale_request["work_order"] = stale_work
    stale_bytes = (
        json.dumps(stale_request, indent=2, sort_keys=True).encode("utf-8")
        + b"\n"
    )
    stale_receipt = dict(receipt)
    stale_receipt["request_payload_sha256"] = sha256_bytes(stale_bytes)
    stale_receipt["canonical_request_sha256"] = sha256_bytes(
        canonical_json(stale_request).encode("utf-8")
    )
    try:
        validate_receipt_and_request(
            stale_receipt,
            stale_request,
            stale_bytes,
            min_remaining_seconds=600,
            now=now,
        )
    except Hold:
        pass
    else:
        hold("self-test accepted a stale quote window")

    print("receipt_request_exact_binding=true")
    print("work_order_minimum_quote_window_guard=true")
    print("provider_authentication_review_scoped_identity=true")
    print("provider_registry_provider_identity_deterministic=true")
    print("fixed_usd_cent_quote=true")
    print("quote_side_effects_rejected=true")
    print("private_state_root_confinement=true")
    print("private_directory_stat_mode_check=true")
    print("canonical_nested_signed_binding_envelope=true")
    print("canonical_verifier_output_parser=true")
    print("canonical_verifier_expected_value_reverification=true")
    print("approval_reason_codes_exact=true")
    print("logical_provider_id_fixed=true")
    print("canonical_duplicate_response_revalidation=true")
    print("append_once_duplicate_reuse=true")
    print("append_once_conflict_rejected=true")
    print("all_downstream_authority_false=true")
    print(
        "VOID_AUTHENTICATED_PAID_WORK_POST_ADMISSION_"
        "PROVIDER_QUOTE_CLOSEOUT_V1_SELF_TEST=PASS"
    )


def default_state(name: str) -> str:
    return str(Path.home() / ".local/state" / name)


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser()
    subparsers = root.add_subparsers(dest="mode", required=True)

    subparsers.add_parser("self-test")

    for mode in ("validate", "execute"):
        item = subparsers.add_parser(mode)
        item.add_argument(
            "--repo-root",
            default=str(Path.home() / "dev/void-node"),
        )
        item.add_argument("--receipt", required=True)
        item.add_argument("--prepared-request", required=True)
        item.add_argument(
            "--signed-node-binding",
            default=str(
                Path.home()
                / ".local/share/void/tor-onion-v1/node-onion-binding-v1.json"
            ),
        )
        item.add_argument(
            "--health-url",
            default="http://127.0.0.1:4100/health",
        )
        item.add_argument("--operator-id", required=True)
        item.add_argument(
            "--logical-provider-id",
            default=LOGICAL_PROVIDER_ID,
        )
        item.add_argument(
            "--min-remaining-seconds",
            type=int,
            default=MIN_REMAINING_SECONDS,
        )
        item.add_argument(
            "--queue-root",
            default=default_state(
                "void-authenticated-paid-work-submission-review-queue-v1"
            ),
        )
        item.add_argument(
            "--decision-root",
            default=default_state(
                "void-authenticated-paid-work-submission-operator-review-decision-v1"
            ),
        )
        item.add_argument(
            "--auth-root",
            default=default_state(
                "void-authenticated-paid-work-provider-authentication-v1"
            ),
        )
        item.add_argument(
            "--registry-root",
            default=default_state(
                "void-authenticated-paid-work-provider-registry-v1"
            ),
        )
        item.add_argument(
            "--selection-root",
            default=default_state(
                "void-authenticated-paid-work-submission-provider-selection-v1"
            ),
        )
        item.add_argument(
            "--quote-root",
            default=default_state(
                "void-authenticated-paid-work-submission-provider-quote-v1"
            ),
        )
        item.add_argument(
            "--closeout-root",
            default=default_state(
                "void-authenticated-paid-work-post-admission-provider-quote-v1"
            ),
        )
        if mode == "execute":
            item.add_argument("--confirm", required=True)
    return root


def validate_only(args: argparse.Namespace) -> None:
    repo = Path(args.repo_root)
    require_fixed_logical_provider(args.logical_provider_id)
    head, tsx = verify_repository(repo)
    receipt_path = Path(args.receipt).expanduser().resolve()
    request_path = Path(args.prepared_request).expanduser().resolve()
    require_regular(receipt_path, "accepted intake receipt")
    require_regular(request_path, "prepared request")
    receipt_input = read_json(receipt_path, "accepted intake receipt")
    request_bytes = request_path.read_bytes()
    request_input = read_json(request_path, "prepared request")
    receipt, work_order, remaining = validate_receipt_and_request(
        receipt_input,
        request_input,
        request_bytes,
        min_remaining_seconds=args.min_remaining_seconds,
    )
    verify_canonical_work_order(repo=repo, tsx=tsx, work_order=work_order)
    binding = verify_signed_binding(
        repo=repo,
        binding_path=Path(args.signed_node_binding),
        health_url=args.health_url,
    )
    print(f"repository_head={head}")
    print(f"receipt_id={receipt['receipt_id']}")
    print(f"submission_id={receipt['submission_id']}")
    print(f"work_order_id={work_order['work_order_id']}")
    print(f"work_order_remaining_seconds={remaining}")
    print(f"binding_node_id={binding['node_id']}")
    print("state_mutation=false")
    print(
        "VOID_AUTHENTICATED_PAID_WORK_POST_ADMISSION_"
        "PROVIDER_QUOTE_CLOSEOUT_V1_VALIDATED"
    )


def main() -> int:
    args = parser().parse_args()
    old_umask = os.umask(0o077)
    try:
        if args.mode == "self-test":
            run_self_test()
            return 0
        if args.min_remaining_seconds < 600:
            hold("min_remaining_seconds cannot be below 600")
        if args.mode == "validate":
            validate_only(args)
            return 0
        if args.confirm != CONFIRMATION:
            hold(f"exact confirmation required: --confirm {CONFIRMATION}")

        print(f"{MARKER}=START")
        print("operation=close_one_accepted_submission_through_private_provider_quote")
        print("authenticated_submission_post=false")
        print("operator_review_approval=true")
        print("provider_authentication_packet_write=true_if_absent")
        print("provider_registry_write=true_if_absent")
        print("provider_selection_write=true_if_absent")
        print("quote_creation=true_if_absent")
        print("quote_published=false")
        print("requester_acceptance_created=false")
        print("payment_authorization_granted=false")
        print("payment_execution=false")
        print("work_execution_authorization_granted=false")
        print("work_dispatch=false")
        print("wc_ledger_write=false")
        print("void_settlement=false")
        print("wallet_or_signer_access=false")
        print("signing=false")
        print("transaction_broadcast=false")
        print("service_restart=false")
        print("deployment=false")
        print("git_mutation=false")

        result = execute(args)
        print(f"receipt_id={result['lineage']['receipt_id']}")
        print(f"work_order_id={result['lineage']['work_order_id']}")
        print(f"review_decision_id={result['lineage']['review_decision_id']}")
        print(
            "provider_authentication_packet_id="
            f"{result['lineage']['provider_authentication_packet_id']}"
        )
        print(
            "provider_registry_snapshot_id="
            f"{result['lineage']['provider_registry_snapshot_id']}"
        )
        print(
            f"provider_selection_id={result['lineage']['provider_selection_id']}"
        )
        print(f"selected_provider_id={result['lineage']['selected_provider_id']}")
        print(f"quote_id={result['lineage']['quote_id']}")
        print(f"quote_total={result['quote']['total']}")
        print(f"quote_asset={result['quote']['quote_asset']}")
        print(f"quote_path={result['artifacts']['provider_quote_path']}")
        print(f"closeout_path={result['artifacts']['closeout_path']}")
        print("quote_published=false")
        print("requester_acceptance_created=false")
        print("payment_executed=false")
        print("work_dispatched=false")
        print("wc_ledger_written=false")
        print("void_settled=false")
        print(
            "VOID_AUTHENTICATED_PAID_WORK_POST_ADMISSION_"
            "PROVIDER_QUOTE_CLOSEOUT_V1=PASS"
        )
        return 0
    except Hold as error:
        print(f"HOLD: {error}", file=sys.stderr)
        return 1
    finally:
        os.umask(old_umask)


if __name__ == "__main__":
    raise SystemExit(main())
