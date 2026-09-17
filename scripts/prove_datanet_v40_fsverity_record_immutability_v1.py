#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import stat
import struct
import sys
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))

import datanet_ext4_inode_generation_v1 as inode_generation

CONTROL = REPO_ROOT / "fixtures" / "datanet-v40-fsverity-record-immutability-ext4-v1.json"
STATIC_MARKER = "VOID_DATANET_V40_FSVERITY_RECORD_IMMUTABILITY_STATIC_V1_GREEN"
CREATE_MARKER = "VOID_DATANET_V40_FSVERITY_RECORD_IMMUTABILITY_CREATE_V1_GREEN"
VERIFY_MARKER = "VOID_DATANET_V40_FSVERITY_RECORD_IMMUTABILITY_VERIFY_V1_GREEN"
SCHEMA_ID = "VOID_DATANET_V39_EXEC_CLAIMANT_RECORD_V1"
QUOTA_KEY = "40" * 32
FORMAT_BY_KIND = {
    "armed": "VOID_DATANET_RECOVERY_ARMED_V3",
    "claimed": "VOID_DATANET_RECOVERY_CLAIMED_V3",
    "closed": "VOID_DATANET_RECOVERY_CLOSED_V3",
}

# Linux UAPI ioctl encoding for x86_64 / generic asm-generic ioctl layout.
_IOC_NRBITS = 8
_IOC_TYPEBITS = 8
_IOC_SIZEBITS = 14
_IOC_NRSHIFT = 0
_IOC_TYPESHIFT = _IOC_NRSHIFT + _IOC_NRBITS
_IOC_SIZESHIFT = _IOC_TYPESHIFT + _IOC_TYPEBITS
_IOC_DIRSHIFT = _IOC_SIZESHIFT + _IOC_SIZEBITS
_IOC_WRITE = 1
_IOC_READ = 2


def _ioc(direction: int, type_value: int, nr: int, size: int) -> int:
    return (
        (direction << _IOC_DIRSHIFT)
        | (type_value << _IOC_TYPESHIFT)
        | (nr << _IOC_NRSHIFT)
        | (size << _IOC_SIZESHIFT)
    )


ENABLE_ARG_FORMAT = "=IIIIQIIQ11Q"
ENABLE_ARG_SIZE = struct.calcsize(ENABLE_ARG_FORMAT)
DIGEST_HEADER_SIZE = struct.calcsize("=HH")
FS_IOC_ENABLE_VERITY = _ioc(_IOC_WRITE, ord("f"), 133, ENABLE_ARG_SIZE)
FS_IOC_MEASURE_VERITY = _ioc(_IOC_READ | _IOC_WRITE, ord("f"), 134, DIGEST_HEADER_SIZE)
FS_VERITY_HASH_ALG_SHA256 = 1


def emit(obj: dict[str, Any]) -> None:
    print(json.dumps(obj, sort_keys=True, separators=(",", ":")), flush=True)


def git_blob_sha1(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical_bytes(obj: dict[str, Any]) -> bytes:
    return (json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True) + "\n").encode("ascii")


def identity(st: os.stat_result) -> str:
    return f"{st.st_dev}:{st.st_ino}"


def load_control() -> dict[str, Any]:
    cfg = json.loads(CONTROL.read_text(encoding="utf-8"))
    assert cfg["v"] == 1
    assert cfg["format"] == "VOID_DATANET_V40_FSVERITY_RECORD_IMMUTABILITY_EXT4_CONTROL_V1"
    assert cfg["parent_pr"] == 1499
    assert cfg["parent_head"] == "d14dabd01e9292feb3f737387b69258447898507"
    assert cfg["record_kinds"] == ["armed", "claimed", "closed"]
    fs_cfg = cfg["filesystem"]
    assert fs_cfg == {
        "type": "ext4",
        "mkfs_feature": "verity",
        "hash_algorithm": "sha256",
        "hash_algorithm_id": 1,
        "verity_block_size": 4096,
        "record_max_bytes": 3072,
    }
    return cfg


def observe_generation(fd: int) -> int:
    receipt = inode_generation.observe_ext4_inode_generation_v1(fd)
    assert receipt["ioctl_calls"] == 1
    assert receipt["setversion_issued"] is False
    generation = receipt["generation"]
    assert isinstance(generation, int) and 0 <= generation <= 0xFFFF_FFFF
    return generation


