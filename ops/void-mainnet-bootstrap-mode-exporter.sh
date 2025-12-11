#!/usr/bin/env bash
set -euo pipefail

# Determine repo root even when run under sudo
if [ -n "${SUDO_USER:-}" ]; then
  USER_HOME="$(getent passwd "$SUDO_USER" | cut -d: -f6 || echo "/home/$SUDO_USER")"
else
  USER_HOME="${HOME:-/home/zoso}"
fi

ROOT="${ROOT:-$USER_HOME/dev/void-node}"
CFG="$ROOT/config/void-mainnet-bootstrap-mainnet.live.json"
OUT="/var/lib/node_exporter/textfile_collector/void_mainnet_bootstrap_mode.prom"

if ! command -v jq >/dev/null 2>&1; then
  echo "[FATAL] jq is required" >&2
  exit 1
fi

if [ ! -f "$CFG" ]; then
  echo "[FATAL] config not found: $CFG" >&2
  exit 1
fi

mode="$(jq -r '.bootstrapMode // "unknown"' "$CFG")"

tmp="$(mktemp)"
{
  echo "# HELP void_mainnet_bootstrap_mode_info Current mainnet bootstrap mode as per live JSON"
  echo "# TYPE void_mainnet_bootstrap_mode_info gauge"
  echo "void_mainnet_bootstrap_mode_info{mode=\"$mode\"} 1"
} > "$tmp"

mv "$tmp" "$OUT"
chmod 600 "$OUT"
