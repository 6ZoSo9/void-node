#!/usr/bin/env bash
set -euo pipefail

echo "=== [keys-exporter] VOID mainnet keys/roles exporter ==="

ROOT="$(git rev-parse --show-toplevel)"
TEXT_DIR="${TEXT_DIR:-/var/lib/node_exporter/textfile_collector}"
OUT="$TEXT_DIR/void-mainnet-keys.prom"

echo "[keys-exporter] ROOT     = $ROOT"
echo "[keys-exporter] TEXT_DIR = $TEXT_DIR"
echo "[keys-exporter] OUT      = $OUT"
echo

# Ensure textfile dir exists (safe even if it already exists)
if [[ ! -d "$TEXT_DIR" ]]; then
  echo "[keys-exporter] creating textfile collector dir: $TEXT_DIR"
  mkdir -p "$TEXT_DIR"
fi

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

echo "[keys-exporter] running keys-health probe..."
set +e
"$ROOT/ops/void-mainnet-keys-health.sh" >"$TMP"
RC=$?
set -e

if [[ $RC -ne 0 ]]; then
  echo "[ERROR] keys-health failed (rc=$RC); not writing metric file."
  cat "$TMP" || true
  exit 1
fi

GAUGE_LINE="$(grep 'void_mainnet_keys_roles_ok' "$TMP" | tail -n1 || true)"

if [[ -z "$GAUGE_LINE" ]]; then
  echo "[ERROR] did not find void_mainnet_keys_roles_ok line in keys-health output"
  cat "$TMP" || true
  exit 1
fi

TMP_OUT="${OUT}.tmp.$$"

{
  echo "# HELP void_mainnet_keys_roles_ok VOID mainnet keys/roles consistency (1 ok, 0 bad)"
  echo "# TYPE void_mainnet_keys_roles_ok gauge"
  echo "$GAUGE_LINE"
} >"$TMP_OUT"

mv "$TMP_OUT" "$OUT"

echo
echo "[keys-exporter] wrote $OUT with:"
cat "$OUT"
echo
echo "[keys-exporter] DONE."
