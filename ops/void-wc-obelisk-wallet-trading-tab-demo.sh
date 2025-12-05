#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

echo "=== [wc-obelisk-wallet-trading-tab-demo] repo ==="
pwd

# Trading tab dev model is pure stub; demo key is not required,
# but we try to load it for consistency with other WC demos.
if [ -z "${WC_RELAYER_DEMO_PK:-}" ]; then
  if [ -f /tmp/wc-relayer-demo-env.sh ]; then
    echo "=== [wc-obelisk-wallet-trading-tab-demo] loading /tmp/wc-relayer-demo-env.sh ==="
    # shellcheck disable=SC1091
    source /tmp/wc-relayer-demo-env.sh
  fi
fi

echo "=== [wc-obelisk-wallet-trading-tab-demo] WC_RELAYER_DEMO_PK length ==="
if [ -z "${WC_RELAYER_DEMO_PK:-}" ]; then
  echo " 0 (not required for trading-tab dev stub)"
else
  echo " ${#WC_RELAYER_DEMO_PK}"
fi

echo
echo "=== [wc-obelisk-wallet-trading-tab-demo] running trading-tab demo ==="
npx --yes tsx src/obelisk_wallet_workcredits_trading_tab_model_demo.ts
