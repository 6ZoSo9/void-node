#!/usr/bin/env bash
set -euo pipefail

echo "[agent-worker-v2] starting devnet agent worker"

REPO="${REPO:-$HOME/dev/void-node}"
STATE="${STATE:-$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

cd "$REPO" || {
  echo "[agent-worker-v2] repo missing: $REPO"
  exit 0
}

if ! command -v cast >/dev/null 2>&1; then
  echo "[agent-worker-v2] cast not found on PATH; skipping"
  exit 0
fi

if ! [ -f "$STATE" ]; then
  echo "[agent-worker-v2] state file missing: $STATE"
  exit 0
fi

JOBQUEUE_ADDR=$(jq -r '.JobQueue.address' "$STATE")
MODELREGISTRY_ADDR=$(jq -r '.ModelRegistry.address' "$STATE")

echo "[agent-worker-v2] repo:   $REPO"
echo "[agent-worker-v2] state:  $STATE"
echo "[agent-worker-v2] RPC:    $RPC_URL"
echo "[agent-worker-v2] JobQueue:      $JOBQUEUE_ADDR"
echo "[agent-worker-v2] ModelRegistry: $MODELREGISTRY_ADDR"

# --- Phase 1: health only -----------------------------------------------------

if command -v "$HOME/.local/bin/void-jobs-devnet-health.sh" >/dev/null 2>&1; then
  "$HOME/.local/bin/void-jobs-devnet-health.sh" \
    || echo "[agent-worker-v2] jobs health script failed (non-fatal)"
else
  echo "[agent-worker-v2] WARN: void-jobs-devnet-health.sh not found"
fi

if command -v "$HOME/.local/bin/void-models-devnet-health.sh" >/dev/null 2>&1; then
  "$HOME/.local/bin/void-models-devnet-health.sh" \
    || echo "[agent-worker-v2] models health script failed (non-fatal)"
else
  echo "[agent-worker-v2] WARN: void-models-devnet-health.sh not found"
fi

# --- Phase 2: optional auto-complete -----------------------------------------

AUTO="${DEVNET_AGENT_AUTO_COMPLETE:-0}"
if [[ "$AUTO" != "1" ]]; then
  echo "[agent-worker-v2] auto-complete disabled (DEVNET_AGENT_AUTO_COMPLETE != 1); done (health-only)"
  exit 0
fi

if [[ -z "${DEVNET_PRIVKEY:-}" ]]; then
  echo "[agent-worker-v2] DEVNET_PRIVKEY not set; cannot submit receipts; done (health-only)"
  exit 0
fi

echo "[agent-worker-v2] auto-complete enabled; scanning for pending jobs"

NEXT=$(cast call "$JOBQUEUE_ADDR" "nextJobId()(uint256)" --rpc-url "$RPC_URL")
echo "[agent-worker-v2] nextJobId = $NEXT"

if [[ "$NEXT" -eq 0 ]]; then
  echo "[agent-worker-v2] no jobs on-chain yet; done"
  exit 0
fi

START=$(( NEXT - 1 ))
FOUND_ID=""
CAND_MAX=20

for (( i=0; i<CAND_MAX && START-i>=0; i++ )); do
  id=$(( START - i ))
  STATUS=$(cast call "$JOBQUEUE_ADDR" "getStatus(uint256)(uint8)" "$id" --rpc-url "$RPC_URL")
  echo "[agent-worker-v2] job $id status = $STATUS"

  # 0 = pending (per JobQueue spec)
  if [[ "$STATUS" -ne 0 ]]; then
    continue
  fi

  JOB_RAW=$(cast call "$JOBQUEUE_ADDR" \
    "getJob(uint256)((address,bytes32,string,bytes32,string,bytes32,uint256,uint64,uint64,uint8,address,bytes32,string,uint256,uint16))" \
    "$id" \
    --rpc-url "$RPC_URL")

  if [[ "$JOB_RAW" =~ "\(0x0000000000000000000000000000000000000000," ]]; then
    echo "[agent-worker-v2] job $id looks empty; skipping"
    continue
  fi

  FOUND_ID="$id"
  break
done

if [[ -z "$FOUND_ID" ]]; then
  echo "[agent-worker-v2] no pending non-empty jobs in last $CAND_MAX ids; done"
  exit 0
fi

JOB_ID="$FOUND_ID"
echo "[agent-worker-v2] picked job $JOB_ID"

# --- Claim step (needed before completeJob) -----------------------------------

echo "[agent-worker-v2] claiming job $JOB_ID"
CLAIM_OUT=""
if ! CLAIM_OUT=$(cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  "$JOBQUEUE_ADDR" \
  "claimJob(uint256)" \
  "$JOB_ID" 2>&1); then
  echo "[agent-worker-v2] claimJob failed:"
  echo "$CLAIM_OUT"
  echo "[agent-worker-v2] skipping completeJob (claim guard hit)"
  exit 0
fi

echo "$CLAIM_OUT"

NEW_STATUS=$(cast call "$JOBQUEUE_ADDR" "getStatus(uint256)(uint8)" "$JOB_ID" --rpc-url "$RPC_URL")
echo "[agent-worker-v2] post-claim status = $NEW_STATUS"

# Assume: 1 = claimed, anything else => don't complete
if [[ "$NEW_STATUS" -ne 1 ]]; then
  echo "[agent-worker-v2] job $JOB_ID not in claimed state after claim; skipping complete"
  exit 0
fi

# --- Build receipt + completeJob ---------------------------------------------

TS=$(date +%s)
printf -v RECEIPT_JSON \
  '{"ok":true,"jobId":%d,"model":"gpt-4.1-mini","ts":%d,"msg":"devnet auto-receipt"}' \
  "$JOB_ID" "$TS"

RECEIPT_HASH=$(cast keccak "$RECEIPT_JSON")

echo "[agent-worker-v2] completing job $JOB_ID"
echo "[agent-worker-v2] receipt hash: $RECEIPT_HASH"
echo "[agent-worker-v2] receipt json: $RECEIPT_JSON"

cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  "$JOBQUEUE_ADDR" \
  "completeJob(uint256,bytes32,string)" \
  "$JOB_ID" \
  "$RECEIPT_HASH" \
  "$RECEIPT_JSON"

echo "[agent-worker-v2] job $JOB_ID complete; done"
