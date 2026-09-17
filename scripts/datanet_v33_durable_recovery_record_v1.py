#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
import os
from pathlib import Path
import re
import stat
from typing import Any

import datanet_ext4_inode_generation_v1 as inode_generation
import prove_datanet_posix_admission_capability_v1 as admission

SOURCE = Path(__file__).resolve()
SCHEMA_ID = "VOID_DATANET_V33_DURABLE_RECOVERY_RECORD_V1"
ARMED_FORMAT = "VOID_DATANET_RECOVERY_ARMED_V1"
CLAIMED_FORMAT = "VOID_DATANET_RECOVERY_CLAIMED_V1"
CLOSED_FORMAT = "VOID_DATANET_RECOVERY_CLOSED_V1"
MAX_MARKER_BYTES = 2048
HEX64 = re.compile(r"^[0-9a-f]{64}$")
IDENTITY = re.compile(r"^[0-9]+:[0-9]+$")


class RecoveryHold(Exception):
    def __init__(self, code: str, detail: str = "") -> None:
        super().__init__(f"{code}:{detail}" if detail else code)
        self.code = code
        self.detail = detail


@dataclass(frozen=True, slots=True)
class _ClaimantCapability:
    pid: int
    root_identity: str
    lock_identity: str
    quota_key: str
    armed_sha256: str
    claimed_sha256: str
    nonce: bytes


_ACTIVE_CLAIMANTS: dict[bytes, _ClaimantCapability] = {}


def hold(code: str, detail: str = "") -> None:
    raise RecoveryHold(code, detail)


def source_sha256() -> str:
    return hashlib.sha256(SOURCE.read_bytes()).hexdigest()


def canonical_bytes(obj: dict[str, Any]) -> bytes:
    return (json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True) + "\n").encode("ascii")


def digest_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def identity_text(st: os.stat_result) -> str:
    return f"{st.st_dev}:{st.st_ino}"


def marker_prefix(k: str) -> str:
    if HEX64.fullmatch(k) is None:
        hold("HOLD_K_INVALID", k)
    return f".void-datanet-recovery-{k}"


def armed_name(k: str) -> str:
    return marker_prefix(k) + ".armed.v1"


def claimed_name(k: str) -> str:
    return marker_prefix(k) + ".claimed.v1"


def closed_name(k: str) -> str:
    return marker_prefix(k) + ".closed.v1"


def slot_name(k: str, slot: int) -> str:
    if slot not in (0, 1):
        hold("HOLD_S2_FORBIDDEN", str(slot))
    return f"datanet-{k}-s{slot}.v1"


def _strict_object(pairs):
    out = {}
    for key, value in pairs:
        if key in out:
            hold("HOLD_DUPLICATE_JSON_KEY", str(key))
        out[key] = value
    return out


def parse_canonical(raw: bytes) -> dict[str, Any]:
    if not raw or len(raw) > MAX_MARKER_BYTES:
        hold("HOLD_MARKER_SIZE", str(len(raw)))
    try:
        text = raw.decode("ascii")
    except UnicodeDecodeError as exc:
        hold("HOLD_MARKER_NONASCII", str(exc))
    try:
        obj = json.loads(text, object_pairs_hook=_strict_object)
    except RecoveryHold:
        raise
    except Exception as exc:
        hold("HOLD_MARKER_JSON", type(exc).__name__)
    if not isinstance(obj, dict):
        hold("HOLD_MARKER_NOT_OBJECT")
    if canonical_bytes(obj) != raw:
        hold("HOLD_MARKER_NONCANONICAL")
    return obj


def _expect_keys(obj: dict[str, Any], expected: set[str], code: str) -> None:
    if set(obj) != expected:
        hold(code, ",".join(sorted(set(obj) ^ expected)))


def _expect_hex64(value: Any, code: str) -> str:
    if not isinstance(value, str) or HEX64.fullmatch(value) is None:
        hold(code, str(value))
    return value


def _expect_identity(value: Any, code: str) -> str:
    if not isinstance(value, str) or IDENTITY.fullmatch(value) is None:
        hold(code, str(value))
    return value


def _expect_generation(value: Any, code: str) -> int:
    if type(value) is not int or not (0 <= value <= 0xFFFFFFFF):
        hold(code, str(value))
    return value


def _expect_nonnegative(value: Any, code: str) -> int:
    if type(value) is not int or value < 0:
        hold(code, str(value))
    return value


