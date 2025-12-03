#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
NETWORK="devnet"
GAS_LIMIT="${GAS_LIMIT:-100000}"

usage() {
  cat <<'EOF'
Usage:
  RPC_URL=http://127.0.0.1:8545 \
    ops/obelisk-wallet-transfer-devnet.sh \
      --token 0xTOKEN \
      --to 0xWALLET \
      --amount AMOUNT_VOID

Args:
  --token   ERC-20 VoidToken address on devnet
  --to      recipient wallet address
  --amount  amount in VOID (human) e.g. 1, 10.5, 333333333

Env:
  RPC_URL    RPC endpoint (default: http://127.0.0.1:8545)
  GAS_LIMIT  gas limit for tx (default: 100000)
  DEVNET_CALLER_KEY
            private key for sender; if unset, uses .secrets/devnet-caller.key

Notes:
  - Uses DEVNET_CALLER_KEY from env or .secrets/devnet-caller.key
  - Amount is converted to 18-decimal wei internally.
EOF
}

TOKEN_ADDR=""
TO_ADDR=""
AMOUNT_VOID=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --token)
      TOKEN_ADDR="$2"; shift 2 ;;
    --to)
      TO_ADDR="$2"; shift 2 ;;
    --amount)
      AMOUNT_VOID="$2"; shift 2 ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$TOKEN_ADDR" || -z "$TO_ADDR" || -z "$AMOUNT_VOID" ]]; then
  echo "[obelisk-transfer-devnet] ERROR: Missing required args." >&2
  usage
  exit 1
fi

if ! command -v cast >/dev/null 2>&1; then
  echo "[obelisk-transfer-devnet] ERROR: 'cast' not found in PATH." >&2
  exit 1
fi

DEVNET_CALLER_KEY="${DEVNET_CALLER_KEY:-}"
if [[ -z "$DEVNET_CALLER_KEY" ]]; then
  if [[ -f ".secrets/devnet-caller.key" ]]; then
    DEVNET_CALLER_KEY="$(< .secrets/devnet-caller.key)"
  else
    echo "[obelisk-transfer-devnet] ERROR: DEVNET_CALLER_KEY not set and .secrets/devnet-caller.key missing." >&2
    exit 1
  fi
fi

DEVNET_CALLER_KEY="$(echo "$DEVNET_CALLER_KEY" | tr -d '[:space:]')"

echo "=== [obelisk] VOID transfer (devnet) ==="
echo "REPO_ROOT   = $PWD"
echo "NETWORK     = $NETWORK"
echo "RPC_URL     = $RPC_URL"
echo "TOKEN_ADDR  = $TOKEN_ADDR"
echo "FROM (key)  = DEVNET_CALLER_KEY (hidden)"
echo "TO_ADDR     = $TO_ADDR"
echo "AMOUNT_VOID = $AMOUNT_VOID"
echo "GAS_LIMIT   = $GAS_LIMIT"

echo
echo "--- [1] convert human amount -> wei (18 decimals) ---"

AMOUNT_WEI="$(
  AMOUNT_VOID_STR="$AMOUNT_VOID" python3 - <<'PY'
from decimal import Decimal, getcontext
import os, sys

getcontext().prec = 80

s = os.environ.get("AMOUNT_VOID_STR", "").strip()
if not s:
    sys.stderr.write("no amount provided via env AMOUNT_VOID_STR\n")
    sys.exit(1)

amt = Decimal(s)
wei = int(amt * (10 ** 18))
print(wei)
PY
)"

if [[ -z "$AMOUNT_WEI" ]]; then
  echo "[obelisk-transfer-devnet] ERROR: failed to compute AMOUNT_WEI." >&2
  exit 1
fi

echo "AMOUNT_WEI = $AMOUNT_WEI"

echo
echo "--- [2] cast send transfer(address,uint256) ---"
set -x
cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_CALLER_KEY" \
  --gas-limit "$GAS_LIMIT" \
  "$TOKEN_ADDR" \
  "transfer(address,uint256)" \
  "$TO_ADDR" \
  "$AMOUNT_WEI"
set +x

echo
echo "=== [obelisk] transfer complete (best-effort; check devnet state / metrics) ==="
