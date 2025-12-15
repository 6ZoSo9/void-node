#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

cd "$REPO"

echo "[devnet-traffic] repo=$REPO"
echo "[devnet-traffic] prom_url=$PROM_URL"
echo

query_scalar() {
  local expr="$1"
  curl -fsS -G "$PROM_URL/api/v1/query" \
    --data-urlencode "query=$expr" \
  | jq -r '.data.result[0].value[1] // "NaN"'
}

coverage=$(query_scalar 'void_devnet_coverage')
coverage_health=$(query_scalar 'void_devnet_coverage_health')
receipts_cov=$(query_scalar 'void_devnet_receipts_coverage_v2')
receipts_health=$(query_scalar 'void_devnet_receipts_health_v2')
devnet_overall=$(query_scalar 'void:devnet_overall_with_jobs_v2:health:last_5m')
devnet_overall_5m=$(query_scalar 'max(void:devnet_overall:max_5m)')

jobs_total=$(query_scalar 'void_devnet_jobs_total')
receipts_total=$(query_scalar 'void_devnet_receipts_total')

echo "=== [devnet traffic snapshot] ==="
echo "coverage                     = $coverage"
echo "coverage_health              = $coverage_health"
echo "receipts_cov_v2              = $receipts_cov"
echo "receipts_health_v2           = $receipts_health"
echo "devnet_overall_health        = $devnet_overall"
echo "devnet_overall_max_5m        = $devnet_overall_5m"
echo "jobs_total (best-effort)     = $jobs_total"
echo "receipts_total (best-effort) = $receipts_total"
echo

fail=0

check_eq() {
  local name="$1"
  local val="$2"
  local expected="$3"
  if [ "$val" != "$expected" ]; then
    echo "[FAIL] $name expected=$expected got=$val"
    fail=1
  else
    echo "[OK]   $name=$val"
  fi
}

check_ge_one() {
  local name="$1"
  local val="$2"
  if [ "$val" = "NaN" ] || [ -z "$val" ]; then
    echo "[FAIL] $name is NaN/missing"
    fail=1
    return
  fi
  if ! printf '%s\n' "$val" | grep -Eq '^[0-9]+(\.[0-9]+)?$'; then
    echo "[FAIL] $name not numeric (got '$val')"
    fail=1
    return
  fi
  local int_part
  int_part=$(printf '%s\n' "$val" | awk -F'.' '{print $1}')
  if [ "$int_part" -lt 1 ]; then
    echo "[FAIL] $name < 1 (val=$val)"
    fail=1
  else
    echo "[OK]   $name=$val (>=1)"
  fi
}

# Hard checks – these are our true gates
check_eq "coverage"           "$coverage"        "1"
check_eq "coverage_health"    "$coverage_health" "1"
check_eq "receipts_health_v2" "$receipts_health" "1"
check_eq "devnet_overall"     "$devnet_overall"  "1"
check_eq "devnet_overall_5m"  "$devnet_overall_5m" "1"

check_ge_one "receipts_cov_v2" "$receipts_cov"

# Totals are best-effort: log, but never fail CI on missing metrics
if [ "$jobs_total" = "NaN" ] || [ -z "$jobs_total" ]; then
  echo "[WARN] jobs_total is NaN/missing (best-effort only; ignoring)"
else
  echo "[INFO] jobs_total=$jobs_total"
fi

if [ "$receipts_total" = "NaN" ] || [ -z "$receipts_total" ]; then
  echo "[WARN] receipts_total is NaN/missing (best-effort only; ignoring)"
else
  echo "[INFO] receipts_total=$receipts_total"
fi

echo
if [ "$fail" -ne 0 ]; then
  echo "[devnet-traffic] RESULT: BAD (see failures above)"
  exit 1
fi

echo "[devnet-traffic] RESULT: OK (coverage + receipts + overall health look sane)"
