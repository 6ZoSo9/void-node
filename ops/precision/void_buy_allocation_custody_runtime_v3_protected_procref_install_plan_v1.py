#!/usr/bin/env python3
# Read-only create-only installation plan for the protected process census source.
import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_PROCREF_INSTALL_PLAN_V1"
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
        print("filesystem_write=false")
        print("protected_install_authorized=false")
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
SCHEMA = "void_buy_void_custody_runtime_v3_protected_procref_install_plan_v1"
VERSION = 1
ROOT = Path(__file__).resolve().parents[2]

LOCK_REL = (
    "ops/security/"
    "buy-void-allocation-custody-runtime-v3-"
    "protected-all-process-reference-census-lock-v1.json"
)
LOCK_BLOB = "3eacfe0dec5144ba8c1e4c743bf3e8025f58f88a"
LOCK_PARENT_HEAD = "e709726c6a7d2af1e61956fa2e60f6fb0904c653"
LOCK_ID = (
    "voidbuycustodyallprocreflock1_"
    "0567991abb05c121722d47485ab9e7410b8b8126"
)

SOURCE_REL = (
    "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_"
    "protected_all_process_reference_census_v1.py"
)
SOURCE_BLOB = "0567991abb05c121722d47485ab9e7410b8b8126"
SOURCE_BYTES = 31062
SOURCE_SHA256 = (
    "c9de40bc6b6b25ded246a06d04560326541fdeee5a815a12f8fc40922226d90c"
)

OPT = Path("/opt")
INSTALL_ROOT = Path("/opt/void-buy-allocation-custody-procref-v1")
INSTALL_SOURCE_NAME = (
    "void_buy_allocation_custody_runtime_v3_"
    "protected_all_process_reference_census_v1.py"
)
INSTALL_SOURCE = INSTALL_ROOT / INSTALL_SOURCE_NAME
STAGE_ROOT = Path("/opt/.void-buy-allocation-custody-procref-v1.stage-v1")

STAGE_BUILD_MODE = "0700"
FINAL_ROOT_MODE = "0755"
FINAL_SOURCE_MODE = "0444"
MAX_READ_BYTES = 2 * 1024 * 1024


class PlanHold(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise PlanHold("custody_runtime_v3_protected_procref_install_plan_" + reason)


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


def _identity(st: os.stat_result) -> tuple[int, int, int, int, int, int, int]:
    return (
        st.st_dev,
        st.st_ino,
        st.st_uid,
        st.st_gid,
        st.st_mode,
        st.st_nlink,
        st.st_size,
    )


def read_exact_regular(
    path: Path,
    *,
    maximum: int,
    expected_blob: str | None = None,
    expected_bytes: int | None = None,
    expected_sha256: str | None = None,
) -> bytes:
    before = os.stat(path, follow_symlinks=False)
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > maximum
    ):
        hold("source_file_shape_invalid:" + path.name)
    if expected_bytes is not None and before.st_size != expected_bytes:
        hold("source_file_size_mismatch:" + path.name)

    fd = os.open(
        path,
        os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK,
    )
    try:
        opened = os.fstat(fd)
        if _identity(before) != _identity(opened):
            hold("source_file_rebound:" + path.name)
        raw = bytearray()
        while len(raw) <= maximum:
            chunk = os.read(fd, min(65536, maximum + 1 - len(raw)))
            if not chunk:
                break
            raw.extend(chunk)
        if len(raw) > maximum:
            hold("source_file_read_limit_exceeded:" + path.name)
        after = os.fstat(fd)
        visible = os.stat(path, follow_symlinks=False)
        if _identity(opened) != _identity(after) or _identity(after) != _identity(visible):
            hold("source_file_changed:" + path.name)
    finally:
        os.close(fd)

    data = bytes(raw)
    if expected_blob is not None and git_blob(data) != expected_blob:
        hold("source_file_blob_mismatch:" + path.name)
    if expected_sha256 is not None and sha256(data) != expected_sha256:
        hold("source_file_sha256_mismatch:" + path.name)
    return data


