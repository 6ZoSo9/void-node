#!/usr/bin/env bash
set -euo pipefail

TS="$(date +%Y%m%d-%H%M%S)"
OUT="/tmp/void-install-datanet-no-badtotal-wrap.$TS.out.txt"
exec > >(tee -a "$OUT") 2>&1
echo "[saved] $OUT"
echo

BIN="/usr/local/bin"
REAL="$BIN/void-datanet-receipts-export-once.real"
WRAP="$BIN/void-datanet-receipts-export-once"

SVC="void-datanet-receipts-textfile.service"
TMR="void-datanet-receipts-textfile.timer"

echo "=== [0] require sudo ==="
sudo -n true 2>/dev/null || { echo "[ERR] need sudo"; exit 1; }

echo
echo "=== [1] backup current exporter+units (best effort) ==="
BK="/root/void-datanet-receipts-wrap-OK.$TS.tgz"
sudo tar -C / -czf "$BK" \
  "usr/local/bin/void-datanet-receipts-export-once" \
  "usr/local/bin/void-datanet-receipts-export-once.real" \
  "etc/systemd/system/$SVC" \
  "etc/systemd/system/$TMR" 2>/dev/null || true
echo "[ok] backup $BK"

echo
echo "=== [2] ensure wrapper exists ==="
if sudo test -f "$REAL"; then
  echo "[ok] real exporter already at $REAL"
else
  if sudo test -f "$WRAP"; then
    echo "[patch] move current exporter -> .real"
    sudo mv -f "$WRAP" "$REAL"
  else
    echo "[ERR] missing $WRAP and $REAL"; exit 1
  fi
fi

if sudo rg -q "__VOID_NO_BAD_TOTAL_WRAP_V1__" "$WRAP" 2>/dev/null; then
  echo "[ok] wrapper marker already present"
else
  echo "[write] wrapper $WRAP"
  sudo tee "$WRAP" >/dev/null <<'WRAP'
#!/usr/bin/env bash
set -euo pipefail
# __VOID_NO_BAD_TOTAL_WRAP_V1__
# Purpose: run the real exporter but strip forbidden metric lines before writing textfile output.
REAL="/usr/local/bin/void-datanet-receipts-export-once.real"
exec "$REAL" "$@" 2>&1 \
  | rg -v "^(#\\s*HELP\\s+void_datanet_receipts_bad_total\\b|#\\s*TYPE\\s+void_datanet_receipts_bad_total\\b|void_datanet_receipts_bad_total\\b)" \
  || true
WRAP
  sudo chmod +x "$WRAP"
fi

echo
echo "=== [3] restart timer (if present) ==="
if systemctl list-unit-files | rg -q "^${TMR}\\b"; then
  sudo systemctl daemon-reload || true
  sudo systemctl restart "$TMR" || true
  echo "[ok] restarted $TMR"
else
  echo "[note] timer not installed: $TMR (ok)"
fi

echo
echo "=== [4] run once + prove node_exporter clean ==="
sudo systemctl start "$SVC" 2>/dev/null || true
sleep 1
timeout 2s curl -fsS http://127.0.0.1:9100/metrics | rg -n "^void_datanet_receipts_bad_total\\b" && { echo "[ERR] still present"; exit 1; } || echo "[ok] gone"
