#!/usr/bin/env bash
set -euo pipefail

REPO="$HOME/dev/void-node"
SRC="$REPO/ops/metrics/void_mainnet_bootstrap_phase.prom"
DST="/var/lib/node_exporter/textfile_collector/void_mainnet_bootstrap_phase.prom"

echo "=== [phase-textfile] regenerate phase.prom as user $USER ==="
sudo -u "$USER" -H bash -lc "cd \"$REPO\" && ./ops/void-mainnet-bootstrap-phase-exporter.sh"

if [[ ! -f "$SRC" ]]; then
  echo "[FATAL] missing $SRC after exporter run: $SRC" >&2
  exit 1
fi

echo "=== [phase-textfile] install to node_exporter textfile dir (root-owned, 0644) ==="
install -m 0644 "$SRC" "$DST"

echo "=== [phase-textfile] final file ==="
ls -l "$DST"
echo
cat "$DST"
echo
echo "=== [phase-textfile] DONE ==="
