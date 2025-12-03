#!/usr/bin/env bash
set -euo pipefail

# ======================================================================
# O B E L I S K   C O N S O L E
# Retro operator TUI for Void Network
# - Devnet tools (balances, transfers, deploy stubs)
# - Mainnet Phase 1 tools (docs/health/roles/balances by role)
#
# Env:
#   OBELISK_RPC_URL   (default http://127.0.0.1:8545)
#   OBELISK_PROM_URL  (default http://127.0.0.1:9090)
# ======================================================================

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RPC_URL="${OBELISK_RPC_URL:-http://127.0.0.1:8545}"
PROM_URL="${OBELISK_PROM_URL:-http://127.0.0.1:9090}"

# Current devnet constants (from your state / scripts)
DEVNET_TOKEN_ADDR_DEFAULT="0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"
DEVNET_TREASURY_ADDR_DEFAULT="0x610178dA211FEF7D417bC0e6FeD39F05609AD788"
DEVNET_CALLER_ADDR_DEFAULT="0x3022E757dC810E133019aC0780aB3363043fC871"

MAINNET_LIVE_CFG="${REPO_ROOT}/config/void-mainnet-bootstrap-mainnet.live.json"

# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------

press_enter() {
  echo
  read -r -p "Press ENTER to continue..." _ || true
}

header_main() {
  clear
  cat <<EOF
=== O B E L I S K   C O N S O L E ============================================
Void Network operator console (retro TUI)
Repo      : ${REPO_ROOT}
RPC       : ${RPC_URL}
Prometheus: ${PROM_URL}
===========================================================================
EOF
}

header_devnet() {
  clear
  cat <<EOF
=== O B E L I S K   D E V N E T ==============================================
Devnet tools: balances, transfers, deploy stubs
RPC       : ${RPC_URL}
Prometheus: ${PROM_URL}
===========================================================================
EOF
}

header_mainnet_phase1() {
  clear
  cat <<EOF
=== O B E L I S K   M A I N N E T   P H A S E   1 ============================
Mainnet Phase 1 (solo validator) tools: docs, keys, PLAN
RPC       : ${RPC_URL}
Prometheus: ${PROM_URL}
Live cfg  : ${MAINNET_LIVE_CFG}
===========================================================================
EOF
}

ask_choice() {
  local prompt="$1"
  read -r -p "${prompt}" choice || choice=""
  echo "${choice}"
}

# ----------------------------------------------------------------------
# Devnet actions
# ----------------------------------------------------------------------

devnet_show_protocol_summary() {
  header_devnet
  echo "=== [Devnet protocol summary] ======================================"
  local state="${REPO_ROOT}/docs/VOID-DEVNET-PROTOCOL-STATE.json"

  if [[ -f "${state}" ]]; then
    if command -v jq >/dev/null 2>&1; then
      jq '{chainId,network,JobQueue,ReceiptRegistry,AgentRegistry,ModelRegistry,DatasetRegistry}' \
        "${state}" || cat "${state}"
    else
      echo "[devnet] jq not found; dumping raw state file:"
      echo
      cat "${state}"
    fi
  else
    echo "[devnet] State doc not found:"
    echo "  ${state}"
    echo
    echo "If you have a state export script, run it first to populate this file."
  fi

  press_enter
}

devnet_check_balance() {
  header_devnet
  echo "=== [Devnet VOID balance] =========================================="
  local token_addr wallet_addr

  read -r -p "Token address [default devnet VoidToken ${DEVNET_TOKEN_ADDR_DEFAULT}]: " token_addr || true
  token_addr="${token_addr:-$DEVNET_TOKEN_ADDR_DEFAULT}"

  read -r -p "Wallet address [default devnet treasury ${DEVNET_TREASURY_ADDR_DEFAULT}]: " wallet_addr || true
  wallet_addr="${wallet_addr:-$DEVNET_TREASURY_ADDR_DEFAULT}"

  echo
  RPC_URL="${RPC_URL}" \
    "${REPO_ROOT}/ops/obelisk-wallet-balance-v2.sh" \
      --network devnet \
      --token "${token_addr}" \
      --address "${wallet_addr}" || true

  press_enter
}

devnet_transfer_void() {
  header_devnet
  echo "=== [Devnet VOID transfer] ========================================="
  echo "NOTE: This hits VoidToken.transfer(address,uint256) directly."
  echo "      On your current devnet, this is expected to *revert* until"
  echo "      we wire proper Treasury/RewardEngine flows."
  echo

  local token_addr to_addr amount
  read -r -p "Token address [default devnet VoidToken ${DEVNET_TOKEN_ADDR_DEFAULT}]: " token_addr || true
  token_addr="${token_addr:-$DEVNET_TOKEN_ADDR_DEFAULT}"

  read -r -p "Recipient address [default devnet treasury ${DEVNET_TREASURY_ADDR_DEFAULT}]: " to_addr || true
  to_addr="${to_addr:-$DEVNET_TREASURY_ADDR_DEFAULT}"

  read -r -p "Amount (VOID, human) [default 1]: " amount || true
  amount="${amount:-1}"

  echo
  RPC_URL="${RPC_URL}" \
    "${REPO_ROOT}/ops/obelisk-wallet-transfer-devnet.sh" \
      --token "${token_addr}" \
      --to "${to_addr}" \
      --amount "${amount}" || true

  echo
  echo "[devnet] Reminder: check balances with the devnet balance inspector."
  press_enter
}

