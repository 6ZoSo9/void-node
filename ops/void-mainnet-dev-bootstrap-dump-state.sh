#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

RPC="${ANVIL_RPC:-http://127.0.0.1:8545}"
BCAST="broadcast/VoidMainnetBootstrapDevFromJsonDeploy.s.sol/2050/run-latest.json"
CONFIG="config/void-mainnet-bootstrap-dev.json"
OUT="config/void-mainnet-bootstrap-dev.state.json"

if [ ! -f "$BCAST" ]; then
  echo "[FATAL] broadcast file not found: $BCAST" >&2
  exit 1
fi

addr() {
  local name="$1"
  jq -r --arg name "$name" '
    [ .transactions[]
      | select(.contractName == $name)
      | .contractAddress
    ][0]
  ' "$BCAST"
}

TOKEN=$(addr "VoidToken")
OPS_TREASURY=$(addr "OpsTreasury")
VOID_TREASURY=$(addr "VoidTreasury")
ADMIN_GATE=$(addr "AdminGate")
CONFIG_GATE=$(addr "ConfigGate")
VALIDATOR_SET=$(addr "ValidatorSet")
EMISSIONS=$(addr "VoidEmissionsController")
REWARD=$(addr "RewardEngine")

echo "=== [addrs] broadcasting into state.json ==="
printf "  TOKEN           = %s\n" "$TOKEN"
printf "  OPS_TREASURY    = %s\n" "$OPS_TREASURY"
printf "  VOID_TREASURY   = %s\n" "$VOID_TREASURY"
printf "  ADMIN_GATE      = %s\n" "$ADMIN_GATE"
printf "  CONFIG_GATE     = %s\n" "$CONFIG_GATE"
printf "  VALIDATOR_SET   = %s\n" "$VALIDATOR_SET"
printf "  EMISSIONS       = %s\n" "$EMISSIONS"
printf "  REWARD          = %s\n" "$REWARD"
echo

echo "=== [tokenomics] pulling on-chain numbers ==="

# cast prints "3333... [3.33e26]" – keep only the raw int before the first space.
PREMINE_RAW=$(cast call "$TOKEN" "PREMINE()(uint256)" --rpc-url "$RPC")
PREMINE=${PREMINE_RAW%% *}

TOTAL_SUPPLY_RAW=$(cast call "$TOKEN" "totalSupply()(uint256)" --rpc-url "$RPC")
TOTAL_SUPPLY=${TOTAL_SUPPLY_RAW%% *}

EMISSIONS_BUDGET_RAW=$(cast call "$EMISSIONS" "EMISSIONS_BUDGET()(uint256)" --rpc-url "$RPC")
EMISSIONS_BUDGET=${EMISSIONS_BUDGET_RAW%% *}

# MAX_SUPPLY = PREMINE + EMISSIONS_BUDGET using Node BigInt (no scientific notation)
if command -v node >/dev/null 2>&1; then
  MAX_SUPPLY=$(node -e "const p=BigInt('$PREMINE'); const e=BigInt('$EMISSIONS_BUDGET'); console.log((p+e).toString());")
else
  echo '[FATAL] node not found in PATH; required for big-int math' >&2
  exit 1
fi

echo "  PREMINE          = $PREMINE"
echo "  TOTAL_SUPPLY     = $TOTAL_SUPPLY"
echo "  EMISSIONS_BUDGET = $EMISSIONS_BUDGET"
echo "  MAX_SUPPLY       = $MAX_SUPPLY"
echo

echo "=== [write] $OUT ==="
jq -n \
  --arg chainId "2050" \
  --arg config "$CONFIG" \
  --arg token "$TOKEN" \
  --arg opsTreasury "$OPS_TREASURY" \
  --arg voidTreasury "$VOID_TREASURY" \
  --arg adminGate "$ADMIN_GATE" \
  --arg configGate "$CONFIG_GATE" \
  --arg validatorSet "$VALIDATOR_SET" \
  --arg emissions "$EMISSIONS" \
  --arg reward "$REWARD" \
  --arg premine "$PREMINE" \
  --arg totalSupply "$TOTAL_SUPPLY" \
  --arg emissionsBudget "$EMISSIONS_BUDGET" \
  --arg maxSupply "$MAX_SUPPLY" '
{
  chainId: ($chainId | tonumber),
  config: $config,
  addresses: {
    VoidToken: $token,
    OpsTreasury: $opsTreasury,
    VoidTreasury: $voidTreasury,
    AdminGate: $adminGate,
    ConfigGate: $configGate,
    ValidatorSet: $validatorSet,
    VoidEmissionsController: $emissions,
    RewardEngine: $reward
  },
  tokenomics: {
    premineWei: $premine,
    totalSupplyWei: $totalSupply,
    emissionsBudgetWei: $emissionsBudget,
    maxSupplyWei: $maxSupply
  }
}
' >"$OUT"

echo "[OK] wrote $OUT"
echo
cat "$OUT"
echo
echo "=== DONE: dev bootstrap state snapshot written ==="
