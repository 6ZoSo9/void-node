#!/usr/bin/env bash
set -euo pipefail

PROM="${PROM_URL:-http://127.0.0.1:9090}"

q_scalar() {
  local expr="$1"
  curl -fsS "$PROM/api/v1/query" \
    --data-urlencode "query=$expr" \
  | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null
}

echo "[mainnet-core-ci] prom_url=$PROM"

tf_err=$(q_scalar 'node_textfile_scrape_error')
core_health=$(q_scalar 'void_mainnet_core_health')
core_devnet=$(q_scalar 'void_mainnet_core_devnet_overall')
manifest_days=$(q_scalar 'void_mainnet_core_manifest_days_left')
manifest_health=$(q_scalar 'void_mainnet_core_manifest_health')

echo
echo "[mainnet-core-ci] raw gauges:"
echo "  node_textfile_scrape_error        = $tf_err"
echo "  void_mainnet_core_health          = $core_health"
echo "  void_mainnet_core_devnet_overall  = $core_devnet"
echo "  void_mainnet_core_manifest_health = $manifest_health"
echo "  void_mainnet_core_manifest_days_left = $manifest_days"

failed=0

# 1) textfile collector must be clean
if [[ "$tf_err" != "0" ]]; then
  echo "[mainnet-core-ci] FAIL: node_textfile_scrape_error != 0"
  failed=1
fi

# 2) devnet pillar must be green (this is our core truth source)
if [[ "$core_devnet" != "1" ]]; then
  echo "[mainnet-core-ci] FAIL: void_mainnet_core_devnet_overall != 1"
  failed=1
fi

# 3) manifest must be healthy
if [[ "$manifest_health" != "1" ]]; then
  echo "[mainnet-core-ci] FAIL: void_mainnet_core_manifest_health != 1"
  failed=1
fi

# 4) manifest runway must be >= 7 days
if [[ "$manifest_days" == "NaN" ]]; then
  echo "[mainnet-core-ci] FAIL: manifest_days_left is NaN/missing"
  failed=1
else
  # treat as integer days, ignore fractional part
  manifest_days_int="${manifest_days%.*}"
  if (( manifest_days_int < 7 )); then
    echo "[mainnet-core-ci] FAIL: manifest_days_left ($manifest_days_int) < 7 days"
    failed=1
  fi
fi

echo
echo "[mainnet-core-ci] interpretation:"
echo "  - node_textfile_scrape_error must be 0."
echo "  - devnet pillar (void_mainnet_core_devnet_overall) must be 1."
echo "  - manifest_health must be 1 and days_left >= 7."
echo "  - void_mainnet_core_health is currently allowed to be 0 while"
echo "    safeboot pillar is not fully wired; we are not gating on it yet."

if [[ "$failed" -ne 0 ]]; then
  echo
  echo "[mainnet-core-ci] RESULT: FAIL (see messages above)"
  exit 1
fi

echo
echo "[mainnet-core-ci] RESULT: OK (mainnet-core core invariants satisfied)"
