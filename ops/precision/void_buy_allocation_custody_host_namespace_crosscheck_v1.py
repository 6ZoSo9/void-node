#!/usr/bin/env python3
# Read-only consistency verifier for two independently collected namespace-candidate receipts.
import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = "VOID_BUY_VOID_CUSTODY_HOST_NAMESPACE_CROSSCHECK_V1"
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
        print("production_filesystem_write=false")
        print("lease_authority=false")
        print("process_census_consumption_authorized=false")
        print("replacement_apply_authorized=false")
        raise SystemExit(2)
    raise RuntimeError("python_isolated_unoptimized_nobytecode_mode_required")

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import tempfile
from typing import Any

MARKER = _BOOTSTRAP_MARKER
SCHEMA = "void_buy_void_custody_host_namespace_crosscheck_v1"
VERSION = 1

CANDIDATE_COLLECTOR_GIT_BLOB = "ce6e416f5cccd79d421e9404f6f4fa12a416fc6a"
OBSERVATION_COLLECTOR_GIT_BLOB = "08094872d5a8aca720ae0a9f710866890d8132e7"
PROCESS_CENSUS_GIT_BLOB = "ded737a228a627a241a84131113db6d3521f635c"
DESIGNATED_HOST_POLICY_GIT_BLOB = "4234379cb7e283e03c654e10d0d7fe8986e99897"

CANDIDATE_MARKER = "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_HOST_NAMESPACE_LEASE_CENSUS_V1"
CANDIDATE_SCHEMA = "void_buy_void_custody_runtime_v3_host_namespace_lease_census_v1"
OBSERVATION_MARKER = "VOID_BUY_VOID_CUSTODY_HOST_NAMESPACE_LEASE_OBSERVATION_V1"
OBSERVATION_SCHEMA = "void_buy_void_custody_host_namespace_lease_observation_v1"

EXPECTED_HOSTNAME = "zoso-Precision-Tower-7810"
EXPECTED_OPERATOR = "zoso"
EXPECTED_OPERATOR_UID = 1000
EXPECTED_MACHINE_ID_SHA256 = (
    "11be124fb6d2d08003b89e467cef7e8b17d6dfb73592ccbe0984545ff1bcb0e2"
)
EXPECTED_DESIGNATED_HOST_POLICY_REL = (
    "ops/precision/"
    "void_economic_sponsored_runtime_storage_designated_host_plan_v3.py"
)
EXPECTED_PROCESS_CENSUS_REL = (
    "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_process_reference_census_v1.py"
)

MAX_RECEIPT_BYTES = 2 * 1024 * 1024
DEV_INO_RE = re.compile(r"[1-9][0-9]{0,19}:[1-9][0-9]{0,19}")
SHA256_RE = re.compile(r"[0-9a-f]{64}")


