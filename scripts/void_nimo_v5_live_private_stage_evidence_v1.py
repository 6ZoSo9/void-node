#!/usr/bin/env python3
"""Read-only host-authenticated evidence for the exact Nimo V5 private stage.

This source never installs runtime bytes, contacts SSH, mutates services, or
changes the staged tree.  Live --collect is intended to run locally on Nimo
after the reviewed V5 private stage already exists.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import pwd
import re
import socket
import stat
import struct
import sys
from datetime import datetime, timezone

MARKER = "VOID_NIMO_V5_LIVE_PRIVATE_STAGE_EVIDENCE_V1"
STAGE_SOURCE = "scripts/void_nimo_v5_private_stage_v1.py"
STAGE_SOURCE_GIT_BLOB_SHA1 = "057da3cbf729100958d3707c5db356f80193e5ac"
STAGE_MARKER = "VOID_NIMO_V5_PRIVATE_STAGE_V1"
STAGE_NAME = "void-nimo-v5-inactive-review-20261013"
CANDIDATE_ID = "voidwfb5_10391f1bf567fba6d9cab2099fb1db2b180333baa01ae868fe62367208984dcb"
ARCHIVE_SHA256 = "ede5706fa6ecaf50a3e22e893a7fc24d65ed1c640901c16e151239319296ab21"
EXPECTED_HOSTNAME = "Nimo"
EXPECTED_MACHINE_ID_SHA256 = "48a3554126d621d6460385ebacf3d41b454157337271cb7405af012158f203d4"
EXPECTED_HOSTKEY_FINGERPRINT = "SHA256:3c9mfrwEQ9RKbVwL8pw/kvbCFt5imaj3QCK79yynkvk"
MACHINE_ID_PATH = "/etc/machine-id"
HOSTKEY_PATH = "/etc/ssh/ssh_host_ed25519_key.pub"
MAX_SYSTEM_FILE_BYTES = 64 * 1024

AUTHORITY = {
    "source_only_collector": True,
    "read_only_host_observation": True,
    "reviewed_private_stage_inspector_exact": True,
    "reviewed_nimo_machine_id_required": True,
    "reviewed_nimo_ed25519_hostkey_required": True,
    "private_stage_bytes_verified": True,
    "stage_host_authenticated": True,
    "live_nimo_private_stage_verified": True,
    "root_disk_continuity_reverified": False,
    "external_transport_authenticated": False,
    "live_nimo_installed": False,
    "installation_qualification_composed": False,
    "root_installation_authorized": False,
    "verified_payment_to_allocation_mounted": False,
    "custody_reserve_or_recover_enabled": False,
    "runtime_integration": False,
    "payment_acceptance": False,
    "wallet_or_signer_access": False,
    "private_key_access": False,
    "transaction_signing": False,
    "transaction_broadcast": False,
    "chain2050_write": False,
    "public_presale_activation": False,
    "funds_movement": False,
}


def hold(reason: str) -> None:
    raise ValueError("nimo_v5_live_stage_" + reason)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob(data: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(data)).encode("ascii") + b"\0" + data
    ).hexdigest()


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


def same_file(left: os.stat_result, right: os.stat_result) -> bool:
    return (
        left.st_dev,
        left.st_ino,
        left.st_uid,
        left.st_gid,
        left.st_mode,
        left.st_nlink,
        left.st_size,
        left.st_mtime_ns,
        left.st_ctime_ns,
    ) == (
        right.st_dev,
        right.st_ino,
        right.st_uid,
        right.st_gid,
        right.st_mode,
        right.st_nlink,
        right.st_size,
        right.st_mtime_ns,
        right.st_ctime_ns,
    )


def require_unprivileged_linux() -> None:
    if os.name != "posix" or sys.platform != "linux" or os.getuid() < 1:
        hold("unprivileged_linux_required")
    if os.geteuid() != os.getuid():
        hold("setuid_forbidden")


def root_owned_nonwritable_parent_chain(file: str) -> bool:
    resolved = os.path.abspath(file)
    parent = os.path.dirname(resolved)
    parsed_root = os.path.sep
    parts = parent[len(parsed_root):].split(os.path.sep)
    parts = [part for part in parts if part]
    current = parsed_root
    fd = os.open(
        current,
        os.O_RDONLY | os.O_CLOEXEC | os.O_DIRECTORY | os.O_NOFOLLOW,
    )
    try:
        for index in range(len(parts) + 1):
            visible = os.lstat(current)
            opened = os.fstat(fd)
            if (
                not stat.S_ISDIR(visible.st_mode)
                or stat.S_ISLNK(visible.st_mode)
                or not same_file(visible, opened)
                or opened.st_uid != 0
                or (opened.st_mode & 0o022)
            ):
                return False
            if index == len(parts):
                return True
            component = parts[index]
            next_fd = os.open(
                component,
                os.O_RDONLY | os.O_CLOEXEC | os.O_DIRECTORY | os.O_NOFOLLOW,
                dir_fd=fd,
            )
            os.close(fd)
            fd = next_fd
            current = os.path.join(current, component)
        return False
    except OSError:
        return False
    finally:
        try:
            os.close(fd)
        except OSError:
            pass


def read_exact_system_file(file: str, max_bytes: int = MAX_SYSTEM_FILE_BYTES) -> bytes:
    if not os.path.isabs(file) or os.path.normpath(file) != file:
        hold("system_file_path_invalid")
    if not root_owned_nonwritable_parent_chain(file):
        hold("system_file_parent_custody_invalid")
    visible = os.lstat(file)
    if (
        not stat.S_ISREG(visible.st_mode)
        or stat.S_ISLNK(visible.st_mode)
        or visible.st_uid != 0
        or visible.st_nlink != 1
        or visible.st_size < 1
        or visible.st_size > max_bytes
        or (visible.st_mode & 0o022)
    ):
        hold("system_file_metadata_invalid")
    fd = os.open(file, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not same_file(visible, opened):
            hold("system_file_open_identity_mismatch")
        raw = os.pread(fd, opened.st_size + 1, 0)
        after = os.fstat(fd)
        visible_after = os.lstat(file)
        if (
            len(raw) != opened.st_size
            or not same_file(opened, after)
            or not same_file(after, visible_after)
        ):
            hold("system_file_changed_during_read")
        return raw
    finally:
        os.close(fd)


def machine_id_digest(raw: bytes) -> str:
    try:
        value = raw.decode("ascii").strip()
    except UnicodeError:
        hold("machine_id_invalid")
    if not re.fullmatch(r"[0-9a-f]{32}", value):
        hold("machine_id_invalid")
    return sha256(value.encode("ascii"))


def parse_ed25519_public_key(raw: bytes) -> tuple[str, bytes]:
    try:
        line = raw.decode("ascii").strip()
    except UnicodeError:
        hold("hostkey_invalid")
    if not line or "\n" in line or "\r" in line:
        hold("hostkey_invalid")
    parts = line.split()
    if len(parts) not in (2, 3) or parts[0] != "ssh-ed25519":
        hold("hostkey_invalid")
    try:
        blob = base64.b64decode(parts[1], validate=True)
    except Exception:
        hold("hostkey_invalid")

    offset = 0

    def read_string() -> bytes:
        nonlocal offset
        if offset + 4 > len(blob):
            hold("hostkey_invalid")
        length = struct.unpack(">I", blob[offset:offset + 4])[0]
        offset += 4
        if length < 1 or offset + length > len(blob):
            hold("hostkey_invalid")
        value = blob[offset:offset + length]
        offset += length
        return value

    algorithm = read_string()
    key = read_string()
    if algorithm != b"ssh-ed25519" or len(key) != 32 or offset != len(blob):
        hold("hostkey_invalid")
    fingerprint = "SHA256:" + base64.b64encode(
        hashlib.sha256(blob).digest()
    ).decode("ascii").rstrip("=")
    return fingerprint, blob


def qualify_host_identity(
    hostname: str,
    machine_digest: str,
    hostkey_fingerprint: str,
) -> dict:
    if hostname != EXPECTED_HOSTNAME:
        hold("hostname_mismatch")
    if machine_digest != EXPECTED_MACHINE_ID_SHA256:
        hold("machine_id_mismatch")
    if hostkey_fingerprint != EXPECTED_HOSTKEY_FINGERPRINT:
        hold("hostkey_fingerprint_mismatch")
    return {
        "hostname": hostname,
        "machine_id_sha256": machine_digest,
        "ssh_hostkey_algorithm": "ssh-ed25519",
        "ssh_hostkey_fingerprint": hostkey_fingerprint,
        "reviewed_successor_machine_identity_verified": True,
        "reviewed_hostkey_identity_verified": True,
    }


def read_stage_source(root: Path) -> bytes:
    path = root / STAGE_SOURCE
    visible = path.lstat()
    if (
        not stat.S_ISREG(visible.st_mode)
        or stat.S_ISLNK(visible.st_mode)
        or visible.st_nlink != 1
        or visible.st_size < 1
        or visible.st_size > 1024 * 1024
    ):
        hold("stage_source_metadata_invalid")
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not same_file(visible, opened):
            hold("stage_source_open_identity_mismatch")
        raw = os.pread(fd, opened.st_size + 1, 0)
        after = os.fstat(fd)
        visible_after = path.lstat()
        if (
            len(raw) != opened.st_size
            or not same_file(opened, after)
            or not same_file(after, visible_after)
        ):
            hold("stage_source_changed_during_read")
    finally:
        os.close(fd)
    if git_blob(raw) != STAGE_SOURCE_GIT_BLOB_SHA1:
        hold("stage_source_git_blob_mismatch")
    return raw


def load_reviewed_stage_inspector(root: Path) -> dict:
    raw = read_stage_source(root)
    namespace = {
        "__name__": "void_nimo_v5_private_stage_reviewed_v1",
        "__file__": str(root / STAGE_SOURCE),
    }
    exec(compile(raw, str(root / STAGE_SOURCE), "exec"), namespace)
    if (
        namespace.get("MARKER") != STAGE_MARKER
        or namespace.get("STAGE_NAME") != STAGE_NAME
        or namespace.get("CANDIDATE_ID") != CANDIDATE_ID
        or namespace.get("ARCHIVE_SHA256") != ARCHIVE_SHA256
        or not isinstance(namespace.get("RUNTIME"), tuple)
        or len(namespace["RUNTIME"]) != 8
        or not callable(namespace.get("inspect_stage"))
    ):
        hold("stage_inspector_contract_invalid")
    return namespace


def evidence_id(body: dict) -> str:
    return "voidnv5stage1_" + sha256(canonical(body))


def build_receipt(host: dict, count: int, observed_at_utc: str) -> dict:
    if count != 8:
        hold("stage_file_count_invalid")
    body = {
        "marker": MARKER,
        "version": 1,
        "status": "LIVE_NIMO_V5_PRIVATE_STAGE_VERIFIED_INSTALL_HOLD",
        "observed_at_utc": observed_at_utc,
        "candidate_manifest_id": CANDIDATE_ID,
        "inactive_archive_sha256": ARCHIVE_SHA256,
        "private_stage_name": STAGE_NAME,
        "private_stage_inspector_git_blob_sha1": STAGE_SOURCE_GIT_BLOB_SHA1,
        "runtime_files_exact": 8,
        "staged_files_verified": count,
        "host_identity": host,
        "authority": AUTHORITY,
    }
    return {**body, "evidence_id": evidence_id(body)}


def collect_live() -> dict:
    require_unprivileged_linux()
    root = Path(__file__).resolve().parents[1]
    inspector = load_reviewed_stage_inspector(root)

    machine_digest = machine_id_digest(
        read_exact_system_file(MACHINE_ID_PATH, 4096)
    )
    hostkey_raw = read_exact_system_file(HOSTKEY_PATH, 64 * 1024)
    hostkey_fingerprint, _blob = parse_ed25519_public_key(hostkey_raw)
    host = qualify_host_identity(
        socket.gethostname(),
        machine_digest,
        hostkey_fingerprint,
    )

    home = pwd.getpwuid(os.getuid()).pw_dir
    count = int(inspector["inspect_stage"](home))
    observed_at = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )
    return build_receipt(host, count, observed_at)


def synthetic_public_key_line() -> tuple[bytes, str]:
    algorithm = b"ssh-ed25519"
    key = bytes(range(32))
    blob = (
        struct.pack(">I", len(algorithm))
        + algorithm
        + struct.pack(">I", len(key))
        + key
    )
    line = b"ssh-ed25519 " + base64.b64encode(blob) + b" fixture\n"
    fingerprint = "SHA256:" + base64.b64encode(
        hashlib.sha256(blob).digest()
    ).decode("ascii").rstrip("=")
    return line, fingerprint


def self_test() -> None:
    root = Path(__file__).resolve().parents[1]
    inspector = load_reviewed_stage_inspector(root)
    if len(inspector["RUNTIME"]) != 8:
        hold("selftest_runtime_count_invalid")

    line, expected = synthetic_public_key_line()
    observed, blob = parse_ed25519_public_key(line)
    if observed != expected or len(blob) < 40:
        hold("selftest_hostkey_parser_failed")
    try:
        parse_ed25519_public_key(b"ssh-rsa AAAA\n")
    except ValueError:
        pass
    else:
        hold("selftest_non_ed25519_hostkey_accepted")

    expected_machine = sha256(b"a" * 32)
    if machine_id_digest(b"a" * 32 + b"\n") != expected_machine:
        hold("selftest_machine_hash_failed")

    host = qualify_host_identity(
        EXPECTED_HOSTNAME,
        EXPECTED_MACHINE_ID_SHA256,
        EXPECTED_HOSTKEY_FINGERPRINT,
    )
    for args, reason in [
        (("Other", EXPECTED_MACHINE_ID_SHA256, EXPECTED_HOSTKEY_FINGERPRINT), "hostname"),
        ((EXPECTED_HOSTNAME, "0" * 64, EXPECTED_HOSTKEY_FINGERPRINT), "machine"),
        ((EXPECTED_HOSTNAME, EXPECTED_MACHINE_ID_SHA256, "SHA256:wrong"), "hostkey"),
    ]:
        try:
            qualify_host_identity(*args)
        except ValueError:
            pass
        else:
            hold("selftest_" + reason + "_mismatch_accepted")

    receipt = build_receipt(host, 8, "2030-01-01T00:00:00Z")
    if (
        not re.fullmatch(r"voidnv5stage1_[0-9a-f]{64}", receipt["evidence_id"])
        or receipt["authority"]["stage_host_authenticated"] is not True
        or receipt["authority"]["live_nimo_private_stage_verified"] is not True
        or receipt["authority"]["live_nimo_installed"] is not False
        or receipt["authority"]["production_gate_ready"] is not False
        or receipt["authority"]["public_presale_activation"] is not False
        or receipt["authority"]["funds_movement"] is not False
    ):
        hold("selftest_receipt_authority_invalid")

    print(MARKER + "_SELF_TEST_GREEN")
    print("reviewed_private_stage_inspector_exact=true")
    print("reviewed_nimo_machine_id_required=true")
    print("reviewed_nimo_ed25519_hostkey_required=true")
    print("live_host_collection_performed=false")
    print("live_nimo_installed=false")
    print("production_gate_ready=false")
    print("public_presale_activation=false")
    print("funds_movement=false")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--collect", action="store_true")
    modes.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    print(json.dumps(collect_live(), sort_keys=True, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, AssertionError) as exc:
        message = str(exc)
        if not message.startswith("nimo_v5_live_stage_"):
            message = "nimo_v5_live_stage_unqualified_read_only_observation"
        print(MARKER + "_HOLD:" + message, file=sys.stderr)
        raise SystemExit(2)
