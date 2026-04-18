#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
TS="$(date +%Y%m%d-%H%M%S)"
ACCOUNT="mainnet0-remote-state-change-$TS"
PLAINTEXT="two-box mainnet0 remote state change proof $TS"
OUT="${OUT:-/tmp/two-box-mainnet0-state-change-proof.v2.$TS}"
mkdir -p "$OUT"

echo "=== [1] baseline truth ==="
curl -fsS --max-time 10 http://127.0.0.1:4100/__void/ready.json | tee "$OUT/local-ready-before.json"
echo
curl -fsS --max-time 10 http://127.0.0.1:4100/__void/peer-main-status.json | tee "$OUT/local-peer-before.json"
echo

echo
echo "=== [1b] precondition gate ==="
python3 - "$OUT/local-ready-before.json" "$OUT/local-peer-before.json" <<'PY'
import json, sys
ready = json.load(open(sys.argv[1]))
peer = json.load(open(sys.argv[2]))
assert ready.get("ready") is True, f"local ready is not true: {ready}"
gap = int(peer.get("head_gap", 999999))
assert abs(gap) <= 2, f"head_gap too large: {peer}"
print(f"[ok] local precondition gate green (ready=true, abs(head_gap)<={2})")
PY

echo
echo "=== [2] submit remote state change ==="
REMOTE_SUBMIT="$(ssh "$ALIEN" "curl -fsS -H 'content-type: application/json' -X POST http://127.0.0.1:4100/jobs/submit --data '{\"account\":\"$ACCOUNT\",\"kind\":\"datanet_publish\",\"plaintext\":\"$PLAINTEXT\"}'")"
printf '%s\n' "$REMOTE_SUBMIT" | tee "$OUT/remote-submit.json"

JOB_ID="$(python3 - "$OUT/remote-submit.json" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))
print(((j.get("job") or {}).get("job_id")) or "")
PY
)"
test -n "$JOB_ID"

echo
echo "=== [3] poll remote receipt truth ==="
DATASET_ID=""
RECEIPT_STATUS=""
for i in $(seq 1 25); do
  ssh "$ALIEN" "curl -fsS --max-time 20 http://127.0.0.1:4100/jobs/$JOB_ID" > "$OUT/remote-job-$i.json"
  PY_OUT="$(python3 - "$OUT/remote-job-$i.json" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))
rs = j.get("receipts") or []
r0 = rs[0] if rs else {}
print(r0.get("status") or "")
print(r0.get("dataset_id") or "")
PY
)"
  RECEIPT_STATUS="$(printf '%s\n' "$PY_OUT" | sed -n '1p')"
  DATASET_ID="$(printf '%s\n' "$PY_OUT" | sed -n '2p')"
  echo "poll=$i receipt_status=${RECEIPT_STATUS:-<none>} dataset_id=${DATASET_ID:-<none>}"
  [ "$RECEIPT_STATUS" = "completed" ] && [ -n "$DATASET_ID" ] && break
  sleep 1
done

test "$RECEIPT_STATUS" = "completed"
test -n "$DATASET_ID"
echo "dataset_id=$DATASET_ID"

echo
echo "=== [4] local follower truth after remote completion ==="
curl -fsS --max-time 10 http://127.0.0.1:4100/__void/peer-main-status.json | tee "$OUT/local-peer-after.json"
echo
curl -fsS --max-time 10 "http://127.0.0.1:4100/follower/status?peer=http://100.122.79.39:4100" | tee "$OUT/local-follower-after.json"
echo

echo
echo "=== [5] local consume-view of remote dataset ==="
curl -fsS --max-time 20 "http://127.0.0.1:4100/datanet/consume-view/$DATASET_ID?who=$ACCOUNT" > "$OUT/local-consume-view.html"

python3 - "$OUT/local-peer-after.json" "$OUT/local-follower-after.json" "$OUT/local-consume-view.html" "$DATASET_ID" "$PLAINTEXT" <<'PY'
import json, pathlib, sys
peer = json.load(open(sys.argv[1]))
follower = json.load(open(sys.argv[2]))
html = pathlib.Path(sys.argv[3]).read_text()
dataset_id = sys.argv[4]
plaintext = sys.argv[5]

gap = int(peer.get("head_gap", 999999))
assert abs(gap) <= 2, f"peer-main gap too large: {peer}"
drift = int(follower.get("drift", 999999))
assert abs(drift) <= 2, f"follower drift too large: {follower}"
assert dataset_id in html, "dataset id missing from consume-view"
assert plaintext in html, "plaintext missing from consume-view"

print("[ok] remote receipt completed, follower stayed within bounded drift tolerance, and local consume-view sees the remote dataset")
PY

echo
echo "out=$OUT"
