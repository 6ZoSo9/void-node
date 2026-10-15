#!/usr/bin/env python3
from __future__ import annotations
import importlib.util
import pathlib
import subprocess

ROOT=pathlib.Path(__file__).resolve().parents[1]
TARGET=ROOT/"ops/precision/void_buy_void_legacy_request_root_census_v1.py"

spec=importlib.util.spec_from_file_location("legacy_request_root_census_v1",TARGET)
assert spec is not None and spec.loader is not None
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER=="VOID_BUY_VOID_LEGACY_REQUEST_ROOT_CENSUS_V1"
assert str(module.STABLE_ROOT)=="/var/lib/void-buy-request-journal-v1"
assert module.EXPECTED_HOSTNAME=="zoso-Precision-Tower-7810"
assert module.EXPECTED_MACHINE_ID_SHA256=="11be124fb6d2d08003b89e467cef7e8b17d6dfb73592ccbe0984545ff1bcb0e2"

source=TARGET.read_text(encoding="utf-8")
for required in (
    "candidate_set_completeness_proven",
    "bounded_current_candidate_set_observed",
    "EMPTY_DIRECTORY_OBSERVED_EXTERNAL_ANCHOR_REQUIRED",
    "ZERO_LENGTH_FIXED_JOURNALS_OBSERVED_EXTERNAL_ANCHOR_REQUIRED",
    "SURVIVING_HISTORY_METADATA_OBSERVED",
    "historical_request_history_disposition_proven",
    "historical_origin_authenticated",
    "filesystem_rollback_prevention_proven",
    "EXPLICIT_LEGACY_HISTORY_DISPOSITION_AND_EXTERNAL_WITNESS_REQUIRED",
):
    assert required in source, required

production_source = (
    source[:source.index("def self_test()")]
    + source[source.index("def plan()"):]
)

for forbidden in (
    "requests.jsonl\").read",
    "operator-events.jsonl\").read",
    "fetch(",
    "http.request",
    "urllib",
    "mkdir(",
    "chmod(",
    "chown(",
    "unlink(",
    "rename(",
):
    assert forbidden not in production_source, forbidden

cp=subprocess.run(
    ["/usr/bin/python3","-I","-B",str(TARGET),"--self-test"],
    cwd=ROOT,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
    text=True,check=True,env={"PATH":"/usr/bin:/bin","HOME":"/tmp","LANG":"C","LC_ALL":"C"},
)
assert "VOID_BUY_VOID_LEGACY_REQUEST_ROOT_CENSUS_V1_SELF_TEST_GREEN" in cp.stdout
assert "empty_metadata_is_not_genesis_proof=true" in cp.stdout
assert "zero_length_fixed_journals_are_not_genesis_proof=true" in cp.stdout
assert "historical_request_history_disposition_proven=false" in cp.stdout

print("VOID_BUY_VOID_LEGACY_REQUEST_ROOT_CENSUS_V1_PROOF_GREEN")
print("metadata_only=true")
print("empty_shape_not_promoted_to_genesis=true")
print("candidate_set_completeness_proven=false")
print("historical_request_history_disposition_proven=false")
print("external_witness_required=true")
print("production_gate_ready=false")