def _read_exact_file(root_fd: int, name: str) -> bytes:
    flags = os.O_RDONLY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        fd = os.open(name, flags, dir_fd=root_fd)
    except FileNotFoundError:
        raise
    try:
        st = os.fstat(fd)
        visible = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        if not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(visible.st_mode):
            hold("HOLD_MARKER_NONREGULAR", name)
        if identity_text(st) != identity_text(visible):
            hold("HOLD_MARKER_PATH_IDENTITY", name)
        if st.st_uid != os.getuid() or st.st_nlink != 1 or stat.S_IMODE(st.st_mode) != 0o600:
            hold("HOLD_MARKER_METADATA", name)
        if not (0 < st.st_size <= MAX_MARKER_BYTES):
            hold("HOLD_MARKER_SIZE", f"{name}:{st.st_size}")
        data = bytearray()
        while len(data) < st.st_size:
            chunk = os.read(fd, st.st_size - len(data))
            if not chunk:
                hold("HOLD_MARKER_SHORT_READ", name)
            data.extend(chunk)
        if os.read(fd, 1) != b"":
            hold("HOLD_MARKER_EXTRA_BYTES", name)
        after = os.fstat(fd)
        before_key = (
            st.st_dev, st.st_ino, st.st_size, st.st_mtime_ns, st.st_ctime_ns,
            stat.S_IMODE(st.st_mode), st.st_nlink,
        )
        after_key = (
            after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_ctime_ns,
            stat.S_IMODE(after.st_mode), after.st_nlink,
        )
        if after_key != before_key:
            hold("HOLD_MARKER_CHANGED_DURING_READ", name)
        return bytes(data)
    finally:
        os.close(fd)


def _write_all(fd: int, data: bytes) -> None:
    offset = 0
    while offset < len(data):
        wrote = os.write(fd, data[offset:])
        if wrote <= 0:
            hold("HOLD_MARKER_WRITE", str(wrote))
        offset += wrote


def create_marker(root_fd: int, name: str, obj: dict[str, Any]) -> dict[str, Any]:
    raw = canonical_bytes(obj)
    if not (0 < len(raw) <= MAX_MARKER_BYTES):
        hold("HOLD_MARKER_SIZE", f"{name}:{len(raw)}")
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        fd = os.open(name, flags, 0o600, dir_fd=root_fd)
    except FileExistsError:
        hold("HOLD_MARKER_ALREADY_EXISTS", name)
    try:
        os.fchmod(fd, 0o600)
        _write_all(fd, raw)
        os.fsync(fd)
    finally:
        os.close(fd)
    os.fsync(root_fd)
    admitted = _read_exact_file(root_fd, name)
    if admitted != raw:
        hold("HOLD_MARKER_READBACK", name)
    return {"name": name, "raw": admitted, "sha256": digest_bytes(admitted), "record": parse_canonical(admitted)}


