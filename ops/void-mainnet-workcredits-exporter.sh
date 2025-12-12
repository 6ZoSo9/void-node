#!/usr/bin/env bash
set -euo pipefail

# Resolve the NON-root home when run via sudo
USER_HOME="$(getent passwd "${SUDO_USER:-$USER}" | cut -d: -f6 2>/dev/null || echo "$HOME")"
ROOT="${ROOT:-$USER_HOME/dev/void-node}"
CFG="${CFG:-$ROOT/config/void-workcredits-mainnet.live.json}"
OUT="${OUT:-/var/lib/node_exporter/textfile_collector/void_mainnet_workcredits.prom}"

tmp="$(mktemp)"

# Safe defaults so set -u never bites us
chain_id="unknown"
void_token=""
wc_token=""
pool_addr=""
decimals=""

health=0
reason="missing_config"

if [[ -r "$CFG" ]]; then
  cfg_json="$(cat "$CFG")"

  chain_id="$(jq -r '.chainId // .chain_id // "unknown"' <<<"$cfg_json" 2>/dev/null || echo "unknown")"
  void_token="$(jq -r '.voidToken // ""' <<<"$cfg_json" 2>/dev/null || echo "")"
  wc_token="$(jq -r '.workCreditsToken // ""' <<<"$cfg_json" 2>/dev/null || echo "")"
  pool_addr="$(jq -r '.workCreditsPoolV1 // .pool // ""' <<<"$cfg_json" 2>/dev/null || echo "")"
  decimals="$(jq -r '.decimals // 18' <<<"$cfg_json" 2>/dev/null || echo "18")"

  ok_chain=0
  ok_void=0
  ok_wc=0
  ok_pool=0
  ok_dec=0

  if [[ "$chain_id" == "2050" ]]; then
    ok_chain=1
  fi

  if [[ "$void_token" =~ ^0x[0-9a-fA-F]{40}$ && "$void_token" != "0x0000000000000000000000000000000000000000" ]]; then
    ok_void=1
  fi

  if [[ "$wc_token" =~ ^0x[0-9a-fA-F]{40}$ && "$wc_token" != "0x0000000000000000000000000000000000000000" ]]; then
    ok_wc=1
  fi

  if [[ "$pool_addr" =~ ^0x[0-9a-fA-F]{40}$ && "$pool_addr" != "0x0000000000000000000000000000000000000000" ]]; then
    ok_pool=1
  fi

  if [[ "$decimals" == "18" ]]; then
    ok_dec=1
  fi

  if [[ "$ok_chain" == "1" && "$ok_void" == "1" && "$ok_wc" == "1" && "$ok_pool" == "1" && "$ok_dec" == "1" ]]; then
    health=1
    reason="ok"
  else
    reason="bad_config"
  fi
fi

cat >"$tmp" <<EOF
# HELP void_mainnet_workcredits_health Overall health of VOID mainnet WorkCredits pillar (1=OK, 0=bad)
# TYPE void_mainnet_workcredits_health gauge
void_mainnet_workcredits_health $health

# HELP void_mainnet_workcredits_config Static config status derived from void-workcredits-mainnet.live.json
# TYPE void_mainnet_workcredits_config gauge
void_mainnet_workcredits_config{chain_id="$chain_id",reason="$reason"} 1

# HELP void_mainnet_workcredits_checks Individual config checks (1=pass, 0=fail)
# TYPE void_mainnet_workcredits_checks gauge
void_mainnet_workcredits_checks{check="chain_id_2050"} $([[ "$chain_id" == "2050" ]] && echo 1 || echo 0)
void_mainnet_workcredits_checks{check="void_token_nonzero"} $([[ "$void_token" =~ ^0x[0-9a-fA-F]{40}$ && "$void_token" != "0x0000000000000000000000000000000000000000" ]] && echo 1 || echo 0)
void_mainnet_workcredits_checks{check="wc_token_nonzero"} $([[ "$wc_token" =~ ^0x[0-9a-fA-F]{40}$ && "$wc_token" != "0x0000000000000000000000000000000000000000" ]] && echo 1 || echo 0)
void_mainnet_workcredits_checks{check="pool_nonzero"} $([[ "$pool_addr" =~ ^0x[0-9a-fA-F]{40}$ && "$pool_addr" != "0x0000000000000000000000000000000000000000" ]] && echo 1 || echo 0)
void_mainnet_workcredits_checks{check="decimals_18"} $([[ "$decimals" == "18" ]] && echo 1 || echo 0)
EOF

chmod 0644 "$tmp"
sudo mv "$tmp" "$OUT"

echo "[void-mainnet-workcredits-exporter] USER_HOME=$USER_HOME ROOT=$ROOT CFG=$CFG OUT=$OUT health=$health reason=$reason"
