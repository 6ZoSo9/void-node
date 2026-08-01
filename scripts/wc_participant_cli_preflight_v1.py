#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import time
from typing import Any
import urllib.error
import urllib.parse
import urllib.request


MARKER = "WC_PARTICIPANT_CLI_PREFLIGHT_V1"
PILOT_MARKER = "VOID_WC_PUBLIC_EARNING_PILOT_V1"
RELEASE_MARKER = "WC_PUBLIC_EARNING_PARTICIPANT_CLI_RELEASE_PACK_V1"
CLI_MARKER = "VOID_WC_PUBLIC_EARNING_PARTICIPANT_CLI_V1"
CLI_NAME = "wc-public-earning-participant-v1.sh"
TRUSTED_CLI_SHA256 = "382bdf28f7ad39e7cc86b3e3e0852fa00c6c8071e93719128d6a4ee47833cd63"
TRUSTED_LICENSE_SHA256 = "0d777083a94876e2c28e81b4b66cf99e9bc93887726d53e45ee71725fdc8ffe0"
MAX_FILE_BYTES = 2 * 1024 * 1024
MAX_HTTP_BYTES = 1024 * 1024

AUTHORITY = {
    "ticket_issuance": False,
    "ticket_consumption": False,
    "work_execution": False,
    "wc_ledger_write": False,
    "settlement_execution": False,
    "wallet_or_signer_access": False,
    "deployment": False,
    "runtime_mutation": False,
    "fund_movement": False,
}


