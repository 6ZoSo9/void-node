#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

# Devnet defaults (from our dev bootstrap/anvil setup)
TOKEN_DEVNET_DEFAULT="${TOKEN_DEVNET_DEFAULT:-0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6}"
VOID_TREASURY_DEVNET="${VOID_TREASURY_DEVNET:-0x610178dA211FEF7D417bC0e6FeD39F05609AD788}"
OPS_TREASURY_DEVNET="${OPS_TREASURY_DEVNET:-0x8A791620dd6260079BF849Dc5567aDC3F2FdC318}"

pause() {
  printf "\nPress ENTER to continue..." >&2
  # shellcheck disable=SC2034
  read -r _
}

while true; do
  # Try to clear; if it fails, just print a separator next time.
  if command -v clear >/dev/null 2>&1; then
    clear
  else
    printf '\n%s\n' "----------------------------------------"
  fi

  echo "========================================"
  echo "        O B E L I S K   W A L L E T     "
  echo "========================================"
  echo "[network] devnet @ ${RPC_URL}"
  echo
  echo "  1) Devnet VoidTreasury balance"
  echo "  2) Devnet OpsTreasury balance"
  echo "  3) Check custom devnet address"
  echo "  4) Quit"
  echo
  read -rp "Select option [1-4]: " choice

  case "$choice" in
    1)
      echo
      echo ">>> Devnet VoidTreasury balance"
      echo "    TOKEN  = ${TOKEN_DEVNET_DEFAULT}"
      echo "    WALLET = ${VOID_TREASURY_DEVNET}"
      echo

      RPC_URL="$RPC_URL" \
        ops/obelisk-wallet-balance-v2.sh \
          --network devnet \
          --token "$TOKEN_DEVNET_DEFAULT" \
          --address "$VOID_TREASURY_DEVNET" \
        || echo "[obelisk-menu] WARN: VoidTreasury balance probe failed."

      pause
      ;;
    2)
      echo
      echo ">>> Devnet OpsTreasury balance"
      echo "    TOKEN  = ${TOKEN_DEVNET_DEFAULT}"
      echo "    WALLET = ${OPS_TREASURY_DEVNET}"
      echo

      RPC_URL="$RPC_URL" \
        ops/obelisk-wallet-balance-v2.sh \
          --network devnet \
          --token "$TOKEN_DEVNET_DEFAULT" \
          --address "$OPS_TREASURY_DEVNET" \
        || echo "[obelisk-menu] WARN: OpsTreasury balance probe failed."

      pause
      ;;
    3)
      echo
      echo ">>> Custom devnet address balance"
      printf "Token address [default: %s]: " "$TOKEN_DEVNET_DEFAULT"
      read -r token_in
      if [ -z "${token_in:-}" ]; then
        token_in="$TOKEN_DEVNET_DEFAULT"
      fi

      printf "Wallet address (0x...): "
      read -r wallet_in

      if [ -z "${wallet_in:-}" ]; then
        echo "[obelisk-menu] ERROR: wallet address is required."
        pause
        continue
      fi

      echo
      echo "    TOKEN  = ${token_in}"
      echo "    WALLET = ${wallet_in}"
      echo

      RPC_URL="$RPC_URL" \
        ops/obelisk-wallet-balance-v2.sh \
          --network devnet \
          --token "$token_in" \
          --address "$wallet_in" \
        || echo "[obelisk-menu] WARN: custom balance probe failed."

      pause
      ;;
    4)
      echo
      echo "Goodbye."
      exit 0
      ;;
    *)
      echo
      echo "[obelisk-menu] Invalid choice: ${choice}"
      pause
      ;;
  esac
done
