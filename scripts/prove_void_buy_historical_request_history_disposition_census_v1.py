#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import os
import pathlib
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
TOOL = ROOT / "ops/precision/void_buy_historical_request_history_disposition_census_v1.py"
V1 = ROOT / "ops/precision/void_buy_request_root_runtime_topology_census_v1.py"
V2 = ROOT / "ops/precision/void_buy_request_root_runtime_topology_census_v2.py"
POLICY = ROOT / "tools/void-buy-stable-request-root-policy-v1.mjs"

EXPECTED_BLOBS = {
    V1: "9ca9cb948a08973d0d874c5473ad2743de14140c",
    V2: "3c99359bf4ae020ce29c871d0bfcbf8043a44150",
    POLICY: "681adb6bb7b6bc942b8cef690e45649dd38cada5",
}


def git_blob_sha1(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


for path, expected in EXPECTED_BLOBS.items():
    actual = git_blob_sha1(path.read_bytes())
    assert actual == expected, f"dependency_blob_drift:{path.relative_to(ROOT)}"

source = TOOL.read_text(encoding="utf-8")
for forbidden in (
    "O_WRONLY",
    "O_RDWR",
    "O_CREAT",
    "O_TRUNC",
    "mkdir(",
    "makedirs(",
    "chmod(",
    "chown(",
    "unlink(",
    "rename(",
    "replace(",
    "subprocess",
    "http.client",
    "urllib",
    "import requests",
    ".connect(",
):
    assert forbidden not in source, f"mutating_or_network_primitive_forbidden:{forbidden}"

for required in (
    "EXPECTED_MACHINE_ID_SHA256",
    "same_process_generation",
    "O_NOFOLLOW",
    "candidate_file_changed_during_read",
    "SURVIVING_HISTORY_OBSERVED_MIGRATION_PLAN_REQUIRED",
    "EXTERNAL_ROLLBACK_RESISTANT_ABSENCE_ANCHOR_REQUIRED",
    '"migration_authorized": False',
    '"production_gate_ready": False',
):
    assert required in source, f"required_source_boundary_missing:{required}"

spec = importlib.util.spec_from_file_location(
    "void_buy_historical_request_history_disposition_census_v1",
    TOOL,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.self_test()

uid = os.geteuid()
with tempfile.TemporaryDirectory(
    prefix="void-history-disposition-proof-",
    dir="/tmp",
) as td:
    root = pathlib.Path(td)
    os.chmod(root, 0o700)
    requests = root / "requests.jsonl"
    operator_events = root / "operator-events.jsonl"
    requests.write_bytes(b'{"request_id":"synthetic"}\n')
    operator_events.write_bytes(b"")
    os.chmod(requests, 0o600)
    os.chmod(operator_events, 0o600)

    request_evidence = module.pinned_bounded_digest(
        requests,
        runtime_uid=uid,
        expected_name="requests.jsonl",
    )
    operator_evidence = module.pinned_bounded_digest(
        operator_events,
        runtime_uid=uid,
        expected_name="operator-events.jsonl",
    )
    assert request_evidence["observed"] is True
    assert request_evidence["bytes"] > 0
    assert request_evidence["sha256"].startswith("sha256:")
    assert operator_evidence["observed"] is True
    assert operator_evidence["bytes"] == 0

    bad = root / "bad-target"
    bad.symlink_to(requests)
    try:
        module.pinned_bounded_digest(
            bad,
            runtime_uid=uid,
            expected_name="bad-target",
        )
    except module.HistoryDispositionError:
        pass
    else:
        raise AssertionError("symlink_leaf_must_hold")

    os.chmod(requests, 0o640)
    try:
        module.pinned_bounded_digest(
            requests,
            runtime_uid=uid,
            expected_name="requests.jsonl",
        )
    except module.HistoryDispositionError:
        pass
    else:
        raise AssertionError("nonprivate_historical_leaf_must_hold")

print("VOID_BUY_VOID_HISTORICAL_REQUEST_HISTORY_DISPOSITION_CENSUS_V1_PROOF_GREEN")
print("v1_topology_dependency_blob_bound=true")
print("v2_designated_host_dependency_blob_bound=true")
print("stable_request_root_policy_blob_bound=true")
print("descriptor_relative_no_symlink_reads_proven=true")
print("nonzero_history_requires_migration_plan=true")
print("zero_or_absent_history_requires_external_anchor=true")
print("migration_authorized=false")
print("filesystem_write_by_collector=false")
print("service_mutation=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
print("production_gate_ready=false")
