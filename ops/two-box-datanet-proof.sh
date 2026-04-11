#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
ALIEN_HOST="${ALIEN##*@}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://${ALIEN_HOST}:4100}"
ACCOUNT="${ACCOUNT:-alien-remote-user-proof}"
TS_NOW="$(date +%Y%m%d-%H%M%S)"
PLAINTEXT="${PLAINTEXT:-two-box datanet proof $TS_NOW}"

echo "=== [1] before ==="
echo "--- local ready ---"
curl -fsS --max-time 5 http://127.0.0.1:4100/__void/ready.json ; echo
echo "--- remote ready (ssh) ---"
ssh -o BatchMode=yes -o ConnectTimeout=8 "$ALIEN" \
  'curl -fsS --max-time 5 http://127.0.0.1:4100/__void/ready.json' ; echo
echo "--- remote ready (precision->remote http) ---"
curl -fsS --max-time 8 "$REMOTE_NODE_BASE/__void/ready.json" ; echo
echo

echo "=== [2] submit on Alienware ==="
REMOTE_SUBMIT="$(
  ssh -o BatchMode=yes -o ConnectTimeout=8 "$ALIEN" \
    "ACCOUNT='$ACCOUNT' PLAINTEXT='$PLAINTEXT' bash -s" <<'EOSSH'
set -euo pipefail
BODY="$(printf '{"account":"%s","kind":"datanet_publish","plaintext":"%s"}' "$ACCOUNT" "$PLAINTEXT")"
curl -fsS --max-time 12 -H 'content-type: application/json' \
  -X POST http://127.0.0.1:4100/jobs/submit \
  --data "$BODY"
EOSSH
)"
printf '%s\n' "$REMOTE_SUBMIT"

JOB_ID="$(printf '%s\n' "$REMOTE_SUBMIT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("job",{}).get("job_id",""))')"
test -n "$JOB_ID"
echo "[ok] job_id=$JOB_ID"
echo

echo "=== [3] poll on Alienware ==="
OUT=""
STATUS=""
for i in $(seq 1 20); do
  echo "--- poll $i/20 ---"
  OUT="$(
    ssh -o BatchMode=yes -o ConnectTimeout=8 "$ALIEN" \
      "curl -fsS --max-time 10 http://127.0.0.1:4100/jobs/$JOB_ID"
  )"
  printf '%s\n' "$OUT"
  STATUS="$(printf '%s\n' "$OUT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("job",{}).get("status",""))')"
  echo "status=$STATUS"
  [ "$STATUS" = "completed" ] && break
  sleep 2
done
test "$STATUS" = "completed"

RECEIPT_ID="$(printf '%s\n' "$OUT" | python3 -c 'import sys,json; o=json.load(sys.stdin); rs=o.get("receipts",[]); print((rs[0] if rs else {}).get("receipt_id",""))')"
DATASET_ID="$(printf '%s\n' "$OUT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("job",{}).get("dataset_id",""))')"
INPUT_HASH="$(printf '%s\n' "$OUT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("job",{}).get("input_hash",""))')"
OUTPUT_HASH="$(printf '%s\n' "$OUT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("job",{}).get("output_hash",""))')"
test -n "$RECEIPT_ID"
test -n "$DATASET_ID"

echo
echo "=== [4] remote receipt view (ssh) ==="
REMOTE_RECEIPTS_SSH="$(
  ssh -o BatchMode=yes -o ConnectTimeout=8 "$ALIEN" \
    "curl -fsS --max-time 10 'http://127.0.0.1:4100/receipts?account=$ACCOUNT'"
)"
printf '%s\n' "$REMOTE_RECEIPTS_SSH"
echo
echo

echo "=== [5] precision verifies remote node directly ==="
REMOTE_JOB_HTTP="$(curl -fsS --max-time 10 "$REMOTE_NODE_BASE/jobs/$JOB_ID")"
REMOTE_RECEIPTS_HTTP="$(curl -fsS --max-time 10 "$REMOTE_NODE_BASE/receipts?account=$ACCOUNT")"
printf '%s\n' "$REMOTE_JOB_HTTP"
echo
printf '%s\n' "$REMOTE_RECEIPTS_HTTP"
echo
echo

PRECISION_RECEIPT_ID="$(printf '%s\n' "$REMOTE_RECEIPTS_HTTP" | python3 -c 'import sys,json; o=json.load(sys.stdin); rs=o.get("receipts",[]); print((rs[0] if rs else {}).get("receipt_id",""))')"
PRECISION_DATASET_ID="$(printf '%s\n' "$REMOTE_JOB_HTTP" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("job",{}).get("dataset_id",""))')"
PRECISION_STATUS="$(printf '%s\n' "$REMOTE_JOB_HTTP" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("job",{}).get("status",""))')"

test "$PRECISION_STATUS" = "completed"
test "$PRECISION_RECEIPT_ID" = "$RECEIPT_ID"
test "$PRECISION_DATASET_ID" = "$DATASET_ID"

echo "=== [6] after ==="
echo "--- local ready ---"
curl -fsS --max-time 5 http://127.0.0.1:4100/__void/ready.json ; echo
echo "--- remote ready (ssh) ---"
ssh -o BatchMode=yes -o ConnectTimeout=8 "$ALIEN" \
  'curl -fsS --max-time 5 http://127.0.0.1:4100/__void/ready.json' ; echo
echo "--- remote ready (precision->remote http) ---"
curl -fsS --max-time 8 "$REMOTE_NODE_BASE/__void/ready.json" ; echo
echo "--- remote datanet (precision->remote http) ---"
curl -fsS --max-time 8 "$REMOTE_NODE_BASE/datanet/v1/status" ; echo
echo

python3 - "$JOB_ID" "$RECEIPT_ID" "$DATASET_ID" "$INPUT_HASH" "$OUTPUT_HASH" "$PRECISION_STATUS" <<'PY'
import json, sys
job_id, receipt_id, dataset_id, input_hash, output_hash, precision_status = sys.argv[1:7]
print(json.dumps({
  "ok": True,
  "job_id": job_id,
  "receipt_id": receipt_id,
  "dataset_id": dataset_id,
  "input_hash": input_hash,
  "output_hash": output_hash,
  "precision_verified_remote_status": precision_status,
}, indent=2))
PY
