#!/usr/bin/env bash
set -euo pipefail

python3 - <<'PY'
from pathlib import Path
import json
import re

paths = [
    Path("docs/public/datanet-field-replication-proof-bundle-public-summary-v1.md"),
    Path("docs/public/datanet-field-replication-status-card-v1.md"),
    Path("public/public-node/datanet/field-replication-proof-bundle-public-summary-v1.html"),
    Path("public/public-node/datanet/field-replication-proof-bundle-public-summary-v1.json"),
    Path("public/public-node/datanet/field-replication-status-card-v1.html"),
    Path("public/public-node/datanet/field-replication-status-card-v1.json"),
    Path("public/public-node/datanet/index.json"),
]

for p in paths:
    if not p.exists():
        raise SystemExit(f"missing file: {p}")

for p in paths:
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
    patterns = [
        r"http://100\.",
        r"https://100\.",
        r"\b100\.\d{1,3}\.\d{1,3}\.\d{1,3}\b",
        r"/tmp/",
    ]
    for pattern in patterns:
        if re.search(pattern, text):
            raise SystemExit(f"private/local pattern leaked in {p}: {pattern}")

summary = json.loads(Path("public/public-node/datanet/field-replication-proof-bundle-public-summary-v1.json").read_text())
assert summary["status"] == "green"
assert summary["public_safe"] is True
assert summary["published_static_public_summary"] is True
assert summary["source_bundle_sha256"] == "03bf18824fee9baacc3d63c0fbe2e75b8f89d5f5bc1d15731d1f5459890634f2"
assert summary["proof_sha256"] == "3bb7aa11db647ad9fc7dee0daba17f8a1339c007be5a5b6a23618a22d5bcb7da"
assert summary["validation"]["private_details_redacted"] is True
assert summary["redactions"]["server_log_details_redacted"] is True
assert summary["boundaries"]["static_public_file_published_by_pr"] is True
assert summary["boundaries"]["runtime_public_write_enabled"] is False
assert summary["boundaries"]["public_mutation_route_enabled"] is False
assert summary["boundaries"]["private_bundle_published"] is False
assert summary["boundaries"]["raw_receipts_published"] is False
assert summary["boundaries"]["tailnet_urls_published"] is False
assert summary["boundaries"]["hostnames_published"] is False
assert summary["boundaries"]["absolute_paths_published"] is False

for key, value in summary["dangerous_authorities_enabled"].items():
    if value is not False:
        raise SystemExit(f"dangerous authority enabled: {key}")

status = json.loads(Path("public/public-node/datanet/field-replication-status-card-v1.json").read_text())
assert status["proof_bundle_public_summary_v1"]["public_html_path"] == "/public-node/datanet/field-replication-proof-bundle-public-summary-v1.html"

index = json.loads(Path("public/public-node/datanet/index.json").read_text())
assert index["field_replication_proof_bundle_public_summary_v1"]["public_html_path"] == "/public-node/datanet/field-replication-proof-bundle-public-summary-v1.html"
PY

grep -Fq 'VOID_DATANET_FIELD_REPLICATION_PROOF_BUNDLE_PUBLIC_SUMMARY_PUBLISH_V1' docs/public/datanet-field-replication-status-card-v1.md
grep -Fq 'VOID_DATANET_FIELD_REPLICATION_PROOF_BUNDLE_PUBLIC_SUMMARY_V1_GREEN' public/public-node/datanet/field-replication-proof-bundle-public-summary-v1.html
grep -Fq 'field_replication_proof_bundle_public_summary_v1' public/public-node/datanet/index.json

echo "VOID_DATANET_FIELD_REPLICATION_PROOF_BUNDLE_PUBLIC_SUMMARY_PUBLISH_V1_GREEN"
