#!/usr/bin/env bash
set -euo pipefail

CFG="${1:-config/void-mainnet-bootstrap-mainnet.template.json}"
[ -f "$CFG" ] || { echo "[FAIL] missing config: $CFG"; exit 1; }

jq . "$CFG" >/dev/null

echo "=== scanning $CFG ==="
if rg -n 'TBD'"|0x0000000000000000000000000000000000000000|0x0000000000000000000000000000000000000000000000000000000000000000" "$CFG"; then
  echo
  echo "[FAIL] placeholders remain"
  exit 2
fi

echo "[ok] no placeholders found"
