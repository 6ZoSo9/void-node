#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
ALIEN_HOST="${ALIEN##*@}"
LOCAL_NODE_BASE="${LOCAL_NODE_BASE:-http://127.0.0.1:4100}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://${ALIEN_HOST}:4100}"
ACCOUNT="${ACCOUNT:-alien-peerpath-user-$(date +%Y%m%d-%H%M%S)}"
TS_NOW="$(date +%Y%m%d-%H%M%S)"
PLAINTEXT="${PLAINTEXT:-two-box datanet peer-path proof $TS_NOW}"
OUT_DIR="${OUT_DIR:-/tmp/two-box-datanet-peer-path-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT_DIR"

jget() {
  curl -fsS --max-time "${2:-8}" "$1"
}

echo "=== [1] baseline local/remote/network truth ==="
echo "--- local ready ---"
LOCAL_READY="$(jget "$LOCAL_NODE_BASE/__void/ready.json" 5)"
printf '%s\n' "$LOCAL_READY"
echo "--- local health ---"
LOCAL_HEALTH="$(jget "$LOCAL_NODE_BASE/health" 5)"
printf '%s\n' "$LOCAL_HEALTH"
echo "--- local head ---"
LOCAL_HEAD="$(jget "$LOCAL_NODE_BASE/head.txt" 5)"
printf '%s\n' "$LOCAL_HEAD"
echo "--- remote ready ---"
REMOTE_READY="$(jget "$REMOTE_NODE_BASE/__void/ready.json" 8)"
printf '%s\n' "$REMOTE_READY"
echo "--- remote health ---"
REMOTE_HEALTH="$(jget "$REMOTE_NODE_BASE/health" 8)"
printf '%s\n' "$REMOTE_HEALTH"
echo "--- remote head ---"
REMOTE_HEAD="$(jget "$REMOTE_NODE_BASE/head.txt" 8)"
printf '%s\n' "$REMOTE_HEAD"
echo

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

assert local_node, "local nodeId missing"
assert remote_node, "remote nodeId missing"
assert remote_node in local_peers, f"remote nodeId {remote_node} not found in local peers {local_peers}"
assert local_node in remote_peers, f"local nodeId {local_node} not found in remote peers {remote_peers}"

print("[ok] baseline network truth aligned")
print(json.dumps({
    "ok": True,
    "local_node_id": local_node,
    "remote_node_id": remote_node,
    "local_head": local_head,
    "remote_head": remote_head,
}, indent=2))
PY
echo

echo "=== [2] run remote datanet publish/receipt flow ==="
REMOTE_OUT="$(
  ACCOUNT="$ACCOUNT" PLAINTEXT="$PLAINTEXT" ALIEN="$ALIEN" REMOTE_NODE_BASE="$REMOTE_NODE_BASE" bash ops/two-box-datanet-proof.sh
)"
printf '%s\n' "$REMOTE_OUT" | tee "$OUT_DIR/remote-proof-output.log"

echo
echo "=== [3] extract remote proof summary ==="
python3 - "$OUT_DIR/remote-proof-output.log" "$OUT_DIR/remote-proof-summary.json" <<'PY'
import json, pathlib, sys
src = pathlib.Path(sys.argv[1]).read_text()
dst = pathlib.Path(sys.argv[2])
start = src.rfind('{\n  "ok": true,')
if start == -1:
    raise SystemExit("[fail] summary json block not found in remote proof output")
tail = src[start:]
depth = 0
end = None
for i, ch in enumerate(tail):
    if ch == "{":
        depth += 1
    elif ch == "}":
        depth -= 1
        if depth == 0:
            end = i + 1
            break
if end is None:
    raise SystemExit("[fail] could not close summary json block")
obj = json.loads(tail[:end])
dst.write_text(json.dumps(obj, indent=2) + "\n")
print(json.dumps(obj, indent=2))
PY

JOB_ID="$(python3 - "$OUT_DIR/remote-proof-summary.json" <<'PY'
import json, sys
obj = json.load(open(sys.argv[1]))
print(obj.get("job_id",""))
PY
)"
RECEIPT_ID="$(python3 - "$OUT_DIR/remote-proof-summary.json" <<'PY'
import json, sys
obj = json.load(open(sys.argv[1]))
print(obj.get("receipt_id",""))
PY
)"
DATASET_ID="$(python3 - "$OUT_DIR/remote-proof-summary.json" <<'PY'
import json, sys
obj = json.load(open(sys.argv[1]))
print(obj.get("dataset_id",""))
PY
)"
test -n "$JOB_ID"
test -n "$RECEIPT_ID"
test -n "$DATASET_ID"

