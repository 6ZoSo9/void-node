#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import os
import pathlib
import pwd
import socket
import stat
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]
V1_PATH = ROOT / "ops/precision/void_buy_request_root_runtime_topology_census_v1.py"
V2_PATH = ROOT / "ops/precision/void_buy_request_root_runtime_topology_census_v2.py"

def _load(path: pathlib.Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

v1 = _load(V1_PATH, "void_buy_request_root_runtime_topology_census_v1")
v2 = _load(V2_PATH, "void_buy_request_root_runtime_topology_census_v2")

MARKER = "VOID_BUY_VOID_HISTORICAL_REQUEST_HISTORY_DISPOSITION_CENSUS_V1"
EXPECTED_HOSTNAME = v2.EXPECTED_HOSTNAME
EXPECTED_USER = v2.EXPECTED_USER
EXPECTED_UID = v2.EXPECTED_UID
MAX_FILE_BYTES = 64 * 1024 * 1024
REQUESTS_NAME = "requests.jsonl"
OPERATOR_EVENTS_NAME = "operator-events.jsonl"


class HistoryDispositionError(RuntimeError):
    pass


def _mode(value: dict[str, Any]) -> int | None:
    raw = value.get("mode")
    if not isinstance(raw, str):
        return None
    try:
        return int(raw, 8)
    except ValueError:
        return None


def _leaf_metadata_ok(value: dict[str, Any], runtime_uid: int) -> bool:
    size = value.get("size")
    return (
        value.get("exists") is True
        and value.get("kind") == "regular"
        and value.get("direct") is True
        and value.get("uid") == runtime_uid
        and value.get("nlink") == 1
        and _mode(value) == 0o600
        and isinstance(size, int)
        and 0 <= size <= MAX_FILE_BYTES
    )


def qualify_candidate_metadata(
    directory: dict[str, Any],
    requests: dict[str, Any],
    operator_events: dict[str, Any],
    *,
    runtime_uid: int,
) -> dict[str, Any]:
    all_absent = all(
        value.get("exists") is False
        for value in (directory, requests, operator_events)
    )
    if all_absent:
        return {
            "exists": False,
            "bounded_state_qualified": True,
            "directory_dev": None,
            "directory_ino": None,
            "requests_size": 0,
            "operator_events_size": 0,
        }

    directory_ok = (
        directory.get("exists") is True
        and directory.get("kind") == "directory"
        and directory.get("direct") is True
        and directory.get("uid") == runtime_uid
        and _mode(directory) == 0o700
    )
    requests_ok = _leaf_metadata_ok(requests, runtime_uid)
    operator_ok = _leaf_metadata_ok(operator_events, runtime_uid)
    return {
        "exists": directory.get("exists") is True,
        "bounded_state_qualified": directory_ok and requests_ok and operator_ok,
        "directory_dev": directory.get("dev"),
        "directory_ino": directory.get("ino"),
        "requests_size": requests.get("size"),
        "operator_events_size": operator_events.get("size"),
    }


def _same_stat(left: os.stat_result, right: os.stat_result) -> bool:
    return (
        left.st_dev == right.st_dev
        and left.st_ino == right.st_ino
        and left.st_mode == right.st_mode
        and left.st_uid == right.st_uid
        and left.st_gid == right.st_gid
        and left.st_nlink == right.st_nlink
        and left.st_size == right.st_size
        and left.st_mtime_ns == right.st_mtime_ns
        and left.st_ctime_ns == right.st_ctime_ns
    )


def pinned_bounded_digest(
    path: pathlib.Path,
    *,
    runtime_uid: int,
    expected_name: str,
) -> dict[str, Any]:
    if (
        not path.is_absolute()
        or path.name != expected_name
        or pathlib.Path(os.path.normpath(str(path))) != path
    ):
        raise HistoryDispositionError("candidate_file_path_invalid")

    dir_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC
    file_flags = os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC | os.O_NONBLOCK
    root_fd = os.open("/", dir_flags)
    opened: list[tuple[int, int, str]] = []
    file_fd = -1
    try:
        current_fd = root_fd
        for component in path.parts[1:-1]:
            visible = os.stat(component, dir_fd=current_fd, follow_symlinks=False)
            if not stat.S_ISDIR(visible.st_mode):
                raise HistoryDispositionError("candidate_ancestor_not_directory")
            next_fd = os.open(component, dir_flags, dir_fd=current_fd)
            bound = os.fstat(next_fd)
            if not _same_stat(visible, bound):
                os.close(next_fd)
                raise HistoryDispositionError("candidate_ancestor_rebound")
            opened.append((current_fd, next_fd, component))
            current_fd = next_fd

        visible_file = os.stat(path.name, dir_fd=current_fd, follow_symlinks=False)
        if (
            not stat.S_ISREG(visible_file.st_mode)
            or visible_file.st_uid != runtime_uid
            or stat.S_IMODE(visible_file.st_mode) != 0o600
            or visible_file.st_nlink != 1
            or visible_file.st_size < 0
            or visible_file.st_size > MAX_FILE_BYTES
        ):
            raise HistoryDispositionError("candidate_file_metadata_invalid")

        file_fd = os.open(path.name, file_flags, dir_fd=current_fd)
        before = os.fstat(file_fd)
        if not _same_stat(visible_file, before):
            raise HistoryDispositionError("candidate_file_rebound_before_read")

        data = bytearray()
        remaining = before.st_size
        while remaining:
            chunk = os.read(file_fd, min(1024 * 1024, remaining))
            if not chunk:
                raise HistoryDispositionError("candidate_file_short_read")
            data.extend(chunk)
            remaining -= len(chunk)
        if os.read(file_fd, 1):
            raise HistoryDispositionError("candidate_file_grew_during_read")

        after = os.fstat(file_fd)
        current_visible = os.stat(path.name, dir_fd=current_fd, follow_symlinks=False)
        if not _same_stat(before, after) or not _same_stat(after, current_visible):
            raise HistoryDispositionError("candidate_file_changed_during_read")

        for parent_fd, child_fd, component in opened:
            visible = os.stat(component, dir_fd=parent_fd, follow_symlinks=False)
            bound = os.fstat(child_fd)
            if not _same_stat(visible, bound):
                raise HistoryDispositionError("candidate_ancestor_changed_during_read")

        raw = bytes(data)
        return {
            "observed": True,
            "bytes": len(raw),
            "sha256": "sha256:" + hashlib.sha256(raw).hexdigest(),
        }
    except OSError as exc:
        raise HistoryDispositionError("candidate_file_read_failed") from exc
    finally:
        if file_fd >= 0:
            os.close(file_fd)
        for _, child_fd, _ in reversed(opened):
            os.close(child_fd)
        os.close(root_fd)


def observe_candidate(path: pathlib.Path, *, runtime_uid: int) -> dict[str, Any]:
    directory_before = v1.direct_path_metadata(path)
    requests_before = v1.direct_path_metadata(path / REQUESTS_NAME)
    operator_before = v1.direct_path_metadata(path / OPERATOR_EVENTS_NAME)
    qualified_before = qualify_candidate_metadata(
        directory_before,
        requests_before,
        operator_before,
        runtime_uid=runtime_uid,
    )

    result: dict[str, Any] = {
        "path_sha256": v1.sha256_text(str(path.absolute())),
        **qualified_before,
        "requests": {"observed": False, "bytes": None, "sha256": None},
        "operator_events": {"observed": False, "bytes": None, "sha256": None},
    }
    if qualified_before["exists"] is False:
        return result
    if qualified_before["bounded_state_qualified"] is not True:
        return result

    requests = pinned_bounded_digest(
        path / REQUESTS_NAME,
        runtime_uid=runtime_uid,
        expected_name=REQUESTS_NAME,
    )
    operator_events = pinned_bounded_digest(
        path / OPERATOR_EVENTS_NAME,
        runtime_uid=runtime_uid,
        expected_name=OPERATOR_EVENTS_NAME,
    )

    directory_after = v1.direct_path_metadata(path)
    requests_after = v1.direct_path_metadata(path / REQUESTS_NAME)
    operator_after = v1.direct_path_metadata(path / OPERATOR_EVENTS_NAME)
    qualified_after = qualify_candidate_metadata(
        directory_after,
        requests_after,
        operator_after,
        runtime_uid=runtime_uid,
    )
    if (
        qualified_before != qualified_after
        or requests["bytes"] != qualified_after["requests_size"]
        or operator_events["bytes"] != qualified_after["operator_events_size"]
    ):
        raise HistoryDispositionError("candidate_metadata_changed_during_observation")

    result["requests"] = requests
    result["operator_events"] = operator_events
    return result


def _candidate_paths(
    account: pwd.struct_passwd,
    process: dict[str, Any],
) -> list[tuple[str, pathlib.Path]]:
    cwd = process.get("cwd")
    if not isinstance(cwd, str) or not os.path.isabs(cwd):
        raise HistoryDispositionError("runtime_cwd_unavailable")
    return [
        (
            "runtime_cwd_default",
            pathlib.Path(cwd) / v1.DEFAULT_REQUEST_RELATIVE,
        ),
        (
            "historical_repo_default",
            pathlib.Path(account.pw_dir)
            / v1.HISTORICAL_REPO_RELATIVE
            / v1.DEFAULT_REQUEST_RELATIVE,
        ),
    ]


def classify_disposition(
    *,
    host_binding_qualified: bool,
    runtime_generation_stable: bool,
    observations_stable: bool,
    candidates: list[dict[str, Any]],
) -> dict[str, Any]:
    if not host_binding_qualified:
        return {
            "status": "HOLD_HOST_BINDING_REQUIRED",
            "historical_request_history_disposition_proven": False,
            "migration_required": False,
            "migration_authorized": False,
            "next_action": "REQUALIFY_DESIGNATED_PRECISION_HOST",
        }
    if not runtime_generation_stable or not observations_stable:
        return {
            "status": "HOLD_OBSERVATION_UNSTABLE",
            "historical_request_history_disposition_proven": False,
            "migration_required": False,
            "migration_authorized": False,
            "next_action": "REPEAT_READ_ONLY_HISTORY_CENSUS",
        }
    if any(item.get("bounded_state_qualified") is not True for item in candidates):
        return {
            "status": "HOLD_LEGACY_CANDIDATE_METADATA",
            "historical_request_history_disposition_proven": False,
            "migration_required": False,
            "migration_authorized": False,
            "next_action": "REVIEW_LEGACY_REQUEST_ROOT_METADATA",
        }

    surviving = False
    for item in candidates:
        if item.get("exists") is not True:
            continue
        for key in ("requests", "operator_events"):
            evidence = item.get(key)
            if not isinstance(evidence, dict) or evidence.get("observed") is not True:
                return {
                    "status": "HOLD_HISTORY_BYTES_NOT_OBSERVED",
                    "historical_request_history_disposition_proven": False,
                    "migration_required": False,
                    "migration_authorized": False,
                    "next_action": "REPEAT_READ_ONLY_HISTORY_CENSUS",
                }
            size = evidence.get("bytes")
            digest = evidence.get("sha256")
            if (
                not isinstance(size, int)
                or size < 0
                or size > MAX_FILE_BYTES
                or not isinstance(digest, str)
                or len(digest) != 71
                or not digest.startswith("sha256:")
            ):
                return {
                    "status": "HOLD_HISTORY_EVIDENCE_INVALID",
                    "historical_request_history_disposition_proven": False,
                    "migration_required": False,
                    "migration_authorized": False,
                    "next_action": "REPEAT_READ_ONLY_HISTORY_CENSUS",
                }
            surviving = surviving or size > 0

    if surviving:
        return {
            "status": "SURVIVING_HISTORY_OBSERVED_MIGRATION_PLAN_REQUIRED",
            "historical_request_history_disposition_proven": True,
            "migration_required": True,
            "migration_authorized": False,
            "next_action": "REVIEWED_HISTORY_MIGRATION_PLAN_REQUIRED",
        }
    return {
        "status": "NO_SURVIVING_BYTES_OBSERVED_EXTERNAL_ANCHOR_REQUIRED",
        "historical_request_history_disposition_proven": False,
        "migration_required": False,
        "migration_authorized": False,
        "next_action": "EXTERNAL_ROLLBACK_RESISTANT_ABSENCE_ANCHOR_REQUIRED",
    }


def self_test() -> None:
    absent = {
        "exists": False,
        "kind": None,
        "direct": None,
        "uid": None,
        "mode": None,
        "nlink": None,
        "size": None,
        "dev": None,
        "ino": None,
    }
    assert qualify_candidate_metadata(
        dict(absent), dict(absent), dict(absent), runtime_uid=1000
    )["bounded_state_qualified"] is True

    directory = {
        "exists": True,
        "kind": "directory",
        "direct": True,
        "uid": 1000,
        "mode": "0700",
        "dev": 1,
        "ino": 2,
    }
    leaf = {
        "exists": True,
        "kind": "regular",
        "direct": True,
        "uid": 1000,
        "gid": 1000,
        "mode": "0600",
        "nlink": 1,
        "size": 0,
        "dev": 1,
        "ino": 3,
    }
    qualified = qualify_candidate_metadata(
        dict(directory), dict(leaf), dict(leaf), runtime_uid=1000
    )
    assert qualified["bounded_state_qualified"] is True
    wrong_mode = dict(leaf)
    wrong_mode["mode"] = "0640"
    assert qualify_candidate_metadata(
        dict(directory), wrong_mode, dict(leaf), runtime_uid=1000
    )["bounded_state_qualified"] is False

    zero = {
        "exists": True,
        "bounded_state_qualified": True,
        "requests": {"observed": True, "bytes": 0, "sha256": "sha256:" + "0" * 64},
        "operator_events": {
            "observed": True,
            "bytes": 0,
            "sha256": "sha256:" + "1" * 64,
        },
    }
    nonzero = {
        **zero,
        "requests": {"observed": True, "bytes": 1, "sha256": "sha256:" + "2" * 64},
    }
    assert classify_disposition(
        host_binding_qualified=True,
        runtime_generation_stable=True,
        observations_stable=True,
        candidates=[nonzero],
    )["migration_required"] is True
    no_history = classify_disposition(
        host_binding_qualified=True,
        runtime_generation_stable=True,
        observations_stable=True,
        candidates=[zero],
    )
    assert no_history["historical_request_history_disposition_proven"] is False
    assert no_history["next_action"] == (
        "EXTERNAL_ROLLBACK_RESISTANT_ABSENCE_ANCHOR_REQUIRED"
    )


def plan() -> None:
    print(MARKER)
    for key, value in (
        ("mode", "plan"),
        ("read_only", "true"),
        ("sudo_required", "false"),
        ("filesystem_write", "false"),
        ("service_mutation", "false"),
        ("systemd_mutation", "false"),
        ("permission_mutation", "false"),
        ("external_network_calls", "false"),
        ("loopback_calls", "false"),
        ("request_operator_bytes_read", "false"),
        ("output_contains_request_or_operator_contents", "false"),
        ("credential_access", "false"),
        ("private_key_access", "false"),
        ("wallet_or_signer_access", "false"),
        ("transaction_signing", "false"),
        ("transaction_broadcast", "false"),
        ("payment_acceptance", "false"),
        ("public_presale_activation", "false"),
        ("funds_movement", "false"),
        ("migration_authorized", "false"),
        ("production_gate_ready", "false"),
    ):
        print(f"{key}={value}")
    print("next_action=RUN_EXPLICIT_READ_ONLY_HISTORY_DISPOSITION_CENSUS")


def collect() -> dict[str, Any]:
    if os.geteuid() == 0:
        raise HistoryDispositionError("ordinary_user_required")
    uid = os.geteuid()
    if uid != EXPECTED_UID:
        raise HistoryDispositionError("designated_runtime_uid_required")
    try:
        account = pwd.getpwuid(uid)
    except KeyError as exc:
        raise HistoryDispositionError("observer_user_identity_unavailable") from exc

    machine_before = v2.machine_id_sha256()
    user_before = v1.service_snapshot(user_manager=True)
    system_before = v1.service_snapshot(user_manager=False)
    process_before = v1.read_process_generation(int(user_before.get("main_pid") or 0))
    paths = _candidate_paths(account, process_before)

    first = [
        {"slot": slot, **observe_candidate(path, runtime_uid=uid)}
        for slot, path in paths
    ]
    second = [
        {"slot": slot, **observe_candidate(path, runtime_uid=uid)}
        for slot, path in paths
    ]

    user_after = v1.service_snapshot(user_manager=True)
    system_after = v1.service_snapshot(user_manager=False)
    process_after = v1.read_process_generation(int(user_after.get("main_pid") or 0))
    machine_after = v2.machine_id_sha256()

    runtime_generation_stable = v1.same_process_generation(
        user_before,
        process_before,
        user_after,
        process_after,
    )
    observations_stable = first == second
    machine_stable = machine_before is not None and machine_before == machine_after
    host_binding_qualified = (
        socket.gethostname() == EXPECTED_HOSTNAME
        and account.pw_name == EXPECTED_USER
        and uid == EXPECTED_UID
        and machine_stable
        and machine_before == v2.EXPECTED_MACHINE_ID_SHA256
        and user_before.get("active_running") is True
        and system_before.get("active_running") is False
        and system_after.get("active_running") is False
        and runtime_generation_stable
    )

    decision = classify_disposition(
        host_binding_qualified=host_binding_qualified,
        runtime_generation_stable=runtime_generation_stable,
        observations_stable=observations_stable,
        candidates=first,
    )
    return {
        "marker": MARKER,
        "version": 1,
        "mode": "read_only",
        "read_only": True,
        "sudo_used": False,
        "filesystem_write": False,
        "service_mutation": False,
        "systemd_mutation": False,
        "permission_mutation": False,
        "external_network_calls": False,
        "loopback_calls": False,
        "request_operator_bytes_read": True,
        "output_contains_request_or_operator_contents": False,
        "credential_access": False,
        "private_key_access": False,
        "wallet_or_signer_access": False,
        "transaction_signing": False,
        "transaction_broadcast": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "funds_movement": False,
        "host_binding_qualified": host_binding_qualified,
        "machine_id_stable": machine_stable,
        "runtime_process_generation_stable": runtime_generation_stable,
        "candidate_observations_stable": observations_stable,
        "candidates": first,
        **decision,
        "production_gate_ready": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--self-test", action="store_true")
    group.add_argument("--plan", action="store_true")
    group.add_argument("--run", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        print(MARKER + "_SELF_TEST_GREEN")
        return 0
    if args.plan:
        plan()
        return 0

    result = collect()
    print(MARKER)
    for key in (
        "mode",
        "read_only",
        "filesystem_write",
        "service_mutation",
        "systemd_mutation",
        "permission_mutation",
        "external_network_calls",
        "loopback_calls",
        "request_operator_bytes_read",
        "output_contains_request_or_operator_contents",
        "credential_access",
        "private_key_access",
        "wallet_or_signer_access",
        "transaction_signing",
        "transaction_broadcast",
        "payment_acceptance",
        "public_presale_activation",
        "funds_movement",
        "host_binding_qualified",
        "machine_id_stable",
        "runtime_process_generation_stable",
        "candidate_observations_stable",
        "historical_request_history_disposition_proven",
        "migration_required",
        "migration_authorized",
        "production_gate_ready",
    ):
        value = result[key]
        print(f"{key}={str(value).lower() if isinstance(value, bool) else value}")
    for candidate in result["candidates"]:
        slot = candidate["slot"]
        print(f"{slot}_exists={str(candidate['exists']).lower()}")
        print(
            f"{slot}_bounded_state_qualified="
            + str(candidate["bounded_state_qualified"]).lower()
        )
        if candidate["exists"] is True:
            print(f"{slot}_requests_bytes={candidate['requests']['bytes']}")
            print(f"{slot}_requests_sha256={candidate['requests']['sha256']}")
            print(
                f"{slot}_operator_events_bytes="
                + str(candidate["operator_events"]["bytes"])
            )
            print(
                f"{slot}_operator_events_sha256="
                + str(candidate["operator_events"]["sha256"])
            )
    print("status=" + result["status"])
    print("next_action=" + result["next_action"])
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except HistoryDispositionError as exc:
        print(MARKER)
        print("mode=read_only")
        print("status=HOLD")
        print("reason=" + str(exc))
        print("filesystem_write=false")
        print("service_mutation=false")
        print("systemd_mutation=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        print("migration_authorized=false")
        print("production_gate_ready=false")
        raise SystemExit(2)
