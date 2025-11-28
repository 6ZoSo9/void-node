#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

SCRIPT_FQN="${SCRIPT_FQN:-script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet}"
CONFIG_PATH="${MAINNET_BOOTSTRAP_CONFIG:-config/void-mainnet-bootstrap-mainnet.live.json}"
FORK_URL="${MAINNET_FORK_URL:-}"

echo "=== [mainnet-bootstrap-plan] VOID mainnet bootstrap PLAN ==="
echo "[info] REPO_ROOT   = $REPO_ROOT"
echo "[info] SCRIPT_FQN  = $SCRIPT_FQN"
echo "[info] CONFIG_PATH = $CONFIG_PATH"

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "[error] config file not found: $CONFIG_PATH"
  echo "[hint] create your live mainnet config JSON and/or set MAINNET_BOOTSTRAP_CONFIG"
  mkdir -p ops/textfile
  cat > ops/textfile/void_mainnet_bootstrap_plan.prom <<'EOF'
# HELP void_mainnet_bootstrap_plan_ready Is the VOID mainnet bootstrap plan simulation passing (1=yes,0=no)
# TYPE void_mainnet_bootstrap_plan_ready gauge
void_mainnet_bootstrap_plan_ready 0
EOF
  exit 2
fi

if [[ -z "$FORK_URL" ]]; then
  echo "[warn] MAINNET_FORK_URL not set; skipping forge simulation."
  echo "[warn] PLAN is NOT ready (no fork URL)."
  mkdir -p ops/textfile
  cat > ops/textfile/void_mainnet_bootstrap_plan.prom <<'EOF'
# HELP void_mainnet_bootstrap_plan_ready Is the VOID mainnet bootstrap plan simulation passing (1=yes,0=no)
# TYPE void_mainnet_bootstrap_plan_ready gauge
void_mainnet_bootstrap_plan_ready 0
EOF
  exit 3
fi

echo "[info] MAINNET_FORK_URL = $FORK_URL"
echo
echo "[step 1] forge script dry-run (PLAN only, no broadcast)..."

set +e
forge script "$SCRIPT_FQN" \
  --fork-url "$FORK_URL" \
  --sig "run(string)" "$CONFIG_PATH" \
  --dry-run
RC=$?
set -e

echo
if [[ $RC -ne 0 ]]; then
  echo "[error] forge script PLAN simulation failed (rc=$RC)"
  mkdir -p ops/textfile
  cat > ops/textfile/void_mainnet_bootstrap_plan.prom <<'EOF'
# HELP void_mainnet_bootstrap_plan_ready Is the VOID mainnet bootstrap plan simulation passing (1=yes,0=no)
# TYPE void_mainnet_bootstrap_plan_ready gauge
void_mainnet_bootstrap_plan_ready 0
EOF
  exit $RC
fi

echo "[ok] forge script PLAN simulation succeeded."

mkdir -p ops/textfile
cat > ops/textfile/void_mainnet_bootstrap_plan.prom <<'EOF'
# HELP void_mainnet_bootstrap_plan_ready Is the VOID mainnet bootstrap plan simulation passing (1=yes,0=no)
# TYPE void_mainnet_bootstrap_plan_ready gauge
void_mainnet_bootstrap_plan_ready 1
EOF

echo "[info] wrote ops/textfile/void_mainnet_bootstrap_plan.prom"
echo "=== [mainnet-bootstrap-plan] DONE ==="
