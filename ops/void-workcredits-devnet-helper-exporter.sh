#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4312}"
ADDR="${ADDR:-0x1111111111111111111111111111111111111111}"
OUT="${OUT:-/var/lib/node_exporter/textfile_collector/void_workcredits_devnet_helper.prom}"

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

# Default: unhealthy
cat > "$TMP" <<'EOP'
# HELP void_workcredits_devnet_helper_health WorkCredits devnet helper health (1=ok,0=bad)
# TYPE void_workcredits_devnet_helper_health gauge
void_workcredits_devnet_helper_health{chain="devnet"} 0
EOP

JSON="$(curl -fsS "$BASE/workcredits/devnet/dashboard/$ADDR.json" 2>/dev/null || true)"

if [[ -n "$JSON" ]]; then
  health="$(printf '%s\n' "$JSON" | jq -r '.pool.health // .pool.health_5m // 0' 2>/dev/null || echo 0)"
  if [[ "$health" == "1" ]]; then
    cat > "$TMP" <<'EOP2'
# HELP void_workcredits_devnet_helper_health WorkCredits devnet helper health (1=ok,0=bad)
# TYPE void_workcredits_devnet_helper_health gauge
void_workcredits_devnet_helper_health{chain="devnet"} 1
EOP2
  fi
fi

mv "$TMP" "$OUT"
