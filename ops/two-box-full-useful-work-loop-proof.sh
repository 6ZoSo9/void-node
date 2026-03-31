#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
ALIEN_HOST="${ALIEN##*@}"
LOCAL_NODE_BASE="${LOCAL_NODE_BASE:-http://127.0.0.1:4100}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://${ALIEN_HOST}:4100}"
REMOTE_ACCOUNT="${REMOTE_ACCOUNT:-alien-full-loop-user-$(date +%Y%m%d-%H%M%S)}"
RUNNER_ACCOUNT="${RUNNER_ACCOUNT:-runner-full-loop-user-$(date +%Y%m%d-%H%M%S)}"
TS_NOW="$(date +%Y%m%d-%H%M%S)"
PLAINTEXT="${PLAINTEXT:-two-box full useful work loop proof $TS_NOW}"
OUT_DIR="${OUT_DIR:-/tmp/two-box-full-useful-work-loop-proof-$(date +%Y%m%d-%H%M%S)}"
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
assert remote_node in local_peers, f"remote nodeId {remote_node} not in local peers"
assert local_node in remote_peers, f"local nodeId {local_node} not in remote peers"
print("[ok] baseline network truth aligned")
PY

echo
echo "=== [2] remote publish on Alienware ==="
PUBLISH_JSON="$(jpost_json "$REMOTE_NODE_BASE/jobs/submit" "{\"account\":\"$REMOTE_ACCOUNT\",\"kind\":\"datanet_publish\",\"plaintext\":\"$PLAINTEXT\"}" 12)"
printf '%s\n' "$PUBLISH_JSON" | tee "$OUT_DIR/remote-publish-submit.json"

PUBLISH_JOB_ID="$(printf '%s\n' "$PUBLISH_JSON" | python3 -c 'import sys,json; o=json.load(sys.stdin); print((o.get("job") or {}).get("job_id",""))')"
test -n "$PUBLISH_JOB_ID"

PUBLISH_JOB=""
PUBLISH_STATUS=""
for i in $(seq 1 20); do
  PUBLISH_JOB="$(jget "$REMOTE_NODE_BASE/jobs/$PUBLISH_JOB_ID" 10)"
  printf '%s\n' "$PUBLISH_JOB" | tee "$OUT_DIR/remote-publish-job-$i.json" >/dev/null
  PUBLISH_STATUS="$(printf '%s\n' "$PUBLISH_JOB" | python3 -c 'import sys,json; print((json.load(sys.stdin).get("job") or {}).get("status",""))')"
  echo "remote_publish_status=$PUBLISH_STATUS poll=$i"
  [ "$PUBLISH_STATUS" = "completed" ] && break
  sleep 1
done
test "$PUBLISH_STATUS" = "completed"

REMOTE_DATASET_ID="$(printf '%s\n' "$PUBLISH_JOB" | python3 -c 'import sys,json; print((json.load(sys.stdin).get("job") or {}).get("dataset_id",""))')"
REMOTE_RECEIPT_ID="$(printf '%s\n' "$PUBLISH_JOB" | python3 -c 'import sys,json; rs=json.load(sys.stdin).get("receipts",[]); print((rs[0] if rs else {}).get("receipt_id",""))')"
REMOTE_INPUT_HASH="$(printf '%s\n' "$PUBLISH_JOB" | python3 -c 'import sys,json; print((json.load(sys.stdin).get("job") or {}).get("input_hash",""))')"
test -n "$REMOTE_DATASET_ID"
test -n "$REMOTE_RECEIPT_ID"

echo "remote_dataset_id=$REMOTE_DATASET_ID"
echo "remote_receipt_id=$REMOTE_RECEIPT_ID"

echo
echo "=== [3] precision readback of remote ds_* payload ==="
READBACK_JSON="$(jget "$REMOTE_NODE_BASE/datanet/v1/local-job/$REMOTE_DATASET_ID?who=$REMOTE_ACCOUNT" 10)"
printf '%s\n' "$READBACK_JSON" | tee "$OUT_DIR/remote-readback.json"

