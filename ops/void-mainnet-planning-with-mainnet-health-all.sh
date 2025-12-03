#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

cd "$REPO_ROOT"

echo "=== [mainnet-planning-with-mainnet-health] VOID mainnet planning+keys+MAINNET health ==="
echo "[cfg] repo     = $REPO_ROOT"
echo "[cfg] prom_url = $PROM_URL"
echo

get_val() {
  local expr="$1"
  local raw
  raw="$(curl -fsS "$PROM_URL/api/v1/query?query=$expr" 2>/dev/null || echo '')"
  if [[ -z "$raw" ]]; then
    echo "NaN"
    return
  fi
  local v
  v="$(printf '%s\n' "$raw" | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null || echo "NaN")"
  echo "$v"
}

echo "[1] base planning/keys/mainnet gauges (raw)..."
plan_val="$(get_val 'void_mainnet_bootstrap_plan_health')"
printf "  %-45s = %s\n" "void_mainnet_bootstrap_plan_health" "$plan_val"

keys_val="$(get_val 'void_mainnet_keys_roles_ok')"
printf "  %-45s = %s\n" "void_mainnet_keys_roles_ok" "$keys_val"

mainnet_val="$(get_val 'void_mainnet_mainnet_bootstrap_health')"
printf "  %-45s = %s\n" "void_mainnet_mainnet_bootstrap_health" "$mainnet_val"
echo

echo "[2] composite planning+keys+MAINNET (5m smoothed)..."
pillars_comp_val="$(get_val 'void:mainnet_pillars:health_with_mainnet:last_5m')"
printf "  %-45s = %s\n" "void:mainnet_pillars:health_with_mainnet:last_5m" "$pillars_comp_val"
echo

echo "[3] textfile gauge (node_exporter)..."
textfile_val="$(get_val 'void_mainnet_pillars_with_mainnet_health')"
printf "  %-45s = %s\n" "void_mainnet_pillars_with_mainnet_health" "$textfile_val"
echo

ok=1
for v in "$plan_val" "$keys_val" "$mainnet_val" "$pillars_comp_val" "$textfile_val"; do
  if [[ "$v" != "1" ]]; then
    ok=0
  fi
done

echo "[summary]"
if [[ "$ok" -eq 1 ]]; then
  echo "  RESULT: OK (planning+keys+MAINNET bootstrap all healthy; >=0.5 over last 5m)"
  exit 0
else
  echo "  RESULT: ERROR (one or more planning/mainnet gauges are not 1)"
  exit 1
fi
