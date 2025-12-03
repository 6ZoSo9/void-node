#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

if ! command -v jq >/dev/null 2>&1; then
  echo "[obelisk-devnet-menu] ERROR: 'jq' is required but not installed." >&2
  exit 1
fi

if [ ! -f "docs/VOID-DEVNET-PROTOCOL-STATE.json" ]; then
  echo "[obelisk-devnet-menu] WARN: docs/VOID-DEVNET-PROTOCOL-STATE.json not found."
  echo "  Some context screens may be empty, but the menu will still work."
fi

pause() {
  echo
  read -rp "Press ENTER to return to menu..." _x || true
}

print_devnet_summary() {
  if [ ! -f "docs/VOID-DEVNET-PROTOCOL-STATE.json" ]; then
    echo "Devnet state doc not found (docs/VOID-DEVNET-PROTOCOL-STATE.json)."
    echo "Use this menu to run CI smoke and check balances anyway."
    return
  fi

  echo "Devnet protocol state (best-effort view):"
  echo
  jq -r '
    {
      chainId: .chainId,
      network: .network,
      JobQueue: .contracts.JobQueue,
      ReceiptRegistry: .contracts.ReceiptRegistry,
      AgentRegistry: .contracts.AgentRegistry,
      ModelRegistry: .contracts.ModelRegistry,
      DatasetRegistry: .contracts.DatasetRegistry
    }' docs/VOID-DEVNET-PROTOCOL-STATE.json 2>/dev/null || \
    echo "(could not parse devnet state JSON cleanly)"
}

while :; do
  clear || true
  echo "==============================================="
  echo "      O B E L I S K   —   D E V N E T          "
  echo "==============================================="
  echo "RPC_URL : $RPC_URL"
  echo
  echo "1) Devnet CI / health smoke"
  echo "2) Check VOID balance (devnet, manual token+address)"
  echo "3) View devnet protocol summary"
  echo "4) Quit"
  echo
  read -rp "Select option [1-4]: " choice || { echo; exit 0; }

  case "$choice" in
    1)
      clear || true
      echo "=== [menu] Devnet CI / health smoke ==="
      echo
      # This is the same script your pre-push pillar uses.
      ./ops/void-devnet-ci-smoke.sh || \
        echo "[menu] devnet CI smoke exited non-zero (see logs above)."
      pause
      ;;
    2)
      clear || true
      echo "=== [menu] VOID balance (devnet) ==="
      echo
      echo "You will be asked for:"
      echo "  - VoidToken address on devnet"
      echo "  - Wallet address to inspect"
      echo
      read -rp "Token address (0x...): " TOKEN_ADDR || { echo; pause; continue; }
      TOKEN_ADDR="$(echo "$TOKEN_ADDR" | tr -d '[:space:]')"
      if [ -z "$TOKEN_ADDR" ]; then
        echo "[menu] No token address entered; returning."
        pause
        continue
      fi

      read -rp "Wallet address (0x...): " WALLET_ADDR || { echo; pause; continue; }
      WALLET_ADDR="$(echo "$WALLET_ADDR" | tr -d '[:space:]')"
      if [ -z "$WALLET_ADDR" ]; then
        echo "[menu] No wallet address entered; returning."
        pause
        continue
      fi

      echo
      echo ">>> Querying VOID balance on devnet..."
      echo "    TOKEN  = $TOKEN_ADDR"
      echo "    WALLET = $WALLET_ADDR"
      echo

      RPC_URL="$RPC_URL" \
        ./ops/obelisk-wallet-balance-v2.sh \
          --network devnet \
          --token "$TOKEN_ADDR" \
          --address "$WALLET_ADDR" || \
        echo "[menu] balance helper exited non-zero (see error above)."

      pause
      ;;
    3)
      clear || true
      echo "=== [menu] Devnet protocol summary ==="
      echo
      print_devnet_summary
      pause
      ;;
    4)
      echo "Goodbye."
      exit 0
      ;;
    *)
      echo "[menu] Unknown selection: $choice"
      sleep 1
      ;;
  esac
done
