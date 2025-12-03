#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

cd "$REPO_ROOT"

ob_clear_screen() {
  printf "\033c"
}

ob_header() {
  cat <<EOF
=== O B E L I S K   C O N S O L E ============================================
Void Network operator console (retro TUI)
Repo      : $REPO_ROOT
RPC       : $RPC_URL
Prometheus: $PROM_URL
===============================================================================
EOF
}

press_enter() {
  printf "\nPress ENTER to return to menu..."
  # shellcheck disable=SC2034
  read -r _ || true
}

# ---------------------------------------------------------------------------
# Devnet helpers
# ---------------------------------------------------------------------------

ob_menu_devnet_summary() {
  ob_clear_screen
  ob_header
  echo
  echo "=== [menu] Devnet protocol summary ==="
  echo

  if [[ -f "docs/VOID-DEVNET-PROTOCOL-STATE.json" ]]; then
    echo "Devnet protocol state (best-effort view):"
    echo
    cat "docs/VOID-DEVNET-PROTOCOL-STATE.json"
    echo
  else
    echo "Devnet protocol state file not found:"
    echo "  docs/VOID-DEVNET-PROTOCOL-STATE.json"
  fi

  press_enter
}

ob_menu_devnet_balances() {
  ob_clear_screen
  ob_header
  echo
  echo "=== [devnet] Balance helpers ==="
  echo
  cat <<EOF
This section is for quick balance checks using the Obelisk balance helpers.

Examples:

  # Check VOID_TREASURY balance on devnet
  RPC_URL=$RPC_URL \\
    ops/obelisk-wallet-balance-v2.sh \\
      --network devnet \\
      --token 0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6 \\
      --address 0x610178dA211FEF7D417bC0e6FeD39F05609AD788

  # Check arbitrary devnet wallet balance
  RPC_URL=$RPC_URL \\
    ops/obelisk-wallet-balance-v2.sh \\
      --network devnet \\
      --token <VoidTokenAddress> \\
      --address <WalletAddress>

Use the CLI directly for now; this menu is a visual reminder.
EOF
  press_enter
}

ob_menu_devnet_transfer() {
  ob_clear_screen
  ob_header
  echo
  echo "=== [devnet] VOID transfer helper ==="
  echo
  cat <<EOF
This helper wraps a standard ERC20 transfer on devnet.

Example:

  RPC_URL=$RPC_URL \\
    ops/obelisk-wallet-transfer-devnet.sh \\
      --token 0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6 \\
      --to    0x610178dA211FEF7D417bC0e6FeD39F05609AD788 \\
      --amount 1

Notes:
  - Uses DEVNET_CALLER_KEY from .secrets to sign the transaction.
  - Requires the caller to have enough ETH for gas on devnet.
  - This is intended as a devnet convenience; mainnet tooling will be separate.
EOF
  press_enter
}

ob_menu_devnet_deploy_stub() {
  ob_clear_screen
  ob_header
  echo
  echo "=== [devnet] Deploy protocol stubs (PLAN ONLY) ==="
  echo

  if [[ -x "ops/void-devnet-deploy-stub.sh" ]]; then
    RPC_URL="$RPC_URL" ops/void-devnet-deploy-stub.sh || true
  else
    cat <<EOF
ops/void-devnet-deploy-stub.sh not found or not executable.

This slot is reserved for future devnet deploy flows, for example:
  - Deploying a fresh JobQueue / AgentRegistry / ModelRegistry / DatasetRegistry
  - Rehearsing contract wiring using forge script dry-runs

Right now this menu entry is PLAN ONLY and does not broadcast any transactions.
EOF
  fi

  press_enter
}

