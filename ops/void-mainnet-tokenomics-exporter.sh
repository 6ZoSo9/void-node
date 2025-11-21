#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
cd "$REPO"

TOKEN_FILE="docs/VOID-MAINNET-TOKENOMICS.json"
CACHE_DIR="${HOME}/.cache/node-exporter-textfile"
CACHE_FILE="${CACHE_DIR}/void_mainnet_tokenomics.prom"
TEXTFILE_DIR="/var/lib/node_exporter/textfile_collector"
OUT_FILE="${TEXTFILE_DIR}/void_mainnet_tokenomics.prom"

mkdir -p "$CACHE_DIR"

configured=0
health=0
bytes=0
has_supply=0

if [[ -f "$TOKEN_FILE" ]]; then
  bytes=$(wc -c <"$TOKEN_FILE" 2>/dev/null || echo 0)
  if jq empty "$TOKEN_FILE" >/dev/null 2>&1; then
    configured=1
    # Optional: check for a ".supply.total" field if present
    if jq -e '.supply and .supply.total' "$TOKEN_FILE" >/dev/null 2>&1; then
      has_supply=1
    else
      has_supply=0
    fi
    # For now: if it parses, consider health=1
    health=1
  fi
fi

cat > "$CACHE_FILE" <<EOF
# HELP void_mainnet_tokenomics_configured 1 if mainnet tokenomics JSON is present and parseable
# TYPE void_mainnet_tokenomics_configured gauge
void_mainnet_tokenomics_configured{chain="mainnet"} $configured
# HELP void_mainnet_tokenomics_health 1 if mainnet tokenomics config is healthy
# TYPE void_mainnet_tokenomics_health gauge
void_mainnet_tokenomics_health{chain="mainnet"} $health
# HELP void_mainnet_tokenomics_bytes size of mainnet tokenomics JSON (bytes)
# TYPE void_mainnet_tokenomics_bytes gauge
void_mainnet_tokenomics_bytes{chain="mainnet"} $bytes
# HELP void_mainnet_tokenomics_has_supply 1 if .supply.total exists in tokenomics JSON
# TYPE void_mainnet_tokenomics_has_supply gauge
void_mainnet_tokenomics_has_supply{chain="mainnet"} $has_supply
EOF

echo "[tokenomics-exporter] wrote cache metrics -> $CACHE_FILE"

if [[ -d "$TEXTFILE_DIR" ]]; then
  echo "[tokenomics-exporter] installing to $OUT_FILE via sudo..."
  sudo cp "$CACHE_FILE" "$OUT_FILE"
  echo "[tokenomics-exporter] done."
else
  echo "[tokenomics-exporter] WARNING: $TEXTFILE_DIR not found; node exporter may not see metrics" >&2
fi
