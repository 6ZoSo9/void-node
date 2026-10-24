#!/usr/bin/env python3
# Source-only plan for a protected native first-entry around the accepted
# custody all-process installer candidate. No install/apply/live census.
import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_INSTALLER_FIRST_ENTRY_PLAN_V1"
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
        print("first_entry_execution_authorized=false")
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
SCHEMA = (
    "void_buy_void_custody_runtime_v3_"
    "protected_installer_first_entry_plan_v1"
)
VERSION = 1
PLAN_PREFIX = "voidbuycustodyprocreffirstentryplan1_"
ROOT = Path(__file__).resolve().parents[2]

LOCK_REL = (
    "ops/security/"
    "buy-void-allocation-custody-runtime-v3-"
    "protected-all-process-installer-lock-v1.json"
)
LOCK_GIT_BLOB = "a1e1f4887787b408d313e73360966f93a63b2b58"
LOCK_ID = (
    "voidbuycustodyprocrefinstallerlock1_"
    "9dd33f38fe4c89a5d2beacbc535380346eaea83b"
)
PARENT_LOCK_HEAD = "329134210c56930e684b2ffdffb45a7ee55fbfb9"

ACCEPTED_INSTALLER_REL = (
    "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_"
    "protected_all_process_installer_candidate_v1.py"
)
ACCEPTED_INSTALLER_GIT_BLOB = (
    "9dd33f38fe4c89a5d2beacbc535380346eaea83b"
)
ACCEPTED_INSTALLER_BYTES = 38420
ACCEPTED_INSTALLER_SHA256 = (
    "e956c90ad9680680d0734466b632a58a4145ad74c8962e9e8960b186caeced01"
)
ACCEPTED_INSTALLER_ENTRYPOINT = (
    "install_accepted_source_create_only_after_protected_first_entry"
)

REPOSITORY_ROOT = Path("/home/zoso/dev/void-node")
REPOSITORY_INSTALLER = REPOSITORY_ROOT / ACCEPTED_INSTALLER_REL

FIRST_ENTRY_INSTALL_ROOT = Path(
    "/opt/void-buy-allocation-custody-procref-installer-first-entry-v1"
)
FIRST_ENTRY_BINARY = (
    FIRST_ENTRY_INSTALL_ROOT
    / "bin/void-buy-allocation-custody-procref-installer-first-entry-v1"
)
FIXED_PYTHON = Path("/usr/bin/python3")
SYNTHETIC_INSTALLER_FILENAME = REPOSITORY_INSTALLER

MAX_LOCK_BYTES = 256 * 1024


