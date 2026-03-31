#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
ALIEN_HOST="${ALIEN##*@}"
LOCAL_NODE_BASE="${LOCAL_NODE_BASE:-http://127.0.0.1:4100}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://${ALIEN_HOST}:4100}"
ACCOUNT="${ACCOUNT:-alien-workloop-user-$(date +%Y%m%d-%H%M%S)}"
TS_NOW="$(date +%Y%m%d-%H%M%S)"
PLAINTEXT="${PLAINTEXT:-two-box datanet workloop proof $TS_NOW}"
OUT_DIR="${OUT_DIR:-/tmp/two-box-datanet-workloop-proof-$(date +%Y%m%d-%H%M%S)}"
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

printf '%s\n' "$LOCAL_READY"
printf '%s\n' "$LOCAL_HEALTH"
printf '%s\n' "$LOCAL_HEAD"
printf '%s\n' "$REMOTE_READY"
printf '%s\n' "$REMOTE_HEALTH"
printf '%s\n' "$REMOTE_HEAD"

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
assert remote_node in local_peers, f"remote nodeId {remote_node} not in local peers"
assert local_node in remote_peers, f"local nodeId {local_node} not in remote peers"
print("[ok] baseline network truth aligned")
PY

echo
echo "=== [2] remote publish on Alienware ==="
PUBLISH_JSON="$(jpost_json "$REMOTE_NODE_BASE/jobs/submit" "{\"account\":\"$ACCOUNT\",\"kind\":\"datanet_publish\",\"plaintext\":\"$PLAINTEXT\"}" 12)"
printf '%s\n' "$PUBLISH_JSON" | tee "$OUT_DIR/publish-submit.json"

PUBLISH_JOB_ID="$(printf '%s\n' "$PUBLISH_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("job",{}).get("job_id",""))')"
test -n "$PUBLISH_JOB_ID"
echo "publish_job_id=$PUBLISH_JOB_ID"

echo
echo "=== [3] poll publish completion ==="
PUBLISH_JOB=""
PUBLISH_STATUS=""
for i in $(seq 1 20); do
  PUBLISH_JOB="$(jget "$REMOTE_NODE_BASE/jobs/$PUBLISH_JOB_ID" 10)"
  printf '%s\n' "$PUBLISH_JOB" | tee "$OUT_DIR/publish-job-$i.json" >/dev/null
  PUBLISH_STATUS="$(printf '%s\n' "$PUBLISH_JOB" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("job",{}).get("status",""))')"
  echo "publish_status=$PUBLISH_STATUS poll=$i"
  [ "$PUBLISH_STATUS" = "completed" ] && break
  sleep 1
done
test "$PUBLISH_STATUS" = "completed"

DATASET_ID="$(printf '%s\n' "$PUBLISH_JOB" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("job",{}).get("dataset_id",""))')"
PUBLISH_RECEIPT_ID="$(printf '%s\n' "$PUBLISH_JOB" | python3 -c 'import sys,json; rs=json.load(sys.stdin).get("receipts",[]); print((rs[0] if rs else {}).get("receipt_id",""))')"
PUBLISH_INPUT_HASH="$(printf '%s\n' "$PUBLISH_JOB" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("job",{}).get("input_hash",""))')"
test -n "$DATASET_ID"
test -n "$PUBLISH_RECEIPT_ID"

echo "dataset_id=$DATASET_ID"
echo "publish_receipt_id=$PUBLISH_RECEIPT_ID"

echo
echo "=== [4] precision readback of remote ds_* payload ==="
READBACK_JSON="$(jget "$REMOTE_NODE_BASE/datanet/v1/local-job/$DATASET_ID?who=$ACCOUNT" 10)"
printf '%s\n' "$READBACK_JSON" | tee "$OUT_DIR/readback.json"

python3 - "$OUT_DIR/readback.json" "$PLAINTEXT" "$DATASET_ID" "$ACCOUNT" "$PUBLISH_INPUT_HASH" <<'PY'
import hashlib, json, sys
o = json.load(open(sys.argv[1]))
plaintext = sys.argv[2]
dataset_id = sys.argv[3]
account = sys.argv[4]
input_hash = sys.argv[5]
assert o.get("ok") is True, f"readback not ok: {o}"
assert str(o.get("id") or "") == dataset_id, f"dataset mismatch: {o.get('id')} vs {dataset_id}"
assert str(o.get("who") or "") == account, f"who mismatch: {o.get('who')} vs {account}"
got_plain = str(o.get("plaintext") or "")
got_sha = str(o.get("sha256") or "")
want_sha = hashlib.sha256(plaintext.encode("utf-8")).hexdigest()
assert got_plain == plaintext, f"plaintext mismatch: {got_plain!r} vs {plaintext!r}"
assert got_sha == want_sha, f"sha mismatch: {got_sha} vs {want_sha}"
if input_hash:
    assert input_hash == want_sha, f"input_hash mismatch: {input_hash} vs {want_sha}"
print("[ok] remote readback payload validated from precision")
PY

