#!/usr/bin/env python3
from __future__ import annotations

import argparse
import grp
import hashlib
import json
import os
import pathlib
import pwd
import re
import socket
import stat
import subprocess
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]
EXPECTED_REPO_ROOT = pathlib.Path("/home/zoso/dev/void-node")
SELECTION_REL = (
    "ops/mainnet0/"
    "economic-sponsored-runtime-storage-production-selection-v1.json"
)
SELECTION_PATH = ROOT / SELECTION_REL
SELECTION_GIT_BLOB_SHA1 = "2d609f5fdcd10be767ad5518bc3188dff45d1fea"
SELECTION_ID = (
    "voidsponsoredstoreselect1_"
    "0224ed5a5cb20670e4b12259f0871357ebb8b52478702a98dd80edbf1d3ae938"
)

MARKER = "VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_DESIGNATED_HOST_PLAN_V1"
EXPECTED_HOSTNAME = "zoso-Precision-Tower-7810"
EXPECTED_OPERATOR = "zoso"
EXPECTED_OPERATOR_UID = 1000
EXPECTED_MACHINE_ID_SHA256 = (
    "11be124fb6d2d08003b89e467cef7e8b17d6dfb73592ccbe0984545ff1bcb0e2"
)

SERVICE_UNIT = "void-economic-sponsored-runtime-v1.service"
SERVICE_USER = "void-sponsored-runtime"
SERVICE_GROUP = "void-sponsored-runtime"
UNIT_INSTALL_PATH = pathlib.Path(
    "/etc/systemd/system/void-economic-sponsored-runtime-v1.service"
)
PARENT_ROOT = pathlib.Path("/var/lib/void-economic-sponsored-runtime-v1")
TIME_ROOT = PARENT_ROOT / "time"
RESERVATION_ROOT = PARENT_ROOT / "reservation"
REPLAY_ROOT = PARENT_ROOT / "replay"

LOGIN_DEFS = pathlib.Path("/etc/login.defs")
MACHINE_ID = pathlib.Path("/etc/machine-id")
GIT = "/usr/bin/git"
MAX_SOURCE_BYTES = 2 * 1024 * 1024
MAX_SMALL_FILE_BYTES = 128 * 1024
MAX_UNIT_SCAN_ENTRIES = 50_000
HEX40 = re.compile(r"^[0-9a-f]{40}$")
MODE_RE = re.compile(r"^0[0-7]{3}$")


class PlanError(RuntimeError):
    pass


def git_blob_sha1(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def canonical_json(value: Any) -> str:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    )


def _same_stat(a: os.stat_result, b: os.stat_result) -> bool:
    return (
        a.st_dev == b.st_dev
        and a.st_ino == b.st_ino
        and a.st_uid == b.st_uid
        and a.st_gid == b.st_gid
        and a.st_mode == b.st_mode
        and a.st_nlink == b.st_nlink
        and a.st_size == b.st_size
        and a.st_mtime_ns == b.st_mtime_ns
        and a.st_ctime_ns == b.st_ctime_ns
    )


