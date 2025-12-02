#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

log() {
  echo "[$(date -Is)] $*"
}

fatal() {
  echo "FATAL: $*" >&2
  exit 1
}

require_eq() {
  local label="$1"
  local expect="$2"
  local actual="$3"
  if [[ "$expect" != "$actual" ]]; then
    fatal "$label mismatch: expected '$expect' got '$actual'"
  fi
  log "OK: $label = $actual"
}

check_cmd() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    fatal "missing required command: $name"
  fi
}

log "=== [dev-plan checklist] VOID dev bootstrap PLAN ==="
log "REPO_ROOT = $REPO_ROOT"
log "RPC_URL   = $RPC_URL"

# 0) Basic tooling
check_cmd cast
if [[ ! -x "./ops/void-dev-plan-sanity.sh" ]]; then
  fatal "missing ./ops/void-dev-plan-sanity.sh or not executable"
fi

# 1) ChainId sanity (Anvil-2050 for dev PLAN)
log "--- [step 1] chainId sanity ---"
chain_id="$(cast chain-id --rpc-url "$RPC_URL" || true)"
if [[ -z "$chain_id" ]]; then
  fatal "cast chain-id returned empty (RPC down?)"
fi
require_eq "chainId" "2050" "$chain_id"

# 2) Sanity hammer
log "--- [step 2] dev-plan sanity hammer ---"
if ./ops/void-dev-plan-sanity.sh; then
  log "OK: dev-plan sanity hammer PASSED"
else
  fatal "dev-plan sanity hammer FAILED"
fi

log "=== [dev-plan checklist] RESULT: OK (dev PLAN rehearsal is healthy) ==="
