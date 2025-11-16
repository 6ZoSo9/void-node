#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

: "${RPC_URL:=http://127.0.0.1:8545}"
: "${WORKER_PRIVKEY:?WORKER_PRIVKEY must be set (anvil[1] in your devnet)}"

echo "[loop] RPC_URL=$RPC_URL"
echo "[loop] WORKER_PRIVKEY set (hidden)"
echo "[loop] using JobQueue from docs/VOID-DEVNET-PROTOCOL-STATE.json"

JOBQUEUE=$(jq -r '.JobQueue.address' docs/VOID-DEVNET-PROTOCOL-STATE.json)
if [[ -z "$JOBQUEUE" || "$JOBQUEUE" == "null" ]]; then
  echo "[loop][ERR] missing JobQueue.address in docs/VOID-DEVNET-PROTOCOL-STATE.json"
  exit 1
fi

echo "[loop] JobQueue=$JOBQUEUE"
echo "[loop] starting drain loop..."

while true; do
  echo "------------------------------------------------------------"
  echo "[loop] running agent-once..."
  # Capture output so we can inspect it
  OUT=$(RPC_URL="$RPC_URL" WORKER_PRIVKEY="$WORKER_PRIVKEY" ./ops/void-devnet-agent-once.sh 2>&1)
  echo "$OUT"
  printf '%s\n' "$OUT" > ops/void-devnet-agent-once.log

  if grep -q 'no Posted jobs to claim; nothing to do' <<<"$OUT"; then
    echo "[loop] detected empty queue (no Posted jobs); breaking"
    break
  fi

  NEXT_ID=$(cast call --rpc-url "$RPC_URL" "$JOBQUEUE" "nextJobId()(uint256)")
  echo "[loop] nextJobId=$NEXT_ID"

  if [[ "$NEXT_ID" -gt 0 ]]; then
    LAST=$((NEXT_ID - 1))
    STATUS=$(cast call \
      --rpc-url "$RPC_URL" \
      "$JOBQUEUE" \
      "jobs(uint256)(address,address,string,string,bytes32,bytes32,uint8,uint64,uint64)" \
      "$LAST" | sed -n '7p')
    echo "[loop] last jobId=$LAST status=$STATUS"
    if [[ "$STATUS" != "1" ]]; then
      echo "[loop] tail status != Posted; assuming queue mostly drained; breaking"
      break
    fi
  fi

  echo "[loop] sleeping 2s before next pass..."
  sleep 2
done

echo "[loop] done."
