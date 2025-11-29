#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet bootstrap PLAN textfile exporter (config-only, no broadcast).
# Writes Prometheus metrics describing whether a live mainnet bootstrap
# config exists and passes some basic structural sanity checks.

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$REPO_ROOT"

CFG_PATH="${1:-config/void-mainnet-bootstrap-mainnet.live.json}"
OUT_PATH="/var/lib/node_exporter/textfile_collector/void_mainnet_bootstrap_plan.prom"

echo "[bootstrap-plan-exporter] repo root: $REPO_ROOT"
echo "[bootstrap-plan-exporter] config   : $CFG_PATH"
echo "[bootstrap-plan-exporter] out path : $OUT_PATH"

configured=0
health=0
chainid=0

if [[ ! -f "$CFG_PATH" ]]; then
  echo "[bootstrap-plan-exporter] WARNING: config file not found; exporting configured=0, health=0, chainid=0"
else
  configured=1

  chainid_raw=$(jq -r '.chainId // 0' "$CFG_PATH" 2>/dev/null || echo 0)
  # Normalize to a plain number if possible
  if [[ "$chainid_raw" =~ ^[0-9]+$ ]]; then
    chainid="$chainid_raw"
  else
    chainid=0
  fi

  echo "[bootstrap-plan-exporter] parsed chainId: $chainid"

  health=1

  # Basic contract address checks (non-empty, non-zero)
  addr_paths=(
    ".contracts.voidToken"
    ".contracts.premineVault"
    ".contracts.treasury"
    ".contracts.opsTreasury"
    ".contracts.rewardEngine"
    ".validator0.reward"
  )

  for path in "${addr_paths[@]}"; do
    addr=$(jq -r "${path} // \"\"" "$CFG_PATH" 2>/dev/null || echo "")
    # normalize case for zero-address
    addr_lc="${addr,,}"

    if [[ -z "$addr_lc" || "$addr_lc" == "0x0000000000000000000000000000000000000000" ]]; then
      echo "[bootstrap-plan-exporter] WARN: missing or zero address for ${path}"
      health=0
    fi
  done

  # Chain ID must be 2050 for real VOID mainnet
  if [[ "$chainid" != "2050" ]]; then
    echo "[bootstrap-plan-exporter] WARN: chainId != 2050 (got $chainid); marking health=0"
    health=0
  fi
fi

echo "[bootstrap-plan-exporter] configured=$configured health=$health chainId=$chainid"

tmp="${OUT_PATH}.tmp.$$"
mkdir -p "$(dirname "$OUT_PATH")"

cat > "$tmp" <<EOF
# HELP void_mainnet_bootstrap_plan_configured Is a live VOID mainnet bootstrap plan config present (0/1)
# TYPE void_mainnet_bootstrap_plan_configured gauge
void_mainnet_bootstrap_plan_configured $configured

# HELP void_mainnet_bootstrap_plan_health Basic structural health of the live mainnet bootstrap plan (1 ok, 0 not ready)
# TYPE void_mainnet_bootstrap_plan_health gauge
void_mainnet_bootstrap_plan_health $health

# HELP void_mainnet_bootstrap_plan_chainid Chain ID from the live mainnet bootstrap plan (0 if missing/invalid)
# TYPE void_mainnet_bootstrap_plan_chainid gauge
void_mainnet_bootstrap_plan_chainid $chainid
EOF

mv "$tmp" "$OUT_PATH"
chmod 0644 "$OUT_PATH"

echo "[bootstrap-plan-exporter] wrote $OUT_PATH"
echo "[bootstrap-plan-exporter] done"
