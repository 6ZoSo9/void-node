#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

: "${RPC_URL:=http://127.0.0.1:8545}"

JOBQUEUE=$(jq -r '.JobQueue.address' docs/VOID-DEVNET-PROTOCOL-STATE.json)
if [[ -z "$JOBQUEUE" || "$JOBQUEUE" == "null" ]]; then
  echo "[ERR] missing JobQueue.address in docs/VOID-DEVNET-PROTOCOL-STATE.json" >&2
  exit 1
fi

echo "[info] RPC_URL=$RPC_URL"
echo "[info] JobQueue=$JOBQUEUE"

NEXT_ID=$(cast call --rpc-url "$RPC_URL" "$JOBQUEUE" "nextJobId()(uint256)")
echo "[info] nextJobId=$NEXT_ID"

if [[ "$NEXT_ID" -eq 0 ]]; then
  echo "[info] no jobs on-chain yet"
  jq -n '{totalJobs:0, completedJobs:0, coverage:0.0, lastJobId:null}'
  exit 0
fi

LAST=$((NEXT_ID - 1))
echo "[info] scanning jobs 1..'"$LAST"'"

total=0
completed=0
last_completed_id=-1

for id in $(seq 1 "$LAST"); do
  # Job struct:
  # 1: poster
  # 2: worker
  # 3: appId
  # 4: modelId
  # 5: payloadHash
  # 6: resultHash
  # 7: status (uint8)
  # 8: createdAt
  # 9: updatedAt
  OUT=$(cast call \
    --rpc-url "$RPC_URL" \
    "$JOBQUEUE" \
    "jobs(uint256)(address,address,string,string,bytes32,bytes32,uint8,uint64,uint64)" \
    "$id")

  STATUS=$(sed -n '7p' <<<"$OUT" | tr -d '[:space:]')
  # STATUS: 0=None, 1=Posted, 2=Claimed, 3=Completed

  if [[ -z "$STATUS" || "$STATUS" == "0" ]]; then
    # skip empty slots
    continue
  fi

  total=$((total + 1))
  if [[ "$STATUS" == "3" ]]; then
    completed=$((completed + 1))
    last_completed_id="$id"
  fi
done

coverage=0
if [[ "$total" -gt 0 ]]; then
  # Compute coverage as float 0..1
  coverage=$(awk -v c="$completed" -v t="$total" 'BEGIN{ if (t==0) print 0; else printf "%.6f", c/t }')
fi

echo "[info] totalJobs=$total completedJobs=$completed coverage=$coverage"

# JSON summary to stdout
jq -n --argjson total "$total" \
      --argjson done  "$completed" \
      --arg coverage  "$coverage" \
      --argjson lastComp "$last_completed_id" '
{
  totalJobs: $total,
  completedJobs: $done,
  coverage: ($coverage|tonumber),
  lastCompletedJobId: (if $lastComp < 0 then null else $lastComp end)
}'

# Optional Prom-style metric for devnet (local file, no sudo)
TEXTFILE_DIR="${TEXTFILE_DIR:-ops}"
mkdir -p "$TEXTFILE_DIR"
PROM="$TEXTFILE_DIR/devnet-agent-receipts.prom"

cat > "$PROM" <<EOF
# HELP void_agent_receipts_coverage_devnet fraction of known jobs with status=Completed
# TYPE void_agent_receipts_coverage_devnet gauge
void_agent_receipts_coverage_devnet $coverage
EOF

echo "[info] wrote Prom metric to $PROM"
