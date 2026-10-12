#!/usr/bin/env bash
set -euo pipefail

bash tools/check_datanet_field_replication_multi_object_candidate_fixture_runtime_v1.sh
bash tools/check_datanet_field_replication_multi_object_candidate_fixture_v1.sh
bash tools/check_datanet_public_json_pretty_format_v1.sh

python3 - <<'PY2'
from pathlib import Path
import hashlib
import json
import re

final_marker = "VOID_DATANET_FIELD_REPLICATION_MULTI_OBJECT_PRIVATE_RECEIPTS_PUBLIC_SAFE_SUMMARY_V1_GREEN"
candidate_marker = "VOID_DATANET_FIELD_REPLICATION_MULTI_OBJECT_PRIVATE_RECEIPTS_PUBLIC_SAFE_SUMMARY_CANDIDATE_V1_GREEN"
private_marker = "VOID_DATANET_FIELD_REPLICATION_MULTI_OBJECT_PRIVATE_RECEIPTS_V1_GREEN"

json_path = Path("public/public-node/datanet/field-replication-multi-object-private-receipts-public-safe-summary-v1.json")
doc_path = Path("docs/public/datanet-field-replication-multi-object-private-receipts-public-safe-summary-v1.md")
html_path = Path("public/public-node/datanet/field-replication-multi-object-private-receipts-public-safe-summary-v1.html")
index_path = Path("public/public-node/datanet/index.json")

summary = json.loads(json_path.read_text())
index = json.loads(index_path.read_text())

assert summary["status"] == "green"
assert summary["public_safe"] is True
assert summary["private_details_redacted"] is True
assert summary["private_receipt_marker"] == private_marker
assert summary["candidate_marker"] == candidate_marker
assert summary["object_count"] == 2
assert summary["minimum_object_count_satisfied"] is True
assert summary["summary_marker"] == final_marker
assert re.fullmatch(r"[0-9a-f]{64}", summary["source_public_safe_candidate_sha256"])

receipts = summary["receipts"]
assert len(receipts) == 2
aggregate_receipts_sha256 = hashlib.sha256(json.dumps(receipts, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
assert summary["aggregate_receipts_sha256"] == aggregate_receipts_sha256

for receipt in receipts:
    assert set(receipt) == {
        "object_id",
        "public_path",
        "source_sha256",
        "source_bytes",
        "private_receipt_sha256",
        "replication_mode",
        "source_read_ok",
        "replica_write_ok",
        "replica_hash_match",
        "private_details_redacted",
    }
    assert receipt["public_path"].startswith("/public-node/")
    assert re.fullmatch(r"[0-9a-f]{64}", receipt["source_sha256"])
    assert re.fullmatch(r"[0-9a-f]{64}", receipt["private_receipt_sha256"])
    assert receipt["source_read_ok"] is True
    assert receipt["replica_write_ok"] is True
    assert receipt["replica_hash_match"] is True
    assert receipt["private_details_redacted"] is True

disabled = summary["disabled_boundaries"]
assert disabled["public_tree_mutation_enabled"] is False
assert disabled["wallet_or_ledger_action_enabled"] is False
assert disabled["validator_admission_enabled"] is False
assert disabled["automatic_rewards_enabled"] is False
assert disabled["secret_handling_enabled"] is False

publication_boundary = summary["publication_boundary"]
assert publication_boundary["publishes_private_paths"] is False
assert publication_boundary["publishes_machine_names"] is False
assert publication_boundary["publishes_lan_or_tailnet_addresses"] is False
assert publication_boundary["publishes_secret_material"] is False
assert publication_boundary["enables_public_mutation"] is False
assert publication_boundary["enables_wallet_or_ledger_action"] is False
assert publication_boundary["enables_validator_admission"] is False
assert publication_boundary["enables_automatic_rewards"] is False

idx = index["field_replication_multi_object_private_receipts_public_safe_summary_v1"]
assert idx["status"] == "green"
assert idx["marker"] == final_marker
assert idx["candidate_marker"] == candidate_marker
assert idx["private_receipt_marker"] == private_marker
assert idx["public_safe"] is True
assert idx["private_details_redacted"] is True
assert idx["object_count"] == 2
assert idx["aggregate_receipts_sha256"] == aggregate_receipts_sha256
assert idx["source_public_safe_candidate_sha256"] == summary["source_public_safe_candidate_sha256"]
assert idx["source_main_commit"] == summary["source_main_commit"]

required_values = [
    final_marker,
    candidate_marker,
    private_marker,
    aggregate_receipts_sha256,
    summary["source_public_safe_candidate_sha256"],
]
for p in [json_path, doc_path, html_path, index_path]:
    text = p.read_text()
    for required in required_values:
        if required not in text:
            raise SystemExit(f"required value missing from {p}: {required}")
    forbidden = [
        "100.122.245.125",
        "100.111.171.116",
        "zoso-Precision-Tower-7810",
        "zoso-N153B",
        "/home/",
        ".void-field-trial",
        ".void-datanet-private",
        "127.0.0.1",
        "localhost",
        "private_replica_path",
        "source_repo_path",
        "private_receipt_path",
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
    for pattern in [r"http://100\.", r"https://100\.", r"100\.\d{1,3}\.\d{1,3}\.\d{1,3}", r"/tmp/", r"/mnt/"]:
        if re.search(pattern, text):
            raise SystemExit(f"private/local pattern leaked in {p}: {pattern}")

print(final_marker)
PY2
