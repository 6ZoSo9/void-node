#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))

import datanet_ext4_inode_generation_v1 as inode_generation
import datanet_v32_generation_reducer_v1 as generation_reducer
import datanet_v34_claimant_capability_v1 as claimant_capability
import datanet_v34_exec_claimant_record_v1 as recovery_record
import prove_datanet_v31_campaign_topology_ext4_v1 as v31

SOURCE = Path(__file__).resolve()
V34_FIXTURE = REPO_ROOT / "fixtures" / "datanet-v34-durable-recovery-campaign-ext4-v1.json"
V31_PUBLISHER = SCRIPT_DIR / "prove_datanet_h1_admitted_s0_s1_publication_ext4_v1.mjs"
V32_S1_PUBLISHER = SCRIPT_DIR / "prove_datanet_h1_generation_bound_s1_publication_ext4_v1.mjs"
V33_RECORD = SCRIPT_DIR / "datanet_v33_durable_recovery_record_v1.py"
ADAPTER = SCRIPT_DIR / "prove_datanet_v34_exec_claimant_adapter_v1.mjs"
ADAPTER_SUPPORT = SCRIPT_DIR / "datanet_v34_exec_claimant_adapter_support_v1.mjs"
LINK_HELPER = SCRIPT_DIR / "datanet_v34_link_generation_helper_v1.py"


