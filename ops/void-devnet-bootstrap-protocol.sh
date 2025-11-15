#!/usr/bin/env bash
set -euo pipefail

# Move to repo root
REPO=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$REPO"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
OUT="docs/VOID-DEVNET-PROTOCOL-STATE.json"
ADDR_FILE="docs/VOID-DEVNET-DEPLOY-ADDRESSES.json"

echo "[bootstrap] repo:    $REPO"
echo "[bootstrap] RPC_URL: $RPC_URL"

# 1) Sanity: devnet reachable + correct chain-id
if ! CHAIN_ID=$(cast chain-id --rpc-url "$RPC_URL" 2>/dev/null); then
  echo "[bootstrap][ERR] $RPC_URL not reachable; start anvil/devnet first" >&2
  exit 1
fi

if [ "$CHAIN_ID" != "2050" ]; then
  echo "[bootstrap][ERR] unexpected chain id: $CHAIN_ID (want 2050)" >&2
  exit 1
fi

# 2) Need deploy addresses JSON
if [ ! -f "$ADDR_FILE" ]; then
  echo "[bootstrap][ERR] missing $ADDR_FILE; run ops/void-devnet-deploy.sh first" >&2
  exit 1
fi

DEPLOYER=$(jq -r '.deployer'   "$ADDR_FILE")
TOKEN=$(jq  -r '.VoidToken'    "$ADDR_FILE")
ADMIN=$(jq  -r '.AdminGate'    "$ADDR_FILE")

if [[ -z "$DEPLOYER" || "$DEPLOYER" == "null" \
   || -z "$TOKEN"    || "$TOKEN"    == "null" \
   || -z "$ADMIN"    || "$ADMIN"    == "null" ]]; then
  echo "[bootstrap][ERR] bad addresses in $ADDR_FILE" >&2
  exit 1
fi

# 3) For now, v1 just snapshots protocol state for devnet
cat > "$OUT" <<EOF
{
  "rpcUrl": "$RPC_URL",
  "chainId": "$CHAIN_ID",
  "deployer": "$DEPLOYER",
  "VoidToken": "$TOKEN",
  "AdminGate": "$ADMIN"
}
EOF

echo "[bootstrap] wrote $OUT"
cat "$OUT"
