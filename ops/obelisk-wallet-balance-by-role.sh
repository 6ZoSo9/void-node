#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

NETWORK="mainnet-phase1"
CONFIG_PATH="config/void-mainnet-bootstrap-mainnet.live.json"
ROLE_ID=""
TOKEN_ADDR=""

usage() {
  cat <<'EOF'
Usage:
  ops/obelisk-wallet-balance-by-role.sh --network mainnet-phase1 --role <roleId> [--token 0x... ] [--config path]

Description:
  Resolve a named role from the mainnet bootstrap LIVE config to an address,
  then query its VOID balance via obelisk-wallet-balance-v2.sh.

Typical roles (from .roles in the LIVE JSON):
  - deployer
  - treasuryAdmin
  - opsTreasuryAdmin
  - validatorAdmin
  - adminGateOwner
  - updateGateOwner
  - configGateOwner
  - treasuryOwner
  - opsTreasuryOwner
  - rewardEngineOwner
  - validatorSetOwner

Examples:
  # Mainnet Phase 1 (once live, with contracts.voidToken set):
  RPC_URL=http://127.0.0.1:8545 \
    ops/obelisk-wallet-balance-by-role.sh \
      --network mainnet-phase1 \
      --role treasuryOwner

  # Override token address explicitly:
  RPC_URL=http://127.0.0.1:8545 \
    ops/obelisk-wallet-balance-by-role.sh \
      --network mainnet-phase1 \
      --role treasuryOwner \
      --token 0xVOIDTOKEN...
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --network)
      NETWORK="$2"
      shift 2
      ;;
    --role)
      ROLE_ID="$2"
      shift 2
      ;;
    --config)
      CONFIG_PATH="$2"
      shift 2
      ;;
    --token)
      TOKEN_ADDR="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[obelisk-by-role] ERROR: unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [ -z "${ROLE_ID:-}" ]; then
  echo "[obelisk-by-role] ERROR: --role <roleId> is required." >&2
  usage >&2
  exit 1
fi

case "$NETWORK" in
  mainnet-phase1)
    ;;
  *)
    echo "[obelisk-by-role] ERROR: unsupported --network '$NETWORK' (only 'mainnet-phase1' is wired here)." >&2
    exit 1
    ;;
esac

if [ ! -f "$CONFIG_PATH" ]; then
  echo "[obelisk-by-role] ERROR: config file not found: $CONFIG_PATH" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[obelisk-by-role] ERROR: 'jq' is required but not found in PATH." >&2
  exit 1
fi

# Resolve role -> address from .roles in the LIVE JSON.
ROLE_ADDR="$(
  jq -r --arg role "$ROLE_ID" '
    .roles[$role] // empty
  ' "$CONFIG_PATH"
)"

if [ -z "${ROLE_ADDR:-}" ] || [ "$ROLE_ADDR" = "0x0000000000000000000000000000000000000000" ]; then
  echo "[obelisk-by-role] ERROR: role '$ROLE_ID' not found or zero in $CONFIG_PATH" >&2
  echo "[obelisk-by-role] HINT: Available roles in this config:" >&2
  jq -r '.roles | to_entries[] | "  - \(.key): \(.value)"' "$CONFIG_PATH" >&2
  exit 1
fi

# Resolve token address if not explicitly provided.
if [ -z "${TOKEN_ADDR:-}" ]; then
  TOKEN_ADDR="$(
    jq -r '.contracts.voidToken // empty' "$CONFIG_PATH"
  )"
fi

if [ -z "${TOKEN_ADDR:-}" ] || [ "$TOKEN_ADDR" = "0x0000000000000000000000000000000000000000" ]; then
  echo "[obelisk-by-role] ERROR: contracts.voidToken is zero/empty in $CONFIG_PATH" >&2
  echo "[obelisk-by-role]        Mainnet Phase 1 token is not wired live yet." >&2
  echo "[obelisk-by-role]        Once live, set .contracts.voidToken and re-run." >&2
  exit 1
fi

echo "=== [obelisk] VOID balance by role ==="
echo "REPO_ROOT   = $PWD"
echo "NETWORK     = $NETWORK"
echo "RPC_URL     = $RPC_URL"
echo "CONFIG_PATH = $CONFIG_PATH"
echo "ROLE_ID     = $ROLE_ID"
echo "ROLE_ADDR   = $ROLE_ADDR"
echo "TOKEN_ADDR  = $TOKEN_ADDR"
echo

RPC_URL="$RPC_URL" \
  ops/obelisk-wallet-balance-v2.sh \
    --network "$NETWORK" \
    --token "$TOKEN_ADDR" \
    --address "$ROLE_ADDR"
