#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
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
PREDECESSOR_V1_REL = (
    "ops/precision/"
    "void_economic_sponsored_runtime_storage_designated_host_plan_v1.py"
)
PREDECESSOR_V1_GIT_BLOB_SHA1 = "90fbe18958d9d4a8f1739bcb22c4a9c8d611b108"

MARKER = "VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_DESIGNATED_HOST_PLAN_V2"
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

NSSWITCH = pathlib.Path("/etc/nsswitch.conf")
PASSWD_FILE = pathlib.Path("/etc/passwd")
GROUP_FILE = pathlib.Path("/etc/group")
LOGIN_DEFS = pathlib.Path("/etc/login.defs")
MACHINE_ID = pathlib.Path("/etc/machine-id")
GIT = "/usr/bin/git"

MAX_SOURCE_BYTES = 2 * 1024 * 1024
MAX_SMALL_FILE_BYTES = 128 * 1024
MAX_IDENTITY_FILE_BYTES = 2 * 1024 * 1024
MAX_IDENTITY_ROWS = 100_000
MAX_UNIT_SCAN_ENTRIES = 50_000
MAX_NAME_BYTES = 256
MAX_FIELD_BYTES = 4096
MAX_ID = 0x7FFFFFFF

HEX40 = re.compile(r"^[0-9a-f]{40}$")
ACCOUNT_NAME_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_.-]*[$]?$")


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


def _stat_evidence(path: pathlib.Path, st: os.stat_result, raw: bytes) -> dict[str, Any]:
    return {
        "path": str(path),
        "sha256": sha256(raw),
        "bytes": len(raw),
        "uid": st.st_uid,
        "gid": st.st_gid,
        "mode": format(stat.S_IMODE(st.st_mode), "04o"),
        "nlink": st.st_nlink,
        "dev": st.st_dev,
        "ino": st.st_ino,
        "mtime_ns": st.st_mtime_ns,
        "ctime_ns": st.st_ctime_ns,
    }


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
        or (
            require_root_owned
            and (visible_before.st_uid != 0 or visible_before.st_gid != 0)
        )
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


def _read_bound_local_file(
    path: pathlib.Path,
    *,
    max_bytes: int = MAX_IDENTITY_FILE_BYTES,
) -> tuple[bytes, dict[str, Any]]:
    raw, st = _read_regular_direct(
        path,
        max_bytes=max_bytes,
        require_root_owned=True,
        require_nonwritable=True,
    )
    return raw, _stat_evidence(path, st, raw)


def _revalidate_bound_local_file(
    path: pathlib.Path,
    expected: dict[str, Any],
    *,
    max_bytes: int = MAX_IDENTITY_FILE_BYTES,
) -> None:
    raw, st = _read_regular_direct(
        path,
        max_bytes=max_bytes,
        require_root_owned=True,
        require_nonwritable=True,
    )
    current = _stat_evidence(path, st, raw)
    if current != expected:
        raise PlanError("identity_authority_generation_changed:" + str(path))


def _decode_utf8(raw: bytes, code: str) -> str:
    try:
        return raw.decode("utf-8", "strict")
    except UnicodeDecodeError as exc:
        raise PlanError(code) from exc


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


def parse_nsswitch_local_files_only(text: str) -> dict[str, list[str]]:
    found: dict[str, list[str]] = {}
    for raw in text.splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        if ":" not in line:
            raise PlanError("nsswitch_line_invalid")
        database, source_text = line.split(":", 1)
        database = database.strip()
        if database not in ("passwd", "group"):
            continue
        if database in found:
            raise PlanError("nsswitch_duplicate_database:" + database)
        sources = source_text.split()
        if sources != ["files"]:
            raise PlanError("nsswitch_identity_source_not_files_only:" + database)
        found[database] = sources
    if set(found) != {"passwd", "group"}:
        raise PlanError("nsswitch_identity_database_missing")
    return found


def _bounded_text(value: str, code: str, *, maximum: int = MAX_FIELD_BYTES) -> str:
    raw = value.encode("utf-8", "strict")
    if len(raw) > maximum or "\x00" in value:
        raise PlanError(code)
    return value


def _parse_id(value: str, code: str) -> int:
    if not value.isascii() or not value.isdigit():
        raise PlanError(code)
    number = int(value)
    if number < 0 or number > MAX_ID:
        raise PlanError(code)
    return number


