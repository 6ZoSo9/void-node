#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
# shellcheck disable=SC1091
source ops/_void_prom_q.sh

echo "[ci-smoke] repo=$(pwd)"
echo "[ci-smoke] prom_url=$PROM_URL"
echo

echo "[ci-smoke] step 1: devnet status:"
./ops/void-devnet-status.sh || true
echo

echo "[ci-smoke] step 2: devnet coverage smoke:"
if [ -x ./ops/void-devnet-coverage-smoke.sh ]; then
  ./ops/void-devnet-coverage-smoke.sh || echo "[ci-smoke] coverage smoke FAILED (ignored for CI gate; rely on gauges)"
else
  echo "[ci-smoke] coverage smoke: SKIP (missing ops/void-devnet-coverage-smoke.sh)"
fi
echo

echo "[ci-smoke] step 3: devnet system smoke:"
./ops/void-devnet-system-smoke.sh || true
echo

echo "[ci-smoke] step 4: jobs/receipts report:"
if [ -x ./ops/void-devnet-jobs-receipts-report.sh ]; then
  ./ops/void-devnet-jobs-receipts-report.sh || true
else
  echo "[ci-smoke] (no report script; ok)"
fi
echo

echo "[ci-smoke] step 5: Prometheus coverage sanity:"
cov="$(prom_q 'max(void_devnet_coverage{chain="devnet"})')"
cov_h="$(prom_q 'max(void_devnet_coverage_health{chain="devnet"})')"
rcov="$(prom_q 'max(void_devnet_receipts_coverage_v2{chain="devnet"})')"
rh="$(prom_q 'max(void_devnet_receipts_health_v2{chain="devnet"})')"
printf "  %-28s = %s\n" "void_devnet_coverage" "$cov"
printf "  %-28s = %s\n" "void_devnet_coverage_health" "$cov_h"
printf "  %-28s = %s\n" "void_devnet_receipts_coverage_v2" "$rcov"
printf "  %-28s = %s\n" "void_devnet_receipts_health_v2" "$rh"
echo

# Gate condition (strict on the two coverage gauges + receipts health)
if num_eq1 "$cov" >/dev/null 2>&1 && num_eq1 "$cov_h" >/dev/null 2>&1 && num_eq1 "$rh" >/dev/null 2>&1; then
  echo "[ci-smoke] RESULT: OK (devnet jobs + receipts are healthy)"
  exit 0
fi

echo "[ci-smoke] RESULT: FAIL (coverage/health gauges not all 1)"
exit 2
