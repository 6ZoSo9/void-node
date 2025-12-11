#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet — WorkCredits PLAN exporter
#
# Writes a textfile for node_exporter with:
#   - void_mainnet_workcredits_plan_health (1=stub OK, 0=stub failed)
#   - void_mainnet_workcredits_plan_info{mode="stub",status="<msg>"} 1
#
# This is intentionally simple: it just runs the PLAN stub and turns the
# exit code into a health gauge.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="/var/lib/node_exporter/textfile_collector"
OUT_FILE="$OUT_DIR/void_mainnet_workcredits_plan.prom"

mkdir -p "$OUT_DIR"

TMP_FILE="$(mktemp "${OUT_FILE}.tmp.XXXXXX")"

HEALTH=0
STATUS="stub_failed"

if "$ROOT/ops/void-mainnet-workcredits-plan-stub.sh" >/dev/null 2>&1; then
  HEALTH=1
  STATUS="stub_ok"
fi

cat > "$TMP_FILE" <<EOF
# HELP void_mainnet_workcredits_plan_health WorkCredits PLAN stub health (1=ok,0=bad)
# TYPE void_mainnet_workcredits_plan_health gauge
void_mainnet_workcredits_plan_health $HEALTH
# HELP void_mainnet_workcredits_plan_info Info about WorkCredits PLAN stub run
# TYPE void_mainnet_workcredits_plan_info gauge
void_mainnet_workcredits_plan_info{mode="stub",status="$STATUS"} 1
EOF

mv "$TMP_FILE" "$OUT_FILE"
