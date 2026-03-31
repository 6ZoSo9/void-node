#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
ALIEN_HOST="${ALIEN##*@}"
LOCAL_NODE_BASE="${LOCAL_NODE_BASE:-http://127.0.0.1:4100}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://${ALIEN_HOST}:4100}"
ACCOUNT="${ACCOUNT:-alien-verify-redund-user-$(date +%Y%m%d-%H%M%S)}"
TS_NOW="$(date +%Y%m%d-%H%M%S)"
PLAINTEXT="${PLAINTEXT:-two-box remote verify redundancy proof $TS_NOW}"
OUT_DIR="${OUT_DIR:-/tmp/two-box-remote-verify-redundancy-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT_DIR"

jget() {
  curl -fsS --max-time "${2:-8}" "$1"
}

jpost_json() {
  local url="$1"
  local body="$2"
  curl -fsS --max-time "${3:-12}" -H 'content-type: application/json' -X POST "$url" --data "$body"
}

echo "=== [1] baseline local/remote/network truth ==="
LOCAL_READY="$(jget "$LOCAL_NODE_BASE/__void/ready.json" 5)"
LOCAL_HEALTH="$(jget "$LOCAL_NODE_BASE/health" 5)"
LOCAL_HEAD="$(jget "$LOCAL_NODE_BASE/head.txt" 5)"
REMOTE_READY="$(jget "$REMOTE_NODE_BASE/__void/ready.json" 8)"
REMOTE_HEALTH="$(jget "$REMOTE_NODE_BASE/health" 8)"
REMOTE_HEAD="$(jget "$REMOTE_NODE_BASE/head.txt" 8)"

printf '%s\n' "$LOCAL_READY" | tee "$OUT_DIR/local-ready-before.json"
printf '%s\n' "$LOCAL_HEALTH" | tee "$OUT_DIR/local-health-before.json"
printf '%s\n' "$LOCAL_HEAD" | tee "$OUT_DIR/local-head-before.txt"
printf '%s\n' "$REMOTE_READY" | tee "$OUT_DIR/remote-ready-before.json"
printf '%s\n' "$REMOTE_HEALTH" | tee "$OUT_DIR/remote-health-before.json"
printf '%s\n' "$REMOTE_HEAD" | tee "$OUT_DIR/remote-head-before.txt"

python3 - "$LOCAL_READY" "$REMOTE_READY" "$LOCAL_HEALTH" "$REMOTE_HEALTH" "$LOCAL_HEAD" "$REMOTE_HEAD" <<'PY'
import json, sys
local_ready = json.loads(sys.argv[1])
remote_ready = json.loads(sys.argv[2])
local_health = json.loads(sys.argv[3])
remote_health = json.loads(sys.argv[4])
local_head = int(sys.argv[5].strip())
remote_head = int(sys.argv[6].strip())

local_node = str(local_health.get("nodeId") or "")
remote_node = str(remote_health.get("nodeId") or "")
local_peers = [str(x) for x in (local_health.get("peers") or [])]
remote_peers = [str(x) for x in (remote_health.get("peers") or [])]

assert local_ready.get("ready") is True, "local ready != true"
assert remote_ready.get("ready") is True, "remote ready != true"
assert local_ready.get("gap") == 0, f"local gap != 0: {local_ready.get('gap')}"
assert remote_ready.get("gap") == 0, f"remote gap != 0: {remote_ready.get('gap')}"
assert local_ready.get("txroot_live") == 1, f"local txroot_live != 1: {local_ready.get('txroot_live')}"
assert remote_ready.get("txroot_live") == 1, f"remote txroot_live != 1: {remote_ready.get('txroot_live')}"
assert local_head == remote_head, f"baseline head mismatch: {local_head} vs {remote_head}"
assert remote_node in local_peers, f"remote nodeId {remote_node} not found in local peers"
assert local_node in remote_peers, f"local nodeId {local_node} not found in remote peers"

