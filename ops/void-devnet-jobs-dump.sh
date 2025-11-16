#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

: "${RPC_URL:=http://127.0.0.1:8545}"

JOBQUEUE=$(jq -r '.JobQueue.address' docs/VOID-DEVNET-PROTOCOL-STATE.json)
if [[ -z "$JOBQUEUE" || "$JOBQUEUE" == "null" ]]; then
  echo "[ERR] missing JobQueue.address in docs/VOID-DEVNET-PROTOCOL-STATE.json" >&2
  exit 1
fi

NEXT_ID=$(cast call --rpc-url "$RPC_URL" "$JOBQUEUE" "nextJobId()(uint256)")
echo "[info] JobQueue=$JOBQUEUE nextJobId=$NEXT_ID"

if [[ "$NEXT_ID" -eq 0 ]]; then
  echo "[info] no jobs"
  exit 0
fi

LAST=$((NEXT_ID - 1))

printf "%-4s %-6s %-42s %-20s %-8s\n" "ID" "STAT" "POSTER" "APP" "HAS_RES"
printf "%-4s %-6s %-42s %-20s %-8s\n" "----" "------" "------------------------------------------" "--------------------" "--------"

for id in $(seq 1 "$LAST"); do
  OUT=$(cast call \
    --rpc-url "$RPC_URL" \
    "$JOBQUEUE" \
    "jobs(uint256)(address,address,string,string,bytes32,bytes32,uint8,uint64,uint64)" \
    "$id")

  POSTER=$(sed -n '1p' <<<"$OUT")
  WORKER=$(sed -n '2p' <<<"$OUT")
  APP=$(sed -n '3p' <<<"$OUT" | tr -d '"')
  MODEL=$(sed -n '4p' <<<"$OUT" | tr -d '"')
  PAYLOAD=$(sed -n '5p' <<<"$OUT")
  RESULT=$(sed -n '6p' <<<"$OUT")
  STATUS=$(sed -n '7p' <<<"$OUT" | tr -d '[:space:]')
  CREATED=$(sed -n '8p' <<<"$OUT")
  UPDATED=$(sed -n '9p' <<<"$OUT")

  [[ -z "$STATUS" || "$STATUS" == "0" ]] && continue

  case "$STATUS" in
    1) S="POSTED" ;;
    2) S="CLAIMD" ;;
    3) S="COMPLT" ;;
    *) S="UNK$STATUS" ;;
  esac

  HAS_RES="no"
  [[ "$RESULT" != 0x0000000000000000000000000000000000000000000000000000000000000000 ]] && HAS_RES="yes"

  printf "%-4s %-6s %-42s %-20s %-8s\n" "$id" "$S" "$POSTER" "$APP" "$HAS_RES"
done
