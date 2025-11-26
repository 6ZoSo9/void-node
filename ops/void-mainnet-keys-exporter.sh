#!/usr/bin/env bash
set -euo pipefail

ROOT="\$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "\$ROOT"

TEXTFILE_DIR_DEFAULT="/var/lib/node_exporter/textfile"
TEXTFILE_DIR="\${TEXTFILE_DIR:-\$TEXTFILE_DIR_DEFAULT}"
OUT_FILE="\$TEXTFILE_DIR/void_mainnet_keys_health.prom"

mkdir -p "\$TEXTFILE_DIR"

TMP_LOG="\$(mktemp /tmp/void-mainnet-keys-health-all.XXXXXX.log)"
RC=0

echo "[mainnet-keys-exporter] running keys health-all..." | tee "\$TMP_LOG"
if ./ops/void-mainnet-keys-health-all.sh >>"\$TMP_LOG" 2>&1; then
  echo "[mainnet-keys-exporter] keys health-all OK" | tee -a "\$TMP_LOG"
  RC=0
else
  RC=\$?
  echo "[mainnet-keys-exporter] keys health-all FAILED with code \$RC" | tee -a "\$TMP_LOG"
fi

VALUE=0
if [[ "\$RC" -eq 0 ]]; then
  VALUE=1
fi

mkdir -p "\$TEXTFILE_DIR"

cat >"\$OUT_FILE" <<EOF
# HELP void_mainnet_keys_health Mainnet keys & treasury plan health (1=OK, 0=bad)
# TYPE void_mainnet_keys_health gauge
void_mainnet_keys_health \$VALUE
EOF

echo "[mainnet-keys-exporter] wrote \$OUT_FILE with value=\$VALUE"
echo "[mainnet-keys-exporter] log: \$TMP_LOG"

exit 0
