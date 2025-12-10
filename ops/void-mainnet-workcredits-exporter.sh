#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
OUT="${OUT:-/var/lib/node_exporter/textfile_collector/void_mainnet_workcredits.prom}"
CFG="${CFG:-$ROOT/config/void-mainnet-workcredits.live.json}"

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

emit() {
  local health="$1"
  local mode="$2"
  local reason="$3"
  local chainId="$4"
  local token_zero="$5"
  local pool_zero="$6"

  cat >"$TMP" <<PROM
# HELP void_mainnet_workcredits_health WorkCredits mainnet pillar health (1=ok,0=bad)
# TYPE void_mainnet_workcredits_health gauge
void_mainnet_workcredits_health $health
# HELP void_mainnet_workcredits_info Info about WorkCredits mainnet pillar state
# TYPE void_mainnet_workcredits_info gauge
void_mainnet_workcredits_info{mode="$mode",reason="$reason",chainId="$chainId",token_zero="$token_zero",pool_zero="$pool_zero"} 1
PROM

  install -m 600 -o root -g root "$TMP" "$OUT"
}

if [[ ! -f "$CFG" ]]; then
  emit 0 "stub" "missing_config" "0" "true" "true"
  exit 0
fi

if ! command -v jq >/dev/null 2>&1; then
  emit 0 "stub" "jq_missing" "0" "true" "true"
  exit 0
fi

chainId="$(jq -r '.chainId // 0' "$CFG" 2>/dev/null || echo 0)"
token="$(jq -r '.workCreditsToken // "0x0000000000000000000000000000000000000000"' "$CFG" 2>/dev/null || echo "0x0000000000000000000000000000000000000000")"
pool="$(jq -r '.workCreditsPool // "0x0000000000000000000000000000000000000000"' "$CFG" 2>/dev/null || echo "0x0000000000000000000000000000000000000000")"

token_zero="false"
pool_zero="false"
[[ "$token" == "0x0000000000000000000000000000000000000000" ]] && token_zero="true"
[[ "$pool" == "0x0000000000000000000000000000000000000000" ]] && pool_zero="true"

# Stub semantics:
# - If chainId==2050 and JSON parses, we treat the pillar as "stub OK" even if
#   token/pool are still zero. Health=1; info carries the zero/non-zero status.
# - If chainId is wrong or parse fails, health=0.
if [[ "$chainId" != "2050" ]]; then
  emit 0 "stub" "bad_chainId" "$chainId" "$token_zero" "$pool_zero"
  exit 0
fi

emit 1 "stub" "ok_stub" "$chainId" "$token_zero" "$pool_zero"