def verify_leaf(root_fd: int, binding: admission.Binding, fixture: dict[str, Any], slot: int) -> dict[str, Any]:
    name = slot_name(binding.k, slot)
    flags = os.O_RDONLY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        fd = os.open(name, flags, dir_fd=root_fd)
    except FileNotFoundError:
        hold(f"HOLD_S{slot}_MISSING")
    try:
        before = os.fstat(fd)
        visible = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        if not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(visible.st_mode):
            hold(f"HOLD_S{slot}_NONREGULAR")
        if identity_text(before) != identity_text(visible):
            hold(f"HOLD_S{slot}_PATH_IDENTITY")
        if before.st_uid != os.getuid() or before.st_nlink != 1 or stat.S_IMODE(before.st_mode) != 0o600:
            hold(f"HOLD_S{slot}_METADATA")
        if before.st_size != fixture["payload_bytes"]:
            hold(f"HOLD_S{slot}_SIZE", str(before.st_size))
        if before.st_blocks * 512 < fixture["payload_bytes"]:
            hold(f"HOLD_S{slot}_NOT_FULLY_ALLOCATED", str(before.st_blocks * 512))
        fp = (
            before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns, before.st_ctime_ns,
            stat.S_IMODE(before.st_mode), before.st_nlink,
        )
        h = hashlib.sha256()
        calls = 0
        returned = 0
        block = fixture["io_block_bytes"]
        for offset in range(0, fixture["payload_bytes"], block):
            data = os.pread(fd, block, offset)
            calls += 1
            returned += len(data)
            if len(data) != block:
                hold(f"HOLD_S{slot}_SHORT_READ", f"{offset}:{len(data)}")
            h.update(data)
        calls += 1
        if os.pread(fd, 1, fixture["payload_bytes"]) != b"":
            hold(f"HOLD_S{slot}_EXTRA_BYTE")
        if h.hexdigest() != fixture["payload_sha256"]:
            hold(f"HOLD_S{slot}_HASH", h.hexdigest())
        generation_receipt = inode_generation.observe_ext4_inode_generation_v1(fd)
        if generation_receipt["ioctl_calls"] != 1 or generation_receipt["setversion_issued"] is not False:
            hold(f"HOLD_S{slot}_GENERATION_RECEIPT")
        after = os.fstat(fd)
        visible_after = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        for current in (after, visible_after):
            key = (
                current.st_dev, current.st_ino, current.st_size, current.st_mtime_ns, current.st_ctime_ns,
                stat.S_IMODE(current.st_mode), current.st_nlink,
            )
            if key != fp:
                hold(f"HOLD_S{slot}_CHANGED_DURING_VERIFY")
        return {
            "name": name,
            "identity": identity_text(before),
            "generation": generation_receipt["generation"],
            "generation_identity": f"{identity_text(before)}:{generation_receipt['generation']}",
            "length": before.st_size,
            "sha256": h.hexdigest(),
            "read_calls": calls,
            "read_returned_bytes": returned,
            "generation_receipt": generation_receipt,
        }
    finally:
        os.close(fd)


def _record_common(binding: admission.Binding) -> dict[str, Any]:
    return {
        "root_identity": binding.root_identity,
        "quota_key": binding.k,
        "record_source_sha256": source_sha256(),
        "generation_source_sha256": inode_generation.source_sha256(),
        "schema_id": SCHEMA_ID,
    }


def make_armed(binding: admission.Binding, s0: dict[str, Any]) -> dict[str, Any]:
    return {
        "format": ARMED_FORMAT,
        "state": "ARMED",
        **_record_common(binding),
        "s0_identity": s0["identity"],
        "s0_generation": s0["generation"],
        "s0_length": s0["length"],
        "s0_sha256": s0["sha256"],
    }


def validate_armed(obj: dict[str, Any], binding: admission.Binding, s0: dict[str, Any]) -> None:
    expected = {
        "format", "state", "root_identity", "quota_key", "record_source_sha256",
        "generation_source_sha256", "schema_id", "s0_identity", "s0_generation",
        "s0_length", "s0_sha256",
    }
    _expect_keys(obj, expected, "HOLD_ARMED_KEYS")
    if obj["format"] != ARMED_FORMAT or obj["state"] != "ARMED" or obj["schema_id"] != SCHEMA_ID:
        hold("HOLD_ARMED_SCHEMA")
    if _expect_identity(obj["root_identity"], "HOLD_ARMED_ROOT") != binding.root_identity:
        hold("HOLD_ARMED_FOREIGN_ROOT")
    if _expect_hex64(obj["quota_key"], "HOLD_ARMED_K") != binding.k:
        hold("HOLD_ARMED_FOREIGN_K")
    if _expect_hex64(obj["record_source_sha256"], "HOLD_ARMED_SOURCE") != source_sha256():
        hold("HOLD_ARMED_SOURCE_MISMATCH")
    if _expect_hex64(obj["generation_source_sha256"], "HOLD_ARMED_GENERATION_SOURCE") != inode_generation.source_sha256():
        hold("HOLD_ARMED_GENERATION_SOURCE_MISMATCH")
    if _expect_identity(obj["s0_identity"], "HOLD_ARMED_S0_IDENTITY") != s0["identity"]:
        hold("HOLD_ARMED_S0_IDENTITY_MISMATCH")
    if _expect_generation(obj["s0_generation"], "HOLD_ARMED_S0_GENERATION") != s0["generation"]:
        hold("HOLD_ARMED_S0_GENERATION_MISMATCH")
    if _expect_nonnegative(obj["s0_length"], "HOLD_ARMED_S0_LENGTH") != s0["length"]:
        hold("HOLD_ARMED_S0_LENGTH_MISMATCH")
    if _expect_hex64(obj["s0_sha256"], "HOLD_ARMED_S0_HASH") != s0["sha256"]:
        hold("HOLD_ARMED_S0_HASH_MISMATCH")


