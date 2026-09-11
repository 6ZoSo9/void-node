#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import hashlib
import os
from pathlib import Path
import re
from typing import Any

import datanet_ext4_inode_generation_v1 as inode_generation
import datanet_v34_recovery_record_io_v1 as record_io
import prove_datanet_posix_admission_capability_v1 as admission

SOURCE = Path(__file__).resolve()
SCHEMA_ID = "VOID_DATANET_V34_EXEC_CLAIMANT_RECORD_V1"
ARMED_FORMAT = "VOID_DATANET_RECOVERY_ARMED_V2"
CLAIMED_FORMAT = "VOID_DATANET_RECOVERY_CLAIMED_V2"
CLOSED_FORMAT = "VOID_DATANET_RECOVERY_CLOSED_V2"
CAP_FORMAT = "VOID_DATANET_RECOVERY_CLAIMANT_CAPABILITY_V1"
MAX_MARKER_BYTES = 3072
HEX64 = re.compile(r"^[0-9a-f]{64}$")
IDENTITY = re.compile(r"^[0-9]+:[0-9]+$")
SEALS = 15


class RecoveryHold(Exception):
    def __init__(self, code: str, detail: str = "") -> None:
        super().__init__(f"{code}:{detail}" if detail else code)
        self.code = code
        self.detail = detail


def hold(code: str, detail: str = "") -> None:
    raise RecoveryHold(code, detail)


def source_sha256() -> str:
    h = hashlib.sha256()
    for path in (SOURCE, record_io.SOURCE):
        data = path.read_bytes()
        h.update(len(data).to_bytes(8, "big"))
        h.update(data)
    return h.hexdigest()


def canonical_bytes(obj: dict[str, Any]) -> bytes:
    return record_io.canonical_bytes(obj)


def armed_name(k: str) -> str:
    if HEX64.fullmatch(k) is None:
        hold("HOLD_K_INVALID", k)
    return f".void-datanet-recovery-{k}.armed.v2"


def claimed_name(k: str) -> str:
    return f".void-datanet-recovery-{k}.claimed.v2"


def closed_name(k: str) -> str:
    return f".void-datanet-recovery-{k}.closed.v2"


def slot_name(k: str, slot: int) -> str:
    if slot not in (0, 1):
        hold("HOLD_S2_FORBIDDEN", str(slot))
    return f"datanet-{k}-s{slot}.v1"


def _read_exact(root_fd: int, name: str) -> dict[str, Any] | None:
    return record_io.read_exact(root_fd, name, MAX_MARKER_BYTES, hold)


def create_marker(root_fd: int, name: str, obj: dict[str, Any]) -> dict[str, Any]:
    return record_io.create_marker(root_fd, name, obj, MAX_MARKER_BYTES, hold)


def _common(binding: admission.Binding) -> dict[str, Any]:
    return {
        "root_identity": binding.root_identity,
        "quota_key": binding.k,
        "record_source_sha256": source_sha256(),
        "generation_source_sha256": inode_generation.source_sha256(),
        "schema_id": SCHEMA_ID,
    }


def _expect_binding(obj: dict[str, Any], binding: admission.Binding) -> None:
    if obj.get("root_identity") != binding.root_identity:
        hold("HOLD_RECORD_FOREIGN_ROOT")
    if obj.get("quota_key") != binding.k:
        hold("HOLD_RECORD_FOREIGN_K")
    if obj.get("record_source_sha256") != source_sha256():
        hold("HOLD_RECORD_SOURCE_MISMATCH")
    if obj.get("generation_source_sha256") != inode_generation.source_sha256():
        hold("HOLD_GENERATION_SOURCE_MISMATCH")
    if obj.get("schema_id") != SCHEMA_ID:
        hold("HOLD_RECORD_SCHEMA")


def _normalize_s0(verified_s0: dict[str, Any]) -> dict[str, Any]:
    result = {
        "identity": verified_s0["s0_identity"],
        "generation": int(verified_s0["s0_generation"]),
        "length": int(verified_s0.get("s0_length", verified_s0.get("payload_bytes", 0)) or 0),
        "sha256": verified_s0["s0_sha256"],
    }
    if not result["length"] or IDENTITY.fullmatch(result["identity"]) is None or HEX64.fullmatch(result["sha256"]) is None:
        hold("HOLD_S0_OBSERVATION_INVALID")
    return result


def validate_armed(record: dict[str, Any], binding: admission.Binding, s0: dict[str, Any]) -> None:
    expected = {
        "format", "state", "root_identity", "quota_key", "record_source_sha256",
        "generation_source_sha256", "schema_id", "s0_identity", "s0_generation", "s0_length", "s0_sha256",
    }
    if set(record) != expected or record.get("format") != ARMED_FORMAT or record.get("state") != "ARMED":
        hold("HOLD_ARMED_SCHEMA")
    _expect_binding(record, binding)
    if record["s0_identity"] != s0["identity"] or int(record["s0_generation"]) != s0["generation"]:
        hold("HOLD_ARMED_S0_IDENTITY_MISMATCH")
    if int(record["s0_length"]) != s0["length"] or record["s0_sha256"] != s0["sha256"]:
        hold("HOLD_ARMED_S0_CONTENT_MISMATCH")


