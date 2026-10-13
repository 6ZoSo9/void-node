#!/usr/bin/env python3
"""Build or inspect the current, unaccepted Nimo V5 review archive.

Source/CI only. This program never contacts Nimo and never installs runtime
bytes. It binds the exact audited source generation, derives all eight runtime
members from the current build, and emits a content-addressed inactive archive.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tarfile

MARKER = "VOID_NIMO_V5_CURRENT_INACTIVE_BUNDLE_V1"
PREFIX = "inactive-v5-candidate/"
MANIFEST_NAME = PREFIX + "review/manifest.json"
SOURCE_PARENT = "c5c656c3cbfe8195858998f56e278610d1878029"
PREDECESSOR_V4_ID = (
    "voidwfb4_b5d9516e5fa462ca7ed2333ebe3ef715eaf62ecdd3c0a6b049ecc9eb1e1659c2"
)
PREDECESSOR_V4_ARCHIVE_SHA256 = (
    "6bb01af17cc87dfb42b63942143458f3e95990d8ae1ef6c1671fc5cd7d4feaf8"
)
PREDECESSOR_V4_BAKERY_SHA256 = (
    "7c7a6b92c1a88b14d325d331700a2bd19a0068630ae0094c65b2dcc6a25a9994"
)
PREDECESSOR_V4_BAKERY_BYTES = 18018

MAX_SOURCE_BYTES = 16 * 1024 * 1024
MAX_RUNTIME_BYTES = 16 * 1024 * 1024
MAX_ARCHIVE_BYTES = 4 * 1024 * 1024
MAX_MEMBER_COUNT = 9
OUTPUT_NAME = "void-nimo-v5-inactive.tar"

SOURCE_BINDINGS = (
    (
        "tools/void-buy-allocation-custody-witness-forced-command-v2.mjs",
        "742cf489d8a785aa155a0e1bd12b65e94e07d1f1",
    ),
    (
        "src/economic/buy_void_allocation_custody_external_witness_v1.ts",
        "5d24f3fb3e94611c653a0e3e1319afa7d0f4db72",
    ),
    (
        "src/economic/buy_void_allocation_custody_witness_transport_v1.ts",
        "a5163272f08d6d96a9c2387fa6db344018e09694",
    ),
    (
        "src/economic/buy_void_allocation_reservation_high_water_v1.ts",
        "9383c94cf848efb9a0112f1b741df4e10f790ac6",
    ),
    (
        "src/economic/buy_void_allocation_reservation_ledger_v1.ts",
        "8d84955e1e093a5c5af63241e62b8722fadd2f29",
    ),
    (
        "src/economic/buy_void_auto_fulfillment_v1.ts",
        "b7c963b1d55f000d82ad82289b31107b432503de",
    ),
    (
        "src/economic/buy_void_crash_consistent_saga_server_policy_v1.ts",
        "e284a38a4b7f3d498b07e77c661d6eef3b742e7a",
    ),
    (
        "src/economic/buy_void_filesystem_bakery_lock_v1.ts",
        "9bd47abb857368d928c0ca289766cdf3571629ba",
    ),
    ("package.json", "14fbdf5717b07fd4c734f5da7a8e84ed59bee93f"),
    ("package-lock.json", "15b5c82ea36f13079a2f9e8863722f654eb3f201"),
    ("tsconfig.build.json", "d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb"),
    (
        "scripts/prove_buy_void_nimo_v3_historical_v4_current_v1.mjs",
        "c908941795d6813aeafb5ec87ab8faa0de20b21e",
    ),
    (
        "scripts/prove_buy_void_nimo_v4_inactive_bundle_v1.py",
        "df15064519fcc9be75be8014c292ccc83eac6544",
    ),
)

RUNTIME = (
    (
        "tools/void-buy-allocation-custody-witness-forced-command-v2.mjs",
        "tools/void-buy-allocation-custody-witness-forced-command-v2.mjs",
    ),
    (
        "dist/economic/buy_void_allocation_custody_external_witness_v1.js",
        "src/economic/buy_void_allocation_custody_external_witness_v1.ts",
    ),
    (
        "dist/economic/buy_void_allocation_custody_witness_transport_v1.js",
        "src/economic/buy_void_allocation_custody_witness_transport_v1.ts",
    ),
    (
        "dist/economic/buy_void_allocation_reservation_high_water_v1.js",
        "src/economic/buy_void_allocation_reservation_high_water_v1.ts",
    ),
    (
        "dist/economic/buy_void_allocation_reservation_ledger_v1.js",
        "src/economic/buy_void_allocation_reservation_ledger_v1.ts",
    ),
    (
        "dist/economic/buy_void_auto_fulfillment_v1.js",
        "src/economic/buy_void_auto_fulfillment_v1.ts",
    ),
    (
        "dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js",
        "src/economic/buy_void_crash_consistent_saga_server_policy_v1.ts",
    ),
    (
        "dist/economic/buy_void_filesystem_bakery_lock_v1.js",
        "src/economic/buy_void_filesystem_bakery_lock_v1.ts",
    ),
)


def hold(reason: str) -> None:
    raise ValueError("nimo_v5_inactive_" + reason)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob(data: bytes) -> str:
    header = b"blob " + str(len(data)).encode("ascii") + b"\0"
    return hashlib.sha1(header + data).hexdigest()


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


def same_inode(left: os.stat_result, right: os.stat_result) -> bool:
    return (
        left.st_dev == right.st_dev
        and left.st_ino == right.st_ino
        and left.st_uid == right.st_uid
        and left.st_gid == right.st_gid
        and left.st_mode == right.st_mode
        and left.st_nlink == right.st_nlink
        and left.st_size == right.st_size
    )


def read_exact_file(path: Path, max_bytes: int) -> bytes:
    visible = path.lstat()
    if (
        not stat.S_ISREG(visible.st_mode)
        or stat.S_ISLNK(visible.st_mode)
        or visible.st_nlink != 1
        or visible.st_size < 1
        or visible.st_size > max_bytes
    ):
        hold("file_metadata_invalid:" + str(path))
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not same_inode(visible, opened):
            hold("file_open_identity_mismatch:" + str(path))
        data = bytearray()
        while len(data) < opened.st_size:
            chunk = os.read(fd, min(65536, opened.st_size - len(data)))
            if not chunk:
                hold("file_short_read:" + str(path))
            data.extend(chunk)
        if os.read(fd, 1):
            hold("file_grew_during_read:" + str(path))
        after = os.fstat(fd)
        visible_after = path.lstat()
        if (
            not same_inode(opened, after)
            or not same_inode(after, visible_after)
            or opened.st_mtime_ns != after.st_mtime_ns
            or opened.st_ctime_ns != after.st_ctime_ns
            or after.st_mtime_ns != visible_after.st_mtime_ns
            or after.st_ctime_ns != visible_after.st_ctime_ns
            or len(data) != after.st_size
        ):
            hold("file_changed_during_read:" + str(path))
        return bytes(data)
    finally:
        os.close(fd)


def require_reviewed_source(root: Path) -> None:
    if os.name != "posix" or not Path("/proc/self/fd").is_dir():
        hold("linux_descriptor_runtime_required")
    for relative, expected_blob in SOURCE_BINDINGS:
        raw = read_exact_file(root / relative, MAX_SOURCE_BYTES)
        if git_blob(raw) != expected_blob:
            hold("reviewed_source_changed:" + relative)
    env = {
        "PATH": "/usr/bin:/bin",
        "HOME": "/nonexistent",
        "LANG": "C",
        "LC_ALL": "C",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": "/dev/null",
        "GIT_CONFIG_SYSTEM": "/dev/null",
        "GIT_NO_REPLACE_OBJECTS": "1",
        "GIT_OPTIONAL_LOCKS": "0",
        "GIT_TERMINAL_PROMPT": "0",
    }
    try:
        result = subprocess.run(
            [
                "/usr/bin/git",
                "--no-replace-objects",
                "-c",
                "core.fsmonitor=false",
                "-c",
                "core.hooksPath=/dev/null",
                "-C",
                str(root),
                "merge-base",
                "--is-ancestor",
                SOURCE_PARENT,
                "HEAD",
            ],
            env=env,
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=10,
        )
    except (OSError, subprocess.SubprocessError):
        hold("source_parent_ancestry_unavailable")
    if result.returncode != 0:
        hold("source_parent_ancestry_missing")


def runtime_records(root: Path) -> tuple[dict[str, bytes], list[dict]]:
    payloads: dict[str, bytes] = {}
    records: list[dict] = []
    for runtime_path, source_path in RUNTIME:
        raw = read_exact_file(root / runtime_path, MAX_RUNTIME_BYTES)
        payloads[PREFIX + "payload/" + runtime_path] = raw
        records.append(
            {
                "path": runtime_path,
                "source_path": source_path,
                "bytes": len(raw),
                "sha256": sha256(raw),
            }
        )
    bakery = next(
        item
        for item in records
        if item["path"]
        == "dist/economic/buy_void_filesystem_bakery_lock_v1.js"
    )
    if (
        bakery["bytes"] == PREDECESSOR_V4_BAKERY_BYTES
        and bakery["sha256"] == PREDECESSOR_V4_BAKERY_SHA256
    ):
        hold("current_bakery_still_historical_v4")
    return payloads, records


def source_binding_records() -> list[dict]:
    return [
        {"path": path, "git_blob_sha1": blob}
        for path, blob in SOURCE_BINDINGS
    ]


def manifest_body(records: list[dict]) -> dict:
    return {
        "schema": "void_buy_void_nimo_witness_v5_inactive_review_bundle_v1",
        "marker": MARKER,
        "version": 1,
        "status": "HOLD_UNACCEPTED_NOT_INSTALLED",
        "source_parent": SOURCE_PARENT,
        "predecessor_v4_candidate_manifest_id": PREDECESSOR_V4_ID,
        "predecessor_v4_archive_sha256": PREDECESSOR_V4_ARCHIVE_SHA256,
        "predecessor_v4_bakery_bytes": PREDECESSOR_V4_BAKERY_BYTES,
        "predecessor_v4_bakery_sha256": PREDECESSOR_V4_BAKERY_SHA256,
        "source_bindings": source_binding_records(),
        "runtime_file_count": len(records),
        "runtime_files": records,
        "authority": {
            "source_generation_qualified": True,
            "inactive_archive_derived": True,
            "private_stage_qualified": False,
            "live_nimo_installed": False,
            "authenticated_custody_principal_verified": False,
            "verified_payment_to_allocation_mounted": False,
            "custody_reserve_or_recover_enabled": False,
            "production_gate_ready": False,
            "wallet_or_signer_used": False,
            "transaction_signing": False,
            "transaction_broadcast": False,
            "presale_activation": False,
            "funds_moved": False,
        },
    }


def manifest(records: list[dict]) -> dict:
    body = manifest_body(records)
    return {
        **body,
        "candidate_manifest_id": "voidwfb5_" + sha256(canonical(body)),
    }


def source_members(root: Path) -> tuple[dict[str, bytes], dict]:
    require_reviewed_source(root)
    payloads, records = runtime_records(root)
    record = manifest(records)
    members = {
        MANIFEST_NAME: canonical(record),
        **payloads,
    }
    return dict(sorted(members.items())), record


def canonical_archive(members: dict[str, bytes]) -> bytes:
    sink = io.BytesIO()
    with tarfile.open(
        fileobj=sink,
        mode="w",
        format=tarfile.USTAR_FORMAT,
    ) as archive:
        for name, data in sorted(members.items()):
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
    if len(raw) < 10240 or len(raw) > MAX_ARCHIVE_BYTES:
        hold("archive_size_invalid")
    return raw


def inspect_manifest(value: object) -> dict:
    if type(value) is not dict:
        hold("manifest_not_object")
    expected_keys = {
        "schema",
        "marker",
        "version",
        "status",
        "source_parent",
        "predecessor_v4_candidate_manifest_id",
        "predecessor_v4_archive_sha256",
        "predecessor_v4_bakery_bytes",
        "predecessor_v4_bakery_sha256",
        "source_bindings",
        "runtime_file_count",
        "runtime_files",
        "authority",
        "candidate_manifest_id",
    }
    if set(value) != expected_keys:
        hold("manifest_keys_invalid")
    if (
        value["schema"]
        != "void_buy_void_nimo_witness_v5_inactive_review_bundle_v1"
        or value["marker"] != MARKER
        or value["version"] != 1
        or value["status"] != "HOLD_UNACCEPTED_NOT_INSTALLED"
        or value["source_parent"] != SOURCE_PARENT
        or value["predecessor_v4_candidate_manifest_id"]
        != PREDECESSOR_V4_ID
        or value["predecessor_v4_archive_sha256"]
        != PREDECESSOR_V4_ARCHIVE_SHA256
        or value["predecessor_v4_bakery_bytes"]
        != PREDECESSOR_V4_BAKERY_BYTES
        or value["predecessor_v4_bakery_sha256"]
        != PREDECESSOR_V4_BAKERY_SHA256
        or value["source_bindings"] != source_binding_records()
        or value["runtime_file_count"] != len(RUNTIME)
    ):
        hold("manifest_identity_invalid")
    runtime_files = value["runtime_files"]
    if type(runtime_files) is not list or len(runtime_files) != len(RUNTIME):
        hold("manifest_runtime_files_invalid")
    for index, (runtime_path, source_path) in enumerate(RUNTIME):
        item = runtime_files[index]
        if (
            type(item) is not dict
            or set(item) != {"path", "source_path", "bytes", "sha256"}
            or item["path"] != runtime_path
            or item["source_path"] != source_path
            or type(item["bytes"]) is not int
            or item["bytes"] < 1
            or item["bytes"] > MAX_RUNTIME_BYTES
            or type(item["sha256"]) is not str
            or len(item["sha256"]) != 64
            or any(c not in "0123456789abcdef" for c in item["sha256"])
        ):
            hold("manifest_runtime_record_invalid")
    authority = value["authority"]
    expected_authority = manifest_body(runtime_files)["authority"]
    if authority != expected_authority:
        hold("manifest_authority_invalid")
    body = dict(value)
    candidate_id = body.pop("candidate_manifest_id")
    if (
        type(candidate_id) is not str
        or candidate_id != "voidwfb5_" + sha256(canonical(body))
    ):
        hold("candidate_manifest_id_invalid")
    return value


def inspect_archive(path: Path) -> dict:
    raw = read_exact_file(path, MAX_ARCHIVE_BYTES)
    members: dict[str, bytes] = {}
    total = 0
    try:
        archive = tarfile.open(fileobj=io.BytesIO(raw), mode="r:")
    except tarfile.TarError as exc:
        hold("archive_parse_failed:" + type(exc).__name__)
    with archive:
        for member in archive:
            if len(members) >= MAX_MEMBER_COUNT:
                hold("archive_member_count_exceeded")
            name = member.name
            if (
                not name.startswith(PREFIX)
                or name.startswith("/")
                or ".." in name.split("/")
                or not member.isfile()
                or member.uid != 0
                or member.gid != 0
                or member.mode != 0o444
                or member.mtime != 0
                or name in members
                or member.size < 1
                or member.size > MAX_RUNTIME_BYTES
            ):
                hold("archive_member_metadata_invalid")
            total += member.size
            if total > MAX_ARCHIVE_BYTES:
                hold("archive_payload_bytes_exceeded")
            handle = archive.extractfile(member)
            if handle is None:
                hold("archive_member_missing")
            data = handle.read(member.size + 1)
            if len(data) != member.size:
                hold("archive_member_size_invalid")
            members[name] = data
    expected = {
        MANIFEST_NAME,
        *[
            PREFIX + "payload/" + runtime_path
            for runtime_path, _source_path in RUNTIME
        ],
    }
    if set(members) != expected or len(members) != MAX_MEMBER_COUNT:
        hold("archive_member_set_invalid")
    try:
        record = inspect_manifest(
            json.loads(members[MANIFEST_NAME].decode("utf-8"))
        )
    except (UnicodeError, json.JSONDecodeError):
        hold("archive_manifest_json_invalid")
    if members[MANIFEST_NAME] != canonical(record):
        hold("archive_manifest_noncanonical")
    for item in record["runtime_files"]:
        data = members[PREFIX + "payload/" + item["path"]]
        if len(data) != item["bytes"] or sha256(data) != item["sha256"]:
            hold("archive_runtime_payload_invalid:" + item["path"])
    if raw != canonical_archive(members):
        hold("archive_noncanonical_wire_bytes")
    return receipt("inspect", record, raw)


def receipt(mode: str, record: dict, archive: bytes) -> dict:
    runtime_bytes = canonical(record["runtime_files"])
    bakery = next(
        item
        for item in record["runtime_files"]
        if item["path"]
        == "dist/economic/buy_void_filesystem_bakery_lock_v1.js"
    )
    return {
        "marker": MARKER,
        "mode": mode,
        "candidate_manifest_id": record["candidate_manifest_id"],
        "archive_bytes": len(archive),
        "archive_sha256": sha256(archive),
        "runtime_files_exact": len(record["runtime_files"]),
        "runtime_manifest_sha256": sha256(runtime_bytes),
        "bakery_bytes": bakery["bytes"],
        "bakery_sha256": bakery["sha256"],
        "predecessor_v4_candidate_manifest_id": PREDECESSOR_V4_ID,
        "predecessor_v4_archive_sha256": PREDECESSOR_V4_ARCHIVE_SHA256,
        "source_generation_qualified": True,
        "inactive_archive_derived": True,
        "private_stage_qualified": False,
        "live_nimo_installed": False,
        "verified_payment_to_allocation_mounted": False,
        "custody_reserve_or_recover_enabled": False,
        "production_gate_ready": False,
        "presale_activation": False,
        "funds_moved": False,
    }


def open_private_output_parent(target: Path) -> tuple[int, os.stat_result]:
    if (
        not target.is_absolute()
        or target.name != OUTPUT_NAME
        or target != Path(os.path.normpath(str(target)))
    ):
        hold("output_path_invalid")
    parent = target.parent
    visible = parent.lstat()
    if (
        not stat.S_ISDIR(visible.st_mode)
        or stat.S_ISLNK(visible.st_mode)
        or visible.st_uid != os.getuid()
        or visible.st_mode & 0o077
        or parent.resolve(strict=True) != parent
    ):
        hold("output_parent_not_private")
    fd = os.open(parent, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    opened = os.fstat(fd)
    if not same_inode(visible, opened):
        os.close(fd)
        hold("output_parent_identity_mismatch")
    return fd, opened


def write_new(path: Path, raw: bytes) -> None:
    pfd, parent_identity = open_private_output_parent(path)
    leaf = Path("/proc/self/fd", str(pfd), OUTPUT_NAME)
    fd = -1
    created_identity: os.stat_result | None = None
    try:
        fd = os.open(
            leaf,
            os.O_CREAT | os.O_EXCL | os.O_WRONLY | os.O_NOFOLLOW,
            0o600,
        )
        os.fchmod(fd, 0o600)
        created_identity = os.fstat(fd)
        if (
            not stat.S_ISREG(created_identity.st_mode)
            or created_identity.st_nlink != 1
            or created_identity.st_uid != os.getuid()
        ):
            hold("output_file_identity_invalid")
        offset = 0
        while offset < len(raw):
            count = os.write(fd, raw[offset:])
            if count <= 0:
                hold("output_write_failed")
            offset += count
        os.fsync(fd)
        final = os.fstat(fd)
        if (
            not same_inode(created_identity, final)
            or final.st_size != len(raw)
        ):
            hold("output_file_changed")
        os.fsync(pfd)
    finally:
        if fd >= 0:
            os.close(fd)
        os.close(pfd)
    parent_after = path.parent.lstat()
    file_after = path.lstat()
    if (
        not same_inode(parent_identity, parent_after)
        or created_identity is None
        or not same_inode(created_identity, file_after)
        or file_after.st_size != len(raw)
    ):
        hold("output_visible_identity_changed")


def plan_current() -> tuple[dict[str, bytes], dict, bytes, dict]:
    root = Path(__file__).resolve().parent.parent
    members, record = source_members(root)
    archive = canonical_archive(members)
    return members, record, archive, receipt("plan", record, archive)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--plan", action="store_true")
    modes.add_argument("--package", metavar="PRIVATE_ABSOLUTE_TAR")
    modes.add_argument("--inspect-archive", metavar="TAR")
    args = parser.parse_args()

    if args.inspect_archive:
        result = inspect_archive(Path(args.inspect_archive))
    else:
        _members, record, raw, result = plan_current()
        if args.package:
            target = Path(args.package)
            write_new(target, raw)
            checked = inspect_archive(target)
            for key in (
                "candidate_manifest_id",
                "archive_bytes",
                "archive_sha256",
                "runtime_manifest_sha256",
                "bakery_bytes",
                "bakery_sha256",
            ):
                if checked[key] != result[key]:
                    hold("package_reinspection_mismatch:" + key)
            result = {**result, "mode": "package"}
    sys.stdout.buffer.write(canonical(result))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, AssertionError, tarfile.TarError) as exc:
        message = str(exc)
        if not message.startswith("nimo_v5_inactive_"):
            message = "nimo_v5_inactive_unqualified_io_or_source"
        print(MARKER + "_HOLD:" + message, file=sys.stderr)
        raise SystemExit(2)
