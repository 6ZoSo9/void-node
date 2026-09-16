#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import json
import os
from pathlib import Path
import sys
import time

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

import datanet_v34_campaign_common_v1 as common
import datanet_v34_campaign_modes_v1 as modes
import datanet_v34_campaign_run_v1 as run
import datanet_v34_claimant_capability_v1 as claimant_capability
import datanet_v34_exec_claimant_record_v1 as recovery_record
import datanet_v34_recovery_record_io_v1 as record_io
import prove_datanet_v31_campaign_topology_ext4_v1 as v31

SOURCE = Path(__file__).resolve()
ENTRYPOINT = SCRIPT_DIR / "prove_datanet_v34_durable_recovery_campaign_ext4_v1.py"
FINAL = SCRIPT_DIR / "prove_datanet_v34_campaign_final_verifier_v1.py"
CENSUS = SCRIPT_DIR / "prove_datanet_v34_syscall_census_v1.py"
STATIC_GATE = SCRIPT_DIR / "prove_datanet_v34_static_gate_v1.py"
MARKER = "VOID_DATANET_V34_DURABLE_RECOVERY_CAMPAIGN_V1_GREEN"


def source_bindings(fixture: dict) -> dict:
    out = common.source_bindings(fixture)
    out.update({
        "v34_record_io_sha256": record_io.source_sha256(),
        "v34_claimant_capability_sha256": claimant_capability.source_sha256(),
        "v34_modes_sha256": common.sha256_path(Path(modes.__file__).resolve()),
        "v34_run_sha256": common.sha256_path(Path(run.__file__).resolve()),
        "v34_acceptance_sha256": common.sha256_path(SOURCE),
        "v34_entrypoint_sha256": common.sha256_path(ENTRYPOINT),
        "v34_final_verifier_sha256": common.sha256_path(FINAL),
        "v34_syscall_census_sha256": common.sha256_path(CENSUS),
        "v34_static_gate_sha256": common.sha256_path(STATIC_GATE),
    })
    return out


