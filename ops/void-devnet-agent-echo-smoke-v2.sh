#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
cd "$REPO"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
STATE="${STATE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"

ECHO_KIND="${ECHO_KIND:-echo.v1}"
ECHO_MESSAGE="${ECHO_MESSAGE:-hello-from-echo-smoke}"
SLEEP_SEC="${SLEEP_SEC:-15}"

# Real JobQueue ABI from forge inspect:
#   postJob(string,bytes32,string) payable returns (bytes32)
JOBQUEUE_FN_SIG="${JOBQUEUE_FN_SIG:-postJob(string,bytes32,string)}"

echo "[echo-smoke-v2] repo=$REPO"
echo "[echo-smoke-v2] RPC_URL=$RPC_URL"
echo "[echo-smoke-v2] PROM_URL=$PROM_URL"
echo "[echo-smoke-v2] STATE=$STATE"
echo "[echo-smoke-v2] ECHO_KIND=$ECHO_KIND"
echo "[echo-smoke-v2] ECHO_MESSAGE=$ECHO_MESSAGE"
echo "[echo-smoke-v2] JOBQUEUE_FN_SIG=$JOBQUEUE_FN_SIG"

if [[ -z "${DEVNET_CALLER_KEY:-}" ]]; then
  echo "[echo-smoke-v2] ERROR: DEVNET_CALLER_KEY not set (export DEVNET_CALLER_KEY=0x<64-hex>)" >&2
  exit 1
fi

len="${#DEVNET_CALLER_KEY}"
if [[ "$len" -ne 66 || "${DEVNET_CALLER_KEY:0:2}" != "0x" ]]; then
  echo "[echo-smoke-v2] ERROR: DEVNET_CALLER_KEY looks wrong (len=$len, prefix=${DEVNET_CALLER_KEY:0:2})" >&2
  exit 1
fi

JOBQUEUE_ADDR="$(jq -r '.JobQueue.address' "$STATE")"
RECEIPTS_ADDR="$(jq -r '.ReceiptRegistry.address' "$STATE")"

echo "[echo-smoke-v2] JobQueue       = $JOBQUEUE_ADDR"
echo "[echo-smoke-v2] ReceiptRegistry = $RECEIPTS_ADDR"

echo
echo "[echo-smoke-v2] === [0] totals BEFORE ==="
totalJobs_before="$(cast call "$JOBQUEUE_ADDR" 'totalJobs()(uint256)' --rpc-url "$RPC_URL")" || {
  echo "[echo-smoke-v2] ERROR: totalJobs() call failed" >&2
  exit 1
}
echo "  totalJobs_before     = $totalJobs_before"

totalReceipts_before="ERR"
if totalReceipts_before="$(cast call "$RECEIPTS_ADDR" 'totalReceipts()(uint256)' --rpc-url "$RPC_URL" 2>/dev/null)"; then
  echo "  totalReceipts_before = $totalReceipts_before"
else
  echo "  totalReceipts_before = <reverted/unknown>"
fi

echo
echo "[echo-smoke-v2] === [1] post echo job ==="

TS="$(date +%s)"
PAYLOAD="$(jq -n --arg kind "$ECHO_KIND" --arg msg "$ECHO_MESSAGE" --arg ts "$TS" \
  '{kind:$kind,message:$msg,ts:($ts|tonumber)}')"

echo "[echo-smoke-v2] payload = $PAYLOAD"

PAYLOAD_HASH="$(cast keccak "$PAYLOAD")"
echo "[echo-smoke-v2] payload_hash = $PAYLOAD_HASH"

TX_JSON="$(cast send "$JOBQUEUE_ADDR" \
  "$JOBQUEUE_FN_SIG" \
  "$ECHO_KIND" "$PAYLOAD_HASH" "$PAYLOAD" \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_CALLER_KEY")"

echo "[echo-smoke-v2] tx = $TX_JSON"
echo "[echo-smoke-v2] echo job submitted; sleeping ${SLEEP_SEC}s..."
sleep "$SLEEP_SEC"