def enable_verity(fd: int, block_size: int) -> None:
    assert ENABLE_ARG_SIZE == 128
    arg = struct.pack(
        ENABLE_ARG_FORMAT,
        1,
        FS_VERITY_HASH_ALG_SHA256,
        block_size,
        0,
        0,
        0,
        0,
        0,
        *([0] * 11),
    )
    assert len(arg) == ENABLE_ARG_SIZE
    fcntl.ioctl(fd, FS_IOC_ENABLE_VERITY, arg)


def measure_verity(fd: int) -> dict[str, Any]:
    buf = bytearray(DIGEST_HEADER_SIZE + 64)
    struct.pack_into("=HH", buf, 0, 0, 64)
    fcntl.ioctl(fd, FS_IOC_MEASURE_VERITY, buf, True)
    algorithm, digest_size = struct.unpack_from("=HH", buf, 0)
    assert algorithm == FS_VERITY_HASH_ALG_SHA256
    assert digest_size == 32
    digest = bytes(buf[DIGEST_HEADER_SIZE:DIGEST_HEADER_SIZE + digest_size])
    assert len(digest) == 32
    return {
        "algorithm": algorithm,
        "digest_size": digest_size,
        "digest_hex": digest.hex(),
    }


def read_all(fd: int, size: int) -> bytes:
    out = bytearray()
    offset = 0
    while offset < size:
        chunk = os.pread(fd, size - offset, offset)
        assert chunk
        out.extend(chunk)
        offset += len(chunk)
    assert os.pread(fd, 1, size) == b""
    return bytes(out)


def write_all(fd: int, data: bytes) -> None:
    offset = 0
    while offset < len(data):
        n = os.write(fd, data[offset:])
        assert n > 0
        offset += n


def denied_open(path: str, flags: int) -> int:
    try:
        fd = os.open(path, flags | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0))
    except OSError as exc:
        assert isinstance(exc.errno, int) and exc.errno > 0
        return exc.errno
    else:
        os.close(fd)
        raise AssertionError(f"verity file unexpectedly opened writable: {path}")


def denied_truncate(path: str, size: int) -> int:
    try:
        os.truncate(path, size)
    except OSError as exc:
        assert isinstance(exc.errno, int) and exc.errno > 0
        return exc.errno
    raise AssertionError(f"verity file unexpectedly truncated: {path}")