print("[ok] baseline network truth aligned")
PY

echo
echo "=== [2] remote publish on Alienware ==="
PUBLISH_JSON="$(jpost_json "$REMOTE_NODE_BASE/jobs/submit" "{\"account\":\"$ACCOUNT\",\"kind\":\"datanet_publish\",\"plaintext\":\"$PLAINTEXT\"}" 12)"
printf '%s\n' "$PUBLISH_JSON" | tee "$OUT_DIR/remote-publish-submit.json"

PUBLISH_JOB_ID="$(printf '%s\n' "$PUBLISH_JSON" | python3 -c 'import sys,json; o=json.load(sys.stdin); print((o.get("job") or {}).get("job_id",""))')"
test -n "$PUBLISH_JOB_ID"

PUBLISH_JOB=""
PUBLISH_STATUS=""
PUBLISH_JOB_FILE=""
for i in $(seq 1 20); do
  PUBLISH_JOB="$(jget "$REMOTE_NODE_BASE/jobs/$PUBLISH_JOB_ID" 10)"
  PUBLISH_JOB_FILE="$OUT_DIR/remote-publish-job-$i.json"
  printf '%s\n' "$PUBLISH_JOB" | tee "$PUBLISH_JOB_FILE" >/dev/null
  PUBLISH_STATUS="$(printf '%s\n' "$PUBLISH_JOB" | python3 -c 'import sys,json; print((json.load(sys.stdin).get("job") or {}).get("status",""))')"
  echo "publish_status=$PUBLISH_STATUS poll=$i"
  [ "$PUBLISH_STATUS" = "completed" ] && break
  sleep 1
done
test "$PUBLISH_STATUS" = "completed"
test -n "$PUBLISH_JOB_FILE"

DATASET_ID="$(printf '%s\n' "$PUBLISH_JOB" | python3 -c 'import sys,json; print((json.load(sys.stdin).get("job") or {}).get("dataset_id",""))')"
PUBLISH_RECEIPT_ID="$(printf '%s\n' "$PUBLISH_JOB" | python3 -c 'import sys,json; rs=json.load(sys.stdin).get("receipts",[]); print((rs[0] if rs else {}).get("receipt_id",""))')"
PUBLISH_INPUT_HASH="$(printf '%s\n' "$PUBLISH_JOB" | python3 -c 'import sys,json; print((json.load(sys.stdin).get("job") or {}).get("input_hash",""))')"
test -n "$DATASET_ID"
test -n "$PUBLISH_RECEIPT_ID"

echo "dataset_id=$DATASET_ID"
echo "publish_receipt_id=$PUBLISH_RECEIPT_ID"

echo
echo "=== [3] remote verify job ==="
VERIFY_JSON="$(jpost_json "$REMOTE_NODE_BASE/jobs/submit" "{\"account\":\"$ACCOUNT\",\"kind\":\"datanet_fetch_verify\",\"plaintext\":\"{\\\"dataset_id\\\":\\\"$DATASET_ID\\\",\\\"expected_input_hash\\\":\\\"$PUBLISH_INPUT_HASH\\\"}\"}" 12)"
printf '%s\n' "$VERIFY_JSON" | tee "$OUT_DIR/remote-verify-submit.json"
VERIFY_JOB_ID="$(printf '%s\n' "$VERIFY_JSON" | python3 -c 'import sys,json; o=json.load(sys.stdin); print((o.get("job") or {}).get("job_id",""))')"
test -n "$VERIFY_JOB_ID"