echo
echo "=== [4] verify remote node directly from local ==="
echo "--- remote job via precision ---"
REMOTE_JOB_HTTP="$(jget "$REMOTE_NODE_BASE/jobs/$JOB_ID" 10)"
printf '%s\n' "$REMOTE_JOB_HTTP" | tee "$OUT_DIR/remote-job-http.json"
echo "--- remote receipts via precision ---"
REMOTE_RECEIPTS_HTTP="$(jget "$REMOTE_NODE_BASE/receipts?account=$ACCOUNT" 10)"
printf '%s\n' "$REMOTE_RECEIPTS_HTTP" | tee "$OUT_DIR/remote-receipts-http.json"
echo "--- remote datanet status via precision ---"
REMOTE_DN_HTTP="$(jget "$REMOTE_NODE_BASE/datanet/v1/status" 10)"
printf '%s\n' "$REMOTE_DN_HTTP" | tee "$OUT_DIR/remote-datanet-status.json"
echo

echo "=== [5] read back remote-published ds_* payload from Precision (canonical proof path) ==="
REMOTE_LOCAL_JOB_HTTP="$(jget "$REMOTE_NODE_BASE/datanet/v1/local-job/$DATASET_ID?who=$ACCOUNT" 10)"
printf '%s\n' "$REMOTE_LOCAL_JOB_HTTP" | tee "$OUT_DIR/remote-local-job-http.json"
echo

python3 - \
  "$OUT_DIR/remote-proof-summary.json" \
  "$OUT_DIR/remote-job-http.json" \
  "$OUT_DIR/remote-receipts-http.json" \
  "$OUT_DIR/remote-local-job-http.json" \
  "$ACCOUNT" \
  "$PLAINTEXT" <<'PY'
import hashlib, json, sys

summary = json.load(open(sys.argv[1]))
remote_job = json.load(open(sys.argv[2]))
remote_receipts = json.load(open(sys.argv[3]))
remote_local_job = json.load(open(sys.argv[4]))
account = sys.argv[5]
plaintext = sys.argv[6]

job_id = str(summary.get("job_id") or "")
receipt_id = str(summary.get("receipt_id") or "")
dataset_id = str(summary.get("dataset_id") or "")
assert job_id, "summary missing job_id"
assert receipt_id, "summary missing receipt_id"
assert dataset_id, "summary missing dataset_id"

remote_job_id = str((remote_job.get("job") or {}).get("job_id") or "")
remote_job_status = str((remote_job.get("job") or {}).get("status") or "")
remote_job_dataset = str((remote_job.get("job") or {}).get("dataset_id") or "")
assert remote_job_id == job_id, f"remote job_id mismatch: {remote_job_id} vs {job_id}"
assert remote_job_status == "completed", f"remote job not completed: {remote_job_status}"
assert remote_job_dataset == dataset_id, f"remote dataset mismatch: {remote_job_dataset} vs {dataset_id}"

receipts = remote_receipts.get("receipts") or []
assert any(str(r.get("receipt_id") or "") == receipt_id for r in receipts), f"receipt_id {receipt_id} not found in remote receipts view"

assert remote_local_job.get("ok") is True, f"remote local-job route not ok: {remote_local_job}"
assert str(remote_local_job.get("who") or "") == account, f"route who mismatch: {remote_local_job.get('who')} vs {account}"
assert str(remote_local_job.get("id") or "") == dataset_id, f"route dataset mismatch: {remote_local_job.get('id')} vs {dataset_id}"

got_plaintext = str(remote_local_job.get("plaintext") or "")
got_sha256 = str(remote_local_job.get("sha256") or "")
want_sha256 = hashlib.sha256(plaintext.encode("utf-8")).hexdigest()

assert got_plaintext == plaintext, f"plaintext mismatch: {got_plaintext!r} vs {plaintext!r}"
assert got_sha256 == want_sha256, f"sha256 mismatch: {got_sha256} vs {want_sha256}"

print("[ok] remote readback payload validated from precision")
print(json.dumps({
    "ok": True,
    "job_id": job_id,
    "receipt_id": receipt_id,
    "dataset_id": dataset_id,
    "readback_size_bytes": remote_local_job.get("sizeBytes"),
    "readback_sha256": got_sha256
}, indent=2))
PY

