#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/home/zoso/dev/void-node}"
TEXTFILE_SRC="${TEXTFILE_SRC:-$REPO_ROOT/ops/textfile/void_mainnet_bootstrap_plan.prom}"
TEXTFILE_DST="${TEXTFILE_DST:-/var/lib/node_exporter/textfile_collector/void_mainnet_bootstrap_plan.prom}"

echo "=== [mainnet-bootstrap-plan-exporter] exporting plan readiness metric ==="
echo "[info] REPO_ROOT    = $REPO_ROOT"
echo "[info] TEXTFILE_SRC = $TEXTFILE_SRC"
echo "[info] TEXTFILE_DST = $TEXTFILE_DST"

mkdir -p "$(dirname "$TEXTFILE_DST")"

if [[ -f "$TEXTFILE_SRC" ]]; then
  echo "[info] source file exists; copying..."
  cp "$TEXTFILE_SRC" "$TEXTFILE_DST"
else
  echo "[warn] source file missing; writing default NOT READY metric."
  cat > "$TEXTFILE_DST" <<'EOF'
# HELP void_mainnet_bootstrap_plan_ready Is the VOID mainnet bootstrap plan simulation passing (1=yes,0=no)
# TYPE void_mainnet_bootstrap_plan_ready gauge
void_mainnet_bootstrap_plan_ready 0
EOF
fi

if id -u node-exporter >/dev/null 2>&1; then
  chown node-exporter:node-exporter "$TEXTFILE_DST" || true
else
  echo "[warn] user node-exporter not found; leaving ownership as-is."
fi

echo "[ok] wrote $TEXTFILE_DST"
echo "=== [mainnet-bootstrap-plan-exporter] DONE ==="