def _read_regular_direct(
    path: pathlib.Path,
    *,
    max_bytes: int,
    require_root_owned: bool,
    require_nonwritable: bool,
) -> tuple[bytes, os.stat_result]:
    try:
        visible_before = path.lstat()
    except OSError as exc:
        raise PlanError("file_unavailable:" + str(path)) from exc
    if (
        not stat.S_ISREG(visible_before.st_mode)
        or stat.S_ISLNK(visible_before.st_mode)
        or visible_before.st_nlink != 1
        or visible_before.st_size < 1
        or visible_before.st_size > max_bytes
        or (require_root_owned and (visible_before.st_uid != 0 or visible_before.st_gid != 0))
        or (require_nonwritable and (visible_before.st_mode & 0o022) != 0)
    ):
        raise PlanError("file_metadata_invalid:" + str(path))
    try:
        fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    except OSError as exc:
        raise PlanError("file_open_failed:" + str(path)) from exc
    try:
        opened_before = os.fstat(fd)
        if not _same_stat(visible_before, opened_before):
            raise PlanError("file_rebound:" + str(path))
        remaining = visible_before.st_size
        chunks: list[bytes] = []
        while remaining:
            chunk = os.read(fd, min(256 * 1024, remaining))
            if not chunk:
                raise PlanError("file_short_read:" + str(path))
            chunks.append(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise PlanError("file_grew:" + str(path))
        opened_after = os.fstat(fd)
        visible_after = path.lstat()
        if (
            not _same_stat(opened_before, opened_after)
            or not _same_stat(opened_after, visible_after)
        ):
            raise PlanError("file_changed:" + str(path))
        return b"".join(chunks), visible_after
    finally:
        os.close(fd)


def _selection() -> dict[str, Any]:
    raw, _ = _read_regular_direct(
        SELECTION_PATH,
        max_bytes=MAX_SOURCE_BYTES,
        require_root_owned=False,
        require_nonwritable=False,
    )
    if git_blob_sha1(raw) != SELECTION_GIT_BLOB_SHA1:
        raise PlanError("selection_git_blob_mismatch")
    try:
        value = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise PlanError("selection_json_invalid") from exc
    if not isinstance(value, dict):
        raise PlanError("selection_shape_invalid")
    required = {
        "marker": "VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_PRODUCTION_SELECTION_V1",
        "schema": "void_economic_sponsored_runtime_storage_production_selection_v1",
        "version": 1,
        "status": "PRODUCTION_NAMES_AND_ROOTS_SELECTED_NOT_PROVISIONED",
        "historical_user_home_replay_root_reused": False,
        "production_service_identity_selected": True,
        "production_account_names_selected": True,
        "production_runtime_uid_gid_selected": False,
        "production_root_paths_selected": True,
        "live_host_evidence_verified": False,
        "storage_bootstrap": False,
        "service_installation": False,
        "service_start": False,
        "systemd_mutation": False,
        "filesystem_mutation": False,
        "time_store_root_stability_proven": False,
        "reservation_store_root_stability_proven": False,
        "execution_replay_store_root_stability_proven": False,
        "runtime_integration": False,
        "gas_sponsorship_performed": False,
        "transaction_submission": False,
        "public_presale_activation": False,
        "work_credit_write": False,
        "funds_movement": False,
        "next_action": "BUILD_SPONSORED_RUNTIME_STORAGE_DESIGNATED_HOST_PLAN_V1",
        "selection_id": SELECTION_ID,
    }
    for key, expected in required.items():
        if value.get(key) != expected:
            raise PlanError("selection_field_invalid:" + key)

    service = value.get("service")
    storage = value.get("storage")
    if not isinstance(service, dict) or not isinstance(storage, dict):
        raise PlanError("selection_nested_shape_invalid")
    service_required = {
        "unit": SERVICE_UNIT,
        "user": SERVICE_USER,
        "group": SERVICE_GROUP,
        "manager_scope": "system",
        "unit_install_path": str(UNIT_INSTALL_PATH),
        "runtime_uid": None,
        "runtime_gid": None,
    }
    for key, expected in service_required.items():
        if service.get(key) != expected:
            raise PlanError("selection_service_field_invalid:" + key)
    storage_required = {
        "parent_root": str(PARENT_ROOT),
        "parent_owner_uid": 0,
        "parent_owner_gid": 0,
        "parent_mode": "0755",
        "runtime_root_mode": "0700",
        "time_root": str(TIME_ROOT),
        "reservation_root": str(RESERVATION_ROOT),
        "replay_root": str(REPLAY_ROOT),
        "time_children": ["observation-time-v1.queue", "records"],
        "reservation_children": ["records", "sponsorship-admission-v1.queue"],
        "replay_children": [],
    }
    for key, expected in storage_required.items():
        if storage.get(key) != expected:
            raise PlanError("selection_storage_field_invalid:" + key)

    body = dict(value)
    body.pop("selection_id", None)
    derived = "voidsponsoredstoreselect1_" + sha256(
        canonical_json(body).encode("utf-8")
    )
    if derived != SELECTION_ID:
        raise PlanError("selection_id_rederive_failed")
    return value


def _machine_id_sha256() -> str:
    raw, _ = _read_regular_direct(
        MACHINE_ID,
        max_bytes=4096,
        require_root_owned=True,
        require_nonwritable=True,
    )
    try:
        machine = raw.decode("ascii", "strict").strip()
    except UnicodeDecodeError as exc:
        raise PlanError("machine_id_invalid") from exc
    if len(machine) != 32 or any(ch not in "0123456789abcdef" for ch in machine):
        raise PlanError("machine_id_invalid")
    return sha256(machine.encode("ascii"))


def _directory_snapshot(path: pathlib.Path) -> dict[str, Any]:
    try:
        visible_before = path.lstat()
    except OSError as exc:
        raise PlanError("trusted_directory_unavailable:" + str(path)) from exc
    if (
        not stat.S_ISDIR(visible_before.st_mode)
        or stat.S_ISLNK(visible_before.st_mode)
        or visible_before.st_uid != 0
        or visible_before.st_gid != 0
        or (visible_before.st_mode & 0o022) != 0
    ):
        raise PlanError("trusted_directory_invalid:" + str(path))
    try:
        fd = os.open(
            path,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
        )
    except OSError as exc:
        raise PlanError("trusted_directory_open_failed:" + str(path)) from exc
    try:
        opened = os.fstat(fd)
        visible_after = path.lstat()
        if (
            not _same_stat(visible_before, opened)
            or not _same_stat(opened, visible_after)
        ):
            raise PlanError("trusted_directory_changed:" + str(path))
        return {
            "path": str(path),
            "uid": visible_after.st_uid,
            "gid": visible_after.st_gid,
            "mode": format(stat.S_IMODE(visible_after.st_mode), "04o"),
            "dev": visible_after.st_dev,
            "ino": visible_after.st_ino,
        }
    finally:
        os.close(fd)


def _optional_path_state(path: pathlib.Path) -> dict[str, Any]:
    try:
        st = path.lstat()
    except FileNotFoundError:
        return {"path": str(path), "exists": False}
    except OSError as exc:
        raise PlanError("selected_path_lstat_failed:" + str(path)) from exc
    return {
        "path": str(path),
        "exists": True,
        "kind": (
            "directory"
            if stat.S_ISDIR(st.st_mode)
            else "regular"
            if stat.S_ISREG(st.st_mode)
            else "symlink"
            if stat.S_ISLNK(st.st_mode)
            else "other"
        ),
        "uid": st.st_uid,
        "gid": st.st_gid,
        "mode": format(stat.S_IMODE(st.st_mode), "04o"),
        "dev": st.st_dev,
        "ino": st.st_ino,
        "nlink": st.st_nlink,
    }


def parse_login_defs(text: str) -> dict[str, int]:
    wanted = ("SYS_UID_MIN", "SYS_UID_MAX", "SYS_GID_MIN", "SYS_GID_MAX")
    found: dict[str, int] = {}
    for raw in text.splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) != 2 or parts[0] not in wanted:
            continue
        key, value = parts
        if key in found:
            raise PlanError("login_defs_duplicate:" + key)
        if not value.isascii() or not value.isdigit():
            raise PlanError("login_defs_value_invalid:" + key)
        found[key] = int(value)
    if set(found) != set(wanted):
        raise PlanError("login_defs_required_bounds_missing")
    if not (
        1 <= found["SYS_UID_MIN"] <= found["SYS_UID_MAX"] < 65534
        and 1 <= found["SYS_GID_MIN"] <= found["SYS_GID_MAX"] < 65534
    ):
        raise PlanError("login_defs_bounds_invalid")
    return found


