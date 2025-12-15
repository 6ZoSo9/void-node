#!/usr/bin/env bash
set -euo pipefail

EXPECTED="${EXPECTED:-0}"
TEXTFILE="${TEXTFILE:-/var/lib/node_exporter/textfile_collector/void_agent_receipts_expected.prom}"

sudo mkdir -p "$(dirname "$TEXTFILE")"
sudo tee "$TEXTFILE" >/dev/null <<EOF
# HELP void_agent_receipts_expected Set to 1 when agent receipts are expected to advance; 0 disables the stall alert.
# TYPE void_agent_receipts_expected gauge
void_agent_receipts_expected ${EXPECTED}
EOF
sudo chown root:root "$TEXTFILE"
sudo chmod 0644 "$TEXTFILE"

echo "[ok] wrote $TEXTFILE (EXPECTED=${EXPECTED})"
