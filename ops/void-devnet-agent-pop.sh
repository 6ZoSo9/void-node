#!/usr/bin/env bash
set -euo pipefail

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="docs/VOID-DEVNET-PROTOCOL-STATE.json"
RECEIPTS_FILE="ops/devnet-job-receipts.jsonl"
OUT="ops/devnet-agent-pop.prom"

echo "[info] RPC_URL=$RPC_URL"
echo "[info] STATE=$STATE"
echo "[info] RECEIPTS_FILE=$RECEIPTS_FILE"
echo "[info] OUT=$OUT"

if [ ! -f "$STATE" ]; then
  echo "[ERR] missing $STATE" >&2
  exit 1
fi

if [ ! -f "$RECEIPTS_FILE" ]; then
  echo "[ERR] missing $RECEIPTS_FILE (no local receipts)" >&2
  exit 1
fi

JOBQUEUE=$(jq -r '.JobQueue.address' "$STATE")
RECEIPTREG=$(jq -r '.ReceiptRegistry.address' "$STATE")

if [ -z "$JOBQUEUE" ] || [ "$JOBQUEUE" = "null" ]; then
  echo "[ERR] JobQueue.address missing in $STATE" >&2
  exit 1
fi

if [ -z "$RECEIPTREG" ] || [ "$RECEIPTREG" = "null" ]; then
  echo "[ERR] ReceiptRegistry.address missing in $STATE" >&2
  exit 1
fi

echo "[info] JobQueue=$JOBQUEUE"
echo "[info] ReceiptRegistry=$RECEIPTREG"

total=0
pop=0

# Iterate local receipts and check on-chain PoP entries
while IFS= read -r line; do
  [ -z "$line" ] && continue
  jobId=$(printf '%s\n' "$line" | jq -r '.jobId')
  if [ -z "$jobId" ] || [ "$jobId" = "null" ]; then
    continue
  fi
  total=$(( total + 1 ))

  has=$(cast call \
          --rpc-url "$RPC_URL" \
          "$RECEIPTREG" \
          "hasReceipt(address,uint256)(bool)" \
          "$JOBQUEUE" "$jobId")

  echo "[check] jobId=$jobId hasReceipt=$has"

  case "$has" in
    true) pop=$(( pop + 1 )) ;;
  esac
done < "$RECEIPTS_FILE"

coverage="0.000000"
if [ "$total" -gt 0 ]; then
  coverage=$(awk -v p="$pop" -v t="$total" 'BEGIN { if (t > 0) printf "%.6f", p/t; else printf "0.000000"; }')
fi

echo "[summary] totalReceipts=$total popReceipts=$pop coverage=$coverage"

cat > "$OUT" <<EOF
# HELP void_agent_receipts_pop_coverage_devnet fraction of local agent receipts that have on-chain PoP entries
# TYPE void_agent_receipts_pop_coverage_devnet gauge
void_agent_receipts_pop_coverage_devnet $coverage
EOF

echo "[summary] wrote $OUT"
