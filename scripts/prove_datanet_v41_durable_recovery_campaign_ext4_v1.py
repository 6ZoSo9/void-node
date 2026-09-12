#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
from __future__ import annotations

import json
import os
from pathlib import Path
import signal
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))

import datanet_v41_fsverity_record_io_v1 as v41_io
import datanet_v39_exec_claimant_record_v1 as v39_record
import datanet_v39_claimant_capability_v1 as v39_claimant

# Preserve the accepted V39 schemas/claimant logic while replacing only the
# recovery-record IO primitive with the accepted V40 fs-verity composition.
v39_record.record_io = v41_io
v39_claimant.record_io = v41_io
v39_claimant.record = v39_record

import prove_datanet_v39_durable_recovery_campaign_ext4_v1 as v39

# V39 imports the same module objects; re-assert the V41 IO binding after its
# import-time compatibility aliases are installed.
v39.v39_record.record_io = v41_io
v39.v39_claimant.record_io = v41_io
v39.v39_claimant.record = v39.v39_record
sys.modules["datanet_v34_recovery_record_io_v1"] = v41_io
sys.modules["datanet_v34_exec_claimant_record_v1"] = v39.v39_record
sys.modules["datanet_v34_claimant_capability_v1"] = v39.v39_claimant
v39.common.recovery_record = v39.v39_record
v39.common.claimant_capability = v39.v39_claimant
v39.modes.recovery_record = v39.v39_record
v39.modes.claimant_capability = v39.v39_claimant

ACCEPTED_V40 = "9d05c65ce2033d5dbea664674b08a9592262b6b4"
ENTRY = Path(__file__).resolve()
FINAL = SCRIPT_DIR / "prove_datanet_v41_campaign_final_verifier_v1.py"
CONTROL = REPO_ROOT / "fixtures" / "datanet-v41-fsverity-generation-bound-record-composition-ext4-v1.json"
CENSUS = SCRIPT_DIR / "prove_datanet_v41_syscall_census_v1.py"
STATIC = SCRIPT_DIR / "prove_datanet_v41_static_gate_v1.py"
MUTATION = SCRIPT_DIR / "prove_datanet_v41_record_replacement_control_v1.py"
MARKER = "VOID_DATANET_V41_DURABLE_RECOVERY_CAMPAIGN_V1_GREEN"
FINAL_MARKER = "VOID_DATANET_V41_CAMPAIGN_FINAL_VERIFIER_V1_GREEN"
COLLECTOR_SEAL: dict | None = None

# Keep the exact accepted V39 adapter/support/link-helper process shape.
v39.run.ENTRYPOINT = ENTRY
v39.run.FINAL_SCRIPT = FINAL
v39.run.FINAL_MARKER = FINAL_MARKER
v39.acceptance.ENTRYPOINT = ENTRY
v39.acceptance.FINAL = FINAL
v39.acceptance.MARKER = MARKER


def v41_sources() -> dict:
    return {
        "v41_control_sha256": v39.common.sha256_path(CONTROL),
        "v41_record_io_sha256": v41_io.source_sha256(),
        "v41_entrypoint_sha256": v39.common.sha256_path(ENTRY),
        "v41_final_verifier_sha256": v39.common.sha256_path(FINAL),
        "v41_syscall_census_sha256": v39.common.sha256_path(CENSUS),
        "v41_static_gate_sha256": v39.common.sha256_path(STATIC),
        "v41_mutation_control_sha256": v39.common.sha256_path(MUTATION),
        "v39_record_sha256": v39.v39_record.source_sha256(),
        "v39_claimant_sha256": v39.v39_claimant.source_sha256(),
        "v39_link_generation_record_helper_sha256": v39.common.sha256_path(v39.LINK),
        "v39_exec_claimant_adapter_sha256": v39.common.sha256_path(v39.ADAPTER),
        "v39_exec_claimant_adapter_support_sha256": v39.common.sha256_path(v39.SUPPORT),
        "v40_fsverity_primitive_sha256": v39.common.sha256_path(Path(v41_io.V40_SOURCE)),
    }


