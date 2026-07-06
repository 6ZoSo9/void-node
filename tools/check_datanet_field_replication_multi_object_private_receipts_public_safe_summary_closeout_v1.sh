#!/usr/bin/env bash
set -euo pipefail

bash tools/check_datanet_field_replication_multi_object_private_receipts_public_safe_summary_runtime_v1.sh
bash tools/check_datanet_field_replication_multi_object_private_receipts_public_safe_summary_v1.sh
bash tools/check_datanet_field_replication_multi_object_candidate_fixture_runtime_v1.sh
bash tools/check_datanet_field_replication_multi_object_manifest_runtime_v1.sh
bash tools/check_datanet_public_json_pretty_format_v1.sh

python3 - <<'PY2'
from pathlib import Path
import json
import re

closeout_marker = "VOID_DATANET_FIELD_REPLICATION_MULTI_OBJECT_PRIVATE_RECEIPTS_PUBLIC_SAFE_SUMMARY_CLOSEOUT_V1_GREEN"
summary_runtime_marker = "VOID_DATANET_FIELD_REPLICATION_MULTI_OBJECT_PRIVATE_RECEIPTS_PUBLIC_SAFE_SUMMARY_RUNTIME_V1_GREEN"
summary_marker = "VOID_DATANET_FIELD_REPLICATION_MULTI_OBJECT_PRIVATE_RECEIPTS_PUBLIC_SAFE_SUMMARY_V1_GREEN"
candidate_runtime_marker = "VOID_DATANET_FIELD_REPLICATION_MULTI_OBJECT_CANDIDATE_FIXTURE_RUNTIME_V1_GREEN"
manifest_runtime_marker = "VOID_DATANET_FIELD_REPLICATION_MULTI_OBJECT_MANIFEST_RUNTIME_V1_GREEN"
current_main_audit_marker = "VOID_DATANET_FIELD_REPLICATION_MULTI_OBJECT_PRIVATE_RECEIPTS_PUBLIC_SAFE_SUMMARY_RUNTIME_CURRENT_MAIN_AUDIT_GREEN"
candidate_sha = "36dbffb3e0af5f338cc1ffaf5c254be1188caf8e772bb6a7bcbfa9c7db99d9bb"
aggregate_sha = "7f84d2219ccc10f7f1615a32fc2c5cad2ecab5b018c6b987ebaa45f42c883572"
base_main_commit = "0a670e85"

json_path = Path("public/public-node/datanet/field-replication-multi-object-private-receipts-public-safe-summary-closeout-v1.json")
doc_path = Path("docs/public/datanet-field-replication-multi-object-private-receipts-public-safe-summary-closeout-v1.md")
html_path = Path("public/public-node/datanet/field-replication-multi-object-private-receipts-public-safe-summary-closeout-v1.html")
index_path = Path("public/public-node/datanet/index.json")

closeout = json.loads(json_path.read_text())
index = json.loads(index_path.read_text())

assert closeout["status"] == "green"
assert closeout["public_safe"] is True
assert closeout["private_details_redacted"] is True
assert closeout["source_main_commit"] == base_main_commit
assert closeout["closed_scope"]["multi_object_manifest_runtime"] == manifest_runtime_marker
assert closeout["closed_scope"]["candidate_fixture_runtime"] == candidate_runtime_marker
assert closeout["closed_scope"]["private_receipts_public_safe_summary"] == summary_marker
assert closeout["closed_scope"]["private_receipts_public_safe_summary_runtime"] == summary_runtime_marker
assert closeout["closed_scope"]["current_main_audit"] == current_main_audit_marker
assert closeout["public_commitments"]["source_public_safe_candidate_sha256"] == candidate_sha
assert closeout["public_commitments"]["aggregate_receipts_sha256"] == aggregate_sha
assert closeout["public_commitments"]["object_count"] == 2
assert closeout["public_commitments"]["minimum_object_count_satisfied"] is True
assert closeout["closeout_marker"] == closeout_marker

disabled = closeout["disabled_boundaries"]
assert disabled["public_tree_mutation_enabled"] is False
assert disabled["wallet_or_ledger_action_enabled"] is False
assert disabled["validator_admission_enabled"] is False
assert disabled["automatic_rewards_enabled"] is False
assert disabled["secret_handling_enabled"] is False

publication_boundary = closeout["publication_boundary"]
assert publication_boundary["publishes_private_paths"] is False
assert publication_boundary["publishes_machine_names"] is False
assert publication_boundary["publishes_lan_or_tailnet_addresses"] is False
assert publication_boundary["publishes_secret_material"] is False
assert publication_boundary["enables_public_mutation"] is False
assert publication_boundary["enables_wallet_or_ledger_action"] is False
assert publication_boundary["enables_validator_admission"] is False
assert publication_boundary["enables_automatic_rewards"] is False

idx = index["field_replication_multi_object_private_receipts_public_safe_summary_closeout_v1"]
assert idx["status"] == "green"
assert idx["marker"] == closeout_marker
assert idx["summary_runtime_marker"] == summary_runtime_marker
assert idx["summary_marker"] == summary_marker
assert idx["candidate_fixture_runtime_marker"] == candidate_runtime_marker
assert idx["multi_object_manifest_runtime_marker"] == manifest_runtime_marker
assert idx["current_main_audit_marker"] == current_main_audit_marker
assert idx["public_safe"] is True
assert idx["private_details_redacted"] is True
assert idx["source_main_commit"] == base_main_commit
assert idx["source_public_safe_candidate_sha256"] == candidate_sha
assert idx["aggregate_receipts_sha256"] == aggregate_sha
assert idx["object_count"] == 2

for p in [json_path, doc_path, html_path, index_path]:
    text = p.read_text()
    for required in [
        closeout_marker,
        summary_runtime_marker,
        summary_marker,
        candidate_runtime_marker,
        manifest_runtime_marker,
        current_main_audit_marker,
        candidate_sha,
        aggregate_sha,
        base_main_commit,
    ]:
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
    for pattern in [r"http://100\.", r"https://100\.", r"\b100\.\d{1,3}\.\d{1,3}\.\d{1,3}\b", r"/tmp/", r"/mnt/"]:
        if re.search(pattern, text):
            raise SystemExit(f"private/local pattern leaked in {p}: {pattern}")

print(closeout_marker)
PY2
