#!/usr/bin/env python3
# Source-only protected first-entry plan for the accepted custody V3 installer.
import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_INSTALLER_FIRST_ENTRY_PLAN_V1"
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
        print("protected_first_entry_installed=false")
        print("protected_install_authorized=false")
        print("funds_movement=false")
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
SCHEMA = "void_buy_void_custody_runtime_v3_installer_first_entry_plan_v1"
VERSION = 1
ROOT = Path(__file__).resolve().parents[2]

INSTALLER_LOCK_REL = (
    "ops/security/"
    "buy-void-allocation-custody-runtime-v3-"
    "protected-all-process-installer-lock-v1.json"
)
INSTALLER_LOCK_GIT_BLOB = "a1e1f4887787b408d313e73360966f93a63b2b58"

INSTALLER_REL = (
    "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_"
    "protected_all_process_installer_candidate_v1.py"
)
INSTALLER_GIT_BLOB = "9dd33f38fe4c89a5d2beacbc535380346eaea83b"
INSTALLER_BYTES = 38420
INSTALLER_SHA256 = (
    "e956c90ad9680680d0734466b632a58a4145ad74c8962e9e8960b186caeced01"
)

INSTALL_PLAN_REL = (
    "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_"
    "protected_all_process_install_plan_v1.py"
)
INSTALL_PLAN_GIT_BLOB = "0fef4e6f76738dd474ea775985b1facdd922bb54"

SOURCE_LOCK_REL = (
    "ops/security/"
    "buy-void-allocation-custody-runtime-v3-"
    "protected-all-process-reference-census-lock-v6.json"
)
SOURCE_LOCK_GIT_BLOB = "5ba0c8d7b1ab8e8384472bb867e0603e6986b9b1"

PROTECTED_CENSUS_REL = (
    "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_"
    "protected_all_process_reference_census_v1.py"
)
PROTECTED_CENSUS_GIT_BLOB = "33a7221cad37aec70474b97b26c2b10e2ef60f66"
PROTECTED_CENSUS_BYTES = 74322
PROTECTED_CENSUS_SHA256 = (
    "d5b91c7efa048eb40601d162185563a29916f1ff22a23638c7da5f330b92beba"
)

FIRST_ENTRY_ROOT = Path(
    "/opt/void-buy-allocation-custody-procref-installer-first-entry-v1"
)
FIRST_ENTRY_BIN = (
    FIRST_ENTRY_ROOT
    / "bin/void_buy_allocation_custody_procref_installer_first_entry_v1"
)
FIRST_ENTRY_POLICY = FIRST_ENTRY_ROOT / "policy-v1.conf"
FIRST_ENTRY_SOURCE_ROOT = FIRST_ENTRY_ROOT / "source"
FIRST_ENTRY_INSTALLER = FIRST_ENTRY_SOURCE_ROOT / INSTALLER_REL

MAX_READ = 256 * 1024


class PlanHold(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise PlanHold("custody_installer_first_entry_plan_" + reason)


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


def _identity(st: os.stat_result) -> tuple[int, int, int, int, int, int]:
    return (
        st.st_dev,
        st.st_ino,
        st.st_uid,
        st.st_gid,
        st.st_mode,
        st.st_nlink,
    )


def read_bound_regular(path: Path, maximum: int) -> bytes:
    if maximum < 1 or maximum > MAX_READ:
        hold("read_limit_invalid")
    absolute = Path(os.path.abspath(os.fspath(path)))
    parent = absolute.parent
    parent_st = os.stat(parent, follow_symlinks=False)
    if not stat.S_ISDIR(parent_st.st_mode) or stat.S_ISLNK(parent_st.st_mode):
        hold("parent_shape_invalid")
    before = os.stat(absolute, follow_symlinks=False)
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_size < 1
        or before.st_size > maximum
    ):
        hold("input_shape_invalid:" + absolute.name)
    fd = os.open(
        absolute,
        os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC,
    )
    try:
        opened = os.fstat(fd)
        if _identity(before) != _identity(opened):
            hold("input_rebound:" + absolute.name)
        raw = bytearray()
        while len(raw) <= maximum:
            chunk = os.read(fd, min(65536, maximum + 1 - len(raw)))
            if not chunk:
                break
            raw.extend(chunk)
        if len(raw) > maximum:
            hold("input_read_ceiling:" + absolute.name)
        after = os.fstat(fd)
        visible = os.stat(absolute, follow_symlinks=False)
        if _identity(opened) != _identity(after) or _identity(after) != _identity(visible):
            hold("input_identity_changed:" + absolute.name)
        return bytes(raw)
    finally:
        os.close(fd)


