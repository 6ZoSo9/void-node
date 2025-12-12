#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet — WorkCredits pillar exporter
#
# Emits three gauges, plus an info series:
#
#   void_mainnet_workcredits_spec_present
#   void_mainnet_workcredits_spec_nonempty
#   void_mainnet_workcredits_health
#   void_mainnet_workcredits_info{...}
#
# Semantics:
#   spec_present   = 1 if the live JSON exists, else 0
#   spec_nonempty  = 1 if both token+pool are non-zero addresses, else 0
#   health         = 1 iff:
#                      - chainId == 2050
#                      - spec_present == 1
#                      - spec_nonempty == 1
#                    otherwise 0
#
# Stub state (current expected mainnet status):
#   - JSON exists with chainId=2050
#   - token/pool are zero
#   => spec_present   = 1
#      spec_nonempty  = 0
#      health         = 0

ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
OUT="${OUT:-/var/lib/node_exporter/textfile_collector/void_mainnet_workcredits.prom}"
CFG="${CFG:-$ROOT/config/void-mainnet-workcredits.live.json}"

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

emit() {
  local spec_present="$1"
  local spec_nonempty="$2"
  local health="$3"
  local mode="$4"
  local reason="$5"
  local chainId="$6"
  local token_zero="$7"
  local pool_zero="$8"

  cat >"$TMP" <<PROM
# HELP void_mainnet_workcredits_spec_present WorkCredits mainnet spec JSON present (1=yes,0=no)
# TYPE void_mainnet_workcredits_spec_present gauge
void_mainnet_workcredits_spec_present $spec_present
# HELP void_mainnet_workcredits_spec_nonempty WorkCredits mainnet spec has non-zero token+pool addresses (1=yes,0=no)
# TYPE void_mainnet_workcredits_spec_nonempty gauge
void_mainnet_workcredits_spec_nonempty $spec_nonempty
# HELP void_mainnet_workcredits_health WorkCredits mainnet pillar health (1=ok,0=bad)
# TYPE void_mainnet_workcredits_health gauge
void_mainnet_workcredits_health $health
# HELP void_mainnet_workcredits_info Info about WorkCredits mainnet pillar state
# TYPE void_mainnet_workcredits_info gauge
void_mainnet_workcredits_info{mode="$mode",reason="$reason",chainId="$chainId",token_zero="$token_zero",pool_zero="$pool_zero"} 1
PROM

  install -m 600 -o root -g root "$TMP" "$OUT"
}

# Case 1: config missing entirely
if [[ ! -f "$CFG" ]]; then
  emit 0 0 0 "stub" "missing_config" "0" "true" "true"
  exit 0
fi

# From here on, spec_present = 1 (file exists)
spec_present=1

# Case 2: jq missing
if ! command -v jq >/dev/null 2>&1; then
  emit "$spec_present" 0 0 "stub" "jq_missing" "0" "true" "true"
  exit 0
fi

# Case 3: parse JSON
chainId="$(jq -r '.chainId // 0' "$CFG" 2>/dev/null || echo 0)"
token="$(jq -r '.workCreditsToken // "0x0000000000000000000000000000000000000000"' "$CFG" 2>/dev/null || echo "0x0000000000000000000000000000000000000000")"
pool="$(jq -r '.workCreditsPool  // "0x0000000000000000000000000000000000000000"' "$CFG" 2>/dev/null || echo "0x0000000000000000000000000000000000000000")"

token_zero="false"
pool_zero="false"
[[ "$token" == "0x0000000000000000000000000000000000000000" ]] && token_zero="true"
[[ "$pool"  == "0x0000000000000000000000000000000000000000" ]] && pool_zero="true"

spec_nonempty=0
if [[ "$token_zero" == "false" && "$pool_zero" == "false" ]]; then
  spec_nonempty=1
fi

# Wrong chainId => always unhealthy
if [[ "$chainId" != "2050" ]]; then
  emit "$spec_present" "$spec_nonempty" 0 "stub" "bad_chainId" "$chainId" "$token_zero" "$pool_zero"
  exit 0
fi

# Correct chainId; health depends on spec_nonempty
if [[ "$spec_nonempty" == "1" ]]; then
  # Live, non-zero addresses
  emit "$spec_present" "$spec_nonempty" 1 "live" "nonzero_addrs" "$chainId" "$token_zero" "$pool_zero"
else
  # Stub: zero addresses but correct chainId
  emit "$spec_present" "$spec_nonempty" 0 "stub" "zero_addrs" "$chainId" "$token_zero" "$pool_zero"
fi
