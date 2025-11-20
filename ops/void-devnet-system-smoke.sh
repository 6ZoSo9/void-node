#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$(pwd)}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[system-smoke] repo=$REPO"
echo "[system-smoke] prom_url=$PROM_URL"
echo

q() {
  local name expr val
  name="${1:-}"
  expr="${2:-}"

  # Defensive: if we somehow get called with missing args, don't crash under set -u
  if [[ -z "$name" || -z "$expr" ]]; then
    printf "  %-32s = %s\n" "${name:-<missing>}" "NaN"
    return 0
  fi

  val="$(
    curl -fsS "$PROM_URL/api/v1/query" \
      --data-urlencode "query=$expr" \
      | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null \
      || echo "NaN"
  )"

  printf "  %-32s = %s\n" "$name" "$val"
}

echo "[system-smoke] core devnet health gauges:"
q "models_health"         'void_models_devnet_health{chain="devnet"}'
q "datasets_health"       'void_datasets_devnet_health{chain="devnet"}'
q "agentreg_health"       'void_agentreg_devnet_health{chain="devnet"}'
q "coverage_job"          'void_devnet_coverage{chain="devnet"}'
q "coverage_job_health"   'void_devnet_coverage_health{chain="devnet"}'
q "receipts_cov_v2"       'void_devnet_receipts_coverage_v2{chain="devnet"}'
q "receipts_health_v2"    'void_devnet_receipts_health_v2{chain="devnet"}'

echo
echo "[system-smoke] 5m smoothed coverage (recording rules):"
q "coverage_v2_last_5m"   'void:devnet_receipts_coverage_v2:last_5m'
q "receipts_health_v2_5m" 'void:devnet_receipts_health_v2:last_5m'

echo
echo "[system-smoke] interpretation:"
echo "  - models_health / datasets_health / agentreg_health should be 1 when their"
echo "    respective contracts are deployed and configured correctly."
echo "  - coverage_job should be 1.0 when every JobQueue job has >=1 receipt."
echo "  - coverage_job_health == 1 means there are no uncovered jobs."
echo "  - receipts_cov_v2 > 1 just means multiple receipts per job (fine for devnet)."
echo "  - receipts_health_v2 == 1 means receipts_total >= jobs_total."
echo "  - *_last_5m versions are smoothed views; they should eventually match the raw gauges."
