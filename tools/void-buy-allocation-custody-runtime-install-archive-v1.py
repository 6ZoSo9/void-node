#!/usr/bin/env python3
"""Derive/inspect the unaccepted custody runtime install archive candidate v1.

This tool packages only the already-accepted package-free custody runtime
identity. It does not install, replace, chmod/chown, start a service, accept a
payment, activate the presale, or move funds.
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

MARKER = "VOID_BUY_VOID_CUSTODY_RUNTIME_INSTALL_ARCHIVE_V1"
SCHEMA = "void_buy_void_custody_runtime_install_archive_v1"
PREFIX = "void-buy-allocation-custody-runtime-install-v1/"
ROOT = Path(__file__).resolve().parent.parent
LOCK_REL = "ops/security/buy-void-allocation-custody-runtime-bundle-lock-v1.json"
LOCK_GIT_BLOB = "acb5da31527ab42919d411695b475a94af29abb1"
LOCK_SHA256 = "998b1e211c78cd11b65224a51868687f7cdd76afcd07224482cf8ce862af1eec"
CANDIDATE_ID = "voidbuycustodybundle1_2339d565cc1c298a3f7ca9cae2ef163831288007bb32d9e7c37c01880aaee704"
CANDIDATE_SHA256 = "5ee2b5e5fc25a7cec8313c7cb7c4cd8bb675e3652ab18dc614577a25376f2279"
CANDIDATE_BYTES = 9930
RUNTIME_FILE_COUNT = 10
MAX_MEMBER = 16 * 1024 * 1024
MAX_ARCHIVE = 8 * 1024 * 1024
CANDIDATE_TOOL = "tools/void-buy-allocation-custody-runtime-bundle-candidate-v1.mjs"
ARCHIVE_BASENAME = "void-buy-allocation-custody-runtime-install-v1.tar"

AUTHORITY = {
    "source_archive_candidate_only": True,
    "accepted_runtime_bundle_required": True,
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
    raise ArchiveHold("custody_runtime_install_archive_" + reason)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob(data: bytes) -> str:
    prefix = b"blob " + str(len(data)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + data).hexdigest()


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


def read_direct_regular(path: Path, maximum: int = MAX_MEMBER) -> bytes:
    visible = path.lstat()
    if (
        not stat.S_ISREG(visible.st_mode)
        or stat.S_ISLNK(visible.st_mode)
        or visible.st_nlink != 1
        or visible.st_size < 1
        or visible.st_size > maximum
    ):
        hold("file_metadata_invalid:" + str(path))
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        opened = os.fstat(fd)
        if (
            opened.st_dev,
            opened.st_ino,
            opened.st_size,
            opened.st_mtime_ns,
            opened.st_ctime_ns,
        ) != (
            visible.st_dev,
            visible.st_ino,
            visible.st_size,
            visible.st_mtime_ns,
            visible.st_ctime_ns,
        ):
            hold("file_rebound:" + str(path))
        out = bytearray()
        while len(out) <= opened.st_size:
            chunk = os.read(fd, min(65536, opened.st_size + 1 - len(out)))
            if not chunk:
                break
            out.extend(chunk)
        after = os.fstat(fd)
        if (
            opened.st_dev,
            opened.st_ino,
            opened.st_size,
            opened.st_mtime_ns,
            opened.st_ctime_ns,
        ) != (
            after.st_dev,
            after.st_ino,
            after.st_size,
            after.st_mtime_ns,
            after.st_ctime_ns,
        ):
            hold("file_changed_during_read:" + str(path))
    finally:
        os.close(fd)
    raw = bytes(out)
    if len(raw) != visible.st_size:
        hold("file_size_changed:" + str(path))
    return raw


def read_lock() -> tuple[bytes, dict[str, Any]]:
    raw = read_direct_regular(ROOT / LOCK_REL, 1024 * 1024)
    if git_blob(raw) != LOCK_GIT_BLOB:
        hold("accepted_lock_git_blob_mismatch")
    if sha256(raw) != LOCK_SHA256:
        hold("accepted_lock_sha256_mismatch")
    try:
        value = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        hold("accepted_lock_json_invalid:" + type(exc).__name__)
    if (
        type(value) is not dict
        or value.get("marker") != "VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_LOCK_V1"
        or value.get("candidate_accepted") is not True
        or value.get("immutable_root_install") is not False
        or value.get("node_binary_identity_verified") is not False
        or value.get("runtime_integration") is not False
        or value.get("payment_acceptance") is not False
        or value.get("public_presale_activation") is not False
        or value.get("funds_movement") is not False
    ):
        hold("accepted_lock_semantics_invalid")
    evidence = value.get("candidate_evidence")
    if (
        type(evidence) is not dict
        or evidence.get("candidate_id") != CANDIDATE_ID
        or evidence.get("sha256") != CANDIDATE_SHA256
        or evidence.get("bytes") != CANDIDATE_BYTES
        or evidence.get("runtime_file_count") != RUNTIME_FILE_COUNT
    ):
        hold("accepted_lock_candidate_identity_invalid")
    return raw, value


def clean_node_environment() -> dict[str, str]:
    node = shutil.which("node")
    if not node:
        hold("node_command_missing")
    path = str(Path(node).resolve(strict=True).parent)
    return {
        "PATH": path + ":/usr/bin:/bin",
        "HOME": "/nonexistent",
        "LANG": "C",
        "LC_ALL": "C",
        "NO_COLOR": "1",
        "NODE_OPTIONS": "",
        "NODE_PATH": "",
    }


def derive_runtime_candidate() -> dict[str, Any]:
    with tempfile.TemporaryDirectory(
        prefix="void-custody-install-archive-candidate-"
    ) as tmp:
        candidate_path = Path(tmp) / "candidate.json"
        node = shutil.which("node")
        if not node:
            hold("node_command_missing")
        result = subprocess.run(
            [
                node,
                str(ROOT / CANDIDATE_TOOL),
                "--emit",
                str(candidate_path),
            ],
            cwd=ROOT,
            env=clean_node_environment(),
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=60,
            check=False,
        )
        if (
            result.returncode != 0
            or len(result.stdout) > 1024 * 1024
            or len(result.stderr) > 1024 * 1024
        ):
            hold("runtime_candidate_derivation_failed")
        raw = read_direct_regular(candidate_path, 4 * 1024 * 1024)
    if len(raw) != CANDIDATE_BYTES or sha256(raw) != CANDIDATE_SHA256:
        hold("runtime_candidate_wire_identity_mismatch")
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
    return value


def runtime_payloads(candidate: dict[str, Any]) -> tuple[dict[str, bytes], list[dict[str, Any]]]:
    payloads: dict[str, bytes] = {}
    records: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in candidate["runtime_files"]:
        if type(item) is not dict:
            hold("runtime_candidate_file_record_invalid")
        rel = item.get("path")
        expected_bytes = item.get("bytes")
        expected_sha = item.get("sha256")
        if (
            type(rel) is not str
            or not rel
            or rel.startswith("/")
            or ".." in rel.split("/")
            or rel in seen
            or type(expected_bytes) is not int
            or not 0 < expected_bytes <= MAX_MEMBER
            or type(expected_sha) is not str
            or len(expected_sha) != 64
        ):
            hold("runtime_candidate_file_record_invalid")
        seen.add(rel)
        raw = read_direct_regular(ROOT / rel)
        if len(raw) != expected_bytes or sha256(raw) != expected_sha:
            hold("runtime_payload_identity_mismatch:" + rel)
        payloads[PREFIX + "payload/" + rel] = raw
        records.append(
            {
                "path": rel,
                "bytes": expected_bytes,
                "sha256": expected_sha,
                "runtime_kind": item.get("runtime_kind"),
                "tracked_source_git_blob_sha1": item.get(
                    "tracked_source_git_blob_sha1"
                ),
            }
        )
    records.sort(key=lambda row: row["path"])
    return payloads, records


def manifest(records: list[dict[str, Any]]) -> dict[str, Any]:
    body = {
        "schema": SCHEMA,
        "marker": MARKER,
        "version": 1,
        "repository": "6ZoSo9/void-node",
        "accepted_lock": {
            "path": LOCK_REL,
            "git_blob_sha1": LOCK_GIT_BLOB,
            "sha256": LOCK_SHA256,
        },
        "runtime_candidate": {
            "candidate_id": CANDIDATE_ID,
            "bytes": CANDIDATE_BYTES,
            "sha256": CANDIDATE_SHA256,
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
        "intended_install_target": "/opt/void-buy-allocation-custody-runtime-v1",
        "authority": AUTHORITY,
    }
    return {
        **body,
        "archive_candidate_id": "voidbuycustodyarchive1_" + sha256(canonical(body)),
    }


def canonical_archive(members: dict[str, bytes]) -> bytes:
    sink = io.BytesIO()
    with tarfile.open(fileobj=sink, mode="w", format=tarfile.USTAR_FORMAT) as archive:
        for name, data in sorted(members.items()):
            if (
                not name.startswith(PREFIX)
                or name.startswith("/")
                or ".." in name.split("/")
                or len(data) > MAX_MEMBER
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
    candidate = derive_runtime_candidate()
    payloads, records = runtime_payloads(candidate)
    record = manifest(records)
    members = {
        PREFIX + "review/accepted-runtime-bundle-lock-v1.json": lock_raw,
        PREFIX + "review/manifest.json": canonical(record),
        **payloads,
    }
    if len(members) != RUNTIME_FILE_COUNT + 2:
        hold("archive_member_count_invalid")
    return canonical_archive(members), record


def inspect_manifest(value: object) -> dict[str, Any]:
    if type(value) is not dict:
        hold("archive_manifest_invalid")
    records = value.get("runtime_files")
    if type(records) is not list or len(records) != RUNTIME_FILE_COUNT:
        hold("archive_manifest_runtime_files_invalid")
    wanted = manifest(records)
    if value != wanted:
        hold("archive_manifest_content_invalid")
    return wanted


def inspect_archive(path: Path) -> dict[str, Any]:
    raw = read_direct_regular(path, MAX_ARCHIVE)
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

    lock_name = PREFIX + "review/accepted-runtime-bundle-lock-v1.json"
    manifest_name = PREFIX + "review/manifest.json"
    if lock_name not in members or manifest_name not in members:
        hold("archive_review_members_missing")
    if (
        git_blob(members[lock_name]) != LOCK_GIT_BLOB
        or sha256(members[lock_name]) != LOCK_SHA256
    ):
        hold("archive_lock_identity_invalid")
    try:
        record = inspect_manifest(json.loads(members[manifest_name].decode("utf-8")))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        hold("archive_manifest_json_invalid:" + type(exc).__name__)
    if members[manifest_name] != canonical(record):
        hold("archive_manifest_noncanonical")

    expected_names = {
        lock_name,
        manifest_name,
        *[PREFIX + "payload/" + row["path"] for row in record["runtime_files"]],
    }
    if set(members) != expected_names:
        hold("archive_member_set_invalid")
    for row in record["runtime_files"]:
        payload = members[PREFIX + "payload/" + row["path"]]
        if len(payload) != row["bytes"] or sha256(payload) != row["sha256"]:
            hold("archive_payload_identity_invalid:" + row["path"])
    if raw != canonical_archive(members):
        hold("archive_noncanonical_wire_bytes")

    return {
        "marker": MARKER,
        "mode": "inspect",
        "archive_candidate_id": record["archive_candidate_id"],
        "archive_bytes": len(raw),
        "archive_sha256": sha256(raw),
        "runtime_files_exact": RUNTIME_FILE_COUNT,
        "archive_candidate_accepted": False,
        "immutable_root_install": False,
        "node_binary_identity_verified": False,
        "runtime_integration": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "production_gate_ready": False,
        "funds_movement": False,
    }


def write_create_only(path: Path, raw: bytes) -> None:
    if (
        not path.is_absolute()
        or path.name != ARCHIVE_BASENAME
        or path != Path(os.path.normpath(str(path)))
    ):
        hold("archive_output_path_invalid")
    parent = path.parent
    st = parent.lstat()
    if (
        not stat.S_ISDIR(st.st_mode)
        or st.st_uid != os.getuid()
        or stat.S_IMODE(st.st_mode) & 0o077
    ):
        hold("archive_output_parent_not_private")
    fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY | os.O_NOFOLLOW, 0o600)
    try:
        written = 0
        while written < len(raw):
            count = os.write(fd, raw[written:])
            if count <= 0:
                hold("archive_write_failed")
            written += count
        os.fsync(fd)
    finally:
        os.close(fd)


def self_test() -> None:
    sample = {
        PREFIX + "a": b"alpha",
        PREFIX + "z": b"omega",
    }
    first = canonical_archive(sample)
    second = canonical_archive(dict(reversed(list(sample.items()))))
    if first != second:
        hold("self_test_archive_not_deterministic")
    with tarfile.open(fileobj=io.BytesIO(first), mode="r:") as archive:
        names = [item.name for item in archive]
    if names != sorted(sample):
        hold("self_test_member_order_invalid")
    if not all(
        AUTHORITY[key] is False
        for key in (
            "archive_candidate_accepted",
            "immutable_root_install",
            "existing_target_replaced",
            "node_binary_identity_verified",
            "runtime_integration",
            "payment_acceptance",
            "public_presale_activation",
            "production_gate_ready",
            "funds_movement",
        )
    ):
        hold("self_test_authority_invalid")
    print(MARKER + "_SELF_TEST_GREEN")
    print("deterministic_ustar=true")
    print("runtime_file_count=10")
    print("archive_candidate_accepted=false")
    print("immutable_root_install=false")
    print("funds_movement=false")


def emit_result(mode: str, raw: bytes, record: dict[str, Any]) -> dict[str, Any]:
    return {
        "marker": MARKER,
        "mode": mode,
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


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--self-test", action="store_true")
    modes.add_argument("--plan", action="store_true")
    modes.add_argument("--package", metavar="PRIVATE_ABSOLUTE_TAR")
    modes.add_argument("--inspect-archive", metavar="TAR")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return
    if args.inspect_archive:
        result = inspect_archive(Path(args.inspect_archive))
    else:
        raw, record = source_archive()
        mode = "plan" if args.plan else "package"
        result = emit_result(mode, raw, record)
        if args.package:
            target = Path(args.package)
            write_create_only(target, raw)
            checked = inspect_archive(target)
            if (
                checked["archive_candidate_id"] != result["archive_candidate_id"]
                or checked["archive_sha256"] != result["archive_sha256"]
                or checked["archive_bytes"] != result["archive_bytes"]
            ):
                hold("archive_reinspection_mismatch")
    sys.stdout.buffer.write(canonical(result))


if __name__ == "__main__":
    try:
        main()
    except (ArchiveHold, OSError, subprocess.SubprocessError) as exc:
        print(MARKER + "_HOLD:" + str(exc), file=sys.stderr)
        raise SystemExit(2)
