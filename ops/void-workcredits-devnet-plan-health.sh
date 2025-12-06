#!/usr/bin/env bash
set -euo pipefail

# Resolve repo root from this script's location so sudo/HOME don't matter
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${REPO_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"

TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
METRIC_FILE="${TEXTFILE_DIR}/void-workcredits-devnet-plan.prom"

cd "$REPO_ROOT"

echo "=== [workcredits-devnet-plan-health] VOID WorkCredits devnet PLAN -> Prometheus textfile ==="
echo "[cfg] REPO_ROOT   = $REPO_ROOT"
echo "[cfg] TEXTFILE    = $METRIC_FILE"

if [[ ! -d "$TEXTFILE_DIR" ]]; then
  echo "[fatal] TEXTFILE_DIR does not exist: $TEXTFILE_DIR" >&2
  exit 1
fi

tmp_out="$(mktemp)"
trap 'rm -f "$tmp_out"' EXIT

echo
echo "=== [1] running plan script ==="
# We tee so we see the human output and still capture it for parsing.
./ops/void-workcredits-devnet-plan.sh | tee "$tmp_out"

echo
echo "=== [2] parsing plan_ok from output ==="
plan_ok="$(awk '/plan_ok/{print $3}' "$tmp_out" | tail -n 1 || true)"

if [[ -z "${plan_ok:-}" ]]; then
  echo "[warn] could not parse plan_ok; defaulting to 0"
  plan_ok="0"
fi

if [[ "$plan_ok" != "0" && "$plan_ok" != "1" ]]; then
  echo "[warn] unexpected plan_ok value ($plan_ok); forcing to 0"
  plan_ok="0"
fi

echo "[info] plan_ok = $plan_ok"

echo
echo "=== [3] writing Prometheus textfile ==="
cat > "$METRIC_FILE" <<EOF
# HELP void_workcredits_devnet_plan_health WorkCredits devnet PLAN health (0=not-ready, 1=ready)
# TYPE void_workcredits_devnet_plan_health gauge
void_workcredits_devnet_plan_health{chain="devnet"} $plan_ok
EOF

echo "[ok] wrote $METRIC_FILE"