class PlanHold(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise PlanHold("custody_procref_first_entry_plan_" + reason)


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


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


def _read_bound_regular(path: Path, maximum: int) -> bytes:
    absolute = Path(os.path.abspath(os.fspath(path)))
    parent = absolute.parent
    parent_before = os.stat(parent, follow_symlinks=False)
    if not stat.S_ISDIR(parent_before.st_mode) or stat.S_ISLNK(parent_before.st_mode):
        hold("source_parent_invalid:" + parent.name)
    parent_fd = os.open(
        parent,
        os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC,
    )
    fd = -1
    try:
        parent_opened = os.fstat(parent_fd)
        if _identity(parent_before) != _identity(parent_opened):
            hold("source_parent_rebound:" + parent.name)
        before = os.stat(
            absolute.name,
            dir_fd=parent_fd,
            follow_symlinks=False,
        )
        if (
            not stat.S_ISREG(before.st_mode)
            or stat.S_ISLNK(before.st_mode)
            or before.st_nlink != 1
            or before.st_size < 1
            or before.st_size > maximum
        ):
            hold("source_file_invalid:" + absolute.name)
        fd = os.open(
            absolute.name,
            os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC,
            dir_fd=parent_fd,
        )
        opened = os.fstat(fd)
        if _identity(before) != _identity(opened):
            hold("source_file_rebound:" + absolute.name)
        raw = bytearray()
        while len(raw) <= maximum:
            chunk = os.read(fd, min(65536, maximum + 1 - len(raw)))
            if not chunk:
                break
            raw.extend(chunk)
        if len(raw) > maximum:
            hold("source_file_read_limit:" + absolute.name)
        after = os.fstat(fd)
        visible = os.stat(
            absolute.name,
            dir_fd=parent_fd,
            follow_symlinks=False,
        )
        if (
            _identity(opened) != _identity(after)
            or _identity(after) != _identity(visible)
        ):
            hold("source_file_generation_changed:" + absolute.name)
        return bytes(raw)
    finally:
        if fd >= 0:
            os.close(fd)
        os.close(parent_fd)


def verify_lock() -> dict[str, Any]:
    raw = _read_bound_regular(ROOT / LOCK_REL, MAX_LOCK_BYTES)
    if git_blob(raw) != LOCK_GIT_BLOB:
        hold("installer_lock_blob_mismatch")
    try:
        value = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        hold("installer_lock_json_invalid:" + type(exc).__name__)

    if (
        type(value) is not dict
        or value.get("schema")
        != "void_buy_void_custody_runtime_v3_"
           "protected_all_process_installer_lock_v1"
        or value.get("marker")
        != "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_"
           "PROTECTED_ALL_PROCESS_INSTALLER_LOCK_V1"
        or value.get("version") != 1
        or value.get("lock_id") != LOCK_ID
        or value.get("parent_installer_head")
        != "395249d8eab96adbdf5b15c6654326bd827aa1a0"
        or value.get("candidate_installer_source_accepted") is not True
        or value.get("install_target_selected") is not True
    ):
        hold("installer_lock_identity_invalid")

    evidence = value.get("installer_candidate_evidence")
    if (
        type(evidence) is not dict
        or evidence.get("source_path") != ACCEPTED_INSTALLER_REL
        or evidence.get("source_git_blob_sha1")
        != ACCEPTED_INSTALLER_GIT_BLOB
        or evidence.get("source_bytes") != ACCEPTED_INSTALLER_BYTES
        or evidence.get("source_sha256") != ACCEPTED_INSTALLER_SHA256
    ):
        hold("accepted_installer_identity_invalid")

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


def build_plan() -> dict[str, Any]:
    if os.getuid() == 0 or os.geteuid() == 0:
        hold("root_execution_forbidden_for_source_plan")

    lock = verify_lock()
    body = {
        "schema": SCHEMA,
        "marker": MARKER,
        "version": VERSION,
        "input_lock": {
            "path": LOCK_REL,
            "git_blob_sha1": LOCK_GIT_BLOB,
            "lock_id": LOCK_ID,
            "candidate_installer_source_accepted":
                lock["candidate_installer_source_accepted"],
        },
        "accepted_installer": {
            "repository_root": str(REPOSITORY_ROOT),
            "repository_path": ACCEPTED_INSTALLER_REL,
            "absolute_repository_path": str(REPOSITORY_INSTALLER),
            "git_blob_sha1": ACCEPTED_INSTALLER_GIT_BLOB,
            "bytes": ACCEPTED_INSTALLER_BYTES,
            "sha256": ACCEPTED_INSTALLER_SHA256,
            "fixed_entrypoint": ACCEPTED_INSTALLER_ENTRYPOINT,
        },
        "first_entry_contract": {
            "mechanism_selected": (
                "STATIC_NATIVE_PREENTRY_SEALED_MEMFD_FIXED_PYTHON_V1"
            ),
            "first_privileged_instruction_static_native_required": True,
            "mutable_checkout_python_first_instruction_forbidden": True,
            "direct_root_python_authoritative": False,
            "native_source_candidate_required": True,
            "native_binary_candidate_required": True,
            "native_binary_reproducible_build_required": True,
            "native_binary_static_link_required": True,
            "native_binary_root_owned_protected_install_required": True,
            "native_binary_at_use_identity_reverification_required": True,
            "native_binary_source_derived": False,
            "native_binary_derived": False,
            "native_binary_accepted": False,
            "native_binary_installed": False,
            "native_binary_verified": False,
            "first_entry_install_root": str(FIRST_ENTRY_INSTALL_ROOT),
            "first_entry_binary": str(FIRST_ENTRY_BINARY),
            "first_entry_install_target_selected": True,
            "installer_repository_source_descriptor_snapshot_required": True,
            "installer_repository_source_nofollow_required": True,
            "installer_repository_source_exact_blob_required": True,
            "installer_repository_source_exact_sha256_required": True,
            "installer_repository_source_generation_recheck_required": True,
            "sealed_installer_memfd_required": True,
            "memfd_allow_sealing_required": True,
            "memfd_seal_write_required": True,
            "memfd_seal_grow_required": True,
            "memfd_seal_shrink_required": True,
            "memfd_seal_seal_required": True,
            "installer_memfd_inherited_into_python_required": True,
            "fixed_python_path": str(FIXED_PYTHON),
            "python_generation_candidate_required": True,
            "python_generation_selected": False,
            "python_root_owned_nonwritable_ancestry_required": True,
            "python_descriptor_bound_exec_required": True,
            "python_path_reopen_after_verification_forbidden": True,
            "python_isolated_flag_required": True,
            "python_no_site_flag_required": True,
            "python_no_bytecode_flag_required": True,
            "python_optimization_forbidden": True,
            "ambient_python_environment_cleared_required": True,
            "caller_stdin_devnull_required": True,
            "working_directory_root_required": True,
            "fixed_bridge_compiled_into_native_policy_required": True,
            "bridge_reads_only_sealed_installer_memfd_required": True,
            "bridge_rehashes_installer_memfd_required": True,
            "bridge_installer_sha256": ACCEPTED_INSTALLER_SHA256,
            "bridge_installer_bytes": ACCEPTED_INSTALLER_BYTES,
            "bridge_compile_synthetic_filename": str(
                SYNTHETIC_INSTALLER_FILENAME
            ),
            "bridge_fixed_entrypoint": ACCEPTED_INSTALLER_ENTRYPOINT,
            "bridge_arbitrary_module_or_function_selection_forbidden": True,
            "installer_repository_inputs_reverified_at_use_required": True,
            "installer_fixed_destination_contract_reused": True,
            "installer_stage_unknown_recovery_contract_reused": True,
            "protected_install_invocation_authorized": False,
            "live_privileged_census_invocation_authorized": False,
        },
        "authority": {
            "source_plan_only": True,
            "root_execution_forbidden_for_plan": True,
            "production_plan_explicit_filesystem_write": False,
            "production_plan_filesystem_write_free": False,
            "production_plan_atime_write_possible": True,
            "candidate_installer_source_accepted": True,
            "install_target_selected": True,
            "first_entry_install_target_selected": True,
            "native_first_entry_source_derived": False,
            "native_first_entry_binary_derived": False,
            "native_first_entry_binary_accepted": False,
            "native_first_entry_binary_installed": False,
            "native_first_entry_binary_verified": False,
            "first_entry_execution_authorized": False,
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
        "next_gate": "DERIVE_STATIC_NATIVE_FIRST_ENTRY_CANDIDATE",
    }
    return {
        **body,
        "plan_id": PLAN_PREFIX + sha256(canonical(body)),
    }


def self_test() -> None:
    plan = build_plan()
    contract = plan["first_entry_contract"]
    authority = plan["authority"]
    if (
        contract["first_privileged_instruction_static_native_required"]
        is not True
        or contract["sealed_installer_memfd_required"] is not True
        or contract["python_descriptor_bound_exec_required"] is not True
        or contract["fixed_bridge_compiled_into_native_policy_required"]
        is not True
        or contract["protected_install_invocation_authorized"] is not False
        or authority["candidate_installer_source_accepted"] is not True
        or authority["install_target_selected"] is not True
        or authority["first_entry_install_target_selected"] is not True
        or authority["first_entry_execution_authorized"] is not False
        or authority["protected_install_authorized"] is not False
        or authority["funds_movement"] is not False
    ):
        hold("self_test_contract_invalid")
    expected = PLAN_PREFIX + sha256(canonical({
        key: value for key, value in plan.items() if key != "plan_id"
    }))
    if plan["plan_id"] != expected:
        hold("self_test_plan_id_invalid")

    print(MARKER + "_SELF_TEST_GREEN")
    print("accepted_installer_lock_exact=true")
    print("accepted_installer_identity_exact=true")
    print("first_privileged_instruction_static_native_required=true")
    print("mutable_checkout_python_first_instruction_forbidden=true")
    print("sealed_installer_memfd_required=true")
    print("python_descriptor_bound_exec_required=true")
    print("python_isolated_no_site_no_bytecode_required=true")
    print("fixed_bridge_compiled_into_native_policy_required=true")
    print("synthetic_installer_filename_bound=true")
    print("installer_repository_inputs_reverified_at_use_required=true")
    print("first_entry_install_target_selected=true")
    print("native_first_entry_source_derived=false")
    print("native_first_entry_binary_derived=false")
    print("native_first_entry_binary_accepted=false")
    print("native_first_entry_binary_installed=false")
    print("native_first_entry_binary_verified=false")
    print("first_entry_execution_authorized=false")
    print("protected_install_authorized=false")
    print("protected_source_installed=false")
    print("live_privileged_census_authorized=false")
    print("live_privileged_census_executed=false")
    print("replacement_apply_authorized=false")
    print("runtime_integration=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("production_gate_ready=false")
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
        print("first_entry_execution_authorized=false")
        print("protected_install_authorized=false")
        print("live_privileged_census_authorized=false")
        print("replacement_apply_authorized=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)
