#!/usr/bin/env python3
"""Build or inspect the exact inactive Nimo witness V3 review archive.

Source-only. No install, service, SSH, sudo, credentials, customer ledger,
wallet, signer, payment acceptance, presale activation or funds movement.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import stat
import sys
import tarfile

MARKER = "VOID_NIMO_V3_INACTIVE_BUNDLE_V1"
PREFIX = "inactive-v3-candidate/"
LOCK_REL = "docs/architecture/buy-void-nimo-witness-v2-proposed-lock-v1.json"
LOCK_BLOB = "73c7f88348a1d6b208336df8779940657607bd7d"
V2_ID = "voidwfb2_b1cf93ea36879332d2745294b8aab1b261d5e7c13522af681db8d390254df73d"
V3_ID = "voidwfb3_cec212bbadb4586f7d479c2284e7a2850f47bdc2205a6dccfad5274c8c7ef454"
SOURCE_MAIN = "851513f0d545016c28b9dd5af5975dc28535d662"
MAX_MEMBER = 16 * 1024 * 1024
MAX_ARCHIVE = 2 * 1024 * 1024

RUNTIME = (
    ("tools/void-buy-allocation-custody-witness-forced-command-v2.mjs", 48914,
     "88f425986eff8597cdf6725e4608b3790aed2359fef6ae9fadb76292d9e5a26d"),
    ("dist/economic/buy_void_allocation_custody_external_witness_v1.js", 35821,
     "35d80f00a9ec0ce57bb457596d27e8c86a70d76efe310372e1fff796a92d43ca"),
    ("dist/economic/buy_void_allocation_custody_witness_transport_v1.js", 35066,
     "8e03107d1545977a19b847bbec926543b9812b6d9c16a4d7e13e62cf5c790979"),
    ("dist/economic/buy_void_allocation_reservation_high_water_v1.js", 12251,
     "1999015c9e0770a5a94b3b4d29f5aa6a47036406754673adb2ed5829c5e406e9"),
    ("dist/economic/buy_void_allocation_reservation_ledger_v1.js", 43033,
     "97a1cb675fec65558aa823b94f049815345fbaed4ac69c9dfae4e1416950cec0"),
    ("dist/economic/buy_void_auto_fulfillment_v1.js", 26226,
     "119a08db651cb85091f66ed2c9e475c56a81f21c9084c47c7f8ee083f831a47c"),
    ("dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js", 21165,
     "0b4dd188dbbf7658542b1d20c521227fa1fc01d7d79e89a713863b771380da13"),
    ("dist/economic/buy_void_filesystem_bakery_lock_v1.js", 18018,
     "7c7a6b92c1a88b14d325d331700a2bd19a0068630ae0094c65b2dcc6a25a9994"),
)

def hold(reason: str) -> None:
    raise ValueError("nimo_v3_inactive_" + reason)

def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def git_blob(data: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()

def canonical(value: object) -> bytes:
    return (json.dumps(value, sort_keys=True, ensure_ascii=True, separators=(",", ":")) + "\n").encode("utf-8")

def exact_regular(path: Path, expected_bytes: int, expected_sha: str) -> bytes:
    visible = path.lstat()
    if not stat.S_ISREG(visible.st_mode) or visible.st_nlink != 1 or visible.st_size != expected_bytes:
        hold("runtime_metadata_invalid:" + str(path))
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if opened.st_dev != visible.st_dev or opened.st_ino != visible.st_ino or opened.st_size != visible.st_size:
            hold("runtime_rebound:" + str(path))
        data = bytearray()
        while len(data) <= expected_bytes:
            chunk = os.read(fd, min(65536, expected_bytes + 1 - len(data)))
            if not chunk:
                break
            data.extend(chunk)
        after = os.fstat(fd)
        if (opened.st_dev, opened.st_ino, opened.st_size, opened.st_mtime_ns, opened.st_ctime_ns) != (
            after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_ctime_ns
        ):
            hold("runtime_changed_during_read:" + str(path))
    finally:
        os.close(fd)
    raw = bytes(data)
    if len(raw) != expected_bytes or sha256(raw) != expected_sha:
        hold("runtime_bytes_invalid:" + str(path))
    return raw

def read_lock(root: Path) -> bytes:
    raw = root.joinpath(LOCK_REL).read_bytes()
    if git_blob(raw) != LOCK_BLOB:
        hold("v2_lock_blob_changed")
    lock = json.loads(raw.decode("utf-8"))
    if type(lock) is not dict or lock.get("schema") != "void_buy_void_nimo_witness_v2_proposed_lock_v1" or lock.get("status") != "HOLD_UNACCEPTED_SOURCE_CANDIDATE" or lock.get("candidate_manifest_id") != V2_ID or lock.get("runtime_file_count") != 8:
        hold("v2_lock_semantics_changed")
    return raw

def manifest() -> dict:
    return {
        "schema": "void_buy_void_nimo_witness_v3_inactive_review_bundle_v1",
        "marker": MARKER,
        "version": 1,
        "status": "HOLD_UNACCEPTED_NOT_INSTALLED",
        "source_main": SOURCE_MAIN,
        "candidate_manifest_id": V3_ID,
        "proposed_v2_manifest_id": V2_ID,
        "proposed_v2_lock_git_blob": LOCK_BLOB,
        "runtime_file_count": 8,
        "runtime_files": [{"path": p, "bytes": n, "sha256": h} for p, n, h in RUNTIME],
        "authority": {
            "installed_nimo_v3_accepted": False,
            "authenticated_custody_principal_verified": False,
            "verified_payment_to_allocation_mounted": False,
            "custody_reserve_or_recover_enabled": False,
            "customer_payment_or_allocation_written": False,
            "wallet_or_signer_used": False,
            "presale_activation": False,
            "funds_moved": False,
        },
    }

def source_members() -> dict[str, bytes]:
    root = Path(__file__).resolve().parent.parent
    values = {
        PREFIX + "review/proposed-v2-lock.json": read_lock(root),
        PREFIX + "review/manifest.json": canonical(manifest()),
    }
    for rel, size, digest_value in RUNTIME:
        values[PREFIX + "payload/" + rel] = exact_regular(root.joinpath(*rel.split("/")), size, digest_value)
    return dict(sorted(values.items()))

def canonical_archive(members: dict[str, bytes]) -> bytes:
    sink = io.BytesIO()
    with tarfile.open(fileobj=sink, mode="w", format=tarfile.USTAR_FORMAT) as archive:
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
    return sink.getvalue()

def write_new(path: str, raw: bytes) -> Path:
    target = Path(path)
    if not target.is_absolute() or target.name != "void-nimo-v3-inactive.tar" or target != Path(os.path.normpath(str(target))):
        hold("output_path_invalid")
    parent = target.parent
    meta = parent.lstat()
    if not stat.S_ISDIR(meta.st_mode) or meta.st_uid != os.getuid() or (meta.st_mode & 0o077) != 0:
        hold("output_parent_not_private")
    fd = os.open(target, os.O_CREAT | os.O_EXCL | os.O_WRONLY | os.O_NOFOLLOW, 0o600)
    try:
        offset = 0
        while offset < len(raw):
            wrote = os.write(fd, raw[offset:])
            if wrote <= 0:
                hold("archive_short_write")
            offset += wrote
        os.fsync(fd)
    finally:
        os.close(fd)
    dfd = os.open(parent, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        os.fsync(dfd)
    finally:
        os.close(dfd)
    return target

def inspect_archive(path: str) -> dict:
    candidate = Path(path)
    visible = candidate.lstat()
    if not stat.S_ISREG(visible.st_mode) or visible.st_nlink != 1 or not (0 < visible.st_size <= MAX_ARCHIVE):
        hold("archive_metadata_invalid")
    fd = os.open(candidate, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        opened = os.fstat(fd)
        if opened.st_dev != visible.st_dev or opened.st_ino != visible.st_ino or opened.st_size != visible.st_size:
            hold("archive_rebound_before_read")
        raw = bytearray()
        while len(raw) <= MAX_ARCHIVE:
            chunk = os.read(fd, min(65536, MAX_ARCHIVE + 1 - len(raw)))
            if not chunk:
                break
            raw.extend(chunk)
        after = os.fstat(fd)
        if (opened.st_dev, opened.st_ino, opened.st_size, opened.st_mtime_ns, opened.st_ctime_ns) != (
            after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_ctime_ns
        ):
            hold("archive_changed_during_read")
    finally:
        os.close(fd)
    source = bytes(raw)
    if len(source) != visible.st_size:
        hold("archive_size_changed")
    values = {}
    total = 0
    with tarfile.open(fileobj=io.BytesIO(source), mode="r:") as archive:
        for member in archive:
            if len(values) >= 10:
                hold("archive_member_count_exceeded")
            name = member.name
            if not name.startswith(PREFIX) or name.startswith("/") or ".." in name.split("/") or not member.isfile() or member.uid != 0 or member.gid != 0 or member.mode != 0o444 or member.mtime != 0 or name in values or not (0 <= member.size <= MAX_MEMBER):
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
            values[name] = data
    expected_names = {PREFIX + "review/proposed-v2-lock.json", PREFIX + "review/manifest.json", *[PREFIX + "payload/" + p for p, _, _ in RUNTIME]}
    if set(values) != expected_names:
        hold("archive_member_set_invalid")
    if git_blob(values[PREFIX + "review/proposed-v2-lock.json"]) != LOCK_BLOB:
        hold("archive_v2_lock_changed")
    if values[PREFIX + "review/manifest.json"] != canonical(manifest()):
        hold("archive_manifest_changed")
    for rel, size, digest_value in RUNTIME:
        data = values[PREFIX + "payload/" + rel]
        if len(data) != size or sha256(data) != digest_value:
            hold("archive_payload_changed:" + rel)
    if source != canonical_archive(values):
        hold("archive_noncanonical_wire_bytes")
    return {
        "marker": MARKER,
        "mode": "inspect",
        "candidate_manifest_id": V3_ID,
        "archive_bytes": len(source),
        "archive_sha256": sha256(source),
        "runtime_files_exact": 8,
        "canonical_wire_bytes": True,
        "installed_nimo_v3_accepted": False,
        "authenticated_custody_principal_verified": False,
        "verified_payment_to_allocation_mounted": False,
        "presale_activation": False,
        "funds_moved": False,
    }

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--plan", action="store_true")
    group.add_argument("--package", metavar="PRIVATE_ABSOLUTE_TAR")
    group.add_argument("--inspect-archive", metavar="TAR")
    args = parser.parse_args()
    if args.inspect_archive:
        result = inspect_archive(args.inspect_archive)
    else:
        raw = canonical_archive(source_members())
        result = {
            "marker": MARKER,
            "mode": "plan" if args.plan else "package",
            "candidate_manifest_id": V3_ID,
            "archive_bytes": len(raw),
            "archive_sha256": sha256(raw),
            "runtime_files_exact": 8,
            "canonical_wire_bytes": True,
            "installed_nimo_v3_accepted": False,
            "authenticated_custody_principal_verified": False,
            "verified_payment_to_allocation_mounted": False,
            "presale_activation": False,
            "funds_moved": False,
        }
        if args.package:
            out = write_new(args.package, raw)
            inspected = inspect_archive(str(out))
            if inspected["archive_bytes"] != result["archive_bytes"] or inspected["archive_sha256"] != result["archive_sha256"]:
                hold("package_reinspection_mismatch")
    sys.stdout.buffer.write(canonical(result))

if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, AssertionError, tarfile.TarError) as exc:
        print("VOID_NIMO_V3_INACTIVE_BUNDLE_V1_HOLD:" + str(exc), file=sys.stderr)
        raise SystemExit(2)