_original_collector = v39.modes.collector_mode


def v41_collector_mode(ns) -> int:
    global COLLECTOR_SEAL
    binding = v39.v31.parse_binding(ns)
    root_fd = lock_fd = -1
    try:
        root_fd, lock_fd = v39.v31.admission.open_bound(ns.root, binding)
        COLLECTOR_SEAL = v41_io.seal_existing(
            root_fd,
            v39.v39_record.armed_name(binding.k),
            v39.v39_record.MAX_MARKER_BYTES,
            v39.v39_record.hold,
            expected_sha256=ns.expected_armed_sha256,
        )
    finally:
        v39.v31.close_quiet(lock_fd)
        v39.v31.close_quiet(root_fd)
    return _original_collector(ns)


v39.modes.collector_mode = v41_collector_mode


def v41_write_evidence(evidence_dir, files):
    files = json.loads(json.dumps(files))
    manifest = files["manifest.json"]
    manifest["format"] = "VOID_DATANET_V41_CAMPAIGN_MANIFEST_V1"
    manifest["parent_pr"] = 1500
    manifest["parent_head"] = ACCEPTED_V40
    manifest["source_bindings"].update(v39.v39_sources())
    manifest["source_bindings"].update(v41_sources())
    manifest["generation_bound_record_admission"] = True
    manifest["fsverity_record_immutability"] = True
    runtime = files["runtime.json"]
    runtime["format"] = "VOID_DATANET_V41_CAMPAIGN_RUNTIME_V1"
    observer = files["observer.json"]
    observer["format"] = "VOID_DATANET_V41_CAMPAIGN_OBSERVER_V1"
    restart = files["restart-census.json"]
    restart["format"] = "VOID_DATANET_V41_CAMPAIGN_RESTART_CENSUS_V1"
    restart["generation_bound_record_admission"] = True
    restart["fsverity_record_immutability"] = True
    restart["external_getversion_expected"] = 17
    aggregate = files["aggregate.json"]
    aggregate["format"] = "VOID_DATANET_V41_CAMPAIGN_AGGREGATE_V1"
    aggregate["durable_recovery"]["generation_observations_expected_by_external_census"] = 17
    aggregate["durable_recovery"]["generation_bound_record_admission"] = True
    aggregate["durable_recovery"]["fsverity_record_immutability"] = True
    aggregate["durable_recovery"]["record_schema"] = "V3"
    aggregate["external_getversion_expected"] = 17
    return v39._original_write_evidence(evidence_dir, files)


v39.v31.write_evidence = v41_write_evidence


def v41_emit(obj):
    if isinstance(obj, dict) and obj.get("marker") == v39.modes.COLLECTOR_MARKER and COLLECTOR_SEAL is not None:
        obj = dict(obj)
        obj["armed_sealed_after_h0_postpublication_readback"] = True
        obj["armed_fsverity_seal"] = COLLECTOR_SEAL
    if isinstance(obj, dict) and obj.get("marker") == MARKER:
        obj = dict(obj)
        obj["parent_head"] = ACCEPTED_V40
        obj["ext4_getversion_observations_expected"] = 17
        obj["generation_bound_record_admission"] = True
        obj["fsverity_record_immutability"] = True
        obj["record_schema"] = "V3"
        obj["source_bindings"] = {**obj.get("source_bindings", {}), **v39.v39_sources(), **v41_sources()}
    v39._original_emit(obj)


v39.v31.emit = v41_emit


def expired(_sig, _frame):
    raise TimeoutError("V41 proof exceeded accepted outer wall")


def main() -> int:
    ns = v39.parser().parse_args()
    armed = False
    try:
        if ns.mode == "proof":
            signal.signal(signal.SIGALRM, expired)
            signal.alarm(v39.v31.load_fixture()["phase_deadlines_seconds"]["outer_wall"])
            armed = True
        return v39.dispatch(ns)
    finally:
        if armed:
            signal.alarm(0)
        v39.v31.terminate_active()


if __name__ == "__main__":
    raise SystemExit(main())
