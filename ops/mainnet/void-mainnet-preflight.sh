#!/usr/bin/env bash
set -euo pipefail

MAP="${1:-ops/mainnet/void-mainnet-roles-mapping.template.txt}"
LIVE="${2:-config/void-mainnet-bootstrap-mainnet.live.json}"

echo "=== [1] generate live json from mapping ==="
ops/mainnet/void-mainnet-live-from-roles.sh "$MAP" "$LIVE"

echo
echo "=== [2] lint live json for placeholders ==="
if ! ops/mainnet/void-mainnet-config-lint.sh "$LIVE"; then
  echo "[FAIL] live json still contains placeholders"
  exit 2
fi

echo
echo "=== [3] forge build ==="
forge build >/tmp/void-mainnet-preflight.build.log 2>&1
echo "[ok] build passed"

echo
echo "=== [4] plan(string) must succeed ==="
forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
  --chain-id 2050 \
  --sig "plan(string)" \
  "$LIVE" \
  -vvv >/tmp/void-mainnet-preflight.plan.log 2>&1
echo "[ok] plan(string) passed"

echo
echo "=== [5] run(string) must revert RUN_STUB_ONLY ==="
set +e
forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
  --chain-id 2050 \
  --sig "run(string)" \
  "$LIVE" \
  -vvv >/tmp/void-mainnet-preflight.run.log 2>&1
RC=$?
set -e

if ! rg -n "RUN_STUB_ONLY" /tmp/void-mainnet-preflight.run.log >/dev/null 2>&1; then
  echo "[FAIL] run(string) did not hit RUN_STUB_ONLY"
  echo "--- run log tail ---"
  tail -n 80 /tmp/void-mainnet-preflight.run.log || true
  exit 3
fi

echo "[ok] run(string) hit RUN_STUB_ONLY as expected (rc=$RC)"

echo
echo "=== [6] summary ==="
echo "[ok] map  = $MAP"
echo "[ok] live = $LIVE"
echo "[ok] logs:"
echo "  build -> /tmp/void-mainnet-preflight.build.log"
echo "  plan  -> /tmp/void-mainnet-preflight.plan.log"
echo "  run   -> /tmp/void-mainnet-preflight.run.log"
echo "PASS"
