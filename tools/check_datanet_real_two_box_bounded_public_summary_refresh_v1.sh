#!/usr/bin/env bash
set -euo pipefail

NEW_SOURCE_SHA="03bf18824fee9baacc3d63c0fbe2e75b8f89d5f5bc1d15731d1f5459890634f2"
NEW_PROOF_SHA="3bb7aa11db647ad9fc7dee0daba17f8a1339c007be5a5b6a23618a22d5bcb7da"
OLD_SOURCE_SHA="e441f7d9f5481358344f41543ccb7a0f7991e2988e857d0ae9d54268b29740f2"
OLD_PROOF_SHA="e7bee9f07a0959c2f87d959c5fd60ef5502e5a75c6c7dada2e7f8418c5ab9fcb"

bash tools/check_datanet_field_replication_proof_bundle_public_summary_publish_v1.sh
npm run datanet:field-replication:public-summary-smoke

python3 - <<PY
from pathlib import Path
import json
import re

new_source = "$NEW_SOURCE_SHA"
new_proof = "$NEW_PROOF_SHA"
old_source = "$OLD_SOURCE_SHA"
old_proof = "$OLD_PROOF_SHA"

summary = json.loads(Path("public/public-node/datanet/field-replication-proof-bundle-public-summary-v1.json").read_text())
status = json.loads(Path("public/public-node/datanet/field-replication-status-card-v1.json").read_text())
index = json.loads(Path("public/public-node/datanet/index.json").read_text())

assert summary["source_bundle_sha256"] == new_source
assert summary["proof_sha256"] == new_proof
assert summary["public_safe"] is True
assert summary["validation"]["private_details_redacted"] is True
assert summary["bounded_report"]["field_report_bounded"] is True
assert summary["bounded_report"]["artifacts_observed"] == 500
assert summary["bounded_report"]["total_candidates_observed"] == 688
assert summary["bounded_report"]["truncated"] is True
assert summary["proof_markers"]["real_two_box_bounded_private_bundle"] == "VOID_REAL_TWO_BOX_BOUNDED_REPORT_EXPLICIT_BUNDLE_GREEN"
assert summary["proof_markers"]["real_two_box_bounded_public_summary"] == "VOID_REAL_TWO_BOX_BOUNDED_PUBLIC_SAFE_SUMMARY_GREEN"

assert status["proof_bundle_public_summary_v1"]["source_bundle_sha256"] == new_source
assert status["proof_bundle_public_summary_v1"]["proof_sha256"] == new_proof
assert index["field_replication_proof_bundle_public_summary_v1"]["source_bundle_sha256"] == new_source
assert index["field_replication_proof_bundle_public_summary_v1"]["proof_sha256"] == new_proof

paths = [
    Path("docs/public/datanet-field-replication-proof-bundle-public-summary-v1.md"),
    Path("docs/public/datanet-field-replication-status-card-v1.md"),
    Path("public/public-node/datanet/field-replication-proof-bundle-public-summary-v1.html"),
    Path("public/public-node/datanet/field-replication-proof-bundle-public-summary-v1.json"),
    Path("public/public-node/datanet/field-replication-status-card-v1.html"),
    Path("public/public-node/datanet/field-replication-status-card-v1.json"),
    Path("public/public-node/datanet/index.json"),
    Path("tools/check_datanet_field_replication_proof_bundle_public_summary_publish_v1.sh"),
    Path("tools/check_datanet_field_replication_proof_bundle_public_summary_runtime_v1.sh"),
]

for p in paths:
    text = p.read_text()
    if old_source in text or old_proof in text:
        raise SystemExit(f"old public summary hash still present in {p}")
    if new_proof not in text and p.name not in ["index.json"]:
        raise SystemExit(f"new proof hash missing from {p}")

public_paths = paths[:7]
for p in public_paths:
    text = p.read_text()
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
        '"safe_serve_logs":',
    ]
    for item in forbidden:
        if item in text:
            raise SystemExit(f"private/local detail leaked in {p}: {item}")
    for pattern in [r"http://100\.", r"https://100\.", r"\b100\.\d{1,3}\.\d{1,3}\.\d{1,3}\b", r"/tmp/"]:
        if re.search(pattern, text):
            raise SystemExit(f"private/local pattern leaked in {p}: {pattern}")

print("VOID_DATANET_REAL_TWO_BOX_BOUNDED_PUBLIC_SUMMARY_REFRESH_V1_GREEN")
PY
