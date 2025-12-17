#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
# shellcheck disable=SC1091
source ops/_void_prom_q.sh

echo "[system-smoke] repo=$(pwd)"
echo "[system-smoke] prom_url=$PROM_URL"
echo

models="$(prom_q 'max(void_models_devnet_health)')"
datasets="$(prom_q 'max(void_datasets_devnet_health)')"
agentreg="$(prom_q 'max(void_agentreg_devnet_health)')"

cov="$(prom_q 'max(void_devnet_coverage{chain="devnet"})')"
cov_h="$(prom_q 'max(void_devnet_coverage_health{chain="devnet"})')"
rcov="$(prom_q 'max(void_devnet_receipts_coverage_v2{chain="devnet"})')"
rh="$(prom_q 'max(void_devnet_receipts_health_v2{chain="devnet"})')"

echo "[system-smoke] core devnet health gauges:"
printf "  %-30s = %s\n" "models_health" "$models"
printf "  %-30s = %s\n" "datasets_health" "$datasets"
printf "  %-30s = %s\n" "agentreg_health" "$agentreg"
printf "  %-30s = %s\n" "coverage_job" "$cov"
printf "  %-30s = %s\n" "coverage_job_health" "$cov_h"
printf "  %-30s = %s\n" "receipts_cov_v2" "$rcov"
printf "  %-30s = %s\n" "receipts_health_v2" "$rh"

echo
echo "[system-smoke] 5m smoothed coverage (recording rules):"
c5="$(prom_q 'max(void_devnet_coverage_last_5m)')"
r5="$(prom_q 'max(void:devnet_receipts_health_v2:last_5m)')"
printf "  %-30s = %s\n" "coverage_v2_last_5m" "$c5"
printf "  %-30s = %s\n" "receipts_health_v2_5m" "$r5"

echo
echo "[system-smoke] interpretation:"
echo "  - models/datasets/agentreg should be 1 when contracts are configured."
echo "  - coverage_job + coverage_job_health should be 1."
echo "  - receipts_health_v2 should be 1."
