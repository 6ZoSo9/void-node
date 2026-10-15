#!/usr/bin/env python3
from __future__ import annotations

import argparse
import grp
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
_spec = importlib.util.spec_from_file_location(
    "void_buy_request_root_runtime_topology_census_v1", V1_PATH
)
assert _spec is not None and _spec.loader is not None
v1 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(v1)

MARKER = "VOID_BUY_VOID_REQUEST_ROOT_RUNTIME_TOPOLOGY_CENSUS_V2"
PROFILE_ID = "custody_readable_request_root_0750_0640_v1"
TARGET_ROOT = pathlib.Path("/var/lib/void-buy-request-journal-v1")
IPC_GROUP = "void-buy-custody-ipc"
EXPECTED_HOSTNAME = "zoso-Precision-Tower-7810"
EXPECTED_USER = "zoso"
EXPECTED_UID = 1000
EXPECTED_MACHINE_ID_SHA256 = (
    "11be124fb6d2d08003b89e467cef7e8b17d6dfb73592ccbe0984545ff1bcb0e2"
)
REQUESTS_NAME = "requests.jsonl"
OPERATOR_EVENTS_NAME = "operator-events.jsonl"
MAX_REQUESTS_BYTES = 64 * 1024 * 1024
MAX_OPERATOR_EVENTS_BYTES = 64 * 1024 * 1024
AUTHENTICATED_USER_MANAGER_BINDING_VERIFIED = False


class CensusV2Error(RuntimeError):
    pass


def _leaf_ok(
    value: dict[str, Any],
    *,
    runtime_uid: int,
    ipc_gid: int,
    maximum_size: int,
) -> bool:
    if (
        value.get("exists") is not True
        or value.get("kind") != "regular"
        or value.get("direct") is not True
        or value.get("uid") != runtime_uid
        or value.get("gid") != ipc_gid
        or value.get("mode") != "0640"
        or value.get("nlink") != 1
        or not isinstance(value.get("size"), int)
        or value.get("size") < 0
        or value.get("size") > maximum_size
    ):
        return False
    return True


def qualify_target_metadata(
    directory: dict[str, Any],
    requests: dict[str, Any],
    operator_events: dict[str, Any],
    *,
    runtime_uid: int,
    ipc_gid: int,
) -> dict[str, Any]:
    overlaps = v1.path_overlap(TARGET_ROOT, v1.LEDGER_ROOT) or v1.path_overlap(
        TARGET_ROOT, v1.CUSTODY_ROOT
    )
    directory_ok = (
        directory.get("exists") is True
        and directory.get("kind") == "directory"
        and directory.get("direct") is True
        and directory.get("uid") == runtime_uid
        and directory.get("gid") == ipc_gid
        and directory.get("mode") == "0750"
    )
    requests_ok = _leaf_ok(
        requests,
        runtime_uid=runtime_uid,
        ipc_gid=ipc_gid,
        maximum_size=MAX_REQUESTS_BYTES,
    )
    operator_ok = _leaf_ok(
        operator_events,
        runtime_uid=runtime_uid,
        ipc_gid=ipc_gid,
        maximum_size=MAX_OPERATOR_EVENTS_BYTES,
    )
    return {
        "exists": directory.get("exists") is True,
        "directory_kind": directory.get("kind"),
        "directory_uid": directory.get("uid"),
        "directory_gid": directory.get("gid"),
        "directory_mode": directory.get("mode"),
        "directory_direct": directory.get("direct"),
        "directory_dev": directory.get("dev"),
        "directory_ino": directory.get("ino"),
        "requests_exists": requests.get("exists") is True,
        "requests_uid": requests.get("uid"),
        "requests_gid": requests.get("gid"),
        "requests_mode": requests.get("mode"),
        "requests_nlink": requests.get("nlink"),
        "requests_dev": requests.get("dev"),
        "requests_ino": requests.get("ino"),
        "requests_size": requests.get("size"),
        "requests_size_bounded": requests_ok,
        "operator_events_exists": operator_events.get("exists") is True,
        "operator_events_uid": operator_events.get("uid"),
        "operator_events_gid": operator_events.get("gid"),
        "operator_events_mode": operator_events.get("mode"),
        "operator_events_nlink": operator_events.get("nlink"),
        "operator_events_dev": operator_events.get("dev"),
        "operator_events_ino": operator_events.get("ino"),
        "operator_events_size": operator_events.get("size"),
        "operator_events_size_bounded": operator_ok,
        "overlaps_protected_storage": overlaps,
        "metadata_qualified": directory_ok
        and requests_ok
        and operator_ok
        and not overlaps,
    }


