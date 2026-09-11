#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))

import datanet_ext4_inode_generation_v1 as inode_generation
import prove_datanet_posix_admission_capability_v1 as admission

SOURCE = Path(__file__).resolve()
RECORD_SOURCE = SCRIPT_DIR / "datanet_v33_durable_recovery_record_v1.py"
FIXTURE = REPO_ROOT / "fixtures" / "datanet-v33-durable-recovery-record-ext4-v1.json"
MARKER = "VOID_DATANET_V33_DURABLE_RECOVERY_RECORD_FINAL_V1_GREEN"
SCHEMA_ID = "VOID_DATANET_V33_DURABLE_RECOVERY_RECORD_V1"
ARMED_FORMAT = "VOID_DATANET_RECOVERY_ARMED_V1"
CLAIMED_FORMAT = "VOID_DATANET_RECOVERY_CLAIMED_V1"
CLOSED_FORMAT = "VOID_DATANET_RECOVERY_CLOSED_V1"
HEX64 = re.compile(r"^[0-9a-f]{64}$")
MAX_MARKER_BYTES = 2048


def emit(obj: dict) -> None:
    print(json.dumps(obj, sort_keys=True, separators=(",", ":")), flush=True)


def sha256_path(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def canonical_bytes(obj: dict) -> bytes:
    return (json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True) + "\n").encode("ascii")


def strict_pairs(pairs):
    obj = {}
    for key, value in pairs:
        assert key not in obj
        obj[key] = value
    return obj


def parse_canonical(raw: bytes) -> dict:
    assert 0 < len(raw) <= MAX_MARKER_BYTES
    text = raw.decode("ascii")
    obj = json.loads(text, object_pairs_hook=strict_pairs)
    assert isinstance(obj, dict)
    assert canonical_bytes(obj) == raw
    return obj


def marker_names(k: str) -> dict[str, str]:
    assert HEX64.fullmatch(k)
    prefix = f".void-datanet-recovery-{k}"
    return {
        "armed": prefix + ".armed.v1",
        "claimed": prefix + ".claimed.v1",
        "closed": prefix + ".closed.v1",
    }


def slot_name(k: str, slot: int) -> str:
    assert slot in (0, 1)
    return f"datanet-{k}-s{slot}.v1"


def identity_text(st: os.stat_result) -> str:
    return f"{st.st_dev}:{st.st_ino}"


def read_marker(root_fd: int, name: str) -> dict | None:
    flags = os.O_RDONLY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        fd = os.open(name, flags, dir_fd=root_fd)
    except FileNotFoundError:
        return None
    try:
        st = os.fstat(fd)
        visible = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        assert stat.S_ISREG(st.st_mode)
        assert not stat.S_ISLNK(visible.st_mode)
        assert identity_text(st) == identity_text(visible)
        assert st.st_uid == os.getuid()
        assert st.st_nlink == 1
        assert stat.S_IMODE(st.st_mode) == 0o600
        assert 0 < st.st_size <= MAX_MARKER_BYTES
        raw = bytearray()
        while len(raw) < st.st_size:
            chunk = os.read(fd, st.st_size - len(raw))
            assert chunk
            raw.extend(chunk)
        assert os.read(fd, 1) == b""
        after = os.fstat(fd)
        assert (
            after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_ctime_ns,
            stat.S_IMODE(after.st_mode), after.st_nlink,
        ) == (
            st.st_dev, st.st_ino, st.st_size, st.st_mtime_ns, st.st_ctime_ns,
            stat.S_IMODE(st.st_mode), st.st_nlink,
        )
        data = bytes(raw)
        return {"record": parse_canonical(data), "sha256": hashlib.sha256(data).hexdigest()}
    finally:
        os.close(fd)