def validate_installer_lock(raw: bytes) -> dict[str, Any]:
    if git_blob(raw) != INSTALLER_LOCK_GIT_BLOB:
        hold("installer_lock_blob_mismatch")
    try:
        value = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        hold("installer_lock_json_invalid:" + type(exc).__name__)
    if (
        type(value) is not dict
        or value.get("schema")
        != "void_buy_void_custody_runtime_v3_protected_all_process_installer_lock_v1"
        or value.get("marker")
        != "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_INSTALLER_LOCK_V1"
        or value.get("candidate_installer_source_accepted") is not True
        or value.get("install_target_selected") is not True
        or value.get("installer_candidate_evidence", {}).get("source_git_blob_sha1")
        != INSTALLER_GIT_BLOB
        or value.get("installer_candidate_evidence", {}).get("source_bytes")
        != INSTALLER_BYTES
        or value.get("installer_candidate_evidence", {}).get("source_sha256")
        != INSTALLER_SHA256
    ):
        hold("installer_lock_identity_invalid")
    for key in (
        "protected_installer_first_entry_installed",
        "protected_installer_first_entry_verified",
        "protected_install_authorized",
        "protected_source_installed",
        "live_privileged_census_authorized",
        "live_privileged_census_executed",
        "service_mutation",
        "systemd_mutation",
        "existing_target_replaced",
        "replacement_apply_authorized",
        "runtime_integration",
        "payment_acceptance",
        "public_presale_activation",
        "production_gate_ready",
        "funds_movement",
    ):
        if value.get(key) is not False:
            hold("installer_lock_authority_not_false:" + key)
    return value


def plan_body(lock: dict[str, Any]) -> dict[str, Any]:
    snapshot = [
        {"path": INSTALLER_REL, "git_blob_sha1": INSTALLER_GIT_BLOB},
        {"path": INSTALL_PLAN_REL, "git_blob_sha1": INSTALL_PLAN_GIT_BLOB},
        {"path": SOURCE_LOCK_REL, "git_blob_sha1": SOURCE_LOCK_GIT_BLOB},
        {"path": PROTECTED_CENSUS_REL, "git_blob_sha1": PROTECTED_CENSUS_GIT_BLOB},
    ]
    return {
        "schema": SCHEMA,
        "marker": MARKER,
        "version": VERSION,
        "accepted_installer_lock": {
            "path": INSTALLER_LOCK_REL,
            "git_blob_sha1": INSTALLER_LOCK_GIT_BLOB,
            "lock_id": lock["lock_id"],
            "candidate_installer_source_accepted": True,
        },
        "accepted_installer": {
            "path": INSTALLER_REL,
            "git_blob_sha1": INSTALLER_GIT_BLOB,
            "bytes": INSTALLER_BYTES,
            "sha256": INSTALLER_SHA256,
        },
        "protected_source_snapshot": {
            "root": str(FIRST_ENTRY_SOURCE_ROOT),
            "exact_file_count": 4,
            "files": snapshot,
            "installer_path": str(FIRST_ENTRY_INSTALLER),
            "root_owned": True,
            "group_world_writable": False,
            "exact_tree_required": True,
            "git_metadata_required": False,
        },
        "future_first_entry_layout": {
            "root": str(FIRST_ENTRY_ROOT),
            "launcher": str(FIRST_ENTRY_BIN),
            "policy": str(FIRST_ENTRY_POLICY),
            "root_uid": 0,
            "root_gid": 0,
            "root_mode": "0555",
            "launcher_mode": "0555",
            "policy_mode": "0444",
            "source_file_mode": "0444",
            "trusted_files_single_link_required": True,
        },
        "native_first_instruction_contract": {
            "static_native_first_instruction_required": True,
            "elf64_x86_64_et_exec_required": True,
            "pt_interp_forbidden": True,
            "pt_dynamic_forbidden": True,
            "caller_selected_python_source_forbidden": True,
            "caller_selected_installer_path_forbidden": True,
            "caller_selected_destination_forbidden": True,
            "stdin_dev_null_required": True,
            "closed_environment_required": True,
            "supplementary_groups_cleared_required": True,
            "self_exe_generation_verified_required": True,
            "trusted_ancestry_root_owned_nonwritable_required": True,
            "installer_exact_bytes_verified_before_python": True,
            "all_snapshot_files_verified_before_python": True,
            "retained_installer_descriptor_required": True,
            "terminal_generation_revalidation_required": True,
        },
        "python_child_contract": {
            "python_flags_exact": ["-I", "-B", "-S", "-c"],
            "fixed_bootstrap_embedded_in_native_required": True,
            "fixed_bootstrap_loads_only_retained_installer_required": True,
            "fixed_entrypoint": (
                "install_accepted_source_create_only_after_protected_first_entry"
            ),
            "closed_python_runtime_required": True,
            "python_runtime_identity_selected": False,
            "python_stdlib_import_closure_selected": False,
            "python_runtime_candidate_required_before_launcher_candidate": True,
            "ambient_python_environment_forwarded": False,
            "ambient_loader_environment_forwarded": False,
        },
        "lifecycle": {
            "next_gate": (
                "AUTHOR_STATIC_NATIVE_FIRST_ENTRY_SOURCE_WITH_REQUIRED_"
                "COMPILE_TIME_BINDINGS"
            ),
            "launcher_candidate_derivation_after_runtime_binding": True,
            "launcher_candidate_acceptance_required": True,
            "create_only_first_entry_install_required": True,
            "installed_read_only_qualification_required": True,
            "protected_installer_invocation_separate_authorization_required": True,
        },
        "authority": {
            "source_plan_only": True,
            "first_entry_target_selected": True,
            "first_entry_native_source_authored": False,
            "first_entry_candidate_derived": False,
            "first_entry_candidate_accepted": False,
            "protected_installer_first_entry_installed": False,
            "protected_installer_first_entry_verified": False,
            "protected_install_authorized": False,
            "protected_source_installed": False,
            "live_privileged_census_authorized": False,
            "live_privileged_census_executed": False,
            "service_mutation": False,
            "systemd_mutation": False,
            "existing_target_replaced": False,
            "replacement_apply_authorized": False,
            "runtime_integration": False,
            "payment_acceptance": False,
            "public_presale_activation": False,
            "production_gate_ready": False,
            "funds_movement": False,
        },
        "read_effects": {
            "production_plan_read_only": True,
            "production_plan_explicit_filesystem_write": False,
            "production_plan_filesystem_write_free": False,
            "production_plan_atime_write_possible": True,
        },
    }


