#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet pillars + Obelisk profile aggregate health hammer.
#
# This is a *read-only* orchestration script that:
#   - Runs the existing mainnet pillars health-all hammer
#   - Runs the Obelisk mainnet profile health-all hammer
#   - Prints a simple combined interpretation
#
# It does NOT mutate any state. Use it as:
#   ./ops/void-mainnet-pillars-obelisk-health-all.sh

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$REPO_ROOT"

echo "=== [pillars+obelisk] VOID mainnet pillars + Obelisk profile health-all ==="
echo "[cfg] REPO_ROOT = $REPO_ROOT"
echo "[cfg] PROM_URL  = $PROM_URL"
echo

echo "=== [1] mainnet pillars health-all ==="
if [[ -x ./ops/void-mainnet-pillars-health-all.sh ]]; then
  ./ops/void-mainnet-pillars-health-all.sh || {
    echo
    echo "[pillars+obelisk] WARN: void-mainnet-pillars-health-all.sh returned non-zero." >&2
  }
else
  echo "[pillars+obelisk] ERROR: ops/void-mainnet-pillars-health-all.sh not found or not executable." >&2
fi

echo
echo "=== [2] Obelisk mainnet profile health-all ==="
if [[ -x ./ops/void-obelisk-profile-health-all.sh ]]; then
  ./ops/void-obelisk-profile-health-all.sh || {
    echo
    echo "[pillars+obelisk] WARN: void-obelisk-profile-health-all.sh returned non-zero." >&2
  }
else
  echo "[pillars+obelisk] ERROR: ops/void-obelisk-profile-health-all.sh not found or not executable." >&2
fi

echo
echo "=== [3] Prometheus summary (5m smoothed) ==="

pillars_5m_json="$(curl -fsS "${PROM_URL}/api/v1/query?query=void:mainnet_pillars:health:last_5m" 2>/dev/null || echo '{}')"
obelisk_5m_json="$(curl -fsS "${PROM_URL}/api/v1/query?query=void:obelisk_profile_health:last_5m" 2>/dev/null || echo '{}')"

pillars_val="$(printf '%s\n' "$pillars_5m_json" | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null || echo "NaN")"
obelisk_val="$(printf '%s\n' "$obelisk_5m_json" | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null || echo "NaN")"

echo "  void:mainnet_pillars:health:last_5m    = ${pillars_val}"
echo "  void:obelisk_profile_health:last_5m    = ${obelisk_val}"
echo

pillars_ok=0
obelisk_ok=0

if [[ "$pillars_val" == "1" ]]; then
  pillars_ok=1
fi

if [[ "$obelisk_val" == "1" ]]; then
  obelisk_ok=1
fi

echo "=== [4] interpretation ==="
if [[ "$pillars_ok" -eq 1 && "$obelisk_ok" -eq 1 ]]; then
  echo "[pillars+obelisk] RESULT: OK (mainnet pillars + Obelisk profile are healthy over last 5m)"
  exit 0
fi

echo "[pillars+obelisk] RESULT: NOT OK"
echo "  - pillars_ok  = ${pillars_ok} (expect 1)"
echo "  - obelisk_ok  = ${obelisk_ok} (expect 1)"

if [[ "$pillars_ok" -ne 1 ]]; then
  echo "  HINT: run ./ops/void-mainnet-pillars-health-all.sh and check Prometheus (mainnet pillars)."
fi

if [[ "$obelisk_ok" -ne 1 ]]; then
  echo "  HINT: run ./ops/void-obelisk-profile-health-all.sh and/or ./ops/obelisk-mainnet-profile-exporter.sh."
fi

exit 1
