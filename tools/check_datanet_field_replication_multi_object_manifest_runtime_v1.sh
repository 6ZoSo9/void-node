#!/usr/bin/env bash
set -euo pipefail

PROOF_SHA="3bb7aa11db647ad9fc7dee0daba17f8a1339c007be5a5b6a23618a22d5bcb7da"
SOURCE_BUNDLE_SHA="03bf18824fee9baacc3d63c0fbe2e75b8f89d5f5bc1d15731d1f5459890634f2"
MANIFEST_MARKER="VOID_DATANET_FIELD_REPLICATION_MULTI_OBJECT_MANIFEST_V1_GREEN"
RUNTIME_MARKER="VOID_DATANET_FIELD_REPLICATION_MULTI_OBJECT_MANIFEST_RUNTIME_V1_GREEN"

bash tools/check_datanet_field_replication_multi_object_manifest_v1.sh
bash tools/check_datanet_public_json_pretty_format_v1.sh

PORT="${VOID_PUBLIC_NODE_RUNTIME_PORT:-0}"
if [ "$PORT" = "0" ]; then
  PORT="$(python3 - <<'PY'
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()
PY
)"
fi

LOG="/tmp/void-datanet-multi-object-manifest-runtime-${PORT}.log"
PID_FILE="/tmp/void-datanet-multi-object-manifest-runtime-${PORT}.pid"

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
JSON_URL="${BASE}/public-node/datanet/field-replication-multi-object-manifest-v1.json"
HTML_URL="${BASE}/public-node/datanet/field-replication-multi-object-manifest-v1.html"
INDEX_URL="${BASE}/public-node/datanet/index.json"

JSON_OUT="/tmp/void-datanet-multi-object-manifest-runtime-${PORT}.json"
HTML_OUT="/tmp/void-datanet-multi-object-manifest-runtime-${PORT}.html"
INDEX_OUT="/tmp/void-datanet-multi-object-manifest-runtime-${PORT}-index.json"

python3 - <<PY
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
PY

python3 - <<PY
from pathlib import Path
import json
import re

proof_sha = "$PROOF_SHA"
source_bundle_sha = "$SOURCE_BUNDLE_SHA"
manifest_marker = "$MANIFEST_MARKER"
runtime_marker = "$RUNTIME_MARKER"

json_path = Path("$JSON_OUT")
html_path = Path("$HTML_OUT")
index_path = Path("$INDEX_OUT")

manifest = json.loads(json_path.read_text())
index = json.loads(index_path.read_text())

assert manifest["status"] == "green"
assert manifest["public_safe"] is True
assert manifest["private_details_redacted"] is True
assert manifest["previous_terminal_final_seal"]["main_commit"] == "75ccfaf1"
assert manifest["previous_terminal_final_seal"]["proof_sha256"] == proof_sha
assert manifest["previous_terminal_final_seal"]["source_bundle_sha256"] == source_bundle_sha
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

for p in [json_path, html_path, index_path]:
    text = p.read_text()
    for required in [proof_sha, source_bundle_sha, manifest_marker]:
        if required not in text:
            raise SystemExit(f"required value missing from runtime fetch {p}: {required}")
    forbidden = [
        "100.122.245.125",
        "100.111.171.116",
        "zoso-Precision-Tower-7810",
        "zoso-N153B",
        "/home/",
        ".void-field-trial",
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
    for pattern in [r"http://100\.", r"https://100\.", r"\b100\.\d{1,3}\.\d{1,3}\.\d{1,3}\b", r"/tmp/"]:
        if re.search(pattern, text):
            raise SystemExit(f"private/local pattern leaked in runtime fetch {p}: {pattern}")

print("runtime multi-object manifest fetch ok")
print(runtime_marker)
PY
