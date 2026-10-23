#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
TARGET = (
    ROOT
    / "ops/precision/"
    "void_buy_allocation_custody_host_namespace_crosscheck_v1.py"
)
EXPECTED_SOURCE_BLOB = "75e66b2e56606c63cd55477fffa1f76d9780f21a"


def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


assert git_blob(TARGET.read_bytes()) == EXPECTED_SOURCE_BLOB

spec = importlib.util.spec_from_file_location(
    "void_buy_allocation_custody_host_namespace_crosscheck_v1",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER == "VOID_BUY_VOID_CUSTODY_HOST_NAMESPACE_CROSSCHECK_V1"
assert module.SCHEMA == "void_buy_void_custody_host_namespace_crosscheck_v1"
assert module.CANDIDATE_COLLECTOR_GIT_BLOB == (
    "ce6e416f5cccd79d421e9404f6f4fa12a416fc6a"
)
assert module.OBSERVATION_COLLECTOR_GIT_BLOB == (
    "073e1f1400def53831a089a3e9c14d6e1f311bf5"
)
assert module.PROCESS_CENSUS_GIT_BLOB == (
    "6bf476e3383b7b18966320df13b4041da9c8c11f"
)
assert module.DESIGNATED_HOST_POLICY_GIT_BLOB == (
    "4234379cb7e283e03c654e10d0d7fe8986e99897"
)
assert module.EXPECTED_HOSTNAME == "zoso-Precision-Tower-7810"
assert module.EXPECTED_OPERATOR == "zoso"
assert module.EXPECTED_OPERATOR_UID == 1000
assert module.EXPECTED_MACHINE_ID_SHA256 == (
    "11be124fb6d2d08003b89e467cef7e8b17d6dfb73592ccbe0984545ff1bcb0e2"
)

module.self_test()

candidate, observation = module._synthetic_receipts()
candidate_bytes = module.canonical(candidate)
observation_bytes = module.canonical(observation)
result = module.crosscheck(
    candidate,
    observation,
    candidate_receipt_sha256=module.sha256(candidate_bytes),
    observation_receipt_sha256=module.sha256(observation_bytes),
)
assert result["namespace_candidates_match"] is True
assert result["boot_id_match"] is True
assert result["procfs_identity_match"] is True
assert result["proc_mount_contract_match"] is True
assert result["operator_uid_match"] is True
assert result["receipts_internally_consistent"] is True
assert result["collector_source_provenance_authenticated"] is False
assert result["receipt_origin_authenticated"] is False
assert result["independent_host_context_attested"] is False
assert result["external_reviewer_approval_required"] is True
assert result["external_reviewer_approval_present"] is False
assert result["lease_authority"] is False
assert result["process_census_consumption_authorized"] is False
assert result["automatic_process_census_feed_authorized"] is False
assert result["replacement_apply_authorized"] is False
assert result["payment_acceptance"] is False
assert result["public_presale_activation"] is False
assert result["funds_movement"] is False
assert result["candidate_receipt_sha256"] == module.sha256(candidate_bytes)
assert result["observation_receipt_sha256"] == module.sha256(observation_bytes)
assert result["crosscheck_id"].startswith("voidbuycustodynscross1_")
assert len(result["crosscheck_id"]) == len("voidbuycustodynscross1_") + 64

without_b = subprocess.run(
    [sys.executable, "-I", str(TARGET), "--self-test"],
    cwd="/",
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=10,
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
)
assert without_b.returncode == 2, without_b
assert (
    "reason=python_isolated_unoptimized_nobytecode_mode_required"
    in without_b.stdout
), without_b.stdout
assert "production_filesystem_write=false" in without_b.stdout
assert "lease_authority=false" in without_b.stdout
assert "process_census_consumption_authorized=false" in without_b.stdout

source = TARGET.read_text(encoding="utf-8")
pre_self_test = source.split("def self_test()", 1)[0]

for forbidden in (
    "subprocess",
    "systemctl",
    "sudo ",
    "os.write(",
    "os.pwrite(",
    "os.unlink(",
    "os.rename(",
    "os.replace(",
    "os.chmod(",
    "os.chown(",
    "os.fchmod(",
    "os.fchown(",
    "socket.socket(",
    ".connect(",
):
    assert forbidden not in pre_self_test, forbidden

for required in (
    "dont_write_bytecode",
    "read_receipt",
    "_verify_internal_id",
    "candidate_receipt_sha256",
    "observation_receipt_sha256",
    "candidate_receipt_id",
    "observation_receipt_id",
    "namespace_candidates_match",
    "boot_id_match",
    "procfs_identity_match",
    "proc_mount_contract_match",
    "operator_uid_match",
    "collector_source_provenance_authenticated",
    "receipt_origin_authenticated",
    "external_reviewer_approval_required",
    "external_reviewer_approval_present",
    "lease_authority",
    "process_census_consumption_authorized",
    "automatic_process_census_feed_authorized",
    "replacement_apply_authorized",
):
    assert required in source, required

print("VOID_BUY_VOID_CUSTODY_HOST_NAMESPACE_CROSSCHECK_V1_PROOF_GREEN")
print("exact_source_blob_asserted=true")
print("candidate_receipt_id_recomputed=true")
print("observation_receipt_id_recomputed=true")
print("receipt_file_sha256_bound_into_crosscheck_id=true")
print("designated_host_anchors_required=true")
print("process_census_source_identity_required=true")
print("pid_namespace_match_required=true")
print("mount_namespace_match_required=true")
print("boot_id_match_required=true")
print("procfs_identity_match_required=true")
print("proc_mount_contract_match_required=true")
print("operator_uid_match_required=true")
print("authority_promotion_rejected=true")
print("collector_source_provenance_authenticated=false")
print("receipt_origin_authenticated=false")
print("independent_host_context_attested=false")
print("external_reviewer_approval_required=true")
print("external_reviewer_approval_present=false")
print("lease_authority=false")
print("process_census_consumption_authorized=false")
print("automatic_process_census_feed_authorized=false")
print("without_dash_b_bootstrap_hold=true")
print("host_receipts_not_collected_in_ci=true")
print("production_filesystem_write=false")
print("test_fixture_filesystem_write=true")
print("replacement_apply_authorized=false")
print("runtime_integration=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
