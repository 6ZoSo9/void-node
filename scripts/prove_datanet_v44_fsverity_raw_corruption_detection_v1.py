#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
from __future__ import annotations

import argparse
import errno
import fcntl
import hashlib
import json
import os
from pathlib import Path
import stat
import struct
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import datanet_ext4_inode_generation_v1 as inode_generation
import datanet_v39_exec_claimant_record_v1 as record
import datanet_v41_fsverity_record_io_v1 as v41_io

CONTROL = ROOT / "fixtures/datanet-v44-fsverity-raw-corruption-detection-ext4-v1.json"
V31 = ROOT / "fixtures/datanet-v31-campaign-topology-ext4-v1.json"
PARENT_HEAD = "10db8d1f64d8b665b2b568d67270ef3e4019516c"
STATIC = "VOID_DATANET_V44_FSVERITY_RAW_CORRUPTION_DETECTION_STATIC_V1_GREEN"
CAPTURE = "VOID_DATANET_V44_FSVERITY_RAW_PREIMAGE_CAPTURE_V1_GREEN"
CORRUPT = "VOID_DATANET_V44_FSVERITY_RAW_SINGLE_BYTE_CORRUPTION_V1_GREEN"
FINAL = "VOID_DATANET_V44_FSVERITY_RAW_CORRUPTION_DETECTION_V1_GREEN"
FS_IOC_FIEMAP = 0xC020660B
LAST, UNKNOWN, DELALLOC, ENCODED = 0x1, 0x2, 0x4, 0x8
DATA_ENCRYPTED, NOT_ALIGNED, DATA_INLINE, DATA_TAIL = 0x80, 0x100, 0x200, 0x400
UNWRITTEN, MERGED, SHARED = 0x800, 0x1000, 0x2000
BAD = UNKNOWN | DELALLOC | ENCODED | DATA_ENCRYPTED | NOT_ALIGNED | DATA_INLINE | DATA_TAIL | UNWRITTEN | MERGED | SHARED
FH = struct.Struct("<QQIIII")
FE = struct.Struct("<QQQQQIIII")


def emit(obj: dict) -> None:
    print(json.dumps(obj, sort_keys=True, separators=(",", ":")), flush=True)