def validate_claimed(record: dict[str, Any], binding: admission.Binding, armed_sha256: str) -> None:
    expected = {
        "format", "state", "root_identity", "quota_key", "record_source_sha256", "generation_source_sha256",
        "schema_id", "armed_sha256", "claimant_pid", "claimant_capability_sha256", "claimant_capability_seals",
        "claimant_source_sha256",
    }
    if set(record) != expected or record.get("format") != CLAIMED_FORMAT or record.get("state") != "CLAIMED":
        hold("HOLD_CLAIMED_SCHEMA")
    _expect_binding(record, binding)
    if record.get("armed_sha256") != armed_sha256:
        hold("HOLD_CLAIMED_ARMED_DIGEST_MISMATCH")
    if type(record.get("claimant_pid")) is not int or record["claimant_pid"] <= 0:
        hold("HOLD_CLAIMED_PID")
    if not isinstance(record.get("claimant_capability_sha256"), str) or HEX64.fullmatch(record["claimant_capability_sha256"]) is None:
        hold("HOLD_CLAIMED_CAPABILITY_DIGEST")
    if record.get("claimant_capability_seals") != SEALS:
        hold("HOLD_CLAIMED_CAPABILITY_SEALS")
    if not isinstance(record.get("claimant_source_sha256"), str) or HEX64.fullmatch(record["claimant_source_sha256"]) is None:
        hold("HOLD_CLAIMED_SOURCE_DIGEST")


def validate_closed_recovery(record: dict[str, Any], binding: admission.Binding, armed_sha256: str, claimed_sha256: str, claimed_record: dict[str, Any], s1: dict[str, Any]) -> None:
    expected = {
        "format", "state", "reason", "root_identity", "quota_key", "record_source_sha256", "generation_source_sha256",
        "schema_id", "armed_sha256", "claimed_sha256", "claimant_capability_sha256", "claimant_pid",
        "s1_identity", "s1_generation", "s1_length", "s1_sha256",
    }
    if set(record) != expected or record.get("format") != CLOSED_FORMAT or record.get("state") != "CLOSED" or record.get("reason") != "RECOVERY_H1":
        hold("HOLD_CLOSED_SCHEMA")
    _expect_binding(record, binding)
    if record.get("armed_sha256") != armed_sha256 or record.get("claimed_sha256") != claimed_sha256:
        hold("HOLD_CLOSED_RECORD_DIGEST_MISMATCH")
    if record.get("claimant_pid") != claimed_record.get("claimant_pid") or record.get("claimant_capability_sha256") != claimed_record.get("claimant_capability_sha256"):
        hold("HOLD_CLOSED_CLAIMANT_BINDING_MISMATCH")
    if record.get("s1_identity") != s1["identity"] or int(record.get("s1_generation", -1)) != s1["generation"]:
        hold("HOLD_CLOSED_S1_IDENTITY_MISMATCH")
    if int(record.get("s1_length", -1)) != s1["length"] or record.get("s1_sha256") != s1["sha256"]:
        hold("HOLD_CLOSED_S1_CONTENT_MISMATCH")


def _require_namespace(root_fd: int, binding: admission.Binding) -> set[str]:
    names = set(os.listdir(root_fd))
    allowed = {admission.capability_name(binding.k), slot_name(binding.k, 0), slot_name(binding.k, 1), armed_name(binding.k), claimed_name(binding.k), closed_name(binding.k)}
    unknown = names - allowed
    if unknown:
        hold("HOLD_UNKNOWN_NAMESPACE", ",".join(sorted(unknown)))
    return names


def classify_preverified(root_fd: int, lock_fd: int, binding: admission.Binding, verified_s0: dict[str, Any]) -> dict[str, Any]:
    admission.revalidate(root_fd, lock_fd, binding)
    s0 = _normalize_s0(verified_s0)
    names = _require_namespace(root_fd, binding)
    armed, claimed, closed = (_read_exact(root_fd, name) for name in (armed_name(binding.k), claimed_name(binding.k), closed_name(binding.k)))
    s1_present = slot_name(binding.k, 1) in names
    if armed is None:
        if claimed is not None or closed is not None or s1_present:
            hold("HOLD_RECORD_WITHOUT_ARMED")
        return {"decision": "HOLD_NO_RECOVERY_AUTH", "hold": True, "allow_claim": False, "armed_sha256": None}
    validate_armed(armed["record"], binding, s0)
    if claimed is None and closed is None and not s1_present:
        return {"decision": "AUTHORIZE_CLAIM_H1", "hold": False, "allow_claim": True, "armed_sha256": armed["sha256"]}
    if claimed is not None:
        validate_claimed(claimed["record"], binding, armed["sha256"])
    if claimed is not None and closed is None and not s1_present:
        return {"decision": "HOLD_RECOVERY_ATTEMPT_ALREADY_CONSUMED", "hold": True, "allow_claim": False, "armed_sha256": armed["sha256"], "claimed_sha256": claimed["sha256"]}
    if claimed is not None and closed is not None and s1_present:
        return {"decision": "COMPLETE_RECOVERY_H1", "hold": False, "allow_claim": False, "armed_sha256": armed["sha256"], "claimed_sha256": claimed["sha256"], "closed_sha256": closed["sha256"]}
    return {"decision": "HOLD_DURABLE_RECOVERY_STATE_INCOMPLETE", "hold": True, "allow_claim": False, "armed_sha256": armed["sha256"]}



def read_records(root_fd: int, binding: admission.Binding) -> dict[str, Any]:
    return {kind: _read_exact(root_fd, name) for kind, name in (
        ("armed", armed_name(binding.k)), ("claimed", claimed_name(binding.k)), ("closed", closed_name(binding.k))
    )}
