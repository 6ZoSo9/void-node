#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
from __future__ import annotations

import argparse
import ctypes
import errno
import fcntl
import hashlib
import json
import os
from pathlib import Path
import stat
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import datanet_ext4_inode_generation_v1 as inode_generation
import datanet_v34_exec_claimant_record_v1 as recovery_record

CONTROL = ROOT / "fixtures/datanet-v38-recovery-generation-identity-ext4-v1.json"
V31 = ROOT / "fixtures/datanet-v31-campaign-topology-ext4-v1.json"
ACCEPTED_V37 = "6efa4a2343db24c3bf8acbdc20fccd4928ed0c3e"
EXT4_IOC_SETVERSION = 0x40086604
STATIC = "VOID_DATANET_V38_RECOVERY_GENERATION_IDENTITY_STATIC_V1_GREEN"
CAPTURE = "VOID_DATANET_V38_RECOVERY_GENERATION_CAPTURE_V1_GREEN"
POST = "VOID_DATANET_V38_RECOVERY_GENERATION_POST_RECOVERY_V1_GREEN"
MUTATION = "VOID_DATANET_V38_SAME_UID_RECORD_REPLACEMENT_CONTROL_V1_GREEN"
FINAL = "VOID_DATANET_V38_RECOVERY_GENERATION_IDENTITY_V1_GREEN"
BLOCK = 1 << 20


class GenerationHold(Exception):
    def __init__(self, code: str, detail: str = "") -> None:
        super().__init__(f"{code}:{detail}" if detail else code)
        self.code = code
        self.detail = detail


def hold(code: str, detail: str = "") -> None:
    raise GenerationHold(code, detail)


def emit(obj: dict) -> None:
    print(json.dumps(obj, sort_keys=True, separators=(",", ":")))


