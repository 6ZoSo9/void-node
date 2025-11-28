#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# VOID mainnet bootstrap "mainnet-style" rehearsal harness
#
# Uses:
#   - VOID_* env vars (NON-DEV, NON-ANVIL dummy addresses)
#   - anvil chainId 2050 as the "mainnet" RPC
#   - existing scripts:
#       * ops/void-mainnet-bootstrap-template-fill.sh
#       * ops/void-mainnet-bootstrap-mainnet-lint.sh
#       * ops/void-mainnet-bootstrap-mainnet-dryrun.sh
#       * ops/void-mainnet-bootstrap-safety.sh
#
# This DOES NOT send real mainnet txs.
# It walks the exact path we'll use on real mainnet:
#   env -> template-fill -> .live.json -> LINT -> DRYRUN/PLAN -> SAFETY.
# ============================================================

REPO="${REPO:-$HOME/dev/void-node}"

CONFIG_DEFAULT="config/void-mainnet-bootstrap-mainnet.live.json"
RPC_DEFAULT="http://127.0.0.1:8545"
PROM_DEFAULT="http://127.0.0.1:9090"

CONFIG="$CONFIG_DEFAULT"
RPC="$RPC_DEFAULT"
PROM_URL="$PROM_DEFAULT"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --config)
      CONFIG="$2"
      shift 2
      ;;
    --rpc)
      RPC="$2"
      shift 2
      ;;
    --prom-url)
      PROM_URL="$2"
      shift 2
      ;;
    *)
      echo "[rehearsal] Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

cd "$REPO"

echo "=== [mainnet-rehearsal] VOID mainnet bootstrap rehearsal ==="
echo "[info] REPO      = $REPO"
echo "[info] CONFIG    = $CONFIG"
echo "[info] RPC       = $RPC"
echo "[info] PROM_URL  = $PROM_URL"
echo

# ------------------------------------------------------------
# STEP 0: Repo / branch sanity
# ------------------------------------------------------------
echo "=== [STEP 0] Repo / branch sanity ==="
BRANCH="$(git rev-parse --abbrev-ref HEAD || echo '(unknown)')"
echo "[step0] git branch: $BRANCH"
echo "[step0] pwd       : $(pwd)"

if [[ "$BRANCH" != "feat/mainnet-core-20251120" ]]; then
  echo "[WARN] Expected branch feat/mainnet-core-20251120, got $BRANCH" >&2
fi

echo

# ------------------------------------------------------------
# STEP 1: Template-fill -> write live mainnet config JSON
# ------------------------------------------------------------
echo "=== [STEP 1] template-fill (build live mainnet config) ==="
echo "[step1] running ops/void-mainnet-bootstrap-template-fill.sh"
./ops/void-mainnet-bootstrap-template-fill.sh
echo "[step1] template-fill DONE (should have written $CONFIG_DEFAULT)"
echo

# For now, we always use the default live config path
CONFIG="$CONFIG_DEFAULT"

if [[ ! -f "$CONFIG" ]]; then
  echo "[FATAL] Expected live config file not found: $CONFIG" >&2
  exit 1
fi

echo "[step1] live config present: $CONFIG"
echo

# ------------------------------------------------------------
# STEP 2: MAINNET-LINT against live config
# ------------------------------------------------------------
echo "=== [STEP 2] MAINNET-LINT against live config ==="
./ops/void-mainnet-bootstrap-mainnet-lint.sh --config "$CONFIG"
echo "[step2] MAINNET-LINT completed."
echo

# ------------------------------------------------------------
# STEP 3: MAINNET-DRYRUN (PLAN) against live config + RPC
# ------------------------------------------------------------
echo "=== [STEP 3] MAINNET-DRYRUN (PLAN) against live config + RPC ==="
./ops/void-mainnet-bootstrap-mainnet-dryrun.sh --config "$CONFIG" --rpc "$RPC"
echo "[step3] MAINNET-DRYRUN completed (LINT+PLAN, no txs)."
echo

# ------------------------------------------------------------
# STEP 4: SAFETY (PLAN + Prometheus mainnet gauges)
# ------------------------------------------------------------
echo "=== [STEP 4] SAFETY (PLAN + Prometheus mainnet gauges) ==="
echo "[step4] running safety with live config + RPC + PROM_URL"
CONFIG="$CONFIG" RPC="$RPC" PROM_URL="$PROM_URL" \
  ./ops/void-mainnet-bootstrap-safety.sh
echo "[step4] SAFETY script completed."
echo

# ------------------------------------------------------------
# STEP 5: Summary / gating scalars
# ------------------------------------------------------------
echo "=== [STEP 5] SUMMARY (mainnet gauges) ==="

echo ">>> void:mainnet_overall:health:last_5m_v2"
curl -fsS "$PROM_URL/api/v1/query?query=void:mainnet_overall:health:last_5m_v2" | jq '.data.result' || true
echo

echo ">>> void:mainnet_pillars:health:last_5m"
curl -fsS "$PROM_URL/api/v1/query?query=void:mainnet_pillars:health:last_5m" | jq '.data.result' || true
echo

echo ">>> void:mainnet_lastmile:health:last_5m"
curl -fsS "$PROM_URL/api/v1/query?query=void:mainnet_lastmile:health:last_5m" | jq '.data.result' || true
echo

echo ">>> void_mainnet_tokenomics_health"
curl -fsS "$PROM_URL/api/v1/query?query=void_mainnet_tokenomics_health" | jq '.data.result' || true
echo

echo "=== [RESULT] MAINNET-STYLE REHEARSAL COMPLETED ==="
echo "If all gauges above are 1 and the scripts did not fail,"
echo "the end-to-end mainnet bootstrap path (env -> template-fill ->"
echo "live config -> LINT -> PLAN/DRYRUN -> SAFETY) is rehearsed and GREEN."
