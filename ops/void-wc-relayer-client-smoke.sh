#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

echo "=== [wc-relayer-client-smoke] repo ==="
pwd

# Ensure WC_RELAYER_DEMO_PK is set (or load from helper)
if [ "${WC_RELAYER_DEMO_PK:-}" = "" ]; then
  if [ -f /tmp/wc-relayer-demo-env.sh ]; then
    echo "=== [env] loading /tmp/wc-relayer-demo-env.sh ==="
    # shellcheck source=/tmp/wc-relayer-demo-env.sh
    source /tmp/wc-relayer-demo-env.sh
  else
    echo "[fatal] WC_RELAYER_DEMO_PK is not set and /tmp/wc-relayer-demo-env.sh is missing."
    echo "        Run /tmp/wc-relayer-demo-key.sh first to generate a dev key."
    exit 1
  fi
fi

echo "=== [env] WC_RELAYER_DEMO_PK length ==="
echo " ${#WC_RELAYER_DEMO_PK}"

echo
echo "=== [health] checking wc-relayer-dev on :4311 ==="
curl -fsS http://127.0.0.1:4311/health | jq || {
  echo "[fatal] wc-relayer-dev /health failed"
  exit 1
}

echo
echo "=== [run] tsx src/workcredits_relayer_client_smoke.ts ==="
npx --yes tsx src/workcredits_relayer_client_smoke.ts
