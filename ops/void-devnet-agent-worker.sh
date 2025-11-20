#!/usr/bin/env bash
set -euo pipefail

REPO=${REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}
cd "$REPO"

export RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
export STATE_FILE="${STATE_FILE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"
export JOB_SPOOL_FILE="${JOB_SPOOL_FILE:-docs/VOID-DEVNET-JOB-SPOOL.txt}"

echo "[worker] repo=$REPO"
echo "[worker] RPC_URL=$RPC_URL"
echo "[worker] STATE_FILE=$STATE_FILE"
echo "[worker] JOB_SPOOL_FILE=$JOB_SPOOL_FILE"

# Run the TypeScript worker (read-only for now).
npx --yes tsx src/ai/devnet-agent-worker.ts