def make_claimed(binding: admission.Binding, armed_sha256: str) -> dict[str, Any]:
    return {
        "format": CLAIMED_FORMAT,
        "state": "CLAIMED",
        **_record_common(binding),
        "armed_sha256": armed_sha256,
    }


def validate_claimed(obj: dict[str, Any], binding: admission.Binding, armed_sha256: str) -> None:
    expected = {
        "format", "state", "root_identity", "quota_key", "record_source_sha256",
        "generation_source_sha256", "schema_id", "armed_sha256",
    }
    _expect_keys(obj, expected, "HOLD_CLAIMED_KEYS")
    if obj["format"] != CLAIMED_FORMAT or obj["state"] != "CLAIMED" or obj["schema_id"] != SCHEMA_ID:
        hold("HOLD_CLAIMED_SCHEMA")
    if _expect_identity(obj["root_identity"], "HOLD_CLAIMED_ROOT") != binding.root_identity:
        hold("HOLD_CLAIMED_FOREIGN_ROOT")
    if _expect_hex64(obj["quota_key"], "HOLD_CLAIMED_K") != binding.k:
        hold("HOLD_CLAIMED_FOREIGN_K")
    if _expect_hex64(obj["record_source_sha256"], "HOLD_CLAIMED_SOURCE") != source_sha256():
        hold("HOLD_CLAIMED_SOURCE_MISMATCH")
    if _expect_hex64(obj["generation_source_sha256"], "HOLD_CLAIMED_GENERATION_SOURCE") != inode_generation.source_sha256():
        hold("HOLD_CLAIMED_GENERATION_SOURCE_MISMATCH")
    if _expect_hex64(obj["armed_sha256"], "HOLD_CLAIMED_ARMED_DIGEST") != armed_sha256:
        hold("HOLD_CLAIMED_ARMED_DIGEST_MISMATCH")


def make_closed_ordinary(binding: admission.Binding, armed_sha256: str) -> dict[str, Any]:
    return {
        "format": CLOSED_FORMAT,
        "state": "CLOSED",
        "reason": "ORDINARY_H0",
        **_record_common(binding),
        "armed_sha256": armed_sha256,
    }


def make_closed_recovery(binding: admission.Binding, armed_sha256: str, claimed_sha256: str, s1: dict[str, Any]) -> dict[str, Any]:
    return {
        "format": CLOSED_FORMAT,
        "state": "CLOSED",
        "reason": "RECOVERY_H1",
        **_record_common(binding),
        "armed_sha256": armed_sha256,
        "claimed_sha256": claimed_sha256,
        "s1_identity": s1["identity"],
        "s1_generation": s1["generation"],
        "s1_length": s1["length"],
        "s1_sha256": s1["sha256"],
    }


