#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
ALIEN_HOST="${ALIEN##*@}"
LOCAL_NODE_BASE="${LOCAL_NODE_BASE:-http://127.0.0.1:4100}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://${ALIEN_HOST}:4100}"
TS_NOW="$(date +%Y%m%d-%H%M%S)"
ACCOUNT="${ACCOUNT:-bidirectional-open-user-$TS_NOW}"
PLAINTEXT_REMOTE="${PLAINTEXT_REMOTE:-alienware-to-precision bidirectional proof $TS_NOW}"
OUT_DIR="${OUT_DIR:-/tmp/two-box-bidirectional-open-proof-$TS_NOW}"
mkdir -p "$OUT_DIR"

jget() {
  curl -fsS --max-time "${2:-10}" "$1"
}

jpost_json() {
  local url="$1"
  local body="$2"
  curl -fsS --max-time "${3:-20}" -H 'content-type: application/json' -X POST "$url" --data "$body"
}

echo "=== [1] baseline local/remote truth ==="
LOCAL_READY="$(jget "$LOCAL_NODE_BASE/__void/ready.json" 10)"
REMOTE_READY="$(jget "$REMOTE_NODE_BASE/__void/ready.json" 10)"
LOCAL_PEER="$(jget "$LOCAL_NODE_BASE/__void/peer-main-status.json" 10)"
REMOTE_PEER="$(jget "$REMOTE_NODE_BASE/__void/peer-main-status.json" 10)"
REMOTE_HEALTH="$(jget "$REMOTE_NODE_BASE/health" 10)"

printf '%s\n' "$LOCAL_READY"  | tee "$OUT_DIR/local-ready-before.json" >/dev/null
printf '%s\n' "$REMOTE_READY" | tee "$OUT_DIR/remote-ready-before.json" >/dev/null
printf '%s\n' "$LOCAL_PEER"   | tee "$OUT_DIR/local-peer-before.json" >/dev/null
printf '%s\n' "$REMOTE_PEER"  | tee "$OUT_DIR/remote-peer-before.json" >/dev/null
printf '%s\n' "$REMOTE_HEALTH"| tee "$OUT_DIR/remote-health-before.json" >/dev/null

python3 - "$OUT_DIR/local-ready-before.json" "$OUT_DIR/remote-ready-before.json" "$OUT_DIR/local-peer-before.json" "$OUT_DIR/remote-peer-before.json" <<'PY'
import json, sys
lr = json.load(open(sys.argv[1]))
rr = json.load(open(sys.argv[2]))
lp = json.load(open(sys.argv[3]))
rp = json.load(open(sys.argv[4]))
assert lr.get("ready") is True, f"local ready != true: {lr}"
assert rr.get("ready") is True, f"remote ready != true: {rr}"
assert lr.get("gap") == 0, f"local gap != 0: {lr.get('gap')}"
assert rr.get("gap") == 0, f"remote gap != 0: {rr.get('gap')}"
assert lp.get("same_node") is False, f"local same_node != false: {lp}"
assert rp.get("same_node") is False, f"remote same_node != false: {rp}"
print("[ok] baseline bidirectional truth aligned")
PY

echo
echo "=== [2] publish dataset on Alienware ==="
REMOTE_PUBLISH="$(jpost_json "$REMOTE_NODE_BASE/jobs/submit" "{\"account\":\"$ACCOUNT\",\"kind\":\"datanet_publish\",\"plaintext\":\"$PLAINTEXT_REMOTE\"}" 20)"
printf '%s\n' "$REMOTE_PUBLISH" | tee "$OUT_DIR/remote-publish-submit.json" >/dev/null

REMOTE_JOB_ID="$(python3 - "$OUT_DIR/remote-publish-submit.json" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))
print(((j.get("job") or {}).get("job_id")) or "")
PY
)"
test -n "$REMOTE_JOB_ID"

