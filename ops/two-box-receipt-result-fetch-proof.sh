#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
ALIEN_HOST="${ALIEN##*@}"
LOCAL_NODE_BASE="${LOCAL_NODE_BASE:-http://127.0.0.1:4100}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://${ALIEN_HOST}:4100}"
ACCOUNT="${ACCOUNT:-alien-receipt-fetch-user-$(date +%Y%m%d-%H%M%S)}"
TS_NOW="$(date +%Y%m%d-%H%M%S)"
PLAINTEXT="${PLAINTEXT:-two-box receipt result fetch proof $TS_NOW}"
OUT_DIR="${OUT_DIR:-/tmp/two-box-receipt-result-fetch-proof-$(date +%Y%m%d-%H%M%S)}"
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
print(json.dumps({
  "ok": True,
  "local_node_id": local_node,
  "remote_node_id": remote_node,
  "local_head": local_head,
  "remote_head": remote_head
}, indent=2))
PY

echo
echo "=== [2] submit remote publish on Alienware ==="
PUBLISH_JSON="$(jpost_json "$REMOTE_NODE_BASE/jobs/submit" "{\"account\":\"$ACCOUNT\",\"kind\":\"datanet_publish\",\"plaintext\":\"$PLAINTEXT\"}" 12)"
printf '%s\n' "$PUBLISH_JSON" | tee "$OUT_DIR/remote-publish-submit.json"

JOB_ID="$(printf '%s\n' "$PUBLISH_JSON" | python3 -c 'import sys,json; o=json.load(sys.stdin); print((o.get("job") or {}).get("job_id",""))')"
test -n "$JOB_ID"
echo "job_id=$JOB_ID"

echo
echo "=== [3] poll remote publish completion ==="
JOB_JSON=""
JOB_STATUS=""
for i in $(seq 1 20); do
  JOB_JSON="$(jget "$REMOTE_NODE_BASE/jobs/$JOB_ID" 10)"
  printf '%s\n' "$JOB_JSON" | tee "$OUT_DIR/remote-job-$i.json" >/dev/null
  JOB_STATUS="$(printf '%s\n' "$JOB_JSON" | python3 -c 'import sys,json; print((json.load(sys.stdin).get("job") or {}).get("status",""))')"
  echo "remote_job_status=$JOB_STATUS poll=$i"
  [ "$JOB_STATUS" = "completed" ] && break
  sleep 1
done
test "$JOB_STATUS" = "completed"

RECEIPT_ID="$(printf '%s\n' "$JOB_JSON" | python3 -c 'import sys,json; rs=json.load(sys.stdin).get("receipts",[]); print((rs[0] if rs else {}).get("receipt_id",""))')"
DATASET_ID="$(printf '%s\n' "$JOB_JSON" | python3 -c 'import sys,json; print((json.load(sys.stdin).get("job") or {}).get("dataset_id",""))')"
test -n "$RECEIPT_ID"
test -n "$DATASET_ID"

echo "receipt_id=$RECEIPT_ID"
echo "dataset_id=$DATASET_ID"

echo
echo "=== [4] fetch remote receipt/result surfaces from Precision ==="
REMOTE_JOB_HTTP="$(jget "$REMOTE_NODE_BASE/jobs/$JOB_ID" 10)"
REMOTE_RECEIPTS_HTTP="$(jget "$REMOTE_NODE_BASE/receipts?account=$ACCOUNT" 10)"
REMOTE_LOCAL_JOB_HTTP="$(jget "$REMOTE_NODE_BASE/datanet/v1/local-job/$DATASET_ID?who=$ACCOUNT" 10)"

printf '%s\n' "$REMOTE_JOB_HTTP" | tee "$OUT_DIR/remote-job-http.json"
printf '%s\n' "$REMOTE_RECEIPTS_HTTP" | tee "$OUT_DIR/remote-receipts-http.json"
printf '%s\n' "$REMOTE_LOCAL_JOB_HTTP" | tee "$OUT_DIR/remote-local-job-http.json"

echo
echo "=== [5] verify receipt/result linkage ==="
python3 - \
  "$OUT_DIR/remote-job-http.json" \
  "$OUT_DIR/remote-receipts-http.json" \
  "$OUT_DIR/remote-local-job-http.json" \
  "$ACCOUNT" \
  "$PLAINTEXT" \
  "$JOB_ID" \
  "$RECEIPT_ID" \
  "$DATASET_ID" <<'PY'
import hashlib, json, os, sys

remote_job = json.load(open(sys.argv[1]))
remote_receipts = json.load(open(sys.argv[2]))
remote_local_job = json.load(open(sys.argv[3]))
account = sys.argv[4]
plaintext = sys.argv[5]
job_id = sys.argv[6]
receipt_id = sys.argv[7]
dataset_id = sys.argv[8]

job = remote_job.get("job") or {}
assert str(job.get("job_id") or "") == job_id, f"job_id mismatch: {job.get('job_id')} vs {job_id}"
assert str(job.get("status") or "") == "completed", f"job not completed: {job.get('status')}"
assert str(job.get("dataset_id") or "") == dataset_id, f"job dataset mismatch: {job.get('dataset_id')} vs {dataset_id}"

receipts = remote_receipts.get("receipts") or []
match = None
for r in receipts:
    if str(r.get("receipt_id") or "") == receipt_id:
        match = r
        break
assert match is not None, f"receipt_id {receipt_id} not found in remote receipts"

kind = str(match.get("kind") or "")
status = str(match.get("status") or "")
r_dataset = str(match.get("dataset_id") or "")
output = match.get("output") or {}
output_dataset = str(output.get("dataset_id") or "")
output_path = str(output.get("path") or "")

assert kind == "datanet_publish", f"unexpected receipt kind: {kind}"
assert status == "completed", f"unexpected receipt status: {status}"
assert r_dataset == dataset_id, f"receipt dataset mismatch: {r_dataset} vs {dataset_id}"
assert output_dataset == dataset_id, f"receipt output.dataset_id mismatch: {output_dataset} vs {dataset_id}"
assert output_path.endswith(dataset_id + ".txt"), f"output.path does not end with dataset file: {output_path}"

assert remote_local_job.get("ok") is True, f"local-job route not ok: {remote_local_job}"
assert str(remote_local_job.get("who") or "") == account, f"local-job who mismatch: {remote_local_job.get('who')} vs {account}"
assert str(remote_local_job.get("id") or "") == dataset_id, f"local-job dataset mismatch: {remote_local_job.get('id')} vs {dataset_id}"

got_plaintext = str(remote_local_job.get("plaintext") or "")
got_sha256 = str(remote_local_job.get("sha256") or "")
want_sha256 = hashlib.sha256(plaintext.encode("utf-8")).hexdigest()

assert got_plaintext == plaintext, f"plaintext mismatch: {got_plaintext!r} vs {plaintext!r}"
assert got_sha256 == want_sha256, f"sha256 mismatch: {got_sha256} vs {want_sha256}"

readback_file = str(remote_local_job.get("file") or "")
assert readback_file.endswith(dataset_id + ".txt"), f"readback file does not end with dataset file: {readback_file}"

print("[ok] two-box receipt/result linkage validated from precision")
print(json.dumps({
  "ok": True,
  "job_id": job_id,
  "receipt_id": receipt_id,
  "dataset_id": dataset_id,
  "kind": kind,
  "status": status,
  "output_path": output_path,
  "readback_file": readback_file,
  "sha256": got_sha256
}, indent=2))
PY

echo
echo "=== [6] final local/remote/network truth ==="
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
echo "=== [7] success ==="
echo "[ok] two-box receipt/result fetch proof green"
