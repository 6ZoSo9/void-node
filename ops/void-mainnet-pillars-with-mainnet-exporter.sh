#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
TEXTFILE_DIR="${NODE_EXPORTER_TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
METRIC_FILE="$TEXTFILE_DIR/void_mainnet_pillars_with_mainnet.prom"

echo "=== [mainnet-pillars-with-mainnet-exporter] VOID mainnet pillars+keys+MAINNET bootstrap exporter ==="
echo "[cfg] REPO_ROOT    = $REPO_ROOT"
echo "[cfg] PROM_URL     = $PROM_URL"
echo "[cfg] TEXTFILE_DIR = $TEXTFILE_DIR"
echo "[cfg] METRIC_FILE  = $METRIC_FILE"

mkdir -p "$TEXTFILE_DIR"

raw_json="$(curl -fsS "$PROM_URL/api/v1/query?query=void:mainnet_pillars:health_with_mainnet:last_5m")"
value="$(printf '%s\n' "$raw_json" | jq -r '.data.result[0].value[1] // "0"')"

echo
echo "[info] void:mainnet_pillars:health_with_mainnet:last_5m = $value"

cat > "$METRIC_FILE" <<EOF
# HELP void_mainnet_pillars_with_mainnet_health VOID mainnet pillars+keys+MAINNET bootstrap health (1 ok, 0 bad)
# TYPE void_mainnet_pillars_with_mainnet_health gauge
void_mainnet_pillars_with_mainnet_health $value
EOF

# Fix perms so node_exporter (non-root) can read it
chown root:root "$METRIC_FILE" 2>/dev/null || true
chmod 644 "$METRIC_FILE" 2>/dev/null || true

echo "[ok] wrote metric file: $METRIC_FILE"
echo "[ok] value = $value"
echo "=== [mainnet-pillars-with-mainnet-exporter] DONE ==="
