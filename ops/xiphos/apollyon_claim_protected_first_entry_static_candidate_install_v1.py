#!/usr/bin/env python3
"""Read-only admission of the exactly accepted static first-entry archive.

This module never extracts, installs, chmods, executes, or publishes an artifact.
"""
from __future__ import annotations

import sys

def _require_isolated_python() -> None:
    flags = sys.flags
    if not (
        flags.isolated == 1
        and flags.ignore_environment == 1
        and flags.no_user_site == 1
        and flags.dont_write_bytecode == 1
        and getattr(flags, "safe_path", 0) == 1
    ):
        sys.stderr.write("HOLD=python_runtime_not_isolated\n")
        sys.stderr.write("protected_install_authorized=false\n")
        sys.stderr.write("funds_movement=false\n")
        raise SystemExit(2)

_require_isolated_python()

import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import stat
import tarfile
import types
from typing import Any

MARKER = "VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_STATIC_CANDIDATE_INSTALL_V1"
ROOT = Path(__file__).resolve().parents[2]
PARENT_HEAD = "389531f38cf8aa822987fee4e52ccad3758eada0"
PARENT_REL = "ops/xiphos/apollyon_claim_protected_first_entry_static_candidate_lock_v1.py"
PARENT_BLOB = "60308199258475936596e38398b00fda553bd5be"
ACCEPTED_CANDIDATE_HEAD = "bf8bfed5b5a4b08a7ebe80139987366b8f4eb94c"
ACCEPTED_BINARY = "apollyon-claim-protected-first-entry-static-v1"
ACCEPTED_INSTALL_LEAF = (
    "/opt/void-apollyon-claim-protected-first-entry-v1/bin/"
    "apollyon_claim_protected_first_entry_v1"
)
EXPECTED_MEMBERS = frozenset({
    "candidate-v1.json",
    ACCEPTED_BINARY,
    "SHA256SUMS.txt",
    "source-head.txt",
})
MAX_ARCHIVE_BYTES = 4 * 1024 * 1024
MAX_REPORT_BYTES = 512 * 1024
MAX_MANIFEST_BYTES = 1024
MAX_SOURCE_BYTES = 512 * 1024


class Hold(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise Hold(reason)


def _close_fd(fd: int, reason: str) -> None:
    try:
        os.close(fd)
    except OSError as exc:
        raise Hold(reason) from exc


def canonical(value: Any) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=True,
        allow_nan=False,
    ).encode("ascii")


def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\x00")
    h.update(raw)
    return h.hexdigest()


def _same_file(a: os.stat_result, b: os.stat_result) -> bool:
    return all(
        getattr(a, field) == getattr(b, field)
        for field in (
            "st_dev", "st_ino", "st_mode", "st_uid", "st_gid", "st_nlink",
            "st_size", "st_mtime_ns", "st_ctime_ns",
        )
    )


def _read_parent_dependency_source(
    parent_module: types.ModuleType,
    relative: str,
    expected_blob: str,
) -> bytes:
    """Replace the historical parent's pathname-reopening stable_file safely."""
    if (
        not isinstance(relative, str)
        or not relative
        or os.path.isabs(relative)
        or ".." in Path(relative).parts
    ):
        hold("accepted_parent_dependency_path_invalid")
    root = Path(parent_module.ROOT)
    path = root / relative
    try:
        before = path.lstat()
        if (
            not stat.S_ISREG(before.st_mode)
            or stat.S_ISLNK(before.st_mode)
            or before.st_nlink != 1
            or not 0 < before.st_size <= int(parent_module.MAX_SOURCE_BYTES)
        ):
            hold("accepted_parent_dependency_metadata_invalid")
        fd = os.open(
            path,
            os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK,
        )
    except OSError as exc:
        raise Hold("accepted_parent_dependency_unavailable") from exc
    try:
        opened = os.fstat(fd)
        if not _same_file(before, opened):
            hold("accepted_parent_dependency_changed")
        chunks: list[bytes] = []
        remaining = before.st_size
        while remaining:
            chunk = os.read(fd, min(65536, remaining))
            if not chunk:
                hold("accepted_parent_dependency_short_read")
            chunks.append(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1) != b"":
            hold("accepted_parent_dependency_grew")
        after = os.fstat(fd)
        visible = path.lstat()
        if (
            not _same_file(opened, after)
            or not _same_file(after, visible)
        ):
            hold("accepted_parent_dependency_changed")
        raw = b"".join(chunks)
        if len(raw) != before.st_size or git_blob(raw) != expected_blob:
            hold("accepted_parent_dependency_blob_invalid")
        if parent_module.git("rev-parse", "HEAD:" + relative) != expected_blob:
            hold("accepted_parent_dependency_not_exact_head")
        return raw
    except OSError as exc:
        raise Hold("accepted_parent_dependency_read_failed") from exc
    finally:
        _close_fd(fd, "accepted_parent_dependency_close_failed")


