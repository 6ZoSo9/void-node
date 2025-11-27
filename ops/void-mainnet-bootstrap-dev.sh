#!/usr/bin/env bash
set -euo pipefail

#
# VOID Mainnet Bootstrap — DEV REHEARSAL STUB
#
# This script is a **non-destructive stub** for the dev/anvil bootstrap.
# It documents the intended flow and refuses to run anything dangerous
# until we explicitly wire it up and bless it.
#
# When it is fully implemented, it will:
#   1. Start an anvil node with chainId 2050 (or assume one is running).
#   2. Run `VoidMainnetBootstrapDev.s.sol` against that anvil instance.
#   3. Dump a JSON report of deployed contracts, balances, and invariants.
#
# For now, it only prints guidance and exits with status 1.
#

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

echo "[void-mainnet-bootstrap-dev] REHEARSAL STUB ONLY"
echo
echo "This script describes the future dev bootstrap flow, but it is"
echo "intentionally **not wired** to run any forge/anvil commands yet."
echo
echo "Planned flow (when we enable it):"
echo
echo "  1) Start an anvil node (chainId=2050), e.g.:"
echo "       anvil --chain-id 2050 --port 8545"
echo
echo "  2) Run the dev bootstrap script, something like:"
echo "       forge script script/void-mainnet/VoidMainnetBootstrapDev.s.sol:VoidMainnetBootstrapDev \\"
echo "         --rpc-url http://127.0.0.1:8545 \\"
echo "         --broadcast \\"
echo "         --private-key <DEV_BOOTSTRAP_KEY> \\"
echo "         --slow"
echo
echo "  3) Collect a JSON report with deployed addresses and invariants."
echo
echo "We will only enable the real commands after:"
echo "  - The Solidity dev bootstrap script is finalized."
echo "  - The config schema for signer addresses is locked."
echo "  - We have rehearsed everything on anvil multiple times."
echo
echo "Nothing has been executed. This is just a stub."
exit 1
