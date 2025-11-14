#!/usr/bin/env bash
set -euo pipefail

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
OUT="${OUT:-docs/VOID-DEVNET-DEPLOY-ADDRESSES.json}"

echo "[void-devnet] RPC_URL=$RPC_URL" >&2
echo "[void-devnet] OUT=$OUT" >&2

if [ -z "${DEVNET_PRIVKEY:-}" ]; then
  echo "[void-devnet][ERR] DEVNET_PRIVKEY not set" >&2
  exit 1
fi

DEPLOYER=$(cast wallet address "$DEVNET_PRIVKEY")
echo "[void-devnet] DEPLOYER=$DEPLOYER" >&2

broadcastFlag="--broadcast"
if [ "${DEVNET_DRY_RUN:-0}" = "1" ]; then
  echo "[void-devnet] DRY RUN (no --broadcast)" >&2
  broadcastFlag=""
fi

run_create() {
  local name="$1"; shift
  echo "[void-devnet] deploying $name..." >&2

  # Capture all forge output for logging + parsing
  local out addr
  out=$(forge create "$@" 2>&1)
  printf '%s\n' "$out" >&2

  addr=$(printf '%s\n' "$out" | sed -n 's/^Deployed to: //p' | tail -n1)
  if [ -z "$addr" ]; then
    echo "[void-devnet][ERR] failed to parse $name address" >&2
    exit 1
  fi

  echo "$addr"
}

# 1) VoidToken (capped, 230M premine to DEPLOYER)
VoidToken=$(
  run_create VoidToken \
    contracts/VoidToken.sol:VoidToken \
    --rpc-url "$RPC_URL" \
    --private-key "$DEVNET_PRIVKEY" \
    $broadcastFlag \
    --constructor-args "$DEPLOYER"
)

# 2) AdminGate (chainId 2050, masterKey=DEPLOYER, updateGate=0)
AdminGate=$(
  run_create AdminGate \
    contracts/AdminGate.sol:AdminGate \
    --rpc-url "$RPC_URL" \
    --private-key "$DEVNET_PRIVKEY" \
    $broadcastFlag \
    --constructor-args 2050 "$DEPLOYER" 0x0000000000000000000000000000000000000000
)

mkdir -p docs

cat > "$OUT" <<EOF
{
  "rpcUrl": "$RPC_URL",
  "deployer": "$DEPLOYER",
  "VoidToken": "$VoidToken",
  "AdminGate": "$AdminGate"
}
EOF

echo "[void-devnet] wrote $OUT" >&2
