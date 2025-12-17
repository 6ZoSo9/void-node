#!/usr/bin/env bash
set -euo pipefail

# --- devnet-state-shim-v2: supports docs/VOID-DEVNET-PROTOCOL-STATE.json contracts.*.address ---
STATE="${STATE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"

void_addr_v2() {
  local name="$1"
  local st="${STATE}"
  if [ ! -f "$st" ]; then
    echo ""
    return 0
  fi

  local v
  v="$(jq -r --arg k "$name" '
    (
      .contracts[$k].address //
      .contracts[$k] //
      .[$k].address //
      .[$k] //
      empty
    ) | tostring
  ' "$st" 2>/dev/null || true)"

  if [ -z "$v" ] || [ "$v" = "null" ] || [ "$v" = "NULL" ]; then
    echo ""
    return 0
  fi
  if ! [[ "$v" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
    echo ""
    return 0
  fi
  if [[ "$v" =~ ^0x0+$ ]]; then
    echo ""
    return 0
  fi
  echo "$v"
}
# --- end devnet-state-shim-v2 ---


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
echo
echo "=== [gate] devnet receipts e2e (must be ok=1) ==="
./ops/void-devnet-receipts-e2e-gate.sh

  exit 0
fi

echo "[ci-smoke] RESULT: FAIL (coverage/health gauges not all 1)"
exit 2

# --- devnet-state-shim-v2 usage: prefer contracts.*.address if vars are empty ---
if [ -z "${JOBQ:-}" ] || [ "${JOBQ:-}" = "null" ] || [[ "${JOBQ:-}" =~ ^0x0+$ ]]; then
  JOBQ="$(void_addr_v2 JobQueue)"
fi
if [ -z "${RR:-}" ] || [ "${RR:-}" = "null" ] || [[ "${RR:-}" =~ ^0x0+$ ]]; then
  RR="$(void_addr_v2 ReceiptRegistry)"
fi
# --- end shim ---

