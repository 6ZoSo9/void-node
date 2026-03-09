#!/usr/bin/env bash
set -euo pipefail

LIVE="${1:-config/void-mainnet-bootstrap-mainnet.live.json}"
MAP="${2:-ops/mainnet/void-mainnet-roles-mapping.template.txt}"

echo "=== repo ==="
pwd
git branch --show-current || true
git log --oneline -n 8 || true

echo
echo "=== files ==="
for f in \
  foundry.toml \
  script/VoidMainnetBootstrapMainnet.s.sol \
  ops/mainnet/void-mainnet-config-lint.sh \
  ops/mainnet/void-mainnet-live-from-roles.sh \
  ops/mainnet/void-mainnet-preflight.sh \
  ops/mainnet/void-mainnet-offline-fill.sh \
  docs/mainnet/VOID_MAINNET_KEY_CEREMONY_WORKSHEET.md \
  docs/mainnet/VOID_MAINNET_OFFLINE_FILL_FLOW.md \
  "$MAP"
do
  [ -f "$f" ] && echo "[ok] $f" || echo "[MISS] $f"
done

echo
echo "=== live json ==="
if [ -f "$LIVE" ]; then
  jq -r "
    \"chainId=\" + (.chainId|tostring),
    \"roles_keys=\" + ((.roles|keys|join(\",\"))),
    \"contracts_keys=\" + ((.contracts|keys|join(\",\"))),
    \"validator0_keys=\" + ((.validator0|keys|join(\",\")))
  " "$LIVE"
else
  echo "[warn] missing $LIVE"
fi

echo
echo "=== placeholder lint ==="
if [ -f "$LIVE" ]; then
  set +e
  ops/mainnet/void-mainnet-config-lint.sh "$LIVE"
  RC=$?
  set -e
  echo "[lint rc]=$RC"
else
  echo "[skip] no live json yet"
fi

echo
echo "=== plan/run status ==="
if [ -f "$LIVE" ]; then
  set +e
  ops/mainnet/void-mainnet-config-lint.sh "$LIVE" >/tmp/void-mainnet-status.lint.log 2>&1
  LRC=$?
  set -e

  if [ "$LRC" -ne 0 ]; then
    echo "[status] PLACEHOLDER_CONFIG (lint rc=$LRC)"
    tail -n 40 /tmp/void-mainnet-status.lint.log || true
  else
    echo "[status] FILLED_CONFIG"

    echo
    echo "--- plan(string) ---"
    set +e
    forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
      --chain-id 2050 \
      --sig "plan(string)" \
      "$LIVE" \
      -vvv >/tmp/void-mainnet-status.plan.log 2>&1
    PRC=$?
    set -e
    echo "[plan rc]=$PRC"
    tail -n 40 /tmp/void-mainnet-status.plan.log || true

    echo
    echo "--- run(string) ---"
    set +e
    forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
      --chain-id 2050 \
      --sig "run(string)" \
      "$LIVE" \
      -vvv >/tmp/void-mainnet-status.run.log 2>&1
    RRC=$?
    set -e
    if rg -n "RUN_STUB_ONLY" /tmp/void-mainnet-status.run.log >/dev/null 2>&1; then
      echo "[ok] run(string) still guarded by RUN_STUB_ONLY (rc=$RRC)"
    else
      echo "[warn] run(string) did not show RUN_STUB_ONLY (rc=$RRC)"
      tail -n 80 /tmp/void-mainnet-status.run.log || true
    fi
  fi
else
  echo "[skip] no live json yet"
fi

echo
echo "=== done ==="