VERIFY_JOB=""
VERIFY_STATUS=""
VERIFY_JOB_FILE=""
for i in $(seq 1 20); do
  VERIFY_JOB="$(jget "$REMOTE_NODE_BASE/jobs/$VERIFY_JOB_ID" 10)"
  VERIFY_JOB_FILE="$OUT_DIR/remote-verify-job-$i.json"
  printf '%s\n' "$VERIFY_JOB" | tee "$VERIFY_JOB_FILE" >/dev/null
  VERIFY_STATUS="$(printf '%s\n' "$VERIFY_JOB" | python3 -c 'import sys,json; print((json.load(sys.stdin).get("job") or {}).get("status",""))')"
  echo "verify_status=$VERIFY_STATUS poll=$i"
  [ "$VERIFY_STATUS" = "completed" ] && break
  sleep 1
done
test "$VERIFY_STATUS" = "completed"
test -n "$VERIFY_JOB_FILE"

VERIFY_RECEIPT_ID="$(printf '%s\n' "$VERIFY_JOB" | python3 -c 'import sys,json; rs=json.load(sys.stdin).get("receipts",[]); print((rs[0] if rs else {}).get("receipt_id",""))')"
test -n "$VERIFY_RECEIPT_ID"

echo
echo "=== [4] remote redundancy job ==="
REDUND_JSON="$(jpost_json "$REMOTE_NODE_BASE/jobs/submit" "{\"account\":\"$ACCOUNT\",\"kind\":\"datanet_redundancy_check\",\"plaintext\":\"{\\\"dataset_id\\\":\\\"$DATASET_ID\\\",\\\"expected_input_hash\\\":\\\"$PUBLISH_INPUT_HASH\\\"}\"}" 12)"
printf '%s\n' "$REDUND_JSON" | tee "$OUT_DIR/remote-redund-submit.json"
REDUND_JOB_ID="$(printf '%s\n' "$REDUND_JSON" | python3 -c 'import sys,json; o=json.load(sys.stdin); print((o.get("job") or {}).get("job_id",""))')"
test -n "$REDUND_JOB_ID"

REDUND_JOB=""
REDUND_STATUS=""
REDUND_JOB_FILE=""
for i in $(seq 1 20); do
  REDUND_JOB="$(jget "$REMOTE_NODE_BASE/jobs/$REDUND_JOB_ID" 10)"
  REDUND_JOB_FILE="$OUT_DIR/remote-redund-job-$i.json"
  printf '%s\n' "$REDUND_JOB" | tee "$REDUND_JOB_FILE" >/dev/null
  REDUND_STATUS="$(printf '%s\n' "$REDUND_JOB" | python3 -c 'import sys,json; print((json.load(sys.stdin).get("job") or {}).get("status",""))')"
  echo "redund_status=$REDUND_STATUS poll=$i"
  [ "$REDUND_STATUS" = "completed" ] && break
  sleep 1
done
test "$REDUND_STATUS" = "completed"
test -n "$REDUND_JOB_FILE"

REDUND_RECEIPT_ID="$(printf '%s\n' "$REDUND_JOB" | python3 -c 'import sys,json; rs=json.load(sys.stdin).get("receipts",[]); print((rs[0] if rs else {}).get("receipt_id",""))')"
test -n "$REDUND_RECEIPT_ID"

echo
echo "=== [5] fetch remote receipt/result surfaces from Precision ==="
REMOTE_RECEIPTS_HTTP="$(jget "$REMOTE_NODE_BASE/receipts?account=$ACCOUNT" 10)"
REMOTE_LOCAL_JOB_HTTP="$(jget "$REMOTE_NODE_BASE/datanet/v1/local-job/$DATASET_ID?who=$ACCOUNT" 10)"
printf '%s\n' "$REMOTE_RECEIPTS_HTTP" | tee "$OUT_DIR/remote-receipts-http.json"
printf '%s\n' "$REMOTE_LOCAL_JOB_HTTP" | tee "$OUT_DIR/remote-local-job-http.json"