def build_plan() -> dict[str, Any]:
    if os.getuid() == 0 or os.geteuid() == 0:
        hold("root_execution_forbidden_for_mutable_source_plan")
    raw = read_bound_regular(ROOT / INSTALLER_LOCK_REL, MAX_READ)
    lock = validate_installer_lock(raw)
    body = plan_body(lock)
    return {
        **body,
        "plan_id": "voidbuycustodyfirstentryplan1_" + sha256(canonical(body)),
    }


def self_test() -> None:
    raw = read_bound_regular(ROOT / INSTALLER_LOCK_REL, MAX_READ)
    lock = validate_installer_lock(raw)
    first = plan_body(lock)
    second = plan_body(lock)
    if canonical(first) != canonical(second):
        hold("self_test_nondeterministic_plan")
    if first["protected_source_snapshot"]["exact_file_count"] != 4:
        hold("self_test_snapshot_count_invalid")
    if first["authority"]["first_entry_target_selected"] is not True:
        hold("self_test_target_selection_missing")
    for key in (
        "first_entry_native_source_authored",
        "first_entry_candidate_derived",
        "first_entry_candidate_accepted",
        "protected_installer_first_entry_installed",
        "protected_installer_first_entry_verified",
        "protected_install_authorized",
        "protected_source_installed",
        "live_privileged_census_authorized",
        "live_privileged_census_executed",
        "replacement_apply_authorized",
        "runtime_integration",
        "payment_acceptance",
        "public_presale_activation",
        "production_gate_ready",
        "funds_movement",
    ):
        if first["authority"][key] is not False:
            hold("self_test_authority_invalid:" + key)

    tampered = json.loads(raw.decode("utf-8"))
    tampered["candidate_installer_source_accepted"] = False
    tampered_raw = json.dumps(
        tampered, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    try:
        validate_installer_lock(tampered_raw)
    except PlanHold:
        pass
    else:
        hold("self_test_tampered_lock_accepted")

    print(MARKER + "_SELF_TEST_GREEN")
    print("installer_lock_exact=true")
    print("accepted_installer_identity_bound=true")
    print("protected_snapshot_exact_four_files=true")
    print("static_native_first_instruction_required=true")
    print("closed_python_runtime_required=true")
    print("python_runtime_identity_selected=false")
    print("python_stdlib_import_closure_selected=false")
    print("first_entry_target_selected=true")
    print("first_entry_native_source_authored=false")
    print("protected_install_authorized=false")
    print("protected_source_installed=false")
    print("live_privileged_census_authorized=false")
    print("replacement_apply_authorized=false")
    print("production_plan_read_only=true")
    print("production_plan_explicit_filesystem_write=false")
    print("production_plan_filesystem_write_free=false")
    print("production_plan_atime_write_possible=true")
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
        print("protected_install_authorized=false")
        print("protected_source_installed=false")
        print("live_privileged_census_authorized=false")
        print("replacement_apply_authorized=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)