def canon(obj: dict) -> str:
    return hashlib.sha256(json.dumps(obj, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def blob(path: Path) -> str:
    data = path.read_bytes()
    return hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()


def identity(st: os.stat_result) -> str:
    return f"{st.st_dev}:{st.st_ino}"


def parse_mode(value) -> int:
    return int(value, 0) if isinstance(value, str) else int(value)


def load_control() -> dict:
    control = json.loads(CONTROL.read_text(encoding="utf-8"))
    assert control["v"] == 1
    assert control["format"] == "VOID_DATANET_V38_RECOVERY_GENERATION_IDENTITY_EXT4_CONTROL_V1"
    assert control["parent_pr"] == 1497 and control["parent_head"] == ACCEPTED_V37
    assert len(control["accepted_v37_blobs"]) == 4
    for rel, expected in sorted(control["accepted_v37_blobs"].items()):
        path = ROOT / rel
        assert path.is_file(), rel
        assert blob(path) == expected, rel
    return control


def record_oracle(census: dict, fixture: dict) -> tuple[str, list[dict]]:
    assert census["format"] == "VOID_DATANET_V34_CAMPAIGN_RESTART_CENSUS_V1"
    assert census["cold_remount_proved"] is False
    final = census["source_distinct_final_verifier"]
    assert final["marker"] == "VOID_DATANET_V34_CAMPAIGN_FINAL_VERIFIER_V1_GREEN"
    assert final["status"] == "GREEN"
    k = fixture["quota_key"]
    names = [
        recovery_record.armed_name(k),
        recovery_record.claimed_name(k),
        recovery_record.closed_name(k),
    ]
    hashes = {
        names[0]: final["armed_sha256"],
        names[1]: final["claimed_sha256"],
        names[2]: final["closed_sha256"],
    }
    meta = {entry["name"]: entry for entry in census["r0"]["entries"]}
    out = []
    for name in names:
        m = meta[name]
        out.append({
            "name": name,
            "identity": m["identity"],
            "size": int(m["size"]),
            "nlink": int(m["nlink"]),
            "mode": parse_mode(m["mode"]),
            "sha256": hashes[name],
        })
    assert len({x["name"] for x in out}) == 3
    return census["r0"]["root_identity"], out


def open_root(path: str) -> int:
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    return os.open(path, flags)


def hash_fd(fd: int, size: int) -> str:
    h = hashlib.sha256()
    off = 0
    while off < size:
        n = min(BLOCK, size - off)
        data = os.pread(fd, n, off)
        if len(data) != n:
            hold("HOLD_SHORT_READ", f"{off}:{n}:{len(data)}")
        h.update(data)
        off += n
    if os.pread(fd, 1, size) != b"":
        hold("HOLD_EXTRA_BYTES")
    return h.hexdigest()


def read_raw(fd: int, size: int) -> bytes:
    chunks = []
    off = 0
    while off < size:
        data = os.pread(fd, min(BLOCK, size - off), off)
        if not data:
            hold("HOLD_SHORT_READ", str(off))
        chunks.append(data)
        off += len(data)
    if os.pread(fd, 1, size) != b"":
        hold("HOLD_EXTRA_BYTES")
    return b"".join(chunks)


def observe(root_fd: int, name: str) -> tuple[dict, bytes]:
    flags = os.O_RDONLY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(name, flags, dir_fd=root_fd)
    try:
        before = os.fstat(fd)
        visible = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        if not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(visible.st_mode):
            hold("HOLD_RECORD_NONREGULAR", name)
        if identity(before) != identity(visible):
            hold("HOLD_RECORD_PATH_IDENTITY", name)
        if before.st_uid != os.getuid() or before.st_nlink != 1 or stat.S_IMODE(before.st_mode) != 0o600:
            hold("HOLD_RECORD_METADATA", name)
        raw = read_raw(fd, before.st_size)
        generation = inode_generation.observe_ext4_inode_generation_v1(fd)
        if generation["ioctl_calls"] != 1 or generation["setversion_issued"] is not False:
            hold("HOLD_GENERATION_OBSERVATION", name)
        after = os.fstat(fd)
        visible_after = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        fingerprint = (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns, before.st_ctime_ns)
        if (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_ctime_ns) != fingerprint:
            hold("HOLD_RECORD_CHANGED_DURING_READ", name)
        if (visible_after.st_dev, visible_after.st_ino, visible_after.st_size, visible_after.st_mtime_ns, visible_after.st_ctime_ns) != fingerprint:
            hold("HOLD_RECORD_PATH_CHANGED_DURING_READ", name)
        out = {
            "name": name,
            "identity": identity(before),
            "dev": int(before.st_dev),
            "ino": int(before.st_ino),
            "uid": int(before.st_uid),
            "size": int(before.st_size),
            "nlink": int(before.st_nlink),
            "mode": stat.S_IMODE(before.st_mode),
            "sha256": hashlib.sha256(raw).hexdigest(),
            "generation": int(generation["generation"]),
            "generation_identity": f"{identity(before)}:{generation['generation']}",
        }
        return out, raw
    finally:
        os.close(fd)


def check_expected(observed: dict, expected: dict, require_dev: bool = True) -> None:
    if observed["name"] != expected["name"]:
        hold("HOLD_RECORD_NAME_MISMATCH", observed["name"])
    if require_dev and observed["identity"] != expected["identity"]:
        hold("HOLD_RECORD_INODE_IDENTITY_MISMATCH", observed["name"])
    if not require_dev and observed["ino"] != expected["ino"]:
        hold("HOLD_RECORD_INODE_NUMBER_MISMATCH", observed["name"])
    if observed["generation"] != expected["generation"]:
        hold("HOLD_RECORD_GENERATION_MISMATCH", observed["name"])
    for key in ("size", "nlink", "mode", "sha256"):
        if observed[key] != expected[key]:
            hold("HOLD_RECORD_CONTENT_OR_METADATA_MISMATCH", f"{observed['name']}:{key}")


def load_manifest(path: str) -> dict:
    manifest = json.loads(Path(path).read_text(encoding="utf-8"))
    digest = manifest.pop("manifest_sha256")
    if canon(manifest) != digest:
        hold("HOLD_MANIFEST_DIGEST")
    manifest["manifest_sha256"] = digest
    if manifest["marker"] != CAPTURE or manifest["status"] != "GREEN" or manifest["accepted_v37_head"] != ACCEPTED_V37:
        hold("HOLD_MANIFEST_HEADER")
    if manifest["record_count"] != 3:
        hold("HOLD_MANIFEST_RECORD_COUNT")
    return manifest


def write_all(fd: int, raw: bytes) -> None:
    off = 0
    while off < len(raw):
        n = os.write(fd, raw[off:])
        if n <= 0:
            hold("HOLD_REPLACEMENT_WRITE", str(n))
        off += n


def create_replacement(root_fd: int, name: str, raw: bytes) -> int:
    flags = os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(name, flags, 0o600, dir_fd=root_fd)
    os.fchmod(fd, 0o600)
    write_all(fd, raw)
    return fd


def attempt_setversion_forgery(fd: int, wanted_generation: int) -> dict:
    native = ctypes.sizeof(ctypes.c_long)
    buf = bytearray(native)
    raw = int(wanted_generation).to_bytes(4, byteorder=sys.byteorder, signed=False)
    buf[:4] = raw
    try:
        fcntl.ioctl(fd, EXT4_IOC_SETVERSION, buf, True)
    except OSError as exc:
        return {
            "blocked": exc.errno == errno.ENOTTY,
            "errno": exc.errno,
            "errno_name": errno.errorcode.get(exc.errno, "UNKNOWN"),
            "ioctl_hex": hex(EXT4_IOC_SETVERSION),
            "native_long_bytes": native,
        }
    return {
        "blocked": False,
        "errno": 0,
        "errno_name": "SUCCESS",
        "ioctl_hex": hex(EXT4_IOC_SETVERSION),
        "native_long_bytes": native,
    }


def replace_exact(root_fd: int, expected: dict, raw: bytes, require_same_inode: bool, attempts: int) -> dict:
    name = expected["name"]
    old, current_raw = observe(root_fd, name)
    check_expected(old, expected, require_dev=True)
    if current_raw != raw:
        hold("HOLD_PRE_REPLACEMENT_RAW_MISMATCH", name)
    os.unlink(name, dir_fd=root_fd)
    os.fsync(root_fd)

    selected_fd = None
    selected_st = None
    used = 0
    try:
        limit = attempts if require_same_inode else 1
        for used in range(1, limit + 1):
            fd = create_replacement(root_fd, name, raw)
            st = os.fstat(fd)
            if require_same_inode and st.st_ino != old["ino"]:
                os.close(fd)
                os.unlink(name, dir_fd=root_fd)
                os.fsync(root_fd)
                continue
            selected_fd = fd
            selected_st = st
            break
        if selected_fd is None or selected_st is None:
            hold("HOLD_SAME_INODE_REUSE_NOT_OBSERVED", f"{name}:{used}")

        os.fsync(selected_fd)
        os.fsync(root_fd)
        gen_before_forge = inode_generation.observe_ext4_inode_generation_v1(selected_fd)["generation"]
        forgery = attempt_setversion_forgery(selected_fd, old["generation"])
        gen_after_forge = inode_generation.observe_ext4_inode_generation_v1(selected_fd)["generation"]
        if not forgery["blocked"] or forgery["errno"] != errno.ENOTTY:
            hold("HOLD_SETVERSION_FORGERY_NOT_BLOCKED", name)
        if gen_after_forge != gen_before_forge:
            hold("HOLD_GENERATION_CHANGED_AFTER_BLOCKED_FORGERY", name)
        if hash_fd(selected_fd, len(raw)) != expected["sha256"]:
            hold("HOLD_REPLACEMENT_HASH", name)
    finally:
        if selected_fd is not None:
            os.close(selected_fd)

    new, new_raw = observe(root_fd, name)
    if new_raw != raw or new["sha256"] != expected["sha256"] or new["size"] != expected["size"]:
        hold("HOLD_REPLACEMENT_NOT_BYTE_IDENTICAL", name)
    if new["mode"] != 0o600 or new["nlink"] != 1 or new["uid"] != os.getuid():
        hold("HOLD_REPLACEMENT_METADATA", name)
    if (new["ino"], new["generation"]) == (old["ino"], old["generation"]):
        hold("HOLD_REPLACEMENT_IDENTITY_COLLISION", name)
    if require_same_inode and new["ino"] != old["ino"]:
        hold("HOLD_SAME_INODE_REUSE_LOST", name)
    if require_same_inode and new["generation"] == old["generation"]:
        hold("HOLD_SAME_INODE_GENERATION_NOT_CHANGED", name)

    rejected = False
    reject_code = None
    try:
        check_expected(new, expected, require_dev=True)
    except GenerationHold as exc:
        rejected = True
        reject_code = exc.code
    if not rejected:
        hold("HOLD_GENERATION_BINDING_ACCEPTED_REPLACEMENT", name)
    if require_same_inode and reject_code != "HOLD_RECORD_GENERATION_MISMATCH":
        hold("HOLD_SAME_INODE_NOT_REJECTED_BY_GENERATION", f"{name}:{reject_code}")

    return {
        "name": name,
        "same_uid": old["uid"] == new["uid"] == os.getuid(),
        "byte_identical": new_raw == raw,
        "sha256_equal": old["sha256"] == new["sha256"] == expected["sha256"],
        "mode_equal": old["mode"] == new["mode"] == 0o600,
        "size_equal": old["size"] == new["size"] == expected["size"],
        "old_ino": old["ino"],
        "new_ino": new["ino"],
        "same_inode_reused": old["ino"] == new["ino"],
        "old_generation": old["generation"],
        "new_generation": new["generation"],
        "generation_changed": old["generation"] != new["generation"],
        "attempts": used,
        "setversion_forgery": forgery,
        "generation_binding_rejected": True,
        "reject_code": reject_code,
    }


def static_mode() -> int:
    control = load_control()
    claim = control["claim"]
    for key in (
        "accepted_v37_fiemap_provenance",
        "simulated_sudden_device_loss",
        "recovery_record_generation_binding",
        "post_recovery_record_generation_stable",
        "same_uid_exact_byte_replacement_detected",
        "same_inode_reuse_generation_discriminator",
        "setversion_forgery_blocked_with_metadata_csum",
        "legacy_content_verifier_blind_control",
    ):
        assert claim[key] is True, key
    for key in (
        "physical_power_loss",
        "hardware_write_cache_loss",
        "arbitrary_same_uid_mutation",
        "public_peer_retrieval",
        "chain_2050_economic_authority",
        "production_runtime_activation",
    ):
        assert claim[key] is False, key
    emit({
        "marker": STATIC,
        "status": "GREEN",
        "accepted_v37_head": ACCEPTED_V37,
        "accepted_v37_blob_count": len(control["accepted_v37_blobs"]),
        "ext4_getversion_hex": hex(inode_generation.EXT4_IOC_GETVERSION),
        "ext4_setversion_hex": hex(EXT4_IOC_SETVERSION),
        "record_count": 3,
        "production_runtime_touched": False,
    })
    return 0


def capture_mode(ns: argparse.Namespace) -> int:
    load_control()
    fixture = json.loads(V31.read_text(encoding="utf-8"))
    census = json.loads(Path(ns.pre_restart_census).read_text(encoding="utf-8"))
    root_identity, oracle = record_oracle(census, fixture)
    root_fd = open_root(ns.r0_root)
    try:
        root_st = os.fstat(root_fd)
        if identity(root_st) != root_identity:
            hold("HOLD_R0_ROOT_IDENTITY")
        entries = []
        for expected in oracle:
            observed, _ = observe(root_fd, expected["name"])
            for key in ("identity", "size", "nlink", "mode", "sha256"):
                if observed[key] != expected[key]:
                    hold("HOLD_ORACLE_MISMATCH", f"{expected['name']}:{key}")
            entries.append(observed)
    finally:
        os.close(root_fd)
    manifest = {
        "marker": CAPTURE,
        "status": "GREEN",
        "accepted_v37_head": ACCEPTED_V37,
        "r0_root_identity": root_identity,
        "record_count": len(entries),
        "generation_ioctl_calls": len(entries),
        "setversion_issued": False,
        "generation_source_sha256": inode_generation.source_sha256(),
        "records": entries,
        "production_runtime_touched": False,
    }
    manifest["manifest_sha256"] = canon(manifest)
    Path(ns.output).write_text(json.dumps(manifest, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")
    emit({
        "marker": CAPTURE,
        "status": "GREEN",
        "record_count": len(entries),
        "generation_ioctl_calls": len(entries),
        "manifest_sha256": manifest["manifest_sha256"],
        "production_runtime_touched": False,
    })
    return 0


def verify_mode(ns: argparse.Namespace) -> int:
    load_control()
    manifest = load_manifest(ns.manifest)
    readonly_flag = getattr(os, "ST_RDONLY", 1)
    if not (os.statvfs(ns.r0_root).f_flag & readonly_flag):
        hold("HOLD_POST_RECOVERY_NOT_READ_ONLY")
    root_fd = open_root(ns.r0_root)
    try:
        if identity(os.fstat(root_fd)) != manifest["r0_root_identity"]:
            hold("HOLD_R0_ROOT_IDENTITY")
        verified = []
        for expected in manifest["records"]:
            observed, _ = observe(root_fd, expected["name"])
            check_expected(observed, expected, require_dev=True)
            verified.append({
                "name": observed["name"],
                "identity": observed["identity"],
                "generation": observed["generation"],
                "generation_identity": observed["generation_identity"],
                "sha256": observed["sha256"],
            })
    finally:
        os.close(root_fd)
    receipt = {
        "marker": POST,
        "status": "GREEN",
        "accepted_v37_head": ACCEPTED_V37,
        "manifest_sha256": manifest["manifest_sha256"],
        "record_count": len(verified),
        "generation_ioctl_calls": len(verified),
        "post_recovery_record_generation_stable": True,
        "records": verified,
        "production_runtime_touched": False,
    }
    receipt["receipt_sha256"] = canon(receipt)
    Path(ns.output).write_text(json.dumps(receipt, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")
    emit(receipt)
    return 0


def mutation_mode(ns: argparse.Namespace) -> int:
    load_control()
    manifest = load_manifest(ns.manifest)
    if not ns.metadata_csum:
        hold("HOLD_METADATA_CSUM_NOT_PROVED")
    readonly_flag = getattr(os, "ST_RDONLY", 1)
    if os.statvfs(ns.r0_root).f_flag & readonly_flag:
        hold("HOLD_MUTATION_CONTROL_READ_ONLY")
    root_fd = open_root(ns.r0_root)
    try:
        if identity(os.fstat(root_fd)) != manifest["r0_root_identity"]:
            hold("HOLD_R0_ROOT_IDENTITY")
        expected = {entry["name"]: entry for entry in manifest["records"]}
        raw = {}
        for name, entry in expected.items():
            observed, body = observe(root_fd, name)
            check_expected(observed, entry, require_dev=True)
            raw[name] = body
        closed = next(name for name in expected if name.endswith(".closed.v2"))
        order = [closed] + sorted(name for name in expected if name != closed)
        controls = []
        for name in order:
            controls.append(replace_exact(
                root_fd,
                expected[name],
                raw[name],
                require_same_inode=(name == closed),
                attempts=ns.reuse_attempts,
            ))
    finally:
        os.close(root_fd)
    if len(controls) != 3 or not all(c["same_uid"] and c["byte_identical"] and c["generation_binding_rejected"] for c in controls):
        hold("HOLD_MUTATION_CONTROL_INCOMPLETE")
    if not all(c["setversion_forgery"]["blocked"] and c["setversion_forgery"]["errno"] == errno.ENOTTY for c in controls):
        hold("HOLD_SETVERSION_CONTROL")
    same_inode = [c for c in controls if c["same_inode_reused"]]
    if not same_inode or not any(c["reject_code"] == "HOLD_RECORD_GENERATION_MISMATCH" and c["generation_changed"] for c in same_inode):
        hold("HOLD_SAME_INODE_GENERATION_CONTROL")
    receipt = {
        "marker": MUTATION,
        "status": "GREEN",
        "accepted_v37_head": ACCEPTED_V37,
        "manifest_sha256": manifest["manifest_sha256"],
        "metadata_csum_proved": True,
        "same_uid_exact_byte_replacement_count": 3,
        "generation_binding_rejection_count": 3,
        "setversion_forgery_attempts": 3,
        "setversion_forgery_blocked_enotty": True,
        "same_inode_reuse_observed": True,
        "same_inode_generation_discriminator_proved": True,
        "controls": controls,
        "arbitrary_same_uid_mutation_proved": False,
        "production_runtime_touched": False,
    }
    receipt["receipt_sha256"] = canon(receipt)
    Path(ns.output).write_text(json.dumps(receipt, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")
    emit(receipt)
    return 0


def load_receipt(path: str, marker: str) -> dict:
    obj = json.loads(Path(path).read_text(encoding="utf-8"))
    digest = obj.pop("receipt_sha256")
    if canon(obj) != digest:
        hold("HOLD_RECEIPT_DIGEST", marker)
    obj["receipt_sha256"] = digest
    if obj.get("marker") != marker or obj.get("status") != "GREEN":
        hold("HOLD_RECEIPT_HEADER", marker)
    return obj


def finalize_mode(ns: argparse.Namespace) -> int:
    control = load_control()
    manifest = load_manifest(ns.manifest)
    post = load_receipt(ns.post_receipt, POST)
    mutation = load_receipt(ns.mutation_receipt, MUTATION)
    v36 = json.loads(Path(ns.v36_receipt).read_text(encoding="utf-8"))
    legacy = json.loads(Path(ns.legacy_receipt).read_text(encoding="utf-8"))
    census = json.loads(Path(ns.pre_restart_census).read_text(encoding="utf-8"))
    pre = census["source_distinct_final_verifier"]

    if post["manifest_sha256"] != manifest["manifest_sha256"] or not post["post_recovery_record_generation_stable"]:
        hold("HOLD_POST_RECOVERY_BINDING")
    if mutation["manifest_sha256"] != manifest["manifest_sha256"]:
        hold("HOLD_MUTATION_MANIFEST")
    if mutation["same_uid_exact_byte_replacement_count"] != 3 or mutation["generation_binding_rejection_count"] != 3:
        hold("HOLD_MUTATION_COUNTS")
    if not mutation["setversion_forgery_blocked_enotty"] or not mutation["same_inode_generation_discriminator_proved"]:
        hold("HOLD_MUTATION_GENERATION_CONTROLS")
    if v36.get("marker") != "VOID_DATANET_V36_SUDDEN_DEVICE_LOSS_SIMULATION_V1_GREEN" or v36.get("status") != "GREEN":
        hold("HOLD_V36_RECOVERY")
    if not v36.get("journal_replay_recovery_completed") or not v36.get("pre_post_final_receipt_equal"):
        hold("HOLD_V36_RECOVERY_INVARIANTS")
    if legacy.get("marker") != "VOID_DATANET_V34_CAMPAIGN_FINAL_VERIFIER_V1_GREEN" or legacy.get("status") != "GREEN":
        hold("HOLD_LEGACY_CONTROL_NOT_GREEN")
    if legacy != pre:
        hold("HOLD_LEGACY_CONTROL_NOT_BYTE_EQUIVALENT")

    out = {
        "marker": FINAL,
        "status": "GREEN",
        "accepted_v37_head": ACCEPTED_V37,
        "accepted_v37_blob_count": len(control["accepted_v37_blobs"]),
        "manifest_sha256": manifest["manifest_sha256"],
        "recovery_record_count": 3,
        "pre_recovery_record_generation_ioctl_calls": manifest["generation_ioctl_calls"],
        "post_recovery_record_generation_ioctl_calls": post["generation_ioctl_calls"],
        "post_recovery_record_generation_stable": True,
        "same_uid_exact_byte_replacement_detection_proved": True,
        "same_inode_reuse_generation_discriminator_proved": True,
        "setversion_forgery_blocked_by_metadata_csum": True,
        "legacy_content_verifier_blind_control_observed": True,
        "legacy_content_verifier_receipt_equal_to_pre_mutation": True,
        "simulated_sudden_device_loss_recovery_preserved": True,
        "accepted_v37_fiemap_provenance_source_pinned": True,
        "physical_power_loss_proved": False,
        "hardware_write_cache_loss_proved": False,
        "arbitrary_same_uid_mutation_proved": False,
        "public_peer_retrieval_proved": False,
        "chain_2050_economic_authority_claimed": False,
        "production_runtime_touched": False,
    }
    out["receipt_sha256"] = canon(out)
    Path(ns.output).write_text(json.dumps(out, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")
    emit(out)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="mode", required=True)
    sub.add_parser("static")

    capture = sub.add_parser("capture")
    capture.add_argument("--r0-root", required=True)
    capture.add_argument("--pre-restart-census", required=True)
    capture.add_argument("--output", required=True)

    verify = sub.add_parser("verify")
    verify.add_argument("--r0-root", required=True)
    verify.add_argument("--manifest", required=True)
    verify.add_argument("--output", required=True)

    mutation = sub.add_parser("mutation-control")
    mutation.add_argument("--r0-root", required=True)
    mutation.add_argument("--manifest", required=True)
    mutation.add_argument("--metadata-csum", action="store_true")
    mutation.add_argument("--reuse-attempts", type=int, default=16384)
    mutation.add_argument("--output", required=True)

    final = sub.add_parser("finalize")
    final.add_argument("--manifest", required=True)
    final.add_argument("--post-receipt", required=True)
    final.add_argument("--mutation-receipt", required=True)
    final.add_argument("--v36-receipt", required=True)
    final.add_argument("--legacy-receipt", required=True)
    final.add_argument("--pre-restart-census", required=True)
    final.add_argument("--output", required=True)

    ns = parser.parse_args()
    if ns.mode == "static":
        return static_mode()
    if ns.mode == "capture":
        return capture_mode(ns)
    if ns.mode == "verify":
        return verify_mode(ns)
    if ns.mode == "mutation-control":
        return mutation_mode(ns)
    return finalize_mode(ns)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except GenerationHold as exc:
        emit({"marker": "VOID_DATANET_V38_HOLD", "status": "HOLD", "reason": exc.code, "detail": exc.detail})
        raise SystemExit(3)