echo
echo "=== [6] verify publish + verify + redundancy linkage ==="
python3 - \
  "$PUBLISH_JOB_FILE" \
  "$VERIFY_JOB_FILE" \
  "$REDUND_JOB_FILE" \
  "$OUT_DIR/remote-receipts-http.json" \
  "$OUT_DIR/remote-local-job-http.json" \
  "$ACCOUNT" \
  "$PLAINTEXT" \
  "$DATASET_ID" \
  "$PUBLISH_RECEIPT_ID" \
  "$VERIFY_RECEIPT_ID" \
  "$REDUND_RECEIPT_ID" <<'PY'
import hashlib, json, sys

publish_job = json.load(open(sys.argv[1]))
verify_job = json.load(open(sys.argv[2]))
redund_job = json.load(open(sys.argv[3]))
receipts_http = json.load(open(sys.argv[4]))
local_job = json.load(open(sys.argv[5]))
account = sys.argv[6]
plaintext = sys.argv[7]
dataset_id = sys.argv[8]
publish_receipt_id = sys.argv[9]
verify_receipt_id = sys.argv[10]
redund_receipt_id = sys.argv[11]

def job_ok(obj, kind):
    job = obj.get("job") or {}
    assert str(job.get("kind") or "") == kind, f"{kind} job kind mismatch: {job.get('kind')}"
    assert str(job.get("status") or "") == "completed", f"{kind} job not completed: {job.get('status')}"
    assert str(job.get("dataset_id") or "") == dataset_id, f"{kind} dataset mismatch: {job.get('dataset_id')} vs {dataset_id}"
    return job

job_ok(publish_job, "datanet_publish")
job_ok(verify_job, "datanet_fetch_verify")
job_ok(redund_job, "datanet_redundancy_check")

receipts = receipts_http.get("receipts") or []
by_id = {str(r.get("receipt_id") or ""): r for r in receipts}

assert publish_receipt_id in by_id, "publish receipt missing from receipts view"
assert verify_receipt_id in by_id, "verify receipt missing from receipts view"
assert redund_receipt_id in by_id, "redundancy receipt missing from receipts view"

publish_r = by_id[publish_receipt_id]
verify_r = by_id[verify_receipt_id]
redund_r = by_id[redund_receipt_id]

for name, r, kind in [
    ("publish", publish_r, "datanet_publish"),
    ("verify", verify_r, "datanet_fetch_verify"),
    ("redundancy", redund_r, "datanet_redundancy_check"),
]:
    assert str(r.get("kind") or "") == kind, f"{name} receipt kind mismatch: {r.get('kind')}"
    assert str(r.get("status") or "") == "completed", f"{name} receipt status mismatch: {r.get('status')}"
    assert str(r.get("dataset_id") or "") == dataset_id, f"{name} receipt dataset mismatch: {r.get('dataset_id')} vs {dataset_id}"
    out = r.get("output") or {}
    assert str(out.get("dataset_id") or "") == dataset_id, f"{name} output.dataset_id mismatch"
    if name == "publish":
        assert str(out.get("path") or "").endswith(dataset_id + ".txt"), f"{name} output.path mismatch: {out.get('path')}"

assert local_job.get("ok") is True, f"local-job route not ok: {local_job}"
assert str(local_job.get("who") or "") == account, f"local-job who mismatch: {local_job.get('who')} vs {account}"
assert str(local_job.get("id") or "") == dataset_id, f"local-job dataset mismatch: {local_job.get('id')} vs {dataset_id}"
assert str(local_job.get("file") or "").endswith(dataset_id + ".txt"), f"local-job file mismatch: {local_job.get('file')}"

got_plaintext = str(local_job.get("plaintext") or "")
got_sha256 = str(local_job.get("sha256") or "")
want_sha256 = hashlib.sha256(plaintext.encode("utf-8")).hexdigest()
assert got_plaintext == plaintext, f"plaintext mismatch: {got_plaintext!r} vs {plaintext!r}"
assert got_sha256 == want_sha256, f"sha mismatch: {got_sha256} vs {want_sha256}"

