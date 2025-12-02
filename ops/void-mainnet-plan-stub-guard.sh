#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"
REQUIRE_STUB_ZERO="${REQUIRE_STUB_ZERO:-0}"

log() {
  echo "[$(date -Is)] $*"
}

fatal() {
  echo "FATAL: $*" >&2
  exit 1
}

check_cmd() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    fatal "missing required command: $name"
  fi
}

log "=== [mainnet-plan stub-guard] LIVE config stub-only check ==="
log "REPO_ROOT        = $REPO_ROOT"
log "CONFIG_PATH      = $CONFIG_PATH"
log "REQUIRE_STUB_ZERO= $REQUIRE_STUB_ZERO"

if [[ ! -f "$CONFIG_PATH" ]]; then
  fatal "LIVE config not found: $CONFIG_PATH"
fi

check_cmd jq

# Keys we consider "core contracts" for stub-only phase.
core_keys=(
  "updateGate"
  "adminGate"
  "configGate"
  "validatorSet"
  "voidToken"
  "premineVault"
  "treasury"
  "voidTreasury"
  "opsTreasury"
  "rewardEngine"
)

non_zero=()

for key in "${core_keys[@]}"; do
  addr="$(jq -r --arg k "$key" '.contracts[$k] // "0x0000000000000000000000000000000000000000"' "$CONFIG_PATH")"
  if [[ "$addr" != "0x0000000000000000000000000000000000000000" ]]; then
    log "WARN: contract '$key' has NON-ZERO address: $addr"
    non_zero+=("$key")
  else
    log "OK: contract '$key' is still stubbed at 0x0000...0000"
  fi
done

if (( ${#non_zero[@]} == 0 )); then
  log "=== [mainnet-plan stub-guard] All core contract slots are still ZERO (stub-only) ==="
  exit 0
fi

log "=== [mainnet-plan stub-guard] Found ${#non_zero[@]} core contract(s) with non-zero addresses ==="
log "Non-zero keys: ${non_zero[*]}"

if [[ "$REQUIRE_STUB_ZERO" == "1" ]]; then
  fatal "core contract addresses are no longer stubbed; REQUIRE_STUB_ZERO=1 forbids this"
else
  log "NOTE: non-zero core contracts allowed (REQUIRE_STUB_ZERO!=1); this is a warning-only run."
  exit 0
fi