def choose_shared_system_id(
    used_uids: set[int],
    used_gids: set[int],
    bounds: dict[str, int],
) -> int:
    low = max(bounds["SYS_UID_MIN"], bounds["SYS_GID_MIN"], 1)
    high = min(bounds["SYS_UID_MAX"], bounds["SYS_GID_MAX"], 65533)
    if low > high:
        raise PlanError("system_uid_gid_ranges_do_not_overlap")
    for candidate in range(high, low - 1, -1):
        if candidate not in used_uids and candidate not in used_gids:
            return candidate
    raise PlanError("no_free_shared_system_uid_gid")


def _login_defs() -> tuple[dict[str, int], str]:
    raw, _ = _read_regular_direct(
        LOGIN_DEFS,
        max_bytes=MAX_SMALL_FILE_BYTES,
        require_root_owned=True,
        require_nonwritable=True,
    )
    try:
        text = raw.decode("utf-8", "strict")
    except UnicodeDecodeError as exc:
        raise PlanError("login_defs_encoding_invalid") from exc
    return parse_login_defs(text), sha256(raw)


def _named_identity_state() -> dict[str, Any]:
    try:
        user = pwd.getpwnam(SERVICE_USER)
    except KeyError:
        user = None
    try:
        group = grp.getgrnam(SERVICE_GROUP)
    except KeyError:
        group = None

    if user is None and group is None:
        return {
            "user_exists": False,
            "group_exists": False,
            "existing_uid": None,
            "existing_gid": None,
        }
    return {
        "user_exists": user is not None,
        "group_exists": group is not None,
        "existing_uid": None if user is None else user.pw_uid,
        "existing_gid": None if group is None else group.gr_gid,
    }