python3 - "$OUT_DIR/remote-readback.json" "$PLAINTEXT" "$REMOTE_DATASET_ID" "$REMOTE_ACCOUNT" "$REMOTE_INPUT_HASH" <<'PY'
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
echo "=== [4] local runner verify+redundancy proof ==="
PUBLISH_LOCAL="$(jpost_json "$LOCAL_NODE_BASE/jobs/submit" "{\"account\":\"$RUNNER_ACCOUNT\",\"kind\":\"datanet_publish\",\"plaintext\":\"runner seed $(date +%s)\"}" 12)"
printf '%s\n' "$PUBLISH_LOCAL" | tee "$OUT_DIR/local-runner-seed-submit.json"
LOCAL_SEED_JOB_ID="$(printf '%s\n' "$PUBLISH_LOCAL" | python3 -c 'import sys,json; o=json.load(sys.stdin); print((o.get("job") or {}).get("job_id",""))')"
test -n "$LOCAL_SEED_JOB_ID"

LOCAL_SEED_JOB=""
LOCAL_SEED_STATUS=""
for i in $(seq 1 20); do
  LOCAL_SEED_JOB="$(jget "$LOCAL_NODE_BASE/jobs/$LOCAL_SEED_JOB_ID" 10)"
  printf '%s\n' "$LOCAL_SEED_JOB" | tee "$OUT_DIR/local-runner-seed-job-$i.json" >/dev/null
  LOCAL_SEED_STATUS="$(printf '%s\n' "$LOCAL_SEED_JOB" | python3 -c 'import sys,json; print((json.load(sys.stdin).get("job") or {}).get("status",""))')"
  echo "local_seed_status=$LOCAL_SEED_STATUS poll=$i"
  [ "$LOCAL_SEED_STATUS" = "completed" ] && break
  sleep 1
done
test "$LOCAL_SEED_STATUS" = "completed"

curl -fsS --max-time 10 -H 'content-type: application/json' -X POST "$LOCAL_NODE_BASE/wc/runner/config" \
  --data "{\"account\":\"$RUNNER_ACCOUNT\",\"safe_mode\":false,\"min_submit_gap_ms\":5000,\"max_jobs_per_hour\":20,\"allow_datanet_publish\":false,\"allow_datanet_fetch_verify\":true,\"allow_datanet_redundancy_check\":true}" \
  | tee "$OUT_DIR/local-runner-config-set.json"
echo
curl -fsS --max-time 10 -H 'content-type: application/json' -X POST "$LOCAL_NODE_BASE/wc/runner/set" \
  --data "{\"account\":\"$RUNNER_ACCOUNT\",\"enabled\":true}" \
  | tee "$OUT_DIR/local-runner-set.json"
echo

for i in $(seq 1 12); do
  T="$(curl -fsS --max-time 15 -H 'content-type: application/json' -X POST "$LOCAL_NODE_BASE/wc/runner/tick" --data "{\"account\":\"$RUNNER_ACCOUNT\"}")"
  printf '%s\n' "$T" | tee "$OUT_DIR/local-runner-tick-$i.json"
  sleep 1
done

LOCAL_RUNNER_STATUS="$(jget "$LOCAL_NODE_BASE/wc/runner/status?account=$RUNNER_ACCOUNT" 10)"
LOCAL_RUNNER_RECEIPTS="$(jget "$LOCAL_NODE_BASE/receipts?account=$RUNNER_ACCOUNT" 10)"
printf '%s\n' "$LOCAL_RUNNER_STATUS" | tee "$OUT_DIR/local-runner-status-after.json"
printf '%s\n' "$LOCAL_RUNNER_RECEIPTS" | tee "$OUT_DIR/local-runner-receipts-after.json"

python3 - "$OUT_DIR"/local-runner-tick-*.json "$OUT_DIR/local-runner-receipts-after.json" <<'PY'
import json, sys

tick_paths = sys.argv[1:-1]
receipts_after = json.load(open(sys.argv[-1]))

verify_hits = []
redund_hits = []

