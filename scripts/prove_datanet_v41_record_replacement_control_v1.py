#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
from __future__ import annotations

import argparse
import errno
import json
import os
from pathlib import Path
import stat
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))

import datanet_ext4_inode_generation_v1 as inode_generation
import datanet_v41_fsverity_record_io_v1 as v41_io
import datanet_v39_exec_claimant_record_v1 as record

record.record_io = v41_io

MARKER = "VOID_DATANET_V41_GENERATION_REPLACEMENT_CONTROL_V1_GREEN"


def fsync_dir(fd: int) -> None:
    os.fsync(fd)


def open_exact_ro(root_fd: int, name: str) -> int:
    flags = os.O_RDONLY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    return os.open(name, flags, dir_fd=root_fd)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--r0-root", required=True)
    p.add_argument("--reuse-attempts", type=int, default=16384)
    ns = p.parse_args()
    assert ns.reuse_attempts > 0

    fixture = json.loads((REPO_ROOT / "fixtures" / "datanet-v31-campaign-topology-ext4-v1.json").read_text(encoding="utf-8"))
    name = record.closed_name(fixture["quota_key"])
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | (os.O_NOFOLLOW if hasattr(os, "O_NOFOLLOW") else 0)
    root_fd = os.open(ns.r0_root, flags)
    try:
        # The campaign's CLOSED record must already be a valid V41 admission:
        # generation-bound, fs-verity measurable, and same-UID mutation denied.
        old = record.read_one(root_fd, name)
        assert old is not None
        assert old["same_uid_write_denied"] is True and old["same_uid_write_errno"] == errno.EPERM
        assert old["same_uid_rdwr_denied"] is True and old["same_uid_rdwr_errno"] == errno.EPERM
        assert old["same_uid_truncate_denied"] is True and old["same_uid_truncate_errno"] == errno.EPERM
        assert old["fsverity"]["algorithm"] == 1 and old["fsverity"]["digest_size"] == 32

        raw = old["raw"]
        raw_sha256 = old["sha256"]
        old_identity = old["identity"]
        old_ino = int(old_identity.split(":", 1)[1])
        old_gen = old["generation"]
        old_verity = old["fsverity"]

        # fs-verity protects the inode's contents, not the directory entry.
        # Deleting the sealed original must therefore remain possible and is an
        # explicit non-claim of the V41 design.
        os.unlink(name, dir_fd=root_fd)
        fsync_dir(root_fd)
        try:
            os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        except FileNotFoundError:
            pass
        else:
            raise AssertionError("sealed original path still exists after unlink")

        selected = None
        replacement_generation = None
        attempts = 0
        create_flags = os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | (os.O_NOFOLLOW if hasattr(os, "O_NOFOLLOW") else 0)
        for attempts in range(1, ns.reuse_attempts + 1):
            fd = os.open(name, create_flags, 0o600, dir_fd=root_fd)
            os.fchmod(fd, 0o600)
            st = os.fstat(fd)
            if st.st_ino != old_ino:
                os.close(fd)
                os.unlink(name, dir_fd=root_fd)
                fsync_dir(root_fd)
                continue

            assert stat.S_ISREG(st.st_mode)
            assert st.st_uid == os.getuid() and st.st_nlink == 1
            assert stat.S_IMODE(st.st_mode) == 0o600 and st.st_size == 0
            generation_receipt = inode_generation.observe_ext4_inode_generation_v1(fd)
            replacement_generation = int(generation_receipt["generation"])
            assert replacement_generation != old_gen

            # Reproduce the original bytes exactly, including the now-stale
            # embedded record_generation. This is the same-inode-reuse attack.
            v41_io.write_all(fd, raw, record.hold)
            os.fsync(fd)
            fsync_dir(root_fd)
            selected = fd
            break

        assert selected is not None, "same inode reuse not observed"
        try:
            st = os.fstat(selected)
            assert stat.S_ISREG(st.st_mode)
            assert st.st_uid == os.getuid() and st.st_nlink == 1
            assert stat.S_IMODE(st.st_mode) == 0o600
            assert st.st_size == len(raw)
            assert v41_io.identity(st) == old_identity
        finally:
            # fs-verity enablement is intentionally impossible until every
            # writable FD for this replacement has closed.
            os.close(selected)

        # This is the V41-specific repair over the old V39 control: the attack
        # replacement is itself sealed and measured before admission. Therefore
        # a later rejection cannot be attributed merely to missing fs-verity.
        replacement_seal = v41_io.seal_existing(
            root_fd,
            name,
            record.MAX_MARKER_BYTES,
            record.hold,
            expected_sha256=raw_sha256,
        )
        assert replacement_seal["identity"] == old_identity
        assert replacement_seal["sha256"] == raw_sha256
        assert replacement_seal["fsverity"]["algorithm"] == 1
        assert replacement_seal["fsverity"]["digest_size"] == 32
        assert replacement_seal["same_uid_write_denied"] is True and replacement_seal["same_uid_write_errno"] == errno.EPERM
        assert replacement_seal["same_uid_rdwr_denied"] is True and replacement_seal["same_uid_rdwr_errno"] == errno.EPERM
        assert replacement_seal["same_uid_truncate_denied"] is True and replacement_seal["same_uid_truncate_errno"] == errno.EPERM

        held = False
        reason = None
        try:
            record.read_one(root_fd, name)
        except record.RecoveryHold as exc:
            held = True
            reason = exc.code
        assert held and reason == "HOLD_RECORD_EMBEDDED_GENERATION", reason

        # Independently observe the live replacement generation after the V41
        # rejection so the stale-generation relation is explicit in the receipt.
        live = open_exact_ro(root_fd, name)
        try:
            live_generation = int(inode_generation.observe_ext4_inode_generation_v1(live)["generation"])
        finally:
            os.close(live)
        assert live_generation == replacement_generation
        assert live_generation != old_gen

        print(json.dumps({
            "marker": MARKER,
            "status": "GREEN",
            "record_name": name,
            "same_uid": True,
            "byte_identical": True,
            "same_inode_reused": True,
            "old_identity": old_identity,
            "old_inode": old_ino,
            "new_inode": old_ino,
            "old_generation": old_gen,
            "new_generation": live_generation,
            "generation_changed": True,
            "old_fsverity": old_verity,
            "original_record_fsverity_required_before_unlink": True,
            "original_same_uid_write_denied": True,
            "original_same_uid_rdwr_denied": True,
            "original_same_uid_truncate_denied": True,
            "sealed_original_unlink_succeeded": True,
            "fsverity_path_replacement_prevented": False,
            "replacement_fsverity_enabled": True,
            "replacement_fsverity": replacement_seal["fsverity"],
            "replacement_same_uid_write_denied": True,
            "replacement_same_uid_rdwr_denied": True,
            "replacement_same_uid_truncate_denied": True,
            "actual_v41_admission_rejected": True,
            "reject_code": reason,
            "generation_binding_detected_replacement": True,
            "attempts": attempts,
            "mutation_control_included_in_measured_campaign_trace": False,
            "production_runtime_touched": False,
        }, sort_keys=True, separators=(",", ":")))
        return 0
    finally:
        os.close(root_fd)


if __name__ == "__main__":
    raise SystemExit(main())
