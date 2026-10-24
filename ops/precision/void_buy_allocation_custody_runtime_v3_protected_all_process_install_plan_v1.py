#!/usr/bin/env python3
# Source-only plan for a future protected all-process census source install.
import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_INSTALL_PLAN_V1"
)
if (
    _bootstrap_sys.flags.isolated != 1
    or not getattr(_bootstrap_sys.flags, "safe_path", False)
    or _bootstrap_sys.flags.optimize != 0
    or not __debug__
    or not _bootstrap_sys.dont_write_bytecode
):
    if __name__ == "__main__":
        print(_BOOTSTRAP_MARKER)
        print("status=HOLD")
        print("reason=python_isolated_unoptimized_no_bytecode_mode_required")
        print("protected_install_authorized=false")
        print("filesystem_mutation=false")
        print("funds_movement=false")
        raise SystemExit(2)
    raise RuntimeError("python_isolated_unoptimized_no_bytecode_mode_required")

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
    "protected_all_process_install_plan_v1"
)
VERSION = 1
ROOT = Path(__file__).resolve().parents[2]

LOCK_REL = (
    "ops/security/"
    "buy-void-allocation-custody-runtime-v3-"
    "protected-all-process-reference-census-lock-v6.json"
)
LOCK_GIT_BLOB = "5ba0c8d7b1ab8e8384472bb867e0603e6986b9b1"
LOCK_ID = (
    "voidbuycustodyallprocreflock6_"
    "33a7221cad37aec70474b97b26c2b10e2ef60f66"
)
PARENT_SOURCE_HEAD = "9bec0035b4085af82f51ec0e481d49c94ceb84b4"
ACCEPTED_SOURCE_REL = (
    "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_"
    "protected_all_process_reference_census_v1.py"
)
ACCEPTED_SOURCE_BLOB = "33a7221cad37aec70474b97b26c2b10e2ef60f66"
ACCEPTED_SOURCE_BYTES = 74322
ACCEPTED_SOURCE_SHA256 = (
    "d5b91c7efa048eb40601d162185563a29916f1ff22a23638c7da5f330b92beba"
)

INSTALL_PARENT = Path("/opt")
INSTALL_ROOT = Path("/opt/void-buy-allocation-custody-procref-v1")
INSTALL_SOURCE = (
    INSTALL_ROOT
    / "void_buy_allocation_custody_runtime_v3_"
      "protected_all_process_reference_census_v1.py"
)
STAGE_NAME = ".void-buy-allocation-custody-procref-v1.stage-v1"
STAGE_ROOT = INSTALL_PARENT / STAGE_NAME
FINAL_ROOT_MODE = "0555"
FINAL_SOURCE_MODE = "0444"
PLAN_PREFIX = "voidbuycustodyprocrefinstallplan1_"
MAX_LOCK_BYTES = 256 * 1024


class PlanHold(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise PlanHold("custody_protected_all_process_install_plan_" + reason)


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


def canonical(value: object) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        ensure_ascii=True,
        separators=(",", ":"),
    ).encode("ascii")


def _identity(st: os.stat_result) -> tuple[int, int, int, int, int, int]:
    return (
        st.st_dev,
        st.st_ino,
        st.st_uid,
        st.st_gid,
        st.st_mode,
        st.st_nlink,
    )


def _generation(
    st: os.stat_result,
) -> tuple[int, int, int, int, int, int, int, int, int]:
    return _identity(st) + (st.st_size, st.st_mtime_ns, st.st_ctime_ns)


def _directory_flags() -> int:
    values = (
        getattr(os, "O_RDONLY", None),
        getattr(os, "O_DIRECTORY", None),
        getattr(os, "O_NOFOLLOW", None),
        getattr(os, "O_NONBLOCK", None),
    )
    if any(type(value) is not int for value in values):
        hold("descriptor_capability_invalid")
    return os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_NONBLOCK


def _leaf_flags() -> int:
    values = (
        getattr(os, "O_RDONLY", None),
        getattr(os, "O_NOFOLLOW", None),
        getattr(os, "O_NONBLOCK", None),
    )
    if any(type(value) is not int for value in values):
        hold("descriptor_capability_invalid")
    return os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK


def _open_bound_directory(path: Path) -> tuple[int, os.stat_result]:
    absolute = Path(os.path.abspath(os.fspath(path)))
    parts = absolute.parts
    if (
        not absolute.is_absolute()
        or not parts
        or parts[0] != "/"
        or any(part in ("", ".", "..") for part in parts[1:])
        or "\x00" in str(absolute)
    ):
        hold("directory_path_invalid")

    fd = os.open("/", _directory_flags())
    try:
        for component in parts[1:]:
            before = os.stat(component, dir_fd=fd, follow_symlinks=False)
            if not stat.S_ISDIR(before.st_mode) or stat.S_ISLNK(before.st_mode):
                hold("directory_component_invalid:" + component)
            child = os.open(component, _directory_flags(), dir_fd=fd)
            opened = os.fstat(child)
            if _identity(before) != _identity(opened):
                os.close(child)
                hold("directory_component_rebound:" + component)
            os.close(fd)
            fd = child

        opened = os.fstat(fd)
        visible = os.stat(str(absolute), follow_symlinks=False)
        if (
            not stat.S_ISDIR(opened.st_mode)
            or _identity(opened) != _identity(visible)
        ):
            hold("directory_terminal_rebound")
        return fd, opened
    except BaseException:
        os.close(fd)
        raise


def read_bound_regular(path: Path, maximum: int) -> bytes:
    if maximum < 1 or maximum > 4 * 1024 * 1024:
        hold("read_limit_invalid")
    absolute = Path(os.path.abspath(os.fspath(path)))
    parent_fd, _ = _open_bound_directory(absolute.parent)
    fd = -1
    try:
        before = os.stat(
            absolute.name,
            dir_fd=parent_fd,
            follow_symlinks=False,
        )
        if (
            not stat.S_ISREG(before.st_mode)
            or stat.S_ISLNK(before.st_mode)
            or before.st_size < 1
            or before.st_size > maximum
        ):
            hold("source_file_shape_invalid:" + absolute.name)
        fd = os.open(
            absolute.name,
            _leaf_flags(),
            dir_fd=parent_fd,
        )
        opened = os.fstat(fd)
        if _generation(before) != _generation(opened):
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
            _generation(opened) != _generation(after)
            or _generation(after) != _generation(visible)
        ):
            hold("source_file_generation_changed:" + absolute.name)
        return bytes(raw)
    finally:
        if fd >= 0:
            os.close(fd)
        os.close(parent_fd)


def verify_lock() -> dict[str, Any]:
    raw = read_bound_regular(ROOT / LOCK_REL, MAX_LOCK_BYTES)
    if git_blob(raw) != LOCK_GIT_BLOB:
        hold("lock_git_blob_mismatch")
    try:
        lock = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        hold("lock_json_invalid:" + type(exc).__name__)

    if (
        type(lock) is not dict
        or lock.get("schema")
        != "void_buy_void_custody_runtime_v3_"
           "protected_all_process_reference_census_lock_v6"
        or lock.get("marker")
        != "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_"
           "PROTECTED_ALL_PROCESS_REFERENCE_CENSUS_LOCK_V6"
        or lock.get("version") != 6
        or lock.get("lock_id") != LOCK_ID
        or lock.get("parent_source_head") != PARENT_SOURCE_HEAD
        or lock.get("candidate_source_accepted") is not True
    ):
        hold("lock_identity_invalid")

    evidence = lock.get("candidate_evidence")
    contract = lock.get("protected_execution_contract")
    if (
        type(evidence) is not dict
        or evidence.get("source_path") != ACCEPTED_SOURCE_REL
        or evidence.get("source_git_blob_sha1") != ACCEPTED_SOURCE_BLOB
        or evidence.get("source_bytes") != ACCEPTED_SOURCE_BYTES
        or evidence.get("source_sha256") != ACCEPTED_SOURCE_SHA256
        or type(contract) is not dict
        or contract.get("install_root") != str(INSTALL_ROOT)
        or contract.get("source_path") != str(INSTALL_SOURCE)
        or contract.get("root_execution_required") is not True
        or contract.get("root_owned_nonwritable_ancestry_required") is not True
        or contract.get("isolated_safe_path_python_required") is not True
        or contract.get("bytecode_write_disabled_required") is not True
        or contract.get("mutable_checkout_privileged_execution_rejected")
        is not True
    ):
        hold("lock_execution_contract_invalid")

    for key in (
        "protected_install_authorized",
        "protected_source_installed",
        "live_privileged_census_authorized",
        "live_privileged_census_executed",
        "service_mutation",
        "systemd_mutation",
        "install_target_selected",
        "existing_target_replaced",
        "replacement_apply_authorized",
        "runtime_integration",
        "payment_acceptance",
        "public_presale_activation",
        "production_gate_ready",
        "funds_movement",
    ):
        if lock.get(key) is not False:
            hold("lock_authority_not_false:" + key)

    return lock


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
            "candidate_source_accepted":
                lock["candidate_source_accepted"],
        },
        "accepted_source": {
            "repository_path": ACCEPTED_SOURCE_REL,
            "git_blob_sha1": ACCEPTED_SOURCE_BLOB,
            "bytes": ACCEPTED_SOURCE_BYTES,
            "sha256": ACCEPTED_SOURCE_SHA256,
        },
        "install_contract": {
            "install_parent": str(INSTALL_PARENT),
            "install_root": str(INSTALL_ROOT),
            "install_source": str(INSTALL_SOURCE),
            "stage_root": str(STAGE_ROOT),
            "create_only": True,
            "destination_root_absent_required": True,
            "stage_root_absent_required": True,
            "root_owner_uid": 0,
            "root_group_gid": 0,
            "final_root_mode": FINAL_ROOT_MODE,
            "source_owner_uid": 0,
            "source_group_gid": 0,
            "final_source_mode": FINAL_SOURCE_MODE,
            "source_single_link_required": True,
            "same_filesystem_private_stage_required": True,
            "source_exact_bytes_before_publish_required": True,
            "source_sha256_before_publish_required": True,
            "kernel_noreplace_publication_required": True,
            "existing_destination_replacement_forbidden": True,
            "recursive_existing_destination_delete_forbidden": True,
            "fsync_source_before_publish_required": True,
            "fsync_stage_directory_before_publish_required": True,
            "fsync_install_parent_after_publish_required": True,
            "post_publish_exact_source_identity_required": True,
            "post_publish_root_owned_nonwritable_ancestry_required": True,
            "post_publish_source_single_link_required": True,
            "post_publish_python_i_b_required": True,
            "host_namespace_lease_provenance_still_required": True,
            "live_at_use_reverification_required": True,
            "installed_execution_authorized": False,
            "live_privileged_census_authorized": False,
        },
        "authority": {
            "source_plan_only": True,
            "root_execution_forbidden_for_plan": True,
            "production_plan_read_only": True,
            "production_plan_explicit_filesystem_write": False,
            "production_plan_filesystem_write_free": False,
            "production_plan_atime_write_possible": True,
            "protected_install_authorized": False,
            "protected_source_installed": False,
            "live_privileged_census_authorized": False,
            "live_privileged_census_executed": False,
            "service_mutation": False,
            "systemd_mutation": False,
            "install_target_selected": True,
            "existing_target_replaced": False,
            "replacement_apply_authorized": False,
            "runtime_integration": False,
            "payment_acceptance": False,
            "public_presale_activation": False,
            "production_gate_ready": False,
            "funds_movement": False,
        },
        "next_gate": (
            "REVIEW_CREATE_ONLY_PROTECTED_SOURCE_INSTALLER_CANDIDATE"
        ),
    }
    return {
        **body,
        "plan_id": PLAN_PREFIX + sha256(canonical(body)),
    }