for path in tick_paths:
    try:
        o = json.load(open(path))
    except Exception:
        continue
    runner = o.get("runner") or {}
    last = runner.get("last_result") or {}
    klass = str(last.get("selected_task_class") or "")
    dsid = str(last.get("selected_dataset_id") or "")
    job_id = str(last.get("job_id") or "")
    if klass == "datanet_fetch_verify":
        verify_hits.append((path, dsid, job_id))
    if klass == "datanet_redundancy_check":
        redund_hits.append((path, dsid, job_id))

assert verify_hits, "runner never selected datanet_fetch_verify"
assert redund_hits, "runner never selected datanet_redundancy_check"

v_path, v_dsid, v_job = verify_hits[0]
r_path, r_dsid, r_job = redund_hits[0]

assert v_dsid.startswith("ds_"), f"verify dataset not ds_*: {v_dsid}"
assert r_dsid.startswith("ds_"), f"redundancy dataset not ds_*: {r_dsid}"
assert v_job.startswith("job_"), f"verify job_id missing: {v_job}"
assert r_job.startswith("job_"), f"redundancy job_id missing: {r_job}"

receipts = receipts_after.get("receipts") or []
verify_receipts = [r for r in receipts if str(r.get("kind") or "") == "datanet_fetch_verify"]
redund_receipts = [r for r in receipts if str(r.get("kind") or "") == "datanet_redundancy_check"]

assert verify_receipts, "no completed verify receipts found"
assert redund_receipts, "no completed redundancy receipts found"

print("[ok] local runner selected real verify and redundancy tasks with receipts")
print(json.dumps({
    "ok": True,
    "verify": {
        "tick_file": v_path,
        "dataset_id": v_dsid,
        "job_id": v_job,
        "receipt_count": len(verify_receipts)
    },
    "redundancy": {
        "tick_file": r_path,
        "dataset_id": r_dsid,
        "job_id": r_job,
        "receipt_count": len(redund_receipts)
    }
}, indent=2))
PY

echo
echo "=== [5] final local/remote/network truth ==="
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

python3 - \
  "$LOCAL_READY_AFTER" \
  "$REMOTE_READY_AFTER" \
  "$LOCAL_HEALTH_AFTER" \
  "$REMOTE_HEALTH_AFTER" \
  "$LOCAL_HEAD_AFTER" \
  "$REMOTE_HEAD_AFTER" \
  "$OUT_DIR/remote-readback.json" \
  "$OUT_DIR/local-runner-receipts-after.json" \
  "$REMOTE_DATASET_ID" \
  "$REMOTE_RECEIPT_ID" <<'PY'
import json, sys

local_ready = json.loads(sys.argv[1])
remote_ready = json.loads(sys.argv[2])
local_health = json.loads(sys.argv[3])
remote_health = json.loads(sys.argv[4])
local_head = int(sys.argv[5].strip())
remote_head = int(sys.argv[6].strip())
remote_readback = json.load(open(sys.argv[7]))
local_runner_receipts = json.load(open(sys.argv[8]))
remote_dataset_id = sys.argv[9]
remote_receipt_id = sys.argv[10]

assert remote_readback.get("ok") is True, "remote readback not ok"
assert str(remote_readback.get("id") or "") == remote_dataset_id, "remote dataset mismatch"

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
assert local_head == remote_head, f"head mismatch after full loop: {local_head} vs {remote_head}"
assert remote_node in local_peers, f"remote nodeId {remote_node} not found in local peers after full loop"
assert local_node in remote_peers, f"local nodeId {local_node} not found in remote peers after full loop"

receipts = local_runner_receipts.get("receipts") or []
assert any(str(r.get("kind") or "") == "datanet_fetch_verify" for r in receipts), "missing local verify receipt"
assert any(str(r.get("kind") or "") == "datanet_redundancy_check" for r in receipts), "missing local redundancy receipt"

print("[ok] two-box full useful work loop validated")
print(json.dumps({
    "ok": True,
    "remote_dataset_id": remote_dataset_id,
    "remote_receipt_id": remote_receipt_id,
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
echo "=== [6] success ==="
echo "[ok] two-box full useful work loop proof green"