def load_accepted_parent_lock() -> dict[str, Any]:
    """Execute only verified accepted parent source bytes, never import checkout."""
    target = ROOT / PARENT_REL
    try:
        before = target.lstat()
        if (
            not stat.S_ISREG(before.st_mode)
            or stat.S_ISLNK(before.st_mode)
            or before.st_nlink != 1
            or not 0 < before.st_size <= MAX_SOURCE_BYTES
        ):
            hold("accepted_parent_source_metadata_invalid")
        fd = os.open(
            target, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK,
        )
    except OSError as exc:
        raise Hold("accepted_parent_source_unavailable") from exc
    try:
        opened = os.fstat(fd)
        if not _same_file(before, opened):
            hold("accepted_parent_source_drift")
        raw = os.read(fd, before.st_size + 1)
        after = os.fstat(fd)
        visible = target.lstat()
        if (
            len(raw) != before.st_size
            or not _same_file(opened, after)
            or not _same_file(after, visible)
            or git_blob(raw) != PARENT_BLOB
        ):
            hold("accepted_parent_source_drift")
    except OSError as exc:
        raise Hold("accepted_parent_source_read_failed") from exc
    finally:
        _close_fd(fd, "accepted_parent_source_close_failed")

    # The module is compiled from the exact retained bytes, not reopened by name.
    module = types.ModuleType("accepted_apollyon_first_entry_lock")
    module.__file__ = os.fspath(target)
    module.__package__ = ""
    try:
        exec(compile(raw, os.fspath(target), "exec"), module.__dict__)
        # The accepted historical lock is immutable evidence, but its original
        # stable_file() reopens checkout paths by name. Replace only that helper
        # before any derivation/validation so predecessor evidence is read
        # through retained, no-follow, nonblocking descriptors.
        module.stable_file = lambda relative, expected_blob: (
            _read_parent_dependency_source(module, relative, expected_blob)
        )
        lock = module.derive_lock()
        module.validate_lock(lock)
    except (OSError, RuntimeError, SyntaxError, ValueError, TypeError) as exc:
        # Preserve the machine-readable negative authority contract when the
        # accepted predecessor is incomplete, inaccessible, or has drifted.
        raise Hold("accepted_parent_lock_revalidation_failed") from exc
    if (
        lock.get("parent_candidate", {}).get("head") != ACCEPTED_CANDIDATE_HEAD
        or lock.get("authority", {}).get("candidate_accepted") is not True
        or lock.get("authority", {}).get("binary_identity_accepted") is not True
        or lock.get("authority", {}).get("protected_install_authorized") is not False
        or lock.get("authority", {}).get("training_execution_authorized") is not False
    ):
        hold("accepted_parent_lock_authority_invalid")
    return lock


