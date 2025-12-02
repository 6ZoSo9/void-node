#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

log() {
  echo "[$(date -Is)] $*"
}

fatal() {
  echo "FATAL: $*" >&2
  exit 1
}

check_exec() {
  local path="$1"
  if [[ ! -x "$path" ]]; then
    fatal "required script missing or not executable: $path"
  fi
}

log "=== [mainnet-run preflight] VOID mainnet RUN preflight gate (planning-only) ==="
log "REPO_ROOT   = $REPO_ROOT"
log "CONFIG_PATH = $CONFIG_PATH"
log "PROM_URL    = $PROM_URL"

if [[ ! -f "$CONFIG_PATH" ]]; then
  fatal "LIVE config not found: $CONFIG_PATH"
fi

# 0) Required tooling/scripts
check_exec "./ops/void-mainnet-pillars-health-all.sh"
check_exec "./ops/void-dev-plan-checklist.sh"
check_exec "./ops/void-mainnet-plan-checklist.sh"
check_exec "./ops/void-mainnet-plan-stub-guard.sh"

# 1) Pillars health (safeboot + devnet + mainnet-core + manifest + lastmile)
log "--- [step 1] mainnet pillars health-all ---"
if ./ops/void-mainnet-pillars-health-all.sh; then
  log "OK: mainnet pillars health-all PASSED"
else
  fatal "mainnet pillars health-all FAILED"
fi

# 2) Dev PLAN rehearsal health
log "--- [step 2] dev PLAN checklist ---"
if ./ops/void-dev-plan-checklist.sh; then
  log "OK: dev PLAN checklist PASSED"
else
  fatal "dev PLAN checklist FAILED"
fi

# 3) Mainnet PLAN + keys + pillars-with-keys health
log "--- [step 3] mainnet PLAN + keys checklist ---"
if ./ops/void-mainnet-plan-checklist.sh; then
  log "OK: mainnet PLAN + keys checklist PASSED"
else
  fatal "mainnet PLAN + keys checklist FAILED"
fi

# 4) Stub guard (currently expects all-zero contracts in LIVE JSON)
log "--- [step 4] mainnet PLAN stub-only guard ---"
if ./ops/void-mainnet-plan-stub-guard.sh; then
  log "OK: mainnet PLAN stub-only guard PASSED (all core contracts zero)"
else
  fatal "mainnet PLAN stub-only guard FAILED"
fi

log "=== [mainnet-run preflight] RESULT: OK (RUN preconditions satisfied in PLAN-only world) ==="
