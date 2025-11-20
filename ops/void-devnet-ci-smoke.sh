#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$(pwd)}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "[ci-smoke] repo=$REPO"
echo "[ci-smoke] prom_url=$PROM_URL"
echo

# --- Helper for Prom queries (plain metric names) ---

get_prom() {
  local metric="$1"
  curl -fsS "$PROM_URL/api/v1/query?query=$metric" \
    | jq -r '.data.result[0].value[1] // "NaN"'
}

# --- Step 1: devnet status (text + gauges) ---

echo "[ci-smoke] step 1: devnet status:"
"$REPO/ops/void-devnet-status.sh"
echo

# --- Step 2: coverage smoke (healer + Prom cross-check, ROOT-ONLY, NON-FATAL) ---

if [ -x "$REPO/ops/void-devnet-coverage-smoke.sh" ]; then
  echo "[ci-smoke] step 2: devnet coverage smoke:"
  (
    set +e
    "$REPO/ops/void-devnet-coverage-smoke.sh"
    s=$?
    if [ "$s" -ne 0 ]; then
      echo "[ci-smoke] coverage smoke FAILED (ignored for CI gate; rely on gauges)"
    fi
  )
  echo
else
  echo "[ci-smoke] step 2: devnet coverage smoke script missing (skipped)"
  echo
fi

# --- Step 3: system smoke (models/datasets/agentreg + coverage) ---

if [ -x "$REPO/ops/void-devnet-system-smoke.sh" ]; then
  echo "[ci-smoke] step 3: devnet system smoke:"
  "$REPO/ops/void-devnet-system-smoke.sh"
  echo
else
  echo "[ci-smoke] step 3: devnet system smoke script missing (skipped)"
  echo
fi

# --- Step 4: jobs/receipts mapping report ---

if [ -x "$REPO/ops/void-devnet-jobs-report.sh" ]; then
  echo "[ci-smoke] step 4: jobs/receipts report:"
  RPC_URL="$RPC_URL" "$REPO/ops/void-devnet-jobs-report.sh"
  echo
else
  echo "[ci-smoke] step 4: jobs/receipts report script missing (skipped)"
  echo
fi

# --- Step 5: hard Prom sanity checks on coverage/health ---

echo "[ci-smoke] step 5: Prometheus coverage sanity:"

cov_job="$(get_prom void_devnet_coverage)"
cov_health="$(get_prom void_devnet_coverage_health)"
rec_cov_v2="$(get_prom void_devnet_receipts_coverage_v2)"
rec_health_v2="$(get_prom void_devnet_receipts_health_v2)"

printf '  void_devnet_coverage              = %s\n' "$cov_job"
printf '  void_devnet_coverage_health       = %s\n' "$cov_health"
printf '  void_devnet_receipts_coverage_v2  = %s\n' "$rec_cov_v2"
printf '  void_devnet_receipts_health_v2    = %s\n' "$rec_health_v2"
echo

if [ "$cov_job" != "1" ] || [ "$cov_health" != "1" ] || [ "$rec_health_v2" != "1" ]; then
  echo "[ci-smoke] RESULT: FAIL (coverage/health gauges not all 1)"
  exit 1
fi

echo "[ci-smoke] RESULT: OK (devnet jobs + receipts are healthy)"
