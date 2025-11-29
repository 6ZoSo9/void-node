#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [bootstrap-plan-health-all] VOID mainnet bootstrap PLAN pillar ==="
echo "[cfg] PROM_URL = $PROM_URL"
echo

echo "=== [0] refresh exporter (sudo) ==="
sudo ./ops/void-mainnet-bootstrap-plan-exporter.sh || {
  echo "[bootstrap-plan-health-all] WARN: exporter failed; continuing with whatever metrics exist."
}
echo

echo "=== [1] raw gauges from Prometheus (textfile collector) ==="

q_cfg='void_mainnet_bootstrap_plan_configured'
q_health='void_mainnet_bootstrap_plan_health'
q_chain='void_mainnet_bootstrap_plan_chainid'

cfg=$(curl -fsS "${PROM_URL}/api/v1/query?query=${q_cfg}"    | jq -r '.data.result[0].value[1] // "NaN"' || echo "NaN")
hth=$(curl -fsS "${PROM_URL}/api/v1/query?query=${q_health}" | jq -r '.data.result[0].value[1] // "NaN"' || echo "NaN")
cid=$(curl -fsS "${PROM_URL}/api/v1/query?query=${q_chain}"  | jq -r '.data.result[0].value[1] // "NaN"' || echo "NaN")

printf '  %-40s = %s\n' "$q_cfg"    "$cfg"
printf '  %-40s = %s\n' "$q_health" "$hth"
printf '  %-40s = %s\n' "$q_chain"  "$cid"
echo

echo "=== [2] interpretation ==="

if [[ "$cfg" == "0" ]]; then
  echo "  - No live mainnet bootstrap plan config found yet (configured=0)."
elif [[ "$cfg" == "1" ]]; then
  echo "  - Live mainnet bootstrap plan JSON is present (configured=1)."
else
  echo "  - Could not interpret configured gauge (cfg=$cfg)."
fi

if [[ "$hth" == "1" ]]; then
  echo "  - Basic structural checks passed (health=1) — chainId looks right and core addresses are non-zero."
elif [[ "$hth" == "0" ]]; then
  echo "  - Basic structural checks FAILED or are not ready yet (health=0)."
  echo "    This is expected until we fill in real mainnet addresses in the *.live.json config."
else
  echo "  - Could not interpret health gauge (health=$hth)."
fi

if [[ "$cid" == "2050" ]]; then
  echo "  - chainId from config is 2050 (VOID mainnet)."
elif [[ "$cid" == "0" ]]; then
  echo "  - chainId from config is 0 or missing (no real mainnet plan yet)."
else
  echo "  - chainId from config is $cid (unexpected; should be 2050 for VOID mainnet)."
fi

echo
echo "[bootstrap-plan-health-all] RESULT: OK (this is informational only; no gates wired yet)"
