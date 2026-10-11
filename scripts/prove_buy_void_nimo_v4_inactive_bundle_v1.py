#!/usr/bin/env python3
"""Build or inspect the unaccepted, exact-current Nimo V4 review archive.

No host installation, SSH, sudo, private keys, customer records, service,
wallet, payment, VOID/WC launch or funds authority is granted.
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

MARKER = "VOID_NIMO_V4_INACTIVE_BUNDLE_V1"
PREFIX = "inactive-v4-candidate/"
LOCK_REL = "docs/architecture/buy-void-nimo-witness-v2-proposed-lock-v1.json"
LOCK_BLOB = "73c7f88348a1d6b208336df8779940657607bd7d"
V2_ID = "voidwfb2_b1cf93ea36879332d2745294b8aab1b261d5e7c13522af681db8d390254df73d"
V3_ID = "voidwfb3_cec212bbadb4586f7d479c2284e7a2850f47bdc2205a6dccfad5274c8c7ef454"
SOURCE_MAIN = "63ff562ba8402d523976b3a6ee875c06b94abe18"
LEDGER_SOURCE_GIT_BLOB = "8d84955e1e093a5c5af63241e62b8722fadd2f29"
REPLAY_SOURCE_GIT_BLOB = "b451bcd895986dadaf6e53954671062068316ccf"
V3_LEDGER_SHA256 = "97a1cb675fec65558aa823b94f049815345fbaed4ac69c9dfae4e1416950cec0"
V3_LEDGER_BYTES = 43033
MAX_MEMBER = 16 * 1024 * 1024
MAX_ARCHIVE = 2 * 1024 * 1024
LEDGER_PATH = "dist/economic/buy_void_allocation_reservation_ledger_v1.js"

# Preserve the exact seven V3 runtime payloads, including auto-fulfillment.
# Only the compiled ledger changes in the post-#2790 candidate generation.
V3_RUNTIME = (
    ("tools/void-buy-allocation-custody-witness-forced-command-v2.mjs", 48914,
     "88f425986eff8597cdf6725e4608b3790aed2359fef6ae9fadb76292d9e5a26d"),
    ("dist/economic/buy_void_allocation_custody_external_witness_v1.js", 35821,
     "35d80f00a9ec0ce57bb457596d27e8c86a70d76efe310372e1fff796a92d43ca"),
    ("dist/economic/buy_void_allocation_custody_witness_transport_v1.js", 35066,
     "8e03107d1545977a19b847bbec926543b9812b6d9c16a4d7e13e62cf5c790979"),
    ("dist/economic/buy_void_allocation_reservation_high_water_v1.js", 12251,
     "1999015c9e0770a5a94b3b4d29f5aa6a47036406754673adb2ed5829c5e406e9"),
    (LEDGER_PATH, V3_LEDGER_BYTES, V3_LEDGER_SHA256),
    ("dist/economic/buy_void_auto_fulfillment_v1.js", 26226,
     "119a08db651cb85091f66ed2c9e475c56a81f21c9084c47c7f8ee083f831a47c"),
    ("dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js", 21165,
     "0b4dd188dbbf7658542b1d20c521227fa1fc01d7d79e89a713863b771380da13"),
    ("dist/economic/buy_void_filesystem_bakery_lock_v1.js", 18018,
     "7c7a6b92c1a88b14d325d331700a2bd19a0068630ae0094c65b2dcc6a25a9994"),
)

def hold(reason: str) -> None:
    raise ValueError("nimo_v4_inactive_" + reason)

def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def git_blob(data: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()

def canonical(value: object) -> bytes:
    return (json.dumps(value, sort_keys=True, ensure_ascii=True, separators=(",", ":")) + "\n").encode("utf-8")

def read_exact_file(path: Path, expected_bytes: int | None, expected_sha: str | None) -> bytes:
    visible = path.lstat()
    if not stat.S_ISREG(visible.st_mode) or visible.st_nlink != 1 or not 0 < visible.st_size <= MAX_MEMBER:
        hold("runtime_metadata_invalid:" + str(path))
    if expected_bytes is not None and visible.st_size != expected_bytes:
        hold("runtime_bytes_invalid:" + str(path))
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        opened = os.fstat(fd)
        if (opened.st_dev, opened.st_ino, opened.st_size) != (visible.st_dev, visible.st_ino, visible.st_size):
            hold("runtime_rebound:" + str(path))
        data = bytearray()
        while len(data) <= visible.st_size:
            chunk = os.read(fd, min(65536, visible.st_size + 1 - len(data)))
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
    if len(raw) != visible.st_size or (expected_sha is not None and sha256(raw) != expected_sha):
        hold("runtime_bytes_invalid:" + str(path))
    return raw

def reviewed_source(root: Path) -> None:
    if os.name != "posix":
        hold("linux_required")
    for rel, wanted in (
        ("src/economic/buy_void_allocation_reservation_ledger_v1.ts", LEDGER_SOURCE_GIT_BLOB),
        ("src/economic/buy_void_verified_allocation_replay_binding_v1.ts", REPLAY_SOURCE_GIT_BLOB),
    ):
        data = read_exact_file(root.joinpath(rel), None, None)
        if git_blob(data) != wanted:
            hold("reviewed_source_changed:" + rel)
    try:
        subprocess.run(["git", "merge-base", "--is-ancestor", SOURCE_MAIN, "HEAD"],
                       cwd=root, check=True, stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL)
    except (OSError, subprocess.CalledProcessError):
        hold("current_main_ancestry_missing")

def read_lock(root: Path) -> bytes:
    raw = read_exact_file(root.joinpath(LOCK_REL), None, None)
    if git_blob(raw) != LOCK_BLOB:
        hold("v2_lock_changed")
    lock = json.loads(raw.decode("utf-8"))
    if (type(lock) is not dict or lock.get("schema") != "void_buy_void_nimo_witness_v2_proposed_lock_v1"
        or lock.get("status") != "HOLD_UNACCEPTED_SOURCE_CANDIDATE"
        or lock.get("candidate_manifest_id") != V2_ID
        or lock.get("runtime_file_count") != 8):
        hold("v2_lock_semantics_changed")
    return raw

def inspect_runtime(root: Path) -> tuple[dict[str, bytes], list[dict]]:
    values: dict[str, bytes] = {}
    records: list[dict] = []
    for rel, size, digest in V3_RUNTIME:
        if rel == LEDGER_PATH:
            raw = read_exact_file(root.joinpath(rel), None, None)
            if len(raw) == V3_LEDGER_BYTES and sha256(raw) == V3_LEDGER_SHA256:
                hold("v3_ledger_stale")
        else:
            raw = read_exact_file(root.joinpath(rel), size, digest)
        values[PREFIX + "payload/" + rel] = raw
        records.append({"path": rel, "bytes": len(raw), "sha256": sha256(raw)})
    return values, records

def manifest_body(records: list[dict]) -> dict:
    return {
        "schema": "void_buy_void_nimo_witness_v4_inactive_review_bundle_v1",
        "marker": MARKER,
        "version": 1,
        "status": "HOLD_UNACCEPTED_NOT_INSTALLED",
        "source_main": SOURCE_MAIN,
        "source_ledger_git_blob": LEDGER_SOURCE_GIT_BLOB,
        "source_replay_git_blob": REPLAY_SOURCE_GIT_BLOB,
        "previous_v3_manifest_id": V3_ID,
        "proposed_v2_manifest_id": V2_ID,
        "proposed_v2_lock_git_blob": LOCK_BLOB,
        "runtime_file_count": 8,
        "runtime_files": records,
        "authority": {
            "installed_nimo_v4_accepted": False,
            "authenticated_custody_principal_verified": False,
            "verified_payment_to_allocation_mounted": False,
            "custody_reserve_or_recover_enabled": False,
            "customer_payment_or_allocation_written": False,
            "wallet_or_signer_used": False,
            "presale_activation": False,
            "funds_moved": False,
        },
    }

def manifest(records: list[dict]) -> dict:
    body = manifest_body(records)
    return {**body, "candidate_manifest_id": "voidwfb4_" + sha256(canonical(body))}

def source_members() -> tuple[dict[str, bytes], dict]:
    root = Path(__file__).resolve().parent.parent
    reviewed_source(root)
    raw_lock = read_lock(root)
    payloads, records = inspect_runtime(root)
    record = manifest(records)
    vals = {
        PREFIX + "review/proposed-v2-lock.json": raw_lock,
        PREFIX + "review/manifest.json": canonical(record),
        **payloads,
    }
    return dict(sorted(vals.items())), record

def canonical_archive(members: dict[str, bytes]) -> bytes:
    sink = io.BytesIO()
    with tarfile.open(fileobj=sink, mode="w", format=tarfile.USTAR_FORMAT) as archive:
        for name, data in sorted(members.items()):
            info = tarfile.TarInfo(name=name)
            info.size = len(data)
            info.uid = info.gid = 0
            info.uname = info.gname = ""
            info.mtime = 0
            info.mode = 0o444
            archive.addfile(info, io.BytesIO(data))
    return sink.getvalue()

def inspect_manifest(candidate: object) -> dict:
    if type(candidate) is not dict or candidate.get("runtime_file_count") != 8:
        hold("manifest_invalid")
    records = candidate.get("runtime_files")
    if type(records) is not list or len(records) != len(V3_RUNTIME):
        hold("runtime_records_invalid")
    for index, (rel, size, digest) in enumerate(V3_RUNTIME):
        item = records[index]
        if type(item) is not dict or set(item) != {"path", "bytes", "sha256"} or item["path"] != rel:
            hold("runtime_path_invalid")
        if type(item["bytes"]) is not int or not 0 < item["bytes"] <= MAX_MEMBER:
            hold("runtime_bytes_invalid:" + rel)
        if type(item["sha256"]) is not str or len(item["sha256"]) != 64:
            hold("runtime_digest_invalid:" + rel)
        if index == 4:
            if item["bytes"] == size and item["sha256"] == digest:
                hold("v3_ledger_stale")
        elif item["bytes"] != size or item["sha256"] != digest:
            hold("other_v3_runtime_drift:" + rel)
    want = manifest(records)
    if candidate != want:
        hold("manifest_content_invalid")
    return want

def inspect_archive(path: str) -> dict:
    candidate = Path(path)
    visible = candidate.lstat()
    if not stat.S_ISREG(visible.st_mode) or visible.st_nlink != 1 or not 0 < visible.st_size <= MAX_ARCHIVE:
        hold("archive_metadata_invalid")
    raw = read_exact_file(candidate, None, None)
    vals: dict[str, bytes] = {}
    total = 0
    with tarfile.open(fileobj=io.BytesIO(raw), mode="r:") as archive:
        for member in archive:
            if len(vals) >= 10:
                hold("archive_member_count_exceeded")
            name = member.name
            if (not name.startswith(PREFIX) or name.startswith("/")
                or ".." in name.split("/") or not member.isfile()
                or member.uid != 0 or member.gid != 0 or member.mode != 0o444
                or member.mtime != 0 or name in vals or not 0 <= member.size <= MAX_MEMBER):
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
            vals[name] = data
    want = {PREFIX + "review/proposed-v2-lock.json",
            PREFIX + "review/manifest.json",
            *[PREFIX + "payload/" + rel for rel, _, _ in V3_RUNTIME]}
    if set(vals) != want or git_blob(vals[PREFIX + "review/proposed-v2-lock.json"]) != LOCK_BLOB:
        hold("archive_member_set_or_lock_invalid")
    try:
        record = inspect_manifest(json.loads(vals[PREFIX + "review/manifest.json"].decode("utf-8")))
    except (ValueError, UnicodeError) as exc:
        hold("archive_manifest_invalid:" + type(exc).__name__)
    if vals[PREFIX + "review/manifest.json"] != canonical(record):
        hold("archive_manifest_noncanonical")
    for item in record["runtime_files"]:
        raw_member = vals[PREFIX + "payload/" + item["path"]]
        if len(raw_member) != item["bytes"] or sha256(raw_member) != item["sha256"]:
            hold("archive_payload_invalid:" + item["path"])
    if raw != canonical_archive(vals):
        hold("archive_noncanonical_wire_bytes")
    return {
        "marker": MARKER, "mode": "inspect",
        "candidate_manifest_id": record["candidate_manifest_id"],
        "archive_bytes": len(raw), "archive_sha256": sha256(raw),
        "runtime_files_exact": 8,
        "ledger_bytes": record["runtime_files"][4]["bytes"],
        "ledger_sha256": record["runtime_files"][4]["sha256"],
        "other_v3_runtime_files_exact": 7,
        "installed_nimo_v4_accepted": False,
        "authenticated_custody_principal_verified": False,
        "verified_payment_to_allocation_mounted": False,
        "presale_activation": False, "funds_moved": False,
    }

def write_new(path: str, raw: bytes) -> None:
    target = Path(path)
    if (not target.is_absolute() or target.name != "void-nimo-v4-inactive.tar"
        or target != Path(os.path.normpath(str(target)))):
        hold("output_path_invalid")
    parent = target.parent
    st = parent.lstat()
    if not stat.S_ISDIR(st.st_mode) or st.st_uid != os.getuid() or (st.st_mode & 0o077) != 0:
        hold("output_parent_not_private")
    fd = os.open(target, os.O_CREAT | os.O_EXCL | os.O_WRONLY | os.O_NOFOLLOW, 0o600)
    try:
        n = 0
        while n < len(raw):
            amount = os.write(fd, raw[n:])
            if amount <= 0:
                hold("archive_write_failed")
            n += amount
        os.fsync(fd)
    finally:
        os.close(fd)
    dfd = os.open(parent, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        os.fsync(dfd)
    finally:
        os.close(dfd)

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--plan", action="store_true")
    modes.add_argument("--package", metavar="PRIVATE_ABSOLUTE_TAR")
    modes.add_argument("--inspect-archive", metavar="TAR")
    args = parser.parse_args()
    if args.inspect_archive:
        result = inspect_archive(args.inspect_archive)
    else:
        members, record = source_members()
        raw = canonical_archive(members)
        result = {
            "marker": MARKER, "mode": "plan" if args.plan else "package",
            "candidate_manifest_id": record["candidate_manifest_id"],
            "archive_bytes": len(raw), "archive_sha256": sha256(raw),
            "runtime_files_exact": 8,
            "ledger_bytes": record["runtime_files"][4]["bytes"],
            "ledger_sha256": record["runtime_files"][4]["sha256"],
            "other_v3_runtime_files_exact": 7,
            "installed_nimo_v4_accepted": False,
            "authenticated_custody_principal_verified": False,
            "verified_payment_to_allocation_mounted": False,
            "presale_activation": False, "funds_moved": False,
        }
        if args.package:
            write_new(args.package, raw)
            checked = inspect_archive(args.package)
            if (checked["candidate_manifest_id"] != result["candidate_manifest_id"]
                or checked["archive_sha256"] != result["archive_sha256"]
                or checked["archive_bytes"] != result["archive_bytes"]):
                hold("archive_reinspection_mismatch")
    sys.stdout.buffer.write(canonical(result))

if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, AssertionError, tarfile.TarError) as exc:
        print(MARKER + "_HOLD:" + str(exc), file=sys.stderr)
        raise SystemExit(2)
