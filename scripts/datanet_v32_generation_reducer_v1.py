#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import hashlib
import os
from pathlib import Path
import stat

import datanet_ext4_inode_generation_v1 as inode_generation

SOURCE = Path(__file__).resolve()


def source_sha256() -> str:
    return hashlib.sha256(SOURCE.read_bytes()).hexdigest()


def identity(st: os.stat_result) -> str:
    return f"{st.st_dev}:{st.st_ino}"


def generation_identity(st: os.stat_result, generation: int) -> str:
    return f"{st.st_dev}:{st.st_ino}:{generation}"


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


def _fingerprint(st: os.stat_result) -> tuple:
    return (
        st.st_dev,
        st.st_ino,
        st.st_uid,
        st.st_gid,
        stat.S_IMODE(st.st_mode),
        st.st_nlink,
        st.st_size,
        st.st_mtime_ns,
        st.st_ctime_ns,
    )


def full_read_s0(root_fd: int, binding, fixture: dict, *, retain_fd: bool = False) -> tuple[dict, int | None]:
    name = slot_name(binding.k, 0)
    flags = os.O_RDONLY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(name, flags, dir_fd=root_fd)
    keep = False
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
        before_fingerprint = _fingerprint(before)

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

        generation_receipt = inode_generation.observe_ext4_inode_generation_v1(fd)
        generation = generation_receipt["generation"]
        assert generation_receipt["ioctl_calls"] == 1
        assert generation_receipt["setversion_issued"] is False

        after = os.fstat(fd)
        visible_after = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        assert _fingerprint(after) == before_fingerprint
        assert _fingerprint(visible_after) == before_fingerprint

        result = {
            "s0_name": name,
            "s0_identity": identity(before),
            "s0_generation": generation,
            "s0_generation_identity": generation_identity(before, generation),
            "s0_generation_receipt": generation_receipt,
            "ledger": {
                "read_calls": calls,
                "read_requested_bytes": requested,
                "read_returned_bytes": returned,
                "eof_probes": 1,
            },
            "sha256": h.hexdigest(),
        }
        if retain_fd:
            keep = True
            return result, fd
        return result, None
    finally:
        if not keep:
            os.close(fd)


def _reduce_s0_only(root_fd: int, binding, fixture: dict, *, retain_s0_fd: bool) -> tuple[dict, int | None]:
    root_st = os.fstat(root_fd)
    assert identity(root_st) == binding.root_identity
    cap = validate_capability_metadata(root_fd, binding)
    expected = sorted([cap["name"], slot_name(binding.k, 0)])
    assert sorted(os.listdir(root_fd)) == expected
    read, retained_fd = full_read_s0(root_fd, binding, fixture, retain_fd=retain_s0_fd)
    assert sorted(os.listdir(root_fd)) == expected
    validate_capability_metadata(root_fd, binding)
    assert read["ledger"] == {
        "read_calls": fixture["one_classifier_ledger"]["read_calls"],
        "read_requested_bytes": fixture["one_classifier_ledger"]["read_requested_bytes"],
        "read_returned_bytes": fixture["one_classifier_ledger"]["read_returned_bytes"],
        "eof_probes": 1,
    }
    result = {
        "decision": "AUTHORIZE_H1",
        "root_identity": binding.root_identity,
        "quota_key": binding.k,
        "s0_name": read["s0_name"],
        "s0_identity": read["s0_identity"],
        "s0_generation": read["s0_generation"],
        "s0_generation_identity": read["s0_generation_identity"],
        "s0_generation_receipt": read["s0_generation_receipt"],
        "s0_sha256": read["sha256"],
        "ledger": read["ledger"],
        "reducer_source_sha256": source_sha256(),
        "inode_generation_source_sha256": inode_generation.source_sha256(),
        "python_executable_sha256": inode_generation.executable_sha256(),
        "schedule_label_input": False,
        "disposable_history_input": False,
    }
    return result, retained_fd


def reduce_s0_only(root_fd: int, binding, fixture: dict) -> dict:
    result, retained_fd = _reduce_s0_only(root_fd, binding, fixture, retain_s0_fd=False)
    assert retained_fd is None
    return result


def reduce_s0_only_with_retained_fd(root_fd: int, binding, fixture: dict) -> tuple[dict, int]:
    result, retained_fd = _reduce_s0_only(root_fd, binding, fixture, retain_s0_fd=True)
    assert retained_fd is not None
    return result, retained_fd
