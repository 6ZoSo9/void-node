#!/usr/bin/env bash
set -euo pipefail

#
# VOID mainnet offline key ceremony (SKELETON)
#
# - This is meant to be run ONCE on your offline/sentinel environment.
# - It MUST NOT be run casually on an online dev box.
# - It generates mainnet custody keys via `cast wallet new`, writes keystore
#   files into KEYS_DIR, and prints ADDRESSES ONLY so you can bring them back
#   to this dev machine and plug them into:
#       config/void-mainnet-bootstrap-mainnet.live.json
#
# SAFETY:
#   - Requires explicit CONFIRM env var to actually do anything.
#   - Produces NO private keys in stdout; only addresses + keystore paths.
#   - The text file with addresses should live OFFLINE; do not git-add it.
#

if [[ "${CONFIRM_VOID_MAINNET_OFFLINE:-}" != "YES_I_AM_OFFLINE_AND_READY" ]]; then
  echo "FATAL: This script is intended for the OFFLINE/sentinel environment only."
  echo "Set CONFIRM_VOID_MAINNET_OFFLINE=YES_I_AM_OFFLINE_AND_READY to proceed."
  echo
  echo "Example (on the offline box):"
  echo "  CONFIRM_VOID_MAINNET_OFFLINE=YES_I_AM_OFFLINE_AND_READY \\"
  echo "    KEYS_DIR=/keys/void-mainnet \\"
  echo "    ./ops/void-mainnet-keys-ceremony-offline.sh"
  exit 1
fi

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

# Where encrypted keystore files will live on the offline machine.
KEYS_DIR="${KEYS_DIR:-/keys/void-mainnet}"
mkdir -p "$KEYS_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${OUT:-$REPO_ROOT/void-mainnet-main-keys-${STAMP}.txt}"

echo "=== [mainnet-keys] VOID mainnet OFFLINE key ceremony ==="
echo "[mainnet-keys] REPO_ROOT = $REPO_ROOT"
echo "[mainnet-keys] KEYS_DIR  = $KEYS_DIR"
echo "[mainnet-keys] OUT       = $OUT"
echo
echo "!! WARNING: You are about to generate REAL VOID mainnet custody keys."
echo "!! - This machine should be OFFLINE and physically controlled."
echo "!! - Do NOT run this on a random laptop or online dev box."
echo

read -r -p "Type 'I UNDERSTAND' to continue: " CONFIRM_TEXT
if [[ "$CONFIRM_TEXT" != "I UNDERSTAND" ]]; then
  echo "Aborting: confirmation text mismatch."
  exit 1
fi

gen() {
  local label="$1"
  echo
  echo "=== [mainnet-keys] generating key for $label ==="
  echo "You will be prompted for a password to encrypt the keystore."
  echo "Keystore will be written into: $KEYS_DIR"
  local json path addr
  json="$(cast wallet new --json "$KEYS_DIR")"
  echo "$json" | jq .

  path="$(echo "$json" | jq -r '.[0].path')"
  addr="$(echo "$json" | jq -r '.[0].address')"

  {
    echo "$label  $addr  # $path"
  } >> "$OUT"

  echo "[mainnet-keys] LABEL=$label"
  echo "[mainnet-keys]   path   = $path"
  echo "[mainnet-keys]   address= $addr"
}

# Core gate owners / admins (names must match the blueprint doc)
gen "ADMIN_GATE_OWNER"
gen "UPDATE_GATE_OWNER"
gen "CONFIG_GATE_OWNER"

# Treasury owners
gen "VOID_TREASURY_OWNER"
gen "OPS_TREASURY_OWNER"
gen "REWARD_ENGINE_OWNER"

# Validator config owner
gen "VALIDATOR_SET_OWNER"

# Bootstrap operator/admin roles
gen "DEPLOYER"
gen "TREASURY_ADMIN"
gen "OPS_TREASURY_ADMIN"
gen "VALIDATOR_ADMIN"

echo
echo "=== [mainnet-keys] ceremony complete ==="
echo "Addresses-only summary written to:"
echo "  $OUT"
echo
echo "NEXT STEPS (offline):"
echo "  - Back up KEYS_DIR securely (encrypted storage, multiple locations)."
echo "  - Print or otherwise record the addresses from \$OUT."
echo "  - When ready, bring ONLY the addresses back to the dev machine"
echo "    and update config/void-mainnet-bootstrap-mainnet.live.json."
echo
echo "DO NOT git-add or otherwise commit $OUT or any keystore files."
