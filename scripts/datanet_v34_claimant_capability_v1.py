#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import fcntl
import hashlib
import os
from pathlib import Path
from typing import Any

import datanet_ext4_inode_generation_v1 as inode_generation
import datanet_v34_exec_claimant_record_v1 as record
import datanet_v34_recovery_record_io_v1 as record_io

SOURCE = Path(__file__).resolve()
MAX_CAP_BYTES = 4096
SEALS = fcntl.F_SEAL_WRITE | fcntl.F_SEAL_GROW | fcntl.F_SEAL_SHRINK | fcntl.F_SEAL_SEAL


def source_sha256() -> str:
    return hashlib.sha256(SOURCE.read_bytes()).hexdigest()


def _sealed_capability(binding, armed_sha256: str, s0: dict[str, Any]) -> tuple[int, bytes, str]:
    if not hasattr(os, "memfd_create"):
        record.hold("HOLD_MEMFD_UNAVAILABLE")
    cap = {
        "format": record.CAP_FORMAT,
        "pid": os.getpid(),
        "root_identity": binding.root_identity,
        "lock_identity": binding.lock_identity,
        "quota_key": binding.k,
        "armed_sha256": armed_sha256,
        "s0_identity": s0["identity"],
        "s0_generation": s0["generation"],
        "record_source_sha256": record.source_sha256(),
        "claimant_source_sha256": source_sha256(),
        "nonce_hex": os.urandom(32).hex(),
    }
    raw = record.canonical_bytes(cap)
    if len(raw) > MAX_CAP_BYTES:
        record.hold("HOLD_CAPABILITY_SIZE")
    fd = os.memfd_create("void-v34-claimant", os.MFD_ALLOW_SEALING | os.MFD_CLOEXEC)
    try:
        record_io.write_all(fd, raw, record.hold)
        os.lseek(fd, 0, os.SEEK_SET)
        fcntl.fcntl(fd, fcntl.F_ADD_SEALS, SEALS)
        if fcntl.fcntl(fd, fcntl.F_GET_SEALS) != SEALS:
            record.hold("HOLD_CAPABILITY_SEAL_MISMATCH")
        os.set_inheritable(fd, True)
        return fd, raw, record_io.digest(raw)
    except Exception:
        os.close(fd)
        raise


def claim_h1(root_fd: int, lock_fd: int, binding, verified_s0: dict[str, Any], classification: dict[str, Any]) -> dict[str, Any]:
    if classification.get("decision") != "AUTHORIZE_CLAIM_H1" or classification.get("allow_claim") is not True:
        record.hold("HOLD_CLAIM_NOT_AUTHORIZED", str(classification.get("decision")))
    record.admission.revalidate(root_fd, lock_fd, binding)
    s0 = record._normalize_s0(verified_s0)
    records = record.read_records(root_fd, binding)
    armed = records["armed"]
    if armed is None or armed["sha256"] != classification.get("armed_sha256"):
        record.hold("HOLD_CLAIM_ARMED_CHANGED")
    record.validate_armed(armed["record"], binding, s0)
    names = record._require_namespace(root_fd, binding)
    if any(name in names for name in (record.claimed_name(binding.k), record.closed_name(binding.k), record.slot_name(binding.k, 1))):
        record.hold("HOLD_CLAIM_NAMESPACE_CHANGED")
    cap_fd, cap_raw, cap_sha256 = _sealed_capability(binding, armed["sha256"], s0)
    try:
        claimed = record.create_marker(root_fd, record.claimed_name(binding.k), {
            "format": record.CLAIMED_FORMAT,
            "state": "CLAIMED",
            "root_identity": binding.root_identity,
            "quota_key": binding.k,
            "record_source_sha256": record.source_sha256(),
            "generation_source_sha256": inode_generation.source_sha256(),
            "schema_id": record.SCHEMA_ID,
            "armed_sha256": armed["sha256"],
            "claimant_pid": os.getpid(),
            "claimant_capability_sha256": cap_sha256,
            "claimant_capability_seals": SEALS,
            "claimant_source_sha256": source_sha256(),
        })
        record.validate_claimed(claimed["record"], binding, armed["sha256"])
        record.admission.revalidate(root_fd, lock_fd, binding)
        return {
            "decision": "AUTHORIZE_H1_AFTER_CLAIM",
            "allow_payload_allocation": True,
            "armed_sha256": armed["sha256"],
            "claimed_sha256": claimed["sha256"],
            "claimant_capability_fd": cap_fd,
            "claimant_capability_sha256": cap_sha256,
            "claimant_capability_bytes": len(cap_raw),
            "claimant_capability_seals": SEALS,
            "claimant_source_sha256": source_sha256(),
            "claimant_pid": os.getpid(),
        }
    except Exception:
        os.close(cap_fd)
        raise
