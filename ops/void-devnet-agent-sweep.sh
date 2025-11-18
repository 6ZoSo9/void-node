#!/usr/bin/env bash
set -euo pipefail

# Minimal, safe stub for devnet agent sweep.
# Goal: silence "missing sweep script" errors and integrate cleanly
# with coverage-heal, WITHOUT touching chain state yet.
#
# Later we can upgrade this to actually call agent-OS for jobs that
# have no receipts; for now, it is intentionally a no-op.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${REPO:-$(cd "$SCRIPT_DIR/.." && pwd)}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
SPOOL="${SPOOL:-$REPO/docs/VOID-DEVNET-JOB-SPOOL.txt}"

echo "[sweep] REPO=$REPO"
echo "[sweep] RPC_URL=$RPC_URL"
echo "[sweep] SPOOL=$SPOOL"

if [ ! -f "$SPOOL" ]; then
  echo "[sweep] no spool file found; nothing to sweep (noop)"
  exit 0
fi

# Count candidate job IDs (one per line, hex-64 format)
jobs_in_spool=$(grep -E '0x[0-9a-fA-F]{64}' "$SPOOL" | wc -l || true)
echo "[sweep] jobs_in_spool=$jobs_in_spool"

if [ "$jobs_in_spool" -eq 0 ]; then
  echo "[sweep] spool empty; nothing to sweep (noop)"
  exit 0
fi

echo "[sweep] NOTE: stub sweeper - not invoking agent-OS yet."
echo "[sweep]       Coverage healing is currently handled by your TS CLI/e2e path."
echo "[sweep]       This script exists so coverage-heal can run without ERRORs."

# In the future we can iterate here:
# - Loop over each jobId in "$SPOOL"
# - For jobs with missing receipts, call an agent-OS helper
#   to claim + write receipt + complete.
#
# For now, exit success so coverage-heal can re-check metrics.
exit 0
