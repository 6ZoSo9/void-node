#!/usr/bin/env python3
# Source-only contract for a future protected root-owned all-process census.
import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_CENSUS_PLAN_V1"
)
if (
    _bootstrap_sys.flags.isolated != 1
    or not getattr(_bootstrap_sys.flags, "safe_path", False)
    or _bootstrap_sys.flags.dont_write_bytecode != 1
    or _bootstrap_sys.flags.optimize != 0
    or not __debug__
):
    if __name__ == "__main__":
        print(_BOOTSTRAP_MARKER)
        print("status=HOLD")
        print("reason=python_isolated_unoptimized_nobytecode_mode_required")
        print("filesystem_write=false")
        print("host_process_census_performed=false")
        print("replacement_apply_authorized=false")
        raise SystemExit(2)
    raise RuntimeError("python_isolated_unoptimized_nobytecode_mode_required")

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
from typing import Any

MARKER = _BOOTSTRAP_MARKER
SCHEMA = "void_buy_void_custody_runtime_v3_protected_all_process_census_plan_v1"
VERSION = 1
ROOT = Path(__file__).resolve().parents[2]

PARENT_HEAD = "7736a3a5c53da37448c357a5d98e4dad09f3f617"
PARENT_PROCESS_REL = (
    "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_process_reference_census_v1.py"
)
PARENT_PROCESS_BLOB = "6bf476e3383b7b18966320df13b4041da9c8c11f"

PRESTATE_HEAD = "7736a3a5c53da37448c357a5d98e4dad09f3f617"
PRESTATE_REL = (
    "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_install_prestate_census_v1.py"
)
PRESTATE_BLOB = "e32ebd94ad09cd80e03489079e74657aab159d7a"


ARCHIVE_LOCK_REL = (
    "ops/security/"
    "buy-void-allocation-custody-runtime-install-archive-lock-v3.json"
)
ARCHIVE_LOCK_BLOB = "edb4ea2b833373ab387762e45ba7da4032c860f3"
ARCHIVE_LOCK_SHA256 = (
    "ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7"
)

TARGET_HOST = "zoso-Precision-Tower-7810"
TARGET_RUNTIME = "/opt/void-buy-allocation-custody-runtime-v1"
PROTECTED_SOURCE_ROOT = (
    "/opt/void-buy-allocation-custody-process-reference-v3-reviewed-v1"
)
PROTECTED_ENTRYPOINT = (
    PROTECTED_SOURCE_ROOT
    + "/void_buy_allocation_custody_runtime_v3_all_process_reference_census_v1.py"
)

MAX_SOURCE_BYTES = 4 * 1024 * 1024


class PlanHold(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise PlanHold("custody_v3_protected_all_process_plan_" + reason)


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


def canonical(value: object) -> bytes:
    return (
        json.dumps(
            value,
            sort_keys=True,
            ensure_ascii=True,
            separators=(",", ":"),
        )
        + "\n"
    ).encode("utf-8")


def _generation(
    st: os.stat_result,
) -> tuple[int, int, int, int, int, int, int, int, int]:
    return (
        st.st_dev,
        st.st_ino,
        st.st_uid,
        st.st_gid,
        st.st_mode,
        st.st_nlink,
        st.st_size,
        st.st_mtime_ns,
        st.st_ctime_ns,
    )


def read_repo_regular(path: Path, maximum: int = MAX_SOURCE_BYTES) -> bytes:
    before = os.stat(path, follow_symlinks=False)
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_size < 1
        or before.st_size > maximum
    ):
        hold("source_file_shape_invalid:" + path.name)
    flags = os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK
    fd = os.open(path, flags)
    try:
        opened = os.fstat(fd)
        if _generation(before) != _generation(opened):
            hold("source_file_rebound:" + path.name)
        raw = bytearray()
        while len(raw) < opened.st_size:
            chunk = os.read(fd, min(65536, opened.st_size - len(raw)))
            if not chunk:
                hold("source_file_short_read:" + path.name)
            raw.extend(chunk)
        if os.read(fd, 1):
            hold("source_file_grew:" + path.name)
        after = os.fstat(fd)
        visible = os.stat(path, follow_symlinks=False)
        if (
            _generation(opened) != _generation(after)
            or _generation(after) != _generation(visible)
        ):
            hold("source_file_generation_changed:" + path.name)
        return bytes(raw)
    finally:
        os.close(fd)


