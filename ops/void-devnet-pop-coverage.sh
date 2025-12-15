#!/usr/bin/env bash
set -euo pipefail

# Derive repo root from this script's location
REPO="${REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$REPO"

STATE="docs/VOID-DEVNET-PROTOCOL-STATE.json"
RECEIPTS_FILE="ops/devnet-job-receipts.jsonl"
OUT="ops/devnet-agent-pop.prom"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

if ! command -v jq >/dev/null 2>&1; then
  echo "[ERR] jq is required on PATH" >&2
  exit 1
fi

if ! command -v cast >/dev/null 2>&1; then
  echo "[ERR] cast (foundry) is required on PATH" >&2
  exit 1
fi

JOBQUEUE=$(jq -r '(.JobQueue | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE")
RECEIPTREG=$(jq -r '(.ReceiptRegistry | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE")

echo "[info] REPO=$REPO"
echo "[info] RPC_URL=$RPC_URL"
echo "[info] JobQueue=$JOBQUEUE"
echo "[info] ReceiptRegistry=$RECEIPTREG"
echo "[info] receipts file=$RECEIPTS_FILE"

total=0
pop=0

if [ ! -f "$RECEIPTS_FILE" ]; then
  echo "[warn] no receipts file ($RECEIPTS_FILE); writing 0 coverage"
else
  while IFS= read -r line; do
    # skip empty lines
    [ -n "$line" ] || continue

    jobId=$(jq -r '.jobId' <<<"$line")
    if [ "$jobId" = "null" ] || [ -z "$jobId" ]; then
      continue
    fi

    total=$((total + 1))

    has=$(cast call \
      --rpc-url "$RPC_URL" \
      "$RECEIPTREG" \
      "hasReceipt(address,uint256)(bool)" \
      "$JOBQUEUE" "$jobId" \
      || echo "false")

    echo "[check] jobId=$jobId hasReceipt=$has"

    if [ "$has" = "true" ]; then
      pop=$((pop + 1))
    fi
  done < "$RECEIPTS_FILE"
fi

coverage="0"
if [ "$total" -gt 0 ]; then
  coverage=$(awk -v c="$pop" -v t="$total" 'BEGIN{ if (t==0) print "0"; else printf "%.6f", c/t; }')
fi

mkdir -p "$(dirname "$OUT")"

cat >"$OUT" <<EOF
# HELP void_agent_receipts_pop_coverage_devnet fraction of local agent receipts that have on-chain PoP entries
# TYPE void_agent_receipts_pop_coverage_devnet gauge
void_agent_receipts_pop_coverage_devnet $coverage
EOF

echo
echo "[summary] totalReceipts=$total popReceipts=$pop coverage=$coverage"
echo "[summary] wrote $OUT"
