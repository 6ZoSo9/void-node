#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet bootstrap TEMPLATE-FILL
#
# Purpose:
#   - Take config/void-mainnet-bootstrap-mainnet.template.json
#   - Fill in real mainnet addresses from environment variables
#   - Write config/void-mainnet-bootstrap-mainnet.live.json (git-ignored)
#
# Safety:
#   - Refuses zero-address for any role
#   - Refuses known Anvil dev addresses for any role or validator reward
#   - Only writes *.live.json (never the template)
#
# NOTE:
#   - This script DOES NOT send transactions.
#   - It just prepares a mainnet config JSON that you can then:
#       * lint with:    ops/void-mainnet-bootstrap-mainnet-lint.sh
#       * dryrun with:  ops/void-mainnet-bootstrap-mainnet-dryrun.sh
#
# Required env vars (addresses, all 0x...):
#   VOID_ADMIN_GATE_OWNER
#   VOID_UPDATE_GATE_OWNER
#   VOID_CONFIG_GATE_OWNER
#   VOID_TREASURY_OWNER
#   VOID_OPS_TREASURY_OWNER
#   VOID_REWARD_ENGINE_OWNER
#   VOID_VALIDATORSET_OWNER
#
# Validator[0] (genesis validator) envs:
#   VOID_VALIDATOR_0_REWARD   (address)
#   VOID_VALIDATOR_0_STAKE    (decimal VOID, e.g. "1000000")
#   VOID_VALIDATOR_0_CONSKEY  (0x... consensus key)
#
# Optional:
#   TEMPLATE (default: config/void-mainnet-bootstrap-mainnet.template.json)
#   OUT      (default: config/void-mainnet-bootstrap-mainnet.live.json)

cd "$HOME/dev/void-node"

TEMPLATE="${TEMPLATE:-config/void-mainnet-bootstrap-mainnet.template.json}"
OUT="${OUT:-config/void-mainnet-bootstrap-mainnet.live.json}"

echo "=== [template-fill] VOID mainnet config ==="
echo "[info] TEMPLATE = $TEMPLATE"
echo "[info] OUT      = $OUT"
echo

if [[ ! -f "$TEMPLATE" ]]; then
  echo "[FATAL] template JSON not found: $TEMPLATE" >&2
  exit 1
fi

case "$OUT" in
  *.live.json) ;;
  *)
    echo "[FATAL] OUT must end with .live.json to avoid clobbering templates: $OUT" >&2
    exit 1
    ;;
esac

# Known bad dev addresses (lowercased)
DEV_ADDR_1="0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
DEV_ADDR_2="0x70997970c51812dc3a010c7d01b50e0d17dc79c8"
DEV_ADDR_3="0x3c44cdddB6a900fa2b585dd299e03d12fa4293bc"
DEV_ADDR_3_LC="0x3c44cdddB6a900fa2b585dd299e03d12fa4293bc" # ensure we match regardless of case

DEV_ADDR_3_NORM="0x3c44cdddB6a900fa2b585dd299e03d12fa4293bc"

normalize_addr() {
  # lowercase and trim
  printf '%s\n' "$1" | tr 'A-F' 'a-f'
}

is_zero_addr() {
  local a
  a="$(normalize_addr "$1")"
  [[ "$a" == "0x0000000000000000000000000000000000000000" ]]
}

is_dev_addr() {
  local a
  a="$(normalize_addr "$1")"
  case "$a" in
    "$DEV_ADDR_1"|"$DEV_ADDR_2"|"$DEV_ADDR_3_NORM") return 0 ;;
    *) return 1 ;;
  esac
}

