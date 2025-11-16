#!/usr/bin/env bash
set -euo pipefail

NAME="[agentos-smoke]"

log() {
  echo "$NAME $*"
}

fail() {
  echo "$NAME ERROR: $*" >&2
  exit 1
}

# --- Tooling checks ---

command -v jq >/dev/null 2>&1   || fail "jq not found in PATH"
command -v cast >/dev/null 2>&1 || fail "cast not found in PATH"

# --- Repo + state file ---

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/.." && pwd)"
STATE_FILE="$REPO/docs/VOID-DEVNET-AGENT-OS-STATE.json"

[ -f "$STATE_FILE" ] || fail "state file missing: $STATE_FILE"

log "repo: $REPO"
log "state: $STATE_FILE"

CHAIN_ID_JSON=$(jq -r '.chainId' "$STATE_FILE")
DEPLOYER=$(jq -r '.deployer' "$STATE_FILE")
MR_ADDR=$(jq -r '.ModelRegistry' "$STATE_FILE")
JQ_ADDR=$(jq -r '.JobQueue' "$STATE_FILE")
ME_ADDR=$(jq -r '.ModelEvalRegistry' "$STATE_FILE")

[ -n "$CHAIN_ID_JSON" ] || fail "missing chainId in state"
[ -n "$DEPLOYER" ]      || fail "missing deployer in state"
[ -n "$MR_ADDR" ]       || fail "missing ModelRegistry in state"
[ -n "$JQ_ADDR" ]       || fail "missing JobQueue in state"
[ -n "$ME_ADDR" ]       || fail "missing ModelEvalRegistry in state"

case "$MR_ADDR$JQ_ADDR$ME_ADDR" in
  *0000000000000000000000000000000000000000*)
    fail "one or more contract addresses are zero"
    ;;
esac

# --- RPC / chain sanity ---

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
log "RPC_URL: $RPC_URL"

CHAIN_ID_RPC=$(cast chain-id --rpc-url "$RPC_URL" 2>/dev/null || true)
[ -n "$CHAIN_ID_RPC" ] || fail "could not read chain id from RPC"

if [ "$CHAIN_ID_RPC" != "$CHAIN_ID_JSON" ]; then
  fail "chainId mismatch: state=$CHAIN_ID_JSON rpc=$CHAIN_ID_RPC"
fi

log "chainId OK: $CHAIN_ID_RPC"

# Hard-coded devnet test markers we already seeded
MODEL_ID="void-devnet/agent-test/v1"
MODEL_VERSION=1
EVAL_SUITE_ID="VOID_SAFETY_DEVNET_V1"

log "expecting test model: $MODEL_ID"
log "expecting eval suite: $EVAL_SUITE_ID"

# --- 1) ModelRegistry checks ---

log "checking ModelRegistry @ $MR_ADDR"

OWNER=$(cast call "$MR_ADDR" \
  "getModelOwner(string)(address)" \
  "$MODEL_ID" \
  --rpc-url "$RPC_URL" 2>/dev/null || true)

[ -n "$OWNER" ] || fail "getModelOwner call failed"

if [ "${OWNER,,}" != "${DEPLOYER,,}" ]; then
  fail "model owner mismatch for $MODEL_ID: owner=$OWNER deployer=$DEPLOYER"
fi

LATEST_VER=$(cast call "$MR_ADDR" \
  "getLatestVersion(string)(uint64)" \
  "$MODEL_ID" \
  --rpc-url "$RPC_URL" 2>/dev/null || true)

[ -n "$LATEST_VER" ] || fail "getLatestVersion call failed"
log "latest version for model: $LATEST_VER"

# Use dedicated helper for active flag (avoid tuple parsing bullshit)
ACTIVE_RAW=$(cast call "$MR_ADDR" \
  "isModelActive(string,uint64)(bool)" \
  "$MODEL_ID" $MODEL_VERSION \
  --rpc-url "$RPC_URL" 2>/dev/null || true)

[ -n "$ACTIVE_RAW" ] || fail "isModelActive call failed"

if [ "$ACTIVE_RAW" != "true" ]; then
  fail "model $MODEL_ID version $MODEL_VERSION not active (active=$ACTIVE_RAW)"
fi

log "ModelRegistry OK: $MODEL_ID v$MODEL_VERSION active, owner=$OWNER"

# --- 2) JobQueue checks ---

log "checking JobQueue @ $JQ_ADDR"

NEXT_JOB_ID=$(cast call "$JQ_ADDR" \
  "nextJobId()(uint256)" \
  --rpc-url "$RPC_URL" 2>/dev/null || true)

[ -n "$NEXT_JOB_ID" ] || fail "nextJobId() call failed"

if [ "$NEXT_JOB_ID" -lt 1 ] 2>/dev/null; then
  fail "nextJobId() < 1 (no jobs posted yet)"
fi

log "nextJobId = $NEXT_JOB_ID"

# Check job #1 status exists
JOB_STATUS=$(cast call "$JQ_ADDR" \
  "getStatus(uint256)(uint8)" \
  1 \
  --rpc-url "$RPC_URL" 2>/dev/null || true)

[ -n "$JOB_STATUS" ] || fail "getStatus(1) call failed"

log "job #1 status = $JOB_STATUS (0=Posted,1=Claimed,2=Completed,3=Cancelled,4=Expired)"
log "JobQueue OK: at least one job present"

# --- 3) ModelEvalRegistry checks ---

log "checking ModelEvalRegistry @ $ME_ADDR"

# We only actually care that an active record exists; light parsing is fine.
EVAL_OUT=$(cast call "$ME_ADDR" \
  "getEval(string,uint64,string)(int256,bytes32,string,address,uint64,bool)" \
  "$MODEL_ID" $MODEL_VERSION "$EVAL_SUITE_ID" \
  --rpc-url "$RPC_URL" 2>/dev/null || true)

[ -n "$EVAL_OUT" ] || fail "getEval call failed (no eval recorded for model/suite?)"

# Pull just the first (score) and last (active) lines
SCORE=$(printf '%s\n' "$EVAL_OUT" | sed -n '1p')
ACTIVE_EVAL=$(printf '%s\n' "$EVAL_OUT" | sed -n '$p')

[ -n "$SCORE" ]       || fail "eval score missing"
[ -n "$ACTIVE_EVAL" ] || fail "eval active field missing"

if [ "$ACTIVE_EVAL" != "true" ]; then
  fail "eval record inactive for model=$MODEL_ID suite=$EVAL_SUITE_ID (active=$ACTIVE_EVAL)"
fi

log "ModelEvalRegistry OK: score=$SCORE active=$ACTIVE_EVAL"

# --- Summary ---

log "OK: Agent OS v1 contracts healthy on chainId $CHAIN_ID_RPC"
log "OK: ModelRegistry / JobQueue / ModelEvalRegistry all passed smoke checks"

exit 0
