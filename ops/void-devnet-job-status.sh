#!/usr/bin/env bash
set -euo pipefail

REPO=${REPO:-"$HOME/dev/void-node"}
cd "$REPO"

RPC_URL=${RPC_URL:-"http://127.0.0.1:8545"}
STATE="docs/VOID-DEVNET-PROTOCOL-STATE.json"

if [ ! -f "$STATE" ]; then
  echo "[ERR] missing $STATE"
  exit 1
fi

JOBQUEUE=$(jq -r '(.JobQueue | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE")
if [ -z "$JOBQUEUE" ] || [ "$JOBQUEUE" = "null" ]; then
  echo "[ERR] (.JobQueue | (if type=="object" then (.address // empty) elif type=="string" then . else empty end)) missing in $STATE"
  exit 1
fi

echo "[info] RPC_URL=$RPC_URL"
echo "[info] JobQueue=$JOBQUEUE"

# nextJobId tells us how many jobs have been created (ids are 1..nextJobId-1)
NEXT=$(cast call \
  --rpc-url "$RPC_URL" \
  "$JOBQUEUE" \
  "nextJobId()(uint256)"
)

echo "[info] nextJobId=$NEXT"

if [ "$NEXT" -eq 0 ]; then
  echo "[info] no jobs yet"
  exit 0
fi

LAST=$((NEXT - 1))
echo
echo "=== Jobs 1..$LAST ==="

for id in $(seq 1 "$LAST"); do
  echo "--- job $id ---"
  cast call \
    --rpc-url "$RPC_URL" \
    "$JOBQUEUE" \
    "jobs(uint256)(address,address,string,string,bytes32,bytes32,uint8,uint64,uint64)" \
    "$id" || echo "[error reading job $id]"
  echo
done
