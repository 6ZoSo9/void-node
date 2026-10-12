#!/usr/bin/env bash
set -euo pipefail

FIXTURE_MARKER="VOID_DATANET_FIELD_REPLICATION_MULTI_OBJECT_CANDIDATE_FIXTURE_V1_GREEN"
RUNTIME_MARKER="VOID_DATANET_FIELD_REPLICATION_MULTI_OBJECT_CANDIDATE_FIXTURE_RUNTIME_V1_GREEN"

bash tools/check_datanet_field_replication_multi_object_candidate_fixture_v1.sh
bash tools/check_datanet_field_replication_multi_object_manifest_runtime_v1.sh
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

LOG="/tmp/void-datanet-multi-object-candidate-fixture-runtime-${PORT}.log"
PID_FILE="/tmp/void-datanet-multi-object-candidate-fixture-runtime-${PORT}.pid"

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
JSON_URL="${BASE}/public-node/datanet/field-replication-multi-object-candidate-fixture-v1.json"
HTML_URL="${BASE}/public-node/datanet/field-replication-multi-object-candidate-fixture-v1.html"
INDEX_URL="${BASE}/public-node/datanet/index.json"

JSON_OUT="/tmp/void-datanet-multi-object-candidate-fixture-runtime-${PORT}.json"
HTML_OUT="/tmp/void-datanet-multi-object-candidate-fixture-runtime-${PORT}.html"
INDEX_OUT="/tmp/void-datanet-multi-object-candidate-fixture-runtime-${PORT}-index.json"
OBJECT_OUT_DIR="/tmp/void-datanet-multi-object-candidate-fixture-runtime-${PORT}-objects"
mkdir -p "$OBJECT_OUT_DIR"

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
from urllib.request import urlopen
import hashlib
import json
import re

fixture_marker = "$FIXTURE_MARKER"
runtime_marker = "$RUNTIME_MARKER"
base = "$BASE"

json_path = Path("$JSON_OUT")
html_path = Path("$HTML_OUT")
index_path = Path("$INDEX_OUT")
object_out_dir = Path("$OBJECT_OUT_DIR")

fixture = json.loads(json_path.read_text())
index = json.loads(index_path.read_text())

assert fixture["status"] == "green"
assert fixture["public_safe"] is True
assert fixture["private_details_redacted"] is True
assert fixture["previous_manifest_runtime"]["main_commit"] == "f60c7fad"
assert fixture["candidate_fixture"]["object_count"] == 2
assert fixture["candidate_fixture"]["minimum_object_count_satisfied"] is True
assert fixture["candidate_fixture"]["aggregate"]["all_sha256_present"] is True
assert fixture["candidate_fixture"]["aggregate"]["all_public_safe"] is True
assert fixture["candidate_fixture"]["aggregate"]["all_private_details_redacted"] is True
assert fixture["candidate_fixture"]["aggregate"]["all_runtime_fetches_green"] is False
assert fixture["fixture_marker"] == fixture_marker

idx = index["field_replication_multi_object_candidate_fixture_v1"]
assert idx["status"] == "green"
assert idx["marker"] == fixture_marker
assert idx["public_safe"] is True
assert idx["private_details_redacted"] is True
assert idx["object_count"] == 2
assert idx["previous_manifest_runtime_main_commit"] == "f60c7fad"

fetched_objects = []
for obj in fixture["candidate_fixture"]["objects"]:
    path = obj["path"]
    if not path.startswith("/public-node/"):
        raise SystemExit(f"bad public object path: {path}")
    url = base + path
    with urlopen(url, timeout=5) as r:
        body = r.read()
        status = r.status
    if status != 200:
        raise SystemExit(f"bad object fetch status {status} for {url}")
    out = object_out_dir / Path(path).name
    out.write_bytes(body)
    actual_sha = hashlib.sha256(body).hexdigest()
    if actual_sha != obj["sha256"]:
        raise SystemExit(f"object sha mismatch for {path}: {actual_sha} != {obj['sha256']}")
    if len(body) != obj["bytes"]:
        raise SystemExit(f"object byte mismatch for {path}: {len(body)} != {obj['bytes']}")
    assert obj["content_kind"] == "public_safe_text"
    assert obj["public_summary_status"] == "candidate_fixture_defined"
    assert obj["replication_status"] == "candidate_not_replicated_yet"
    assert obj["redaction_status"] == "no_private_details"
    fetched_objects.append(obj)

aggregate_manifest_sha256 = hashlib.sha256(
    json.dumps(fetched_objects, sort_keys=True, separators=(",", ":")).encode()
).hexdigest()
assert aggregate_manifest_sha256 == fixture["candidate_fixture"]["aggregate"]["aggregate_manifest_sha256"]
assert aggregate_manifest_sha256 == idx["aggregate_manifest_sha256"]

paths_to_scan = [json_path, html_path, index_path] + sorted(object_out_dir.glob("*.txt"))
for p in paths_to_scan:
    text = p.read_text()
    if p.suffix != ".txt":
        for required in [fixture_marker, aggregate_manifest_sha256]:
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

print("runtime multi-object candidate fixture fetch ok")
print(runtime_marker)
PY
