#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

echo "=== [wc-obelisk-wallet-demo] repo ==="
pwd

# Ensure the demo key exists (try to auto-load if not already in env)
if [ -z "${WC_RELAYER_DEMO_PK:-}" ]; then
  if [ -f /tmp/wc-relayer-demo-env.sh ]; then
    echo "=== [wc-obelisk-wallet-demo] loading /tmp/wc-relayer-demo-env.sh ==="
    # shellcheck disable=SC1091
    source /tmp/wc-relayer-demo-env.sh
  fi
fi

echo "=== [wc-obelisk-wallet-demo] WC_RELAYER_DEMO_PK length ==="
if [ -z "${WC_RELAYER_DEMO_PK:-}" ]; then
  echo " 0"
  echo "[fatal] WC_RELAYER_DEMO_PK is not set; run /tmp/wc-relayer-demo-key.sh then 'source /tmp/wc-relayer-demo-env.sh'" >&2
  exit 1
else
  echo " ${#WC_RELAYER_DEMO_PK}"
fi

echo
echo "=== [wc-obelisk-wallet-demo] running wallet demo (balances + preview + send) ==="
npx --yes tsx src/obelisk_wallet_workcredits_wallet_demo.ts
