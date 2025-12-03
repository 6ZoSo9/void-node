#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(pwd)}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [mainnet-launch-phase1-health] VOID mainnet Phase 1 launch health ==="
echo "[cfg] REPO_ROOT = ${REPO_ROOT}"
echo "[cfg] PROM_URL  = ${PROM_URL}"
echo

# --- helpers ---------------------------------------------------------------

query_scalar() {
  local metric="$1"
  curl -fsS "${PROM_URL}/api/v1/query?query=${metric}" \
    | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null
}

check_doc() {
  local path="$1"
  if [[ -f "${path}" ]]; then
    echo "[docs] OK   : ${path}"
    return 0
  else
    echo "[docs] MISSING: ${path}"
    return 1
  fi
}

# --- [0] docs existence ----------------------------------------------------

echo "=== [0] docs presence ==="
docs_ok=0

missing=0
for f in \
  "docs/VOID-MAINNET-BOOTSTRAP-CEREMONY.md" \
  "docs/VOID-MAINNET-GOVERNANCE-MODEL.md" \
  "docs/VOID-MAINNET-VALIDATORS-AND-REWARDS.md" \
  "docs/VOID-MAINNET-LAUNCH-PHASES.md" \
; do
  if ! check_doc "${f}"; then
    missing=$((missing + 1))
  fi
done

if [[ "${missing}" -eq 0 ]]; then
  docs_ok=1
fi

echo
echo "docs_ok = ${docs_ok}"
echo

# --- [1] keys + PLAN gauges -----------------------------------------------

echo "=== [1] keys / PLAN metrics ==="

keys_roles_ok="$(query_scalar 'void_mainnet_keys_roles_ok')"
plan_health="$(query_scalar 'void_mainnet_bootstrap_plan_health')"

echo "void_mainnet_keys_roles_ok        = ${keys_roles_ok}"
echo "void_mainnet_bootstrap_plan_health= ${plan_health}"
echo

keys_ok=0
plan_ok=0

if [[ "${keys_roles_ok}" == "1" ]]; then
  keys_ok=1
fi

if [[ "${plan_health}" == "1" ]]; then
  plan_ok=1
fi

# --- [2] pillars+keys composite gauge --------------------------------------

echo "=== [2] pillars+keys composite metric ==="

pillars_with_keys="$(query_scalar 'void:mainnet_pillars:health_with_keys:last_5m')"
echo "void:mainnet_pillars:health_with_keys:last_5m = ${pillars_with_keys}"
echo

pillars_ok=0
if [[ "${pillars_with_keys}" == "1" ]]; then
  pillars_ok=1
fi

# --- [3] summary -----------------------------------------------------------

echo "=== [summary] Phase 1 launch readiness ==="
echo "  docs_ok     = ${docs_ok}"
echo "  keys_ok     = ${keys_ok}   (void_mainnet_keys_roles_ok)"
echo "  plan_ok     = ${plan_ok}   (void_mainnet_bootstrap_plan_health)"
echo "  pillars_ok  = ${pillars_ok} (void:mainnet_pillars:health_with_keys:last_5m)"
echo

if [[ "${docs_ok}" -eq 1 && "${keys_ok}" -eq 1 && "${plan_ok}" -eq 1 && "${pillars_ok}" -eq 1 ]]; then
  echo "[RESULT] OK: VOID mainnet Phase 1 (solo validator) launch conditions are satisfied."
  exit 0
else
  echo "[RESULT] NOT OK: Phase 1 launch conditions NOT fully satisfied."
  echo "         - docs_ok    must be 1"
  echo "         - keys_ok    must be 1"
  echo "         - plan_ok    must be 1"
  echo "         - pillars_ok must be 1"
  exit 1
fi
