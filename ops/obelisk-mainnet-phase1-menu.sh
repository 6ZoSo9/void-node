#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

CONFIG_PATH="config/void-mainnet-bootstrap-mainnet.live.json"

if ! command -v jq >/dev/null 2>&1; then
  echo "[obelisk-phase1-menu] ERROR: 'jq' is required but not installed." >&2
  exit 1
fi

if [ ! -f "$CONFIG_PATH" ]; then
  echo "[obelisk-phase1-menu] ERROR: config not found: $CONFIG_PATH" >&2
  exit 1
fi

# Render current roles from the LIVE JSON.
print_roles() {
  echo "Available roles from $CONFIG_PATH:"
  jq -r '.roles | to_entries[] | "  - \(.key): \(.value)"' "$CONFIG_PATH"
}

pause() {
  echo
  read -rp "Press ENTER to return to menu..." _dummy || true
}

while :; do
  clear || true
  echo "==============================================="
  echo "      O B E L I S K   —   MAINNET PHASE 1      "
  echo "==============================================="
  echo "RPC_URL   : $RPC_URL"
  echo "PROM_URL  : $PROM_URL"
  echo "CONFIG    : $CONFIG_PATH"
  echo
  echo "1) Phase 1 launch health (docs + keys + PLAN + pillars)"
  echo "2) VOID balance by role (uses LIVE JSON + Obelisk helper)"
  echo "3) List roles (from LIVE config)"
  echo "4) Quit"
  echo
  read -rp "Select option [1-4]: " choice || { echo; exit 0; }

  case "$choice" in
    1)
      clear || true
      echo "=== [menu] Phase 1 launch health ==="
      echo
      PROM_URL="$PROM_URL" \
        ./ops/void-mainnet-launch-phase1-health-all.sh || \
        echo "[menu] Phase 1 launch health script exited non-zero."
      pause
      ;;
    2)
      clear || true
      echo "=== [menu] VOID balance by role ==="
      echo
      print_roles
      echo
      read -rp "Enter role id (e.g. treasuryOwner): " ROLE_ID || { echo; pause; continue; }
      ROLE_ID="$(echo "$ROLE_ID" | tr -d '[:space:]')"
      if [ -z "$ROLE_ID" ]; then
        echo "[menu] No role entered; returning."
        pause
        continue
      fi

      echo
      echo ">>> Querying VOID balance for role '$ROLE_ID' on mainnet-phase1..."
      echo
      RPC_URL="$RPC_URL" \
        ./ops/obelisk-wallet-balance-by-role.sh \
          --network mainnet-phase1 \
          --role "$ROLE_ID" || \
        echo "[menu] NOTE: This may fail cleanly until VoidToken + contracts.voidToken are live."

      pause
      ;;
    3)
      clear || true
      echo "=== [menu] Roles in LIVE config ==="
      echo
      print_roles
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
