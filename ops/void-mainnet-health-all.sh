#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
NODE_EXPORTER_URL="${NODE_EXPORTER_URL:-http://127.0.0.1:9100}"

declare -A SCALAR

prom_scalar() {
  local label="$1"
  local query="$2"

  echo
  echo ">>> $label"

  local resp
  resp="$(curl -fsS "$PROM_URL/api/v1/query" --data-urlencode "query=$query")" || {
    echo '{"value":"NaN"}'
    SCALAR["$label"]="NaN"
    return
  }

  local val
  val="$(echo "$resp" | jq -r '.data.result[0].value[1] // "NaN"')" || val="NaN"

  echo "{\"value\": \"$val\"}"
  SCALAR["$label"]="$val"
}

echo "[mainnet-health-all] PROM_URL=$PROM_URL"
echo

echo "[mainnet-health-all] step 0: ensure PLAN textfile + dev rehearsal are fresh..."
./ops/void-mainnet-bootstrap-plan-assert.sh

echo
echo "[mainnet-health-all] step 1: pull core health scalars from Prometheus..."

prom_scalar "void:mainnet_overall:health:last_5m_v2" "void:mainnet_overall:health:last_5m_v2"
prom_scalar "void:mainnet_pillars:health:last_5m"    "void:mainnet_pillars:health:last_5m"
prom_scalar "void:mainnet_lastmile:health:last_5m"   "void:mainnet_lastmile:health:last_5m"
prom_scalar "void:mainnet_lastmile_health:last"      "void:mainnet_lastmile_health:last"
prom_scalar "void_safeboot_overall_health"           "void_safeboot_overall_health"

# PLAN via Prometheus for info only
prom_scalar "void_mainnet_bootstrap_plan_health"      "void_mainnet_bootstrap_plan_health"
prom_scalar "void:mainnet_bootstrap_plan:health:last_5m" "void:mainnet_bootstrap_plan:health:last_5m"

echo
echo "[mainnet-health-all] step 2: derive PLAN raw from node_exporter /metrics (textfile truth)..."

plan_textfile_raw="$(
  curl -fsS "$NODE_EXPORTER_URL/metrics" \
    | awk '$1=="void_mainnet_bootstrap_plan_health"{print $2; exit}' \
    || echo ""
)"

if [[ -z "$plan_textfile_raw" ]]; then
  plan_textfile_raw="0"
fi

overall_5m="${SCALAR["void:mainnet_overall:health:last_5m_v2"]:-NaN}"
pillars_5m="${SCALAR["void:mainnet_pillars:health:last_5m"]:-NaN}"
lastmile_5m="${SCALAR["void:mainnet_lastmile:health:last_5m"]:-NaN}"
lastmile_raw="${SCALAR["void:mainnet_lastmile_health:last"]:-NaN}"
safeboot_overall="${SCALAR["void_safeboot_overall_health"]:-NaN}"
plan_prom_raw="${SCALAR["void_mainnet_bootstrap_plan_health"]:-NaN}"
plan_5m="${SCALAR["void:mainnet_bootstrap_plan:health:last_5m"]:-NaN}"

echo
echo "=== [gating scalars] ==="
echo "overall_5m=$overall_5m"
echo "pillars_5m=$pillars_5m"
echo "lastmile_5m=$lastmile_5m"
echo "lastmile_raw=$lastmile_raw"
echo "safeboot_overall=$safeboot_overall"
echo "plan_raw=$plan_textfile_raw"
echo "plan_prom_raw=$plan_prom_raw"
echo "plan_5m=$plan_5m (info-only)"

ok=1

if [[ "$overall_5m" != "1" ]]; then
  echo "[gate] overall_5m != 1 (got $overall_5m)"
  ok=0
fi

if [[ "$pillars_5m" != "1" ]]; then
  echo "[gate] pillars_5m != 1 (got $pillars_5m)"
  ok=0
fi

if [[ "$lastmile_5m" != "1" ]]; then
  echo "[gate] lastmile_5m != 1 (got $lastmile_5m)"
  ok=0
fi

if [[ "$lastmile_raw" != "1" ]]; then
  echo "[gate] lastmile_raw != 1 (got $lastmile_raw)"
  ok=0
fi

if [[ "$safeboot_overall" != "1" ]]; then
  echo "[gate] safeboot_overall != 1 (got $safeboot_overall)"
  ok=0
fi

if [[ "$plan_textfile_raw" != "1" ]]; then
  echo "[gate] plan_raw != 1 (got $plan_textfile_raw)"
  ok=0
fi

echo

if [[ "$ok" == "1" ]]; then
  echo "[mainnet-health-all] RESULT: OK (all gates passed)"
  exit 0
else
  echo "[mainnet-health-all] RESULT: NOT_OK (one or more gates failed)"
  exit 1
fi
