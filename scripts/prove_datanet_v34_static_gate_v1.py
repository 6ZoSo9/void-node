#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import ast
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
S = ROOT / "scripts"
F = ROOT / "fixtures" / "datanet-v34-durable-recovery-campaign-ext4-v1.json"
MARKER = "VOID_DATANET_V34_STATIC_GATE_V1_GREEN"


def blob(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def main() -> int:
    cfg = json.loads(F.read_text(encoding="utf-8"))
    accepted = {
        "accepted_v31_campaign_fixture_git_blob_sha1": ROOT / "fixtures" / "datanet-v31-campaign-topology-ext4-v1.json",
        "accepted_v31_campaign_supervisor_git_blob_sha1": S / "prove_datanet_v31_campaign_topology_ext4_v1.py",
        "accepted_v31_campaign_reducer_git_blob_sha1": S / "datanet_v31_campaign_reducer_v1.py",
        "accepted_v31_final_verifier_git_blob_sha1": S / "prove_datanet_v31_campaign_final_verifier_v1.py",
        "accepted_v31_publisher_git_blob_sha1": S / "prove_datanet_h1_admitted_s0_s1_publication_ext4_v1.mjs",
        "accepted_v32_generation_reducer_git_blob_sha1": S / "datanet_v32_generation_reducer_v1.py",
        "accepted_v32_s1_publisher_git_blob_sha1": S / "prove_datanet_h1_generation_bound_s1_publication_ext4_v1.mjs",
        "accepted_v33_durable_record_git_blob_sha1": S / "datanet_v33_durable_recovery_record_v1.py",
    }
    for key, path in accepted.items():
        assert blob(path.read_bytes()) == cfg[key], key
    py = [
        "datanet_v34_recovery_record_io_v1.py", "datanet_v34_exec_claimant_record_v1.py",
        "datanet_v34_claimant_capability_v1.py", "datanet_v34_link_generation_helper_v1.py",
        "datanet_v34_campaign_common_v1.py", "datanet_v34_campaign_modes_v1.py",
        "datanet_v34_campaign_run_v1.py", "datanet_v34_campaign_acceptance_v1.py",
        "prove_datanet_v34_campaign_final_verifier_v1.py", "prove_datanet_v34_syscall_census_v1.py",
        "prove_datanet_v34_durable_recovery_campaign_ext4_v1.py",
    ]
    for name in py:
        path = S / name
        ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        assert path.stat().st_size < 11500, (name, path.stat().st_size)
    for name in ("datanet_v34_exec_claimant_adapter_support_v1.mjs", "prove_datanet_v34_exec_claimant_adapter_v1.mjs"):
        assert (S / name).stat().st_size < 11500
    generation = (S / "datanet_ext4_inode_generation_v1.py").read_text(encoding="utf-8")
    assert generation.count("fcntl.ioctl(") == 1
    assert "EXT4_IOC_SETVERSION" not in generation and "FS_IOC_SETVERSION" not in generation
    link = (S / "datanet_v34_link_generation_helper_v1.py").read_text(encoding="utf-8")
    assert link.count("os.link(") == 1 and link.count("observe_ext4_inode_generation_v1(") == 1
    claimant = (S / "datanet_v34_claimant_capability_v1.py").read_text(encoding="utf-8")
    assert claimant.count("os.memfd_create(") == 1
    assert claimant.count("fcntl.F_ADD_SEALS") == 1 and claimant.count("fcntl.F_GET_SEALS") == 1
    adapter = (S / "prove_datanet_v34_exec_claimant_adapter_v1.mjs").read_text(encoding="utf-8")
    support = (S / "datanet_v34_exec_claimant_adapter_support_v1.mjs").read_text(encoding="utf-8")
    assert "process.execve" not in adapter + support
    assert support.count("childProcess.spawnSync =") == 1
    assert 'action === "arm-h0"' in support
    assert 'claimant_preflight_before_s1' in support
    assert 'legacy_link_helper_identity_superseded' in support
    assert cfg["durable_sequence"] == ["ARMED", "CLAIMED", "S1", "CLOSED"]
    assert cfg["process_topology"]["role_lifetimes"] == 21
    assert cfg["process_topology"]["helper_lifetimes"] == 6
    assert cfg["process_topology"]["total_lifetimes"] == 27
    assert cfg["process_topology"]["peak_live"] == 9
    assert cfg["payload_ledger"]["completed_mib"] == 960
    print(json.dumps({"marker": MARKER, "status": "GREEN", "accepted_base": cfg["parent_head"], "total_lifetimes": 27, "peak_live": 9, "payload_mib": 960}, sort_keys=True, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