def sha256_path(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_v34_fixture() -> dict:
    obj = json.loads(V34_FIXTURE.read_text(encoding="utf-8"))
    assert obj["v"] == 1
    assert obj["format"] == "VOID_DATANET_V34_DURABLE_RECOVERY_CAMPAIGN_EXT4_CONTROL_V1"
    assert obj["parent_pr"] == 1493
    assert obj["parent_head"] == "9edfd10721eadc7afb4dd1708f82a11b2df182e7"
    assert obj["durable_sequence"] == ["ARMED", "CLAIMED", "S1", "CLOSED"]
    assert obj["process_topology"]["total_lifetimes"] == 27
    assert obj["process_topology"]["peak_live"] == 9
    assert obj["payload_ledger"]["completed_mib"] == 960
    return obj


def source_bindings(base_fixture: dict) -> dict:
    cfg = load_v34_fixture()
    accepted = {
        "accepted_v31_campaign_supervisor_git_blob_sha1": v31.git_blob_sha1((SCRIPT_DIR / "prove_datanet_v31_campaign_topology_ext4_v1.py").read_bytes()),
        "accepted_v31_publisher_git_blob_sha1": v31.git_blob_sha1(V31_PUBLISHER.read_bytes()),
        "accepted_v32_generation_reducer_git_blob_sha1": v31.git_blob_sha1(Path(generation_reducer.__file__).resolve().read_bytes()),
        "accepted_v32_s1_publisher_git_blob_sha1": v31.git_blob_sha1(V32_S1_PUBLISHER.read_bytes()),
        "accepted_v33_durable_record_git_blob_sha1": v31.git_blob_sha1(V33_RECORD.read_bytes()),
    }
    for key, value in accepted.items():
        assert value == cfg[key], (key, value, cfg[key])
    assert cfg["quota_key"] == base_fixture["quota_key"]
    assert cfg["process_topology"] == base_fixture["process_topology"]
    assert cfg["payload_ledger"] == base_fixture["v31_composed_success_ledger"]
    bindings = dict(v31.source_bindings(base_fixture))
    bindings.update(accepted)
    bindings.update({
        "v34_fixture_sha256": sha256_path(V34_FIXTURE),
        "v34_common_sha256": sha256_path(SOURCE),
        "v34_record_sha256": recovery_record.source_sha256(),
        "v34_claimant_source_sha256": claimant_capability.source_sha256(),
        "v34_link_generation_helper_sha256": sha256_path(LINK_HELPER),
        "v34_exec_claimant_adapter_sha256": sha256_path(ADAPTER),
        "v34_exec_claimant_adapter_support_sha256": sha256_path(ADAPTER_SUPPORT),
        "v32_generation_source_sha256": inode_generation.source_sha256(),
    })
    return bindings


def publication_fixture() -> dict:
    return json.loads(v31.PUBLICATION_FIXTURE.read_text(encoding="utf-8"))


def verified_s0(root_fd: int, binding, fixture: dict, *, retain_fd: bool, armed_expected: bool) -> tuple[dict, int | None]:
    expected = {v31.cap_name(binding.k), v31.slot_name(binding.k, 0)}
    if armed_expected:
        expected.add(recovery_record.armed_name(binding.k))
    assert set(os.listdir(root_fd)) == expected
    generation_reducer.validate_capability_metadata(root_fd, binding)
    read, retained = generation_reducer.full_read_s0(root_fd, binding, fixture, retain_fd=retain_fd)
    assert set(os.listdir(root_fd)) == expected
    generation_reducer.validate_capability_metadata(root_fd, binding)
    assert read["ledger"] == {**fixture["one_classifier_ledger"], "eof_probes": 1}
    result = {
        "root_identity": binding.root_identity,
        "quota_key": binding.k,
        "s0_name": read["s0_name"],
        "s0_identity": read["s0_identity"],
        "s0_generation": read["s0_generation"],
        "s0_generation_identity": read["s0_generation_identity"],
        "s0_generation_receipt": read["s0_generation_receipt"],
        "s0_sha256": read["sha256"],
        "s0_length": fixture["payload_bytes"],
        "payload_bytes": fixture["payload_bytes"],
        "ledger": read["ledger"],
        "reducer_source_sha256": generation_reducer.source_sha256(),
        "inode_generation_source_sha256": inode_generation.source_sha256(),
        "python_executable_sha256": inode_generation.executable_sha256(),
        "schedule_label_input": False,
        "disposable_history_input": False,
    }
    return result, retained


def adapter_env(root: str, binding, lock_fd: int, hold_fd: int, slot: int, action: str) -> tuple[str, dict]:
    node, env = v31.publication_env(root, binding, lock_fd, hold_fd, slot)
    env.update({
        "VOID_V34_ACTION": action,
        "VOID_V34_TARGET_PUBLISHER": str(V32_S1_PUBLISHER if slot == 1 else V31_PUBLISHER),
        "VOID_V34_PYTHON": os.path.realpath(sys.executable),
        "VOID_V34_LINK_GENERATION_HELPER": str(LINK_HELPER),
        "VOID_V34_K": binding.k,
        "VOID_V34_RECORD_SOURCE_SHA256": recovery_record.source_sha256(),
        "VOID_V34_CLAIMANT_SOURCE_SHA256": claimant_capability.source_sha256(),
        "VOID_V34_GENERATION_SOURCE_SHA256": inode_generation.source_sha256(),
        "VOID_V34_ACCEPTED_LINK_PATH": publication_fixture()["link_path"],
    })
    return node, env


def exec_adapter(
    root: str,
    binding,
    lock_fd: int,
    hold_fd: int,
    slot: int,
    action: str,
    *,
    retained_s0_fd: int | None = None,
    verified: dict | None = None,
    capability_fd: int | None = None,
) -> None:
    node, env = adapter_env(root, binding, lock_fd, hold_fd, slot, action)
    if slot == 1:
        assert retained_s0_fd is not None and retained_s0_fd >= 3
        assert verified is not None
        assert capability_fd is not None and capability_fd >= 3
        os.set_inheritable(retained_s0_fd, True)
        os.set_inheritable(capability_fd, True)
        env.update({
            "VOID_DATANET_VERIFIED_S0_FD": str(retained_s0_fd),
            "VOID_DATANET_VERIFIED_S0_IDENTITY": verified["s0_identity"],
            "VOID_DATANET_VERIFIED_S0_GENERATION": str(verified["s0_generation"]),
            "VOID_DATANET_VERIFIED_S0_GENERATION_MODULE_SHA256": verified["inode_generation_source_sha256"],
            "VOID_V34_CLAIM_CAP_FD": str(capability_fd),
        })
    os.execve(node, [node, str(ADAPTER)], env)
    raise AssertionError("execve unexpectedly returned")