def parse_passwd_file(text: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    names: set[str] = set()
    for raw in text.splitlines():
        if raw == "":
            continue
        if len(rows) >= MAX_IDENTITY_ROWS:
            raise PlanError("passwd_row_limit_exceeded")
        parts = raw.split(":")
        if len(parts) != 7:
            raise PlanError("passwd_row_invalid")
        name, password, uid_text, gid_text, gecos, home, shell = parts
        if (
            not ACCOUNT_NAME_RE.fullmatch(name)
            or len(name.encode("utf-8")) > MAX_NAME_BYTES
            or name in names
        ):
            raise PlanError("passwd_name_invalid_or_duplicate")
        names.add(name)
        rows.append(
            {
                "name": name,
                "uid": _parse_id(uid_text, "passwd_uid_invalid"),
                "gid": _parse_id(gid_text, "passwd_gid_invalid"),
                "password": _bounded_text(password, "passwd_password_field_invalid"),
                "gecos": _bounded_text(gecos, "passwd_gecos_invalid"),
                "home": _bounded_text(home, "passwd_home_invalid"),
                "shell": _bounded_text(shell, "passwd_shell_invalid"),
            }
        )
    if not rows:
        raise PlanError("passwd_empty")
    return rows


def parse_group_file(text: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    names: set[str] = set()
    for raw in text.splitlines():
        if raw == "":
            continue
        if len(rows) >= MAX_IDENTITY_ROWS:
            raise PlanError("group_row_limit_exceeded")
        parts = raw.split(":")
        if len(parts) != 4:
            raise PlanError("group_row_invalid")
        name, password, gid_text, member_text = parts
        if (
            not ACCOUNT_NAME_RE.fullmatch(name)
            or len(name.encode("utf-8")) > MAX_NAME_BYTES
            or name in names
        ):
            raise PlanError("group_name_invalid_or_duplicate")
        names.add(name)
        members: list[str] = []
        if member_text:
            for member in member_text.split(","):
                if (
                    not ACCOUNT_NAME_RE.fullmatch(member)
                    or len(member.encode("utf-8")) > MAX_NAME_BYTES
                ):
                    raise PlanError("group_member_invalid")
                members.append(member)
            if len(set(members)) != len(members):
                raise PlanError("group_member_duplicate")
        rows.append(
            {
                "name": name,
                "gid": _parse_id(gid_text, "group_gid_invalid"),
                "password": _bounded_text(password, "group_password_field_invalid"),
                "members": members,
            }
        )
    if not rows:
        raise PlanError("group_empty")
    return rows


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
        found[key] = _parse_id(value, "login_defs_value_invalid:" + key)
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


def derive_local_identity_plan(
    passwd_rows: list[dict[str, Any]],
    group_rows: list[dict[str, Any]],
    bounds: dict[str, int],
) -> dict[str, Any]:
    service_users = [row for row in passwd_rows if row["name"] == SERVICE_USER]
    service_groups = [row for row in group_rows if row["name"] == SERVICE_GROUP]
    if service_users or service_groups:
        raise PlanError("selected_account_or_group_already_exists")

    operator_rows = [row for row in passwd_rows if row["name"] == EXPECTED_OPERATOR]
    uid_rows = [row for row in passwd_rows if row["uid"] == EXPECTED_OPERATOR_UID]
    if (
        len(operator_rows) != 1
        or operator_rows[0]["uid"] != EXPECTED_OPERATOR_UID
        or len(uid_rows) != 1
        or uid_rows[0]["name"] != EXPECTED_OPERATOR
    ):
        raise PlanError("local_operator_identity_invalid")

    used_uids = {row["uid"] for row in passwd_rows}
    used_gids = {row["gid"] for row in group_rows}
    used_gids.update(row["gid"] for row in passwd_rows)
    candidate = choose_shared_system_id(used_uids, used_gids, bounds)

    uid_wire = ",".join(str(x) for x in sorted(used_uids)).encode("ascii")
    gid_wire = ",".join(str(x) for x in sorted(used_gids)).encode("ascii")
    return {
        "service_user_exists": False,
        "service_group_exists": False,
        "operator_name": EXPECTED_OPERATOR,
        "operator_uid": EXPECTED_OPERATOR_UID,
        "operator_local_files_unique": True,
        "candidate_runtime_uid": candidate,
        "candidate_runtime_gid": candidate,
        "candidate_uid_gid_same": True,
        "candidate_local_identity_namespace_free_verified": True,
        "used_uid_set_sha256": sha256(uid_wire),
        "used_gid_set_sha256": sha256(gid_wire),
    }


def _local_identity_authority() -> dict[str, Any]:
    files = {
        "nsswitch": (NSSWITCH, MAX_SMALL_FILE_BYTES),
        "passwd": (PASSWD_FILE, MAX_IDENTITY_FILE_BYTES),
        "group": (GROUP_FILE, MAX_IDENTITY_FILE_BYTES),
        "login_defs": (LOGIN_DEFS, MAX_SMALL_FILE_BYTES),
    }
    raws: dict[str, bytes] = {}
    evidence: dict[str, dict[str, Any]] = {}
    for key, (path, maximum) in files.items():
        raw, row = _read_bound_local_file(path, max_bytes=maximum)
        raws[key] = raw
        evidence[key] = row

    nss = parse_nsswitch_local_files_only(
        _decode_utf8(raws["nsswitch"], "nsswitch_encoding_invalid")
    )
    passwd_rows = parse_passwd_file(
        _decode_utf8(raws["passwd"], "passwd_encoding_invalid")
    )
    group_rows = parse_group_file(
        _decode_utf8(raws["group"], "group_encoding_invalid")
    )
    bounds = parse_login_defs(
        _decode_utf8(raws["login_defs"], "login_defs_encoding_invalid")
    )

    derived = derive_local_identity_plan(passwd_rows, group_rows, bounds)
    return {
        "profile": "local_files_only_v2",
        "nsswitch_sources": nss,
        "files": evidence,
        "passwd_row_count": len(passwd_rows),
        "group_row_count": len(group_rows),
        "system_id_bounds": bounds,
        **derived,
        "libc_nss_lookup_used": False,
        "remote_nss_provider_allowed": False,
        "identity_resolution_external_network_calls": False,
    }


def _revalidate_local_identity_authority(authority: dict[str, Any]) -> None:
    mapping = {
        "nsswitch": (NSSWITCH, MAX_SMALL_FILE_BYTES),
        "passwd": (PASSWD_FILE, MAX_IDENTITY_FILE_BYTES),
        "group": (GROUP_FILE, MAX_IDENTITY_FILE_BYTES),
        "login_defs": (LOGIN_DEFS, MAX_SMALL_FILE_BYTES),
    }
    files = authority.get("files")
    if not isinstance(files, dict):
        raise PlanError("identity_authority_evidence_missing")
    for key, (path, maximum) in mapping.items():
        expected = files.get(key)
        if not isinstance(expected, dict):
            raise PlanError("identity_authority_evidence_missing:" + key)
        _revalidate_bound_local_file(path, expected, max_bytes=maximum)


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


def _git(args: list[str]) -> str:
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
            [
                GIT,
                "-C",
                str(ROOT),
                "-c",
                "core.fsmonitor=false",
                "-c",
                "core.hooksPath=/dev/null",
                *args,
            ],
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
    if (
        _git(["rev-parse", "HEAD:" + PREDECESSOR_V1_REL])
        != PREDECESSOR_V1_GIT_BLOB_SHA1
    ):
        raise PlanError("predecessor_v1_blob_mismatch")
    tree = _git(["rev-parse", "HEAD^{tree}"])
    if not HEX40.fullmatch(tree):
        raise PlanError("repository_tree_invalid")
    return {"head": head, "tree": tree, "branch": "main"}


def _plan_body(expected_head: str) -> dict[str, Any]:
    selection = _selection()
    if socket.gethostname() != EXPECTED_HOSTNAME:
        raise PlanError("wrong_host")
    if os.getuid() != EXPECTED_OPERATOR_UID or os.geteuid() != EXPECTED_OPERATOR_UID:
        raise PlanError("unexpected_numeric_operator_identity")

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

    identity_authority = _local_identity_authority()
    candidate = identity_authority["candidate_runtime_uid"]

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

    _revalidate_local_identity_authority(identity_authority)

    body: dict[str, Any] = {
        "marker": MARKER,
        "version": 2,
        "status": "READY_FOR_SEPARATE_PROVISIONING_AUTHORIZATION_LOCAL_FILES_V2",
        "selection_id": selection["selection_id"],
        "predecessor_v1_git_blob_sha1": PREDECESSOR_V1_GIT_BLOB_SHA1,
        "predecessor_v1_live_run_accepted": False,
        "repository": repo,
        "hostname": EXPECTED_HOSTNAME,
        "machine_id_sha256": machine_hash,
        "operator_user": EXPECTED_OPERATOR,
        "operator_uid": EXPECTED_OPERATOR_UID,
        "service_unit": SERVICE_UNIT,
        "service_user": SERVICE_USER,
        "service_group": SERVICE_GROUP,
        "unit_install_path": str(UNIT_INSTALL_PATH),
        "identity_resolution_authority": identity_authority,
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
        "local_files_identity_authority_verified": True,
        "account_name_absence_verified": True,
        "unit_name_absence_verified": True,
        "selected_storage_paths_absent_verified": True,
        "trusted_parent_ancestry_verified": True,
        "candidate_runtime_uid_gid_free_verified": True,
        "candidate_runtime_uid_gid_selected_in_plan": True,
        "production_service_identity_selected": True,
        "production_account_names_selected": True,
        "production_root_paths_selected": True,
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
        "libc_nss_lookup_used": False,
        "remote_nss_provider_allowed": False,
        "identity_resolution_external_network_calls": False,
        "external_network_calls": False,
        "next_action": "SEPARATELY_AUTHORIZE_SPONSORED_RUNTIME_STORAGE_BOOTSTRAP_V2",
    }
    return body


def collect(expected_head: str) -> dict[str, Any]:
    body = _plan_body(expected_head)
    plan_id = "voidsponsoredstoreplan2_" + sha256(
        canonical_json(body).encode("utf-8")
    )
    return {**body, "plan_id": plan_id}


def _expect_hold(callable_obj, code: str) -> None:
    try:
        callable_obj()
    except PlanError as exc:
        if str(exc) != code:
            raise AssertionError(f"expected {code}, got {exc}") from exc
    else:
        raise AssertionError("expected hold:" + code)


def self_test() -> None:
    nss = """
passwd: files
group: files
hosts: files dns
"""
    assert parse_nsswitch_local_files_only(nss) == {
        "passwd": ["files"],
        "group": ["files"],
    }
    for bad, code in (
        ("passwd: files systemd\ngroup: files\n", "nsswitch_identity_source_not_files_only:passwd"),
        ("passwd: files sss\ngroup: files\n", "nsswitch_identity_source_not_files_only:passwd"),
        ("passwd: ldap\ngroup: files\n", "nsswitch_identity_source_not_files_only:passwd"),
        ("passwd: compat\ngroup: files\n", "nsswitch_identity_source_not_files_only:passwd"),
        ("passwd: files [SUCCESS=return]\ngroup: files\n", "nsswitch_identity_source_not_files_only:passwd"),
        ("passwd: files\npasswd: files\ngroup: files\n", "nsswitch_duplicate_database:passwd"),
        ("passwd: files\n", "nsswitch_identity_database_missing"),
    ):
        _expect_hold(lambda value=bad: parse_nsswitch_local_files_only(value), code)

    passwd_text = "\n".join(
        (
            "root:x:0:0:root:/root:/bin/bash",
            "daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin",
            "zoso:x:1000:1000:ZoSo:/home/zoso:/bin/bash",
        )
    ) + "\n"
    group_text = "\n".join(
        (
            "root:x:0:",
            "daemon:x:1:",
            "zoso:x:1000:",
        )
    ) + "\n"
    passwd_rows = parse_passwd_file(passwd_text)
    group_rows = parse_group_file(group_text)
    assert [x["name"] for x in passwd_rows] == ["root", "daemon", "zoso"]
    assert [x["name"] for x in group_rows] == ["root", "daemon", "zoso"]

    _expect_hold(
        lambda: parse_passwd_file(passwd_text + "zoso:x:1001:1001::/tmp:/bin/false\n"),
        "passwd_name_invalid_or_duplicate",
    )
    _expect_hold(
        lambda: parse_group_file(group_text + "zoso:x:1001:\n"),
        "group_name_invalid_or_duplicate",
    )
    _expect_hold(
        lambda: parse_passwd_file("bad:x:notnum:1::/:/bin/false\n"),
        "passwd_uid_invalid",
    )

    login_text = """
SYS_UID_MIN 100
SYS_UID_MAX 999
SYS_GID_MIN 100
SYS_GID_MAX 999
"""
    bounds = parse_login_defs(login_text)
    assert choose_shared_system_id({999, 998}, {999, 997}, bounds) == 996
    derived = derive_local_identity_plan(passwd_rows, group_rows, bounds)
    assert derived["candidate_runtime_uid"] == 999
    assert derived["candidate_runtime_gid"] == 999
    assert derived["operator_local_files_unique"] is True

    service_row = {
        "name": SERVICE_USER,
        "uid": 998,
        "gid": 998,
        "password": "x",
        "gecos": "",
        "home": "/nonexistent",
        "shell": "/usr/sbin/nologin",
    }
    _expect_hold(
        lambda: derive_local_identity_plan(
            [*passwd_rows, service_row], group_rows, bounds
        ),
        "selected_account_or_group_already_exists",
    )
    alias_row = {
        "name": "zoso-alias",
        "uid": EXPECTED_OPERATOR_UID,
        "gid": 1000,
        "password": "x",
        "gecos": "",
        "home": "/home/zoso",
        "shell": "/bin/bash",
    }
    _expect_hold(
        lambda: derive_local_identity_plan(
            [*passwd_rows, alias_row], group_rows, bounds
        ),
        "local_operator_identity_invalid",
    )
    _expect_hold(
        lambda: choose_shared_system_id(set(range(100, 1000)), set(), bounds),
        "no_free_shared_system_uid_gid",
    )

    body = {
        "marker": MARKER,
        "version": 2,
        "status": "READY_FOR_SEPARATE_PROVISIONING_AUTHORIZATION_LOCAL_FILES_V2",
        "candidate_runtime_uid": 996,
        "candidate_runtime_gid": 996,
        "funds_movement": False,
    }
    plan_id = "voidsponsoredstoreplan2_" + sha256(
        canonical_json(body).encode("utf-8")
    )
    assert re.fullmatch(r"voidsponsoredstoreplan2_[0-9a-f]{64}", plan_id)

    print(MARKER + "_SELF_TEST_GREEN")
    print("nsswitch_passwd_group_files_only_required=true")
    print("remote_nss_provider_rejected=true")
    print("passwd_group_strict_parser=true")
    print("highest_free_shared_system_id_deterministic=true")
    print("libc_nss_lookup_used=false")
    print("identity_resolution_external_network_calls=false")
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
    print("predecessor_v1_live_run_accepted=false")
    print("expected_hostname=" + EXPECTED_HOSTNAME)
    print("service_unit=" + SERVICE_UNIT)
    print("service_user=" + SERVICE_USER)
    print("service_group=" + SERVICE_GROUP)
    print("identity_resolution_profile=local_files_only_v2")
    print("nsswitch_passwd_group_files_only_required=true")
    print("libc_nss_lookup_used=false")
    print("remote_nss_provider_allowed=false")
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
    print("next_action=RUN_READ_ONLY_LOCAL_FILES_DESIGNATED_HOST_PLAN_V2")


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
        "predecessor_v1_git_blob_sha1",
        "predecessor_v1_live_run_accepted",
        "hostname",
        "machine_id_sha256",
        "operator_user",
        "operator_uid",
        "service_unit",
        "service_user",
        "service_group",
        "candidate_runtime_uid",
        "candidate_runtime_gid",
        "candidate_uid_gid_same",
        "parent_root",
        "time_root",
        "reservation_root",
        "replay_root",
        "designated_host_identity_verified",
        "host_plan_read_only",
        "local_files_identity_authority_verified",
        "account_name_absence_verified",
        "unit_name_absence_verified",
        "selected_storage_paths_absent_verified",
        "trusted_parent_ancestry_verified",
        "candidate_runtime_uid_gid_free_verified",
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
        "libc_nss_lookup_used",
        "remote_nss_provider_allowed",
        "identity_resolution_external_network_calls",
        "external_network_calls",
        "next_action",
        "plan_id",
    ):
        value = result[key]
        print(f"{key}={str(value).lower() if isinstance(value, bool) else value}")
    print(
        "identity_resolution_authority_json="
        + json.dumps(
            result["identity_resolution_authority"],
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=True,
        )
    )
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
