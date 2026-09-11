#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

import datanet_ext4_inode_generation_v1 as inode_generation
import datanet_v34_claimant_capability_v1 as claimant_capability
import datanet_v34_exec_claimant_record_v1 as recovery_record
import prove_datanet_posix_admission_capability_v1 as admission

SOURCE = Path(__file__).resolve()
MARKER = "VOID_DATANET_V34_CAMPAIGN_FINAL_VERIFIER_V1_GREEN"


def sha256_path(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def identity(st: os.stat_result) -> str:
    return f"{st.st_dev}:{st.st_ino}"


def open_root(root: str, expected_identity: str) -> int:
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(root, flags)
    st = os.fstat(fd)
    assert stat.S_ISDIR(st.st_mode) and identity(st) == expected_identity
    return fd


def binding_for(root_fd: int, root_identity: str, k: str) -> admission.Binding:
    cap = admission.capability_name(k)
    st = os.stat(cap, dir_fd=root_fd, follow_symlinks=False)
    assert stat.S_ISREG(st.st_mode) and not stat.S_ISLNK(st.st_mode)
    assert st.st_uid == os.getuid() and st.st_nlink == 1 and stat.S_IMODE(st.st_mode) == 0o600 and st.st_size == 0
    return admission.Binding(root_identity=root_identity, lock_identity=identity(st), k=k)


def verify_leaf(root_fd: int, k: str, slot: int, fixture: dict) -> dict:
    name = f"datanet-{k}-s{slot}.v1"
    flags = os.O_RDONLY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(name, flags, dir_fd=root_fd)
    try:
        before = os.fstat(fd)
        visible = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        assert stat.S_ISREG(before.st_mode) and not stat.S_ISLNK(visible.st_mode)
        assert identity(before) == identity(visible)
        assert before.st_uid == os.getuid() and before.st_nlink == 1 and stat.S_IMODE(before.st_mode) == 0o600
        assert before.st_size == fixture["payload_bytes"] and before.st_blocks * 512 >= fixture["payload_bytes"]
        fingerprint = (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns, before.st_ctime_ns, before.st_blocks)
        h = hashlib.sha256()
        calls = requested = returned = 0
        block = fixture["io_block_bytes"]
        for offset in range(0, fixture["payload_bytes"], block):
            data = os.pread(fd, block, offset)
            calls += 1
            requested += block
            returned += len(data)
            assert len(data) == block
            h.update(data)
        eof = os.pread(fd, 1, fixture["payload_bytes"])
        calls += 1
        requested += 1
        returned += len(eof)
        assert eof == b"" and h.hexdigest() == fixture["payload_sha256"]
        generation = inode_generation.observe_ext4_inode_generation_v1(fd)
        assert generation["ioctl_calls"] == 1 and generation["setversion_issued"] is False
        after = os.fstat(fd)
        visible_after = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        assert (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_ctime_ns, after.st_blocks) == fingerprint
        assert (visible_after.st_dev, visible_after.st_ino, visible_after.st_size, visible_after.st_mtime_ns, visible_after.st_ctime_ns, visible_after.st_blocks) == fingerprint
        return {
            "name": name,
            "identity": identity(before),
            "generation": generation["generation"],
            "generation_identity": f"{identity(before)}:{generation['generation']}",
            "length": before.st_size,
            "sha256": h.hexdigest(),
            "ledger": {"read_calls": calls, "read_requested_bytes": requested, "read_returned_bytes": returned, "eof_probes": 1},
        }
    finally:
        os.close(fd)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixture", required=True)
    parser.add_argument("--e0-root", required=True)
    parser.add_argument("--e0-root-identity", required=True)
    parser.add_argument("--r0-root", required=True)
    parser.add_argument("--r0-root-identity", required=True)
    ns = parser.parse_args()
    fixture = json.loads(Path(ns.fixture).read_text(encoding="utf-8"))
    k = fixture["quota_key"]
    e0_fd = open_root(ns.e0_root, ns.e0_root_identity)
    r0_fd = open_root(ns.r0_root, ns.r0_root_identity)
    try:
        e0_binding = binding_for(e0_fd, ns.e0_root_identity, k)
        r0_binding = binding_for(r0_fd, ns.r0_root_identity, k)
        e0_expected = {admission.capability_name(k), f"datanet-{k}-s0.v1"}
        r0_expected = {
            admission.capability_name(k), f"datanet-{k}-s0.v1", f"datanet-{k}-s1.v1",
            recovery_record.armed_name(k), recovery_record.claimed_name(k), recovery_record.closed_name(k),
        }
        assert set(os.listdir(e0_fd)) == e0_expected
        assert set(os.listdir(r0_fd)) == r0_expected
        e0_s0 = verify_leaf(e0_fd, k, 0, fixture)
        r0_s0 = verify_leaf(r0_fd, k, 0, fixture)
        r0_s1 = verify_leaf(r0_fd, k, 1, fixture)
        assert r0_s0["identity"] != r0_s1["identity"]
        e0_records = recovery_record.read_records(e0_fd, e0_binding)
        assert e0_records == {"armed": None, "claimed": None, "closed": None}
        r0_records = recovery_record.read_records(r0_fd, r0_binding)
        armed, claimed, closed = r0_records["armed"], r0_records["claimed"], r0_records["closed"]
        assert armed is not None and claimed is not None and closed is not None
        recovery_record.validate_armed(armed["record"], r0_binding, r0_s0)
        recovery_record.validate_claimed(claimed["record"], r0_binding, armed["sha256"])
        assert claimed["record"]["claimant_source_sha256"] == claimant_capability.source_sha256()
        recovery_record.validate_closed_recovery(closed["record"], r0_binding, armed["sha256"], claimed["sha256"], claimed["record"], r0_s1)
        ledger = {
            "read_calls": e0_s0["ledger"]["read_calls"] + r0_s0["ledger"]["read_calls"] + r0_s1["ledger"]["read_calls"],
            "read_requested_bytes": e0_s0["ledger"]["read_requested_bytes"] + r0_s0["ledger"]["read_requested_bytes"] + r0_s1["ledger"]["read_requested_bytes"],
            "read_returned_bytes": e0_s0["ledger"]["read_returned_bytes"] + r0_s0["ledger"]["read_returned_bytes"] + r0_s1["ledger"]["read_returned_bytes"],
            "eof_probes": 3,
        }
        assert ledger == {**fixture["final_verifier_ledger"], "eof_probes": 3}
        out = {
            "marker": MARKER, "status": "GREEN", "source_sha256": sha256_path(SOURCE),
            "record_source_sha256": recovery_record.source_sha256(),
            "claimant_source_sha256": claimant_capability.source_sha256(),
            "inode_generation_source_sha256": inode_generation.source_sha256(),
            "generation_ioctl_calls": 3, "ledger": ledger,
            "e0": {"decision": "HOLD_NO_RECOVERY_AUTH", "leaves": [e0_s0]},
            "r0": {"decision": "COMPLETE_RECOVERY_H1", "leaves": [r0_s0, r0_s1]},
            "armed_sha256": armed["sha256"], "claimed_sha256": claimed["sha256"], "closed_sha256": closed["sha256"],
            "same_claimant_pid_bound_claimed_closed": claimed["record"]["claimant_pid"] == closed["record"]["claimant_pid"],
            "source_distinct_from_campaign_supervisor": True,
            "production_runtime_touched": False,
        }
        print(json.dumps(out, sort_keys=True, separators=(",", ":")))
        return 0
    finally:
        os.close(r0_fd)
        os.close(e0_fd)


if __name__ == "__main__":
    raise SystemExit(main())