devnet_menu() {
  while true; do
    ob_clear_screen
    ob_header
    echo
    echo "[1] Devnet protocol summary"
    echo "[2] Devnet balances (help + examples)"
    echo "[3] Devnet transfer helper (VOID -> wallet)"
    echo "[4] Devnet deploy stubs (PLAN ONLY)"
    echo "[0] Back"
    echo
    read -rp "Select option: " choice || true
    case "$choice" in
      1) ob_menu_devnet_summary ;;
      2) ob_menu_devnet_balances ;;
      3) ob_menu_devnet_transfer ;;
      4) ob_menu_devnet_deploy_stub ;;
      0) break ;;
      *) echo "Invalid option"; sleep 1 ;;
    esac
  done
}

# ---------------------------------------------------------------------------
# Mainnet Phase 1 helpers
# ---------------------------------------------------------------------------

ob_menu_mainnet_phase1_roles() {
  ob_clear_screen
  ob_header
  echo
  echo "=== [mainnet-phase1] Roles / keys summary ==="
  echo
  cat <<EOF
This menu is a thin wrapper over the keys/PLAN tooling.

Key references:

  - roles mapping: /mnt/voidkey/meta/mainnet-roles-mapping.txt
  - LIVE config : config/void-mainnet-bootstrap-mainnet.live.json

Use:

  ./ops/void-mainnet-roles-verify.sh
  ./ops/void-mainnet-keys-health.sh
  ./ops/void-mainnet-keys-exporter.sh

This ensures AdminGate/UpdateGate/ConfigGate/Treasury owners match the LIVE JSON.
EOF
  press_enter
}

ob_menu_mainnet_phase1_plan() {
  ob_clear_screen
  ob_header
  echo
  echo "=== [mainnet-phase1] Bootstrap PLAN ==="
  echo
  cat <<EOF
This reflects the current mainnet bootstrap PLAN (no real broadcasts).

Useful commands:

  # PLAN-only run (no broadcast, just logs)
  RPC_URL=$RPC_URL \\
    forge script \\
      script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \\
      --rpc-url \$RPC_URL \\
      --sig "plan(string)" \\
      "config/void-mainnet-bootstrap-mainnet.live.json"

  # Dry-run harness (expects RUN_STUB_ONLY revert)
  ./ops/void-mainnet-bootstrap-mainnet-dry-run.sh

The real run() remains STUB ONLY until the pillars and keys say we are ready.
EOF
  press_enter
}

ob_menu_mainnet_phase1_balances_by_role() {
  ob_clear_screen
  ob_header
  echo
  echo "=== [mainnet-phase1] Balances by role (PLAN ONLY) ==="
  echo
  cat <<EOF
This uses ops/obelisk-wallet-balance-by-role.sh and the LIVE JSON.

Example (will only work once VoidToken is live and .contracts.voidToken is set):

  RPC_URL=$RPC_URL \\
    ops/obelisk-wallet-balance-by-role.sh \\
      --network mainnet-phase1 \\
      --role treasuryOwner

Until then, the script will politely refuse to run with a clear error message.
EOF
  press_enter
}

mainnet_phase1_menu() {
  while true; do
    ob_clear_screen
    ob_header
    echo
    echo "[1] Roles / keys summary (keys pillar)"
    echo "[2] Bootstrap PLAN helpers"
    echo "[3] Balances by role (PLAN-only until token live)"
    echo "[0] Back"
    echo
    read -rp "Select option: " choice || true
    case "$choice" in
      1) ob_menu_mainnet_phase1_roles ;;
      2) ob_menu_mainnet_phase1_plan ;;
      3) ob_menu_mainnet_phase1_balances_by_role ;;
      0) break ;;
      *) echo "Invalid option"; sleep 1 ;;
    esac
  done
}

# ---------------------------------------------------------------------------
# NullFeed (channels + dual UI) – PLAN/STUB
# ---------------------------------------------------------------------------

nf_load_channels() {
  local cfg="docs/NULLFEED-CHANNELS.json"
  if [[ -f "$cfg" ]]; then
    echo "=== [nullfeed] Channels from $cfg ==="
    cat "$cfg"
    return 0
  fi

  cat <<'EOF'
=== [nullfeed] Default channels (no docs/NULLFEED-CHANNELS.json yet) ===
[
  { "name": "#global",       "desc": "Global chat / posts" },
  { "name": "#void-dev",     "desc": "Protocol / node development" },
  { "name": "#ai-lab",       "desc": "AI, agents and models" },
  { "name": "#nullfeed-meta","desc": "NullFeed feedback / meta discussion" }
]
EOF
}

