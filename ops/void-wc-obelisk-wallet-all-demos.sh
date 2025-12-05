#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

echo "=== [wc-obelisk-wallet-all-demos] repo ==="
pwd

# Try to ensure demo key is loaded, but don't fail if missing for pure dev stubs.
if [ -z "${WC_RELAYER_DEMO_PK:-}" ]; then
  if [ -f /tmp/wc-relayer-demo-env.sh ]; then
    echo "=== [wc-obelisk-wallet-all-demos] loading /tmp/wc-relayer-demo-env.sh ==="
    # shellcheck disable=SC1091
    source /tmp/wc-relayer-demo-env.sh
  else
    echo "=== [wc-obelisk-wallet-all-demos] WARN: no WC_RELAYER_DEMO_PK and no /tmp/wc-relayer-demo-env.sh; some demos may fail ==="
  fi
fi

echo "=== [wc-obelisk-wallet-all-demos] WC_RELAYER_DEMO_PK length ==="
if [ -z "${WC_RELAYER_DEMO_PK:-}" ]; then
  echo " 0"
else
  echo " ${#WC_RELAYER_DEMO_PK}"
fi

echo
echo "=== [1/6] wc-relayer client smoke ==="
if [ -x ops/void-wc-relayer-client-smoke.sh ]; then
  ops/void-wc-relayer-client-smoke.sh || echo "[all-demos] client-smoke FAILED"
else
  echo "[all-demos] SKIP: ops/void-wc-relayer-client-smoke.sh not found or not executable"
fi

echo
echo "=== [2/6] wc-relayer wallet API smoke ==="
if [ -x ops/void-wc-relayer-wallet-api-smoke.sh ]; then
  ops/void-wc-relayer-wallet-api-smoke.sh || echo "[all-demos] wallet-api-smoke FAILED"
else
  echo "[all-demos] SKIP: ops/void-wc-relayer-wallet-api-smoke.sh not found or not executable"
fi

echo
echo "=== [3/6] obelisk wallet WC wallet demo ==="
if [ -x ops/void-wc-obelisk-wallet-demo.sh ]; then
  ops/void-wc-obelisk-wallet-demo.sh || echo "[all-demos] wallet-demo FAILED"
else
  echo "[all-demos] SKIP: ops/void-wc-obelisk-wallet-demo.sh not found or not executable"
fi

echo
echo "=== [4/6] obelisk wallet WC actions demo ==="
if [ -x ops/void-wc-obelisk-wallet-actions-demo.sh ]; then
  ops/void-wc-obelisk-wallet-actions-demo.sh || echo "[all-demos] wallet-actions-demo FAILED"
else
  echo "[all-demos] SKIP: ops/void-wc-obelisk-wallet-actions-demo.sh not found or not executable"
fi

echo
echo "=== [5/6] obelisk wallet WC wallet tab dev model demo ==="
if [ -x ops/void-wc-obelisk-wallet-tab-demo.sh ]; then
  ops/void-wc-obelisk-wallet-tab-demo.sh || echo "[all-demos] wallet-tab-demo FAILED"
else
  echo "[all-demos] SKIP: ops/void-wc-obelisk-wallet-tab-demo.sh not found or not executable"
fi

echo
echo "=== [6/6] obelisk wallet WC trading tab dev model demo ==="
if [ -x ops/void-wc-obelisk-wallet-trading-tab-demo.sh ]; then
  ops/void-wc-obelisk-wallet-trading-tab-demo.sh || echo "[all-demos] trading-tab-demo FAILED"
else
  echo "[all-demos] SKIP: ops/void-wc-obelisk-wallet-trading-tab-demo.sh not found or not executable"
fi

echo
echo "=== [wc-obelisk-wallet-all-demos] DONE ==="
