#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
SPOOL="${SPOOL:-docs/VOID-DEVNET-JOB-SPOOL.txt}"
TEXTFILE="${TEXTFILE:-/var/lib/node_exporter/textfile_collector/void_devnet_coverage.prom}"

# shellcheck disable=SC1091
source ops/_void_prom_q.sh

echo "[status] repo=$(pwd)"
echo "[status] RPC_URL=$RPC_URL"
echo "[status] PROM_URL=$PROM_URL"
echo
echo "[status] job spool: $(realpath -m "$SPOOL")"
jobs_in_spool=0
if [ -f "$SPOOL" ]; then
  jobs_in_spool="$(awk 'NF && $0 !~ /^[[:space:]]*#/ {c++} END{print c+0}' "$SPOOL")"
fi
echo "[status] jobs_in_spool=$jobs_in_spool"
echo
echo "[status] coverage recompute: SKIPPED (run ops/void-devnet-coverage-smoke.sh for root-only heal)"
echo
echo "[status] textfile snapshot ($TEXTFILE):"
if [ -f "$TEXTFILE" ]; then
  sudo sed -n '1,220p' "$TEXTFILE" || sed -n '1,220p' "$TEXTFILE" || true
else
  echo "[WARN] missing textfile: $TEXTFILE"
fi

# IMPORTANT: use max() to avoid NaN from scalar() / multi-series
cov="$(prom_q 'max(void_devnet_coverage{chain="devnet"})')"
cov_h="$(prom_q 'max(void_devnet_coverage_health{chain="devnet"})')"
rcov="$(prom_q 'max(void_devnet_receipts_coverage_v2{chain="devnet"})')"
rh="$(prom_q 'max(void_devnet_receipts_health_v2{chain="devnet"})')"

echo
echo "[status] raw devnet coverage gauges (Prom max()):"
printf "  %-28s = %s\n" "void_devnet_coverage" "$cov"
printf "  %-28s = %s\n" "void_devnet_coverage_health" "$cov_h"
printf "  %-28s = %s\n" "void_devnet_receipts_coverage_v2" "$rcov"
printf "  %-28s = %s\n" "void_devnet_receipts_health_v2" "$rh"

echo
echo "[status] interpretation:"
echo "  - void_devnet_coverage == 1 means every JobQueue job has >=1 receipt."
echo "  - void_devnet_coverage_health == 1 means no uncovered jobs."
echo "  - void_devnet_receipts_health_v2 == 1 means receipts_total >= jobs_total."
echo "  - void_devnet_receipts_coverage_v2 > 1 just means multiple receipts per job (fine on devnet)."
