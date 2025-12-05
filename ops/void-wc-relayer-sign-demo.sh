#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

if [ ! -f /tmp/wc-relayer-demo-env.sh ]; then
  echo "[fatal] /tmp/wc-relayer-demo-env.sh not found."
  echo "Run the demo key generator first:"
  echo "  /tmp/wc-relayer-demo-key.sh"
  exit 1
fi

# Load WC_RELAYER_DEMO_PK
# shellcheck disable=SC1091
source /tmp/wc-relayer-demo-env.sh

if [ -z "${WC_RELAYER_DEMO_PK:-}" ]; then
  echo "[fatal] WC_RELAYER_DEMO_PK is empty after sourcing /tmp/wc-relayer-demo-env.sh"
  exit 1
fi

echo "=== [wc-relayer-sign-demo] env ==="
echo " WC_RELAYER_DEMO_PK=${WC_RELAYER_DEMO_PK}"

echo
echo "=== [wc-relayer-sign-demo] running TypeScript demo ==="
npx --yes tsx src/workcredits_relayer_sign_demo.ts
