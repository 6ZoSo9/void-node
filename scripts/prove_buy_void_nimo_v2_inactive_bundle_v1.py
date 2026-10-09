#!/usr/bin/env python3
"""Prepare or inspect a reproducible INACTIVE Nimo witness V2 review bundle.

No SSH, sudo, install, service, allocation, wallet, signer, network or funds.
--inspect-archive can run standalone, including on Nimo, without the repo.
"""
import argparse
import copy
import hashlib
import io
import json
import os
from pathlib import Path
import stat
import sys
import tarfile

LOCK_REL = "docs/architecture/buy-void-nimo-witness-v2-proposed-lock-v1.json"
LOCK_BLOB = "73c7f88348a1d6b208336df8779940657607bd7d"
SOURCE_HEAD = "884edc6e82bd505a83e51a44b38f7e318431f314"
CANDIDATE_ID = "voidwfb2_b1cf93ea36879332d2745294b8aab1b261d5e7c13522af681db8d390254df73d"
OLD_ID = "voidwfb1_2a729229f63c10a1562050924ddc279d8255a35603542967431a584977f1f6b7"
OLD_AUTO_SHA = "ae15c56f1aa7009955058ca1d454da5e0d55a3e6c2011c54e7316374e33a5cf6"
NEW_AUTO_SHA = "119a08db651cb85091f66ed2c9e475c56a81f21c9084c47c7f8ee083f831a47c"
EXPECTED_PATHS = (
    "tools/void-buy-allocation-custody-witness-forced-command-v2.mjs",
    "dist/economic/buy_void_allocation_custody_external_witness_v1.js",
    "dist/economic/buy_void_allocation_custody_witness_transport_v1.js",
    "dist/economic/buy_void_allocation_reservation_high_water_v1.js",
    "dist/economic/buy_void_allocation_reservation_ledger_v1.js",
    "dist/economic/buy_void_auto_fulfillment_v1.js",
    "dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js",
    "dist/economic/buy_void_filesystem_bakery_lock_v1.js",
)
PREFIX = "inactive-v2-candidate/"
MAX_TOTAL = 1024 * 1024
FALSE_FLAGS = (
    "historical_v1_installation_confirmed_by_authenticated_attestation",
    "operator_readonly_census_treated_as_attestation",
    "v2_runtime_bundle_identity_accepted",
    "v2_host_installed",
    "v2_host_principal_verified",
    "v2_authenticated_transport_qualified",
    "verified_payment_to_allocation_mounted",
    "presale_activation",
    "funds_moved",
)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def git_blob(data):
    return hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()


def canonical(value):
    return (json.dumps(value, sort_keys=True, ensure_ascii=True,
                       separators=(",", ":")) + "\n").encode("utf8")


def require(condition, reason):
    if not condition:
        raise ValueError("nimo_v2_inactive_" + reason)


def verify_lock(raw, require_exact_blob=True):
    if require_exact_blob:
        require(git_blob(raw) == LOCK_BLOB, "proposed_lock_source_changed")
    lock = json.loads(raw.decode("utf8"))
    require(type(lock) is dict, "lock_shape_invalid")
    require(lock.get("schema") == "void_buy_void_nimo_witness_v2_proposed_lock_v1",
            "lock_schema_changed")
    require(lock.get("status") == "HOLD_UNACCEPTED_SOURCE_CANDIDATE",
            "candidate_must_remain_unaccepted")
    require(lock.get("exact_source_generation_commit") == SOURCE_HEAD,
            "source_generation_mismatch")
    require(lock.get("candidate_manifest_id") == CANDIDATE_ID, "candidate_id_mismatch")
    require(lock.get("historical_v1_manifest_id") == OLD_ID, "historical_id_mismatch")
    require(lock.get("historical_v1_installed_auto_fulfillment_sha256") == OLD_AUTO_SHA,
            "historical_auto_identity_mismatch")
    require(lock.get("candidate_v2_auto_fulfillment_sha256") == NEW_AUTO_SHA,
            "candidate_auto_identity_mismatch")
    require(lock.get("runtime_file_count") == 8, "file_count_invalid")
    rows = lock.get("runtime_files")
    require(type(rows) is list and len(rows) == 8, "runtime_rows_invalid")
    require(tuple(item.get("path") for item in rows) == EXPECTED_PATHS,
            "runtime_file_names_or_order_mismatch")
    require(all(type(item) is dict and type(item.get("bytes")) is int and
                1 <= item["bytes"] <= MAX_TOTAL and
                type(item.get("sha256")) is str and len(item["sha256"]) == 64
                for item in rows), "runtime_file_metadata_invalid")
    require(all(item.get("installed_path") == "/usr/local/libexec/" +
                item["path"].removeprefix("tools/").replace(
                    "void-buy-allocation-custody-witness-forced-command-v2.mjs",
                    "void/void-buy-allocation-custody-witness-forced-command-v2.mjs")
                for item in rows), "installed_path_mismatch")
    # The original seven module digests are identical; only AUTO differs.
    auto = next(item for item in rows if item["path"].endswith(
        "/buy_void_auto_fulfillment_v1.js"))
    require(auto["bytes"] == 26226 and auto["sha256"] == NEW_AUTO_SHA,
            "candidate_auto_bytes_invalid")
    require(type(lock.get("authority")) is dict and
            all(lock["authority"].get(key) is False for key in FALSE_FLAGS),
            "runtime_authority_not_held")
    require(lock["authority"].get("candidate_v2_compiled_source_reproducible_in_ci_only")
            is True, "candidate_reproducibility_missing")
    return lock