devnet_fund_caller_eth() {
  header_devnet
  echo "=== [Devnet ETH faucet for caller] ================================"
  echo "This funds the devnet caller address (gas payer) from an unlocked"
  echo "anvil account. Defaults are based on your current setup."
  echo
  local caller value
  read -r -p "Caller address [default ${DEVNET_CALLER_ADDR_DEFAULT}]: " caller || true
  caller="${caller:-$DEVNET_CALLER_ADDR_DEFAULT}"

  read -r -p "Fund amount [default 1ether]: " value || true
  value="${value:-1ether}"

  echo
  RPC_URL="${RPC_URL}" \
    "${REPO_ROOT}/ops/void-devnet-fund-caller.sh" \
      --caller "${caller}" \
      --value "${value}" || true

  press_enter
}

devnet_menu() {
  while true; do
    header_devnet
    cat <<EOF
[1] Devnet protocol summary (state doc)
[2] Check VOID balance (address)
[3] Transfer VOID (devnet, best-effort; may revert)
[4] Fund devnet caller with ETH (gas faucet)
[0] Back to main menu
EOF
    echo
    local choice
    choice="$(ask_choice "Select option: ")"
    case "${choice}" in
      1) devnet_show_protocol_summary ;;
      2) devnet_check_balance ;;
      3) devnet_transfer_void ;;
      4) devnet_fund_caller_eth ;;
      0|"") break ;;
      *) echo "Invalid choice: ${choice}"; press_enter ;;
    esac
  done
}

# ----------------------------------------------------------------------
# Mainnet Phase 1 actions
# ----------------------------------------------------------------------

mainnet_phase1_health() {
  header_mainnet_phase1
  echo "=== [Mainnet Phase 1 launch health] ================================"
  if [[ -x "${REPO_ROOT}/ops/void-mainnet-launch-phase1-health-all.sh" ]]; then
    "${REPO_ROOT}/ops/void-mainnet-launch-phase1-health-all.sh" || true
  else
    echo "[mainnet] Health hammer not found:"
    echo "  ${REPO_ROOT}/ops/void-mainnet-launch-phase1-health-all.sh"
  fi
  press_enter
}

mainnet_phase1_roles_dump() {
  header_mainnet_phase1
  echo "=== [Mainnet roles vs live JSON] =================================="
  if [[ -x "${REPO_ROOT}/ops/void-mainnet-bootstrap-plan-roles-dump.sh" ]]; then
    "${REPO_ROOT}/ops/void-mainnet-bootstrap-plan-roles-dump.sh" || true
  else
    echo "[mainnet] Roles dump script not found:"
    echo "  ${REPO_ROOT}/ops/void-mainnet-bootstrap-plan-roles-dump.sh"
  fi
  press_enter
}

mainnet_phase1_plan_dryrun() {
  header_mainnet_phase1
  echo "=== [Mainnet run() stub dry-run] =================================="
  if [[ -x "${REPO_ROOT}/ops/void-mainnet-mainnet-health-all.sh" ]]; then
    # This already wraps the run() stub dry-run as part of the health hammer.
    "${REPO_ROOT}/ops/void-mainnet-mainnet-health-all.sh" || true
  else
    echo "[mainnet] health-all script not found:"
    echo "  ${REPO_ROOT}/ops/void-mainnet-mainnet-health-all.sh"
  fi
  press_enter
}

mainnet_phase1_balance_by_role() {
  header_mainnet_phase1
  echo "=== [Mainnet Phase 1 balance by role] ============================="
  echo "NOTE: This relies on:"
  echo "  - config/void-mainnet-bootstrap-mainnet.live.json"
  echo "  - .contracts.voidToken being set (not yet, for you)"
  echo

  local role
  read -r -p "Role id (e.g. treasuryOwner, opsTreasuryOwner, validatorAdmin): " role || true
  if [[ -z "${role}" ]]; then
    echo "[mainnet] No role entered; returning."
    press_enter
    return
  fi

  echo
  RPC_URL="${RPC_URL}" \
    "${REPO_ROOT}/ops/obelisk-wallet-balance-by-role.sh" \
      --network mainnet-phase1 \
      --role "${role}" || true

  press_enter
}

mainnet_phase1_menu() {
  while true; do
    header_mainnet_phase1
    cat <<EOF
[1] Phase 1 launch health (docs + keys + PLAN + pillars)
[2] Dump roles mapping vs live config
[3] run() stub dry-run (safety check)
[4] Inspect planned balances by role (when token live)
[0] Back to main menu
EOF
    echo
    local choice
    choice="$(ask_choice "Select option: ")"
    case "${choice}" in
      1) mainnet_phase1_health ;;
      2) mainnet_phase1_roles_dump ;;
      3) mainnet_phase1_plan_dryrun ;;
      4) mainnet_phase1_balance_by_role ;;
      0|"") break ;;
      *) echo "Invalid choice: ${choice}"; press_enter ;;
    esac
  done
}

# ----------------------------------------------------------------------
# Main menu
# ----------------------------------------------------------------------

main_menu() {
  while true; do
    header_main
    cat <<EOF
[1] Devnet tools (jobs, agents, balances, transfers, deploy stubs)
[2] Mainnet Phase 1 tools (PLAN, roles, balances by role)
[0] Quit
EOF
    echo
    local choice
    choice="$(ask_choice "Select option: ")"
    case "${choice}" in
      1) devnet_menu ;;
      2) mainnet_phase1_menu ;;
      0|"") echo "Goodbye."; exit 0 ;;
      *) echo "Invalid choice: ${choice}"; press_enter ;;
    esac
  done
}

main_menu