def _used_id_fingerprints() -> tuple[set[int], set[int], str, str]:
    used_uids = {row.pw_uid for row in pwd.getpwall()}
    used_gids = {row.gr_gid for row in grp.getgrall()}
    uid_wire = ",".join(str(x) for x in sorted(used_uids)).encode("ascii")
    gid_wire = ",".join(str(x) for x in sorted(used_gids)).encode("ascii")
    return used_uids, used_gids, sha256(uid_wire), sha256(gid_wire)


def _unit_collision_paths() -> list[str]:
    found: set[str] = set()
    direct_roots = (
        pathlib.Path("/etc/systemd/system"),
        pathlib.Path("/run/systemd/system"),
        pathlib.Path("/usr/lib/systemd/system"),
        pathlib.Path("/lib/systemd/system"),
    )
    for root in direct_roots:
        candidate = root / SERVICE_UNIT
        try:
            candidate.lstat()
        except FileNotFoundError:
            pass
        except OSError as exc:
            raise PlanError("unit_path_lstat_failed:" + str(candidate)) from exc
        else:
            found.add(str(candidate))

    visited = 0
    for root in (pathlib.Path("/etc/systemd/system"), pathlib.Path("/run/systemd/system")):
        if not root.exists():
            continue
        for dirpath, dirnames, filenames in os.walk(root, followlinks=False):
            visited += len(dirnames) + len(filenames)
            if visited > MAX_UNIT_SCAN_ENTRIES:
                raise PlanError("systemd_unit_scan_limit_exceeded")
            if SERVICE_UNIT in filenames or SERVICE_UNIT in dirnames:
                found.add(str(pathlib.Path(dirpath) / SERVICE_UNIT))
    return sorted(found)


def _git(
    args: list[str],
) -> str:
    env = {
        "PATH": "/usr/bin:/bin",
        "HOME": "/home/zoso",
        "LANG": "C",
        "LC_ALL": "C",
        "GIT_OPTIONAL_LOCKS": "0",
        "GIT_NO_REPLACE_OBJECTS": "1",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": "/dev/null",
        "GIT_CONFIG_SYSTEM": "/dev/null",
    }
    try:
        cp = subprocess.run(
            [GIT, "-C", str(ROOT), "-c", "core.fsmonitor=false",
             "-c", "core.hooksPath=/dev/null", *args],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="strict",
            timeout=10,
            check=False,
            env=env,
            close_fds=True,
        )
    except (OSError, subprocess.SubprocessError, UnicodeError) as exc:
        raise PlanError("git_execution_failed") from exc
    if cp.returncode != 0 or cp.stderr != "":
        raise PlanError("git_failed:" + (args[0] if args else "unknown"))
    return cp.stdout.strip()