def self_test() -> None:
    lock = verify_lock()
    if lock["candidate_source_accepted"] is not True:
        hold("self_test_source_not_accepted")
    plan = build_plan()
    contract = plan["install_contract"]
    authority = plan["authority"]
    if (
        contract["create_only"] is not True
        or contract["destination_root_absent_required"] is not True
        or contract["kernel_noreplace_publication_required"] is not True
        or contract["existing_destination_replacement_forbidden"] is not True
        or contract["installed_execution_authorized"] is not False
        or authority["install_target_selected"] is not True
        or authority["protected_install_authorized"] is not False
        or authority["replacement_apply_authorized"] is not False
        or authority["funds_movement"] is not False
    ):
        hold("self_test_authority_invalid")

    expected = PLAN_PREFIX + sha256(canonical({
        key: value for key, value in plan.items() if key != "plan_id"
    }))
    if plan["plan_id"] != expected:
        hold("self_test_plan_id_invalid")

    print(MARKER + "_SELF_TEST_GREEN")
    print("accepted_lock_exact=true")
    print("accepted_source_exact=true")
    print("fixed_protected_install_path_bound=true")
    print("create_only_plan=true")
    print("kernel_noreplace_publication_required=true")
    print("existing_destination_replacement_forbidden=true")
    print("post_publish_exact_source_identity_required=true")
    print("host_namespace_lease_provenance_still_required=true")
    print("live_at_use_reverification_required=true")
    print("root_execution_forbidden_for_plan=true")
    print("production_plan_explicit_filesystem_write=false")
    print("production_plan_filesystem_write_free=false")
    print("production_plan_atime_write_possible=true")
    print("install_target_selected=true")
    print("protected_install_authorized=false")
    print("protected_source_installed=false")
    print("live_privileged_census_authorized=false")
    print("replacement_apply_authorized=false")
    print("runtime_integration=false")
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
        print("protected_install_authorized=false")
        print("protected_source_installed=false")
        print("live_privileged_census_authorized=false")
        print("replacement_apply_authorized=false")
        print("filesystem_mutation=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)