echo
echo "[echo-smoke-v2] === [2] totals AFTER ==="
totalJobs_after="$(cast call "$JOBQUEUE_ADDR" 'totalJobs()(uint256)' --rpc-url "$RPC_URL")" || {
  echo "[echo-smoke-v2] ERROR: totalJobs() call failed after submit" >&2
  exit 1
}
echo "  totalJobs_after      = $totalJobs_after"

totalReceipts_after="ERR"
if totalReceipts_after="$(cast call "$RECEIPTS_ADDR" 'totalReceipts()(uint256)' --rpc-url "$RPC_URL" 2>/dev/null)"; then
  echo "  totalReceipts_after  = $totalReceipts_after"
else
  echo "  totalReceipts_after  = <reverted/unknown>"
fi

echo
echo "[echo-smoke-v2] === [3] devnet coverage gauges (Prometheus) ==="

q_coverage='void_devnet_coverage'
q_cov_health='void_devnet_coverage_health'
q_cov_v2='void_devnet_receipts_coverage_v2'
q_cov_v2_health='void_devnet_receipts_health_v2'

coverage="$(
  curl -fsS "$PROM_URL/api/v1/query?query=$q_coverage" 2>/dev/null \
  | jq -r '.data.result[0].value[1] // "null"' 2>/dev/null \
  || echo null
)"
cov_health="$(
  curl -fsS "$PROM_URL/api/v1/query?query=$q_cov_health" 2>/dev/null \
  | jq -r '.data.result[0].value[1] // "null"' 2>/dev/null \
  || echo null
)"
cov_v2="$(
  curl -fsS "$PROM_URL/api/v1/query?query=$q_cov_v2" 2>/dev/null \
  | jq -r '.data.result[0].value[1] // "null"' 2>/dev/null \
  || echo null
)"
cov_v2_health="$(
  curl -fsS "$PROM_URL/api/v1/query?query=$q_cov_v2_health" 2>/dev/null \
  | jq -r '.data.result[0].value[1] // "null"' 2>/dev/null \
  || echo null
)"

echo "  void_devnet_coverage              = $coverage"
echo "  void_devnet_coverage_health       = $cov_health"
echo "  void_devnet_receipts_coverage_v2  = $cov_v2"
echo "  void_devnet_receipts_health_v2    = $cov_v2_health"

echo
echo "[echo-smoke-v2] === [4] basic assertions ==="

rc=0

if [[ "$totalJobs_after" -le "$totalJobs_before" ]]; then
  echo "  [FAIL] jobs_after ($totalJobs_after) <= jobs_before ($totalJobs_before)"
  rc=1
else
  echo "  [OK]   jobs_after ($totalJobs_after) > jobs_before ($totalJobs_before)"
fi

if [[ "$totalReceipts_before" != "ERR" && "$totalReceipts_after" != "ERR" ]]; then
  if [[ "$totalReceipts_after" -lt "$totalReceipts_before" ]]; then
    echo "  [WARN] receipts_after ($totalReceipts_after) < receipts_before ($totalReceipts_before)"
  else
    echo "  [OK]   receipts_after ($totalReceipts_after) >= receipts_before ($totalReceipts_before)"
  fi
else
  echo "  [INFO] receipts_* unknown (totalReceipts() reverted); relying on coverage gauges only"
fi

if [[ "$coverage" != "1" || "$cov_health" != "1" || "$cov_v2_health" != "1" ]]; then
  echo "  [WARN] one or more coverage gauges not healthy (coverage=$coverage, cov_health=$cov_health, cov_v2_health=$cov_v2_health)"
else
  echo "  [OK]   coverage gauges all healthy (==1)"
fi

echo
if [[ "$rc" -eq 0 ]]; then
  echo "[echo-smoke-v2] RESULT: OK (job posted and basic checks passed)"
else
  echo "[echo-smoke-v2] RESULT: NOT OK (see failures above)"
fi

exit "$rc"