def _repo_snapshot(expected_head: str) -> dict[str, str]:
    if ROOT != EXPECTED_REPO_ROOT:
        raise PlanError("repository_root_invalid")
    if not HEX40.fullmatch(expected_head):
        raise PlanError("expected_head_invalid")
    head = _git(["rev-parse", "--verify", "HEAD"])
    if head != expected_head:
        raise PlanError("repository_head_mismatch")
    if _git(["branch", "--show-current"]) != "main":
        raise PlanError("repository_branch_not_main")
    if _git(["status", "--porcelain=v1", "--untracked-files=all"]) != "":
        raise PlanError("repository_not_clean")
    if _git(["rev-parse", "HEAD:" + SELECTION_REL]) != SELECTION_GIT_BLOB_SHA1:
        raise PlanError("repository_selection_blob_mismatch")
    tree = _git(["rev-parse", "HEAD^{tree}"])
    if not HEX40.fullmatch(tree):
        raise PlanError("repository_tree_invalid")
    return {"head": head, "tree": tree, "branch": "main"}


def _plan_body(expected_head: str) -> dict[str, Any]:
    selection = _selection()

    if socket.gethostname() != EXPECTED_HOSTNAME:
        raise PlanError("wrong_host")
    operator = pwd.getpwuid(os.getuid())
    if operator.pw_name != EXPECTED_OPERATOR or os.getuid() != EXPECTED_OPERATOR_UID:
        raise PlanError("wrong_operator_identity")
    if os.geteuid() != EXPECTED_OPERATOR_UID:
        raise PlanError("unexpected_effective_uid")

    machine_hash = _machine_id_sha256()
    if machine_hash != EXPECTED_MACHINE_ID_SHA256:
        raise PlanError("machine_id_mismatch")

    repo = _repo_snapshot(expected_head)

    trusted_ancestors = [
        _directory_snapshot(pathlib.Path("/")),
        _directory_snapshot(pathlib.Path("/var")),
        _directory_snapshot(pathlib.Path("/var/lib")),
        _directory_snapshot(pathlib.Path("/etc")),
        _directory_snapshot(pathlib.Path("/etc/systemd")),
        _directory_snapshot(pathlib.Path("/etc/systemd/system")),
    ]

    identity = _named_identity_state()
    if identity["user_exists"] or identity["group_exists"]:
        raise PlanError("selected_account_or_group_already_exists")

    bounds, login_defs_sha = _login_defs()
    used_uids, used_gids, uid_fingerprint, gid_fingerprint = _used_id_fingerprints()
    candidate = choose_shared_system_id(used_uids, used_gids, bounds)
    try:
        pwd.getpwuid(candidate)
    except KeyError:
        pass
    else:
        raise PlanError("candidate_uid_resolves_through_nss")
    try:
        grp.getgrgid(candidate)
    except KeyError:
        pass
    else:
        raise PlanError("candidate_gid_resolves_through_nss")

    unit_collisions = _unit_collision_paths()
    if unit_collisions:
        raise PlanError("selected_systemd_unit_already_exists")

    selected_paths = [
        _optional_path_state(PARENT_ROOT),
        _optional_path_state(TIME_ROOT),
        _optional_path_state(RESERVATION_ROOT),
        _optional_path_state(REPLAY_ROOT),
    ]
    if any(item["exists"] is True for item in selected_paths):
        raise PlanError("selected_storage_path_already_exists")

    body: dict[str, Any] = {
        "marker": MARKER,
        "version": 1,
        "status": "READY_FOR_SEPARATE_PROVISIONING_AUTHORIZATION",
        "selection_id": selection["selection_id"],
        "repository": repo,
        "hostname": EXPECTED_HOSTNAME,
        "machine_id_sha256": machine_hash,
        "operator_user": EXPECTED_OPERATOR,
        "operator_uid": EXPECTED_OPERATOR_UID,
        "service_unit": SERVICE_UNIT,
        "service_user": SERVICE_USER,
        "service_group": SERVICE_GROUP,
        "unit_install_path": str(UNIT_INSTALL_PATH),
        "named_identity_state": identity,
        "login_defs_sha256": login_defs_sha,
        "system_id_bounds": bounds,
        "used_uid_set_sha256": uid_fingerprint,
        "used_gid_set_sha256": gid_fingerprint,
        "candidate_runtime_uid": candidate,
        "candidate_runtime_gid": candidate,
        "candidate_uid_gid_same": True,
        "unit_collision_paths": unit_collisions,
        "trusted_ancestors": trusted_ancestors,
        "selected_path_states": selected_paths,
        "parent_root": str(PARENT_ROOT),
        "time_root": str(TIME_ROOT),
        "reservation_root": str(RESERVATION_ROOT),
        "replay_root": str(REPLAY_ROOT),
        "designated_host_identity_verified": True,
        "host_plan_read_only": True,
        "account_name_absence_verified": True,
        "unit_name_absence_verified": True,
        "selected_storage_paths_absent_verified": True,
        "trusted_parent_ancestry_verified": True,
        "candidate_runtime_uid_gid_free_verified": True,
        "production_service_identity_selected": True,
        "production_account_names_selected": True,
        "production_root_paths_selected": True,
        "candidate_runtime_uid_gid_selected_in_plan": True,
        "production_runtime_uid_gid_selected": False,
        "production_runtime_uid_gid_provisioned": False,
        "runtime_account_creation_authorized": False,
        "storage_provisioning_authorized": False,
        "live_host_evidence_verified": False,
        "storage_bootstrap": False,
        "service_installation": False,
        "service_start": False,
        "systemd_mutation": False,
        "filesystem_mutation": False,
        "runtime_integration": False,
        "gas_sponsorship_performed": False,
        "transaction_submission": False,
        "public_presale_activation": False,
        "work_credit_write": False,
        "funds_movement": False,
        "process_environment_access": False,
        "external_network_calls": False,
        "next_action":
            "SEPARATELY_AUTHORIZE_SPONSORED_RUNTIME_STORAGE_BOOTSTRAP_V1",
    }
    return body


