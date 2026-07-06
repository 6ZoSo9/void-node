#!/usr/bin/env bash
set -euo pipefail

bash tools/check_datanet_public_json_pretty_format_v1.sh
bash tools/check_datanet_real_two_box_bounded_public_summary_refresh_v1.sh
npm run datanet:field-replication:public-summary-smoke

python3 - <<'PY'
from pathlib import Path
import json
import re

proof_sha = "3bb7aa11db647ad9fc7dee0daba17f8a1339c007be5a5b6a23618a22d5bcb7da"
source_bundle_sha = "03bf18824fee9baacc3d63c0fbe2e75b8f89d5f5bc1d15731d1f5459890634f2"
marker = "VOID_DATANET_FIELD_REPLICATION_REAL_TWO_BOX_BOUNDED_PUBLIC_SUMMARY_CLOSEOUT_V1_GREEN"

json_path = Path("public/public-node/datanet/field-replication-real-two-box-bounded-public-summary-closeout-v1.json")
html_path = Path("public/public-node/datanet/field-replication-real-two-box-bounded-public-summary-closeout-v1.html")
doc_path = Path("docs/public/datanet-field-replication-real-two-box-bounded-public-summary-closeout-v1.md")
index_path = Path("public/public-node/datanet/index.json")

closeout = json.loads(json_path.read_text())
index = json.loads(index_path.read_text())

assert closeout["status"] == "green"
assert closeout["public_safe"] is True
assert closeout["private_details_redacted"] is True
assert closeout["runtime_mutation_enabled"] is False
assert closeout["wallet_or_ledger_action_enabled"] is False
assert closeout["validator_admission_enabled"] is False
assert closeout["automatic_rewards_enabled"] is False
assert closeout["proof_sha256"] == proof_sha
assert closeout["source_bundle_sha256"] == source_bundle_sha
assert closeout["bounded_report"]["artifacts_observed"] == 500
assert closeout["bounded_report"]["total_candidates_observed"] == 688
assert closeout["bounded_report"]["truncated"] is True
assert closeout["closeout_marker"] == marker

idx = index["field_replication_real_two_box_bounded_public_summary_closeout_v1"]
assert idx["proof_sha256"] == proof_sha
assert idx["source_bundle_sha256"] == source_bundle_sha
assert idx["marker"] == marker
assert idx["public_safe"] is True
assert idx["private_details_redacted"] is True

for p in [json_path, html_path, doc_path, index_path]:
    text = p.read_text()
    if marker not in text:
        raise SystemExit(f"marker missing from {p}")
    if proof_sha not in text:
        raise SystemExit(f"proof sha missing from {p}")
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

print(marker)
PY