class CrosscheckHold(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise CrosscheckHold("custody_host_namespace_crosscheck_" + reason)


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


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
            next_fd = os.open(component, _directory_flags(), dir_fd=fd)
            opened = os.fstat(next_fd)
            if _identity(before) != _identity(opened):
                os.close(next_fd)
                hold("directory_component_rebound:" + component)
            os.close(fd)
            fd = next_fd
        opened = os.fstat(fd)
        visible = os.stat(str(absolute), follow_symlinks=False)
        if _identity(opened) != _identity(visible):
            hold("directory_terminal_rebound")
        return fd, opened
    except BaseException:
        os.close(fd)
        raise


def read_receipt(path: Path) -> tuple[dict[str, Any], bytes]:
    absolute = Path(os.path.abspath(os.fspath(path)))
    parent_fd, _ = _open_bound_directory(absolute.parent)
    fd = -1
    try:
        before = os.stat(absolute.name, dir_fd=parent_fd, follow_symlinks=False)
        if (
            not stat.S_ISREG(before.st_mode)
            or stat.S_ISLNK(before.st_mode)
            or before.st_size < 2
            or before.st_size > MAX_RECEIPT_BYTES
        ):
            hold("receipt_file_shape_invalid:" + absolute.name)
        fd = os.open(absolute.name, _leaf_flags(), dir_fd=parent_fd)
        opened = os.fstat(fd)
        if _generation(before) != _generation(opened):
            hold("receipt_file_rebound:" + absolute.name)
        raw = bytearray()
        while len(raw) <= MAX_RECEIPT_BYTES:
            chunk = os.read(fd, min(65536, MAX_RECEIPT_BYTES + 1 - len(raw)))
            if not chunk:
                break
            raw.extend(chunk)
        if len(raw) > MAX_RECEIPT_BYTES:
            hold("receipt_file_too_large:" + absolute.name)
        after = os.fstat(fd)
        visible = os.stat(absolute.name, dir_fd=parent_fd, follow_symlinks=False)
        if (
            _generation(opened) != _generation(after)
            or _generation(after) != _generation(visible)
        ):
            hold("receipt_file_generation_changed:" + absolute.name)
        try:
            value = json.loads(bytes(raw).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            hold("receipt_json_invalid:" + absolute.name + ":" + type(exc).__name__)
        if type(value) is not dict:
            hold("receipt_root_invalid:" + absolute.name)
        return value, bytes(raw)
    finally:
        if fd >= 0:
            os.close(fd)
        os.close(parent_fd)


def _require_bool(value: dict[str, Any], key: str, expected: bool, code: str) -> None:
    if value.get(key) is not expected:
        hold(code + ":" + key)


def _require_dev_ino(value: Any, code: str) -> str:
    if not isinstance(value, str) or not DEV_INO_RE.fullmatch(value):
        hold(code)
    return value


def _require_sha256(value: Any, code: str) -> str:
    if not isinstance(value, str) or not SHA256_RE.fullmatch(value):
        hold(code)
    return value


def _verify_internal_id(
    value: dict[str, Any],
    id_key: str,
    prefix: str,
    code: str,
) -> str:
    identifier = value.get(id_key)
    if not isinstance(identifier, str):
        hold(code + "_missing")
    body = {key: item for key, item in value.items() if key != id_key}
    expected = prefix + sha256(canonical(body))
    if identifier != expected:
        hold(code + "_mismatch")
    return identifier


def verify_candidate_receipt(value: dict[str, Any]) -> dict[str, Any]:
    if (
        value.get("schema") != CANDIDATE_SCHEMA
        or value.get("marker") != CANDIDATE_MARKER
        or value.get("version") != 1
    ):
        hold("candidate_identity_invalid")

    policy = value.get("designated_host_policy")
    host = value.get("host")
    namespace = value.get("namespace")
    if type(policy) is not dict or type(host) is not dict or type(namespace) is not dict:
        hold("candidate_shape_invalid")

    if (
        policy.get("path") != EXPECTED_DESIGNATED_HOST_POLICY_REL
        or policy.get("git_blob_sha1") != DESIGNATED_HOST_POLICY_GIT_BLOB
    ):
        hold("candidate_designated_host_policy_invalid")

    expected_host = {
        "hostname": EXPECTED_HOSTNAME,
        "operator": EXPECTED_OPERATOR,
        "operator_uid": EXPECTED_OPERATOR_UID,
        "machine_id_sha256": EXPECTED_MACHINE_ID_SHA256,
        "designated_host_identity_verified": True,
    }
    if host != expected_host:
        hold("candidate_host_identity_invalid")

    pid = _require_dev_ino(
        namespace.get("pid_namespace_candidate_dev_ino"),
        "candidate_pid_namespace_invalid",
    )
    mnt = _require_dev_ino(
        namespace.get("mount_namespace_candidate_dev_ino"),
        "candidate_mount_namespace_invalid",
    )
    boot = _require_sha256(
        namespace.get("boot_id_sha256"),
        "candidate_boot_id_invalid",
    )
    for key in (
        "pid1_pid_namespace_matches_self",
        "pid1_mount_namespace_matches_self",
        "proc_mount_contract_revalidated",
        "retained_procfs_view_revalidated",
        "same_boot_binding_observed",
        "namespace_values_candidate_only",
    ):
        _require_bool(namespace, key, True, "candidate_namespace_flag_invalid")
    for key in (
        "host_initial_pid_namespace_verified",
        "host_initial_mount_namespace_verified",
    ):
        _require_bool(namespace, key, False, "candidate_namespace_flag_invalid")

    proc_mount = namespace.get("proc_mount")
    if type(proc_mount) is not dict:
        hold("candidate_proc_mount_invalid")
    mount_id = proc_mount.get("mount_id")
    if not isinstance(mount_id, str) or not mount_id.isdigit() or int(mount_id) <= 0:
        hold("candidate_proc_mount_id_invalid")
    if proc_mount.get("hidepid_restricted") is not False:
        hold("candidate_proc_visibility_invalid")
    for key in ("mount_options", "super_options"):
        items = proc_mount.get(key)
        if (
            not isinstance(items, list)
            or any(not isinstance(item, str) or not item for item in items)
            or items != sorted(set(items))
        ):
            hold("candidate_proc_mount_options_invalid:" + key)

    for key, expected in (
        ("read_only", True),
        ("production_filesystem_write", False),
        ("root_execution", False),
        ("sudo_used", False),
        ("service_state_checked", False),
        ("service_mutation", False),
        ("systemd_mutation", False),
        ("process_environment_read", False),
        ("process_arguments_read", False),
        ("namespace_lease_is_install_authority", False),
        ("namespace_values_candidate_only", True),
        ("host_initial_namespace_authority_proven", False),
        ("namespace_lease_external_review_completed", False),
        ("automatic_process_census_feed_authorized", False),
        ("process_census_consumption_authorized", False),
        ("replacement_apply_authorized", False),
        ("runtime_integration", False),
        ("payment_acceptance", False),
        ("public_presale_activation", False),
        ("funds_movement", False),
    ):
        _require_bool(value, key, expected, "candidate_authority_invalid")

    if (
        not isinstance(namespace.get("proc_root_dev"), int)
        or namespace["proc_root_dev"] <= 0
        or not isinstance(namespace.get("proc_root_ino"), int)
        or namespace["proc_root_ino"] <= 0
    ):
        hold("candidate_proc_root_identity_invalid")

    identifier = _verify_internal_id(
        value,
        "namespace_candidate_id",
        "voidbuycustodynscandidate1_",
        "candidate_id",
    )
    return {
        "id": identifier,
        "pid": pid,
        "mnt": mnt,
        "boot": boot,
        "proc_root_dev": namespace["proc_root_dev"],
        "proc_root_ino": namespace["proc_root_ino"],
        "mount_id": int(mount_id),
        "mount_options": proc_mount["mount_options"],
        "super_options": proc_mount["super_options"],
        "operator_uid": host["operator_uid"],
    }


def verify_observation_receipt(value: dict[str, Any]) -> dict[str, Any]:
    if (
        value.get("schema") != OBSERVATION_SCHEMA
        or value.get("marker") != OBSERVATION_MARKER
        or value.get("version") != 1
    ):
        hold("observation_identity_invalid")
    source = value.get("process_census_source")
    visibility = value.get("proc_visibility")
    if type(source) is not dict or type(visibility) is not dict:
        hold("observation_shape_invalid")
    if (
        source.get("path") != EXPECTED_PROCESS_CENSUS_REL
        or source.get("git_blob_sha1") != PROCESS_CENSUS_GIT_BLOB
        or not isinstance(source.get("bytes"), int)
        or source["bytes"] <= 0
        or not SHA256_RE.fullmatch(str(source.get("sha256", "")))
    ):
        hold("observation_process_source_invalid")

    pid = _require_dev_ino(
        value.get("host_pid_namespace_dev_ino_candidate"),
        "observation_pid_namespace_invalid",
    )
    mnt = _require_dev_ino(
        value.get("host_mount_namespace_dev_ino_candidate"),
        "observation_mount_namespace_invalid",
    )
    boot = _require_sha256(value.get("boot_id_sha256"), "observation_boot_id_invalid")

    for key in (
        "pid1_pid_namespace_matches_self",
        "pid1_mount_namespace_matches_self",
        "same_boot_binding_observed",
        "retained_procfs_view",
        "retained_procfs_view_revalidated",
        "operator_observation_only",
        "operator_must_independently_know_host_context",
        "read_only",
        "root_execution_forbidden",
    ):
        _require_bool(value, key, True, "observation_flag_invalid")
    for key in (
        "independent_host_context_attested",
        "lease_authority",
        "automatic_process_census_composition_authorized",
        "production_filesystem_write",
        "process_environment_read",
        "process_arguments_read",
        "service_mutation",
        "systemd_mutation",
        "replacement_apply_authorized",
        "runtime_integration",
        "payment_acceptance",
        "public_presale_activation",
        "funds_movement",
    ):
        _require_bool(value, key, False, "observation_authority_invalid")

    if value.get("effective_uid") != EXPECTED_OPERATOR_UID:
        hold("observation_effective_uid_invalid")
    if (
        not isinstance(value.get("proc_root_dev"), int)
        or value["proc_root_dev"] <= 0
        or not isinstance(value.get("proc_root_ino"), int)
        or value["proc_root_ino"] <= 0
        or not isinstance(value.get("proc_mount_id"), int)
        or value["proc_mount_id"] <= 0
    ):
        hold("observation_proc_identity_invalid")
    if visibility.get("hidepid_restricted") is not False:
        hold("observation_proc_visibility_invalid")
    if visibility.get("mount_id") != value["proc_mount_id"]:
        hold("observation_proc_mount_id_mismatch")
    for key in ("mount_options", "super_options"):
        items = visibility.get(key)
        if (
            not isinstance(items, list)
            or any(not isinstance(item, str) or not item for item in items)
            or items != sorted(set(items))
        ):
            hold("observation_proc_mount_options_invalid:" + key)

    identifier = _verify_internal_id(
        value,
        "observation_id",
        "voidbuycustodynsleaseobs1_",
        "observation_id",
    )
    return {
        "id": identifier,
        "pid": pid,
        "mnt": mnt,
        "boot": boot,
        "proc_root_dev": value["proc_root_dev"],
        "proc_root_ino": value["proc_root_ino"],
        "mount_id": value["proc_mount_id"],
        "mount_options": visibility["mount_options"],
        "super_options": visibility["super_options"],
        "operator_uid": value["effective_uid"],
    }


def crosscheck(
    candidate: dict[str, Any],
    observation: dict[str, Any],
    *,
    candidate_receipt_sha256: str,
    observation_receipt_sha256: str,
) -> dict[str, Any]:
    _require_sha256(
        candidate_receipt_sha256,
        "candidate_receipt_sha256_invalid",
    )
    _require_sha256(
        observation_receipt_sha256,
        "observation_receipt_sha256_invalid",
    )
    c = verify_candidate_receipt(candidate)
    o = verify_observation_receipt(observation)

    for key, code in (
        ("pid", "pid_namespace_candidate_mismatch"),
        ("mnt", "mount_namespace_candidate_mismatch"),
        ("boot", "boot_id_mismatch"),
        ("proc_root_dev", "proc_root_device_mismatch"),
        ("proc_root_ino", "proc_root_inode_mismatch"),
        ("mount_id", "proc_mount_id_mismatch"),
        ("mount_options", "proc_mount_options_mismatch"),
        ("super_options", "proc_super_options_mismatch"),
        ("operator_uid", "operator_uid_mismatch"),
    ):
        if c[key] != o[key]:
            hold(code)

    body = {
        "schema": SCHEMA,
        "marker": MARKER,
        "version": VERSION,
        "expected_source_identities": {
            "designated_host_candidate_collector_git_blob":
                CANDIDATE_COLLECTOR_GIT_BLOB,
            "process_bound_observation_collector_git_blob":
                OBSERVATION_COLLECTOR_GIT_BLOB,
            "process_census_git_blob": PROCESS_CENSUS_GIT_BLOB,
            "designated_host_policy_git_blob": DESIGNATED_HOST_POLICY_GIT_BLOB,
        },
        "candidate_receipt_id": c["id"],
        "candidate_receipt_sha256": candidate_receipt_sha256,
        "observation_receipt_id": o["id"],
        "observation_receipt_sha256": observation_receipt_sha256,
        "pid_namespace_candidate_dev_ino": c["pid"],
        "mount_namespace_candidate_dev_ino": c["mnt"],
        "boot_id_sha256": c["boot"],
        "operator_uid": c["operator_uid"],
        "namespace_candidates_match": True,
        "boot_id_match": True,
        "procfs_identity_match": True,
        "proc_mount_contract_match": True,
        "operator_uid_match": True,
        "receipts_internally_consistent": True,
        "collector_source_provenance_authenticated": False,
        "receipt_origin_authenticated": False,
        "independent_host_context_attested": False,
        "external_reviewer_approval_required": True,
        "external_reviewer_approval_present": False,
        "lease_authority": False,
        "process_census_consumption_authorized": False,
        "automatic_process_census_feed_authorized": False,
        "replacement_apply_authorized": False,
        "runtime_integration": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "funds_movement": False,
        "read_only": True,
        "production_filesystem_write": False,
    }
    return {
        **body,
        "crosscheck_id": (
            "voidbuycustodynscross1_" + sha256(canonical(body))
        ),
    }


def _synthetic_receipts() -> tuple[dict[str, Any], dict[str, Any]]:
    proc_mount = {
        "mount_id": "42",
        "mount_options": ["nodev", "noexec", "nosuid", "relatime", "rw"],
        "super_options": ["hidepid=0", "rw"],
        "hidepid_restricted": False,
    }
    candidate_body = {
        "schema": CANDIDATE_SCHEMA,
        "marker": CANDIDATE_MARKER,
        "version": 1,
        "designated_host_policy": {
            "path": EXPECTED_DESIGNATED_HOST_POLICY_REL,
            "git_blob_sha1": DESIGNATED_HOST_POLICY_GIT_BLOB,
        },
        "host": {
            "hostname": EXPECTED_HOSTNAME,
            "operator": EXPECTED_OPERATOR,
            "operator_uid": EXPECTED_OPERATOR_UID,
            "machine_id_sha256": EXPECTED_MACHINE_ID_SHA256,
            "designated_host_identity_verified": True,
        },
        "namespace": {
            "pid_namespace_candidate_dev_ino": "10:20",
            "mount_namespace_candidate_dev_ino": "11:21",
            "proc_root_dev": 5,
            "proc_root_ino": 100,
            "proc_mount": proc_mount,
            "boot_id_sha256": "a" * 64,
            "pid1_pid_namespace_matches_self": True,
            "pid1_mount_namespace_matches_self": True,
            "host_initial_pid_namespace_verified": False,
            "host_initial_mount_namespace_verified": False,
            "namespace_values_candidate_only": True,
            "proc_mount_contract_revalidated": True,
            "retained_procfs_view_revalidated": True,
            "same_boot_binding_observed": True,
        },
        "read_only": True,
        "production_filesystem_write": False,
        "root_execution": False,
        "sudo_used": False,
        "service_state_checked": False,
        "service_mutation": False,
        "systemd_mutation": False,
        "process_environment_read": False,
        "process_arguments_read": False,
        "namespace_lease_is_install_authority": False,
        "namespace_values_candidate_only": True,
        "host_initial_namespace_authority_proven": False,
        "namespace_lease_external_review_completed": False,
        "automatic_process_census_feed_authorized": False,
        "process_census_consumption_authorized": False,
        "replacement_apply_authorized": False,
        "runtime_integration": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "funds_movement": False,
    }
    candidate = {
        **candidate_body,
        "namespace_candidate_id": (
            "voidbuycustodynscandidate1_" + sha256(canonical(candidate_body))
        ),
    }

    visibility = {
        "mount_id": 42,
        "mount_options": ["nodev", "noexec", "nosuid", "relatime", "rw"],
        "super_options": ["hidepid=0", "rw"],
        "hidepid_restricted": False,
    }
    observation_body = {
        "schema": OBSERVATION_SCHEMA,
        "marker": OBSERVATION_MARKER,
        "version": 1,
        "effective_uid": EXPECTED_OPERATOR_UID,
        "process_census_source": {
            "path": EXPECTED_PROCESS_CENSUS_REL,
            "git_blob_sha1": PROCESS_CENSUS_GIT_BLOB,
            "bytes": 12345,
            "sha256": "b" * 64,
        },
        "host_pid_namespace_dev_ino_candidate": "10:20",
        "host_mount_namespace_dev_ino_candidate": "11:21",
        "pid1_pid_namespace_matches_self": True,
        "pid1_mount_namespace_matches_self": True,
        "proc_root_dev": 5,
        "proc_root_ino": 100,
        "proc_mount_id": 42,
        "proc_visibility": visibility,
        "boot_id_sha256": "a" * 64,
        "same_boot_binding_observed": True,
        "retained_procfs_view": True,
        "retained_procfs_view_revalidated": True,
        "operator_observation_only": True,
        "operator_must_independently_know_host_context": True,
        "independent_host_context_attested": False,
        "lease_authority": False,
        "automatic_process_census_composition_authorized": False,
        "read_only": True,
        "production_filesystem_write": False,
        "root_execution_forbidden": True,
        "process_environment_read": False,
        "process_arguments_read": False,
        "service_mutation": False,
        "systemd_mutation": False,
        "replacement_apply_authorized": False,
        "runtime_integration": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "funds_movement": False,
    }
    observation = {
        **observation_body,
        "observation_id": (
            "voidbuycustodynsleaseobs1_" + sha256(canonical(observation_body))
        ),
    }
    return candidate, observation


def self_test() -> None:
    candidate, observation = _synthetic_receipts()
    candidate_bytes = canonical(candidate)
    observation_bytes = canonical(observation)
    result = crosscheck(
        candidate,
        observation,
        candidate_receipt_sha256=sha256(candidate_bytes),
        observation_receipt_sha256=sha256(observation_bytes),
    )
    if (
        result["namespace_candidates_match"] is not True
        or result["boot_id_match"] is not True
        or result["lease_authority"] is not False
        or result["external_reviewer_approval_required"] is not True
        or result["external_reviewer_approval_present"] is not False
    ):
        hold("self_test_positive_crosscheck_invalid")

    tests = (
        ("pid_namespace_candidate_mismatch", ("namespace", "pid_namespace_candidate_dev_ino"), "99:99"),
        ("mount_namespace_candidate_mismatch", ("namespace", "mount_namespace_candidate_dev_ino"), "98:98"),
        ("boot_id_mismatch", ("namespace", "boot_id_sha256"), "c" * 64),
    )
    for expected_code, path, replacement in tests:
        candidate_bad, observation_ok = _synthetic_receipts()
        candidate_bad[path[0]][path[1]] = replacement
        body = {
            key: item
            for key, item in candidate_bad.items()
            if key != "namespace_candidate_id"
        }
        candidate_bad["namespace_candidate_id"] = (
            "voidbuycustodynscandidate1_" + sha256(canonical(body))
        )
        try:
            crosscheck(
                candidate_bad,
                observation_ok,
                candidate_receipt_sha256=sha256(canonical(candidate_bad)),
                observation_receipt_sha256=sha256(canonical(observation_ok)),
            )
        except CrosscheckHold as exc:
            if expected_code not in str(exc):
                raise
        else:
            hold("self_test_mismatch_accepted:" + expected_code)

    candidate_bad, observation_ok = _synthetic_receipts()
    candidate_bad["namespace_lease_external_review_completed"] = True
    body = {
        key: item
        for key, item in candidate_bad.items()
        if key != "namespace_candidate_id"
    }
    candidate_bad["namespace_candidate_id"] = (
        "voidbuycustodynscandidate1_" + sha256(canonical(body))
    )
    try:
        crosscheck(
            candidate_bad,
            observation_ok,
            candidate_receipt_sha256=sha256(canonical(candidate_bad)),
            observation_receipt_sha256=sha256(canonical(observation_ok)),
        )
    except CrosscheckHold as exc:
        if "candidate_authority_invalid" not in str(exc):
            raise
    else:
        hold("self_test_candidate_authority_promotion_accepted")

    with tempfile.TemporaryDirectory(
        prefix="void-custody-ns-crosscheck-selftest-"
    ) as tmp:
        root = Path(tmp)
        candidate_path = root / "candidate.json"
        observation_path = root / "observation.json"
        candidate_path.write_bytes(canonical(candidate))
        observation_path.write_bytes(canonical(observation))
        candidate_read, candidate_raw = read_receipt(candidate_path)
        observation_read, observation_raw = read_receipt(observation_path)
        if candidate_read != candidate or observation_read != observation:
            hold("self_test_receipt_read_mismatch")
        if not candidate_raw or not observation_raw:
            hold("self_test_receipt_read_empty")

    print(MARKER + "_SELF_TEST_GREEN")
    print("candidate_receipt_id_recomputed=true")
    print("observation_receipt_id_recomputed=true")
    print("receipt_file_sha256_bound_into_crosscheck_id=true")
    print("designated_host_anchors_required=true")
    print("process_census_source_identity_required=true")
    print("pid_namespace_match_required=true")
    print("mount_namespace_match_required=true")
    print("boot_id_match_required=true")
    print("procfs_identity_match_required=true")
    print("proc_mount_contract_match_required=true")
    print("operator_uid_match_required=true")
    print("authority_promotion_rejected=true")
    print("collector_source_provenance_authenticated=false")
    print("receipt_origin_authenticated=false")
    print("independent_host_context_attested=false")
    print("external_reviewer_approval_required=true")
    print("external_reviewer_approval_present=false")
    print("lease_authority=false")
    print("process_census_consumption_authorized=false")
    print("automatic_process_census_feed_authorized=false")
    print("production_filesystem_write=false")
    print("self_test_temporary_filesystem_write=true")
    print("replacement_apply_authorized=false")
    print("runtime_integration=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("funds_movement=false")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--self-test", action="store_true")
    group.add_argument("--crosscheck", action="store_true")
    parser.add_argument("--candidate-receipt")
    parser.add_argument("--observation-receipt")
    args = parser.parse_args(argv)

    if args.self_test:
        if args.candidate_receipt is not None or args.observation_receipt is not None:
            hold("self_test_receipt_args_forbidden")
        self_test()
        return 0

    if args.crosscheck:
        if not args.candidate_receipt or not args.observation_receipt:
            hold("crosscheck_receipt_paths_required")
        candidate, candidate_raw = read_receipt(Path(args.candidate_receipt))
        observation, observation_raw = read_receipt(Path(args.observation_receipt))
        result = crosscheck(
            candidate,
            observation,
            candidate_receipt_sha256=sha256(candidate_raw),
            observation_receipt_sha256=sha256(observation_raw),
        )
        print(json.dumps(result, sort_keys=True, separators=(",", ":")))
        return 0

    return 2


if __name__ == "__main__":
    try:
        raise SystemExit(main(_bootstrap_sys.argv[1:]))
    except (CrosscheckHold, OSError, ValueError) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("collector_source_provenance_authenticated=false")
        print("receipt_origin_authenticated=false")
        print("independent_host_context_attested=false")
        print("external_reviewer_approval_required=true")
        print("external_reviewer_approval_present=false")
        print("lease_authority=false")
        print("process_census_consumption_authorized=false")
        print("automatic_process_census_feed_authorized=false")
        print("production_filesystem_write=false")
        print("replacement_apply_authorized=false")
        print("runtime_integration=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)