def read_untrusted_tar(path: Path) -> bytes:
    """Bounded, identity-stable, symlink-free read, without writing or extracting."""
    if not path.is_absolute() or Path(os.path.realpath(path)) != path:
        hold("archive_path_not_direct_absolute")
    try:
        before = path.lstat()
        if (
            not stat.S_ISREG(before.st_mode)
            or stat.S_ISLNK(before.st_mode)
            or before.st_nlink != 1
            or not 0 < before.st_size <= MAX_ARCHIVE_BYTES
        ):
            hold("archive_file_metadata_invalid")
        fd = os.open(
            path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK,
        )
    except OSError as exc:
        raise Hold("archive_file_unavailable") from exc
    try:
        opened = os.fstat(fd)
        if not _same_file(before, opened):
            hold("archive_file_changed")
        pieces: list[bytes] = []
        remaining = before.st_size
        while remaining:
            raw = os.read(fd, min(65536, remaining))
            if not raw:
                hold("archive_short_read")
            pieces.append(raw)
            remaining -= len(raw)
        after = os.fstat(fd)
        visible = path.lstat()
        if not _same_file(opened, after) or not _same_file(after, visible):
            hold("archive_file_changed")
        return b"".join(pieces)
    except OSError as exc:
        raise Hold("archive_file_read_failed") from exc
    finally:
        _close_fd(fd, "archive_file_close_failed")


def verify_archive_bytes(raw: bytes, lock: dict[str, Any]) -> dict[str, Any]:
    """Internal structure verifier. Only the public CLI sources a trusted lock."""
    if not isinstance(raw, bytes) or not 0 < len(raw) <= MAX_ARCHIVE_BYTES:
        hold("archive_size_invalid")
    parent = lock["parent_candidate"]
    binary = lock["binary"]
    if digest(raw) != parent["artifact_inner_tar_sha256"]:
        hold("archive_digest_mismatch")
    # The reviewed archive uses deterministic uncompressed POSIX ustar.
    if len(raw) < 512 or raw[257:262] != b"ustar":
        hold("archive_ustar_header_invalid")

    collected: dict[str, bytes] = {}
    try:
        with tarfile.open(fileobj=io.BytesIO(raw), mode="r:") as tf:
            while True:
                member = tf.next()
                if member is None:
                    break
                if len(collected) >= len(EXPECTED_MEMBERS):
                    hold("archive_extra_member")
                name = member.name
                if name not in EXPECTED_MEMBERS or name in collected:
                    hold("archive_members_invalid")
                required_mode = 0o555 if name == ACCEPTED_BINARY else 0o644
                max_size = (
                    binary["bytes"] if name == ACCEPTED_BINARY
                    else MAX_REPORT_BYTES if name == "candidate-v1.json"
                    else MAX_MANIFEST_BYTES if name == "SHA256SUMS.txt"
                    else 64
                )
                if (
                    not member.isfile()
                    or member.type not in (tarfile.REGTYPE, tarfile.AREGTYPE)
                    or member.mode != required_mode
                    or member.uid != 0
                    or member.gid != 0
                    or member.mtime != 0
                    or member.linkname != ""
                    or member.pax_headers
                    or member.size < 1
                    or member.size > max_size
                ):
                    hold("archive_member_metadata_invalid")
                stream = tf.extractfile(member)
                if stream is None:
                    hold("archive_member_unreadable")
                data = stream.read(max_size + 1)
                if len(data) != member.size:
                    hold("archive_member_short_read")
                collected[name] = data
    except (tarfile.TarError, EOFError, OSError) as exc:
        raise Hold("archive_tar_invalid") from exc

    if set(collected) != EXPECTED_MEMBERS:
        hold("archive_members_missing")
    elf = collected[ACCEPTED_BINARY]
    if (
        len(elf) != binary["bytes"]
        or digest(elf) != binary["sha256"]
        or git_blob(elf) != binary["git_blob_sha1"]
        or binary["expected_install_mode"] != "0555"
    ):
        hold("archive_binary_identity_invalid")
    source_head = collected["source-head.txt"]
    if source_head != (ACCEPTED_CANDIDATE_HEAD + "\n").encode("ascii"):
        hold("archive_source_head_invalid")
    report_raw = collected["candidate-v1.json"]
    if (
        not report_raw.endswith(b"\n")
        or digest(report_raw) != parent["candidate_report_raw_sha256"]
        or digest(report_raw[:-1]) != parent["candidate_report_canonical_sha256"]
    ):
        hold("archive_report_identity_invalid")
    try:
        report = json.loads(report_raw)
    except (UnicodeError, ValueError, TypeError) as exc:
        raise Hold("archive_report_json_invalid") from exc
    if canonical(report) + b"\n" != report_raw:
        hold("archive_report_canonical_invalid")
    if (
        not isinstance(report, dict)
        or not isinstance(report.get("binary"), dict)
        or not isinstance(report.get("authority"), dict)
    ):
        hold("archive_report_semantics_invalid")
    if (
        report.get("candidate_id") != parent["candidate_id"]
        or report.get("binary", {}).get("sha256") != binary["sha256"]
        or report.get("binary", {}).get("bytes") != binary["bytes"]
        or report.get("binary", {}).get("git_blob_sha1") != binary["git_blob_sha1"]
        or report.get("authority", {}).get("candidate_accepted") is not False
        or report.get("authority", {}).get("protected_install_authorized") is not False
    ):
        hold("archive_report_semantics_invalid")
    expected_manifest = (
        digest(report_raw) + "  candidate-v1.json\n"
        + digest(elf) + "  " + ACCEPTED_BINARY + "\n"
    ).encode("ascii")
    if collected["SHA256SUMS.txt"] != expected_manifest:
        hold("archive_manifest_invalid")

    material = {
        "marker": MARKER,
        "version": 1,
        "status": "exact_archive_verified_install_blocked",
        "target_host": "Xiphos",
        "accepted_lock_id": lock["lock_id"],
        "candidate_id": parent["candidate_id"],
        "archive_inner_tar_sha256": digest(raw),
        "binary_bytes": len(elf),
        "binary_sha256": digest(elf),
        "binary_git_blob_sha1": git_blob(elf),
        "expected_install_mode": "0555",
        "future_protected_install_leaf": ACCEPTED_INSTALL_LEAF,
        "archive_verified": True,
        "binary_identity_verified": True,
        "artifact_read_only": True,
        "archive_extracted": False,
        "protected_install_authorized": False,
        "xiphos_host_qualification_performed": False,
        "protected_expected_source_origin_proven": False,
        "durable_attempt_claim_performed": False,
        "trainer_release_authorized": False,
        "training_execution_authorized": False,
        "training_execution_performed": False,
        "credential_access": False,
        "private_key_access": False,
        "signing": False,
        "wallet_access": False,
        "transaction": False,
        "funds_movement": False,
        "next_gate": "apollyon_claim_protected_first_entry_host_install_v1",
    }
    return {
        **material,
        "handoff_id": (
            "apollyon_claim_protected_first_entry_install_handoff_v1:"
            + digest(canonical(material))
        ),
    }


