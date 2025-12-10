#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet — validator join PLAN stub
#
# This script is PLAN-only:
# - It does NOT broadcast anything.
# - It does NOT talk to mainnet RPC yet.
# - It only checks that our validator0 bootstrap doc exists
#   and emits a textfile-style metric for Prometheus.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DOC="$ROOT/docs/VOID-MAINNET-VALIDATOR0-BOOTSTRAP.md"
CACHE_DIR="$HOME/.cache/node-exporter-textfile"
CACHE_FILE="$CACHE_DIR/void_mainnet_validator_join_plan.prom"

echo "=== [validator-join-plan] VOID mainnet validator join PLAN stub ==="
echo "[cfg] ROOT       = $ROOT"
echo "[cfg] DOC        = $DOC"
echo "[cfg] CACHE_FILE = $CACHE_FILE"
echo

# 1) Check doc presence
if [[ ! -f "$DOC" ]]; then
  echo "[error] validator0 bootstrap doc missing:"
  echo "        $DOC"
  echo
  echo "[result] validator0 join plan: MISSING"
  # Metric: 0 means missing plan
  mkdir -p "$CACHE_DIR"
  cat > "$CACHE_FILE" <<'PROM'
# HELP void_mainnet_validator_join_plan_ok Validator join PLAN presence (1 ok, 0 missing)
# TYPE void_mainnet_validator_join_plan_ok gauge
void_mainnet_validator_join_plan_ok{validator="validator0"} 0
PROM
  exit 1
fi

echo "[ok] found validator0 bootstrap doc:"
echo "     $DOC"
echo

# 2) Emit simple textfile metric for presence
mkdir -p "$CACHE_DIR"
cat > "$CACHE_FILE" <<'PROM'
# HELP void_mainnet_validator_join_plan_ok Validator join PLAN presence (1 ok, 0 missing)
# TYPE void_mainnet_validator_join_plan_ok gauge
void_mainnet_validator_join_plan_ok{validator="validator0"} 1
PROM

echo "[ok] wrote PLAN metric to:"
echo "     $CACHE_FILE"
echo
echo "[result] validator0 join plan: OK (doc present; metric=1)"

# NOTE: Later we will extend this script to:
#   - read a small JSON config (validator address, stake, keys)
#   - run a forge script in simulation mode (no broadcast) to call ValidatorSet.join
#   - write richer metrics (stake size, simulated gas, etc.)
#   - integrate into mainnet planning / pillars health.
