#!/usr/bin/env bash
set -euo pipefail

bash tools/check_datanet_real_two_box_closeout_runtime_smoke_alias_v1.sh
npm run datanet:field-replication:real-two-box-closeout-smoke
bash tools/check_datanet_field_replication_real_two_box_bounded_public_summary_closeout_runtime_v1.sh
bash tools/check_datanet_field_replication_real_two_box_bounded_public_summary_closeout_v1.sh
bash tools/check_datanet_public_json_pretty_format_v1.sh
bash tools/check_datanet_real_two_box_bounded_public_summary_refresh_v1.sh

python3 - <<'PY'
from pathlib import Path
import json
import re

proof_sha = "3bb7aa11db647ad9fc7dee0daba17f8a1339c007be5a5b6a23618a22d5bcb7da"
source_bundle_sha = "03bf18824fee9baacc3d63c0fbe2e75b8f89d5f5bc1d15731d1f5459890634f2"
marker = "VOID_DATANET_FIELD_REPLICATION_REAL_TWO_BOX_BOUNDED_PUBLIC_SUMMARY_TERMINAL_FINAL_SEAL_V1_GREEN"

json_path = Path("public/public-node/datanet/field-replication-real-two-box-bounded-public-summary-terminal-final-seal-v1.json")
html_path = Path("public/public-node/datanet/field-replication-real-two-box-bounded-public-summary-terminal-final-seal-v1.html")
doc_path = Path("docs/public/datanet-field-replication-real-two-box-bounded-public-summary-terminal-final-seal-v1.md")
index_path = Path("public/public-node/datanet/index.json")
package_path = Path("package.json")

seal = json.loads(json_path.read_text())
index = json.loads(index_path.read_text())
pkg = json.loads(package_path.read_text())

assert seal["status"] == "green"
assert seal["public_safe"] is True
assert seal["private_details_redacted"] is True
assert seal["proof_sha256"] == proof_sha
assert seal["source_bundle_sha256"] == source_bundle_sha
assert seal["bounded_report"]["artifacts_observed"] == 500
assert seal["bounded_report"]["total_candidates_observed"] == 688
assert seal["bounded_report"]["truncated"] is True
assert seal["sealed_main_commits"]["terminal_closeout_rollup"] == "3e65449e"
assert seal["sealed_main_commits"]["closeout_runtime_smoke"] == "a4284504"
assert seal["sealed_main_commits"]["runtime_smoke_alias"] == "78398dc4"
assert seal["stable_npm_alias"] == "npm run datanet:field-replication:real-two-box-closeout-smoke"
assert seal["terminal_final_seal_marker"] == marker

script = pkg["scripts"]["datanet:field-replication:real-two-box-closeout-smoke"]
assert script == "bash tools/check_datanet_field_replication_real_two_box_bounded_public_summary_closeout_runtime_v1.sh"

idx = index["field_replication_real_two_box_bounded_public_summary_terminal_final_seal_v1"]
assert idx["proof_sha256"] == proof_sha
assert idx["source_bundle_sha256"] == source_bundle_sha
assert idx["marker"] == marker
assert idx["public_safe"] is True
assert idx["private_details_redacted"] is True

for p in [json_path, html_path, doc_path, index_path]:
    text = p.read_text()
    for required in [proof_sha, source_bundle_sha, marker]:
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

print(marker)
PY
