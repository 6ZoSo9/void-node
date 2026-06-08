#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="/tmp/participant-wc-receipt-detail-link-proof-$(date -u +%Y%m%d-%H%M%S)"
ACCOUNT="wc-receipt-detail-link-proof-$(date -u +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "=== participant WC receipt detail link proof ==="
echo "base=$BASE"
echo "account=$ACCOUNT"
echo "out=$OUT"
echo "mutation=ui_link_only_plus_bounded_run_once_probe"
echo "money_movement=false"
echo "validator_mutation=false"
echo

expect_grep() {
  local label="$1"
  local pattern="$2"
  local file="$3"
  if grep -Fq "$pattern" "$file"; then
    echo "[ok] $label"
  else
    echo "[fail] missing $label pattern=$pattern file=$file" >&2
    exit 1
  fi
}

echo "=== [1] source markers/copy ==="
expect_grep "detail link marker" "VOID_PARTICIPANT_WC_RECEIPT_DETAIL_LINK_V1" src/index.ts
expect_grep "detail render marker" "VOID_PARTICIPANT_WC_RECEIPT_DETAIL_LINK_RENDER_V1" src/index.ts
expect_grep "stable local-job marker" "VOID_PARTICIPANT_WC_RECEIPT_DETAIL_LINK_STABLE_LOCAL_JOB_V1" src/index.ts
expect_grep "dataset link id" 'id="wcEarnReceiptDatasetLink"' src/index.ts
expect_grep "raw json link id" 'id="wcEarnReceiptRawJsonLink"' src/index.ts
expect_grep "link hint id" 'id="wcEarnReceiptLinkHint"' src/index.ts
expect_grep "local-job url builder" '"/datanet/v1/local-job/"' src/index.ts
expect_grep "submit out hook" "wcReceiptDetailLinkUpdateFromResult(out, resolveActiveParticipantAccount())" src/index.ts
expect_grep "safety copy" "no wallet send, no WC→VOID swap, no Buy VOID fulfillment, no validator mutation" src/index.ts
echo

echo "=== [2] build ==="
npm run build
echo "[ok] build passed"
echo

echo "=== [3] hard restart/health ==="
systemctl --user stop void-node-live.service || true
systemctl --user kill --kill-who=all --signal=SIGKILL void-node-live.service || true
sleep 2

for port in 4100 4700; do
  pids="$(fuser -n tcp "$port" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo "clearing port $port pids: $pids"
    for pid in $pids; do
      kill -KILL "$pid" || true
    done
  fi
done

sleep 2
systemctl --user daemon-reload || true
systemctl --user start void-node-live.service
sleep 6

curl -fsS --max-time 10 "$BASE/health" | tee "$OUT/health.json"
python3 - "$OUT/health.json" <<'PY_HEALTH'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert int(j.get("http", 0)) == 4100, j
print("[ok] health/http live")
PY_HEALTH
echo

echo "=== [4] served participant page has clickable-link contract ==="
curl -fsS --max-time 20 "$BASE/participant" > "$OUT/participant.html"
expect_grep "served detail link marker" "VOID_PARTICIPANT_WC_RECEIPT_DETAIL_LINK_V1" "$OUT/participant.html"
expect_grep "served detail render marker" "VOID_PARTICIPANT_WC_RECEIPT_DETAIL_LINK_RENDER_V1" "$OUT/participant.html"
expect_grep "served stable local-job marker" "VOID_PARTICIPANT_WC_RECEIPT_DETAIL_LINK_STABLE_LOCAL_JOB_V1" "$OUT/participant.html"
expect_grep "served dataset link id" 'id="wcEarnReceiptDatasetLink"' "$OUT/participant.html"
expect_grep "served raw json link id" 'id="wcEarnReceiptRawJsonLink"' "$OUT/participant.html"
expect_grep "served link hint id" 'id="wcEarnReceiptLinkHint"' "$OUT/participant.html"
expect_grep "served local-job url builder" '"/datanet/v1/local-job/"' "$OUT/participant.html"
expect_grep "served submit out hook" "wcReceiptDetailLinkUpdateFromResult(out, resolveActiveParticipantAccount())" "$OUT/participant.html"
echo

echo "=== [5] bounded Run Once sample proves dataset/receipt/delta shape ==="
curl -fsS --max-time 15 \
  -H 'content-type: application/json' \
  -X POST "$BASE/wc/runner/set" \
  --data "{\"account\":\"$ACCOUNT\",\"enabled\":true}" > "$OUT/runner-set.json"