def target_metadata(runtime_uid: int, ipc_gid: int) -> dict[str, Any]:
    return qualify_target_metadata(
        v1.direct_path_metadata(TARGET_ROOT),
        v1.direct_path_metadata(TARGET_ROOT / REQUESTS_NAME),
        v1.direct_path_metadata(TARGET_ROOT / OPERATOR_EVENTS_NAME),
        runtime_uid=runtime_uid,
        ipc_gid=ipc_gid,
    )


def same_target_metadata_generation(
    first: dict[str, Any], second: dict[str, Any]
) -> bool:
    return first == second and first.get("metadata_qualified") is True


def classify_target_status(observation: dict[str, Any]) -> dict[str, Any]:
    body = observation.get("body")
    base = {
        "observed": False,
        "marker_ok": False,
        "explicit_override_observed": False,
        "fixed_target_matches": False,
        "request_dir_sha256": None,
    }
    if not isinstance(body, dict):
        return base
    request_dir = body.get("request_dir")
    if (
        body.get("marker") != "VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_V1"
        or not isinstance(request_dir, str)
        or not os.path.isabs(request_dir)
    ):
        return base
    base.update(
        {
            "observed": observation.get("observed") is True,
            "marker_ok": True,
            "explicit_override_observed":
                body.get("request_dir_source") == "VOID_BUY_REQUEST_DIR",
            "fixed_target_matches": request_dir == str(TARGET_ROOT),
            "request_dir_sha256": v1.sha256_text(str(pathlib.Path(request_dir))),
        }
    )
    return base


def _distinct_candidate_count(
    first: dict[str, Any],
    second: dict[str, Any],
    key: str,
) -> int:
    if v1.same_candidate_inode(first, second):
        return 1 if first.get(key) is True or second.get(key) is True else 0
    return sum(1 for value in (first, second) if value.get(key) is True)


def resolve_ipc_group() -> tuple[bool, int]:
    try:
        return True, grp.getgrnam(IPC_GROUP).gr_gid
    except KeyError:
        return False, -1


def machine_id_sha256() -> str | None:
    path = pathlib.Path("/etc/machine-id")
    before = v1.direct_path_metadata(path)
    try:
        mode = int(str(before.get("mode")), 8)
    except (TypeError, ValueError):
        return None
    if (
        before.get("exists") is not True
        or before.get("kind") != "regular"
        or before.get("direct") is not True
        or before.get("uid") != 0
        or before.get("nlink") != 1
        or not isinstance(before.get("size"), int)
        or before.get("size") <= 0
        or before.get("size") > 4096
        or mode & 0o022
    ):
        return None
    try:
        fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    except OSError:
        return None
    try:
        first = os.fstat(fd)
        if (
            not stat.S_ISREG(first.st_mode)
            or first.st_uid != 0
            or first.st_nlink != 1
            or first.st_size != before.get("size")
            or first.st_dev != before.get("dev")
            or first.st_ino != before.get("ino")
            or stat.S_IMODE(first.st_mode) != mode
        ):
            return None
        raw = bytearray()
        while len(raw) < first.st_size:
            chunk = os.read(fd, first.st_size - len(raw))
            if not chunk:
                return None
            raw.extend(chunk)
        if os.read(fd, 1):
            return None
        second = os.fstat(fd)
    finally:
        os.close(fd)
    after = v1.direct_path_metadata(path)
    if (
        first.st_dev != second.st_dev
        or first.st_ino != second.st_ino
        or first.st_size != second.st_size
        or stat.S_IMODE(first.st_mode) != stat.S_IMODE(second.st_mode)
        or before.get("dev") != after.get("dev")
        or before.get("ino") != after.get("ino")
        or before.get("size") != after.get("size")
        or before.get("mode") != after.get("mode")
        or after.get("direct") is not True
    ):
        return None
    try:
        machine = bytes(raw).decode("ascii", "strict").strip()
    except UnicodeDecodeError:
        return None
    if len(machine) != 32 or any(ch not in "0123456789abcdef" for ch in machine):
        return None
    return hashlib.sha256(machine.encode("ascii")).hexdigest()


