#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="${STATE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

ECHO_MESSAGE="${ECHO_MESSAGE:-hello-from-echo-smoke}"
ECHO_KIND="${ECHO_KIND:-echo.v1}"

# Function signature for JobQueue post call.
# You can override this without editing the file:
#   export JOBQUEUE_FN_SIG="postJob(string,string)"
JOBQUEUE_FN_SIG="${JOBQUEUE_FN_SIG:-postJob(string,string)}"

# You MUST export a funded devnet key in your shell, e.g.:
#   export DEVNET_CALLER_KEY=0x<64-hex>
DEVNET_CALLER_KEY="${DEVNET_CALLER_KEY:-}"

echo "[echo-smoke] repo=$(pwd)"
echo "[echo-smoke] RPC_URL=$RPC_URL"
echo "[echo-smoke] PROM_URL=$PROM_URL"
echo "[echo-smoke] STATE=$STATE"
echo "[echo-smoke] ECHO_KIND=$ECHO_KIND"
echo "[echo-smoke] ECHO_MESSAGE=$ECHO_MESSAGE"
echo "[echo-smoke] JOBQUEUE_FN_SIG=$JOBQUEUE_FN_SIG"
echo

if [[ -z "$DEVNET_CALLER_KEY" ]]; then
  echo "[echo-smoke] ERROR: DEVNET_CALLER_KEY not set (export DEVNET_CALLER_KEY=0x<64-hex>)"
  exit 1
fi

if [[ ! "$DEVNET_CALLER_KEY" =~ ^0x[0-9a-fA-F]{64}$ ]]; then
  echo "[echo-smoke] ERROR: DEVNET_CALLER_KEY looks invalid; expected 0x + 64 hex chars"
  exit 1
fi

if [[ ! -f "$STATE" ]]; then
  echo "[echo-smoke] FATAL: state file $STATE not found"
  exit 1
fi

JOBQUEUE=$(jq -r '(.JobQueue | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE")
RECEIPTS=$(jq -r '(.ReceiptRegistry | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE")

echo "[echo-smoke] JobQueue       = $JOBQUEUE"
echo "[echo-smoke] ReceiptRegistry = $RECEIPTS"
echo

echo "[echo-smoke] === [0] totals BEFORE ==="
JOBS_BEFORE=$(cast call "$JOBQUEUE" 'totalJobs()(uint256)' --rpc-url "$RPC_URL")
RECEIPTS_BEFORE=$(cast call "$RECEIPTS" 'totalReceipts()(uint256)' --rpc-url "$RPC_URL")
echo "  totalJobs_before       = $JOBS_BEFORE"
echo "  totalReceipts_before   = $RECEIPTS_BEFORE"
echo

echo "[echo-smoke] === [1] post echo job ==="
PAYLOAD_JSON=$(jq -c -n --arg msg "$ECHO_MESSAGE" --arg kind "$ECHO_KIND" '
  {kind:$kind, message:$msg, ts: (now | floor)}
')

echo "[echo-smoke] payload = $PAYLOAD_JSON"
echo "[echo-smoke] using JOBQUEUE_FN_SIG=$JOBQUEUE_FN_SIG"
echo

cast send "$JOBQUEUE" \
  "$JOBQUEUE_FN_SIG" \
  "$ECHO_KIND" "$PAYLOAD_JSON" \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_CALLER_KEY" \
  --gas-limit 500000

echo "[echo-smoke] echo job submitted; sleeping 15s to let agent pick it up..."
sleep 15

echo
echo "[echo-smoke] === [2] totals AFTER ==="
JOBS_AFTER=$(cast call "$JOBQUEUE" 'totalJobs()(uint256)' --rpc-url "$RPC_URL")
RECEIPTS_AFTER=$(cast call "$RECEIPTS" 'totalReceipts()(uint256)' --rpc-url "$RPC_URL")
echo "  totalJobs_after        = $JOBS_AFTER"
echo "  totalReceipts_after    = $RECEIPTS_AFTER"

echo
echo "[echo-smoke] === [3] devnet coverage gauges (Prometheus) ==="
cov=$(curl -fsS "$PROM_URL/api/v1/query" \
  --get --data-urlencode 'query=void_devnet_coverage' \
  | jq -r '.data.result[0].value[1] // "null"' || echo "ERR")

cov_health=$(curl -fsS "$PROM_URL/api/v1/query" \
  --get --data-urlencode 'query=void_devnet_coverage_health' \
  | jq -r '.data.result[0].value[1] // "null"' || echo "ERR")

cov_v2=$(curl -fsS "$PROM_URL/api/v1/query" \
  --get --data-urlencode 'query=void_devnet_receipts_coverage_v2' \
  | jq -r '.data.result[0].value[1] // "null"' || echo "ERR")

cov_v2_health=$(curl -fsS "$PROM_URL/api/v1/query" \
  --get --data-urlencode 'query=void_devnet_receipts_health_v2' \
  | jq -r '.data.result[0].value[1] // "null"' || echo "ERR")

echo "  void_devnet_coverage              = $cov"
echo "  void_devnet_coverage_health       = $cov_health"
echo "  void_devnet_receipts_coverage_v2  = $cov_v2"
echo "  void_devnet_receipts_health_v2    = $cov_v2_health"
echo

echo "[echo-smoke] === [4] basic assertions ==="

ok=1

if [[ "$JOBS_AFTER" -le "$JOBS_BEFORE" ]]; then
  echo "  [FAIL] jobs_after ($JOBS_AFTER) <= jobs_before ($JOBS_BEFORE)"
  ok=0
else
  echo "  [OK] jobs_after > jobs_before"
fi

if [[ "$RECEIPTS_AFTER" -le "$RECEIPTS_BEFORE" ]]; then
  echo "  [WARN] receipts_after ($RECEIPTS_AFTER) <= receipts_before ($RECEIPTS_BEFORE)"
  echo "        (agent may not have picked up the job yet or handler missing)"
else
  echo "  [OK] receipts_after > receipts_before"
fi

if [[ "$cov" != "1" || "$cov_health" != "1" || "$cov_v2_health" != "1" ]]; then
  echo "  [FAIL] one or more coverage health gauges != 1"
  ok=0
else
  echo "  [OK] coverage gauges all healthy (==1)"
fi

echo
if [[ "$ok" -eq 1 ]]; then
  echo "[echo-smoke] RESULT: OK (echo job posted, coverage gauges healthy; receipts likely advanced)"
  exit 0
else
  echo "[echo-smoke] RESULT: NOT OK (see failures above)"
  exit 1
fi
