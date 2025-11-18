#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
cd "$REPO"

SNAP_DIR="docs/VOID-DEVNET-SNAPSHOTS"
mkdir -p "$SNAP_DIR"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$SNAP_DIR/VOID-DEVNET-SNAPSHOT-$TS"
mkdir -p "$OUT"

echo "[snap] repo=$REPO"
echo "[snap] out=$OUT"

# 1) Run status to refresh coverage + capture a human-readable summary
if [ -x "./ops/void-devnet-status.sh" ]; then
  echo "[snap] running void-devnet-status.sh..."
  ./ops/void-devnet-status.sh >"$OUT/status.txt" 2>&1 || echo "[WARN] status script failed, see status.txt"
else
  echo "[WARN] ops/void-devnet-status.sh missing or not executable" >"$OUT/status.txt"
fi

# 2) Copy key state files
for f in \
  "docs/VOID-DEVNET-PROTOCOL-STATE.json" \
  "docs/VOID-DEVNET-MANIFEST-INDEX.txt" \
  "docs/VOID-DEVNET-JOB-SPOOL.txt"
do
  if [ -f "$f" ]; then
    echo "[snap] copying $f"
    cp -a "$f" "$OUT/"
  else
    echo "[WARN] missing $f" >>"$OUT/status.txt"
  fi
done

# 3) Copy manifests (if present)
if [ -d "docs/VOID-DEVNET-MANIFESTS" ]; then
  echo "[snap] copying manifests dir"
  mkdir -p "$OUT/VOID-DEVNET-MANIFESTS"
  cp -a docs/VOID-DEVNET-MANIFESTS/* "$OUT/VOID-DEVNET-MANIFESTS/" 2>/dev/null || true
fi

# 4) Copy coverage textfile (dev cache)
COVERAGE="$HOME/.cache/node-exporter-textfile/void_devnet_coverage.prom"
if [ -f "$COVERAGE" ]; then
  echo "[snap] copying coverage cache"
  mkdir -p "$OUT/cache"
  cp -a "$COVERAGE" "$OUT/cache/void_devnet_coverage.prom"
else
  echo "[WARN] coverage cache not found at $COVERAGE" >>"$OUT/status.txt"
fi

echo "[snap] done. snapshot at: $OUT"
