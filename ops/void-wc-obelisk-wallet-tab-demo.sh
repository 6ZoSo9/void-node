#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

echo "=== [wc-obelisk-wallet-tab-demo] repo ==="
pwd

# Try to load demo key (for consistency), but the tab-model demo itself
# does not actually depend on the relayer or on-chain state yet.
if [ -z "${WC_RELAYER_DEMO_PK:-}" ]; then
  if [ -f /tmp/wc-relayer-demo-env.sh ]; then
    echo "=== [wc-obelisk-wallet-tab-demo] loading /tmp/wc-relayer-demo-env.sh ==="
    # shellcheck disable=SC1091
    source /tmp/wc-relayer-demo-env.sh
  fi
fi

echo "=== [wc-obelisk-wallet-tab-demo] WC_RELAYER_DEMO_PK length ==="
if [ -z "${WC_RELAYER_DEMO_PK:-}" ]; then
  echo " 0 (not required for pure tab-model demo)"
else
  echo " ${#WC_RELAYER_DEMO_PK}"
fi

echo
echo "=== [wc-obelisk-wallet-tab-demo] running tab-model demo ==="
npx --yes tsx src/obelisk_wallet_workcredits_tab_model_demo.ts