def self_test() -> None:
    lock = load_accepted_parent_lock()
    if lock["binary"]["bytes"] != 808472:
        hold("accepted_binary_bytes_invalid")
    if lock["binary"]["expected_install_mode"] != "0555":
        hold("accepted_binary_mode_invalid")
    if lock["authority"]["protected_install_authorized"] is not False:
        hold("protected_install_overclaim")
    print(MARKER + "_SELF_TEST_GREEN")
    print("accepted_parent_lock_source_verified=true")
    print("historical_binary_identity_bound=true")
    print("tar_digest_must_match_lock=true")
    print("read_only_artifact_verification=true")
    print("descriptor_close_failures_machine_readable=true")
    print("host_installation=false")
    print("trainer_release_authorized=false")
    print("training_execution_authorized=false")
    print("funds_movement=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--verify-tar", type=Path)
    args = parser.parse_args()
    try:
        if args.self_test:
            self_test()
        else:
            lock = load_accepted_parent_lock()
            raw = read_untrusted_tar(args.verify_tar)
            receipt = verify_archive_bytes(raw, lock)
            sys.stdout.buffer.write(canonical(receipt) + b"\n")
        return 0
    except Hold as exc:
        print(MARKER, file=sys.stderr)
        print("status=HOLD", file=sys.stderr)
        print("reason=" + str(exc), file=sys.stderr)
        print("protected_install_authorized=false", file=sys.stderr)
        print("xiphos_host_qualification_performed=false", file=sys.stderr)
        print("trainer_release_authorized=false", file=sys.stderr)
        print("training_execution_authorized=false", file=sys.stderr)
        print("funds_movement=false", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