def verify_leaf(root_fd: int, k: str, fixture: dict, slot: int) -> dict:
    name = slot_name(k, slot)
    flags = os.O_RDONLY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(name, flags, dir_fd=root_fd)
    try:
        before = os.fstat(fd)
        visible = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        assert stat.S_ISREG(before.st_mode)
        assert not stat.S_ISLNK(visible.st_mode)
        assert identity_text(before) == identity_text(visible)
        assert before.st_uid == os.getuid()
        assert before.st_nlink == 1
        assert stat.S_IMODE(before.st_mode) == 0o600
        assert before.st_size == fixture["payload_bytes"]
        assert before.st_blocks * 512 >= fixture["payload_bytes"]
        fp = (
            before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns, before.st_ctime_ns,
            stat.S_IMODE(before.st_mode), before.st_nlink,
        )
        h = hashlib.sha256()
        block = fixture["io_block_bytes"]
        for offset in range(0, fixture["payload_bytes"], block):
            chunk = os.pread(fd, block, offset)
            assert len(chunk) == block
            h.update(chunk)
        assert os.pread(fd, 1, fixture["payload_bytes"]) == b""
        assert h.hexdigest() == fixture["payload_sha256"]
        generation = inode_generation.observe_ext4_inode_generation_v1(fd)
        assert generation["ioctl_calls"] == 1
        assert generation["setversion_issued"] is False
        after = os.fstat(fd)
        visible_after = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        for current in (after, visible_after):
            assert (
                current.st_dev, current.st_ino, current.st_size, current.st_mtime_ns, current.st_ctime_ns,
                stat.S_IMODE(current.st_mode), current.st_nlink,
            ) == fp
        return {
            "identity": identity_text(before),
            "generation": generation["generation"],
            "generation_identity": f"{identity_text(before)}:{generation['generation']}",
            "length": before.st_size,
            "sha256": h.hexdigest(),
        }
    finally:
        os.close(fd)


def assert_common(obj: dict, root_identity: str, k: str, record_source_sha: str, generation_source_sha: str) -> None:
    assert obj["root_identity"] == root_identity
    assert obj["quota_key"] == k
    assert obj["record_source_sha256"] == record_source_sha
    assert obj["generation_source_sha256"] == generation_source_sha
    assert obj["schema_id"] == SCHEMA_ID


def assert_armed(obj: dict, root_identity: str, k: str, s0: dict, record_source_sha: str, generation_source_sha: str) -> None:
    assert set(obj) == {
        "format", "state", "root_identity", "quota_key", "record_source_sha256",
        "generation_source_sha256", "schema_id", "s0_identity", "s0_generation",
        "s0_length", "s0_sha256",
    }
    assert obj["format"] == ARMED_FORMAT
    assert obj["state"] == "ARMED"
    assert_common(obj, root_identity, k, record_source_sha, generation_source_sha)
    assert obj["s0_identity"] == s0["identity"]
    assert obj["s0_generation"] == s0["generation"]
    assert obj["s0_length"] == s0["length"]
    assert obj["s0_sha256"] == s0["sha256"]


def assert_claimed(obj: dict, root_identity: str, k: str, armed_sha: str, record_source_sha: str, generation_source_sha: str) -> None:
    assert set(obj) == {
        "format", "state", "root_identity", "quota_key", "record_source_sha256",
        "generation_source_sha256", "schema_id", "armed_sha256",
    }
    assert obj["format"] == CLAIMED_FORMAT
    assert obj["state"] == "CLAIMED"
    assert_common(obj, root_identity, k, record_source_sha, generation_source_sha)
    assert obj["armed_sha256"] == armed_sha


def assert_closed_ordinary(obj: dict, root_identity: str, k: str, armed_sha: str, record_source_sha: str, generation_source_sha: str) -> None:
    assert set(obj) == {
        "format", "state", "reason", "root_identity", "quota_key", "record_source_sha256",
        "generation_source_sha256", "schema_id", "armed_sha256",
    }
    assert obj["format"] == CLOSED_FORMAT
    assert obj["state"] == "CLOSED"
    assert obj["reason"] == "ORDINARY_H0"
    assert_common(obj, root_identity, k, record_source_sha, generation_source_sha)
    assert obj["armed_sha256"] == armed_sha


def assert_closed_recovery(obj: dict, root_identity: str, k: str, armed_sha: str, claimed_sha: str, s1: dict, record_source_sha: str, generation_source_sha: str) -> None:
    assert set(obj) == {
        "format", "state", "reason", "root_identity", "quota_key", "record_source_sha256",
        "generation_source_sha256", "schema_id", "armed_sha256", "claimed_sha256",
        "s1_identity", "s1_generation", "s1_length", "s1_sha256",
    }
    assert obj["format"] == CLOSED_FORMAT
    assert obj["state"] == "CLOSED"
    assert obj["reason"] == "RECOVERY_H1"
    assert_common(obj, root_identity, k, record_source_sha, generation_source_sha)
    assert obj["armed_sha256"] == armed_sha
    assert obj["claimed_sha256"] == claimed_sha
    assert obj["s1_identity"] == s1["identity"]
    assert obj["s1_generation"] == s1["generation"]
    assert obj["s1_length"] == s1["length"]
    assert obj["s1_sha256"] == s1["sha256"]


