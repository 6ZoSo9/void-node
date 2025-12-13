#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
CFG="${CFG:-config/void-workcredits-mainnet-plan.live.json}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

cd "$ROOT"

echo "=== [workcredits mainnet PLAN smoke] ROOT=$ROOT ==="
echo "[info] CONFIG_PATH=$CFG"
echo "[info] RPC_URL=$RPC_URL"
echo

set +e
OUT="$(
  forge script script/VoidWorkCreditsMainnetPlan.s.sol:VoidWorkCreditsMainnetPlan \
    --rpc-url "$RPC_URL" \
    --sig "run(string)" "$CFG" 2>&1
)"
RC=$?
set -e

echo "$OUT"

echo
if echo "$OUT" | grep -q 'RUN_STUB_ONLY'; then
  echo "=== [summary] OK: stub-only run hit RUN_STUB_ONLY as expected (no deploys) ==="
else
  echo "=== [summary] WARNING: did not see RUN_STUB_ONLY in output; investigate ==="
  echo "RC=$RC"
fi
