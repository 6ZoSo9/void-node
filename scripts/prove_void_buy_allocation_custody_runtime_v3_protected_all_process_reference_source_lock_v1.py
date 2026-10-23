#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
LOCK = ROOT / "ops/security/buy-void-allocation-custody-runtime-v3-protected-all-process-reference-source-lock-v1.json"
EXPECTED_LOCK_BLOB = "47af75f21f1448aa96afc0cc3fec8b6cda02d805"
SOURCE_HEAD = "0fcd557319fbec6ffec78cb94a8fdeda41f67366"

EXPECTED = {
    "ops/precision/void_buy_allocation_custody_runtime_v3_protected_all_process_reference_census_v1.py":
        "25c0e32ae85da4569fb9521a0812e10ab0fcede3",
    "scripts/prove_void_buy_allocation_custody_runtime_v3_protected_all_process_reference_census_v1.py":
        "5fa8111245a875ce28a615f1ffd365f9c997de88",
    "docs/operators/buy-void-allocation-custody-runtime-v3-protected-all-process-reference-census-v1.md":
        "f23d4e19b786db42feee5c7134fdc42719df395f",
    ".github/workflows/buy-void-allocation-custody-runtime-v3-protected-all-process-reference-census-v1.yml":
        "7acc4af6ad0b88806fb9666602ed7dbb24c3c23c",
}


def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


def canonical(value: object) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=True
    ).encode("utf-8")


raw = LOCK.read_bytes()
assert git_blob(raw) == EXPECTED_LOCK_BLOB
lock = json.loads(raw.decode("utf-8"))

assert lock["schema"] == (
    "void_buy_void_custody_runtime_v3_protected_all_process_reference_source_lock_v1"
)
assert lock["marker"] == (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_REFERENCE_SOURCE_LOCK_V1"
)
assert lock["version"] == 1
assert lock["repository"] == "6ZoSo9/void-node"
assert lock["source_candidate_head"] == SOURCE_HEAD

evidence = lock["source_candidate_evidence"]
candidate_digest = hashlib.sha256(canonical(evidence)).hexdigest()
assert lock["source_candidate_id"] == "voidbuycustodyallprocrefsrc1_" + candidate_digest
assert candidate_digest == "a6b4c0cf23953b3d92cbc5d92423d21d0be70d7b1337c033bc852f52b661ec67"

for path, expected_blob in EXPECTED.items():
    observed = subprocess.run(
        ["git", "-C", str(ROOT), "rev-parse", f"{SOURCE_HEAD}:{path}"],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env={"PATH": "/usr/bin:/bin", "LC_ALL": "C"},
    ).stdout.strip()
    assert observed == expected_blob, (path, observed, expected_blob)

assert evidence["focused_workflow_run"] == 40000362945
assert evidence["focused_job_id"] == 120574560030
assert evidence["all_four_paths_add_only_over_parent"] is True
assert evidence["parent_current_uid_head"] == "2f58b776c4ba5b4c1b309d122122bd3355e2abc9"
assert evidence["parent_current_uid_source_git_blob_sha1"] == "a5fa6ff22cc21df555e8a70c32500f07251dc4a8"
assert evidence["prestate_head"] == "836f5e704a603f67b77b2406aeec9174f640497e"
assert evidence["prestate_source_git_blob_sha1"] == "4d9c6e5809a5cc64454626760f71e60ed99354bc"
assert evidence["archive_lock_git_blob_sha1"] == "edb4ea2b833373ab387762e45ba7da4032c860f3"
assert evidence["archive_lock_sha256"] == "ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7"

assert lock["source_candidate_accepted"] is True

for key in (
    "protected_source_installed",
    "protected_execution_authorized",
    "root_execution_authorized",
    "live_privileged_census_executed",
    "host_namespace_lease_provenance_authenticated",
    "host_scoped_target_reference_absent_candidate_accepted",
    "all_process_target_reference_absent_observed",
    "all_process_reference_absence_proven",
    "python_runtime_closure_verified",
    "replacement_authorized",
    "replacement_apply_authorized",
    "existing_target_replaced",
    "service_mutation",
    "systemd_mutation",
    "filesystem_write",
    "permission_mutation",
    "runtime_integration",
    "payment_acceptance",
    "public_presale_activation",
    "production_gate_ready",
    "funds_movement",
):
    assert lock[key] is False, key

print("VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_REFERENCE_SOURCE_LOCK_V1_GREEN")
print("exact_lock_blob_asserted=true")
print("source_candidate_identity_bound=true")
print("source_candidate_hosted_proof_bound=true")
print("source_candidate_accepted=true")
print("protected_source_installed=false")
print("protected_execution_authorized=false")
print("root_execution_authorized=false")
print("live_privileged_census_executed=false")
print("all_process_target_reference_absent_observed=false")
print("all_process_reference_absence_proven=false")
print("replacement_apply_authorized=false")
print("runtime_integration=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