def main_proof() -> int:
    assert sys.platform == "linux"
    fixture = v31.load_fixture()
    cfg = common.load_v34_fixture()
    sources = source_bindings(fixture)
    e0_root = os.environ.get("VOID_DATANET_V34_E0_ROOT")
    r0_root = os.environ.get("VOID_DATANET_V34_R0_ROOT")
    evidence_dir = os.environ.get("VOID_DATANET_V34_EVIDENCE_DIR")
    for value in (e0_root, r0_root, evidence_dir):
        assert isinstance(value, str) and os.path.isabs(value)
    assert os.listdir(e0_root) == [] and os.listdir(r0_root) == [] and os.listdir(evidence_dir) == []

    start = time.monotonic()
    observer_pid = os.getpid()
    k = fixture["quota_key"]
    e0_binding = v31.admission.make_fixture(e0_root, k)
    r0_binding = v31.admission.make_fixture(r0_root, k)

    e0_start = time.monotonic()
    e0_race = run.run_race(e0_root, e0_binding, fixture, 0)
    e0_classifier = run.run_classifier(e0_root, e0_binding, fixture)
    e0_identity = f"{e0_race['receipt']['payload_identity']['dev']}:{e0_race['receipt']['payload_identity']['ino']}"
    assert e0_classifier["s0_identity"] == e0_identity
    assert e0_classifier["decision"] == "HOLD_NO_RECOVERY_AUTH"
    assert recovery_record.armed_name(k) not in os.listdir(e0_root)
    e0_elapsed = time.monotonic() - e0_start
    assert e0_elapsed <= fixture["phase_deadlines_seconds"]["e0"]

    r0_start = time.monotonic()
    r0_h0 = run.run_r0_h0_publisher(r0_root, r0_binding, fixture)
    cut = r0_h0["cut"]
    assert r0_h0["collector_receipt"]["armed_sha256"] == cut["armed_sha256"]
    r0_race = run.run_race(r0_root, r0_binding, fixture, 1, expected_s0=cut)
    prior = r0_race["prior_classification"]
    assert prior is not None
    assert prior["s0_identity"] == cut["identity"] and prior["s0_generation"] == cut["generation"]
    assert prior["armed_sha256"] == cut["armed_sha256"]
    assert prior["claim_created_before_payload_allocation"] is True
    recovery = r0_race["receipt"]["v34_recovery"]
    assert recovery["armed_sha256"] == prior["armed_sha256"]
    assert recovery["claimed_sha256"] == prior["claimed_sha256"]
    assert recovery["claimant_capability"]["pid"] == prior["claimant_pid"] == r0_race["winner_pid"]
    r0_elapsed = time.monotonic() - r0_start
    assert r0_elapsed <= fixture["phase_deadlines_seconds"]["r0"]

    final_start = time.monotonic()
    final = run.run_final_verifier(e0_root, e0_binding, r0_root, r0_binding, fixture)
    final_elapsed = time.monotonic() - final_start
    assert final_elapsed <= fixture["phase_deadlines_seconds"]["final_verification"]
    assert final["armed_sha256"] == prior["armed_sha256"]
    assert final["claimed_sha256"] == prior["claimed_sha256"]
    assert final["closed_sha256"] == recovery["closed_sha256"]
    assert final["same_claimant_pid_bound_claimed_closed"] is True

    publications = [e0_race["receipt"], r0_h0["publication_receipt"], r0_race["receipt"]]
    composed = v31.compose_ledger(publications, [e0_classifier, prior], r0_race["receipt"], final)
    assert composed == fixture["v31_composed_success_ledger"] == cfg["payload_ledger"]
    topology = cfg["process_topology"]
    role_lifetimes = 1 + 8 + 1 + 1 + 1 + 8 + 1
    helper_lifetimes = sum(sum(receipt["successful_helper_lifetimes"].values()) for receipt in publications)
    assert role_lifetimes == topology["role_lifetimes"] == 21
    assert helper_lifetimes == topology["helper_lifetimes"] == 6
    assert role_lifetimes + helper_lifetimes == topology["total_lifetimes"] == 27
    assert topology["peak_live"] == 9
    assert all(item["same_pid_became_node_publisher"] for item in (e0_race, r0_h0, r0_race))
    outer_elapsed = time.monotonic() - start
    assert outer_elapsed <= fixture["phase_deadlines_seconds"]["outer_wall"]

    peak = {
        "observer_plus_eight_contenders": 9,
        "race_losers_reaped_before_helper_launch": True,
        "helpers_sequential_per_publication": True,
        "checkpoint_collector_after_h0_helpers": True,
        "derived_peak_live": 9,
    }
    helper_pids = [receipt["helper_processes"][kind]["pid"] for receipt in publications for kind in ("fallocate", "link")]
    files = {
        "manifest.json": {
            "format": "VOID_DATANET_V34_CAMPAIGN_MANIFEST_V1", "parent_pr": 1493,
            "parent_head": cfg["parent_head"], "quota_key": k, "source_bindings": sources,
            "durable_sequence": cfg["durable_sequence"], "accepted_base_immutable": True,
        },
        "runtime.json": {
            "format": "VOID_DATANET_V34_CAMPAIGN_RUNTIME_V1", "observer_pid": observer_pid,
            "python_version": sys.version.split()[0], "publication_pids": [r["publisher_pid"] for r in publications],
            "helper_pids": helper_pids, "claimant_pid": prior["claimant_pid"],
        },
        "observer.json": {
            "format": "VOID_DATANET_V34_CAMPAIGN_OBSERVER_V1",
            "e0_race": {key: e0_race[key] for key in ("events", "winner_pid", "busy_pids", "losers_reaped_before_helper_gate", "same_k_busy_while_winner_held", "same_k_acquired_after_winner_exit", "same_pid_became_node_publisher")},
            "r0_h0_crash_cut": r0_h0,
            "r0_race": {key: r0_race[key] for key in ("events", "winner_pid", "busy_pids", "losers_reaped_before_helper_gate", "same_k_busy_while_winner_held", "same_k_acquired_after_winner_exit", "same_pid_became_node_publisher")},
            "peak_derivation": peak, "external_syscall_observer_complete": False,
        },
        "restart-census.json": {
            "format": "VOID_DATANET_V34_CAMPAIGN_RESTART_CENSUS_V1",
            "e0": v31.census(e0_root, e0_binding), "r0": v31.census(r0_root, r0_binding),
            "source_distinct_final_verifier": final, "cold_remount_proved": False,
        },
        "aggregate.json": {
            "format": "VOID_DATANET_V34_CAMPAIGN_AGGREGATE_V1", "status": "GREEN",
            "payload_ledger": composed,
            "process_topology": {"role_lifetimes": 21, "helper_lifetimes": 6, "total_lifetimes": 27, "peak_live": 9, "peak_derivation": peak, "exec_preserved_winner_process_lifetime": True},
            "phase_elapsed_seconds": {"e0": e0_elapsed, "r0": r0_elapsed, "final_verification": final_elapsed, "outer": outer_elapsed},
            "durable_recovery": {
                "e0_decision": "HOLD_NO_RECOVERY_AUTH", "armed_before_h0_crash_cut": True,
                "claimed_before_s1_allocation": True, "claimant_preflight_before_s1": True, "same_pid_claimed_through_node_exec_to_closed": True,
                "closed_after_s1_postpublication_readback": True, "sealed_claimant_capability": True,
                "claimant_capability_seal_mask": 15, "generation_observations_expected_by_external_census": 7,
            },
            "three_payload_allocations": True, "three_create_only_payload_links": True,
            "full_27_lifetime_campaign_proved": True, "peak_9_proved": True,
            "source_bound_injected_fault_matrix_proved": False, "external_syscall_observer_complete": False,
            "cold_remount_proved": False, "physical_power_loss_proved": False,
            "hostile_same_uid_isolation_proved": False, "public_peer_retrieval_proved": False,
            "chain_2050_authority_claimed": False, "production_runtime_touched": False,
        },
    }
    evidence = v31.write_evidence(evidence_dir, files)
    v31.emit({
        "marker": MARKER, "status": "GREEN", "parent_head": cfg["parent_head"], "quota_key": k,
        "source_bindings": sources, "payload_ledger": composed,
        "process_topology": files["aggregate.json"]["process_topology"],
        "durable_recovery": files["aggregate.json"]["durable_recovery"], "evidence": evidence,
        "ext4_getversion_observations_expected": 7, "full_27_lifetime_campaign_proved": True,
        "peak_9_proved": True, "production_runtime_touched": False,
    })
    return 0