require_env_addr() {
  local name="$1"
  local value="${!name:-}"

  if [[ -z "${value}" ]]; then
    echo "[FATAL] env var $name is required and must be a non-empty 0x address" >&2
    exit 1
  fi

  case "$value" in
    0x*) ;;
    *)
      echo "[FATAL] $name must be a 0x-prefixed address, got: $value" >&2
      exit 1
      ;;
  esac

  if is_zero_addr "$value"; then
    echo "[FATAL] $name is zero-address, not allowed for mainnet: $value" >&2
    exit 1
  fi

  if is_dev_addr "$value"; then
    echo "[FATAL] $name matches a KNOWN ANVIL DEV ADDRESS, not allowed for mainnet: $value" >&2
    exit 1
  fi

  echo "[ok] $name = $value"
}

require_env_scalar() {
  local name="$1"
  local value="${!name:-}"

  if [[ -z "${value}" ]]; then
    echo "[FATAL] env var $name is required and must be non-empty" >&2
    exit 1
  fi

  echo "[ok] $name = $value"
}

echo "=== [step 1] Validate role addresses ==="
require_env_addr "VOID_ADMIN_GATE_OWNER"
require_env_addr "VOID_UPDATE_GATE_OWNER"
require_env_addr "VOID_CONFIG_GATE_OWNER"
require_env_addr "VOID_TREASURY_OWNER"
require_env_addr "VOID_OPS_TREASURY_OWNER"
require_env_addr "VOID_REWARD_ENGINE_OWNER"
require_env_addr "VOID_VALIDATORSET_OWNER"
echo

echo "=== [step 2] Validate validator[0] inputs ==="
require_env_addr    "VOID_VALIDATOR_0_REWARD"
require_env_scalar  "VOID_VALIDATOR_0_STAKE"
require_env_scalar  "VOID_VALIDATOR_0_CONSKEY"
echo

echo "=== [step 3] Build live mainnet config JSON ==="

TMP_OUT="${OUT}.tmp.$$"

jq \
  --arg adminGateOwner      "$VOID_ADMIN_GATE_OWNER" \
  --arg updateGateOwner     "$VOID_UPDATE_GATE_OWNER" \
  --arg configGateOwner     "$VOID_CONFIG_GATE_OWNER" \
  --arg treasuryOwner       "$VOID_TREASURY_OWNER" \
  --arg opsTreasuryOwner    "$VOID_OPS_TREASURY_OWNER" \
  --arg rewardEngineOwner   "$VOID_REWARD_ENGINE_OWNER" \
  --arg validatorSetOwner   "$VOID_VALIDATORSET_OWNER" \
  --arg v0_id               "validator-0" \
  --arg v0_reward           "$VOID_VALIDATOR_0_REWARD" \
  --arg v0_stake            "$VOID_VALIDATOR_0_STAKE" \
  --arg v0_conskey          "$VOID_VALIDATOR_0_CONSKEY" \
  '
    .roles.adminGateOwner    = $adminGateOwner
    | .roles.updateGateOwner = $updateGateOwner
    | .roles.configGateOwner = $configGateOwner
    | .roles.treasuryOwner   = $treasuryOwner
    | .roles.opsTreasuryOwner = $opsTreasuryOwner
    | .roles.rewardEngineOwner = $rewardEngineOwner
    | .roles.validatorSetOwner = $validatorSetOwner
    | .validators = [
        {
          id: $v0_id,
          rewardAddress: $v0_reward,
          stakeVOID: $v0_stake,
          consensusKey: $v0_conskey
        }
      ]
  ' "$TEMPLATE" > "$TMP_OUT"

mv "$TMP_OUT" "$OUT"

echo
echo "=== [done] Wrote live mainnet config ==="
echo "[info] $OUT"
echo
echo "Next steps (manual):"
echo "  1) Inspect the file:"
echo "       jq . \"$OUT\""
echo "  2) Lint it:"
echo "       ./ops/void-mainnet-bootstrap-mainnet-lint.sh --config \"$OUT\""
echo "  3) When ready and with a SAFE RPC, run dryrun (never mainnet yet):"
echo "       ./ops/void-mainnet-bootstrap-mainnet-dryrun.sh --config \"$OUT\" --rpc http://127.0.0.1:8545"
