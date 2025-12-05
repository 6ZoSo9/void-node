#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
OUT="${OUT:-$TEXTFILE_DIR/void_mainnet_work_credits.prom}"

cd "$REPO_ROOT"

echo "=== [work-credits-exporter] VOID mainnet Work Credits exporter ==="
echo "[cfg] REPO_ROOT   = $REPO_ROOT"
echo "[cfg] TEXTFILE_DIR= $TEXTFILE_DIR"
echo "[cfg] OUT         = $OUT"
echo

health=0
reason="unknown"

echo "[1] running Work Credits pillar health-all..."
if ./ops/void-mainnet-work-credits-health-all.sh; then
  echo "[pillar] Work Credits health-all: OK"
  health=1
  reason="ok"
else
  rc=$?
  echo "[pillar] Work Credits health-all: FAILED (rc=$rc)"
  health=0
  reason="health_failed_rc_${rc}"
fi

echo
echo "[2] ensuring textfile dir exists (sudo may prompt)..."
sudo mkdir -p "$TEXTFILE_DIR"

echo "[3] writing metric to $OUT (sudo tee)..."
tmp="$(mktemp)"
cat > "$tmp" <<EOF2
# HELP void_mainnet_work_credits_health Is VOID mainnet Work Credits pillar healthy (tests + PLAN)?
# TYPE void_mainnet_work_credits_health gauge
void_mainnet_work_credits_health $health

# HELP void_mainnet_work_credits_health_info Info about VOID mainnet Work Credits pillar health
# TYPE void_mainnet_work_credits_health_info gauge
void_mainnet_work_credits_health_info{reason="$reason"} 1
EOF2

sudo mv "$tmp" "$OUT"
echo "[exporter] wrote $OUT with health=$health reason=$reason"

echo
echo "[4] done. You can check via Prometheus:"
echo "    curl -fsS \"http://127.0.0.1:9090/api/v1/query?query=void_mainnet_work_credits_health\" | jq '.data.result'"
