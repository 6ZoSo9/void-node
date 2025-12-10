#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
CFG="${CFG:-$ROOT/config/void-mainnet-workcredits.live.json}"

TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
OUT="${OUT:-$TEXTFILE_DIR/void_mainnet_workcredits.prom}"

spec_present=0
spec_nonempty=0
health=0

is_nonzero_address() {
  local a
  a="$(echo "$1" | tr 'A-Z' 'a-z' | xargs || true)"
  if [[ -n "$a" && "$a" != "0x0000000000000000000000000000000000000000" ]]; then
    return 0
  fi
  return 1
}

if [[ -f "$CFG" ]]; then
  spec_present=1
  token="$(jq -r '.workCreditsToken // ""' "$CFG" 2>/dev/null || echo "")"
  pool="$(jq -r '.workCreditsPool // ""'  "$CFG" 2>/dev/null || echo "")"

  if is_nonzero_address "$token" && is_nonzero_address "$pool"; then
    spec_nonempty=1
  fi
fi

if [[ "$spec_present" -eq 1 && "$spec_nonempty" -eq 1 ]]; then
  health=1
fi

tmp="$(mktemp)"

cat >"$tmp" <<EOF
# HELP void_mainnet_workcredits_spec_present Whether mainnet WorkCredits spec file exists (1/0)
# TYPE void_mainnet_workcredits_spec_present gauge
void_mainnet_workcredits_spec_present $spec_present

# HELP void_mainnet_workcredits_spec_nonempty Whether WorkCredits spec has non-zero token+pool addresses (1/0)
# TYPE void_mainnet_workcredits_spec_nonempty gauge
void_mainnet_workcredits_spec_nonempty $spec_nonempty

# HELP void_mainnet_workcredits_health Overall WorkCredits mainnet pillar health (1=ok,0=bad)
# TYPE void_mainnet_workcredits_health gauge
void_mainnet_workcredits_health $health
EOF

sudo mkdir -p "$TEXTFILE_DIR"
sudo mv "$tmp" "$OUT"

echo "[workcredits-exporter] wrote $OUT"
echo "[workcredits-exporter] spec_present=$spec_present spec_nonempty=$spec_nonempty health=$health"
