#!/usr/bin/env bash
set -euo pipefail

CLOSEOUT_SOURCE_COMMIT="0a670e85"
CLOSEOUT_MARKER="VOID_DATANET_FIELD_REPLICATION_MULTI_OBJECT_PRIVATE_RECEIPTS_PUBLIC_SAFE_SUMMARY_CLOSEOUT_V1_GREEN"
RUNTIME_MARKER="VOID_DATANET_FIELD_REPLICATION_MULTI_OBJECT_PRIVATE_RECEIPTS_PUBLIC_SAFE_SUMMARY_CLOSEOUT_RUNTIME_V1_GREEN"
SUMMARY_RUNTIME_MARKER="VOID_DATANET_FIELD_REPLICATION_MULTI_OBJECT_PRIVATE_RECEIPTS_PUBLIC_SAFE_SUMMARY_RUNTIME_V1_GREEN"
SUMMARY_MARKER="VOID_DATANET_FIELD_REPLICATION_MULTI_OBJECT_PRIVATE_RECEIPTS_PUBLIC_SAFE_SUMMARY_V1_GREEN"
CANDIDATE_RUNTIME_MARKER="VOID_DATANET_FIELD_REPLICATION_MULTI_OBJECT_CANDIDATE_FIXTURE_RUNTIME_V1_GREEN"
MANIFEST_RUNTIME_MARKER="VOID_DATANET_FIELD_REPLICATION_MULTI_OBJECT_MANIFEST_RUNTIME_V1_GREEN"
CURRENT_MAIN_AUDIT_MARKER="VOID_DATANET_FIELD_REPLICATION_MULTI_OBJECT_PRIVATE_RECEIPTS_PUBLIC_SAFE_SUMMARY_RUNTIME_CURRENT_MAIN_AUDIT_GREEN"
CANDIDATE_SHA="36dbffb3e0af5f338cc1ffaf5c254be1188caf8e772bb6a7bcbfa9c7db99d9bb"
AGGREGATE_SHA="7f84d2219ccc10f7f1615a32fc2c5cad2ecab5b018c6b987ebaa45f42c883572"

bash tools/check_datanet_field_replication_multi_object_private_receipts_public_safe_summary_closeout_v1.sh
bash tools/check_datanet_field_replication_multi_object_private_receipts_public_safe_summary_runtime_v1.sh
bash tools/check_datanet_field_replication_multi_object_private_receipts_public_safe_summary_v1.sh
bash tools/check_datanet_public_json_pretty_format_v1.sh

PORT="${VOID_PUBLIC_NODE_RUNTIME_PORT:-0}"
if [ "$PORT" = "0" ]; then
  PORT="$(python3 - <<'PYPORT'
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()
PYPORT
)"
fi

LOG="/tmp/void-datanet-multi-object-private-receipts-closeout-runtime-${PORT}.log"
PID_FILE="/tmp/void-datanet-multi-object-private-receipts-closeout-runtime-${PORT}.pid"

cleanup() {
  if [ -f "$PID_FILE" ]; then
    kill "$(cat "$PID_FILE")" >/dev/null 2>&1 || true
    rm -f "$PID_FILE"
  fi
}
trap cleanup EXIT

npm run public-node:serve -- --port "$PORT" >"$LOG" 2>&1 &
echo "$!" > "$PID_FILE"

for _ in $(seq 1 50); do
  if grep -q "VOID_PUBLIC_NODE_SAFE_SERVE_V1_READY" "$LOG"; then
    break
  fi
  sleep 0.1
done

grep -q "VOID_PUBLIC_NODE_SAFE_SERVE_V1_READY" "$LOG"

BASE="http://127.0.0.1:${PORT}"
JSON_URL="${BASE}/public-node/datanet/field-replication-multi-object-private-receipts-public-safe-summary-closeout-v1.json"
HTML_URL="${BASE}/public-node/datanet/field-replication-multi-object-private-receipts-public-safe-summary-closeout-v1.html"
INDEX_URL="${BASE}/public-node/datanet/index.json"

JSON_OUT="/tmp/void-datanet-multi-object-private-receipts-closeout-runtime-${PORT}.json"
HTML_OUT="/tmp/void-datanet-multi-object-private-receipts-closeout-runtime-${PORT}.html"
INDEX_OUT="/tmp/void-datanet-multi-object-private-receipts-closeout-runtime-${PORT}-index.json"

python3 - <<PYFETCH
from urllib.request import urlopen

for url, out in [
    ("$JSON_URL", "$JSON_OUT"),
    ("$HTML_URL", "$HTML_OUT"),
    ("$INDEX_URL", "$INDEX_OUT"),
]:
    with urlopen(url, timeout=5) as r:
        body = r.read()
        status = r.status
    if status != 200:
        raise SystemExit(f"bad status {status} for {url}")
    open(out, "wb").write(body)
PYFETCH

python3 - <<PYVERIFY
from pathlib import Path
import json
import re

closeout_source_commit = "$CLOSEOUT_SOURCE_COMMIT"
closeout_marker = "$CLOSEOUT_MARKER"
runtime_marker = "$RUNTIME_MARKER"
summary_runtime_marker = "$SUMMARY_RUNTIME_MARKER"
summary_marker = "$SUMMARY_MARKER"
candidate_runtime_marker = "$CANDIDATE_RUNTIME_MARKER"
manifest_runtime_marker = "$MANIFEST_RUNTIME_MARKER"
current_main_audit_marker = "$CURRENT_MAIN_AUDIT_MARKER"
candidate_sha = "$CANDIDATE_SHA"
aggregate_sha = "$AGGREGATE_SHA"

json_path = Path("$JSON_OUT")
html_path = Path("$HTML_OUT")
index_path = Path("$INDEX_OUT")

closeout = json.loads(json_path.read_text())
index = json.loads(index_path.read_text())

assert closeout["status"] == "green"
assert closeout["public_safe"] is True
assert closeout["private_details_redacted"] is True
assert closeout["source_main_commit"] == closeout_source_commit
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
assert idx["source_main_commit"] == closeout_source_commit
assert idx["source_public_safe_candidate_sha256"] == candidate_sha
assert idx["aggregate_receipts_sha256"] == aggregate_sha
assert idx["object_count"] == 2

for p in [json_path, html_path, index_path]:
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
        closeout_source_commit,
    ]:
        if required not in text:
            raise SystemExit(f"required value missing from runtime fetch {p}: {required}")
    forbidden = [
        "100.122.245.125",
        "100.111.171.116",
        "zoso-Precision-Tower-7810",
        "zoso-N153B",
        "/home/",
        ".void-field-trial",
        ".void-datanet-private",
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
            raise SystemExit(f"private/local detail leaked in runtime fetch {p}: {item}")
    for pattern in [r"http://100\.", r"https://100\.", r"\b100\.\d{1,3}\.\d{1,3}\.\d{1,3}\b", r"/tmp/", r"/mnt/"]:
        if re.search(pattern, text):
            raise SystemExit(f"private/local pattern leaked in runtime fetch {p}: {pattern}")

print("runtime multi-object private receipts closeout fetch ok")
print(runtime_marker)
PYVERIFY