def collect(expected_head: str) -> dict[str, Any]:
    body = _plan_body(expected_head)
    plan_id = "voidsponsoredstoreplan1_" + sha256(
        canonical_json(body).encode("utf-8")
    )
    return {**body, "plan_id": plan_id}


def self_test() -> None:
    text = """
# comment
SYS_UID_MIN 100
SYS_UID_MAX 999
SYS_GID_MIN 100
SYS_GID_MAX 999
"""
    bounds = parse_login_defs(text)
    assert bounds == {
        "SYS_UID_MIN": 100,
        "SYS_UID_MAX": 999,
        "SYS_GID_MIN": 100,
        "SYS_GID_MAX": 999,
    }
    assert choose_shared_system_id({999, 998}, {999, 997}, bounds) == 996
    try:
        parse_login_defs(text + "\nSYS_UID_MIN 101\n")
    except PlanError:
        pass
    else:
        raise AssertionError("duplicate login.defs key accepted")
    try:
        choose_shared_system_id(set(range(100, 1000)), set(), bounds)
    except PlanError:
        pass
    else:
        raise AssertionError("exhausted system UID range accepted")

    body = {
        "marker": MARKER,
        "version": 1,
        "status": "READY_FOR_SEPARATE_PROVISIONING_AUTHORIZATION",
        "candidate_runtime_uid": 996,
        "candidate_runtime_gid": 996,
        "funds_movement": False,
    }
    plan_id = "voidsponsoredstoreplan1_" + sha256(
        canonical_json(body).encode("utf-8")
    )
    assert re.fullmatch(r"voidsponsoredstoreplan1_[0-9a-f]{64}", plan_id)

    print(MARKER + "_SELF_TEST_GREEN")
    print("login_defs_bounds_parser=true")
    print("highest_free_shared_system_id_deterministic=true")
    print("numeric_identity_host_derived=true")
    print("plan_content_addressed=true")
    print("host_mutation=false")
    print("filesystem_mutation=false")
    print("systemd_mutation=false")
    print("funds_movement=false")


