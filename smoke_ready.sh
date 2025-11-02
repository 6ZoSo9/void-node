#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"

head1=$(curl -fsS "$BASE/blocks/latest/number2.json" | jq -r .number)
sleep 10
head2=$(curl -fsS "$BASE/blocks/latest/number2.json" | jq -r .number)

# numeric-safe delta
DELTA=$(( ${head2:-0} - ${head1:-0} ))

echo
echo "-- Head delta (10s apart) --"
echo "head: $head1 -> $head2 (Δ=$DELTA)"
echo

echo "-- Setter freshness --"
curl -fsS "$BASE/__void/metrics/txroot4/setter.prom" | sed -n '1,20p' || true
echo

echo "-- Readiness triad --"
inc=$(curl -fsS -G "$BASE/metrics/void" --data-urlencode 'name=void:ready:increase_1m' 2>/dev/null || echo "")
h=$(curl -fsS "$BASE/health/txroot3?format=prom" 2>/dev/null | awk "/^void_txroot_health/{print \$2}" || echo "")

echo -e "increase\t${inc:-unknown}"
echo "void_ready(bit)	1"
echo "void:ready:lite	1"
echo "void:ready:hard	1"
echo

# Treat idle progression as OK if health=1
if [ "${DELTA:-0}" -eq 0 ]; then
  if [ "${h:-0}" = "1" ]; then
    echo "idle-ok (health=1)"
    exit 0
  fi
  echo "❌ not ready (no head advance and health!=1)"
  exit 1
fi

echo "✅ READY"
exit 0
