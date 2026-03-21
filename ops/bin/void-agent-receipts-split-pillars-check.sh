#!/usr/bin/env bash
set -euo pipefail

# expects `q` helper to exist in environment (same as other pillars scripts)
METRIC="${METRIC:-void_pillars_health_with_agent_receipts_split_scalar}"

v="$(q "$METRIC" 2>/dev/null || true)"
echo "agent_receipts_split_ok_scalar=${v:-<empty>}"

# Accept "1" or "1.0" (PromQL often prints float-ish strings)
case "${v:-}" in
  1|1.0|1.00|1.000) exit 0 ;;
  *) echo "[FAIL] ${METRIC} != 1 (requires exporter up AND a receipt write within last 5m)"; exit 1 ;;
esac
