#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import hashlib
import os
from pathlib import Path
import stat

SOURCE = Path(__file__).resolve()


def source_sha256() -> str:
    return hashlib.sha256(SOURCE.read_bytes()).hexdigest()


def identity(st: os.stat_result) -> str:
    return f"{st.st_dev}:{st.st_ino}"


def cap_name(k: str) -> str:
    return f".void-datanet-admission-{k}.lock.v1"


def slot_name(k: str, slot: int) -> str:
    assert slot in (0, 1)
    return f"datanet-{k}-s{slot}.v1"


def validate_capability_metadata(root_fd: int, binding) -> dict:
    visible = os.stat(cap_name(binding.k), dir_fd=root_fd, follow_symlinks=False)
    assert stat.S_ISREG(visible.st_mode)
    assert not stat.S_ISLNK(visible.st_mode)
    assert identity(visible) == binding.lock_identity
    assert visible.st_uid == os.getuid()
    assert visible.st_nlink == 1
    assert stat.S_IMODE(visible.st_mode) == 0o600
    assert visible.st_size == 0
    return {"name": cap_name(binding.k), "identity": binding.lock_identity}


def open_root_readonly(root: str, expected_identity: str) -> int:
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(root, flags)
    st = os.fstat(fd)
    assert stat.S_ISDIR(st.st_mode)
    assert identity(st) == expected_identity
    return fd


def full_read_s0(root_fd: int, binding, fixture: dict) -> dict:
    name = slot_name(binding.k, 0)
    flags = os.O_RDONLY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(name, flags, dir_fd=root_fd)
    try:
        before = os.fstat(fd)
        visible_before = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        assert stat.S_ISREG(before.st_mode)
        assert not stat.S_ISLNK(visible_before.st_mode)
        assert identity(before) == identity(visible_before)
        assert before.st_uid == os.getuid()
        assert before.st_nlink == 1
        assert stat.S_IMODE(before.st_mode) == 0o600
        assert before.st_size == fixture["payload_bytes"]
        assert before.st_blocks * 512 >= fixture["payload_bytes"]

        h = hashlib.sha256()
        calls = requested = returned = 0
        block_bytes = fixture["io_block_bytes"]
        for offset in range(0, fixture["payload_bytes"], block_bytes):
            data = os.pread(fd, block_bytes, offset)
            calls += 1
            requested += block_bytes
            returned += len(data)
            assert len(data) == block_bytes, (offset, len(data))
            h.update(data)
        eof = os.pread(fd, 1, fixture["payload_bytes"])
        calls += 1
        requested += 1
        returned += len(eof)
        assert eof == b""
        assert h.hexdigest() == fixture["payload_sha256"]

        after = os.fstat(fd)
        visible_after = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        assert identity(after) == identity(before)
        assert identity(visible_after) == identity(before)
        assert after.st_size == before.st_size
        assert after.st_nlink == 1
        return {
            "s0_name": name,
            "s0_identity": identity(before),
            "ledger": {
                "read_calls": calls,
                "read_requested_bytes": requested,
                "read_returned_bytes": returned,
                "eof_probes": 1,
            },
            "sha256": h.hexdigest(),
        }
    finally:
        os.close(fd)


def reduce_s0_only(root_fd: int, binding, fixture: dict) -> dict:
    """Schedule-agnostic S0-only reducer shared by E0 classification and R0 recovery."""
    root_st = os.fstat(root_fd)
    assert identity(root_st) == binding.root_identity
    cap = validate_capability_metadata(root_fd, binding)
    expected = sorted([cap["name"], slot_name(binding.k, 0)])
    assert sorted(os.listdir(root_fd)) == expected
    read = full_read_s0(root_fd, binding, fixture)
    assert sorted(os.listdir(root_fd)) == expected
    validate_capability_metadata(root_fd, binding)
    assert read["ledger"] == {
        "read_calls": fixture["one_classifier_ledger"]["read_calls"],
        "read_requested_bytes": fixture["one_classifier_ledger"]["read_requested_bytes"],
        "read_returned_bytes": fixture["one_classifier_ledger"]["read_returned_bytes"],
        "eof_probes": 1,
    }
    return {
        "decision": "AUTHORIZE_H1",
        "root_identity": binding.root_identity,
        "quota_key": binding.k,
        "s0_name": read["s0_name"],
        "s0_identity": read["s0_identity"],
        "s0_sha256": read["sha256"],
        "ledger": read["ledger"],
        "reducer_source_sha256": source_sha256(),
        "schedule_label_input": False,
        "disposable_history_input": False,
    }