echo
echo "=== [6] verify local/remote/network truth after remote flow ==="
echo "--- local ready after ---"
LOCAL_READY_AFTER="$(jget "$LOCAL_NODE_BASE/__void/ready.json" 5)"
printf '%s\n' "$LOCAL_READY_AFTER"
echo "--- local health after ---"
LOCAL_HEALTH_AFTER="$(jget "$LOCAL_NODE_BASE/health" 5)"
printf '%s\n' "$LOCAL_HEALTH_AFTER"
echo "--- local head after ---"
LOCAL_HEAD_AFTER="$(jget "$LOCAL_NODE_BASE/head.txt" 5)"
printf '%s\n' "$LOCAL_HEAD_AFTER"
echo "--- remote ready after ---"
REMOTE_READY_AFTER="$(jget "$REMOTE_NODE_BASE/__void/ready.json" 8)"
printf '%s\n' "$REMOTE_READY_AFTER"
echo "--- remote health after ---"
REMOTE_HEALTH_AFTER="$(jget "$REMOTE_NODE_BASE/health" 8)"
printf '%s\n' "$REMOTE_HEALTH_AFTER"
echo "--- remote head after ---"
REMOTE_HEAD_AFTER="$(jget "$REMOTE_NODE_BASE/head.txt" 8)"
printf '%s\n' "$REMOTE_HEAD_AFTER"
echo

python3 - \
  "$OUT_DIR/remote-proof-summary.json" \
  "$OUT_DIR/remote-job-http.json" \
  "$OUT_DIR/remote-receipts-http.json" \
  "$LOCAL_READY_AFTER" \
  "$REMOTE_READY_AFTER" \
  "$LOCAL_HEALTH_AFTER" \
  "$REMOTE_HEALTH_AFTER" \
  "$LOCAL_HEAD_AFTER" \
  "$REMOTE_HEAD_AFTER" <<'PY'
import json, sys

summary = json.load(open(sys.argv[1]))
remote_job = json.load(open(sys.argv[2]))
remote_receipts = json.load(open(sys.argv[3]))
local_ready = json.loads(sys.argv[4])
remote_ready = json.loads(sys.argv[5])
local_health = json.loads(sys.argv[6])
remote_health = json.loads(sys.argv[7])
local_head = int(sys.argv[8].strip())
remote_head = int(sys.argv[9].strip())

job_id = str(summary.get("job_id") or "")
receipt_id = str(summary.get("receipt_id") or "")
dataset_id = str(summary.get("dataset_id") or "")
assert job_id, "summary missing job_id"
assert receipt_id, "summary missing receipt_id"
assert dataset_id, "summary missing dataset_id"

remote_job_id = str((remote_job.get("job") or {}).get("job_id") or "")
remote_job_status = str((remote_job.get("job") or {}).get("status") or "")
remote_job_dataset = str((remote_job.get("job") or {}).get("dataset_id") or "")
assert remote_job_id == job_id, f"remote job_id mismatch: {remote_job_id} vs {job_id}"
assert remote_job_status == "completed", f"remote job not completed: {remote_job_status}"
assert remote_job_dataset == dataset_id, f"remote dataset mismatch: {remote_job_dataset} vs {dataset_id}"

receipts = remote_receipts.get("receipts") or []
assert any(str(r.get("receipt_id") or "") == receipt_id for r in receipts), f"receipt_id {receipt_id} not found in remote receipts view"

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
assert local_head == remote_head, f"head mismatch after remote flow: {local_head} vs {remote_head}"
assert remote_node in local_peers, f"remote nodeId {remote_node} not found in local peers after flow {local_peers}"
assert local_node in remote_peers, f"local nodeId {local_node} not found in remote peers after flow {remote_peers}"

print("[ok] two-box datanet peer-path + readback proof validated")
print(json.dumps({
    "ok": True,
    "job_id": job_id,
    "receipt_id": receipt_id,
    "dataset_id": dataset_id,
    "local_node_id": local_node,
    "remote_node_id": remote_node,
    "local_head_after": local_head,
    "remote_head_after": remote_head,
    "local_ready_after": local_ready.get("ready"),
    "remote_ready_after": remote_ready.get("ready"),
    "local_gap_after": local_ready.get("gap"),
    "remote_gap_after": remote_ready.get("gap"),
    "local_txroot_live_after": local_ready.get("txroot_live"),
    "remote_txroot_live_after": remote_ready.get("txroot_live"),
}, indent=2))
PY

echo
echo "=== [7] success ==="
echo "[ok] two-box datanet peer-path + readback proof green"
