#!/usr/bin/env bash
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="$REPO/docs"
JOBS_FILE="$DOCS_DIR/VOID-DEVNET-DEMO-JOBS.jsonl"
RECEIPTS_FILE="$DOCS_DIR/VOID-DEVNET-DEMO-RECEIPTS.jsonl"

CACHE_DIR="$HOME/.cache/node-exporter-textfile"
CACHE_METRIC="$CACHE_DIR/void_devnet_demo.prom"
TEXTFILE_DIR="/var/lib/node_exporter/textfile_collector"
TEXTFILE_METRIC="$TEXTFILE_DIR/void_devnet_demo.prom"

mkdir -p "$DOCS_DIR" "$CACHE_DIR"

if [[ ! -f "$JOBS_FILE" ]] || [[ ! -s "$JOBS_FILE" ]]; then
  echo "[demo-metrics] no jobs found in $JOBS_FILE – writing empty metrics"
  jobs_total=0
else
  jobs_total="$(jq -s 'length' "$JOBS_FILE" 2>/dev/null || echo 0)"
fi

if [[ ! -f "$RECEIPTS_FILE" ]] || [[ ! -s "$RECEIPTS_FILE" ]]; then
  receipts_total=0
else
  receipts_total="$(jq -s 'length' "$RECEIPTS_FILE" 2>/dev/null || echo 0)"
fi

if [[ "$jobs_total" -gt 0 ]]; then
  coverage="$(awk -v r="$receipts_total" -v j="$jobs_total" 'BEGIN { if (j==0) print 0; else printf "%.6f", r/j }')"
else
  coverage="0.000000"
fi

health=0
if [[ "$jobs_total" -gt 0 ]] && [[ "$receipts_total" -ge "$jobs_total" ]]; then
  health=1
fi

echo "[demo-metrics] jobs_total=$jobs_total receipts_total=$receipts_total coverage=$coverage health=$health"

cat > "$CACHE_METRIC" <<EOT
# HELP void_devnet_demo_jobs_total demo jobs total (JSONL, local only)
# TYPE void_devnet_demo_jobs_total gauge
void_devnet_demo_jobs_total{chain="devnet"} $jobs_total
# HELP void_devnet_demo_receipts_total demo receipts total (JSONL, local only)
# TYPE void_devnet_demo_receipts_total gauge
void_devnet_demo_receipts_total{chain="devnet"} $receipts_total
# HELP void_devnet_demo_coverage demo receipts/job ratio (JSONL, local only)
# TYPE void_devnet_demo_coverage gauge
void_devnet_demo_coverage{chain="devnet"} $coverage
# HELP void_devnet_demo_health demo health (1=ok,0=bad) (jobs>0 and receipts>=jobs)
# TYPE void_devnet_demo_health gauge
void_devnet_demo_health{chain="devnet"} $health
EOT

echo "[demo-metrics] wrote cache metrics -> $CACHE_METRIC"

if [[ -d "$TEXTFILE_DIR" ]]; then
  echo "[demo-metrics] installing to $TEXTFILE_METRIC via sudo..."
  sudo cp "$CACHE_METRIC" "$TEXTFILE_METRIC"
  sudo chown node_exporter:node_exporter "$TEXTFILE_METRIC" 2>/dev/null || true
else
  echo "[demo-metrics] WARNING: $TEXTFILE_DIR does not exist; skipping install"
fi

echo "[demo-metrics] done."
