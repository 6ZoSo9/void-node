#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"

echo "[txroot-hammer] base=$BASE"

n="$(curl -fsS "$BASE/blocks/latest/number2.json" | jq -r '.number')"
echo "[txroot-hammer] latest=$n"

hdr_root="$(curl -fsS "$BASE/blocks/$n/full2" \
  | jq -r 'if (.header.txRoot|type)=="object" then .header.txRoot.root // "" else .header.txRoot // "" end')"

dev_root="$(curl -fsS "$BASE/dev/txroot/$n" | jq -r '.root // ""')"

echo "[txroot-hammer] header.txRoot.root = $hdr_root"
echo "[txroot-hammer] dev.root          = $dev_root"

if [ -z "$hdr_root" ] || [ -z "$dev_root" ] || [ "$hdr_root" != "$dev_root" ]; then
  echo "[txroot-hammer] FAIL: txroot mismatch or null"
  exit 1
fi

txroot3="$(curl -fsS "$BASE/health/txroot3?format=prom" | awk '/^void_txroot_health /{print $2; exit}' || echo "0")"
echo "[txroot-hammer] void_txroot_health (txroot3) = $txroot3"

if [ "$txroot3" != "1" ]; then
  echo "[txroot-hammer] FAIL: txroot3 health != 1"
  exit 1
fi

echo "[txroot-hammer] OK: header.txRoot matches dev root and txroot3 health=1"