def verify_lock_and_source() -> dict[str, Any]:
    lock_raw = read_exact_regular(
        ROOT / LOCK_REL,
        maximum=256 * 1024,
        expected_blob=LOCK_BLOB,
    )
    try:
        lock = json.loads(lock_raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        hold("acceptance_lock_json_invalid:" + type(exc).__name__)

    if (
        type(lock) is not dict
        or lock.get("marker")
        != "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_REFERENCE_CENSUS_LOCK_V1"
        or lock.get("lock_id") != LOCK_ID
        or lock.get("candidate_source_accepted") is not True
        or lock.get("protected_install_authorized") is not False
        or lock.get("protected_source_installed") is not False
        or lock.get("live_privileged_census_authorized") is not False
        or lock.get("replacement_apply_authorized") is not False
        or lock.get("payment_acceptance") is not False
        or lock.get("public_presale_activation") is not False
        or lock.get("funds_movement") is not False
    ):
        hold("acceptance_lock_authority_invalid")

    evidence = lock.get("candidate_evidence")
    if (
        type(evidence) is not dict
        or evidence.get("source_git_blob_sha1") != SOURCE_BLOB
        or evidence.get("source_bytes") != SOURCE_BYTES
        or evidence.get("source_ascii_only") is not True
    ):
        hold("acceptance_lock_source_identity_invalid")

    source_raw = read_exact_regular(
        ROOT / SOURCE_REL,
        maximum=MAX_READ_BYTES,
        expected_blob=SOURCE_BLOB,
        expected_bytes=SOURCE_BYTES,
        expected_sha256=SOURCE_SHA256,
    )
    return {
        "lock": lock,
        "source_sha256": sha256(source_raw),
        "source_bytes": len(source_raw),
    }


def trusted_directory(path: Path) -> dict[str, Any]:
    st = os.stat(path, follow_symlinks=False)
    if (
        not stat.S_ISDIR(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or st.st_gid != 0
        or stat.S_IMODE(st.st_mode) & 0o022
    ):
        hold("trusted_directory_invalid:" + str(path))
    return {
        "path": str(path),
        "uid": st.st_uid,
        "gid": st.st_gid,
        "mode": format(stat.S_IMODE(st.st_mode), "04o"),
        "dev": st.st_dev,
        "ino": st.st_ino,
    }


def child_state(path: Path) -> dict[str, Any]:
    try:
        st = os.stat(path, follow_symlinks=False)
    except FileNotFoundError:
        return {"path": str(path), "state": "absent"}
    if stat.S_ISLNK(st.st_mode):
        kind = "symlink"
    elif stat.S_ISDIR(st.st_mode):
        kind = "directory"
    elif stat.S_ISREG(st.st_mode):
        kind = "file"
    else:
        kind = "special"
    return {
        "path": str(path),
        "state": "present",
        "kind": kind,
        "uid": st.st_uid,
        "gid": st.st_gid,
        "mode": format(stat.S_IMODE(st.st_mode), "04o"),
        "dev": st.st_dev,
        "ino": st.st_ino,
    }


def classify_prestate(
    install_root: dict[str, Any],
    stage_root: dict[str, Any],
) -> dict[str, Any]:
    install_absent = install_root["state"] == "absent"
    stage_absent = stage_root["state"] == "absent"
    return {
        "install_root_absent_observed": install_absent,
        "stage_root_absent_observed": stage_absent,
        "create_only_prestate_candidate": install_absent and stage_absent,
        "protected_install_ready": False,
        "protected_install_authorized": False,
    }


def plan() -> dict[str, Any]:
    verified = verify_lock_and_source()
    root = trusted_directory(Path("/"))
    opt = trusted_directory(OPT)
    install_state = child_state(INSTALL_ROOT)
    stage_state = child_state(STAGE_ROOT)
    prestate = classify_prestate(install_state, stage_state)

    body = {
        "schema": SCHEMA,
        "marker": MARKER,
        "version": VERSION,
        "accepted_lock": {
            "path": LOCK_REL,
            "git_blob_sha1": LOCK_BLOB,
            "lock_id": LOCK_ID,
            "parent_head": LOCK_PARENT_HEAD,
        },
        "candidate_source": {
            "path": SOURCE_REL,
            "git_blob_sha1": SOURCE_BLOB,
            "bytes": verified["source_bytes"],
            "sha256": verified["source_sha256"],
        },
        "protected_target": {
            "install_root": str(INSTALL_ROOT),
            "install_source": str(INSTALL_SOURCE),
            "stage_root": str(STAGE_ROOT),
            "stage_build_mode": STAGE_BUILD_MODE,
            "final_root_mode": FINAL_ROOT_MODE,
            "final_source_mode": FINAL_SOURCE_MODE,
        },
        "host_observation": {
            "root": root,
            "opt": opt,
            "install_root": install_state,
            "stage_root": stage_state,
            **prestate,
        },
        "future_apply_contract": {
            "apply_implemented": False,
            "separate_explicit_authorization_required": True,
            "root_execution_required": True,
            "isolated_safe_path_python_required": True,
            "bytecode_write_disabled_required": True,
            "source_candidate_reverification_required": True,
            "accepted_lock_reverification_required": True,
            "root_and_opt_custody_reverification_required": True,
            "install_root_absence_required": True,
            "stage_root_absence_required": True,
            "private_stage_create_only_required": True,
            "stage_root_mode_0700_during_build_required": True,
            "source_leaf_create_only_nofollow_required": True,
            "source_leaf_root_root_0444_required": True,
            "source_leaf_single_link_required": True,
            "source_leaf_fsync_required": True,
            "source_leaf_exact_sha256_reverification_required": True,
            "stage_directory_fsync_required": True,
            "stage_final_mode_0755_required": True,
            "renameat2_noreplace_publication_required": True,
            "opt_directory_fsync_after_publication_required": True,
            "final_tree_exact_reverification_required": True,
            "post_publication_automatic_cleanup_forbidden": True,
            "service_mutation_forbidden": True,
            "legacy_runtime_target_mutation_forbidden": True,
        },
        "read_only": True,
        "filesystem_write": False,
        "apply_available": False,
        "protected_install_authorized": False,
        "protected_install_performed": False,
        "live_privileged_census_authorized": False,
        "live_privileged_census_executed": False,
        "service_mutation": False,
        "systemd_mutation": False,
        "legacy_runtime_target_mutation": False,
        "existing_target_replaced": False,
        "replacement_apply_authorized": False,
        "runtime_integration": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "production_gate_ready": False,
        "funds_movement": False,
    }
    return {
        **body,
        "plan_id": "voidbuycustodyprocrefinstallplan1_" + sha256(canonical(body)),
    }


def self_test() -> None:
    verified = verify_lock_and_source()
    if verified["source_sha256"] != SOURCE_SHA256:
        hold("self_test_source_sha256_invalid")

    absent = {"path": "/x", "state": "absent"}
    present = {
        "path": "/x",
        "state": "present",
        "kind": "directory",
        "uid": 0,
        "gid": 0,
        "mode": "0755",
        "dev": 1,
        "ino": 2,
    }
    clean = classify_prestate(absent, absent)
    if clean["create_only_prestate_candidate"] is not True:
        hold("self_test_clean_prestate_rejected")
    if clean["protected_install_ready"] is not False:
        hold("self_test_plan_promoted_readiness")
    if classify_prestate(present, absent)["create_only_prestate_candidate"] is not False:
        hold("self_test_existing_install_root_accepted")
    if classify_prestate(absent, present)["create_only_prestate_candidate"] is not False:
        hold("self_test_existing_stage_root_accepted")

    print(MARKER + "_SELF_TEST_GREEN")
    print("accepted_lock_exact=true")
    print("candidate_source_git_blob_exact=true")
    print("candidate_source_sha256_exact=true")
    print("candidate_source_bytes_exact=true")
    print("create_only_prestate_classification_tested=true")
    print("apply_implemented=false")
    print("apply_available=false")
    print("read_only=true")
    print("filesystem_write=false")
    print("protected_install_authorized=false")
    print("protected_install_performed=false")
    print("live_privileged_census_authorized=false")
    print("live_privileged_census_executed=false")
    print("legacy_runtime_target_mutation=false")
    print("replacement_apply_authorized=false")
    print("runtime_integration=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("funds_movement=false")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--self-test", action="store_true")
    group.add_argument("--plan", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        self_test()
        return 0
    if args.plan:
        print(json.dumps(plan(), sort_keys=True, separators=(",", ":")))
        return 0
    return 2


if __name__ == "__main__":
    try:
        raise SystemExit(main(_bootstrap_sys.argv[1:]))
    except (PlanHold, OSError, ValueError) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("read_only=true")
        print("filesystem_write=false")
        print("apply_available=false")
        print("protected_install_authorized=false")
        print("live_privileged_census_authorized=false")
        print("replacement_apply_authorized=false")
        print("funds_movement=false")
        raise SystemExit(2)
