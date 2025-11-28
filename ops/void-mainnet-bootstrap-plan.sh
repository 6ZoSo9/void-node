#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet bootstrap PLAN script (read-only)
#
# Usage:
#   ./ops/void-mainnet-bootstrap-plan.sh \
#     --config config/void-mainnet-bootstrap-mainnet.live.json \
#     --rpc    https://your-mainnet-rpc
#
# For dev/anvil testing:
#   ./ops/void-mainnet-bootstrap-plan.sh \
#     --config config/void-mainnet-bootstrap-dev.json \
#     --rpc    http://127.0.0.1:8545

CONFIG=""
RPC_URL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --config)
      CONFIG="$2"
      shift 2
      ;;
    --rpc)
      RPC_URL="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 --config <config.json> --rpc <rpc-url>"
      echo
      echo "This is a READ-ONLY inspection tool. It does not send any transactions."
      exit 0
      ;;
    *)
      echo "[ERROR] Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$CONFIG" ]]; then
  echo "[ERROR] --config is required" >&2
  exit 1
fi

if [[ -z "$RPC_URL" ]]; then
  echo "[ERROR] --rpc is required" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[ERROR] jq not found on PATH; install jq first." >&2
  exit 1
fi

if ! command -v cast >/dev/null 2>&1; then
  echo "[ERROR] cast (Foundry) not found on PATH; install Foundry first." >&2
  exit 1
fi

if [[ ! -f "$CONFIG" ]]; then
  echo "[ERROR] config file not found: $CONFIG" >&2
  exit 1
fi

# Known anvil dev addresses (subset; enough to catch obvious mistakes)
ANVIL_ADDRS=(
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
  0x90F79bf6EB2c4f870365E785982E1f101E93b906
  0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
)

is_anvil_addr() {
  local target="$1"
  for a in "${ANVIL_ADDRS[@]}"; do
    if [[ "${target,,}" == "${a,,}" ]]; then
      return 0
    fi
  done
  return 1
}

echo "=== VOID mainnet bootstrap PLAN ==="
echo "[info] CONFIG = $CONFIG"
echo "[info] RPC    = $RPC_URL"
echo

echo "=== [STEP 1] Read config JSON ==="
CHAIN_ID_CFG=$(jq -r '.chainId // "null"' "$CONFIG")
NETWORK_NAME=$(jq -r '.networkName // "null"' "$CONFIG")

ADMIN_GATE_OWNER=$(jq -r '.roles.adminGateOwner      // "null"' "$CONFIG")
UPDATE_GATE_OWNER=$(jq -r '.roles.updateGateOwner     // "null"' "$CONFIG")
CONFIG_GATE_OWNER=$(jq -r '.roles.configGateOwner     // "null"' "$CONFIG")
TREASURY_OWNER=$(jq -r '.roles.treasuryOwner         // "null"' "$CONFIG")
OPS_TREASURY_OWNER=$(jq -r '.roles.opsTreasuryOwner   // "null"' "$CONFIG")
REWARD_OWNER=$(jq -r '.roles.rewardEngineOwner       // "null"' "$CONFIG")
VALIDATOR_SET_OWNER=$(jq -r '.roles.validatorSetOwner // "null"' "$CONFIG")

VALIDATOR_COUNT=$(jq -r '.validators | length' "$CONFIG" 2>/dev/null || echo "0")

echo "config.chainId    = $CHAIN_ID_CFG"
echo "config.network    = $NETWORK_NAME"
echo
echo "roles.adminGateOwner      = $ADMIN_GATE_OWNER"
echo "roles.updateGateOwner     = $UPDATE_GATE_OWNER"
echo "roles.configGateOwner     = $CONFIG_GATE_OWNER"
echo "roles.treasuryOwner       = $TREASURY_OWNER"
echo "roles.opsTreasuryOwner    = $OPS_TREASURY_OWNER"
echo "roles.rewardEngineOwner   = $REWARD_OWNER"
echo "roles.validatorSetOwner   = $VALIDATOR_SET_OWNER"
echo
echo "validators.length         = $VALIDATOR_COUNT"
echo

if [[ "$VALIDATOR_COUNT" -gt 0 ]]; then
  echo "--- validators ---"
  jq -r '.validators[]
    | "id=\(.id // "unknown"), rewardAddress=\(.rewardAddress // "null"), stakeVOID=\(.stakeVOID // "null"), consensusKey=\(.consensusKey // "null")"
  ' "$CONFIG"
  echo
fi

echo "=== [STEP 1b] Config sanity: dev/anvil address detection ==="

check_role_addr() {
  local role="$1"
  local addr="$2"
  if [[ "$addr" == "null" ]]; then
    echo "[WARN] $role is null in config (did you forget to set it?)"
    return
  fi
  if is_anvil_addr "$addr"; then
    echo "[WARN] $role ($addr) matches a KNOWN ANVIL DEV ADDRESS. This is fine for dev, NOT for real mainnet."
  else
    echo "[OK]   $role looks non-anvil (not in known dev list)."
  fi
}