echo
echo "=== [5] remote fetch_verify / redundancy_check probes (non-blocking for now) ==="
VERIFY_JSON="$(jpost_json "$REMOTE_NODE_BASE/jobs/submit" "{\"account\":\"$ACCOUNT\",\"kind\":\"datanet_fetch_verify\",\"dataset_id\":\"$DATASET_ID\"}" 12 2>/dev/null || true)"
printf '%s\n' "$VERIFY_JSON" | tee "$OUT_DIR/verify-submit.json"
REDUND_JSON="$(jpost_json "$REMOTE_NODE_BASE/jobs/submit" "{\"account\":\"$ACCOUNT\",\"kind\":\"datanet_redundancy_check\",\"dataset_id\":\"$DATASET_ID\"}" 12 2>/dev/null || true)"
printf '%s\n' "$REDUND_JSON" | tee "$OUT_DIR/redund-submit.json"

echo
echo "=== [6] receipt view after work loop ==="
RECEIPTS_AFTER="$(jget "$REMOTE_NODE_BASE/receipts?account=$ACCOUNT" 10)"
printf '%s\n' "$RECEIPTS_AFTER" | tee "$OUT_DIR/receipts-after.json"

echo
echo "=== [7] final local/remote/network truth ==="
LOCAL_READY_AFTER="$(jget "$LOCAL_NODE_BASE/__void/ready.json" 5)"
LOCAL_HEALTH_AFTER="$(jget "$LOCAL_NODE_BASE/health" 5)"
LOCAL_HEAD_AFTER="$(jget "$LOCAL_NODE_BASE/head.txt" 5)"
REMOTE_READY_AFTER="$(jget "$REMOTE_NODE_BASE/__void/ready.json" 8)"
REMOTE_HEALTH_AFTER="$(jget "$REMOTE_NODE_BASE/health" 8)"
REMOTE_HEAD_AFTER="$(jget "$REMOTE_NODE_BASE/head.txt" 8)"

printf '%s\n' "$LOCAL_READY_AFTER"
printf '%s\n' "$LOCAL_HEALTH_AFTER"
printf '%s\n' "$LOCAL_HEAD_AFTER"
printf '%s\n' "$REMOTE_READY_AFTER"
printf '%s\n' "$REMOTE_HEALTH_AFTER"
printf '%s\n' "$REMOTE_HEAD_AFTER"

printf '%s
' "$PUBLISH_JOB" | tee "$OUT_DIR/publish-job-final.json" >/dev/null

python3 - \
  "$OUT_DIR/publish-job-final.json" \
  "$OUT_DIR/readback.json" \
  "$OUT_DIR/receipts-after.json" \
  "$LOCAL_READY_AFTER" \
  "$REMOTE_READY_AFTER" \
  "$LOCAL_HEALTH_AFTER" \
  "$REMOTE_HEALTH_AFTER" \
  "$LOCAL_HEAD_AFTER" \
  "$REMOTE_HEAD_AFTER" \
  "$DATASET_ID" \
  "$PUBLISH_RECEIPT_ID" <<'PY'
import json, sys

publish_job = json.load(open(sys.argv[1]))
readback = json.load(open(sys.argv[2]))
receipts_after = json.load(open(sys.argv[3]))
local_ready = json.loads(sys.argv[4])
remote_ready = json.loads(sys.argv[5])
local_health = json.loads(sys.argv[6])
remote_health = json.loads(sys.argv[7])
local_head = int(sys.argv[8].strip())
remote_head = int(sys.argv[9].strip())
dataset_id = sys.argv[10]
publish_receipt_id = sys.argv[11]

assert str((publish_job.get("job") or {}).get("dataset_id") or "") == dataset_id, "publish dataset mismatch"
assert readback.get("ok") is True, "readback not ok"
assert str(readback.get("id") or "") == dataset_id, "readback dataset mismatch"

receipts = receipts_after.get("receipts") or []
assert any(str(r.get("receipt_id") or "") == publish_receipt_id for r in receipts), "publish receipt not found after loop"

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
assert local_head == remote_head, f"head mismatch after loop: {local_head} vs {remote_head}"
assert remote_node in local_peers, f"remote nodeId {remote_node} not found in local peers after loop"
assert local_node in remote_peers, f"local nodeId {local_node} not found in remote peers after loop"

print("[ok] two-box datanet workloop proof validated")
print(json.dumps({
  "ok": True,
  "dataset_id": dataset_id,
  "publish_receipt_id": publish_receipt_id,
  "local_node_id": local_node,
  "remote_node_id": remote_node,
  "local_head_after": local_head,
  "remote_head_after": remote_head,
  "local_ready_after": local_ready.get("ready"),
  "remote_ready_after": remote_ready.get("ready"),
  "local_gap_after": local_ready.get("gap"),
  "remote_gap_after": remote_ready.get("gap"),
  "local_txroot_live_after": local_ready.get("txroot_live"),
  "remote_txroot_live_after": remote_ready.get("txroot_live")
}, indent=2))
PY

echo
echo "=== [8] success ==="
echo "[ok] two-box datanet workloop proof green"