REMOTE_JOB_FILE=""
REMOTE_STATUS=""
for i in $(seq 1 20); do
  REMOTE_JOB="$(jget "$REMOTE_NODE_BASE/jobs/$REMOTE_JOB_ID" 20)"
  REMOTE_JOB_FILE="$OUT_DIR/remote-publish-job-$i.json"
  printf '%s\n' "$REMOTE_JOB" | tee "$REMOTE_JOB_FILE" >/dev/null
  REMOTE_STATUS="$(python3 - "$REMOTE_JOB_FILE" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))
print(((j.get("job") or {}).get("status")) or "")
PY
)"
  echo "remote_publish_status=$REMOTE_STATUS poll=$i"
  [ "$REMOTE_STATUS" = "completed" ] && break
  sleep 1
done
test "$REMOTE_STATUS" = "completed"
test -n "$REMOTE_JOB_FILE"

REMOTE_DATASET_ID="$(python3 - "$REMOTE_JOB_FILE" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))
print(((j.get("job") or {}).get("dataset_id")) or "")
PY
)"
REMOTE_RECEIPT_ID="$(python3 - "$REMOTE_JOB_FILE" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))
rs = j.get("receipts") or []
print(((rs[0] if rs else {}).get("receipt_id")) or "")
PY
)"
test -n "$REMOTE_DATASET_ID"
test -n "$REMOTE_RECEIPT_ID"

echo "remote_dataset_id=$REMOTE_DATASET_ID"
echo "remote_receipt_id=$REMOTE_RECEIPT_ID"

echo
echo "=== [3] verify Alienware already visible from Precision peer surface ==="
LOCAL_PEERS_NOW="$(jget "$LOCAL_NODE_BASE/peers" 10)"
printf '%s\n' "$LOCAL_PEERS_NOW" | tee "$OUT_DIR/local-peers-now.json" >/dev/null

python3 - "$OUT_DIR/local-peers-now.json" "$OUT_DIR/remote-health-before.json" <<'PY'
import json, sys
peers = json.load(open(sys.argv[1]))
rh = json.load(open(sys.argv[2]))
remote_id = str(rh.get("nodeId") or "")
connected = peers.get("connected") or []
known = [str(x) for x in (peers.get("knownAddrs") or [])]
assert remote_id, "remote node id missing"
assert any(str(x.get("id") or "") == remote_id for x in connected), f"remote node id {remote_id} not present in connected peers: {connected}"
assert "100.122.79.39:4700" in known, f"remote addr not present in knownAddrs: {known}"
print("[ok] precision already sees alienware on live peer surface")
PY

echo "=== [4] consume Alienware dataset from Precision ==="
CONSUME_URL="$LOCAL_NODE_BASE/datanet/consume-view/$REMOTE_DATASET_ID?who=$ACCOUNT"
echo "$CONSUME_URL"
curl -fsS --max-time 20 "$CONSUME_URL" > "$OUT_DIR/precision-consume-view.html"

python3 - "$OUT_DIR/precision-consume-view.html" "$REMOTE_DATASET_ID" "$PLAINTEXT_REMOTE" <<'PY'
import json, sys, hashlib, pathlib
html = pathlib.Path(sys.argv[1]).read_text()
dataset_id = sys.argv[2]
plaintext = sys.argv[3]
want_sha = hashlib.sha256(plaintext.encode()).hexdigest()
out = {
  "ok": True,
  "has_html": ("<!doctype html" in html.lower()) or ("<html" in html.lower()),
  "has_dataset_id": dataset_id in html,
  "has_plaintext": plaintext in html,
  "expected_sha256": want_sha,
}
print(json.dumps(out, indent=2))
assert out["has_html"], "consume html missing"
assert out["has_dataset_id"], "dataset id missing in consume html"
assert out["has_plaintext"], "plaintext missing in consume html"
PY

