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

MARKER = "VOID_DATANET_V31_CAMPAIGN_FINAL_VERIFIER_V1_GREEN"
CAP_PREFIX = ".void-datanet-admission-"
CAP_SUFFIX = ".lock.v1"


def emit(obj: dict) -> None:
    print(json.dumps(obj, sort_keys=True, separators=(",", ":")), flush=True)


def identity(st: os.stat_result) -> str:
    return f"{st.st_dev}:{st.st_ino}"


def slot_name(k: str, slot: int) -> str:
    assert slot in (0, 1)
    return f"datanet-{k}-s{slot}.v1"


def cap_name(k: str) -> str:
    return f"{CAP_PREFIX}{k}{CAP_SUFFIX}"


def open_root(path: str, expected_identity: str) -> int:
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(path, flags)
    st = os.fstat(fd)
    assert stat.S_ISDIR(st.st_mode)
    assert identity(st) == expected_identity, (identity(st), expected_identity)
    return fd


def verify_capability(root_fd: int, k: str) -> dict:
    name = cap_name(k)
    visible = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
    assert stat.S_ISREG(visible.st_mode)
    assert not stat.S_ISLNK(visible.st_mode)
    assert visible.st_uid == os.getuid()
    assert visible.st_nlink == 1
    assert stat.S_IMODE(visible.st_mode) == 0o600
    assert visible.st_size == 0
    return {"name": name, "identity": identity(visible)}


def full_verify_leaf(root_fd: int, name: str, fixture: dict) -> dict:
    flags = os.O_RDONLY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(name, flags, dir_fd=root_fd)
    try:
        opened_before = os.fstat(fd)
        visible_before = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        assert stat.S_ISREG(opened_before.st_mode)
        assert not stat.S_ISLNK(visible_before.st_mode)
        assert identity(opened_before) == identity(visible_before)
        assert opened_before.st_uid == os.getuid()
        assert opened_before.st_nlink == 1
        assert stat.S_IMODE(opened_before.st_mode) == 0o600
        assert opened_before.st_size == fixture["payload_bytes"]
        assert opened_before.st_blocks * 512 >= fixture["payload_bytes"]

        block_bytes = fixture["io_block_bytes"]
        h = hashlib.sha256()
        calls = requested = returned = 0
        for offset in range(0, fixture["payload_bytes"], block_bytes):
            data = os.pread(fd, block_bytes, offset)
            calls += 1
            requested += block_bytes
            returned += len(data)
            assert len(data) == block_bytes, (name, offset, len(data))
            h.update(data)
        eof = os.pread(fd, 1, fixture["payload_bytes"])
        calls += 1
        requested += 1
        returned += len(eof)
        assert eof == b""
        assert h.hexdigest() == fixture["payload_sha256"]

        opened_after = os.fstat(fd)
        visible_after = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        assert identity(opened_after) == identity(opened_before)
        assert identity(visible_after) == identity(opened_before)
        assert opened_after.st_size == opened_before.st_size
        assert opened_after.st_nlink == 1
        return {
            "name": name,
            "identity": identity(opened_before),
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
        expected = sorted([cap["name"], *[slot_name(k, s) for s in slots]])
        actual = sorted(os.listdir(root_fd))
        assert actual == expected, (actual, expected)
        leaves = [full_verify_leaf(root_fd, slot_name(k, s), fixture) for s in slots]
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

    fixture_path = Path(ns.fixture).resolve()
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
    assert fixture["v"] == 1
    assert fixture["format"] == "VOID_DATANET_V31_CAMPAIGN_TOPOLOGY_EXT4_CONTROL_V1"
    assert fixture["final_verifier_ledger"] == {
        "read_calls": 3075,
        "read_requested_bytes": 201326595,
        "read_returned_bytes": 201326592,
    }

    e0 = verify_root(ns.e0_root, ns.e0_root_identity, fixture, (0,))
    r0 = verify_root(ns.r0_root, ns.r0_root_identity, fixture, (0, 1))
    leaves = [*e0["leaves"], *r0["leaves"]]
    identities = [leaf["identity"] for leaf in leaves]
    assert len(set(identities)) == 3, identities
    calls = sum(leaf["calls"] for leaf in leaves)
    requested = sum(leaf["requested"] for leaf in leaves)
    returned = sum(leaf["returned"] for leaf in leaves)
    assert (calls, requested, returned) == (3075, 201326595, 201326592)
    assert e0["decision"] == "AUTHORIZE_H1"
    assert r0["decision"] == "DENY_H1"

    source_sha256 = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    emit({
        "marker": MARKER,
        "status": "GREEN",
        "pid": os.getpid(),
        "source_sha256": source_sha256,
        "e0": e0,
        "r0": r0,
        "ledger": {
            "read_calls": calls,
            "read_requested_bytes": requested,
            "read_returned_bytes": returned,
            "eof_probes": 3,
        },
        "source_distinct_from_campaign_supervisor": True,
        "cold_remount_proved": False,
        "physical_power_loss_proved": False,
        "public_peer_retrieval_proved": False,
        "chain_2050_authority_claimed": False,
    })
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
