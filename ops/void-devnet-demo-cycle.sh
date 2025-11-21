#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "[demo-cycle] repo=$REPO"
echo "[demo-cycle] RPC_URL=$RPC_URL"

cd "$REPO"

DESC="demo: hello from VOID devnet ($(date -Is))"
APP_ID="demo-cli"

echo "[demo-cycle] posting demo job..."
RPC_URL="$RPC_URL" ./ops/void-devnet-demo-job-add.sh "$DESC" "$APP_ID"

echo
echo "[demo-cycle] running demo agent once..."
RPC_URL="$RPC_URL" ./ops/void-devnet-demo-agent-run.sh

echo
echo "[demo-cycle] running devnet CI smoke..."
RPC_URL="$RPC_URL" ./ops/void-devnet-ci-smoke.sh

echo
echo "[demo-cycle] DONE (demo job + agent + CI smoke)"
