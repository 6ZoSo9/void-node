#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

# LIVE mainnet bootstrap config (PLAN-only phase, no broadcasts)
CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"

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

log "=== [mainnet-plan checklist] VOID mainnet PLAN + keys ==="
log "REPO_ROOT   = $REPO_ROOT"
log "CONFIG_PATH = $CONFIG_PATH"

if [[ ! -f "$CONFIG_PATH" ]]; then
  fatal "LIVE config not found: $CONFIG_PATH"
fi

# 0) Required tooling
check_exec "./ops/void-mainnet-bootstrap-plan-checklist.sh"
check_exec "./ops/void-mainnet-roles-verify.sh"
check_exec "./ops/void-mainnet-keys-health.sh"
check_exec "./ops/void-mainnet-pillars-keys-health.sh"

# 1) Config + PLAN shape sanity
log "--- [step 1] mainnet bootstrap PLAN checklist ---"
if ./ops/void-mainnet-bootstrap-plan-checklist.sh; then
  log "OK: mainnet bootstrap PLAN checklist PASSED"
else
  fatal "mainnet bootstrap PLAN checklist FAILED"
fi

# 2) Roles mapping vs LIVE JSON (LUKS -> config)
log "--- [step 2] mainnet roles mapping verify ---"
if ./ops/void-mainnet-roles-verify.sh; then
  log "OK: mainnet roles mapping verify PASSED"
else
  fatal "mainnet roles mapping verify FAILED"
fi

# 3) Keys pillar health (exporter + Prom gauges)
log "--- [step 3] mainnet keys pillar health ---"
if ./ops/void-mainnet-keys-health.sh; then
  log "OK: mainnet keys health PASSED"
else
  fatal "mainnet keys health FAILED"
fi

# 4) Pillars + keys composite health (Prometheus)
log "--- [step 4] mainnet pillars+keys composite health ---"
if ./ops/void-mainnet-pillars-keys-health.sh; then
  log "OK: mainnet pillars+keys composite health PASSED"
else
  fatal "mainnet pillars+keys composite health FAILED"
fi

log "=== [mainnet-plan checklist] RESULT: OK (PLAN + keys are healthy at stub-only stage) ==="