print("[ok] cross-machine verify/redundancy receipts validated from precision")
print(json.dumps({
    "ok": True,
    "dataset_id": dataset_id,
    "publish_receipt_id": publish_receipt_id,
    "verify_receipt_id": verify_receipt_id,
    "redund_receipt_id": redund_receipt_id,
    "verify_output": verify_r.get("output"),
    "redundancy_output": redund_r.get("output"),
    "sha256": got_sha256
}, indent=2))
PY

echo
echo "=== [7] final local/remote/network truth ==="
LOCAL_READY_AFTER="$(jget "$LOCAL_NODE_BASE/__void/ready.json" 5)"
LOCAL_HEALTH_AFTER="$(jget "$LOCAL_NODE_BASE/health" 5)"
LOCAL_HEAD_AFTER="$(jget "$LOCAL_NODE_BASE/head.txt" 5)"
REMOTE_READY_AFTER="$(jget "$REMOTE_NODE_BASE/__void/ready.json" 8)"
REMOTE_HEALTH_AFTER="$(jget "$REMOTE_NODE_BASE/health" 8)"
REMOTE_HEAD_AFTER="$(jget "$REMOTE_NODE_BASE/head.txt" 8)"

printf '%s\n' "$LOCAL_READY_AFTER" | tee "$OUT_DIR/local-ready-after.json"
printf '%s\n' "$LOCAL_HEALTH_AFTER" | tee "$OUT_DIR/local-health-after.json"
printf '%s\n' "$LOCAL_HEAD_AFTER" | tee "$OUT_DIR/local-head-after.txt"
printf '%s\n' "$REMOTE_READY_AFTER" | tee "$OUT_DIR/remote-ready-after.json"
printf '%s\n' "$REMOTE_HEALTH_AFTER" | tee "$OUT_DIR/remote-health-after.json"
printf '%s\n' "$REMOTE_HEAD_AFTER" | tee "$OUT_DIR/remote-head-after.txt"

python3 - "$LOCAL_READY_AFTER" "$REMOTE_READY_AFTER" "$LOCAL_HEALTH_AFTER" "$REMOTE_HEALTH_AFTER" "$LOCAL_HEAD_AFTER" "$REMOTE_HEAD_AFTER" <<'PY'
import json, sys
local_ready = json.loads(sys.argv[1])
remote_ready = json.loads(sys.argv[2])
local_health = json.loads(sys.argv[3])
remote_health = json.loads(sys.argv[4])
local_head = int(sys.argv[5].strip())
remote_head = int(sys.argv[6].strip())

local_node = str(local_health.get("nodeId") or "")
remote_node = str(remote_health.get("nodeId") or "")
local_peers = [str(x) for x in (local_health.get("peers") or [])]
remote_peers = [str(x) for x in (remote_health.get("peers") or [])]

assert local_ready.get("ready") is True, "local ready after != true"
assert remote_ready.get("ready") is True, "remote ready after != true"
assert local_ready.get("gap") == 0, f"local gap after != 0: {local_ready.get('gap')}"
assert remote_ready.get("gap") == 0, f"remote gap after != 0: {remote_ready.get('gap')}"
assert local_ready.get("txroot_live") == 1, f"local txroot_live after != 1: {local_ready.get('txroot_live')}"
assert remote_ready.get("txroot_live") == 1, f"remote txroot_live after != 1: {remote_ready.get('txroot_live')}"
assert local_head == remote_head, f"head mismatch after flow: {local_head} vs {remote_head}"
assert remote_node in local_peers, f"remote nodeId {remote_node} not found in local peers after flow"
assert local_node in remote_peers, f"local nodeId {local_node} not found in remote peers after flow"

print("[ok] final network truth still aligned")
print(json.dumps({
  "ok": True,
  "local_node_id": local_node,
  "remote_node_id": remote_node,
  "local_head_after": local_head,
  "remote_head_after": remote_head
}, indent=2))
PY

echo
echo "=== [8] success ==="
echo "[ok] two-box remote verify/redundancy proof green"
