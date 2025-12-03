#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

pause() {
  read -r -p "Press ENTER to continue..." _
}

header() {
  clear 2>/dev/null || true
  echo "=== O B E L I S K   C O N S O L E ============================================"
  echo "Void Network operator console (retro TUI)"
  echo "Repo      : $REPO_ROOT"
  echo "RPC       : $RPC_URL"
  echo "Prometheus: $PROM_URL"
  echo "=============================================================================== "
  echo
}

devnet_protocol_summary() {
  header
  echo "=== [menu] Devnet protocol summary ==="
  echo

  local state_file="$REPO_ROOT/docs/VOID-DEVNET-PROTOCOL-STATE.json"

  if [[ -f "$state_file" ]]; then
    echo "Devnet protocol state (best-effort view):"
    echo
    if command -v jq >/dev/null 2>&1; then
      jq '{chainId, network, JobQueue, ReceiptRegistry, AgentRegistry, ModelRegistry, DatasetRegistry}' \
        "$state_file" 2>/dev/null || cat "$state_file"
    else
      cat "$state_file"
    fi
  else
    echo "WARN: devnet protocol state file not found:"
    echo "  $state_file"
    echo "You can regenerate it via the devnet ops scripts."
  fi

  echo
  read -r -p "Press ENTER to return to menu..." _
}

devnet_balance_prompt() {
  header
  echo "=== [devnet] VOID balance (any address) ==="
  echo
  read -r -p "Token address (VoidToken on devnet) [default: 0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6]: " token
  token="${token:-0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6}"

  read -r -p "Wallet address: " addr
  if [[ -z "$addr" ]]; then
    echo "No wallet address provided, aborting."
    pause
    return
  fi

  echo
  RPC_URL="$RPC_URL" \
    "$REPO_ROOT/ops/obelisk-wallet-balance-v2.sh" \
      --network devnet \
      --token "$token" \
      --address "$addr" || true

  echo
  pause
}

devnet_transfer_prompt() {
  header
  echo "=== [devnet] VOID transfer (devnet caller -> address) ==="
  echo
  read -r -p "Token address (VoidToken on devnet) [default: 0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6]: " token
  token="${token:-0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6}"

  read -r -p "Recipient address: " to
  if [[ -z "$to" ]]; then
    echo "No recipient address provided, aborting."
    pause
    return
  fi

  read -r -p "Amount (VOID, human units, e.g. 1.5): " amt
  if [[ -z "$amt" ]]; then
    echo "No amount provided, aborting."
    pause
    return
  fi

  echo
  RPC_URL="$RPC_URL" \
    "$REPO_ROOT/ops/obelisk-wallet-transfer-devnet.sh" \
      --token "$token" \
      --to "$to" \
      --amount "$amt" || true

  echo
  pause
}

devnet_deploy_stub_menu() {
  header
  echo "=== [devnet] Deploy protocol stubs (PLAN ONLY) ==="
  echo
  RPC_URL="$RPC_URL" "$REPO_ROOT/ops/void-devnet-deploy-stub.sh" || true
  echo
  pause
}

devnet_menu() {
  while true; do
    header
    echo "[DEVNET]"
    echo "  [1] Protocol summary"
    echo "  [2] Check VOID balance (any address)"
    echo "  [3] Transfer VOID (devnet caller -> address)"
    echo "  [4] Deploy devnet protocol stubs (PLAN only)"
    echo "  [0] Back"
    echo
    read -r -p "Select option: " choice
    case "$choice" in
      1) devnet_protocol_summary ;;
      2) devnet_balance_prompt ;;
      3) devnet_transfer_prompt ;;
      4) devnet_deploy_stub_menu ;;
      0|"") break ;;
      *) echo "Unknown option: $choice"; pause ;;
    esac
  done
}

mainnet_phase1_menu() {
  while true; do
    header
    echo "[MAINNET PHASE 1]"
    echo "  [1] Phase 1 launch health (keys + PLAN + pillars)"
    echo "  [2] Balance by Phase-1 role (when token live)"
    echo "  [0] Back"
    echo
    read -r -p "Select option: " choice
    case "$choice" in
      1)
        echo "=== [mainnet] Phase 1 launch health ==="
        echo
        RPC_URL="$RPC_URL" \
          "$REPO_ROOT/ops/void-mainnet-launch-phase1-health-all.sh" || true
        echo
        pause
        ;;
      2)
        read -r -p "Enter Phase-1 role (e.g. treasuryOwner): " role
        if [[ -z "$role" ]]; then
          echo "No role provided, aborting."
          pause
          continue
        fi
        echo
        RPC_URL="$RPC_URL" \
          "$REPO_ROOT/ops/obelisk-wallet-balance-by-role.sh" \
            --network mainnet-phase1 \
            --role "$role" || true
        echo
        pause
        ;;
      0|"") break ;;
      *) echo "Unknown option: $choice"; pause ;;
    esac
  done
}

main() {
  while true; do
    header
    echo "[1] Devnet tools (jobs, agents, balances, transfers, deploy stubs)"
    echo "[2] Mainnet Phase 1 tools (PLAN, roles, balances by role)"
    echo "[0] Quit"
    echo
    read -r -p "Select option: " choice
    case "$choice" in
      1) devnet_menu ;;
      2) mainnet_phase1_menu ;;
      0|"")
        echo "Goodbye."
        exit 0
        ;;
      *) echo "Unknown option: $choice"; pause ;;
    esac
  done
}

main "$@"