def validate_closed(obj: dict[str, Any], binding: admission.Binding, armed_sha256: str, claimed_sha256: str | None, s1: dict[str, Any] | None) -> str:
    reason = obj.get("reason")
    common = {
        "format", "state", "reason", "root_identity", "quota_key", "record_source_sha256",
        "generation_source_sha256", "schema_id", "armed_sha256",
    }
    if reason == "ORDINARY_H0":
        _expect_keys(obj, common, "HOLD_CLOSED_KEYS")
    elif reason == "RECOVERY_H1":
        _expect_keys(obj, common | {"claimed_sha256", "s1_identity", "s1_generation", "s1_length", "s1_sha256"}, "HOLD_CLOSED_KEYS")
    else:
        hold("HOLD_CLOSED_REASON", str(reason))
    if obj["format"] != CLOSED_FORMAT or obj["state"] != "CLOSED" or obj["schema_id"] != SCHEMA_ID:
        hold("HOLD_CLOSED_SCHEMA")
    if _expect_identity(obj["root_identity"], "HOLD_CLOSED_ROOT") != binding.root_identity:
        hold("HOLD_CLOSED_FOREIGN_ROOT")
    if _expect_hex64(obj["quota_key"], "HOLD_CLOSED_K") != binding.k:
        hold("HOLD_CLOSED_FOREIGN_K")
    if _expect_hex64(obj["record_source_sha256"], "HOLD_CLOSED_SOURCE") != source_sha256():
        hold("HOLD_CLOSED_SOURCE_MISMATCH")
    if _expect_hex64(obj["generation_source_sha256"], "HOLD_CLOSED_GENERATION_SOURCE") != inode_generation.source_sha256():
        hold("HOLD_CLOSED_GENERATION_SOURCE_MISMATCH")
    if _expect_hex64(obj["armed_sha256"], "HOLD_CLOSED_ARMED_DIGEST") != armed_sha256:
        hold("HOLD_CLOSED_ARMED_DIGEST_MISMATCH")
    if reason == "ORDINARY_H0":
        if claimed_sha256 is not None or s1 is not None:
            hold("HOLD_ORDINARY_CLOSE_CONTRADICTION")
    else:
        if claimed_sha256 is None or s1 is None:
            hold("HOLD_RECOVERY_CLOSE_INCOMPLETE")
        if _expect_hex64(obj["claimed_sha256"], "HOLD_CLOSED_CLAIMED_DIGEST") != claimed_sha256:
            hold("HOLD_CLOSED_CLAIMED_DIGEST_MISMATCH")
        if _expect_identity(obj["s1_identity"], "HOLD_CLOSED_S1_IDENTITY") != s1["identity"]:
            hold("HOLD_CLOSED_S1_IDENTITY_MISMATCH")
        if _expect_generation(obj["s1_generation"], "HOLD_CLOSED_S1_GENERATION") != s1["generation"]:
            hold("HOLD_CLOSED_S1_GENERATION_MISMATCH")
        if _expect_nonnegative(obj["s1_length"], "HOLD_CLOSED_S1_LENGTH") != s1["length"]:
            hold("HOLD_CLOSED_S1_LENGTH_MISMATCH")
        if _expect_hex64(obj["s1_sha256"], "HOLD_CLOSED_S1_HASH") != s1["sha256"]:
            hold("HOLD_CLOSED_S1_HASH_MISMATCH")
    return reason


def _read_optional_marker(root_fd: int, name: str) -> dict[str, Any] | None:
    try:
        raw = _read_exact_file(root_fd, name)
    except FileNotFoundError:
        return None
    return {"raw": raw, "sha256": digest_bytes(raw), "record": parse_canonical(raw)}


def _namespace(root_fd: int, binding: admission.Binding) -> set[str]:
    names = set(os.listdir(root_fd))
    allowed = {
        admission.capability_name(binding.k),
        slot_name(binding.k, 0),
        slot_name(binding.k, 1),
        armed_name(binding.k),
        claimed_name(binding.k),
        closed_name(binding.k),
    }
    unknown = names - allowed
    if unknown:
        hold("HOLD_UNKNOWN_NAMESPACE", ",".join(sorted(unknown)))
    return names


def _decision(decision: str, *, s0: dict[str, Any], s1: dict[str, Any] | None, armed: dict[str, Any] | None, claimed: dict[str, Any] | None, closed: dict[str, Any] | None) -> dict[str, Any]:
    return {
        "decision": decision,
        "hold": decision not in ("AUTHORIZE_CLAIM_H1", "COMPLETE_RECOVERY_H1"),
        "allow_claim": decision == "AUTHORIZE_CLAIM_H1",
        "allow_payload_allocation": False,
        "s0_generation_identity": s0["generation_identity"],
        "s1_generation_identity": None if s1 is None else s1["generation_identity"],
        "armed_sha256": None if armed is None else armed["sha256"],
        "claimed_sha256": None if claimed is None else claimed["sha256"],
        "closed_sha256": None if closed is None else closed["sha256"],
        "schedule_label_input": False,
        "campaign_input": False,
        "attempt_input": False,
        "peer_input": False,
        "path_identity_input": False,
    }