def manifest_for(lock):
    return {
        "schema": "void_buy_void_nimo_witness_v2_inactive_review_bundle_v1",
        "status": "HOLD_UNACCEPTED_NOT_INSTALLED",
        "version": 1,
        "source_commit": SOURCE_HEAD,
        "candidate_manifest_id": CANDIDATE_ID,
        "historical_v1_manifest_id": OLD_ID,
        "lock_git_blob_sha1": LOCK_BLOB,
        "file_count": 8,
        "runtime_files": [
            {"path": row["path"], "bytes": row["bytes"],
             "sha256": row["sha256"]} for row in lock["runtime_files"]
        ],
        "authority": {
            "runtime_bundle_identity_accepted": False,
            "installation_performed": False,
            "original_v1_modified": False,
            "service_restart": False,
            "authenticated_host_attestation": False,
            "custody_reserve_enabled": False,
            "payment_to_allocation_authorized": False,
            "presale_activation": False,
            "funds_moved": False,
        },
    }


def checked_compile(root, row):
    rel = row["path"]
    require(rel in EXPECTED_PATHS, "unexpected_runtime_path")
    item = root.joinpath(*rel.split("/"))
    info = item.lstat()
    require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1,
            "compiled_artifact_not_regular")
    require(0 < info.st_size <= MAX_TOTAL, "compiled_artifact_size_invalid")
    fd = os.open(item, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        actual = os.fstat(fd)
        require(stat.S_ISREG(actual.st_mode) and actual.st_nlink == 1 and
                actual.st_ino == info.st_ino and actual.st_dev == info.st_dev,
                "compiled_artifact_fd_identity_invalid")
        data = bytearray()
        while len(data) <= row["bytes"]:
            chunk = os.read(fd, min(65536, row["bytes"] + 1 - len(data)))
            if not chunk:
                break
            data.extend(chunk)
        data = bytes(data)
        after = os.fstat(fd)
        require((actual.st_dev, actual.st_ino, actual.st_size,
                 actual.st_mtime_ns, actual.st_ctime_ns) ==
                (after.st_dev, after.st_ino, after.st_size,
                 after.st_mtime_ns, after.st_ctime_ns),
                "compiled_artifact_changed_during_read")
    finally:
        os.close(fd)
    require(len(data) == row["bytes"] and digest(data) == row["sha256"],
            "compiled_artifact_unreviewed")
    return data


def compiled_inputs():
    root = Path(__file__).resolve().parent.parent
    lock_bytes = root.joinpath(LOCK_REL).read_bytes()
    lock = verify_lock(lock_bytes)
    blobs = {row["path"]: checked_compile(root, row)
             for row in lock["runtime_files"]}
    return lock_bytes, lock, blobs


def archive_members(lock_bytes, lock, blobs):
    manifest = canonical(manifest_for(lock))
    members = {
        PREFIX + "review/proposed-lock.json": lock_bytes,
        PREFIX + "review/manifest.json": manifest,
    }
    for row in lock["runtime_files"]:
        members[PREFIX + "payload/" + row["path"]] = blobs[row["path"]]
    return dict(sorted(members.items()))


def write_archive(destination, members):
    target = Path(destination)
    require(target.is_absolute() and target.name == "void-nimo-v2-inactive.tar" and
            target == Path(os.path.normpath(str(target))),
            "output_path_invalid")
    parent = target.parent
    meta = parent.lstat()
    require(stat.S_ISDIR(meta.st_mode) and meta.st_uid == os.getuid() and
            (meta.st_mode & 0o077) == 0, "output_parent_not_private")
    flags = os.O_CREAT | os.O_EXCL | os.O_WRONLY | os.O_NOFOLLOW
    fd = os.open(target, flags, 0o600)
    try:
        with os.fdopen(fd, "wb", closefd=False) as sink:
            with tarfile.open(fileobj=sink, mode="w",
                              format=tarfile.USTAR_FORMAT) as archive:
                for name, data in members.items():
                    info = tarfile.TarInfo(name=name)
                    info.size = len(data)
                    info.uid = 0
                    info.gid = 0
                    info.uname = ""
                    info.gname = ""
                    info.mtime = 0
                    info.mode = 0o444
                    archive.addfile(info, io.BytesIO(data))
            sink.flush()
            os.fsync(fd)
        dir_fd = os.open(parent, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        try:
            os.fsync(dir_fd)
        finally:
            os.close(dir_fd)
    finally:
        os.close(fd)
    return target


def inspect_archive(path):
    original = Path(path)
    require(original.is_file() and not original.is_symlink(),
            "archive_not_regular")
    require(original.stat().st_size < 2 * MAX_TOTAL,
            "archive_size_invalid")
    values = {}
    with tarfile.open(original, mode="r:") as archive:
        for member in archive.getmembers():
            name = member.name
            require(name.startswith(PREFIX) and not name.startswith("/") and
                    ".." not in name.split("/") and member.isfile() and
                    member.mode == 0o444 and member.uid == 0 and
                    member.gid == 0 and member.mtime == 0,
                    "unsafe_archive_member")
            require(name not in values and member.size < MAX_TOTAL,
                    "duplicate_or_oversized_member")
            handle = archive.extractfile(member)
            require(handle is not None, "missing_archive_bytes")
            values[name] = handle.read(member.size + 1)
            require(len(values[name]) == member.size, "archive_member_size_changed")
    raw = values.get(PREFIX + "review/proposed-lock.json")
    require(type(raw) is bytes, "missing_proposed_lock")
    lock = verify_lock(raw)
    expected = {PREFIX + "review/proposed-lock.json",
                PREFIX + "review/manifest.json"}
    expected.update(PREFIX + "payload/" + row["path"] for row in lock["runtime_files"])
    require(set(values) == expected, "archive_member_set_unreviewed")
    require(values[PREFIX + "review/manifest.json"] ==
            canonical(manifest_for(lock)), "inactive_manifest_invalid")
    for row in lock["runtime_files"]:
        content = values[PREFIX + "payload/" + row["path"]]
        require(len(content) == row["bytes"] and digest(content) == row["sha256"],
                "payload_unreviewed")
    return lock, values


def receipt(lock):
    return {
        "status": "HOLD_UNACCEPTED_NOT_INSTALLED",
        "candidate_manifest_id": lock["candidate_manifest_id"],
        "original_v1_preserved": True,
        "v2_eight_compiled_files_exact": True,
        "changed_auto_fulfillment_expected_sha256": NEW_AUTO_SHA,
        "v2_host_installed": False,
        "v2_runtime_bundle_identity_accepted": False,
        "authenticated_host_attestation": False,
        "payment_to_allocation_authorized": False,
        "presale_activation": False,
        "funds_moved": False,
    }


def negative_self_test():
    raw = Path(__file__).resolve().parent.parent.joinpath(LOCK_REL).read_bytes()
    lock = verify_lock(raw)
    require(lock["candidate_manifest_id"] != OLD_ID, "v1_v2_collision")
    for wrong in [
        dict(lock, candidate_manifest_id=OLD_ID),
        dict(lock, status="ACCEPTED"),
        dict(lock, runtime_file_count=7),
        dict(lock, authority=dict(lock["authority"], v2_host_installed=True)),
    ]:
        try:
            # Inspect semantic deltas even though changed bytes also break Git ID.
            verify_lock(canonical(wrong), require_exact_blob=False)
        except ValueError:
            pass
        else:
            raise AssertionError("unsafe_proposed_lock_accepted")
    return {"negative_lock_mutations_rejected": 4,
            "original_v1_reissue_forbidden": True,
            "presale_activation": False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--plan", action="store_true", help="Read-only built file census")
    group.add_argument("--package", metavar="PRIVATE_ABSOLUTE_TAR",
                       help="Create a new inactive review tar in a 0700 private directory")
    group.add_argument("--inspect-archive", metavar="TAR",
                       help="Read-only standalone archive validator for Nimo")
    group.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.inspect_archive:
        lock, _ = inspect_archive(args.inspect_archive)
        result = receipt(lock)
        result["inactive_archive_contents_verified"] = True
    elif args.self_test:
        result = negative_self_test()
    else:
        lock_bytes, lock, blobs = compiled_inputs()
        result = receipt(lock)
        result["compiled_source_file_count"] = len(blobs)
        if args.package:
            out = write_archive(args.package, archive_members(lock_bytes, lock, blobs))
            # The independent read-only inspector must qualify what was emitted.
            inspect_archive(out)
            result["inactive_archive_sha256"] = digest(out.read_bytes())
            result["inactive_archive_bytes"] = out.stat().st_size
            result["inactive_archive_contents_verified"] = True
    sys.stdout.buffer.write(canonical(result))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, AssertionError, tarfile.TarError) as exc:
        sys.stderr.write("HOLD: inactive V2 review artifact not qualified: " +
                         str(exc) + "\n")
        sys.exit(2)