def create_one(root: str, root_fd: int, kind: str, cfg: dict[str, Any]) -> dict[str, Any]:
    assert kind in FORMAT_BY_KIND
    name = f".void-datanet-v40-{kind}.v3"
    path = os.path.join(root, name)
    flags = os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    writer = os.open(name, flags, 0o600, dir_fd=root_fd)
    ro_probe = -1
    try:
        os.fchmod(writer, 0o600)
        before = os.fstat(writer)
        assert stat.S_ISREG(before.st_mode)
        assert before.st_uid == os.getuid()
        assert before.st_nlink == 1
        assert stat.S_IMODE(before.st_mode) == 0o600
        assert before.st_size == 0
        generation = observe_generation(writer)
        obj = {
            "format": FORMAT_BY_KIND[kind],
            "state": kind.upper(),
            "schema_id": SCHEMA_ID,
            "quota_key": QUOTA_KEY,
            "root_identity": identity(os.fstat(root_fd)),
            "record_identity": identity(before),
            "record_generation": generation,
            "generation_source_sha256": inode_generation.source_sha256(),
            "v40_fsverity_probe": True,
        }
        raw = canonical_bytes(obj)
        assert 0 < len(raw) <= cfg["filesystem"]["record_max_bytes"]
        write_all(writer, raw)
        os.fsync(writer)
        os.fsync(root_fd)

        ro_probe = os.open(name, os.O_RDONLY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0), dir_fd=root_fd)
        enable_while_writer_errno = None
        try:
            enable_verity(ro_probe, cfg["filesystem"]["verity_block_size"])
        except OSError as exc:
            enable_while_writer_errno = exc.errno
        assert isinstance(enable_while_writer_errno, int) and enable_while_writer_errno > 0
        os.close(ro_probe)
        ro_probe = -1
    finally:
        if ro_probe >= 0:
            os.close(ro_probe)
        os.close(writer)

    ro_fd = os.open(name, os.O_RDONLY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0), dir_fd=root_fd)
    try:
        stable_before_enable = os.fstat(ro_fd)
        assert identity(stable_before_enable) == obj["record_identity"]
        assert observe_generation(ro_fd) == generation
        enable_verity(ro_fd, cfg["filesystem"]["verity_block_size"])
        os.fsync(ro_fd)
        measured = measure_verity(ro_fd)
        after_enable = os.fstat(ro_fd)
        generation_after_enable = observe_generation(ro_fd)
        assert identity(after_enable) == obj["record_identity"]
        assert generation_after_enable == generation
        content = read_all(ro_fd, after_enable.st_size)
        assert content == raw
        write_errno = denied_open(path, os.O_WRONLY)
        rdwr_errno = denied_open(path, os.O_RDWR)
        truncate_errno = denied_truncate(path, max(0, len(raw) - 1))
        measured_after_denials = measure_verity(ro_fd)
        assert measured_after_denials == measured
        reread = read_all(ro_fd, after_enable.st_size)
        assert reread == raw
        return {
            "name": name,
            "kind": kind,
            "bytes": len(raw),
            "sha256": sha256(raw),
            "identity": obj["record_identity"],
            "generation": generation,
            "generation_identity": f"{obj['record_identity']}:{generation}",
            "enable_while_writer_open_rejected": True,
            "enable_while_writer_open_errno": enable_while_writer_errno,
            "verity": measured,
            "same_uid_write_open_denied": True,
            "same_uid_write_open_errno": write_errno,
            "same_uid_rdwr_open_denied": True,
            "same_uid_rdwr_open_errno": rdwr_errno,
            "same_uid_truncate_denied": True,
            "same_uid_truncate_errno": truncate_errno,
            "generation_stable_across_enable": True,
            "content_stable_after_denied_mutations": True,
        }
    finally:
        os.close(ro_fd)


def static_mode() -> int:
    cfg = load_control()
    assert sys.platform == "linux"
    assert os.uname().machine == "x86_64"
    for rel, expected in sorted(cfg["accepted_v39_blobs"].items()):
        actual = git_blob_sha1((REPO_ROOT / rel).read_bytes())
        assert actual == expected, (rel, actual, expected)
    claims = cfg["claim"]
    for key in (
        "enable_requires_no_writable_record_fd",
        "same_uid_inplace_write_denied_on_rw_mount",
        "same_uid_truncate_denied_on_rw_mount",
        "verity_digest_measured",
        "verity_digest_stable_after_clean_rw_remount",
        "record_identity_generation_stable_after_clean_rw_remount",
    ):
        assert claims[key] is True
    for key in (
        "path_replacement_prevented",
        "v39_composition_proved",
        "physical_power_loss_proved",
        "production_runtime_activation",
    ):
        assert claims[key] is False
    emit({
        "marker": STATIC_MARKER,
        "status": "GREEN",
        "parent_head": cfg["parent_head"],
        "accepted_v39_blob_count": len(cfg["accepted_v39_blobs"]),
        "enable_ioctl_hex": hex(FS_IOC_ENABLE_VERITY),
        "measure_ioctl_hex": hex(FS_IOC_MEASURE_VERITY),
        "enable_arg_size": ENABLE_ARG_SIZE,
        "digest_header_size": DIGEST_HEADER_SIZE,
        "production_runtime_touched": False,
    })
    return 0


