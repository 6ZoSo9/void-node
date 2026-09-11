#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import json
import os
from pathlib import Path
import stat
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

import datanet_ext4_inode_generation_v1 as inode_generation
import datanet_v32_generation_reducer_v1 as generation_reducer
import datanet_v34_campaign_common_v1 as common
import datanet_v34_claimant_capability_v1 as claimant_capability
import datanet_v34_exec_claimant_record_v1 as recovery_record
import prove_datanet_v31_campaign_topology_ext4_v1 as v31

CLASSIFIER_MARKER = "VOID_DATANET_V34_STATE_CLASSIFIER_V1_GREEN"
COLLECTOR_MARKER = "VOID_DATANET_V34_CHECKPOINT_COLLECTOR_V1_GREEN"


def contender_mode(ns) -> int:
    fixture = v31.load_fixture()
    common.source_bindings(fixture)
    binding = v31.parse_binding(ns)
    root_fd = lock_fd = retained_s0_fd = cap_fd = -1
    locked = False
    try:
        root_fd, lock_fd = v31.admission.open_bound(ns.root, binding)
        os.write(ns.ready_fd, b"R")
        assert os.read(ns.start_fd, 1) == b"G"
        if not v31.admission.acquire(lock_fd):
            os.write(ns.event_fd, (json.dumps({"pid": os.getpid(), "status": "busy"}, separators=(",", ":")) + "\n").encode())
            return 0
        locked = True
        v31.admission.revalidate(root_fd, lock_fd, binding)
        os.write(ns.event_fd, (json.dumps({"pid": os.getpid(), "status": "acquired"}, separators=(",", ":")) + "\n").encode())
        assert os.read(ns.gate_fd, 1) == b"G"
        verified = None
        if ns.slot == 1:
            verified, retained_s0_fd = common.verified_s0(root_fd, binding, fixture, retain_fd=True, armed_expected=True)
            assert ns.expected_s0_identity is not None and ns.expected_s0_generation is not None
            assert verified["s0_identity"] == ns.expected_s0_identity
            assert verified["s0_generation"] == ns.expected_s0_generation
            classification = recovery_record.classify_preverified(root_fd, lock_fd, binding, verified)
            assert classification["decision"] == "AUTHORIZE_CLAIM_H1"
            claim = claimant_capability.claim_h1(root_fd, lock_fd, binding, verified, classification)
            cap_fd = claim["claimant_capability_fd"]
            prior = {
                **verified,
                "decision": claim["decision"],
                "allow_payload_allocation": claim["allow_payload_allocation"],
                "armed_sha256": claim["armed_sha256"],
                "claimed_sha256": claim["claimed_sha256"],
                "claimant_capability_sha256": claim["claimant_capability_sha256"],
                "claimant_capability_seals": claim["claimant_capability_seals"],
                "claimant_source_sha256": claim["claimant_source_sha256"],
                "claimant_pid": claim["claimant_pid"],
                "claim_created_before_payload_allocation": True,
            }
            os.write(ns.prior_fd, (json.dumps(prior, sort_keys=True, separators=(",", ":")) + "\n").encode())
        for fd in (ns.ready_fd, ns.start_fd, ns.event_fd, ns.gate_fd, ns.prior_fd):
            v31.close_quiet(fd)
        v31.close_quiet(root_fd)
        root_fd = -1
        if ns.slot == 0:
            common.exec_adapter(ns.root, binding, lock_fd, ns.hold_fd, 0, "e0")
        common.exec_adapter(
            ns.root, binding, lock_fd, ns.hold_fd, 1, "close-s1",
            retained_s0_fd=retained_s0_fd, verified=verified, capability_fd=cap_fd,
        )
        return 99
    finally:
        if locked and lock_fd >= 0:
            try:
                v31.admission.unlock(lock_fd)
            except OSError:
                pass
        for fd in (cap_fd, retained_s0_fd, lock_fd, root_fd):
            v31.close_quiet(fd)


def publisher_mode(ns) -> int:
    fixture = v31.load_fixture()
    common.source_bindings(fixture)
    binding = v31.parse_binding(ns)
    root_fd = lock_fd = -1
    locked = False
    try:
        root_fd, lock_fd = v31.admission.open_bound(ns.root, binding)
        assert v31.admission.acquire(lock_fd)
        locked = True
        v31.admission.revalidate(root_fd, lock_fd, binding)
        v31.close_quiet(root_fd)
        root_fd = -1
        common.exec_adapter(ns.root, binding, lock_fd, ns.hold_fd, 0, "arm-h0")
        return 99
    finally:
        if locked and lock_fd >= 0:
            try:
                v31.admission.unlock(lock_fd)
            except OSError:
                pass
        v31.close_quiet(lock_fd)
        v31.close_quiet(root_fd)


