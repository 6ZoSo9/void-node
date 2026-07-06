#!/usr/bin/env bash
set -euo pipefail

bash tools/check_datanet_field_replication_real_two_box_bounded_public_summary_terminal_final_seal_runtime_v1.sh
bash tools/check_datanet_public_json_pretty_format_v1.sh

python3 - <<'PY'
from pathlib import Path
import json
import re

proof_sha = "3bb7aa11db647ad9fc7dee0daba17f8a1339c007be5a5b6a23618a22d5bcb7da"
source_bundle_sha = "03bf18824fee9baacc3d63c0fbe2e75b8f89d5f5bc1d15731d1f5459890634f2"
terminal_marker = "VOID_DATANET_FIELD_REPLICATION_REAL_TWO_BOX_BOUNDED_PUBLIC_SUMMARY_TERMINAL_FINAL_SEAL_RUNTIME_V1_GREEN"
manifest_marker = "VOID_DATANET_FIELD_REPLICATION_MULTI_OBJECT_MANIFEST_V1_GREEN"

json_path = Path("public/public-node/datanet/field-replication-multi-object-manifest-v1.json")
html_path = Path("public/public-node/datanet/field-replication-multi-object-manifest-v1.html")
doc_path = Path("docs/public/datanet-field-replication-multi-object-manifest-v1.md")
index_path = Path("public/public-node/datanet/index.json")

manifest = json.loads(json_path.read_text())
index = json.loads(index_path.read_text())

assert manifest["status"] == "green"
assert manifest["public_safe"] is True
assert manifest["private_details_redacted"] is True
assert manifest["previous_terminal_final_seal"]["main_commit"] == "75ccfaf1"
assert manifest["previous_terminal_final_seal"]["proof_sha256"] == proof_sha
assert manifest["previous_terminal_final_seal"]["source_bundle_sha256"] == source_bundle_sha
assert manifest["previous_terminal_final_seal"]["marker"] == terminal_marker
assert manifest["multi_object_manifest"]["minimum_object_count"] == 2
assert manifest["disabled_boundaries"]["runtime_mutation_enabled"] is False
assert manifest["disabled_boundaries"]["wallet_or_ledger_action_enabled"] is False
assert manifest["disabled_boundaries"]["validator_admission_enabled"] is False
assert manifest["disabled_boundaries"]["automatic_rewards_enabled"] is False
assert manifest["disabled_boundaries"]["secret_handling_enabled"] is False
assert manifest["manifest_marker"] == manifest_marker

idx = index["field_replication_multi_object_manifest_v1"]
assert idx["status"] == "green"
assert idx["marker"] == manifest_marker
assert idx["public_safe"] is True
assert idx["private_details_redacted"] is True
assert idx["minimum_object_count"] == 2
assert idx["previous_terminal_final_seal_main_commit"] == "75ccfaf1"
assert idx["previous_proof_sha256"] == proof_sha
assert idx["previous_source_bundle_sha256"] == source_bundle_sha

for p in [json_path, html_path, doc_path, index_path]:
    text = p.read_text()
    for required in [proof_sha, source_bundle_sha, manifest_marker]:
        if required not in text:
            raise SystemExit(f"required value missing from {p}: {required}")
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

print(manifest_marker)
PY
