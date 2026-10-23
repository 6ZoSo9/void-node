#!/usr/bin/env python3
"""Derive/inspect the unaccepted custody runtime install archive candidate v3.

Packages only the separately accepted V3 package-free custody runtime bundle.
Never installs, replaces, chmod/chowns, starts services, accepts payments,
activates the presale, signs transactions, or moves funds.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
from typing import Any

MARKER = "VOID_BUY_VOID_CUSTODY_RUNTIME_INSTALL_ARCHIVE_V3"
SCHEMA = "void_buy_void_custody_runtime_install_archive_v3"
VERSION = 3
PREFIX = "void-buy-allocation-custody-runtime-install-v3/"
ROOT = Path(__file__).resolve().parent.parent
LOCK_REL = "ops/security/buy-void-allocation-custody-runtime-bundle-lock-v3.json"
LOCK_GIT_BLOB = "9e371ebc4ba1dcf494e55823eddb8a183c31d69f"
LOCK_SHA256 = "bfa65de5e4b3735bf32b46c0595a442d8979dd5768caebbfe563e568723fabfc"
LOCK_BYTES = 2387
CANDIDATE_TOOL = "tools/void-buy-allocation-custody-runtime-bundle-candidate-v3.mjs"
CANDIDATE_ID = "voidbuycustodybundle3_dae3764e1f1b660235d17ad933e32ed0d4f67d8fc4cd322286d34c5d9f0dbe32"
CANDIDATE_SHA256 = "0d1be868aab98debdf0785c59cf45954ae68b2e1ebd0687ee56206b10b02ac67"
CANDIDATE_GIT_BLOB = "3474174b68995eacd1c516bc9bc5190ff04757b6"
CANDIDATE_BYTES = 12379
RUNTIME_FILE_COUNT = 10
MAX_MEMBER = 16 * 1024 * 1024
MAX_ARCHIVE = 8 * 1024 * 1024
ARCHIVE_BASENAME = "void-buy-allocation-custody-runtime-install-v3.tar"
INTENDED_INSTALL_TARGET = "/opt/void-buy-allocation-custody-runtime-v1"

AUTHORITY = {
    "source_archive_candidate_only": True,
    "accepted_runtime_bundle_v3_required": True,
    "deterministic_ustar_required": True,
    "archive_candidate_accepted": False,
    "immutable_root_install": False,
    "install_target_selected": False,
    "existing_target_replaced": False,
    "node_binary_identity_verified": False,
    "request_root_selected": False,
    "shared_directory_selected": False,
    "service_unit_installed": False,
    "service_started": False,
    "service_restarted": False,
    "runtime_integration": False,
    "reserve_method_enabled": False,
    "recover_method_enabled": False,
    "payment_acceptance": False,
    "public_presale_activation": False,
    "production_gate_ready": False,
    "funds_movement": False,
}


class ArchiveHold(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise ArchiveHold("custody_runtime_install_archive_v3_" + reason)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob(data: bytes) -> str:
    prefix = b"blob " + str(len(data)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + data).hexdigest()


def canonical(value: object) -> bytes:
    return (
        json.dumps(value, sort_keys=True, ensure_ascii=True, separators=(",", ":"))
        + "\n"
    ).encode("utf-8")


def _same_identity(left: os.stat_result, right: os.stat_result) -> bool:
    return (
        left.st_dev,
        left.st_ino,
        left.st_uid,
        left.st_gid,
        stat.S_IMODE(left.st_mode),
        left.st_nlink,
    ) == (
        right.st_dev,
        right.st_ino,
        right.st_uid,
        right.st_gid,
        stat.S_IMODE(right.st_mode),
        right.st_nlink,
    )


def _same_file_generation(left: os.stat_result, right: os.stat_result) -> bool:
    return _same_identity(left, right) and (
        left.st_size,
        left.st_mtime_ns,
        left.st_ctime_ns,
    ) == (
        right.st_size,
        right.st_mtime_ns,
        right.st_ctime_ns,
    )


def read_bound_regular(path: Path, maximum: int = MAX_MEMBER) -> bytes:
    """Read one regular file through retained nofollow/nonblocking descriptors."""
    if (
        not isinstance(maximum, int)
        or isinstance(maximum, bool)
        or maximum < 1
        or maximum > 64 * 1024 * 1024
        or os.name != "posix"
        or not Path("/proc/self/fd").is_dir()
    ):
        hold("descriptor_read_capability_invalid")
    absolute = path.absolute()
    if not absolute.is_absolute() or "\x00" in str(absolute):
        hold("path_invalid")
    parts = absolute.parts
    if not parts or parts[0] != "/" or any(p in ("", ".", "..") for p in parts[1:]):
        hold("path_invalid")
    required = (
        getattr(os, "O_RDONLY", None),
        getattr(os, "O_DIRECTORY", None),
        getattr(os, "O_NOFOLLOW", None),
        getattr(os, "O_NONBLOCK", None),
    )
    if any(type(flag) is not int for flag in required):
        hold("descriptor_read_capability_invalid")
    directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_NONBLOCK
    leaf_flags = os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK
    parent_fd = -1
    leaf_fd = -1
    try:
        parent_fd = os.open("/", directory_flags)
        root_visible = os.stat("/", follow_symlinks=False)
        root_opened = os.fstat(parent_fd)
        if not stat.S_ISDIR(root_opened.st_mode) or not _same_identity(root_visible, root_opened):
            hold("filesystem_root_unbound")
        for component in parts[1:-1]:
            child = f"/proc/self/fd/{parent_fd}/{component}"
            visible = os.stat(child, follow_symlinks=False)
            if not stat.S_ISDIR(visible.st_mode) or stat.S_ISLNK(visible.st_mode):
                hold("ancestor_not_direct_directory:" + component)
            next_fd = os.open(child, directory_flags)
            opened = os.fstat(next_fd)
            if not stat.S_ISDIR(opened.st_mode) or not _same_identity(visible, opened):
                os.close(next_fd)
                hold("ancestor_rebound:" + component)
            os.close(parent_fd)
            parent_fd = next_fd
        leaf_name = parts[-1]
        leaf = f"/proc/self/fd/{parent_fd}/{leaf_name}"
        visible = os.stat(leaf, follow_symlinks=False)
        if (
            not stat.S_ISREG(visible.st_mode)
            or stat.S_ISLNK(visible.st_mode)
            or visible.st_nlink != 1
            or visible.st_size < 1
            or visible.st_size > maximum
        ):
            hold("file_metadata_invalid:" + str(path))
        leaf_fd = os.open(leaf, leaf_flags)
        opened = os.fstat(leaf_fd)
        if (
            not stat.S_ISREG(opened.st_mode)
            or opened.st_nlink != 1
            or opened.st_size < 1
            or opened.st_size > maximum
            or not _same_file_generation(visible, opened)
        ):
            hold("file_open_generation_invalid:" + str(path))
        out = bytearray()
        while len(out) <= opened.st_size:
            chunk = os.read(leaf_fd, min(65536, opened.st_size + 1 - len(out)))
            if not chunk:
                break
            out.extend(chunk)
        after = os.fstat(leaf_fd)
        visible_after = os.stat(str(absolute), follow_symlinks=False)
        if (
            len(out) != opened.st_size
            or not _same_file_generation(opened, after)
            or not _same_file_generation(after, visible_after)
        ):
            hold("file_changed_during_read:" + str(path))
        return bytes(out)
    finally:
        if leaf_fd >= 0:
            os.close(leaf_fd)
        if parent_fd >= 0:
            os.close(parent_fd)


def read_lock() -> tuple[bytes, dict[str, Any]]:
    raw = read_bound_regular(ROOT / LOCK_REL, 1024 * 1024)
    if len(raw) != LOCK_BYTES:
        hold("accepted_lock_bytes_mismatch")
    if git_blob(raw) != LOCK_GIT_BLOB:
        hold("accepted_lock_git_blob_mismatch")
    if sha256(raw) != LOCK_SHA256:
        hold("accepted_lock_sha256_mismatch")
    try:
        value = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        hold("accepted_lock_json_invalid:" + type(exc).__name__)
    evidence = value.get("candidate_evidence") if type(value) is dict else None
    hosted = value.get("candidate_hosted_evidence") if type(value) is dict else None
    if (
        type(value) is not dict
        or value.get("marker") != "VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_LOCK_V3"
        or value.get("version") != 3
        or value.get("candidate_accepted") is not True
        or value.get("immutable_root_install") is not False
        or value.get("runtime_integration") is not False
        or value.get("payment_acceptance") is not False
        or value.get("public_presale_activation") is not False
        or value.get("funds_movement") is not False
        or type(evidence) is not dict
        or evidence.get("candidate_id") != CANDIDATE_ID
        or evidence.get("sha256") != CANDIDATE_SHA256
        or evidence.get("git_blob_sha1") != CANDIDATE_GIT_BLOB
        or evidence.get("bytes") != CANDIDATE_BYTES
        or evidence.get("runtime_file_count") != RUNTIME_FILE_COUNT
        or evidence.get("all_three_fifo_safe_readers_bound") is not True
        or type(hosted) is not dict
        or hosted.get("workflow_run") != 39903798415
        or hosted.get("cross_node_byte_identity_verified") is not True
    ):
        hold("accepted_lock_semantics_invalid")
    return raw, value


def clean_node_environment() -> dict[str, str]:
    node = shutil.which("node")
    if not node:
        hold("node_command_missing")
    return {
        "PATH": str(Path(node).resolve(strict=True).parent) + ":/usr/bin:/bin",
        "HOME": "/nonexistent",
        "LANG": "C",
        "LC_ALL": "C",
        "NO_COLOR": "1",
        "NODE_OPTIONS": "",
        "NODE_PATH": "",
    }


def derive_runtime_candidate() -> tuple[bytes, dict[str, Any]]:
    with tempfile.TemporaryDirectory(prefix="void-custody-v3-archive-candidate-") as tmp:
        candidate_path = Path(tmp) / "candidate-v3.json"
        node = shutil.which("node")
        if not node:
            hold("node_command_missing")
        result = subprocess.run(
            [node, str(ROOT / CANDIDATE_TOOL), "--emit", str(candidate_path)],
            cwd=ROOT,
            env=clean_node_environment(),
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=90,
            check=False,
        )
        if (
            result.returncode != 0
            or len(result.stdout) > 1024 * 1024
            or len(result.stderr) > 1024 * 1024
        ):
            hold("runtime_candidate_derivation_failed")
        raw = read_bound_regular(candidate_path, 4 * 1024 * 1024)
    if len(raw) != CANDIDATE_BYTES:
        hold("runtime_candidate_bytes_mismatch")
    if sha256(raw) != CANDIDATE_SHA256:
        hold("runtime_candidate_sha256_mismatch")
    if git_blob(raw) != CANDIDATE_GIT_BLOB:
        hold("runtime_candidate_git_blob_mismatch")
    try:
        value = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        hold("runtime_candidate_json_invalid:" + type(exc).__name__)
    if (
        type(value) is not dict
        or value.get("candidate_id") != CANDIDATE_ID
        or value.get("candidate_accepted") is not False
        or value.get("runtime_integration") is not False
        or value.get("production_gate_ready") is not False
        or value.get("public_presale_activation") is not False
        or value.get("funds_movement") is not False
    ):
        hold("runtime_candidate_semantics_invalid")
    runtime_files = value.get("runtime_files")
    if type(runtime_files) is not list or len(runtime_files) != RUNTIME_FILE_COUNT:
        hold("runtime_candidate_file_count_invalid")
    return raw, value


def normalized_runtime_records(candidate: dict[str, Any]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in candidate["runtime_files"]:
        if type(item) is not dict:
            hold("runtime_candidate_file_record_invalid")
        rel = item.get("path")
        expected_bytes = item.get("bytes")
        expected_sha = item.get("sha256")
        imports = item.get("imports")
        runtime_kind = item.get("runtime_kind")
        tracked = item.get("tracked_source_git_blob_sha1")
        if (
            type(rel) is not str
            or not rel
            or rel.startswith("/")
            or ".." in rel.split("/")
            or rel in seen
            or type(expected_bytes) is not int
            or isinstance(expected_bytes, bool)
            or not 0 < expected_bytes <= MAX_MEMBER
            or type(expected_sha) is not str
            or len(expected_sha) != 64
            or type(imports) is not list
            or any(type(v) is not str for v in imports)
            or runtime_kind not in ("compiled_typescript", "tracked_source")
            or (tracked is not None and (type(tracked) is not str or len(tracked) != 40))
        ):
            hold("runtime_candidate_file_record_invalid")
        seen.add(rel)
        records.append(
            {
                "path": rel,
                "bytes": expected_bytes,
                "sha256": expected_sha,
                "tracked_source_git_blob_sha1": tracked,
                "imports": list(imports),
                "runtime_kind": runtime_kind,
            }
        )
    records.sort(key=lambda row: row["path"])
    return records


def runtime_payloads(candidate: dict[str, Any]) -> tuple[dict[str, bytes], list[dict[str, Any]]]:
    records = normalized_runtime_records(candidate)
    payloads: dict[str, bytes] = {}
    for row in records:
        raw = read_bound_regular(ROOT / row["path"], MAX_MEMBER)
        if len(raw) != row["bytes"] or sha256(raw) != row["sha256"]:
            hold("runtime_payload_identity_mismatch:" + row["path"])
        if row["tracked_source_git_blob_sha1"] is not None:
            if git_blob(raw) != row["tracked_source_git_blob_sha1"]:
                hold("runtime_payload_git_blob_mismatch:" + row["path"])
        payloads[PREFIX + "payload/" + row["path"]] = raw
    if len(payloads) != RUNTIME_FILE_COUNT:
        hold("runtime_payload_count_invalid")
    return payloads, records


def manifest(records: list[dict[str, Any]]) -> dict[str, Any]:
    body = {
        "schema": SCHEMA,
        "marker": MARKER,
        "version": VERSION,
        "repository": "6ZoSo9/void-node",
        "accepted_lock": {
            "path": LOCK_REL,
            "bytes": LOCK_BYTES,
            "git_blob_sha1": LOCK_GIT_BLOB,
            "sha256": LOCK_SHA256,
        },
        "runtime_candidate": {
            "candidate_id": CANDIDATE_ID,
            "bytes": CANDIDATE_BYTES,
            "sha256": CANDIDATE_SHA256,
            "git_blob_sha1": CANDIDATE_GIT_BLOB,
            "runtime_file_count": RUNTIME_FILE_COUNT,
        },
        "entrypoint": "tools/void-buy-allocation-custody-service-v2.mjs",
        "runtime_files": records,
        "archive": {
            "format": "USTAR",
            "prefix": PREFIX,
            "file_mode_octal": "0444",
            "uid": 0,
            "gid": 0,
            "uname": "",
            "gname": "",
            "mtime": 0,
            "sorted_member_names": True,
        },
        "intended_install_target": INTENDED_INSTALL_TARGET,
        "authority": AUTHORITY,
    }
    return {
        **body,
        "archive_candidate_id": "voidbuycustodyarchive3_" + sha256(canonical(body)),
    }


def canonical_archive(members: dict[str, bytes]) -> bytes:
    sink = io.BytesIO()
    with tarfile.open(fileobj=sink, mode="w", format=tarfile.USTAR_FORMAT) as archive:
        for name, data in sorted(members.items()):
            if (
                not name.startswith(PREFIX)
                or name.startswith("/")
                or ".." in name.split("/")
                or not 0 < len(data) <= MAX_MEMBER
            ):
                hold("archive_member_input_invalid:" + name)
            info = tarfile.TarInfo(name=name)
            info.size = len(data)
            info.uid = 0
            info.gid = 0
            info.uname = ""
            info.gname = ""
            info.mtime = 0
            info.mode = 0o444
            archive.addfile(info, io.BytesIO(data))
    raw = sink.getvalue()
    if not 0 < len(raw) <= MAX_ARCHIVE:
        hold("archive_size_invalid")
    return raw


def source_archive() -> tuple[bytes, dict[str, Any]]:
    lock_raw, _lock = read_lock()
    _candidate_raw, candidate = derive_runtime_candidate()
    payloads, records = runtime_payloads(candidate)
    record = manifest(records)
    members = {
        PREFIX + "review/accepted-runtime-bundle-lock-v3.json": lock_raw,
        PREFIX + "review/manifest.json": canonical(record),
        **payloads,
    }
    if len(members) != RUNTIME_FILE_COUNT + 2:
        hold("archive_member_count_invalid")
    return canonical_archive(members), record


def inspect_manifest(value: object, expected_records: list[dict[str, Any]]) -> dict[str, Any]:
    if type(value) is not dict:
        hold("archive_manifest_invalid")
    records = value.get("runtime_files")
    if records != expected_records:
        hold("archive_manifest_runtime_identity_not_accepted")
    wanted = manifest(expected_records)
    if value != wanted:
        hold("archive_manifest_content_invalid")
    return wanted


def inspect_archive(path: Path) -> dict[str, Any]:
    raw = read_bound_regular(path, MAX_ARCHIVE)
    _candidate_raw, candidate = derive_runtime_candidate()
    expected_records = normalized_runtime_records(candidate)
    members: dict[str, bytes] = {}
    total = 0
    try:
        with tarfile.open(fileobj=io.BytesIO(raw), mode="r:") as archive:
            for member in archive:
                if len(members) >= RUNTIME_FILE_COUNT + 2:
                    hold("archive_member_count_exceeded")
                if (
                    not member.isfile()
                    or member.name in members
                    or not member.name.startswith(PREFIX)
                    or member.name.startswith("/")
                    or ".." in member.name.split("/")
                    or member.uid != 0
                    or member.gid != 0
                    or member.uname != ""
                    or member.gname != ""
                    or member.mtime != 0
                    or member.mode != 0o444
                    or member.size < 1
                    or member.size > MAX_MEMBER
                ):
                    hold("archive_member_metadata_invalid")
                total += member.size
                if total > MAX_ARCHIVE:
                    hold("archive_member_bytes_exceeded")
                handle = archive.extractfile(member)
                if handle is None:
                    hold("archive_member_missing")
                data = handle.read(member.size + 1)
                if len(data) != member.size:
                    hold("archive_member_size_invalid")
                members[member.name] = data
    except tarfile.TarError as exc:
        hold("archive_parse_invalid:" + type(exc).__name__)

    lock_name = PREFIX + "review/accepted-runtime-bundle-lock-v3.json"
    manifest_name = PREFIX + "review/manifest.json"
    if lock_name not in members or manifest_name not in members:
        hold("archive_review_members_missing")
    if (
        len(members[lock_name]) != LOCK_BYTES
        or git_blob(members[lock_name]) != LOCK_GIT_BLOB
        or sha256(members[lock_name]) != LOCK_SHA256
    ):
        hold("archive_lock_identity_invalid")
    try:
        record = inspect_manifest(
            json.loads(members[manifest_name].decode("utf-8")),
            expected_records,
        )
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        hold("archive_manifest_json_invalid:" + type(exc).__name__)
    if members[manifest_name] != canonical(record):
        hold("archive_manifest_noncanonical")

    expected_names = {
        lock_name,
        manifest_name,
        *[PREFIX + "payload/" + row["path"] for row in expected_records],
    }
    if set(members) != expected_names:
        hold("archive_member_set_invalid")
    for row in expected_records:
        payload = members[PREFIX + "payload/" + row["path"]]
        if len(payload) != row["bytes"] or sha256(payload) != row["sha256"]:
            hold("archive_payload_identity_invalid:" + row["path"])
        if row["tracked_source_git_blob_sha1"] is not None:
            if git_blob(payload) != row["tracked_source_git_blob_sha1"]:
                hold("archive_payload_git_blob_invalid:" + row["path"])
    if raw != canonical_archive(members):
        hold("archive_noncanonical_wire_bytes")

    return {
        "marker": MARKER,
        "version": VERSION,
        "mode": "inspect",
        "archive_candidate_id": record["archive_candidate_id"],
        "archive_bytes": len(raw),
        "archive_sha256": sha256(raw),
        "runtime_files_exact": RUNTIME_FILE_COUNT,
        "archive_candidate_accepted": False,
        "immutable_root_install": False,
        "install_target_selected": False,
        "existing_target_replaced": False,
        "node_binary_identity_verified": False,
        "runtime_integration": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "production_gate_ready": False,
        "funds_movement": False,
    }


def open_bound_private_directory(path: Path) -> tuple[int, os.stat_result]:
    absolute = path.absolute()
    parts = absolute.parts
    if (
        not absolute.is_absolute()
        or not parts
        or parts[0] != "/"
        or any(part in ("", ".", "..") for part in parts[1:])
        or "\\x00" in str(absolute)
    ):
        hold("output_parent_path_invalid")
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_NONBLOCK
    current_fd = -1
    try:
        current_fd = os.open("/", flags)
        root_visible = os.stat("/", follow_symlinks=False)
        root_opened = os.fstat(current_fd)
        if not stat.S_ISDIR(root_opened.st_mode) or not _same_identity(
            root_visible, root_opened
        ):
            hold("output_filesystem_root_unbound")
        for component in parts[1:]:
            child = f"/proc/self/fd/{current_fd}/{component}"
            visible = os.stat(child, follow_symlinks=False)
            if not stat.S_ISDIR(visible.st_mode) or stat.S_ISLNK(visible.st_mode):
                hold("output_parent_ancestor_invalid:" + component)
            next_fd = os.open(child, flags)
            opened = os.fstat(next_fd)
            if not stat.S_ISDIR(opened.st_mode) or not _same_identity(
                visible, opened
            ):
                os.close(next_fd)
                hold("output_parent_ancestor_rebound:" + component)
            os.close(current_fd)
            current_fd = next_fd
        opened_parent = os.fstat(current_fd)
        visible_parent = os.stat(str(absolute), follow_symlinks=False)
        if (
            not stat.S_ISDIR(opened_parent.st_mode)
            or not _same_identity(opened_parent, visible_parent)
            or stat.S_IMODE(opened_parent.st_mode) & 0o077
        ):
            hold("output_parent_not_private_or_bound")
        return current_fd, opened_parent
    except Exception:
        if current_fd >= 0:
            os.close(current_fd)
        raise


def write_create_only(path: Path, raw: bytes) -> None:
    absolute = path.absolute()
    leaf = absolute.name
    if (
        not leaf
        or leaf in (".", "..")
        or "/" in leaf
        or "\\x00" in leaf
        or absolute.parent == absolute
    ):
        hold("output_leaf_invalid")
    parent_fd, parent_generation = open_bound_private_directory(absolute.parent)
    fd = -1
    try:
        leaf_path = f"/proc/self/fd/{parent_fd}/{leaf}"
        fd = os.open(
            leaf_path,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
            0o600,
        )
        total = 0
        while total < len(raw):
            written = os.write(fd, raw[total:])
            if written <= 0:
                hold("archive_write_failed")
            total += written
        os.fsync(fd)
        opened = os.fstat(fd)
        parent_after = os.fstat(parent_fd)
        parent_visible_after = os.stat(str(absolute.parent), follow_symlinks=False)
        if (
            not stat.S_ISREG(opened.st_mode)
            or opened.st_nlink != 1
            or stat.S_IMODE(opened.st_mode) & 0o077
            or not _same_identity(parent_generation, parent_after)
            or not _same_identity(parent_after, parent_visible_after)
        ):
            hold("archive_output_or_parent_generation_invalid")
    finally:
        if fd >= 0:
            os.close(fd)
        os.close(parent_fd)


def package(path: Path) -> dict[str, Any]:
    raw, record = source_archive()
    write_create_only(path, raw)
    inspected = inspect_archive(path)
    if inspected["archive_candidate_id"] != record["archive_candidate_id"]:
        hold("archive_postwrite_identity_mismatch")
    return inspected


def self_test() -> None:
    lock_raw, lock = read_lock()
    if len(lock_raw) != LOCK_BYTES or lock["candidate_accepted"] is not True:
        hold("self_test_lock_invalid")
    raw, record = source_archive()
    if record["authority"]["archive_candidate_accepted"] is not False:
        hold("self_test_authority_invalid")
    with tempfile.TemporaryDirectory(prefix="void-custody-v3-archive-selftest-") as tmp:
        parent = Path(tmp)
        os.chmod(parent, 0o700)
        archive = parent / ARCHIVE_BASENAME
        write_create_only(archive, raw)
        inspected = inspect_archive(archive)
        if (
            inspected["archive_candidate_id"] != record["archive_candidate_id"]
            or inspected["archive_sha256"] != sha256(raw)
            or inspected["archive_candidate_accepted"] is not False
            or inspected["funds_movement"] is not False
        ):
            hold("self_test_inspection_invalid")
        try:
            write_create_only(archive, raw)
        except FileExistsError:
            pass
        else:
            hold("self_test_create_only_overwrite_allowed")

        real_parent = parent / "real-output-parent"
        real_parent.mkdir(mode=0o700)
        linked_parent = parent / "linked-output-parent"
        linked_parent.symlink_to(real_parent, target_is_directory=True)
        try:
            write_create_only(linked_parent / "redirected.tar", raw)
        except ArchiveHold:
            pass
        else:
            hold("self_test_symlink_output_parent_accepted")
        if (real_parent / "redirected.tar").exists():
            hold("self_test_symlink_output_parent_created_file")

        trailing = parent / "trailing.tar"
        trailing.write_bytes(raw + b"X")
        try:
            inspect_archive(trailing)
        except ArchiveHold:
            pass
        else:
            hold("self_test_trailing_bytes_accepted")

        # Real late FIFO substitution against the descriptor-bound reader.
        nested = parent / "reader"
        nested.mkdir(mode=0o700)
        target = nested / "target"
        displaced = nested / "target.regular"
        target.write_bytes(b"reader-fixture\n")
        original_open = os.open
        swapped = False

        def guarded_open(name: Any, flags: int, *args: Any, **kwargs: Any) -> int:
            nonlocal swapped
            text = os.fspath(name)
            if (
                not swapped
                and isinstance(text, str)
                and text.startswith("/proc/self/fd/")
                and text.endswith("/target")
                and flags & os.O_DIRECTORY == 0
            ):
                if flags & os.O_NONBLOCK == 0 or flags & os.O_NOFOLLOW == 0:
                    hold("self_test_reader_safe_flags_missing")
                target.rename(displaced)
                os.mkfifo(target, 0o600)
                swapped = True
            return original_open(name, flags, *args, **kwargs)

        os.open = guarded_open
        try:
            try:
                read_bound_regular(target, 4096)
            except ArchiveHold:
                pass
            else:
                hold("self_test_fifo_substitution_accepted")
        finally:
            os.open = original_open
        if not swapped or not stat.S_ISFIFO(os.stat(target, follow_symlinks=False).st_mode):
            hold("self_test_fifo_fixture_not_exercised")
        if displaced.read_bytes() != b"reader-fixture\n":
            hold("self_test_displaced_regular_modified")


def emit_status(value: dict[str, Any]) -> None:
    print(json.dumps(value, sort_keys=True, separators=(",", ":")))


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--self-test", action="store_true")
    group.add_argument("--package", type=Path)
    group.add_argument("--inspect-archive", type=Path)
    args = parser.parse_args(argv)

    if args.self_test:
        self_test()
        raw, record = source_archive()
        print(MARKER + "_SELF_TEST_GREEN")
        print("archive_candidate_id=" + record["archive_candidate_id"])
        print("archive_bytes=" + str(len(raw)))
        print("archive_sha256=" + sha256(raw))
        print("runtime_files_exact=10")
        print("deterministic_ustar=true")
        print("descriptor_bound_source_reads=true")
        print("descriptor_bound_create_only_output=true")
        print("symlink_output_parent_rejected=true")
        print("fifo_substitution_rejected_without_blocking=true")
        print("archive_candidate_accepted=false")
        print("immutable_root_install=false")
        print("runtime_integration=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        return 0
    if args.package is not None:
        emit_status(package(args.package))
        return 0
    if args.inspect_archive is not None:
        emit_status(inspect_archive(args.inspect_archive))
        return 0
    return 2


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except (ArchiveHold, OSError, subprocess.SubprocessError, ValueError) as exc:
        print(MARKER + "_HOLD", file=sys.stderr)
        print("reason=" + str(exc), file=sys.stderr)
        raise SystemExit(2)
