#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEXT_DIR="/var/lib/node_exporter/textfile_collector"
OUT="$TEXT_DIR/void-mainnet-keys.prom"

echo "=== [keys-exporter] VOID mainnet keys/roles exporter ==="
echo "[keys-exporter] ROOT     = $ROOT"
echo "[keys-exporter] TEXT_DIR = $TEXT_DIR"
echo "[keys-exporter] OUT      = $OUT"

if [ ! -d "$TEXT_DIR" ]; then
  echo "[keys-exporter][FATAL] TEXT_DIR does not exist: $TEXT_DIR" >&2
  exit 1
fi

# Run keys-health probe to decide value
VAL=0
echo "[keys-exporter] running keys-health probe..."
if "$ROOT/ops/void-mainnet-keys-health.sh"; then
  VAL=1
  echo "[keys-exporter] keys-health OK (VAL=$VAL)"
else
  VAL=0
  echo "[keys-exporter] keys-health FAILED (VAL=$VAL)"
fi

# Write the metric file to a temp, then atomically move into place.
# IMPORTANT: must be world-readable so node_exporter can read it.
tmp="${OUT}.tmp.$$"
cat > "$tmp" <<EOF
# HELP void_mainnet_keys_roles_ok VOID mainnet keys/roles consistency (1 ok, 0 bad)
# TYPE void_mainnet_keys_roles_ok gauge
void_mainnet_keys_roles_ok $VAL
EOF

mv "$tmp" "$OUT"
chmod 644 "$OUT"
chown root:root "$OUT" 2>/dev/null || true

echo "[keys-exporter] wrote metric file:"
ls -l "$OUT" || true
echo
head -5 "$OUT" || true

echo "[keys-exporter] done."
