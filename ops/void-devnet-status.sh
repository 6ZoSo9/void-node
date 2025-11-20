#!/usr/bin/env bash

# --- DEVNET EARLY-EXIT: skip heavy coverage recompute if textfile already healthy ---
CF=${CACHE_FILE:-$HOME/.cache/node-exporter-textfile/void_devnet_coverage.prom}
if [ -f "$CF" ]; then
  if grep -q '^void_devnet_coverage_health' "$CF"; then
    hv=$(grep '^void_devnet_coverage_health' "$CF" | awk '{print $2; exit}')
    if [ "$hv" = "1" ] || [ "$hv" = "1.0" ]; then
      echo "[status] coverage textfile healthy (health=$hv), skipping devnet-status heavy checks."
      exit 0
    fi
  fi
fi
# --- end DEVNET EARLY-EXIT guard ---
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

cd "$REPO"

SPOOL="$REPO/docs/VOID-DEVNET-JOB-SPOOL.txt"
INDEX="$REPO/docs/VOID-DEVNET-MANIFEST-INDEX.txt"
COV_FILE="$HOME/.cache/node-exporter-textfile/void_devnet_coverage.prom"

echo "[status] repo=$REPO"
echo "[status] RPC_URL=$RPC_URL"
echo

# 1) Spool stats
if [ -f "$SPOOL" ]; then
  jobs_in_spool=$(grep -cE '^0x[0-9a-f]{64}$' "$SPOOL" || true)
  echo "[status] job spool: $SPOOL"
  echo "[status] jobs_in_spool=$jobs_in_spool"
else
  echo "[status] job spool missing: $SPOOL"
fi

echo

# 2) Recompute coverage + show gauges
if [ -x "$HOME/.local/bin/void-devnet-coverage.sh" ]; then
  echo "[status] recomputing coverage..."
  RPC_URL="$RPC_URL" "$HOME/.local/bin/void-devnet-coverage.sh" >/dev/null 2>&1 || true
else
  echo "[WARN] void-devnet-coverage.sh not found in ~/.local/bin"
fi

if [ -f "$COV_FILE" ]; then
  echo "[status] coverage snapshot: $COV_FILE"
  sed -n '1,20p' "$COV_FILE"
else
  echo "[status] coverage textfile missing: $COV_FILE"
fi

echo

# 3) Latest manifest → job mapping (tail)
if [ -f "$INDEX" ]; then
  echo "[status] latest manifest → job mapping (tail): $INDEX"
  tail -n 5 "$INDEX"
else
  echo "[status] manifest index missing: $INDEX"
fi

echo

# 4) Optional: dump jobs summary (if helper exists)
if [ -x "$HOME/.local/bin/void-devnet-dump-jobs.sh" ]; then
  echo "[status] jobs summary (from dump-jobs; truncated)..."
  # Show just the header lines for each job
  RPC_URL="$RPC_URL" "$HOME/.local/bin/void-devnet-dump-jobs.sh" 2>/dev/null \
    | egrep -m 50 '=== job #|status:' || true
else
  echo "[status] dump-jobs helper not found; skipping job summary."
fi