class Hold(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # type: ignore[no-untyped-def]
        return None


def fail(condition: bool, code: str, message: str) -> None:
    if not condition:
        raise Hold(code, message)


def canonical_json(value: object) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def read_regular(path: Path, label: str) -> tuple[bytes, int]:
    try:
        metadata = path.lstat()
    except FileNotFoundError as error:
        raise Hold("missing_file", f"missing {label}: {path}") from error
    fail(stat.S_ISREG(metadata.st_mode), "invalid_file_type", f"{label} must be a regular file")
    fail(not path.is_symlink(), "symlink_rejected", f"{label} must not be a symlink")
    fail(metadata.st_size <= MAX_FILE_BYTES, "file_too_large", f"{label} exceeds the size limit")
    return path.read_bytes(), stat.S_IMODE(metadata.st_mode)


def require_object(value: object, code: str, message: str) -> dict[str, Any]:
    fail(isinstance(value, dict), code, message)
    return value  # type: ignore[return-value]


def parse_json_bytes(value: bytes, code: str, message: str) -> dict[str, Any]:
    try:
        parsed = json.loads(value)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise Hold(code, message) from error
    return require_object(parsed, code, message)


def normalize_coordinator_base(raw: str) -> str:
    try:
        parsed = urllib.parse.urlsplit(raw.strip())
    except ValueError as error:
        raise Hold("invalid_coordinator_base", "trusted coordinator base is invalid") from error
    fail(parsed.scheme in {"http", "https"}, "invalid_coordinator_base", "trusted coordinator base must use HTTP or HTTPS")
    fail(bool(parsed.netloc), "invalid_coordinator_base", "trusted coordinator base has no host")
    fail(parsed.username is None and parsed.password is None, "invalid_coordinator_base", "trusted coordinator base must not contain credentials")
    fail(parsed.path in {"", "/"} and not parsed.query and not parsed.fragment, "invalid_coordinator_base", "trusted coordinator base must not contain a path, query, or fragment")
    host = parsed.hostname or ""
    if parsed.scheme == "http":
        allowed = host == "localhost"
        try:
            address = ipaddress.ip_address(host)
            allowed = (
                allowed
                or address.is_loopback
                or address in ipaddress.ip_network("100.64.0.0/10")
                or address in ipaddress.ip_network("fd7a:115c:a1e0::/48")
            )
        except ValueError:
            pass
        fail(allowed, "insecure_coordinator_base", "HTTP is allowed only for loopback or Tailscale addresses")
    return f"{parsed.scheme}://{parsed.netloc}"


def validate_node_id(value: str, label: str) -> str:
    normalized = value.strip().lower()
    fail(bool(re.fullmatch(r"[0-9a-f]{32}", normalized)), "invalid_node_id", f"{label} must be exactly 32 hexadecimal characters")
    return normalized


def validate_release(release_dir: Path) -> dict[str, Any]:
    try:
        metadata = release_dir.lstat()
    except FileNotFoundError as error:
        raise Hold("missing_release_dir", f"release directory not found: {release_dir}") from error
    fail(stat.S_ISDIR(metadata.st_mode), "invalid_release_dir", "release directory must be a directory")
    fail(not release_dir.is_symlink(), "symlink_rejected", "release directory must not be a symlink")

    cli, cli_mode = read_regular(release_dir / CLI_NAME, "participant CLI")
    license_bytes, _ = read_regular(release_dir / "LICENSE", "license")
    source_bytes, _ = read_regular(release_dir / "SOURCE.json", "source manifest")
    read_regular(release_dir / "README.txt", "release README")

    fail(bool(cli_mode & 0o100), "cli_not_executable", "participant CLI is not executable")
    source = parse_json_bytes(source_bytes, "invalid_source_manifest", "source manifest is not valid JSON")
    fail(source.get("marker") == RELEASE_MARKER, "source_marker_mismatch", "source manifest marker mismatch")
    fail(source.get("version") == 1, "source_version_mismatch", "source manifest version mismatch")
    fail(source.get("repository") == "6ZoSo9/void-node", "source_repository_mismatch", "source repository mismatch")
    fail(bool(re.fullmatch(r"[0-9a-f]{40}", str(source.get("source_commit", "")))), "source_commit_mismatch", "source commit must be a lowercase Git SHA")
    network = require_object(source.get("network"), "source_network_mismatch", "source network metadata is missing")
    fail(network.get("chain_id") == 2050 and network.get("identity") == "mainnet0", "source_network_mismatch", "source network identity mismatch")

    files = source.get("source_files")
    fail(isinstance(files, list), "source_files_mismatch", "source file list is missing")
    fail(len(files) == 2, "source_files_mismatch", "source manifest must contain exactly two source files")
    indexed: dict[str, dict[str, Any]] = {}
    for item in files:
        fail(isinstance(item, dict) and isinstance(item.get("path"), str), "source_files_mismatch", "source file entry is invalid")
        indexed[item["path"]] = item
    expected = {
        "ops/mainnet0/wc-public-earning-participant-v1.sh": cli,
        "LICENSE": license_bytes,
    }
    fail(set(indexed) == set(expected), "source_files_mismatch", "source manifest must bind exactly the CLI and license")
    for source_path, content in expected.items():
        item = indexed[source_path]
        fail(item.get("bytes") == len(content), "source_size_mismatch", f"source byte count mismatch: {source_path}")
        fail(item.get("sha256") == sha256_bytes(content), "source_sha_mismatch", f"source checksum mismatch: {source_path}")
    fail(sha256_bytes(cli) == TRUSTED_CLI_SHA256, "untrusted_cli_sha", "participant CLI does not match the reviewed V1 checksum")
    fail(sha256_bytes(license_bytes) == TRUSTED_LICENSE_SHA256, "untrusted_license_sha", "license does not match the reviewed V1 checksum")

    runtime = require_object(source.get("runtime_requirements"), "runtime_requirements_mismatch", "runtime requirements are missing")
    fail(runtime.get("local_void_executor_required") is True, "runtime_requirements_mismatch", "local executor requirement is missing")
    fail(runtime.get("fresh_ticket_required") is True, "runtime_requirements_mismatch", "fresh ticket requirement is missing")
    fail(runtime.get("trusted_coordinator_identity_required") is True, "runtime_requirements_mismatch", "trusted coordinator identity requirement is missing")
    fail(runtime.get("fixed_award_wc") == 3, "runtime_requirements_mismatch", "fixed award requirement mismatch")
    authority = require_object(source.get("authority"), "source_authority_mismatch", "source authority metadata is missing")
    for boundary in (
        "ticket_issuance",
        "coordinator_enablement",
        "executor_enablement",
        "work_execution",
        "wc_ledger_write",
        "void_settlement",
        "payment_execution",
        "wallet_or_signer_access",
        "runtime_mutation",
        "fund_movement",
    ):
        fail(authority.get(boundary) is False, "source_authority_mismatch", f"source authority boundary mismatch: {boundary}")

    try:
        cli_text = cli.decode("utf-8")
    except UnicodeDecodeError as error:
        raise Hold("cli_encoding_mismatch", "participant CLI must be UTF-8") from error
    for anchor in (
        CLI_MARKER,
        "fixed_award_wc == 3",
        "wcPublicEarningPilotExecuteLocal",
        "trusted-coordinator-node-id",
        "ticket_deleted=1",
    ):
        fail(anchor in cli_text, "cli_anchor_missing", f"participant CLI anchor missing: {anchor}")
    for forbidden in ('echo "$TOKEN"', "set -x", "--arg capability_token"):
        fail(forbidden not in cli_text, "cli_forbidden_pattern", f"participant CLI forbidden pattern present: {forbidden}")
    fail(license_bytes.startswith(b"VOID Community License"), "license_marker_mismatch", "license marker mismatch")

    cli_path = release_dir / CLI_NAME
    syntax = subprocess.run(
        ["bash", "-n", str(cli_path)],
        check=False,
        capture_output=True,
        text=True,
        timeout=10,
    )
    fail(syntax.returncode == 0, "cli_syntax_failed", "participant CLI syntax validation failed")
    help_run = subprocess.run(
        [str(cli_path), "--help"],
        check=False,
        capture_output=True,
        text=True,
        timeout=10,
    )
    fail(help_run.returncode == 0 and "Usage:" in help_run.stdout, "cli_help_failed", "participant CLI help validation failed")
    return {
        "source_commit": source["source_commit"],
        "cli_sha256": sha256_bytes(cli),
        "license_sha256": sha256_bytes(license_bytes),
    }


def validate_ticket(ticket_path: Path, coordinator_base: str, coordinator_node_id: str) -> dict[str, Any]:
    ticket_bytes, ticket_mode = read_regular(ticket_path, "ticket file")
    fail(ticket_mode == 0o600, "ticket_mode_mismatch", "ticket file mode must be exactly 600")
    root = parse_json_bytes(ticket_bytes, "invalid_ticket_json", "ticket file is not valid JSON")
    token = root.get("capability_token")
    fail(isinstance(token, str) and bool(token), "ticket_token_missing", "ticket file has no capability token")
    wrapped = root.get("ticket")
    if isinstance(wrapped, dict):
        ticket = wrapped
    else:
        omitted = {
            "capability_token",
            "capability_token_returned_once",
            "coordinator_base",
            "coordinator_node_id",
        }
        ticket = {key: value for key, value in root.items() if key not in omitted}

    fail(ticket.get("marker") == PILOT_MARKER, "ticket_contract_mismatch", "ticket marker mismatch")
    fail(ticket.get("version") == 1, "ticket_contract_mismatch", "ticket version mismatch")
    fail(ticket.get("task_class") == "datanet_fetch_verify", "ticket_contract_mismatch", "ticket task class mismatch")
    fail(ticket.get("fixed_award_wc") == 3, "ticket_contract_mismatch", "ticket fixed award mismatch")
    fail(ticket.get("status") == "issued", "ticket_contract_mismatch", "ticket is not issued")

    transport = ticket.get("transport_mode")
    if transport is None:
        transport = "inbound_fetch" if ticket.get("executor_http_base") else "outbound_bundle"
    fail(transport in {"inbound_fetch", "outbound_bundle"}, "ticket_contract_mismatch", "ticket transport mode mismatch")
    if transport == "inbound_fetch":
        fail(isinstance(ticket.get("executor_http_base"), str) and bool(ticket.get("executor_http_base")), "ticket_contract_mismatch", "inbound ticket has no executor HTTP base")
    else:
        fail(ticket.get("executor_http_base", "") == "", "ticket_contract_mismatch", "outbound ticket unexpectedly has an executor HTTP base")

    ticket_id = str(ticket.get("ticket_id", ""))
    account = str(ticket.get("account", ""))
    executor_node_id = str(ticket.get("executor_node_id", ""))
    dataset_id = str(ticket.get("dataset_id", ""))
    expected_input_hash = str(ticket.get("expected_input_hash", ""))
    token_sha256 = str(ticket.get("token_sha256", ""))
    expires_at_ms = ticket.get("expires_at_ms")

    fail(bool(re.fullmatch(r"[0-9a-f]{32}", ticket_id)), "ticket_contract_mismatch", "ticket ID mismatch")
    fail(bool(re.fullmatch(r"[A-Za-z0-9._:-]{1,128}", account)), "ticket_contract_mismatch", "ticket account mismatch")
    fail(bool(re.fullmatch(r"[0-9a-f]{32}", executor_node_id)), "ticket_contract_mismatch", "executor node ID mismatch")
    fail(0 < len(dataset_id) <= 160, "ticket_contract_mismatch", "dataset ID mismatch")
    fail(bool(re.fullmatch(r"[0-9a-f]{64}", expected_input_hash)), "ticket_contract_mismatch", "expected input hash mismatch")
    fail(bool(re.fullmatch(r"[0-9a-f]{64}", token_sha256)), "ticket_contract_mismatch", "ticket token hash mismatch")
    fail(sha256_bytes(token.encode()) == token_sha256, "ticket_token_sha_mismatch", "capability token checksum mismatch")
    fail(isinstance(expires_at_ms, int) and not isinstance(expires_at_ms, bool), "ticket_contract_mismatch", "ticket expiry mismatch")
    fail(expires_at_ms > time.time_ns() // 1_000_000, "ticket_expired", "ticket is expired")

    wrapped_base = root.get("coordinator_base")
    if wrapped_base is not None:
        fail(normalize_coordinator_base(str(wrapped_base)) == coordinator_base, "ticket_coordinator_mismatch", "ticket coordinator base does not match the trusted input")
    wrapped_node = root.get("coordinator_node_id")
    if wrapped_node is not None:
        fail(validate_node_id(str(wrapped_node), "ticket coordinator node ID") == coordinator_node_id, "ticket_coordinator_mismatch", "ticket coordinator node ID does not match the trusted input")

    return {
        "ticket_bytes": ticket_bytes,
        "ticket_mode": ticket_mode,
        "ticket_id": ticket_id,
        "account": account,
        "executor_node_id": executor_node_id,
        "dataset_id": dataset_id,
        "transport_mode": transport,
        "expires_at_ms": expires_at_ms,
    }


def get_json(opener: urllib.request.OpenerDirector, url: str, timeout: float, label: str) -> dict[str, Any]:
    request = urllib.request.Request(url, headers={"accept": "application/json"}, method="GET")
    try:
        with opener.open(request, timeout=timeout) as response:
            fail(response.status == 200, "http_status_mismatch", f"{label} returned HTTP {response.status}")
            payload = response.read(MAX_HTTP_BYTES + 1)
    except Hold:
        raise
    except urllib.error.HTTPError as error:
        raise Hold("http_request_failed", f"{label} returned HTTP {error.code}") from error
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        raise Hold("http_request_failed", f"{label} is unavailable") from error
    fail(len(payload) <= MAX_HTTP_BYTES, "http_response_too_large", f"{label} response is too large")
    return parse_json_bytes(payload, "http_json_invalid", f"{label} did not return a JSON object")


def integer_nonnegative(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value >= 0


def execute(arguments: argparse.Namespace) -> dict[str, Any]:
    fail(shutil_which("bash") is not None, "missing_command", "missing command: bash")
    coordinator_base = normalize_coordinator_base(arguments.trusted_coordinator_base)
    coordinator_node_id = validate_node_id(arguments.trusted_coordinator_node_id, "trusted coordinator node ID")
    fail(1 <= arguments.participant_http_port <= 65535, "invalid_participant_port", "participant HTTP port must be between 1 and 65535")
    fail(0.1 <= arguments.timeout_seconds <= 30.0, "invalid_timeout", "timeout must be between 0.1 and 30 seconds")

    release = validate_release(arguments.release_dir)
    ticket = validate_ticket(arguments.ticket_file, coordinator_base, coordinator_node_id)
    account_encoded = urllib.parse.quote(ticket["account"], safe="")
    local_base = f"http://127.0.0.1:{arguments.participant_http_port}"
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())

    local_health = get_json(opener, f"{local_base}/health", arguments.timeout_seconds, "local health")
    local_status = get_json(
        opener,
        f"{local_base}/wc/public-earning-pilot-v1/status?account={account_encoded}",
        arguments.timeout_seconds,
        "local pilot status",
    )
    coordinator_health = get_json(opener, f"{coordinator_base}/health", arguments.timeout_seconds, "coordinator health")
    coordinator_status = get_json(
        opener,
        f"{coordinator_base}/wc/public-earning-pilot-v1/status?account={account_encoded}",
        arguments.timeout_seconds,
        "coordinator pilot status",
    )
    balance = get_json(
        opener,
        f"{coordinator_base}/wc/redeemable?account={account_encoded}",
        arguments.timeout_seconds,
        "coordinator redeemable balance",
    )

    fail(local_health.get("ok") is True and local_health.get("nodeId") == ticket["executor_node_id"], "local_identity_mismatch", "local node does not match the ticket executor identity")
    fail(
        local_status.get("ok") is True
        and local_status.get("marker") == PILOT_MARKER
        and local_status.get("coordinator_enabled") is False
        and local_status.get("executor_enabled") is True
        and local_status.get("fixed_award_wc") == 3,
        "local_lane_not_ready",
        "local executor lane is not ready",
    )
    fail(coordinator_health.get("ok") is True and coordinator_health.get("nodeId") == coordinator_node_id, "coordinator_identity_mismatch", "trusted coordinator node identity mismatch")
    caps = coordinator_status.get("caps")
    fail(
        coordinator_status.get("ok") is True
        and coordinator_status.get("marker") == PILOT_MARKER
        and coordinator_status.get("coordinator_enabled") is True
        and coordinator_status.get("executor_enabled") is False
        and coordinator_status.get("fixed_award_wc") == 3
        and isinstance(caps, dict)
        and integer_nonnegative(caps.get("account_total"))
        and caps.get("account_total", 0) >= 1,
        "coordinator_lane_not_ready",
        "trusted coordinator ticket is not active",
    )
    redeemable = balance.get("redeemable")
    fail(balance.get("ok") is True and balance.get("account") == ticket["account"] and integer_nonnegative(redeemable), "balance_invalid", "coordinator redeemable balance is invalid")

    ticket_after, ticket_mode_after = read_regular(arguments.ticket_file, "ticket file")
    fail(ticket_after == ticket["ticket_bytes"] and ticket_mode_after == ticket["ticket_mode"], "ticket_mutated", "preflight unexpectedly changed the ticket file")

    return {
        "marker": MARKER,
        "version": 1,
        "status": "GREEN",
        "account": ticket["account"],
        "ticket_id": ticket["ticket_id"],
        "dataset_id": ticket["dataset_id"],
        "transport_mode": ticket["transport_mode"],
        "expires_at_ms": ticket["expires_at_ms"],
        "executor_node_id": ticket["executor_node_id"],
        "coordinator_node_id": coordinator_node_id,
        "coordinator_base": coordinator_base,
        "redeemable_before": redeemable,
        "fixed_award_wc": 3,
        "release_source_commit": release["source_commit"],
        "checks": {
            "release_pack_integrity": True,
            "cli_syntax_and_help": True,
            "ticket_contract": True,
            "ticket_mode_600": True,
            "ticket_unchanged": True,
            "local_executor_identity": True,
            "trusted_coordinator_identity": True,
            "coordinator_balance_read_only": True,
            "http_get_only": True,
        },
        "authority": AUTHORITY,
    }


def shutil_which(command: str) -> str | None:
    for directory in os.environ.get("PATH", "").split(os.pathsep):
        candidate = Path(directory) / command
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return str(candidate)
    return None


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="Read-only WC participant CLI preflight")
    result.add_argument("--release-dir", type=Path, required=True, help="extracted deterministic participant CLI release directory")
    result.add_argument("--ticket-file", type=Path, required=True)
    result.add_argument("--trusted-coordinator-base", required=True)
    result.add_argument("--trusted-coordinator-node-id", required=True)
    result.add_argument("--participant-http-port", type=int, default=4100)
    result.add_argument("--timeout-seconds", type=float, default=12.0)
    return result


def main() -> int:
    arguments = parser().parse_args()
    try:
        result = execute(arguments)
    except Hold as error:
        print(
            canonical_json(
                {
                    "marker": MARKER,
                    "version": 1,
                    "status": "HOLD",
                    "code": error.code,
                    "message": error.message,
                    "authority": AUTHORITY,
                }
            )
        )
        return 1
    except Exception as error:  # defensive fail-closed boundary
        print(
            canonical_json(
                {
                    "marker": MARKER,
                    "version": 1,
                    "status": "HOLD",
                    "code": "unexpected_error",
                    "message": f"unexpected preflight failure: {type(error).__name__}",
                    "authority": AUTHORITY,
                }
            )
        )
        return 1
    print(canonical_json(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
