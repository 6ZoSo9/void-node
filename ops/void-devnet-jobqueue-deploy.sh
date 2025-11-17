#!/usr/bin/env bash
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

RPC_URL="${RPC_URL:-}"
DEVNET_PRIVKEY="${DEVNET_PRIVKEY:-}"
ADMIN_GATE_ADDR="${ADMIN_GATE_ADDR:-}"

STATE_FILE="$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json"
CONTRACT_PATH="contracts/JobQueue.sol:JobQueue"

if [[ -z "$RPC_URL" || -z "$DEVNET_PRIVKEY" || -z "$ADMIN_GATE_ADDR" ]]; then
  echo "[jobqueue-deploy] ERROR: RPC_URL / DEVNET_PRIVKEY / ADMIN_GATE_ADDR must be set" >&2
  exit 1
fi

echo "[jobqueue-deploy] repo:       $REPO"
echo "[jobqueue-deploy] RPC_URL:    $RPC_URL"
echo "[jobqueue-deploy] ADMIN_GATE: $ADMIN_GATE_ADDR"
echo "[jobqueue-deploy] STATE_FILE: $STATE_FILE"

echo "[jobqueue-deploy] forge inspect bytecode…"
RAW_BC="$(forge inspect "$CONTRACT_PATH" bytecode | tail -n1)"
BYTECODE="${RAW_BC//\"/}"
BYTECODE="${BYTECODE//[[:space:]]/}"

if [[ -z "$BYTECODE" ]]; then
  echo "[jobqueue-deploy] ERROR: empty bytecode from forge inspect" >&2
  exit 1
fi

echo "[jobqueue-deploy] encoding constructor(address)…"
ENC="$(cast abi-encode 'constructor(address)' "$ADMIN_GATE_ADDR")"
ENC_HEX="${ENC#0x}"

CODE="${BYTECODE}${ENC_HEX}"

echo "[jobqueue-deploy] cast send --create (broadcast)…"
set +e
RAW_SEND="$(cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  --create "$CODE" 2>&1)"
RC=$?
set -e

echo "$RAW_SEND"

if [[ $RC -ne 0 ]]; then
  echo "[jobqueue-deploy] ERROR: cast send failed (exit $RC)" >&2
  exit $RC
fi

TX_HASH="$(grep -i 'transactionHash' <<<"$RAW_SEND" | awk '{print $2}' | tail -n1 || true)"
if [[ -n "$TX_HASH" ]]; then
  echo "[jobqueue-deploy] tx hash: $TX_HASH"
fi

ADDR="$(grep -i 'contractAddress' <<<"$RAW_SEND" | awk '{print $2}' | tail -n1 || true)"

if [[ -z "$ADDR" ]]; then
  echo "[jobqueue-deploy] ERROR: could not parse contractAddress from cast output" >&2
  echo "[jobqueue-deploy] You can inspect manually with:" >&2
  echo "  cast receipt <txhash> --rpc-url $RPC_URL" >&2
  exit 1
fi

echo "[jobqueue-deploy] JobQueue deployed at $ADDR"

if [[ -f "$STATE_FILE" ]]; then
  TMP="${STATE_FILE}.tmp.$$"
  jq --arg addr "$ADDR" '.JobQueue = $addr' "$STATE_FILE" > "$TMP"
  mv "$TMP" "$STATE_FILE"
  echo "[jobqueue-deploy] updated JobQueue in $STATE_FILE"
else
  echo "[jobqueue-deploy] NOTE: $STATE_FILE not found; skipping state update"
fi
