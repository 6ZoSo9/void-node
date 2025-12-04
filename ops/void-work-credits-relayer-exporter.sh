#!/usr/bin/env bash
set -euo pipefail

# VOID Work Credits — Relayer metrics exporter (stub v1)
#
# Purpose:
#   - Emit Prometheus textfile metrics for relayers that pay gas using VOID
#     and recover it via WC -> VOID swaps in UptimeVaultLLP.
#   - For now, this is a stub: it only reads a simple config file and
#     reports zeros. Later we can teach it to query chain balances and
#     real P&L.
#
# Usage:
#   TEXTFILE_DIR=/var/lib/node_exporter/textfile_collector \
#     ops/void-work-credits-relayer-exporter.sh
#
# Config (future):
#   RELAYER_CONFIG (optional) or default: config/void-relayers-dev.txt
#   File format (whitespace-separated, # = comment):
#     relayer_name 0xRelayerAddress
#
#   Example:
#     dev-relayer-1 0x1111111111111111111111111111111111111111
#     dev-relayer-2 0x2222222222222222222222222222222222222222
#
#   For now, if the file does not exist or is empty, we just emit:
#     void_relayers_configured_total 0

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
OUT_TMP="${TEXTFILE_DIR}/void-relayers.prom.$$"
OUT="${TEXTFILE_DIR}/void-relayers.prom"

RELAYER_CONFIG="${RELAYER_CONFIG:-config/void-relayers-dev.txt}"

# Ensure textfile dir exists
if [[ ! -d "$TEXTFILE_DIR" ]]; then
  echo "[relayer-exporter] TEXTFILE_DIR does not exist: $TEXTFILE_DIR" >&2
  exit 1
fi

mkdir -p "$TEXTFILE_DIR"

{
  echo "# HELP void_relayers_configured_total Number of relayers configured for metrics"
  echo "# TYPE void_relayers_configured_total gauge"

  if [[ ! -f "$RELAYER_CONFIG" ]]; then
    # No config yet: stub metric only
    echo "void_relayers_configured_total 0"
  else
    relayer_count=0

    # Emit header comments for future metrics
    echo
    echo "# HELP void_relayers_void_balance Relayer VOID balance (stub v1: 0)"
    echo "# TYPE void_relayers_void_balance gauge"
    echo "# HELP void_relayers_void_spent_gas_total Relayer cumulative VOID spent on gas (stub v1: 0)"
    echo "# TYPE void_relayers_void_spent_gas_total counter"
    echo "# HELP void_relayers_void_recovered_total Relayer cumulative VOID recovered via WC->VOID swaps (stub v1: 0)"
    echo "# TYPE void_relayers_void_recovered_total counter"
    echo "# HELP void_relayers_wc_collected_total Relayer cumulative WC collected as fees (stub v1: 0)"
    echo "# TYPE void_relayers_wc_collected_total counter"

    while read -r name addr; do
      # Skip empty lines and comments
      if [[ -z "${name:-}" ]]; then
        continue
      fi
      if [[ "${name}" == \#* ]]; then
        continue
      fi

      relayer_count=$((relayer_count + 1))

      # For v1 we don't actually hit chain; just emit zeros with labels.
      echo "void_relayers_void_balance{relayer=\"${name}\"} 0"
      echo "void_relayers_void_spent_gas_total{relayer=\"${name}\"} 0"
      echo "void_relayers_void_recovered_total{relayer=\"${name}\"} 0"
      echo "void_relayers_wc_collected_total{relayer=\"${name}\"} 0"
    done < "$RELAYER_CONFIG"

    echo
    echo "void_relayers_configured_total ${relayer_count}"
  fi
} > "$OUT_TMP"

mv "$OUT_TMP" "$OUT"

echo "[relayer-exporter] wrote metrics to $OUT (config: $RELAYER_CONFIG)"