def create_mode(root: str) -> int:
    cfg = load_control()
    assert os.path.isabs(root)
    assert os.path.isdir(root)
    assert os.listdir(root) == []
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    root_fd = os.open(root, flags)
    try:
        root_st = os.fstat(root_fd)
        assert stat.S_ISDIR(root_st.st_mode)
        records = {kind: create_one(root, root_fd, kind, cfg) for kind in cfg["record_kinds"]}
        assert sorted(os.listdir(root_fd)) == sorted(item["name"] for item in records.values())
        os.fsync(root_fd)
        assert all(item["enable_while_writer_open_rejected"] for item in records.values())
        assert all(item["same_uid_write_open_denied"] for item in records.values())
        assert all(item["same_uid_rdwr_open_denied"] for item in records.values())
        assert all(item["same_uid_truncate_denied"] for item in records.values())
        emit({
            "marker": CREATE_MARKER,
            "status": "GREEN",
            "parent_pr": cfg["parent_pr"],
            "parent_head": cfg["parent_head"],
            "root_identity": identity(root_st),
            "filesystem": cfg["filesystem"],
            "record_kinds": cfg["record_kinds"],
            "records": records,
            "all_three_verity_enabled": True,
            "writer_open_enable_rejected": True,
            "same_uid_inplace_write_denied_on_rw_mount": True,
            "same_uid_truncate_denied_on_rw_mount": True,
            "path_replacement_prevented": False,
            "v39_composition_proved": False,
            "physical_power_loss_proved": False,
            "production_runtime_touched": False,
        })
        return 0
    finally:
        os.close(root_fd)


def verify_mode(root: str, receipt_path: str) -> int:
    cfg = load_control()
    receipt = json.loads(Path(receipt_path).read_text(encoding="utf-8"))
    assert receipt["marker"] == CREATE_MARKER and receipt["status"] == "GREEN"
    assert receipt["parent_head"] == cfg["parent_head"]
    assert os.path.isabs(root) and os.path.isdir(root)
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    root_fd = os.open(root, flags)
    try:
        root_st = os.fstat(root_fd)
        assert identity(root_st) == receipt["root_identity"]
        verified: dict[str, Any] = {}
        for kind in cfg["record_kinds"]:
            prior = receipt["records"][kind]
            name = prior["name"]
            path = os.path.join(root, name)
            fd = os.open(name, os.O_RDONLY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0), dir_fd=root_fd)
            try:
                st = os.fstat(fd)
                assert stat.S_ISREG(st.st_mode)
                assert identity(st) == prior["identity"]
                generation = observe_generation(fd)
                assert generation == prior["generation"]
                measured = measure_verity(fd)
                assert measured == prior["verity"]
                raw = read_all(fd, st.st_size)
                assert sha256(raw) == prior["sha256"]
                write_errno = denied_open(path, os.O_WRONLY)
                rdwr_errno = denied_open(path, os.O_RDWR)
                truncate_errno = denied_truncate(path, max(0, st.st_size - 1))
                assert measure_verity(fd) == measured
                assert sha256(read_all(fd, st.st_size)) == prior["sha256"]
                verified[kind] = {
                    "name": name,
                    "identity": identity(st),
                    "generation": generation,
                    "verity": measured,
                    "sha256": prior["sha256"],
                    "same_uid_write_open_denied_after_rw_remount": True,
                    "same_uid_write_open_errno_after_rw_remount": write_errno,
                    "same_uid_rdwr_open_denied_after_rw_remount": True,
                    "same_uid_rdwr_open_errno_after_rw_remount": rdwr_errno,
                    "same_uid_truncate_denied_after_rw_remount": True,
                    "same_uid_truncate_errno_after_rw_remount": truncate_errno,
                }
            finally:
                os.close(fd)
        assert sorted(os.listdir(root_fd)) == sorted(item["name"] for item in verified.values())
        emit({
            "marker": VERIFY_MARKER,
            "status": "GREEN",
            "parent_head": cfg["parent_head"],
            "root_identity": identity(root_st),
            "records": verified,
            "verity_digest_stable_after_clean_rw_remount": True,
            "record_identity_generation_stable_after_clean_rw_remount": True,
            "same_uid_inplace_write_denied_after_clean_rw_remount": True,
            "same_uid_truncate_denied_after_clean_rw_remount": True,
            "path_replacement_prevented": False,
            "v39_composition_proved": False,
            "physical_power_loss_proved": False,
            "production_runtime_touched": False,
        })
        return 0
    finally:
        os.close(root_fd)


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser()
    p.add_argument("--mode", choices=("static", "create", "verify"), required=True)
    p.add_argument("--root")
    p.add_argument("--receipt")
    return p


def main() -> int:
    ns = parser().parse_args()
    if ns.mode == "static":
        return static_mode()
    assert ns.root is not None
    if ns.mode == "create":
        return create_mode(ns.root)
    assert ns.receipt is not None
    return verify_mode(ns.root, ns.receipt)


if __name__ == "__main__":
    raise SystemExit(main())
