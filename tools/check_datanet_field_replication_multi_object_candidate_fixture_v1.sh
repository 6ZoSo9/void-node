#!/usr/bin/env bash
set -euo pipefail

bash tools/check_datanet_field_replication_multi_object_manifest_runtime_v1.sh
bash tools/check_datanet_public_json_pretty_format_v1.sh

python3 - <<'PY'
from pathlib import Path
import hashlib
import json
import re

previous_runtime_commit = "f60c7fad"
previous_manifest_marker = "VOID_DATANET_FIELD_REPLICATION_MULTI_OBJECT_MANIFEST_RUNTIME_V1_GREEN"
fixture_marker = "VOID_DATANET_FIELD_REPLICATION_MULTI_OBJECT_CANDIDATE_FIXTURE_V1_GREEN"

json_path = Path("public/public-node/datanet/field-replication-multi-object-candidate-fixture-v1.json")
html_path = Path("public/public-node/datanet/field-replication-multi-object-candidate-fixture-v1.html")
doc_path = Path("docs/public/datanet-field-replication-multi-object-candidate-fixture-v1.md")
index_path = Path("public/public-node/datanet/index.json")

fixture = json.loads(json_path.read_text())
index = json.loads(index_path.read_text())

assert fixture["status"] == "green"
assert fixture["public_safe"] is True
assert fixture["private_details_redacted"] is True
assert fixture["previous_manifest_runtime"]["main_commit"] == previous_runtime_commit
assert fixture["previous_manifest_runtime"]["marker"] == previous_manifest_marker
assert fixture["candidate_fixture"]["object_count"] == 2
assert fixture["candidate_fixture"]["minimum_object_count_satisfied"] is True
assert fixture["candidate_fixture"]["aggregate"]["all_sha256_present"] is True
assert fixture["candidate_fixture"]["aggregate"]["all_public_safe"] is True
assert fixture["candidate_fixture"]["aggregate"]["all_private_details_redacted"] is True
assert fixture["candidate_fixture"]["aggregate"]["all_runtime_fetches_green"] is False
assert fixture["disabled_boundaries"]["runtime_mutation_enabled"] is False
assert fixture["disabled_boundaries"]["wallet_or_ledger_action_enabled"] is False
assert fixture["disabled_boundaries"]["validator_admission_enabled"] is False
assert fixture["disabled_boundaries"]["automatic_rewards_enabled"] is False
assert fixture["disabled_boundaries"]["secret_handling_enabled"] is False
assert fixture["fixture_marker"] == fixture_marker

objects = fixture["candidate_fixture"]["objects"]
recomputed_objects = []
for obj in objects:
    p = Path("public") / obj["path"].lstrip("/")
    if not p.exists():
        raise SystemExit(f"missing object path: {p}")
    raw = p.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == obj["sha256"]
    assert len(raw) == obj["bytes"]
    assert obj["content_kind"] == "public_safe_text"
    assert obj["public_summary_status"] == "candidate_fixture_defined"
    assert obj["replication_status"] == "candidate_not_replicated_yet"
    assert obj["redaction_status"] == "no_private_details"
    recomputed_objects.append(obj)

aggregate_manifest_sha256 = hashlib.sha256(
    json.dumps(recomputed_objects, sort_keys=True, separators=(",", ":")).encode()
).hexdigest()
assert aggregate_manifest_sha256 == fixture["candidate_fixture"]["aggregate"]["aggregate_manifest_sha256"]

idx = index["field_replication_multi_object_candidate_fixture_v1"]
assert idx["status"] == "green"
assert idx["marker"] == fixture_marker
assert idx["public_safe"] is True
assert idx["private_details_redacted"] is True
assert idx["object_count"] == 2
assert idx["aggregate_manifest_sha256"] == aggregate_manifest_sha256
assert idx["previous_manifest_runtime_main_commit"] == previous_runtime_commit

paths = [json_path, html_path, doc_path, index_path]
for obj in objects:
    paths.append(Path("public") / obj["path"].lstrip("/"))

for p in paths:
    text = p.read_text()
    if fixture_marker not in text and p.suffix != ".txt":
        raise SystemExit(f"fixture marker missing from {p}")
    forbidden = [
        "100.122.245.125",
        "100.111.171.116",
        "zoso-Precision-Tower-7810",
        "zoso-N153B",
        "/home/",
        ".void-field-trial",
        "127.0.0.1",
        "localhost",
        "runner_receipt=",
        "roundtrip_receipt=",
        "field_report_json=",
        "bundle_dir=",
        "summary_dir=",
        '"safe_serve_logs":'
    ]
    for item in forbidden:
        if item in text:
            raise SystemExit(f"private/local detail leaked in {p}: {item}")
    for pattern in [r"http://100\.", r"https://100\.", r"\b100\.\d{1,3}\.\d{1,3}\.\d{1,3}\b", r"/tmp/"]:
        if re.search(pattern, text):
            raise SystemExit(f"private/local pattern leaked in {p}: {pattern}")

print(fixture_marker)
PY
