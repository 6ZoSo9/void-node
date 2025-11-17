#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

: "${RPC_URL:?RPC_URL must be set (export RPC_URL or eval ./ops/void-devnet-env.sh)}"
: "${JOBQUEUE_ADDR:?JOBQUEUE_ADDR must be set (export it or use deploy output)}"
: "${DEVNET_PRIVKEY:?DEVNET_PRIVKEY must be set (anvil dev key)}"

echo "[jobs-demo] RPC_URL       = $RPC_URL"
echo "[jobs-demo] JOBQUEUE_ADDR = $JOBQUEUE_ADDR"

model_id="demo:model:v1"
payload_hash="0x0000000000000000000000000000000000000000000000000000000000000001"
app_tag="demo-app"

echo "[jobs-demo] posting job..."
tx_json="$(cast send "$JOBQUEUE_ADDR" \
  "postJob(string,bytes32,string)" \
  "$model_id" "$payload_hash" "$app_tag" \
  --value 0 \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  --json)"

tx_hash="$(jq -r '.transactionHash // empty' <<<"$tx_json")"

echo "[jobs-demo] tx_hash = ${tx_hash:-<unknown>}"

total_jobs="$(cast call "$JOBQUEUE_ADDR" "totalJobs()(uint256)" \
  --rpc-url "$RPC_URL" || echo 0)"

echo "[jobs-demo] totalJobs() = $total_jobs"