check_role_addr "roles.adminGateOwner"      "$ADMIN_GATE_OWNER"
check_role_addr "roles.updateGateOwner"     "$UPDATE_GATE_OWNER"
check_role_addr "roles.configGateOwner"     "$CONFIG_GATE_OWNER"
check_role_addr "roles.treasuryOwner"       "$TREASURY_OWNER"
check_role_addr "roles.opsTreasuryOwner"    "$OPS_TREASURY_OWNER"
check_role_addr "roles.rewardEngineOwner"   "$REWARD_OWNER"
check_role_addr "roles.validatorSetOwner"   "$VALIDATOR_SET_OWNER"
echo

echo "=== [STEP 2] Inspect RPC chain ==="
set +e
CHAIN_ID_RPC=$(cast chain-id --rpc-url "$RPC_URL" 2>/tmp/void-mainnet-plan-cast.err)
CAST_RC=$?
set -e

if [[ $CAST_RC -ne 0 ]]; then
  echo "[ERROR] cast chain-id failed against RPC: $RPC_URL" >&2
  echo "-------- cast stderr --------" >&2
  cat /tmp/void-mainnet-plan-cast.err >&2 || true
  echo "-----------------------------" >&2
  exit 1
fi

BLOCK_NUMBER=$(cast block-number --rpc-url "$RPC_URL" 2>/dev/null || echo "unknown")

echo "rpc.chainId      = $CHAIN_ID_RPC"
echo "rpc.blockNumber  = $BLOCK_NUMBER"
echo

echo "=== [STEP 3] Basic consistency checks ==="

if [[ "$CHAIN_ID_CFG" != "null" && "$CHAIN_ID_CFG" != "$CHAIN_ID_RPC" ]]; then
  echo "[WARN] chainId mismatch: config=$CHAIN_ID_CFG, rpc=$CHAIN_ID_RPC" >&2
else
  echo "[OK] chainId matches (config=$CHAIN_ID_CFG, rpc=$CHAIN_ID_RPC)"
fi

if [[ "$CHAIN_ID_RPC" != "2050" ]]; then
  echo "[WARN] rpc.chainId != 2050 (VOID mainnet id); current=$CHAIN_ID_RPC" >&2
else
  echo "[OK] rpc.chainId is 2050 (VOID chainId)."
fi

echo
echo "=== [STEP 4] High-level bootstrap PLAN summary ==="
echo "This PLAN is READ-ONLY. No transactions are sent."
echo
echo "- Will deploy / wire (conceptually):"
echo "    * UpdateGate, AdminGate, ConfigGate"
echo "    * ValidatorSet"
echo "    * VoidToken (VOID)"
echo "    * VoidTreasury (premine vault)"
echo "    * OpsTreasury (ops funds)"
echo "    * RewardEngine (emissions controller)"
echo
echo "- Will assign owners / roles as per CONFIG:"
echo "    AdminGate.owner      -> $ADMIN_GATE_OWNER"
echo "    UpdateGate.owner     -> $UPDATE_GATE_OWNER"
echo "    ConfigGate.owner     -> $CONFIG_GATE_OWNER"
echo "    VoidTreasury.owner   -> $TREASURY_OWNER"
echo "    OpsTreasury.owner    -> $OPS_TREASURY_OWNER"
echo "    RewardEngine.owner   -> $REWARD_OWNER"
echo "    ValidatorSet.owner   -> $VALIDATOR_SET_OWNER"
echo
echo "- Will fund / stake validators (conceptual):"
if [[ "$VALIDATOR_COUNT" -eq 0 ]]; then
  echo "    [WARN] no validators[] configured in $CONFIG"
else
  jq -r '.validators[]
    | "    - \(.id // "unknown"): rewardAddress=\(.rewardAddress // "null"), stakeVOID=\(.stakeVOID // "null")"
  ' "$CONFIG"
fi
echo

echo "=== [STEP 5] VOID tokenomics expectations (spec) ==="
# These are SPEC values, not read from chain.
MAX_SUPPLY="666,666,666"
PREMINE="333,333,333"
EMISSIONS_TOTAL="333,333,333"
ERA1="177,777,777"
ERA2="88,888,889"
ERA3="44,444,444"
ERA4="22,222,223"

echo "MAX_SUPPLY (VOID)         = $MAX_SUPPLY"
echo "PREMINE (VoidTreasury)    = $PREMINE"
echo "EMISSIONS (total)         = $EMISSIONS_TOTAL"
echo "  Era1                    = $ERA1"
echo "  Era2                    = $ERA2"
echo "  Era3                    = $ERA3"
echo "  Era4                    = $ERA4"
echo
echo "NOTE: These are the locked VOID tokenomics constants."
echo "      On real mainnet, invariants scripts must confirm that:"
echo "        totalSupply == Treasury + Ops + Reward + staked validators"
echo "      and equals PREMINE at bootstrap (pre-emissions)."
echo
echo "=== DONE: PLAN completed (read-only) ==="