def canonical(obj: dict) -> bytes:
    return (json.dumps(obj, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def git_blob(path: Path) -> str:
    data = path.read_bytes()
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def ident(st: os.stat_result) -> str:
    return f"{st.st_dev}:{st.st_ino}"


def load_control() -> dict:
    cfg = json.loads(CONTROL.read_text(encoding="utf-8"))
    assert cfg["v"] == 1
    assert cfg["format"] == "VOID_DATANET_V44_FSVERITY_RAW_CORRUPTION_DETECTION_EXT4_CONTROL_V1"
    assert cfg["parent_pr"] == 1503 and cfg["parent_head"] == PARENT_HEAD
    for rel, want in sorted(cfg["accepted_v43_blobs"].items()):
        assert git_blob(ROOT / rel) == want, rel
    assert cfg["target_record"] == "closed"
    assert cfg["corruption"] == {
        "method": "offline_raw_backing_image_single_byte_flip",
        "fiemap_sync_flag_used": False,
        "byte_offset_within_file": 0,
        "expected_errno": errno.EIO,
    }
    return cfg


def map_extents(fd: int) -> list[dict]:
    count = 32
    buf = bytearray(FH.size + FE.size * count)
    FH.pack_into(buf, 0, 0, (1 << 64) - 1, 0, 0, count, 0)
    fcntl.ioctl(fd, FS_IOC_FIEMAP, buf, True)
    start, _, flags, mapped, got_count, reserved = FH.unpack_from(buf, 0)
    assert start == 0 and flags == 0 and got_count == count and reserved == 0 and 0 < mapped <= count
    out = []
    for i in range(mapped):
        logical, physical, length, r0, r1, eflags, rr0, rr1, rr2 = FE.unpack_from(buf, FH.size + i * FE.size)
        assert r0 == r1 == rr0 == rr1 == rr2 == 0
        assert length > 0 and physical > 0 and not (eflags & BAD)
        out.append({"logical": logical, "physical": physical, "length": length, "flags": eflags})
    assert out[0]["logical"] == 0
    assert out[-1]["flags"] & LAST
    return out


def read_file(fd: int, size: int) -> bytes:
    data = os.pread(fd, size, 0)
    assert len(data) == size
    assert os.pread(fd, 1, size) == b""
    return data


def load_manifest(path: str) -> dict:
    raw = Path(path).read_bytes()
    obj = json.loads(raw)
    want = obj.pop("manifest_sha256")
    got = hashlib.sha256(canonical(obj)).hexdigest()
    assert got == want
    obj["manifest_sha256"] = want
    assert obj["marker"] == CAPTURE and obj["status"] == "GREEN"
    return obj


def static_mode() -> int:
    cfg = load_control()
    claim = cfg["claim"]
    for key in (
        "fiemap_data_extent_bound_before_corruption",
        "raw_preimage_matches_sealed_record",
        "single_data_byte_mutated_offline",
        "inode_generation_unchanged",
        "fsverity_root_digest_unchanged",
        "record_metadata_unchanged",
        "fsverity_data_read_returns_eio",
        "actual_v41_admission_fails_on_corrupted_record",
    ):
        assert claim[key] is True, key
    for key in ("verity_tree_or_descriptor_corruption_proved", "physical_power_loss_proved", "production_runtime_activation"):
        assert claim[key] is False, key
    emit({
        "marker": STATIC,
        "status": "GREEN",
        "parent_head": PARENT_HEAD,
        "accepted_v43_blob_count": len(cfg["accepted_v43_blobs"]),
        "fiemap_ioctl": hex(FS_IOC_FIEMAP),
        "fiemap_sync_flag_used": False,
        "expected_corruption_read_errno": errno.EIO,
        "production_runtime_touched": False,
    })
    return 0


def capture_mode(ns: argparse.Namespace) -> int:
    load_control()
    fixture = json.loads(V31.read_text(encoding="utf-8"))
    k = fixture["quota_key"]
    name = record.closed_name(k)
    root_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    root_fd = os.open(ns.r0_root, root_flags)
    fd = -1
    image_fd = -1
    try:
        root_st = os.fstat(root_fd)
        flags = os.O_RDONLY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
        fd = os.open(name, flags, dir_fd=root_fd)
        st = os.fstat(fd)
        visible = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        assert stat.S_ISREG(st.st_mode) and ident(st) == ident(visible)
        assert st.st_uid == os.getuid() and st.st_nlink == 1 and stat.S_IMODE(st.st_mode) == 0o600
        assert 0 < st.st_size <= record.MAX_MARKER_BYTES
        generation = inode_generation.observe_ext4_inode_generation_v1(fd)
        measured = v41_io.v40.measure_verity(fd)
        assert measured["algorithm"] == 1 and measured["digest_size"] == 32
        raw = read_file(fd, st.st_size)
        assert hashlib.sha256(raw).hexdigest() == v41_io.digest(raw)
        exts = map_extents(fd)
        first = next(ex for ex in exts if ex["logical"] == 0 and ex["length"] >= st.st_size)
        image_fd = os.open(ns.image, os.O_RDONLY | os.O_CLOEXEC)
        image_size = os.fstat(image_fd).st_size
        assert first["physical"] + st.st_size <= image_size
        raw_image = os.pread(image_fd, st.st_size, first["physical"])
        assert raw_image == raw
        manifest = {
            "marker": CAPTURE,
            "status": "GREEN",
            "parent_head": PARENT_HEAD,
            "record_name": name,
            "root_identity": ident(root_st),
            "record_identity": ident(st),
            "record_generation": generation["generation"],
            "record_size": st.st_size,
            "record_uid": st.st_uid,
            "record_nlink": st.st_nlink,
            "record_mode": stat.S_IMODE(st.st_mode),
            "record_sha256": hashlib.sha256(raw).hexdigest(),
            "record_first_byte_hex": raw[0:1].hex(),
            "fsverity": measured,
            "fiemap_sync_flag_used": False,
            "extent_count": len(exts),
            "extents": exts,
            "target_physical_offset": first["physical"],
            "raw_preimage_matches_sealed_record": True,
            "production_runtime_touched": False,
        }
        digest_obj = dict(manifest)
        manifest["manifest_sha256"] = hashlib.sha256(canonical(digest_obj)).hexdigest()
        Path(ns.output).write_bytes(canonical(manifest))
        emit({
            "marker": CAPTURE,
            "status": "GREEN",
            "manifest_sha256": manifest["manifest_sha256"],
            "record_identity": manifest["record_identity"],
            "record_generation": manifest["record_generation"],
            "extent_count": len(exts),
            "raw_preimage_matches_sealed_record": True,
            "production_runtime_touched": False,
        })
        return 0
    finally:
        if image_fd >= 0: os.close(image_fd)
        if fd >= 0: os.close(fd)
        os.close(root_fd)


def corrupt_mode(ns: argparse.Namespace) -> int:
    load_control()
    m = load_manifest(ns.manifest)
    offset = int(m["target_physical_offset"])
    fd = os.open(ns.image, os.O_RDWR | os.O_CLOEXEC)
    try:
        before = os.pread(fd, 1, offset)
        assert len(before) == 1 and before.hex() == m["record_first_byte_hex"]
        after = bytes([before[0] ^ 0x01])
        assert after != before
        assert os.pwrite(fd, after, offset) == 1
        os.fsync(fd)
        reread = os.pread(fd, 1, offset)
        assert reread == after
    finally:
        os.close(fd)
    receipt = {
        "marker": CORRUPT,
        "status": "GREEN",
        "parent_head": PARENT_HEAD,
        "manifest_sha256": m["manifest_sha256"],
        "physical_offset": offset,
        "before_hex": before.hex(),
        "after_hex": after.hex(),
        "xor_mask": 1,
        "bytes_written": 1,
        "offline_raw_backing_image_mutation": True,
        "production_runtime_touched": False,
    }
    Path(ns.output).write_bytes(canonical(receipt))
    emit(receipt)
    return 0


def expect_eprem(root_fd: int, name: str, mode: int) -> int:
    try:
        fd = os.open(name, mode | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0), dir_fd=root_fd)
    except OSError as exc:
        assert exc.errno == errno.EPERM
        return exc.errno
    os.close(fd)
    raise AssertionError("sealed corrupted record opened writable")


def verify_mode(ns: argparse.Namespace) -> int:
    load_control()
    m = load_manifest(ns.manifest)
    corruption = json.loads(Path(ns.corruption_receipt).read_text(encoding="utf-8"))
    assert corruption["marker"] == CORRUPT and corruption["status"] == "GREEN"
    assert corruption["manifest_sha256"] == m["manifest_sha256"] and corruption["bytes_written"] == 1
    name = m["record_name"]
    root_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    root_fd = os.open(ns.r0_root, root_flags)
    fd = -1
    try:
        root_st = os.fstat(root_fd)
        assert ident(root_st) == m["root_identity"]
        fd = os.open(name, os.O_RDONLY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0), dir_fd=root_fd)
        st = os.fstat(fd)
        visible = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        assert ident(st) == ident(visible) == m["record_identity"]
        assert st.st_uid == m["record_uid"] and st.st_nlink == m["record_nlink"] == 1
        assert stat.S_IMODE(st.st_mode) == m["record_mode"] == 0o600 and st.st_size == m["record_size"]
        generation = inode_generation.observe_ext4_inode_generation_v1(fd)
        assert generation["generation"] == m["record_generation"]
        measured = v41_io.v40.measure_verity(fd)
        assert measured == m["fsverity"]
        try:
            os.pread(fd, st.st_size, 0)
        except OSError as exc:
            assert exc.errno == errno.EIO
            direct_read_eio = True
            direct_errno = exc.errno
        else:
            raise AssertionError("corrupted fs-verity record read unexpectedly succeeded")
        write_errno = expect_eprem(root_fd, name, os.O_WRONLY)
        rdwr_errno = expect_eprem(root_fd, name, os.O_RDWR)
        try:
            os.truncate(f"/proc/self/fd/{root_fd}/{name}", max(0, st.st_size - 1))
        except OSError as exc:
            assert exc.errno == errno.EPERM
            truncate_errno = exc.errno
        else:
            raise AssertionError("corrupted sealed record truncate unexpectedly succeeded")

        record.record_io = v41_io
        try:
            record.read_one(root_fd, name)
        except OSError as exc:
            assert exc.errno == errno.EIO
            admission_eio = True
            admission_errno = exc.errno
        else:
            raise AssertionError("actual V41 admission unexpectedly accepted corrupted record")
    finally:
        if fd >= 0: os.close(fd)
        os.close(root_fd)

    out = {
        "marker": FINAL,
        "status": "GREEN",
        "parent_head": PARENT_HEAD,
        "manifest_sha256": m["manifest_sha256"],
        "target_record": "closed",
        "single_data_byte_mutated_offline": True,
        "bytes_mutated": 1,
        "record_identity_stable": True,
        "record_generation_stable": True,
        "record_metadata_stable": True,
        "fsverity_root_digest_stable": True,
        "fsverity_data_read_eio": direct_read_eio,
        "fsverity_data_read_errno": direct_errno,
        "actual_v41_admission_fails_on_corrupted_record": admission_eio,
        "actual_v41_admission_errno": admission_errno,
        "same_uid_write_denied": write_errno == errno.EPERM,
        "same_uid_rdwr_denied": rdwr_errno == errno.EPERM,
        "same_uid_truncate_denied": truncate_errno == errno.EPERM,
        "verity_tree_or_descriptor_corruption_proved": False,
        "physical_power_loss_proved": False,
        "production_runtime_touched": False,
    }
    Path(ns.output).write_bytes(canonical(out))
    emit(out)
    return 0


def main() -> int:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="mode", required=True)
    sub.add_parser("static")
    cap = sub.add_parser("capture")
    cap.add_argument("--r0-root", required=True)
    cap.add_argument("--image", required=True)
    cap.add_argument("--output", required=True)
    cor = sub.add_parser("corrupt")
    cor.add_argument("--image", required=True)
    cor.add_argument("--manifest", required=True)
    cor.add_argument("--output", required=True)
    ver = sub.add_parser("verify")
    ver.add_argument("--r0-root", required=True)
    ver.add_argument("--manifest", required=True)
    ver.add_argument("--corruption-receipt", required=True)
    ver.add_argument("--output", required=True)
    ns = p.parse_args()
    if ns.mode == "static": return static_mode()
    if ns.mode == "capture": return capture_mode(ns)
    if ns.mode == "corrupt": return corrupt_mode(ns)
    return verify_mode(ns)


if __name__ == "__main__":
    raise SystemExit(main())