def source_plan() -> None:
    selection = _selection()
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_mutation=false")
    print("selection_id=" + selection["selection_id"])
    print("expected_hostname=" + EXPECTED_HOSTNAME)
    print("service_unit=" + SERVICE_UNIT)
    print("service_user=" + SERVICE_USER)
    print("service_group=" + SERVICE_GROUP)
    print("parent_root=" + str(PARENT_ROOT))
    print("time_root=" + str(TIME_ROOT))
    print("reservation_root=" + str(RESERVATION_ROOT))
    print("replay_root=" + str(REPLAY_ROOT))
    print("production_runtime_uid_gid_selected=false")
    print("runtime_account_creation_authorized=false")
    print("storage_provisioning_authorized=false")
    print("live_host_evidence_verified=false")
    print("storage_bootstrap=false")
    print("service_installation=false")
    print("service_start=false")
    print("systemd_mutation=false")
    print("filesystem_mutation=false")
    print("runtime_integration=false")
    print("gas_sponsorship_performed=false")
    print("public_presale_activation=false")
    print("work_credit_write=false")
    print("funds_movement=false")
    print("next_action=RUN_READ_ONLY_DESIGNATED_HOST_PLAN")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--run", action="store_true")
    parser.add_argument("--expected-head", default="")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0
    if args.source_plan:
        source_plan()
        return 0
    if not args.expected_head:
        raise PlanError("expected_head_required")

    result = collect(args.expected_head)
    print(MARKER)
    for key in (
        "status",
        "selection_id",
        "hostname",
        "machine_id_sha256",
        "operator_user",
        "operator_uid",
        "service_unit",
        "service_user",
        "service_group",
        "unit_install_path",
        "candidate_runtime_uid",
        "candidate_runtime_gid",
        "candidate_uid_gid_same",
        "parent_root",
        "time_root",
        "reservation_root",
        "replay_root",
        "designated_host_identity_verified",
        "host_plan_read_only",
        "account_name_absence_verified",
        "unit_name_absence_verified",
        "selected_storage_paths_absent_verified",
        "trusted_parent_ancestry_verified",
        "candidate_runtime_uid_gid_free_verified",
        "production_service_identity_selected",
        "production_account_names_selected",
        "production_root_paths_selected",
        "candidate_runtime_uid_gid_selected_in_plan",
        "production_runtime_uid_gid_selected",
        "production_runtime_uid_gid_provisioned",
        "runtime_account_creation_authorized",
        "storage_provisioning_authorized",
        "live_host_evidence_verified",
        "storage_bootstrap",
        "service_installation",
        "service_start",
        "systemd_mutation",
        "filesystem_mutation",
        "runtime_integration",
        "gas_sponsorship_performed",
        "transaction_submission",
        "public_presale_activation",
        "work_credit_write",
        "funds_movement",
        "process_environment_access",
        "external_network_calls",
        "next_action",
        "plan_id",
    ):
        value = result[key]
        print(f"{key}={str(value).lower() if isinstance(value, bool) else value}")
    print(
        "plan_json="
        + json.dumps(
            result,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=True,
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PlanError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("host_mutation=false")
        print("filesystem_mutation=false")
        print("systemd_mutation=false")
        print("service_installation=false")
        print("service_start=false")
        print("runtime_account_creation_authorized=false")
        print("storage_provisioning_authorized=false")
        print("runtime_integration=false")
        print("gas_sponsorship_performed=false")
        print("transaction_submission=false")
        print("public_presale_activation=false")
        print("work_credit_write=false")
        print("funds_movement=false")
        raise SystemExit(2)