def self_test() -> None:
    directory = {
        "exists": True,
        "kind": "directory",
        "direct": True,
        "uid": 1000,
        "gid": 980,
        "mode": "0750",
        "dev": 11,
        "ino": 21,
    }
    leaf = {
        "exists": True,
        "kind": "regular",
        "direct": True,
        "uid": 1000,
        "gid": 980,
        "mode": "0640",
        "nlink": 1,
        "size": 0,
        "dev": 11,
        "ino": 22,
    }
    ok = qualify_target_metadata(
        dict(directory), dict(leaf), dict(leaf), runtime_uid=1000, ipc_gid=980
    )
    assert ok["metadata_qualified"] is True
    assert same_target_metadata_generation(ok, dict(ok)) is True
    rebound = dict(ok)
    rebound["requests_ino"] = 23
    assert same_target_metadata_generation(ok, rebound) is False
    wrong_mode = dict(directory)
    wrong_mode["mode"] = "0700"
    assert qualify_target_metadata(
        wrong_mode, dict(leaf), dict(leaf), runtime_uid=1000, ipc_gid=980
    )["metadata_qualified"] is False
    wrong_gid = dict(leaf)
    wrong_gid["gid"] = 981
    assert qualify_target_metadata(
        dict(directory), wrong_gid, dict(leaf), runtime_uid=1000, ipc_gid=980
    )["metadata_qualified"] is False
    linked = dict(leaf)
    linked["nlink"] = 2
    assert qualify_target_metadata(
        dict(directory), dict(leaf), linked, runtime_uid=1000, ipc_gid=980
    )["metadata_qualified"] is False
    status = classify_target_status(
        {
            "observed": True,
            "body": {
                "marker": "VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_V1",
                "request_dir": str(TARGET_ROOT),
                "request_dir_source": "VOID_BUY_REQUEST_DIR",
            },
        }
    )
    assert status["observed"] is True
    assert status["fixed_target_matches"] is True
    assert status["explicit_override_observed"] is True
    wrong_source = classify_target_status(
        {
            "observed": True,
            "body": {
                "marker": "VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_V1",
                "request_dir": str(TARGET_ROOT),
                "request_dir_source": "server_default",
            },
        }
    )
    assert wrong_source["explicit_override_observed"] is False
    assert len(EXPECTED_MACHINE_ID_SHA256) == 64
    assert all(ch in "0123456789abcdef" for ch in EXPECTED_MACHINE_ID_SHA256)
    assert AUTHENTICATED_USER_MANAGER_BINDING_VERIFIED is False
    print(f"{MARKER}_SELF_TEST_GREEN")
    print("fixed_target_policy=0750_0640")
    print("double_census_stability_required=true")
    print("designated_machine_id_binding_required=true")
    print("authenticated_user_manager_binding_verified=false")
    print("request_payment_contents_read=false")
    print("historical_request_history_disposition_proven=false")
    print("production_gate_ready=false")


def plan() -> None:
    print(MARKER)
    for key, value in (
        ("mode", "--plan"),
        ("read_only", "true"),
        ("profile_id", PROFILE_ID),
        ("target_root", str(TARGET_ROOT)),
        ("ipc_group", IPC_GROUP),
        ("sudo_required", "false"),
        ("filesystem_write", "false"),
        ("service_mutation", "false"),
        ("systemd_mutation", "false"),
        ("permission_mutation", "false"),
        ("mount_mutation", "false"),
        ("external_network_calls", "false"),
        ("loopback_get_only", "true"),
        ("process_environment_access", "false"),
        ("machine_id_raw_output", "false"),
        ("request_payment_contents_read", "false"),
        ("authenticated_user_manager_binding_verified", "false"),
        ("historical_request_history_disposition_proven", "false"),
        ("migration_authorized", "false"),
        ("payment_acceptance", "false"),
        ("public_presale_activation", "false"),
        ("funds_movement", "false"),
        ("production_gate_ready", "false"),
    ):
        print(f"{key}={value}")
    print("next_action=INTEGRATE_MERGED_3057_AUTHENTICATED_USER_MANAGER_BINDING")


