#!/usr/bin/env python3
from __future__ import annotations

import argparse
import grp
import importlib.util
import os
import pathlib
import pwd
import socket
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
REQUESTS_NAME = "requests.jsonl"
OPERATOR_EVENTS_NAME = "operator-events.jsonl"
MAX_REQUESTS_BYTES = 64 * 1024 * 1024
MAX_OPERATOR_EVENTS_BYTES = 64 * 1024 * 1024


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
        "requests_exists": requests.get("exists") is True,
        "requests_uid": requests.get("uid"),
        "requests_gid": requests.get("gid"),
        "requests_mode": requests.get("mode"),
        "requests_nlink": requests.get("nlink"),
        "requests_size_bounded": requests_ok,
        "operator_events_exists": operator_events.get("exists") is True,
        "operator_events_uid": operator_events.get("uid"),
        "operator_events_gid": operator_events.get("gid"),
        "operator_events_mode": operator_events.get("mode"),
        "operator_events_nlink": operator_events.get("nlink"),
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
            "fixed_target_matches": pathlib.Path(request_dir) == TARGET_ROOT,
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


def self_test() -> None:
    directory = {
        "exists": True,
        "kind": "directory",
        "direct": True,
        "uid": 1000,
        "gid": 980,
        "mode": "0750",
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
    }
    ok = qualify_target_metadata(
        dict(directory), dict(leaf), dict(leaf), runtime_uid=1000, ipc_gid=980
    )
    assert ok["metadata_qualified"] is True
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
    print(f"{MARKER}_SELF_TEST_GREEN")
    print("fixed_target_policy=0750_0640")
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
        ("request_payment_contents_read", "false"),
        ("historical_request_history_disposition_proven", "false"),
        ("migration_authorized", "false"),
        ("payment_acceptance", "false"),
        ("public_presale_activation", "false"),
        ("funds_movement", "false"),
        ("production_gate_ready", "false"),
    ):
        print(f"{key}={value}")
    print("next_action=RUN_READ_ONLY_V2_TOPOLOGY_CENSUS_AFTER_POLICY_ACCEPTANCE")


def collect() -> dict[str, Any]:
    if os.geteuid() == 0:
        raise CensusV2Error("ordinary_user_required")
    uid = os.geteuid()
    try:
        account = pwd.getpwuid(uid)
    except KeyError as exc:
        raise CensusV2Error("observer_user_identity_unavailable") from exc
    try:
        ipc = grp.getgrnam(IPC_GROUP)
        ipc_group_present = True
        ipc_gid = ipc.gr_gid
    except KeyError:
        ipc_group_present = False
        ipc_gid = -1

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
    target = (
        target_metadata(uid, ipc_gid)
        if ipc_group_present
        else {
            "exists": v1.direct_path_metadata(TARGET_ROOT).get("exists") is True,
            "metadata_qualified": False,
        }
    )

    listener = v1.runtime_http_listener_binding(int(user_before.get("main_pid") or 0))
    status = classify_target_status(v1.bounded_local_json(v1.CONFIRMED_CLOSEOUT_STATUS_PATH))
    user_after = v1.service_snapshot(user_manager=True)
    process_after = v1.read_process_generation(int(user_after.get("main_pid") or 0))
    generation_stable = v1.same_process_generation(
        user_before, process_before, user_after, process_after
    )

    live_binding = (
        socket.gethostname() == EXPECTED_HOSTNAME
        and account.pw_name == EXPECTED_USER
        and uid == EXPECTED_UID
        and ipc_group_present
        and user_before.get("active_running") is True
        and system_service.get("active_running") is False
        and generation_stable
        and listener.get("owned_by_runtime_pid") is True
        and listener.get("loopback_listener_observed") is True
        and status.get("observed") is True
        and status.get("marker_ok") is True
        and status.get("explicit_override_observed") is True
        and status.get("fixed_target_matches") is True
        and target.get("metadata_qualified") is True
    )
    legacy_exists = _distinct_candidate_count(
        cwd_candidate, historical_candidate, "exists"
    )
    legacy_qualified = _distinct_candidate_count(
        cwd_candidate, historical_candidate, "metadata_qualified"
    )

    if live_binding:
        next_action = "TARGET_LIVE_BINDING_OBSERVED_HISTORY_DISPOSITION_REQUIRED"
    elif target.get("metadata_qualified") is True:
        next_action = "TARGET_METADATA_QUALIFIED_HISTORY_AND_LIVE_BINDING_REQUIRED"
    elif target.get("exists") is True:
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
            "ipc_group_present": ipc_group_present,
            "ipc_gid": ipc_gid if ipc_group_present else None,
        },
        "runtime_user_service_active": user_before.get("active_running") is True,
        "runtime_system_service_active": system_service.get("active_running") is True,
        "runtime_process_generation_stable": generation_stable,
        "runtime_http_listener": listener,
        "target_request_root": target,
        "confirmed_closeout_status": status,
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
    print("ipc_group_present=" + str(host["ipc_group_present"]).lower())
    print("ipc_gid=" + str(host["ipc_gid"]))
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