def require_blob(relative: str, expected_blob: str) -> dict[str, Any]:
    raw = read_repo_regular(ROOT / relative)
    actual = git_blob(raw)
    if actual != expected_blob:
        hold("source_blob_mismatch:" + relative)
    return {
        "path": relative,
        "git_blob_sha1": actual,
        "bytes": len(raw),
        "sha256": sha256(raw),
    }


def verify_inputs() -> dict[str, Any]:
    if os.getuid() == 0 or os.geteuid() == 0:
        hold("root_execution_forbidden_for_source_plan")

    parent = require_blob(PARENT_PROCESS_REL, PARENT_PROCESS_BLOB)
    prestate = require_blob(PRESTATE_REL, PRESTATE_BLOB)
    lock = require_blob(ARCHIVE_LOCK_REL, ARCHIVE_LOCK_BLOB)
    lock_raw = read_repo_regular(ROOT / ARCHIVE_LOCK_REL, 128 * 1024)
    if sha256(lock_raw) != ARCHIVE_LOCK_SHA256:
        hold("archive_lock_sha256_mismatch")
    try:
        parsed = json.loads(lock_raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        hold("archive_lock_json_invalid:" + type(exc).__name__)
    if (
        type(parsed) is not dict
        or parsed.get("archive_candidate_accepted") is not True
        or parsed.get("existing_target_replaced") is not False
        or parsed.get("runtime_integration") is not False
        or parsed.get("payment_acceptance") is not False
        or parsed.get("public_presale_activation") is not False
        or parsed.get("funds_movement") is not False
    ):
        hold("archive_lock_authority_invalid")
    return {
        "parent_process_reference": parent,
        "prestate": prestate,
        "archive_lock": lock,
    }


def build_plan() -> dict[str, Any]:
    inputs = verify_inputs()
    body = {
        "schema": SCHEMA,
        "marker": MARKER,
        "version": VERSION,
        "status": "SOURCE_ONLY_PROTECTED_ALL_PROCESS_CENSUS_PLAN",
        "target_host": TARGET_HOST,
        "target_runtime": TARGET_RUNTIME,
        "inputs": {
            "parent_process_reference_head": PARENT_HEAD,
            "parent_process_reference": inputs["parent_process_reference"],
            "prestate_head": PRESTATE_HEAD,
            "prestate": inputs["prestate"],
            "archive_lock": inputs["archive_lock"],
        },
        "future_protected_source": {
            "root": PROTECTED_SOURCE_ROOT,
            "entrypoint": PROTECTED_ENTRYPOINT,
            "installation_required_before_root_execution": True,
            "root_owned_required": True,
            "group_world_writable_forbidden": True,
            "direct_non_symlink_ancestry_required": True,
            "exact_reviewed_bytes_required": True,
            "source_digest_revalidation_at_use_required": True,
            "mutable_checkout_root_execution_forbidden": True,
            "sudo_python_checkout_forbidden": True,
        },
        "future_host_scope": {
            "root_execution_required": True,
            "effective_uid_zero_required": True,
            "host_user_namespace_external_lease_required": True,
            "host_pid_namespace_external_lease_required": True,
            "host_mount_namespace_external_lease_required": True,
            "planner_and_pid1_host_pid_namespace_required": True,
            "planner_and_pid1_host_user_namespace_required": True,
            "planner_and_pid1_host_mount_namespace_required": True,
            "procfs_direct_root_required": True,
            "procfs_hidepid_zero_or_absent_required": True,
            "complete_numeric_pid_visibility_required": True,
            "namespace_leases_same_boot_required": True,
            "namespace_lease_provenance_external_review_required": True,
        },
        "future_all_process_scan": {
            "all_numeric_pids_required": True,
            "process_start_generation_before_after_required": True,
            "all_uid_gid_slots_observed_required": True,
            "cwd_root_exe_inode_identity_required": True,
            "all_open_fd_inode_identity_required": True,
            "mapped_inode_identity_required": True,
            "still_live_unreadable_process_holds": True,
            "vanished_pid_must_be_reconciled_by_second_pid_set": True,
            "pid_set_before_after_stability_required": True,
            "target_snapshot_before_after_stability_required": True,
            "target_regular_file_content_read": False,
            "proc_cmdline_read": False,
            "proc_environ_read": False,
            "proc_fd_target_text_read": False,
            "proc_maps_path_text_retained": False,
            "fd_table_stability_proven": False,
            "mapping_set_stability_proven": False,
            "live_at_use_reverification_required": True,
        },
        "future_candidate_semantics": {
            "all_process_target_reference_absent_candidate_possible": True,
            "all_process_reference_absence_proven_by_plan": False,
            "replacement_precondition_satisfied_by_plan": False,
            "replacement_apply_authorized": False,
            "service_quiescence_proven_by_plan": False,
            "installed_runtime_bytes_authenticated_by_plan": False,
        },
        "authority": {
            "source_plan_only": True,
            "host_read_performed": False,
            "host_process_census_performed": False,
            "protected_source_installed": False,
            "root_execution_performed": False,
            "filesystem_write": False,
            "permission_mutation": False,
            "systemd_mutation": False,
            "service_mutation": False,
            "target_rename": False,
            "existing_target_replaced": False,
            "replacement_apply_authorized": False,
            "runtime_integration": False,
            "request_history_read": False,
            "custody_data_read": False,
            "credential_access": False,
            "wallet_or_signer_access": False,
            "payment_acceptance": False,
            "public_presale_activation": False,
            "funds_movement": False,
        },
    }
    return {
        **body,
        "plan_id": "voidbuycustodyallprocplan1_" + sha256(canonical(body)),
    }


def self_test() -> None:
    plan = build_plan()
    if plan["status"] != "SOURCE_ONLY_PROTECTED_ALL_PROCESS_CENSUS_PLAN":
        hold("self_test_status_invalid")
    if plan["future_protected_source"]["sudo_python_checkout_forbidden"] is not True:
        hold("self_test_mutable_checkout_root_boundary_missing")
    if plan["future_host_scope"]["host_user_namespace_external_lease_required"] is not True:
        hold("self_test_user_namespace_lease_missing")
    if plan["future_host_scope"]["host_pid_namespace_external_lease_required"] is not True:
        hold("self_test_pid_namespace_lease_missing")
    if plan["future_host_scope"]["host_mount_namespace_external_lease_required"] is not True:
        hold("self_test_mount_namespace_lease_missing")
    if plan["future_all_process_scan"]["still_live_unreadable_process_holds"] is not True:
        hold("self_test_unreadable_process_boundary_missing")
    if plan["future_all_process_scan"]["fd_table_stability_proven"] is not False:
        hold("self_test_fd_stability_overclaim")
    if plan["future_candidate_semantics"]["replacement_apply_authorized"] is not False:
        hold("self_test_replacement_authority_overclaim")
    if plan["authority"]["filesystem_write"] is not False:
        hold("self_test_filesystem_authority_overclaim")

    print(MARKER + "_SELF_TEST_GREEN")
    print("exact_parent_process_source_bound=true")
    print("exact_parent_tree_prestate_source_bound=true")
    print("exact_archive_lock_bound=true")
    print("source_plan_only=true")
    print("root_execution_forbidden_for_source_plan=true")
    print("protected_root_owned_source_required=true")
    print("mutable_checkout_root_execution_forbidden=true")
    print("sudo_python_checkout_forbidden=true")
    print("host_user_namespace_external_lease_required=true")
    print("host_pid_namespace_external_lease_required=true")
    print("host_mount_namespace_external_lease_required=true")
    print("complete_numeric_pid_visibility_required=true")
    print("all_numeric_pids_required=true")
    print("still_live_unreadable_process_holds=true")
    print("pid_set_before_after_stability_required=true")
    print("target_snapshot_before_after_stability_required=true")
    print("proc_cmdline_read=false")
    print("proc_environ_read=false")
    print("proc_fd_target_text_read=false")
    print("proc_maps_path_text_retained=false")
    print("fd_table_stability_proven=false")
    print("mapping_set_stability_proven=false")
    print("live_at_use_reverification_required=true")
    print("host_process_census_performed=false")
    print("protected_source_installed=false")
    print("filesystem_write=false")
    print("service_mutation=false")
    print("replacement_apply_authorized=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("funds_movement=false")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--plan", action="store_true")
    group.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        self_test()
        return 0
    if args.plan:
        print(json.dumps(build_plan(), sort_keys=True, separators=(",", ":")))
        return 0
    return 2


if __name__ == "__main__":
    try:
        raise SystemExit(main(_bootstrap_sys.argv[1:]))
    except (PlanHold, OSError, ValueError) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("source_plan_only=true")
        print("host_process_census_performed=false")
        print("filesystem_write=false")
        print("replacement_apply_authorized=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)
