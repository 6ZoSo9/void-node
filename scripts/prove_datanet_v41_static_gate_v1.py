#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
from __future__ import annotations

import ast
import hashlib
import json
from pathlib import Path
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))

import datanet_v41_fsverity_record_io_v1 as v41_io
import prove_datanet_v40_fsverity_record_immutability_v1 as v40

CONTROL = REPO_ROOT / "fixtures" / "datanet-v41-fsverity-generation-bound-record-composition-ext4-v1.json"
MARKER = "VOID_DATANET_V41_FSVERITY_GENERATION_BOUND_RECORD_COMPOSITION_STATIC_V1_GREEN"
PARENT_HEAD = "9d05c65ce2033d5dbea664674b08a9592262b6b4"


def git_blob_sha1(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def main() -> int:
    cfg = json.loads(CONTROL.read_text(encoding="utf-8"))
    assert cfg["v"] == 1
    assert cfg["format"] == "VOID_DATANET_V41_FSVERITY_GENERATION_BOUND_RECORD_COMPOSITION_EXT4_CONTROL_V1"
    assert cfg["parent_pr"] == 1500
    assert cfg["parent_head"] == PARENT_HEAD

    for group in ("accepted_v40_blobs", "accepted_v39_blobs", "accepted_dependency_blobs"):
        for rel, expected in sorted(cfg[group].items()):
            path = REPO_ROOT / rel
            actual = git_blob_sha1(path.read_bytes())
            assert actual == expected, (group, rel, actual, expected)

    assert cfg["filesystem"] == {
        "type": "ext4",
        "mkfs_feature": "verity",
        "hash_algorithm": "sha256",
        "hash_algorithm_id": 1,
        "verity_block_size": 4096,
        "record_max_bytes": 3072,
    }
    assert cfg["preserved_campaign"] == {
        "durable_sequence": ["ARMED", "CLAIMED", "S1", "CLOSED"],
        "role_lifetimes": 21,
        "helper_lifetimes": 6,
        "total_lifetimes": 27,
        "peak_live": 9,
        "calls": 15372,
        "completed_mib": 960,
    }
    assert cfg["external_syscall_census"] == {
        "ext4_getversion": 17,
        "ext4_setversion": 0,
        "fsverity_enable_success": 3,
        "fsverity_measure_success": 9,
        "fallocate_success": 3,
        "payload_link_success": 3,
        "memfd_create_success": 1,
        "f_add_seals_success": 1,
        "f_get_seals_success": 1,
        "armed_create_only_success": 1,
        "claimed_create_only_success": 1,
        "closed_create_only_success": 1,
        "v39_adapter_execs": 3,
        "v39_link_generation_record_helper_execs": 2,
        "unlink_rename_success": 0,
    }

    claims = cfg["claim"]
    for key in (
        "generation_bound_record_admission_preserved",
        "armed_sealed_after_h0_postpublication_readback",
        "claimed_sealed_after_creator_fd_close_before_payload_allocation",
        "closed_sealed_after_s1_postpublication_readback_before_final_admission",
        "all_three_final_records_require_fsverity_before_final_trust",
        "same_uid_inplace_write_denied_on_rw_mount",
        "same_uid_truncate_denied_on_rw_mount",
        "v39_adapter_and_link_helper_lifetimes_preserved",
        "path_replacement_detected_by_generation_binding",
    ):
        assert claims[key] is True, key
    for key in (
        "topology_growth",
        "path_replacement_prevented_by_fsverity",
        "physical_power_loss",
        "hardware_write_cache_loss",
        "privileged_offline_filesystem_edit_resistance",
        "kernel_compromise_resistance",
        "production_runtime_activation",
    ):
        assert claims[key] is False, key

    assert v41_io.VERITY_BLOCK_SIZE == 4096
    assert v40.FS_VERITY_HASH_ALG_SHA256 == 1
    assert v40.ENABLE_ARG_SIZE == 128
    assert hex(v40.FS_IOC_ENABLE_VERITY) == "0x40806685"
    assert hex(v40.FS_IOC_MEASURE_VERITY) == "0xc0046686"

    sources = [
        "scripts/datanet_v41_fsverity_record_io_v1.py",
        "scripts/prove_datanet_v41_campaign_final_verifier_v1.py",
        "scripts/prove_datanet_v41_durable_recovery_campaign_ext4_v1.py",
        "scripts/prove_datanet_v41_record_replacement_control_v1.py",
        "scripts/prove_datanet_v41_syscall_census_v1.py",
        "scripts/prove_datanet_v41_static_gate_v1.py",
    ]
    for rel in sources:
        ast.parse((REPO_ROOT / rel).read_text(encoding="utf-8"), filename=rel)

    # Reject the abandoned design that would seal/finalize inside the link helper
    # before accepted publisher postpublication readback.
    for forbidden in (
        "scripts/datanet_v41_link_generation_record_helper_v1.py",
        "scripts/datanet_v41_exec_claimant_adapter_support_v1.mjs",
        "scripts/prove_datanet_v41_exec_claimant_adapter_v1.mjs",
    ):
        assert not (REPO_ROOT / forbidden).exists(), forbidden

    print(json.dumps({
        "marker": MARKER,
        "status": "GREEN",
        "parent_head": PARENT_HEAD,
        "accepted_v40_blob_count": len(cfg["accepted_v40_blobs"]),
        "accepted_v39_blob_count": len(cfg["accepted_v39_blobs"]),
        "accepted_dependency_blob_count": len(cfg["accepted_dependency_blobs"]),
        "ext4_getversion_expected": 17,
        "fsverity_enable_success_expected": 3,
        "fsverity_measure_success_expected": 9,
        "total_lifetimes": 27,
        "peak_live": 9,
        "closed_seal_atomic_with_creation": False,
        "closed_sealed_before_final_admission": True,
        "production_runtime_touched": False,
    }, sort_keys=True, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