def classify_case(root: str, root_identity: str, lock_identity: str, k: str, fixture: dict, case: str) -> dict:
    binding = admission.Binding(root_identity=root_identity, lock_identity=lock_identity, k=k)
    root_fd, lock_fd = admission.open_bound(root, binding)
    try:
        assert admission.acquire(lock_fd) is True
        admission.revalidate(root_fd, lock_fd, binding)
        names = set(os.listdir(root_fd))
        markers = marker_names(k)
        allowed = {
            admission.capability_name(k), slot_name(k, 0), slot_name(k, 1),
            markers["armed"], markers["claimed"], markers["closed"],
        }
        assert not (names - allowed)
        s0 = verify_leaf(root_fd, k, fixture, 0)
        s1 = verify_leaf(root_fd, k, fixture, 1) if slot_name(k, 1) in names else None
        armed = read_marker(root_fd, markers["armed"])
        claimed = read_marker(root_fd, markers["claimed"])
        closed = read_marker(root_fd, markers["closed"])
        assert armed is not None
        record_source_sha = sha256_path(RECORD_SOURCE)
        generation_source_sha = inode_generation.source_sha256()
        assert_armed(armed["record"], root_identity, k, s0, record_source_sha, generation_source_sha)

        if case == "ordinary":
            assert s1 is None
            assert claimed is None
            assert closed is not None
            assert_closed_ordinary(closed["record"], root_identity, k, armed["sha256"], record_source_sha, generation_source_sha)
            decision = "HOLD_ORDINARY_H0"
        elif case == "recovery":
            assert s1 is not None
            assert claimed is not None
            assert closed is not None
            assert_claimed(claimed["record"], root_identity, k, armed["sha256"], record_source_sha, generation_source_sha)
            assert_closed_recovery(
                closed["record"], root_identity, k, armed["sha256"], claimed["sha256"], s1,
                record_source_sha, generation_source_sha,
            )
            decision = "COMPLETE_RECOVERY_H1"
        elif case == "claim-death":
            assert s1 is None
            assert claimed is not None
            assert closed is None
            assert_claimed(claimed["record"], root_identity, k, armed["sha256"], record_source_sha, generation_source_sha)
            decision = "HOLD_RECOVERY_ATTEMPT_ALREADY_CONSUMED"
        else:
            raise AssertionError(case)

        admission.revalidate(root_fd, lock_fd, binding)
        return {
            "decision": decision,
            "allow_payload_allocation": False,
            "s0_generation_identity": s0["generation_identity"],
            "s1_generation_identity": None if s1 is None else s1["generation_identity"],
        }
    finally:
        try:
            admission.unlock(lock_fd)
        finally:
            os.close(lock_fd)
            os.close(root_fd)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--base", required=True)
    for name in ("ordinary", "recovery", "claim-death"):
        p.add_argument(f"--{name}-root", required=True)
        p.add_argument(f"--{name}-root-identity", required=True)
        p.add_argument(f"--{name}-lock-identity", required=True)
    p.add_argument("--k", required=True)
    ns = p.parse_args()

    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert fixture["format"] == "VOID_DATANET_V33_DURABLE_RECOVERY_RECORD_EXT4_CONTROL_V1"
    base = os.path.abspath(ns.base)
    for root in (ns.ordinary_root, ns.recovery_root, ns.claim_death_root):
        assert os.path.commonpath([base, os.path.abspath(root)]) == base

    ordinary = classify_case(ns.ordinary_root, ns.ordinary_root_identity, ns.ordinary_lock_identity, ns.k, fixture, "ordinary")
    recovery = classify_case(ns.recovery_root, ns.recovery_root_identity, ns.recovery_lock_identity, ns.k, fixture, "recovery")
    claim_death = classify_case(ns.claim_death_root, ns.claim_death_root_identity, ns.claim_death_lock_identity, ns.k, fixture, "claim-death")

    assert ordinary["decision"] == "HOLD_ORDINARY_H0"
    assert recovery["decision"] == "COMPLETE_RECOVERY_H1"
    assert claim_death["decision"] == "HOLD_RECOVERY_ATTEMPT_ALREADY_CONSUMED"
    emit({
        "marker": MARKER,
        "status": "GREEN",
        "ordinary_decision": ordinary["decision"],
        "recovery_decision": recovery["decision"],
        "claim_death_decision": claim_death["decision"],
        "all_terminal_states_forbid_new_allocation": True,
        "independent_record_parser": True,
        "imports_record_reducer": False,
        "source_sha256": sha256_path(SOURCE),
        "record_source_sha256": sha256_path(RECORD_SOURCE),
        "generation_source_sha256": inode_generation.source_sha256(),
        "python_executable_sha256": inode_generation.executable_sha256(),
    })
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
