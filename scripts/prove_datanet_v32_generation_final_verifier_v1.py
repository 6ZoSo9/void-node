#!/usr/bin/env python3
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

MARKER = "VOID_DATANET_V32_GENERATION_FINAL_VERIFIER_V1_GREEN"


def emit(obj: dict) -> None:
    print(json.dumps(obj, sort_keys=True, separators=(",", ":")), flush=True)


def identity(st: os.stat_result) -> str:
    return f"{st.st_dev}:{st.st_ino}"


def slot_name(k: str, slot: int) -> str:
    return f"datanet-{k}-s{slot}.v1"


def cap_name(k: str) -> str:
    return f".void-datanet-admission-{k}.lock.v1"


def open_root(path: str, expected_identity: str) -> int:
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(path, flags)
    st = os.fstat(fd)
    assert stat.S_ISDIR(st.st_mode)
    assert identity(st) == expected_identity
    return fd


def verify_capability(root_fd: int, k: str) -> dict:
    name = cap_name(k)
    st = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
    assert stat.S_ISREG(st.st_mode)
    assert st.st_uid == os.getuid()
    assert st.st_nlink == 1
    assert stat.S_IMODE(st.st_mode) == 0o600
    assert st.st_size == 0
    return {"name": name, "identity": identity(st)}


def full_verify_leaf(root_fd: int, name: str, fixture: dict) -> dict:
    flags = os.O_RDONLY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(name, flags, dir_fd=root_fd)
    try:
        before = os.fstat(fd)
        visible = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        assert stat.S_ISREG(before.st_mode)
        assert identity(before) == identity(visible)
        assert before.st_uid == os.getuid()
        assert before.st_nlink == 1
        assert stat.S_IMODE(before.st_mode) == 0o600
        assert before.st_size == fixture["payload_bytes"]
        assert before.st_blocks * 512 >= fixture["payload_bytes"]
        before_key = (before.st_dev, before.st_ino, before.st_uid, before.st_gid, stat.S_IMODE(before.st_mode), before.st_nlink, before.st_size, before.st_mtime_ns, before.st_ctime_ns)

        h = hashlib.sha256()
        calls = requested = returned = 0
        block_bytes = fixture["io_block_bytes"]
        for offset in range(0, fixture["payload_bytes"], block_bytes):
            data = os.pread(fd, block_bytes, offset)
            calls += 1
            requested += block_bytes
            returned += len(data)
            assert len(data) == block_bytes
            h.update(data)
        eof = os.pread(fd, 1, fixture["payload_bytes"])
        calls += 1
        requested += 1
        returned += len(eof)
        assert eof == b""
        assert h.hexdigest() == fixture["payload_sha256"]

        gen = inode_generation.observe_ext4_inode_generation_v1(fd)
        assert gen["ioctl_calls"] == 1
        assert gen["setversion_issued"] is False
        generation = gen["generation"]

        after = os.fstat(fd)
        visible_after = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        after_key = (after.st_dev, after.st_ino, after.st_uid, after.st_gid, stat.S_IMODE(after.st_mode), after.st_nlink, after.st_size, after.st_mtime_ns, after.st_ctime_ns)
        visible_key = (visible_after.st_dev, visible_after.st_ino, visible_after.st_uid, visible_after.st_gid, stat.S_IMODE(visible_after.st_mode), visible_after.st_nlink, visible_after.st_size, visible_after.st_mtime_ns, visible_after.st_ctime_ns)
        assert after_key == before_key
        assert visible_key == before_key
        return {
            "name": name,
            "identity": identity(before),
            "generation": generation,
            "generation_identity": f"{identity(before)}:{generation}",
            "generation_ioctl_calls": 1,
            "calls": calls,
            "requested": requested,
            "returned": returned,
            "sha256": h.hexdigest(),
            "eof_probes": 1,
        }
    finally:
        os.close(fd)


def verify_root(path: str, expected_identity: str, fixture: dict, slots: tuple[int, ...]) -> dict:
    k = fixture["quota_key"]
    root_fd = open_root(path, expected_identity)
    try:
        cap = verify_capability(root_fd, k)
        expected = sorted([cap["name"], *[slot_name(k, slot) for slot in slots]])
        assert sorted(os.listdir(root_fd)) == expected
        leaves = [full_verify_leaf(root_fd, slot_name(k, slot), fixture) for slot in slots]
        assert sorted(os.listdir(root_fd)) == expected
        return {
            "root_identity": expected_identity,
            "capability": cap,
            "slots": list(slots),
            "leaves": leaves,
            "decision": "AUTHORIZE_H1" if slots == (0,) else "DENY_H1",
        }
    finally:
        os.close(root_fd)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixture", required=True)
    parser.add_argument("--e0-root", required=True)
    parser.add_argument("--e0-root-identity", required=True)
    parser.add_argument("--r0-root", required=True)
    parser.add_argument("--r0-root-identity", required=True)
    ns = parser.parse_args()

    fixture = json.loads(Path(ns.fixture).resolve().read_text(encoding="utf-8"))
    assert fixture["format"] == "VOID_DATANET_V31_CAMPAIGN_TOPOLOGY_EXT4_CONTROL_V1"
    e0 = verify_root(ns.e0_root, ns.e0_root_identity, fixture, (0,))
    r0 = verify_root(ns.r0_root, ns.r0_root_identity, fixture, (0, 1))
    leaves = [*e0["leaves"], *r0["leaves"]]
    assert len({leaf["identity"] for leaf in leaves}) == 3
    assert len({leaf["generation_identity"] for leaf in leaves}) == 3
    calls = sum(leaf["calls"] for leaf in leaves)
    requested = sum(leaf["requested"] for leaf in leaves)
    returned = sum(leaf["returned"] for leaf in leaves)
    generation_calls = sum(leaf["generation_ioctl_calls"] for leaf in leaves)
    assert (calls, requested, returned) == (3075, 201326595, 201326592)
    assert generation_calls == 3
    assert e0["decision"] == "AUTHORIZE_H1"
    assert r0["decision"] == "DENY_H1"

    emit({
        "marker": MARKER,
        "status": "GREEN",
        "pid": os.getpid(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "inode_generation_source_sha256": inode_generation.source_sha256(),
        "python_executable_sha256": inode_generation.executable_sha256(),
        "e0": e0,
        "r0": r0,
        "ledger": {"read_calls": calls, "read_requested_bytes": requested, "read_returned_bytes": returned, "eof_probes": 3},
        "generation_ioctl_calls": generation_calls,
        "source_distinct_from_campaign_supervisor": True,
        "cold_remount_proved": False,
        "physical_power_loss_proved": False,
        "same_uid_generation_rewrite_proved": False,
        "public_peer_retrieval_proved": False,
        "chain_2050_authority_claimed": False,
    })
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
