#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
DATA_DIR="${DATA_DIR:-$HOME/dev/void-node/data_a}"
OUT="${OUT:-/tmp/void-jobs-submit-e2e-$(date +%Y%m%d-%H%M%S)}"
ACCOUNT="${ACCOUNT:-jobs-submit-proof-user-$(date +%Y%m%d-%H%M%S)}"
PLAINTEXT="${PLAINTEXT:-jobs submit route proof $(date +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "=== [1] baseline ==="
git rev-parse --short HEAD | tee "$OUT/head.txt"
curl -fsS --max-time 5 "$BASE/__void/diag/jobs-and-datanet-worker-v1.json" | tee "$OUT/jobs.diag.before.json"
echo
curl -fsS --max-time 5 "$BASE/__void/diag/wc-auto-credit-v1.json" | tee "$OUT/wc.diag.before.json"
echo

echo
echo "=== [2] submit through real UI backend route ==="
BODY="$(python3 - "$ACCOUNT" "$PLAINTEXT" <<'PY'
import json, sys
print(json.dumps({
    "account": sys.argv[1],
    "kind": "datanet_publish",
    "plaintext": sys.argv[2]
}, separators=(',', ':')))
PY
)"
curl -fsS --max-time 10 -H 'content-type: application/json' -X POST "$BASE/jobs/submit" --data "$BODY" | tee "$OUT/submit.json"
echo

JOB_ID="$(python3 - "$OUT/submit.json" <<'PY'
import json, sys
obj = json.load(open(sys.argv[1]))
job = obj.get("job") or {}
print(job.get("job_id") or job.get("id") or obj.get("job_id") or obj.get("id") or "")
PY
)"
if [ -z "$JOB_ID" ]; then
  echo "[fail] no job id returned"
  exit 1
fi
echo "job_id=$JOB_ID" | tee "$OUT/job-id.txt"

echo
echo "=== [3] poll for real worker/receipt/credit evidence ==="
NODE_PID="$(ss -ltnp 2>/dev/null | awk '/:4100 /{print $NF}' | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | head -n1)"
for i in $(seq 1 30); do
  TS_NOW="$(date '+%F %T')"
  H="$(curl -o /dev/null -sS -w '%{http_code}' --max-time 5 "$BASE/health" || true)"
  HD="$(curl -fsS --max-time 5 "$BASE/head.txt" 2>/dev/null || true)"
  P="$(curl -o /dev/null -sS -w '%{http_code}' --max-time 5 "$BASE/participant?account=$ACCOUNT" || true)"
  RECVQ="$(ss -tn sport = :4100 2>/dev/null | awk 'NR>1{sum+=$2} END{print sum+0}')"
  CPU="-"
  if [ -n "${NODE_PID:-}" ]; then
    CPU="$(ps -p "$NODE_PID" -o %cpu= | awk '{print $1}' | head -n1)"
  fi
  printf '%s health=%s head=%s participant=%s recvq=%s cpu=%s\n' "$TS_NOW" "$H" "${HD:-?}" "$P" "$RECVQ" "${CPU:-?}" | tee -a "$OUT/stability.log"

  curl -fsS --max-time 5 "$BASE/__void/diag/jobs-and-datanet-worker-v1.json" > "$OUT/jobs.diag.poll.json" || true
  curl -fsS --max-time 5 "$BASE/__void/diag/wc-auto-credit-v1.json" > "$OUT/wc.diag.poll.json" || true
  curl -fsS --max-time 5 "$BASE/wc/reward-stats?account=$ACCOUNT" > "$OUT/reward.poll.json" || true

  if grep -Fq "\"job_id\":\"$JOB_ID\"" "$DATA_DIR/jobs_v1/jobs.jsonl" \
    && grep -Fq "\"job_id\":\"$JOB_ID\"" "$DATA_DIR/agent_v1/receipts.jsonl" \
    && grep -Fq "\"job_id\":\"$JOB_ID\"" "$DATA_DIR/wc_v1/ledger.jsonl"
  then
    break
  fi
  sleep 1
done

echo
echo "=== [4] final evidence ==="
grep -Fn "\"job_id\":\"$JOB_ID\"" "$DATA_DIR/jobs_v1/jobs.jsonl" | tail -n 5 | tee "$OUT/jobs.matches.txt"
echo
grep -Fn "\"job_id\":\"$JOB_ID\"" "$DATA_DIR/agent_v1/receipts.jsonl" | tail -n 5 | tee "$OUT/receipts.matches.txt"
echo
grep -Fn "\"job_id\":\"$JOB_ID\"" "$DATA_DIR/wc_v1/ledger.jsonl" | tail -n 5 | tee "$OUT/ledger.matches.txt"
echo
curl -fsS --max-time 5 "$BASE/__void/diag/jobs-and-datanet-worker-v1.json" | tee "$OUT/jobs.diag.after.json"
echo
curl -fsS --max-time 5 "$BASE/__void/diag/wc-auto-credit-v1.json" | tee "$OUT/wc.diag.after.json"
echo
curl -fsS --max-time 5 "$BASE/wc/reward-stats?account=$ACCOUNT" | tee "$OUT/reward.after.json"
echo

python3 - "$JOB_ID" "$ACCOUNT" "$OUT/reward.after.json" "$DATA_DIR/agent_v1/receipts.jsonl" "$DATA_DIR/wc_v1/ledger.jsonl" <<'PY'
import json, sys
job_id, acct = sys.argv[1], sys.argv[2]
reward = json.load(open(sys.argv[3]))
receipt_found = False
for line in open(sys.argv[4]):
    line=line.strip()
    if not line:
        continue
    try:
        obj=json.loads(line)
    except:
        continue
    if obj.get("job_id")==job_id:
        receipt_found = True
ledger_found = False
for line in open(sys.argv[5]):
    line=line.strip()
    if not line:
        continue
    try:
        obj=json.loads(line)
    except:
        continue
    if obj.get("job_id")==job_id:
        ledger_found = True
summary = {
    "job_id": job_id,
    "account": acct,
    "receipt_found": receipt_found,
    "ledger_credit_found": ledger_found,
    "reward_stats": reward,
}
print(json.dumps(summary, indent=2))
if not receipt_found:
    raise SystemExit("FAIL: no receipt for route-submitted job")
if not ledger_found:
    raise SystemExit("FAIL: no WC credit for route-submitted job")
PY

echo
echo "[ok] proof bundle: $OUT"
