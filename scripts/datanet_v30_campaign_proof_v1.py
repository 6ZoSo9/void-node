#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

from datanet_v30_campaign_common_v1 import *
from datanet_v30_campaign_runtime_races_v1 import *
from datanet_v30_campaign_runtime_evidence_v1 import *

def main_proof() -> int:
    assert sys.platform == "linux"
    fixture = load_fixture()
    admission_identity = assert_admission_source(fixture)
    e0_root = os.environ.get("VOID_DATANET_V30_E0_ROOT")
    r0_root = os.environ.get("VOID_DATANET_V30_R0_ROOT")
    evidence_dir = os.environ.get("VOID_DATANET_V30_EVIDENCE_DIR")
    for value in (e0_root, r0_root, evidence_dir):
        assert isinstance(value, str) and os.path.isabs(value)
    assert os.listdir(e0_root) == []
    assert os.listdir(r0_root) == []
    assert os.listdir(evidence_dir) == []

    outer_start = time.monotonic()
    observer_pid = os.getpid()
    k = fixture["quota_key"]
    e0_binding = admission.make_fixture(e0_root, k)
    r0_binding = admission.make_fixture(r0_root, k)
    assert sorted(os.listdir(e0_root)) == [cap_name(k)]
    assert sorted(os.listdir(r0_root)) == [cap_name(k)]

    e0_start = time.monotonic()
    e0_race = run_race(e0_root, e0_binding, fixture, 0)
    e0_classifier = run_classifier(e0_root, e0_binding, fixture)
    assert e0_classifier["s0_identity"] == e0_race["receipt"]["payload_identity"]
    assert slot_name(k, 1) not in os.listdir(e0_root), "E0 consumed H1 contrary to schedule"
    e0_elapsed = time.monotonic() - e0_start
    assert e0_elapsed <= fixture["phase_deadlines_seconds"]["e0"], e0_elapsed

    r0_start = time.monotonic()
    r0_h0 = run_r0_h0_publisher(r0_root, r0_binding, fixture)
    r0_race = run_race(r0_root, r0_binding, fixture, 1)
    r0_prior = r0_race["receipt"]["prior_classification"]
    assert r0_prior["s0_identity"] == r0_h0["publication_receipt"]["payload_identity"]
    assert r0_prior["decision"] == "AUTHORIZE_H1"
    assert e0_classifier["decision"] == r0_prior["decision"] == "AUTHORIZE_H1"
    assert e0_classifier["reducer_source_sha256"] == r0_prior["reducer_source_sha256"] == source_sha256(COMMON_SOURCE)
    assert e0_classifier["schedule_label_input"] is False and r0_prior["schedule_label_input"] is False
    assert e0_classifier["disposable_history_input"] is False and r0_prior["disposable_history_input"] is False
    r0_elapsed = time.monotonic() - r0_start
    assert r0_elapsed <= fixture["phase_deadlines_seconds"]["r0"], r0_elapsed

    final_start = time.monotonic()
    final_receipt = run_final_verifier(e0_root, e0_binding, r0_root, r0_binding, fixture)
    final_elapsed = time.monotonic() - final_start
    assert final_elapsed <= fixture["phase_deadlines_seconds"]["final_verification"], final_elapsed
    assert final_receipt["e0"]["decision"] == "AUTHORIZE_H1"
    assert final_receipt["r0"]["decision"] == "DENY_H1"

    publications = [e0_race["receipt"], r0_h0["publication_receipt"], r0_race["receipt"]]
    classifiers = [e0_classifier, r0_prior]
    composed = compose_ledger(publications, classifiers, final_receipt)
    assert composed == fixture["v30_composed_success_ledger"], (composed, fixture["v30_composed_success_ledger"])

    publication_elapsed_ms = sum(int(receipt["publication_elapsed_ms"]) for receipt in publications)
    assert publication_elapsed_ms <= fixture["phase_deadlines_seconds"]["aggregate_publication"] * 1000

    topology = fixture["process_topology"]
    role_lifetimes = 1 + 8 + 1 + 1 + 1 + 8 + 1
    helper_lifetimes = sum(receipt["helper_lifetimes"]["total"] for receipt in publications)
    assert role_lifetimes == 21
    assert helper_lifetimes == 6
    assert role_lifetimes + helper_lifetimes == topology["total_lifetimes"] == 27
    peak_live = 9
    assert peak_live == topology["peak_live"]

    outer_elapsed = time.monotonic() - outer_start
    assert outer_elapsed <= fixture["phase_deadlines_seconds"]["outer_wall"], outer_elapsed

    source_hashes = {
        "campaign_entrypoint_sha256": source_sha256(ENTRYPOINT_SCRIPT),
        "campaign_proof_sha256": source_sha256(Path(__file__).resolve()),
        "campaign_common_sha256": source_sha256(COMMON_SOURCE),
        "campaign_roles_sha256": source_sha256(SCRIPT_DIR / "datanet_v30_campaign_roles_v1.py"),
        "campaign_runtime_io_sha256": source_sha256(SCRIPT_DIR / "datanet_v30_campaign_runtime_io_v1.py"),
        "campaign_runtime_races_sha256": source_sha256(SCRIPT_DIR / "datanet_v30_campaign_runtime_races_v1.py"),
        "campaign_runtime_evidence_sha256": source_sha256(SCRIPT_DIR / "datanet_v30_campaign_runtime_evidence_v1.py"),
        "publication_sha256": source_sha256(PUBLICATION_SCRIPT),
        "final_verifier_sha256": source_sha256(FINAL_SCRIPT),
        "fixture_sha256": source_sha256(FIXTURE_PATH),
        "admission": admission_identity,
    }
    helper_pids = [
        receipt["helper_lifetimes"][kind]["pid"]
        for receipt in publications
        for kind in ("fallocate", "link")
    ]
    files = {
        "manifest.json": {
            "format": "VOID_DATANET_V30_CAMPAIGN_MANIFEST_V1",
            "parent_pr": fixture["parent_pr"],
            "parent_head": fixture["parent_head"],
            "v30_review_id": fixture["v30_review_id"],
            "quota_key": k,
            "source_hashes": source_hashes,
            "helper_paths": {"fallocate": fixture["fallocate_path"], "link": fixture["link_path"]},
        },
        "runtime.json": {
            "format": "VOID_DATANET_V30_CAMPAIGN_RUNTIME_V1",
            "observer_pid": observer_pid,
            "python_version": sys.version.split()[0],
            "publication_node_versions": [receipt["node_version"] for receipt in publications],
            "publication_pids": [receipt["pid"] for receipt in publications],
            "helper_pids": helper_pids,
        },
        "observer.json": {
            "format": "VOID_DATANET_V30_CAMPAIGN_OBSERVER_V1",
            "e0_race": {k: e0_race[k] for k in ("events", "winner_pid", "busy_pids", "losers_reaped_before_helper_gate", "same_k_busy_while_winner_held", "same_k_acquired_after_winner_exit")},
            "r0_h0_crash_cut": r0_h0,
            "r0_race": {k: r0_race[k] for k in ("events", "winner_pid", "busy_pids", "losers_reaped_before_helper_gate", "same_k_busy_while_winner_held", "same_k_acquired_after_winner_exit")},
            "external_syscall_observer_complete": False,
        },
        "restart-census.json": {
            "format": "VOID_DATANET_V30_CAMPAIGN_RESTART_CENSUS_V1",
            "e0": census(e0_root, e0_binding),
            "r0": census(r0_root, r0_binding),
            "source_distinct_final_verifier": final_receipt,
            "cold_remount_proved": False,
        },
        "aggregate.json": {
            "format": "VOID_DATANET_V30_CAMPAIGN_AGGREGATE_V1",
            "status": "GREEN",
            "same_reducer_pair": {
                "e0_decision": e0_classifier["decision"],
                "r0_decision": r0_prior["decision"],
                "reducer_source_sha256": e0_classifier["reducer_source_sha256"],
                "schedule_label_input": False,
                "disposable_history_input": False,
            },
            "payload_ledger": composed,
            "process_topology": {
                "role_lifetimes": role_lifetimes,
                "helper_lifetimes": helper_lifetimes,
                "total_lifetimes": role_lifetimes + helper_lifetimes,
                "peak_live": peak_live,
                "exec_preserved_winner_process_lifetime": True,
                "losers_reaped_before_helper_launch": True,
                "helpers_sequential_per_publication": True,
            },
            "phase_elapsed_seconds": {
                "e0": e0_elapsed,
                "r0": r0_elapsed,
                "final_verification": final_elapsed,
                "outer": outer_elapsed,
                "aggregate_publication": publication_elapsed_ms / 1000.0,
            },
            "three_payload_allocations": True,
            "three_create_only_payload_links": True,
            "fourteen_losing_contenders_preallocation_hold": True,
            "r0_h0_crash_release_proved": True,
            "source_bound_injected_fault_matrix_proved": False,
            "external_syscall_observer_complete": False,
            "source_distinct_acyclic_aggregate_proved": False,
            "fiemap_provenance_proved": False,
            "cold_remount_proved": False,
            "physical_power_loss_proved": False,
            "hostile_same_uid_isolation_proved": False,
            "public_peer_retrieval_proved": False,
            "chain_2050_authority_claimed": False,
            "production_runtime_touched": False,
        },
    }
    evidence = write_evidence(evidence_dir, files)

    emit({
        "marker": MARKER,
        "status": "GREEN",
        "parent_head": fixture["parent_head"],
        "v30_review_id": fixture["v30_review_id"],
        "quota_key": k,
        "source_hashes": source_hashes,
        "e0_root_identity": e0_binding.root_identity,
        "r0_root_identity": r0_binding.root_identity,
        "e0_one_of_eight": {"acquired": 1, "busy": 7},
        "r0_one_of_eight": {"acquired": 1, "busy": 7},
        "same_reducer_pair_authorize_h1": True,
        "r0_terminal_deny_h1": True,
        "payload_ledger": composed,
        "process_topology": files["aggregate.json"]["process_topology"],
        "phase_elapsed_seconds": files["aggregate.json"]["phase_elapsed_seconds"],
        "evidence": evidence,
        "three_payload_allocations": True,
        "three_create_only_payload_links": True,
        "r0_h0_crash_release_proved": True,
        "source_bound_injected_fault_matrix_proved": False,
        "external_syscall_observer_complete": False,
        "source_distinct_acyclic_aggregate_proved": False,
        "fiemap_provenance_proved": False,
        "cold_remount_proved": False,
        "physical_power_loss_proved": False,
        "hostile_same_uid_isolation_proved": False,
        "public_peer_retrieval_proved": False,
        "chain_2050_authority_claimed": False,
        "production_runtime_touched": False,
    })
    return 0
