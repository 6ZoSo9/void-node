#!/usr/bin/env bash
set -euo pipefail

HOME_TEXT="$HOME/.cache/node-exporter-textfile/void_mainnet_ai_pillar.prom"
ROOT_TEXT_AI="/var/lib/node_exporter/textfile_collector/void_mainnet_ai_pillar.prom"
ROOT_TEXT_COMPOSITE="/var/lib/node_exporter/textfile_collector/void_mainnet_pillars_with_keys_ai.prom"

echo "=== [ai-pillars-refresh] step 1: run AI pillar exporter ==="
./ops/void-mainnet-ai-pillar-exporter.sh

echo
echo "=== [ai-pillars-refresh] step 2: sync AI pillar .prom into node_exporter textfile dir ==="
if [ -f "$HOME_TEXT" ]; then
  echo "[sync] found $HOME_TEXT, copying to $ROOT_TEXT_AI"
  sudo mkdir -p "$(dirname "$ROOT_TEXT_AI")"
  sudo cp "$HOME_TEXT" "$ROOT_TEXT_AI"
else
  echo "[sync][WARN] $HOME_TEXT missing; cannot sync"
fi

echo
echo "=== [ai-pillars-refresh] step 3: recompute pillars+keys+AI composite ==="
./ops/void-mainnet-pillars-keys-ai-exporter.sh

echo
echo "=== [ai-pillars-refresh] step 4: normalize permissions on .prom files ==="
for f in "$ROOT_TEXT_AI" "$ROOT_TEXT_COMPOSITE"; do
  if [ -f "$f" ]; then
    echo "[chmod] setting 644 on $f"
    sudo chmod 644 "$f"
  else
    echo "[chmod][WARN] missing $f (skipping)"
  fi
done

echo
echo "=== [ai-pillars-refresh] final files ==="
sudo ls -l \
  "$ROOT_TEXT_AI" \
  "$ROOT_TEXT_COMPOSITE" \
  2>/dev/null || true

echo
echo "=== [ai-pillars-refresh] done ==="