ob_menu_nullfeed_channels() {
  ob_clear_screen
  ob_header
  echo
  echo "=== [nullfeed] Channels (mIRC-style) ==="
  echo

  nf_load_channels

  cat <<'EOF'

Notes:
  - This is a PLAN/STUB view only.
  - In later phases, this menu will query void-node HTTP APIs:
      GET /nullfeed/channels
      GET /nullfeed/channel/:name?since_block=...
EOF
  press_enter
}

ob_menu_nullfeed_browser() {
  ob_clear_screen
  ob_header
  echo
  echo "=== [nullfeed] Browser-lite UI plan ==="
  echo
  cat <<EOF
Goal: a lightweight browser UI for NullFeed that can:

  - Run from your dev box or a VOID node (static files).
  - Let users switch channels like mIRC.
  - Connect Obelisk Wallet or Metamask to sign posts.

Rough plan:

  - Serve static HTML/JS/CSS from the node or a tiny web server.
  - Use void-node HTTP as the backend API:
      GET /nullfeed/channels
      GET /nullfeed/channel/:name
      POST /nullfeed/channel/:name/post

  - Wallets:
      - Obelisk Wallet integration later.
      - Metamask / generic EVM wallets via standard RPC.

For now this is a PLAN-ONLY view; no browser assets are shipped yet.
EOF
  press_enter
}

ob_menu_nullfeed_posting() {
  ob_clear_screen
  ob_header
  echo
  echo "=== [nullfeed] Posting flow (PLAN ONLY) ==="
  echo
  cat <<'EOF'
High-level posting flow (future):

  1) User selects a channel (e.g. #global).
  2) UI collects:
       - Message text
       - Optional image/GIF (off-chain, with on-chain hash later)
  3) Wallet signs the post (Obelisk or Metamask).
  4) void-node:
       - Stores post off-chain (e.g. filesystem/IPFS/S3).
       - Optionally commits a hash/root on-chain for important posts.

In the Obelisk console, we will eventually provide CLI helpers like:

  ops/nullfeed-post.sh --channel "#global" --text "hello void" [--image /path.gif]

For now: this menu documents the intended flow and reminds us where to wire it.
EOF
  press_enter
}

nullfeed_menu() {
  while true; do
    ob_clear_screen
    ob_header
    echo
    echo "[1] List channels (mIRC-style, from JSON or defaults)"
    echo "[2] Posting flow (PLAN ONLY)"
    echo "[3] Browser-lite UI plan"
    echo "[0] Back"
    echo
    read -rp "Select option: " choice || true
    case "$choice" in
      1) ob_menu_nullfeed_channels ;;
      2) ob_menu_nullfeed_posting ;;
      3) ob_menu_nullfeed_browser ;;
      0) break ;;
      *) echo "Invalid option"; sleep 1 ;;
    esac
  done
}

# ---------------------------------------------------------------------------
# Main menu
# ---------------------------------------------------------------------------

main_menu() {
  while true; do
    ob_clear_screen
    ob_header
    echo
    echo "[1] Devnet tools (jobs, agents, balances, transfers, deploy stubs)"
    echo "[2] Mainnet Phase 1 tools (PLAN, roles, balances by role)"
    echo "[3] NullFeed (channels, posting, browser plan)"
    echo "[0] Quit"
    echo
    read -rp "Select option: " choice || true
    case "$choice" in
      1) devnet_menu ;;
      2) mainnet_phase1_menu ;;
      3) nullfeed_menu ;;
      0) echo "Goodbye."; break ;;
      *) echo "Invalid option"; sleep 1 ;;
    esac
  done
}

main_menu
