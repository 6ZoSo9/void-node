#!/usr/bin/env bash
set -euo pipefail

TFD=/var/lib/node_exporter/textfile_collector
OUT="$TFD/void_portguard.prom"
TMP="${OUT}.tmp.$$"

# Try to write; if it fails, log and exit success (don’t flap the unit)
if ! printf "" >"$TMP" 2>/dev/null; then
  echo "[port-guard] cannot write temp in $TFD (id: $(id -u):$(id -g))" >&2
  exit 0
fi

if ss -ltnH | grep -q ":4102 "; then
  echo "void_portguard_violation 1" >"$TMP"
else
  echo "void_portguard_violation 0" >"$TMP"
fi

# Atomic publish; if this fails, log but exit 0
if ! mv -f "$TMP" "$OUT" 2>/dev/null; then
  echo "[port-guard] cannot move $TMP to $OUT" >&2
  rm -f "$TMP"
fi
exit 0
