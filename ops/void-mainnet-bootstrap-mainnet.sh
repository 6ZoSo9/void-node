#!/usr/bin/env bash
set -euo pipefail

#
# VOID Mainnet Bootstrap — REAL MAINNET STUB
#
# !!! DANGER ZONE (FUTURE) !!!
#
# This script is reserved for the **one-shot mainnet ceremony**.
# Right now it is intentionally DISABLED and will not run anything.
#
# When fully implemented, it will:
#   - Read a frozen mainnet bootstrap config (addresses only, no secrets).
#   - Call the mainnet bootstrap forge script against a real RPC endpoint.
#   - Mint the premine into the Treasury contract.
#   - Wire AdminGate / UpdateGate / ConfigGate / ValidatorSet / RewardEngine.
#
# Until we explicitly enable it, it just prints a warning and exits.
#

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

echo "====================================================================="
echo "  VOID MAINNET BOOTSTRAP (REAL NETWORK) — STUB ONLY"
echo "====================================================================="
echo
echo "This script is **NOT** allowed to perform a mainnet bootstrap yet."
echo
echo "Before this ever becomes active, we require ALL of the following:"
echo
echo "  [ ] Final mainnet bootstrap plan reviewed and frozen:"
echo "        docs/void-mainnet-bootstrap-plan-v1.md"
echo
echo "  [ ] Key ceremony completed:"
echo "        - Genesis premine key on LUKS / hardware"
echo "        - Treasury / Ops / AdminGate / UpdateGate / ConfigGate signer"
echo "          sets defined and backed up"
echo
echo "  [ ] Config file prepared (addresses only), e.g.:"
echo "        config/void-mainnet-bootstrap.json"
echo
echo "  [ ] Dev/anvil rehearsal script (ops/void-mainnet-bootstrap-dev.sh)"
echo "        has been enabled and run multiple times successfully."
echo
echo "  [ ] A dedicated bootstrap node / RPC endpoint is ready and tested."
echo
echo "Only after all boxes are checked will we:"
echo "  - Wire this script to call the real forge bootstrap script."
echo "  - Walk through the ceremony step-by-step."
echo
echo "Right now, this is a **guardrail stub**. Nothing has been executed."
exit 1