def reduce_runtime(root_fd: int, lock_fd: int, binding: admission.Binding, fixture: dict[str, Any], *, requested_slot: int = 1) -> dict[str, Any]:
    try:
        if requested_slot != 1:
            hold("HOLD_S2_FORBIDDEN", str(requested_slot))
        admission.revalidate(root_fd, lock_fd, binding)
        names = _namespace(root_fd, binding)
        s0 = verify_leaf(root_fd, binding, fixture, 0)
        armed = _read_optional_marker(root_fd, armed_name(binding.k))
        claimed = _read_optional_marker(root_fd, claimed_name(binding.k))
        closed = _read_optional_marker(root_fd, closed_name(binding.k))
        s1_present = slot_name(binding.k, 1) in names
        s1 = verify_leaf(root_fd, binding, fixture, 1) if s1_present else None

        if armed is None:
            if claimed is not None or closed is not None:
                hold("HOLD_RECORD_WITHOUT_ARMED")
            if s1 is not None:
                hold("HOLD_CAPACITY_FULL_WITHOUT_ARMED")
            return _decision("HOLD_NO_RECOVERY_AUTH", s0=s0, s1=None, armed=None, claimed=None, closed=None)

        validate_armed(armed["record"], binding, s0)
        armed_sha = armed["sha256"]
        if claimed is not None:
            validate_claimed(claimed["record"], binding, armed_sha)
        claimed_sha = claimed["sha256"] if claimed is not None else None

        closed_reason = None
        if closed is not None:
            closed_reason = validate_closed(closed["record"], binding, armed_sha, claimed_sha, s1)

        if s1 is not None:
            if closed_reason == "RECOVERY_H1":
                return _decision("COMPLETE_RECOVERY_H1", s0=s0, s1=s1, armed=armed, claimed=claimed, closed=closed)
            if closed is None and claimed is not None:
                return _decision("HOLD_S1_DURABLE_RECOVERY_CLOSE_INCOMPLETE", s0=s0, s1=s1, armed=armed, claimed=claimed, closed=None)
            hold("HOLD_CAPACITY_FULL_CONTRADICTORY_RECORD")

        if closed_reason == "ORDINARY_H0":
            if claimed is not None:
                hold("HOLD_ORDINARY_CLOSE_WITH_CLAIM")
            return _decision("HOLD_ORDINARY_H0", s0=s0, s1=None, armed=armed, claimed=None, closed=closed)
        if closed is not None:
            hold("HOLD_CLOSED_WITHOUT_S1")
        if claimed is not None:
            return _decision("HOLD_RECOVERY_ATTEMPT_ALREADY_CONSUMED", s0=s0, s1=None, armed=armed, claimed=claimed, closed=None)
        return _decision("AUTHORIZE_CLAIM_H1", s0=s0, s1=None, armed=armed, claimed=None, closed=None)
    except RecoveryHold as exc:
        return {
            "decision": exc.code,
            "hold": True,
            "allow_claim": False,
            "allow_payload_allocation": False,
            "detail": exc.detail,
            "schedule_label_input": False,
            "campaign_input": False,
            "attempt_input": False,
            "peer_input": False,
            "path_identity_input": False,
        }


def arm_recovery(root_fd: int, lock_fd: int, binding: admission.Binding, fixture: dict[str, Any]) -> dict[str, Any]:
    admission.revalidate(root_fd, lock_fd, binding)
    names = _namespace(root_fd, binding)
    if armed_name(binding.k) in names or claimed_name(binding.k) in names or closed_name(binding.k) in names:
        hold("HOLD_ARM_RECORD_ALREADY_PRESENT")
    if slot_name(binding.k, 1) in names:
        hold("HOLD_ARM_S1_ALREADY_PRESENT")
    s0 = verify_leaf(root_fd, binding, fixture, 0)
    marker = create_marker(root_fd, armed_name(binding.k), make_armed(binding, s0))
    validate_armed(marker["record"], binding, s0)
    return {**marker, "s0": s0}


def close_ordinary(root_fd: int, lock_fd: int, binding: admission.Binding, fixture: dict[str, Any]) -> dict[str, Any]:
    admission.revalidate(root_fd, lock_fd, binding)
    names = _namespace(root_fd, binding)
    if claimed_name(binding.k) in names or slot_name(binding.k, 1) in names:
        hold("HOLD_ORDINARY_CLOSE_AFTER_RECOVERY")
    armed = _read_optional_marker(root_fd, armed_name(binding.k))
    if armed is None:
        hold("HOLD_ORDINARY_CLOSE_WITHOUT_ARMED")
    s0 = verify_leaf(root_fd, binding, fixture, 0)
    validate_armed(armed["record"], binding, s0)
    marker = create_marker(root_fd, closed_name(binding.k), make_closed_ordinary(binding, armed["sha256"]))
    validate_closed(marker["record"], binding, armed["sha256"], None, None)
    return marker


def _register_claimant(binding: admission.Binding, armed_sha256: str, claimed_sha256: str) -> _ClaimantCapability:
    nonce = os.urandom(32)
    while nonce in _ACTIVE_CLAIMANTS:
        nonce = os.urandom(32)
    cap = _ClaimantCapability(
        pid=os.getpid(),
        root_identity=binding.root_identity,
        lock_identity=binding.lock_identity,
        quota_key=binding.k,
        armed_sha256=armed_sha256,
        claimed_sha256=claimed_sha256,
        nonce=nonce,
    )
    _ACTIVE_CLAIMANTS[nonce] = cap
    return cap