def classifier_mode(ns) -> int:
    fixture = v31.load_fixture()
    common.source_bindings(fixture)
    binding = v31.parse_binding(ns)
    root_fd, lock_fd = v31.admission.open_bound(ns.root, binding)
    try:
        verified, retained = common.verified_s0(root_fd, binding, fixture, retain_fd=False, armed_expected=False)
        assert retained is None
        decision = recovery_record.classify_preverified(root_fd, lock_fd, binding, verified)
        assert decision["decision"] == "HOLD_NO_RECOVERY_AUTH"
        v31.emit({"marker": CLASSIFIER_MARKER, "status": "GREEN", "pid": os.getpid(), **verified, **decision})
        return 0
    finally:
        os.close(lock_fd)
        os.close(root_fd)


def collector_mode(ns) -> int:
    fixture = v31.load_fixture()
    common.source_bindings(fixture)
    binding = v31.parse_binding(ns)
    root_fd, lock_fd = v31.admission.open_bound(ns.root, binding)
    try:
        assert v31.admission.acquire(lock_fd) is False
        expected = {v31.cap_name(binding.k), v31.slot_name(binding.k, 0), recovery_record.armed_name(binding.k)}
        assert set(os.listdir(root_fd)) == expected
        visible = os.stat(v31.slot_name(binding.k, 0), dir_fd=root_fd, follow_symlinks=False)
        assert stat.S_ISREG(visible.st_mode) and generation_reducer.identity(visible) == ns.expected_s0_identity
        assert visible.st_uid == os.getuid() and visible.st_nlink == 1 and stat.S_IMODE(visible.st_mode) == 0o600
        assert visible.st_size == fixture["payload_bytes"] and visible.st_blocks * 512 >= fixture["payload_bytes"]
        records = recovery_record.read_records(root_fd, binding)
        assert records["armed"] is not None and records["claimed"] is None and records["closed"] is None
        assert records["armed"]["sha256"] == ns.expected_armed_sha256
        s0 = {"identity": ns.expected_s0_identity, "generation": ns.expected_s0_generation, "length": fixture["payload_bytes"], "sha256": fixture["payload_sha256"]}
        recovery_record.validate_armed(records["armed"]["record"], binding, s0)
        v31.emit({
            "marker": COLLECTOR_MARKER, "status": "GREEN", "pid": os.getpid(),
            "root_identity": binding.root_identity, "s0_identity": ns.expected_s0_identity,
            "s0_generation": ns.expected_s0_generation,
            "s0_generation_identity": f"{ns.expected_s0_identity}:{ns.expected_s0_generation}",
            "armed_sha256": records["armed"]["sha256"], "capability_busy": True,
            "s1_absent": True, "payload_reread_performed": False, "generation_reread_performed": False,
        })
        return 0
    finally:
        os.close(lock_fd)
        os.close(root_fd)


def validate_publication_receipt(receipt: dict, *, expected_pid: int, expected_slot: int, binding, fixture: dict, action: str) -> None:
    v31.validate_publication_receipt(receipt, expected_pid=expected_pid, expected_slot=expected_slot, binding=binding, fixture=fixture)
    if expected_slot == 1:
        s0 = receipt["existing_s0_verification"]
        assert receipt["publisher_variant"] == "generation-bound-inherited-s0-fd-v1"
        assert receipt["inherited_verified_s0_fd_verified_in_node"] is True
        assert receipt["verified_s0_fd_retained_through_s1_publication"] is True
        assert s0["inherited_s0_fd_verified"] is True and s0["generation_observed_pre_exec"] is True
        assert s0["generation_ioctl_calls_in_node"] == 0
        assert s0["generation_module_sha256"] == inode_generation.source_sha256()
    if action == "e0":
        assert "v34_recovery" not in receipt
        return
    rec = receipt["v34_recovery"]
    assert rec["action"] == action and rec["same_pid_writer"] is True
    assert rec["legacy_link_helper_identity_superseded"] is True
    helper = rec["link_generation_helper"]
    assert helper["pid"] == receipt["helper_processes"]["link"]["pid"]
    assert helper["generation_source_sha256"] == inode_generation.source_sha256()
    assert helper["source_sha256"] == common.sha256_path(common.LINK_HELPER)
    assert helper["ioctl_calls"] == 1 and helper["setversion_issued"] is False
    if action == "arm-h0":
        assert expected_slot == 0 and len(rec["armed_sha256"]) == 64
    else:
        assert action == "close-s1" and expected_slot == 1
        assert len(rec["armed_sha256"]) == len(rec["claimed_sha256"]) == len(rec["closed_sha256"]) == 64
        assert rec["claimant_capability"]["pid"] == expected_pid
        assert rec["claimant_capability"]["seal_value_committed"] == 15
        assert rec["claimant_preflight_before_s1"] is True