curl -fsS --max-time 40 \
  -H 'content-type: application/json' \
  -X POST "$BASE/wc/runner/tick" \
  --data "{\"account\":\"$ACCOUNT\"}" > "$OUT/runner-tick.json"

python3 - "$OUT/runner-tick.json" "$ACCOUNT" "$OUT/run-once-shape.json" <<'PY_SHAPE'
import json, sys

j=json.load(open(sys.argv[1]))
account=sys.argv[2]
out=sys.argv[3]

def pick(obj, paths):
    for path in paths:
        cur=obj
        good=True
        for part in path.split("."):
            if isinstance(cur, dict) and part in cur:
                cur=cur[part]
            else:
                good=False
                break
        if good and cur not in (None, ""):
            return cur
    return None

dataset=pick(j, [
  "submit.out.worker.receipt.dataset_id",
  "submit.out.worker.receipt.output.dataset_id",
  "submit.out.worker.job.dataset_id",
  "submit.out.job.dataset_id",
  "runner.last_result.result.worker.receipt.dataset_id",
  "runner.last_result.result.worker.job.dataset_id",
  "runner_after.last_result.result.worker.receipt.dataset_id",
  "runner_after.last_result.result.worker.job.dataset_id",
])
receipt=pick(j, [
  "submit.out.worker.receipt.receipt_id",
  "submit.out.worker.credit_event.receipt_id",
  "submit.out.job.receipt_id",
  "runner.last_result.receipt_id",
  "runner_after.last_result.receipt_id",
])
job=pick(j, [
  "submit.out.worker.receipt.job_id",
  "submit.out.worker.job_id",
  "submit.out.job.job_id",
  "runner.last_result.job_id",
  "runner_after.last_result.job_id",
])
delta=pick(j, [
  "submit.out.worker.credit_event.delta",
  "runner.last_result.result.worker.credit_event.delta",
  "runner_after.last_result.result.worker.credit_event.delta",
])

assert j.get("ok") is True, j
assert dataset and str(dataset).startswith("ds_"), dataset
assert receipt, receipt
assert job, job
assert int(delta) == 10, delta

local_job_url="/datanet/v1/local-job/" + str(dataset) + "?who=" + account
shape={
  "ok": True,
  "account": account,
  "dataset_id": dataset,
  "receipt_id": receipt,
  "job_id": job,
  "delta": int(delta),
  "detail_url": local_job_url,
  "raw_json_url": local_job_url,
  "route": "stable_local_job_json"
}
open(out, "w").write(json.dumps(shape, indent=2, sort_keys=True))
print(json.dumps(shape, indent=2, sort_keys=True))
PY_SHAPE

DATASET_ID="$(python3 - "$OUT/run-once-shape.json" <<'PY_DS'
import json, sys
print(json.load(open(sys.argv[1]))["dataset_id"])
PY_DS
)"
DETAIL_PATH="$(python3 - "$OUT/run-once-shape.json" <<'PY_DETAIL'
import json, sys
print(json.load(open(sys.argv[1]))["detail_url"])
PY_DETAIL
)"

echo "dataset_id=$DATASET_ID"
echo "detail_path=$DETAIL_PATH"
echo "detail_route=stable_local_job_json"
echo

echo "=== [6] generated detail link resolves through stable local-job endpoint ==="
curl -fsS --max-time 20 "$BASE$DETAIL_PATH" > "$OUT/detail.json"
python3 - "$OUT/detail.json" "$DATASET_ID" <<'PY_DETAIL_JSON'
import json, sys
j=json.load(open(sys.argv[1]))
ds=sys.argv[2]
blob=json.dumps(j, sort_keys=True)
assert ds in blob, j
print("[ok] stable local-job JSON contains dataset")
PY_DETAIL_JSON
echo

echo "=== [7] visible Run Once result regression ==="
BASE="$BASE" make participant-run-once-visible-result-proof
echo "[ok] visible Run Once result proof passed"
echo

echo "=== [8] WC receipt card regression ==="
BASE="$BASE" make participant-wc-earn-receipt-card-proof
echo "[ok] WC receipt card proof passed"
echo

echo "=== [9] status smoke ==="
BASE="$BASE" make mainnet0-status-smoke
echo "[ok] status smoke passed"
echo

echo "VOID_PARTICIPANT_WC_RECEIPT_DETAIL_LINK_V1_GREEN"
echo "dataset_id=$DATASET_ID"
echo "detail_path=$DETAIL_PATH"
echo "detail_route=stable_local_job_json"
echo "out=$OUT"