def _require_claimant(capability: object, binding: admission.Binding, armed_sha256: str, claimed_sha256: str) -> _ClaimantCapability:
    if not isinstance(capability, _ClaimantCapability):
        hold("HOLD_RECOVERY_CLOSE_CLAIMANT_CAPABILITY_INVALID")
    active = _ACTIVE_CLAIMANTS.get(capability.nonce)
    if active is not capability:
        hold("HOLD_RECOVERY_CLOSE_CLAIMANT_CAPABILITY_INACTIVE")
    if capability.pid != os.getpid():
        hold("HOLD_RECOVERY_CLOSE_CLAIMANT_PROCESS_MISMATCH")
    if (
        capability.root_identity != binding.root_identity
        or capability.lock_identity != binding.lock_identity
        or capability.quota_key != binding.k
        or capability.armed_sha256 != armed_sha256
        or capability.claimed_sha256 != claimed_sha256
    ):
        hold("HOLD_RECOVERY_CLOSE_CLAIMANT_BINDING_MISMATCH")
    return capability


def claim_h1(root_fd: int, lock_fd: int, binding: admission.Binding, fixture: dict[str, Any], classification: dict[str, Any]) -> dict[str, Any]:
    if classification.get("decision") != "AUTHORIZE_CLAIM_H1" or classification.get("allow_claim") is not True:
        hold("HOLD_CLAIM_NOT_AUTHORIZED", str(classification.get("decision")))
    admission.revalidate(root_fd, lock_fd, binding)
    names = _namespace(root_fd, binding)
    if slot_name(binding.k, 1) in names or claimed_name(binding.k) in names or closed_name(binding.k) in names:
        hold("HOLD_CLAIM_NAMESPACE_CHANGED")
    armed = _read_optional_marker(root_fd, armed_name(binding.k))
    if armed is None or armed["sha256"] != classification.get("armed_sha256"):
        hold("HOLD_CLAIM_ARMED_CHANGED")
    s0 = verify_leaf(root_fd, binding, fixture, 0)
    validate_armed(armed["record"], binding, s0)
    marker = create_marker(root_fd, claimed_name(binding.k), make_claimed(binding, armed["sha256"]))
    validate_claimed(marker["record"], binding, armed["sha256"])
    admission.revalidate(root_fd, lock_fd, binding)
    if slot_name(binding.k, 1) in set(os.listdir(root_fd)):
        hold("HOLD_CLAIM_S1_APPEARED")
    claimant_capability = _register_claimant(binding, armed["sha256"], marker["sha256"])
    return {
        **marker,
        "decision": "AUTHORIZE_H1_AFTER_CLAIM",
        "allow_payload_allocation": True,
        "s0_generation_identity": s0["generation_identity"],
        "_claimant_capability": claimant_capability,
    }


def close_recovery(
    root_fd: int,
    lock_fd: int,
    binding: admission.Binding,
    fixture: dict[str, Any],
    claimant_capability: object,
) -> dict[str, Any]:
    admission.revalidate(root_fd, lock_fd, binding)
    armed = _read_optional_marker(root_fd, armed_name(binding.k))
    claimed = _read_optional_marker(root_fd, claimed_name(binding.k))
    if armed is None or claimed is None:
        hold("HOLD_RECOVERY_CLOSE_RECORD_INCOMPLETE")
    capability = _require_claimant(claimant_capability, binding, armed["sha256"], claimed["sha256"])
    s0 = verify_leaf(root_fd, binding, fixture, 0)
    validate_armed(armed["record"], binding, s0)
    validate_claimed(claimed["record"], binding, armed["sha256"])
    s1 = verify_leaf(root_fd, binding, fixture, 1)
    marker = create_marker(
        root_fd,
        closed_name(binding.k),
        make_closed_recovery(binding, armed["sha256"], claimed["sha256"], s1),
    )
    validate_closed(marker["record"], binding, armed["sha256"], claimed["sha256"], s1)
    _ACTIVE_CLAIMANTS.pop(capability.nonce, None)
    return {**marker, "s1": s1, "closed_by_original_claimant_pid": os.getpid()}