echo
echo "=== [5] verify Precision local materialization ==="
LOCAL_MAT="$(jget "$LOCAL_NODE_BASE/datanet/v1/local-job/$REMOTE_DATASET_ID?who=$ACCOUNT" 20)"
printf '%s\n' "$LOCAL_MAT" | tee "$OUT_DIR/local-materialized-job.json" >/dev/null

python3 - "$OUT_DIR/local-materialized-job.json" "$ACCOUNT" "$PLAINTEXT_REMOTE" <<'PY'
import json, sys, hashlib
j = json.load(open(sys.argv[1]))
account = sys.argv[2]
plaintext = sys.argv[3]
want_sha = hashlib.sha256(plaintext.encode()).hexdigest()
assert j.get("ok") is True, f"local materialized job not ok: {j}"
assert str(j.get("who") or "") == account, f"who mismatch: {j.get('who')} vs {account}"
assert str(j.get("id") or "").startswith("ds_"), f"dataset id missing: {j.get('id')}"
assert str(j.get("plaintext") or "") == plaintext, "plaintext mismatch"
assert str(j.get("sha256") or "") == want_sha, "sha mismatch"
print(json.dumps({
  "ok": True,
  "dataset_id": j.get("id"),
  "sizeBytes": j.get("sizeBytes"),
  "sha256": j.get("sha256"),
  "materialized_on_precision": True
}, indent=2))
PY

echo
echo "=== [6] post-flow truth ==="
LOCAL_READY_AFTER="$(jget "$LOCAL_NODE_BASE/__void/ready.json" 10)"
REMOTE_READY_AFTER="$(jget "$REMOTE_NODE_BASE/__void/ready.json" 10)"
LOCAL_PEER_AFTER="$(jget "$LOCAL_NODE_BASE/__void/peer-main-status.json" 10)"
REMOTE_PEER_AFTER="$(jget "$REMOTE_NODE_BASE/__void/peer-main-status.json" 10)"

printf '%s\n' "$LOCAL_READY_AFTER"  | tee "$OUT_DIR/local-ready-after.json" >/dev/null
printf '%s\n' "$REMOTE_READY_AFTER" | tee "$OUT_DIR/remote-ready-after.json" >/dev/null
printf '%s\n' "$LOCAL_PEER_AFTER"   | tee "$OUT_DIR/local-peer-after.json" >/dev/null
printf '%s\n' "$REMOTE_PEER_AFTER"  | tee "$OUT_DIR/remote-peer-after.json" >/dev/null

python3 - "$OUT_DIR/local-ready-after.json" "$OUT_DIR/remote-ready-after.json" "$OUT_DIR/local-peer-after.json" "$OUT_DIR/remote-peer-after.json" "$OUT_DIR/local-materialized-job.json" <<'PY'
import json, sys
lr = json.load(open(sys.argv[1]))
rr = json.load(open(sys.argv[2]))
lp = json.load(open(sys.argv[3]))
rp = json.load(open(sys.argv[4]))
mat = json.load(open(sys.argv[5]))
assert lr.get("ready") is True, f"local ready after != true: {lr}"
assert rr.get("ready") is True, f"remote ready after != true: {rr}"
assert lr.get("gap") == 0, f"local gap after != 0: {lr.get('gap')}"
assert rr.get("gap") == 0, f"remote gap after != 0: {rr.get('gap')}"
assert lp.get("same_node") is False, f"local same_node after != false: {lp}"
assert rp.get("same_node") is False, f"remote same_node after != false: {rp}"
print(json.dumps({
  "ok": True,
  "dataset_id": mat.get("id"),
  "local_ready": lr.get("ready"),
  "remote_ready": rr.get("ready"),
  "local_gap": lr.get("gap"),
  "remote_gap": rr.get("gap"),
  "precision_materialized_remote_dataset": True
}, indent=2))
PY

echo
echo "=== [7] success ==="
echo "[ok] two-box bidirectional open proof green"
echo "out=$OUT_DIR"