def collect() -> dict[str, Any]:
    if os.geteuid() == 0:
        raise CensusV2Error("ordinary_user_required")
    uid = os.geteuid()
    try:
        account = pwd.getpwuid(uid)
    except KeyError as exc:
        raise CensusV2Error("observer_user_identity_unavailable") from exc
    ipc_group_present_before, ipc_gid_before = resolve_ipc_group()
    machine_id_before = machine_id_sha256()

    user_before = v1.service_snapshot(user_manager=True)
    system_service = v1.service_snapshot(user_manager=False)
    process_before = v1.read_process_generation(int(user_before.get("main_pid") or 0))
    cwd = process_before.get("cwd")
    if isinstance(cwd, str) and os.path.isabs(cwd):
        cwd_candidate_path = pathlib.Path(cwd) / v1.DEFAULT_REQUEST_RELATIVE
    else:
        cwd_candidate_path = pathlib.Path("/nonexistent/void-request-root-candidate")
    historical_candidate_path = (
        pathlib.Path(account.pw_dir)
        / v1.HISTORICAL_REPO_RELATIVE
        / v1.DEFAULT_REQUEST_RELATIVE
    )

    cwd_candidate = v1.request_root_candidate(cwd_candidate_path, uid)
    historical_candidate = v1.request_root_candidate(historical_candidate_path, uid)
    target_before = (
        target_metadata(uid, ipc_gid_before)
        if ipc_group_present_before
        else {
            "exists": v1.direct_path_metadata(TARGET_ROOT).get("exists") is True,
            "metadata_qualified": False,
        }
    )

    listener_before = v1.runtime_http_listener_binding(
        int(user_before.get("main_pid") or 0)
    )
    status_before = classify_target_status(
        v1.bounded_local_json(v1.CONFIRMED_CLOSEOUT_STATUS_PATH)
    )

    user_after = v1.service_snapshot(user_manager=True)
    system_service_after = v1.service_snapshot(user_manager=False)
    process_after = v1.read_process_generation(int(user_after.get("main_pid") or 0))
    ipc_group_present_after, ipc_gid_after = resolve_ipc_group()
    machine_id_after = machine_id_sha256()
    target_after = (
        target_metadata(uid, ipc_gid_after)
        if ipc_group_present_after
        else {
            "exists": v1.direct_path_metadata(TARGET_ROOT).get("exists") is True,
            "metadata_qualified": False,
        }
    )
    listener_after = v1.runtime_http_listener_binding(
        int(user_after.get("main_pid") or 0)
    )
    status_after = classify_target_status(
        v1.bounded_local_json(v1.CONFIRMED_CLOSEOUT_STATUS_PATH)
    )

    generation_stable = v1.same_process_generation(
        user_before, process_before, user_after, process_after
    )
    ipc_group_stable = (
        ipc_group_present_before
        and ipc_group_present_after
        and ipc_gid_before == ipc_gid_after
    )
    machine_id_stable = (
        machine_id_before is not None
        and machine_id_before == machine_id_after
    )
    machine_id_matches_expected = (
        machine_id_stable
        and machine_id_before == EXPECTED_MACHINE_ID_SHA256
    )
    target_metadata_generation_stable = same_target_metadata_generation(
        target_before, target_after
    )
    runtime_http_listener_stable = (
        listener_before == listener_after
        and listener_before.get("owned_by_runtime_pid") is True
        and listener_before.get("loopback_listener_observed") is True
    )
    confirmed_closeout_status_stable = (
        status_before == status_after
        and status_before.get("observed") is True
        and status_before.get("marker_ok") is True
        and status_before.get("explicit_override_observed") is True
        and status_before.get("fixed_target_matches") is True
    )

    unauthenticated_runtime_candidate_observed = (
        socket.gethostname() == EXPECTED_HOSTNAME
        and account.pw_name == EXPECTED_USER
        and uid == EXPECTED_UID
        and machine_id_matches_expected
        and ipc_group_stable
        and user_before.get("active_running") is True
        and system_service.get("active_running") is False
        and system_service_after.get("active_running") is False
        and generation_stable
        and runtime_http_listener_stable
        and confirmed_closeout_status_stable
        and target_metadata_generation_stable
    )
    live_binding = (
        unauthenticated_runtime_candidate_observed
        and AUTHENTICATED_USER_MANAGER_BINDING_VERIFIED
    )
    legacy_exists = _distinct_candidate_count(
        cwd_candidate, historical_candidate, "exists"
    )
    legacy_qualified = _distinct_candidate_count(
        cwd_candidate, historical_candidate, "metadata_qualified"
    )

    if live_binding:
        next_action = "TARGET_LIVE_BINDING_OBSERVED_HISTORY_DISPOSITION_REQUIRED"
    elif unauthenticated_runtime_candidate_observed:
        next_action = "AUTHENTICATED_USER_MANAGER_BINDING_REQUIRED"
    elif target_before.get("metadata_qualified") is True:
        next_action = "TARGET_METADATA_QUALIFIED_HISTORY_AND_LIVE_BINDING_REQUIRED"
    elif target_before.get("exists") is True:
        next_action = "TARGET_METADATA_HOLD"
    else:
        next_action = "TARGET_NOT_PROVISIONED_HISTORY_DISPOSITION_REQUIRED_BEFORE_APPLY"

    return {
        "marker": MARKER,
        "version": 2,
        "profile_id": PROFILE_ID,
        "mode": "read_only",
        "read_only": True,
        "sudo_used": False,
        "filesystem_write": False,
        "service_mutation": False,
        "systemd_mutation": False,
        "permission_mutation": False,
        "mount_mutation": False,
        "external_network_calls": False,
        "loopback_get_only": True,
        "process_environment_access": False,
        "request_payment_contents_read": False,
        "credential_access": False,
        "private_key_access": False,
        "wallet_or_signer_access": False,
        "transaction_signing": False,
        "transaction_broadcast": False,
        "chain2050_mutation": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "funds_movement": False,
        "host": {
            "hostname_matches_precision": socket.gethostname() == EXPECTED_HOSTNAME,
            "effective_user_is_zoso": account.pw_name == EXPECTED_USER,
            "effective_uid": uid,
            "machine_id_stable": machine_id_stable,
            "machine_id_matches_expected": machine_id_matches_expected,
            "ipc_group_present": ipc_group_present_before,
            "ipc_gid": ipc_gid_before if ipc_group_present_before else None,
            "ipc_group_stable": ipc_group_stable,
        },
        "runtime_user_service_active": user_before.get("active_running") is True,
        "runtime_system_service_active": system_service.get("active_running") is True,
        "runtime_process_generation_stable": generation_stable,
        "authenticated_user_manager_binding_verified":
            AUTHENTICATED_USER_MANAGER_BINDING_VERIFIED,
        "unauthenticated_runtime_candidate_observed":
            unauthenticated_runtime_candidate_observed,
        "runtime_http_listener": listener_before,
        "runtime_http_listener_stable": runtime_http_listener_stable,
        "target_request_root": target_before,
        "target_metadata_generation_stable": target_metadata_generation_stable,
        "confirmed_closeout_status": status_before,
        "confirmed_closeout_status_stable": confirmed_closeout_status_stable,
        "target_live_binding_qualified": live_binding,
        "legacy_candidate_exists_count": legacy_exists,
        "legacy_metadata_qualified_candidate_count": legacy_qualified,
        "historical_request_history_disposition_proven": False,
        "migration_authorized": False,
        "production_gate_ready": False,
        "next_action": next_action,
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
        "mount_mutation",
        "external_network_calls",
        "loopback_get_only",
        "process_environment_access",
        "request_payment_contents_read",
        "credential_access",
        "private_key_access",
        "wallet_or_signer_access",
        "transaction_signing",
        "transaction_broadcast",
        "chain2050_mutation",
        "payment_acceptance",
        "public_presale_activation",
        "funds_movement",
    ):
        value = result[key]
        print(f"{key}={str(value).lower() if isinstance(value, bool) else value}")
    host = result["host"]
    print("hostname_matches_precision=" + str(host["hostname_matches_precision"]).lower())
    print("effective_user_is_zoso=" + str(host["effective_user_is_zoso"]).lower())
    print("machine_id_stable=" + str(host["machine_id_stable"]).lower())
    print("machine_id_matches_expected=" + str(host["machine_id_matches_expected"]).lower())
    print("ipc_group_present=" + str(host["ipc_group_present"]).lower())
    print("ipc_gid=" + str(host["ipc_gid"]))
    print("ipc_group_stable=" + str(host["ipc_group_stable"]).lower())
    print("authenticated_user_manager_binding_verified=" + str(result["authenticated_user_manager_binding_verified"]).lower())
    print("unauthenticated_runtime_candidate_observed=" + str(result["unauthenticated_runtime_candidate_observed"]).lower())
    print("runtime_http_listener_stable=" + str(result["runtime_http_listener_stable"]).lower())
    print("confirmed_closeout_status_stable=" + str(result["confirmed_closeout_status_stable"]).lower())
    print("target_metadata_generation_stable=" + str(result["target_metadata_generation_stable"]).lower())
    target = result["target_request_root"]
    print("target_root_exists=" + str(target.get("exists") is True).lower())
    print("target_root_metadata_qualified=" + str(target.get("metadata_qualified") is True).lower())
    print("target_live_binding_qualified=" + str(result["target_live_binding_qualified"]).lower())
    print("legacy_candidate_exists_count=" + str(result["legacy_candidate_exists_count"]))
    print("legacy_metadata_qualified_candidate_count=" + str(result["legacy_metadata_qualified_candidate_count"]))
    print("historical_request_history_disposition_proven=false")
    print("migration_authorized=false")
    print("production_gate_ready=false")
    print("next_action=" + result["next_action"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
