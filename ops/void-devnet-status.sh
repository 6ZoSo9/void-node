#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$(pwd)}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

STATE="$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json"
SPOOL="$REPO/docs/VOID-DEVNET-JOB-SPOOL.txt"
TEXTFILE="/var/lib/node_exporter/textfile_collector/void_devnet_coverage.prom"

echo "[status] repo=$REPO"
echo "[status] RPC_URL=$RPC_URL"
echo "[status] PROM_URL=$PROM_URL"
echo

# --- Job spool info (just a quick signal) ---

if [ -f "$SPOOL" ]; then
  jobs_in_spool="$(wc -l < "$SPOOL" || echo 0)"
else
  jobs_in_spool=0
fi

echo "[status] job spool: $SPOOL"
echo "[status] jobs_in_spool=$jobs_in_spool"
echo

# --- NOTE: coverage recompute is now a root-only op via void-devnet-coverage-smoke.sh ---
echo "[status] coverage recompute: SKIPPED (run ops/void-devnet-coverage-smoke.sh for root-only heal)"
echo

# --- Show current textfile snapshot if present ---

if [ -f "$TEXTFILE" ]; then
  echo "[status] textfile snapshot ($TEXTFILE):"
  sed -n '1,40p' "$TEXTFILE"
  echo
else
  echo "[status] textfile snapshot missing: $TEXTFILE"
  echo
fi

# --- Helper to pull a Prom value safely (no label filters here) ---

get_prom() {
  local metric="$1"
  curl -fsS "$PROM_URL/api/v1/query?query=$metric" \
    | jq -r '.data.result[0].value[1] // "NaN"'
}

# --- Raw gauges ---

cov_job="$(get_prom void_devnet_coverage)"
cov_health="$(get_prom void_devnet_coverage_health)"
rec_cov_v2="$(get_prom void_devnet_receipts_coverage_v2)"
rec_health_v2="$(get_prom void_devnet_receipts_health_v2)"

echo "[status] raw devnet coverage gauges:"
printf '  void_devnet_coverage              = %s\n' "$cov_job"
printf '  void_devnet_coverage_health       = %s\n' "$cov_health"
printf '  void_devnet_receipts_coverage_v2  = %s\n' "$rec_cov_v2"
printf '  void_devnet_receipts_health_v2    = %s\n' "$rec_health_v2"
echo

cat <<'EOT'
[status] interpretation:
  - void_devnet_coverage == 1 means every JobQueue job has >=1 receipt.
  - void_devnet_coverage_health == 1 means no uncovered jobs.
  - void_devnet_receipts_health_v2 == 1 means receipts_total >= jobs_total.
  - void_devnet_receipts_coverage_v2 > 1 just means multiple receipts per job (fine on devnet).
EOT
