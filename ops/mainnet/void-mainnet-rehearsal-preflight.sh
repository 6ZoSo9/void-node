#!/usr/bin/env bash
set -euo pipefail

MAP="ops/mainnet/void-mainnet-roles-mapping.rehearsal.txt"
JSON="config/void-mainnet-bootstrap-mainnet.rehearsal.json"

ops/mainnet/void-mainnet-rehearsal-fill.sh "$MAP" "$JSON"
ops/mainnet/void-mainnet-config-lint.sh "$JSON"

forge build >/tmp/void-mainnet-rehearsal.build.log 2>&1
forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
  --chain-id 2050 \
  --sig "plan(string)" \
  "$JSON" \
  -vvv >/tmp/void-mainnet-rehearsal.plan.log 2>&1

set +e
forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
  --chain-id 2050 \
  --sig "run(string)" \
  "$JSON" \
  -vvv >/tmp/void-mainnet-rehearsal.run.log 2>&1
RC=$?
set -e

rg -n "RUN_STUB_ONLY" /tmp/void-mainnet-rehearsal.run.log >/dev/null

echo "[ok] rehearsal preflight PASS rc=$RC"
echo "[ok] map  = $MAP"
echo "[ok] json = $JSON"
